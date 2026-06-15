# Email_Analyse – Rechnungs-Archivierung (Outlook → OneDrive)

n8n-Workflow, der eingehende E-Mails mit Rechnungs-PDF automatisch auf OneDrive
ablegt, die Mail als gelesen markiert, in einen Ordner verschiebt und eine
Benachrichtigung verschickt.

Datei: `Email_Analyse.json` · Status im Export: **aktiv**

---

## Ablauf

```
Microsoft Outlook Trigger  (Postfach-Ordner, ungelesen, Poll: jede Minute)
        ├─────────────▶ OneDrive: Ordner auflösen  (ID von …/Rechnungen per Pfad)
        ↓
Get many attachments       (alle Anhänge der getriggerten Mail)
        ↓
If  ── PDF & > 10 KB? ──────── nein ─▶ Ende (Mail bleibt ungelesen/unverändert)
        ↓ ja
Download an attachment     (PDF als Binary 'data')
        ↓
If1 ── "Rechnung"/"Invoice" in Betreff, Text ODER Dateiname? ── nein ─▶ Ende
        ↓ ja
Upload a file              (→ OneDrive-Ordner …/Rechnungen, per Pfad aufgelöst)
        ↓
Code in JavaScript         (Durchreiche / messageId)
        ↓
Update a message           (Mail als gelesen markieren)
        ↓
Move a message             (Mail in Zielordner verschieben)
        ↓
Send a message             (HTML-Benachrichtigung an wolfgang.baierl@…)
```

---

## Knoten im Detail

| # | Knoten | Typ | Funktion |
|---|---|---|---|
| 1 | Microsoft Outlook Trigger | Outlook Trigger | Pollt jede Minute einen festen Postfach-Ordner, nur **ungelesene** Nachrichten |
| – | OneDrive: Ordner auflösen | HTTP (Graph) | Parallel ab Trigger: ermittelt die ID des Zielordners `…/Rechnungen` per Pfad |
| 2 | Get many attachments | Outlook | Holt alle Anhänge (`messageAttachment / getAll`) der getriggerten Mail |
| 3 | If | If | Filter: `contentType` enthält `application/pdf` **und** `size > 10000` Bytes |
| 4 | Download an attachment | Outlook | Lädt den Anhang als Binary `data` herunter |
| 5 | If1 | If | „rechnung"/„invoice" (case-insensitive) in **Betreff, E-Mail-Text oder Anhang-Dateiname** |
| 6 | Upload a file | OneDrive | Lädt die Datei in den aufgelösten OneDrive-Ordner `…/Rechnungen` hoch |
| 7 | Code in JavaScript | Code | Durchreiche der Items (liest `messageId`) |
| 8 | Update a message | Outlook | Setzt die Mail auf **gelesen** (`isRead: true`) |
| 9 | Move a message | Outlook | Verschiebt die Mail in einen festen Zielordner |
| 10 | Send a message | Outlook | HTML-Benachrichtigung „📄 Neue Rechnung eingegangen" mit Betreff/Absender/Datum |

### Filterlogik
- **If (Knoten 3):** Nur echte PDF-Anhänge ab 10 KB werden weiterverarbeitet –
  kleine Inline-Bilder oder Signaturgrafiken fallen raus.
- **If1 (Knoten 5):** Zusätzlich muss „Rechnung" oder „Invoice" (groß/klein)
  in **Betreff, E-Mail-Text (`bodyPreview`/`body.content`) oder
  Anhang-Dateiname** vorkommen. Trifft eines zu, geht es weiter.
- Die **Nein-Zweige** beider IF-Knoten sind nicht verbunden → passt eine Mail
  nicht, bleibt sie unangetastet (ungelesen, nicht verschoben).

### OneDrive-Dateiname
```
{{ yyyy-MM }}_{{ Absender-E-Mail }}_{{ Anhang-Dateiname }}
```
z. B. `2026-06_lieferant@example.com_Rechnung_4711.pdf`

---

## Konfiguration / Umgebungsabhängige Werte

Diese Werte sind fest im Export hinterlegt und müssen beim Re-Import bzw. in
einer anderen Umgebung angepasst werden:

| Wert | Knoten | Hinweis |
|---|---|---|
| Outlook-Quellordner-ID (`foldersToInclude`) | Trigger | Postfach-Ordner, der überwacht wird |
| Outlook-Zielordner-ID (`folderId`) | Move a message | Zielordner für verarbeitete Rechnungen |
| OneDrive-Zielordner (Pfad) | OneDrive: Ordner auflösen | `BLBoardSolutionsGmbH/Rechnungen` im persönlichen OneDrive – per Graph zur ID aufgelöst |
| Empfänger der Benachrichtigung | Send a message | aktuell `wolfgang.baierl@blboardsolutions.de` |

> **OneDrive vs. SharePoint:** Der angegebene Link
> `…-my.sharepoint.com/personal/wolfgang_baierl_blboardsolutions_de/Documents/…`
> ist das **persönliche OneDrive for Business** von Wolfgang (nicht eine
> geteilte Team-SharePoint-Bibliothek – die hätte die Form
> `…sharepoint.com/sites/<Site>/…`). Deshalb löst der Knoten
> „OneDrive: Ordner auflösen" den Pfad über
> `GET /me/drive/root:/BLBoardSolutionsGmbH/Rechnungen` auf und der bestehende
> OneDrive-Knoten lädt dorthin hoch. **Wäre** es doch eine Team-Bibliothek,
> müsste auf `GET /sites/{site}/drive/root:/…` bzw. den SharePoint-Knoten
> umgestellt werden – dann kurz Bescheid geben.

### Credentials
- **Microsoft Outlook OAuth2** (`microsoftOutlookOAuth2Api`) – Knoten 1,2,4,8,9,10
- **Microsoft OneDrive OAuth2** (`microsoftOneDriveOAuth2Api`) – Knoten 6

Beim Import in eine andere n8n-Instanz die Credentials neu zuweisen.

---

## Hinweise / mögliche Erweiterungen

- Der Code-Node (7) ist aktuell nur eine Durchreiche – Platz für künftige Logik
  (z. B. Metadaten extrahieren, in Buchhaltung/Notion eintragen).
- Mehrere PDF-Anhänge in einer Mail werden je als eigenes Item verarbeitet;
  Markieren/Verschieben der Mail läuft dann mehrfach auf dieselbe `messageId`
  (idempotent, aber die Benachrichtigung kann mehrfach kommen).
- Der Name „Email_Analyse" ist historisch; funktional handelt es sich um eine
  Rechnungs-Archivierung.
