// ============================================================
// Guard-Node – Termine Workflow
// Neuer Node direkt nach "Code: Nach Empfaenger aufteilen"
// Typ: Code-Node, Mode: runOnceForAllItems
// Identisch zur Logik aus Workflow A
// ============================================================

var items = $input.all();
var errors = items.filter(function(i) { return i.json._guard_error === true; });

if (errors.length > 0) {
  var errorDetails = errors.map(function(e) {
    return '• "' + e.json.titel + '" (' + e.json.notionPageId + '): ' + e.json._error_reason;
  }).join('\n');

  return errors.map(function(e) {
    return {
      json: {
        _guard_triggered: true,
        notionPageId: e.json.notionPageId,
        titel: e.json.titel,
        errorReason: e.json._error_reason,
        errorSummary: errorDetails,
        timestamp: new Date().toISOString()
      }
    };
  });
}

// Kein Fehler → valide Items durchleiten
return items.filter(function(i) { return !i.json._guard_error; });
