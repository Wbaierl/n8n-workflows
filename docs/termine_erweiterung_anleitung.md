# Workflow "Termine → Confluence Panel" – Erweiterungsanleitung

## Übersicht der Änderungen

| Node | Aktion | Datei |
|------|--------|-------|
| Code: Nach Kunden aufteilen | **Ersetzen** | `termine_code_nach_empfaenger_aufteilen.js` |
| Guard (neu) | **Neu** nach Aufteilen | `termine_guard_node.js` |
| Guard: IF-Check (neu) | **Neu** nach Guard | siehe unten |
| Guard: Notion Fehler-Log (neu) | **Neu** | wie Workflow A |
| IF: Empfänger-Typ (neu) | **Neu** nach Loop | siehe unten |
| Notion: Gruppendaten holen (neu) | **Neu** | parallel zu Kundendaten |
| Set: Kundendaten | **Ersetzen** durch Code-Node | `termine_set_empfaengerdaten.js` |
| Code: Tabelle aufbauen | **Unverändert** ✓ | — |
| Confluence: Seite holen/aktualisieren | **Unverändert** ✓ | — |

---

## Schritt-für-Schritt in N8N

### 1. Code-Node "Nach Kunden aufteilen" ersetzen
- Bestehenden Node öffnen
- Inhalt ersetzen durch `termine_code_nach_empfaenger_aufteilen.js`
- Output-Felder neu: `empfaengerPageId`, `empfaengerTyp`, `_guard_error`
- Wichtig: Loop-Node referenziert danach `$json.empfaengerPageId` statt `$json.kundePageId`

### 2. Guard-Node einfügen (nach Aufteilen, vor Loop)
- Neuen Code-Node anlegen: "Guard: Konsistenz-Check"
- Mode: "Run once for all items"
- Inhalt: `termine_guard_node.js`

### 3. IF-Node nach Guard: Fehler abzweigen
- Condition: `{{ $json._guard_triggered }}` equals `true`
- Branch TRUE  → Notion Fehler-Log → E-Mail → Stop (identisch Workflow A)
- Branch FALSE → weiter zum Loop

### 4. Loop-Node: Referenz anpassen
- Notion: Kundendaten holen → Page ID:
  `={{ $json.empfaengerPageId }}`  ← war: `$json.kundePageId`

### 5. IF-Node "Empfänger-Typ" nach dem Loop (neu)
- Neuen IF-Node anlegen: "IF: Empfänger-Typ"
- Condition: `{{ $json.empfaengerTyp }}` equals `gruppe`
- Branch TRUE  (gruppe)      → Notion: Gruppendaten holen (neu)
- Branch FALSE (individuell) → Notion: Kundendaten holen (bestehend)

### 6. Notion: Gruppendaten holen (neu, parallel zu Kundendaten)
- Resource: Database Page / Get
- Page ID: `={{ $json.empfaengerPageId }}`
- Credentials: gleiche Notion-Credentials
- Wichtig: Gruppen-DB braucht dieselben Felder wie Kunden-DB:
    • `Confluence Space Key`  (Text, Präfix GP*)
    • `Confluence Page ID`    (Text, ID der Termin-Seite in Confluence)

### 7. Set: Kundendaten → durch Code-Node ersetzen
- Bestehenden Set-Node ersetzen durch Code-Node
- Mode: "Run once for each item"
- Inhalt: `termine_set_empfaengerdaten.js`
- Beide Branches (Kunden + Gruppen) laufen in diesen Node

### 8. Code: Tabelle aufbauen – eine Anpassung
Der bestehende Code liest Termine aus:
  `$('Loop: Ein Kunde pro Durchlauf').item.json.termine`

Da der Set-Node jetzt die Termine weiterreicht, muss eine Zeile angepasst werden:

ALT:
  var loopItem = $('Loop: Ein Kunde pro Durchlauf').item.json;
  var termine = loopItem.termine || [];

NEU:
  var termine = $('Set: Kundendaten').item.json.termine || [];
  (oder wie der neue Code-Node heißt, z.B. "Set: Empfaengerdaten")

---

## Notion: Neue Felder in "DB Termine"

```
Typ          | Select   | Werte: Individuell, Gruppe, Beides
DB_Gruppen   | Relation | → Gruppen-Datenbank (identisch mit Workflow A)
Fehler-Log   | Rich Text| Guard schreibt Fehlerbeschreibung rein
```

## Gruppen-Datenbank: Zusätzliches Feld

Zur bestehenden Gruppen-DB (aus Workflow A) ein Feld ergänzen:

```
Confluence Page ID  | Text | ID der Termin-Seite in Confluence (z.B. 123456789)
```

Die Confluence Page ID einer Seite findest du in der URL:
`https://dein-tenant.atlassian.net/wiki/spaces/GPA/pages/123456789/Termine`
                                                                 ^^^^^^^^^

---

## SpaceKey-Konvention (Guard 2)

| Typ         | Präfix | Beispiele     |
|-------------|--------|---------------|
| Individuell | KP*    | KPA, KPB, KPC |
| Gruppe      | GP*    | GPA, GPB, GPC |

---

## Was NICHT geändert werden muss

- `Confluence: Seite holen` (GET) – unverändert, nutzt confluencePageId
- `Code: Tabelle aufbauen`  – unverändert bis auf eine Zeile (siehe Schritt 8)
- `Confluence: Seite aktualisieren` (PUT) – unverändert
- Alle Credentials – unverändert
