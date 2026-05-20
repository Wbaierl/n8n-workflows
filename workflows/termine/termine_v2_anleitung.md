# Workflow "Termine → Confluence Panel" v2 – Erweiterungsanleitung

## Routing-Logik

| Situation | Gruppen-Space | Individueller Space |
|-----------|--------------|---------------------|
| a) Kein Gruppe, direkt im Termin | — | ✓ immer |
| b) Gruppenmitglied, ActiveProject=true | ✓ | ✓ |
| c) Gruppenmitglied, ActiveProject=false | ✓ | ✗ |

## Übersicht aller Node-Änderungen

| Node | Aktion | Datei |
|------|--------|-------|
| Code: Nach Kunden aufteilen | **Ersetzen** | `termine_v2_code_nach_empfaenger_aufteilen.js` |
| IF: Empfänger-Typ (neu) | **Neu** nach Loop | — |
| Notion: Gruppendaten holen (neu) | **Neu** Branch Gruppe | — |
| Code: Gruppen-Mitglieder auflösen (neu) | **Neu** nach Gruppendaten | `termine_v2_gruppen_mitglieder_aufloesen.js` |
| IF: Mitglied-Check (neu) | **Neu** | — |
| Notion: Mitglied laden (neu) | **Neu** Branch mitglied_check | — |
| Code: ActiveProject filtern (neu) | **Neu** nach Mitglied laden | `termine_v2_activeproject_filtern.js` |
| Set: Kundendaten | **Ersetzen** durch Code-Node | `termine_v2_set_empfaengerdaten.js` |
| Code: Tabelle aufbauen | **1 Zeile anpassen** | — |
| Confluence: Seite holen/aktualisieren | **Unverändert** ✓ | — |

---

## Schritt-für-Schritt in N8N

### 1. Code-Node "Nach Kunden aufteilen" ersetzen
- Inhalt: `termine_v2_code_nach_empfaenger_aufteilen.js`
- Output-Felder: `empfaengerPageId`, `empfaengerTyp`, `termine[]`
- empfaengerTyp kann sein: `individuell` oder `gruppe`

### 2. IF-Node "Empfänger-Typ" nach Loop
- Condition: `{{ $json.empfaengerTyp }}` equals `gruppe`
- Branch TRUE  → Notion: Gruppendaten holen
- Branch FALSE → Notion: Kundendaten holen (bestehend, für direkte Kunden)

### 3. Notion: Gruppendaten holen (Branch TRUE)
- Page ID: `={{ $json.empfaengerPageId }}`
- Liefert: Confluence Space Key, Confluence Page ID, DB Kunden (Mitglieder)

### 4. Code: Gruppen-Mitglieder auflösen (nach Gruppendaten)
- Inhalt: `termine_v2_gruppen_mitglieder_aufloesen.js`
- Gibt aus:
  - 1 Item mit empfaengerTyp='gruppe' (für Gruppen-Space)
  - n Items mit empfaengerTyp='mitglied_check' (pro Mitglied)

### 5. IF-Node "Mitglied-Check" nach Gruppen-Mitglieder
- Condition: `{{ $json.empfaengerTyp }}` equals `mitglied_check`
- Branch TRUE  → Notion: Mitglied laden
- Branch FALSE → direkt zu "Code: Tabelle aufbauen" (Gruppen-Item)

### 6. Notion: Mitglied laden (Branch mitglied_check)
- Page ID: `={{ $json.empfaengerPageId }}`
- Liefert: ActiveProject Checkbox, Confluence Page ID, Space Key

### 7. Code: ActiveProject filtern (nach Mitglied laden)
- Inhalt: `termine_v2_activeproject_filtern.js`
- ActiveProject=true  → Item mit empfaengerTyp='individuell' weiter
- ActiveProject=false → leeres Array (Item wird verworfen = Logik c)

### 8. Set: Kundendaten ersetzen (für direkte Kunden, Branch FALSE aus Schritt 2)
- Inhalt: `termine_v2_set_empfaengerdaten.js`
- Liest confluencePageId + spaceKey aus Notion-Kundendaten

### 9. Alle Pfade zusammenführen → Code: Tabelle aufbauen
Alle 3 Pfade (Gruppe, Mitglied Logik b, direkter Kunde Logik a)
laufen in "Code: Tabelle aufbauen". Eine Zeile anpassen:

ALT:
  var loopItem = $('Loop: Ein Kunde pro Durchlauf').item.json;
  var termine = loopItem.termine || [];

NEU (liest aus dem jeweils vorherigen Node):
  var termine = $json.termine || [];

### 10. Confluence: Seite holen + aktualisieren
- Unverändert, nutzt $json.confluencePageId

---

## Notion: Neue Felder

### In "DB Termine":
```
DB_Gruppen  | Relation | → Gruppen-Datenbank (max. 1 Eintrag)
```
(DB_Kunden bleibt – für direkte Kunden-Zuordnung, Logik a)

### In "Gruppen-Datenbank":
```
DB Kunden           | Relation  | → DB Kunden (alle Mitglieder)
Confluence Space Key| Text      | GP*-Präfix
Confluence Page ID  | Text      | ID der Termin-Seite
```

### In "DB Kunden" (bereits vorhanden laut Anforderung):
```
ActiveProject | Checkbox | true=Logik b, false=Logik c
```

---

## Wichtiger Hinweis: Notion Relation Expansion

Notion liefert bei Relationen standardmäßig nur die Page-IDs,
nicht die vollständigen Daten der verknüpften Seiten.

Der Node "Notion: Mitglied laden" macht deshalb einen separaten
API-Call pro Mitglied um ActiveProject zu lesen.

Bei großen Gruppen (>10 Mitglieder) kann das zu vielen API-Calls
führen. In diesem Fall empfiehlt sich ein Batch-Loop statt eines
einzelnen Nodes.

---

## SpaceKey-Konvention

| Typ         | Präfix | Beispiele     |
|-------------|--------|---------------|
| Individuell | KP*    | KPA, KPB, KPC |
| Gruppe      | GP*    | GPA, GPB, GPC |
