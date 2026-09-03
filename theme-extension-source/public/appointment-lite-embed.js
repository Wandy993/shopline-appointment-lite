(() => {
  const VERSION = '0.8.3';
  const API_BASE = 'https://appointment.toolkit.fans';
  const SELECTOR = '[data-appointment-lite-embed]:not([data-al-embed-ready])';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]);
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
      const accent = payload.storefront?.button?.backgroundColor || '#2F6FED';
      const textColor = payload.storefront?.button?.textColor || '#FFFFFF';
      root.style.setProperty('--al-embed-accent', accent);
      root.style.setProperty('--al-embed-text', textColor);
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
