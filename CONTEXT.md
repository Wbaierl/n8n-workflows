# Projekt: Notion → Confluence Sync

## Ziel
Aktuelle Informationen aus Notion automatisch als Blogpost
in Confluence veröffentlichen – gesteuert über n8n.

## Confluence
- Domain: blboardsolutions.atlassian.net
- Version: Cloud
- Credential: Basic Auth (Email + API Token)

## Notion Datenbanken

### DB: Aktuelle Informationen
| Feldname | Typ | Hinweis |
|---|---|---|
| Titel | Title | |
| Kurztext | Text | |
| Status | Select | Freigegeben / Gesperrt / Archiv / Entwurf |
| Veröffentlicht am | Date | |
| In Confluence anzeigen | Checkbox | |
| ConfluenceSync | Checkbox | true = live in Confluence |
| ConfluenceBlogIDs | Text | Format: "KPA:12345,KPB:67890" |
| Kategorie | Multi-Select | |
| DB Kunden | Relation | → DB Kunden |

### DB: Kunden
| Feldname | Typ | Hinweis |
|---|---|---|
| Name | Title | |
| Email | Email | |
| Confluence Page ID | Text | Hauptseite des Kundenbereichs |
| Kunden ID | Text | Format: KD-xxx |
| Confluence Space Key | Text | z.B. KPA |

## n8n
- Version: 1.x (Cloud oder Self-hosted)
- Notion Credential ID: NnTc9kDS62fncKVA
- Confluence Credential ID: OncAUjZtrqWedJug

## Workflows

### workflow_a_publish.json
Veröffentlicht neue Einträge aus Notion als Blogpost in Confluence.
- Trigger: alle 15 Minuten
- Filter: Status=Freigegeben + In Confluence anzeigen=true + ConfluenceSync=false
- Ergebnis: Blogpost in Confluence + ConfluenceSync=true + ConfluenceBlogIDs gesetzt

### workflow_b_archive.json
Löscht Blogposts wenn Status auf Gesperrt/Archiv gesetzt wird.
- Trigger: alle 15 Minuten
- Filter: Status=Gesperrt/Archiv + ConfluenceSync=true
- Ergebnis: Blogpost gelöscht + ConfluenceSync=false + ConfluenceBlogIDs geleert

## Bekannte Besonderheiten
- n8n Notion Node v2.2 gibt Properties als property_feldname aus
- Umlaute werden normalisiert: ö → _ffentlicht (property_ver_ffentlicht_am)
- Loop-Node SplitInBatches: Ausgang 0 = loop, Ausgang 1 = done
- Confluence REST API v1: /wiki/rest/api/content
- Blogpost-Titel muss eindeutig sein → Format: "Titel – DATUM"
