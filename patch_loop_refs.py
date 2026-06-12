import json, re

with open('/Users/wolfgangbaierl/n8n-workflows/workflows/termine/workflow_termine_confluence.json', 'r') as f:
    wf = json.load(f)

fixed = []

for node in wf['nodes']:
    name = node['name']
    if 'jsCode' not in node.get('parameters', {}):
        continue

    # ──────────────────────────────────────────────────────────────
    # Bug 1: Code: Nach Kunden aufteilen – falscher Gruppen-Key
    # ──────────────────────────────────────────────────────────────
    if name == 'Code: Nach Kunden aufteilen':
        old = node['parameters']['jsCode']
        new = old.replace(
            "var gruppenRaw = props.property_gruppen || [];",
            "var gruppenRaw = props.property_db_gruppen || [];"
        )
        if old != new:
            node['parameters']['jsCode'] = new
            fixed.append(f"[Bug 1] {name}: property_gruppen → property_db_gruppen")

    # ──────────────────────────────────────────────────────────────
    # Bug 2: Set: Kundendaten – Loop-Ref für termine + empfaengerPageId
    # ──────────────────────────────────────────────────────────────
    elif name == 'Set: Kundendaten':
        new_code = (
            "var ifItem     = $('IF: Empfaenger-Typ').item.json;\n"
            "var notionData = $json;\n"
            "\n"
            "var confluencePageId = notionData.property_confluence_page_i_d\n"
            "  || notionData.property_confluence_page_id || '';\n"
            "var spaceKey = notionData.property_confluence_space_key || '';\n"
            "var termine  = ifItem.termine || [];\n"
            "\n"
            "return {\n"
            "  json: {\n"
            "    empfaengerPageId: ifItem.empfaengerPageId,\n"
            "    empfaengerTyp:    'individuell',\n"
            "    confluencePageId: confluencePageId,\n"
            "    spaceKey:         spaceKey,\n"
            "    termine:          termine\n"
            "  }\n"
            "};"
        )
        node['parameters']['jsCode'] = new_code
        fixed.append(f"[Bug 2] {name}: Loop-Ref → IF: Empfaenger-Typ")

    # ──────────────────────────────────────────────────────────────
    # Bug 3: Code: Gruppen-Mitglieder auflösen – Loop-Ref
    # ──────────────────────────────────────────────────────────────
    elif name == 'Code: Gruppen-Mitglieder auflösen':
        old = node['parameters']['jsCode']
        new = old.replace(
            "var loopItem = $('Loop: Ein Kunde pro Durchlauf').item.json;",
            "var loopItem = $('IF: Empfaenger-Typ').item.json;"
        )
        if old != new:
            node['parameters']['jsCode'] = new
            fixed.append(f"[Bug 3] {name}: Loop-Ref → IF: Empfaenger-Typ")
        else:
            fixed.append(f"[Bug 3] {name}: KEIN MATCH - prüfen!")

    # ──────────────────────────────────────────────────────────────
    # Bug 4: Code: ActiveProject filtern – Loop-Ref für termine
    # ──────────────────────────────────────────────────────────────
    elif name == 'Code: ActiveProject filtern':
        old = node['parameters']['jsCode']
        new = old.replace(
            "var loopContext = $('Loop: Ein Kunde pro Durchlauf').item.json;\nvar termine     = loopContext.termine || [];",
            "var termine = $('IF: Mitglied-Check').item.json.termine || [];"
        )
        if old != new:
            node['parameters']['jsCode'] = new
            fixed.append(f"[Bug 4] {name}: Loop-Ref → IF: Mitglied-Check")
        else:
            fixed.append(f"[Bug 4] {name}: KEIN MATCH - prüfen!")

for f_ in fixed:
    print(f_)

with open('/Users/wolfgangbaierl/n8n-workflows/workflows/termine/workflow_termine_confluence.json', 'w') as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print("\nWorkflow geschrieben.")
