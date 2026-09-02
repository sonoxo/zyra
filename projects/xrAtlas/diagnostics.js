const os = require('node:os');
const { execFileSync } = require('node:child_process');

function cmd(name, args = []) {
  try { return execFileSync(name, args, { encoding: 'utf8' }).trim(); }
  catch { return 'unavailable'; }
}

const report = {
  app: 'xrAtlas',
  version: '1.1.0',
  platform: process.platform,
  node: process.version,
  nodeArch: process.arch,
  machineArch: cmd('uname', ['-m']),
  cpu: os.cpus()[0]?.model || 'unknown',
  logicalCores: os.cpus().length,
  memoryGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1),
  macOS: process.platform === 'darwin' ? cmd('sw_vers', ['-productVersion']) : 'n/a',
  appleSiliconReady: process.platform === 'darwin' && process.arch === 'arm64'
};
console.log(JSON.stringify(report, null, 2));
