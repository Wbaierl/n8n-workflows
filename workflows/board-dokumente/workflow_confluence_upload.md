# Workflow: Board Dokumente → Confluence Upload

> **Zweiter Workflow** der Board-Dokumente-Strecke. Lädt freigegebene Dokumente aus
> Notion als Datei nach Confluence – an die verknüpfte **aktive Gruppe** und an alle
> verknüpften **Kunden mit `ActiveProject = true`**.
> Der erste Workflow („Board Dokumente — Confluence Sync", n8n-ID `3Eg1XBufXAeDH73b`)
> macht die Ingestion OneDrive → Notion und ist **nicht** Teil dieses Workflows.

- **n8n-ID:** `47qTrDQl9gCRB08l` (Stand: inaktiv – wartet auf Go-live-Freigabe)
- **Repo-Datei:** `workflow_confluence_upload.json` (Quelle, per API mit `47qTr` synchron gehalten)
- **Hinweis:** Der Ingestion-Workflow `3Eg1` heißt aktuell versehentlich ebenfalls
  „Board Dokumente → Confluence Upload" – Namenskollision, sollte bei Gelegenheit zurückbenannt werden.

## Zweck
Verteilt freigegebene Board-Dokumente (Protokolle/Agenda) als Confluence-Anhänge an
alle relevanten Ziele und hält den Sync-Status in Notion nach.

## Trigger
- **Schedule** alle 30 Minuten (eigenständig, unabhängig von der Ingestion).

## Gating (welche Dokumente werden verarbeitet)
Board-Dokumente-DB (`619275ab2b7a4051a8f34c7519a7bc83`) mit:
`In Confluence anzeigen = true` ∧ `ConfluenceSync = false` ∧ `Status = Freigegeben`.

## Ziel-Ermittlung (entkoppelt vom Feld `Dokumenttyp`)
- je `DB_Gruppen`-Relation ein Ziel – **nur wenn** Gruppe `Aktiv = true` (Confluence: `Confluence Space Key` + `Confluence PageID`).
- je `DB Kunden`-Relation ein Ziel – **nur wenn** Kunde `ActiveProject = true` (Confluence: `ConfluenceSpaceKey` + `Confluence PageID`).

### Ziel-Seite (Unterordner) je Space-Typ
Der Anhang wird an die per Titel gesuchte Confluence-Seite gehängt (Titel-Suche, exakter Match):
- **Gruppen-Spaces:** `Agenda PAB` bzw. `Protokolle PAB`
- **Kunden-Spaces:** `Agenda Unternehmerboard` bzw. `Protokolle Unternehmerboard`
  (bestehende Struktur `Dokumentenportal → Unternehmerboard → …`, in allen Kunden-Spaces vorhanden).

Existiert die Zielseite nicht, wird sie unter der jeweiligen `Confluence PageID` angelegt.

> Die Ingestion kopiert bei Gruppen-Dokumenten die *komplette* `DB Kunden`-Relation der
> Gruppe ungefiltert ans Dokument – deshalb prüft dieser Workflow `ActiveProject` pro Kunde erneut.

## Architektur (wichtig für Wartung)
- Dokumente werden zu **Ziel-Items** „flachgeklopft" (ein Item je Gruppe/Kunde).
- Verarbeitung in **einem `splitInBatches`-Loop (`Loop: Ziele`)** – seriell, ein Ziel pro Iteration.
- Ergebnisse werden in **Workflow-Static-Data** gesammelt (`$getWorkflowStaticData('global').results`),
  zu Lauf-Beginn in `Code: Ziele expandieren` zurückgesetzt.
- Erst im **DONE-Zweig** (`Code: Finalisieren`, läuft genau 1×) wird pro Dokument der
  Notion-Status geschrieben → keine widersprüchlichen Teil-Updates.

### Ablauf je Ziel
1. Unterordner „Protokolle PAB"/„Agenda PAB" (je `Typ`) unter der Ziel-`PageID` finden, sonst anlegen
   (Create-Body wird in `Code: Create-Body bauen` als JSON gebaut – **keine** Inline-IIFE-Expression).
2. Bestehende Anhänge des Unterordners auflisten; Datei von OneDrive laden (Graph, `OneDrive URL`).
3. **Anlegen-oder-aktualisieren:**
   - existiert ein Anhang gleichen Namens → `POST …/child/attachment/{attachmentId}/data` (Update)
   - sonst → `POST …/{subfolderId}/child/attachment` (Neu)
4. Label `protokoll`/`agenda` setzen; Ergebnis (`ok`/`upload_failed`) + Unterordner-ID in Static Data.

## Abschluss je Dokument (`Code: Finalisieren`)
- Alle Ziele ok → `ConfluenceSync = true`, gesammelte IDs in `Confluence PageID`.
- Mind. ein aktives Ziel ohne Confluence-Config **oder** Upload-Fehler → `Status = Fehler` + `Notizen`, `ConfluenceSync` bleibt `false` (Retry).
- Dokument ohne verwertbares Ziel (z. B. nur inaktive Kunden) → `ConfluenceSync = true` (still erledigt).

## Archiv-Zweig
`Status = Archiv` ∧ `ConfluenceSync = false` ∧ `Confluence PageID ≠ leer`:
Anhänge der hinterlegten Confluence-Seiten löschen, `Confluence PageID` leeren, `ConfluenceSync = true`.

## Abhängigkeiten
- **Credentials:** Notion API (`Notion account`), Confluence Basic Auth (`Unnamed credential 2`), Microsoft Drive OAuth2 (`Microsoft Drive account`).
- **Externe Systeme:** Notion API, Confluence Cloud REST API, Microsoft Graph (OneDrive).
- **Vorgelagert:** „Board Dokumente — Confluence Sync" (Ingestion) erzeugt die Notion-Einträge.

## Testfälle
| # | Szenario | Erwartetes Ergebnis | Status |
|---|---|---|---|
| 2 | Gruppe (aktiv) + Kunde Pham (`ActiveProject=true`) | Anhang bei Gruppe + Pham | ✅ bestanden (Exec 25437) |
| 3 | + Kunde Baierl (`ActiveProject=false`) | Baierl übersprungen | ✅ bestanden |
| – | Kunden-Ziel = `Agenda Unternehmerboard` (richtiger Ordner) | bestehende Seite gefunden, kein Neuanlegen | ✅ bestanden |
| – | Re-Upload bestehender Anhang | Anhang aktualisiert (kein 400) | ✅ bestanden |
| – | Notion-Rückschreibung | 1× geschrieben, `ConfluenceSync=true`, kein Fehler | ✅ bestanden |
| 8 | `Status=Archiv` | Anhänge entfernt, `Confluence PageID` geleert, `ConfluenceSync=true` | ✅ bestanden (Exec 25439/8) |
| 1 | Gruppe ohne Kunden | nur Gruppen-Space | offen |
| 5 | nur inaktive Kunden, keine aktive Gruppe | kein Upload, `ConfluenceSync=true` | offen |
| 6 | aktives Ziel ohne Confluence-Config | `Status=Fehler` + Notiz | offen |

## Änderungshistorie
| Datum | Version | Beschreibung |
|---|---|---|
| 2026-06-19 | 2.1 | Kunden-Spaces: Ziel-Seite `Agenda/Protokolle Unternehmerboard` (statt `… PAB`); Archiv-Zweig: `notion_page_id` stabil aus `Code: Archiv aufbereiten` (Notion-Bereinigung lief vorher nicht). Beides real verifiziert. |
| 2026-06-19 | 2.0 | Neuaufbau: `splitInBatches`-Loop + Static-Data-Sammlung (statt Fan-in-Aggregation), Create-Body als Code-Node, Anhang anlegen-oder-aktualisieren. Real getestet (Gruppe-Update + Pham-Upload + Baierl-Skip, konsistente Notion-Rückschreibung). |
| 2026-06-18 | 1.0 | Erstaufbau (verworfen: Aggregations-/Expression-Bugs). |
