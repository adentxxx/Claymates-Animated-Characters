// Publishes dist/ to the gh-pages branch (GitHub Pages serves it as is).
// Usage: npm run deploy
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin').toString().trim();

if (!existsSync('dist/index.html')) throw new Error('dist/ is empty — run "vite build" first');
writeFileSync('dist/.nojekyll', ''); // serve files as they are, no Jekyll processing
rmSync('dist/.git', { recursive: true, force: true });
sh('git init -q -b gh-pages', 'dist');
sh('git add -A', 'dist');
sh('git commit -q -m "Deploy"', 'dist');
sh(`git push -f -q ${remote} gh-pages`, 'dist');
rmSync('dist/.git', { recursive: true, force: true });
console.log('Deployed to gh-pages');
