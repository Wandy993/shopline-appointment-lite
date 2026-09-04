(() => {
  const VERSION = '0.8.11';
  const API_BASE = 'https://appointment.toolkit.fans';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const clean = value => {
    const text = String(value || '').trim();
    if (!text || /^(?:select|choose)\s+(?:a\s+)?(?:state|region|location|option)(?:\.\.\.)?$/i.test(text)) return '';
    return text;
  };
  const serviceList = item => [...new Set((Array.isArray(item?.supportedServices) ? item.supportedServices : []).map(clean).filter(Boolean))].slice(0, 12);
  const themePresets = {
    minimal_light: { accent:'#344054', primaryText:'#FFFFFF', surface:'#FFFFFF', soft:'#F7F8FA', text:'#1D2939', muted:'#667085', line:'#E4E7EC', success:'#5D8A70', backgrounds:{ soft:'#FAFBFC', medium:'#F5F7F9', strong:'#EEF1F4' } },
    warm_luxe: { accent:'#4B342B', primaryText:'#FFFDFC', surface:'#FFFDFC', soft:'#F5ECE5', text:'#2C211D', muted:'#74645C', line:'#E4D6CD', success:'#6F8B73', backgrounds:{ soft:'#FAF6F2', medium:'#F3EBE4', strong:'#E9DDD4' } },
    soft_editorial: { accent:'#252722', primaryText:'#FFFFFF', surface:'#FCFCF8', soft:'#F2F1EC', text:'#22231F', muted:'#6D6D66', line:'#DDDDD5', success:'#68856F', backgrounds:{ soft:'#FAFAF7', medium:'#F1F1EC', strong:'#E7E7E0' } }
  };
  const cornerRadius = { soft:14, rounded:22, square_soft:10 };
  const applyTheme = (root, storefront = {}) => {
    const appearance = storefront.appearance || {};
    const preset = themePresets[appearance.template] || themePresets.warm_luxe;
    const intensity = ['soft','medium','strong'].includes(appearance.backgroundIntensity) ? appearance.backgroundIntensity : 'medium';
    const custom = appearance.primaryStyle === 'custom';
    const accent = custom ? (storefront.modal?.accentColor || '#2F6FED') : preset.accent;
    const primaryText = custom ? (storefront.modal?.primaryTextColor || '#FFFFFF') : preset.primaryText;
    root.dataset.alTheme = appearance.template || 'warm_luxe';
    root.style.setProperty('--al-page-bg', preset.backgrounds[intensity]);
    root.style.setProperty('--al-page-surface', preset.surface);
    root.style.setProperty('--al-page-soft', preset.soft);
    root.style.setProperty('--al-page-text', preset.text);
    root.style.setProperty('--al-page-muted', preset.muted);
    root.style.setProperty('--al-page-line', preset.line);
    root.style.setProperty('--al-page-success', preset.success);
    root.style.setProperty('--al-page-accent', accent);
    root.style.setProperty('--al-page-primary-text', primaryText);
    root.style.setProperty('--al-page-radius', `${cornerRadius[appearance.cornerStyle] || 22}px`);
  };
  const avatar = item => {
    const a = item?.avatar || {};
    const initial = escapeHtml(String(item?.name || '?').slice(0, 1).toUpperCase());
    if (a.kind === 'custom' && /^data:image\/(?:png|jpeg|webp);base64,/.test(String(a.value || ''))) return `<span class="al-dir-avatar"><img src="${escapeHtml(a.value)}" alt=""></span>`;
    return `<span class="al-dir-avatar al-dir-initial">${initial}</span>`;
  };

  async function json(path) {
    const response = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Could not load Appointment Lite.');
    return payload;
  }

  function missing(root) {
    root.innerHTML = '<div class="al-page-empty"><strong>Choose an Appointment Lite service</strong><span>Paste the Service ID from Appointment Lite into this block in the theme editor.</span></div>';
  }

  async function booking(root) {
    const id = String(root.dataset.ruleId || '').trim();
    if (!id) return missing(root);
    try {
      const payload = await json(`/api/public/service?ruleId=${encodeURIComponent(id)}&placement=page`);
      const rule = payload.rule;
      applyTheme(root, payload.storefront || {});
      root.innerHTML = `<article class="al-page-service"><div><span class="al-page-kicker">APPOINTMENT</span><h2>${escapeHtml(rule.serviceTitle)}</h2>${rule.serviceDescription ? `<p>${escapeHtml(rule.serviceDescription)}</p>` : ''}</div><a class="al-page-cta" href="${API_BASE}/book/${encodeURIComponent(id)}">Book appointment <span aria-hidden="true">→</span></a></article>`;
    } catch (error) {
      root.innerHTML = `<div class="al-page-empty"><strong>Service unavailable</strong><span>${escapeHtml(error.message)}</span></div>`;
    }
  }

  function staffCard(item, serviceId) {
    const role = clean(item.roleTitle);
    const services = serviceList(item);
    const servicesMarkup = services.length
      ? `<ul class="al-dir-services-list">${services.map(service => `<li><span class="al-dir-check" aria-hidden="true">✓</span><span>${escapeHtml(service)}</span></li>`).join('')}</ul>`
      : '<span class="al-dir-services-empty">Service details not added yet</span>';
    return `<article class="al-dir-card"><div class="al-dir-person">${avatar(item)}<div class="al-dir-person-copy"><h3>${escapeHtml(item.name)}</h3>${role ? `<p>${escapeHtml(role)}</p>` : ''}</div></div><div class="al-dir-services"><strong>Services</strong>${servicesMarkup}</div><a class="al-dir-select" href="${API_BASE}/book/${encodeURIComponent(serviceId)}?staffId=${encodeURIComponent(item.id)}" aria-label="Select ${escapeHtml(item.name)}"><span>Select</span><span aria-hidden="true">›</span></a></article>`;
  }

  async function directory(root) {
    const id = String(root.dataset.ruleId || '').trim();
    const shopId = String(root.dataset.shopId || '').trim();
    const productId = String(root.dataset.productId || '').trim();
    if (!id && !(shopId && productId)) return missing(root);
    const identity = id ? `ruleId=${encodeURIComponent(id)}` : `shopId=${encodeURIComponent(shopId)}&productId=${encodeURIComponent(productId)}`;
    try {
      const payload = await json(`/api/public/staff-directory?${identity}&placement=staff_directory`);
      if (!payload.staff?.length) {
        root.innerHTML = '<div class="al-page-empty"><strong>No public staff profiles yet</strong><span>Enable “Show in Staff Directory” for assigned staff in Appointment Lite.</span></div>';
        return;
      }
      const serviceId = String(payload.service?.id || id);
      applyTheme(root, payload.storefront || {});
      root.innerHTML = `<section class="al-dir"><div class="al-dir-head"><span class="al-page-kicker">TEAM BOOKING</span><h2>${escapeHtml(root.dataset.heading || 'Meet our team')}</h2><p>Select a team member for <strong>${escapeHtml(payload.service.title)}</strong>, then continue to their available calendar.</p></div><div class="al-dir-grid">${payload.staff.map(item => staffCard(item, serviceId)).join('')}</div></section>`;
    } catch (error) {
      root.innerHTML = `<div class="al-page-empty"><strong>Team unavailable</strong><span>${escapeHtml(error.message)}</span></div>`;
    }
  }

  function scan() {
    document.querySelectorAll('[data-al-page-booking]:not([data-al-ready])').forEach(root => { root.dataset.alReady = VERSION; booking(root); });
    document.querySelectorAll('[data-al-staff-directory]:not([data-al-ready])').forEach(root => { root.dataset.alReady = VERSION; directory(root); });
  }

  scan();
  document.addEventListener('shopline:section:load', scan);
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
