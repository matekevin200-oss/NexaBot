-- Headless client-flow checks. This simulates Roblox UI signals, not Xeno or a live game.
local file = assert(io.open(arg[1], "rb"))
local source = file:read("*a"); file:close()
local instances, tasks, requests, warnings, services, data, revoked, offline
local function signal()
    local callbacks = {}
    return {
        Connect = function(self, fn)
            local c = { Connected = true }
            function c:Disconnect() self.Connected = false end
            table.insert(callbacks, { callback = fn, connection = c })
            return c
        end,
        Fire = function(self, ...)
            for _, c in ipairs(callbacks) do if c.connection.Connected then c.callback(...) end end
        end
    }
end
local methods = {}
function methods:GetChildren() local r = {}; for _, c in ipairs(self._children) do if c.Parent == self then table.insert(r, c) end end; return r end
function methods:GetDescendants() local r = {}; for _, c in ipairs(self:GetChildren()) do table.insert(r, c); for _, d in ipairs(c:GetDescendants()) do table.insert(r, d) end end; return r end
function methods:FindFirstChild(name) for _, c in ipairs(self:GetChildren()) do if c.Name == name then return c end end end
function methods:WaitForChild(name) return assert(self:FindFirstChild(name), name) end
function methods:GetPropertyChangedSignal(name) if not self._signals[name] then self._signals[name] = signal() end; return self._signals[name] end
function methods:IsA(class) return self.ClassName == class or class == "GuiObject" and ({Frame=true,ScrollingFrame=true,TextLabel=true,TextButton=true,TextBox=true})[self.ClassName] == true end
function methods:Destroy()
    if self._destroyed then return end
    self.Destroying:Fire(); self._destroyed = true
    for _, child in ipairs(self:GetChildren()) do child:Destroy() end
    self.Parent = nil
end
Instance = {}
function Instance.new(class)
    local item = { _props = { ClassName = class, Name = class }, _children = {}, _signals = {}, _destroyed = false }
    item._props.Visible = true; item._props.Enabled = true; item._props.RichText = false
    item._props.Activated = signal(); item._props.Destroying = signal()
    setmetatable(item, {
        __index = function(self, key) return methods[key] or self._props[key] end,
        __newindex = function(self, key, value)
            if key:sub(1, 1) == "_" then rawset(self, key, value); return end
            self._props[key] = value
            if key == "Parent" and value then table.insert(value._children, self) end
            if self._signals[key] then self._signals[key]:Fire() end
        end
    })
    table.insert(instances, item); return item
end
UDim = { new = function(scale, offset) return { Scale = scale, Offset = offset } end }
UDim2 = { new = function(...) return { ... } end, fromOffset = function(x,y) return {x,y} end, fromScale = function(x,y) return {x,y} end }
Vector2 = { new = function(x,y) return { X=x,Y=y } end }
Color3 = { fromRGB = function(r,g,b) return {R=r/255,G=g/255,B=b/255} end }
TweenInfo = { new = function(...) return {...} end }
Enum = setmetatable({}, { __index = function(self,k) local t = setmetatable({}, {__index=function(s,v) rawset(s,v,k..":"..v);return k..":"..v end});rawset(self,k,t);return t end })
local function drain()
    while #tasks > 0 do
        local fn = table.remove(tasks, 1)
        local thread = coroutine.create(fn)
        local ok, err = coroutine.resume(thread)
        assert(ok, err)
    end
end
task = { spawn = function(fn) table.insert(tasks, fn) end, defer = function(fn) table.insert(tasks, fn) end, delay = function(_,fn) table.insert(tasks, fn) end, wait = function() coroutine.yield("waiting") end }
warn = function(message) table.insert(warnings, message) end
local function current(class, text)
    for i = #instances, 1, -1 do
        local item = instances[i]
        if not item._destroyed and item.Parent and item.ClassName == class and (item.Text == text or item.PlaceholderText == text or item.Name == text) then return item end
    end
    error("Missing UI: " .. class .. " / " .. text)
end
local function click(text) current("TextButton",text).Activated:Fire(); drain() end
local function clickPlayer(name)
    local item=current("TextLabel","@"..name);assert(item.Parent:IsA("TextButton"));item.Parent.Activated:Fire();drain()
end
local function reset()
    instances={};tasks={};requests={};warnings={};services={};data={};revoked=false;offline=false
    local playerGui=Instance.new("PlayerGui")
    local player={UserId=123456789,Name="OwnerTest",DisplayName="Owner",Team={Name="Police"},WaitForChild=function(_,name) assert(name=="PlayerGui");return playerGui end}
    local live={player,{UserId=777777,Name="WantedPlayer",DisplayName="Wanted",Team={Name="Citizen"}},{UserId=888888,Name="ClearPlayer",DisplayName="Clear",Team={Name="Citizen"}}}
    services.Players={LocalPlayer=player,GetPlayers=function() return live end,GetNameFromUserIdAsync=function(_,id) assert(id==999999);return "OfflinePlayer" end,GetUserIdFromNameAsync=function(_,name) assert(name=="OfflinePlayer");return 999999 end}
    data.live=live
    services.UserInputService={InputBegan=signal(),GetFocusedTextBox=function() return nil end}
    services.TweenService={Create=function(_,object,info,properties)
        data.tweens=data.tweens or {};local tween={object=object,properties=properties}
        function tween:Play() for key,value in pairs(properties)do object[key]=value end end
        function tween:Cancel() self.cancelled=true end
        table.insert(data.tweens,tween);return tween
    end}
    local encoded={},0
    local n=0
    services.HttpService={
        JSONEncode=function(_,value) n=n+1;local key="json"..n;encoded[key]=value;return key end,
        JSONDecode=function(_,key) return assert(encoded[key],key) end,
        UrlEncode=function(_,value) return value end,
        GenerateGUID=function() return "aaaaaaaa-bbbb-cccc-dddd-"..tostring(100000000000+n) end
    }
    game={GetService=function(_,name) return assert(services[name],name) end}
    workspace=Instance.new("Workspace");workspace.CurrentCamera=Instance.new("Camera");workspace.CurrentCamera.ViewportSize={X=1440,Y=900}
    request=function(options)
        table.insert(requests,options)
        if offline then error("network down") end
        local response
        if options.Url:find("/auth",1,true) then
            local body=services.HttpService:JSONDecode(options.Body)
            assert(body.robloxUserId==tostring(services.Players.LocalPlayer.UserId));assert(body.guildId=="100000000000000001");assert(body.code=="secret-code")
            if data.failAuth then return {StatusCode=403,Body=services.HttpService:JSONEncode({ok=false,error="Invalid account pair"})} end
            response={ok=true,token=string.rep("T",43)}
        else
            assert(options.Headers.Authorization=="Bearer "..string.rep("T",43));assert(options.Headers["X-Mdt-Roblox-Id"]==tostring(services.Players.LocalPlayer.UserId))
            if revoked then return {StatusCode=403,Body=services.HttpService:JSONEncode({ok=false,error="Owner access revoked"})} end
            if options.Url:find("/bootstrap",1,true) then
                if data.failBootstrap then return {StatusCode=503,Body=services.HttpService:JSONEncode({ok=false,error="Bootstrap temporarily unavailable"})} end
                response={ok=true,manager=data.isOwner==true,guild={id="100000000000000001",name="Belv"},officer={id=data.officerId or "100000000000000002",name=data.officerName or "Owner"},templates={
                    {key="note",title="MDT feljegyzés",category="note",fields={{id="title",label="Feljegyzés címe",required=true},{id="content",label="Feljegyzés tartalma",style="paragraph",required=true},{id="reference",label="Hivatkozás",required=false}}},
                    {key="person",title="Személynyilvántartás",category="person",fields={{id="username",label="Roblox-felhasználónév",required=true},{id="robloxId",label="Roblox-ID"},{id="name",label="RP-név",required=true},{id="state",label="RP-státusz",required=true},{id="notes",label="Megjegyzés",style="paragraph"}}},
                    {key="warrant",title="MDT körözés",category="warrant",approval=true,fields={{id="target",label="Körözött RP-személy vagy jármű",required=true},{id="robloxId",label="Körözött Roblox-ID"},{id="reason",label="RP-körözés indoka",style="paragraph",required=true},{id="priority",label="Prioritás",required=true},{id="validity",label="Érvényesség",required=true}}},
                    {key="case",title="MDT ügyirat",category="case",approval=true,fields={{id="title",label="Ügy tárgya",required=true},{id="persons",label="Érintettek",required=true},{id="robloxId",label="Érintett Roblox-ID"},{id="events",label="Tényállás",style="paragraph",required=true}}}
                }}
            elseif options.Method=="POST" and options.Url:match("/records$") then
                local payload=services.HttpService:JSONDecode(options.Body)
                data.record={id="1",key=payload.key,title=payload.fields.title or payload.fields.name or payload.fields.target,fields=payload.fields,status=payload.key=="warrant" and "pending" or "published",revision=1,createdBy="100000000000000002",updatedAt="2026-10-09T00:00:00Z",discordState="synced",discordUrl="https://discord.com/channels/1/2/3",canEdit=true,canArchive=true,canSync=true}
                data.lastPayload=payload;response={ok=true,record=data.record}
            elseif options.Method=="PATCH" then
                local payload=services.HttpService:JSONDecode(options.Body)
                assert(payload.revision==data.record.revision)
                data.record.fields=payload.fields;data.record.title=payload.fields.title;data.record.revision=data.record.revision+1
                response={ok=true,record=data.record}
            elseif options.Url:find("/people/lookup?",1,true) then data.lookupUrl=options.Url;response={ok=true,records=data.related or {}}
            elseif options.Url:find("/records?",1,true) then
                local key=options.Url:match("[?&]key=([^&]+)");response={ok=true,records=data.record and data.record.key==key and {data.record} or {}}
            elseif options.Url:find("/logout",1,true) then response={ok=true}
            else error("Unexpected request "..options.Method.." "..options.Url) end
        end
        return {StatusCode=200,Body=services.HttpService:JSONEncode(response)}
    end
    return playerGui
end
local function configured(ids)
    local config='local CONFIG = { BaseUrl = "https://nexa.example", GuildId = "100000000000000001", AllowedRobloxIds = { '..ids..' } }'
    local raw=source:gsub('local CONFIG = { BaseUrl = "", GuildId = "", AllowedRobloxIds = {} }', function() return config end, 1)
    local fn,err=load(raw,"@BelvMDT","t",_G);assert(fn,err);fn();drain()
end
local function login()
    current("TextBox","A /mdt belepes privát válaszából").Text="secret-code"
    click("Kapcsolódás a NEXA bothoz")
end
local checks=0
local function checked(name,fn) fn();checks=checks+1;print("PASS "..name) end
checked("unlisted Roblox account creates no panel or network request",function()
    local gui=reset();configured('"987654321"');assert(not gui:FindFirstChild("BelvMdtNexaV1"));assert(#requests==0);assert(#warnings==1)
end)
checked("owner login binds the actual LocalPlayer ID",function()
    reset();configured('"123456789"');login();assert(current("TextLabel","Műveleti áttekintés"));assert(#requests==2)
end)
checked("a complete RP form reaches the NEXA API and creates the record view",function()
    click("Feljegyzések");click("+ Új irat")
    current("TextBox","Feljegyzés címe").Text="Őrjárati jelentés"
    current("TextBox","Feljegyzés tartalma").Text="RP esemény Hamburgban"
    click("Beküldés a Discordra");assert(data.lastPayload.fields.title=="Őrjárati jelentés");assert(data.lastPayload.clientKey);assert(current("TextLabel","MDT #1"))
end)
checked("record editing submits the expected revision",function()
    click("Szerkesztés");current("TextBox","Feljegyzés tartalma").Text="Frissített RP jelentés"
    click("Beküldés a Discordra");assert(data.record.revision==2);assert(data.record.fields.content=="Frissített RP jelentés")
end)
checked("rerun restores the existing window without duplicate listeners or panels",function()
    local before=#instances;configured('"123456789"');assert(#instances==before)
    local gui=services.Players.LocalPlayer:WaitForChild("PlayerGui"):FindFirstChild("BelvMdtNexaV1")
    local window=gui:FindFirstChild("Window");services.UserInputService.InputBegan:Fire({KeyCode=Enum.KeyCode.F6},false);assert(window.Visible==false)
    services.UserInputService.InputBegan:Fire({KeyCode=Enum.KeyCode.F6},false);assert(window.Visible==true)
end)
checked("revocation clears all displayed record content",function()
    revoked=true;click("Frissítés");assert(current("TextLabel","Az MDT-hozzáférés lezárva"))
    for _,item in ipairs(instances) do assert(item._destroyed or item.Text~="Frissített RP jelentés") end
end)
checked("a failed submit keeps the form and retry keeps the original request key",function()
    reset();configured('"123456789"');login();click("Feljegyzések");click("+ Új irat")
    current("TextBox","Feljegyzés címe").Text="Új irat";current("TextBox","Feljegyzés tartalma").Text="Hálózati teszt"
    offline=true;click("Beküldés a Discordra");local payload=services.HttpService:JSONDecode(requests[#requests].Body)
    assert(current("TextBox","Feljegyzés tartalma").Text=="Hálózati teszt")
    offline=false;click("Beküldés a Discordra");assert(data.lastPayload.clientKey==payload.clientKey)
end)
local function policeSource()
    local gui=services.Players.LocalPlayer:WaitForChild("PlayerGui")
    local phone=Instance.new("ScreenGui");phone.Name="GamePhone";phone.Parent=gui
    local list=Instance.new("ScrollingFrame");list.Name="PolicePlayerList";list.Parent=phone
    local names={}
    for _,person in ipairs(data.live) do
        local text=Instance.new("TextLabel");text.Text=person.Name;text.TextColor3=person.Name=="WantedPlayer" and Color3.fromRGB(255,60,70) or Color3.fromRGB(255,255,255);text.Parent=list;names[person.Name]=text
    end
    return phone,list,names
end
local function selectPoliceSource()
    click("Lista kapcsolása")
    local text=current("TextLabel","GamePhone / PolicePlayerList");assert(text.Parent:IsA("TextButton"));text.Parent.Activated:Fire();drain()
end
checked("missing game source stays unknown instead of reporting an empty wanted list",function()
    reset();configured('"123456789"');login();data.live[2].Wanted=true
    click("Játék körözései");assert(current("TextLabel","Körözésjelzés: 0 • Nincs jelzés: 0 • Ismeretlen: 3"))
end)
checked("only the explicitly selected visible police list supplies red and white wanted indicators",function()
    local phone,list,names=policeSource();selectPoliceSource()
    assert(current("TextLabel","Körözésjelzés: 1 • Nincs jelzés: 2 • Ismeretlen: 0"))
    assert(names.WantedPlayer.Text=="WantedPlayer");assert(names.WantedPlayer.TextColor3.R==1);assert(phone.Enabled);assert(list.Visible)
    clickPlayer("WantedPlayer");assert(current("TextLabel","Játék körözése: KÖRÖZÖTT"));assert(data.lookupUrl:find("robloxId=777777",1,true));assert(data.lookupUrl:find("username=WantedPlayer",1,true))
    data.phone=phone;data.policeList=list;data.policeNames=names
end)
checked("a hidden police phone cannot keep stale wanted statuses",function()
    data.phone.Enabled=false;click("Frissít");assert(current("TextLabel","Körözésjelzés: 0 • Nincs jelzés: 0 • Ismeretlen: 3"))
    assert(current("TextLabel","Játék körözése: ismeretlen"))
    data.phone.Enabled=true;click("Frissít");assert(current("TextLabel","Körözésjelzés: 1 • Nincs jelzés: 2 • Ismeretlen: 0"))
end)
checked("conflicting game labels are unknown and cannot clear an actual wanted signal",function()
    local other=Instance.new("TextLabel");other.Text="WantedPlayer";other.TextColor3=Color3.fromRGB(255,255,255);other.Parent=data.policeList
    click("Frissít");assert(current("TextLabel","Körözésjelzés: 0 • Nincs jelzés: 2 • Ismeretlen: 1"));other:Destroy();click("Frissít")
end)
checked("player lookup prefills the exact Roblox ID and can add an RP person record",function()
    click("Játékoskereső");clickPlayer("WantedPlayer");click("+ Személyadat")
    assert(current("TextBox","Roblox-ID").Text=="777777");assert(current("TextBox","Roblox-felhasználónév").Text=="WantedPlayer")
    click("Beküldés a Discordra");assert(not data.lastPayload)
    current("TextBox","RP-név").Text="RP Teszt";current("TextBox","RP-státusz").Text="Megfigyelt RP személy"
    current("TextBox","Megjegyzés").Text="Saját RP-adat, nem játékállapot-módosítás"
    click("Beküldés a Discordra");assert(data.lastPayload.key=="person");assert(data.lastPayload.fields.robloxId=="777777");assert(data.lastPayload.fields.notes:find("Saját",1,true))
end)
checked("offline public Roblox profile lookup still marks game status unknown",function()
    click("Játékoskereső");current("TextBox","Felhasználónév vagy Roblox-ID").Text="999999";click("Profil lekérése")
    assert(current("TextLabel","@OfflinePlayer • Roblox-ID: 999999"));assert(current("TextLabel","Nincs ebben a szerverben • játékállapot ismeretlen"));assert(current("TextLabel","Játék körözése: ismeretlen"))
end)
checked("a new manual warrant keeps the player ID and remains pending for owner review",function()
    click("+ MDT-körözés");assert(current("TextBox","Körözött Roblox-ID").Text=="999999")
    current("TextBox","RP-körözés indoka").Text="RP ügy";current("TextBox","Prioritás").Text="Normál";current("TextBox","Érvényesség").Text="RP esemény végéig"
    click("Beküldés a Discordra");assert(data.lastPayload.key=="warrant");assert(data.record.status=="pending");assert(data.lastPayload.fields.robloxId=="999999")
end)
checked("approved-warrant filter can be enabled and disabled",function()
    click("Összes / jóváhagyott");assert(requests[#requests].Url:find("status=published",1,true))
    click("Összes / jóváhagyott");assert(not requests[#requests].Url:find("status=published",1,true))
end)
checked("the copy of a game list closes and private records clear on owner revocation",function()
    click("Játék körözései");click("Lista kapcsolása");revoked=true
    click("Frissít");assert(current("TextLabel","Az MDT-hozzáférés lezárva"))
    for _,item in ipairs(instances) do assert(item._destroyed or item.Name~="PoliceSourcePicker") end
end)
if arg[2] then
    local fixture=arg[2]
    local function runLoader()
        local downloads=0
        game.HttpGet=function(_,url) assert(url==fixture.url);downloads=downloads+1;return fixture.source end
        loadstring=function(code) return load(code,"@BelvMdtDownloadedClient","t",_G) end
        local fn,err=load(fixture.code,"@BelvMdtOneLineLoader","t",_G);assert(fn,err);fn();drain()
        assert(downloads==1)
    end
    checked("the actual generated one-line loader downloads the personalized client and opens login",function()
        local gui=reset();runLoader();assert(gui:FindFirstChild("BelvMdtNexaV1"));assert(#requests==0)
        login();assert(current("TextLabel","Műveleti áttekintés"));assert(#requests==2)
    end)
    checked("the downloaded client refuses an unlisted actual Roblox account before creating its panel",function()
        local gui=reset();services.Players.LocalPlayer.UserId=555555555;runLoader()
        assert(not gui:FindFirstChild("BelvMdtNexaV1"));assert(#requests==0);assert(#warnings==1)
    end)
    checked("a registered member uses the downloaded client with their own Roblox ID and officer name",function()
        reset();services.Players.LocalPlayer.UserId=987654321;data.officerId="100000000000000003";data.officerName="Belv tag";runLoader();login()
        assert(current("TextLabel","Belv tag  ·  MDT ÜGYINTÉZŐ"));assert(#requests==2)
    end)
end
checked("the loading screen is local, animated, and released after login",function()
    reset();configured('"123456789"');local loading=current("Frame","LoadingScreen");assert(loading.ZIndex==30);assert(loading.Active==true);assert(loading.Visible==false)
    assert(#data.tweens==2);login();assert(loading.Visible==false);assert(#data.tweens==5);assert(data.tweens[1].cancelled==true)
end)
checked("failed authentication closes loading and keeps login available",function()
    reset();configured('"123456789"');data.failAuth=true;login();assert(current("Frame","LoadingScreen").Visible==false);assert(current("TextBox","A /mdt belepes privát válaszából"));assert(#requests==1)
end)
checked("failed bootstrap closes loading and prevents navigation with an incomplete session",function()
    reset();configured('"123456789"');data.failBootstrap=true;login();assert(current("Frame","LoadingScreen").Visible==false);local before=#requests
    click("Ügyiratok");assert(current("TextLabel","Belépés a Belv MDT-be"));assert(#requests==before)
end)
print(tostring(checks).." headless client-flow checks passed.")
