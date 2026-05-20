// ============================================================
// Code: ActiveProject filtern (NEU)
// Läuft nach: Notion: Mitglied laden
// Zweck: Entscheidet anhand ActiveProject ob Mitglied
//        individuell informiert wird (Logik b vs. c)
//
// Input ($json):    Notion-Daten des Mitglieds (DB Kunden)
// Input (vorher):   empfaengerTyp='mitglied_check'
//
// Logik b) ActiveProject=true  → individuellen Kunden-Space befüllen
// Logik c) ActiveProject=false → kein individueller Space, Item verwerfen
// ============================================================

var mitgliedData = $json; // Notion-Daten des Mitglieds

// ActiveProject Checkbox aus DB Kunden
var activeProject = mitgliedData.property_active_project
  || mitgliedData.property_activeproject
  || mitgliedData.property_activproject
  || false;

// Kunden-SpaceKey + PageID für Confluence
var kundenSpaceKey       = mitgliedData.property_confluence_space_key || '';
var kundenConfluencePageId = mitgliedData.property_confluence_page_i_d
  || mitgliedData.property_confluence_page_id || '';

// Termine + Gruppen-Info aus dem vorherigen Item
// (wurden in "Code: Gruppen-Mitglieder aufloesen" mitgegeben)
// Da wir nach einem Notion-Call sind, müssen wir auf den
// ursprünglichen Loop-Kontext zugreifen – über $('Loop: ...').item
var loopContext = $('Loop: Ein Kunde pro Durchlauf').item.json;
var termine     = loopContext.termine || [];

// Logik c: ActiveProject=false → Item verwerfen (leeres Array zurückgeben)
if (!activeProject) {
  return []; // N8N: leeres Array = kein Output = Item wird verworfen
}

// Logik b: ActiveProject=true → individuellen Space befüllen
// Guard: SpaceKey muss KP* sein
if (!kundenSpaceKey.startsWith('KP')) {
  throw new Error(
    'GUARD VERLETZUNG: Mitglied hat SpaceKey="' + kundenSpaceKey + '" (kein KP*-Space). ' +
    'Mitglied-PageId: ' + mitgliedData.id
  );
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
