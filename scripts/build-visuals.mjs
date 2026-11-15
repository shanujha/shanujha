// Generates the README visuals into assets/ from live GitHub data.
// Usage: node scripts/build-visuals.mjs   (uses GH_TOKEN, or `gh auth token` locally)
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const USER = 'shanujha';
const FIRST_YEAR = 2020;
const OUT = new URL('../assets/', import.meta.url);

const token = process.env.GH_TOKEN || execSync('gh auth token').toString().trim();
const headers = { Authorization: `Bearer ${token}`, 'User-Agent': USER };

const rest = async (path) => {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

const graphql = async (query) => {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
};

// Deterministic randomness so the art only changes when the data does.
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

// ---------------------------------------------------------------- data
const repos = (await rest(`/users/${USER}/repos?per_page=100&type=owner`)).filter((r) => !r.fork);

const bytes = new Map();
for (const repo of repos) {
  const langs = await rest(`/repos/${USER}/${repo.name}/languages`);
  for (const [name, n] of Object.entries(langs)) bytes.set(name, (bytes.get(name) ?? 0) + n);
}
const topLangs = [...bytes].sort((a, b) => b[1] - a[1]).slice(0, 10);

const thisYear = new Date().getFullYear();
const years = [];
for (let y = FIRST_YEAR; y <= thisYear; y++) {
  const data = await graphql(`{user(login:"${USER}"){contributionsCollection(from:"${y}-01-01T00:00:00Z",to:"${y}-12-31T23:59:59Z"){contributionCalendar{totalContributions}}}}`);
  years.push({ year: y, total: data.user.contributionsCollection.contributionCalendar.totalContributions });
}

// ---------------------------------------------------------------- shared theme
// prefers-color-scheme works inside <img> SVGs on GitHub, so one file serves both themes.
const THEME = `
  :root{--ink:#1f2328;--mute:#656d76;--line:#d0d7de;--lit:#b7791f;--b1:#3b4a5e;--b2:#4a5b72;--b3:#2f3c4e;--ground:#1f2328}
  @media (prefers-color-scheme: dark){:root{--ink:#e6edf3;--mute:#8b949e;--line:#30363d;--lit:#f2cc60;--b1:#21303f;--b2:#2a3b4e;--b3:#182431;--ground:#e6edf3}}
  text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:var(--ink)}
  .mute{fill:var(--mute)}
`;

// ---------------------------------------------------------------- skyline
function skyline() {
  const W = 900, H = 360, ground = 292, bw = 72, gap = 12;
  const total = topLangs.length * bw + (topLangs.length - 1) * gap;
  const x0 = (W - total) / 2;
  const max = topLangs[0][1];
  const rand = rng(7);
  const shades = ['var(--b1)', 'var(--b2)', 'var(--b3)'];

  let body = '';
  topLangs.forEach(([name, n], i) => {
    const h = Math.round(46 + 190 * Math.sqrt(n / max));
    const x = x0 + i * (bw + gap);
    const top = ground - h;
    body += `<rect x="${x}" y="${top}" width="${bw}" height="${h}" fill="${shades[i % 3]}"/>`;
    if (i === 0) body += `<path d="M${x + bw / 2} ${top} v-22" stroke="var(--b2)" stroke-width="2"/><circle cx="${x + bw / 2}" cy="${top - 24}" r="2.5" fill="var(--lit)" class="blink"/>`;
    for (let wy = top + 14; wy < ground - 16; wy += 20) {
      for (let c = 0; c < 3; c++) {
        if (rand() > 0.55) continue;
        const delay = (rand() * 6).toFixed(1), dur = (3 + rand() * 4).toFixed(1);
        body += `<rect x="${x + 14 + c * 20}" y="${wy}" width="10" height="12" rx="1" fill="var(--lit)" class="win" style="animation-duration:${dur}s;animation-delay:-${delay}s"/>`;
      }
    }
    body += `<text x="${x + bw / 2}" y="${top - (i === 0 ? 38 : 8)}" text-anchor="middle" font-size="11" class="mute">${compact(n)}</text>`;
    body += `<text x="${x + bw / 2}" y="${ground + 22}" text-anchor="middle" font-size="11">${esc(name)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-labelledby="t d">
<title id="t">Language skyline</title>
<desc id="d">A city skyline where each building is a language across Shanu Jha's repositories. Taller means more code. ${topLangs.map(([n]) => n).join(', ')}.</desc>
<style>${THEME}
  .win{animation:flick 5s ease-in-out infinite}
  .blink{animation:flick 2s ease-in-out infinite}
  @keyframes flick{0%,100%{opacity:1}45%,55%{opacity:.25}}
  @media (prefers-reduced-motion: reduce){.win,.blink{animation:none}}
</style>
<line x1="${x0 - 30}" y1="${ground}" x2="${x0 + total + 30}" y2="${ground}" stroke="var(--ground)" stroke-width="2"/>
${body}
<text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="10" class="mute">bytes of code per language, across ${repos.length} repositories</text>
</svg>`;
}

// ---------------------------------------------------------------- growth rings
function rings() {
  const W = 900, H = 500, cx = 250, cy = 250;
  const max = Math.max(...years.map((y) => y.total));
  const noise = (seed) => {
    const r = rng(seed), p = [r() * 6, r() * 6, r() * 6];
    return (a) => Math.sin(a * 2 + p[0]) * 0.012 + Math.sin(a * 3 + p[1]) * 0.009 + Math.sin(a * 5 + p[2]) * 0.006;
  };
  const blob = (r, f) => {
    const steps = 96;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2, rr = r * (1 + f(a));
      d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
    }
    return d + 'Z';
  };

  let r = 14, shapes = '', labels = '';
  const f = noise(11);
  years.forEach(({ year, total }, i) => {
    const w = 10 + 30 * Math.sqrt(total / max);
    const inner = r, outer = r + w;
    const light = 34 + i * 4;
    shapes += `<path d="${blob(outer, f)}${blob(inner, f)}" fill="hsl(${28 - i * 1.5} 52% ${light}%)" fill-rule="evenodd" stroke="var(--line)" stroke-width=".6"/>`;
    const mid = (inner + outer) / 2, ang = -0.5 + (i - years.length / 2) * 0.16;
    const px = cx + Math.cos(ang) * mid * 1.0, py = cy + Math.sin(ang) * mid;
    const ly = 70 + i * 52;
    labels += `<path d="M${px.toFixed(1)} ${py.toFixed(1)} L${(cx + 235).toFixed(1)} ${ly} H560" fill="none" stroke="var(--line)" stroke-width="1"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.5" fill="var(--ink)"/>`;
    labels += `<text x="570" y="${ly + 4}" font-size="15" font-weight="700">${year}</text><text x="624" y="${ly + 4}" font-size="15">${total.toLocaleString('en-US')}</text>`;
    labels += `<rect x="700" y="${ly - 5}" width="${Math.round(160 * total / max)}" height="9" rx="2" fill="hsl(${28 - i * 1.5} 52% ${light}%)"/>`;
    r = outer + 2;
  });
  const partial = years[years.length - 1].year;
  labels += `<text x="570" y="${70 + years.length * 52 + 4}" font-size="10" class="mute">${partial} is the year so far. Includes private work.</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-labelledby="t d">
<title id="t">Growth rings</title>
<desc id="d">Tree rings, one per year from ${FIRST_YEAR} to ${partial}. A thicker ring means more contributions that year. ${years.map((y) => `${y.year}: ${y.total}`).join(', ')}.</desc>
<style>${THEME}</style>
${shapes}
<circle cx="${cx}" cy="${cy}" r="5" fill="var(--ink)"/>
${labels}
</svg>`;
}

// ---------------------------------------------------------------- periodic table of tools
function elements() {
  const tools = [
    ['Ts', 'TypeScript', 'lang'], ['Re', 'React', 'lang'], ['No', 'Node', 'lang'], ['Py', 'Python', 'lang'],
    ['Pg', 'PostgreSQL', 'data'], ['Rd', 'Redis', 'data'], ['Sq', 'SQLite', 'data'], ['Su', 'Supabase', 'data'],
    ['S3', 'S3', 'infra'], ['Dk', 'Docker', 'infra'], ['Ta', 'Tauri', 'infra'],
  ];
  const hue = { lang: 212, data: 152, infra: 28 };
  const cols = 6, tw = 132, th = 112, pad = 10;
  const W = cols * tw + (cols - 1) * pad + 2, rows = Math.ceil(tools.length / cols), H = rows * th + (rows - 1) * pad + 56;

  const tiles = tools.map(([sym, name, kind], i) => {
    const x = 1 + (i % cols) * (tw + pad), y = 1 + Math.floor(i / cols) * (th + pad);
    const c = `hsl(${hue[kind]} 55% 50%)`;
    return `<g><rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="8" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="1.5"/>
<text x="${x + 10}" y="${y + 20}" font-size="12" class="mute">${i + 1}</text>
<text x="${x + tw / 2}" y="${y + 66}" text-anchor="middle" font-size="40" font-weight="700" style="fill:${c}">${sym}</text>
<text x="${x + tw / 2}" y="${y + 94}" text-anchor="middle" font-size="12">${esc(name)}</text></g>`;
  }).join('\n');

  const legend = Object.entries({ lang: 'language and framework', data: 'data', infra: 'infrastructure and shipping' }).map(([k, label], i) =>
    `<circle cx="${12 + i * 230}" cy="${H - 18}" r="5" fill="hsl(${hue[k]} 55% 50%)"/><text x="${24 + i * 230}" y="${H - 14}" font-size="11" class="mute">${label}</text>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-labelledby="t d">
<title id="t">Periodic table of tools</title>
<desc id="d">The tools Shanu Jha uses, drawn as elements: ${tools.map((t) => t[1]).join(', ')}.</desc>
<style>${THEME}</style>
${tiles}
${legend}
</svg>`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL('skyline.svg', OUT), skyline());
writeFileSync(new URL('rings.svg', OUT), rings());
writeFileSync(new URL('elements.svg', OUT), elements());
console.log('wrote skyline.svg, rings.svg, elements.svg', topLangs.map(([n]) => n).join(','), years.map((y) => y.total).join(','));
