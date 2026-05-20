// ============================================================
// Flatten: Eintraege x Empfaenger (erweitert)
// Ersetzt: "Flatten: Eintraege x Kunden"
// Neu: liest property_typ + property_db_gruppen,
//      routet auf empfaengerPageId / empfaengerTyp
// ============================================================

const items = $input.all();
const flat = [];

for (const item of items) {
  const notionPageId = item.json.id;
  const props = item.json;

  const confBlogIDs = props.property_confluence_blog_i_ds
    || props.property_confluenceblogids
    || props.property_confluence_blog_ids
    || '';

  const typ = props.property_typ || 'Individuell';

  const dbKunden  = props.property_db_kunden  || [];
  const kundenIds = Array.isArray(dbKunden)  ? dbKunden  : [dbKunden];

  const dbGruppen  = props.property_db_gruppen || [];
  const gruppenIds = Array.isArray(dbGruppen) ? dbGruppen : [dbGruppen];

  if ((typ === 'Gruppe' || typ === 'Beides') && gruppenIds.filter(Boolean).length === 0) continue;
  if ((typ === 'Individuell' || typ === 'Beides') && kundenIds.filter(Boolean).length === 0) continue;

  if (typ === 'Individuell' || typ === 'Beides') {
    for (const kundePageId of kundenIds) {
      if (!kundePageId) continue;
      flat.push({
        json: {
          notionPageId,
          empfaengerPageId: kundePageId,
          empfaengerTyp: 'individuell',
          confBlogIDs
        }
      });
    }
  }

  if (typ === 'Gruppe' || typ === 'Beides') {
    for (const gruppePageId of gruppenIds) {
      if (!gruppePageId) continue;
      flat.push({
        json: {
          notionPageId,
          empfaengerPageId: gruppePageId,
          empfaengerTyp: 'gruppe',
          confBlogIDs
        }
      });
    }
  }
}

return flat;
