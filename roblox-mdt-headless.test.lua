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
function methods:FindFirstChild(name) for _, c in ipairs(self:GetChildren()) do if c.Name == name then return c end end end
function methods:WaitForChild(name) return assert(self:FindFirstChild(name), name) end
function methods:GetPropertyChangedSignal(name) if not self._signals[name] then self._signals[name] = signal() end; return self._signals[name] end
function methods:IsA(class) return self.ClassName == class end
function methods:Destroy()
    if self._destroyed then return end
    self.Destroying:Fire(); self._destroyed = true
    for _, child in ipairs(self:GetChildren()) do child:Destroy() end
    self.Parent = nil
end
Instance = {}
function Instance.new(class)
    local item = { _props = { ClassName = class, Name = class }, _children = {}, _signals = {}, _destroyed = false }
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
Color3 = { fromRGB = function(r,g,b) return {r,g,b} end }
Enum = setmetatable({}, { __index = function(self,k) local t = setmetatable({}, {__index=function(s,v) rawset(s,v,k..":"..v);return k..":"..v end});rawset(self,k,t);return t end })
local function drain()
    while #tasks > 0 do
        local fn = table.remove(tasks, 1)
        local thread = coroutine.create(fn)
        local ok, err = coroutine.resume(thread)
        assert(ok, err)
    end
end
task = { spawn = function(fn) table.insert(tasks, fn) end, delay = function(_,fn) table.insert(tasks, fn) end, wait = function() coroutine.yield("waiting") end }
warn = function(message) table.insert(warnings, message) end
local function current(class, text)
    for i = #instances, 1, -1 do
        local item = instances[i]
        if not item._destroyed and item.Parent and item.ClassName == class and (item.Text == text or item.PlaceholderText == text or item.Name == text) then return item end
    end
    error("Missing UI: " .. class .. " / " .. text)
end
local function click(text) current("TextButton",text).Activated:Fire(); drain() end
local function reset()
    instances={};tasks={};requests={};warnings={};services={};data={};revoked=false;offline=false
    local playerGui=Instance.new("PlayerGui")
    local player={UserId=123456789,Name="OwnerTest",WaitForChild=function(_,name) assert(name=="PlayerGui");return playerGui end}
    services.Players={LocalPlayer=player}
    services.UserInputService={InputBegan=signal(),GetFocusedTextBox=function() return nil end}
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
            assert(body.robloxUserId=="123456789");assert(body.guildId=="100000000000000001");assert(body.code=="secret-code")
            response={ok=true,token=string.rep("T",43)}
        else
            assert(options.Headers.Authorization=="Bearer "..string.rep("T",43));assert(options.Headers["X-Mdt-Roblox-Id"]=="123456789")
            if revoked then return {StatusCode=403,Body=services.HttpService:JSONEncode({ok=false,error="Owner access revoked"})} end
            if options.Url:find("/bootstrap",1,true) then
                response={ok=true,guild={id="100000000000000001",name="Belv"},officer={id="100000000000000002",name="Owner"},templates={{key="note",title="MDT feljegyzés",category="note",fields={{id="title",label="Feljegyzés címe",required=true},{id="content",label="Feljegyzés tartalma",style="paragraph",required=true},{id="reference",label="Hivatkozás",required=false}}}}}
            elseif options.Method=="POST" and options.Url:match("/records$") then
                local payload=services.HttpService:JSONDecode(options.Body)
                data.record={id="1",key="note",title=payload.fields.title,fields=payload.fields,status="published",revision=1,createdBy="100000000000000002",updatedAt="2026-10-09T00:00:00Z",discordState="synced",discordUrl="https://discord.com/channels/1/2/3",canEdit=true,canArchive=true,canSync=true}
                data.lastPayload=payload;response={ok=true,record=data.record}
            elseif options.Method=="PATCH" then
                local payload=services.HttpService:JSONDecode(options.Body)
                assert(payload.revision==data.record.revision)
                data.record.fields=payload.fields;data.record.title=payload.fields.title;data.record.revision=data.record.revision+1
                response={ok=true,record=data.record}
            elseif options.Url:find("/records?",1,true) then response={ok=true,records=data.record and {data.record} or {}}
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
print(tostring(checks).." headless client-flow checks passed.")
