const fs = require('fs');
const mammoth = require('mammoth');

(async () => {
  const path = process.argv[2];
  const buf = fs.readFileSync(path);
  const { value: text, messages } = await mammoth.extractRawText({ buffer: buf });
  console.log(`Total chars: ${text.length}`);
  // Look for the appended sections
  const annexAIdx = text.indexOf('Annexure A');
  const annexBIdx = text.indexOf('Annexure B');
  console.log(`Annexure A position: ${annexAIdx}`);
  console.log(`Annexure B position: ${annexBIdx}`);
  if (annexAIdx > -1) {
    console.log('\n--- Last 3500 chars (appended content) ---');
    console.log(text.substring(annexAIdx, annexAIdx + 3500));
  }
  if (messages?.length) console.log('\nMessages:', messages.slice(0, 3));
})();
