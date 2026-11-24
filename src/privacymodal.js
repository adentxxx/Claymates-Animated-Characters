// "Learn more" from the cookie banner: a small modal that names the analytics services,
// what they collect and how to change the choice. Same look as the "Export code" modal.
// Only the services that have an ID in analytics.config.js are listed.
import { YANDEX_METRIKA_ID, GA4_ID } from './analytics.config.js';
import { nbsp } from './typo.js';

const ALL_SERVICES = [
  {
    on: Boolean(YANDEX_METRIKA_ID),
    name: 'Yandex Metrica',
    who: 'Yandex LLC, Russia',
    what: 'Visits, pages, time on site, clicks, scrolling and anonymized session recordings (Webvisor), approximate location from the IP address, device and browser.',
    cookies: '_ym_uid and related cookies, kept for up to 1 year',
    link: 'https://yandex.com/legal/confidential/',
  },
  {
    on: Boolean(GA4_ID),
    name: 'Google Analytics 4',
    who: 'Google LLC, USA',
    what: 'Visits, time on site, events, approximate location, device and browser. IP addresses are not stored.',
    cookies: '_ga cookies, kept for up to 2 years',
    link: 'https://policies.google.com/privacy',
  },
];
const SERVICES = ALL_SERVICES.filter((s) => s.on);
const COUNT = ['no', 'one', 'two'][SERVICES.length] || String(SERVICES.length);

export function createPrivacyModal() {
  const root = document.createElement('div');
  root.className = 'em-overlay pm';
  root.hidden = true;
  root.innerHTML = `
    <div class="em-dialog" role="dialog" aria-modal="true" aria-labelledby="pm-title">
      <header class="em-head">
        <h2 id="pm-title">About analytics</h2>
        <button class="em-close" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <p class="em-lead">${nbsp(`If you accept cookies, ClayMates uses ${COUNT} analytics service${SERVICES.length === 1 ? '' : 's'} to learn how the site is used: which shapes, materials and animations people pick, and what they download. Nothing is loaded until you accept.`)}</p>
      <ul class="pm-list">
        ${SERVICES.map((s) => `
          <li>
            <div class="pm-name"><b>${s.name}</b><span>${s.who}</span></div>
            <p>${nbsp(s.what)}</p>
            <p class="pm-meta">${nbsp(`Cookies: ${s.cookies}`)} · <a href="${s.link}" target="_blank" rel="noopener">Privacy policy</a></p>
          </li>`).join('')}
      </ul>
      <p class="pm-note">${nbsp('No ads, no selling of data, and we never see your name or email. You can change your choice any time:')} <b>«i»</b> button → <b>Cookie settings</b>.</p>
      <button class="em-copy pm-ok" type="button">Got it</button>
    </div>`;
  document.body.appendChild(root);

  const q = (s) => root.querySelector(s);
  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('open'));
    q('.pm-ok').focus();
  }
  function close() {
    root.classList.remove('open');
    setTimeout(() => { root.hidden = true; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  q('.em-close').addEventListener('click', close);
  q('.pm-ok').addEventListener('click', close);
  root.addEventListener('pointerdown', (e) => { if (e.target === root) close(); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...root.querySelectorAll('button, a')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  return { open, close };
}
