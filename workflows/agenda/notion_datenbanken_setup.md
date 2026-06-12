# Notion-Setup – Agenda Generator

Anleitung zum Anlegen der vier Notion-Datenbanken und zum Eintragen der IDs
in den n8n-Workflow `n8n_agenda_workflow.json`.

---

## 1. Integration & Berechtigung

1. https://www.notion.so/my-integrations → **New integration** anlegen
   (z. B. „n8n Agenda"), Workspace auswählen, Capabilities: *Read content*,
   *Update content*, *Insert content*.
2. **Internal Integration Token** kopieren → in n8n unter
   **Credentials → Notion API** als `notion_api` speichern.
3. Jede der vier Datenbanken (siehe unten) im Notion-Menü `•••` →
   **Connections → n8n Agenda** mit der Integration teilen.
   Ohne diesen Schritt liefert die API `object_not_found`.

---

## 2. Datenbanken anlegen

> Feldnamen müssen **exakt** so heißen (inkl. Groß-/Kleinschreibung und
> Umlaute), da die Code-Nodes per Property-Name zugreifen.

### DB 1 – „Board-Termine"
| Feld | Typ |
|---|---|
| `Titel` | Title |
| `Datum` | Date *(mit Endzeit aktivieren)* |
| `Ort Name` | Text |
| `Ort Adresse` | Text |
| `Status` | Select → `Entwurf`, `Agenda bereit`, `Abgeschlossen` |
| `Gast Name` / `Gast Web` | Text |
| `Gastvortrag Name` / `Gastvortrag Web` | Text |
| `Themenvorschau` | Text |
| `Nächste Termine` | Text *(Freitext, ein Termin pro Zeile)* |
| `Agenda generiert` | Checkbox |
| `Agenda Link` | URL |
| `Agenda generiert am` | Date |

`Nächste Termine`-Format (eine Zeile pro Termin, Ort optional nach `|`):
```
Dienstag, 25. Juni 2026 | Schorndorf, Hotel Reich an der Rems
Dienstag, 21. Juli 2026
```

### DB 2 – „Agenda-TOPs"
| Feld | Typ |
|---|---|
| `Titel` | Title |
| `Board-Termin` | Relation → Board-Termine |
| `Reihenfolge` | Number |
| `Zeit` | Text |
| `Beschreibung` | Text |
| `Untertitel` | Text |
| `Status` | Select → `Draft`, `Final` |
| `Ist Fallgeber-TOP` | Checkbox |

### DB 3 – „Fallgeber"
| Feld | Typ |
|---|---|
| `Titel` | Title *(Pflichtfeld, ungenutzt)* |
| `Eltern-TOP` | Relation → Agenda-TOPs |
| `Reihenfolge` | Number |
| `Fallgeber Name` | Text |
| `Sub Zeit` | Text |
| `Sub Beschreibung` | Text |

### DB 4 – „Board-Mitglieder"
| Feld | Typ |
|---|---|
| `Name` | Title |
| `Firma` | Text |
| `Web` | URL |
| `Aktiv` | Checkbox |

> ⚠️ **Kein E-Mail-Feld.** Der optionale Versand erfolgt über den nativen
> **Microsoft-Outlook-Node** und bezieht den Empfänger aus dem Webhook-Body
> (`email_to`) oder dem Platzhalter `{{EMAIL_EMPFAENGER}}`. Wenn du Mitglieder
> direkt anmailen willst, ergänze ein Feld `E-Mail` und passe den
> Outlook-Node entsprechend an.

---

## 3. Datenbank-IDs ermitteln

DB im Browser öffnen → die ID ist der 32-stellige Teil in der URL:
```
https://www.notion.so/<workspace>/<DATENBANK_ID>?v=<view_id>
                                   └──────────────┘
```

---

## 4. Platzhalter im Workflow ersetzen

In `n8n_agenda_workflow.json` (vor oder nach dem Import) ersetzen:

| Platzhalter | Wert |
|---|---|
| `{{DB_BOARD_TERMINE}}` | ID der Board-Termine-DB |
| `{{DB_AGENDA_TOPS}}` | ID der Agenda-TOPs-DB |
| `{{DB_FALLGEBER}}` | ID der Fallgeber-DB |
| `{{DB_MITGLIEDER}}` | ID der Board-Mitglieder-DB |
| `{{NOTION_CREDENTIAL_ID}}` | n8n-Credential-ID (nach Import in den Notion-Nodes auswählen) |
| `OUTLOOK_CREDENTIAL_ID` | n8n Microsoft-Outlook-OAuth2-Credential-ID |
| `{{WEBHOOK_AUTH_CREDENTIAL_ID}}` | n8n Header-Auth-Credential-ID |
| `{{EMAIL_EMPFAENGER}}` | Fallback-Empfängeradresse (wenn kein `email_to` im Webhook-Body) |

> Am einfachsten: Workflow importieren und in jedem Notion-Node das
> Credential `notion_api` per Dropdown auswählen, in den Notion-Nodes die DB
> per Dropdown setzen. Die `{{DB_*}}`-Platzhalter dienen nur als Marker.

---

## 5. Test-Datensatz

**Board-Termine** – neuer Eintrag:
- Titel: `Board #12 – Juni 2026`
- Datum: `02.06.2026 17:00 – 19:00`
- Ort Name: `Hotel Reich an der Rems`
- Ort Adresse: `Stuttgarter Str. 75, 73614 Schorndorf`
- Status: `Agenda bereit`
- Agenda generiert: ☐ (leer)
- Nächste Termine:
  ```
  Dienstag, 25. Juni 2026 | Schorndorf, Hotel Reich an der Rems
  Dienstag, 21. Juli 2026
  ```

**Agenda-TOPs** – zwei Einträge, beide mit Relation auf den Termin, `Status = Final`:
1. `Begrüßung & Agenda`, Reihenfolge 1, Zeit `10min`
2. `Vorstellung neue Themen`, Reihenfolge 2, Untertitel
   `was ist geplant, was soll umgesetzt werden, wo wird Hilfe benötigt`,
   `Ist Fallgeber-TOP = true`

**Fallgeber** – zwei Einträge mit Relation auf TOP 2:
1. Reihenfolge 1, Fallgeber Name `Manh-Cuong Pham`, Sub Zeit `20min`,
   Sub Beschreibung `Optimierung Neukundenakquise`
2. Reihenfolge 2, Fallgeber Name `Moritz Schittenhelm`, Sub Zeit `20min`,
   Sub Beschreibung `Akquise A-/B-Kunden`

**Board-Mitglieder** – ein paar Einträge mit `Aktiv = true`.

Die `page_id` des Test-Termins (aus der Page-URL, 32 Zeichen) für den
Webhook-Aufruf notieren → siehe `deployment_checklist.md`.
