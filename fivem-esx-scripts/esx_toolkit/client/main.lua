--[[
    ESX Toolkit - Client
    Spieler- und Admin-Commands, die lokal ausgefuehrt werden.
    Admin-Aktionen werden vorher serverseitig auf Rechte geprueft.
]]

local ESX = exports['es_extended']:getSharedObject()

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

local function notify(msg)
    TriggerEvent('chat:addMessage', {
        color = Config.ChatColor,
        multiline = true,
        args = { Config.ChatTitle, msg }
    })
end

local function getVehicleInFront()
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if veh ~= 0 then return veh end
    return nil
end

-- ---------------------------------------------------------------------------
-- Fahrzeug-Commands
-- ---------------------------------------------------------------------------

-- /car [modell] - spawnt ein Fahrzeug und setzt dich hinein
RegisterCommand('car', function(_, args)
    local model = args[1]
    if not model then
        notify('Nutzung: ^3/car [modell]^0  (z.B. /car adder)')
        return
    end
    local hash = GetHashKey(model)
    if not IsModelInCdimage(hash) or not IsModelAVehicle(hash) then
        notify('Ungueltiges Fahrzeugmodell: ^1' .. model .. '^0')
        return
    end

    RequestModel(hash)
    local timeout = 0
    while not HasModelLoaded(hash) and timeout < 1000 do
        Wait(10)
        timeout = timeout + 1
    end
    if not HasModelLoaded(hash) then
        notify('Modell konnte nicht geladen werden.')
        return
    end

    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    local veh = CreateVehicle(hash, coords.x, coords.y, coords.z, heading, true, false)
    SetPedIntoVehicle(ped, veh, -1)
    SetVehicleNumberPlateText(veh, 'TOOLKIT')
    SetEntityAsNoLongerNeeded(veh)
    SetModelAsNoLongerNeeded(hash)
    notify('Fahrzeug ^2' .. model .. '^0 gespawnt.')
end, false)

-- /dv - loescht das Fahrzeug, in dem du sitzt (oder das naechste)
RegisterCommand('dv', function()
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if veh == 0 then
        -- naechstes Fahrzeug in der Naehe suchen
        local coords = GetEntityCoords(ped)
        veh = GetClosestVehicle(coords.x, coords.y, coords.z, 5.0, 0, 71)
    end
    if veh and veh ~= 0 then
        SetEntityAsMissionEntity(veh, true, true)
        DeleteVehicle(veh)
        notify('Fahrzeug geloescht.')
    else
        notify('Kein Fahrzeug in der Naehe.')
    end
end, false)

-- /fix - repariert dein aktuelles Fahrzeug
RegisterCommand('fix', function()
    local veh = getVehicleInFront()
    if not veh then
        notify('Du sitzt in keinem Fahrzeug.')
        return
    end
    SetVehicleFixed(veh)
    SetVehicleDeformationFixed(veh)
    SetVehicleEngineHealth(veh, 1000.0)
    SetVehicleBodyHealth(veh, 1000.0)
    SetVehiclePetrolTankHealth(veh, 1000.0)
    notify('Fahrzeug repariert.')
end, false)

-- /clean - reinigt dein Fahrzeug
RegisterCommand('clean', function()
    local veh = getVehicleInFront()
    if not veh then
        notify('Du sitzt in keinem Fahrzeug.')
        return
    end
    SetVehicleDirtLevel(veh, 0.0)
    notify('Fahrzeug gereinigt.')
end, false)

-- ---------------------------------------------------------------------------
-- Teleport / Koordinaten
-- ---------------------------------------------------------------------------

-- /tpm - teleportiert dich zum gesetzten Wegpunkt (Karte)
RegisterCommand('tpm', function()
    local blip = GetFirstBlipInfoId(8)  -- 8 = Wegpunkt
    if not DoesBlipExist(blip) then
        notify('Kein Wegpunkt gesetzt. Setze einen auf der Karte.')
        return
    end
    local coords = GetBlipInfoIdCoord(blip)
    local ped = PlayerPedId()

    -- Bodenhoehe ermitteln, damit man nicht unter die Map faellt
    local found, z = false, 0.0
    for height = 1000, 0, -25 do
        SetEntityCoordsNoOffset(ped, coords.x, coords.y, height + 0.0, false, false, false)
        Wait(20)
        found, z = GetGroundZFor_3dCoord(coords.x, coords.y, height + 0.0, false)
        if found then break end
    end

    SetEntityCoordsNoOffset(ped, coords.x, coords.y, (found and z or 200.0) + 1.0, false, false, false)
    notify('Zum Wegpunkt teleportiert.')
end, false)

-- /coords - zeigt deine aktuellen Koordinaten und kopiert sie in die F8-Konsole
RegisterCommand('coords', function()
    local coords = GetEntityCoords(PlayerPedId())
    local heading = GetEntityHeading(PlayerPedId())
    local line = ('vector4(%.2f, %.2f, %.2f, %.2f)'):format(coords.x, coords.y, coords.z, heading)
    notify('Koordinaten: ^2' .. line)
    print('[coords] ' .. line)  -- erscheint in der F8-Konsole zum Kopieren
end, false)

-- ---------------------------------------------------------------------------
-- Spieler-Commands (lokal)
-- ---------------------------------------------------------------------------

-- /heal - heilt dich selbst (oder mit ID einen anderen Spieler -> serverseitig geprueft)
RegisterCommand('heal', function(_, args)
    if args[1] then
        -- Anderer Spieler -> Server prueft Admin-Rechte
        TriggerServerEvent('esx_toolkit:requestAdminAction', 'heal', args[1])
        return
    end
    local ped = PlayerPedId()
    SetEntityHealth(ped, GetEntityMaxHealth(ped))
    notify('Du wurdest geheilt.')
end, false)

-- /armor - gibt dir volle Weste
RegisterCommand('armor', function()
    SetPedArmour(PlayerPedId(), 100)
    notify('Weste aufgefuellt.')
end, false)

-- /revive [id] - belebt wieder (Admin, serverseitig geprueft)
RegisterCommand('revive', function(_, args)
    TriggerServerEvent('esx_toolkit:requestAdminAction', 'revive', args[1])
end, false)

-- Server bestaetigt eine Admin-Aktion -> hier ausfuehren
RegisterNetEvent('esx_toolkit:doAdminAction', function(action)
    local ped = PlayerPedId()
    if action == 'heal' then
        SetEntityHealth(ped, GetEntityMaxHealth(ped))
        SetPedArmour(ped, 100)
        notify('Du wurdest von einem Admin geheilt.')
    elseif action == 'revive' then
        if IsEntityDead(ped) then
            local coords = GetEntityCoords(ped)
            NetworkResurrectLocalPlayer(coords.x, coords.y, coords.z, GetEntityHeading(ped), true, false)
        end
        SetEntityHealth(ped, GetEntityMaxHealth(ped))
        ClearPedBloodDamage(ped)
        notify('Du wurdest wiederbelebt.')
        -- ESX ueber den Status informieren, falls esx_ambulancejob laeuft
        TriggerEvent('esx_ambulancejob:revive')
    end
end)

-- ---------------------------------------------------------------------------
-- Noclip (Free-Cam Bewegung durch Waende)
-- ---------------------------------------------------------------------------

local noclipActive = false

local function toggleNoclip()
    noclipActive = not noclipActive
    local ped = PlayerPedId()
    SetEntityInvincible(ped, noclipActive)
    SetEntityVisible(ped, not noclipActive, false)
    FreezeEntityPosition(ped, noclipActive)
    notify(noclipActive and 'Noclip ^2AN^0' or 'Noclip ^1AUS^0')
end

RegisterCommand('noclip', toggleNoclip, false)
RegisterKeyMapping('noclip', 'Noclip an/aus', 'keyboard', Config.NoclipToggleKey)

CreateThread(function()
    while true do
        local sleep = 500
        if noclipActive then
            sleep = 0
            local ped = PlayerPedId()
            local cam = GetGameplayCamRot(2)
            local heading = cam.z

            -- Geschwindigkeit per SHIFT (schnell) / ALT (langsam)
            local speed = Config.NoclipSpeed.normal
            if IsControlPressed(0, 21) then speed = Config.NoclipSpeed.fast end  -- LSHIFT
            if IsControlPressed(0, 19) then speed = Config.NoclipSpeed.slow end  -- LALT

            local coords = GetEntityCoords(ped)
            local dx, dy, dz = 0.0, 0.0, 0.0
            local rad = math.rad(heading)

            if IsControlPressed(0, 32) then  -- W
                dx = -math.sin(rad) * speed
                dy =  math.cos(rad) * speed
            elseif IsControlPressed(0, 33) then  -- S
                dx =  math.sin(rad) * speed
                dy = -math.cos(rad) * speed
            end
            if IsControlPressed(0, 34) then  -- A
                dx = dx - math.cos(rad) * speed
                dy = dy - math.sin(rad) * speed
            elseif IsControlPressed(0, 35) then  -- D
                dx = dx + math.cos(rad) * speed
                dy = dy + math.sin(rad) * speed
            end
            if IsControlPressed(0, 22) then dz = speed end      -- SPACE hoch
            if IsControlPressed(0, 36) then dz = -speed end     -- CTRL runter

            SetEntityCoordsNoOffset(ped, coords.x + dx, coords.y + dy, coords.z + dz, true, true, true)
            SetEntityHeading(ped, heading)
        end
        Wait(sleep)
    end
end)

-- ---------------------------------------------------------------------------
-- Chat-Vorschlaege (T-Menue) fuer Client-Commands
-- ---------------------------------------------------------------------------

CreateThread(function()
    TriggerEvent('chat:addSuggestion', '/car', 'Fahrzeug spawnen', { { name = 'modell', help = 'z.B. adder' } })
    TriggerEvent('chat:addSuggestion', '/dv', 'Fahrzeug loeschen')
    TriggerEvent('chat:addSuggestion', '/fix', 'Fahrzeug reparieren')
    TriggerEvent('chat:addSuggestion', '/clean', 'Fahrzeug reinigen')
    TriggerEvent('chat:addSuggestion', '/tpm', 'Zum Wegpunkt teleportieren')
    TriggerEvent('chat:addSuggestion', '/coords', 'Koordinaten anzeigen')
    TriggerEvent('chat:addSuggestion', '/heal', 'Heilen', { { name = 'id', help = 'optional: Spieler-ID (Admin)' } })
    TriggerEvent('chat:addSuggestion', '/armor', 'Weste auffuellen')
    TriggerEvent('chat:addSuggestion', '/revive', 'Wiederbeleben (Admin)', { { name = 'id', help = 'Spieler-ID' } })
    TriggerEvent('chat:addSuggestion', '/noclip', 'Noclip an/aus (' .. Config.NoclipToggleKey .. ')')
end)

print('^2[esx_toolkit]^0 Client geladen.')
