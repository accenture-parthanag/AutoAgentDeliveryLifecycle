const r = require('../server/routes/projects');
console.log('Registered routes on projects router:');
(r.stack || []).forEach((layer) => {
  if (!layer.route) return;
  const methods = Object.keys(layer.route.methods || {}).join(',').toUpperCase();
  console.log(`  ${methods.padEnd(10)} /api/projects${layer.route.path}`);
});
