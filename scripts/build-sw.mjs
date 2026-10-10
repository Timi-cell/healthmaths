import { readFileSync, writeFileSync } from 'node:fs';
const version = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 10);
writeFileSync('public/sw.js', readFileSync('sw/sw.template.js', 'utf8').replace('__VERSION__', version));
console.log('sw.js version', version);
