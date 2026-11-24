// Analytics: Yandex Metrica + Google Analytics 4.
//
// - Both counters load after the page has loaded, in idle time, so they never slow down the first
//   paint; events sent before that are queued by the standard stubs and delivered later.
// - Metrica runs with Webvisor (session recordings), click map, link and scroll tracking.
// - Every event goes to both services: a goal + visit parameters in Metrica (the parameters form a
//   tree under Reports → Visit parameters, no setup needed), an event with parameters in GA4.
// - Nothing loads until the visitor accepts the cookie banner; the choice is remembered.
// - Off in the embed view (the character inside someone else's site) and on localhost,
//   unless the URL has ?analytics-debug (then every event is also printed to the console).
import { YANDEX_METRIKA_ID as YM, GA4_ID as GA } from './analytics.config.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('analytics-debug');
const LOCAL = /^(localhost|127\.|\[::1\])/.test(location.hostname);
// counters exist for this page view (consent decides whether they actually start)
export const ANALYTICS_AVAILABLE = Boolean((YM || GA) && !params.has('embed') && (!LOCAL || DEBUG)) || (DEBUG && !params.has('embed'));

/* ---------- consent: nothing loads and nothing is sent until the visitor accepts ---------- */
const CONSENT_KEY = 'claymates.consent';
export function getConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }   // 'granted' | 'denied' | null
}
let started = false, allowed = false;
export function setConsent(granted) {
  try { localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied'); } catch { /* private mode */ }
  allowed = granted;
  if (granted) start();
  else if (started && GA) window.gtag('consent', 'update', { analytics_storage: 'denied' });
  if (DEBUG) console.info('[analytics] consent', granted ? 'granted' : 'denied');
}

function loadScript(src) {
  const s = document.createElement('script');
  s.async = true; s.src = src;
  document.head.appendChild(s);
}
const whenIdle = (fn) => {
  const go = () => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
};

function start() {
  if (started || !ANALYTICS_AVAILABLE || !(YM || GA)) return;
  started = true;
  if (YM) {
    // official stub: calls are queued until tag.js arrives
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    window.ym(Number(YM), 'init', {
      webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true,
      trackHash: false,            // the hash holds the character and changes on every edit
    });
  }
  if (GA) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', GA, { page_location: location.origin + location.pathname, page_title: document.title });
  }
  whenIdle(() => {
    if (YM) loadScript('https://mc.yandex.ru/metrika/tag.js');
    if (GA) loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA));
  });
}
if (getConsent() === 'granted') { allowed = true; start(); }

/**
 * Send an event to both services.
 * @param {string} name   short snake_case name, e.g. 'export_png'
 * @param {object} [data] flat parameters, e.g. { format: 'mp4', shape: 'cube' }
 */
export function track(name, data = {}) {
  if (DEBUG) console.info('[analytics]', name, data, allowed ? '' : '(not sent: no consent)');
  if (!started || !allowed) return;
  if (YM) {
    window.ym(Number(YM), 'reachGoal', name, data);
    // visit parameters: a tree "event → param → value" that Metrica counts per visit
    const tree = {};
    for (const [k, v] of Object.entries(data)) tree[k] = String(v);
    window.ym(Number(YM), 'params', { [name]: Object.keys(tree).length ? tree : 1 });
  }
  if (GA) window.gtag('event', name, data);
}

/** The character's main choices, attached to exports and to the final snapshot. */
export function characterSummary(st) {
  return {
    shape: st.shape, material: st.material, color: st.color, emotion: st.emotion, anim: st.anim,
    eyes: st.eyes, arms: st.arms, legs: st.legs, head: st.head, eyewear: st.eyewear, neck: st.neck,
  };
}

// Setting changes: a slider fires on every pixel of a drag, so each key is reported once it settles.
const pending = new Map();
const round = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);
export function trackSetting(key, value) {
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => { pending.delete(key); track('setting_change', { setting: key, value: round(value) }); }, 900));
}

// Time on site and engagement are measured by both services themselves (Metrica: visit duration,
// depth, bounce; GA4: engagement time). Geography, device, browser, screen and traffic sources are
// collected automatically as well.
