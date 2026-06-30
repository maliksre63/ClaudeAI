Config = {}

-- Sprache der Chat-Ausgaben (nur fuer Texte hier im Script)
Config.Locale = 'de'

-- Welche ESX-Gruppen gelten als Admin? (Server-seitige Pruefung)
-- Standard ESX-Gruppen: 'user', 'admin', 'superadmin', 'mod'
Config.AdminGroups = {
    ['admin'] = true,
    ['superadmin'] = true,
}

-- Maximaler Betrag, den ein Admin sich/anderen per /givecash geben darf
Config.MaxGiveCash = 1000000

-- Standard-Heilung in HP bei /heal
Config.HealAmount = 200

-- Taste fuer Noclip an/aus (Standard: F2). Tastencodes: https://docs.fivem.net/docs/game-references/controls/
Config.NoclipToggleKey = 'F2'

-- Noclip Geschwindigkeiten
Config.NoclipSpeed = {
    normal = 1.0,
    fast = 3.0,    -- mit SHIFT
    slow = 0.25,   -- mit ALT
}

-- Chat-Prefix / Farbe fuer Ausgaben
Config.ChatTitle = 'ESX Toolkit'
Config.ChatColor = { 0, 150, 255 }
