require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('aadlc');
  
  const project = await db.collection('projects').findOne({});
  const sdd = project.sddDocument;
  
  console.log(`\n📊 SDD JSON Structure:`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Show all top-level keys
  console.log('Top-level keys:');
  Object.keys(sdd).forEach(key => {
    const value = sdd[key];
    const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
    console.log(`  - ${key}: ${type}`);
  });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\nDetailed Structure:\n`);
  console.log(JSON.stringify(sdd, null, 2));
  
  await client.close();
})();
