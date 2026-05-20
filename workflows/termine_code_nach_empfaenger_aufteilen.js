// ============================================================
// Code: Nach Empfaenger aufteilen (erweitert)
// Ersetzt: "Code: Nach Kunden aufteilen"
// Neu: liest Typ-Feld + property_gruppen, routet auf beide
// ============================================================

var items = $input.all();
var today = new Date();
today.setHours(0, 0, 0, 0);

// empfaengerMap: key = pageId, value = { pageId, empfaengerTyp, termine[] }
var empfaengerMap = {};

for (var i = 0; i < items.length; i++) {
  var props = items[i].json;

  // --- Datum prüfen (unverändert) ---
  var datumObj = props.property_datum;
  var datumRaw = null;
  if (datumObj && datumObj.start)                              { datumRaw = datumObj.start; }
  else if (typeof datumObj === 'string' && datumObj.length >= 10) { datumRaw = datumObj; }
  if (!datumRaw) continue;

  var terminDate = new Date(datumRaw.substring(0, 10));
  if (terminDate < today) continue;

  // --- Termin-Felder (unverändert) ---
  var titel    = props.property_titel || props.name || 'Kein Titel';
  var ort      = props.property_ort || '';
  var datumIso = datumRaw.substring(0, 10);
  var dp       = datumIso.split('-');
  var datumStr = dp[2] + '.' + dp[1] + '.' + dp[0];
  var uhrzeitStr = '';
  var tIdx = datumRaw.indexOf('T');
  if (tIdx !== -1) { uhrzeitStr = datumRaw.substring(tIdx + 1, tIdx + 6); }

  var termin = { datumIso: datumIso, datumStr: datumStr, uhrzeitStr: uhrzeitStr, titel: titel, ort: ort };

  // --- NEU: Typ-Feld lesen ---
  // Werte: "Individuell" | "Gruppe" | "Beides"
  var typ = props.property_typ || 'Individuell';

  // --- GUARD: Pflichtfeld-Check ---
  var kundenRaw  = props.property_kunden  || [];
  var gruppenRaw = props.property_gruppen || [];
  var kundenIds  = Array.isArray(kundenRaw)  ? kundenRaw  : [kundenRaw];
  var gruppenIds = Array.isArray(gruppenRaw) ? gruppenRaw : [gruppenRaw];

  if ((typ === 'Gruppe' || typ === 'Beides') && gruppenIds.filter(Boolean).length === 0) {
    // Guard-Fehler als spezielles Item ausgeben
    empfaengerMap['__guard_error__' + i] = {
      _guard_error: true,
      _error_reason: 'Typ="' + typ + '" aber property_gruppen ist leer',
      titel: titel,
      notionPageId: props.id || ''
    };
    continue;
  }
  if ((typ === 'Individuell' || typ === 'Beides') && kundenIds.filter(Boolean).length === 0) {
    empfaengerMap['__guard_error__' + i] = {
      _guard_error: true,
      _error_reason: 'Typ="' + typ + '" aber property_kunden ist leer',
      titel: titel,
      notionPageId: props.id || ''
    };
    continue;
  }

  // --- Individuelle Kunden eintragen ---
  if (typ === 'Individuell' || typ === 'Beides') {
    for (var j = 0; j < kundenIds.length; j++) {
      var kId = kundenIds[j];
      if (!kId) continue;
      if (!empfaengerMap[kId]) {
        empfaengerMap[kId] = { empfaengerPageId: kId, empfaengerTyp: 'individuell', termine: [] };
      }
      empfaengerMap[kId].termine.push(termin);
    }
  }

  // --- NEU: Gruppen eintragen ---
  if (typ === 'Gruppe' || typ === 'Beides') {
    for (var k = 0; k < gruppenIds.length; k++) {
      var gId = gruppenIds[k];
      if (!gId) continue;
      if (!empfaengerMap[gId]) {
        empfaengerMap[gId] = { empfaengerPageId: gId, empfaengerTyp: 'gruppe', termine: [] };
      }
      empfaengerMap[gId].termine.push(termin);
    }
  }
}

// --- Ergebnis aufbauen und Termine sortieren ---
var result = [];
var keys = Object.keys(empfaengerMap);
for (var ki = 0; ki < keys.length; ki++) {
  var entry = empfaengerMap[keys[ki]];
  // Guard-Fehler direkt durchreichen
  if (entry._guard_error) {
    result.push({ json: entry });
    continue;
  }
  entry.termine.sort(function(a, b) {
    return a.datumIso < b.datumIso ? -1 : a.datumIso > b.datumIso ? 1 : 0;
  });
  result.push({ json: entry });
}
return result;
