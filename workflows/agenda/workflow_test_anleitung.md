# Testanleitung – Agenda Generator v2

Workflow: `n8n_agenda_workflow_v2.json`
Mitglieder-Kette: **Board-Termine → DB Gruppen → DB Kunden**

---

## 0. Voraussetzungen (einmalig)

1. **Workflow importieren** und in allen Notion-/HTTP-Knoten das Credential
   `notion_api` zuweisen (Platzhalter `REPLACE_NOTION_CREDENTIAL`):
   - `Notion: Termin laden`, `Notion: Gruppe laden`
   - `HTTP: Kunde laden`, `HTTP: Notion aktualisieren`
2. **Datenbanken mit der Integration teilen** (`•••` → Connections):
   Board-Termine, DB Gruppen, DB Kunden – sonst `object_not_found`.
3. **docx-Service auf dem Server einrichten** (`agenda-service.js`).
   Die n8n-Code-Sandbox verbietet `child_process`/`fs` und der Execute-Command-
   Node ist nicht registriert – deshalb erzeugt ein kleiner HTTP-Dienst die
   .docx, den n8n per HTTP-Node aufruft.
   ```bash
   # Template liegt bereits unter /opt/scripts/agenda_template.docx
   cd /opt/scripts
   npm install express docxtemplater pizzip
   cp <repo>/workflows/agenda/agenda-service.js /opt/scripts/

   # als systemd-Dienst (empfohlen)
   cp <repo>/workflows/agenda/agenda-service.service /etc/systemd/system/
   systemctl daemon-reload
   systemctl enable --now agenda-service

   # Smoke-Test
   curl -s http://127.0.0.1:3001/health        # -> {"ok":true}
   curl -s -X POST http://127.0.0.1:3001/generate \
     -H "Content-Type: application/json" \
     -d '{"data":{"termin":"Test","mitglieder":[],"tops":[],"naechste_termine":[]},"output":"/opt/scripts/output/test.docx"}'
   # -> {"ok":true,"path":"/opt/scripts/output/test.docx"}
   ```
   Der Dienst lauscht nur auf `127.0.0.1` (lokal). Läuft n8n im Docker-Container,
   muss er den Host erreichen: entweder `--network host` für n8n, oder im
   HTTP-Knoten `http://host.docker.internal:3001/generate` verwenden statt
   `127.0.0.1` (und den Dienst ggf. an `0.0.0.0` binden + Firewall absichern).

> Kein Execute-Command-Node, kein `child_process`, keine Datenbank-IDs nötig –
> der Workflow arbeitet über Page-IDs und ruft den docx-Dienst per HTTP auf.

---

## 1. Testdatensatz vorbereiten

**DB Kunden** – mind. 2 Einträge mit `Name`, `Firma`, `Web`
(z. B. „Manh-Cuong Pham" / „PhamArchitekten" / „www.phamarchitekten.de").

**DB Gruppen** – ein Eintrag, z. B. „Board Schorndorf":
- Feld `DB Kunden` → die obigen Kunden verknüpfen.

**Board-Termine** – ein Eintrag:
- `Titel`: „Board #12 – Juni 2026"
- `Datum`: 25.06.2026 17:00 – 19:00 (Start **und** Ende setzen)
- `Ort Name` / `Ort Adresse`: ausfüllen
- `Status`: „Agenda bereit"
- **`DB Gruppen` → die Gruppe „Board Schorndorf" verknüpfen** *(zwingend –
  ohne Gruppe stoppt der Workflow mit „Kein Board zugeordnet")*
- optional: `Hotseat1-Name`/`Hotseat1-Thema`, `Hotseat2-…`, `Themenvorschau`,
  `Nächste Termine` (eine Zeile pro Termin, Ort nach `|`):
  ```
  Dienstag, 21. Juli 2026 | Schorndorf, Hotel Reich an der Rems
  Dienstag, 18. August 2026
  ```

**Page-ID des Termins** notieren: Termin-Page öffnen → die 32 Zeichen aus der
URL vor `?v=` (mit oder ohne Bindestriche).

---

## 2. Webhook testen

Workflow **aktivieren** (für die Production-URL) oder im Editor
**„Listen for test event"** klicken, dann:

```bash
curl -X POST https://automation.blboardsolutions.de/webhook/agenda-generieren \
  -H "Content-Type: application/json" \
  -d '{"page_id":"<NOTION_PAGE_ID_DES_TERMINS>"}'
```

> Production-Läufe erscheinen **nicht** auf dem Canvas, sondern im Tab
> **Executions**. Im Test-Modus („Listen…") siehst du sie live im Editor.

---

## 3. Erwartete Outputs (Knoten für Knoten)

| Knoten | Erwartung |
|---|---|
| `Code: Termin extrahieren` | `gruppen_id` gesetzt, `termin` als „25.06.2026, 17:00 – 19:00 Uhr" |
| `Notion: Gruppe laden` | Gruppen-Page mit `properties['DB Kunden'].relation` |
| `Code: Kunden-IDs extrahieren` | `kunden_ids` = Array der Kunden-Page-IDs |
| `IF: Hat Kunden?` | true-Zweig bei ≥1 Kunde |
| `HTTP: Kunde laden` | läuft 1× pro Kunde, liefert je eine Page |
| `Code: Mitglieder aufbereiten` | `mitglieder`-Array mit name/firma/web |
| `Code: Payload bauen` | `payload`-Objekt + `output_path` gesetzt |
| `HTTP: Agenda erzeugen` | Antwort `{ ok: true, path: "/opt/scripts/output/AGD_….docx" }` |
| `HTTP: Notion aktualisieren` | HTTP 200; in Notion `Agenda generiert = true`, `Agenda Link`, `Agenda generiert am`, `Status = Abgeschlossen` |

Datei prüfen:
```bash
ls -l /opt/scripts/output/AGD_2026-06-25_Boardmeeting.docx
```

---

## 4. Häufige Fehler & Lösungen

| Symptom | Ursache / Fix |
|---|---|
| `Kein Board zugeordnet` | Im Termin ist `DB Gruppen` leer → Gruppe verknüpfen. |
| `object_not_found` | DB/Page nicht mit der Notion-Integration geteilt (Schritt 0.2). |
| Code-Node liest leere Felder | Notion-Knoten muss `Simplify Output = false` haben. |
| `ECONNREFUSED` bei `HTTP: Agenda erzeugen` | Dienst läuft nicht (`systemctl status agenda-service`) oder n8n-Container erreicht `127.0.0.1` nicht → `host.docker.internal` nutzen. |
| Antwort `{ ok:false, error:… }` vom Dienst | Template fehlt unter `/opt/scripts/agenda_template.docx` oder Template-Platzhalter ungültig → `error`-Text prüfen. |
| `401 unauthorized` vom Dienst | `AGENDA_TOKEN` gesetzt, aber kein passender `Authorization: Bearer …`-Header im HTTP-Knoten. |
| Mitglieder leer obwohl Kunden vorhanden | In der Gruppe ist `DB Kunden` nicht verknüpft, oder Kunden ohne `Name`. |
| Workflow „has issues, cannot be executed" | Ein Knoten ist rot → meist fehlendes Credential. Alle 4 Notion-/HTTP-Knoten zuweisen. |
| Relation > 25 Kunden | Notion liefert max. 25 Relations pro Page → Pagination nötig (siehe Hinweis unten). |

> **Pagination-Hinweis:** Hat eine Gruppe mehr als 25 Kunden, gibt
> `GET /v1/pages/{id}` die Relation gekürzt zurück. Für solche Boards muss die
> Kunden-Relation über `GET /v1/pages/{id}/properties/{property_id}` mit
> `has_more`/`next_cursor` nachgeladen werden. Für die übliche Boardgröße
> (≤ 25) ist der aktuelle Stand ausreichend.
