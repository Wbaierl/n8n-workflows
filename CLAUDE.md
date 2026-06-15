# CLAUDE.md – Projektkontext für n8n-workflows Repository

Dieses Dokument ist die zentrale Referenz für Claude Code beim Arbeiten in diesem Repository.
Es enthält Projektkontext, Konventionen, Arbeitsregeln und Sicherheitsgrenzen.

---

## 1. Projektübersicht

**Besitzer:** Wolfgang Baierl, BLBoardSolutions GmbH  
**Zweck:** Automatisierung von Geschäftsprozessen über n8n-Workflows  
**Primäre Systeme:** Microsoft Outlook (Graph API), HubSpot, Notion, n8n (self-hosted auf IONOS VPS)  
**Sprache:** Workflows und Dokumentation auf Deutsch; Code-Kommentare auf Deutsch

---

## 2. Repository-Struktur

Alle Workflows liegen unter `workflows/<bereich>/`. Jeder Bereichsordner enthält
den/die exportierten Workflow(s) als `.json` und eine Doku (`README.md` oder
`<workflow-name>.md`).

```
n8n-workflows/
├── CLAUDE.md                    ← diese Datei
├── CONTEXT.md
├── docs/                        ← Architektur-Dokumentation
└── workflows/
    ├── agenda/                  ← Board-Agenda-Generator (Notion → docx-Service → Outlook)
    ├── email-analyse/           ← Rechnungs-Archivierung (Outlook → OneDrive)
    ├── email-analyse-antwort/   ← E-Mail-Analyse & Antwort-Entwurf (Outlook + HubSpot + Claude)
    ├── hubspot/                 ← HubSpot-Integrationen
    ├── nurturing/               ← Nurturing-Strecken
    ├── termine/                 ← Termin-/Confluence-Sync
    ├── linkedin-redaktionsplan/ ← LinkedIn-Redaktionsplanung
    ├── kmu-top-themen/          ← KMU-Themen-Recherche
    ├── aktuelle-informationen/  ← Info-/RSS-Aufbereitung
    ├── board-dokumente/         ← Board-Dokumente
    ├── boardthemen/             ← Boardthemen
    ├── errorworkflow/           ← Globaler Error-Workflow
    └── backups/                 ← Workflow-Backups
```

Jeder Bereichsordner enthält:
- `<workflow-name>.json` – exportierter n8n-Workflow
- `README.md` bzw. `<workflow-name>.md` – Dokumentation (Zweck, Inputs, Outputs, Abhängigkeiten, Testfälle)

> Hinweis: Ältere Workflows folgen den unten beschriebenen Konventionen
> (Namensschema, `meta`-Felder) teilweise noch nicht. Neue und überarbeitete
> Workflows werden nach diesen Standards angelegt; Bestand wird bei Gelegenheit
> nachgezogen.

---

## 3. Technischer Stack

| Komponente | Details |
|---|---|
| **n8n** | Self-hosted, IONOS VPS (Docker-Container `root-n8n-1`) |
| **n8n API** | Verfügbar – Claude Code darf Workflows lesen, importieren und per Webhook triggern |
| **Credentials** | Ausschließlich im n8n Credential Store – niemals in JSON-Dateien oder Code |
| **Outlook** | Microsoft Graph API (OAuth2, Credential im n8n Store) |
| **HubSpot** | HubSpot API v3 (Credential im n8n Store) |
| **Notion** | Notion API (Credential im n8n Store) |
| **KI-Modell** | Claude (Anthropic API) via n8n HTTP Request Node oder Claude-Node |

---

## 4. Branching- und Git-Workflow

### Modell: `main` + `feature/*` + `fix/*`

```
main                  ← Produktiv (nur getestete Workflows)
├── feature/<name>    ← Neue Workflows / Features
└── fix/<name>        ← Korrekturen an bestehenden Workflows
```

### Regeln für Claude Code

1. **Niemals direkt auf `main` committen** – ausnahmslos
2. Für neue Workflows: Branch `feature/<kurzbeschreibung>` von `main`
3. Für Änderungen an bestehenden Workflows: Branch `fix/<workflow-name>` von `main`
4. Commit-Messages auf Deutsch, präzise:
   - `feat: Orchestrator-Workflow für Outlook-Posteingang`
   - `fix: Sub-Workflow Rechnungsverarbeitung – Anhangserkennung korrigiert`
5. Vor dem Merge: Test-Protokoll in der zugehörigen `.md` Datei dokumentieren
6. **Merge nur nach expliziter Freigabe durch Wolfgang** – Claude Code schlägt vor, führt aber nicht selbst aus

### Merge-Freigabe-Prozess

```
Claude Code erstellt PR-Beschreibung mit:
  - Geänderte Dateien
  - Testfälle + Ergebnisse
  - Offene Risiken
→ Wolfgang prüft und merged manuell
```

---

## 5. n8n API – Nutzungsregeln

### Erlaubte Operationen

- `GET /workflows` – Workflow-Liste lesen
- `GET /workflows/{id}` – Einzelnen Workflow lesen
- `POST /workflows` – Neuen Workflow importieren (nur in Test-/Staging-Umgebung)
- `POST /workflows/{id}/activate` – Workflow aktivieren
- `POST /test-webhook/{path}` – Test-Webhook triggern
- `GET /executions` – Ausführungslog prüfen

### Verbotene Operationen (ohne explizite Freigabe)

- `DELETE /workflows/{id}` – Kein automatisches Löschen
- `PUT /workflows/{id}` – Kein automatisches Überschreiben produktiver Workflows
- Credentials lesen oder schreiben

### API-Konfiguration

```
N8N_BASE_URL=<aus .env lesen>
N8N_API_KEY=<aus .env lesen>
```

Die `.env`-Datei liegt lokal und ist in `.gitignore` – niemals committen.

---

## 6. Workflow-Entwicklungsstandards

### JSON-Struktur

Jeder Workflow-JSON muss folgende Metadaten im `meta`-Objekt enthalten:

```json
{
  "meta": {
    "instanceId": "",
    "templateCredsSetupCompleted": false
  },
  "name": "BLB | <Bereich> | <Beschreibung>",
  "tags": ["outlook", "orchestrator"],
  "notes": "Kurzbeschreibung des Workflows"
}
```

**Namenskonvention:** `BLB | <Bereich> | <Beschreibung>`  
Beispiele:
- `BLB | Outlook | Orchestrator`
- `BLB | Outlook | Sub – Rechnungsverarbeitung`
- `BLB | HubSpot | Kontakt anlegen`

### Nodes

- Jeder Node bekommt einen sprechenden deutschen Namen
- Error-Handler (`onError`) ist Pflicht bei HTTP-Requests und KI-Calls
- Keine hardcodierten Werte – Konfiguration über n8n-Variablen oder Workflow-Settings

### Dokumentations-Template (.md)

```markdown
# Workflow: <Name>

## Zweck
<Was macht dieser Workflow?>

## Trigger
<Wie wird er gestartet?>

## Inputs
| Feld | Typ | Beschreibung |
|---|---|---|

## Outputs / Aktionen
<Was passiert am Ende?>

## Abhängigkeiten
- Credentials: <Liste>
- Sub-Workflows: <Liste>
- Externe Systeme: <Liste>

## Testfälle
| # | Szenario | Erwartetes Ergebnis | Status |
|---|---|---|---|

## Änderungshistorie
| Datum | Version | Beschreibung |
|---|---|---|
```

---

## 7. Sicherheitsregeln (nicht verhandelbar)

1. **Keine Credentials im Code** – weder im JSON noch in Markdown, niemals
2. **Keine produktiven Daten in Testläufen** – Testfälle mit synthetischen E-Mail-Adressen und Dummy-Daten
3. **Keine automatischen Merges** – immer Freigabe durch Wolfgang abwarten
4. **Keine E-Mails ohne explizite Freigabe versenden** – Draft erstellen, nicht senden
5. **Vor Änderungen an bestehenden Workflows:** Original-JSON als Backup im Branch sichern (`<name>.backup.json`)

---

## 8. Bekannte Systeme und Datenstrukturen

### Outlook / Microsoft Graph

- Postfach: Wolfgang Baierl (blboardsolutions.de)
- Relevante Ordner: Posteingang, Gesendet, Rechnungen, Archiv
- Kategorien werden als Steuerungsmechanismus genutzt:
  - `Info Mail` → E-Mail-Adresse in Notion speichern
  - `HubSpot` → Neuen Kontakt in HubSpot anlegen

### HubSpot

- CRM für Kunden von BLBoardSolutions
- Kontakt-Lookup primär über E-Mail-Adresse
- Aktivitäten werden als Notes auf dem Kontakt angelegt

### Notion

- Datenbank: E-Mail-Blacklist (für Info-Mail-Adressen)
- Weitere Datenbanken: DB Gruppen, DB Kunden, DB Termine

### n8n Sub-Workflow Konvention

Bestehende Workflows werden als Sub-Workflows über den Node  
`Execute Workflow` aufgerufen. Übergabe-Parameter:

```json
{
  "emailId": "{{ $json.id }}",
  "emailData": "{{ $json }}",
  "context": "{{ $json.orchestratorContext }}"
}
```

---

## 9. Aufgaben-Checkliste für Claude Code

Vor jeder Aufgabe prüfen:

- [ ] Bin ich auf dem richtigen Branch? (`git branch`)
- [ ] Ist die `.env` vorhanden und lesbar?
- [ ] Habe ich die bestehenden Workflows im Ziel-Ordner gelesen?
- [ ] Gibt es eine `.md`-Dokumentationsdatei für meinen Workflow?
- [ ] Habe ich einen Testfall definiert bevor ich implementiere?
- [ ] Sind alle neuen Nodes mit deutschen Namen versehen?
- [ ] Ist kein Credential oder persönlicher Datenpunkt im JSON?

---

## 10. Kommunikation mit Wolfgang

- Sprache: **Deutsch**
- Bei Unklarheiten: **Fragen stellen**, nicht annehmen
- Vorschläge für Architekturentscheidungen immer mit **Begründung und Alternativen**
- Bei Merge-Bereitschaft: **PR-Zusammenfassung** auf Deutsch erstellen
