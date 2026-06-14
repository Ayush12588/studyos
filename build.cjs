#!/usr/bin/env node
/**
 * StudyOS Build Script - Production-grade minification
 * Uses npx for reliable binary resolution across all environments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = 'dist';

try {
  // 1. Clean dist directory
  console.log('🧹 Cleaning dist/...');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  console.log('✓ dist/ ready\n');

  // 2. Minify CSS using npx
  console.log('🎨 Minifying CSS...');
  const cssStart = fs.statSync('styles.css').size;
  execSync('npx clean-css-cli -o dist/styles.css styles.css', { stdio: 'inherit' });
  const cssEnd = fs.statSync('dist/styles.css').size;
  console.log(`✓ CSS: ${cssStart} → ${cssEnd} bytes (${Math.round(100 * cssEnd / cssStart)}%)\n`);

  // 3. Minify JavaScript using npx
  console.log('📦 Minifying JavaScript...');
  const jsStart = fs.statSync('app.js').size;
  execSync('npx terser app.js -o dist/app.js -c -m', { stdio: 'inherit' });
  const jsEnd = fs.statSync('dist/app.js').size;
  console.log(`✓ JS: ${jsStart} → ${jsEnd} bytes (${Math.round(100 * jsEnd / jsStart)}%)\n`);

  // 4. Copy all static files except those already processed or excluded
  console.log('Copying static assets...');
  const EXCLUDE = new Set([
    'app.js', 'styles.css',       // already minified above
    'build.cjs', 'package.json', 'package-lock.json',
    'vercel.json', '.gitignore', 'README.md',
    'node_modules', '.git', '.vercel', 'dist', 'api',
  ]);

  fs.readdirSync('.').forEach(entry => {
    if (EXCLUDE.has(entry)) return;
    if (entry.startsWith('.')) return; // skip dotfiles/dirs
    const srcPath = entry;
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.cpSync(srcPath, path.join(distDir, entry), { recursive: true });
      console.log(`  - ${entry}/ (directory)`);
    } else if (entry.endsWith('.js') || entry.endsWith('.json') || entry.endsWith('.html')) {
      fs.copyFileSync(srcPath, path.join(distDir, entry));
      console.log(`  - ${entry}`);
    }
  });

  // 6. Verify and summarize
  const distFiles = fs.readdirSync(distDir);
  console.log('✨ Build complete!');
  console.log(`📊 ${distFiles.length} items in dist/`);
  console.log(`📈 Total savings: ${Math.round((cssStart + jsStart - cssEnd - jsEnd) / 1024)} KB\n`);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
