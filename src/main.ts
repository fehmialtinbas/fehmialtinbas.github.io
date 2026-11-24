import './style.css';
import { links, sections, ui, type L, type Lang, type Section } from './content';
import type { MillScene } from './scene';

const content = document.getElementById('content') as HTMLElement;
const linemap = document.getElementById('linemap') as HTMLElement;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const loader = document.getElementById('loader') as HTMLElement;
const hud = {
  code: document.querySelector('.hud-code') as HTMLElement,
  machine: document.querySelector('.hud-machine') as HTMLElement,
  temp: document.querySelector('.hud-temp b') as HTMLElement,
  bar: document.querySelector('.hud-bar i') as HTMLElement,
  label: document.querySelector('.hud-label') as HTMLElement,
};

// ?static turns animation off (same as the OS "reduce motion" setting); handy for screenshots.
const reducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('static');
const lowPower = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

// ---------------------------------------------------------------- language
function readLang(): Lang {
  try {
    const v = localStorage.getItem('lang');
    if (v === 'en' || v === 'tr') return v;
  } catch {
    /* storage blocked: fall back to English */
  }
  return 'en';
}
function saveLang(v: Lang) {
  try {
    localStorage.setItem('lang', v);
  } catch {
    /* ignore */
  }
}
let lang: Lang = readLang();

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const t = (x: L) => esc(x[lang]);

// ---------------------------------------------------------------- icons
const icon = {
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
  medium: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// ---------------------------------------------------------------- rendering
function renderSection(s: Section, i: number) {
  const hero = i === 0;
  let h = `<section id="${s.id}" class="station ${s.side}${hero ? ' hero' : ''}" data-index="${i}" aria-labelledby="${s.id}-title"><div class="panel">`;
  h += `<p class="kicker">${t(s.kicker)}</p>`;
  h += hero ? `<h1 id="${s.id}-title">${t(s.title)}</h1>` : `<h2 id="${s.id}-title">${t(s.title)}</h2>`;
  if (s.meta) h += `<p class="meta">${t(s.meta)}</p>`;
  s.body?.forEach((p) => (h += `<p>${t(p)}</p>`));
  if (s.entries) h += `<ul class="entries">${s.entries.map((e) => `<li><b>${esc(e.title)}</b><span>${t(e.meta)}</span></li>`).join('')}</ul>`;
  if (s.tags) h += `<ul class="tags">${s.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  if (s.stands)
    h += `<ol class="stands">${s.stands
      .map((st) => `<li><span class="stand-code">${esc(st.code)}</span><div><b>${t(st.title)}</b><span class="tech">${esc(st.tech)}</span><p>${t(st.text)}</p></div></li>`)
      .join('')}</ol>`;
  if (s.bullets) h += `<ul class="bullets">${s.bullets.map((b) => `<li>${t(b)}</li>`).join('')}</ul>`;
  if (s.stats) h += `<dl class="stats">${s.stats.map((x) => `<div><dt>${t(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>`;
  if (s.chips)
    h += `<div class="chips">${s.chips
      .map((c) => `<div class="chip-group"><h3>${t(c.group)}</h3><ul>${c.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`)
      .join('')}</div>`;
  if (s.cards)
    h += `<div class="cards">${s.cards
      .map(
        (c) =>
          `<a class="card" href="${c.href}" target="_blank" rel="noopener"><span class="card-meta">${t(c.meta)}</span><b>${t(c.title)}</b><p>${t(c.text)}</p><span class="card-arrow">${icon.arrow}</span></a>`,
      )
      .join('')}</div>`;
  if (s.actions)
    h += `<div class="actions">${s.actions.map((a) => `<a class="btn${a.primary ? ' primary' : ''}" href="${a.href}">${t(a.label)}</a>`).join('')}</div>`;
  if (s.contact)
    h += `<div class="contact">
      <img src="/avatar.jpg" alt="" width="72" height="72" loading="lazy" />
      <div class="contact-links">
        <a href="${links.email}">${icon.mail}<span>mfehmialtinbas@gmail.com</span></a>
        <a href="${links.github}" target="_blank" rel="noopener">${icon.github}<span>github.com/fehmialtinbas</span></a>
        <a href="${links.linkedin}" target="_blank" rel="noopener">${icon.linkedin}<span>linkedin.com/in/fehmialtinbas</span></a>
        <a href="${links.medium}" target="_blank" rel="noopener">${icon.medium}<span>medium.com/@mfehmialtinbas</span></a>
      </div>
    </div>
    <p class="footer">${t(ui.footer)} © ${new Date().getFullYear()}</p>`;
  h += `</div></section>`;
  return h;
}

let sectionEls: HTMLElement[] = [];
let anchors: number[] = [];

function render() {
  document.documentElement.lang = lang;
  content.innerHTML = sections.map(renderSection).join('');
  sectionEls = Array.from(content.querySelectorAll<HTMLElement>('section.station'));
  linemap.innerHTML = `<p class="sr-only">${t(ui.stations)}</p><ol>${sections
    .map((s, i) => `<li><button type="button" data-go="${i}" aria-label="${t(s.machine)}"><span class="dot"></span><span class="lbl">${t(s.machine)}</span></button></li>`)
    .join('')}</ol>`;
  document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
    const key = el.dataset.t as keyof typeof ui;
    if (ui[key]) el.textContent = ui[key][lang];
  });
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  hud.label.textContent = ui.temp[lang];
  observePanels();
  measure();
  onScroll();
}

// ---------------------------------------------------------------- scroll → progress
function measure() {
  const vh = window.innerHeight;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
  anchors = sectionEls.map((el, i) => {
    if (i === 0) return 0;
    const a = el.offsetTop + el.offsetHeight / 2 - vh / 2;
    return Math.min(maxScroll, Math.max(0, a));
  });
  for (let i = 1; i < anchors.length; i++) if (anchors[i] <= anchors[i - 1]) anchors[i] = anchors[i - 1] + 1;
}

function progressAt(y: number) {
  const n = anchors.length;
  if (n === 0) return 0;
  if (y <= anchors[0]) return 0;
  for (let i = 0; i < n - 1; i++) {
    if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
  }
  return n - 1;
}

let scene: MillScene | null = null;
let activeIndex = -1;

// ?station=N pins the 3D view to one station whatever the scroll position (for screenshots).
const pinned = new URLSearchParams(location.search).get('station');

function onScroll() {
  document.body.classList.toggle('scrolled', window.scrollY > 40);
  const p = pinned !== null ? Number(pinned) : progressAt(window.scrollY);
  scene?.setProgress(p);
  updateHud(p);
}

function updateHud(p: number) {
  const i = Math.min(sections.length - 1, Math.round(p));
  const a = Math.floor(p);
  const b = Math.min(sections.length - 1, a + 1);
  const temp = Math.round(sections[a].temp + (sections[b].temp - sections[a].temp) * (p - a));
  hud.temp.textContent = String(temp);
  hud.bar.style.transform = `scaleX(${Math.max(0.03, temp / 1250)})`;
  if (i !== activeIndex) {
    activeIndex = i;
    hud.code.textContent = sections[i].code;
    hud.machine.textContent = sections[i].machine[lang];
    linemap.querySelectorAll('button').forEach((btn, k) => btn.classList.toggle('active', k === i));
  }
}

// ---------------------------------------------------------------- panel reveal
let io: IntersectionObserver | null = null;
function observePanels() {
  io?.disconnect();
  const panels = content.querySelectorAll<HTMLElement>('.panel');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    panels.forEach((p) => p.classList.add('visible'));
    return;
  }
  io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
    { threshold: 0.15 },
  );
  panels.forEach((p) => io!.observe(p));
}

// ---------------------------------------------------------------- events
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) =>
  b.addEventListener('click', () => {
    const next = b.dataset.lang as Lang;
    if (next === lang) return;
    const p = progressAt(window.scrollY);
    lang = next;
    saveLang(lang);
    activeIndex = -1;
    render();
    // keep the reader at the same station after the text reflows
    const i = Math.floor(p);
    const target = anchors[i] + (anchors[Math.min(i + 1, anchors.length - 1)] - anchors[i]) * (p - i);
    window.scrollTo({ top: target });
  }),
);

linemap.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-go]');
  if (!btn) return;
  window.scrollTo({ top: anchors[Number(btn.dataset.go)], behavior: reducedMotion ? 'auto' : 'smooth' });
});

content.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a) return;
  const i = sections.findIndex((s) => `#${s.id}` === a.getAttribute('href'));
  if (i < 0) return;
  e.preventDefault();
  window.scrollTo({ top: anchors[i], behavior: reducedMotion ? 'auto' : 'smooth' });
});

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => {
  measure();
  onScroll();
});
window.addEventListener(
  'pointermove',
  (e) => scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)),
  { passive: true },
);

// ---------------------------------------------------------------- boot
let loaderHidden = false;
function hideLoader() {
  if (loaderHidden) return;
  loaderHidden = true;
  loader.classList.add('done');
  window.setTimeout(() => loader.remove(), 900);
}
// Never keep the text behind the loader: a slow phone gets the content while the 3D keeps loading.
window.setTimeout(hideLoader, 4500);

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

// Deep links like /#pulpit land on that station's camera position, not just the section top.
function goToHash(behavior: ScrollBehavior = 'auto') {
  const i = sections.findIndex((s) => `#${s.id}` === location.hash);
  if (i > 0) window.scrollTo({ top: anchors[i], behavior });
}

render();
window.addEventListener('load', () => {
  measure();
  goToHash();
  onScroll();
});
window.addEventListener('hashchange', () => goToHash(reducedMotion ? 'auto' : 'smooth'));
// Web fonts and late styles change section heights: keep the scroll → station mapping in sync.
if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    measure();
    onScroll();
  }).observe(content);
}
document.fonts?.ready.then(() => {
  measure();
  onScroll();
});

if (webglAvailable()) {
  import('./scene')
    .then(({ createMillScene }) => {
      scene = createMillScene(canvas, { reducedMotion, lowPower, sides: sections.map((s) => s.side) });
      scene.setProgress(pinned !== null ? Number(pinned) : progressAt(window.scrollY));
      scene.start(hideLoader);
    })
    .catch((err) => {
      console.error(err);
      document.body.classList.add('no-webgl');
      hideLoader();
    });
} else {
  document.body.classList.add('no-webgl');
  hideLoader();
}
