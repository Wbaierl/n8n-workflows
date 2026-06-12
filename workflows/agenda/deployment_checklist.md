# Deployment-Checkliste – Agenda Generator (IONOS)

Server-Setup, Workflow-Import und erster Test-Run.

---

## 1. Skript & Template auf den Server

```bash
ssh user@<ionos-vps>

sudo mkdir -p /opt/scripts/output
sudo chown -R "$USER":"$USER" /opt/scripts
```

`generate-agenda.js` und `agenda_template.docx` nach `/opt/scripts/` kopieren:

```bash
scp generate-agenda.js   user@<ionos-vps>:/opt/scripts/
scp agenda_template.docx user@<ionos-vps>:/opt/scripts/
```

Das Output-Verzeichnis muss existieren **und** für den n8n-Prozess-User
beschreibbar sein (bei Docker: ins Volume mounten, s. u.).

---

## 2. npm-Abhängigkeiten

```bash
cd /opt/scripts
npm init -y                       # falls noch keine package.json
npm install docxtemplater pizzip
node -v                           # Node >= 16 empfohlen
```

> Hinweis: Die `.docx` wird **nicht mehr per Execute Command** erzeugt, sondern
> direkt im Code-Node **„Code: Agenda erzeugen"** (docxtemplater im n8n-Prozess).
> `generate-agenda.js` selbst wird vom Workflow nicht mehr aufgerufen – die
> Render-Logik steckt im Code-Node. Das Skript kann optional als manueller
> Smoke-Test auf dem Server bleiben:
>
> ```bash
> node /opt/scripts/generate-agenda.js \
>   --data '{"termin":"02.06.2026, 17:00 Uhr","mitglieder":[],"tops":[],"naechste_termine":[]}' \
>   --output /opt/scripts/output/test.docx
> # Erwartet:  OK:/opt/scripts/output/test.docx
> ```

---

## 3. n8n: Code-Node für die docx-Erzeugung vorbereiten

Der Code-Node lädt `pizzip` + `docxtemplater`, liest das Template und schreibt
die `.docx`. Dafür müssen drei Dinge im n8n-Prozess erreichbar sein.

**3.1 Pfade in den Container/Prozess bringen** – Template, Module und das
Output-Verzeichnis müssen für n8n sichtbar sein:
```yaml
# docker-compose.yml (Auszug)
volumes:
  - /opt/scripts:/opt/scripts      # Template + node_modules + output/
```
Native Installation: n8n-Service-User braucht Lese-/Schreibrechte auf
`/opt/scripts` bzw. `/opt/scripts/output`.

**3.2 Built-in- und externe Module im Code-Node freigeben** – per Env-Variablen:
```yaml
environment:
  - NODE_FUNCTION_ALLOW_BUILTIN=fs,path
  - NODE_FUNCTION_ALLOW_EXTERNAL=pizzip,docxtemplater
```
> Ohne diese Variablen scheitert der Code-Node mit
> „require is not allowed" bzw. „Cannot find module".

**3.3 Module installieren** – der Code-Node lädt sie aus
`/opt/scripts/node_modules` (oder, falls vorhanden, aus dem n8n-Image):
```bash
cd /opt/scripts && npm install docxtemplater pizzip
```

**3.4 Env neu laden & verifizieren:**
```bash
docker compose up -d        # NICHT nur "restart" – Env wird nur bei recreate gelesen
docker exec -it n8n ls /opt/scripts/agenda_template.docx /opt/scripts/node_modules/docxtemplater
```
Native Installation: `sudo systemctl restart n8n`.

> Die Pfade `/opt/scripts`, `/opt/scripts/node_modules`,
> `/opt/scripts/agenda_template.docx` sind im Code-Node oben als Konstanten
> gesetzt – bei abweichendem Layout dort anpassen.

---

## 4. Workflow importieren

1. In n8n: **Workflows → Import from File** → `n8n_agenda_workflow.json`.
2. Credentials zuordnen:
   - Alle **Notion-Nodes** + **HTTP: Notion aktualisieren** → `notion_api`.
   - **Webhook** → Header-Auth-Credential (`agenda_webhook_auth`),
     z. B. Header `Authorization` = `Bearer <geheim>`.
   - **E-Mail senden (Outlook)** → Microsoft-Outlook-OAuth2-Credential
     (`Microsoft Outlook account`); Absender = das authentifizierte Postfach.
     Fallback-Empfänger in `{{EMAIL_EMPFAENGER}}` setzen.
3. In jedem Notion-Read-Node die **Database** per Dropdown auswählen
   (ersetzt die `{{DB_*}}`-Platzhalter).
4. Prüfen, dass in den Notion-Read-Nodes **Simplify Output = false** steht
   (Voraussetzung für die Code-Nodes).
5. Workflow **speichern** und **aktivieren** (für den Webhook erforderlich).

---

## 5. Webhook-URL & Trigger einrichten

Nach Aktivierung zeigt der Webhook-Node die Production-URL:
```
https://n8n.blboardsolutions.de/webhook/agenda-generieren
```

Manueller Test-Aufruf:
```bash
curl -X POST https://n8n.blboardsolutions.de/webhook/agenda-generieren \
  -H "Authorization: Bearer <geheim>" \
  -H "Content-Type: application/json" \
  -d '{"page_id":"<NOTION_PAGE_ID_DES_TEST_TERMINS>","send_email":false}'
```

**Auslösen aus Notion** (Optionen):
- **Notion-Button** in der Board-Termine-DB: „Open link" auf die Webhook-URL
  (sendet allerdings keinen Body → dann Variante Schedule nutzen).
- **Schedule-Trigger** (im Workflow enthalten, standardmäßig deaktiviert):
  aktivieren statt Webhook, läuft täglich 08:00 und verarbeitet alle Termine
  mit `Status = "Agenda bereit"` und `Agenda generiert = false` automatisch.

---

## 6. Erster Test-Run

1. Test-Datensatz gem. `notion_datenbanken_setup.md` anlegen,
   `Status = "Agenda bereit"`.
2. Webhook per `curl` (oben) auslösen.
3. Im n8n-**Executions**-Log den Lauf öffnen und prüfen:
   - `Code: Agenda erzeugen` → kein Fehler, `filepath` im Output gesetzt,
     Binary-Property `data` vorhanden.
   - `HTTP: Notion aktualisieren` → HTTP 200; in Notion sind nun
     `Agenda generiert = true`, `Agenda Link` und `Agenda generiert am` befüllt,
     `Status = Abgeschlossen`.
4. Datei prüfen: `ls -l /opt/scripts/output/AGD_2026-06-02_Boardmeeting.docx`,
   herunterladen und Platzhalter im Word-Dokument kontrollieren.

---

## 7. Fehlersuche

| Symptom | Ursache / Fix |
|---|---|
| `object_not_found` (Notion) | DB/Page nicht mit Integration geteilt (Setup Schritt 1.3). |
| Code-Node liest leere Felder | `Simplify Output` steht auf *true* → auf *false* stellen. |
| `require is not allowed` / `Cannot find module` im Code-Node | `NODE_FUNCTION_ALLOW_BUILTIN` / `NODE_FUNCTION_ALLOW_EXTERNAL` setzen, Module unter `/opt/scripts/node_modules` installieren (Schritt 3). |
| Code-Node-Fehler beim Rendern | Template fehlt unter `/opt/scripts/agenda_template.docx` oder Platzhalter im Template ungültig → Fehlertext im Execution-Log. |
| Datei wird nicht geschrieben | `/opt/scripts/output` fehlt oder keine Schreibrechte. |
| E-Mail ohne Anhang | `Datei lesen` muss vor `E-Mail senden (Outlook)` laufen; Attachment-Binary-Property = `data`. |
| Webhook 403 | Header-Auth-Token stimmt nicht mit Credential überein. |
| TOPs fehlen im Dokument | TOP-`Status` ≠ `Final` oder Relation `Board-Termin` nicht gesetzt. |

---

## 8. Sicherheit

- Webhook ist per **Header-Auth** (Bearer-Token) abgesichert – Token geheim halten.
- Die docx-Erzeugung läuft komplett im n8n-Code-Node (docxtemplater) – **keine
  Shell-Aufrufe**, daher keine Shell-Injection-Fläche.
- Notion-Token nur mit minimal nötigen Rechten ausstatten.
