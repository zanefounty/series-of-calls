#!/usr/bin/env node
// Builds the deployable site into _site/ (or $OUT) for GitHub Pages: copies the static files in site/,
// assembles the game page from src/ into one index.html, and stamps the version (from package.json) and
// the build date into the files that carry them. The output is plain static files and nothing else,
// because GitHub Pages is where the game lives (docs/adr/0001-github-pages-only.md).
//
//   npm run build                                   VERSION, BUILD_DATE and OUT can be set in the environment
//   REQUIRE_NOTES=1 npm run build                   fail when CHANGELOG.md has no bullets for this version
const fs = require('node:fs');
const path = require('node:path');
const { releaseNotes } = require('./release-notes');
const { shipped, ROOT } = require('./lib/page');

function build(options={}) {
const VERSION = options.version || process.env.VERSION || require(path.join(ROOT, 'package.json')).version;
const BUILD_DATE = options.date || process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const OUT = path.resolve(ROOT, options.out || process.env.OUT || '_site');
const die = (msg) => { throw new Error(msg); };

if (!/^[0-9]+\.[0-9]+\.[0-9]+([-.+][0-9A-Za-z.-]+)?$/.test(VERSION)) die(`VERSION '${VERSION}' is not a semantic version`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(BUILD_DATE)) die(`BUILD_DATE '${BUILD_DATE}' is not YYYY-MM-DD`);
validateOutputPath(OUT, ROOT);

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'site'), OUT, { recursive: true });
if (fs.existsSync(path.join(OUT, 'index.html'))) die('site/index.html must not exist: the page is assembled from src/');
// Redistributed source and browser bundles retain the upstream licence and attribution.
for (const name of ['LICENSE','NOTICE','THIRD_PARTY_NOTICES.md']) {
  const source = path.join(ROOT, name);
  if (!fs.existsSync(source)) die(`Required distribution notice missing: ${name}`);
  fs.copyFileSync(source, path.join(OUT, name));
}

// The page and the translations ship with labels shrunk to short ids (docs/adr/0003-translations-by-label.md).
const D = require('./lib/dict');
const { html: page0, dicts } = shipped(Object.fromEntries(D.langs().map((l) => [l, D.read(l).dict])));
fs.writeFileSync(path.join(OUT, 'index.html'), page0);
for (const [lang, dict] of Object.entries(dicts)) fs.writeFileSync(path.join(OUT, 'i18n', `${lang}.js`), D.format(lang, '', dict));

for (const f of ['index.html', 'sitemap.xml', 'llms.txt', 'sw.js']) {
  const p = path.join(OUT, f);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replaceAll('__VERSION__', VERSION).replaceAll('__BUILD_DATE__', BUILD_DATE));
}

// Release notes for this version, baked into the page ("What's new") and published as version.json so
// open games can spot a newer release.
const notes = releaseNotes(VERSION);
if ((options.requireNotes || process.env.REQUIRE_NOTES === '1') && notes === '[]') die(`CHANGELOG.md has no '## [${VERSION}]' section with bullets (still under [Unreleased]?)`);
const page = path.join(OUT, 'index.html'), PH = '/*__RELEASE_NOTES__*/[]', html = fs.readFileSync(page, 'utf8');
if (!html.includes(PH)) die('release-notes placeholder missing from the page');
// Function replacer: no $& / $$ expansion. Escape "<" so a note can never close the <script>.
// A release can also open with a story (prose before its first bullet), shown in full in "What's new".
const story = releaseNotes(VERSION, true), PS = '/*__RELEASE_STORY__*/[]';
if (!html.includes(PS)) die('release-story placeholder missing from the page');
fs.writeFileSync(page, html.replace(PH, () => notes.replace(/</g, '\\u003c')).replace(PS, () => story.replace(/</g, '\\u003c')));
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ version: VERSION, date: BUILD_DATE, notes: JSON.parse(notes), story: JSON.parse(story) }, null, 2) + '\n');

// Nothing may ship half-stamped.
const left = [];
const scan = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) scan(p);
  else if (/__VERSION__|__BUILD_DATE__/.test(fs.readFileSync(p, 'latin1'))) left.push(path.relative(OUT, p));
} };
scan(OUT);
if (left.length) die(`unreplaced placeholders left in ${left.join(', ')}`);
return {version:VERSION,date:BUILD_DATE,out:OUT};
}
// Validate both the spelled path and its filesystem-resolved destination before
// build() removes anything. Existing symlinks in an ancestor are resolved so
// aliases into source inputs cannot bypass the repository-boundary checks.
function validateOutputPath(output, root = ROOT) {
  const out = path.resolve(output);
  const repo = fs.realpathSync(root);
  const actual = canonicalPath(out);
  const intendedOutput = path.join(repo, '_site');
  const isWithin = (base, candidate) => {
    const relative = path.relative(base, candidate);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  };
  const actualIsAllowedSite = actual === intendedOutput && out === path.join(path.resolve(root), '_site');

  // An output path that contains the repository is destructive too (for
  // example, OUT=/workspace), even when OUT itself is not one of its inputs.
  if (isWithin(actual, repo)) throw new Error(`refusing to build into ${output}: output contains repository ${repo}`);
  if (isWithin(repo, actual) && !actualIsAllowedSite) {
    throw new Error(`refusing to build into protected repository path ${output}`);
  }
  // Do not let an alias outside the repository resolve onto the permitted
  // output directory either; _site is allowed only by its canonical path.
  if (actual === intendedOutput && !actualIsAllowedSite) {
    throw new Error(`refusing symlink alias for build output ${output}`);
  }

  // Removing an output symlink is ambiguous across platforms and can make the
  // following copy follow a different destination than the validated one.
  try {
    if (fs.lstatSync(out).isSymbolicLink()) throw new Error(`refusing symlink build output ${output}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return actual;
}

function canonicalPath(target) {
  let current = path.resolve(target);
  const tail = [];
  while (true) {
    try {
      fs.lstatSync(current);
      return path.resolve(fs.realpathSync(current), ...tail.reverse());
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      tail.push(path.basename(current));
      current = parent;
    }
  }
}

module.exports={build, validateOutputPath};
if(require.main===module){try{const r=build();console.log(`Built Series of Calls ${r.version} (${r.date}) into ${path.relative(ROOT,r.out)}/`);}catch(error){console.error(error.message);process.exitCode=1;}}
