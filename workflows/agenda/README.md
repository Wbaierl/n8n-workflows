# BLBoardSolutions – Agenda Generator

Automatisierte Erstellung von Board-Meeting-Agenden als Word-Dokument (.docx)  
aus Notion-Daten via n8n-Workflow.

---

## Übersicht

```
Notion (Board-Termine + DB Gruppen + DB Kunden)
    ↓  n8n Workflow
Agenda-Server (Node.js, IONOS Host)
    ↓  generate-agenda.js + docxtemplater
AGD_Datum_Gruppe_Boardmeeting.docx
    ↓  Microsoft Outlook
E-Mail an wolfgang.baierl@blboardsolutions.de
```

---

## Architektur

### Infrastruktur

| Komponente | Details |
|---|---|
| Server | IONOS VPS, Ubuntu 24.04, IP: 212.132.111.114 |
| n8n | Docker-Container `root-n8n-1`, Port 5678 |
| Traefik | Reverse Proxy, HTTPS via `automation.blboardsolutions.de` |
| Agenda-Server | Node.js HTTP-Server, Port 3001, Systemd-Service `agenda-server` |
| Node.js | v18.19.1 unter `/usr/bin/node` |
| Skript-Pfad | `/opt/scripts/` |
| Output-Pfad | `/root/local-files/` (als `/files/` im n8n-Container gemountet) |

### Dateien auf dem Server

```
/opt/scripts/
├── generate-agenda.js      ← Agenda-Generator (docxtemplater)
├── agenda-server.js        ← HTTP-Server für n8n-Aufrufe
├── agenda_template.docx    ← Word-Vorlage mit Platzhaltern
├── package.json
└── node_modules/
    ├── docxtemplater/
    └── pizzip/

/root/local-files/          ← Generierte Agenden (Docker-Mount → /files/)
/etc/systemd/system/
└── agenda-server.service   ← Systemd-Service-Definition
```

---

## Notion-Datenbankstruktur

### DB Board-Termine
**ID:** `37b47c76-2802-80b5-a1ee-cd278db35a83`

| Feld | Typ | Beschreibung |
|---|---|---|
| Titel | Title | z. B. "Board #13 – Juni 2026" |
| Datum | Date | Start + End + Zeit |
| Ort Name | Rich Text | Veranstaltungsort |
| Ort Adresse | Rich Text | Straße, PLZ, Ort |
| Status | Select | Entwurf / **Agenda bereit** / Abgeschlossen |
| DB Gruppen | Relation | → DB Gruppen (bestimmt Mitglieder) |
| Gast Name | Rich Text | Optional |
| Gast Web | Rich Text | Optional |
| Gastvortrag-Name | Rich Text | Löst Impulsvortrag-TOP aus wenn befüllt |
| Gastvortrag Web | Rich Text | Optional |
| Impulsvortrag | Rich Text | Titel des Impulsvortrags |
| Hotseat1-Name | Rich Text | Erster Fallgeber |
| Hotseat1-Thema | Rich Text | Thema des ersten Fallgebers |
| Hotseat2-Name | Rich Text | Zweiter Fallgeber |
| Hotseat2-Thema | Rich Text | Thema des zweiten Fallgebers |
| Themenvorschau | Rich Text | Erscheint unter TOP "Themen Vorschau" |
| Nächste Termine | Rich Text | Ein Termin pro Zeile, Format: `Datum \| Ort` |
| Agenda generiert | Checkbox | Wird vom Workflow auf ✓ gesetzt |
| Agenda generiert am | Date | Wird vom Workflow befüllt |
| Agenda Link | URL | Wird vom Workflow befüllt |

**Format "Nächste Termine":**
```
Dienstag, 25. Juni 2026 | Hotel Reich an der Rems, Schorndorf
Dienstag, 21. Juli 2026
Dienstag, 26. Aug 2026
```

### DB Gruppen
**ID:** `36647c76-2802-8085-a36f-ff0f451b6c3d`

| Feld | Typ | Beschreibung |
|---|---|---|
| Name | Title | Board-Name |
| Confluence Space Key | Rich Text | Wird als Gruppenname verwendet |
| DB Kunden | Relation | → DB Kunden (Mitglieder) |
| Aktiv | Checkbox | |

### DB Kunden
**ID:** `2f847c76-2802-80d2-9337-ed2a1f1b7256`

| Feld | Typ | Beschreibung |
|---|---|---|
| Name | Title | Nachname oder vollständiger Name |
| Firma | Rich Text | Firmenname |
| Web | URL | Website |
| E-Mail | Email | E-Mail-Adresse |
| Aktiv | Checkbox | Nur aktive Mitglieder erscheinen in der Agenda |
| Status | Select | Aktiv / Ruhend / Abgeschlossen |

---

## n8n Workflow

**Name:** BLBoardSolutions – Agenda Generator v3  
**Datei:** `BLBoardSolutions___Agenda_Generator_v3.json`

### Trigger

**A) Webhook (manuell):**
```
POST https://automation.blboardsolutions.de/webhook/agenda-generieren
Header: X-Webhook-Token: <token>
Body:   { "page_id": "notion-page-id" }
```

**B) Schedule (automatisch):**  
Täglich 08:00 UTC – prüft alle Termine mit `Status = "Agenda bereit"` und `Agenda generiert = false`.

### Node-Übersicht

| # | Node | Typ | Funktion |
|---|---|---|---|
| 1 | Webhook: Agenda anfordern | Webhook | POST-Trigger mit Header-Auth |
| 2 | Schedule: Täglich 08:00 | Schedule | Automatischer Trigger |
| 3 | Set: page_id | Set | page_id aus Webhook/Schedule extrahieren |
| 4 | Notion: Termin laden | Notion | Get Page (simplifyOutput=false) |
| 5 | Code: Termin extrahieren | Code | Alle Felder aus Notion-Response extrahieren |
| 6 | IF: Gruppe vorhanden? | IF | Prüft ob gruppen_id gesetzt |
| 7 | Notion: Gruppe laden | Notion | Gruppen-Page laden für Kunden-IDs |
| 8 | Code: Kunden-IDs extrahieren | Code | Kunden-IDs + Gruppenname extrahieren |
| 9 | HTTP: Kunden laden | HTTP | GET /v1/pages/{id} pro Kunde |
| 10 | Code: Payload aufbereiten | Code | Mitglieder + TOPs + Payload zusammenbauen |
| 11 | HTTP: Agenda erzeugen | HTTP | POST 172.17.0.1:3001/generate |
| 12 | HTTP: Notion aktualisieren | HTTP | PATCH /v1/pages/{id} – Status setzen |
| 13 | Code in JavaScript | Code | Base64 → Binary für E-Mail-Anhang (toleriert `file_base64`, `base64`, `fileBase64`) |
| 14 | Send a message | Outlook | E-Mail mit Anhang versenden |

> **Hinweis Anhang:** Der Node "Code in JavaScript" liest das Base64 der .docx
> tolerant aus der Agenda-Server-Antwort – egal ob das Feld `file_base64`
> (agenda-server.js), `base64` oder `fileBase64` heißt. Fehlt das Feld ganz,
> bricht der Node mit einer Fehlermeldung ab, die die tatsächlichen
> Antwortfelder auflistet (statt eine leere E-Mail zu versenden).

### Automatische TOP-Generierung

Die TOPs werden im Node "Code: Payload aufbereiten" dynamisch zusammengebaut:

| TOP | Bedingung | Inhalt |
|---|---|---|
| 1. Begrüßung & Agenda | immer | 10min |
| 2. Impulsvortrag | wenn `Gastvortrag-Name` befüllt | Titel aus `Impulsvortrag`-Feld |
| 3. Vorstellung neue Themen | wenn `Hotseat1-Name` oder `Hotseat2-Name` befüllt | Fallgeber als Unterpunkte |
| 4. Aktuelle Themen / Offene Fragen | immer | 30min |
| 5. Themen Vorschau nächste Sitzung | immer | Inhalt aus `Themenvorschau`-Feld |

---

## Word-Template (`agenda_template.docx`)

### Platzhalter-Referenz

| Platzhalter | Typ | Beschreibung |
|---|---|---|
| `{termin}` | Einfach | "25.06.2026, 17:00 – 19:00 Uhr" |
| `{ort_name}` | Einfach | Fett, erste Zeile Ort-Zelle |
| `{ort_adresse}` | Einfach | Zweite Zeile Ort-Zelle |
| `{#mitglieder}…{/mitglieder}` | Loop | Tabellenzeile pro Mitglied |
| `{#ist_erstes}Mitglieder:{/ist_erstes}` | Bedingt | Label nur erste Zeile |
| `{name}` `{firma}` `{web}` | In Loop | Mitglieder-Daten |
| `{#gast_name}…{/gast_name}` | Bedingt | Gast-Zeile (nur wenn befüllt) |
| `{#gastvortrag_name}…{/gastvortrag_name}` | Bedingt | Gastvortrag-Zeile |
| `{#tops}…{/tops}` | Loop | TOP-Block |
| `{titel}` `{zeit}` | In Loop | TOP-Titel und Zeit |
| `{#beschreibung}…{/beschreibung}` | Bedingt | Beschreibungszeile |
| `{#untertitel}…{/untertitel}` | Bedingt | Kursiv-Zeile |
| `{#sub_items}…{/sub_items}` | Loop | Fallgeber-Unterpunkte |
| `{nr}` `{fallgeber}` `{sub_zeit}` `{sub_beschreibung}` | In Sub-Loop | Fallgeber-Daten |
| `{#themenvorschau}…{/themenvorschau}` | Bedingt | Option-Zeile (aktuell deaktiviert) |
| `{#naechste_termine}…{/naechste_termine}` | Loop | Terminzeilen |
| `{termin_datum}` `{termin_ort_oder_leer}` | In Loop | Terminvorschläge |

### Wichtige Fixes im Template

1. **Content-Types Fix:** Die Vorlage war als `.dotx` erstellt. `generate-agenda.js` ersetzt automatisch `wordprocessingml.template.main+xml` → `wordprocessingml.document.main+xml` damit Word die Datei öffnen kann.

2. **ist_erstes Flag:** Da docxtemplater `{#@first}` nicht unterstützt, wird `ist_erstes: true` nur beim ersten Mitglied im Array gesetzt (im Code-Node).

---

## Deployment

### Erstinstallation

```bash
# SSH-Verbindung
ssh root@212.132.111.114

# Verzeichnis anlegen
mkdir -p /opt/scripts /root/local-files

# Dateien hochladen (vom Mac)
scp generate-agenda.js root@212.132.111.114:/opt/scripts/
scp agenda-server.js   root@212.132.111.114:/opt/scripts/
scp agenda_template.docx root@212.132.111.114:/opt/scripts/

# npm-Packages installieren
cd /opt/scripts && npm init -y && npm install docxtemplater pizzip

# Systemd-Service einrichten
cp agenda-server.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable agenda-server
systemctl start agenda-server
```

### Systemd-Service

```ini
# /etc/systemd/system/agenda-server.service
[Unit]
Description=BLBoardSolutions Agenda Generator Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/scripts
ExecStart=/usr/bin/node /opt/scripts/agenda-server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Service-Verwaltung

```bash
systemctl status agenda-server     # Status prüfen
systemctl restart agenda-server    # Neustart nach Code-Änderungen
journalctl -u agenda-server -f     # Live-Logs
```

### Template aktualisieren

```bash
# Neues Template vom Mac hochladen
scp agenda_template.docx root@212.132.111.114:/opt/scripts/agenda_template.docx
# Kein Service-Neustart nötig
```

---

## Workflow-Nutzung

### Manuelle Auslösung

```bash
curl -X POST https://automation.blboardsolutions.de/webhook/agenda-generieren \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: DEIN_TOKEN" \
  -d '{"page_id": "NOTION_PAGE_ID"}'
```

### Automatische Auslösung

1. In Notion Board-Termin öffnen
2. Feld `DB Gruppen` → Gruppe auswählen
3. Status → **"Agenda bereit"** setzen
4. n8n generiert die Agenda täglich um 08:00 UTC automatisch

### Ergebnis

- Generierte `.docx` unter `/root/local-files/AGD_DATUM_GRUPPENNAME_Boardmeeting.docx`
- E-Mail an `wolfgang.baierl@blboardsolutions.de` mit Betreff:  
  `Agenda GRUPPENNAME – TT.MM.JJJJ, HH:MM – HH:MM Uhr`
- Notion-Datensatz aktualisiert: `Agenda generiert = ✓`, `Status = Abgeschlossen`

---

## Fehlerbehandlung

| Fehler | Ursache | Lösung |
|---|---|---|
| `ECONNREFUSED 172.17.0.1:3001` | Agenda-Server nicht aktiv | `systemctl start agenda-server` |
| `No Board zugeordnet` | `DB Gruppen` in Board-Termine leer | Gruppe im Notion-Datensatz verknüpfen |
| `Empty zip file` | Template beschädigt oder falsch hochgeladen | Template neu hochladen |
| `Identifier already declared` | Doppelte Variable in Code-Node | Code-Node prüfen und bereinigen |
| Word: "Datei beschädigt" | Content-Types enthält `template.main+xml` | Fix ist in `generate-agenda.js` integriert |
| `Unbekannte_Gruppe` im Dateinamen | `Confluence Space Key` in DB Gruppen leer | Feld in Notion befüllen |

---

## Notion API

- **Version:** `2022-06-28`
- **Integration:** BLBoardSolutions Agenda Workflow
- **Token:** in n8n Credential `Notion account` hinterlegt

**Wichtig:** Die Notion-Integration muss mit allen vier Datenbanken verbunden sein:  
Datenbank öffnen → `...` → Connections → Integration auswählen.

---

## Bekannte Einschränkungen

- Notion Relations liefern max. 25 Einträge – bei Gruppen > 25 Mitglieder ist Pagination nötig
- `Read/Write Files from Disk` Node funktioniert nicht mit dem `/files/` Docker-Mount → Workaround: Base64-Übergabe über Agenda-Server
- docxtemplater unterstützt `{#@first}` nicht → Workaround: `ist_erstes: true` Flag im Array

---

## Projektstruktur (Repository)

```
blboardsolutions-agenda-generator/
├── README.md                                    ← Diese Datei
├── generate-agenda.js                           ← Agenda-Generator
├── agenda-server.js                             ← HTTP-Server
├── agenda-server.service                        ← Systemd-Service
├── agenda_template.docx                         ← Word-Vorlage
├── package.json                                 ← npm-Dependencies
└── n8n/
    └── BLBoardSolutions___Agenda_Generator_v3.json  ← n8n-Workflow
```

---

## Abhängigkeiten

- **Credentials:** Notion API (`notion_api`), Anthropic API (`anthropicApi`), Microsoft Outlook OAuth2 (`microsoftOutlookOAuth2Api`)
- **Sub-Workflows:** keine
- **Externe Systeme:**
  - Notion (DB Board-Termine, DB Gruppen, DB Kunden)
  - Agenda-Server auf IONOS-Host (`agenda-server.js` + `generate-agenda.js`, docxtemplater), erreichbar unter `http://172.17.0.1:3001`
  - Microsoft Outlook (Versand der fertigen Agenda)
  - Anthropic Claude (Themen-Optimierung)

## Testfälle

> Testdaten synthetisch halten (Dummy-Termine/-Kunden), keine produktiven Daten.

| # | Szenario | Erwartetes Ergebnis | Status |
|---|---|---|---|
| 1 | Termin mit verknüpfter Gruppe, aktiven Kunden, Hotseat-Themen | `.docx` erzeugt, Notion auf „Abgeschlossen" + Link, E-Mail mit Anhang | ⏳ offen |
| 2 | Termin ohne verknüpfte Gruppe (`DB Gruppen` leer) | Stop-Node „Kein Board zugeordnet" | ⏳ offen |
| 3 | Claude-API nicht erreichbar / Quota | Fallback auf Originaltexte, Workflow läuft durch | ⏳ offen |
| 4 | Gruppe ohne aktive Kunden | leere Mitgliederliste, `.docx` trotzdem erzeugt | ⏳ offen |
| 5 | Themenvorschau leer | Zeile in Agenda ausgeblendet | ⏳ offen |

## Änderungshistorie

| Datum | Version | Beschreibung |
|---|---|---|
| 2026-06-10 | v3 | Mitglieder über Kette Board-Termine → DB Gruppen → DB Kunden; docx-Erzeugung über Host-Service statt Code-Node |
| 2026-06-11 | v3.1 | Claude-Themenoptimierung (kurz/präzise, max. 2 Sätze) + Outlook-Versand mit Anhang |
