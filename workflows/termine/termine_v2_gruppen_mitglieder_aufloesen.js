// ============================================================
// Code: Gruppen-Mitglieder auflösen (NEU)
// Läuft nach: Notion: Gruppendaten holen
// Zweck: Prüft ActiveProject für alle Gruppenmitglieder
//        und erzeugt zusätzliche individuelle Items (Logik b)
//
// Input ($json): Notion-Daten der Gruppe inkl. DB Kunden Relation
// Input (Loop):  empfaengerTyp='gruppe', termine[], confluencePageId
//
// Output:
//   - 1 Item für den Gruppen-Space (immer)
//   - 0-n Items für individuelle Kunden (nur wenn ActiveProject=true)
//
// WICHTIG: Dieser Node gibt mehrere Items zurück.
//          ActiveProject wird aus den Mitgliedsdaten gelesen,
//          die Notion bereits in der Relation mitliefert.
//          Falls Notion die Relation nicht expanded, muss ein
//          separater "Notion: Mitglied laden"-Node ergänzt werden.
// ============================================================

var loopItem = $('Loop: Ein Kunde pro Durchlauf').item.json;
var gruppenData = $json; // Notion-Daten der Gruppe

// Gruppen-SpaceKey + PageID für Confluence
var gruppenSpaceKey      = gruppenData.property_confluence_space_key || '';
var gruppenConfluencePageId = gruppenData.property_confluence_page_i_d
  || gruppenData.property_confluence_page_id || '';

// Termine aus dem Loop
var termine = loopItem.termine || [];

// Mitglieder der Gruppe: Relation "DB Kunden"
// Notion liefert Relation als Array von Page-IDs
var mitgliederRaw = gruppenData.property_db_kunden || [];
var mitgliederIds = Array.isArray(mitgliederRaw) ? mitgliederRaw : [mitgliederRaw];

// Ergebnis-Items
var result = [];

// 1. Gruppen-Space bekommt den Termin IMMER (Logik b + c)
result.push({
  json: {
    empfaengerPageId:    loopItem.empfaengerPageId,
    empfaengerTyp:       'gruppe',
    confluencePageId:    gruppenConfluencePageId,
    spaceKey:            gruppenSpaceKey,
    termine:             termine,
    _mitgliederZuPruefen: mitgliederIds.filter(Boolean)
  }
});

// 2. Pro Mitglied: ActiveProject prüfen
// Notion expanded Relationen nicht automatisch –
// daher werden Mitglieder-PageIds für den nachgelagerten
// "Notion: Mitglied laden"-Node ausgegeben.
// Der ActiveProject-Check erfolgt in "Code: ActiveProject filtern".
for (var m = 0; m < mitgliederIds.length; m++) {
  var mitgliedId = mitgliederIds[m];
  if (!mitgliedId) continue;
  result.push({
    json: {
      empfaengerPageId:  mitgliedId,
      empfaengerTyp:     'mitglied_check', // Zwischenstatus – wird aufgelöst
      termine:           termine,
      _gruppePageId:     loopItem.empfaengerPageId,
      _gruppeSpaceKey:   gruppenSpaceKey
    }
  });
}

return result;
