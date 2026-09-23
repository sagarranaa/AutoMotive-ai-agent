import { spawn } from 'node:child_process';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = ['apps/server','apps/web'].map(w => spawn(npm, ['run','dev','-w',w], {stdio:'inherit', shell:process.platform==='win32'}));
let stopping = false;
function stop(code=0) { if(stopping) return; stopping=true; children.forEach(c=>c.kill()); process.exitCode=code; }
process.on('SIGINT',()=>stop()); process.on('SIGTERM',()=>stop());
children.forEach(c=>c.on('exit',code=>stop(code || 0)));
