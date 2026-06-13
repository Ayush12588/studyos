#!/usr/bin/env node
/**
 * StudyOS Build Script
 * Minifies CSS and JS, copies static assets to dist/
 * Cross-platform compatible (Windows, macOS, Linux)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = 'dist';

// Step 1: Clean dist directory
if (fs.existsSync(distDir)) {
  console.log('🧹 Cleaning dist/...');
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
console.log('✓ dist/ ready');

// Step 2: Minify CSS
console.log('🎨 Minifying CSS...');
try {
  execSync('cleancss -o dist/styles.css styles.css', { stdio: 'inherit' });
  const cssSize = fs.statSync('dist/styles.css').size;
  const cssOrigSize = fs.statSync('styles.css').size;
  console.log(`✓ CSS minified: ${cssOrigSize} → ${cssSize} bytes (${Math.round(100 * cssSize / cssOrigSize)}%)`);
} catch (e) {
  console.error('✗ CSS minification failed:', e.message);
  process.exit(1);
}

// Step 3: Minify JavaScript
console.log('📦 Minifying JavaScript...');
try {
  execSync('terser app.js -o dist/app.js -c -m', { stdio: 'inherit' });
  const jsSize = fs.statSync('dist/app.js').size;
  const jsOrigSize = fs.statSync('app.js').size;
  console.log(`✓ JS minified: ${jsOrigSize} → ${jsSize} bytes (${Math.round(100 * jsSize / jsOrigSize)}%)`);
} catch (e) {
  console.error('✗ JS minification failed:', e.message);
  process.exit(1);
}

// Step 4: Copy static files
console.log('📋 Copying static assets...');
const filesToCopy = ['index.html', 'manifest.json'];
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(distDir, file));
    console.log(`  ✓ ${file}`);
  }
});

// Step 5: Copy icons directory
const iconsDir = 'icons';
if (fs.existsSync(iconsDir)) {
  const distIconsDir = path.join(distDir, iconsDir);
  fs.mkdirSync(distIconsDir, { recursive: true });
  fs.readdirSync(iconsDir).forEach(file => {
    fs.copyFileSync(
      path.join(iconsDir, file),
      path.join(distIconsDir, file)
    );
  });
  console.log(`  ✓ icons/ (${fs.readdirSync(iconsDir).length} files)`);
}

// Step 6: Verify dist contents
const distFiles = fs.readdirSync(distDir);
console.log(`\n✨ Build complete! ${distFiles.length} items in dist/`);
console.log('📊 Size Summary:');
const getSize = (file) => {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
};
console.log(`   Original: styles.css (${Math.round(getSize('styles.css')/1024)}KB) + app.js (${Math.round(getSize('app.js')/1024)}KB)`);
console.log(`   Minified: styles.css (${Math.round(getSize('dist/styles.css')/1024)}KB) + app.js (${Math.round(getSize('dist/app.js')/1024)}KB)`);
