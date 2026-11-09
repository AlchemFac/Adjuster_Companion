const { spawnSync } = require('node:child_process');
const path = require('node:path');
for (const suite of ['model', 'workload', 'followups', 'quality', 'checklist', 'library']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, `${suite}.cjs`)], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
