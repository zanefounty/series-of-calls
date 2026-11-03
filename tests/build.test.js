const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, validateOutputPath } = require('../scripts/build');

const OUT = require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'tubes-build-'));
const root = path.join(__dirname, '..');

test('build stamps version and date into the site', () => {
  build({out:OUT,version:'9.9.9',date:'2030-01-01'});
  const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  assert.match(html, /const APP_VERSION='9\.9\.9'/);
  assert.match(html, /"softwareVersion": "9\.9\.9"/);
  assert.match(fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8'), /<lastmod>2030-01-01<\/lastmod>/);
  for (const f of ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'favicon.svg', 'site.webmanifest', 'robots.txt', '404.html', 'version.json', 'sw.js']) {
    assert.ok(fs.existsSync(path.join(OUT, f)), `${f} is shipped`);
  }
});

test('project hosting uses scoped application URLs and has no upstream publisher',()=>{
 const html=fs.readFileSync(path.join(OUT,'index.html'),'utf8');
 assert.ok(!fs.existsSync(path.join(OUT,'CNAME')));
 assert.ok(!html.includes('seriesoftub.es'));
 assert.ok(!html.includes('cdn.jsdelivr.net/npm/ridiculytics'));
 assert.ok(html.includes("fetch('version.json'"));
 assert.ok(html.includes("register('sw.js'"));
});

test('version.json carries the release notes from the changelog', () => {
  build({out:OUT,version:'1.0.0',date:'2026-10-23'});
  const v = JSON.parse(fs.readFileSync(path.join(OUT, 'version.json'), 'utf8'));
  assert.equal(v.version, '1.0.0');
  assert.ok(v.notes.length >= 5);
  assert.ok(v.notes.every((n) => !n.startsWith('-')));
});

test('head carries the SEO and social metadata', () => {
  const html = require('../scripts/lib/page').assemble().html;
  for (const needle of ['<link rel="canonical" href="https://zanefounty.github.io/series-of-calls/">', 'property="og:image"', 'name="twitter:card"', 'application/ld+json', 'rel="manifest"', 'name="description"']) {
    assert.ok(html.includes(needle), `missing ${needle}`);
  }
  for (const block of html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    JSON.parse(block.replace(/<\/?script[^>]*>/g, ''));
  }
});

test('a release build refuses to ship without release notes', () => {
  assert.throws(() => build({out:OUT,version:'9.9.9',requireNotes:true}), /CHANGELOG.md has no/);
  assert.throws(() => build({out:OUT,version:'1.0; rm -rf /'}), /not a semantic version/);
});

test('src: partials follow the layout rules (docs/adr/0002-one-page-assembled-at-build.md)', () => {
  const { listFiles, assemble } = require('../scripts/lib/page');
  const src = path.join(root, 'src');
  for (const f of listFiles(src)) {
    if (f === 'index.html' || f === 'i18n/en.js') continue;
    assert.match(f, /^(styles\/(\d\d-[a-z0-9-]+\/)*\d\d-[a-z0-9-]+\.css|game\/(\d\d-[a-z0-9-]+\/)*\d\d-[a-z0-9-]+\.js)$/, `${f}: name it NN-lower-case under styles/ or game/`);
  }
  const { html, map } = assemble();
  assert.equal((html.match(/^const ACT=\{$/gm) || []).length, 1, 'ACT is declared once; other action files use Object.assign(ACT,{…})');
  assert.equal((html.match(/<script>/g) || []).length, 2, 'the language loader and the game: one inline game script');
  assert.ok(map.length > 50 && map.every((m) => m.to >= m.from), 'the line map covers every partial');
});

test('distribution preserves upstream MIT and includes accurate attribution notices',()=>{for(const name of ['LICENSE','NOTICE','THIRD_PARTY_NOTICES.md'])assert.deepEqual(fs.readFileSync(path.join(OUT,name)),fs.readFileSync(path.join(root,name)));assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(OUT,'LICENSE'))).digest('hex'),'9a05d7606b8295d3833d42381da2c2ce334c9a909c36a0c7c014680f70ed499d');});

test('AC-SOC-362 build output validation protects the repository and its source inputs', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'build-guard-'));
  const repo = path.join(fixture, 'repo');
  try {
    for (const dir of ['src/game', 'site/assets', 'scripts/lib', '.git', '_site']) fs.mkdirSync(path.join(repo, dir), { recursive: true });
    const sentinels = ['src/game/keep.js', 'site/assets/keep.svg', 'scripts/build.js', '.git/keep'];
    for (const file of sentinels) fs.writeFileSync(path.join(repo, file), 'sentinel');
    // Execute the actual build entry point against an isolated repository root.
    // A missing guard can damage only this disposable fixture, never this checkout.
    const localModule = { exports: {} };
    const localRequire = (name) => {
      if (name === './lib/page') return { ROOT: repo };
      if (name === './release-notes') return { releaseNotes: () => '[]' };
      return require(name);
    };
    require('node:vm').runInNewContext(fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8'),
      { require: localRequire, module: localModule, process, console });
    for (const target of [repo, fixture, path.join(repo, 'src/game'), path.join(repo, 'scripts')]) {
      assert.throws(() => localModule.exports.build({ out: target, version: '1.0.0' }), /refusing to build into/);
      for (const file of sentinels) assert.equal(fs.readFileSync(path.join(repo, file), 'utf8'), 'sentinel');
    }

    assert.equal(validateOutputPath(path.join(repo, '_site'), repo), path.join(repo, '_site'), '_site remains a valid build destination');
    assert.equal(validateOutputPath(path.join(fixture, 'explicit-temp-output'), repo), path.join(fixture, 'explicit-temp-output'), 'external temporary destinations remain valid');
    for (const output of [repo, path.dirname(repo), ...['src', 'src/game', 'site', 'site/assets', 'scripts', 'scripts/lib', '.git'].map((p) => path.join(repo, p))]) {
      assert.throws(() => validateOutputPath(output, repo), /refusing to build into/);
    }

    const alias = path.join(fixture, 'source-alias');
    fs.symlinkSync(path.join(repo, 'src'), alias, 'dir');
    assert.throws(() => validateOutputPath(alias, repo), /refusing to build into protected repository path/);
    assert.throws(() => validateOutputPath(path.join(alias, 'nested-output'), repo), /refusing to build into protected repository path/);
    for (const file of sentinels) assert.equal(fs.readFileSync(path.join(repo, file), 'utf8'), 'sentinel', `${file} was never touched`);

    const outputAlias = path.join(fixture, 'output-alias');
    fs.symlinkSync(path.join(repo, '_site'), outputAlias, 'dir');
    assert.throws(() => validateOutputPath(outputAlias, repo), /refusing/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
