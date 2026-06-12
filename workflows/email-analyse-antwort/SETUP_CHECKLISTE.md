# Setup-Checkliste: Email Analyse & Antwort-Entwurf

## 0. Notion-Datenbank "InfoMails" anlegen (einmalig)

1. In Notion eine neue Datenbank anlegen, Name: **InfoMails**
2. Folgende Properties hinzufügen:

| Property-Name | Typ | Werte |
|---------------|-----|-------|
| `Eintrag` | Title | Email-Adresse oder Domain (z.B. `news@example.de` oder `@newsletter.de`) |
| `Typ` | Select | `Email`, `Domain` |
| `Absender-Name` | Rich Text | – |
| `Betreff` | Rich Text | – |
| `Hinzugefügt` | Date | – |
| `Notiz` | Rich Text | optionale manuelle Notiz |

3. Die **Datenbank-ID** aus der Notion-URL kopieren:  
   `https://notion.so/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?v=...`  
   → Die 32-stellige ID ist der erste Teil nach `notion.so/`
4. In **beiden** Workflows `INFOMAIL_DB_ID` ersetzen:
   - `email_analyse_antwort_v1.json` → Node `Notion: InfoMail prüfen`
   - `infomail_erfassen_v1.json` → Nodes `Notion: Bereits erfasst?` und `Notion: Eintrag anlegen`

> **Domain-Blocking manuell:** Trage `@newsletter.de` mit Typ `Domain` direkt in Notion ein – der Workflow blockiert dann automatisch alle Absender dieser Domain.

---

## 0b. Outlook-Kategorie "InfoMail" einrichten (einmalig)

1. In Outlook: **Rechtsklick auf eine Email → Kategorisieren → Alle Kategorien verwalten**
2. Neue Kategorie erstellen: Name **exakt** `InfoMail` (Groß-/Kleinschreibung beachten)
3. Farbe nach Wahl (empfohlen: Rot oder Orange)

**Verwendung:** Email empfangen → Rechtsklick → Kategorisieren → `InfoMail`  
→ Spätestens nach 5 Minuten ist der Absender in Notion und wird in Zukunft gefiltert.

---

## 0c. InfoMail-Erfassen-Workflow importieren

In n8n: **Settings → Import from File** → `infomail_erfassen_v1.json`  
Aktivieren nach Setup der Notion-DB-ID.

---

## 1. Workflow importieren

In n8n: **Settings → Import from File** → `email_analyse_antwort_v1.json`

---

## 2. Credentials prüfen (bereits vorbelegt)

| Node | Credential | Status |
|------|-----------|--------|
| Outlook Trigger, Entwurf, Emails | `Microsoft Outlook account` (ID: yGyJLxRrxa4zgBmg) | ✅ aus bestehendem Workflow übernommen |
| HubSpot Suche | `HubSpot account 4` (ID: zGX2k1SKubP15OOY) | ✅ aus bestehendem Workflow übernommen |
| Claude Analyse + Antwort | `Anthropic account 6` (ID: iCMaqkiVfMfgXWXJ) | ✅ aus LinkedIn-Workflow übernommen |

> Falls ein Credential nicht gefunden wird: Node öffnen → Credential-Dropdown → passendes auswählen.

---

## 3. PFLICHT: Schreibstil im Claude Antwort Node eintragen

**Node öffnen:** `Claude Antwort` → Feld `JSON Body` → Bereich `system`

Die folgenden **drei Platzhalter** ersetzen:

### Platzhalter 1 – Stil-Beschreibung
```
=== SCHREIBSTIL-PROFIL DES NUTZERS ===
[HIER EINSETZEN – Beschreibe deinen Stil, z.B.:]
Direkt und auf den Punkt, keine langen Einleitungen.
...
```
→ Ersetze diesen Block mit deiner eigenen Stil-Beschreibung.

**Beispiel:**
```
=== SCHREIBSTIL-PROFIL DES NUTZERS ===
Direkt, lösungsorientiert und professionell.
Verwendet "Sie"-Anrede mit warmem, persönlichem Ton.
Kurze, prägnante Sätze. Kein Passiv.
Struktur: Problem → Lösung → nächster Schritt.
Signatur: "Beste Grüße, Wolfgang Baierl"
```

### Platzhalter 2 – Echte Beispiel-Emails
```
=== STIL-BEISPIELE (echte Emails des Nutzers) ===
[BEISPIEL 1 – HIER EINSETZEN]
[BEISPIEL 2 – HIER EINSETZEN]
[BEISPIEL 3 – HIER EINSETZEN]
```
→ Kopiere 3 kurze echte Antwort-Emails von dir (ohne vertrauliche Infos).  
→ Je kürzer und klarer, desto besser (50–100 Wörter pro Beispiel).

---

## 4. Outlook Trigger: Polling-Intervall anpassen (optional)

**Node:** `Outlook Trigger` → `Poll Times`  
Standard: jede Minute. Empfehlung: alle 5 Minuten für Produktion.

---

## 5. Fehler-Workflow verknüpft

Der bestehende Error-Workflow (`HSomkpfv9ZqJU9Jn`) ist bereits als globale Fehlerbehandlung eingetragen. Bei API-Fehlern (HubSpot, Claude, Outlook) erhältst du automatisch eine Email an `wolfgang.baierl@blboardsolutions.de`.

---

## 6. Outlook Draft-Erstellung testen

Beim ersten Test: Einen bekannten Absender (in HubSpot vorhanden) eine Test-Email senden.  
Prüfen ob:
- [ ] Analyse-JSON korrekt zurückkommt (Execution in n8n ansehen)
- [ ] Draft in Outlook erscheint
- [ ] Benachrichtigungs-Email ankommt

**Falls "Entwurf erstellen" fehlschlägt:** Im Node `Outlook Entwurf` die Parameter  
`resource: draft` und `operation: create` manuell im n8n UI setzen (Node-Parameter-Ansicht).

---

## 7. Aktivieren

Workflow oben rechts auf **Active** schalten.

---

## Workflow-Übersicht

```
Outlook Trigger (jede Minute)
  ↓
Email normalisieren (Set: from, subject, body, id)
  ↓
HubSpot Suche (nach Absender-Email)
  ↓
Kunde bekannt? (IF: HubSpot-ID vorhanden?)
  ├─ NEIN → Unbekannter Absender Email → STOP
  └─ JA  → Daten zusammenführen (email + HubSpot merged)
              ↓
            Claude Analyse (HTTP → Anthropic API)
            → Gibt JSON zurück: Tonalität, Stimmung, Eskalation, etc.
              ↓
            Analyse parsen (Code Node: JSON extrahieren)
              ↓
            Eskalation prüfen? (IF: eskalation === true?)
              ├─ JA  → Eskalation Email → STOP
              └─ NEIN → Claude Antwort (HTTP → Anthropic API)
                            ↓
                          Outlook Entwurf erstellen
                            ↓
                          Benachrichtigung senden
```

---

## Kosten pro Email (Schätzung)

| API-Call | Tokens (ca.) | Kosten (ca.) |
|----------|-------------|-------------|
| Claude Analyse | ~800 Input + 400 Output | ~$0.004 |
| Claude Antwort | ~1.200 Input + 800 Output | ~$0.008 |
| **Total** | | **~$0.012 pro Email** |

Bei 100 Emails/Monat ≈ $1.20/Monat.
