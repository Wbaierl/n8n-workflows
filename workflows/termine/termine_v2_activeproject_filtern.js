// ============================================================
// Code: ActiveProject filtern (NEU)
// Läuft nach: Notion: Mitglied laden
// Zweck: Entscheidet anhand ActiveProject ob Mitglied
//        individuell informiert wird (Logik b vs. c)
//
// Logik b) ActiveProject=true  → individuellen Kunden-Space befüllen
// Logik c) ActiveProject=false → kein individueller Space, Item verwerfen
// ============================================================

var mitgliedData = $json;

// ActiveProject Checkbox aus DB Kunden (mehrere mögliche Property-Namen)
var activeProject = mitgliedData.property_active_project
  || mitgliedData.property_activeproject
  || mitgliedData.property_activproject
  || false;

// Kunden-SpaceKey + PageID für Confluence
var kundenSpaceKey         = mitgliedData.property_confluence_space_key || '';
var kundenConfluencePageId = mitgliedData.property_confluence_page_i_d
  || mitgliedData.property_confluence_page_id || '';

// Termine aus dem Loop-Kontext
var loopContext = $('Loop: Ein Kunde pro Durchlauf').item.json;
var termine     = loopContext.termine || [];

// Logik c: ActiveProject=false → Item verwerfen
if (!activeProject) {
  return [];
}

return [{
  json: {
    empfaengerPageId:  mitgliedData.id || '',
    empfaengerTyp:     'individuell',
    confluencePageId:  kundenConfluencePageId,
    spaceKey:          kundenSpaceKey,
    termine:           termine,
    _activeProject:    true
  }
}];
