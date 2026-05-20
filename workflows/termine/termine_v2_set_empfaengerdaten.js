// ============================================================
// Code: Set Empfaengerdaten (v2)
// Läuft nach: Notion: Kundendaten holen (direkte Kunden, Logik a)
// Zweck: Liest confluencePageId + spaceKey für direkte Kunden
//        (Gruppen und Mitglieder haben ihre Daten bereits)
//
// Guard 2: SpaceKey-Präfix gegen empfaengerTyp prüfen
// ============================================================

var loopItem   = $('Loop: Ein Kunde pro Durchlauf').item.json;
var notionData = $json;

var confluencePageId = notionData.property_confluence_page_i_d
  || notionData.property_confluence_page_id || '';
var spaceKey = notionData.property_confluence_space_key || '';
var termine  = loopItem.termine || [];

// Guard 2: KP* für individuelle Kunden
if (!spaceKey.startsWith('KP')) {
  throw new Error(
    'GUARD VERLETZUNG: Direkter Kunde hat SpaceKey="' + spaceKey + '" (kein KP*-Space). ' +
    'Empfaenger-PageId: ' + loopItem.empfaengerPageId
  );
}

return {
  json: {
    empfaengerPageId: loopItem.empfaengerPageId,
    empfaengerTyp:    'individuell',
    confluencePageId: confluencePageId,
    spaceKey:         spaceKey,
    termine:          termine
  }
};
