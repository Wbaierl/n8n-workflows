/**
 * generate-agenda.js
 * BLBoardSolutions GmbH – Agenda Board Meeting Generator
 * Verwendet docxtemplater + agenda_template.docx
 *
 * Installation (einmalig auf dem Server):
 *   cd /opt/scripts && npm install docxtemplater pizzip
 *
 * Aufruf:
 *   node generate-agenda.js --data '<JSON>' --output '/pfad/AGD_Datum_Boardmeeting.docx'
 *
 * JSON-Datenstruktur:
 * {
 *   "termin":           "02.06.2026, 17:00 – 19:00 Uhr",
 *   "ort_name":         "Hotel Reich an der Rems",
 *   "ort_adresse":      "Stuttgarter Str. 75, 73614 Schorndorf",
 *   "mitglieder":       [{ "name": "...", "firma": "...", "web": "...", "ist_erstes": true }],
 *   "gast_name":        "Frank Jung",
 *   "gast_web":         "www.jungvision.de",
 *   "gastvortrag_name": "Dr. Bohnenberger",
 *   "gastvortrag_web":  "bohnenberger.ai",
 *   "tops": [{
 *     "titel":        "Begrüßung & Agenda",
 *     "zeit":         "10min",
 *     "beschreibung": "",
 *     "untertitel":   "",
 *     "sub_items":    []
 *   }],
 *   "themenvorschau":   "",
 *   "naechste_termine": [{ "termin_datum": "Dienstag, 25. Juni 2026", "termin_ort_oder_leer": "Hotel..." }]
 * }
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const TEMPLATE_PATH = path.join(__dirname, 'agenda_template.docx');

async function generateAgenda(data, outputPath) {
  const content = fs.readFileSync(TEMPLATE_PATH, 'binary');
  const zipIn = new PizZip(content);
  const doc = new Docxtemplater(zipIn, {
    paragraphLoop: true,
    linebreaks:    true,
    nullGetter:    () => '',
  });

  doc.render(data);

  // Fix: .dotx-Vorlage erzeugt "template.main+xml" statt "document.main+xml"
  // → Word auf Mac lehnt die Datei sonst ab
  const zipOut = doc.getZip();
  const ctFile = '[Content_Types].xml';
  if (zipOut.files[ctFile]) {
    const ct = zipOut.files[ctFile].asText();
    zipOut.file(ctFile, ct.replace(
      'wordprocessingml.template.main+xml',
      'wordprocessingml.document.main+xml'
    ));
  }

  const buf = zipOut.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, buf);
  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);
  let dataArg = null, outputArg = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data'   && args[i+1]) dataArg   = args[++i];
    if (args[i] === '--output' && args[i+1]) outputArg = args[++i];
  }

  if (!dataArg) { console.error('--data fehlt'); process.exit(1); }

  let data;
  try {
    data = JSON.parse(dataArg);
  } catch(e) {
    console.error('Kein gültiges JSON:', e.message);
    process.exit(1);
  }

  const out = outputArg || path.join(
    __dirname,
    `AGD_${(data.termin||'').replace(/[^0-9]/g,'-').replace(/-+/g,'-')}_Boardmeeting.docx`
  );

  try {
    const result = await generateAgenda(data, out);
    console.log('OK:' + result);
  } catch(e) {
    console.error('Fehler beim Generieren:', e.message);
    if (e.properties && e.properties.errors)
      e.properties.errors.forEach(err => console.error(' -', err.message));
    process.exit(1);
  }
}

main();
