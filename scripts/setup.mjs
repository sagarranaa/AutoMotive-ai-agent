import { copyFileSync, existsSync } from 'node:fs';
if (!existsSync('.env')) { copyFileSync('.env.example', '.env'); console.log('Created .env with local demo defaults.'); }
else console.log('Keeping existing .env.');
console.log('Next: npm install, then npm run dev. Node 22.13+ required.');
