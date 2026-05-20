// ============================================================
// Set: Empfaengerdaten (erweitert, als Code-Node)
// Ersetzt: "Set: Kundendaten"
// Neu: liest confluencePageId + spaceKey aus Kunden- ODER Gruppen-Datensatz
//      + Guard 2: SpaceKey-Präfix gegen empfaengerTyp prüfen
// ============================================================

var loopItem   = $('Loop: Ein Kunde pro Durchlauf').item.json;
var notionData = $json; // Ausgabe von Notion: Kundendaten holen ODER Gruppendaten holen

// PageID und SpaceKey – Feldnamen identisch in beiden Notion-DBs
var confluencePageId = notionData.property_confluence_page_i_d
  || notionData.property_confluence_page_id
  || '';
var spaceKey = notionData.property_confluence_space_key || '';

// GUARD 2: SpaceKey-Präfix gegen Typ prüfen
// Konvention: KP* = individuell, GP* = gruppe
var empfaengerTyp  = loopItem.empfaengerTyp;
var isGruppenSpace = spaceKey.startsWith('GP');
var isKundenSpace  = spaceKey.startsWith('KP');

if (empfaengerTyp === 'gruppe' && !isGruppenSpace) {
  throw new Error(
    'GUARD VERLETZUNG: Typ=Gruppe aber SpaceKey="' + spaceKey + '" ist kein GP*-Space. ' +
    'Empfaenger-PageId: ' + loopItem.empfaengerPageId
  );
}
if (empfaengerTyp === 'individuell' && !isKundenSpace) {
  throw new Error(
    'GUARD VERLETZUNG: Typ=Individuell aber SpaceKey="' + spaceKey + '" ist kein KP*-Space. ' +
    'Empfaenger-PageId: ' + loopItem.empfaengerPageId
  );
}

return {
  json: {
    confluencePageId: confluencePageId,
    spaceKey:         spaceKey,
    empfaengerTyp:    empfaengerTyp,
    // Termine aus dem Loop-Item durchreichen für "Code: Tabelle aufbauen"
    termine:          loopItem.termine || []
  }
};
