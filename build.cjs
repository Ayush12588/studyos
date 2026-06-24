/**
 * build.cjs — StudyOS build script
 * Runs on every Vercel deploy via "npm run build"
 *
 * What it does:
 *   1. Bundles db.js + @supabase/supabase-js into a single IIFE file
 *      (eliminates the 8-request CDN waterfall that cost 1.2-2.1s)
 *   2. Minifies app.js, migrate.js, tour.js, analytics.js with Terser
 *   3. Minifies styles.css with CleanCSS
 *   4. Copies app.html, sw.js, manifest.json, icons unchanged
 *   All output goes to /dist — Vercel serves from there.
 */

const esbuild   = require('esbuild');
const { minify } = require('terser');
const CleanCSS  = require('clean-css');
const fs        = require('fs');
const path      = require('path');

const OUT = path.join(__dirname, 'dist');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

async function build() {
  console.log('Building StudyOS...\n');

  // 1. Bundle db.js + Supabase SDK → single IIFE
  console.log('Bundling db.js + @supabase/supabase-js...');
  await esbuild.build({
    entryPoints: ['db.js'],
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2020',
    outfile: path.join(OUT, 'db.js'),
  });
  const dbSize = fs.statSync(path.join(OUT, 'db.js')).size;
  console.log(`  ✓ dist/db.js (${(dbSize/1024).toFixed(1)} KB)\n`);

  // 2. Minify JS files with Terser
  const jsFiles = ['app.js', 'migrate.js', 'tour.js', 'analytics.js'];
  for (const file of jsFiles) {
    console.log(`Minifying ${file}...`);
    const src = fs.readFileSync(file, 'utf8');
    const result = await minify(src, {
      compress: { passes: 2, ecma: 2020 },
      mangle: true,
    });
    fs.writeFileSync(path.join(OUT, file), result.code);
    const origKB = (src.length / 1024).toFixed(1);
    const minKB  = (result.code.length / 1024).toFixed(1);
    console.log(`  ✓ dist/${file} (${origKB} KB → ${minKB} KB)\n`);
  }

  // 3. Minify CSS
  console.log('Minifying styles.css...');
  const srcCSS = fs.readFileSync('styles.css', 'utf8');
  const cssResult = new CleanCSS({ level: 2 }).minify(srcCSS);
  if (cssResult.errors.length) throw new Error(cssResult.errors.join('\n'));
  fs.writeFileSync(path.join(OUT, 'styles.css'), cssResult.styles);
  const origKB = (srcCSS.length / 1024).toFixed(1);
  const minKB  = (cssResult.styles.length / 1024).toFixed(1);
  console.log(`  ✓ dist/styles.css (${origKB} KB → ${minKB} KB)\n`);

  // 4. Copy static files unchanged
  const staticFiles = ['index.html','app.html', 'auth.html', 'sw.js', 'manifest.json', 'favicon.ico', 'sitemap.xml', 'robots.txt'];
  for (const file of staticFiles) {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(OUT, file));
      console.log(`  ✓ dist/${file} (copied)`);
    }
  }

  // Copy icons folder if present
  if (fs.existsSync('icons')) {
    fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
    for (const f of fs.readdirSync('icons')) {
      fs.copyFileSync(path.join('icons', f), path.join(OUT, 'icons', f));
    }
    console.log('  ✓ dist/icons/ (copied)');
  }

  // Copy api folder if present (Vercel serverless functions)
  if (fs.existsSync('api')) {
    fs.mkdirSync(path.join(OUT, 'api'), { recursive: true });
    for (const f of fs.readdirSync('api')) {
      fs.copyFileSync(path.join('api', f), path.join(OUT, 'api', f));
    }
    console.log('  ✓ dist/api/ (copied)');
  }

  console.log('\nBuild complete ✓');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});