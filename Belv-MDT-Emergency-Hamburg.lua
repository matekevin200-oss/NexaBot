-- BELV MDT 1.1 | NEXA Bot 20.2.1
-- Roblox kliensfelulet: csak a sajat NEXA MDT API-val kommunikal.
-- Bot-token vagy Discord-webhook nem kell a scriptbe.
-- A panel nyitasahoz F6 vagy a BELV MDT gomb hasznalhato.
-- A hasznalatra beallitott script az Owner Center -> Belv MDT oldalon toltheto le.
local CONFIG = { BaseUrl = "", GuildId = "", AllowedRobloxIds = {} }

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local HttpService = game:GetService("HttpService")
local LocalPlayer = Players.LocalPlayer
if not LocalPlayer then error("A Belv MDT kliensoldalon futtathato.") end
local allowed = false
for _, id in ipairs(CONFIG.AllowedRobloxIds) do
    if tostring(id) == tostring(LocalPlayer.UserId) then allowed = true; break end
end
if not allowed then
    warn("Belv MDT: ez a Roblox-ID nincs hozzaadva. Az Owner Center -> Belv MDT oldalon add hozza, es onnan toltsd le a beallitott scriptet.")
    return
end
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")
local GUI_NAME = "BelvMdtNexaV1"
local old = PlayerGui:FindFirstChild(GUI_NAME)
if old then
    old.Enabled = true
    local oldWindow = old:FindFirstChild("Window")
    if oldWindow then oldWindow.Visible = true end
    return
end

local palette = {
    bg = Color3.fromRGB(16, 22, 31), panel = Color3.fromRGB(22, 30, 41),
    field = Color3.fromRGB(29, 39, 52), line = Color3.fromRGB(47, 59, 73),
    text = Color3.fromRGB(231, 237, 244), muted = Color3.fromRGB(155, 172, 191),
    gold = Color3.fromRGB(229, 185, 103), green = Color3.fromRGB(111, 207, 167),
    red = Color3.fromRGB(232, 126, 133), white = Color3.fromRGB(255, 255, 255)
}
local connections = {}
local alive = true
local state = { token = nil, base = CONFIG.BaseUrl, templates = {}, records = {}, page = "overview", template = nil, selected = nil, busy = false, listEpoch = 0, next = nil, dirty = false, pendingPayload = nil }
local renderPage, showRecord, showEditor, refreshList, showLogin
local refreshPlayersPage, showPlayerProfile
local wantedSource, wantedSourcePath
local closeModal
local body, navButtons, statusLabel, headerUser
local fieldBoxes = {}
local function trim(value) return (tostring(value or ""):gsub("^%s+", ""):gsub("%s+$", "")) end
local function connect(signal, callback)
    local connection = signal:Connect(callback)
    table.insert(connections, connection)
    return connection
end
local function ui(class, parent, props)
    local object = Instance.new(class)
    for key, value in pairs(props or {}) do object[key] = value end
    object.Parent = parent
    return object
end
local function corner(object, radius) ui("UICorner", object, { CornerRadius = UDim.new(0, radius or 9) }) end
local function stroke(object, color) ui("UIStroke", object, { Color = color or palette.line, Thickness = 1 }) end
local function frame(parent, name, position, size, color)
    return ui("Frame", parent, { Name = name, Position = position, Size = size, BackgroundColor3 = color or palette.panel, BorderSizePixel = 0 })
end
local function label(parent, text, position, size, color, fontSize, bold)
    return ui("TextLabel", parent, { Text = text, Position = position, Size = size, BackgroundTransparency = 1, BorderSizePixel = 0, TextColor3 = color or palette.text, TextSize = fontSize or 14, Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Center, TextTruncate = Enum.TextTruncate.AtEnd, RichText = false })
end
local function button(parent, text, position, size, callback, accent)
    local b = ui("TextButton", parent, { Text = text, Position = position, Size = size, BackgroundColor3 = accent or palette.field, BorderSizePixel = 0, TextColor3 = accent == palette.gold and palette.bg or palette.text, TextSize = 13, Font = Enum.Font.GothamBold, AutoButtonColor = true, RichText = false })
    corner(b, 7)
    if callback then b.Activated:Connect(callback) end
    return b
end
local function textbox(parent, placeholder, position, size, multiline)
    local b = ui("TextBox", parent, { Text = "", PlaceholderText = placeholder, PlaceholderColor3 = palette.muted, Position = position, Size = size, BackgroundColor3 = palette.field, BorderSizePixel = 0, TextColor3 = palette.text, TextSize = 14, Font = Enum.Font.Gotham, ClearTextOnFocus = false, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = multiline and Enum.TextYAlignment.Top or Enum.TextYAlignment.Center, MultiLine = multiline or false, TextWrapped = true, RichText = false })
    corner(b, 7); stroke(b)
    ui("UIPadding", b, { PaddingLeft = UDim.new(0, 12), PaddingRight = UDim.new(0, 12), PaddingTop = UDim.new(0, multiline and 10 or 0), PaddingBottom = UDim.new(0, multiline and 10 or 0) })
    return b
end
local function scroll(parent, name, position, size)
    return ui("ScrollingFrame", parent, { Name = name, Position = position, Size = size, BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 4, ScrollBarImageColor3 = palette.line, CanvasSize = UDim2.new(0, 0, 0, 0), ScrollingDirection = Enum.ScrollingDirection.Y, ClipsDescendants = true })
end
local function setStatus(message, color)
    if alive and statusLabel then statusLabel.Text = message; statusLabel.TextColor3 = color or palette.muted end
end
local function notifyError(message) setStatus(message, palette.red) end
local function jsonDecode(text)
    local ok, value = pcall(function() return HttpService:JSONDecode(text) end)
    if not ok or type(value) ~= "table" then return nil end
    return value
end
local function requestFunction()
    if type(request) == "function" then return request end
    if type(http_request) == "function" then return http_request end
    if type(Xeno) == "table" and type(Xeno.request) == "function" then return Xeno.request end
    if type(http) == "table" and type(http.request) == "function" then return http.request end
    return nil
end
local function api(method, path, payload, anonymous)
    local transport = requestFunction()
    if not transport then return nil, "Ez a környezet nem ad HTTP request funkciót. A NEXA-kapcsolat nem indítható.", 0 end
    if not state.base:match("^https://[^/]+$") then return nil, "HTTPS NEXA-webcímet adj meg, útvonal nélkül.", 0 end
    local headers = { ["Content-Type"] = "application/json", ["Accept"] = "application/json", ["X-Mdt-Roblox-Id"] = tostring(LocalPlayer.UserId) }
    if not anonymous then
        if not state.token then return nil, "Kérj belépőkódot Discordon: /mdt belepes.", 401 end
        headers["Authorization"] = "Bearer " .. state.token
    end
    local options = { Url = state.base .. "/api/mdt/v1" .. path, Method = method, Headers = headers }
    if payload then options.Body = HttpService:JSONEncode(payload) end
    local ok, response = pcall(function() return transport(options) end)
    if not ok or type(response) ~= "table" then return nil, "A NEXA nem érhető el. Ellenőrizd a webcímet; a be nem küldött űrlap megmaradt.", 0 end
    local code = tonumber(response.StatusCode or response.status_code or response.Status or 0) or 0
    local value = jsonDecode(response.Body or response.body or "")
    if code < 200 or code >= 300 or not value or value.ok ~= true then
        local message = value and value.error or ("NEXA HTTP-hiba: " .. tostring(code))
        if (code == 401 or code == 403) and not anonymous then
            state.token = nil; state.templates = {}; state.records = {}; state.selected = nil; state.person = nil; state.personRecords = {}
            wantedSource = nil; wantedSourcePath = nil
            if closeModal then closeModal() end
            if body then
                for _, child in ipairs(body:GetChildren()) do child:Destroy() end
                label(body, "Az MDT-hozzáférés lezárva", UDim2.fromOffset(32, 150), UDim2.fromOffset(810, 50), palette.red, 25, true)
                label(body, "Ellenőrizd az Owner Center Roblox-ID-listáját, majd kérj új személyes Discord-kódot.", UDim2.fromOffset(32, 217), UDim2.fromOffset(810, 70), palette.muted, 14).TextWrapped = true
            end
        end
        return nil, message, code
    end
    return value, nil, code
end
local function run(action)
    if state.busy then return end
    state.busy = true
    setStatus("Kapcsolódás a NEXA bothoz…", palette.gold)
    task.spawn(function()
        local ok, errorMessage = pcall(action)
        state.busy = false
        if not ok then notifyError("MDT-hiba: " .. tostring(errorMessage):sub(1, 170)) end
    end)
end

local screen = ui("ScreenGui", PlayerGui, { Name = GUI_NAME, ResetOnSpawn = false, IgnoreGuiInset = false, DisplayOrder = 80, ZIndexBehavior = Enum.ZIndexBehavior.Sibling })
local window = frame(screen, "Window", UDim2.new(0.5, 0, 0.5, 0), UDim2.fromOffset(1120, 720), palette.bg)
window.AnchorPoint = Vector2.new(0.5, 0.5)
corner(window, 14); stroke(window)
local scale = ui("UIScale", window, { Scale = 1 })
local top = frame(window, "Top", UDim2.fromOffset(0, 0), UDim2.new(1, 0, 0, 66), palette.panel)
corner(top, 14)
label(top, "BELV", UDim2.fromOffset(24, 12), UDim2.fromOffset(75, 25), palette.gold, 23, true)
label(top, "MOBILE DATA TERMINAL", UDim2.fromOffset(105, 12), UDim2.fromOffset(310, 25), palette.text, 15, true)
label(top, "Belvédelmi Igazgatóság  /  Emergency Hamburg RP", UDim2.fromOffset(24, 38), UDim2.fromOffset(500, 17), palette.muted, 11)
headerUser = label(top, "NEXA • nincs belépve", UDim2.fromOffset(565, 22), UDim2.fromOffset(400, 23), palette.muted, 12)
button(top, "—", UDim2.fromOffset(1018, 17), UDim2.fromOffset(36, 30), function() window.Visible = false end)
local destroyPanel
button(top, "×", UDim2.fromOffset(1064, 17), UDim2.fromOffset(36, 30), function() if destroyPanel then destroyPanel() end end)
local launch = button(screen, "BELV MDT  ·  F6", UDim2.new(0, 20, 1, -58), UDim2.fromOffset(156, 36), function() window.Visible = not window.Visible end, palette.gold)
launch.AnchorPoint = Vector2.new(0, 0)
local bottom = frame(window, "Bottom", UDim2.fromOffset(18, 677), UDim2.fromOffset(1084, 26), palette.bg)
statusLabel = label(bottom, "Discord-belépőkód szükséges: /mdt belepes", UDim2.fromOffset(0, 0), UDim2.fromOffset(1080, 24), palette.muted, 12)
local nav = frame(window, "Nav", UDim2.fromOffset(16, 82), UDim2.fromOffset(178, 578), palette.panel)
corner(nav, 10)
label(nav, "BELV MŰVELETI RENDSZER", UDim2.fromOffset(13, 15), UDim2.fromOffset(158, 20), palette.muted, 9, true)
body = frame(window, "Body", UDim2.fromOffset(208, 82), UDim2.fromOffset(894, 578), palette.bg)
local pages = {
    { "overview", "Áttekintés" }, { "players", "Játékoskereső" }, { "gamewanted", "Játék körözései" }, { "case", "Ügyiratok" }, { "warrant", "MDT-körözések" },
    { "person", "Személyek" }, { "vehicle", "Járművek" }, { "shift", "Szolgálati napló" },
    { "document", "Belv-iratsablonok" }, { "note", "Feljegyzések" }
}
navButtons = {}
local modal = nil
closeModal = function() if modal then modal:Destroy(); modal = nil end end
local function confirm(message, callback)
    closeModal()
    modal = frame(screen, "Confirm", UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(440, 178), palette.panel)
    modal.AnchorPoint = Vector2.new(0.5, 0.5); modal.ZIndex = 10; corner(modal, 12); stroke(modal)
    local text = label(modal, message, UDim2.fromOffset(20, 20), UDim2.fromOffset(400, 80), palette.text, 14)
    text.TextWrapped = true; text.TextTruncate = Enum.TextTruncate.None; text.ZIndex = 11
    local no = button(modal, "Mégse", UDim2.fromOffset(20, 116), UDim2.fromOffset(185, 38), closeModal)
    local yes = button(modal, "Folytatás", UDim2.fromOffset(220, 116), UDim2.fromOffset(200, 38), function() closeModal(); callback() end, palette.gold)
    no.ZIndex = 11; yes.ZIndex = 11
end
local function navigate(key)
    if state.busy then setStatus("Várd meg a folyamatban lévő műveletet.", palette.gold); return end
    local function change()
        state.page = key; state.selected = nil; state.dirty = false; state.pendingPayload = nil; state.person = nil; state.recordStatus = nil
        state.template = nil
        if key ~= "document" and key ~= "overview" then
            for _, t in ipairs(state.templates) do if t.key == key then state.template = t; break end end
        end
        renderPage()
    end
    if state.dirty then confirm("Van nem mentett űrlapod. Elveted és másik oldalra lépsz?", change) else change() end
end
for index, page in ipairs(pages) do
    local key, title = page[1], page[2]
    navButtons[key] = button(nav, title, UDim2.fromOffset(10, 44 + (index - 1) * 44), UDim2.fromOffset(158, 36), function()
        if not state.token then showLogin(); return end
        navigate(key)
    end)
end
button(nav, "Kijelentkezés", UDim2.fromOffset(10, 520), UDim2.fromOffset(158, 38), function()
    if state.busy then return end
    confirm("Kijelentkezel? A beküldött iratok megmaradnak; a nem mentett űrlap elvész.", function()
        run(function()
            if state.token then api("POST", "/logout", {}) end
            state.token = nil; state.templates = {}; state.records = {}; state.dirty = false; state.pendingPayload = nil; state.person = nil
            headerUser.Text = "NEXA • nincs belépve"; showLogin(); setStatus("Kijelentkeztél. Új kód: /mdt belepes.")
        end)
    end)
end)
local function clearBody()
    state.listEpoch = state.listEpoch + 1
    for _, child in ipairs(body:GetChildren()) do child:Destroy() end
    fieldBoxes = {}
    for key, b in pairs(navButtons) do b.BackgroundColor3 = key == state.page and palette.field or palette.panel; b.TextColor3 = key == state.page and palette.gold or palette.text end
end
local function subtitle(text) label(body, text, UDim2.fromOffset(0, 36), UDim2.fromOffset(886, 22), palette.muted, 12) end
local function statusText(status) return ({ pending = "Ellenőrzésre vár", published = "Közzétéve", rejected = "Elutasítva", archived = "Lezárva" })[status] or status or "—" end
local listPanel, detailPanel, searchBox, listScroll
local function detailClear()
    if not detailPanel then return end
    for _, child in ipairs(detailPanel:GetChildren()) do if not child:IsA("UICorner") and not child:IsA("UIStroke") then child:Destroy() end end
    fieldBoxes = {}
end
local function displayRows(records, append)
    if not alive or not listScroll or not listScroll.Parent then return end
    if not append then
        for _, child in ipairs(listScroll:GetChildren()) do child:Destroy() end
        state.records = {}
    end
    for _, row in ipairs(records) do table.insert(state.records, row) end
    for _, child in ipairs(listScroll:GetChildren()) do child:Destroy() end
    for index, row in ipairs(state.records) do
        local current = row
        local b = button(listScroll, "", UDim2.fromOffset(0, (index - 1) * 75), UDim2.new(1, -6, 0, 66), function()
            local open = function() state.dirty = false; state.pendingPayload = nil; showRecord(current) end
            if state.dirty then confirm("Elveted a nem mentett űrlapot és megnyitod ezt az iratot?", open) else open() end
        end)
        label(b, "#" .. row.id .. "  ·  " .. statusText(row.status), UDim2.fromOffset(12, 8), UDim2.new(1, -24, 0, 18), row.status == "pending" and palette.gold or palette.muted, 10, true)
        label(b, row.title, UDim2.fromOffset(12, 29), UDim2.new(1, -24, 0, 23), palette.text, 13, true)
    end
    if #state.records == 0 then label(listScroll, "Még nincs ilyen bejegyzés.\nAz Új irat gombbal készíthetsz egyet.", UDim2.fromOffset(12, 30), UDim2.new(1, -24, 0, 70), palette.muted, 12).TextWrapped = true end
    listScroll.CanvasSize = UDim2.fromOffset(0, math.max(80, #state.records * 75))
end
refreshList = function(append)
    if not state.token or not state.template then return end
    state.listEpoch = state.listEpoch + 1
    local epoch, activeTemplate = state.listEpoch, state.template
    local query = "/records?key=" .. HttpService:UrlEncode(activeTemplate.key) .. "&q=" .. HttpService:UrlEncode(searchBox and searchBox.Text or "")
    if state.recordStatus then query = query .. "&status=" .. state.recordStatus end
    if append and state.next then query = query .. "&before=" .. state.next end
    task.spawn(function()
        local result, err = api("GET", query)
        if not alive or epoch ~= state.listEpoch or state.template ~= activeTemplate then return end
        if not result then notifyError(err); return end
        state.next = result.next
        displayRows(result.records or {}, append)
        setStatus("NEXA-kapcsolat aktív • " .. tostring(#state.records) .. " irat betöltve", palette.green)
    end)
end
local function showDiscordUrl(parent, row, y)
    if row.discordUrl and row.discordUrl ~= "" then
        label(parent, "Discord-bejegyzés • kijelölhető, másolható link", UDim2.fromOffset(14, y), UDim2.new(1, -28, 0, 18), palette.muted, 10)
        local url = textbox(parent, "", UDim2.fromOffset(14, y + 22), UDim2.new(1, -28, 0, 38), false)
        url.Text = row.discordUrl; url.TextEditable = false
    end
end
showRecord = function(row)
    if not detailPanel or not detailPanel.Parent then return end
    state.selected = row; detailClear()
    label(detailPanel, "MDT #" .. row.id, UDim2.fromOffset(16, 14), UDim2.new(1, -32, 0, 27), palette.gold, 19, true)
    label(detailPanel, statusText(row.status) .. "  ·  r" .. tostring(row.revision) .. "  ·  " .. (row.discordState == "synced" and "Discord szinkronban" or "Discord-küldésre vár"), UDim2.fromOffset(16, 47), UDim2.new(1, -32, 0, 20), row.discordState == "synced" and palette.green or palette.gold, 11)
    local content = scroll(detailPanel, "RecordFields", UDim2.fromOffset(0, 85), UDim2.new(1, 0, 1, -166))
    local y = 0
    local t = state.template
    for _, spec in ipairs(t.fields) do
        label(content, spec.label, UDim2.fromOffset(16, y), UDim2.new(1, -32, 0, 18), palette.muted, 11, true)
        local value = tostring(row.fields[spec.id] or "—")
        local lines = 0
        for _ in value:gmatch("\n") do lines = lines + 1 end
        local h = math.max(38, math.min(560, math.ceil(#value / 48) * 19 + lines * 19 + 14))
        local view = label(content, value, UDim2.fromOffset(16, y + 22), UDim2.new(1, -32, 0, h), palette.text, 14)
        view.TextWrapped = true; view.TextYAlignment = Enum.TextYAlignment.Top; view.TextTruncate = Enum.TextTruncate.None
        y = y + h + 40
    end
    label(content, "Beküldő: " .. row.createdBy .. "  ·  " .. tostring(row.updatedAt), UDim2.fromOffset(16, y), UDim2.new(1, -32, 0, 38), palette.muted, 10).TextWrapped = true
    y = y + 48; showDiscordUrl(content, row, y); content.CanvasSize = UDim2.fromOffset(0, y + 90)
    local x = 14
    if row.canEdit then button(detailPanel, "Szerkesztés", UDim2.new(0, x, 1, -59), UDim2.fromOffset(119, 39), function() showEditor(row) end); x = x + 129 end
    if row.canArchive then
        button(detailPanel, "Lezárás", UDim2.new(0, x, 1, -59), UDim2.fromOffset(102, 39), function()
            confirm("Lezárod ezt az MDT-iratot? A nyilvántartás és a Discord-bejegyzés megmarad.", function()
                run(function()
                    local result, err = api("POST", "/records/" .. row.id .. "/archive", { revision = row.revision })
                    if not result then notifyError(err); return end
                    showRecord(result.record); refreshList(); setStatus(result.warning or "Az irat lezárva.", result.warning and palette.gold or palette.green)
                end)
            end)
        end); x = x + 112
    end
    if row.canSync and row.discordState ~= "synced" then button(detailPanel, "Újraküldés", UDim2.new(0, x, 1, -59), UDim2.fromOffset(113, 39), function()
        run(function()
            local result, err = api("POST", "/records/" .. row.id .. "/sync", {})
            if not result then notifyError(err); return end
            showRecord(result.record); setStatus(result.warning or "Discord-szinkron kész.", result.warning and palette.gold or palette.green)
        end)
    end, palette.gold) end
    if row.canReview then
        content.Size = UDim2.new(1, 0, 1, -214)
        for index, choice in ipairs({ { "approve", "Jóváhagyás", palette.green }, { "reject", "Elutasítás", palette.red } }) do
            local decision = choice[1]
            button(detailPanel, choice[2], UDim2.new(0, 14 + (index - 1) * 173, 1, -110), UDim2.fromOffset(162, 36), function()
                confirm("Rögzíted a vezetői döntést: " .. choice[2] .. "?", function()
                    run(function()
                        local result, err = api("POST", "/records/" .. row.id .. "/review", { revision = row.revision, decision = decision })
                        if not result then notifyError(err); return end
                        showRecord(result.record); refreshList(); setStatus(result.warning or "A vezetői döntés mentve.", result.warning and palette.gold or palette.green)
                    end)
                end)
            end, choice[3])
        end
    end
end
showEditor = function(existing, prefill)
    if state.busy or not state.template then return end
    detailClear(); state.selected = existing; state.pendingPayload = nil; state.dirty = false
    local typeInfo = state.template
    label(detailPanel, existing and ("Szerkesztés • #" .. existing.id) or "Új Belv-bejegyzés", UDim2.fromOffset(16, 14), UDim2.new(1, -32, 0, 30), palette.gold, 19, true)
    label(detailPanel, typeInfo.approval and "Beküldés után vezetői jóváhagyás szükséges." or "Beküldés után a NEXA közzéteszi a Discordon.", UDim2.fromOffset(16, 52), UDim2.new(1, -32, 0, 30), palette.muted, 11).TextWrapped = true
    local form = scroll(detailPanel, "Editor", UDim2.fromOffset(0, 98), UDim2.new(1, 0, 1, -177))
    local y = 0
    for _, spec in ipairs(typeInfo.fields) do
        label(form, spec.label .. (spec.required and " *" or ""), UDim2.fromOffset(16, y), UDim2.new(1, -32, 0, 18), palette.muted, 11, true)
        local multiline = spec.style == "paragraph"
        local h = multiline and 104 or 40
        local box = textbox(form, spec.placeholder or spec.label, UDim2.fromOffset(16, y + 26), UDim2.new(1, -32, 0, h), multiline)
        box.Text = existing and tostring(existing.fields[spec.id] or "") or prefill and tostring(prefill[spec.id] or "") or ""
        box:GetPropertyChangedSignal("Text"):Connect(function() state.dirty = true; state.pendingPayload = nil end)
        fieldBoxes[spec.id] = box; y = y + h + 46
    end
    state.dirty = prefill ~= nil
    form.CanvasSize = UDim2.fromOffset(0, y + 6)
    button(detailPanel, "Beküldés a Discordra", UDim2.new(0, 16, 1, -58), UDim2.fromOffset(224, 40), function()
        run(function()
            local fields = {}
            for _, spec in ipairs(typeInfo.fields) do
                local value = trim(fieldBoxes[spec.id].Text)
                if spec.required and value == "" then notifyError("Hiányzó mező: " .. spec.label); return end
                -- Roblox es a szerver is UTF-8 szoveget kezel; a vegso korlatot a szerver ellenorzi.
                fields[spec.id] = value
            end
            local payload
            if state.pendingPayload then payload = state.pendingPayload else
                payload = { key = typeInfo.key, fields = fields, clientKey = HttpService:GenerateGUID(false):gsub("%-", "") }
                if existing then payload.revision = existing.revision end
                state.pendingPayload = payload
            end
            local result, err, code = api(existing and "PATCH" or "POST", existing and ("/records/" .. existing.id) or "/records", payload)
            if not result then
                if code ~= 0 then state.pendingPayload = nil end
                notifyError(err .. (code == 0 and " Újrapróbáláskor ugyanazt a beküldést küldjük." or "")); return
            end
            state.pendingPayload = nil; state.dirty = false
            showRecord(result.record); refreshList()
            setStatus(result.warning or (result.record.status == "pending" and "Mentve • vezetői ellenőrzésre elküldve." or "Mentve és elküldve a Discordra."), result.warning and palette.gold or palette.green)
        end)
    end, palette.gold)
    button(detailPanel, "Mégse", UDim2.new(0, 254, 1, -58), UDim2.fromOffset(98, 40), function()
        local discard = function() state.dirty = false; state.pendingPayload = nil; if existing then showRecord(existing) else detailClear() end end
        if state.dirty then confirm("Elveted a nem mentett űrlapot?", discard) else discard() end
    end)
end
local function recordsPage()
    label(body, state.template.title, UDim2.fromOffset(0, 0), UDim2.fromOffset(674, 31), palette.text, 25, true)
    subtitle("Saját Belv MDT • csak a fő botowner és az Owner Centerben felvett Roblox-ID-k")
    button(body, "+ Új irat", UDim2.fromOffset(746, 2), UDim2.fromOffset(148, 38), function()
        if state.dirty then confirm("Elveted az aktuális űrlapot és újat kezdesz?", function() state.dirty = false; showEditor(nil) end) else showEditor(nil) end
    end, palette.gold)
    listPanel = frame(body, "ListPanel", UDim2.fromOffset(0, 80), UDim2.fromOffset(300, 498), palette.panel); corner(listPanel)
    detailPanel = frame(body, "DetailPanel", UDim2.fromOffset(314, 80), UDim2.fromOffset(580, 498), palette.panel); corner(detailPanel)
    searchBox = textbox(listPanel, "Keresés név, rendszám, szöveg…", UDim2.fromOffset(12, 12), UDim2.fromOffset(276, 40), false)
    listScroll = scroll(listPanel, "RecordList", UDim2.fromOffset(12, 68), UDim2.fromOffset(276, 369))
    if state.template.key == "warrant" then
        button(listPanel, "Összes / jóváhagyott", UDim2.fromOffset(12, 61), UDim2.fromOffset(276, 31), function()
            if state.recordStatus then state.recordStatus = nil else state.recordStatus = "published" end
            refreshList(); setStatus(state.recordStatus and "Csak jóváhagyott, le nem zárt MDT-körözések. Az érvényesség az iratban olvasható." or "Minden MDT-körözés, az állapotával együtt.")
        end)
        listScroll.Position = UDim2.fromOffset(12, 104); listScroll.Size = UDim2.fromOffset(276, 333)
    end
    button(listPanel, "Frissítés", UDim2.fromOffset(12, 451), UDim2.fromOffset(133, 34), function() refreshList() end)
    button(listPanel, "További iratok", UDim2.fromOffset(155, 451), UDim2.fromOffset(133, 34), function() if state.next then refreshList(true) else setStatus("Nincs több találat.") end end)
    local searchEpoch = 0
    searchBox:GetPropertyChangedSignal("Text"):Connect(function()
        searchEpoch = searchEpoch + 1; local mine = searchEpoch
        task.delay(0.55, function() if alive and mine == searchEpoch and searchBox and searchBox.Parent then refreshList() end end)
    end)
    label(detailPanel, "Válassz egy iratot", UDim2.fromOffset(26, 170), UDim2.new(1, -52, 0, 38), palette.text, 22, true)
    local hint = label(detailPanel, "Itt olvashatod vagy kezelheted az adatlapot.\nÚj bejegyzés: a jobb felső Új irat gomb.", UDim2.fromOffset(26, 218), UDim2.new(1, -52, 0, 62), palette.muted, 14)
    hint.TextWrapped = true
    refreshList()
end
-- A jatek dokumentacioja a rendorsegi telefonlistaban piros/feher neveket ir le.
-- Csak a tulajdonos altal kivalasztott, megjelenitett listat olvassuk.
-- Nem ismert jatekbeli attributumot nem talalgatunk, es nem hivunk jatek-remote-ot.
local function gamePlayers()
    local result = {}
    for _, player in ipairs(Players:GetPlayers()) do
        table.insert(result, { id = tostring(player.UserId), username = player.Name, displayName = player.DisplayName or player.Name, team = player.Team and player.Team.Name or "Nincs megadva", online = true })
    end
    table.sort(result, function(a, b) return a.username:lower() < b.username:lower() end)
    return result
end
local function visibleGameGui(object)
    local node, depth = object, 0
    while node and node ~= PlayerGui and depth < 100 do
        if node == screen then return false end
        if node:IsA("ScreenGui") and not node.Enabled then return false end
        if node:IsA("GuiObject") and not node.Visible then return false end
        node = node.Parent; depth = depth + 1
    end
    return node == PlayerGui
end
local function guiPath(object)
    local parts, node = {}, object
    while node and node ~= PlayerGui do table.insert(parts, 1, node.Name); node = node.Parent end
    return table.concat(parts, " / ")
end
local function textPlayer(object, byName)
    if not (object:IsA("TextLabel") or object:IsA("TextButton")) or not visibleGameGui(object) then return nil end
    local value = trim(object.Text):gsub("<[^>]+>", ""):lower()
    if byName[value] then return byName[value] end
    if value:sub(1, 1) == "@" and byName[value:sub(2)] then return byName[value:sub(2)] end
    local username = value:match("^.-%(@([a-z0-9_]+)%)$")
    return username and byName[username] or nil
end
local function wantedColor(object)
    -- Egyedi RichText-szint nem lehet a TextColor3 alapjan hitelesen ertelmezni.
    if object.RichText and object.Text:lower():find("color", 1, true) then return nil end
    local color = object.TextColor3
    if not color then return nil end
    if color.R >= 0.65 and color.R - color.G >= 0.25 and color.R - color.B >= 0.20 then return true end
    if math.min(color.R, color.G, color.B) >= 0.72 and math.max(color.R, color.G, color.B) - math.min(color.R, color.G, color.B) <= 0.15 then return false end
    return nil
end
local function wantedSnapshot(players)
    local result, byName = {}, {}
    for _, person in ipairs(players) do
        result[person.id] = { known = false, reason = "Nincs olvasható jelzés a kiválasztott játéklistában." }
        byName[person.username:lower()] = person
    end
    if not wantedSource or not visibleGameGui(wantedSource) then
        return result, "Nyisd meg a játék rendőrségi telefonlistáját, majd válaszd ki a Lista kapcsolása gombbal."
    end
    local signals = {}
    for _, object in ipairs(wantedSource:GetDescendants()) do
        local person = textPlayer(object, byName)
        if person then
            local value = wantedColor(object)
            if value ~= nil then
                local key = value and "wanted" or "clear"
                signals[person.id] = signals[person.id] or {}
                signals[person.id][key] = true
            end
        end
    end
    for id, values in pairs(signals) do
        if values.wanted and values.clear then result[id] = { known = false, reason = "Ellentmondó piros és fehér jelzés; ellenőrizd a játékban." }
        else result[id] = { known = true, wanted = values.wanted == true, source = wantedSourcePath, readAt = os.date("%H:%M:%S") } end
    end
    return result, nil
end
local function wantedLabel(value)
    if not value or not value.known then return "Játék körözése: ismeretlen", palette.muted end
    if value.wanted then return "Játék körözése: KÖRÖZÖTT", palette.red end
    return "Játék körözése: nincs körözésjelzés", palette.green
end
local playerList, playerDetail, playerSearch, playerSummary, playerSourceLabel, playerWantedLabel, playerInfoLabel
local function choosePoliceList()
    if state.busy or not state.token then return end
    closeModal()
    modal = frame(screen, "PoliceSourcePicker", UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(780, 488), palette.panel)
    modal.AnchorPoint = Vector2.new(0.5, 0.5); modal.ZIndex = 10; corner(modal, 12); stroke(modal)
    label(modal, "A játék rendőrségi telefonlistája", UDim2.fromOffset(20, 14), UDim2.fromOffset(740, 30), palette.gold, 20, true)
    local help = label(modal, "A telefon rendőrségi névlistája legyen nyitva. Válaszd ki azt a sort, amelynek nevei egyeznek a játék listájával. A játékoslista vagy a chat színe nem körözési adat.", UDim2.fromOffset(20, 52), UDim2.fromOffset(740, 58), palette.muted, 13)
    help.TextWrapped = true; help.TextTruncate = Enum.TextTruncate.None
    local pane = scroll(modal, "PoliceSources", UDim2.fromOffset(20, 120), UDim2.fromOffset(740, 294))
    local byName, candidates = {}, {}
    for _, person in ipairs(gamePlayers()) do byName[person.username:lower()] = person end
    for _, object in ipairs(PlayerGui:GetDescendants()) do
        local person = textPlayer(object, byName)
        if person then
            local node, depth = object.Parent, 0
            while node and node ~= PlayerGui and depth < 12 do
                if node:IsA("Frame") or node:IsA("ScrollingFrame") or node:IsA("ScreenGui") then
                    candidates[node] = candidates[node] or { node = node, names = {}, count = 0, path = guiPath(node) }
                    local candidate = candidates[node]
                    if not candidate.names[person.username] then candidate.names[person.username] = true; candidate.count = candidate.count + 1 end
                end
                node = node.Parent; depth = depth + 1
            end
        end
    end
    local ordered = {}
    for _, candidate in pairs(candidates) do table.insert(ordered, candidate) end
    table.sort(ordered, function(a, b)
        if a.count ~= b.count then return a.count > b.count end
        if a.node:IsA("ScrollingFrame") ~= b.node:IsA("ScrollingFrame") then return a.node:IsA("ScrollingFrame") end
        return #a.path > #b.path
    end)
    for index, candidate in ipairs(ordered) do
        if index > 40 then break end
        local selected, names = candidate, {}
        for name in pairs(candidate.names) do table.insert(names, name) end
        table.sort(names)
        local b = button(pane, "", UDim2.fromOffset(0, (index - 1) * 77), UDim2.fromOffset(722, 68), function()
            wantedSource = selected.node; wantedSourcePath = selected.path; closeModal()
            if refreshPlayersPage then refreshPlayersPage() end
        end)
        label(b, candidate.path, UDim2.fromOffset(12, 8), UDim2.fromOffset(695, 24), palette.text, 12, true)
        label(b, tostring(candidate.count) .. " név: " .. table.concat(names, ", "):sub(1, 85), UDim2.fromOffset(12, 35), UDim2.fromOffset(695, 23), palette.muted, 11)
    end
    pane.CanvasSize = UDim2.fromOffset(0, math.min(40, #ordered) * 77)
    if #ordered == 0 then label(pane, "Nincs felismerhető felhasználónév a megjelenített játékfelületen. Nyisd meg a rendőrségi telefont és a játékoslistáját, majd próbáld újra. Az MDT addig ismeretlen állapotot jelez.", UDim2.fromOffset(14, 28), UDim2.fromOffset(694, 120), palette.muted, 15).TextWrapped = true end
    button(modal, "Mégse", UDim2.fromOffset(20, 435), UDim2.fromOffset(180, 34), closeModal)
    button(modal, "Kapcsolat törlése", UDim2.fromOffset(530, 435), UDim2.fromOffset(230, 34), function() wantedSource = nil; wantedSourcePath = nil; closeModal(); refreshPlayersPage() end)
    for _, object in ipairs(modal:GetDescendants()) do if object:IsA("GuiObject") then object.ZIndex = 11 end end
end
local function templateByKey(key)
    for _, template in ipairs(state.templates) do if template.key == key then return template end end
    return nil
end
local function openRelatedRecord(row)
    local template = templateByKey(row.key)
    if not template then notifyError("Az irattípus már nem elérhető."); return end
    state.page = row.key; state.template = template; state.person = nil; state.selected = nil
    renderPage(); showRecord(row)
end
local function beginPersonEntry(person, key)
    if state.busy then return end
    local template = templateByKey(key)
    if not template then notifyError("Ehhez a nyilvántartáshoz nincs beállított célcsatorna."); return end
    local prefill = { robloxId = person.id }
    if key == "person" then prefill.username = person.username; prefill.name = person.displayName
    elseif key == "warrant" then prefill.target = person.username
    elseif key == "case" then prefill.persons = person.username end
    state.page = key; state.template = template; state.person = nil; state.selected = nil
    renderPage(); showEditor(nil, prefill)
end
local function displayPersonRecords(person, records, pane)
    for _, child in ipairs(pane:GetChildren()) do child:Destroy() end
    for index, row in ipairs(records) do
        local selected = row
        local b = button(pane, "", UDim2.fromOffset(0, (index - 1) * 67), UDim2.new(1, -5, 0, 59), function() openRelatedRecord(selected) end)
        label(b, (row.key == "warrant" and "MDT-KÖRÖZÉS" or row.key == "case" and "ÜGYIRAT" or "SZEMÉLYADAT") .. " • " .. statusText(row.status), UDim2.fromOffset(10, 6), UDim2.new(1, -20, 0, 18), row.key == "warrant" and palette.gold or palette.muted, 10, true)
        label(b, "#" .. row.id .. " " .. row.title .. (row.identityMatch == "legacyUsername" and " [csak névegyezés]" or ""), UDim2.fromOffset(10, 29), UDim2.new(1, -20, 0, 22), palette.text, 13)
    end
    if #records == 0 then label(pane, "Nincs ehhez az ID-hez kapcsolt MDT-irat.\nA fenti gombokkal adhatsz hozzá.", UDim2.fromOffset(12, 20), UDim2.new(1, -24, 0, 72), palette.muted, 13).TextWrapped = true end
    pane.CanvasSize = UDim2.fromOffset(0, math.max(90, #records * 67))
end
showPlayerProfile = function(person)
    if state.busy or not state.token or not playerDetail or not playerDetail.Parent then return end
    state.person = person; state.personRecords = {}; state.personNext = nil
    for _, child in ipairs(playerDetail:GetChildren()) do if not child:IsA("UICorner") then child:Destroy() end end
    label(playerDetail, person.displayName, UDim2.fromOffset(16, 12), UDim2.fromOffset(548, 29), palette.gold, 22, true)
    label(playerDetail, "@" .. person.username .. " • Roblox-ID: " .. person.id, UDim2.fromOffset(16, 48), UDim2.fromOffset(548, 21), palette.text, 13)
    playerInfoLabel = label(playerDetail, person.online and ("Ebben a szerverben • Csapat: " .. person.team) or "Nincs ebben a szerverben • játékállapot ismeretlen", UDim2.fromOffset(16, 77), UDim2.fromOffset(548, 21), palette.muted, 12)
    local snapshot = wantedSnapshot(gamePlayers())
    local text, color = wantedLabel(snapshot[person.id])
    playerWantedLabel = label(playerDetail, text, UDim2.fromOffset(16, 105), UDim2.fromOffset(548, 21), color, 13, true)
    local profile = textbox(playerDetail, "Roblox-profil", UDim2.fromOffset(16, 137), UDim2.fromOffset(548, 31), false)
    profile.Text = "https://www.roblox.com/users/" .. person.id .. "/profile"; profile.TextEditable = false
    for index, choice in ipairs({ { "person", "+ Személyadat" }, { "warrant", "+ MDT-körözés" }, { "case", "+ Ügyirat" } }) do
        local key = choice[1]
        button(playerDetail, choice[2], UDim2.fromOffset(16 + (index - 1) * 184, 181), UDim2.fromOffset(172, 34), function() beginPersonEntry(person, key) end, index == 1 and palette.gold or nil)
    end
    label(playerDetail, "Saját MDT-iratok • a játék körözését nem módosítják", UDim2.fromOffset(16, 229), UDim2.fromOffset(548, 21), palette.muted, 11, true)
    local pane = scroll(playerDetail, "PersonRecords", UDim2.fromOffset(16, 260), UDim2.fromOffset(548, 186))
    label(pane, "Személyhez kapcsolt MDT-iratok lekérése…", UDim2.fromOffset(12, 20), UDim2.fromOffset(520, 30), palette.muted, 13)
    local epoch = state.listEpoch
    local function fetch(append)
        run(function()
            local path = "/people/lookup?robloxId=" .. HttpService:UrlEncode(person.id) .. "&username=" .. HttpService:UrlEncode(person.username)
            if append and state.personNext then path = path .. "&before=" .. state.personNext end
            local result, err = api("GET", path)
            if not alive or not state.token or epoch ~= state.listEpoch or state.person ~= person or not pane.Parent then return end
            if not result then
                for _, child in ipairs(pane:GetChildren()) do child:Destroy() end
                label(pane, "A lekérdezés nem sikerült; ez nem jelent üres nyilvántartást.", UDim2.fromOffset(12, 20), UDim2.fromOffset(520, 75), palette.red, 13).TextWrapped = true
                notifyError(err); return
            end
            if not append then state.personRecords = {} end
            for _, row in ipairs(result.records or {}) do table.insert(state.personRecords, row) end
            state.personNext = result.next
            displayPersonRecords(person, state.personRecords, pane)
            setStatus("Személy lekérdezve • " .. tostring(#state.personRecords) .. " kapcsolt MDT-irat", palette.green)
        end)
    end
    button(playerDetail, "Iratok frissítése", UDim2.fromOffset(16, 459), UDim2.fromOffset(260, 28), function() fetch(false) end)
    button(playerDetail, "További iratok", UDim2.fromOffset(304, 459), UDim2.fromOffset(260, 28), function() if state.personNext then fetch(true) else setStatus("Nincs további kapcsolt MDT-irat.") end end)
    fetch(false)
end
refreshPlayersPage = function()
    if not state.token or not playerList or not playerList.Parent then return end
    local players = gamePlayers()
    local snapshot, sourceError = wantedSnapshot(players)
    if state.person and playerWantedLabel and playerWantedLabel.Parent then
        local text, color = wantedLabel(snapshot[state.person.id])
        playerWantedLabel.Text = text; playerWantedLabel.TextColor3 = color
        local connected = nil
        for _, person in ipairs(players) do if person.id == state.person.id then connected = person; break end end
        if playerInfoLabel and playerInfoLabel.Parent then
            playerInfoLabel.Text = connected and ("Ebben a szerverben • Csapat: " .. connected.team) or "Nincs ebben a szerverben • játékállapot ismeretlen"
        end
    end
    local query = trim(playerSearch and playerSearch.Text or ""):lower()
    local wanted, unknown, clear = 0, 0, 0
    for _, person in ipairs(players) do
        local value = snapshot[person.id]
        if not value.known then unknown = unknown + 1 elseif value.wanted then wanted = wanted + 1 else clear = clear + 1 end
    end
    playerSummary.Text = "Körözésjelzés: " .. wanted .. " • Nincs jelzés: " .. clear .. " • Ismeretlen: " .. unknown
    playerSourceLabel.Text = sourceError or ("Játékforrás: " .. (wantedSourcePath or "—") .. " • olvasva " .. os.date("%H:%M:%S"))
    for _, child in ipairs(playerList:GetChildren()) do child:Destroy() end
    table.sort(players, function(a, b)
        local sa, sb = snapshot[a.id], snapshot[b.id]
        local ra, rb = sa.known and (sa.wanted and 2 or 0) or 1, sb.known and (sb.wanted and 2 or 0) or 1
        if state.page == "gamewanted" and ra ~= rb then return ra > rb end
        return a.username:lower() < b.username:lower()
    end)
    local count = 0
    for _, person in ipairs(players) do
        local value = snapshot[person.id]
        local match = query == "" or person.id == query or person.username:lower():find(query, 1, true) or person.displayName:lower():find(query, 1, true)
        if match and (state.page ~= "gamewanted" or not value.known or value.wanted) then
            local selected = person
            local b = button(playerList, "", UDim2.fromOffset(0, count * 85), UDim2.new(1, -5, 0, 77), function() showPlayerProfile(selected) end)
            local text, color = wantedLabel(value)
            label(b, "@" .. person.username, UDim2.fromOffset(10, 8), UDim2.new(1, -20, 0, 22), palette.text, 13, true)
            label(b, person.id .. " • " .. person.team, UDim2.fromOffset(10, 34), UDim2.new(1, -20, 0, 17), palette.muted, 10)
            label(b, text:gsub("Játék körözése: ", ""), UDim2.fromOffset(10, 55), UDim2.new(1, -20, 0, 16), color, 10, true)
            count = count + 1
        end
    end
    if count == 0 then label(playerList, "Nincs a szűréshez illeszkedő játékos.\nAz ismeretlen állapot nem jelent körözésmentességet.", UDim2.fromOffset(12, 20), UDim2.new(1, -24, 0, 100), palette.muted, 13).TextWrapped = true end
    playerList.CanvasSize = UDim2.fromOffset(0, math.max(110, count * 85))
end
local function playersPage()
    label(body, state.page == "gamewanted" and "A játék körözöttjei" or "Játékoskereső és személyadatlap", UDim2.fromOffset(0, 0), UDim2.fromOffset(680, 31), palette.text, 24, true)
    subtitle("Játék szerinti jelzés: a kiválasztott rendőrségi telefonlistából • saját MDT-adatok külön")
    button(body, "Lista kapcsolása", UDim2.fromOffset(704, 0), UDim2.fromOffset(190, 35), choosePoliceList, palette.gold)
    playerSummary = label(body, "Játékadatok ellenőrzése…", UDim2.fromOffset(0, 68), UDim2.fromOffset(890, 22), palette.gold, 12, true)
    playerSummary.Size = UDim2.fromOffset(300, 30); playerSummary.TextWrapped = true; playerSummary.TextTruncate = Enum.TextTruncate.None
    playerSourceLabel = label(body, "", UDim2.fromOffset(0, 98), UDim2.fromOffset(890, 44), palette.muted, 11)
    playerSourceLabel.TextWrapped = true; playerSourceLabel.TextTruncate = Enum.TextTruncate.None
    local left = frame(body, "PlayerListPanel", UDim2.fromOffset(0, 153), UDim2.fromOffset(300, 425), palette.panel); corner(left)
    playerDetail = frame(body, "PlayerDetailPanel", UDim2.fromOffset(314, 80), UDim2.fromOffset(580, 498), palette.panel); corner(playerDetail)
    -- A forras szovege a lista felett, a jobb oldali adatlap mellett jelenik meg.
    playerSourceLabel.Size = UDim2.fromOffset(300, 44)
    playerSearch = textbox(left, "Felhasználónév vagy Roblox-ID", UDim2.fromOffset(12, 12), UDim2.fromOffset(276, 38), false)
    playerList = scroll(left, "LivePlayers", UDim2.fromOffset(12, 102), UDim2.fromOffset(276, 310))
    button(left, "Profil lekérése", UDim2.fromOffset(12, 60), UDim2.fromOffset(168, 30), function()
        if state.busy then return end
        local query = trim(playerSearch.Text)
        if query == "" then notifyError("Adj meg pontos felhasználónevet vagy Roblox-ID-t."); return end
        for _, person in ipairs(gamePlayers()) do
            if person.id == query or person.username:lower() == query:lower() then showPlayerProfile(person); return end
        end
        local epoch, profile = state.listEpoch, nil
        run(function()
            local ok, err = pcall(function()
                local id
                if query:match("^[1-9]%d*$") and #query <= 15 then id = tonumber(query)
                elseif query:match("^[a-zA-Z0-9_]+$") and #query >= 3 and #query <= 20 then id = Players:GetUserIdFromNameAsync(query)
                else error("Pontos Roblox-felhasználónevet vagy számazonosítót adj meg.") end
                local name = Players:GetNameFromUserIdAsync(id)
                profile = { id = string.format("%.0f", id), username = name, displayName = name, online = false, team = "Ismeretlen" }
            end)
            if not alive or not state.token or epoch ~= state.listEpoch then return end
            if not ok then notifyError("A Roblox-profil nem kérhető le: " .. tostring(err):sub(1, 120)); return end
            task.defer(function() if alive and state.token and epoch == state.listEpoch then showPlayerProfile(profile) end end)
        end)
    end)
    button(left, "Frissít", UDim2.fromOffset(190, 60), UDim2.fromOffset(98, 30), function()
        run(function() local result, err = api("GET", "/bootstrap"); if result then refreshPlayersPage(); setStatus("Játékoslista frissítve.", palette.green) else notifyError(err) end end)
    end)
    playerSearch:GetPropertyChangedSignal("Text"):Connect(refreshPlayersPage)
    label(playerDetail, "Válassz játékost", UDim2.fromOffset(26, 165), UDim2.fromOffset(528, 38), palette.text, 23, true)
    local help = label(playerDetail, "Lekérheted a nyilvános Roblox-profilt, a játékban látható csapatot, a körözésjelzést és a saját MDT-iratokat. Innen személyadatot, RP-körözést és ügyiratot is hozzáadhatsz.", UDim2.fromOffset(26, 221), UDim2.fromOffset(528, 111), palette.muted, 14)
    help.TextWrapped = true; help.TextTruncate = Enum.TextTruncate.None
    local epoch = state.listEpoch
    task.spawn(function()
        local result, err = api("GET", "/bootstrap")
        if not alive or not state.token or epoch ~= state.listEpoch then return end
        if result then refreshPlayersPage(); setStatus("Személyes owner-hozzáférés ellenőrizve.", palette.green) else notifyError(err) end
    end)
end
renderPage = function()
    clearBody()
    if state.page == "overview" then
        label(body, "Műveleti áttekintés", UDim2.fromOffset(0, 0), UDim2.fromOffset(860, 36), palette.text, 27, true)
        subtitle("NEXA botkapcsolat • saját Belv Discord • kizárólag a fő botowner számára")
        local cards = { { "JÁTÉKOSOK", "Keresés és adatlap", "Név vagy Roblox-ID alapján kereshetsz." }, { "DISCORD", "Automatikus közzététel", "A célcsatornák az Owner Centerben készülnek." }, { "KÖRÖZÉS", "Játék és saját MDT", "A játék jelzése és a saját RP-irat külön látszik." } }
        for index, card in ipairs(cards) do
            local p = frame(body, "Info" .. index, UDim2.fromOffset((index - 1) * 302, 91), UDim2.fromOffset(290, 171), palette.panel); corner(p)
            label(p, card[1], UDim2.fromOffset(18, 18), UDim2.fromOffset(260, 22), palette.gold, 10, true)
            label(p, card[2], UDim2.fromOffset(18, 57), UDim2.fromOffset(260, 34), palette.text, 16, true)
            local description = label(p, card[3], UDim2.fromOffset(18, 107), UDim2.fromOffset(254, 47), palette.muted, 12); description.TextWrapped = true
        end
        local p = frame(body, "Start", UDim2.fromOffset(0, 284), UDim2.fromOffset(894, 294), palette.panel); corner(p)
        label(p, "BELVÉDELMI IGAZGATÓSÁG", UDim2.fromOffset(24, 23), UDim2.fromOffset(830, 35), palette.text, 23, true)
        local instruction = label(p, "1. Válassz nyilvántartást vagy Belv-iratsablont.\n2. Töltsd ki az űrlapot, majd küldd be.\n3. A NEXA menti az iratot és megjeleníti Discordon.\n\nA panelben csak RP-adatokat adj meg. A Roblox-játék állapotát nem módosítja.", UDim2.fromOffset(24, 74), UDim2.fromOffset(820, 147), palette.muted, 15)
        instruction.TextWrapped = true; instruction.TextTruncate = Enum.TextTruncate.None
        button(p, "Belv-iratsablonok megnyitása", UDim2.fromOffset(24, 234), UDim2.fromOffset(298, 38), function() navigate("document") end, palette.gold)
    elseif state.page == "players" or state.page == "gamewanted" then playersPage()
    elseif state.page == "document" and not state.template then
        label(body, "Belv-iratsablonok", UDim2.fromOffset(0, 0), UDim2.fromOffset(860, 36), palette.text, 27, true)
        subtitle("A NEXA Discordon beállított Belv-sablonjai • személyes owner hozzáférés")
        local pane = scroll(body, "Templates", UDim2.fromOffset(0, 82), UDim2.fromOffset(894, 496))
        local index = 0
        for _, t in ipairs(state.templates) do
            if t.category == "document" then
                local selected = t; local y = index * 74; index = index + 1
                local b = button(pane, "", UDim2.fromOffset(0, y), UDim2.new(1, -8, 0, 62), function() state.template = selected; renderPage() end)
                label(b, t.title, UDim2.fromOffset(18, 10), UDim2.new(1, -220, 0, 25), palette.text, 15, true)
                label(b, t.approval and "Vezetői jóváhagyással" or "Közvetlen közzététel", UDim2.fromOffset(18, 37), UDim2.new(1, -220, 0, 16), palette.muted, 11)
                label(b, "MEGNYITÁS  →", UDim2.new(1, -176, 0, 20), UDim2.fromOffset(150, 22), palette.gold, 11, true)
            end
        end
        pane.CanvasSize = UDim2.fromOffset(0, index * 74)
        if index == 0 then label(pane, "Nincs elérhető sablon. Ellenőrizd a Belv-dokumentumok használati rangját és a csatornajogaidat a NEXA-ban.", UDim2.fromOffset(16, 30), UDim2.new(1, -32, 0, 90), palette.muted, 15).TextWrapped = true end
    elseif state.template then recordsPage()
    else
        label(body, "Ez az irattípus nem érhető el", UDim2.fromOffset(20, 170), UDim2.fromOffset(800, 46), palette.text, 26, true)
        label(body, "Ellenőrizd a Discord-csatorna és a Belv-rang jogosultságait.", UDim2.fromOffset(20, 225), UDim2.fromOffset(830, 50), palette.muted, 14).TextWrapped = true
    end
end
showLogin = function()
    clearBody()
    label(body, "Belépés a Belv MDT-be", UDim2.fromOffset(32, 45), UDim2.fromOffset(810, 45), palette.text, 29, true)
    local help = label(body, "Discordon a Belv-szerveren kérj személyes kódot: /mdt belepes\nA kapott NEXA-webcímet és a 10 percig érvényes kódot add meg itt.", UDim2.fromOffset(32, 105), UDim2.fromOffset(810, 58), palette.muted, 15)
    help.TextWrapped = true; help.TextTruncate = Enum.TextTruncate.None
    label(body, "NEXA WEBcím", UDim2.fromOffset(32, 195), UDim2.fromOffset(700, 22), palette.gold, 11, true)
    local base = textbox(body, "https://a-sajat-nexa-botod.onrender.com", UDim2.fromOffset(32, 227), UDim2.fromOffset(750, 48), false)
    base.Text = state.base
    base.TextEditable = false
    label(body, "SZEMÉLYES DISCORD-BELÉPŐKÓD", UDim2.fromOffset(32, 306), UDim2.fromOffset(700, 22), palette.gold, 11, true)
    local code = textbox(body, "A /mdt belepes privát válaszából", UDim2.fromOffset(32, 338), UDim2.fromOffset(750, 48), false)
    button(body, "Kapcsolódás a NEXA bothoz", UDim2.fromOffset(32, 418), UDim2.fromOffset(302, 48), function()
        run(function()
            state.base = trim(base.Text):gsub("/+$", "")
            local result, err = api("POST", "/auth", { code = trim(code.Text), robloxUserId = tostring(LocalPlayer.UserId), guildId = CONFIG.GuildId }, true)
            if not result then notifyError(err); return end
            state.token = result.token; code.Text = ""
            local bootstrap, bootError = api("GET", "/bootstrap")
            if not bootstrap then notifyError(bootError); return end
            state.templates = bootstrap.templates or {}; state.officer = bootstrap.officer; state.guild = bootstrap.guild; state.page = "overview"
            headerUser.Text = bootstrap.officer.name .. "  ·  " .. bootstrap.guild.name
            headerUser.TextColor3 = palette.green; renderPage(); setStatus("Csatlakozva • " .. tostring(#state.templates) .. " elérhető irattípus", palette.green)
        end)
    end, palette.gold)
    local hint = label(body, "Csak a fő botowner és az engedélyezett Roblox-ID jelentkezhet be.\nA bot Discord-tokenje csak a szerveren marad.", UDim2.fromOffset(32, 494), UDim2.fromOffset(780, 52), palette.muted, 12)
    hint.TextWrapped = true
end
local function resize()
    local camera = workspace.CurrentCamera
    if camera then
        local viewport = camera.ViewportSize
        scale.Scale = math.min(1, math.max(0.2, math.min((viewport.X - 30) / 1120, (viewport.Y - 100) / 720)))
    end
end
local cameraConnection
local function bindCamera()
    if cameraConnection then cameraConnection:Disconnect() end
    if workspace.CurrentCamera then cameraConnection = connect(workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"), resize) end
    resize()
end
connect(workspace:GetPropertyChangedSignal("CurrentCamera"), bindCamera)
connect(UserInputService.InputBegan, function(input, processed)
    if not processed and not UserInputService:GetFocusedTextBox() and input.KeyCode == Enum.KeyCode.F6 then window.Visible = not window.Visible end
end)
destroyPanel = function()
    if state.busy then setStatus("Várd meg a folyamatban lévő műveletet.", palette.gold); return end
    confirm("Bezárod a panelt? A beküldött iratok megmaradnak; a nem mentett űrlap elvész.", function()
        run(function()
            if state.token then api("POST", "/logout", {}); state.token = nil end
            alive = false
            for _, connection in ipairs(connections) do connection:Disconnect() end
            closeModal(); screen:Destroy()
        end)
    end)
end
connect(screen.Destroying, function()
    alive = false; state.token = nil
    for _, connection in ipairs(connections) do connection:Disconnect() end
end)
bindCamera(); showLogin()
task.spawn(function()
    local tick = 0
    while alive do
        task.wait(5); tick = tick + 1
        if alive and window.Visible and state.token and not state.busy then
            if state.page == "players" or state.page == "gamewanted" then
                if tick % 6 == 0 then
                    local result, err = api("GET", "/bootstrap")
                    if not result then notifyError(err) end
                end
                if state.token then refreshPlayersPage() end
            elseif state.template and tick % 6 == 0 then refreshList() end
        end
    end
end)
