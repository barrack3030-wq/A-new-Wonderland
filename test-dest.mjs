import fs from 'fs';
import path from 'path';

// Just inspect the Astro project structure or content config
const configPath = path.join(process.cwd(), 'src/content/config.ts');
console.log(fs.readFileSync(configPath, 'utf8'));
