// ============================================================
// Code: Gruppen-PageId setzen (NEU)
// Läuft nach: Confluence: Space-Homepage holen
// Zweck: Extrahiert die Confluence Page ID der Gruppen-Homepage
//        (Gruppen haben keine gespeicherte PageID in Notion – nur Space Key)
//
// Input ($json):  Confluence Spaces-API Response
//                 { homepage: { id: "12345678", title: "..." }, key: "GDtest", ... }
// Input (Loop):   empfaengerTyp='gruppe', spaceKey, termine[]
// ============================================================

var homepageResp = $json;
var gruppenItem  = $('Code: Gruppen-Mitglieder auflösen').item.json;

// Homepage-ID aus Confluence Spaces-Antwort extrahieren
var confluencePageId = '';
if (homepageResp.homepage && homepageResp.homepage.id) {
  confluencePageId = String(homepageResp.homepage.id);
}

if (!confluencePageId) {
  throw new Error(
    'GRUPPEN-FEHLER: Keine Homepage-ID für Space "' + gruppenItem.spaceKey + '" gefunden. ' +
    'Response-Keys: ' + Object.keys(homepageResp).join(', ')
  );
}

return {
  json: {
    empfaengerPageId: gruppenItem.empfaengerPageId,
    empfaengerTyp:    'gruppe',
    confluencePageId: confluencePageId,
    spaceKey:         gruppenItem.spaceKey,
    termine:          gruppenItem.termine || []
  }
};
