fx_version 'cerulean'
game 'gta5'

author 'maliksre'
description 'ESX Toolkit - praktische Admin- und Spieler-Commands'
version '1.0.0'

lua54 'yes'

shared_script 'config.lua'

client_scripts {
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}

-- ESX wird ueber die Exports/Events angesprochen (kein direktes Dependency noetig,
-- damit es mit aktuellen ESX-Versionen 1.2+ laeuft).
dependencies {
    'es_extended'
}
