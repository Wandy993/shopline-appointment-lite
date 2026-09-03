(() => {
  const VERSION = '0.8.10';
  const API_BASE = 'https://appointment.toolkit.fans';
  const SELECTOR = '[data-appointment-lite-embed]:not([data-al-embed-ready])';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]);
  }

  const themePresets = {
    minimal_light: { accent:'#344054', primaryText:'#FFFFFF', surface:'#FFFFFF', soft:'#F7F8FA', text:'#1D2939', muted:'#667085', line:'#E4E7EC', backgrounds:{ soft:'#FAFBFC', medium:'#F5F7F9', strong:'#EEF1F4' } },
    warm_luxe: { accent:'#4B342B', primaryText:'#FFFDFC', surface:'#FFFDFC', soft:'#F5ECE5', text:'#2C211D', muted:'#74645C', line:'#E4D6CD', backgrounds:{ soft:'#FAF6F2', medium:'#F3EBE4', strong:'#E9DDD4' } },
    soft_editorial: { accent:'#252722', primaryText:'#FFFFFF', surface:'#FCFCF8', soft:'#F2F1EC', text:'#22231F', muted:'#6D6D66', line:'#DDDDD5', backgrounds:{ soft:'#FAFAF7', medium:'#F1F1EC', strong:'#E7E7E0' } }
  };
  const cornerRadius = { soft:14, rounded:22, square_soft:10 };
  function applyTheme(root, storefront = {}) {
    const appearance = storefront.appearance || {};
    const preset = themePresets[appearance.template] || themePresets.warm_luxe;
    const intensity = ['soft','medium','strong'].includes(appearance.backgroundIntensity) ? appearance.backgroundIntensity : 'medium';
    const custom = appearance.primaryStyle === 'custom';
    root.dataset.alTheme = appearance.template || 'warm_luxe';
    root.style.setProperty('--al-embed-accent', custom ? (storefront.button?.backgroundColor || '#2F6FED') : preset.accent);
    root.style.setProperty('--al-embed-text', custom ? (storefront.button?.textColor || '#FFFFFF') : preset.primaryText);
    root.style.setProperty('--al-embed-bg', preset.backgrounds[intensity]);
    root.style.setProperty('--al-embed-surface', preset.surface);
    root.style.setProperty('--al-embed-soft', preset.soft);
    root.style.setProperty('--al-embed-copy', preset.text);
    root.style.setProperty('--al-embed-muted', preset.muted);
    root.style.setProperty('--al-embed-line', preset.line);
    root.style.setProperty('--al-embed-radius', `${cornerRadius[appearance.cornerStyle] || 22}px`);
  }

  async function load(root) {
    root.dataset.alEmbedReady = 'true';
    const shopId = String(root.dataset.shopId || window.Shopline?.storeId || '').trim();
    if (!/^\d{3,32}$/.test(shopId)) return;
    try {
      const target = new URL('/api/public/embed-services', API_BASE);
      target.searchParams.set('shopId', shopId);
      const response = await fetch(target, { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(payload.services) || !payload.services.length) return;
      const buttonLabel = payload.storefront?.button?.label || 'Book an appointment';
      applyTheme(root, payload.storefront || {});
      root.innerHTML = `<button type="button" class="al-embed-launcher" aria-expanded="false">${escapeHtml(buttonLabel)}</button><section class="al-embed-panel" hidden><div class="al-embed-head"><div><span>APPOINTMENTS</span><strong>Choose a service</strong></div><button type="button" class="al-embed-close" aria-label="Close">×</button></div><div class="al-embed-services">${payload.services.map(service => `<a class="al-embed-service" href="${API_BASE}/book/${encodeURIComponent(service.id)}"><strong>${escapeHtml(service.title || 'Appointment')}</strong>${service.description ? `<span>${escapeHtml(service.description)}</span>` : ''}</a>`).join('')}</div></section>`;
      const launcher = root.querySelector('.al-embed-launcher');
      const panel = root.querySelector('.al-embed-panel');
      const close = root.querySelector('.al-embed-close');
      const setOpen = open => { panel.hidden = !open; launcher.setAttribute('aria-expanded', String(open)); };
      launcher.addEventListener('click', () => setOpen(panel.hidden));
      close.addEventListener('click', () => setOpen(false));
      document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
      root.hidden = false;
    } catch (error) {
      console.warn('[Appointment Lite]', 'App Embed launcher failed to initialize.', { version: VERSION, message: error?.message || String(error) });
    }
  }

  function scan(root = document) {
    const nodes = [];
    if (root instanceof Element && root.matches(SELECTOR)) nodes.push(root);
    root.querySelectorAll?.(SELECTOR).forEach(node => nodes.push(node));
    nodes.forEach(load);
  }

  scan();
  document.addEventListener('shopline:section:load', event => scan(event.target));
  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) scan(node); })));
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
