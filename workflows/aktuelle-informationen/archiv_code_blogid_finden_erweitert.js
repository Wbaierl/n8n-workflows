// ============================================================
// Code: Blog-ID finden (erweitert)
// Space Key aus Kunden- oder Gruppen-Notion-Seite lesen
// Beide Branches (IF: Empfaenger-Typ) laufen in diesen Node
// ============================================================

const spaceKey = $json.property_confluence_space_key || '';

const loopItem      = $('Loop: Ein Paar pro Durchlauf').item.json;
const notionPageId  = loopItem.notionPageId   || '';
const confBlogIDs   = loopItem.confBlogIDs    || '';
const empfaengerTyp = loopItem.empfaengerTyp  || '';

const entries = confBlogIDs
  .split(',')
  .map(e => e.trim())
  .filter(e => e.includes(':'));

const found  = entries.find(e => e.startsWith(spaceKey + ':'));
const blogId = found ? found.split(':').slice(1).join(':') : '';

return {
  json: {
    blogId,
    spaceKey,
    notionPageId,
    confBlogIDs,
    empfaengerTyp
  }
};
