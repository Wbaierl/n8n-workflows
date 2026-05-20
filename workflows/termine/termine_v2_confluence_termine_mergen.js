// ============================================================
// Code: Confluence + Termine mergen (NEU)
// Läuft nach: Confluence: Seite holen
// Zweck: Kombiniert die Confluence-Seitenantwort mit termine[]
//        aus dem jeweiligen Pfad-Vorgänger.
//
// WARUM: HTTP-Request ersetzt $json komplett.
//        Code: Tabelle aufbauen kann damit $json.termine lesen
//        ohne auf Loop- oder Cross-Branch-Referenzen angewiesen zu sein.
//
// Pfad a)  Direkte Kunden      → Set: Kundendaten
// Pfad b)  Aktive Mitglieder   → Code: ActiveProject filtern
// Pfad c)  Gruppen-Space       → Code: Gruppen-PageId setzen
// ============================================================

var conflPage = $json; // Confluence GET-Antwort

var termine = [];

// Pfad a: Direkte Kunden
try {
  var t1 = $('Set: Kundendaten').item.json.termine;
  if (Array.isArray(t1) && t1.length > 0) termine = t1;
} catch(e) {}

// Pfad c: Gruppen-Space
if (termine.length === 0) {
  try {
    var t2 = $('Code: Gruppen-PageId setzen').item.json.termine;
    if (Array.isArray(t2) && t2.length > 0) termine = t2;
  } catch(e) {}
}

// Pfad b: Aktive Mitglieder
if (termine.length === 0) {
  try {
    var t3 = $('Code: ActiveProject filtern').item.json.termine;
    if (Array.isArray(t3) && t3.length > 0) termine = t3;
  } catch(e) {}
}

return {
  json: {
    id:      conflPage.id      || '',
    title:   conflPage.title   || '',
    version: conflPage.version || { number: 1 },
    body:    conflPage.body    || {},
    termine: termine
  }
};
