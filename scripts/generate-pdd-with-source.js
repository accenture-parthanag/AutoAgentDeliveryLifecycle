/* One-off: generate the Approved Final PDD using a caller-supplied source DOCX
 * (used because the stored upload was corrupted by the pre-fix data-URL bug). */
const fs = require('fs');
const path = require('path');
const { generateApprovedPdd } = require('../server/agents/pdd-generator');

(async () => {
  const [projectId, sourceDocx, outPath] = process.argv.slice(2);
  if (!projectId || !sourceDocx || !outPath) {
    console.error('Usage: node scripts/generate-pdd-with-source.js <projectId> <sourceDocxPath> <outPath>');
    process.exit(1);
  }
  if (!fs.existsSync(sourceDocx)) {
    console.error(`Source DOCX not found: ${sourceDocx}`);
    process.exit(1);
  }
  try {
    const { buffer, fileName } = await generateApprovedPdd(projectId, {
      pddFilePath: sourceDocx,
      approval: {
        approvedBy: 'BT Team',
        approvedAt: new Date().toISOString(),
        approvalNotes: 'All BA clarifications addressed. PDD approved for Architecture phase.'
      }
    });
    fs.writeFileSync(outPath, buffer);
    console.log(`✓ Approved PDD written: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    console.log(`  Suggested filename: ${fileName}`);
  } catch (e) {
    console.error('❌ Failed:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
