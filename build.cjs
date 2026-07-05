/**
 * build.cjs — BoardOS build script
 * Runs on every Vercel deploy via "npm run build"
 *
 * What it does:
 *   1. Bundles db.js + @supabase/supabase-js into a single IIFE file
 *      (eliminates the 8-request CDN waterfall that cost 1.2-2.1s)
 *   2. Minifies app.js, migrate.js, tour.js, analytics.js with Terser
 *   3. Minifies styles.css with CleanCSS
 *   4. Auto-injects SW cache version derived from all asset hashes —
 *      guarantees stale SW caches are purged on every deploy that
 *      changes any asset. Never bump CACHE_NAME manually again.
 *   5. Copies app.html, sw.js, manifest.json, icons unchanged
 *   All output goes to /dist — Vercel serves from there.
 */

const esbuild   = require('esbuild');
const { minify } = require('terser');
const CleanCSS  = require('clean-css');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');

// Returns first 8 chars of MD5 hash of content
function hashContent(content) {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

// fileMap: { 'app.js': 'app.a3f9c2b1.js', 'styles.css': 'styles.4d2e1f9a.css', ... }
const fileMap = {};

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
  const dbOut = fs.readFileSync(path.join(OUT, 'db.js'));
  const dbHash = hashContent(dbOut);
  const dbHashed = `db.${dbHash}.js`;
  fs.renameSync(path.join(OUT, 'db.js'), path.join(OUT, dbHashed));
  fileMap['db.js'] = dbHashed;
  console.log(`  ✓ dist/${dbHashed} (${(dbOut.length/1024).toFixed(1)} KB)\n`);

  // 2. Minify JS files with Terser
  const jsFiles = ['app.js', 'migrate.js', 'tour.js', 'analytics.js', 'backlog.js', 'notifications.js', 'haptics.js'];
  for (const file of jsFiles) {
    console.log(`Minifying ${file}...`);
    const src = fs.readFileSync(file, 'utf8');
    const result = await minify(src, {
      compress: { passes: 2, ecma: 2020 },
      mangle: {
        reserved: [
          // Backlog methods called from HTML onchange/onclick attributes
          'onSubjectChange', 'openAddModal', 'submitAdd', 'markComplete',
          'openDismissModal', 'confirmDismiss', 'renderPage',
          // App methods called from HTML
          'App', 'Backlog', 'DB', 'Notifications',
          // Notifications methods called globally
          '_Notifications_click', '_Notifications_markAllRead',
        ],
      },
    });
    const jsHash = hashContent(result.code);
    const jsHashed = file.replace('.js', `.${jsHash}.js`);
    fs.writeFileSync(path.join(OUT, jsHashed), result.code);
    fileMap[file] = jsHashed;
    const origKB = (src.length / 1024).toFixed(1);
    const minKB  = (result.code.length / 1024).toFixed(1);
    console.log(`  ✓ dist/${jsHashed} (${origKB} KB → ${minKB} KB)\n`);
  }

  // 3. Minify CSS
  console.log('Minifying styles.css...');
  const srcCSS = fs.readFileSync('styles.css', 'utf8');
  const cssResult = new CleanCSS({ level: 2 }).minify(srcCSS);
  if (cssResult.errors.length) throw new Error(cssResult.errors.join('\n'));
  const cssHash = hashContent(cssResult.styles);
  const cssHashed = `styles.${cssHash}.css`;
  fs.writeFileSync(path.join(OUT, cssHashed), cssResult.styles);
  fileMap['styles.css'] = cssHashed;
  const origKB = (srcCSS.length / 1024).toFixed(1);
  const minKB  = (cssResult.styles.length / 1024).toFixed(1);
  console.log(`  ✓ dist/${cssHashed} (${origKB} KB → ${minKB} KB)\n`);

  // 4. Auto-inject SW cache version derived from all asset hashes.
  //    Every deploy that changes any asset produces a new CACHE_NAME,
  //    which triggers the SW activate handler to purge all old caches.
  //    Never bump CACHE_NAME in sw.js manually again.
  console.log('Injecting SW cache version...');
  const swVersion = hashContent(JSON.stringify(fileMap));
  const swCacheName = `boardos-${swVersion}`;
  let swSrc = fs.readFileSync('sw.js', 'utf8');
  const swOriginal = swSrc;
  swSrc = swSrc.replace(
    /const CACHE_NAME = '[^']*'/,
    `const CACHE_NAME = '${swCacheName}'`
  );
  if (swSrc === swOriginal) {
    throw new Error('SW version injection failed — could not find CACHE_NAME pattern in sw.js');
  }
  fs.writeFileSync(path.join(OUT, 'sw.js'), swSrc);
  console.log(`  ✓ dist/sw.js (CACHE_NAME → '${swCacheName}')\n`);

  // 5. Copy static files — HTML files get script/link srcs rewritten to hashed filenames
 const staticFiles = ['index.html', 'app.html', 'auth.html', 'manifest.json', 'favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png', 'sitemap.xml', 'robots.txt'];
  for (const file of staticFiles) {
    if (!fs.existsSync(file)) continue;
    if (file.endsWith('.html')) {
      let html = fs.readFileSync(file, 'utf8');
      // Rewrite script src / link href to hashed filenames.
      // Handles bare refs (app.js) and already-versioned refs (app.js?v=2).
      for (const [orig, hashed] of Object.entries(fileMap)) {
        // Strip any existing ?v=... query string then swap filename
        html = html
          .split(`src="${orig}?`).join(`__SPLIT__SRC__`)
          .split(`href="${orig}?`).join(`__SPLIT__HREF__`)
          .split(`src="${orig}"`).join(`src="${hashed}"`)
          .split(`href="${orig}"`).join(`href="${hashed}"`);
        // Clean up the split markers (drop stale ?v=N entirely)
        html = html
          .replace(/__SPLIT__SRC__[^"]*"/g, `src="${hashed}"`)
          .replace(/__SPLIT__HREF__[^"]*"/g, `href="${hashed}"`);
      }
      fs.writeFileSync(path.join(OUT, file), html);
      console.log(`  ✓ dist/${file} (rewritten with hashed assets)`);
    } else {
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

  // Copy emails folder if present (email templates and utilities)
  if (fs.existsSync('emails')) {
    fs.mkdirSync(path.join(OUT, 'emails'), { recursive: true });

    for (const f of fs.readdirSync('emails')) {
      fs.copyFileSync(
        path.join('emails', f),
        path.join(OUT, 'emails', f)
      );
    }

    console.log('  ✓ dist/emails/ (copied)');
  }

  // Copy features folder if present (SEO feature pages)
  if (fs.existsSync('features')) {
    fs.mkdirSync(path.join(OUT, 'features'), { recursive: true });
    for (const f of fs.readdirSync('features')) {
      fs.copyFileSync(path.join('features', f), path.join(OUT, 'features', f));
    }
    console.log('  ✓ dist/features/ (copied)');
  }

  // Copy assets folder if present (images, screenshots)
  if (fs.existsSync('assets')) {
    fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
    for (const f of fs.readdirSync('assets')) {
      fs.copyFileSync(path.join('assets', f), path.join(OUT, 'assets', f));
    }
    console.log('  ✓ dist/assets/ (copied)');
  }

  // 6. Verify every local script/link reference in the built HTML actually
  //    resolves to a real file in dist/. This is a hard-fail safety net —
  //    it exists because haptics.js was once referenced in app.html but
  //    absent from both the jsFiles and staticFiles lists above, so it
  //    never made it into dist/ and 404'd silently in production for
  //    days before anyone noticed (no vibration feedback anywhere).
  //    A missing local asset should fail the BUILD, not fail silently
  //    in a user's browser months later.
  console.log('Verifying all local asset references resolve...');
  const distHtmlFiles = fs.readdirSync(OUT).filter(f => f.endsWith('.html'));
  const missing = [];
  for (const htmlFile of distHtmlFiles) {
    const html = fs.readFileSync(path.join(OUT, htmlFile), 'utf8');
    // Match src="..." / href="..." pointing at local .js/.css files, then
    // filter out external/absolute URLs and data URIs by checking the
    // actual prefix (not a character class — an earlier version of this
    // regex used [^"http://], which doesn't negate the substring "http://"
    // at all; it negates the individual characters " h t p : /, so any
    // local filename starting with one of those letters — e.g. haptics.js —
    // was silently skipped. That would have let this exact bug pass
    // verification. Match broad, then explicitly filter externals.)
    const refRegex = /(?:src|href)="([^"]+\.(?:js|css))"/g;
    let m;
    while ((m = refRegex.exec(html)) !== null) {
      const ref = m[1];
      if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:')) continue;
      const refPath = path.join(OUT, ref);
      if (!fs.existsSync(refPath)) {
        missing.push(`${htmlFile} references "${ref}" but dist/${ref} does not exist`);
      }
    }
  }
  if (missing.length) {
    console.error('\n✗ Build verification failed — missing local assets:');
    missing.forEach(msg => console.error(`  - ${msg}`));
    throw new Error(`${missing.length} referenced asset(s) missing from dist/. Fix the jsFiles/staticFiles lists in build.cjs.`);
  }
  console.log('  ✓ All local script/link references verified\n');

  console.log('\nBuild complete ✓');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});