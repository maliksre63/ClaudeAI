--[[
    ESX Toolkit - Server
    Admin-Commands mit Gruppen-Pruefung (ESX) + sichere Geld-Funktionen.
]]

local ESX = exports['es_extended']:getSharedObject()

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

--- Prueft, ob der Spieler eine erlaubte Admin-Gruppe hat.
local function isAdmin(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return false end
    return Config.AdminGroups[xPlayer.getGroup()] == true
end

--- Sendet eine Chat-Nachricht an einen Spieler.
local function notify(src, msg)
    TriggerClientEvent('chat:addMessage', src, {
        color = Config.ChatColor,
        multiline = true,
        args = { Config.ChatTitle, msg }
    })
end

--- Registriert einen Command, der nur fuer Admins funktioniert.
local function registerAdminCommand(name, help, args, handler)
    RegisterCommand(name, function(source, cmdArgs)
        if source == 0 then  -- Server-Konsole immer erlauben
            handler(source, cmdArgs)
            return
        end
        if not isAdmin(source) then
            notify(source, 'Keine Berechtigung fuer ^1/' .. name .. '^0.')
            return
        end
        handler(source, cmdArgs)
    end, false)

    -- Macht den Command im Chat-Vorschlagsmenue (T) sichtbar
    TriggerClientEvent('chat:addSuggestion', -1, '/' .. name, help, args or {})
end

-- ---------------------------------------------------------------------------
-- Geld-Commands (Admin)
-- ---------------------------------------------------------------------------

-- /givecash [id] [betrag] - gibt einem Spieler Bargeld
registerAdminCommand('givecash', 'Gibt einem Spieler Bargeld (Admin)', {
    { name = 'id', help = 'Server-ID des Spielers' },
    { name = 'betrag', help = 'Betrag in $' },
}, function(src, args)
    local target = tonumber(args[1])
    local amount = tonumber(args[2])
    if not target or not amount then
        notify(src, 'Nutzung: ^3/givecash [id] [betrag]^0')
        return
    end
    if amount <= 0 or amount > Config.MaxGiveCash then
        notify(src, 'Betrag muss zwischen 1 und ' .. Config.MaxGiveCash .. ' liegen.')
        return
    end
    local xTarget = ESX.GetPlayerFromId(target)
    if not xTarget then
        notify(src, 'Spieler mit ID ^1' .. target .. '^0 nicht gefunden.')
        return
    end
    xTarget.addMoney(amount)
    notify(src, ('$%d an Spieler %d gegeben.'):format(amount, target))
    notify(target, ('Du hast $%d von einem Admin erhalten.'):format(amount))
end)

-- /setjob [id] [job] [grade] - setzt den Job eines Spielers
registerAdminCommand('setjob', 'Setzt den Job eines Spielers (Admin)', {
    { name = 'id', help = 'Server-ID' },
    { name = 'job', help = 'Job-Name (z.B. police)' },
    { name = 'grade', help = 'Dienstgrad (Zahl)' },
}, function(src, args)
    local target = tonumber(args[1])
    local job = args[2]
    local grade = tonumber(args[3]) or 0
    if not target or not job then
        notify(src, 'Nutzung: ^3/setjob [id] [job] [grade]^0')
        return
    end
    local xTarget = ESX.GetPlayerFromId(target)
    if not xTarget then
        notify(src, 'Spieler nicht gefunden.')
        return
    end
    xTarget.setJob(job, grade)
    notify(src, ('Job von %d auf %s (%d) gesetzt.'):format(target, job, grade))
    notify(target, ('Dein Job wurde auf %s gesetzt.'):format(job))
end)

-- ---------------------------------------------------------------------------
-- Relay-Events: Client meldet Aktion -> Server prueft Rechte -> bestaetigt
-- ---------------------------------------------------------------------------

-- Heilen/Wiederbeleben werden client-seitig ausgefuehrt, aber hier auf
-- Admin-Rechte geprueft (Anti-Cheat freundlich).
RegisterNetEvent('esx_toolkit:requestAdminAction', function(action, targetId)
    local src = source
    if not isAdmin(src) then
        notify(src, 'Keine Berechtigung.')
        return
    end
    local target = tonumber(targetId) or src
    local xTarget = ESX.GetPlayerFromId(target)
    if not xTarget then
        notify(src, 'Zielspieler nicht gefunden.')
        return
    end
    TriggerClientEvent('esx_toolkit:doAdminAction', xTarget.source, action)
    if target ~= src then
        notify(src, ('Aktion "%s" auf Spieler %d ausgefuehrt.'):format(action, target))
    end
end)

print('^2[esx_toolkit]^0 Server geladen.')
