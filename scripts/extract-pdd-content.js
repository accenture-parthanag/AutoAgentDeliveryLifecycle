/* Extract plain text + simple HTML from the sample DOCX so we can study its structure. */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const SRC = process.argv[2] || 'C:\\Users\\nitin.varshneya\\Downloads\\PDD_Graphic Tracker Autonumbering_v1.2_latest.docx';
const OUT_DIR = path.join(__dirname, '..', 'tmp-pdd-analysis');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const buf = fs.readFileSync(SRC);
  const text = await mammoth.extractRawText({ buffer: buf });
  fs.writeFileSync(path.join(OUT_DIR, 'pdd_raw.txt'), text.value, 'utf-8');

  const html = await mammoth.convertToHtml({ buffer: buf });
  fs.writeFileSync(path.join(OUT_DIR, 'pdd.html'), html.value, 'utf-8');

  console.log(`✓ raw text: ${text.value.length} chars -> tmp-pdd-analysis/pdd_raw.txt`);
  console.log(`✓ html: ${html.value.length} chars -> tmp-pdd-analysis/pdd.html`);
  if (text.messages?.length) console.log('Messages:', text.messages.slice(0, 5));
})().catch(e => { console.error(e); process.exit(1); });
