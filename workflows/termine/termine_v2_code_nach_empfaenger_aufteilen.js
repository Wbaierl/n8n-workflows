// ============================================================
// Code: Nach Empfaenger aufteilen (v2 – komplexe Routing-Logik)
// Ersetzt: "Code: Nach Kunden aufteilen"
//
// WICHTIG: Dieser Node gibt pro Termin MEHRERE Items aus:
//   - 1 Item pro direktem Kunden-Empfänger (Logik a)
//   - 1 Item pro Gruppen-Empfänger (Logik b/c – wird später aufgelöst)
//
// Die ActiveProject-Prüfung für Gruppenmitglieder erfolgt in einem
// NACHGELAGERTEN Node ("Code: Gruppen-Mitglieder auflösen"), weil
// dafür Notion-API-Calls pro Mitglied nötig sind.
// ============================================================

var items = $input.all();
var today = new Date();
today.setHours(0, 0, 0, 0);

// Ergebnis-Map: empfaengerKey → { empfaengerPageId, empfaengerTyp, termine[] }
// empfaengerKey = pageId für Eindeutigkeit
var empfaengerMap = {};

function addTermin(pageId, typ, termin) {
  if (!empfaengerMap[pageId]) {
    empfaengerMap[pageId] = {
      empfaengerPageId: pageId,
      empfaengerTyp: typ,
      termine: []
    };
  }
  // Duplikat-Schutz: gleicher Termin nicht zweimal hinzufügen
  var exists = empfaengerMap[pageId].termine.some(function(t) {
    return t.datumIso === termin.datumIso && t.titel === termin.titel;
  });
  if (!exists) {
    empfaengerMap[pageId].termine.push(termin);
  }
}

for (var i = 0; i < items.length; i++) {
  var props = items[i].json;

  // --- Datum prüfen ---
  var datumObj = props.property_datum;
  var datumRaw = null;
  if (datumObj && datumObj.start)                               { datumRaw = datumObj.start; }
  else if (typeof datumObj === 'string' && datumObj.length >= 10) { datumRaw = datumObj; }
  if (!datumRaw) continue;

  var terminDate = new Date(datumRaw.substring(0, 10));
  if (terminDate < today) continue;

  // --- Termin-Felder ---
  var titel    = props.property_titel || props.name || 'Kein Titel';
  var ort      = props.property_ort || '';
  var datumIso = datumRaw.substring(0, 10);
  var dp       = datumIso.split('-');
  var datumStr = dp[2] + '.' + dp[1] + '.' + dp[0];
  var uhrzeitStr = '';
  var tIdx = datumRaw.indexOf('T');
  if (tIdx !== -1) { uhrzeitStr = datumRaw.substring(tIdx + 1, tIdx + 6); }

  var termin = {
    datumIso:   datumIso,
    datumStr:   datumStr,
    uhrzeitStr: uhrzeitStr,
    titel:      titel,
    ort:        ort
  };

  // --- Direkte Kunden aus DB Termine (Logik a) ---
  // Diese Kunden erhalten den Termin immer direkt,
  // unabhängig von Gruppen-Mitgliedschaft
  var kundenRaw  = props.property_kunden || [];
  var kundenIds  = Array.isArray(kundenRaw) ? kundenRaw : [kundenRaw];
  for (var j = 0; j < kundenIds.length; j++) {
    if (!kundenIds[j]) continue;
    addTermin(kundenIds[j], 'individuell', termin);
  }

  // --- Gruppen aus DB Termine (Logik b/c) ---
  // Gruppen erhalten den Termin immer.
  // Ob Mitglieder zusätzlich individuell informiert werden,
  // entscheidet der nachgelagerte Node anhand von ActiveProject.
  var gruppenRaw = props.property_gruppen || [];
  var gruppenIds = Array.isArray(gruppenRaw) ? gruppenRaw : [gruppenRaw];
  for (var k = 0; k < gruppenIds.length; k++) {
    if (!gruppenIds[k]) continue;
    addTermin(gruppenIds[k], 'gruppe', termin);
  }
}

// --- Ergebnis aufbauen, Termine sortieren ---
var result = [];
var keys = Object.keys(empfaengerMap);
for (var ki = 0; ki < keys.length; ki++) {
  var entry = empfaengerMap[keys[ki]];
  entry.termine.sort(function(a, b) {
    return a.datumIso < b.datumIso ? -1 : a.datumIso > b.datumIso ? 1 : 0;
  });
  result.push({ json: entry });
}
return result;
