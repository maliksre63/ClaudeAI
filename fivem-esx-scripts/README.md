# FiveM ESX Scripts

Eine Sammlung praktischer Lua-Ressourcen für deinen **FiveM ESX Server**.
Diese Scripts laufen auf dem Server (auch lokal auf deinem PC) und werden
**im Spiel per Chat-Commands** oder Tastenkürzel bedient.

## Enthaltene Ressourcen

| Ressource | Beschreibung |
|-----------|--------------|
| [`esx_toolkit`](./esx_toolkit) | Admin- & Spieler-Toolkit: Fahrzeuge spawnen/reparieren, Teleport zum Wegpunkt, Heilen, Wiederbeleben, Noclip, Geld geben u. v. m. |

---

## Voraussetzungen

- Ein laufender **FiveM Server** (FXServer) – z. B. lokal auf deinem PC
- **es_extended (ESX)** ist installiert (`es_extended` 1.2 oder neuer)
- Ein Mindestmaß an Zugriff auf die `server.cfg`

> **Tipp:** Wenn du den Server lokal testen willst, brauchst du:
> 1. [FXServer](https://docs.fivem.net/docs/server-manual/setting-up-a-server/) herunterladen
> 2. Ein `cfx-server-data` Base-Pack (enthält `chat`, `spawnmanager` usw.)
> 3. ESX installieren (siehe [esx-framework.github.io](https://esx-framework.github.io/))

---

## Installation

1. **Ordner kopieren:** Lege den Ordner `esx_toolkit` in deinen
   `resources/`-Ordner, z. B. nach `resources/[local]/esx_toolkit`.

2. **In der `server.cfg` aktivieren** – nach dem Start von ESX:

   ```cfg
   ensure es_extended
   ensure esx_toolkit
   ```

3. **Admin-Rechte vergeben.** Die Admin-Commands prüfen die ESX-Gruppe.
   Setze deinen Account in der Datenbank (`users`-Tabelle) auf `admin` oder
   `superadmin`, oder über deinen Admin-Manager. Welche Gruppen erlaubt sind,
   stellst du in `esx_toolkit/config.lua` unter `Config.AdminGroups` ein.

4. **Server neu starten** (oder im Live-Server `refresh` + `ensure esx_toolkit`).

---

## Befehle (Commands)

Im Spiel den Chat mit **`T`** öffnen und tippen:

### Für alle Spieler
| Command | Funktion |
|---------|----------|
| `/car [modell]` | Fahrzeug spawnen, z. B. `/car adder` |
| `/dv` | Fahrzeug löschen (in dem du sitzt oder das nächste) |
| `/fix` | Aktuelles Fahrzeug reparieren |
| `/clean` | Fahrzeug reinigen |
| `/tpm` | Zum gesetzten Karten-Wegpunkt teleportieren |
| `/coords` | Eigene Koordinaten anzeigen (auch in F8-Konsole) |
| `/heal` | Sich selbst heilen |
| `/armor` | Kugelsichere Weste auffüllen |
| `/noclip` | Noclip an/aus (Standard-Taste **F2**) |

**Noclip-Steuerung:** `W/A/S/D` bewegen, `SPACE` hoch, `STRG` runter,
`SHIFT` schneller, `ALT` langsamer.

### Nur für Admins
| Command | Funktion |
|---------|----------|
| `/heal [id]` | Anderen Spieler heilen |
| `/revive [id]` | Spieler wiederbeleben |
| `/givecash [id] [betrag]` | Bargeld geben |
| `/setjob [id] [job] [grade]` | Job setzen, z. B. `/setjob 1 police 3` |

---

## Konfiguration

Alle Einstellungen findest du in `esx_toolkit/config.lua`:

- `Config.AdminGroups` – welche ESX-Gruppen Admin-Commands nutzen dürfen
- `Config.MaxGiveCash` – Maximalbetrag für `/givecash`
- `Config.NoclipToggleKey` – Taste für Noclip
- `Config.NoclipSpeed` – Bewegungsgeschwindigkeiten

---

## Sicherheit

- Admin-Commands werden **serverseitig** auf die ESX-Gruppe geprüft – ein
  Client kann sich die Rechte nicht selbst geben.
- Geld-Funktionen nutzen die offiziellen ESX-Methoden (`addMoney`) und sind
  durch `Config.MaxGiveCash` begrenzt.

> ⚠️ **Hinweis:** Nutze diese Scripts nur auf deinem **eigenen** Server bzw.
> dort, wo du die Erlaubnis hast. Cheaten auf fremden Servern ist nicht das
> Ziel dieser Sammlung.

---

## Lizenz

MIT
