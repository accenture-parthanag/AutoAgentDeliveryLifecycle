require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db(process.env.MONGODB_DB || 'aadlc');
  const p = await db.collection('projects').findOne({});
  console.log('Project:', p.name, p._id.toString());
  console.log('Has tddDocument?', !!p.tddDocument);
  if (p.tddDocument) {
    const t = p.tddDocument;
    console.log('summary length      :', (t.summary || '').length);
    console.log('modules             :', (t.modules || []).length);
    console.log('tasks               :', (t.tasks || []).length);
    console.log('openQuestions       :', (t.openQuestions || []).length);
    console.log('testStrategy keys   :', Object.keys(t.testStrategy || {}));
    console.log('\nFirst 2 tasks:');
    (t.tasks || []).slice(0, 2).forEach(tk => {
      console.log(`  - #${tk.id} ${tk.title} | module=${tk.module} | complexity=${tk.complexity} | hours=${tk.estimatedHours}`);
      console.log(`    deps=${(tk.dependencies||[]).join(',')}`);
      console.log(`    pseudocode preview: ${(tk.pseudocode || '').substring(0, 120)}`);
    });
    console.log('\nFull TDD JSON (truncated):');
    console.log(JSON.stringify(t, null, 2).substring(0, 1500));
  }
  await c.close();
})();
