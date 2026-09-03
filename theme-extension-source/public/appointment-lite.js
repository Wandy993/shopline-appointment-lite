(() => {
  const VERSION = '0.8.9';
  const API_BASE = 'https://appointment.toolkit.fans';
  const CACHE_TTL = 5 * 60 * 1000;
  const RULE_CACHE = new Map();
  const SELECTOR = '[data-appointment-lite]:not([data-al-ready])';
  const PREFIX = '[Appointment Lite]';
  const GOOGLE_G_ICON = `<span class="al-google-g" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.24-.2-1.8H12v3.28h5.52a4.72 4.72 0 0 1-2.05 3.01l-.02.11 2.98 2.31.21.02c1.93-1.78 3.04-4.4 3.04-6.93Z"/><path fill="#34A853" d="M12 22c2.76 0 5.08-.91 6.78-2.48l-3.23-2.5c-.86.6-2.04 1.01-3.55 1.01a6.17 6.17 0 0 1-5.83-4.26l-.1.01-3.1 2.4-.04.1A10.24 10.24 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.17 13.77A6.3 6.3 0 0 1 5.83 12c0-.62.12-1.22.33-1.78l-.01-.12-3.14-2.44-.1.05A10 10 0 0 0 1.82 12c0 1.55.38 3.02 1.08 4.29l3.27-2.52Z"/><path fill="#EA4335" d="M12 5.97c1.92 0 3.22.83 3.97 1.52l2.88-2.81C17.08 3.03 14.76 2 12 2a10.24 10.24 0 0 0-9.08 5.71l3.24 2.51A6.19 6.19 0 0 1 12 5.97Z"/></svg></span>`;
  const ZOOM_LOGO_URL = 'https://media.zoom.com/images/assets/zoom-logo-2025.png/Zz04ZjU1ODA4OGM5NjUxMWYwYWQ3NDIyZTYxNWM4NmY4Yg%3D%3D';

  if (window.AppointmentLiteDebug?.scan) {
    console.info(PREFIX, 'Asset executed again; rescanning.', { version: window.AppointmentLiteDebug.version });
    window.AppointmentLiteDebug.scan(document);
    return;
  }

  const debug = window.AppointmentLiteDebug = {
    version: VERSION,
    apiBase: API_BASE,
    designMode: Boolean(window.Shopline?.designMode),
    widgets: [],
    scan: null,
    observer: null
  };
  const info = (message, details) => console.info(PREFIX, message, details ?? '');
  const warn = (message, details) => console.warn(PREFIX, message, details ?? '');
  const failure = (message, details) => console.error(PREFIX, message, details ?? '');

  info('Theme asset loaded.', {
    version: VERSION,
    apiBase: API_BASE,
    designMode: debug.designMode,
    globalStoreId: String(window.Shopline?.storeId || '')
  });

  function text(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  }


  function meetingBrandMarkup(meeting) {
    const provider = text(meeting?.providerName || 'Online meeting');
    if (meeting?.provider === 'zoom') {
      return `<span class="al-meeting-brand al-meeting-brand--zoom"><img src="${ZOOM_LOGO_URL}" alt="Zoom" loading="lazy" decoding="async"></span>`;
    }
    return `<span class="al-meeting-brand al-meeting-brand--text">${provider}</span>`;
  }

  function onlineMeetingAction(meeting, context = 'success') {
    if (!meeting?.url) return '';
    const label = text(meeting.label || 'Join meeting');
    const contextClass = context === 'manage' ? ' al-meeting-actions--manage' : '';
    return `<div class="al-meeting-actions${contextClass}"><a class="al-meeting-link" href="${text(meeting.url)}" target="_blank" rel="noopener noreferrer">${meetingBrandMarkup(meeting)}<span class="al-meeting-link-label">${label}</span></a></div>`;
  }

  const defaultStorefrontSettings = {
    appearance: { template: 'warm_luxe', backgroundIntensity: 'medium', cornerStyle: 'rounded', primaryStyle: 'template', unifiedBookingFlow: true },
    button: { label: 'Book an appointment', backgroundColor: '#2F6FED', textColor: '#FFFFFF', width: 'content', alignment: 'left', borderRadius: 8 },
    modal: { title: 'Book an appointment', accentColor: '#2F6FED', primaryTextColor: '#FFFFFF', primaryButtonWidth: 'content', primaryButtonAlignment: 'right', showServiceSummary: true, showTimezoneSelector: true, showPhone: true, showNotes: true, showFooterNote: true }
  };
  const bookingThemePresets = {
    minimal_light: { accent: '#344054', primaryText: '#FFFFFF', surface: '#FFFFFF', soft: '#F7F8FA', text: '#1D2939', muted: '#667085', line: '#E4E7EC', success: '#5D8A70', backgrounds: { soft: '#FAFBFC', medium: '#F5F7F9', strong: '#EEF1F4' } },
    warm_luxe: { accent: '#4B342B', primaryText: '#FFFDFC', surface: '#FFFDFC', soft: '#F5ECE5', text: '#2C211D', muted: '#74645C', line: '#E4D6CD', success: '#6F8B73', backgrounds: { soft: '#FAF6F2', medium: '#F3EBE4', strong: '#E9DDD4' } },
    soft_editorial: { accent: '#252722', primaryText: '#FFFFFF', surface: '#FCFCF8', soft: '#F2F1EC', text: '#22231F', muted: '#6D6D66', line: '#DDDDD5', success: '#68856F', backgrounds: { soft: '#FAFAF7', medium: '#F1F1EC', strong: '#E7E7E0' } }
  };
  const bookingCornerRadius = { soft: 14, rounded: 22, square_soft: 10 };

  function bookingThemeTokens(settings, { bookingStep = false } = {}) {
    const appearance = settings.appearance || defaultStorefrontSettings.appearance;
    const useTemplate = !bookingStep || appearance.unifiedBookingFlow !== false;
    const preset = bookingThemePresets[useTemplate ? appearance.template : 'minimal_light'] || bookingThemePresets.warm_luxe;
    const intensity = useTemplate && ['soft', 'medium', 'strong'].includes(appearance.backgroundIntensity) ? appearance.backgroundIntensity : 'soft';
    const custom = !useTemplate || appearance.primaryStyle === 'custom';
    return {
      ...preset,
      background: preset.backgrounds[intensity] || preset.backgrounds.medium,
      accent: custom ? settings.modal.accentColor : preset.accent,
      primaryText: custom ? settings.modal.primaryTextColor : preset.primaryText,
      triggerAccent: appearance.primaryStyle === 'custom' ? settings.button.backgroundColor : preset.accent,
      triggerText: appearance.primaryStyle === 'custom' ? settings.button.textColor : preset.primaryText,
      radius: bookingCornerRadius[useTemplate ? appearance.cornerStyle : 'soft'] || bookingCornerRadius.rounded,
      template: useTemplate ? appearance.template : 'minimal_light',
      intensity
    };
  }

  function applyThemeVariables(element, settings, { bookingStep = false } = {}) {
    const theme = bookingThemeTokens(settings, { bookingStep });
    element.dataset.alTheme = theme.template;
    element.dataset.alIntensity = theme.intensity;
    element.style.setProperty('--al-accent', theme.accent);
    element.style.setProperty('--al-primary-text', theme.primaryText);
    element.style.setProperty('--al-theme-bg', theme.background);
    element.style.setProperty('--al-theme-surface', theme.surface);
    element.style.setProperty('--al-theme-soft', theme.soft);
    element.style.setProperty('--al-theme-text', theme.text);
    element.style.setProperty('--al-theme-muted', theme.muted);
    element.style.setProperty('--al-theme-line', theme.line);
    element.style.setProperty('--al-theme-success', theme.success);
    element.style.setProperty('--al-theme-radius', `${theme.radius}px`);
    element.style.setProperty('--al-theme-radius-sm', `${Math.max(8, Math.round(theme.radius * .55))}px`);
    return theme;
  }

  function storefrontSettings(input = {}) {
    const hex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;
    const radius = Number(input.button?.borderRadius);
    return {
      appearance: {
        ...defaultStorefrontSettings.appearance,
        ...(input.appearance || {}),
        template: Object.prototype.hasOwnProperty.call(bookingThemePresets, input.appearance?.template) ? input.appearance.template : defaultStorefrontSettings.appearance.template,
        backgroundIntensity: ['soft', 'medium', 'strong'].includes(input.appearance?.backgroundIntensity) ? input.appearance.backgroundIntensity : defaultStorefrontSettings.appearance.backgroundIntensity,
        cornerStyle: ['soft', 'rounded', 'square_soft'].includes(input.appearance?.cornerStyle) ? input.appearance.cornerStyle : defaultStorefrontSettings.appearance.cornerStyle,
        primaryStyle: input.appearance?.primaryStyle === 'custom' ? 'custom' : 'template',
        unifiedBookingFlow: input.appearance?.unifiedBookingFlow !== false
      },
      button: {
        label: String(input.button?.label || defaultStorefrontSettings.button.label).trim().slice(0, 60) || defaultStorefrontSettings.button.label,
        backgroundColor: hex(input.button?.backgroundColor, defaultStorefrontSettings.button.backgroundColor),
        textColor: hex(input.button?.textColor, defaultStorefrontSettings.button.textColor),
        width: input.button?.width === 'full' ? 'full' : 'content',
        alignment: ['left', 'center', 'right'].includes(input.button?.alignment) ? input.button.alignment : 'left',
        borderRadius: Number.isFinite(radius) ? Math.min(24, Math.max(0, Math.round(radius))) : defaultStorefrontSettings.button.borderRadius
      },
      modal: {
        title: String(input.modal?.title || defaultStorefrontSettings.modal.title).trim().slice(0, 80) || defaultStorefrontSettings.modal.title,
        accentColor: hex(input.modal?.accentColor, defaultStorefrontSettings.modal.accentColor),
        primaryTextColor: hex(input.modal?.primaryTextColor, defaultStorefrontSettings.modal.primaryTextColor),
        primaryButtonWidth: input.modal?.primaryButtonWidth === 'full' ? 'full' : 'content',
        primaryButtonAlignment: ['left', 'center', 'right'].includes(input.modal?.primaryButtonAlignment) ? input.modal.primaryButtonAlignment : 'right',
        showServiceSummary: input.modal?.showServiceSummary !== false,
        showTimezoneSelector: input.modal?.showTimezoneSelector !== false,
        showPhone: input.modal?.showPhone !== false,
        showNotes: input.modal?.showNotes !== false,
        showFooterNote: input.modal?.showFooterNote !== false
      }
    };
  }

  function applyStorefrontToWidget(widget, settings) {
    widget.__appointmentLiteStorefront = settings;
    widget.dataset.alButtonWidth = settings.button.width;
    widget.dataset.alButtonAlign = settings.button.alignment;
    const theme = applyThemeVariables(widget, settings);
    widget.style.setProperty('--al-trigger-bg', theme.triggerAccent);
    widget.style.setProperty('--al-trigger-text', theme.triggerText);
    widget.style.setProperty('--al-trigger-radius', `${settings.button.borderRadius}px`);
    const trigger = widget.querySelector('.al-trigger');
    if (trigger) trigger.textContent = settings.button.label;
  }

  function storefrontForWidget(widget) {
    return widget?.__appointmentLiteStorefront || storefrontSettings();
  }


  function validTimeZone(value) {
    try { new Intl.DateTimeFormat('en', { timeZone: value }).format(new Date()); return true; } catch { return false; }
  }

  function supportedTimeZones(primary = 'UTC', secondary = 'UTC') {
    const common = ['UTC','Asia/Shanghai','Asia/Singapore','Asia/Tokyo','Europe/London','Europe/Paris','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Australia/Sydney'];
    let values = [];
    try { values = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []; } catch {}
    return [...new Set([primary, secondary, ...common, ...values].filter(validTimeZone))];
  }

  function positionTimezoneMenu(trigger, menu) {
    if (!trigger || !menu || menu.hidden || window.matchMedia('(max-width: 540px)').matches) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(260, rect.width);
    const estimatedHeight = Math.min(286, Math.max(180, menu.scrollHeight || 240));
    const below = window.innerHeight - rect.bottom;
    const top = below >= estimatedHeight + 18 ? rect.bottom + 6 : Math.max(12, rect.top - estimatedHeight - 6);
    menu.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.left))}px`;
    menu.style.top = `${top}px`;
    menu.style.width = `${Math.min(width, window.innerWidth - 24)}px`;
  }

  function clearFloatingTimezoneMenu(menu) {
    if (!menu) return;
    menu.style.left = ''; menu.style.top = ''; menu.style.width = '';
  }

  function zonedParts(instant, timezone) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
  }

  function wallTimeToInstant(date, time, timezone) {
    const [year, month, day] = String(date).split('-').map(Number);
    const [hour, minute] = String(time).split(':').map(Number);
    let instant = new Date(Date.UTC(year, month - 1, day, hour, minute));
    for (let i = 0; i < 3; i += 1) {
      const seen = zonedParts(instant, timezone);
      const wanted = Date.UTC(year, month - 1, day, hour, minute);
      const [seenYear, seenMonth, seenDay] = seen.date.split('-').map(Number);
      const [seenHour, seenMinute] = seen.time.split(':').map(Number);
      const seenWall = Date.UTC(seenYear, seenMonth - 1, seenDay, seenHour, seenMinute);
      const delta = wanted - seenWall;
      if (!delta) break;
      instant = new Date(instant.getTime() + delta);
    }
    return instant;
  }

  const staffPresetClasses = new Set(['aurora', 'ocean', 'mint', 'peach', 'violet', 'sunset', 'sky', 'rose', 'nova']);
  const staffAvatarFiles = { aurora:'staff-1.webp', ocean:'staff-2.webp', mint:'staff-3.webp', peach:'staff-4.webp', violet:'staff-5.webp', sunset:'staff-6.webp', sky:'staff-7.webp', rose:'staff-8.webp', nova:'staff-9.webp' };
  function staffPresetImage(preset){const file=staffAvatarFiles[preset]||staffAvatarFiles.aurora;return `<img src="${API_BASE}/assets/staff/${file}?v=0.8.9" alt="" loading="lazy" decoding="async">`;}

  function staffAvatar(item, className = '') {
    const avatar = item?.avatar || {};
    const initial = text(String(item?.name || '?').trim().slice(0, 1).toUpperCase() || '?');
    if (avatar.kind === 'custom' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(avatar.value || ''))) {
      return `<span class="al-staff-avatar ${className}"><img src="${text(avatar.value)}" alt=""></span>`;
    }
    if (avatar.kind === 'initials') return `<span class="al-staff-avatar al-staff-initials ${className}">${initial}</span>`;
    const preset = staffPresetClasses.has(avatar.value) ? avatar.value : 'aurora';
    return `<span class="al-staff-avatar al-staff-preset-${preset} ${className}">${staffPresetImage(preset)}</span>`;
  }

  function apiUrl(path, params = {}) {
    const target = new URL(path, `${API_BASE}/`);
    Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
    return target;
  }

  const requestWait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function requestJson(target, options = {}, label = 'request') {
    const method = String(options.method || 'GET').toUpperCase();
    const attempts = method === 'GET' ? 2 : 1;
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      info(`${label}: request started.`, { method, attempt: attempt + 1, url: target.toString() });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let abortHandler;
      if (options.signal) {
        if (options.signal.aborted) controller.abort();
        else {
          abortHandler = () => controller.abort();
          options.signal.addEventListener('abort', abortHandler, { once: true });
        }
      }
      try {
        const { signal: _ignored, ...requestOptions } = options;
        const response = await fetch(target, { ...requestOptions, signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          info(`${label}: request succeeded.`, { status: response.status, attempt: attempt + 1, url: target.toString() });
          return payload;
        }
        const error = Object.assign(new Error(payload.message || `Request failed with HTTP ${response.status}`), { status: response.status, payload });
        warn(`${label}: API rejected the request.`, { status: response.status, error: payload.error, message: error.message, url: target.toString() });
        if (attempt + 1 < attempts && (response.status === 429 || response.status >= 500)) {
          lastError = error;
          await requestWait(250 * (attempt + 1));
          continue;
        }
        throw error;
      } catch (error) {
        lastError = error;
        const retryable = error?.name === 'AbortError' || !Number(error?.status) || Number(error?.status) === 429 || Number(error?.status) >= 500;
        if (attempt + 1 < attempts && retryable) {
          await requestWait(250 * (attempt + 1));
          continue;
        }
        if (error?.name === 'AbortError') {
          const timeoutError = Object.assign(new Error('Availability request timed out. Please try again.'), { code: 'REQUEST_TIMEOUT' });
          failure(`${label}: request timed out.`, { url: target.toString() });
          throw timeoutError;
        }
        failure(`${label}: network or CORS failure.`, { url: target.toString(), message: error.message });
        throw error;
      } finally {
        clearTimeout(timeout);
        if (options.signal && abortHandler) options.signal.removeEventListener('abort', abortHandler);
      }
    }
    throw lastError || new Error('Request failed.');
  }

  function emptyAvailabilityMessage(payload = {}) {
    const reason = String(payload.reason || '');
    if (reason === 'SERVICE_CLOSED') return 'This service is not available on this date. Staff special hours do not open a closed service date.';
    if (reason === 'POLICY_BLOCKED') return 'This date is outside the service booking notice or booking window.';
    if (reason === 'CAPACITY_FULL') return 'This date is fully booked.';
    if (reason === 'STAFF_UNAVAILABLE') return "The selected staff member is not available during this service's bookable times on this date.";
    if (reason === 'STAFF_SELECTION_REQUIRED') return 'Choose a staff member to see availability.';
    return 'No times available on this date.';
  }



  const calendarMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function calendarDateFromKey(key) {
    const [year, month, day] = String(key || '').split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function calendarDateKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function calendarMonthKey(dateString) {
    const date = calendarDateFromKey(dateString);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }

  function calendarShiftMonth(cursor, amount) {
    const date = calendarDateFromKey(cursor);
    date.setUTCMonth(date.getUTCMonth() + amount, 1);
    return calendarDateKey(date);
  }

  function calendarServiceOpen(rule, date, mode) {
    if (rule.dateFrom && date < rule.dateFrom) return false;
    if (rule.dateUntil && date > rule.dateUntil) return false;
    const exception = (rule.availabilityExceptions || []).find(item => item.date === date);
    if (exception) return !exception.closed && (mode === 'all_day' || (exception.windows || []).length > 0);
    const weekday = calendarDateFromKey(date).getUTCDay();
    const schedule = (rule.weeklyAvailability || []).find(item => Number(item.weekday) === weekday);
    return Boolean(schedule?.enabled && (mode === 'all_day' || (schedule.windows || []).length > 0));
  }

  function contextFor(widget) {
    return {
      shopId: String(widget.dataset.shopId || window.Shopline?.storeId || '').trim(),
      productId: String(widget.dataset.productId || '').trim()
    };
  }

  function cachedRule(context) {
    const key = `${VERSION}:${context.shopId}:${context.productId}`;
    const hit = RULE_CACHE.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      info('Rule cache hit.', { ...context, ageMs: Date.now() - hit.at });
      return hit.promise;
    }
    info('Rule cache miss.', context);
    const promise = requestJson(apiUrl('/api/public/rule', context), {}, 'rule').catch(error => { RULE_CACHE.delete(key); throw error; });
    RULE_CACHE.set(key, { at: Date.now(), promise });
    return promise;
  }

  function receiptKey(context) {
    return `al-booking:${context.shopId}:${context.productId}`;
  }

  function readBookingReceipt(context, storeDate = '') {
    try {
      const receipt = JSON.parse(localStorage.getItem(receiptKey(context)));
      const today = storeDate || new Date().toISOString().slice(0, 10);
      const occurrenceDates = Array.isArray(receipt?.occurrences) ? receipt.occurrences.map(item => String(item?.date || '')).filter(Boolean).sort() : [];
      const finalDate = receipt?.bookingMode === 'multi_slot' && occurrenceDates.length ? occurrenceDates[occurrenceDates.length - 1] : receipt?.date;
      if (!receipt || receipt.status !== 'confirmed' || !receipt.date || (receipt.bookingMode !== 'all_day' && receipt.bookingMode !== 'multi_slot' && !receipt.time) || !finalDate || finalDate < today) {
        if (receipt) localStorage.removeItem(receiptKey(context));
        return null;
      }
      return receipt;
    } catch (error) {
      warn('Booking receipt could not be read; continuing without device status.', { message: error.message });
      return null;
    }
  }

  function saveBookingReceipt(context, booking, existingToken = '') {
    const receipt = {
      id: String(booking.id || ''),
      date: String(booking.date || ''),
      time: String(booking.time || ''),
      bookingMode: String(booking.bookingMode || 'slot'),
      occurrences: Array.isArray(booking.occurrences) ? booking.occurrences.map(item => ({ date: String(item.date || ''), time: String(item.time || '') })) : [],
      location: String(booking.location || ''),
      staff: String(booking.staff || ''),
      timezone: String(booking.timezone || ''),
      meeting: booking.meeting?.url ? {
        provider: String(booking.meeting.provider || 'custom'),
        providerName: String(booking.meeting.providerName || 'Online meeting'),
        label: String(booking.meeting.label || 'Join meeting'),
        url: String(booking.meeting.url || '')
      } : null,
      status: 'confirmed',
      customerRescheduleCount: Number(booking.customerRescheduleCount || 0),
      managementToken: String(booking.managementToken || existingToken || ''),
      savedAt: Date.now()
    };
    try {
      localStorage.setItem(receiptKey(context), JSON.stringify(receipt));
      info('Booking receipt saved on this device.', { ...context, bookingId: receipt.id, date: receipt.date, time: receipt.time });
    } catch (error) {
      warn('Booking receipt could not be saved on this device.', { message: error.message });
    }
    return receipt;
  }


  function bookingWhenText(booking) {
    const mode = booking.bookingMode || 'slot';
    const occurrences = Array.isArray(booking.occurrences) ? booking.occurrences : [];
    if (mode === 'all_day') return `${booking.date} · All day`;
    if (mode === 'multi_slot') return occurrences.map(item => `${item.date} ${item.time}`).join(' · ');
    return `${booking.date} at ${booking.time}`;
  }

  function bookingWhenHtml(booking) {
    const mode = booking.bookingMode || 'slot';
    const occurrences = Array.isArray(booking.occurrences) ? booking.occurrences : [];
    if (mode === 'multi_slot' && occurrences.length) return `<div class="al-session-summary">${occurrences.map(item => `<span>${text(displayOccurrence(item))}</span>`).join('')}</div>`;
    return `<strong>${text(bookingWhenText(booking))}</strong>`;
  }

  function renderBookingState(widget, rule, context, suppliedReceipt) {
    widget.querySelector('.al-booked')?.remove();
    const trigger = widget.querySelector('.al-trigger');
    const receipt = suppliedReceipt || readBookingReceipt(context, rule.storeDate);
    if (!receipt) {
      widget.classList.remove('al-widget--booked');
      trigger.hidden = false;
      trigger.removeAttribute('aria-hidden');
      trigger.style.removeProperty('display');
      return;
    }
    widget.classList.add('al-widget--booked');
    trigger.hidden = true;
    trigger.setAttribute('aria-hidden', 'true');
    trigger.style.setProperty('display', 'none', 'important');
    const details = [receipt.location, receipt.staff].filter(Boolean).map(text).join(' · ');
    const timezone = receipt.timezone || rule.timezone || 'UTC';
    const status = document.createElement('section');
    status.className = 'al-booked';
    status.setAttribute('aria-label', 'Appointment booked');
    status.innerHTML = `<div class="al-booked-copy"><span class="al-booked-label">Appointment booked</span>${bookingWhenHtml(receipt)}${details ? `<span>${details}</span>` : ''}<span>Service time zone: ${text(timezone)}</span><small>${receipt.managementToken ? 'Manage this appointment from this device' : 'Contact the store to change this appointment'}</small></div>${receipt.managementToken ? '<button type="button" class="al-secondary">Manage appointment</button>' : ''}`;
    status.querySelector('.al-secondary')?.addEventListener('click', () => openManage(widget, rule, context, receipt));
    trigger.insertAdjacentElement('afterend', status);
    info('Stored booking status rendered.', { ...context, bookingId: receipt.id, date: receipt.date, time: receipt.time });
  }

  async function syncBookingState(widget, rule, context, receipt) {
    if (!receipt?.id) return;
    try {
      const payload = await requestJson(apiUrl(`/api/public/bookings/${receipt.id}/status`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(receipt.managementToken
          ? { managementToken: receipt.managementToken }
          : { shopId: context.shopId, productId: context.productId })
      }, 'booking status');
      if (payload.booking.status !== 'confirmed') {
        localStorage.removeItem(receiptKey(context));
        renderBookingState(widget, rule, context);
        return;
      }
      if (receipt.managementToken) {
        const refreshed = saveBookingReceipt(context, payload.booking, receipt.managementToken);
        renderBookingState(widget, rule, context, refreshed);
      }
    } catch (error) {
      if (error.status === 404) {
        localStorage.removeItem(receiptKey(context));
        renderBookingState(widget, rule, context);
      } else {
        warn('Booking status refresh failed; keeping the local receipt.', { ...context, status: error.status, message: error.message });
      }
    }
  }

  function showEditorDiagnostic(widget, message) {
    if (!window.Shopline?.designMode) return;
    widget.hidden = false;
    const trigger = widget.querySelector('.al-trigger');
    if (trigger) trigger.hidden = true;
    const live = widget.querySelector('.al-live');
    if (live) live.textContent = `${PREFIX} ${message} Open the preview console for details.`;
  }

  async function productStaffDirectory(rule, context) {
    if (rule.staffAssignment?.mode !== 'customer_choice' || rule.storefrontPlacement?.staffDirectory !== true) return [];
    try {
      const payload = await requestJson(apiUrl('/api/public/staff-directory', {
        ruleId: rule.id,
        productId: context.productId,
        placement: 'staff_directory'
      }), {}, 'staff directory');
      return Array.isArray(payload.staff) ? payload.staff : [];
    } catch (error) {
      warn('Staff Directory could not be loaded; opening the standard booking flow.', { ...context, ruleId: rule.id, status: error.status, message: error.message });
      return [];
    }
  }

  function publicProfileValue(value = '') {
    const normalized = String(value || '').trim();
    if (!normalized || /^(?:select|choose)\s+(?:a\s+)?(?:state|region|location|option)(?:\.\.\.)?$/i.test(normalized)) return '';
    return normalized;
  }

  function publicServiceList(item = {}) {
    return [...new Set((Array.isArray(item.supportedServices) ? item.supportedServices : [])
      .map(publicProfileValue)
      .filter(Boolean))].slice(0, 12);
  }

  function staffPickerCaption(item = {}) {
    return [publicProfileValue(item.roleTitle), publicProfileValue(item.expertise)].filter(Boolean).slice(0, 2).join(' · ') || 'View availability';
  }

  function openStaffDirectory(widget, rule, context, staff) {
    if (!Array.isArray(staff) || !staff.length) {
      open(widget, rule, context);
      return;
    }
    const dialog = document.createElement('dialog');
    const storefront = storefrontForWidget(widget);
    const serviceTitle = publicProfileValue(rule.serviceTitle || rule.productTitle) || 'Appointment';
    const cards = staff.map(item => {
      const role = publicProfileValue(item.roleTitle);
      const services = publicServiceList(item);
      const servicesMarkup = services.length
        ? `<ul class="al-directory-services-list">${services.map(service => `<li><span class="al-directory-check" aria-hidden="true">✓</span><span>${text(service)}</span></li>`).join('')}</ul>`
        : '<span class="al-directory-services-empty">Service details not added yet</span>';
      return `<article class="al-directory-card"><div class="al-directory-person">${staffAvatar(item, 'al-directory-avatar')}<div class="al-directory-person-copy"><h3>${text(item.name)}</h3>${role ? `<p>${text(role)}</p>` : ''}</div></div><div class="al-directory-services"><strong>Services</strong>${servicesMarkup}</div><button type="button" class="al-directory-book" data-book-with-staff="${text(item.id)}" aria-label="Select ${text(item.name)}"><span>Select</span><span aria-hidden="true">›</span></button></article>`;
    }).join('');
    dialog.innerHTML = `<div class="al-head al-directory-head"><div><span class="al-directory-kicker">TEAM BOOKING</span><h2>Choose your specialist</h2><p>Select a team member for <strong>${text(serviceTitle)}</strong>, then continue to their available calendar.</p></div><button class="al-close" type="button" aria-label="Close">×</button></div><div class="al-directory-body"><div class="al-directory-grid">${cards}</div></div>`;
    mountDialog(dialog, 'al-staff-directory-dialog', storefront);
    dialog.querySelectorAll('[data-book-with-staff]').forEach(button => button.addEventListener('click', () => {
      const staffId = String(button.dataset.bookWithStaff || '');
      dialog.close();
      setTimeout(() => open(widget, rule, context, { staffId }), 0);
    }));
  }

  async function init(widget) {
    widget.dataset.alReady = 'true';
    widget.dataset.alStatus = 'initializing';
    const context = contextFor(widget);
    debug.widgets.push({ element: widget, ...context });
    info('Initializing App Block.', { ...context, element: widget });

    if (!/^\d{3,32}$/.test(context.shopId)) {
      widget.dataset.alStatus = 'missing-shop-id';
      failure('App Block stopped: SHOPLINE store ID is missing or invalid.', {
        ...context,
        blockShopId: widget.dataset.shopId,
        globalStoreId: window.Shopline?.storeId
      });
      showEditorDiagnostic(widget, 'Store ID is missing.');
      return;
    }
    if (!context.productId) {
      widget.dataset.alStatus = 'missing-product-id';
      failure('App Block stopped: product.id was not rendered.', context);
      showEditorDiagnostic(widget, 'Product ID is missing.');
      return;
    }

    try {
      const payload = await cachedRule(context);
      const rule = { ...payload.rule, timezone: payload.timezone || 'UTC', storeDate: payload.storeDate || '' };
      const storefront = storefrontSettings(payload.storefront || {});
      applyStorefrontToWidget(widget, storefront);
      widget.hidden = false;
      widget.dataset.alStatus = 'ready';
      const trigger = widget.querySelector('.al-trigger');
      trigger.addEventListener('click', async () => {
        trigger.disabled = true;
        try {
          const staff = await productStaffDirectory(rule, context);
          if (staff.length) openStaffDirectory(widget, rule, context, staff);
          else open(widget, rule, context);
        } finally { trigger.disabled = false; }
      });
      const receipt = readBookingReceipt(context, rule.storeDate);
      renderBookingState(widget, rule, context, receipt);
      syncBookingState(widget, rule, context, receipt);
      info('App Block is visible and ready.', { ...context, ruleId: rule.id, productTitle: rule.serviceTitle || rule.productTitle, timezone: rule.timezone });
    } catch (error) {
      widget.dataset.alStatus = error.status === 404 ? 'no-rule' : 'error';
      if (error.status === 404 && error.payload?.message === 'Store not found.') {
        warn('App Block remains hidden: this store ID is not linked to an installed app record yet.', context);
        showEditorDiagnostic(widget, 'Store metadata is not synchronized yet. Open the app admin once, then refresh this preview.');
      } else if (error.status === 404) {
        info('App Block remains hidden: no enabled rule matches this product.', context);
        showEditorDiagnostic(widget, `No enabled appointment rule matches product ${context.productId}.`);
      } else {
        failure('App Block remains hidden because initialization failed.', { ...context, status: error.status, message: error.message });
        showEditorDiagnostic(widget, 'Initialization failed.');
      }
    }
  }

  function scan(root = document) {
    const widgets = [];
    if (root instanceof Element && root.matches(SELECTOR)) widgets.push(root);
    if (root.querySelectorAll) widgets.push(...root.querySelectorAll(SELECTOR));
    if (widgets.length) info('Scanning newly rendered theme content.', { widgetCount: widgets.length });
    widgets.forEach(widget => init(widget));
  }

  debug.scan = scan;
  scan(document);

  document.addEventListener('shopline:section:load', event => {
    info('Theme editor section re-rendered; rescanning.', { detail: event.detail });
    scan(event.target);
  });
  document.addEventListener('shopline:block:select', event => {
    info('Theme editor selected a block; rescanning.', { detail: event.detail });
    scan(event.target);
  });

  debug.observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      }
    }
  });
  debug.observer.observe(document.documentElement, { childList: true, subtree: true });

  let dialogLockDepth = 0;
  let dialogScrollY = 0;

  function lockPageForDialog() {
    dialogLockDepth += 1;
    if (dialogLockDepth > 1) return;
    dialogScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('al-dialog-open');
    document.body.classList.add('al-dialog-open');
    document.body.style.setProperty('--al-dialog-scroll-y', `-${dialogScrollY}px`);
  }

  function unlockPageForDialog() {
    if (!dialogLockDepth) return;
    dialogLockDepth -= 1;
    if (dialogLockDepth) return;
    document.documentElement.classList.remove('al-dialog-open');
    document.body.classList.remove('al-dialog-open');
    document.body.style.removeProperty('--al-dialog-scroll-y');
    window.scrollTo(0, dialogScrollY);
  }

  function mountDialog(dialog, variant = '', settings = storefrontSettings()) {
    dialog.className = ['al-dialog', variant].filter(Boolean).join(' ');
    applyThemeVariables(dialog, settings, { bookingStep: variant === 'al-booking-dialog' });
    if (variant === 'al-booking-dialog') {
      dialog.dataset.alPrimaryWidth = settings.modal.primaryButtonWidth;
      dialog.dataset.alPrimaryAlign = settings.modal.primaryButtonAlignment;
    }
    document.body.append(dialog);
    dialog.showModal();
    lockPageForDialog();
    dialog.querySelector('.al-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      unlockPageForDialog();
      dialog.remove();
    }, { once: true });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  async function refreshManageReceipt(context, rule, receipt) {
    if (!receipt?.managementToken || receipt.meeting?.url || rule?.locationMode !== 'online') return receipt;
    try {
      const payload = await requestJson(apiUrl(`/api/public/bookings/${receipt.id}/status`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ managementToken: receipt.managementToken })
      }, 'booking management refresh');
      if (payload.booking?.status === 'confirmed') return saveBookingReceipt(context, payload.booking, receipt.managementToken);
    } catch (error) {
      warn('Booking management refresh could not load online meeting details; using the local receipt.', { ...context, bookingId: receipt.id, status: error.status, message: error.message });
    }
    return receipt;
  }

  function appointmentDetails(receipt) {
    const details = [receipt.location, receipt.staff].filter(Boolean).map(text).join(' · ');
    return `<div class="al-manage-summary"><span>Current appointment</span>${bookingWhenHtml(receipt)}${details ? `<p>${details}</p>` : ''}${receipt.timezone ? `<p>Service time zone: ${text(receipt.timezone)}</p>` : ''}</div>`;
  }

  async function openManage(widget, rule, context, receipt) {
    receipt = await refreshManageReceipt(context, rule, receipt);
    info('Booking management dialog opened.', { ...context, bookingId: receipt.id, meetingProvider: receipt.meeting?.provider || '' });
    const dialog = document.createElement('dialog');
    const canReschedule = (receipt.bookingMode || 'slot') === 'slot' && Number(receipt.customerRescheduleCount || 0) < 1;
    const changeControl = (receipt.bookingMode || 'slot') !== 'slot'
      ? '<div class="al-limit"><strong>Contact the store to change this booking</strong><span>Online rescheduling is available for minute/hour appointments only.</span></div>'
      : canReschedule
        ? '<div class="al-notice"><strong>One online change available</strong><span>You can change this appointment once. After saving, contact the store for further changes.</span></div><button type="button" class="al-submit al-reschedule">Change date or time</button>'
        : '<div class="al-limit"><strong>Online change already used</strong><span>Please contact the store if you need to change this appointment again.</span></div>';
    const meetingCard = receipt.meeting?.url ? `<div class="al-manage-meeting"><div class="al-manage-meeting-copy"><span>Online meeting</span><strong>${text(receipt.meeting.providerName || 'Online meeting')}</strong></div>${onlineMeetingAction(receipt.meeting, 'manage')}</div>` : '';
    dialog.innerHTML = `<div class="al-head"><div><h2>Manage appointment</h2><p>${text(rule.serviceTitle || rule.productTitle)}</p></div><button class="al-close" type="button" aria-label="Close">×</button></div><div class="al-manage">${appointmentDetails(receipt)}${meetingCard}<div class="al-error" hidden role="alert"></div><div class="al-manage-actions">${changeControl}<button type="button" class="al-danger al-cancel">Cancel appointment</button></div></div>`;
    mountDialog(dialog, '', storefrontForWidget(widget));
    dialog.querySelector('.al-reschedule')?.addEventListener('click', () => {
      dialog.close();
      openReschedule(widget, rule, context, receipt);
    });
    dialog.querySelector('.al-cancel').addEventListener('click', () => {
      const actions = dialog.querySelector('.al-manage-actions');
      actions.innerHTML = '<div class="al-confirm-copy"><strong>Cancel this appointment?</strong><p>The reserved time will become available to other customers.</p></div><div class="al-confirm-actions"><button type="button" class="al-secondary al-keep">Keep appointment</button><button type="button" class="al-danger al-confirm-cancel">Yes, cancel</button></div>';
      actions.querySelector('.al-keep').addEventListener('click', () => {
        dialog.close();
        openManage(widget, rule, context, receipt);
      });
      actions.querySelector('.al-confirm-cancel').addEventListener('click', async event => {
        const button = event.currentTarget;
        const errorBox = dialog.querySelector('.al-error');
        button.disabled = true;
        button.textContent = 'Cancelling…';
        errorBox.hidden = true;
        try {
          await requestJson(apiUrl(`/api/public/bookings/${receipt.id}/cancel`), {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ managementToken: receipt.managementToken })
          }, 'booking cancellation');
          localStorage.removeItem(receiptKey(context));
          renderBookingState(widget, rule, context);
          dialog.querySelector('.al-manage').innerHTML = '<div class="al-success"><h3>Appointment cancelled</h3><p>Your reserved time has been released.</p><button class="al-submit" type="button">Done</button></div>';
          dialog.querySelector('.al-submit').addEventListener('click', () => dialog.close());
          info('Booking cancelled by customer.', { ...context, bookingId: receipt.id });
        } catch (error) {
          errorBox.textContent = error.message;
          errorBox.hidden = false;
          button.disabled = false;
          button.textContent = 'Yes, cancel';
          failure('Booking cancellation failed.', { ...context, bookingId: receipt.id, status: error.status, message: error.message });
        }
      });
    });
  }

  function bookingMaxDate(rule) {
    return [rule.dateUntil, rule.bookingWindowUntil].filter(Boolean).sort()[0] || '';
  }

  function maxDateAttribute(rule) {
    const value = bookingMaxDate(rule);
    return value ? `max="${text(value)}"` : '';
  }

  function openReschedule(widget, rule, context, receipt) {
    info('Booking reschedule dialog opened.', { ...context, bookingId: receipt.id });
    const dialog = document.createElement('dialog');
    const today = rule.storeDate || new Date().toISOString().slice(0, 10);
    const minDate = rule.dateFrom && rule.dateFrom > today ? rule.dateFrom : today;
    dialog.innerHTML = `<div class="al-head"><div><button type="button" class="al-back">← Back</button><h2>Change date or time</h2><p>${text(rule.serviceTitle || rule.productTitle)}</p></div><button class="al-close" type="button" aria-label="Close">×</button></div><form class="al-form"><div class="al-form-body">${appointmentDetails(receipt)}<div class="al-notice"><strong>This is your only online change</strong><span>After you save, contact the store if you need another change.</span></div><div class="al-grid"><div class="al-field"><label for="al-reschedule-date">New date</label><input id="al-reschedule-date" name="date" type="date" min="${minDate}" ${maxDateAttribute(rule)} required></div><div><span class="al-legend">New time</span><div class="al-times"><span class="al-muted">Choose a date first.</span></div></div></div><p class="al-muted">All times are shown in the service time zone: ${text(rule.timezone || 'UTC')}.</p></div><div class="al-actions"><div class="al-error" hidden role="alert"></div><button class="al-submit" type="submit">Save changes</button></div></form>`;
    mountDialog(dialog, '', storefrontForWidget(widget));
    dialog.querySelector('.al-back').addEventListener('click', () => {
      dialog.close();
      openManage(widget, rule, context, receipt);
    });
    const dateInput = dialog.querySelector('[name=date]');
    const times = dialog.querySelector('.al-times');
    let selectedTime = '';
    dateInput.addEventListener('change', async () => {
      selectedTime = '';
      times.innerHTML = '<span class="al-muted">Loading times…</span>';
      try {
        const payload = await requestJson(apiUrl('/api/public/availability', { ...context, date: dateInput.value }), {}, 'reschedule availability');
        times.innerHTML = payload.slots.length ? payload.slots.map(time => `<button type="button" class="al-time" data-time="${time}" aria-pressed="false">${time}</button>`).join('') : `<span class="al-muted">${text(emptyAvailabilityMessage(payload))}</span>`;
        times.querySelectorAll('.al-time').forEach(button => button.addEventListener('click', async () => {
          selectedTime = button.dataset.time;
          times.querySelectorAll('.al-time').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        }));
      } catch (error) {
        times.innerHTML = '<span class="al-muted">Could not load times. Please try another date.</span>';
      }
    });
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const errorBox = dialog.querySelector('.al-error');
      if (!selectedTime) {
        errorBox.textContent = 'Please select a new time.';
        errorBox.hidden = false;
        return;
      }
      const submit = dialog.querySelector('.al-submit');
      submit.disabled = true;
      submit.textContent = 'Saving…';
      errorBox.hidden = true;
      try {
        const payload = await requestJson(apiUrl(`/api/public/bookings/${receipt.id}/reschedule`), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ managementToken: receipt.managementToken, date: dateInput.value, time: selectedTime })
        }, 'booking reschedule');
        const refreshed = saveBookingReceipt(context, payload.booking, receipt.managementToken);
        renderBookingState(widget, rule, context, refreshed);
        dialog.querySelector('.al-form').innerHTML = `<div class="al-success"><h3>Appointment updated</h3><p>${text(payload.booking.date)} at ${text(payload.booking.time)}</p><p>Service time zone: ${text(payload.booking.timezone || rule.timezone || 'UTC')}</p><button class="al-submit" type="button">Done</button></div>`;
        dialog.querySelector('.al-submit').addEventListener('click', () => dialog.close());
        info('Booking rescheduled by customer.', { ...context, bookingId: receipt.id, date: payload.booking.date, time: payload.booking.time });
      } catch (error) {
        errorBox.textContent = error.payload?.error === 'RESCHEDULE_LIMIT' ? 'Your online change has already been used. Please contact the store.' : error.status === 409 ? 'That time is no longer available. Please choose another time.' : error.message;
        errorBox.hidden = false;
        submit.disabled = false;
        submit.textContent = 'Save changes';
        failure('Booking reschedule failed.', { ...context, bookingId: receipt.id, status: error.status, message: error.message });
      }
    });
  }

  function open(widget, rule, context, options = {}) {
    info('Booking dialog opened.', { ...context, ruleId: rule.id, bookingMode: rule.bookingMode || 'slot' });
    const dialog = document.createElement('dialog');
    const storefront = storefrontForWidget(widget);
    const modalSettings = storefront.modal;
    const mode = ['slot', 'all_day', 'multi_slot'].includes(rule.bookingMode) ? rule.bookingMode : 'slot';
    const serviceTimezone = validTimeZone(rule.timezone) ? rule.timezone : 'UTC';
    const detectedTimezone = validTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ? Intl.DateTimeFormat().resolvedOptions().timeZone : serviceTimezone;
    let customerTimezone = modalSettings.showTimezoneSelector ? detectedTimezone : serviceTimezone;
    const availabilityCache = new Map();
    let availabilityRequestId = 0;
    let availabilityLoadingTimer = null;
    const today = rule.storeDate || new Date().toISOString().slice(0, 10);
    const minDate = rule.dateFrom && rule.dateFrom > today ? rule.dateFrom : today;
    const maxDate = bookingMaxDate(rule);
    const modeMeta = mode === 'all_day' ? 'All-day booking' : mode === 'multi_slot' ? `${Number(rule.sessionsRequired || 3)} sessions` : `${rule.duration} minutes`;
    const staffMode = rule.staffAssignment?.mode || 'none';
    const staffOptions = Array.isArray(rule.staffOptions) ? rule.staffOptions : [];
    const requestedStaffId = String(options.staffId || '');
    const initialStaff = staffMode === 'customer_choice' ? staffOptions.find(item => String(item.id) === requestedStaffId) : null;
    const initialStaffId = initialStaff ? String(initialStaff.id) : '';
    const initialStaffValue = initialStaff
      ? `${staffAvatar(initialStaff, 'al-staff-small')}<span><strong>${text(initialStaff.name)}</strong><small>${text(staffPickerCaption(initialStaff))}</small></span>`
      : '<span class="al-staff-avatar al-staff-initials al-staff-small">?</span><span><strong>Choose staff</strong><small>Select a team member</small></span>';
    const staffSelector = staffMode === 'customer_choice' ? `<div class="al-field al-staff-choice"><label>Staff</label><div class="al-staff-picker"><button type="button" class="al-staff-trigger" aria-haspopup="listbox" aria-expanded="false"><span class="al-staff-value">${initialStaffValue}</span><span class="al-staff-chevron">⌄</span></button><div class="al-staff-menu" role="listbox" hidden>${staffOptions.map(item => `<button type="button" class="al-staff-option${String(item.id) === initialStaffId ? ' selected' : ''}" data-staff-id="${text(item.id)}">${staffAvatar(item, 'al-staff-small')}<span><strong>${text(item.name)}</strong><small>${text(staffPickerCaption(item))}</small></span><i>✓</i></button>`).join('')}</div><input type="hidden" name="staffId" value="${text(initialStaffId)}"></div><small>Availability updates for the selected staff member.</small></div>` : '';
    const managedStaffMeta = staffMode === 'fixed' && staffOptions[0] ? staffOptions[0].name : staffMode === 'any' ? 'Staff assigned automatically' : rule.staff;
    const metaParts = [modeMeta, rule.location, managedStaffMeta].filter(Boolean);
    const paid = rule.commerceMode === 'standalone_paid';
    const submitLabel = paid ? 'Continue to checkout' : 'Confirm booking';
    const actionNote = paid ? `Your selected time will be held for ${Number(rule.payment?.holdMinutes || 15)} minutes while you complete payment.` : 'You can reschedule or cancel your appointment later.';
    const serviceAddressField = rule.locationMode === 'customer_address' ? `<div class="al-field"><label for="al-service-address">Service address *</label><input id="al-service-address" name="serviceAddress" maxlength="300" autocomplete="street-address" placeholder="Enter the address for this appointment" required></div>` : '';
    const summaryMarkup = modalSettings.showServiceSummary ? `<div class="al-service-summary">${metaParts.map((value, index) => `<span>${index === 0 ? '◷' : index === 1 ? '⌂' : '◎'} ${text(value)}</span>`).join('<i>·</i>')}<span>◉ ${text(rule.timezone || 'UTC')}</span></div>` : '';
    const phoneField = modalSettings.showPhone ? `<div class="al-field"><label for="al-phone">Phone (optional)</label><input id="al-phone" name="phone" type="tel" autocomplete="tel" maxlength="40" placeholder="Enter your phone number"></div>` : '';
    const notesField = modalSettings.showNotes ? `<div class="al-field"><label for="al-note">${text(rule.questionLabel || 'Anything we should know?')}</label><textarea id="al-note" name="note" maxlength="2000" placeholder="Add a note for the team"></textarea></div>` : '';
    const footerNote = modalSettings.showFooterNote ? `<p class="al-action-note">${text(actionNote)}</p>` : '';
    const timezoneClass = modalSettings.showTimezoneSelector ? '' : ' al-ui-hidden';
    dialog.innerHTML = `<div class="al-head"><div><h2>${text(modalSettings.title)}</h2><p>${text(rule.serviceTitle || rule.productTitle)}</p></div><button class="al-close" type="button" aria-label="Close">×</button></div><form class="al-form"><div class="al-form-body">${summaryMarkup}<div class="al-booking-layout"><aside class="al-calendar-column"><div class="al-calendar-card"><div class="al-calendar-toolbar"><button type="button" class="al-calendar-nav al-calendar-prev" aria-label="Previous month">‹</button><strong class="al-calendar-title">Calendar</strong><button type="button" class="al-calendar-nav al-calendar-next" aria-label="Next month">›</button></div><div class="al-calendar-weekdays" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="al-calendar-grid" role="grid" aria-label="Choose a booking date"></div><input type="hidden" name="date" required></div><div class="al-timezone-note${timezoneClass}"><span>◷</span><div class="al-timezone-copy"><p class="al-timezone-text"></p><div class="al-timezone-picker"><button class="al-timezone-trigger" type="button" aria-haspopup="listbox" aria-expanded="false"><span class="al-timezone-value"></span><span>⌄</span></button><div class="al-timezone-menu" hidden><input class="al-timezone-search" type="search" placeholder="Search time zones" autocomplete="off"><div class="al-timezone-options" role="listbox"></div></div></div></div></div><div class="al-selected-sessions" hidden></div></aside><section class="al-booking-panel">${staffSelector}<div class="al-time-section"><div class="al-field-label-row"><span>${mode === 'all_day' ? 'Availability' : mode === 'multi_slot' ? 'Available sessions' : 'Available time slots'}</span><small class="al-selected-date-label">Choose a date</small></div><div class="al-times"><span class="al-muted">Choose a date first.</span></div></div><div class="al-details-divider"><span>Your details</span></div><div class="al-grid"><div class="al-field"><label for="al-name">Name *</label><input id="al-name" name="name" autocomplete="name" maxlength="120" placeholder="Enter your name" required></div><div class="al-field"><label for="al-email">Email *</label><input id="al-email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="Enter your email" required></div></div>${phoneField}${serviceAddressField}${notesField}<div class="al-questions"></div></section></div></div><div class="al-actions"><div class="al-error" hidden role="alert"></div><button class="al-submit" type="submit">${text(submitLabel)}</button>${footerNote}</div></form>`;
    const questions = dialog.querySelector('.al-questions');
    (rule.customQuestions || []).forEach((question, index) => {
      questions.insertAdjacentHTML('beforeend', `<div class="al-field"><label for="al-q-${index}">${text(question.label)}${question.required ? ' *' : ''}</label><input id="al-q-${index}" data-question="${text(question.label)}" maxlength="1000" ${question.required ? 'required' : ''}></div>`);
    });
    mountDialog(dialog, 'al-booking-dialog', storefront);

    const dateInput = dialog.querySelector('[name=date]');
    const times = dialog.querySelector('.al-times');
    const selectedRoot = dialog.querySelector('.al-selected-sessions');
    const calendarRoot = dialog.querySelector('.al-calendar-grid');
    const calendarTitle = dialog.querySelector('.al-calendar-title');
    const calendarPrev = dialog.querySelector('.al-calendar-prev');
    const calendarNext = dialog.querySelector('.al-calendar-next');
    const selectedDateLabel = dialog.querySelector('.al-selected-date-label');
    const staffSelect = dialog.querySelector('[name=staffId]');
    const staffPicker = dialog.querySelector('.al-staff-picker');
    const staffTrigger = dialog.querySelector('.al-staff-trigger');
    const staffMenu = dialog.querySelector('.al-staff-menu');
    const timezonePicker = dialog.querySelector('.al-timezone-picker');
    const timezoneTrigger = dialog.querySelector('.al-timezone-trigger');
    const timezoneMenu = dialog.querySelector('.al-timezone-menu');
    const timezoneSearch = dialog.querySelector('.al-timezone-search');
    const timezoneOptions = dialog.querySelector('.al-timezone-options');
    const timezoneText = dialog.querySelector('.al-timezone-text');
    let selectedStaffId = staffSelect?.value || '';
    let selectedDate = '';
    let calendarCursor = calendarMonthKey(minDate);
    let selectedTime = '';
    let selectedAllDayDate = '';
    let selectedOccurrences = [];
    const occurrenceKey = item => `${item.date}T${item.time}`;
    const inRange = date => (!minDate || date >= minDate) && (!maxDate || date <= maxDate);

    const displaySlot = (date, time) => {
      if (!date || !time || customerTimezone === serviceTimezone) return { date, time, label: time };
      const shown = zonedParts(wallTimeToInstant(date, time, serviceTimezone), customerTimezone);
      const label = shown.date === date ? shown.time : `${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(calendarDateFromKey(shown.date))} · ${shown.time}`;
      return { ...shown, label };
    };
    const displayOccurrence = item => {
      const shown = displaySlot(item.date, item.time);
      return customerTimezone === serviceTimezone ? `${item.date} · ${item.time}` : `${shown.date} · ${shown.time}`;
    };
    const renderTimezoneCopy = () => {
      if (mode === 'all_day') {
        timezoneText.textContent = `Dates use the service time zone: ${serviceTimezone}.`;
        timezonePicker.hidden = true;
        return;
      }
      timezonePicker.hidden = false;
      timezoneTrigger.querySelector('.al-timezone-value').textContent = customerTimezone;
      timezoneText.textContent = customerTimezone === serviceTimezone
        ? `Service calendar and times use ${serviceTimezone}.`
        : `Service calendar uses ${serviceTimezone}. Times are displayed in ${customerTimezone}.`;
    };
    const renderTimezoneOptions = (query = '') => {
      const term = query.trim().toLowerCase();
      const values = supportedTimeZones(serviceTimezone, customerTimezone).filter(value => !term || value.toLowerCase().includes(term)).slice(0, 160);
      timezoneOptions.innerHTML = values.length ? values.map(value => `<button type="button" class="al-timezone-option${value === customerTimezone ? ' selected' : ''}" data-timezone="${text(value)}"><span>${text(value)}</span><i>${value === customerTimezone ? '✓' : ''}</i></button>`).join('') : '<div class="al-timezone-empty">No matching time zones.</div>';
      timezoneOptions.querySelectorAll('[data-timezone]').forEach(button => button.addEventListener('click', () => {
        customerTimezone = button.dataset.timezone;
        timezoneMenu.hidden = true;
        timezoneTrigger.setAttribute('aria-expanded', 'false');
        renderTimezoneCopy(); renderTimezoneOptions(); renderSelected();
        if (selectedDate && availabilityCache.has(availabilityKey(selectedDate))) renderAvailability(availabilityCache.get(availabilityKey(selectedDate)), selectedDate);
      }));
    };

    const sessionCountForDate = date => mode === 'multi_slot' ? selectedOccurrences.filter(item => item.date === date).length : 0;
    const renderCalendar = () => {
      const cursor = calendarDateFromKey(calendarCursor);
      calendarTitle.textContent = `${calendarMonthNames[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
      const first = new Date(cursor);
      first.setUTCDate(1 - first.getUTCDay());
      const monthIndex = cursor.getUTCMonth();
      const cells = [];
      for (let i = 0; i < 42; i += 1) {
        const current = new Date(first);
        current.setUTCDate(first.getUTCDate() + i);
        const key = calendarDateKey(current);
        const outside = current.getUTCMonth() !== monthIndex;
        const open = !outside && inRange(key) && calendarServiceOpen(rule, key, mode);
        const selected = key === selectedDate;
        const sessionCount = sessionCountForDate(key);
        cells.push(`<button type="button" class="al-calendar-day${outside ? ' outside' : ''}${selected ? ' selected' : ''}${key === today ? ' today' : ''}${!open ? ' unavailable' : ''}" data-date="${key}" ${open ? '' : 'disabled'} aria-pressed="${selected ? 'true' : 'false'}"><span>${current.getUTCDate()}</span>${sessionCount ? `<i>${sessionCount}</i>` : ''}</button>`);
      }
      calendarRoot.innerHTML = cells.join('');
      calendarRoot.querySelectorAll('[data-date]:not(:disabled)').forEach(button => { button.addEventListener('click', () => selectDate(button.dataset.date)); button.addEventListener('mouseenter', () => prefetchAvailability(button.dataset.date), { once: true }); button.addEventListener('focus', () => prefetchAvailability(button.dataset.date), { once: true }); });
      calendarPrev.disabled = Boolean(minDate && calendarShiftMonth(calendarCursor, -1) < calendarMonthKey(minDate));
      calendarNext.disabled = Boolean(maxDate && calendarShiftMonth(calendarCursor, 1) > calendarMonthKey(maxDate));
    };

    const renderSelected = () => {
      if (mode !== 'multi_slot') return;
      selectedRoot.hidden = false;
      selectedRoot.innerHTML = `<div class="al-selected-head"><strong>Selected sessions</strong><span>${selectedOccurrences.length} / ${Number(rule.sessionsRequired || 3)}</span></div><div class="al-selected-list">${selectedOccurrences.length ? selectedOccurrences.map(item => `<button type="button" data-remove-session="${text(occurrenceKey(item))}"><span>${text(displayOccurrence(item))}</span><i>×</i></button>`).join('') : '<span class="al-muted">Choose dates and time slots until your booking is complete.</span>'}</div>`;
      selectedRoot.querySelectorAll('[data-remove-session]').forEach(button => button.addEventListener('click', async () => {
        selectedOccurrences = selectedOccurrences.filter(item => occurrenceKey(item) !== button.dataset.removeSession);
        renderSelected();
        renderCalendar();
        if (selectedDate) await loadAvailability(selectedDate);
      }));
    };

    const renderTimeStates = () => {
      if (mode !== 'multi_slot') return;
      times.querySelectorAll('.al-time').forEach(button => {
        const key = `${selectedDate}T${button.dataset.time}`;
        button.setAttribute('aria-pressed', String(selectedOccurrences.some(item => occurrenceKey(item) === key)));
      });
    };

    const availabilityKey = date => `${date}|${selectedStaffId}|${mode === 'multi_slot' ? selectedOccurrences.map(occurrenceKey).sort().join(',') : ''}`;
    const availabilityTarget = date => apiUrl('/api/public/availability', { ...context, date, ...(selectedStaffId ? { staffId: selectedStaffId } : {}), ...(mode === 'multi_slot' && selectedOccurrences.length ? { selected: selectedOccurrences.map(item => `${item.date}T${item.time}`).join(',') } : {}) });
    const setAvailabilityLoading = loading => {
      times.classList.toggle('al-loading', loading);
      times.setAttribute('aria-busy', String(loading));
      times.querySelectorAll('button').forEach(button => { button.disabled = loading; });
      clearTimeout(availabilityLoadingTimer);
      availabilityLoadingTimer = null;
      if (loading) {
        availabilityLoadingTimer = setTimeout(() => {
          if (times.getAttribute('aria-busy') !== 'true' || times.querySelector('.al-slots-loading')) return;
          const overlay = document.createElement('div'); overlay.className = 'al-slots-loading'; overlay.innerHTML = '<i></i><i></i><i></i>'; times.appendChild(overlay);
        }, 180);
      } else {
        times.querySelector('.al-slots-loading')?.remove();
      }
    };
    const renderAvailability = (payload, date) => {
      if (payload.requiresStaffSelection) { times.innerHTML = '<span class="al-muted al-availability-empty">Choose a staff member to see available times.</span>'; return; }
      if (mode === 'all_day') {
        selectedAllDayDate = payload.available ? date : '';
        times.innerHTML = payload.available ? `<div class="al-all-day"><strong>Available all day</strong><span>${payload.remaining > 1 ? `${payload.remaining} bookings remaining` : 'This date can be booked'}</span></div>` : `<span class="al-muted al-availability-empty">${text(emptyAvailabilityMessage(payload))}</span>`;
        return;
      }
      times.innerHTML = payload.slots.length ? payload.slots.map(time => { const shown = displaySlot(date, time); return `<button type="button" class="al-time" data-time="${text(time)}" aria-pressed="false"><span>${text(shown.label)}</span></button>`; }).join('') : `<span class="al-muted al-availability-empty">${text(emptyAvailabilityMessage(payload))}</span>`;
      times.querySelectorAll('.al-time').forEach(button => button.addEventListener('click', async () => {
        if (mode === 'multi_slot') {
          const item = { date, time: button.dataset.time };
          const key = occurrenceKey(item);
          const exists = selectedOccurrences.some(current => occurrenceKey(current) === key);
          if (exists) selectedOccurrences = selectedOccurrences.filter(current => occurrenceKey(current) !== key);
          else if (selectedOccurrences.length < Number(rule.sessionsRequired || 3)) selectedOccurrences.push(item);
          selectedOccurrences.sort((a, b) => occurrenceKey(a).localeCompare(occurrenceKey(b)));
          renderSelected(); renderCalendar(); await loadAvailability(date);
        } else {
          selectedTime = button.dataset.time;
          times.querySelectorAll('.al-time').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        }
      }));
      renderTimeStates();
    };
    const fetchAvailability = async date => {
      const key = availabilityKey(date);
      if (availabilityCache.has(key)) return availabilityCache.get(key);
      const payload = await requestJson(availabilityTarget(date), {}, 'availability'); availabilityCache.set(key, payload); return payload;
    };
    const prefetchAvailability = date => { if (!date || (staffMode === 'customer_choice' && !selectedStaffId)) return; fetchAvailability(date).catch(() => {}); };
    const loadAvailability = async date => {
      const key = availabilityKey(date);
      const requestId = ++availabilityRequestId;
      selectedTime = '';
      if (mode === 'all_day') selectedAllDayDate = '';
      if (availabilityCache.has(key)) { setAvailabilityLoading(false); renderAvailability(availabilityCache.get(key), date); return; }
      setAvailabilityLoading(true);
      info('Loading availability.', { ...context, date, bookingMode: mode });
      try {
        const payload = await fetchAvailability(date);
        if (requestId !== availabilityRequestId || selectedDate !== date) return;
        renderAvailability(payload, date);
      } catch (error) {
        if (requestId !== availabilityRequestId || selectedDate !== date) return;
        times.innerHTML = '<span class="al-muted al-availability-empty">Could not load availability. Please try another date.</span>';
        failure('Availability could not be rendered.', { ...context, date, status: error.status, message: error.message });
      } finally { if (requestId === availabilityRequestId) setAvailabilityLoading(false); }
    };

    const selectDate = async date => {
      selectedDate = date;
      dateInput.value = date;
      selectedDateLabel.textContent = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(calendarDateFromKey(date));
      calendarCursor = calendarMonthKey(date);
      renderCalendar();
      await loadAvailability(date);
    };

    const findInitialDate = start => {
      const current = calendarDateFromKey(start);
      for (let i = 0; i < 366; i += 1) {
        const key = calendarDateKey(current);
        if ((!maxDate || key <= maxDate) && inRange(key) && calendarServiceOpen(rule, key, mode)) return key;
        current.setUTCDate(current.getUTCDate() + 1);
      }
      return start;
    };

    renderTimezoneCopy();
    if (timezonePicker && timezoneTrigger && timezoneMenu) {
      renderTimezoneOptions();
      timezoneTrigger.addEventListener('click', () => { timezoneMenu.hidden = !timezoneMenu.hidden; timezoneTrigger.setAttribute('aria-expanded', String(!timezoneMenu.hidden)); if (!timezoneMenu.hidden) { timezoneSearch.value = ''; renderTimezoneOptions(); requestAnimationFrame(() => positionTimezoneMenu(timezoneTrigger, timezoneMenu)); setTimeout(() => timezoneSearch.focus(), 0); } else clearFloatingTimezoneMenu(timezoneMenu); });
      timezoneSearch.addEventListener('input', event => renderTimezoneOptions(event.target.value));
    }
    if (mode === 'multi_slot') renderSelected();
    renderCalendar();
    calendarPrev.addEventListener('click', () => { calendarCursor = calendarShiftMonth(calendarCursor, -1); renderCalendar(); });
    calendarNext.addEventListener('click', () => { calendarCursor = calendarShiftMonth(calendarCursor, 1); renderCalendar(); });

    if (staffPicker && staffTrigger && staffMenu) {
      staffTrigger.addEventListener('click', () => {
        staffMenu.hidden = !staffMenu.hidden;
        staffTrigger.setAttribute('aria-expanded', String(!staffMenu.hidden));
      });
      staffMenu.querySelectorAll('[data-staff-id]').forEach(button => button.addEventListener('click', async () => {
        const item = staffOptions.find(option => String(option.id) === button.dataset.staffId);
        selectedStaffId = item?.id || '';
        staffSelect.value = selectedStaffId;
        selectedTime = '';
        selectedAllDayDate = '';
        selectedOccurrences = [];
        renderSelected();
        renderCalendar();
        const value = staffTrigger.querySelector('.al-staff-value');
        value.innerHTML = item ? `${staffAvatar(item, 'al-staff-small')}<span><strong>${text(item.name)}</strong><small>${text(staffPickerCaption(item))}</small></span>` : '<span class="al-staff-avatar al-staff-initials al-staff-small">?</span><span><strong>Choose staff</strong><small>Select a team member</small></span>';
        staffMenu.querySelectorAll('[data-staff-id]').forEach(option => option.classList.toggle('selected', option.dataset.staffId === selectedStaffId));
        staffMenu.hidden = true;
        staffTrigger.setAttribute('aria-expanded', 'false');
        if (selectedDate) await loadAvailability(selectedDate);
      }));
      dialog.addEventListener('click', event => {
        if (!staffPicker.contains(event.target)) { staffMenu.hidden = true; staffTrigger.setAttribute('aria-expanded', 'false'); }
      });
    }

    dialog.addEventListener('click', event => { if (timezonePicker && timezoneMenu && !timezonePicker.contains(event.target)) { timezoneMenu.hidden = true; timezoneTrigger.setAttribute('aria-expanded', 'false'); clearFloatingTimezoneMenu(timezoneMenu); } });

    const initialDate = findInitialDate(minDate);
    calendarCursor = calendarMonthKey(initialDate);
    renderCalendar();
    selectDate(initialDate);

    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const errorBox = dialog.querySelector('.al-error');
      errorBox.hidden = true;
      if (staffMode === 'customer_choice' && !selectedStaffId) { errorBox.textContent = 'Please choose a staff member.'; errorBox.hidden = false; return; }
      if (!selectedDate) { errorBox.textContent = 'Please choose a date.'; errorBox.hidden = false; return; }
      if (mode === 'slot' && !selectedTime) { errorBox.textContent = 'Please select a time.'; errorBox.hidden = false; return; }
      if (mode === 'all_day' && !selectedAllDayDate) { errorBox.textContent = 'Please choose an available date.'; errorBox.hidden = false; return; }
      if (mode === 'multi_slot' && selectedOccurrences.length !== Number(rule.sessionsRequired || 3)) { errorBox.textContent = `Please select exactly ${Number(rule.sessionsRequired || 3)} sessions.`; errorBox.hidden = false; return; }
      const form = new FormData(event.currentTarget);
      const submit = dialog.querySelector('.al-submit');
      submit.disabled = true;
      submit.textContent = paid ? 'Holding your time…' : 'Confirming…';
      const body = {
        shopId: context.shopId,
        productId: context.productId,
        ruleId: rule.id,
        staffId: selectedStaffId,
        date: mode === 'multi_slot' ? selectedOccurrences[0]?.date : selectedDate,
        time: mode === 'slot' ? selectedTime : '',
        occurrences: mode === 'multi_slot' ? selectedOccurrences : [],
        customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
        serviceAddress: form.get('serviceAddress') || '',
        note: form.get('note'),
        answers: [...dialog.querySelectorAll('[data-question]')].map(input => ({ question: input.dataset.question, answer: input.value }))
      };
      try {
        const payload = await requestJson(apiUrl(paid ? '/api/public/paid-bookings' : '/api/public/bookings'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, paid ? 'paid booking hold' : 'booking');
        if (paid) {
          submit.textContent = 'Opening secure checkout…';
          window.location.assign(payload.checkoutUrl);
          return;
        }
        const receipt = saveBookingReceipt(context, payload.booking);
        renderBookingState(widget, rule, context, receipt);
        dialog.classList.add('al-confirmed'); dialog.classList.add('al-confirmation-dialog-compact'); dialog.querySelector('.al-form').innerHTML = `<div class="al-success"><div class="al-success-mark">✓</div><span class="al-success-kicker">Appointment confirmed</span><h3>${text(rule.serviceTitle || rule.productTitle || 'Appointment')}</h3><div class="al-success-summary"><div><span>Date & time</span><strong>${text(bookingWhenText(payload.booking))}</strong></div>${payload.booking.staff ? `<div><span>Staff</span><strong>${text(payload.booking.staff)}</strong></div>` : ''}${payload.booking.location ? `<div><span>Location</span><strong>${text(payload.booking.location)}</strong></div>` : ''}<div><span>Service time zone</span><strong>${text(payload.booking.timezone || rule.timezone || 'UTC')}</strong></div></div><p class="al-success-note">Your appointment is confirmed. You can manage this appointment later.</p>${onlineMeetingAction(payload.booking.meeting)}${payload.booking.calendar?.google ? `<div class="al-calendar-actions"><a class="al-calendar-link" href="${text(payload.booking.calendar.google)}" target="_blank" rel="noopener noreferrer">${GOOGLE_G_ICON}<span class="al-calendar-link-label">Add to Google Calendar</span><span class="al-calendar-link-arrow" aria-hidden="true">→</span></a>${payload.booking.meeting?.url ? `<small class="al-calendar-meeting-note">${text(payload.booking.meeting.providerName || 'Meeting')} link included in the calendar event.</small>` : ''}</div>` : ''}<button class="al-submit" type="button">Done</button></div>`;
        dialog.querySelector('.al-submit').addEventListener('click', () => dialog.close());
        info('Booking confirmed.', { ...context, bookingId: payload.booking.id, bookingMode: mode });
      } catch (error) {
        errorBox.textContent = error.status === 409 ? 'One of those selections is no longer available. Please choose again.' : error.message;
        errorBox.hidden = false;
        if (error.status === 409) {
          if (mode === 'multi_slot') {
            selectedOccurrences = [];
            renderSelected();
            renderCalendar();
          }
          if (selectedDate) loadAvailability(selectedDate);
        }
        submit.disabled = false;
        submit.textContent = submitLabel;
      }
    });
  }


})();


/* v0.5.4-hotfix.3 confirmation modal auto-height fallback */
(() => {
  if (window.CSS?.supports?.('selector(:has(*))')) return;
  const compact = () => {
    document.querySelectorAll('.al-confirmed').forEach((confirmation) => {
      const dialog = confirmation.closest('[role="dialog"], [aria-modal="true"], dialog');
      if (dialog) dialog.classList.add('al-confirmation-dialog-compact');
    });
  };
  compact();
  const observer = new MutationObserver(compact);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
