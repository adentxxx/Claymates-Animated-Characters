// "Экспортировать код" — modal with an <iframe> snippet that embeds the current character on
// another site (embed mode: character only, transparent background, plays its animation).
const SIZES = [
  { id: 's', label: 'Маленький', px: 240 },
  { id: 'm', label: 'Средний', px: 360 },
  { id: 'l', label: 'Большой', px: 520 },
];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function snippet(url, px, title) {
  return `<iframe src="${url}" width="${px}" height="${px}" title="${esc(title)}" loading="lazy"\n  style="border:0;background:transparent;overflow:hidden" allowtransparency="true"></iframe>`;
}

export function createEmbedModal({ getUrl, getTitle, toast }) {
  const root = document.createElement('div');
  root.className = 'em-overlay';
  root.hidden = true;
  root.innerHTML = `
    <div class="em-dialog" role="dialog" aria-modal="true" aria-labelledby="em-title">
      <header class="em-head">
        <h2 id="em-title">Код для встраивания</h2>
        <button class="em-close" type="button" aria-label="Закрыть">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <p class="em-lead">Вставьте этот код на свой сайт — персонаж появится там с прозрачным фоном и будет проигрывать свою анимацию.</p>
      <div class="em-sizes" role="radiogroup" aria-label="Размер">
        ${SIZES.map((s) => `<button type="button" class="em-size" role="radio" data-id="${s.id}">${s.label}<small>${s.px}×${s.px}</small></button>`).join('')}
      </div>
      <textarea class="em-code" readonly spellcheck="false" aria-label="Код для встраивания"></textarea>
      <button class="em-copy" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>
        <span>Скопировать код</span>
      </button>
      <ol class="em-steps">
        <li>Скопируйте код.</li>
        <li>Вставьте его в HTML страницы там, где должен стоять персонаж: в Tilda — блок «HTML-код», в Webflow — элемент Embed, в WordPress — блок «Пользовательский HTML».</li>
        <li>Чтобы изменить размер, поменяйте <code>width</code> и <code>height</code> в коде.</li>
      </ol>
      <p class="em-warn" hidden></p>
    </div>`;
  document.body.appendChild(root);

  const q = (s) => root.querySelector(s);
  const code = q('.em-code'), copyBtn = q('.em-copy'), warn = q('.em-warn');
  let size = SIZES[1], lastFocus = null;

  function render() {
    root.querySelectorAll('.em-size').forEach((b) => {
      const on = b.dataset.id === size.id;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    });
    code.value = snippet(getUrl(), size.px, getTitle());
    const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
    warn.hidden = !local;
    warn.textContent = local
      ? 'Сайт сейчас открыт локально, поэтому этот код будет работать только на вашем компьютере. Чтобы встраивать персонажа на другие сайты, опубликуйте Claymates в интернете (например, на Vercel) и возьмите код оттуда.'
      : '';
  }

  async function copy() {
    try { await navigator.clipboard.writeText(code.value); }
    catch { code.select(); document.execCommand && document.execCommand('copy'); }
    copyBtn.classList.add('done');
    copyBtn.querySelector('span').textContent = 'Скопировано';
    toast && toast('Код скопирован');
    clearTimeout(copy.t);
    copy.t = setTimeout(() => { copyBtn.classList.remove('done'); copyBtn.querySelector('span').textContent = 'Скопировать код'; }, 1800);
  }

  function open() {
    lastFocus = document.activeElement;
    render();
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('open'));
    copyBtn.focus();
  }
  function close() {
    root.classList.remove('open');
    setTimeout(() => { root.hidden = true; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  root.querySelectorAll('.em-size').forEach((b) => b.addEventListener('click', () => { size = SIZES.find((s) => s.id === b.dataset.id); render(); }));
  copyBtn.addEventListener('click', copy);
  code.addEventListener('focus', () => code.select());
  q('.em-close').addEventListener('click', close);
  root.addEventListener('pointerdown', (e) => { if (e.target === root) close(); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...root.querySelectorAll('button, textarea')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  return { open, close };
}
