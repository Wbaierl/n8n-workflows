# Workflow "Aktuelle Informationen → Archiv / Löschen" – Erweiterungsanleitung

## Übersicht der Änderungen

| Node | Aktion | Datei |
|------|--------|-------|
| Flatten: Eintraege x Kunden | **Ersetzen** | `archiv_flatten_erweitert.js` |
| IF: Empfaenger-Typ (neu) | **Neu** nach Loop | siehe unten |
| Notion: Gruppendaten holen (neu) | **Neu** | parallel zu Kundendaten |
| Notion: Kundendaten holen | **Page ID anpassen** | `$json.empfaengerPageId` |
| Code: Blog-ID finden | **Ersetzen** | `archiv_code_blogid_finden_erweitert.js` |

---

## Schritt-für-Schritt in n8n

### 1. Code-Node "Flatten: Eintraege x Kunden" ersetzen
- Bestehenden Node öffnen
- Inhalt ersetzen durch `archiv_flatten_erweitert.js`
- Output-Felder neu: `empfaengerPageId`, `empfaengerTyp`, `confBlogIDs`
- War: `kundePageId` → Jetzt: `empfaengerPageId`

### 2. IF-Node "IF: Empfaenger-Typ" nach dem Loop einfügen
- Neuen IF-Node anlegen: "IF: Empfaenger-Typ"
- Condition: `{{ $json.empfaengerTyp }}` equals `gruppe`
- Branch TRUE  (gruppe)      → Notion: Gruppendaten holen (neu)
- Branch FALSE (individuell) → Notion: Kundendaten holen (bestehend)

### 3. Notion: Gruppendaten holen (neu, parallel zu Kundendaten)
- Resource: Database Page / Get
- Page ID: `={{ $json.empfaengerPageId }}`
- Credentials: gleiche Notion-Credentials wie Kundendaten
- Ausgang → Code: Blog-ID finden
- Voraussetzung: Gruppen-DB hat Feld `Confluence Space Key` (Text)

### 4. Notion: Kundendaten holen – Page ID anpassen
- Page ID Expression ändern:
  - ALT: `={{ $json.kundePageId }}`
  - NEU: `={{ $json.empfaengerPageId }}`

### 5. Code-Node "Code: Blog-ID finden" ersetzen
- Inhalt ersetzen durch `archiv_code_blogid_finden_erweitert.js`
- Neu: liest `empfaengerTyp` aus Loop-Item durch
- Beide Branches (Kunden + Gruppen) laufen in diesen Node

---

## Notion: Neue Felder in "Aktuelle Informationen"

```
Typ          | Select   | Werte: Individuell, Gruppe, Beides
DB_Gruppen   | Relation | → Gruppen-Datenbank (identisch mit Workflow A/Publish)
```

## Gruppen-Datenbank: Pflichtfeld

```
Confluence Space Key | Text | z.B. PABremstal, GPX, ...
```

---

## Ablauf nach der Erweiterung

```
Notion: Archivierte Eintraege holen
  ↓
Flatten: Eintraege x Empfaenger
  → pro Eintrag je ein Item pro Kunden- und/oder Gruppen-Empfaenger
  ↓
Loop: Ein Paar pro Durchlauf
  ↓
IF: Empfaenger-Typ
  ├── TRUE  (gruppe)      → Notion: Gruppendaten holen → Code: Blog-ID finden
  └── FALSE (individuell) → Notion: Kundendaten holen  → Code: Blog-ID finden
  ↓
Blog-ID vorhanden?
  ├── TRUE  → Confluence: Blogpost loeschen → Notion: Aktuellen Stand lesen
  └── FALSE → Notion: Aktuellen Stand lesen
  ↓
Code: Blog-ID entfernen
  ↓
Alle Blogs geloescht?
  ├── TRUE  → Notion: Sync komplett zuruecksetzen → Loop
  └── FALSE → Notion: Blog-ID aktualisieren → Loop
```
