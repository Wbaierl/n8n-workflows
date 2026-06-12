# Testanleitung – Agenda Generator v3

Workflow: `n8n_agenda_workflow_v3.json`
Mitglieder-Kette: **Board-Termine → DB Gruppen → DB Kunden**

---

## 0. Voraussetzungen

1. **Workflow importieren** und in allen Notion-/HTTP-Knoten das Credential
   `notion_api` zuweisen (Platzhalter `REPLACE_NOTION_CREDENTIAL`):
   `Notion: Termin laden`, `Notion: Gruppe laden`, `Notion: Offene Termine`,
   `HTTP: Kunden laden`, `HTTP: Notion aktualisieren`.
   → In den HTTP-Knoten ist die Auth als *Predefined Credential Type → Notion API*
   gesetzt; nur das Konto auswählen.
2. **Agenda-Server** läuft auf dem Host und ist aus dem Container erreichbar:
   ```bash
   systemctl status agenda-service --no-pager
   ss -tlnp | grep 3001            # muss 0.0.0.0:3001 zeigen (nicht 127.0.0.1)
   curl -s http://172.17.0.1:3001/health   # {"ok":true}
   ```
   Zeigt `ss` nur `127.0.0.1:3001`, ist der Dienst falsch gebunden →
   `AGENDA_HOST=0.0.0.0` in der Unit setzen, `systemctl restart agenda-service`.
3. Notion-Datenbanken sind mit der Integration geteilt
   (`•••` → Connections), sonst `object_not_found`.

---

## 1. Testtermin vorbereiten

1. In **DB Gruppen** existiert „PABschorndorf"
   (Page-ID `37147c76-2802-8022-a1ef-d9e427d57343`) mit 4 verknüpften Kunden.
2. In **Board-Termine** einen Testtermin anlegen / wählen:
   - `Datum`: Start + Ende setzen
   - `Ort Name`, `Ort Adresse`
   - `Status`: „Agenda bereit"
   - **`DB Gruppen` → „PABschorndorf" verknüpfen** *(zwingend)*
   - optional `Hotseat1-Name`/`-Thema`, `Hotseat2-…`, `Themenvorschau`,
     `Nächste Termine` (eine Zeile pro Termin, Ort nach `|`)
3. **Page-ID des Testtermins** notieren (32 Zeichen aus der Page-URL vor `?v=`).

---

## 2. Test auslösen

```bash
curl -X POST https://automation.blboardsolutions.de/webhook/agenda-generieren \
  -H "Content-Type: application/json" \
  -d '{"page_id":"<NOTION_PAGE_ID_DES_TESTTERMINS>"}'
```

> Production-Läufe erscheinen im Tab **Executions**, nicht auf dem Canvas.
> Zum Mitschauen im Editor „Listen for test event" nutzen.

---

## 3. Erwartete Outputs

| Knoten | Erwartung |
|---|---|
| `Code: Termin extrahieren` | `gruppen_id` gesetzt, `termin` formatiert |
| `IF: Gruppe vorhanden?` | true-Zweig |
| `Notion: Gruppe laden` | Gruppen-Page mit `DB Kunden`-Relation |
| `Code: Kunden-IDs extrahieren` | 4 Items (1 pro Kunde) |
| `HTTP: Kunden laden` | läuft 4×, je eine Kunden-Page |
| `Code: Payload aufbereiten` | `payload.mitglieder` mit 4 aktiven Kunden, `tops` aus Hotseats |
| `HTTP: Agenda erzeugen` | Antwort `{ ok: true, path: "/opt/scripts/output/AGD_….docx" }` |
| `HTTP: Notion aktualisieren` | HTTP 200; in Notion `Agenda generiert = true`, `Agenda Link`, `Agenda generiert am`, `Status = Abgeschlossen` |

Dateisystem (auf dem Host):
```bash
ls -l /opt/scripts/output/AGD_*_Boardmeeting.docx
```

---

## 4. Häufige Fehler

| Symptom | Ursache / Fix |
|---|---|
| Stop „Kein Board zugeordnet" | `DB Gruppen` im Termin leer → Gruppe verknüpfen. |
| `object_not_found` | DB/Page nicht mit Integration geteilt. |
| Code liest leere Felder | Notion-Knoten brauchen `Simplify Output = false`. |
| `ECONNREFUSED 172.17.0.1:3001` | Dienst aus, falsch gebunden (`127.0.0.1` statt `0.0.0.0`) oder Firewall blockt Docker-Subnetz (`ufw allow from 172.17.0.0/16 to any port 3001`). |
| `{ ok:false }` vom Dienst | Template fehlt / Platzhalter ungültig → `error`-Text prüfen. |
| Mitglieder leer trotz Kunden | Kunden ohne `Name` oder `Aktiv = false`. |
| Relation > 25 Kunden | Notion gibt max. 25 Relations pro Page → Pagination nötig (Kommentar im Code). |

---

## 5. Schedule-Trigger (optional)

Der Workflow enthält einen **deaktivierten** Schedule-Zweig
(`Schedule: Täglich 08:00` → `Notion: Offene Termine`). Aktiviert verarbeitet
er täglich automatisch alle Board-Termine mit `Status = "Agenda bereit"` und
`Agenda generiert = false` – ohne Webhook. Zum Nutzen: beide Knoten aktivieren
(Rechtsklick → Activate) und den Workflow aktiv schalten.
