const state = {
  csrf: '', shop: null, email: null, emailSettings: null, rules: [], bookings: [], products: [], staff: [], staffOperations: { date: '', timezone: '', staff: [], unassigned: [] }, staffOperationsView: 'list',
  ruleStep: 0, activeTemplate: 'confirmation', emailEditorReady: false, bookingView: 'list', calendarMonth: '',
  locale: 'en', currentView: 'dashboard', themeLinkLoaded: false, bootstrap: null, onboarding: null, lastTestEmail: '', ruleModeTouched: false, editingRule: false,
  calendarSync: null, calendarStaffId: '', calendarPopup: null, calendarDayItems: {}, paidVariants: [], orderAccess: null, locations: [], locationAccess: null, storefrontSettings: null,
  subscription: null, subscriptionSyncError: '', restricted: false, archiveMode: false, accessMode: 'full',
  subscriptionRecoveryLastCheckAt: 0, subscriptionRecoveryInFlight: false,
  productPickerMode: 'checkout', ruleProductSelection: { trigger: [], placement: [] }, productPlacementScope: 'all'
};
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const viewLabels = {
  dashboard: ['Workspace', 'Overview'], rules: ['Service catalog', 'Services & rules'], bookings: ['Customer schedule', 'Bookings'], staff: ['Team scheduling', 'Staff'],
  billing: ['Subscription', 'Plan & billing'], calendar: ['Calendar integrations', 'Calendar Sync'], email: ['Customer communication', 'Email Studio'], setup: ['Configuration', 'Storefront setup']
};
const templateMeta = {
  confirmation: { label: 'Confirmation', manage: true, calendar: true },
  rescheduled: { label: 'Customer changed', manage: true, calendar: true },
  merchantUpdated: { label: 'Store changed', manage: false, calendar: true },
  cancelled: { label: 'Cancelled', manage: false, calendar: false },
  reminder: { label: 'Customer reminder', manage: false, calendar: true },
  merchantNewBooking: { label: 'Merchant new', manage: false, calendar: true },
  merchantBookingUpdated: { label: 'Merchant updated', manage: false, calendar: true },
  merchantBookingCancelled: { label: 'Merchant cancelled', manage: false, calendar: false },
  merchantReminder: { label: 'Merchant reminder', manage: false, calendar: true }
};
const sample = {
  customer_name: 'Jamie Chen', customer_email: 'jamie@example.com', product_title: 'Private design consultation',
  date: '2026-09-08', time: '14:00', timezone: 'Asia/Shanghai', location: 'Main showroom', staff: 'Alex Morgan'
};
const variables = ['customer_name', 'product_title', 'date', 'time', 'timezone', 'location', 'staff', 'store_name'];
const serviceTypeLabels = { appointment: 'Appointment', product: 'Appointment', in_store: 'In-store appointment', onsite: 'Home / onsite service', consultation: 'Consultation', class: 'Class / course', other: 'Other service' };
const bookingSourceLabels = { product: 'Product page', direct: 'Booking page', both: 'Product page + booking link' };
const commerceModeLabels = { standalone_free: 'Standalone · no payment', standalone_paid: 'Standalone · payment required', product_pre_purchase: 'Product + appointment', product_post_purchase: 'Purchase first · schedule after' };
const activeCommerceModes = new Set(['standalone_free', 'standalone_paid', 'product_pre_purchase', 'product_post_purchase']);
const defaultStorefrontSettings = Object.freeze({
  appearance: Object.freeze({ template: 'warm_luxe', backgroundIntensity: 'medium', cornerStyle: 'rounded', primaryStyle: 'template', unifiedBookingFlow: true }),
  button: Object.freeze({ label: 'Book an appointment', backgroundColor: '#2F6FED', textColor: '#FFFFFF', width: 'content', alignment: 'left', borderRadius: 8 }),
  modal: Object.freeze({ title: 'Book an appointment', accentColor: '#2F6FED', primaryTextColor: '#FFFFFF', primaryButtonWidth: 'content', primaryButtonAlignment: 'right', showServiceSummary: true, showTimezoneSelector: true, showPhone: true, showNotes: true, showFooterNote: true })
});
const storefrontThemePresets = Object.freeze({
  minimal_light: Object.freeze({ label: 'Minimal Light', accent: '#344054', primaryText: '#FFFFFF', surface: '#FFFFFF', soft: '#F7F8FA', text: '#1D2939', muted: '#667085', line: '#E4E7EC', success: '#5D8A70', backgrounds: Object.freeze({ soft: '#FAFBFC', medium: '#F5F7F9', strong: '#EEF1F4' }) }),
  warm_luxe: Object.freeze({ label: 'Warm Luxe', accent: '#4B342B', primaryText: '#FFFDFC', surface: '#FFFDFC', soft: '#F5ECE5', text: '#2C211D', muted: '#74645C', line: '#E4D6CD', success: '#6F8B73', backgrounds: Object.freeze({ soft: '#FAF6F2', medium: '#F3EBE4', strong: '#E9DDD4' }) }),
  soft_editorial: Object.freeze({ label: 'Soft Editorial', accent: '#252722', primaryText: '#FFFFFF', surface: '#FCFCF8', soft: '#F2F1EC', text: '#22231F', muted: '#6D6D66', line: '#DDDDD5', success: '#68856F', backgrounds: Object.freeze({ soft: '#FAFAF7', medium: '#F1F1EC', strong: '#E7E7E0' }) })
});
const storefrontCornerRadius = Object.freeze({ soft: 14, rounded: 22, square_soft: 10 });
function storefrontThemeTokens(settings = defaultStorefrontSettings) {
  const appearance = settings.appearance || defaultStorefrontSettings.appearance;
  const preset = storefrontThemePresets[appearance.template] || storefrontThemePresets.warm_luxe;
  const intensity = ['soft', 'medium', 'strong'].includes(appearance.backgroundIntensity) ? appearance.backgroundIntensity : 'medium';
  const custom = appearance.primaryStyle === 'custom';
  return {
    ...preset,
    background: preset.backgrounds[intensity] || preset.backgrounds.medium,
    accent: custom ? settings.modal.accentColor : preset.accent,
    primaryText: custom ? settings.modal.primaryTextColor : preset.primaryText,
    triggerAccent: custom ? settings.button.backgroundColor : preset.accent,
    triggerText: custom ? settings.button.textColor : preset.primaryText,
    radius: storefrontCornerRadius[appearance.cornerStyle] || storefrontCornerRadius.rounded
  };
}
const productStatusLabels = { active: 'Published', draft: 'Draft' };
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function googleGMark(className = '') {
  return `<span class="google-g ${className}" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.24-.2-1.8H12v3.28h5.52a4.72 4.72 0 0 1-2.05 3.01l-.02.11 2.98 2.31.21.02c1.93-1.78 3.04-4.4 3.04-6.93Z"/><path fill="#34A853" d="M12 22c2.76 0 5.08-.91 6.78-2.48l-3.23-2.5c-.86.6-2.04 1.01-3.55 1.01a6.17 6.17 0 0 1-5.83-4.26l-.1.01-3.1 2.4-.04.1A10.24 10.24 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.17 13.77A6.3 6.3 0 0 1 5.83 12c0-.62.12-1.22.33-1.78l-.01-.12-3.14-2.44-.1.05A10 10 0 0 0 1.82 12c0 1.55.38 3.02 1.08 4.29l3.27-2.52Z"/><path fill="#EA4335" d="M12 5.97c1.92 0 3.22.83 3.97 1.52l2.88-2.81C17.08 3.03 14.76 2 12 2a10.24 10.24 0 0 0-9.08 5.71l3.24 2.51A6.19 6.19 0 0 1 12 5.97Z"/></svg></span>`;
}

function browserTimeZones() {
  const common = ['UTC','Asia/Shanghai','Asia/Singapore','Asia/Tokyo','Europe/London','Europe/Paris','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Australia/Sydney'];
  let values = [];
  try { values = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []; } catch {}
  return [...new Set([...common, ...values])];
}

function populateServiceTimeZones() {
  renderServiceTimezoneMenu($('#serviceTimezone')?.value || '');
}

const ruleSelectRegistry = new WeakMap();
let activeRuleSelect = null;
let ruleSelectObserver = null;

function ruleModalBody() {
  return $('#ruleDialog .modal-body');
}

function menuPlacement(trigger, menu, { preferredHeight = 260, minHeight = 96 } = {}) {
  const body = ruleModalBody();
  if (!body || !trigger || !menu) return { up: false, maxHeight: preferredHeight };
  const bodyRect = body.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const below = Math.max(0, bodyRect.bottom - triggerRect.bottom - 10);
  const above = Math.max(0, triggerRect.top - bodyRect.top - 10);
  const measured = Math.min(preferredHeight, Math.max(minHeight, menu.scrollHeight || preferredHeight));
  const up = below < Math.min(measured, 150) && above > below;
  const available = up ? above : below;
  return { up, maxHeight: Math.max(minHeight, Math.min(preferredHeight, available || minHeight)) };
}

function closeRuleSelect(select = activeRuleSelect) {
  if (!select) return;
  const ui = ruleSelectRegistry.get(select);
  if (!ui) return;
  ui.wrapper.classList.remove('open', 'drop-up');
  ui.menu.classList.add('hidden');
  ui.trigger.setAttribute('aria-expanded', 'false');
  if (activeRuleSelect === select) activeRuleSelect = null;
}

function refreshRuleSelect(select) {
  const ui = ruleSelectRegistry.get(select);
  if (!ui) return;
  const selected = select.options[select.selectedIndex] || null;
  ui.value.textContent = selected?.textContent?.trim() || t('Select an option');
  ui.trigger.disabled = select.disabled;
  ui.trigger.classList.toggle('placeholder', !select.value);
  ui.menu.innerHTML = [...select.options].map(option => {
    const active = option.value === select.value;
    return `<button type="button" class="rule-select-option ${active ? 'selected' : ''}" data-value="${escapeHtml(option.value)}" role="option" aria-selected="${active}" ${option.disabled ? 'disabled' : ''}><span>${escapeHtml(option.textContent.trim())}</span><i aria-hidden="true">✓</i></button>`;
  }).join('');
  ui.menu.querySelectorAll('.rule-select-option').forEach(button => button.addEventListener('click', () => {
    select.value = button.dataset.value || '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    refreshRuleSelect(select);
    closeRuleSelect(select);
    ui.trigger.focus();
  }));
}

function openRuleSelect(select) {
  const ui = ruleSelectRegistry.get(select);
  if (!ui || select.disabled) return;
  if (activeRuleSelect && activeRuleSelect !== select) closeRuleSelect(activeRuleSelect);
  refreshRuleSelect(select);
  ui.menu.classList.remove('hidden');
  ui.wrapper.classList.add('open');
  ui.trigger.setAttribute('aria-expanded', 'true');
  activeRuleSelect = select;
  requestAnimationFrame(() => {
    const placement = menuPlacement(ui.trigger, ui.menu);
    ui.wrapper.classList.toggle('drop-up', placement.up);
    ui.menu.style.setProperty('--rule-select-max-height', `${placement.maxHeight}px`);
    ui.menu.querySelector('.rule-select-option.selected')?.scrollIntoView({ block: 'nearest' });
  });
}

function enhanceRuleSelect(select) {
  if (!select || ruleSelectRegistry.has(select) || !select.closest('#ruleDialog')) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'rule-select-ui';
  select.parentNode.insertBefore(wrapper, select);
  wrapper.append(select);
  select.classList.add('rule-select-native');
  select.tabIndex = -1;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'rule-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const value = document.createElement('span');
  value.className = 'rule-select-value';
  const chevron = document.createElement('span');
  chevron.className = 'picker-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  trigger.append(value, chevron);

  const menu = document.createElement('div');
  menu.className = 'rule-select-menu hidden';
  menu.setAttribute('role', 'listbox');
  wrapper.append(trigger, menu);

  const label = select.id ? $(`#ruleDialog label[for="${select.id}"]`) : null;
  trigger.setAttribute('aria-label', select.getAttribute('aria-label') || label?.textContent?.trim() || t('Select an option'));
  label?.addEventListener('click', event => { event.preventDefault(); trigger.focus(); });
  trigger.addEventListener('click', () => activeRuleSelect === select ? closeRuleSelect(select) : openRuleSelect(select));
  trigger.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    openRuleSelect(select);
    requestAnimationFrame(() => {
      const options = [...menu.querySelectorAll('.rule-select-option:not(:disabled)')];
      const selectedOption = menu.querySelector('.rule-select-option.selected');
      (selectedOption || (event.key === 'ArrowUp' ? options.at(-1) : options[0]))?.focus();
    });
  });
  menu.addEventListener('keydown', event => {
    const options = [...menu.querySelectorAll('.rule-select-option:not(:disabled)')];
    const index = options.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); closeRuleSelect(select); trigger.focus(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !options.length) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if (event.key === 'ArrowDown') next = Math.min(options.length - 1, index < 0 ? 0 : index + 1);
    else next = Math.max(0, index < 0 ? options.length - 1 : index - 1);
    options[next]?.focus();
  });
  select.addEventListener('change', () => refreshRuleSelect(select));
  ruleSelectRegistry.set(select, { wrapper, trigger, value, menu });
  refreshRuleSelect(select);
}

function refreshRuleSelects() {
  $$('#ruleDialog select').forEach(select => {
    enhanceRuleSelect(select);
    refreshRuleSelect(select);
  });
}

function initRuleSelects() {
  refreshRuleSelects();
  if (ruleSelectObserver) return;
  ruleSelectObserver = new MutationObserver(records => {
    const touched = new Set();
    for (const record of records) {
      if (record.target instanceof HTMLSelectElement) touched.add(record.target);
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches('select')) touched.add(node);
        node.querySelectorAll?.('select').forEach(select => touched.add(select));
      });
    }
    touched.forEach(select => { enhanceRuleSelect(select); refreshRuleSelect(select); });
  });
  ruleSelectObserver.observe($('#ruleDialog'), { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
}

function serviceTimezoneValues() {
  const storeTimezone = state.shop?.timezone || 'UTC';
  return [...new Set([storeTimezone, ...browserTimeZones()])];
}

function renderServiceTimezoneMenu(query = '') {
  const menu = $('#serviceTimezoneMenu');
  const input = $('#serviceTimezone');
  if (!menu || !input) return;
  const storeTimezone = state.shop?.timezone || 'UTC';
  const normalized = String(query || '').trim().toLowerCase();
  const values = serviceTimezoneValues().filter(value => !normalized || value.toLowerCase().includes(normalized)).slice(0, 80);
  const defaultLabel = state.locale === 'zh-CN' ? `店铺默认 · ${storeTimezone}` : `Store default · ${storeTimezone}`;
  const defaultOption = !normalized || 'store default'.includes(normalized) || '店铺默认'.includes(normalized)
    ? `<button type="button" class="timezone-picker-option ${!input.value ? 'selected' : ''}" data-timezone="" role="option" aria-selected="${!input.value}"><span><strong>${escapeHtml(defaultLabel)}</strong><small>${escapeHtml(state.locale === 'zh-CN' ? '继承 SHOPLINE 店铺时区' : 'Inherit the SHOPLINE store time zone')}</small></span><i>✓</i></button>`
    : '';
  menu.innerHTML = defaultOption + values.map(value => `<button type="button" class="timezone-picker-option ${input.value === value ? 'selected' : ''}" data-timezone="${escapeHtml(value)}" role="option" aria-selected="${input.value === value}"><span><strong>${escapeHtml(value)}</strong>${value === storeTimezone ? `<small>${escapeHtml(state.locale === 'zh-CN' ? '当前店铺时区' : 'Current store time zone')}</small>` : ''}</span><i>✓</i></button>`).join('');
  if (!menu.innerHTML) menu.innerHTML = `<div class="timezone-picker-empty">${escapeHtml(state.locale === 'zh-CN' ? '没有匹配的时区，你也可以直接输入 IANA 时区。' : 'No matching time zone. You can still type an IANA time zone directly.')}</div>`;
  menu.querySelectorAll('[data-timezone]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.timezone || '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    closeServiceTimezonePicker();
    input.focus();
  }));
}

function closeServiceTimezonePicker() {
  const picker = $('#serviceTimezonePicker');
  const menu = $('#serviceTimezoneMenu');
  const input = $('#serviceTimezone');
  const toggle = $('#serviceTimezoneToggle');
  if (!picker || !menu || !input || !toggle) return;
  picker.classList.remove('open', 'drop-up');
  menu.classList.add('hidden');
  input.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-expanded', 'false');
}

function openServiceTimezonePicker({ showAll = false } = {}) {
  const picker = $('#serviceTimezonePicker');
  const menu = $('#serviceTimezoneMenu');
  const input = $('#serviceTimezone');
  const toggle = $('#serviceTimezoneToggle');
  if (!picker || !menu || !input || !toggle) return;
  closeRuleSelect();
  closeLocationPicker();
  renderServiceTimezoneMenu(showAll ? '' : input.value);
  menu.classList.remove('hidden');
  picker.classList.add('open');
  input.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => {
    const placement = menuPlacement(picker, menu, { preferredHeight: 280, minHeight: 110 });
    picker.classList.toggle('drop-up', placement.up);
    menu.style.setProperty('--timezone-menu-max-height', `${placement.maxHeight}px`);
  });
}

function positionLocationPickerMenu() {
  const picker = $('#shoplineLocationPicker');
  const trigger = $('#shoplineLocationPickerButton');
  const menu = $('#shoplineLocationMenu');
  if (!picker || !trigger || !menu || menu.classList.contains('hidden')) return;
  const placement = menuPlacement(trigger, menu, { preferredHeight: 260, minHeight: 110 });
  picker.classList.toggle('drop-up', placement.up);
  menu.style.setProperty('--location-menu-max-height', `${placement.maxHeight}px`);
}

const zh = {
  'Appointment management': '预约管理', 'Workspace': '工作台', 'Overview': '概览', 'Services & rules': '预约服务', 'Bookings': '预约记录',
  'Configuration': '配置', 'Email Studio': '邮件设计', 'Storefront setup': '店铺前台设置', 'Store connected': '店铺已连接',
  'Checking notifications…': '正在检查通知…', 'Loading store…': '正在加载店铺…', 'Syncing time zone': '正在同步时区',
  'APPOINTMENT MANAGEMENT': '预约管理', 'Manage every appointment with clarity.': '清晰管理每一次预约。',
  'Configure bookable services, coordinate schedules, and keep customer updates consistent.': '配置可预约服务、协调时间安排，并保持客户通知一致。',
  'Create service rule': '创建预约服务', 'View bookings': '查看预约', 'Active services': '启用的预约服务', 'All bookings': '全部预约',
  'Lifetime records': '累计记录', 'Upcoming': '即将开始', 'Store-local schedule': '按店铺时区', 'Email notifications': '邮件通知',
  'Customer updates': '客户通知', 'NEXT UP': '即将开始', 'Upcoming appointments': '近期预约', 'View all': '查看全部',
  'LAUNCH PATH': '启用进度', 'Workspace readiness': '配置完成度', 'SERVICE CATALOG': '预约服务',
  'Services & appointment rules': '预约服务', 'Choose which products are bookable and define the experience around them.': '管理商品的预约规则、可预约时段与服务安排。',
  'New service rule': '新建预约服务', '0 services': '0 条预约规则', 'CUSTOMER SCHEDULE': '客户预约',
  'Review appointments, update service details, and keep customers informed.': '查看预约、调整服务信息并及时通知客户。', 'Store time': '店铺时间',
  'All': '全部', 'Confirmed': '已确认', 'Cancelled': '已取消', 'Customer & service': '客户与服务', 'Date & time': '日期与时间',
  'Assignment': '服务安排', 'Booking details': '预约安排', 'Actions': '操作', 'Status': '状态', 'CUSTOMER COMMUNICATION': '客户沟通',
  'Give every appointment email a consistent voice and visual identity.': '让每封预约邮件保持一致的品牌表达。', 'Send test': '发送测试',
  'Save email design': '保存邮件设计', 'Checking email notifications…': '正在检查邮件通知…', 'Brand identity': '品牌信息',
  'Choose how your store appears inside appointment emails.': '设置店铺在预约邮件中的展示方式。', 'Brand name': '品牌名称', 'Accent color': '主题色',
  'Email logo URL': '邮件 Logo 地址', 'optional': '可选', 'Use a square HTTPS image, ideally 160 × 160 px. If empty, your brand initial is shown.': '建议使用 160 × 160 像素的方形 HTTPS 图片。留空时显示品牌首字母。',
  'Notification recipients': '通知收件人', 'Choose where customers can reply and where your team receives new-booking alerts.': '设置客户回复地址及团队接收新预约通知的邮箱。',
  'Customer reply-to': '客户回复邮箱', 'New booking notifications': '新预约通知邮箱', 'Message templates': '邮件模板',
  'Customize the message while core appointment details remain protected and consistent.': '自定义文案，同时保留清晰一致的预约详情。',
  'Email subject': '邮件主题', 'Email heading': '邮件标题', 'Intro message': '正文开场', 'Insert a variable': '插入变量',
  'LIVE PREVIEW': '实时预览', 'Confirmation': '预约确认', 'Desktop': '桌面端',
  'Preview content uses sample appointment data. Customer details are never stored in this editor.': '预览使用示例预约数据，不会在编辑器中保存客户资料。',
  'STOREFRONT CONNECTION': '店铺前台连接', 'Add the booking experience to your product page in a few steps.': '只需几步即可把预约功能添加到商品页。',
  'Your store is ready to use Appointment Lite.': '你的店铺已可以使用 Appointment Lite。', 'Create a service rule': '创建预约服务',
  'Select a product, duration, availability, location, and specialist.': '选择商品、预约时长、可预约时段、地点和服务人员。', 'Create a rule': '创建预约服务',
  'Add Appointment Lite to your product page': '将 Appointment Lite 添加到商品页',
  'Open the theme editor, place the App Block in the product information area, then save the theme.': '打开主题编辑器，将 App Block 放到商品信息区域，然后保存主题。',
  'Open theme editor': '打开主题编辑器', 'Preparing your theme editor link…': '正在准备主题编辑器链接…',
  'Preview a bookable product': '预览可预约商品', 'Open a product with an active service rule and complete one test booking.': '打开已启用规则的商品并完成一次测试预约。',
  'Before you publish': '发布前检查', 'Use this short checklist to confirm the customer experience.': '请用以下清单确认客户体验。',
  'The App Block is visible on product pages': '商品页可看到 App Block', 'Date and time choices match your schedule': '日期和时间符合你的排期',
  'Confirmation emails use your store branding': '确认邮件使用店铺品牌', 'A test booking appears in Bookings': '测试预约出现在预约记录中',
  'SERVICE CONFIGURATION': '预约服务配置', 'New appointment rule': '新建预约服务', 'Start with the product customers will book.': '先选择客户需要预约的商品。',
  'Service': '基本信息', 'Availability': '可预约时段', 'Experience': '服务信息', 'What are customers booking?': '选择预约商品',
  'Connect one SHOPLINE product to this appointment experience.': '选择一个 SHOPLINE 商品作为此预约服务的入口。', 'SHOPLINE product': 'SHOPLINE 商品',
  'Select a product': '选择商品', 'Each product can have one appointment rule.': '每个商品可配置一条预约规则。', 'Appointment duration': '预约时长',
  'minutes': '分钟', 'Buffer after appointment': '预约后缓冲时间', 'When can customers book?': '客户可在何时预约？',
  'Times are interpreted in the store time zone shown in the top bar.': '所有时间均以顶部显示的店铺时区为准。', 'Available from': '开始日期',
  'Available until': '结束日期', 'Weekly schedule': '每周时间表', 'Enable the days customers can book. Past store-local times are automatically removed.': '启用可预约日期；已过的店铺本地时间会自动移除。',
  'Shape the customer experience': '完善客户预约体验', 'Add lightweight assignment details and collect useful context.': '添加服务安排，并收集必要信息。',
  'Location': '地点', 'Staff or specialist': '服务人员', 'Notes prompt': '备注提示', 'Custom questions': '自定义问题', 'up to 5': '最多 5 个',
  'Add question': '添加问题', 'Service is active': '启用此服务', 'Show the booking experience on matching product pages.': '在匹配的商品页展示预约功能。',
  'Cancel': '取消', 'Back': '返回', 'Continue': '继续', 'Save service rule': '保存预约服务', 'PRODUCT CATALOG': '选择商品',
  'Choose the product customers will book.': '选择客户需要预约的商品。', 'Back to service': '返回预约配置', 'BOOKING DETAILS': '预约详情',
  'Edit appointment': '编辑预约', 'Update the customer appointment.': '更新客户预约。', 'Times use the store time zone.': '时间以店铺时区为准。',
  'Date': '日期', 'Time': '时间', 'Staff': '服务人员', 'Saving validates the selected slot and emails the customer when delivery is configured. Email failure never rolls back the booking.': '保存时会校验时间，并在邮件通知启用后告知客户。邮件发送失败不会撤销预约更改。',
  'Save and notify': '保存并通知', 'BOOKING ACTIVITY': '预约动态', 'Appointment history': '预约历史', 'Done': '完成',
  'Please confirm': '请确认', 'Keep it': '保留', 'Confirm': '确认', 'English': 'English', '简体中文': '简体中文',
  'Search services, staff, or location': '搜索服务、人员或地点', 'Search customer, product, or email': '搜索客户、商品或邮箱',
  'Search products by name': '按名称搜索商品', 'Sync SHOPLINE products': '同步 SHOPLINE 商品', 'Syncing…': '同步中…',
  'Products refresh automatically when this dialog is opened for the first time.': '首次打开此窗口时会自动加载商品；在 SHOPLINE 新建或修改商品后，可点击同步获取最新商品。',
  'Loading products from SHOPLINE…': '正在从 SHOPLINE 加载商品…', 'Syncing latest products from SHOPLINE…': '正在同步 SHOPLINE 最新商品…',
  'SHOPLINE products synced.': 'SHOPLINE 商品已同步。', 'Could not sync SHOPLINE products. Try again.': 'SHOPLINE 商品同步失败，请重试。',
  'Catalog sources reconciled': '已合并 SHOPLINE 商品数据源', 'Historical bookings will be kept': '历史预约记录会继续保留',
  'Published': '已发布', 'Draft': '草稿', 'products synced just now': '个商品 · 刚刚同步', 'Your store name': '你的店铺名称', 'e.g. Main showroom': '例如：主展厅', 'e.g. Sarah': '例如：Sarah',
  'Anything we should know?': '还有什么需要我们了解？',
  'Set regular hours, booking policies, and date-specific exceptions in the service time zone.': '按照服务默认时区设置常规开放时间、预约策略和特殊日期。',
  'Service time zone': '服务默认时区', 'Leave blank to inherit the SHOPLINE store time zone.': '留空则继承 SHOPLINE 店铺时区。',
  'Set the service-local schedule customers can choose from.': '设置客户可选择的服务本地时间。'
};

Object.assign(zh, {
  'Team scheduling':'员工排班','Staff':'员工','TEAM SCHEDULING':'员工排班','Create bookable team members, set their working hours, and connect them to appointment services.':'创建可预约员工、设置工作时间，并关联到预约服务。','Add staff':'新增员工','Search staff by name or email':'按姓名或邮箱搜索员工','No staff yet':'还没有员工','Add your first team member to start staff-aware scheduling.':'添加第一位员工后即可启用员工排班与冲突检测。','No staff match your search':'没有匹配的员工','Services':'服务','Working hours':'工作时间','Not assigned':'未关联服务','No regular hours':'无固定工作时间','No contact details':'未填写联系方式','Inactive':'已停用','Edit staff':'编辑员工','Delete staff':'删除员工','TEAM MEMBER':'员工','Set the team member details and store-local working schedule.':'设置员工信息及店铺本地时区下的工作时间。','Name':'姓名','Phone':'电话','Weekly working hours':'每周工作时间','Staff availability intersects with the service schedule. A time is bookable only when both are open.':'员工工作时间会与服务可预约时间取交集，只有两者同时开放时客户才能预约。','Schedule exceptions':'特殊排班','Use exceptions for holidays, leave, or one-off staff working hours. Staff exceptions do not open a service date that is closed in the service schedule.':'用于休假、节假日或员工临时工作时间。员工特殊排班不会自动开放服务本身关闭的日期；如需当天可预约，请同时在服务的“可预约时段 → 特殊日期”中开放该日期。','Save staff':'保存员工','Staff member updated.':'员工已更新。','Staff member created.':'员工已创建。','Staff member deleted.':'员工已删除。','Staff assignment':'员工分配','Choose how this service uses the team schedule. Managed staff availability is checked together with the service schedule.':'选择该服务如何使用员工排班。系统会同时检查服务时间和员工可用时间。','No staff required':'无需员工','Use the service schedule without staff conflict checks.':'仅使用服务排期，不检查员工冲突。','Any available staff':'任意可用员工','Appointment Lite automatically assigns one available team member.':'系统自动分配一位有空的员工。','Customer chooses':'客户选择员工','Customers choose a team member before selecting an available time.':'客户先选择员工，再查看该员工可预约时间。','Fixed staff':'固定员工','This service always uses one selected team member.':'该服务始终由指定员工提供。','Available staff for this service':'该服务可用员工','Select one or more active staff members.':'选择一位或多位启用中的员工。','Select exactly one active staff member.':'请选择且仅选择一位启用中的员工。','No active staff yet. Add staff from the Staff page first.':'暂无启用中的员工，请先在“员工”页面添加。','Select exactly one staff member for fixed assignment.':'固定员工模式必须选择一位员工。','Select at least one staff member for this assignment mode.':'此分配模式至少需要选择一位员工。','All staff':'全部员工','No managed staff':'未启用员工管理','Auto assign available staff':'自动分配可用员工','Select staff':'选择员工','Current staff':'当前员工'
});

Object.assign(zh, {
  'Public booking profile': '公开预约资料',
  'Title / role': '职位 / 角色',
  'Region': '地区',
  'Expertise': '专长',
  'Supported services': '支持的服务',
  'Profile description': '个人介绍',
  'Add one service per line. These labels are shown in the public staff list with green check marks. They are display-only; service assignment is still configured inside each appointment service.': '每行填写一个服务。这里的文案会在前台员工列表中以绿色勾选项展示，仅用于展示；员工实际关联哪些预约服务仍在对应预约服务中配置。',
  'Show in Staff Directory': '展示在员工列表',
  'Only public profile fields are shown. Email and phone remain private.': '前台仅展示公开资料字段，邮箱和电话不会公开。',
  'Location is configured per appointment service.': '地点按预约服务配置。',
  'Staff profiles do not have a separate region or location binding. Use Service location when you need a SHOPLINE location, customer address, online service, or custom location.': '员工资料不再单独设置地区或地点。需要 SHOPLINE 地点、客户地址、在线服务或自定义地点时，请在对应预约服务的“服务地点”中配置。'
});

const originalText = new WeakMap();
const originalAttributes = new WeakMap();

Object.assign(zh, {
  'Add to calendar': '添加到日历',
  'Add to Google Calendar': '添加到 Google 日历'
});

Object.assign(zh, {
  Sunday: '星期日', Monday: '星期一', Tuesday: '星期二', Wednesday: '星期三', Thursday: '星期四', Friday: '星期五', Saturday: '星期六',
  start: '开始', end: '结束', Ready: '已启用', 'Setup needed': '待设置', Customer: '客户',
  'No upcoming appointments yet. Your next confirmed booking will appear here.': '暂无即将开始的预约。下一条已确认预约会显示在这里。',
  'SHOPLINE store connected': 'SHOPLINE 店铺已连接', 'At least one active service rule': '至少启用一条服务规则',
  'Email notifications ready': '邮件通知已就绪', 'Email notifications need setup': '邮件通知待设置', 'Email design customized': '已自定义邮件设计',
  'Question shown to customers': '向客户展示的问题', Required: '必填', Remove: '移除', 'No matching products': '没有匹配的商品',
  'Could not load products': '无法加载商品', 'Set the service-local schedule customers can choose from.': '设置客户可选择的店铺本地时间。',
  'Finish the customer-facing details and activate the service.': '完善客户看到的服务信息并启用预约。', 'Edit service rule': '编辑预约服务',
  'Service rule updated.': '预约服务已更新。', 'Service rule created.': '预约服务已创建。',
  'No services match your search': '没有匹配的预约服务', 'No service rules yet': '还没有预约服务', 'Try a different keyword.': '请尝试其他关键词。',
  'Create a rule to make a SHOPLINE product bookable.': '创建预约服务，让指定 SHOPLINE 商品支持预约。', 'min appointment': '分钟预约', 'min buffer': '分钟缓冲',
  Active: '已启用', Paused: '已暂停', Specialist: '服务人员', 'Any staff': '未指定人员', 'Not set': '未设置', Questions: '自定义问题', custom: '个',
  'Edit service': '编辑', Delete: '删除', 'Service rule deleted.': '预约服务已删除。', 'No bookings found': '没有找到预约',
  'Try another search.': '请尝试其他搜索条件。', 'Confirmed appointments will appear here.': '已确认的预约会显示在这里。', 'No location': '未设置地点',
  'View history': '查看历史', Edit: '编辑', 'Appointment created': '预约已创建', 'The customer submitted this booking.': '客户已提交本次预约。',
  'Customer changed the time': '客户修改了时间', 'The customer used their online change.': '客户已使用一次在线修改机会。',
  'Store updated the appointment': '店铺更新了预约', 'The date, time, location, or specialist was updated.': '日期、时间、地点或服务人员已更新。',
  'Customer cancelled': '客户取消了预约', 'Store cancelled the appointment': '店铺取消了预约', 'The time was released for other customers.': '该时间已释放，可供其他客户预约。',
  'Booking updated': '预约已更新', 'Appointment details changed.': '预约详情已更改。', at: '时间', Before: '修改前', After: '修改后',
  'Store action': '店铺操作', 'Customer action': '客户操作', 'System action': '系统操作', 'No booking activity yet.': '暂无预约动态。',
  'Email branding and templates saved.': '邮件品牌与模板已保存。', 'Email delivery ready': '邮件通知已就绪', 'Email delivery needs attention': '邮件通知待设置',
  'Confirmation and update emails can be sent.': '现在可以发送预约确认和更新邮件。', 'Complete the email settings before sending notifications.': '请先完成邮件设置，再发送通知。',
  'Sending address': '发件地址', 'Sending address not configured': '尚未配置发件地址', 'Store details are syncing': '正在同步店铺信息',
  'The editor will open on the product template in a new window.': '主题编辑器将在新窗口中打开商品模板。',
  'Open the theme page, choose Customize, then add Appointment Lite to the product template.': '请在主题页面选择“自定义”，然后将 Appointment Lite 添加到商品模板。',
  'The theme editor is temporarily unavailable. Please try again.': '主题编辑器暂时不可用，请稍后重试。',
  'Customer changed': '客户已修改', 'Store changed': '店铺已修改', 'Merchant alert': '商家通知',
  'Select a SHOPLINE product before continuing.': '请选择一个 SHOPLINE 商品后继续。', 'Enter a valid duration and buffer.': '请输入有效的预约时长和缓冲时间。',
  'Enable at least one weekday.': '请至少启用一个可预约星期。', 'You can add up to five custom questions.': '最多可添加 5 个自定义问题。',
  'Booking updated. Email delivery is not configured.': '预约已更新，邮件通知尚未配置。', 'Booking updated, but the customer email failed.': '预约已更新，但客户邮件发送失败。',
  'Booking updated and customer email sent.': '预约已更新，并已向客户发送邮件。', 'Booking cancelled. Email delivery is not configured.': '预约已取消，邮件通知尚未配置。',
  'Booking cancelled, but the customer email failed.': '预约已取消，但客户邮件发送失败。', 'Booking cancelled and customer email sent.': '预约已取消，并已向客户发送邮件。',
  'Time zone': '时区', 'Manage appointment': '管理预约', 'Sent by': '发送方',
  'Delete this service?': '删除这个预约服务？', 'Delete service': '删除服务',
  'This removes the service configuration. Historical bookings will stay in Booking records for reporting and audit.': '这会删除预约服务配置，但历史预约记录会继续保留在预约记录中，用于查询和审计。',
  'This service still has confirmed bookings. Cancel, complete, or mark them as no-show before deleting it.': '这个服务仍有已确认预约。请先取消、完成或标记为未到店，再删除服务。',
  'Service deleted. Historical bookings were kept.': '预约服务已删除，历史预约记录已保留。',
  'Delete rule': '删除规则', 'Cancel this appointment?': '取消这条预约？', 'The time will be released immediately. The customer will be emailed when delivery is configured.': '该时间会立即释放；邮件通知启用后将告知客户。',
  'Cancel booking': '取消预约'
});

Object.assign(zh, {
  'QUICK SETUP': '快速设置', 'Launch Appointment Lite': '启用 Appointment Lite',
  'Complete the storefront connection first, then create a service and test the booking flow.': '先完成店铺前台连接，再创建预约服务并测试完整预约流程。',
  'Enable the Appointment Lite App Block': '启用 Appointment Lite App Block',
  'Required for SHOPLINE product appointments. Open the product template in the SHOPLINE theme editor, add or activate the Appointment Lite App Block, then save the theme. Standalone services can continue without it.': 'SHOPLINE 商品预约需要启用 App Block。打开主题编辑器中的商品模板，添加或启用 Appointment Lite App Block 并保存；独立服务无需启用即可继续。',
  "I've enabled the App Block": '我已启用 App Block', 'Create your first appointment service': '创建第一个预约服务',
  'Select the SHOPLINE product customers will book, then configure duration, availability, location, and specialist.': '选择客户需要预约的 SHOPLINE 商品，并配置预约时长、可预约时段、地点和服务人员。',
  'Create a service': '创建预约服务', 'Test the storefront booking flow': '测试店铺前台预约流程',
  'Open the configured product page and submit one test booking. The booking should appear in Bookings.': '打开已配置的商品页并完成一次测试预约，预约记录应出现在“预约记录”中。',
  'Preview bookable product': '预览可预约商品', 'Quick setup': '快速设置',
  'Product appointments use the App Block. In-store, onsite, consultation, class, and other standalone services can be created without editing the theme.': '商品预约通过 App Block 展示；到店、上门、咨询、课程及其他独立服务无需编辑主题即可创建。',
  'Step 1 connects product appointments to the storefront App Block': '第 1 步为商品预约连接店铺前台 App Block', 'Step 2 creates the first appointment service': '第 2 步创建第一个预约服务',
  'Step 3 verifies the complete customer booking experience': '第 3 步验证完整的客户预约体验',
  'EMAIL TEST': '测试邮件', 'Send a test email': '发送测试邮件', 'Choose the inbox that should receive this preview.': '选择接收本次预览邮件的邮箱。',
  'Test recipient': '测试收件邮箱', 'This address is used only for this test. It does not change your saved notification recipients.': '该邮箱仅用于本次测试，不会修改已保存的通知收件邮箱。',
  'Send test email': '发送测试邮件', 'QUICK START': '快速开始', 'Set up Appointment Lite': '设置 Appointment Lite',
  'Get your first booking flow ready in three steps.': '通过 3 个步骤完成第一个预约流程。',
  'The App Block is required for product appointments. Standalone services can continue directly to Step 2.': '商品预约需要启用 App Block；独立服务可以直接进入第 2 步。',
  'For product appointments, open the product template, activate the Appointment Lite App Block, and save the theme. Standalone services can skip this step.': '商品预约请打开商品模板、启用 Appointment Lite App Block 并保存主题；独立服务可以跳过此步骤。',
  'Choose a SHOPLINE product and configure the available schedule.': '选择一个 SHOPLINE 商品并配置可预约时间。',
  'Test a booking on your storefront': '在店铺前台测试预约', 'Open the configured product and complete one test appointment.': '打开已配置的商品并完成一次测试预约。',
  "I'll finish later": '稍后完成', '{done} of 3 complete': '已完成 {done}/3', 'App Block enabled': 'App Block 已启用', 'App Block enabled.': 'App Block 已标记为启用。',
  'Enter an email address for the test message.': '请输入接收测试邮件的邮箱。', 'Enter a valid email address for the test message.': '请输入有效的测试收件邮箱。'
});



Object.assign(zh, {

  'Connect the App Block for product bookings, or create a standalone service, then test the booking flow.': '商品预约可先连接 App Block；独立服务可以直接创建服务，然后测试预约流程。',
  'Required for SHOPLINE product appointments. Open the product template in the SHOPLINE theme editor, add or activate the Appointment Lite App Block, then save the theme. Standalone services can continue without it.': 'SHOPLINE 商品预约需要启用 App Block。打开主题编辑器中的商品模板，添加或启用 Appointment Lite App Block 并保存；独立服务无需启用即可继续。',
  'Product appointments use the App Block. In-store, onsite, consultation, class, and other standalone services can be created without editing the theme.': '商品预约通过 App Block 展示；到店、上门、咨询、课程及其他独立服务无需编辑主题即可创建。',
  'Step 1 connects product appointments to the storefront App Block': '第 1 步为商品预约连接店铺前台 App Block',
  'The App Block is required for product appointments. Standalone services can continue directly to Step 2.': '商品预约需要启用 App Block；独立服务可以直接进入第 2 步。',
  'For product appointments, open the product template, activate the Appointment Lite App Block, and save the theme. Standalone services can skip this step.': '商品预约请打开商品模板、启用 Appointment Lite App Block 并保存主题；独立服务可以跳过此步骤。',
  'Open booking experience': '打开预约体验',
  'Create product appointments, in-store visits, home services, consultations, classes, and shareable booking experiences.': '创建商品预约、到店服务、上门服务、咨询、课程，以及可分享的独立预约服务。',
  'New service': '新建服务', 'Loading services…': '正在加载服务…', 'SCHEDULING OPERATIONS': '预约运营',
  'Run your daily schedule in a list or calendar, update status, and export records when needed.': '通过列表或日历管理每日预约、更新状态，并按需导出记录。',
  'Export CSV': '导出 CSV', 'Search customer, service, or email': '搜索客户、服务或邮箱', 'All services': '全部服务', 'All statuses': '全部状态',
  'Completed': '已完成', 'No-show': '未到店', 'Awaiting payment': '等待付款', 'Payment expired': '付款超时', 'Payment needs review': '付款需处理', 'List': '列表', 'Calendar': '日历', 'From': '开始日期', 'To': '结束日期', 'Clear filters': '清除筛选',
  'New appointment service': '新建预约服务', 'Choose how customers will book this service.': '选择客户如何预约这项服务。',
  'What kind of service is this?': '这是什么类型的服务？',
  'Product appointments use your SHOPLINE product page. Other services get a standalone booking link you can share anywhere.': '商品预约通过 SHOPLINE 商品页进入；其他服务会自动生成可分享的独立预约链接。',
  'Product booking': '商品预约', 'Appointments connected to a SHOPLINE product and App Block.': '绑定 SHOPLINE 商品，并通过 App Block 展示预约入口。',
  'In-store appointment': '到店预约', 'Showroom visits, fittings, measurements, or store services.': '适合展厅到访、试穿、量尺或门店服务。',
  'Home / onsite service': '上门服务', 'Installation, repair, measurement, or technician visits.': '适合安装、维修、上门量尺或师傅上门。',
  'Consultation': '咨询预约', 'Design, sales, remote, or professional consultations.': '适合设计、销售、远程或专业咨询。',
  'Class / course': '课程 / 课堂', 'Lessons, workshops, group sessions, and classes.': '适合课程、工作坊、小班课或团体活动。',
  'Other service': '其他服务', 'Create a flexible standalone appointment service.': '创建灵活的独立预约服务。',
  'Each product can have one active appointment service.': '每个商品可配置一项预约服务。', 'Service name': '服务名称',
  'A shareable booking link is created automatically after you save.': '保存后会自动生成可分享的预约链接。', 'Duration': '服务时长', 'Buffer': '缓冲时间', 'Capacity': '单时段容量', 'min': '分钟', 'spots': '名额',
  'Set regular hours, booking policies, and date-specific exceptions in the service time zone.': '按照服务默认时区设置常规开放时间、预约策略和特殊日期。',
  'Minimum notice': '最短提前预约', 'No minimum': '无限制', '1 hour': '1 小时', '2 hours': '2 小时', '4 hours': '4 小时', '12 hours': '12 小时', '1 day': '1 天', '2 days': '2 天', '7 days': '7 天',
  'Booking window': '可提前预约范围', 'days ahead': '天内', 'Enable the days customers can normally book.': '启用客户通常可以预约的星期。',
  'Availability exceptions': '特殊日期', 'Add exception': '添加特殊日期', 'Close a holiday or override one date with special opening hours.': '可关闭节假日，或为某一天设置特殊营业时间。',
  'Closed all day': '全天关闭', 'Special hours': '特殊营业时间', 'Service description': '服务说明', 'What should customers know before booking?': '客户预约前需要了解什么？',
  'Add the location, specialist, service details, and questions customers should see.': '添加地点、服务人员、服务说明和客户需要填写的问题。',
  'Show the booking experience when customers open this service.': '启用后客户即可通过对应入口预约此服务。',
  'Service name is required before continuing.': '请先填写服务名称。', 'Enter valid duration, buffer, and capacity.': '请输入有效的服务时长、缓冲时间和单时段容量。',
  'Enter a valid booking window and minimum notice.': '请输入有效的预约范围和最短提前预约时间。', 'Enable at least one weekday or add an open exception.': '请至少启用一个星期，或添加一个开放的特殊日期。',
  'Booking link': '预约链接', 'Copy link': '复制链接', 'Open booking page': '打开预约页', 'Booking link copied.': '预约链接已复制。',
  'Product page': '商品页', 'Standalone link': '独立预约链接', 'per slot': '每时段', 'No notice': '无需提前', 'ahead': '提前',
  'Mark complete': '标记完成', 'Mark no-show': '标记未到店', 'Mark this appointment completed?': '将这条预约标记为已完成？',
  'The booking will move out of the active schedule and remain in history.': '该预约会从进行中的排期中移出，并保留在历史记录中。',
  'Mark completed': '标记完成', 'Mark this appointment as no-show?': '将这条预约标记为未到店？', 'Use no-show when the customer did not attend the scheduled appointment.': '当客户未按预约时间到场时使用“未到店”。',
  'Booking marked completed.': '预约已标记为完成。', 'Booking marked no-show.': '预约已标记为未到店。',
  'Appointment completed': '预约已完成', 'The store marked this appointment as completed.': '店铺已将这条预约标记为完成。',
  'Customer did not attend': '客户未到店', 'The store marked this appointment as no-show.': '店铺已将这条预约标记为未到店。',
  'No bookings match the current filters.': '没有符合当前筛选条件的预约。', 'booking': '条预约', 'bookings': '条预约'
});

Object.assign(zh, {
  'Appointment': '预约服务', 'Service': '服务', 'Service type': '服务类型', 'Define the appointment service': '定义预约服务',
  'Choose the service type first, then decide where customers can start the booking flow.': '先选择服务类型，再决定客户从哪里进入预约流程。',
  'General service appointments and product consultations.': '适合通用服务预约或与商品相关的咨询服务。',
  'Use a flexible service category for other appointment scenarios.': '用于其他灵活的预约服务场景。',
  'Linked SHOPLINE product': '关联 SHOPLINE 商品', 'The App Block uses this product binding to find the correct appointment service on the storefront.': 'App Block 会通过该商品绑定在店铺前台找到对应的预约服务。',
  'INBOX PREVIEW': '收件箱预览', 'Clear': '清除',
  'Appointment': '预约服务', 'Booking source': '预约入口', 'Booking page': '独立预约页', 'Product page + booking link': '商品页 + 独立预约页',
  'Linked product': '关联商品', 'Show this service on the linked SHOPLINE product page.': '在关联的 SHOPLINE 商品详情页展示此预约服务。',
  'Show this service on the linked product page and a shareable booking page.': '同时在关联商品页展示，并提供可分享的独立预约页。',
  'Use a shareable booking page without requiring a SHOPLINE product.': '使用可分享的独立预约页，无需关联 SHOPLINE 商品。',
  'Product page only': '仅商品页', 'Booking page only': '仅独立预约页', 'Both': '两种入口',
  'Display on the linked SHOPLINE product with the App Block.': '通过 App Block 在关联的 SHOPLINE 商品页展示。',
  'Use a direct booking page that can be shared anywhere.': '生成可在任意渠道分享的独立预约页面。',
  'Use both the product page and a shareable direct booking page.': '同时使用商品页和可分享的独立预约页面。',
  'Service name': '服务名称', 'Describe the service customers are booking, independent of the linked product.': '填写客户实际预约的服务名称，与关联商品名称相互独立。',
  'Select a SHOPLINE product before continuing.': '请先选择一个 SHOPLINE 商品。', 'Service name is required before continuing.': '请先填写服务名称。',
  'to': '发送至', 'Bookings': '预约记录',
  'Create appointment services, bind them to SHOPLINE products when needed, and choose product-page, direct, or dual booking channels.': '创建预约服务，并按需关联 SHOPLINE 商品，可选择商品页、独立预约页或同时使用两种入口。',
  'Connect the App Block for product-page services, or use a direct booking page, then test the booking flow.': '商品页服务需要连接 App Block；也可以使用独立预约页，然后测试完整预约流程。',
  'Required when a service uses the SHOPLINE product page. Open the product template, add or activate the Appointment Lite App Block, then save the theme. Direct-booking-only services can continue without it.': '当服务使用 SHOPLINE 商品页时必须启用 App Block。打开商品模板，添加或启用 Appointment Lite App Block 并保存主题。仅使用独立预约页的服务可以跳过此步骤。',
  'Choose the service type and booking source, then configure the schedule.': '选择服务类型和预约入口，然后配置可预约时间。',
  'The App Block is required for product-page services. Direct-booking-only services can continue directly to Step 2.': '使用商品页的服务必须启用 App Block；仅使用独立预约页的服务可以直接进入第 2 步。',
  'For services using the product page, open the product template, activate the Appointment Lite App Block, and save the theme. Direct-booking-only services can skip this step.': '对于使用商品页的服务，请打开商品模板、启用 Appointment Lite App Block 并保存主题。仅使用独立预约页的服务可以跳过。'
});

Object.assign(zh, {
  'How timing works': '时间如何计算', 'Duration is the appointment length. Buffer is reserved after each appointment before the next start time. Capacity controls how many customers can book the same start time.': '服务时长是一次预约实际占用的时间；缓冲时间会预留在两次预约之间，用于整理、移动或准备；单时段容量决定同一个开始时间可被多少位客户预约。',
  'Start-time calculation': '预约时间计算', 'A {duration}-minute service with a {buffer}-minute buffer creates a new start time every {step} minutes.': '{duration} 分钟服务 + {buffer} 分钟缓冲，会每隔 {step} 分钟生成一个新的预约开始时间。',
  'Example for {start}–{end}: {slots}. The last appointment must finish by {end}.': '例如 {start}–{end}：可预约开始时间为 {slots}。最后一笔预约必须在 {end} 前结束。',
  'No enabled weekly hours yet. Start times will appear after you enable a day or add special hours.': '暂未启用每周营业时间。启用星期或添加特殊营业时间后，这里会显示预约开始时间示例。',
  'Activity': '预约动态',
  'Open the configured product page or direct booking page and submit one test booking. The booking should appear in Bookings.': '打开已配置的商品页或独立预约页，提交一条测试预约，并确认该记录出现在预约记录中。',
  'Any service can use the product-page App Block, a direct booking page, or both. The booking source is configured independently from the service type.': '任何服务都可以使用商品页 App Block、独立预约页或同时使用两种入口；预约入口与服务类型独立配置。',
  'Step 1 connects product-page services to the storefront App Block': '第 1 步将商品页服务连接到店铺 App Block'
});

Object.assign(zh, {
  'Booking mode': '预约方式', 'How should customers book time?': '客户如何选择预约时间？',
  'Choose a booking mode. Appointment Lite will only show settings that apply to that mode.': '选择预约方式后，只展示该方式真正需要的配置项。',
  'Minute / hour': '分钟 / 小时', 'Customers choose one start time. Best for consultations, installation, visits, and single classes.': '客户选择一个开始时间，适合咨询、安装、到店和单次课程。',
  'All day': '全天预约', 'Customers choose a date only. Best for day-long installation, events, passes, or day services.': '客户只选择日期，适合全天安装、活动、日票或整日服务。',
  'Multiple sessions': '多时段预约', 'Customers choose several time slots in one booking. Best for course packs and repeat services.': '一次预约选择多个时间段，适合课程包和多次服务。',
  'Daily capacity': '每日容量', 'bookings / day': '笔 / 天', 'No time selection': '无需选择具体时间',
  'Customers choose a date only. Duration and buffer do not apply to all-day bookings.': '客户只选择日期；全天预约不使用服务时长和缓冲时间。',
  'Sessions per booking': '每次预约时段数', 'sessions': '个时段', 'Customers must select exactly this many available sessions before confirming.': '客户确认预约前必须选择指定数量的可预约时段。',
  'Open all day': '全天开放', 'Dates and capacity use the service time zone. Customers choose a date without a start time.': '日期和每日容量以服务默认时区为准，客户只选择日期，不选择开始时间。',
  'Enable the days customers can book all day.': '启用客户可以进行全天预约的星期。',
  'Close a holiday or open a normally closed date for all-day booking.': '可关闭节假日，或临时开放一个原本关闭的全天预约日期。',
  'Booking modes': '预约方式', 'All-day': '全天', 'Multi-session': '多时段', 'per day': '每天',
  'Recommended mode': '推荐预约方式', 'For this service type, {mode} is a good starting point. You can still choose another mode.': '根据当前服务类型，建议优先使用「{mode}」，你仍然可以选择其他预约方式。'
});


Object.assign(zh, {
  'Booking & purchase relationship': '预约与购买关系', 'Booking entry': '预约入口', 'Customer journey': '客户流程',
  'Choose the service type, how it relates to a purchase, and where customers enter the booking flow.': '选择服务类型、与购买的关系，以及客户从哪里进入预约流程。',
  'Standalone · no payment': '纯预约 · 无需付款', 'Standalone · payment required': '纯预约 · 需要付款', 'Product + appointment': '商品 + 预约', 'Purchase first · schedule after': '先购买 · 后预约',
  'Ready': '可使用',
  'Customers book the service directly without checkout.': '客户直接预约服务，无需进入结账。',
  'Free consultations, free measurements, or appointment-only service pages.': '适合免费咨询、免费测量或仅提供预约的服务页面。',
  'Customers choose a time first, then complete SHOPLINE checkout.': '客户先选择预约时间，再完成 SHOPLINE 结账。',
  'Paid classes, massage, photography, or professional sessions.': '适合付费课程、按摩、摄影或专业服务。',
  'Keep the normal product purchase flow and add appointment booking as another action.': '保留商品正常购买流程，同时增加预约入口。',
  'Design consultations, showroom visits, measurement, or pre-sale services.': '适合设计咨询、到店体验、测量或售前服务。',
  'Customers buy first, then schedule the included service from an eligible order.': '客户先完成购买，再基于符合条件的订单预约配套服务。',
  'Installation, delivery setup, onboarding, or post-purchase service.': '适合安装、配送调试、上门配置或售后服务。',
  'No checkout is required. If you use a SHOPLINE product page, use a dedicated appointment-only template so other products keep their normal purchase buttons.': '无需结账。如果使用 SHOPLINE 商品页，请为纯预约商品使用独立的预约模板，避免影响其他商品的正常购买按钮。',
  'Customers choose an available time first. Appointment Lite temporarily holds that capacity, then sends them to SHOPLINE checkout. The booking is confirmed only after payment.': '客户先选择可预约时间，Appointment Lite 会临时保留该时段，然后进入 SHOPLINE 结账；只有支付成功后预约才会正式确认。',
  'Keep SHOPLINE Add to cart / Buy now actions. Appointment Lite appears as an additional booking action before purchase.': '保留 SHOPLINE 的加入购物车 / 立即购买按钮，Appointment Lite 作为购买前的额外预约入口。',
  'Display the Appointment Lite action on the linked SHOPLINE product.': '在关联的 SHOPLINE 商品页展示 Appointment Lite 预约入口。',
  'Use a shareable Appointment Lite booking page.': '使用可分享的 Appointment Lite 独立预约页。',
  'Use both the linked product page and a shareable booking page.': '同时使用关联商品页和可分享的独立预约页。',
  'Choose the SHOPLINE product connected to this appointment experience.': '选择与此预约体验关联的 SHOPLINE 商品。',
  'This product keeps its normal purchase actions; Appointment Lite adds a separate booking action.': '该商品继续保留正常购买按钮，Appointment Lite 额外增加预约入口。',
  'This product will be used to verify which paid orders can schedule the service.': '该商品将用于识别哪些已付款订单可以预约对应服务。',
  'This product will provide the SHOPLINE price and checkout for the paid appointment.': '该商品将为付费预约提供 SHOPLINE 价格与结账能力。',
  'No SHOPLINE product is required for a standalone direct booking page.': '纯预约的独立预约页无需关联 SHOPLINE 商品。',
  'Use a dedicated appointment-only product template if you do not want native purchase buttons on this service product.': '如果该服务商品不需要原生购买按钮，请使用独立的纯预约商品模板。',
  'Keep the SHOPLINE purchase actions and show Appointment Lite as an additional booking option.': '保留 SHOPLINE 商品购买按钮，并将 Appointment Lite 作为额外预约选项。',
  'For appointment-only product pages, use a dedicated SHOPLINE product template without native purchase buttons.': '对于纯预约商品页，请使用独立的 SHOPLINE 商品模板并移除该模板中的原生购买按钮。',
  'SHOPLINE checkout': 'SHOPLINE 结账', 'Payment flow': '支付流程', 'Checkout variant': '结账规格', 'Payment hold': '付款保留时长',
  'Select a product first': '请先选择商品', 'Loading checkout variants…': '正在加载结账规格…', 'Choose checkout variant': '选择结账规格',
  'The selected variant provides the checkout price. Use a dedicated appointment product for the cleanest setup.': '所选规格将决定结账价格。建议为付费预约使用独立的预约商品。',
  'The selected slot is temporarily reserved while the customer pays.': '客户付款期间，所选预约时段会被临时保留。',
  'Select the SHOPLINE product used to charge for this appointment.': '请选择用于收取本次预约费用的 SHOPLINE 商品。',
  'This variant provides the price used at SHOPLINE checkout.': '该规格提供 SHOPLINE 结账时使用的价格。',
  'No variants are available for this product.': '该商品没有可用规格。', 'Could not load variants': '无法加载规格',
  'Could not load checkout variants from SHOPLINE.': '无法从 SHOPLINE 加载结账规格。',
  'Customers choose a time first. Appointment Lite holds that capacity while they complete SHOPLINE checkout.': '客户先选择预约时间；完成 SHOPLINE 结账期间，Appointment Lite 会临时保留该时段。',
  'Choose the SHOPLINE variant customers will pay for.': '请选择客户付款时使用的 SHOPLINE 商品规格。',
  'Checkout started': '已开始结账', 'The selected appointment time is being held while payment is completed.': '客户付款期间，所选预约时间正在临时保留。',
  'Payment confirmed': '付款已确认', 'SHOPLINE reported a successful payment and the appointment was confirmed.': 'SHOPLINE 已确认付款成功，预约已正式确认。',
  'Payment hold expired': '付款保留已过期', 'Payment was not confirmed before the hold expired, so the selected time was released.': '付款未在保留时间内确认，所选预约时间已释放。',
  'Payment arrived after the appointment hold was released. Review this booking before contacting the customer.': '预约时段释放后才收到付款结果，请先核对这条预约再联系客户。',
  '5 minutes': '5 分钟', '10 minutes': '10 分钟', '15 minutes': '15 分钟', '20 minutes': '20 分钟', '30 minutes': '30 分钟',
  'Could not prepare SHOPLINE payment confirmation. Please try saving the service again.': '暂时无法完成 SHOPLINE 付款确认配置，请重新保存服务后再试。'
});

Object.assign(zh, {
  'STAFF OPERATIONS': '员工运营', 'Team schedule': '员工排期', 'Review who is assigned today or jump to another date.': '查看当天员工预约安排，也可以切换到其他日期。',
  'Loading team schedule…': '正在加载员工排期…', 'No team appointments on this date': '这一天没有员工预约', 'Confirmed staff assignments will appear here.': '已确认并分配员工的预约会显示在这里。',
  'Could not load team schedule': '无法加载员工排期', 'Open booking': '打开预约', 'No bookings assigned': '暂无预约', 'Unassigned': '未分配员工',
  'appointment': '条预约', 'appointments': '条预约', 'Avatar': '头像', 'Preset or custom image': '预设或自定义图片', 'Upload image': '上传图片', 'Use initials': '使用姓名首字母',
  'Custom images are resized in your browser before saving, so no separate file storage is required.': '自定义图片会在浏览器中自动压缩后保存，不需要额外的图片存储服务。',
  'Email appointment updates': '邮件通知员工', 'Send this staff member new assignment, reschedule, reassignment, and cancellation emails.': '向该员工发送新预约、改期、改派和取消通知邮件。',
  'Email on': '邮件通知开启', 'Email off': '邮件通知关闭', 'Set the team member profile, notifications, and store-local working schedule.': '设置员工头像、通知方式以及店铺本地时区下的工作时间。',
  'Choose a PNG, JPG, or WebP image.': '请选择 PNG、JPG 或 WebP 图片。', 'Choose an image smaller than 5 MB.': '请选择小于 5 MB 的图片。',
  'List':'列表','Calendar':'日历','Daily calendar':'日历排期','Review staff appointments in a compact list or daily calendar.':'通过列表或日历查看员工当天的预约安排。','All-day':'全天','No scheduled bookings':'暂无预约','AI portrait or custom image':'AI 真人头像或自定义图片','Customer':'客户',
  'Could not read that image.': '无法读取这张图片。', 'Could not decode that image.': '无法解析这张图片。', 'The processed avatar is still too large. Try a simpler image.': '处理后的头像仍然过大，请尝试更简单的图片。',
  'Built-in portrait or custom image': '内置头像或自定义图片',
  'Choose a built-in staff portrait, upload a photo, or use initials. Custom images are resized in your browser before saving.': '选择内置员工头像、上传照片或使用姓名首字母。自定义图片会在浏览器中压缩后保存。'
});

Object.assign(zh, {
  'Calendar Sync': '日历同步', 'Calendar integrations': '日历集成', 'CALENDAR SYNC': '日历同步',
  'Google Calendar': 'Google 日历', 'GOOGLE CALENDAR': 'Google 日历',
  'Checking Google Calendar…': '正在检查 Google 日历…', 'Checking': '检查中',
  'Google Calendar is available.': 'Google 日历已可使用。', 'Ready': '已就绪',
  'Google Calendar needs setup.': 'Google 日历暂不可用。', 'Unavailable': '暂不可用',
  'Connect one business Google Calendar to keep your store appointments together. Staff can receive assignment updates by email and do not need a Google account.': '连接一个商家 Google 日历，统一管理店铺预约。员工可通过邮箱接收分配通知，无需 Google 账号。',
  'Connect your store calendar once and Appointment Lite will keep confirmed appointments in sync.': '商家只需连接一次 Google 日历，Appointment Lite 会自动同步已确认预约。',
  'Google Calendar is ready. Connect your business calendar when you want appointments to appear there.': 'Google 日历已就绪。连接商家日历后，预约会自动同步到该日历。',
  'Google Calendar is temporarily unavailable. Your appointment and email features are not affected.': 'Google 日历暂不可用，预约和邮件通知功能不受影响。',
  'BUSINESS CALENDAR': '商家日历', 'Business appointment calendar': '商家预约日历',
  'Use one Google account for the store. New bookings, changes, and cancellations will sync automatically.': '整个店铺只需连接一个 Google 账号，新预约、改期和取消都会自动同步。',
  'One store calendar for all appointments': '一个店铺日历同步全部预约',
  'Connect Google Calendar': '连接 Google 日历', 'Change calendar': '更换日历', 'Reconnect': '重新连接', 'Sync now': '立即同步', 'Disconnect': '断开连接',
  'Connected': '已连接', 'Connection error': '连接异常', 'Not connected': '未连接',
  'Google account': 'Google 账号', 'Selected calendar': '当前日历', 'Last synced': '最近同步', 'Not synced yet': '尚未同步',
  'Choose business calendar': '选择商家日历', 'Choose the Google Calendar your store will use for appointments.': '选择店铺用于同步预约的 Google 日历。',
  'Choose the calendar where you want store appointments to appear.': '请选择预约需要同步到的 Google 日历。',
  'Loading Google calendars…': '正在加载 Google 日历…', 'Loading calendars…': '正在加载日历…', 'Choose calendar': '选择日历',
  'Save calendar': '保存日历', 'Primary': '主日历', 'Owned calendars': '个可用日历',
  'No owned calendars are available for this account.': '该 Google 账号没有可用日历。', 'Choose a Google Calendar.': '请选择一个 Google 日历。',
  'Google Calendar connected.': 'Google 日历已连接。', 'Calendar selection saved.': '日历选择已保存。', 'Google Calendar disconnected.': 'Google 日历已断开。',
  'Allow pop-ups to connect Google Calendar, then try again.': '请允许浏览器弹窗后重新连接 Google 日历。',
  'Could not load Google Calendar.': '无法加载 Google 日历，请稍后重试。', 'Could not connect Google Calendar.': '无法连接 Google 日历，请重试。',
  'Could not load calendars.': '无法加载日历，请重试。', 'Could not save calendar.': '无法保存日历，请重试。', 'Could not sync calendar.': '日历同步失败，请稍后重试。',
  'Calendar sync completed.': '日历同步完成。', 'Calendar sync completed with errors.': '日历同步完成，但部分预约未能同步。', 'appointments': '条预约',
  'Disconnect business Google Calendar?': '断开商家 Google 日历？',
  'Appointment Lite will stop syncing store appointments to this Google Calendar. Email notifications will keep working.': '断开后将停止同步预约到该 Google 日历，邮件通知仍会正常工作。', 'Disconnect calendar': '断开日历',
  'STAFF NOTIFICATIONS': '员工通知', 'Staff do not need to connect Google': '员工无需连接 Google',
  'Add an email address to each staff member and Appointment Lite will send their assigned booking updates automatically.': '为员工填写邮箱后，Appointment Lite 会自动发送分配给他们的预约、改期和取消通知。',
  'Manage staff emails': '管理员工邮箱', 'Loading calendar…': '正在加载日历…',
  'New bookings and appointment changes sync automatically after you save.': '保存后，新预约和预约变更会自动同步。',
  'The merchant inbox receives store-wide appointment activity. It can be Gmail, QQ, 163, Outlook, or any normal email address. Staff notifications are configured separately in Staff.': '商家主邮箱用于接收全店预约动态，可使用 Gmail、QQ、163、Outlook 或其他常用邮箱；员工通知请在“员工”中单独配置。',
  'Choose where appointment emails are delivered and which updates each audience receives.': '设置预约邮件的收件地址，并选择客户和商家分别接收哪些通知。',
  'Replies from customers will be sent here.': '客户回复预约邮件时会发送到此邮箱。', 'Receives store-wide appointment notifications.': '用于接收全店预约通知。',
  'Turn each message on or off. Staff assignment emails are managed from Staff.': '可单独开启或关闭每类邮件；员工分配通知请在“员工”中设置。',
  'Emails sent to the customer who made the appointment.': '发送给提交预约的客户。', 'Store-wide updates sent to the merchant inboxes above.': '发送到上方设置的商家通知邮箱。',
  'Send after a booking is created.': '预约创建后发送确认邮件。', 'Send when appointment details change.': '预约内容变更时发送更新邮件。',
  'Send when the appointment is cancelled.': '预约取消时发送通知邮件。', 'Send before the appointment starts.': '预约开始前发送提醒邮件。',
  'Send after a customer completes a booking.': '客户完成预约后通知商家。',
  'Used for both customer and merchant pre-appointment reminders.': '同时用于客户和商家的履约前提醒。', 'Send reminder': '发送时间',
  'Primary merchant inbox': '商家主通知邮箱', 'Additional merchant inboxes': '其他商家通知邮箱', 'One address per line, up to 8 addresses in total.': '每行填写一个邮箱，最多支持 8 个地址。',
  'New bookings': '预约成功', 'Changes & reschedules': '预约修改', 'Cancellations': '预约取消',
  'Customer notifications': '客户通知', 'Choose which appointment emails customers receive.': '选择客户会收到哪些预约邮件。',
  'Booking confirmation': '预约成功', 'Send a confirmation when a booking is created.': '预约创建成功后向客户发送确认邮件。',
  'Appointment changes': '预约修改', 'Send an update when the appointment changes.': '预约内容发生变更时向客户发送更新邮件。',
  'Cancellation': '预约取消', 'Send an email when the appointment is cancelled.': '预约取消时向客户发送通知邮件。',
  'Pre-appointment reminder': '履约前提醒', 'Send a reminder before the appointment starts.': '在预约开始前发送提醒邮件。',
  'Merchant notifications': '商家通知', 'Choose which store-wide appointment emails your merchant inbox receives.': '选择商家主邮箱会收到哪些全店预约通知。',
  'Notify the merchant inbox when a customer books.': '客户完成预约后通知商家主邮箱。', 'Notify the merchant inbox when appointment details change.': '预约内容发生变更时通知商家主邮箱。',
  'Notify the merchant inbox when an appointment is cancelled.': '预约取消时通知商家主邮箱。', 'Remind the merchant before the appointment starts.': '在预约开始前提醒商家主邮箱。',
  'Reminder timing': '提醒时间', 'Applies to customer and merchant reminder emails.': '同时应用于客户和商家的履约前提醒邮件。',
  '3 hours before': '提前 3 小时', '6 hours before': '提前 6 小时', '12 hours before': '提前 12 小时', '24 hours before': '提前 1 天', '48 hours before': '提前 2 天', '72 hours before': '提前 3 天',
  'Customer reminder': '客户提醒', 'Merchant reminder': '商家提醒', 'Merchant new': '商家新预约', 'Merchant updated': '商家预约修改', 'Merchant cancelled': '商家预约取消', 'Customer changed': '客户改期', 'Store changed': '商家修改',
  'View {count} more': '查看另外 {count} 条', 'Appointments on {date}': '{date} 的预约', 'appointments on this day': '条当日预约',
  'Order sync needs authorization': '订单同步需要授权',
  'Allow Appointment Lite to read SHOPLINE orders so paid bookings can be confirmed automatically. Appointment Lite does not modify orders.': '授权 Appointment Lite 读取 SHOPLINE 订单后，付费预约才能自动确认。Appointment Lite 不会修改订单。',
  'Authorize order access': '授权订单读取权限', 'Sync SHOPLINE orders': '同步 SHOPLINE 订单',
  'Order sync authorization is required for this service.': '此服务需要先授权 SHOPLINE 订单读取权限。',
  'SHOPLINE orders synced.': 'SHOPLINE 订单已同步。', 'No new SHOPLINE orders to sync.': '暂无新的 SHOPLINE 订单需要同步。', 'Could not sync SHOPLINE orders.': '无法同步 SHOPLINE 订单，请稍后重试。',
  'SHOPLINE order': 'SHOPLINE 订单',
  'Post-purchase scheduling link': '购买后预约链接',
  'Send the private scheduling link after an eligible SHOPLINE order is paid.': '符合条件的 SHOPLINE 订单付款后，向客户发送私密预约链接。'
});


Object.assign(zh, {
  'SHOPLINE order': 'SHOPLINE 订单', 'Payment': '付款', 'Appointment': '预约', 'No payment required': '无需付款',
  'Unpaid': '未付款', 'Paid': '已付款', 'Payment expired': '付款已超时', 'Needs review': '需要处理',
  'Waiting for payment': '等待付款', 'Awaiting scheduling': '待预约', 'Partially scheduled': '部分已预约', 'Scheduled': '已预约',
  'Order cancelled': '订单已取消', 'appointments scheduled': '个已预约', 'Private link sent': '私密预约链接已发送',
  'Service location': '服务地点', 'Choose where this appointment is delivered. SHOPLINE locations stay managed in SHOPLINE Admin.': '选择预约的履约地点。SHOPLINE 地点仍统一在 SHOPLINE 后台维护。',
  'SHOPLINE location': 'SHOPLINE 地点', 'Use a location already configured in SHOPLINE.': '使用已在 SHOPLINE 后台创建的地点。',
  'Customer address': '客户地址', 'Collect the service address from the customer or paid order.': '预约时收集客户服务地址；购买后预约可优先使用订单收货地址。',
  'Online': '线上服务', 'This appointment does not need a physical location.': '此预约无需实体地点。',
  'Custom location': '自定义地点', 'Enter a one-off location for this service.': '手动填写该服务的地点。',
  'Refresh locations': '刷新地点', 'Choose a SHOPLINE location': '选择 SHOPLINE 地点', 'Locations are read from SHOPLINE Admin.': '地点从 SHOPLINE 后台读取。',
  'Customer address': '客户地址', 'Customers enter the service address while booking. For purchase-first appointments, the SHOPLINE shipping address is prefilled when available.': '客户预约时填写服务地址；先购买后预约时，如订单包含收货地址会自动预填。',
  'Online service': '线上服务', 'No physical address is required for this appointment.': '此预约无需填写实体地址。',
  'Location access needs authorization': '地点读取需要授权', 'Authorize SHOPLINE location access to choose a store location for this service.': '授权 Appointment Lite 读取 SHOPLINE 地点后，即可在服务中直接选择店铺地点。',
  'Authorize location access': '授权地点读取权限', 'Could not load SHOPLINE locations.': '无法读取 SHOPLINE 地点，请稍后重试。',
  'The selected SHOPLINE location is no longer available. Refresh locations and choose another one.': '所选 SHOPLINE 地点已不存在，请刷新地点后重新选择。',
  'Choose a SHOPLINE location.': '请选择一个 SHOPLINE 地点。', 'Default': '默认', 'Location removed from SHOPLINE': '该地点已从 SHOPLINE 删除',
  'Order lifecycle': '订单生命周期', 'Schedule remaining': '继续预约', 'Not scheduled yet': '尚未预约', 'Order created': '订单已创建', 'Open order': '打开订单'
});

Object.assign(zh, {
  'STOREFRONT': '店铺前台', 'Storefront setup': '店铺前台设置',
  'Connect Appointment Lite to your theme and customize the booking entry and dialog to match your storefront.': '连接 Appointment Lite 到店铺主题，并自定义预约入口与弹窗，使其更符合店铺风格。',
  'STOREFRONT DESIGN': '前台样式', 'Booking button & dialog': '预约按钮与弹窗',
  'Use one global storefront style for product-page App Blocks and direct booking pages. Service schedules and required booking fields remain protected.': '统一设置商品页 App Block 与独立预约页的前台样式；服务排期和必要预约字段仍由系统保护。',
  'Save storefront': '保存前台设置', 'Booking button': '预约按钮',
  'Control the product-page appointment entry without depending on the theme button color.': '单独控制商品页预约入口，不再依赖主题本身的按钮颜色。',
  'Button text': '按钮文案', 'Button color': '按钮颜色', 'Text color': '文字颜色', 'Button width': '按钮宽度',
  'Fit content avoids an oversized full-width button.': '根据内容自适应宽度，避免按钮横向铺满过长。', 'Fit content': '适应内容', 'Full width': '占满宽度',
  'Alignment': '对齐方式', 'Used when the button is not full width.': '按钮非占满宽度时生效。', 'Left': '左侧', 'Center': '居中', 'Right': '右侧',
  'Corner radius': '圆角', 'Booking dialog': '预约弹窗', 'Choose the accent and which optional customer-facing elements are visible.': '设置弹窗主题色，并控制可选的客户前台元素是否展示。',
  'Dialog title': '弹窗标题', 'Primary button text': '主按钮文字颜色', 'Primary action width': '主操作按钮宽度',
  'Fit content keeps Confirm booking compact on desktop.': '桌面端使用适应内容宽度，让确认预约按钮更紧凑。',
  'Primary action alignment': '主操作按钮对齐', 'Controls the desktop position. Mobile remains full width.': '控制桌面端按钮位置；移动端仍保持全宽，方便点击。',
  'Service summary': '服务摘要',
  'Duration, location, staff and service time zone.': '展示时长、地点、员工和服务时区。', 'Time zone selector': '时区选择器',
  'Let customers view appointment times in another time zone.': '允许客户切换时区查看预约时间。', 'Phone field': '手机号字段',
  'Collect an optional customer phone number.': '收集客户可选的手机号。', 'Notes field': '备注字段', 'Show the service notes prompt and textarea.': '展示服务备注提示和文本输入框。',
  'Footer guidance': '底部提示', 'Show the reschedule, cancellation, or payment guidance below the action.': '在确认按钮下展示改期、取消或付款相关提示。',
  'Name and email stay visible. Customer address stays required for services configured with Customer address, and staff selection stays visible when the customer must choose a staff member.': '姓名和邮箱始终展示。配置为“客户地址”的服务仍会要求填写地址；当服务要求客户选择员工时，员工选择也会保留。',
  'LIVE STOREFRONT PREVIEW': '前台实时预览', 'Product page + dialog': '商品页 + 弹窗',
  'The preview is simplified. Real availability, staff, customer-address fields, custom questions, and payment actions still follow each service configuration.': '此处为简化预览。实际可预约时段、员工、客户地址、自定义问题和付款动作仍以每项服务配置为准。',
  'CONNECTION': '连接配置', 'Theme & launch checklist': '主题与上线检查', 'Storefront settings saved.': '店铺前台设置已保存。',
  'Booking appearance': '预约视觉',
  'Choose a polished booking theme and keep the staff selector, calendar, customer form, and confirmation experience visually consistent.': '选择统一的预约视觉模板，让员工选择、日历、客户信息和预约确认保持一致。',
  'Booking theme': '预约主题', 'Start from a coordinated visual system instead of styling each booking step separately.': '从一套统一视觉系统开始，不需要逐个预约步骤分别配色。',
  'Minimal Light': '极简明亮', 'Clean, neutral, and broadly compatible.': '干净中性，适合大多数店铺。',
  'Warm Luxe': '暖调高级', 'Warm taupe, espresso actions, and a premium service feel.': '暖米棕背景、深咖操作色，更适合美容、服务和生活方式品牌。',
  'Soft Editorial': '柔和杂志感', 'Muted stone tones with a modern editorial edge.': '柔和石灰色调，强调现代品牌与杂志感。',
  'Background intensity': '背景强度', 'Controls how strongly the template color appears behind cards and panels.': '控制模板底色在卡片和内容区域中的明显程度。',
  'Soft': '柔和', 'Medium': '标准', 'Strong': '明显',
  'Corner style': '圆角风格', 'Applies one radius system across dialogs, cards, calendar cells, and fields.': '统一应用到弹窗、卡片、日历和输入框。',
  'Square-soft': '轻方角', 'Soft rounded': '柔和圆角', 'Rounded': '大圆角',
  'Primary action color': '主操作颜色', 'Follow the selected template, or use your existing custom booking colors.': '跟随模板主色，或继续使用自定义预约颜色。',
  'Follow template': '跟随模板', 'Custom color': '自定义颜色',
  'Unified booking appearance': '统一预约流程样式', 'Apply this theme to staff selection, calendar, customer details, and booking confirmation. Recommended.': '将该主题同步应用到员工选择、日历、客户信息和预约确认。建议开启。'
});

Object.assign(zh, {
  'Plan & billing': '套餐与账单', 'Subscription': '订阅', 'PLAN & BILLING': '套餐与账单',
  'Appointment Lite Pro': 'Appointment Lite 专业版', 'APPOINTMENT LITE PRO': 'APPOINTMENT LITE 专业版',
  'Everything you need to run appointments.': '完整使用 Appointment Lite 的预约管理能力。',
  'Activate Appointment Lite through SHOPLINE to continue managing services, staff, calendars, notifications, and storefront bookings.': '通过 SHOPLINE 开通 Appointment Lite 后，即可继续管理服务、员工、日历、通知和店铺前台预约。',
  '7-day free trial': '7 天免费试用', 'Services & advanced scheduling': '服务与高级排期', 'Staff management & availability': '员工管理与可预约时间',
  'Google Calendar sync': 'Google 日历同步', 'Customer & staff notifications': '客户与员工通知', 'Booking operations & records': '预约运营与记录', 'Storefront booking experience': '店铺前台预约体验',
  'Continue with SHOPLINE': '前往 SHOPLINE 开通', 'Refresh subscription': '刷新订阅状态',
  'The 7-day trial, billing, renewals, and eligibility are managed by SHOPLINE. Your Appointment Lite data stays saved if the subscription becomes inactive.': '7 天试用、扣费、续费和试用资格均由 SHOPLINE 管理。即使订阅失效，Appointment Lite 中已有数据仍会保留。',
  'Your subscription lifecycle is managed by SHOPLINE. Appointment Lite mirrors the latest SHOPLINE status here.': '订阅生命周期由 SHOPLINE 管理，Appointment Lite 会在这里同步展示最新的 SHOPLINE 状态。',
  'CURRENT PLAN': '当前套餐', 'SUBSCRIPTION DETAILS': '订阅详情', 'Billing status': '账单状态', 'Status': '状态', 'Access': '应用权限', 'Trial': '试用',
  'Current period ends': '当前周期结束时间', 'Automatic renewal': '自动续费', 'Last synced': '最后同步时间',
  'Trial eligibility and conversion are controlled by SHOPLINE.': '试用资格和试用转付费由 SHOPLINE 控制。',
  'Subscription changes, payment, cancellation, and refunds are managed in SHOPLINE.': '套餐变更、付款、取消订阅和退款均由 SHOPLINE 管理。',
  'Subscription required': '需要订阅', 'Subscription integration disabled': '订阅功能未启用', 'Free trial active': '免费试用中',
  '{count} days left in free trial': '免费试用剩余 {count} 天', '{count} days remaining': '剩余 {count} 天', 'Grace period': '宽恕期', 'Active': '生效中',
  'Payment pending': '等待付款', 'Cancelled': '已取消', 'Expired': '已过期', 'Inactive': '已失效', 'Available': '可使用', 'Paused': '已暂停',
  'Completed': '已完成', 'Not active': '未生效', 'On': '开启', 'Off': '关闭', 'Not available': '暂无',
  'SHOPLINE is still processing this subscription. Refresh after payment or trial activation completes.': 'SHOPLINE 正在处理本次订阅，请在付款或试用开通完成后刷新状态。',
  'Latest SHOPLINE status': '最新 SHOPLINE 状态', 'No active SHOPLINE subscription was found for this store.': '当前店铺未找到生效中的 SHOPLINE 订阅。',
  'Could not refresh SHOPLINE subscription right now. The last known status is shown.': '暂时无法刷新 SHOPLINE 订阅状态，当前展示的是最近一次已知状态。',
  'SHOPLINE checkout is temporarily unavailable.': 'SHOPLINE 订阅结算页暂时不可用。', 'Could not open SHOPLINE subscription checkout.': '无法打开 SHOPLINE 订阅结算页。',
  'SHOPLINE subscription refreshed.': 'SHOPLINE 订阅状态已刷新。',
  'SHOPLINE subscription restored. Full access is available again.': 'SHOPLINE 套餐已恢复，Appointment Lite 的完整功能现已重新开放。'
});

Object.assign(zh, {
  'How is this appointment unlocked?':'这项预约如何获得资格？','Standalone booking':'独立预约','Customers can book without first purchasing a specific SHOPLINE product.':'客户无需先购买指定 SHOPLINE 商品即可预约。','Consultations, classes, showroom visits, sales meetings, and independent services.':'适合咨询、课程、到店体验、销售会议及其他独立服务。','Purchase-triggered booking':'购买后预约','Customers book only after an eligible SHOPLINE product is paid.':'客户购买并支付指定 SHOPLINE 商品后才能预约。','Installation, onboarding, delivery setup, paid service packages, and post-purchase fulfillment.':'适合安装、交付培训、配送设置、服务包及其他售后履约。','Does this standalone appointment require payment?':'独立预约是否需要付款？','No payment':'无需付款','The appointment is confirmed immediately after the customer selects a time.':'客户选择时间并提交后立即确认预约。','Pay during booking':'预约时付款','Choose a time first, then complete SHOPLINE checkout before confirmation.':'客户先选择时间，再完成 SHOPLINE 结账，付款成功后确认预约。','Products that unlock this appointment':'触发预约资格的商品','Choose trigger products':'选择触发商品','Checkout product':'结账商品','SHOPLINE checkout product':'SHOPLINE 结账商品','Storefront placement':'前台展示位置','Choose where customers can discover this standalone appointment. Placement never changes purchase eligibility or checkout behavior.':'选择客户可以在哪里看到这项独立预约。展示位置不会改变购买资格或结账逻辑。','Direct booking link':'独立预约链接','Regular page App Block':'普通页面 App Block','Staff Directory block':'员工目录 Block','Product detail App Block':'商品详情页 App Block','All products':'全部商品','Selected products':'指定商品','Choose display products':'选择展示商品','App Embed floating launcher':'App Embed 全局悬浮预约入口','Purchase-triggered services are scheduled from the private order link after payment. Public storefront placement is disabled for these services.':'购买后预约会在付款成功后通过私密订单链接进行预约，因此不开放公开前台展示入口。','Booking model':'预约类型','Standalone booking · pay during booking':'独立预约 · 预约时付款','Standalone booking · no payment':'独立预约 · 无需付款','Unlock products':'触发商品','Direct link':'独立链接','Page block':'页面 Block','Staff directory':'员工目录','Selected product pages':'指定商品页','All product pages':'全部商品页','App Embed':'App Embed','No storefront placement':'未配置前台展示','No products selected':'尚未选择商品','Choose purchase trigger products':'选择购买触发商品','These products unlock the appointment after payment.':'这些商品付款成功后会产生预约资格。','These products only control where the App Block appears.':'这些商品仅决定 App Block 在哪些商品页展示。','Choose checkout product':'选择结账商品','This product supplies the SHOPLINE checkout price.':'该商品仅提供 SHOPLINE 结账价格。','Enable at least one storefront placement or direct booking link.':'请至少开启一个前台展示位置或独立预约链接。','Choose at least one display product or switch product placement to All products.':'请选择至少一个展示商品，或切换为全部商品。'
});

Object.assign(zh, {
  'BOOKING MODEL':'预约模式', 'STOREFRONT PLACEMENT':'前台展示', 'AVAILABILITY':'可预约时间', 'DETAILS':'服务信息',
  'Placement':'展示位置', 'Details':'服务信息',
  'How can customers book this service?':'客户如何预约这项服务？',
  'Set the business rule first. Where the booking appears in your storefront is configured separately.':'先确定预约业务规则；预约入口展示在哪里会在下一步单独配置。',
  'Use the customer-facing name of the appointment or service.':'填写客户实际看到的预约服务名称。',
  'Choose whether a purchase is required before a customer can schedule.':'选择客户是否必须先完成指定商品购买才能预约。',
  'Book without buying a specific product first.':'无需先购买指定商品即可预约。',
  'Book only after an eligible SHOPLINE product is paid.':'指定 SHOPLINE 商品付款成功后才能预约。',
  'Installation, onboarding, delivery setup, service packages, and post-purchase fulfillment.':'适合安装、交付培训、配送设置、服务包及其他售后履约。',
  'Payment':'付款', 'For standalone bookings, decide when the appointment becomes confirmed.':'独立预约可选择直接确认，或在预约时完成付款后确认。',
  'Confirm immediately after a valid time is selected.':'选择有效时间并提交后立即确认预约。',
  'Select time, then complete SHOPLINE checkout.':'先选择时间，再完成 SHOPLINE 结账。',
  'Paid orders containing any selected product create appointment eligibility. These products never control storefront placement.':'包含任一所选商品的订单付款成功后会产生预约资格；这些商品不决定预约入口展示位置。',
  'This product only supplies SHOPLINE price and checkout. It does not control where the booking is shown.':'该商品仅提供 SHOPLINE 价格和结账能力，不决定预约入口展示位置。',
  'Scheduling starts after payment':'付款后开放预约',
  'Appointment Lite waits for an eligible paid order, creates the booking entitlement, and sends the buyer a private scheduling link.':'Appointment Lite 会等待符合条件的订单付款成功，然后创建预约资格并向买家发送私密预约链接。',
  'Where should customers find this booking?':'客户可以在哪里找到这个预约入口？',
  'Placement controls discovery only. It never changes purchase eligibility, payment, schedule, or staff assignment.':'展示位置只决定客户在哪里看到预约入口，不会改变购买资格、付款、排期或员工分配逻辑。',
  'Private scheduling after purchase':'购买后通过私密链接预约',
  'Purchase-triggered services do not expose a public booking entry. Customers receive the private scheduling link after an eligible order is paid.':'购买后预约不会开放公开预约入口；符合条件的订单付款成功后，客户会收到私密预约链接。',
  'Share a hosted booking URL anywhere.':'可在任意渠道分享独立预约链接。',
  'Add the booking experience to a normal SHOPLINE page.':'将预约组件添加到普通 SHOPLINE 页面。',
  'Let customers choose a public staff profile first.':'先展示员工目录，再由客户选择员工预约。',
  'Show this service on all or selected product pages.':'在全部或指定商品详情页展示此服务。',
  'Add this service to the global floating booking launcher when App embeds is enabled in the theme editor.':'在主题编辑器启用 App Embed 后，将此服务加入全站悬浮预约入口。',
  'Product page coverage':'商品页展示范围', 'These products only decide where the App Block appears.':'这些商品仅决定 App Block 在哪些商品页展示。',
  'You can combine multiple storefront placements for the same standalone service.':'同一个独立预约服务可以同时启用多个前台展示入口。',
  'When can customers book?':'客户什么时候可以预约？',
  'Choose how time is selected, then configure the service-local booking window and schedule.':'先选择时间预约方式，再配置服务时区下的预约窗口和排期。',
  'Choose the time structure that matches this service.':'选择最适合这项服务的时间结构。',
  'Schedule & booking window':'排期与预约窗口',
  'Finish the customer experience':'完善客户预约体验',
  'Add optional classification, customer-facing details, location, staff, and questions.':'补充可选分类、客户可见信息、地点、员工和问题。',
  'Service category':'服务分类', 'General appointment':'通用预约',
  'Optional classification only. It does not change booking, payment, placement, or availability logic.':'仅用于可选分类，不会影响预约、付款、展示位置或可预约时间逻辑。',
  'Choose the booking model and payment behavior.':'选择预约模式和付款方式。',
  'Choose where customers can discover this service.':'选择客户可以在哪里看到这项服务。',
  'Set booking mode, timing, and availability.':'设置预约时间模式、时长和可预约时间。',
  'Finish customer-facing details, staff, and location.':'完善客户可见信息、员工和服务地点。',
  'Choose the booking model and storefront placement, then configure availability, location, and staff.':'选择预约模式和前台展示位置，然后配置可预约时间、地点和员工。',
  'Appointment Lite separates booking rules from storefront placement. A standalone service can use direct links, Page Blocks, Product Blocks, Staff Directory, or App Embed.':'Appointment Lite 将预约业务规则与前台展示位置分开。独立预约可使用独立链接、页面 Block、商品 Block、员工目录或 App Embed。',
  'Choose a booking model, storefront placement, and schedule.':'选择预约模式、前台展示位置和排期。',
  'Paid order required':'需要已付款订单', 'Private scheduling link':'私密预约链接'
});

const enByZh = new Map(Object.entries(zh).map(([english, chinese]) => [chinese, english]));

function t(value, variables = {}) {
  const english = enByZh.get(value) || value;
  let result = state.locale === 'zh-CN' ? (zh[english] || english) : english;
  for (const [key, replacement] of Object.entries(variables)) result = result.replaceAll(`{${key}}`, replacement);
  return result;
}

function staticTranslation(value = '') {
  const trimmed = String(value).trim();
  if (!trimmed) return value;
  const english = enByZh.get(trimmed) || trimmed;
  const translated = state.locale === 'zh-CN' ? (zh[english] || english) : english;
  return String(value).replace(trimmed, translated);
}

function applyStaticTranslations(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) continue;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const original = originalText.get(node);
    node.nodeValue = staticTranslation(original);
  }
  root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach(element => {
    if (!originalAttributes.has(element)) originalAttributes.set(element, Object.fromEntries(['placeholder', 'aria-label', 'title'].filter(name => element.hasAttribute(name)).map(name => [name, element.getAttribute(name)])));
    for (const [name, original] of Object.entries(originalAttributes.get(element))) element.setAttribute(name, staticTranslation(original));
  });
}

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(state.csrf ? { 'X-CSRF-Token': state.csrf } : {}), ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.message || 'Request failed'), { status: response.status, payload });
  return payload;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

const staffAvatarPresets = ['aurora', 'ocean', 'mint', 'peach', 'violet', 'sunset', 'sky', 'rose', 'nova'];
const staffAvatarFiles = { aurora:'staff-1.webp', ocean:'staff-2.webp', mint:'staff-3.webp', peach:'staff-4.webp', violet:'staff-5.webp', sunset:'staff-6.webp', sky:'staff-7.webp', rose:'staff-8.webp', nova:'staff-9.webp' };
function staffPresetImage(preset) {
  const file = staffAvatarFiles[preset] || staffAvatarFiles.aurora;
  return `<img src="/assets/staff/${file}?v=0.8.8" alt="" loading="lazy" decoding="async">`;
}
let staffAvatarDraft = { kind: 'preset', value: 'aurora' };

function normalizedStaffAvatar(staff = {}) {
  const avatar = staff.avatar || {};
  if (avatar.kind === 'custom' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(avatar.value || ''))) return { kind: 'custom', value: avatar.value };
  if (avatar.kind === 'initials') return { kind: 'initials', value: '' };
  return { kind: 'preset', value: staffAvatarPresets.includes(avatar.value) ? avatar.value : 'aurora' };
}

function staffAvatarMarkup(staff = {}, className = '') {
  const avatar = normalizedStaffAvatar(staff);
  const initial = escapeHtml(String(staff.name || 'S').trim().slice(0, 1).toUpperCase() || 'S');
  if (avatar.kind === 'custom') return `<span class="staff-avatar ${className}"><img src="${escapeHtml(avatar.value)}" alt=""></span>`;
  if (avatar.kind === 'initials') return `<span class="staff-avatar initials ${className}">${initial}</span>`;
  return `<span class="staff-avatar preset-${avatar.value} ${className}">${staffPresetImage(avatar.value)}</span>`;
}

function setStaffAvatarDraft(avatar, name = '') {
  staffAvatarDraft = normalizedStaffAvatar({ avatar, name });
  $('#staffAvatarKind').value = staffAvatarDraft.kind;
  $('#staffAvatarValue').value = staffAvatarDraft.value;
  const preview = $('#staffAvatarPreview');
  if (preview) preview.outerHTML = staffAvatarMarkup({ avatar: staffAvatarDraft, name: name || $('#staffName')?.value || 'S' }, 'preview').replace('<span ', '<span id="staffAvatarPreview" ');
  $$('#staffAvatarPresets [data-avatar-preset]').forEach(button => button.classList.toggle('selected', staffAvatarDraft.kind === 'preset' && button.dataset.avatarPreset === staffAvatarDraft.value));
}

function renderStaffAvatarPresets() {
  const root = $('#staffAvatarPresets');
  if (!root) return;
  const name = $('#staffName')?.value || 'Staff';
  root.innerHTML = staffAvatarPresets.map((preset, index) => `<button type="button" class="staff-avatar-preset" data-avatar-preset="${preset}" aria-label="Staff portrait ${index + 1}">${staffAvatarMarkup({ name, avatar: { kind: 'preset', value: preset } }, 'preset-button')}</button>`).join('');
  root.querySelectorAll('[data-avatar-preset]').forEach(button => button.addEventListener('click', () => setStaffAvatarDraft({ kind: 'preset', value: button.dataset.avatarPreset }, name)));
  setStaffAvatarDraft(staffAvatarDraft, name);
}

async function processStaffAvatarFile(file) {
  if (!file || !/^image\/(?:png|jpeg|webp)$/.test(file.type)) throw new Error('Choose a PNG, JPG, or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode that image.'));
    img.src = dataUrl;
  });
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = (image.naturalWidth - side) / 2;
  const sy = (image.naturalHeight - side) / 2;
  let smallest = '';
  for (const size of [192, 160, 128, 112]) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
    for (const quality of [.72, .62, .52]) {
      let output = canvas.toDataURL('image/webp', quality);
      if (!output.startsWith('data:image/webp')) output = canvas.toDataURL('image/jpeg', quality);
      if (!smallest || output.length < smallest.length) smallest = output;
      if (output.length <= 36000) return output;
    }
  }
  if (smallest && smallest.length <= 45000) return smallest;
  throw new Error('The processed avatar is still too large. Try a simpler image.');
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  $('#toastRegion').append(item);
  setTimeout(() => item.remove(), 4500);
}

function showError(error) { toast(t(error.message || String(error)), 'error'); }

function formatSubscriptionDate(value) {
  if (!value) return t('Not available');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('Not available');
  return new Intl.DateTimeFormat(state.locale === 'zh-CN' ? 'zh-CN' : 'en', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: state.shop?.timezone || 'UTC'
  }).format(date);
}

function subscriptionStatusText(subscription = state.subscription) {
  if (!subscription?.enabled) return t('Subscription integration disabled');
  if (subscription?.accessAllowed && subscription?.isTrial) {
    const days = Number(subscription.trialDaysRemaining);
    return Number.isFinite(days) ? t('{count} days left in free trial', { count: String(days) }) : t('Free trial active');
  }
  if (subscription?.accessAllowed && subscription?.accessReason === 'GRACE_PERIOD') return t('Grace period');
  if (subscription?.accessAllowed) return t('Active');
  if (subscription?.status === 'pending') return t('Payment pending');
  if (subscription?.status === 'cancelled') return t('Cancelled');
  if (subscription?.status === 'expired') return t('Expired');
  if (subscription?.status === 'unactive') return t('Inactive');
  return t('Subscription required');
}

function renderSubscriptionStatus(subscription = state.subscription, syncError = state.subscriptionSyncError) {
  state.subscription = subscription || null;
  state.subscriptionSyncError = syncError || '';
  const accessMode = subscription?.adminMode || (subscription?.enabled && !subscription?.accessAllowed ? 'subscription_required' : 'full');
  const restricted = accessMode === 'subscription_required';
  const archiveMode = accessMode === 'archive';
  state.accessMode = accessMode;
  state.restricted = restricted;
  state.archiveMode = archiveMode;
  document.body.classList.toggle('subscription-restricted', restricted);
  document.body.classList.toggle('subscription-archive', archiveMode);
  $('#subscriptionGate')?.classList.toggle('hidden', !restricted);
  $('#bookingArchiveNotice')?.classList.toggle('hidden', !archiveMode);
  $('#renewSubscriptionBilling')?.classList.toggle('hidden', !archiveMode);

  $$('.nav-item').forEach(button => {
    const archiveAllowed = ['bookings', 'billing'].includes(button.dataset.view);
    button.disabled = restricted || (archiveMode && !archiveAllowed);
  });

  const sidebarTitle = $('#sidebarStatusTitle');
  const sidebarProvider = $('#sidebarProvider');
  if (sidebarTitle) sidebarTitle.textContent = t(archiveMode ? 'Read-only archive' : (restricted ? 'Subscription required' : 'Store connected'));
  if (sidebarProvider) sidebarProvider.textContent = subscription?.enabled
    ? `${t(subscription?.planName || 'Appointment Lite Pro')} · ${subscriptionStatusText(subscription)}`
    : sidebarProvider.textContent;

  const gateStatus = $('#subscriptionGateStatus');
  if (gateStatus) {
    if (subscription?.status === 'pending') gateStatus.textContent = t('SHOPLINE is still processing this subscription. Refresh after payment or trial activation completes.');
    else if (subscription?.status && subscription.status !== 'none') gateStatus.textContent = `${t('Latest SHOPLINE status')}: ${subscriptionStatusText(subscription)}`;
    else gateStatus.textContent = t('No active SHOPLINE subscription was found for this store.');
  }
  const gateError = $('#subscriptionGateError');
  if (gateError) {
    gateError.textContent = syncError ? t('Could not refresh SHOPLINE subscription right now. The last known status is shown.') : '';
    gateError.classList.toggle('hidden', !syncError);
  }

  const statusText = subscriptionStatusText(subscription);
  if ($('#billingPlanName')) $('#billingPlanName').textContent = subscription?.planName || 'Appointment Lite Pro';
  if ($('#billingPrice')) $('#billingPrice').textContent = `$${Number(subscription?.price?.amount || 5.99).toFixed(2)}`;
  if ($('#billingStatus')) $('#billingStatus').textContent = statusText;
  if ($('#billingAccess')) $('#billingAccess').textContent = t(archiveMode ? 'Read-only' : (subscription?.accessAllowed ? 'Available' : 'Paused'));
  if ($('#billingTrial')) $('#billingTrial').textContent = subscription?.isTrial
    ? (Number.isFinite(Number(subscription.trialDaysRemaining)) ? t('{count} days remaining', { count: String(subscription.trialDaysRemaining) }) : t('Active'))
    : t(subscription?.type === 'paid' ? 'Completed' : 'Not active');
  if ($('#billingRenewal')) $('#billingRenewal').textContent = formatSubscriptionDate(subscription?.expiresAt);
  if ($('#billingAutoRenew')) $('#billingAutoRenew').textContent = t(subscription?.autoRecurring ? 'On' : 'Off');
  if ($('#billingLastSynced')) $('#billingLastSynced').textContent = formatSubscriptionDate(subscription?.lastSyncedAt);
  const badge = $('#billingStatusBadge');
  if (badge) {
    badge.textContent = archiveMode ? t('Read-only') : statusText;
    badge.classList.toggle('success', Boolean(subscription?.accessAllowed));
    badge.classList.toggle('disabled', !subscription?.accessAllowed);
  }

  if (archiveMode) {
    state.bookingView = 'list';
    $$('[data-booking-view]').forEach(button => button.classList.toggle('active', button.dataset.bookingView === 'list'));
    $('#bookingTable')?.classList.remove('hidden');
    $('#bookingCalendar')?.classList.add('hidden');
    $('#calendarControls')?.classList.add('hidden');
  }

  if (restricted) {
    $$('.view').forEach(view => view.classList.add('hidden'));
    $('#pageEyebrow').textContent = t('Subscription');
    $('#pageTitle').textContent = t('Appointment Lite Pro');
  }
}

async function startSubscriptionCheckout() {
  const button = $('#startSubscription');
  const errorBox = $('#subscriptionGateError');
  if (!button) return;
  button.disabled = true;
  if (errorBox) errorBox.classList.add('hidden');
  try {
    // v0.7.0.7: keep Appointment Lite open and launch SHOPLINE billing in a
    // separate browser tab/window. The package page remains the only activation entry.
    const packageUrl = String(state.subscription?.shoplinePlanUrl || '').trim();
    if (!packageUrl) throw new Error('SHOPLINE subscription package URL is not configured.');
    const opened = window.open(packageUrl, '_blank', 'noopener,noreferrer');
    if (!opened) throw new Error('Your browser blocked the SHOPLINE subscription window. Please allow pop-ups and try again.');
    button.disabled = false;
  } catch (error) {
    if (errorBox) {
      errorBox.textContent = t(error.message || 'Could not open SHOPLINE subscription checkout.');
      errorBox.classList.remove('hidden');
    } else showError(error);
    button.disabled = false;
  }
}

function openShoplineRenewal() {
  const url = String(state.subscription?.shoplinePlanUrl || '').trim();
  if (url) {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) showError(new Error('Your browser blocked the SHOPLINE subscription window. Please allow pop-ups and try again.'));
    return;
  }
  startSubscriptionCheckout();
}

async function refreshSubscription() {
  const buttons = [$('#syncSubscriptionGate'), $('#syncSubscriptionBilling')].filter(Boolean);
  const wasUnavailable = state.accessMode !== 'full';
  buttons.forEach(button => { button.disabled = true; });
  try {
    const payload = await api('/subscription/sync', { method: 'POST', body: '{}' });
    renderSubscriptionStatus(payload.subscription, '');
    if (payload.subscription?.accessAllowed && payload.subscription?.adminMode === 'full') {
      await loadBootstrap({ suppressRecoveryToast: true });
      toast(t(wasUnavailable || payload.recovery?.recovered
        ? 'SHOPLINE subscription restored. Full access is available again.'
        : 'SHOPLINE subscription refreshed.'));
    } else {
      if (payload.subscription?.adminMode === 'archive') switchView('bookings');
      toast(t('SHOPLINE subscription refreshed.'));
    }
  } catch (error) { showError(error); }
  finally { buttons.forEach(button => { button.disabled = false; }); }
}

async function recoverSubscriptionIfNeeded({ force = false } = {}) {
  if (!state.subscription?.enabled || state.accessMode === 'full' || state.subscriptionRecoveryInFlight) return;
  const now = Date.now();
  if (!force && now - state.subscriptionRecoveryLastCheckAt < 15_000) return;
  state.subscriptionRecoveryLastCheckAt = now;
  state.subscriptionRecoveryInFlight = true;
  try {
    const payload = await api('/subscription?refresh=1');
    renderSubscriptionStatus(payload.subscription, payload.syncError || '');
    if (payload.subscription?.accessAllowed && payload.subscription?.adminMode === 'full') {
      await loadBootstrap({ suppressRecoveryToast: true });
      toast(t('SHOPLINE subscription restored. Full access is available again.'));
    }
  } catch (error) {
    console.warn('Could not refresh SHOPLINE subscription while resuming the app:', error.message);
  } finally {
    state.subscriptionRecoveryInFlight = false;
  }
}

function switchView(name) {
  if (state.restricted) {
    state.currentView = 'billing';
    $$('.view').forEach(view => view.classList.add('hidden'));
    $('#subscriptionGate')?.classList.remove('hidden');
    $('#pageEyebrow').textContent = t('Subscription');
    $('#pageTitle').textContent = t('Appointment Lite Pro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (state.archiveMode && !['bookings', 'billing'].includes(name)) name = 'bookings';
  state.currentView = name;
  $$('.view').forEach(view => view.classList.add('hidden'));
  $(`#${name}View`).classList.remove('hidden');
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  $('#pageEyebrow').textContent = t(viewLabels[name]?.[0] || 'Workspace');
  $('#pageTitle').textContent = t(viewLabels[name]?.[1] || 'Appointment Lite');
  if (name === 'rules') loadRules();
  if (name === 'bookings') {
    if (state.archiveMode) loadBookings();
    else Promise.all([ensureStaff(), loadRules(), loadBookings()]);
  }
  if (name === 'staff') Promise.all([loadStaff(), loadStaffOperations($('#staffOperationsDate')?.value || '')]);
  if (name === 'billing') renderSubscriptionStatus();
  if (name === 'calendar') loadCalendarSync();
  if (name === 'email') renderEmailStudio();
  if (name === 'setup') loadThemeEditorLink();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDateParts(date) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return { day: '--', month: '---' };
  return { day: String(parsed.getUTCDate()).padStart(2, '0'), month: parsed.toLocaleString(state.locale === 'zh-CN' ? 'zh-CN' : 'en', { month: 'short', timeZone: 'UTC' }) };
}

function renderDashboard(payload) {
  $('#activeRuleCount').textContent = payload.stats.activeRuleCount;
  $('#bookingCount').textContent = payload.stats.bookingCount;
  $('#upcomingCount').textContent = payload.stats.upcomingCount;
  $('#planName').textContent = payload.email.configured ? t('Ready') : t('Setup needed');
  $('#ruleCountNote').textContent = state.locale === 'zh-CN' ? `共 ${payload.stats.ruleCount} 条服务规则` : `${payload.stats.ruleCount} total service rule${payload.stats.ruleCount === 1 ? '' : 's'}`;

  const upcoming = payload.nextBookings || [];
  $('#upcomingList').innerHTML = upcoming.length ? upcoming.map(booking => {
    const date = formatDateParts(booking.date);
    const displayTime = booking.bookingMode === 'all_day' ? t('All day') : booking.time;
    return `<div class="timeline-item"><div class="timeline-date"><strong>${date.day}</strong><span>${date.month}</span></div><div><strong>${escapeHtml(booking.productTitle)}</strong><span>${escapeHtml(booking.customer?.name || t('Customer'))}${booking.staff ? ` · ${escapeHtml(booking.staff)}` : ''}</span></div><time>${escapeHtml(displayTime)}</time></div>`;
  }).join('') : `<div class="empty-compact">${t('No upcoming appointments yet. Your next confirmed booking will appear here.')}</div>`;

  const checks = [
    { done: Boolean(payload.shop.storeId), label: t('SHOPLINE store connected') },
    { done: Boolean(payload.onboarding?.appBlockConfirmed), label: t('Enable the Appointment Lite App Block') },
    { done: payload.stats.activeRuleCount > 0, label: t('At least one active service rule') },
    { done: payload.stats.bookingCount > 0, label: t('Test the storefront booking flow') }
  ];
  const completed = checks.filter(item => item.done).length;
  const percent = Math.round(completed / checks.length * 100);
  $('#setupPercent').textContent = `${percent}%`;
  $('#setupProgress').style.width = `${percent}%`;
  $('#setupChecklist').innerHTML = checks.map(item => `<div class="check-item ${item.done ? 'done' : ''}"><i>✓</i><span>${escapeHtml(item.label)}</span></div>`).join('');
}

function minutesFromClock(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clockFromMinutes(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function slotPreview(start, end, duration, buffer) {
  const from = minutesFromClock(start);
  const until = minutesFromClock(end);
  const serviceMinutes = Number(duration);
  const bufferMinutes = Number(buffer || 0);
  const step = serviceMinutes + bufferMinutes;
  if (![from, until, serviceMinutes, bufferMinutes, step].every(Number.isFinite) || serviceMinutes <= 0 || step <= 0 || until <= from) return [];
  const result = [];
  for (let cursor = from; cursor + serviceMinutes <= until; cursor += step) result.push(clockFromMinutes(cursor));
  return result;
}

function renderSlotLogic() {
  const textNode = $('#slotLogicText');
  const exampleNode = $('#slotLogicExample');
  if (!textNode || !exampleNode) return;
  const duration = Number($('#duration')?.value || 0);
  const buffer = Number($('#buffer')?.value || 0);
  const step = duration + buffer;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(buffer) || buffer < 0 || step <= 0) {
    textNode.textContent = '';
    exampleNode.textContent = '';
    return;
  }
  textNode.textContent = t('A {duration}-minute service with a {buffer}-minute buffer creates a new start time every {step} minutes.', {
    duration: String(duration), buffer: String(buffer), step: String(step)
  });
  const row = $$('.schedule-row').find(item => item.querySelector('input[type=checkbox]')?.checked);
  if (!row) {
    exampleNode.textContent = t('No enabled weekly hours yet. Start times will appear after you enable a day or add special hours.');
    return;
  }
  const times = row.querySelectorAll('input[type=time]');
  const start = times[0]?.value || '';
  const end = times[1]?.value || '';
  const slots = slotPreview(start, end, duration, buffer);
  exampleNode.textContent = slots.length
    ? t('Example for {start}–{end}: {slots}. The last appointment must finish by {end}.', { start, end, slots: slots.join(', ') })
    : t('No enabled weekly hours yet. Start times will appear after you enable a day or add special hours.');
}

function renderSchedule(values = []) {
  $('#weeklySchedule').innerHTML = days.map((day, weekday) => {
    const current = values.find(value => value.weekday === weekday);
    const window = current?.windows?.[0] || { start: '09:00', end: '17:00' };
    const enabled = Boolean(current?.enabled);
    return `<div class="schedule-row ${enabled ? 'enabled' : ''}" data-weekday="${weekday}"><label><input type="checkbox" ${enabled ? 'checked' : ''}>${t(day)}</label><input type="time" value="${escapeHtml(window.start)}" aria-label="${t(day)} ${t('start')}"><input type="time" value="${escapeHtml(window.end)}" aria-label="${t(day)} ${t('end')}"></div>`;
  }).join('');
  $$('.schedule-row input[type=checkbox]').forEach(input => input.addEventListener('change', () => {
    input.closest('.schedule-row').classList.toggle('enabled', input.checked);
    renderSlotLogic();
  }));
  $$('.schedule-row input[type=time]').forEach(input => input.addEventListener('input', renderSlotLogic));
  renderScheduleMode();
  renderSlotLogic();
}

function addQuestion(question = {}) {
  if ($$('.question-row').length >= 5) return toast(t('You can add up to five custom questions.'), 'error');
  const row = document.createElement('div');
  row.className = 'question-row';
  row.innerHTML = `<input type="text" maxlength="120" placeholder="${t('Question shown to customers')}" value="${escapeHtml(question.label || '')}"><label><input type="checkbox" ${question.required ? 'checked' : ''}> ${t('Required')}</label><button type="button" class="secondary small">${t('Remove')}</button>`;
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('#questions').append(row);
}

function addException(exception = {}) {
  if ($$('.exception-row').length >= 120) return toast(t('Too many availability exceptions.'), 'error');
  const row = document.createElement('div');
  row.className = 'exception-row';
  const closed = exception.closed !== false;
  const window = exception.windows?.[0] || { start: '09:00', end: '17:00' };
  row.innerHTML = `<input class="exception-date" type="date" value="${escapeHtml(exception.date || '')}" aria-label="${t('Date')}"><select class="exception-mode" aria-label="${t('Availability exceptions')}"><option value="closed" ${closed ? 'selected' : ''}>${t('Closed all day')}</option><option value="hours" ${!closed ? 'selected' : ''}>${t('Special hours')}</option></select><input class="exception-start" type="time" value="${escapeHtml(window.start)}" ${closed ? 'disabled' : ''}><input class="exception-end" type="time" value="${escapeHtml(window.end)}" ${closed ? 'disabled' : ''}><button type="button" class="secondary small">${t('Remove')}</button>`;
  const sync = () => {
    const allDay = $('#bookingMode')?.value === 'all_day';
    const closed = row.querySelector('.exception-mode').value === 'closed';
    const disabled = allDay || closed;
    row.querySelector('.exception-start').disabled = disabled;
    row.querySelector('.exception-end').disabled = disabled;
    row.classList.toggle('closed', closed);
    row.classList.toggle('all-day', allDay);
  };
  row.querySelector('.exception-mode').addEventListener('change', sync);
  row.querySelector('button').addEventListener('click', () => row.remove());
  sync();
  $('#availabilityExceptions').append(row);
  if ($('#bookingMode')?.value === 'all_day') renderExceptionsMode();
}

function renderExceptions(values = []) {
  $('#availabilityExceptions').innerHTML = '';
  (values || []).forEach(addException);
  renderExceptionsMode();
}


function renderStaffSchedule(values = []) {
  $('#staffWeeklySchedule').innerHTML = days.map((day, weekday) => {
    const current = values.find(value => Number(value.weekday) === weekday);
    const window = current?.windows?.[0] || { start: '09:00', end: '17:00' };
    const enabled = Boolean(current?.enabled);
    return `<div class="schedule-row staff-schedule-row ${enabled ? 'enabled' : ''}" data-weekday="${weekday}"><label><input type="checkbox" ${enabled ? 'checked' : ''}>${t(day)}</label><input type="time" value="${escapeHtml(window.start)}" aria-label="${t(day)} ${t('start')}"><input type="time" value="${escapeHtml(window.end)}" aria-label="${t(day)} ${t('end')}"></div>`;
  }).join('');
  $$('#staffWeeklySchedule .staff-schedule-row input[type=checkbox]').forEach(input => input.addEventListener('change', () => input.closest('.staff-schedule-row').classList.toggle('enabled', input.checked)));
}

function addStaffException(exception = {}) {
  const rows = $$('#staffAvailabilityExceptions .staff-exception-row');
  if (rows.length >= 120) return toast(t('Too many availability exceptions.'), 'error');
  const row = document.createElement('div');
  row.className = 'exception-row staff-exception-row';
  const closed = exception.closed !== false;
  const window = exception.windows?.[0] || { start: '09:00', end: '17:00' };
  row.innerHTML = `<input class="exception-date" type="date" value="${escapeHtml(exception.date || '')}" aria-label="${t('Date')}"><select class="exception-mode"><option value="closed" ${closed ? 'selected' : ''}>${t('Closed all day')}</option><option value="hours" ${!closed ? 'selected' : ''}>${t('Special hours')}</option></select><input class="exception-start" type="time" value="${escapeHtml(window.start)}" ${closed ? 'disabled' : ''}><input class="exception-end" type="time" value="${escapeHtml(window.end)}" ${closed ? 'disabled' : ''}><button type="button" class="secondary small">${t('Remove')}</button>`;
  const sync = () => {
    const isClosed = row.querySelector('.exception-mode').value === 'closed';
    row.querySelector('.exception-start').disabled = isClosed;
    row.querySelector('.exception-end').disabled = isClosed;
    row.classList.toggle('closed', isClosed);
  };
  row.querySelector('.exception-mode').addEventListener('change', sync);
  row.querySelector('button').addEventListener('click', () => row.remove());
  sync();
  $('#staffAvailabilityExceptions').append(row);
}

function renderStaffExceptions(values = []) {
  $('#staffAvailabilityExceptions').innerHTML = '';
  (values || []).forEach(addStaffException);
}

function staffPayload() {
  return {
    name: $('#staffName').value,
    email: $('#staffEmail').value,
    phone: $('#staffPhone').value,
    roleTitle: $('#staffRoleTitle').value, region: '', expertise: $('#staffExpertise').value,
    supportedServices: $('#staffSupportedServices').value.split(/\n+/).map(value => value.trim()).filter(Boolean),
    bio: $('#staffBio').value, publicProfile: $('#staffPublicProfile').checked,
    avatar: { kind: $('#staffAvatarKind').value || 'preset', value: $('#staffAvatarValue').value || '' },
    notifications: { emailEnabled: Boolean($('#staffEmail').value.trim() && $('#staffEmailNotifications').checked) },
    status: $('#staffStatus').value,
    weeklyAvailability: $$('#staffWeeklySchedule .staff-schedule-row').map(row => ({
      weekday: Number(row.dataset.weekday),
      enabled: row.querySelector('input[type=checkbox]').checked,
      windows: [{ start: row.querySelectorAll('input[type=time]')[0].value, end: row.querySelectorAll('input[type=time]')[1].value }]
    })),
    availabilityExceptions: $$('#staffAvailabilityExceptions .staff-exception-row').map(row => ({
      date: row.querySelector('.exception-date').value,
      closed: row.querySelector('.exception-mode').value === 'closed',
      windows: row.querySelector('.exception-mode').value === 'hours' ? [{ start: row.querySelector('.exception-start').value, end: row.querySelector('.exception-end').value }] : []
    })).filter(item => item.date)
  };
}

function staffWorkSummary(staff) {
  const enabled = (staff.weeklyAvailability || []).filter(day => day.enabled);
  if (!enabled.length) return t('No regular hours');
  const names = enabled.map(day => t(days[day.weekday]).slice(0, 3)).join(', ');
  const firstWindow = enabled[0]?.windows?.[0];
  return `${names}${firstWindow ? ` · ${firstWindow.start}–${firstWindow.end}` : ''}`;
}

function renderStaff() {
  const query = $('#staffSearch')?.value.trim().toLowerCase() || '';
  const rows = state.staff.filter(item => !query || [item.name, item.email, item.phone, item.roleTitle, item.region, item.expertise, ...(item.supportedServices || [])].some(value => String(value || '').toLowerCase().includes(query)));
  if ($('#staffResultCount')) $('#staffResultCount').textContent = state.locale === 'zh-CN' ? `${rows.length} 位员工` : `${rows.length} staff`;
  const root = $('#staffList');
  if (!root) return;
  if (!rows.length) {
    root.innerHTML = `<div class="panel empty"><strong>${t(state.staff.length ? 'No staff match your search' : 'No staff yet')}</strong><span>${t(state.staff.length ? 'Try a different keyword.' : 'Add your first team member to start staff-aware scheduling.')}</span></div>`;
    return;
  }
  root.innerHTML = rows.map(item => {
    const services = item.assignedServices || [];
    const notification = item.email && item.notifications?.emailEnabled === true ? t('Email on') : t('Email off');
    return `<article class="panel staff-row"><div class="staff-main">${staffAvatarMarkup(item)}<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.email || item.phone || t('No contact details'))}</span><small class="staff-notification-state">${escapeHtml(notification)}</small></div></div><div class="staff-services"><span>${t('Services')}</span><strong>${services.length}</strong><small>${services.slice(0,2).map(service => escapeHtml(service.title)).join(', ') || t('Not assigned')}</small></div><div class="staff-hours"><span>${t('Working hours')}</span><strong>${escapeHtml(staffWorkSummary(item))}</strong></div><span class="status-badge ${item.status === 'active' ? 'enabled' : 'disabled'}">${t(item.status === 'active' ? 'Active' : 'Inactive')}</span><div class="row-actions"><button class="secondary small" data-edit-staff="${item._id}">${t('Edit')}</button><button class="secondary small" data-delete-staff="${item._id}">${t('Delete')}</button></div></article>`;
  }).join('');
  $$('[data-edit-staff]').forEach(button => button.addEventListener('click', () => openStaff(state.staff.find(item => item._id === button.dataset.editStaff))));
  $$('[data-delete-staff]').forEach(button => button.addEventListener('click', () => confirmAction('Delete this staff member?', 'Historical bookings keep the staff snapshot, but active confirmed bookings must be reassigned first.', 'Delete staff', async () => {
    await api(`/staff/${button.dataset.deleteStaff}`, { method: 'DELETE' });
    toast(t('Staff member deleted.'));
    await Promise.all([loadStaff(), loadRules(), loadBookings(), loadStaffOperations($('#staffOperationsDate')?.value || '')]);
  })));
}

async function loadStaff({ force = false } = {}) {
  if (!force && state.staff.length && state.currentView !== 'staff') return state.staff;
  const root = $('#staffList');
  if (root && !state.staff.length) root.innerHTML = '<div class="panel loading">Loading staff…</div>';
  try {
    state.staff = (await api('/staff')).staff || [];
    renderStaff();
    renderRuleStaffOptions();
    renderBookingStaffFilter();
    return state.staff;
  } catch (error) { showError(error); return []; }
}

async function ensureStaff() {
  if (!state.staff.length) await loadStaff({ force: true });
  return state.staff;
}

function calendarEndpoint(suffix = '') {
  return `/calendar/google/store${suffix}`;
}

function businessCalendarCard(connection, configured) {
  const connected = connection?.status === 'connected';
  const errored = connection?.status === 'error';
  const statusLabel = connected ? 'Connected' : errored ? 'Connection error' : 'Not connected';
  const statusClass = connected ? 'enabled' : errored ? 'no_show' : 'disabled';
  const lastSync = connection?.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString(state.locale === 'zh-CN' ? 'zh-CN' : 'en') : t('Not synced yet');
  const actions = connection
    ? `<button type="button" class="secondary small" data-calendar-manage>${t('Change calendar')}</button><button type="button" class="secondary small" data-calendar-connect ${!configured ? 'disabled' : ''}>${t('Reconnect')}</button><button type="button" class="secondary small" data-calendar-sync-now ${!connected ? 'disabled' : ''}>${t('Sync now')}</button><button type="button" class="text-button calendar-disconnect" data-calendar-disconnect>${t('Disconnect')}</button>`
    : `<button type="button" class="google-connect-button" data-calendar-connect ${!configured ? 'disabled' : ''}>${googleGMark('small')}<span>${t('Connect Google Calendar')}</span></button>`;
  return `<article class="panel calendar-business-card"><div class="calendar-business-head"><div class="calendar-business-identity">${googleGMark()}<div><strong>${t('Business appointment calendar')}</strong><span>${t('One store calendar for all appointments')}</span></div></div><span class="status-badge ${statusClass}">${t(statusLabel)}</span></div><div class="calendar-business-details"><div><span>${t('Google account')}</span><strong>${escapeHtml(connection?.accountLabel || '—')}</strong></div><div><span>${t('Selected calendar')}</span><strong>${escapeHtml(connection?.calendarName || '—')}</strong>${connection?.calendarTimeZone ? `<small>${escapeHtml(connection.calendarTimeZone)}</small>` : ''}</div><div><span>${t('Last synced')}</span><strong>${escapeHtml(lastSync)}</strong></div></div><div class="calendar-business-actions">${actions}</div></article>`;
}

function renderCalendarSync() {
  const payload = state.calendarSync;
  if (!payload) return;
  const configured = Boolean(payload.configured);
  const configTitle = $('#calendarConfigTitle');
  const configText = $('#calendarConfigText');
  const configBadge = $('#calendarConfigBadge');
  if (configTitle) configTitle.textContent = t(configured ? 'Google Calendar is available.' : 'Google Calendar needs setup.');
  if (configText) configText.textContent = t(configured ? 'Google Calendar is ready. Connect your business calendar when you want appointments to appear there.' : 'Google Calendar is temporarily unavailable. Your appointment and email features are not affected.');
  if (configBadge) {
    configBadge.textContent = t(configured ? 'Ready' : 'Unavailable');
    configBadge.className = `status-badge ${configured ? 'enabled' : 'disabled'}`;
  }
  const root = $('#calendarBusinessCard');
  if (root) root.innerHTML = businessCalendarCard(payload.businessConnection || null, configured);
}

async function loadCalendarSync({ force = false } = {}) {
  if (!force && state.calendarSync && state.currentView !== 'calendar') return state.calendarSync;
  const root = $('#calendarBusinessCard');
  if (root && !state.calendarSync) root.innerHTML = '<div class="panel loading">Loading calendar…</div>';
  try {
    state.calendarSync = await api('/calendar');
    renderCalendarSync();
    return state.calendarSync;
  } catch (error) {
    console.warn('Calendar load failed:', error);
    if (root) root.innerHTML = `<div class="panel empty"><strong>${t('Could not load Google Calendar.')}</strong></div>`;
    return null;
  }
}

async function connectGoogleCalendar() {
  const popup = window.open('about:blank', 'appointmentLiteGoogleCalendar', 'popup=yes,width=620,height=760,resizable=yes,scrollbars=yes');
  if (!popup) return toast(t('Allow pop-ups to connect Google Calendar, then try again.'), 'error');
  state.calendarPopup = popup;
  try {
    popup.document.title = 'Appointment Lite · Google Calendar';
    const payload = await api(calendarEndpoint('/connect'));
    popup.location.href = payload.authorizationUrl;
    popup.focus();
  } catch (error) {
    try { popup.close(); } catch {}
    state.calendarPopup = null;
    console.warn('Calendar connect failed:', error);
    toast(t('Could not connect Google Calendar.'), 'error');
  }
}

async function openCalendarManager() {
  $('#calendarStaffId').value = 'store';
  $('#calendarDialogTitle').textContent = t('Choose business calendar');
  $('#calendarDialogSubtitle').textContent = t('Choose the Google Calendar your store will use for appointments.');
  $('#calendarAccountNotice').textContent = t('Loading Google calendars…');
  $('#calendarFormError').classList.add('hidden');
  $('#calendarSelect').innerHTML = `<option value="">${t('Loading calendars…')}</option>`;
  $('#saveCalendarSelection').disabled = true;
  $('#calendarDialog').showModal();
  try {
    const payload = await api(calendarEndpoint('/calendars'));
    const calendars = payload.calendars || [];
    if (!calendars.length) {
      $('#calendarSelect').innerHTML = `<option value="">${t('No owned calendars are available for this account.')}</option>`;
      $('#calendarAccountNotice').textContent = t('No owned calendars are available for this account.');
      return;
    }
    $('#calendarSelect').innerHTML = calendars.map(calendar => `<option value="${escapeHtml(calendar.id)}" ${calendar.id === payload.selectedCalendarId ? 'selected' : ''}>${escapeHtml(calendar.summary)}${calendar.primary ? ` · ${t('Primary')}` : ''}${calendar.timeZone ? ` · ${escapeHtml(calendar.timeZone)}` : ''}</option>`).join('');
    $('#calendarAccountNotice').textContent = `${calendars.length} ${t('Owned calendars')}`;
    $('#saveCalendarSelection').disabled = false;
  } catch (error) {
    console.warn('Calendar list failed:', error);
    $('#calendarFormError').textContent = t('Could not load calendars.');
    $('#calendarFormError').classList.remove('hidden');
    $('#calendarAccountNotice').textContent = t('Connection error');
  }
}

async function saveCalendarSelection(event) {
  event.preventDefault();
  const calendarId = $('#calendarSelect').value;
  if (!calendarId) { $('#calendarFormError').textContent = t('Choose a Google Calendar.'); $('#calendarFormError').classList.remove('hidden'); return; }
  const button = $('#saveCalendarSelection'); button.disabled = true; $('#calendarFormError').classList.add('hidden');
  try {
    await api(calendarEndpoint(), { method: 'PUT', body: JSON.stringify({ calendarId }) });
    $('#calendarDialog').close(); toast(t('Calendar selection saved.')); await loadCalendarSync({ force: true });
  } catch (error) {
    console.warn('Calendar save failed:', error);
    $('#calendarFormError').textContent = t('Could not save calendar.');
    $('#calendarFormError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

async function syncGoogleCalendarNow(button) {
  if (button) button.disabled = true;
  try {
    const payload = await api(calendarEndpoint('/sync'), { method: 'POST' });
    const summary = payload.summary || {};
    if (Number(summary.errors || 0) > 0) toast(t('Calendar sync completed with errors.'), 'error');
    else toast(`${t('Calendar sync completed.')} ${Number(summary.total || 0)} ${t('appointments')}`);
    await loadCalendarSync({ force: true });
  } catch (error) {
    console.warn('Calendar sync failed:', error);
    toast(t('Could not sync calendar.'), 'error');
  } finally { if (button) button.disabled = false; }
}

function disconnectGoogleCalendar() {
  confirmAction(
    'Disconnect business Google Calendar?',
    'Appointment Lite will stop syncing store appointments to this Google Calendar. Email notifications will keep working.',
    'Disconnect calendar',
    async () => { await api(calendarEndpoint(), { method: 'DELETE' }); toast(t('Google Calendar disconnected.')); await loadCalendarSync({ force: true }); }
  );
}

function staffTimeMinutes(value = '') {
  const match = String(value).match(/^(\d{2}):(\d{2})$/);
  return match ? (Number(match[1]) * 60) + Number(match[2]) : null;
}

function renderStaffOperationsList(payload) {
  const rows = [];
  for (const group of payload.staff || []) {
    const member = state.staff.find(item => String(item._id) === String(group.id)) || { name: group.name, avatar: group.avatar };
    for (const item of group.assignments || []) rows.push({ ...item, staffName: group.name, staffMember: member, unassigned: false });
  }
  for (const item of payload.unassigned || []) rows.push({ ...item, staffName: t('Unassigned'), staffMember: { name: t('Unassigned'), avatar: { kind:'initials', value:'' } }, unassigned: true });
  rows.sort((a,b) => String(a.time || '99:99').localeCompare(String(b.time || '99:99')) || String(a.staffName).localeCompare(String(b.staffName)));
  return `<div class="staff-schedule-list"><div class="staff-schedule-list-head"><span>${t('Staff')}</span><span>${t('Time')}</span><span>${t('Services')}</span><span>${t('Customer')}</span><span>${t('Status')}</span><span></span></div>${rows.map(item => `<div class="staff-schedule-list-row"><div class="staff-schedule-list-person">${item.unassigned ? '<span class="staff-avatar initials small">?</span>' : staffAvatarMarkup(item.staffMember,'small')}<strong>${escapeHtml(item.staffName)}</strong></div><time>${escapeHtml(item.bookingMode === 'all_day' ? t('All day') : item.time)}</time><div><strong>${escapeHtml(item.serviceTitle)}</strong>${item.location ? `<small>${escapeHtml(item.location)}</small>` : ''}</div><span>${escapeHtml(item.customerName)}</span><span class="status-badge enabled">${t('Confirmed')}</span><button type="button" class="text-button" data-open-staff-booking="${item.bookingId}">${t('Open booking')}</button></div>`).join('')}</div>`;
}

function renderStaffOperationsCalendar(payload) {
  const groups = [...(payload.staff || [])];
  if ((payload.unassigned || []).length) groups.push({ id:'', name:t('Unassigned'), avatar:{kind:'initials',value:''}, assignments:payload.unassigned, unassigned:true });
  const timed = groups.flatMap(group => group.assignments || []).filter(item => item.bookingMode !== 'all_day' && staffTimeMinutes(item.time) !== null);
  const minMinute = timed.length ? Math.min(...timed.map(item => staffTimeMinutes(item.time))) : 9 * 60;
  const maxMinute = timed.length ? Math.max(...timed.map(item => staffTimeMinutes(item.time) + Math.max(30, Number(item.duration || 60)))) : 17 * 60;
  const startHour = Math.max(0, Math.min(22, Math.floor(minMinute / 60) - 1));
  const endHour = Math.min(24, Math.max(startHour + 6, Math.ceil(maxMinute / 60) + 1));
  const rangeStart = startHour * 60;
  const rangeMinutes = Math.max(60, (endHour - startHour) * 60);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
  const axis = hours.map((hour, index) => `<span style="left:${(index / (hours.length - 1 || 1)) * 100}%">${String(hour).padStart(2,'0')}:00</span>`).join('');
  const rows = groups.map(group => {
    const member = state.staff.find(item => String(item._id) === String(group.id)) || { name: group.name, avatar: group.avatar };
    const blocks = (group.assignments || []).map(item => {
      if (item.bookingMode === 'all_day') return `<button type="button" class="staff-calendar-block all-day" data-open-staff-booking="${item.bookingId}"><strong>${t('All day')}</strong><span>${escapeHtml(item.serviceTitle)}</span></button>`;
      const start = staffTimeMinutes(item.time) ?? rangeStart;
      const duration = Math.max(30, Number(item.duration || 60));
      const left = Math.max(0, Math.min(100, ((start - rangeStart) / rangeMinutes) * 100));
      const width = Math.max(8, Math.min(100 - left, (duration / rangeMinutes) * 100));
      return `<button type="button" class="staff-calendar-block" style="left:${left}%;width:${width}%" data-open-staff-booking="${item.bookingId}" title="${escapeHtml(`${item.time} · ${item.serviceTitle} · ${item.customerName}`)}"><strong>${escapeHtml(item.time)}</strong><span>${escapeHtml(item.serviceTitle)}</span><small>${escapeHtml(item.customerName)}</small></button>`;
    }).join('');
    return `<div class="staff-calendar-row"><div class="staff-calendar-person">${group.unassigned ? '<span class="staff-avatar initials small">?</span>' : staffAvatarMarkup(member,'small')}<span><strong>${escapeHtml(group.name)}</strong><small>${(group.assignments || []).length} ${t((group.assignments || []).length === 1 ? 'appointment' : 'appointments')}</small></span></div><div class="staff-calendar-track"><div class="staff-calendar-grid">${hours.slice(0,-1).map(() => '<i></i>').join('')}</div>${blocks || `<span class="staff-calendar-empty">${t('No scheduled bookings')}</span>`}</div></div>`;
  }).join('');
  return `<div class="staff-calendar"><div class="staff-calendar-axis"><span>${t('Staff')}</span><div>${axis}</div></div>${rows}</div>`;
}

function renderStaffOperations() {
  const root = $('#staffOperationsList');
  if (!root) return;
  const payload = state.staffOperations || { staff: [], unassigned: [] };
  const groups = payload.staff || [];
  const hasAny = groups.some(group => (group.assignments || []).length) || (payload.unassigned || []).length;
  $$('[data-staff-ops-view]').forEach(button => button.classList.toggle('active', button.dataset.staffOpsView === state.staffOperationsView));
  root.className = state.staffOperationsView === 'calendar' ? 'staff-operations-calendar-wrap' : '';
  if (!hasAny) {
    root.innerHTML = `<div class="staff-operations-empty"><strong>${t('No team appointments on this date')}</strong><span>${t('Confirmed staff assignments will appear here.')}</span></div>`;
    return;
  }
  root.innerHTML = state.staffOperationsView === 'calendar' ? renderStaffOperationsCalendar(payload) : renderStaffOperationsList(payload);
  $$('[data-open-staff-booking]').forEach(button => button.addEventListener('click', async () => {
    switchView('bookings');
    await loadBookings();
    const booking = state.bookings.find(item => String(item._id) === String(button.dataset.openStaffBooking));
    if (booking) openBookingFlow(booking);
  }));
}

async function loadStaffOperations(date = '') {
  try {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    state.staffOperations = await api(`/staff/operations${query}`);
    if ($('#staffOperationsDate')) $('#staffOperationsDate').value = state.staffOperations.date || date;
    renderStaffOperations();
    return state.staffOperations;
  } catch (error) {
    const root = $('#staffOperationsList');
    if (root) root.innerHTML = `<div class="staff-operations-empty"><strong>${t('Could not load team schedule')}</strong><span>${escapeHtml(error.message)}</span></div>`;
    return null;
  }
}

function openStaff(staff = null) {
  $('#staffForm').reset();
  $('#staffId').value = staff?._id || '';
  $('#staffDialogTitle').textContent = t(staff ? 'Edit staff' : 'Add staff');
  $('#staffName').value = staff?.name || '';
  $('#staffEmail').value = staff?.email || '';
  $('#staffPhone').value = staff?.phone || '';
  $('#staffRoleTitle').value = staff?.roleTitle || '';
  $('#staffExpertise').value = staff?.expertise || '';
  $('#staffSupportedServices').value = (staff?.supportedServices || []).join('\n');
  $('#staffBio').value = staff?.bio || '';
  $('#staffPublicProfile').checked = staff?.publicProfile === true;
  $('#staffStatus').value = staff?.status || 'active';
  $('#staffEmailNotifications').checked = Boolean(staff?.email && staff?.notifications?.emailEnabled === true);
  $('#staffEmailNotifications').disabled = !Boolean(staff?.email);
  staffAvatarDraft = normalizedStaffAvatar(staff || { name: '', avatar: { kind: 'preset', value: 'aurora' } });
  renderStaffAvatarPresets();
  setStaffAvatarDraft(staffAvatarDraft, staff?.name || 'Staff');
  renderStaffSchedule(staff?.weeklyAvailability || [1,2,3,4,5].map(weekday => ({ weekday, enabled: true, windows: [{ start: '09:00', end: '17:00' }] })));
  renderStaffExceptions(staff?.availabilityExceptions || []);
  $('#staffFormError').classList.add('hidden');
  $('#staffDialog').showModal();
}

async function saveStaff(event) {
  event.preventDefault();
  const id = $('#staffId').value;
  const button = $('#saveStaff');
  button.disabled = true;
  $('#staffFormError').classList.add('hidden');
  try {
    await api(id ? `/staff/${id}` : '/staff', { method: id ? 'PUT' : 'POST', body: JSON.stringify(staffPayload()) });
    $('#staffDialog').close();
    toast(t(id ? 'Staff member updated.' : 'Staff member created.'));
    await Promise.all([loadStaff({ force: true }), loadStaffOperations($('#staffOperationsDate')?.value || '')]);
  } catch (error) {
    $('#staffFormError').textContent = t(error.message);
    $('#staffFormError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

function setStaffAssignmentMode(mode = 'none') {
  const normalized = ['none', 'any', 'customer_choice', 'fixed'].includes(mode) ? mode : 'none';
  $('#staffAssignmentGrid').dataset.mode = normalized;
  $$('#staffAssignmentGrid [data-staff-mode]').forEach(button => button.classList.toggle('selected', button.dataset.staffMode === normalized));
  $('#ruleStaffPicker').classList.toggle('hidden', normalized === 'none');
  $('#ruleStaffPickerHint').textContent = t(normalized === 'fixed' ? 'Select exactly one active staff member.' : 'Select one or more active staff members.');
  if (normalized === 'fixed') {
    const checked = $$('#ruleStaffOptions input[type=checkbox]:checked');
    checked.slice(1).forEach(input => { input.checked = false; });
  }
}

function renderRuleStaffOptions(selectedIds = null) {
  const root = $('#ruleStaffOptions');
  if (!root) return;
  const current = selectedIds || $$('#ruleStaffOptions input[type=checkbox]:checked').map(input => input.value);
  const selected = new Set(current.map(String));
  const active = state.staff.filter(item => item.status === 'active');
  root.innerHTML = active.length ? active.map(item => `<label class="staff-check"><input type="checkbox" value="${item._id}" ${selected.has(String(item._id)) ? 'checked' : ''}>${staffAvatarMarkup(item, 'rule-assignment-avatar')}<span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.email || staffWorkSummary(item))}</small></span></label>`).join('') : `<div class="empty-compact">${t('No active staff yet. Add staff from the Staff page first.')}</div>`;
  root.querySelectorAll('input[type=checkbox]').forEach(input => input.addEventListener('change', () => {
    if ($('#staffAssignmentGrid').dataset.mode === 'fixed' && input.checked) root.querySelectorAll('input[type=checkbox]').forEach(other => { if (other !== input) other.checked = false; });
  }));
}

function currentStaffAssignment() {
  const mode = $('#staffAssignmentGrid')?.dataset.mode || 'none';
  const staffIds = mode === 'none' ? [] : $$('#ruleStaffOptions input[type=checkbox]:checked').map(input => input.value);
  return { mode, staffIds };
}

function renderBookingStaffFilter() {
  const select = $('#bookingStaffFilter');
  if (!select) return;
  const current = select.value;
  let staffRows = state.staff.map(item => ({ id: String(item._id), name: item.name }));
  if (state.archiveMode) {
    const archived = new Map();
    state.bookings.forEach(booking => {
      if (booking.staffId && booking.staff) archived.set(String(booking.staffId), booking.staff);
      (booking.occurrences || []).forEach(item => {
        if (item.staffId && (item.staffName || booking.staff)) archived.set(String(item.staffId), item.staffName || booking.staff);
      });
    });
    staffRows = [...archived.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }
  select.innerHTML = `<option value="">${t('All staff')}</option>${staffRows.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('')}`;
  select.value = staffRows.some(item => String(item.id) === current) ? current : '';
}

function productById(id) { return state.products.find(item => String(item.id) === String(id)); }

function productRefs(ids = []) {
  return [...new Set(ids.map(String))].map(id => productById(id)).filter(Boolean).map(item => ({ id: item.id, title: item.title || '', handle: item.handle || '' }));
}

function renderSelectedProductSummary(kind) {
  const root = kind === 'trigger' ? $('#triggerProductSummary') : $('#placementProductSummary');
  if (!root) return;
  const ids = state.ruleProductSelection[kind] || [];
  const rows = ids.map(productById).filter(Boolean);
  root.innerHTML = rows.length ? rows.map(item => `<span class="selected-product-chip">${escapeHtml(item.title || item.id)}<button type="button" data-remove-${kind}-product="${escapeHtml(item.id)}" aria-label="Remove">×</button></span>`).join('') : `<span class="hint">${t('No products selected')}</span>`;
  root.querySelectorAll(`[data-remove-${kind}-product]`).forEach(button => button.addEventListener('click', () => {
    const id = button.getAttribute(`data-remove-${kind}-product`);
    state.ruleProductSelection[kind] = ids.filter(value => String(value) !== String(id));
    renderSelectedProductSummary(kind);
  }));
}

function renderProductOptions(query = '') {
  const normalized = query.trim().toLowerCase();
  const matches = state.products.filter(product => !normalized || [product.title, product.handle].some(value => String(value || '').toLowerCase().includes(normalized)));
  const mode = state.productPickerMode || 'checkout';
  const selectedIds = mode === 'checkout' ? new Set([String($('#productSelect').value || '')]) : new Set((state.ruleProductSelection[mode] || []).map(String));
  $('#productOptions').innerHTML = matches.length ? matches.map(product => {
    const selected = selectedIds.has(String(product.id));
    const status = productStatusLabels[product.status] ? t(productStatusLabels[product.status]) : '';
    const meta = [product.handle || t('SHOPLINE product'), status].filter(Boolean).join(' · ');
    return `<button type="button" class="product-option ${selected ? 'selected' : ''}" role="option" aria-selected="${selected}" data-product-id="${escapeHtml(product.id)}"><span class="product-option-avatar">${escapeHtml(product.title.slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(product.title)}</strong><small>${escapeHtml(meta)}</small></span><i>✓</i></button>`;
  }).join('') : `<div class="empty-compact">${t('No matching products')}</div>`;
  $$('#productOptions .product-option').forEach(button => button.addEventListener('click', () => chooseProductForActivePicker(button.dataset.productId)));
}

async function chooseProductForActivePicker(productId) {
  const mode = state.productPickerMode || 'checkout';
  if (mode === 'checkout') return selectProduct(productId);
  const values = new Set((state.ruleProductSelection[mode] || []).map(String));
  if (values.has(String(productId))) values.delete(String(productId)); else values.add(String(productId));
  state.ruleProductSelection[mode] = [...values];
  renderSelectedProductSummary(mode);
  renderProductOptions($('#productSearch').value);
}

async function selectProduct(productId, { preserveVariant = false } = {}) {
  const product = state.products.find(item => item.id === productId);
  $('#productSelect').value = productId || '';
  $('#productPickerLabel').textContent = product?.title || t('Select checkout product');
  $('#productPickerButton').classList.toggle('has-value', Boolean(product));
  if ($('#productDialog').open) $('#productDialog').close();
  if (!preserveVariant) {
    $('#productVariantId').value = '';
    $('#productVariantTitle').value = '';
    $('#productVariantPrice').value = '';
  }
  if ($('#paymentMode')?.value === 'checkout') await loadPaidVariants(productId, { preserveVariant });
}

async function openProductPicker(mode) {
  state.productPickerMode = mode;
  $('#productDialogTitle').textContent = t(mode === 'trigger' ? 'Choose purchase trigger products' : mode === 'placement' ? 'Choose display products' : 'Choose checkout product');
  $('#productDialogSubtitle').textContent = t(mode === 'trigger' ? 'These products unlock the appointment after payment.' : mode === 'placement' ? 'These products only control where the App Block appears.' : 'This product supplies the SHOPLINE checkout price.');
  $('#productDialog').showModal();
  $('#productSearch').value = '';
  await ensureProducts();
  renderProductOptions();
  $('#productSearch').focus();
}

async function loadPaidVariants(productId, { preserveVariant = false } = {}) {
  const select = $('#paidVariantSelect');
  const meta = $('#paidCheckoutVariantMeta');
  state.paidVariants = [];
  if (!productId) {
    select.innerHTML = `<option value="">${t('Select a product first')}</option>`;
    meta.textContent = t('Select the SHOPLINE product used to charge for this appointment.');
    return;
  }
  select.disabled = true;
  select.innerHTML = `<option value="">${t('Loading checkout variants…')}</option>`;
  meta.textContent = t('Loading price options from SHOPLINE…');
  try {
    const payload = await api(`/products/${encodeURIComponent(productId)}/variants`, { cache: 'no-store' });
    state.paidVariants = payload.variants || [];
    select.innerHTML = `<option value="">${t('Choose checkout variant')}</option>${state.paidVariants.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title || t('Default'))}${item.price ? ` · ${escapeHtml(item.price)}` : ''}${item.sku ? ` · ${escapeHtml(item.sku)}` : ''}</option>`).join('')}`;
    const existing = preserveVariant ? $('#productVariantId').value : '';
    if (existing && state.paidVariants.some(item => item.id === existing)) select.value = existing;
    else if (state.paidVariants.length === 1) select.value = state.paidVariants[0].id;
    if (select.value) setPaidVariant(select.value);
    meta.textContent = state.paidVariants.length ? t('This variant provides the price used at SHOPLINE checkout.') : t('No variants are available for this product.');
  } catch (error) {
    select.innerHTML = `<option value="">${t('Could not load variants')}</option>`;
    meta.textContent = t('Could not load checkout variants from SHOPLINE.');
  } finally { select.disabled = false; }
}

function setPaidVariant(variantId) {
  const variant = state.paidVariants.find(item => item.id === variantId);
  $('#productVariantId').value = variant?.id || '';
  $('#productVariantTitle').value = variant?.title || '';
  $('#productVariantPrice').value = variant?.price || '';
}

async function ensureProducts(force = false) {
  if (!force && state.products.length) return;
  const previousProducts = state.products;
  const syncButton = $('#productSyncButton');
  const syncLabel = syncButton?.querySelector('span');
  if (syncButton) {
    syncButton.disabled = true;
    syncButton.classList.add('is-syncing');
  }
  if (syncLabel) syncLabel.textContent = t('Syncing…');
  if ($('#productSyncMeta')) $('#productSyncMeta').textContent = t(force ? 'Syncing latest products from SHOPLINE…' : 'Loading products from SHOPLINE…');
  $('#productOptions').innerHTML = productSkeletons();
  try {
    const payload = await api(`/products?refresh=${Date.now()}`, { cache: 'no-store' });
    state.products = payload.products || [];
    renderProductOptions($('#productSearch')?.value || '');
    if ($('#productSyncMeta')) {
      const reconciled = Boolean(payload.diagnostics?.reconciled);
      const base = state.locale === 'zh-CN'
        ? `${state.products.length} ${t('products synced just now')}`
        : `${state.products.length} product${state.products.length === 1 ? '' : 's'} synced just now`;
      $('#productSyncMeta').textContent = reconciled ? `${base} · ${t('Catalog sources reconciled')}` : base;
    }
    if (force) toast(t('SHOPLINE products synced.'));
  } catch (error) {
    state.products = previousProducts;
    if (previousProducts.length) renderProductOptions($('#productSearch')?.value || '');
    else $('#productOptions').innerHTML = `<div class="empty-compact">${t('Could not load products')}</div>`;
    if ($('#productSyncMeta')) $('#productSyncMeta').textContent = t('Could not sync SHOPLINE products. Try again.');
    showError(error);
  } finally {
    if (syncButton) {
      syncButton.disabled = false;
      syncButton.classList.remove('is-syncing');
    }
    if (syncLabel) syncLabel.textContent = t('Sync SHOPLINE products');
  }
}

function setServiceType(type = 'appointment') {
  const normalized = serviceTypeLabels[type] ? type : 'appointment';
  const select = $('#serviceType');
  if (!select) return;
  select.value = normalized;
  refreshRuleSelect(select);
}


function setBookingType(type = 'standalone') {
  const normalized = type === 'purchase_triggered' ? 'purchase_triggered' : 'standalone';
  $('#bookingType').value = normalized;
  $$('#bookingTypeGrid [data-booking-type]').forEach(button => button.classList.toggle('selected', button.dataset.bookingType === normalized));
  const purchase = normalized === 'purchase_triggered';
  $('#standalonePaymentFieldset')?.classList.toggle('hidden', purchase);
  $('#purchaseTriggerFields')?.classList.toggle('hidden', !purchase);
  $('#purchaseTriggeredNotice')?.classList.toggle('hidden', !purchase);
  $('#checkoutProductFields')?.classList.toggle('hidden', purchase || $('#paymentMode').value !== 'checkout');
  $('#purchasePlacementNotice')?.classList.toggle('hidden', !purchase);
  $('#storefrontPlacementFieldset')?.classList.toggle('purchase-triggered', purchase);
  $('#placementFootnote')?.classList.toggle('hidden', purchase);
  $('#storefrontPlacementFieldset')?.querySelectorAll('input,button').forEach(control => { if (!control.closest('#purchasePlacementNotice')) control.disabled = purchase; });
  if (purchase) {
    $('#commerceMode').value = 'product_post_purchase';
    $('#bookingSource').value = 'direct';
    $('#sourceType').value = 'standalone';
  } else setPaymentMode($('#paymentMode').value || 'none');
}

function setPaymentMode(mode = 'none') {
  const normalized = mode === 'checkout' ? 'checkout' : 'none';
  $('#paymentMode').value = normalized;
  $$('#paymentModeGrid [data-payment-mode]').forEach(button => button.classList.toggle('selected', button.dataset.paymentMode === normalized));
  const paid = normalized === 'checkout' && $('#bookingType').value === 'standalone';
  $('#checkoutProductFields')?.classList.toggle('hidden', !paid);
  $('#commerceMode').value = paid ? 'standalone_paid' : 'standalone_free';
  $('#bookingSource').value = 'direct';
  $('#sourceType').value = 'standalone';
}

function setProductPlacementScope(scope = 'all') {
  state.productPlacementScope = scope === 'selected' ? 'selected' : 'all';
  $$('[data-product-placement-scope]').forEach(button => button.classList.toggle('selected', button.dataset.productPlacementScope === state.productPlacementScope));
  $('#selectedPlacementProducts')?.classList.toggle('hidden', state.productPlacementScope !== 'selected');
}

function refreshPlacementUi() {
  const enabled = $('#placementProductBlock')?.checked === true;
  $('#productPlacementConfig')?.classList.toggle('hidden', !enabled);
  if (enabled) setProductPlacementScope(state.productPlacementScope);
}

function placementPayload() {
  if ($('#bookingType').value === 'purchase_triggered') return { directLink: false, pageBlock: false, staffDirectory: false, productBlock: { enabled: false, scope: 'all', productIds: [] }, appEmbed: { enabled: false } };
  return {
    directLink: $('#placementDirectLink').checked,
    pageBlock: $('#placementPageBlock').checked,
    staffDirectory: $('#placementStaffDirectory').checked,
    productBlock: {
      enabled: $('#placementProductBlock').checked,
      scope: state.productPlacementScope,
      productIds: $('#placementProductBlock').checked && state.productPlacementScope === 'selected' ? [...state.ruleProductSelection.placement] : []
    },
    appEmbed: { enabled: $('#placementAppEmbed').checked }
  };
}

function commerceModeNeedsProduct(mode = $('#commerceMode')?.value, bookingSource = $('#bookingSource')?.value) {
  return ['standalone_paid', 'product_pre_purchase', 'product_post_purchase'].includes(mode) || ['product', 'both'].includes(bookingSource);
}

function legacyCommerceMode(rule = {}) {
  if (commerceModeLabels[rule.commerceMode]) return rule.commerceMode;
  const bookingSource = rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product');
  return bookingSource === 'direct' && !rule.productId ? 'standalone_free' : 'product_pre_purchase';
}

function setCommerceMode(mode = 'product_pre_purchase') {
  const normalized = commerceModeLabels[mode] ? mode : 'product_pre_purchase';
  $('#commerceMode').value = normalized;
  $$('#commerceModeGrid [data-commerce-mode]').forEach(button => button.classList.toggle('selected', button.dataset.commerceMode === normalized));
  const guidance = {
    standalone_free: 'No checkout is required. If you use a SHOPLINE product page, use a dedicated appointment-only template so other products keep their normal purchase buttons.',
    standalone_paid: 'Customers choose an available time first. Appointment Lite temporarily holds that capacity, then sends them to SHOPLINE checkout. The booking is confirmed only after payment.',
    product_pre_purchase: 'Keep SHOPLINE Add to cart / Buy now actions. Appointment Lite appears as an additional booking action before purchase.',
    product_post_purchase: 'Customers complete the normal SHOPLINE purchase first. After payment, Appointment Lite emails the buyer a private link to schedule the included service.'
  }[normalized];
  $('#commerceGuidance').innerHTML = `<strong>${t(commerceModeLabels[normalized])}</strong><span>${t(guidance)}</span>`;
  if (normalized === 'product_post_purchase') $('#bookingSource').value = 'direct';
  setBookingSource(normalized === 'product_post_purchase' ? 'direct' : ($('#bookingSource').value || 'product'));
  if (normalized === 'standalone_paid' && $('#productSelect').value) loadPaidVariants($('#productSelect').value, { preserveVariant: true });
}

function setBookingSource(source = 'product') {
  const normalized = ['product', 'direct', 'both'].includes(source) ? source : 'product';
  $('#bookingSource').value = normalized;
  $('#sourceType').value = normalized === 'direct' ? 'standalone' : 'product';
  $$('#bookingSourceGrid [data-booking-source]').forEach(button => button.classList.toggle('selected', button.dataset.bookingSource === normalized));
  const commerceMode = $('#commerceMode')?.value || 'product_pre_purchase';
  const postPurchase = commerceMode === 'product_post_purchase';
  const needsProduct = commerceModeNeedsProduct(commerceMode, normalized);
  $('#bookingSourceFieldset')?.classList.toggle('hidden', postPurchase);
  $('#postPurchaseEntryCallout')?.classList.toggle('hidden', !postPurchase);
  $('#productSourceFields').classList.toggle('hidden', !needsProduct);
  $('#paidCheckoutFields').classList.toggle('hidden', commerceMode !== 'standalone_paid');
  $$('#bookingSourceGrid [data-booking-source]').forEach(button => { button.disabled = postPurchase; });
  $('#productBindingHint').textContent = t(
    commerceMode === 'product_pre_purchase' ? 'This product keeps its normal purchase actions; Appointment Lite adds a separate booking action.' :
    commerceMode === 'product_post_purchase' ? 'Customers who pay for this product receive a private scheduling link for the included service.' :
    commerceMode === 'standalone_paid' ? 'This product will provide the SHOPLINE price and checkout for the paid appointment.' :
    normalized === 'direct' ? 'No SHOPLINE product is required for a standalone direct booking page.' :
    'Use a dedicated appointment-only product template if you do not want native purchase buttons on this service product.'
  );
  $('#serviceActiveHint').textContent = t(
    commerceMode === 'product_pre_purchase' ? 'Keep the SHOPLINE purchase actions and show Appointment Lite as an additional booking option.' :
    commerceMode === 'product_post_purchase' ? 'No booking button is shown before purchase. The buyer schedules from the private order email after payment.' :
    commerceMode === 'standalone_free' && normalized !== 'direct' ? 'For appointment-only product pages, use a dedicated SHOPLINE product template without native purchase buttons.' :
    normalized === 'product' ? 'Show this service on the linked SHOPLINE product page.' :
    normalized === 'both' ? 'Show this service on the linked product page and a shareable booking page.' :
    'Use a shareable booking page without requiring a SHOPLINE product.'
  );
}


function locationAddress(item = {}) {
  return [item.address1, item.address2, item.city, item.province, item.zip, item.country].filter(Boolean).join(', ');
}

function locationLabel(item = {}) {
  const address = locationAddress(item);
  return [item.name, address].filter(Boolean).join(' · ');
}

function closeLocationPicker() {
  const picker = $('#shoplineLocationPicker');
  const menu = $('#shoplineLocationMenu');
  const button = $('#shoplineLocationPickerButton');
  if (!menu || !button) return;
  picker?.classList.remove('drop-up');
  menu.classList.add('hidden');
  button.setAttribute('aria-expanded', 'false');
}

function setLocationPickerValue(selectedId = '') {
  const input = $('#shoplineLocationId');
  const label = $('#shoplineLocationPickerLabel');
  const meta = $('#shoplineLocationPickerMeta');
  const button = $('#shoplineLocationPickerButton');
  if (!input || !label || !meta || !button) return;
  input.value = selectedId || '';
  const selected = state.locations.find(item => String(item.id) === String(selectedId));
  const missing = selectedId && !selected;
  if (selected) {
    label.textContent = selected.name || t('SHOPLINE location');
    const address = locationAddress(selected);
    meta.textContent = address || (selected.isDefault ? t('Default location') : t('Managed in SHOPLINE Admin'));
    button.classList.add('has-value');
  } else if (missing) {
    label.textContent = t('Location removed from SHOPLINE');
    meta.textContent = t('Refresh locations and choose another one.');
    button.classList.add('has-value', 'missing-value');
  } else {
    label.textContent = t('Choose a SHOPLINE location');
    meta.textContent = t('Select a location managed in SHOPLINE Admin.');
    button.classList.remove('has-value', 'missing-value');
  }
  $$('#shoplineLocationOptions [data-location-id]').forEach(option => {
    const active = String(option.dataset.locationId || '') === String(selectedId || '');
    option.classList.toggle('selected', active);
    option.setAttribute('aria-selected', String(active));
  });
}

function renderLocationOptions(selectedId = $('#shoplineLocationId')?.value || '') {
  const root = $('#shoplineLocationOptions');
  if (!root) return;
  const options = state.locations.map(item => {
    const address = locationAddress(item);
    return `<button type="button" class="location-picker-option" data-location-id="${escapeHtml(item.id)}" role="option"><span><strong>${escapeHtml(item.name || t('SHOPLINE location'))}</strong><small>${escapeHtml(address || t('Managed in SHOPLINE Admin'))}</small></span>${item.isDefault ? `<em>${escapeHtml(t('Default'))}</em>` : ''}</button>`;
  }).join('');
  root.innerHTML = options || `<div class="location-picker-empty"><strong>${t('No SHOPLINE locations found')}</strong><span>${t('Create a location in SHOPLINE Admin, then refresh this list.')}</span></div>`;
  root.querySelectorAll('[data-location-id]').forEach(option => option.addEventListener('click', () => {
    setLocationPickerValue(option.dataset.locationId || '');
    closeLocationPicker();
  }));
  setLocationPickerValue(selectedId || '');
}

async function loadLocations({ force = false, selectedId = '' } = {}) {
  if (!force && state.locationAccess?.granted && state.locations.length) { renderLocationOptions(selectedId || $('#shoplineLocationId')?.value || ''); return state.locations; }
  const hint = $('#shoplineLocationHint');
  if (hint) hint.textContent = t('Locations are read from SHOPLINE Admin.');
  try {
    const payload = await api('/locations');
    state.locations = payload.locations || [];
    state.locationAccess = payload.access || null;
    renderLocationOptions(selectedId || $('#shoplineLocationId')?.value || '');
    if (hint && state.locationAccess && !state.locationAccess.granted) {
      hint.innerHTML = `${escapeHtml(t('Location access needs authorization'))}. <button type="button" class="text-button" data-authorize-location>${escapeHtml(t('Authorize location access'))}</button>`;
      hint.querySelector('[data-authorize-location]')?.addEventListener('click', () => openOrderAuthorization(state.locationAccess.authorizationUrl));
    }
    return state.locations;
  } catch (error) {
    if (hint) hint.textContent = t('Could not load SHOPLINE locations.');
    throw error;
  }
}

function setLocationMode(mode = 'custom') {
  const normalized = ['shopline_location', 'customer_address', 'online', 'custom'].includes(mode) ? mode : 'custom';
  $('#locationMode').value = normalized;
  $$('#locationModeGrid [data-location-mode]').forEach(button => button.classList.toggle('selected', button.dataset.locationMode === normalized));
  $('#shoplineLocationFields')?.classList.toggle('hidden', normalized !== 'shopline_location');
  $('#customLocationFields')?.classList.toggle('hidden', normalized !== 'custom');
  $('#customerAddressLocationHint')?.classList.toggle('hidden', normalized !== 'customer_address');
  $('#onlineLocationHint')?.classList.toggle('hidden', normalized !== 'online');
  if (normalized === 'shopline_location') loadLocations({ selectedId: $('#shoplineLocationId')?.value || '' }).catch(showError);
}

function recommendedBookingMode(serviceType) {
  if (serviceType === 'class') return 'multi_slot';
  return 'slot';
}

function setModeControlsDisabled(root, disabled) {
  if (!root) return;
  root.querySelectorAll('input, select, textarea').forEach(control => { control.disabled = disabled; });
}

function setBookingMode(mode = 'slot', { touched = true } = {}) {
  const normalized = ['slot', 'all_day', 'multi_slot'].includes(mode) ? mode : 'slot';
  $('#bookingMode').value = normalized;
  if (touched) state.ruleModeTouched = true;
  $$('#bookingModeGrid [data-booking-mode]').forEach(button => button.classList.toggle('selected', button.dataset.bookingMode === normalized));
  $('#timedModeFields').classList.toggle('hidden', normalized === 'all_day');
  $('#allDayModeFields').classList.toggle('hidden', normalized !== 'all_day');
  $('#multiSlotModeFields').classList.toggle('hidden', normalized !== 'multi_slot');
  setModeControlsDisabled($('#timedModeFields'), normalized === 'all_day');
  setModeControlsDisabled($('#allDayModeFields'), normalized !== 'all_day');
  setModeControlsDisabled($('#multiSlotModeFields'), normalized !== 'multi_slot');
  if (normalized === 'multi_slot' && Number($('#sessionsRequired').value || 0) < 2) $('#sessionsRequired').value = '3';
  $('#slotLogicNotice').classList.toggle('hidden', normalized === 'all_day');
  $('#weeklySchedule').classList.toggle('all-day-mode', normalized === 'all_day');
  const availabilityIntro = $('#availabilityIntro');
  if (availabilityIntro) availabilityIntro.textContent = t(normalized === 'all_day'
    ? 'Dates and capacity use the service time zone. Customers choose a date without a start time.'
    : 'Set regular hours, booking policies, and date-specific exceptions in the service time zone.');
  $('#weeklyScheduleHint').textContent = t(normalized === 'all_day' ? 'Enable the days customers can book all day.' : 'Enable the days customers can normally book.');
  $('#exceptionHint').textContent = t(normalized === 'all_day' ? 'Close a holiday or open a normally closed date for all-day booking.' : 'Close a holiday or override one date with special opening hours.');
  $('#capacitySuffix').textContent = t(normalized === 'all_day' ? 'bookings / day' : 'spots');
  $$('#minimumNoticeMinutes option').forEach(option => {
    option.disabled = normalized === 'all_day' && Number(option.value || 0) > 0 && Number(option.value || 0) < 1440;
  });
  if (normalized === 'all_day' && Number($('#minimumNoticeMinutes').value || 0) > 0 && Number($('#minimumNoticeMinutes').value || 0) < 1440) {
    $('#minimumNoticeMinutes').value = '1440';
  }
  if (normalized === 'all_day') $('#allDayCapacityMirror').value = $('#capacity').value || 1;
  renderScheduleMode();
  renderExceptionsMode();
  renderSlotLogic();
}

function renderScheduleMode() {
  const allDay = $('#bookingMode').value === 'all_day';
  $$('.schedule-row').forEach(row => row.classList.toggle('all-day', allDay));
}

function renderExceptionsMode() {
  const allDay = $('#bookingMode').value === 'all_day';
  $$('.exception-row').forEach(row => {
    const select = row.querySelector('.exception-mode');
    const currentlyClosed = select.value === 'closed';
    select.innerHTML = allDay
      ? `<option value="closed">${t('Closed all day')}</option><option value="open">${t('Open all day')}</option>`
      : `<option value="closed">${t('Closed all day')}</option><option value="hours">${t('Special hours')}</option>`;
    select.value = currentlyClosed ? 'closed' : (allDay ? 'open' : 'hours');
    const disabled = allDay || select.value === 'closed';
    row.querySelector('.exception-start').disabled = disabled;
    row.querySelector('.exception-end').disabled = disabled;
    row.classList.toggle('all-day', allDay);
    row.classList.toggle('closed', select.value === 'closed');
  });
}

function setRuleStep(step) {
  closeRuleSelect();
  closeServiceTimezonePicker();
  closeLocationPicker();
  state.ruleStep = Math.max(0, Math.min(3, step));
  $$('[data-rule-step]').forEach(panel => panel.classList.toggle('hidden', Number(panel.dataset.ruleStep) !== state.ruleStep));
  $$('[data-rule-step-button]').forEach(button => button.classList.toggle('active', Number(button.dataset.ruleStepButton) === state.ruleStep));
  $('#ruleBack').classList.toggle('hidden', state.ruleStep === 0);
  $('#ruleNext').classList.toggle('hidden', state.ruleStep === 3);
  $('#saveRule').classList.toggle('hidden', state.ruleStep !== 3);
  const subtitles = ['Choose the booking model and payment behavior.', 'Choose where customers can discover this service.', 'Set booking mode, timing, and availability.', 'Finish customer-facing details, staff, and location.'];
  $('#ruleDialogSubtitle').textContent = t(subtitles[state.ruleStep]);
  $('#formError').classList.add('hidden');
  const body = $('#ruleDialog .modal-body');
  if (body) body.scrollTop = 0;
  if (state.ruleStep === 2) renderSlotLogic();
}

function validateRuleStep(step) {
  let message = '';
  const bookingType = $('#bookingType').value;
  const paymentMode = $('#paymentMode').value;
  const mode = $('#bookingMode').value;

  if (step === 0 && !$('#serviceTitle').value.trim()) message = 'Service name is required before continuing.';
  if (step === 0 && bookingType === 'purchase_triggered' && !state.ruleProductSelection.trigger.length) message = 'Choose at least one SHOPLINE product that unlocks this appointment.';
  if (step === 0 && bookingType === 'standalone' && paymentMode === 'checkout' && !$('#productSelect').value) message = 'Select the SHOPLINE checkout product.';
  if (step === 0 && bookingType === 'standalone' && paymentMode === 'checkout' && !$('#productVariantId').value) message = 'Choose the SHOPLINE variant customers will pay for.';

  if (step === 1 && bookingType === 'standalone') {
    const placement = placementPayload();
    const hasPlacement = placement.directLink || placement.pageBlock || placement.staffDirectory || placement.productBlock.enabled || placement.appEmbed.enabled;
    if (!hasPlacement) message = 'Enable at least one storefront placement or direct booking link.';
    if (placement.productBlock.enabled && placement.productBlock.scope === 'selected' && !placement.productBlock.productIds.length) message = 'Choose at least one display product or switch product placement to All products.';
  }

  if (step === 2 && mode !== 'all_day' && (!$('#duration').checkValidity() || !$('#buffer').checkValidity() || !$('#capacity').checkValidity())) message = 'Enter valid duration, buffer, and capacity.';
  if (step === 2 && mode === 'all_day' && !$('#allDayCapacityMirror').checkValidity()) message = 'Enter valid duration, buffer, and capacity.';
  if (step === 2 && mode === 'multi_slot' && !$('#sessionsRequired').checkValidity()) message = 'Choose 2–12 sessions per booking.';
  if (step === 2 && (!$('#bookingWindowDays').checkValidity() || !$('#minimumNoticeMinutes').checkValidity())) message = 'Enter a valid booking window and minimum notice.';
  if (step === 2) {
    const weeklyOpen = $$('.schedule-row input[type=checkbox]').some(input => input.checked);
    const exceptionOpen = $$('.exception-row').some(row => row.querySelector('.exception-mode').value !== 'closed' && row.querySelector('.exception-date').value);
    if (!weeklyOpen && !exceptionOpen) message = 'Enable at least one weekday or add an open exception.';
  }

  if (step === 3) {
    const locationMode = $('#locationMode').value;
    if (locationMode === 'shopline_location' && !$('#shoplineLocationId').value) message = 'Choose a SHOPLINE location.';
    const assignment = currentStaffAssignment();
    if (assignment.mode === 'fixed' && assignment.staffIds.length !== 1) message = 'Select exactly one staff member for fixed assignment.';
    if (['any', 'customer_choice'].includes(assignment.mode) && assignment.staffIds.length < 1) message = 'Select at least one staff member for this assignment mode.';
  }

  if (message) {
    $('#formError').textContent = t(message);
    $('#formError').classList.remove('hidden');
    return false;
  }
  return true;
}

async function openRule(rule = null) {
  await ensureStaff();
  $('#ruleForm').reset();
  state.editingRule = Boolean(rule);
  state.ruleModeTouched = Boolean(rule);
  $('#ruleId').value = rule?._id || '';
  $('#ruleDialogTitle').textContent = t(rule ? 'Edit service rule' : 'New appointment service');
  $('#questions').innerHTML = '';
  $('#productSearch').value = '';
  $('#serviceTitle').value = rule?.serviceTitle || rule?.productTitle || '';
  $('#capacity').value = rule?.capacity || 1;
  $('#allDayCapacityMirror').value = rule?.capacity || 1;
  $('#sessionsRequired').value = rule?.sessionsRequired || 3;
  $('#minimumNoticeMinutes').value = String(rule?.minimumNoticeMinutes ?? 0);
  $('#bookingWindowDays').value = rule?.bookingWindowDays || 90;
  populateServiceTimeZones();
  $('#serviceTimezone').value = rule?.timezone || '';
  const inheritedTimezone = state.shop?.timezone || 'UTC';
  $('#serviceTimezone').placeholder = `Store default · ${inheritedTimezone}`;
  $('#serviceTimezoneHint').textContent = state.locale === 'zh-CN' ? `留空则继承 SHOPLINE 店铺时区：${inheritedTimezone}。同一员工关联多个服务时，建议这些服务使用相同的服务时区。` : `Leave blank to inherit the SHOPLINE store time zone: ${inheritedTimezone}. If the same staff member works across multiple services, keep those services on the same service time zone.`;
  $('#serviceDescription').value = rule?.serviceDescription || '';
  $('#questionLabel').value = rule?.questionLabel || t('Anything we should know?');
  $('#enabled').checked = rule?.enabled !== false;
  setServiceType(rule?.serviceType || 'appointment');
  const legacyMode = legacyCommerceMode(rule || {});
  const bookingType = rule?.bookingType || (legacyMode === 'product_post_purchase' ? 'purchase_triggered' : 'standalone');
  const paymentMode = rule?.paymentMode || (legacyMode === 'standalone_paid' ? 'checkout' : 'none');
  state.ruleProductSelection = {
    trigger: (rule?.purchaseTrigger?.products || (bookingType === 'purchase_triggered' && rule?.productId ? [{ id: rule.productId }] : [])).map(item => String(item.id || item.productId || '')).filter(Boolean),
    placement: (rule?.storefrontPlacement?.productBlock?.productIds || (legacyMode === 'product_pre_purchase' && rule?.productId ? [rule.productId] : [])).map(String)
  };
  state.productPlacementScope = rule?.storefrontPlacement?.productBlock?.scope === 'selected' ? 'selected' : 'all';
  setBookingType(bookingType);
  setPaymentMode(paymentMode);
  setBookingMode(rule?.bookingMode || 'slot', { touched: false });
  renderSchedule(rule?.weeklyAvailability || [1, 2, 3, 4, 5].map(weekday => ({ weekday, enabled: true, windows: [{ start: '09:00', end: '17:00' }] })));
  renderExceptions(rule?.availabilityExceptions || []);
  setBookingMode(rule?.bookingMode || 'slot', { touched: false });
  await ensureProducts();
  const checkout = rule?.checkoutProduct || (paymentMode === 'checkout' && rule?.productId ? { productId: rule.productId, productTitle: rule.productTitle, productHandle: rule.productHandle, variantId: rule.productVariantId, variantTitle: rule.productVariantTitle, price: rule.productVariantPrice } : null);
  if (checkout?.productId && !state.products.some(product => String(product.id) === String(checkout.productId))) state.products.push({ id: checkout.productId, title: checkout.productTitle || 'Checkout product', handle: checkout.productHandle || '' });
  await selectProduct(checkout?.productId || '', { preserveVariant: true });
  $('#paymentHoldMinutes').value = String(rule?.paymentHoldMinutes || 15);
  if (paymentMode === 'checkout' && checkout?.variantId) {
    $('#productVariantId').value = checkout.variantId;
    $('#productVariantTitle').value = checkout.variantTitle || '';
    $('#productVariantPrice').value = checkout.price || '';
    await loadPaidVariants(checkout.productId, { preserveVariant: true });
  }
  const placement = rule?.storefrontPlacement || { directLink: true, pageBlock: true, staffDirectory: false, productBlock: { enabled: false, scope: 'all', productIds: [] }, appEmbed: { enabled: false } };
  $('#placementDirectLink').checked = placement.directLink !== false;
  $('#placementPageBlock').checked = placement.pageBlock !== false;
  $('#placementStaffDirectory').checked = placement.staffDirectory === true;
  $('#placementProductBlock').checked = placement.productBlock?.enabled === true;
  $('#placementAppEmbed').checked = placement.appEmbed?.enabled === true;
  renderSelectedProductSummary('trigger');
  renderSelectedProductSummary('placement');
  refreshPlacementUi();
  setBookingType(bookingType);
  $('#duration').value = rule?.duration || 60;
  $('#buffer').value = rule?.buffer || 0;
  $('#dateFrom').value = rule?.dateFrom || '';
  $('#dateUntil').value = rule?.dateUntil || '';
  const locationMode = rule?.locationMode || (rule?.shoplineLocationId ? 'shopline_location' : (rule?.location ? 'custom' : 'custom'));
  $('#location').value = locationMode === 'custom' ? (rule?.location || '') : '';
  $('#shoplineLocationId').value = rule?.shoplineLocationId || '';
  setLocationMode(locationMode);
  $('#onlineMeetingProvider').value = rule?.onlineMeeting?.provider || 'zoom';
  $('#onlineMeetingLabel').value = rule?.onlineMeeting?.label || '';
  $('#onlineMeetingUrl').value = rule?.onlineMeeting?.url || '';
  if (locationMode === 'shopline_location') await loadLocations({ selectedId: rule?.shoplineLocationId || '' }).catch(() => {});
  $('#staff').value = rule?.staff || '';
  const assignment = rule?.staffAssignment || { mode: 'none', staffIds: [] };
  renderRuleStaffOptions((assignment.staffIds || []).map(String));
  setStaffAssignmentMode(assignment.mode || 'none');
  (rule?.customQuestions || []).forEach(addQuestion);
  setRuleStep(0);
  refreshRuleSelects();
  renderServiceTimezoneMenu($('#serviceTimezone').value || '');
  $('#ruleDialog').showModal();
}

function rulePayload() {
  const bookingType = $('#bookingType').value;
  const paymentMode = bookingType === 'purchase_triggered' ? 'none' : $('#paymentMode').value;
  const bookingMode = $('#bookingMode').value;
  const checkout = state.products.find(item => item.id === $('#productSelect').value);
  const triggerProducts = productRefs(state.ruleProductSelection.trigger);
  const storefrontPlacement = placementPayload();
  const commerceMode = bookingType === 'purchase_triggered' ? 'product_post_purchase' : paymentMode === 'checkout' ? 'standalone_paid' : 'standalone_free';
  const publicDirect = storefrontPlacement.directLink || storefrontPlacement.pageBlock || storefrontPlacement.staffDirectory || storefrontPlacement.appEmbed.enabled;
  const bookingSource = bookingType === 'purchase_triggered' ? 'direct' : storefrontPlacement.productBlock.enabled ? (publicDirect ? 'both' : 'product') : 'direct';
  const allDay = bookingMode === 'all_day';
  const capacity = allDay ? Number($('#allDayCapacityMirror').value) : Number($('#capacity').value);
  return {
    bookingType, paymentMode, purchaseTrigger: { products: triggerProducts },
    checkoutProduct: paymentMode === 'checkout' && checkout ? { productId: checkout.id, productTitle: checkout.title || '', productHandle: checkout.handle || '', variantId: $('#productVariantId').value, variantTitle: $('#productVariantTitle').value, price: $('#productVariantPrice').value } : undefined,
    storefrontPlacement,
    bookingSource, commerceMode,
    sourceType: bookingSource === 'direct' ? 'standalone' : 'product',
    serviceType: $('#serviceType').value,
    bookingMode,
    sessionsRequired: bookingMode === 'multi_slot' ? Number($('#sessionsRequired').value) : 1,
    serviceTitle: $('#serviceTitle').value,
    productId: bookingType === 'purchase_triggered' ? (triggerProducts[0]?.id || '') : paymentMode === 'checkout' ? (checkout?.id || '') : '',
    productTitle: bookingType === 'purchase_triggered' ? (triggerProducts[0]?.title || '') : paymentMode === 'checkout' ? (checkout?.title || '') : '',
    productHandle: bookingType === 'purchase_triggered' ? (triggerProducts[0]?.handle || '') : paymentMode === 'checkout' ? (checkout?.handle || '') : '',
    productVariantId: paymentMode === 'checkout' ? $('#productVariantId').value : '',
    productVariantTitle: paymentMode === 'checkout' ? $('#productVariantTitle').value : '',
    productVariantPrice: paymentMode === 'checkout' ? $('#productVariantPrice').value : '',
    paymentHoldMinutes: paymentMode === 'checkout' ? Number($('#paymentHoldMinutes').value || 15) : 15,
    serviceDescription: $('#serviceDescription').value,
    duration: allDay ? 60 : Number($('#duration').value), buffer: allDay ? 0 : Number($('#buffer').value), capacity,
    timezone: $('#serviceTimezone').value.trim(),
    minimumNoticeMinutes: Number($('#minimumNoticeMinutes').value), bookingWindowDays: Number($('#bookingWindowDays').value),
    dateFrom: $('#dateFrom').value, dateUntil: $('#dateUntil').value,
    weeklyAvailability: $$('.schedule-row').map(row => ({ weekday: Number(row.dataset.weekday), enabled: row.querySelector('input[type=checkbox]').checked, windows: allDay ? [] : [{ start: row.querySelectorAll('input[type=time]')[0].value, end: row.querySelectorAll('input[type=time]')[1].value }] })),
    availabilityExceptions: $$('.exception-row').map(row => ({
      date: row.querySelector('.exception-date').value,
      closed: row.querySelector('.exception-mode').value === 'closed',
      windows: !allDay && row.querySelector('.exception-mode').value === 'hours' ? [{ start: row.querySelector('.exception-start').value, end: row.querySelector('.exception-end').value }] : []
    })).filter(item => item.date),
    locationMode: $('#locationMode').value,
    shoplineLocationId: $('#locationMode').value === 'shopline_location' ? $('#shoplineLocationId').value : '',
    location: $('#locationMode').value === 'custom' ? $('#location').value : '',
    onlineMeeting: $('#locationMode').value === 'online' && $('#onlineMeetingUrl').value.trim() ? { provider: $('#onlineMeetingProvider').value, label: $('#onlineMeetingLabel').value, url: $('#onlineMeetingUrl').value.trim() } : undefined,
    staff: $('#staff').value, staffAssignment: currentStaffAssignment(), questionLabel: $('#questionLabel').value, enabled: $('#enabled').checked,
    customQuestions: $$('.question-row').map(row => ({ label: row.querySelector('input[type=text]').value, required: row.querySelector('input[type=checkbox]').checked }))
  };
}

async function saveRule(event) {
  event.preventDefault();
  if (![0, 1, 2, 3].every(validateRuleStep)) return;
  const id = $('#ruleId').value;
  const button = $('#saveRule');
  button.disabled = true;
  $('#formError').classList.add('hidden');
  try {
    await api(id ? `/rules/${id}` : '/rules', { method: id ? 'PUT' : 'POST', body: JSON.stringify(rulePayload()) });
    $('#ruleDialog').close();
    toast(t(id ? 'Service rule updated.' : 'Service rule created.'));
    await Promise.all([loadRules(), loadBootstrap()]);
  } catch (error) {
    if (error.payload?.error === 'ORDER_ACCESS_REQUIRED' && error.payload?.authorizationUrl) {
      $('#formError').innerHTML = `${escapeHtml(t('Order sync authorization is required for this service.'))} <button type="button" class="text-button" id="ruleAuthorizeOrderAccess">${escapeHtml(t('Authorize order access'))}</button>`;
      $('#ruleAuthorizeOrderAccess')?.addEventListener('click', () => openOrderAuthorization(error.payload.authorizationUrl));
    } else if (error.payload?.error === 'LOCATION_ACCESS_REQUIRED' && error.payload?.authorizationUrl) {
      $('#formError').innerHTML = `${escapeHtml(t('Authorize SHOPLINE location access to choose a store location for this service.'))} <button type="button" class="text-button" id="ruleAuthorizeLocationAccess">${escapeHtml(t('Authorize location access'))}</button>`;
      $('#ruleAuthorizeLocationAccess')?.addEventListener('click', () => openOrderAuthorization(error.payload.authorizationUrl));
    } else {
      $('#formError').textContent = t(error.message);
    }
    $('#formError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

function formatNotice(rule) {
  const minutes = Number(rule.minimumNoticeMinutes || 0);
  if (!minutes) return t('No notice');
  if (minutes % 1440 === 0) return `${minutes / 1440}d ${t('ahead')}`;
  if (minutes % 60 === 0) return `${minutes / 60}h ${t('ahead')}`;
  return `${minutes}m ${t('ahead')}`;
}

async function copyText(value, message) {
  try { await navigator.clipboard.writeText(value); }
  catch {
    const input = document.createElement('textarea'); input.value = value; document.body.append(input); input.select(); document.execCommand('copy'); input.remove();
  }
  toast(t(message));
}

async function copyBookingLink(url) { return copyText(url, 'Booking link copied.'); }
async function copyServiceId(id) { return copyText(id, 'Service ID copied.'); }

function renderRules() {
  const query = $('#ruleSearch').value.trim().toLowerCase();
  const rules = state.rules.filter(rule => {
    const managedNames = (rule.staffAssignment?.staffIds || []).map(id => state.staff.find(item => String(item._id) === String(id))?.name).filter(Boolean);
    const triggerNames = (rule.purchaseTrigger?.products || []).map(item => item.title || item.id).filter(Boolean);
    return !query || [rule.serviceTitle, rule.staff, rule.location, serviceTypeLabels[rule.serviceType] || '', rule.bookingType, rule.paymentMode, ...triggerNames, ...managedNames].some(value => String(value || '').toLowerCase().includes(query));
  });
  $('#ruleResultCount').textContent = state.locale === 'zh-CN' ? `${rules.length} 项服务` : `${rules.length} service${rules.length === 1 ? '' : 's'}`;
  const root = $('#rulesList');
  if (!rules.length) {
    root.innerHTML = `<div class="panel empty"><strong>${t(state.rules.length ? 'No services match your search' : 'No service rules yet')}</strong><span>${t(state.rules.length ? 'Try a different keyword.' : 'Create your first appointment service.')}</span></div>`;
    return;
  }
  root.innerHTML = rules.map(rule => {
    const serviceTitle = rule.serviceTitle || rule.productTitle;
    const typeLabel = t(serviceTypeLabels[rule.serviceType] || 'Appointment');
    const bookingType = rule.bookingType || (legacyCommerceMode(rule) === 'product_post_purchase' ? 'purchase_triggered' : 'standalone');
    const paymentMode = rule.paymentMode || (legacyCommerceMode(rule) === 'standalone_paid' ? 'checkout' : 'none');
    const businessLabel = bookingType === 'purchase_triggered' ? t('Purchase-triggered booking') : paymentMode === 'checkout' ? t('Standalone booking · pay during booking') : t('Standalone booking · no payment');
    const triggerProducts = rule.purchaseTrigger?.products || (bookingType === 'purchase_triggered' && rule.productId ? [{ title: rule.productTitle, id: rule.productId }] : []);
    const triggerLine = bookingType === 'purchase_triggered' ? `<span class="service-product-line">${t('Unlock products')}: ${escapeHtml(triggerProducts.map(item => item.title || item.id).join(', ') || t('Not configured'))}</span>` : '';
    const placement = rule.storefrontPlacement || {};
    const placementParts = [];
    if (placement.directLink !== false && bookingType === 'standalone') placementParts.push(t('Direct link'));
    if (placement.pageBlock !== false && bookingType === 'standalone') placementParts.push(t('Page block'));
    if (placement.staffDirectory === true && bookingType === 'standalone') placementParts.push(t('Staff directory'));
    if (placement.productBlock?.enabled === true && bookingType === 'standalone') placementParts.push(placement.productBlock.scope === 'selected' ? t('Selected product pages') : t('All product pages'));
    if (placement.appEmbed?.enabled === true && bookingType === 'standalone') placementParts.push(t('App Embed'));
    if (bookingType === 'purchase_triggered') placementParts.push(t('Private order link'));
    const sourceLabel = placementParts.join(' · ') || t('No storefront placement');
    const linkActions = bookingType === 'standalone' && rule.bookingUrl ? `<button class="secondary small" data-copy-link="${escapeHtml(rule.bookingUrl)}">${t('Copy link')}</button><button class="secondary small" data-copy-service-id="${escapeHtml(rule._id)}">${t('Copy block ID')}</button><a class="button-link secondary-link small" href="${escapeHtml(rule.bookingUrl)}" target="_blank" rel="noopener noreferrer">${t('Open booking page')}</a>` : '';
    const mode = rule.bookingMode || 'slot';
    const timing = mode === 'all_day' ? t('All-day') + ` · ${rule.capacity || 1} ${t('per day')}` : mode === 'multi_slot' ? `${rule.sessionsRequired || 3} ${t('sessions')} · ${rule.duration} ${t('min')}` : (state.locale === 'zh-CN' ? `${rule.duration} 分钟${rule.buffer ? ` · 缓冲 ${rule.buffer} 分钟` : ''}` : `${rule.duration} min${rule.buffer ? ` · ${rule.buffer} min buffer` : ''}`);
    const bookingCount = Number(rule.bookingCount || 0);
    return `<article class="panel service-card service-list-row">
      <div class="service-main"><div class="service-avatar">${escapeHtml(serviceTitle.slice(0, 1).toUpperCase())}</div><div class="service-copy"><div class="service-title-row"><strong title="${escapeHtml(serviceTitle)}">${escapeHtml(serviceTitle)}</strong><span class="service-type-badge">${escapeHtml(typeLabel)}</span><span class="service-mode-badge">${escapeHtml(t(({slot:'Minute / hour',all_day:'All day',multi_slot:'Multiple sessions'})[rule.bookingMode || 'slot']))}</span></div><span>${timing}</span>${triggerLine}</div></div>
      <div class="service-channel"><span>${t('Booking model')}</span><strong>${escapeHtml(businessLabel)}</strong><small>${escapeHtml(sourceLabel)}</small></div>
      <div class="service-count"><span>${t('Bookings')}</span><strong>${bookingCount}</strong></div>
      <div class="service-status"><span class="status-badge ${rule.enabled ? 'enabled' : 'disabled'}">${t(rule.enabled ? 'Active' : 'Paused')}</span></div>
      <div class="service-actions"><div class="service-link-actions">${linkActions}</div><div class="service-edit-actions"><button class="secondary small" data-edit="${rule._id}">${t('Edit service')}</button><button class="secondary small" data-delete="${rule._id}">${t('Delete')}</button></div></div>
    </article>`;
  }).join('');
  $$('[data-edit]').forEach(button => button.addEventListener('click', () => openRule(state.rules.find(rule => rule._id === button.dataset.edit))));
  $$('[data-copy-link]').forEach(button => button.addEventListener('click', () => copyBookingLink(button.dataset.copyLink)));
  $$('[data-copy-service-id]').forEach(button => button.addEventListener('click', () => copyServiceId(button.dataset.copyServiceId)));
  $$('[data-delete]').forEach(button => button.addEventListener('click', () => {
    const rule = state.rules.find(item => item._id === button.dataset.delete);
    if (Number(rule?.confirmedBookingCount || 0) > 0) { toast(t('This service still has confirmed bookings. Cancel, complete, or mark them as no-show before deleting it.'), 'error'); return; }
    const hasHistory = Number(rule?.bookingCount || 0) > 0;
    confirmAction('Delete this service?', hasHistory ? 'This removes the service configuration. Historical bookings will stay in Booking records for reporting and audit.' : 'Delete this service?', 'Delete service', async () => {
      const result = await api(`/rules/${button.dataset.delete}`, { method: 'DELETE' });
      toast(t(Number(result?.preservedBookingCount || 0) > 0 ? 'Service deleted. Historical bookings were kept.' : 'Service rule deleted.'));
      await Promise.all([loadRules(), loadBootstrap()]);
    });
  }));
}

async function loadRules() {
  const root = $('#rulesList');
  root.setAttribute('aria-busy', 'true');
  if (!state.rules.length) root.innerHTML = ruleSkeletons(); else root.classList.add('is-loading');
  try { state.rules = (await api('/rules')).rules; renderRules(); }
  catch (error) { showError(error); }
  finally { root.classList.remove('is-loading'); root.setAttribute('aria-busy', 'false'); }
}

function openBooking(booking) {
  $('#bookingId').value = booking._id;
  $('#bookingDate').value = booking.date;
  $('#bookingTime').value = booking.time;
  $('#bookingLocation').value = booking.location || '';
  $('#bookingStaffLegacy').value = booking.staff || '';
  const rule = state.rules.find(item => String(item._id) === String(booking.ruleId));
  const assignment = rule?.staffAssignment || { mode: 'none', staffIds: [] };
  const allowedIds = new Set((assignment.staffIds || []).map(String));
  const allowed = state.staff.filter(item => item.status === 'active' && (assignment.mode === 'none' || allowedIds.has(String(item._id))));
  const select = $('#bookingStaff');
  if (assignment.mode === 'none') {
    select.innerHTML = `<option value="">${t('No managed staff')}</option>`;
    select.disabled = true;
  } else {
    select.innerHTML = `<option value="">${t(assignment.mode === 'any' ? 'Auto assign available staff' : 'Select staff')}</option>${allowed.map(item => `<option value="${item._id}">${escapeHtml(item.name)}</option>`).join('')}`;
    select.disabled = false;
    if (booking.staffId && !allowed.some(item => String(item._id) === String(booking.staffId))) {
      select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(String(booking.staffId))}">${escapeHtml(booking.staff || t('Current staff'))}</option>`);
    }
    select.value = booking.staffId ? String(booking.staffId) : '';
  }
  $('#bookingDialogSummary').textContent = `${booking.productTitle} · ${booking.customer.name} · ${booking.customer.email}`;
  $('#bookingEditTimezone').textContent = state.locale === 'zh-CN' ? `所有日期和时间均使用 ${booking.timezone || state.shop?.timezone || 'UTC'}。` : `All date and time values use ${booking.timezone || state.shop?.timezone || 'UTC'}.`;
  $('#bookingFormError').classList.add('hidden');
  $('#bookingDialog').showModal();
}

async function saveBooking(event) {
  event.preventDefault();
  const id = $('#bookingId').value;
  const button = $('#saveBooking');
  button.disabled = true;
  $('#bookingFormError').classList.add('hidden');
  try {
    const payload = await api(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ date: $('#bookingDate').value, time: $('#bookingTime').value, location: $('#bookingLocation').value, staffId: $('#bookingStaff').value, staff: $('#bookingStaffLegacy').value }) });
    $('#bookingDialog').close();
    toast(t(payload.notification?.skipped ? 'Booking updated. Email delivery is not configured.' : payload.notification?.failed ? 'Booking updated, but the customer email failed.' : 'Booking updated and customer email sent.'), payload.notification?.failed ? 'error' : 'success');
    await Promise.all([loadBookings(), loadBootstrap()]);
  } catch (error) {
    $('#bookingFormError').textContent = t(error.message);
    $('#bookingFormError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

function bookingStatusLabel(status) {
  return t({ pending_payment: 'Awaiting payment', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show', payment_expired: 'Payment expired', payment_conflict: 'Payment needs review' }[status] || status);
}

function paymentStatusLabel(status) {
  return t({ not_required: 'No payment required', unpaid: 'Unpaid', paid: 'Paid', expired: 'Payment expired', needs_review: 'Needs review' }[status] || status || 'No payment required');
}

function appointmentStatusLabel(status) {
  return t({ waiting_payment: 'Waiting for payment', awaiting_schedule: 'Awaiting scheduling', partially_scheduled: 'Partially scheduled', scheduled: 'Scheduled', confirmed: 'Scheduled', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show', payment_expired: 'Payment expired', needs_review: 'Needs review', payment_conflict: 'Needs review' }[status] || status || 'Scheduled');
}


function bookingWhenLabel(booking) {
  if (booking.recordType === 'order_lifecycle' || !booking.date) return { primary: t('Not scheduled yet'), secondary: booking.createdAt ? formatEventDate(booking.createdAt) : '' };
  const mode = booking.bookingMode || 'slot';
  const occurrences = Array.isArray(booking.occurrences) ? booking.occurrences : [];
  if (mode === 'all_day') return { primary: booking.date, secondary: `${t('All day')} · ${booking.timezone || state.shop?.timezone || 'UTC'}` };
  if (mode === 'multi_slot') {
    const first = occurrences[0] || { date: booking.date, time: booking.time };
    const extra = Math.max(0, occurrences.length - 1);
    return { primary: first.date, secondary: `${first.time}${extra ? ` · +${extra} ${t('sessions')}` : ''} · ${booking.timezone || state.shop?.timezone || 'UTC'}` };
  }
  return { primary: booking.date, secondary: `${booking.time} · ${booking.timezone || state.shop?.timezone || 'UTC'}` };
}

function bookingOccurrencesText(booking) {
  const mode = booking.bookingMode || 'slot';
  if (mode === 'all_day') return `${booking.date} (${t('All day')})`;
  const occurrences = Array.isArray(booking.occurrences) && booking.occurrences.length ? booking.occurrences : [{ date: booking.date, time: booking.time }];
  return occurrences.map(item => `${item.date} ${item.time}`).join(' | ');
}

function bookingOccurrenceDates(booking) {
  if ((booking.bookingMode || 'slot') === 'multi_slot' && Array.isArray(booking.occurrences) && booking.occurrences.length) {
    return booking.occurrences.map(item => item.date).filter(Boolean);
  }
  return [booking.date].filter(Boolean);
}

function filteredBookings() {
  const query = $('#bookingSearch').value.trim().toLowerCase();
  const serviceId = $('#bookingServiceFilter').value;
  const status = $('#bookingStatusFilter').value;
  const staffId = $('#bookingStaffFilter')?.value || '';
  const from = $('#bookingFrom').value;
  const to = $('#bookingTo').value;
  return state.bookings.filter(booking => {
    if (query && ![booking.productTitle, booking.customer?.name, booking.customer?.email, booking.customer?.phone, booking.staff, booking.location, booking.shoplineOrder?.name, booking.shoplineOrder?.id].some(value => String(value || '').toLowerCase().includes(query))) return false;
    if (serviceId && String(booking.ruleId) !== serviceId) return false;
    if (status && (booking.appointmentStatus || booking.status) !== status && booking.status !== status) return false;
    if (staffId && String(booking.staffId || '') !== staffId && !(booking.occurrences || []).some(item => String(item.staffId || '') === staffId)) return false;
    const dates = bookingOccurrenceDates(booking);
    if ((from || to) && booking.recordType === 'order_lifecycle') return false;
    if (from && !dates.some(date => date >= from)) return false;
    if (to && !dates.some(date => date <= to)) return false;
    if (from && to && !dates.some(date => date >= from && date <= to)) return false;
    return true;
  });
}

function renderBookingServiceFilter() {
  const select = $('#bookingServiceFilter');
  const current = select.value;
  const services = new Map();
  state.bookings.forEach(booking => services.set(String(booking.ruleId), booking.productTitle));
  select.innerHTML = `<option value="">${t('All services')}</option>${[...services.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, title]) => `<option value="${escapeHtml(id)}">${escapeHtml(title)}</option>`).join('')}`;
  if ([...services.keys()].includes(current)) select.value = current;
}

async function markBookingStatus(booking, status) {
  const isComplete = status === 'completed';
  confirmAction(
    isComplete ? 'Mark this appointment completed?' : 'Mark this appointment as no-show?',
    isComplete ? 'The booking will move out of the active schedule and remain in history.' : 'Use no-show when the customer did not attend the scheduled appointment.',
    isComplete ? 'Mark completed' : 'Mark no-show',
    async () => {
      await api(`/bookings/${booking._id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      toast(t(isComplete ? 'Booking marked completed.' : 'Booking marked no-show.'));
      await Promise.all([loadBookings(), loadBootstrap()]);
    }
  );
}

function deleteBookingRecord(booking) {
  if (!booking) return;
  const lifecycle = booking.recordType === 'order_lifecycle';
  confirmAction(
    lifecycle ? 'Delete this order scheduling record?' : 'Delete this booking record?',
    lifecycle
      ? 'This removes the order-linked scheduling record from Appointment Lite and revokes any remaining private scheduling access. The SHOPLINE order is not deleted.'
      : 'This removes the record from Appointment Lite. If the appointment is still active, its time will be released and calendar events will be removed. The SHOPLINE order is not deleted.',
    'Delete record',
    async () => {
      const endpoint = lifecycle ? `/bookings/lifecycle/${booking._id}` : `/bookings/${booking._id}`;
      await api(endpoint, { method: 'DELETE' });
      toast(t('Booking record deleted.'));
      await Promise.all([loadBookings(), loadBootstrap()]);
    }
  );
}

function closeBookingActionMenus(except = null) {
  $$('.booking-action-group.menu-open').forEach(group => {
    if (group === except) return;
    group.classList.remove('menu-open');
    const toggle = group.querySelector('[data-booking-actions-toggle]');
    const menu = group.querySelector('.booking-action-menu');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (menu) {
      menu.classList.add('hidden');
      menu.style.left = '';
      menu.style.top = '';
      menu.style.visibility = '';
    }
  });
}

function positionBookingActionMenu(group) {
  const toggle = group?.querySelector('[data-booking-actions-toggle]');
  const menu = group?.querySelector('.booking-action-menu');
  if (!toggle || !menu) return;
  menu.classList.remove('hidden');
  menu.style.visibility = 'hidden';
  const trigger = toggle.getBoundingClientRect();
  const bounds = menu.getBoundingClientRect();
  const margin = 12;
  const left = Math.max(margin, Math.min(trigger.right - bounds.width, window.innerWidth - bounds.width - margin));
  let top = trigger.bottom + 6;
  if (top + bounds.height > window.innerHeight - margin) top = Math.max(margin, trigger.top - bounds.height - 6);
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
  menu.style.visibility = '';
}

function toggleBookingActionMenu(button) {
  const group = button.closest('.booking-action-group');
  if (!group) return;
  const opening = !group.classList.contains('menu-open');
  closeBookingActionMenus(group);
  group.classList.toggle('menu-open', opening);
  button.setAttribute('aria-expanded', opening ? 'true' : 'false');
  const menu = group.querySelector('.booking-action-menu');
  if (!menu) return;
  if (!opening) {
    menu.classList.add('hidden');
    return;
  }
  positionBookingActionMenu(group);
}

function bindBookingRows() {
  $$('[data-booking-actions-toggle]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    toggleBookingActionMenu(button);
  }));
  $$('.booking-action-menu a, .booking-action-menu button').forEach(item => item.addEventListener('click', () => closeBookingActionMenus()));
  $$('[data-flow-booking]').forEach(button => button.addEventListener('click', () => openBookingFlow(state.bookings.find(booking => booking._id === button.dataset.flowBooking))));
  $$('[data-edit-booking]').forEach(button => button.addEventListener('click', () => openBooking(state.bookings.find(booking => booking._id === button.dataset.editBooking))));
  $$('[data-complete]').forEach(button => button.addEventListener('click', () => markBookingStatus(state.bookings.find(booking => booking._id === button.dataset.complete), 'completed')));
  $$('[data-no-show]').forEach(button => button.addEventListener('click', () => markBookingStatus(state.bookings.find(booking => booking._id === button.dataset.noShow), 'no_show')));
  $$('[data-cancel]').forEach(button => button.addEventListener('click', () => confirmAction('Cancel this appointment?', 'The time will be released immediately. The customer will be emailed when delivery is configured.', 'Cancel booking', async () => {
    const payload = await api(`/bookings/${button.dataset.cancel}/cancel`, { method: 'POST', body: '{}' });
    toast(t(payload.notification?.skipped ? 'Booking cancelled. Email delivery is not configured.' : payload.notification?.failed ? 'Booking cancelled, but the customer email failed.' : 'Booking cancelled and customer email sent.'), payload.notification?.failed ? 'error' : 'success');
    await Promise.all([loadBookings(), loadBootstrap()]);
  })));
  $$('[data-delete-booking]').forEach(button => button.addEventListener('click', () => deleteBookingRecord(state.bookings.find(booking => booking._id === button.dataset.deleteBooking))));
}

function renderBookingList(bookings) {
  const root = $('#bookingsList');
  if (!bookings.length) {
    root.innerHTML = `<div class="empty"><strong>${t('No bookings found')}</strong><span>${t(state.bookings.length ? 'No bookings match the current filters.' : 'Confirmed appointments will appear here.')}</span></div>`;
    return;
  }
  root.innerHTML = bookings.map(booking => {
    const when = bookingWhenLabel(booking);
    const isLifecycle = booking.recordType === 'order_lifecycle';
    const canDirectEdit = !isLifecycle && (booking.bookingMode || 'slot') === 'slot';
    const paymentStatus = booking.paymentStatus || 'not_required';
    const appointmentStatus = booking.appointmentStatus || booking.status;
    const progress = booking.schedulingProgress;
    const appointmentMeta = progress ? `<small>${escapeHtml(`${progress.used}/${progress.eligible} ${t('appointments scheduled')}`)}</small>` : '';
    const staffLabel = booking.staff || (isLifecycle ? t('Unassigned') : t('Any staff'));
    const locationLabel = booking.location || t('No location');
    const scheduleMeta = [staffLabel, locationLabel].filter(Boolean).join(' · ');

    const menuItems = [];
    if (!state.archiveMode) {
      if (booking.shoplineOrder?.adminUrl) {
        menuItems.push(`<a class="booking-menu-item" href="${escapeHtml(booking.shoplineOrder.adminUrl)}" target="_blank" rel="noopener noreferrer"><span>${t('Open order')}</span><i>↗</i></a>`);
      }
      if (!isLifecycle && booking.status === 'confirmed') {
        if (canDirectEdit) menuItems.push(`<button type="button" class="booking-menu-item" data-edit-booking="${booking._id}"><span>${t('Edit')}</span></button>`);
        menuItems.push(`<button type="button" class="booking-menu-item" data-complete="${booking._id}"><span>${t('Mark complete')}</span></button>`);
        menuItems.push(`<button type="button" class="booking-menu-item" data-no-show="${booking._id}"><span>${t('No-show')}</span></button>`);
        menuItems.push(`<button type="button" class="booking-menu-item menu-warning" data-cancel="${booking._id}"><span>${t('Cancel booking')}</span></button>`);
      }
      menuItems.push(`<span class="booking-menu-divider" aria-hidden="true"></span><button type="button" class="booking-menu-item menu-danger" data-delete-booking="${booking._id}"><span>${t('Delete record')}</span></button>`);
    }

    const actionGroup = state.archiveMode ? '' : `<div class="booking-action-group"><button type="button" class="small booking-action more" data-booking-actions-toggle="${booking._id}" aria-haspopup="menu" aria-expanded="false">${t('Actions')}<span class="booking-action-chevron" aria-hidden="true"></span></button><div class="booking-action-menu hidden" role="menu">${menuItems.join('')}</div></div>`;
    const actions = state.archiveMode
      ? `<span class="readonly-badge">${t('Read only')}</span>`
      : `<button type="button" class="small booking-action activity" data-flow-booking="${booking._id}">${t('Activity')}</button>${actionGroup}`;

    return `<div class="booking-row ${isLifecycle ? 'order-lifecycle-row' : ''} ${state.archiveMode ? 'archive-readonly' : ''}"><div class="booking-primary"><strong>${escapeHtml(booking.productTitle)}</strong><span>${escapeHtml(booking.customer?.name || t('Customer'))}${booking.customer?.email ? ` · ${escapeHtml(booking.customer.email)}` : ''}</span>${isLifecycle && booking.notificationSentAt ? `<small>${t('Private link sent')}</small>` : ''}</div><div class="booking-schedule-cell"><strong>${escapeHtml(when.primary)}</strong><span>${escapeHtml(when.secondary)}</span><small>${escapeHtml(scheduleMeta)}</small></div><div class="booking-status-cell"><span class="status-badge payment-${escapeHtml(paymentStatus)}">${escapeHtml(paymentStatusLabel(paymentStatus))}</span></div><div class="booking-status-cell"><span class="status-badge appointment-${escapeHtml(appointmentStatus)}">${escapeHtml(appointmentStatusLabel(appointmentStatus))}</span>${appointmentMeta}</div><div class="row-actions">${actions}</div></div>`;
  }).join('');
  bindBookingRows();
}

function monthKey(date) { return String(date || '').slice(0, 7); }
function shiftMonth(value, delta) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function shiftCalendarMonth(delta) {
  const base = state.calendarMonth || new Date().toISOString().slice(0, 7);
  state.calendarMonth = shiftMonth(base, delta);
  renderBookings();
}

function renderCalendar(bookings) {
  const root = $('#bookingCalendar');
  const fallback = state.bootstrap?.onboarding?.storeDate || new Date().toISOString().slice(0, 7);
  if (!state.calendarMonth) state.calendarMonth = monthKey(state.bootstrap?.nextBookings?.[0]?.date || new Date().toISOString().slice(0, 10));
  const [year, month] = state.calendarMonth.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startWeekday = first.getUTCDay();
  $('#calendarMonthLabel').textContent = first.toLocaleString(state.locale === 'zh-CN' ? 'zh-CN' : 'en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const byDate = bookings.reduce((map, booking) => {
    const mode = booking.bookingMode || 'slot';
    const occurrences = mode === 'multi_slot' && Array.isArray(booking.occurrences) && booking.occurrences.length
      ? booking.occurrences
      : [{ date: booking.date, time: mode === 'all_day' ? '' : booking.time }];
    occurrences.forEach(occurrence => {
      if (!occurrence?.date) return;
      (map[occurrence.date] ||= []).push({ booking, occurrence });
    });
    return map;
  }, {});
  state.calendarDayItems = byDate;
  const headers = days.map(day => `<span class="calendar-weekday">${escapeHtml(t(day).slice(0, state.locale === 'zh-CN' ? 3 : 3))}</span>`).join('');
  const blanks = Array.from({ length: startWeekday }, () => '<div class="calendar-day outside"></div>').join('');
  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${state.calendarMonth}-${String(day).padStart(2, '0')}`;
    const items = (byDate[date] || []).sort((a, b) => String(a.occurrence.time || '').localeCompare(String(b.occurrence.time || '')));
    const visible = items.slice(0, 3);
    return `<div class="calendar-day ${items.length ? 'has-bookings' : ''}"><strong>${day}</strong><div class="calendar-events">${visible.map(({ booking, occurrence }) => `<button type="button" class="calendar-event ${booking.status}" data-calendar-booking="${booking._id}"><span>${escapeHtml((booking.bookingMode || 'slot') === 'all_day' ? t('All day') : occurrence.time)}</span><b>${escapeHtml(booking.productTitle)}</b></button>`).join('')}${items.length > 3 ? `<button type="button" class="calendar-more" data-calendar-more="${date}">${escapeHtml(t('View {count} more', { count: String(items.length - 3) }))}</button>` : ''}</div></div>`;
  }).join('');
  root.innerHTML = `<div class="calendar-grid">${headers}${blanks}${cells}</div>`;
  $$('[data-calendar-booking]').forEach(button => button.addEventListener('click', () => openBookingFlow(state.bookings.find(booking => booking._id === button.dataset.calendarBooking))));
  $$('[data-calendar-more]').forEach(button => button.addEventListener('click', () => openCalendarDay(button.dataset.calendarMore)));
}

function openCalendarDay(date) {
  const items = state.calendarDayItems?.[date] || []; if (!items.length) return;
  const parsed = new Date(`${date}T12:00:00Z`); const dateLabel = parsed.toLocaleDateString(state.locale === 'zh-CN' ? 'zh-CN' : 'en', { year:'numeric',month:'long',day:'numeric',weekday:'short',timeZone:'UTC' });
  $('#calendarDayTitle').textContent = t('Appointments on {date}', { date: dateLabel });
  $('#calendarDaySubtitle').textContent = `${items.length} ${t('appointments on this day')}`;
  $('#calendarDayList').innerHTML = items.map(({ booking, occurrence }) => { const when=(booking.bookingMode||'slot')==='all_day'?t('All-day'):occurrence.time; const assignment=booking.staff||t('Any staff'); return `<button type="button" class="calendar-day-booking" data-calendar-day-booking="${booking._id}"><span class="calendar-day-time">${escapeHtml(when)}</span><span class="calendar-day-copy"><strong>${escapeHtml(booking.productTitle)}</strong><small>${escapeHtml(booking.customer?.name || t('Customer'))} · ${escapeHtml(assignment)}</small></span><span class="status-badge ${booking.status}">${bookingStatusLabel(booking.status)}</span></button>`; }).join('');
  $$('[data-calendar-day-booking]').forEach(button => button.addEventListener('click', () => { $('#calendarDayDialog').close(); openBookingFlow(state.bookings.find(booking => booking._id === button.dataset.calendarDayBooking)); }));
  $('#calendarDayDialog').showModal();
}

function setBookingView(view) {
  if (state.archiveMode) view = 'list';
  state.bookingView = view === 'calendar' ? 'calendar' : 'list';
  $$('[data-booking-view]').forEach(button => button.classList.toggle('active', button.dataset.bookingView === state.bookingView));
  $('#bookingTable').classList.toggle('hidden', state.bookingView !== 'list');
  $('#bookingCalendar').classList.toggle('hidden', state.bookingView !== 'calendar');
  $('#calendarControls').classList.toggle('hidden', state.bookingView !== 'calendar');
  renderBookings();
}

function renderBookings() {
  const bookings = filteredBookings();
  $('#bookingResultCount').textContent = state.locale === 'zh-CN' ? `${bookings.length} 条预约` : `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`;
  const hasFilters = Boolean($('#bookingSearch').value || $('#bookingServiceFilter').value || $('#bookingStaffFilter')?.value || $('#bookingStatusFilter').value || $('#bookingFrom').value || $('#bookingTo').value);
  $('#clearBookingFilters')?.classList.toggle('hidden', !hasFilters);
  if (state.bookingView === 'calendar') renderCalendar(bookings.filter(booking => bookingOccurrenceDates(booking).some(date => monthKey(date) === state.calendarMonth)));
  else renderBookingList(bookings);
}

function exportBookingsCsv() {
  const bookings = filteredBookings();
  if (!bookings.length) return toast(t('No bookings match the current filters.'), 'error');
  const rows = [['Service', 'Customer', 'Email', 'Phone', 'SHOPLINE order', 'Payment', 'Appointment', 'Booking mode', 'Date', 'Time', 'Sessions', 'Time zone', 'Location', 'Staff']];
  bookings.forEach(booking => rows.push([booking.productTitle, booking.customer?.name, booking.customer?.email, booking.customer?.phone, booking.shoplineOrder?.name || '', paymentStatusLabel(booking.paymentStatus || 'not_required'), appointmentStatusLabel(booking.appointmentStatus || booking.status), booking.bookingMode || 'slot', booking.date, booking.bookingMode === 'all_day' ? '' : booking.time, bookingOccurrenceDates(booking).length ? bookingOccurrencesText(booking) : '', booking.timezone, booking.location, booking.staff]));
  const csv = rows.map(row => row.map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `appointment-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
}

async function loadBookings() {
  const root = $('#bookingsList');
  root.setAttribute('aria-busy', 'true');
  if (!state.bookings.length) root.innerHTML = bookingSkeletons(); else root.classList.add('is-loading');
  try {
    state.bookings = (await api('/bookings')).bookings;
    renderBookingServiceFilter();
    renderBookingStaffFilter();
    if (!state.calendarMonth) state.calendarMonth = monthKey(state.bookings.find(booking => booking.status === 'confirmed')?.date || new Date().toISOString().slice(0, 10));
    renderBookings();
  } catch (error) { showError(error); }
  finally { root.classList.remove('is-loading'); root.setAttribute('aria-busy', 'false'); }
}

function formatEventDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(state.locale === 'zh-CN' ? 'zh-CN' : 'en', { dateStyle: 'medium', timeStyle: 'short', timeZone: state.shop?.timezone || 'UTC' }).format(date);
}

function eventMeta(event) {
  const labels = {
    payment_started: ['Checkout started', 'The selected appointment time is being held while payment is completed.'],
    payment_confirmed: ['Payment confirmed', 'SHOPLINE reported a successful payment and the appointment was confirmed.'],
    payment_expired: ['Payment hold expired', 'Payment was not confirmed before the hold expired, so the selected time was released.'],
    payment_conflict: ['Payment needs review', 'Payment arrived after the appointment hold was released. Review this booking before contacting the customer.'],
    created: ['Appointment created', 'The customer submitted this booking.'],
    customer_rescheduled: ['Customer changed the time', 'The customer used their online change.'],
    merchant_updated: ['Store updated the appointment', 'The date, time, location, or specialist was updated.'],
    customer_cancelled: ['Customer cancelled', 'The time was released for other customers.'],
    merchant_cancelled: ['Store cancelled the appointment', 'The time was released for other customers.'],
    merchant_completed: ['Appointment completed', 'The store marked this appointment as completed.'],
    merchant_no_show: ['Customer did not attend', 'The store marked this appointment as no-show.']
  };
  return labels[event.type] || ['Booking updated', 'Appointment details changed.'];
}

function snapshotLine(snapshot) {
  if (!snapshot?.date) return '';
  const assignment = [snapshot.location, snapshot.staff].filter(Boolean).join(' · ');
  return `${snapshot.date} ${t('at')} ${snapshot.time}${assignment ? ` · ${assignment}` : ''}`;
}

function openBookingFlow(booking) {
  $('#bookingFlowSummary').textContent = `${booking.productTitle} · ${booking.customer.name}`;
  const events = [...(booking.events || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
  const orderHeader = booking.shoplineOrder?.adminUrl ? `<a class="flow-order-link" href="${escapeHtml(booking.shoplineOrder.adminUrl)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(t('SHOPLINE order'))}</span><strong>${escapeHtml(booking.shoplineOrder.name)} ↗</strong></a>` : '';
  $('#bookingFlow').innerHTML = orderHeader + events.map(event => {
    const [title, description] = eventMeta(event);
    const from = snapshotLine(event.from);
    const to = snapshotLine(event.to);
    const changed = from && to && from !== to;
    return `<article class="flow-event"><span class="flow-dot"></span><div class="flow-card"><div class="flow-event-head"><strong>${t(title)}</strong><time>${escapeHtml(formatEventDate(event.at))}</time></div><p>${t(description)}</p>${changed ? `<div class="flow-change"><span><small>${t('Before')}</small>${escapeHtml(from)}</span><i>→</i><span><small>${t('After')}</small>${escapeHtml(to)}</span></div>` : to ? `<div class="flow-snapshot">${escapeHtml(to)}</div>` : ''}<span class="flow-actor">${t(event.actor === 'merchant' ? 'Store action' : event.actor === 'customer' ? 'Customer action' : 'System action')}</span></div></article>`;
  }).join('') || `<div class="empty-compact">${t('No booking activity yet.')}</div>`;
  $('#bookingFlowDialog').showModal();
}

function bookingSkeletons() {
  return Array.from({ length: 5 }, () => '<div class="booking-row booking-skeleton"><i></i><i></i><i></i><i></i><i></i></div>').join('');
}

function ruleSkeletons() {
  return Array.from({ length: 3 }, () => '<article class="panel service-card service-skeleton"><i></i><i></i><i></i></article>').join('');
}

function productSkeletons() {
  return Array.from({ length: 6 }, () => '<div class="product-option product-skeleton"><i></i><span></span></div>').join('');
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function normalizeStorefrontClient(input = {}) {
  return {
    appearance: { ...clone(defaultStorefrontSettings.appearance), ...(input.appearance || {}) },
    button: { ...clone(defaultStorefrontSettings.button), ...(input.button || {}) },
    modal: { ...clone(defaultStorefrontSettings.modal), ...(input.modal || {}) }
  };
}

function setStorefrontTheme(value, { render = true } = {}) {
  const next = Object.prototype.hasOwnProperty.call(storefrontThemePresets, value) ? value : defaultStorefrontSettings.appearance.template;
  $('#storefrontTheme').value = next;
  $$('#storefrontThemeOptions [data-storefront-theme]').forEach(button => button.classList.toggle('selected', button.dataset.storefrontTheme === next));
  if (render) renderStorefrontPreview();
}

function setStorefrontIntensity(value, { render = true } = {}) {
  const next = ['soft', 'medium', 'strong'].includes(value) ? value : defaultStorefrontSettings.appearance.backgroundIntensity;
  $('#storefrontBackgroundIntensity').value = next;
  $$('#storefrontIntensityOptions [data-storefront-intensity]').forEach(button => button.classList.toggle('active', button.dataset.storefrontIntensity === next));
  if (render) renderStorefrontPreview();
}

function setStorefrontCornerStyle(value, { render = true } = {}) {
  const next = ['soft', 'rounded', 'square_soft'].includes(value) ? value : defaultStorefrontSettings.appearance.cornerStyle;
  $('#storefrontCornerStyle').value = next;
  $$('#storefrontCornerOptions [data-storefront-corner]').forEach(button => button.classList.toggle('active', button.dataset.storefrontCorner === next));
  if (render) renderStorefrontPreview();
}

function setStorefrontPrimaryStyle(value, { render = true } = {}) {
  const next = value === 'custom' ? 'custom' : 'template';
  $('#storefrontPrimaryStyle').value = next;
  $$('#storefrontPrimaryStyleOptions [data-storefront-primary-style]').forEach(button => button.classList.toggle('active', button.dataset.storefrontPrimaryStyle === next));
  document.querySelectorAll('[data-storefront-custom-color]').forEach(element => element.classList.toggle('storefront-custom-color-disabled', next !== 'custom'));
  if (render) renderStorefrontPreview();
}

function setStorefrontButtonWidth(value, { render = true } = {}) {
  const next = value === 'full' ? 'full' : 'content';
  $('#storefrontButtonWidth').value = next;
  $$('#storefrontButtonWidthOptions [data-storefront-width]').forEach(button => button.classList.toggle('active', button.dataset.storefrontWidth === next));
  const full = next === 'full';
  $$('#storefrontButtonAlignmentOptions [data-storefront-alignment]').forEach(button => { button.disabled = full; });
  if (render) renderStorefrontPreview();
}

function setStorefrontButtonAlignment(value, { render = true } = {}) {
  const next = ['left', 'center', 'right'].includes(value) ? value : 'left';
  $('#storefrontButtonAlignment').value = next;
  $$('#storefrontButtonAlignmentOptions [data-storefront-alignment]').forEach(button => button.classList.toggle('active', button.dataset.storefrontAlignment === next));
  if (render) renderStorefrontPreview();
}

function setStorefrontPrimaryWidth(value, { render = true } = {}) {
  const next = value === 'full' ? 'full' : 'content';
  $('#storefrontPrimaryWidth').value = next;
  $$('#storefrontPrimaryWidthOptions [data-storefront-primary-width]').forEach(button => button.classList.toggle('active', button.dataset.storefrontPrimaryWidth === next));
  const full = next === 'full';
  $$('#storefrontPrimaryAlignmentOptions [data-storefront-primary-alignment]').forEach(button => { button.disabled = full; });
  if (render) renderStorefrontPreview();
}

function setStorefrontPrimaryAlignment(value, { render = true } = {}) {
  const next = ['left', 'center', 'right'].includes(value) ? value : 'right';
  $('#storefrontPrimaryAlignment').value = next;
  $$('#storefrontPrimaryAlignmentOptions [data-storefront-primary-alignment]').forEach(button => button.classList.toggle('active', button.dataset.storefrontPrimaryAlignment === next));
  if (render) renderStorefrontPreview();
}

function syncStorefrontColor(colorId, hexId, source = 'color') {
  const colorInput = $(`#${colorId}`);
  const hexInput = $(`#${hexId}`);
  if (!colorInput || !hexInput) return;
  if (source === 'color') hexInput.value = colorInput.value.toUpperCase();
  else if (/^#[0-9a-f]{6}$/i.test(hexInput.value)) colorInput.value = hexInput.value;
  renderStorefrontPreview();
}

function storefrontSettingsFromForm() {
  const hex = (id, fallback) => /^#[0-9a-f]{6}$/i.test($(`#${id}`)?.value || '') ? $(`#${id}`).value.toUpperCase() : fallback;
  return {
    appearance: {
      template: Object.prototype.hasOwnProperty.call(storefrontThemePresets, $('#storefrontTheme')?.value || '') ? $('#storefrontTheme').value : defaultStorefrontSettings.appearance.template,
      backgroundIntensity: ['soft', 'medium', 'strong'].includes($('#storefrontBackgroundIntensity')?.value) ? $('#storefrontBackgroundIntensity').value : defaultStorefrontSettings.appearance.backgroundIntensity,
      cornerStyle: ['soft', 'rounded', 'square_soft'].includes($('#storefrontCornerStyle')?.value) ? $('#storefrontCornerStyle').value : defaultStorefrontSettings.appearance.cornerStyle,
      primaryStyle: $('#storefrontPrimaryStyle')?.value === 'custom' ? 'custom' : 'template',
      unifiedBookingFlow: $('#storefrontUnifiedFlow')?.checked !== false
    },
    button: {
      label: $('#storefrontButtonLabel').value.trim() || defaultStorefrontSettings.button.label,
      backgroundColor: hex('storefrontButtonColorHex', defaultStorefrontSettings.button.backgroundColor),
      textColor: hex('storefrontButtonTextColorHex', defaultStorefrontSettings.button.textColor),
      width: $('#storefrontButtonWidth').value === 'full' ? 'full' : 'content',
      alignment: ['left', 'center', 'right'].includes($('#storefrontButtonAlignment').value) ? $('#storefrontButtonAlignment').value : 'left',
      borderRadius: Math.min(24, Math.max(0, Number($('#storefrontButtonRadius').value || 0)))
    },
    modal: {
      title: $('#storefrontModalTitle').value.trim() || defaultStorefrontSettings.modal.title,
      accentColor: hex('storefrontModalAccentHex', defaultStorefrontSettings.modal.accentColor),
      primaryTextColor: hex('storefrontModalTextColorHex', defaultStorefrontSettings.modal.primaryTextColor),
      primaryButtonWidth: $('#storefrontPrimaryWidth').value === 'full' ? 'full' : 'content',
      primaryButtonAlignment: ['left', 'center', 'right'].includes($('#storefrontPrimaryAlignment').value) ? $('#storefrontPrimaryAlignment').value : 'right',
      showServiceSummary: $('#storefrontShowSummary').checked,
      showTimezoneSelector: $('#storefrontShowTimezone').checked,
      showPhone: $('#storefrontShowPhone').checked,
      showNotes: $('#storefrontShowNotes').checked,
      showFooterNote: $('#storefrontShowFooterNote').checked
    }
  };
}

function renderStorefrontPreview() {
  if (!$('#storefrontButtonPreview')) return;
  const settings = storefrontSettingsFromForm();
  const appearance = settings.appearance;
  const button = settings.button;
  const modal = settings.modal;
  const theme = storefrontThemeTokens(settings);
  const previewCanvas = document.querySelector('.storefront-preview-canvas');
  const dialogPreview = document.querySelector('.storefront-dialog-preview');
  [previewCanvas, dialogPreview].filter(Boolean).forEach(element => {
    element.dataset.bookingTheme = appearance.template;
    element.dataset.bookingIntensity = appearance.backgroundIntensity;
    element.dataset.bookingCorner = appearance.cornerStyle;
    element.style.setProperty('--booking-theme-bg', theme.background);
    element.style.setProperty('--booking-theme-surface', theme.surface);
    element.style.setProperty('--booking-theme-soft', theme.soft);
    element.style.setProperty('--booking-theme-text', theme.text);
    element.style.setProperty('--booking-theme-muted', theme.muted);
    element.style.setProperty('--booking-theme-line', theme.line);
    element.style.setProperty('--booking-theme-accent', theme.accent);
    element.style.setProperty('--booking-theme-primary-text', theme.primaryText);
    element.style.setProperty('--booking-theme-success', theme.success);
    element.style.setProperty('--booking-theme-radius', `${theme.radius}px`);
  });
  const buttonWrap = $('#storefrontButtonPreviewWrap');
  const buttonPreview = $('#storefrontButtonPreview');
  buttonWrap.className = `storefront-button-preview-wrap ${button.width === 'full' ? 'full' : `align-${button.alignment}`}`;
  buttonPreview.textContent = button.label;
  buttonPreview.style.background = theme.triggerAccent;
  buttonPreview.style.color = theme.triggerText;
  buttonPreview.style.borderRadius = `${button.borderRadius}px`;
  $('#storefrontModalTitlePreview').textContent = modal.title;
  $('#storefrontSummaryPreview').classList.toggle('hidden', !modal.showServiceSummary);
  $('#storefrontTimezonePreview').classList.toggle('hidden', !modal.showTimezoneSelector);
  $('#storefrontPhonePreview').classList.toggle('hidden', !modal.showPhone);
  $('#storefrontNotesPreview').classList.toggle('hidden', !modal.showNotes);
  $('#storefrontFooterPreview').classList.toggle('hidden', !modal.showFooterNote);
  const actionWrap = document.querySelector('.storefront-dialog-preview-actions');
  actionWrap.className = `storefront-dialog-preview-actions ${modal.primaryButtonWidth === 'full' ? 'full' : `align-${modal.primaryButtonAlignment}`}`;
  const modalButton = $('#storefrontModalButtonPreview');
  modalButton.style.background = theme.accent;
  modalButton.style.color = theme.primaryText;
  document.querySelectorAll('.storefront-mini-calendar .selected,.storefront-mini-slots .selected').forEach(element => { element.style.background = theme.accent; element.style.borderColor = theme.accent; });
}
function renderStorefrontSettings(settings = state.storefrontSettings) {
  if (!$('#storefrontButtonLabel')) return;
  const value = normalizeStorefrontClient(settings || defaultStorefrontSettings);
  state.storefrontSettings = value;
  setStorefrontTheme(value.appearance.template, { render: false });
  setStorefrontIntensity(value.appearance.backgroundIntensity, { render: false });
  setStorefrontCornerStyle(value.appearance.cornerStyle, { render: false });
  setStorefrontPrimaryStyle(value.appearance.primaryStyle, { render: false });
  $('#storefrontUnifiedFlow').checked = value.appearance.unifiedBookingFlow !== false;
  $('#storefrontButtonLabel').value = value.button.label;
  $('#storefrontButtonColor').value = value.button.backgroundColor;
  $('#storefrontButtonColorHex').value = value.button.backgroundColor;
  $('#storefrontButtonTextColor').value = value.button.textColor;
  $('#storefrontButtonTextColorHex').value = value.button.textColor;
  $('#storefrontButtonRadius').value = String(value.button.borderRadius);
  setStorefrontButtonWidth(value.button.width, { render: false });
  setStorefrontButtonAlignment(value.button.alignment, { render: false });
  $('#storefrontModalTitle').value = value.modal.title;
  $('#storefrontModalAccent').value = value.modal.accentColor;
  $('#storefrontModalAccentHex').value = value.modal.accentColor;
  $('#storefrontModalTextColor').value = value.modal.primaryTextColor;
  $('#storefrontModalTextColorHex').value = value.modal.primaryTextColor;
  setStorefrontPrimaryWidth(value.modal.primaryButtonWidth, { render: false });
  setStorefrontPrimaryAlignment(value.modal.primaryButtonAlignment, { render: false });
  $('#storefrontShowSummary').checked = value.modal.showServiceSummary;
  $('#storefrontShowTimezone').checked = value.modal.showTimezoneSelector;
  $('#storefrontShowPhone').checked = value.modal.showPhone;
  $('#storefrontShowNotes').checked = value.modal.showNotes;
  $('#storefrontShowFooterNote').checked = value.modal.showFooterNote;
  renderStorefrontPreview();
}

async function saveStorefrontSettings() {
  const button = $('#saveStorefrontSettings');
  button.disabled = true;
  try {
    const payload = await api('/storefront/settings', { method: 'PUT', body: JSON.stringify(storefrontSettingsFromForm()) });
    state.storefrontSettings = normalizeStorefrontClient(payload.settings);
    if (state.bootstrap) state.bootstrap.storefrontSettings = clone(state.storefrontSettings);
    renderStorefrontSettings(state.storefrontSettings);
    toast(t('Storefront settings saved.'));
  } catch (error) { showError(error); }
  finally { button.disabled = false; }
}

function storeCurrentTemplate() {
  if (!state.emailEditorReady || !state.emailSettings?.templates?.[state.activeTemplate]) return;
  state.emailSettings.templates[state.activeTemplate] = { subject: $('#templateSubject').value, heading: $('#templateHeading').value, body: $('#templateBody').value };
}

function interpolate(value) {
  const values = { ...sample, store_name: state.emailSettings?.brandName || 'Appointment Lite' };
  return String(value || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key) => key in values ? values[key] : match);
}

function selectTemplate(key) {
  storeCurrentTemplate();
  state.activeTemplate = key;
  $$('#templateTabs button').forEach(button => button.classList.toggle('active', button.dataset.template === key));
  const template = state.emailSettings.templates[key];
  $('#templateSubject').value = template.subject;
  $('#templateHeading').value = template.heading;
  $('#templateBody').value = template.body;
  $('#previewTemplateLabel').textContent = t(templateMeta[key].label);
  state.emailEditorReady = true;
  renderEmailPreview();
}

function renderTemplateTabs() {
  $('#templateTabs').innerHTML = Object.entries(templateMeta).map(([key, item]) => `<button type="button" role="tab" data-template="${key}">${escapeHtml(t(item.label))}</button>`).join('');
  $$('[data-template]').forEach(button => button.addEventListener('click', () => selectTemplate(button.dataset.template)));
  $('#variableChips').innerHTML = variables.map(variable => `<button type="button" data-variable="${variable}">{{${variable}}}</button>`).join('');
  $$('[data-variable]').forEach(button => button.addEventListener('click', () => {
    const input = $('#templateBody');
    const token = `{{${button.dataset.variable}}}`;
    const start = input.selectionStart;
    input.value = `${input.value.slice(0, start)}${token}${input.value.slice(input.selectionEnd)}`;
    input.focus();
    input.setSelectionRange(start + token.length, start + token.length);
    storeCurrentTemplate();
    renderEmailPreview();
  }));
}

function renderEmailPreview() {
  if (!state.emailSettings) return;
  storeCurrentTemplate();
  state.emailSettings.brandName = $('#emailBrandName').value || 'Appointment Lite';
  state.emailSettings.logoUrl = $('#emailLogoUrl').value;
  state.emailSettings.accentColor = /^#[0-9a-f]{6}$/i.test($('#emailAccentHex').value) ? $('#emailAccentHex').value.toUpperCase() : '#2F6FED';
  const template = state.emailSettings.templates[state.activeTemplate];
  const brandName = state.emailSettings.brandName;
  const accent = state.emailSettings.accentColor;
  const subject = escapeHtml(interpolate(template.subject || 'Appointment update'));
  const logo = state.emailSettings.logoUrl ? `<img src="${escapeHtml(state.emailSettings.logoUrl)}" alt="">` : escapeHtml(brandName.slice(0, 1).toUpperCase() || 'A');
  const manage = templateMeta[state.activeTemplate].manage ? `<div class="preview-email-button" style="background:${accent}">${t('Manage appointment')}</div>` : '';
  const calendar = templateMeta[state.activeTemplate].calendar ? `<div class="preview-calendar-card"><strong>${t('Add to calendar')}</strong><div class="preview-google-calendar-button">${googleGMark('small')}<span>${t('Add to Google Calendar')}</span></div></div>` : '';
  $('#emailPreview').innerHTML = `<div class="preview-mail-shell">
    <div class="preview-mail-header"><div class="preview-mail-from"><div class="preview-logo small" style="background:${accent}">${logo}</div><div><strong>${escapeHtml(brandName)}</strong><span>${t('to')} ${escapeHtml(sample.customer_email)}</span></div></div><strong class="preview-mail-subject">${subject}</strong></div>
    <div class="preview-email-card"><div class="preview-brand"><div class="preview-logo" style="background:${accent}">${logo}</div><strong>${escapeHtml(brandName)}</strong></div><h2>${escapeHtml(interpolate(template.heading))}</h2><p>${escapeHtml(interpolate(template.body))}</p>
      <div class="preview-detail-card"><div><span>${t('Service')}</span><strong>${escapeHtml(sample.product_title)}</strong></div><div><span>${t('Date & time')}</span><strong>${escapeHtml(sample.date)} · ${escapeHtml(sample.time)}</strong><small>${escapeHtml(sample.timezone)}</small></div><div><span>${t('Location')}</span><strong>${escapeHtml(sample.location)}</strong></div><div><span>${t('Staff')}</span><strong>${escapeHtml(sample.staff)}</strong></div></div>
      ${manage}${calendar}<div class="preview-footer">${t('Sent by')} ${escapeHtml(brandName)}</div></div>
  </div>`;
}

function renderEmailStudio() {
  if (!state.emailSettings) return;
  state.emailEditorReady = false;
  $('#emailBrandName').value = state.emailSettings.brandName;
  $('#emailLogoUrl').value = state.emailSettings.logoUrl;
  $('#emailAccentColor').value = state.emailSettings.accentColor;
  $('#emailAccentHex').value = state.emailSettings.accentColor;
  $('#emailReplyTo').value = state.emailSettings.replyToEmail;
  $('#merchantNotificationEmail').value = state.emailSettings.merchantNotificationEmail || '';
  $('#merchantNotificationAdditional').value = (state.emailSettings.additionalMerchantNotificationEmails || []).join('\n');
  $('#emailReminderLeadHours').value = String(state.emailSettings.reminderLeadHours || 24);
  $('#customerNotifyConfirmation').checked = state.emailSettings.customerNotifications?.confirmation !== false;
  $('#customerNotifyChanged').checked = state.emailSettings.customerNotifications?.bookingChanged !== false;
  $('#customerNotifyCancelled').checked = state.emailSettings.customerNotifications?.bookingCancelled !== false;
  $('#customerNotifyReminder').checked = state.emailSettings.customerNotifications?.upcomingReminder !== false;
  $('#customerNotifyPostPurchase').checked = state.emailSettings.customerNotifications?.postPurchaseScheduleLink !== false;
  $('#merchantNotifyNew').checked = state.emailSettings.merchantNotifications?.newBooking !== false;
  $('#merchantNotifyChanged').checked = state.emailSettings.merchantNotifications?.bookingChanged !== false;
  $('#merchantNotifyCancelled').checked = state.emailSettings.merchantNotifications?.bookingCancelled !== false;
  $('#merchantNotifyReminder').checked = state.emailSettings.merchantNotifications?.upcomingReminder !== false;
  selectTemplate(state.activeTemplate);
}

function emailSettingsPayload() {
  storeCurrentTemplate();
  return {
    brandName: $('#emailBrandName').value,
    logoUrl: $('#emailLogoUrl').value,
    accentColor: $('#emailAccentHex').value,
    replyToEmail: $('#emailReplyTo').value,
    merchantNotificationEmail: $('#merchantNotificationEmail').value,
    additionalMerchantNotificationEmails: $('#merchantNotificationAdditional').value.split(/\n|,|;/).map(value => value.trim()).filter(Boolean),
    reminderLeadHours: Number($('#emailReminderLeadHours').value || 24),
    customerNotifications: { confirmation: $('#customerNotifyConfirmation').checked, bookingChanged: $('#customerNotifyChanged').checked, bookingCancelled: $('#customerNotifyCancelled').checked, upcomingReminder: $('#customerNotifyReminder').checked, postPurchaseScheduleLink: $('#customerNotifyPostPurchase').checked },
    merchantNotifications: { newBooking: $('#merchantNotifyNew').checked, bookingChanged: $('#merchantNotifyChanged').checked, bookingCancelled: $('#merchantNotifyCancelled').checked, upcomingReminder: $('#merchantNotifyReminder').checked },
    templates: state.emailSettings.templates
  };
}

async function saveEmailSettings({ silent = false } = {}) {
  const button = $('#saveEmailSettings');
  button.disabled = true;
  try {
    const payload = await api('/email/settings', { method: 'PUT', body: JSON.stringify(emailSettingsPayload()) });
    state.emailSettings = clone(payload.settings);
    renderEmailStudio();
    if (!silent) toast(t('Email branding and templates saved.'));
    return true;
  } catch (error) {
    showError(error);
    return false;
  } finally { button.disabled = false; }
}

function openTestEmailDialog() {
  if (!state.email?.configured) return toast(t('Complete the email settings before sending notifications.'), 'error');
  const input = $('#testEmailRecipient');
  input.value = state.lastTestEmail || state.emailSettings?.merchantNotificationEmail || state.shop?.email || '';
  $('#testEmailError').classList.add('hidden');
  $('#testEmailDialog').showModal();
  setTimeout(() => { input.focus(); input.select(); }, 0);
}

async function sendTest(event) {
  event.preventDefault();
  const input = $('#testEmailRecipient');
  const button = $('#confirmSendTestEmail');
  const errorBox = $('#testEmailError');
  if (!input.checkValidity()) {
    input.reportValidity();
    return;
  }
  button.disabled = true;
  errorBox.classList.add('hidden');
  try {
    if (!await saveEmailSettings({ silent: true })) return;
    const payload = await api('/email/test', { method: 'POST', body: JSON.stringify({ to: input.value.trim() }) });
    state.lastTestEmail = payload.to;
    $('#testEmailDialog').close();
    toast(state.locale === 'zh-CN' ? `测试邮件已发送至 ${payload.to}。` : `Test email sent to ${payload.to}.`);
  } catch (error) {
    errorBox.textContent = t(error.message || String(error));
    errorBox.classList.remove('hidden');
  } finally { button.disabled = false; }
}

function setOnboardingStep(id, { done = false, active = false, locked = false } = {}) {
  const element = $(`#${id}`);
  if (!element) return;
  element.classList.toggle('completed', done);
  element.classList.toggle('active', active && !done);
  element.classList.toggle('locked', locked && !done);
  const number = element.querySelector('.quickstart-number');
  if (number) number.textContent = done ? '✓' : number.dataset.step || number.textContent;
}

function setPreviewLink(id, url, enabled) {
  const link = $(`#${id}`);
  if (!link) return;
  link.href = enabled && url ? url : '#';
  link.classList.toggle('disabled', !(enabled && url));
}

function openOrderAuthorization(url = state.orderAccess?.authorizationUrl) {
  if (!url) return;
  try { window.top.location.href = url; } catch { window.location.href = url; }
}

function renderOrderAccess(payload = state.bootstrap?.orderAccess) {
  state.orderAccess = payload || null;
  const banner = $('#orderAccessBanner');
  if (!banner) return;
  const shouldShow = Boolean(payload?.required && !payload?.granted);
  banner.classList.toggle('hidden', !shouldShow);
  const reconcile = $('#reconcileOrders');
  if (reconcile) reconcile.classList.toggle('hidden', !(payload?.granted && payload?.required));
}

async function reconcileOrdersNow() {
  const button = $('#reconcileOrders');
  if (button) button.disabled = true;
  try {
    const payload = await api('/commerce/reconcile', { method: 'POST', body: '{}' });
    const changed = Number(payload.result?.standaloneConfirmed || 0) + Number(payload.result?.postPurchaseActivated || 0);
    toast(t((Number(payload.result?.ordersChecked || 0) || changed) ? 'SHOPLINE orders synced.' : 'No new SHOPLINE orders to sync.'));
    await Promise.all([loadBookings(), loadBootstrap()]);
  } catch (error) {
    if (error.payload?.authorizationUrl) openOrderAuthorization(error.payload.authorizationUrl);
    else toast(t(error.message || 'Could not sync SHOPLINE orders.'), 'error');
  } finally { if (button) button.disabled = false; }
}

function renderOnboarding(payload = state.bootstrap) {
  if (!payload) return;
  const onboarding = payload.onboarding || {};
  state.onboarding = onboarding;
  const blockDone = Boolean(onboarding.appBlockConfirmed);
  const serviceDone = payload.stats.activeRuleCount > 0;
  const testDone = payload.stats.bookingCount > 0;
  const steps = [blockDone, serviceDone, testDone];
  const activeIndex = steps.findIndex(done => !done);

  const setupSteps = ['setupBlockStep', 'setupServiceStep', 'setupTestStep'];
  setupSteps.forEach((id, index) => setOnboardingStep(id, { done: steps[index], active: index === activeIndex }));
  const quickSteps = ['quickstartBlockStep', 'quickstartServiceStep', 'quickstartTestStep'];
  quickSteps.forEach((id, index) => setOnboardingStep(id, { done: steps[index], active: index === activeIndex, locked: index === 2 && !serviceDone }));

  const completed = steps.filter(Boolean).length;
  $('#quickstartProgressLabel').textContent = t('{done} of 3 complete', { done: String(completed) });
  $('#quickstartProgress').style.width = `${Math.round(completed / 3 * 100)}%`;

  ['confirmAppBlock', 'quickstartConfirmBlock'].forEach(id => {
    const button = $(`#${id}`);
    if (!button) return;
    button.disabled = blockDone;
    button.textContent = blockDone ? t('App Block enabled') : t("I've enabled the App Block");
  });

  setPreviewLink('setupPreviewProduct', onboarding.previewUrl, serviceDone);
  setPreviewLink('quickstartPreviewProduct', onboarding.previewUrl, serviceDone);
  $('#quickstartDone').classList.toggle('hidden', completed !== 3);
  $('#dismissQuickstart').classList.toggle('hidden', completed === 3);
}

async function updateOnboarding(action, { reload = true } = {}) {
  const payload = await api('/onboarding', { method: 'PUT', body: JSON.stringify({ action }) });
  state.onboarding = { ...(state.onboarding || {}), ...(payload.onboarding || {}) };
  if (reload) await loadBootstrap();
  return payload;
}

async function confirmAppBlockEnabled() {
  const buttons = [$('#confirmAppBlock'), $('#quickstartConfirmBlock')].filter(Boolean);
  buttons.forEach(button => { button.disabled = true; });
  try {
    await updateOnboarding('confirm-app-block');
    toast(t('App Block enabled.'));
  } catch (error) {
    buttons.forEach(button => { button.disabled = false; });
    showError(error);
  }
}

async function dismissQuickstart() {
  const dialog = $('#quickstartDialog');
  try { await updateOnboarding('dismiss-quickstart', { reload: false }); }
  catch (error) { showError(error); return; }
  if (dialog.open) dialog.close();
}

let pendingConfirm = null;
function confirmAction(title, message, actionLabel, action) {
  $('#confirmTitle').textContent = t(title);
  $('#confirmMessage').textContent = t(message);
  $('#confirmYes').textContent = t(actionLabel);
  pendingConfirm = action;
  $('#confirmDialog').showModal();
}

async function loadBootstrap({ suppressRecoveryToast = false } = {}) {
  const returningFromSubscription = new URLSearchParams(window.location.search).get('subscription') === 'return';
  const payload = await api(`/bootstrap${returningFromSubscription ? '?subscription_return=1' : ''}`);
  if (returningFromSubscription) {
    const url = new URL(window.location.href);
    url.searchParams.delete('subscription');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
  state.bootstrap = payload;
  state.csrf = payload.csrfToken;
  state.shop = payload.shop;
  state.subscription = payload.subscription || null;
  state.subscriptionSyncError = payload.subscriptionSyncError || '';
  state.accessMode = payload.accessMode || (payload.archiveMode ? 'archive' : (payload.restricted ? 'subscription_required' : 'full'));
  state.archiveMode = state.accessMode === 'archive';
  state.restricted = state.accessMode === 'subscription_required';
  $('#shopBadge').textContent = `${payload.shop.handle}.myshopline.com`;
  $('#timezoneBadge').textContent = payload.shop.timezone || 'UTC';
  $('#bookingTimezone').textContent = payload.shop.timezone || 'UTC';
  $('#storeAvatar').textContent = payload.shop.handle.slice(0, 1).toUpperCase();
  await setLocale(payload.shop.adminLocale || 'en', { save: false });
  renderSubscriptionStatus(state.subscription, state.subscriptionSyncError);
  if (payload.subscriptionRecovery?.recovered && !suppressRecoveryToast) {
    toast(t('SHOPLINE subscription restored. Full access is available again.'));
  }
  if (state.restricted) return;
  if (state.archiveMode) {
    state.currentView = 'bookings';
    switchView('bookings');
    return;
  }

  renderOrderAccess(payload.orderAccess);
  state.email = payload.email;
  state.emailSettings = clone(payload.emailSettings);
  state.storefrontSettings = normalizeStorefrontClient(payload.storefrontSettings || defaultStorefrontSettings);
  state.onboarding = payload.onboarding || {};
  $('#setupStoreId').textContent = payload.shop.storeId ? `${payload.shop.handle}.myshopline.com` : t('Store details are syncing');
  const statusLabel = payload.email.configured ? 'Email delivery ready' : 'Email delivery needs attention';
  $('#emailStatusTitle').textContent = t(statusLabel);
  $('#emailStatusText').textContent = t(payload.email.configured ? 'Confirmation and update emails can be sent.' : 'Complete the email settings before sending notifications.');
  $('#emailFromText').textContent = payload.email.from ? `${t('Sending address')}: ${payload.email.from}` : t('Sending address not configured');
  $('#emailStatusDot').classList.toggle('ready', payload.email.configured);
  $('#sidebarProvider').textContent = t(payload.email.configured ? 'Email notifications ready' : 'Email notifications need setup');
  $('#sendTestEmail').disabled = !payload.email.configured;
  renderDashboard(payload);
  renderEmailStudio();
  renderStorefrontSettings(state.storefrontSettings);
  renderOnboarding(payload);
  await ensureStaff();
  renderBookingStaffFilter();
  if (payload.onboarding?.shouldShowQuickstart && !$('#quickstartDialog').open) {
    if (!payload.onboarding.quickstartStarted) {
      try {
        const started = await updateOnboarding('start-quickstart', { reload: false });
        payload.onboarding = { ...payload.onboarding, ...(started.onboarding || {}), shouldShowQuickstart: true };
        state.onboarding = payload.onboarding;
      } catch (error) { console.warn('Could not persist Quickstart start state:', error.message); }
    }
    await loadThemeEditorLink();
    renderOnboarding(payload);
    $('#quickstartDialog').showModal();
  }
}

async function setLocale(locale, { save = true } = {}) {
  state.locale = locale === 'zh-CN' ? 'zh-CN' : 'en';
  document.documentElement.lang = state.locale;
  $('#languageLabel').textContent = state.locale === 'zh-CN' ? '简体中文' : 'English';
  $$('[data-locale]').forEach(button => button.classList.toggle('selected', button.dataset.locale === state.locale));
  applyStaticTranslations();
  refreshRuleSelects();
  renderServiceTimezoneMenu($('#serviceTimezone')?.value || '');
  switchView(state.currentView);
  renderTemplateTabs();
  if (state.rules.length) renderRules();
  if (state.bookings.length) renderBookings();
  if (state.staff.length) { renderStaff(); renderRuleStaffOptions(); renderBookingStaffFilter(); }
  if (state.staffOperations?.date) renderStaffOperations();
  if (state.calendarSync) renderCalendarSync();
  if (state.bootstrap?.accessMode === 'full') { renderDashboard(state.bootstrap); renderOnboarding(state.bootstrap); }
  if (state.subscription) renderSubscriptionStatus(state.subscription, state.subscriptionSyncError);
  if (state.emailSettings) renderEmailStudio();
  if (state.storefrontSettings) renderStorefrontSettings(state.storefrontSettings);
  if (save && !state.restricted && !state.archiveMode) {
    try { await api('/preferences', { method: 'PUT', body: JSON.stringify({ adminLocale: state.locale }) }); }
    catch (error) { showError(error); }
  }
}

async function loadThemeEditorLink() {
  if (state.themeLinkLoaded) return;
  const links = [$('#openThemeEditor'), $('#quickstartThemeEditor')].filter(Boolean);
  const hint = $('#themeEditorHint');
  try {
    const payload = await api('/storefront/deep-link');
    links.forEach(link => {
      link.href = payload.url;
      link.classList.remove('disabled');
    });
    hint.textContent = t(payload.available ? 'The editor will open on the product template in a new window.' : 'Open the theme page, choose Customize, then add Appointment Lite to the product template.');
    state.themeLinkLoaded = true;
  } catch (error) {
    hint.textContent = t('The theme editor is temporarily unavailable. Please try again.');
  }
}

function bind() {
  initRuleSelects();
  document.addEventListener('click', event => { if (!event.target.closest('.booking-action-group')) closeBookingActionMenus(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeBookingActionMenus(); });
  window.addEventListener('resize', () => closeBookingActionMenus());
  window.addEventListener('scroll', () => closeBookingActionMenus(), true);
  window.addEventListener('focus', () => { void recoverSubscriptionIfNeeded(); });
  window.addEventListener('pageshow', event => { if (event.persisted) void recoverSubscriptionIfNeeded({ force: true }); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void recoverSubscriptionIfNeeded(); });
  renderTemplateTabs();
  $$('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $('#startSubscription')?.addEventListener('click', startSubscriptionCheckout);
  $('#syncSubscriptionGate')?.addEventListener('click', refreshSubscription);
  $('#syncSubscriptionBilling')?.addEventListener('click', refreshSubscription);
  $('#renewSubscriptionBilling')?.addEventListener('click', openShoplineRenewal);
  $('#renewFromBookings')?.addEventListener('click', openShoplineRenewal);
  $$('[data-go-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.goView)));
  $$('[data-new-rule]').forEach(button => button.addEventListener('click', () => openRule()));
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => { closeRuleSelect(); closeServiceTimezonePicker(); closeLocationPicker(); $('#ruleDialog').close(); }));
  $$('[data-close-product-dialog]').forEach(button => button.addEventListener('click', () => $('#productDialog').close()));
  $$('[data-close-booking-dialog]').forEach(button => button.addEventListener('click', () => $('#bookingDialog').close()));
  $$('[data-close-flow-dialog]').forEach(button => button.addEventListener('click', () => $('#bookingFlowDialog').close()));
  $$('[data-close-calendar-day]').forEach(button => button.addEventListener('click', () => $('#calendarDayDialog').close()));
  $('#ruleForm').addEventListener('submit', saveRule);
  $('#bookingForm').addEventListener('submit', saveBooking);
  $('#addQuestion').addEventListener('click', () => addQuestion());
  $$('#locationModeGrid [data-location-mode]').forEach(button => button.addEventListener('click', () => setLocationMode(button.dataset.locationMode)));
  $('#shoplineLocationPickerButton')?.addEventListener('click', () => {
    const menu = $('#shoplineLocationMenu');
    const button = $('#shoplineLocationPickerButton');
    const opening = menu.classList.contains('hidden');
    closeRuleSelect();
    closeServiceTimezonePicker();
    menu.classList.toggle('hidden', !opening);
    button.setAttribute('aria-expanded', String(opening));
    if (opening) requestAnimationFrame(positionLocationPickerMenu);
  });
  $('#serviceTimezone')?.addEventListener('focus', () => openServiceTimezonePicker());
  $('#serviceTimezone')?.addEventListener('input', () => openServiceTimezonePicker());
  $('#serviceTimezoneToggle')?.addEventListener('click', () => {
    const menu = $('#serviceTimezoneMenu');
    if (menu?.classList.contains('hidden')) openServiceTimezonePicker({ showAll: true });
    else closeServiceTimezonePicker();
  });
  $('#refreshLocations')?.addEventListener('click', () => loadLocations({ force: true, selectedId: $('#shoplineLocationId')?.value || '' }).catch(showError));
  $('#ruleNext').addEventListener('click', () => { if (validateRuleStep(state.ruleStep)) setRuleStep(state.ruleStep + 1); });
  $('#ruleBack').addEventListener('click', () => setRuleStep(state.ruleStep - 1));
  $$('[data-rule-step-button]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.ruleStepButton);
    if (target <= state.ruleStep || validateRuleStep(state.ruleStep)) setRuleStep(target);
  }));
  $('#productPickerButton').addEventListener('click', () => openProductPicker('checkout'));
  $('#triggerProductPickerButton')?.addEventListener('click', () => openProductPicker('trigger'));
  $('#placementProductPickerButton')?.addEventListener('click', () => openProductPicker('placement'));
  $('#productSearch').addEventListener('input', event => renderProductOptions(event.target.value));
  $('#productSyncButton').addEventListener('click', () => ensureProducts(true));
  $('#paidVariantSelect')?.addEventListener('change', event => setPaidVariant(event.target.value));
  $('#languageButton').addEventListener('click', () => {
    const menu = $('#languageMenu');
    menu.classList.toggle('hidden');
    $('#languageButton').setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
  });
  $$('[data-locale]').forEach(button => button.addEventListener('click', () => {
    $('#languageMenu').classList.add('hidden');
    $('#languageButton').setAttribute('aria-expanded', 'false');
    setLocale(button.dataset.locale);
  }));
  document.addEventListener('click', event => {
    if (!$('#languagePicker').contains(event.target)) {
      $('#languageMenu').classList.add('hidden');
      $('#languageButton').setAttribute('aria-expanded', 'false');
    }
    if ($('#shoplineLocationPicker') && !$('#shoplineLocationPicker').contains(event.target)) closeLocationPicker();
    if ($('#serviceTimezonePicker') && !$('#serviceTimezonePicker').contains(event.target)) closeServiceTimezonePicker();
    if (activeRuleSelect) {
      const ui = ruleSelectRegistry.get(activeRuleSelect);
      if (ui && !ui.wrapper.contains(event.target)) closeRuleSelect(activeRuleSelect);
    }
  });
  $('#ruleDialog .modal-body')?.addEventListener('scroll', () => {
    closeRuleSelect();
    closeServiceTimezonePicker();
    closeLocationPicker();
  }, { passive: true });
  window.addEventListener('resize', () => { closeRuleSelect(); closeServiceTimezonePicker(); closeLocationPicker(); });
  $('#ruleSearch').addEventListener('input', renderRules);
  $('#newStaffButton')?.addEventListener('click', () => openStaff());
  $('#staffSearch')?.addEventListener('input', renderStaff);
  $('#calendarBusinessCard')?.addEventListener('click', event => {
    const connect = event.target.closest('[data-calendar-connect]');
    const manage = event.target.closest('[data-calendar-manage]');
    const syncNow = event.target.closest('[data-calendar-sync-now]');
    const disconnect = event.target.closest('[data-calendar-disconnect]');
    if (connect && !connect.disabled) connectGoogleCalendar();
    else if (manage) openCalendarManager();
    else if (syncNow && !syncNow.disabled) syncGoogleCalendarNow(syncNow);
    else if (disconnect) disconnectGoogleCalendar();
  });
  $('#calendarForm')?.addEventListener('submit', saveCalendarSelection);
  $$('[data-close-calendar-dialog]').forEach(button => button.addEventListener('click', () => $('#calendarDialog').close()));
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin || event.data?.type !== 'appointment-lite:google-calendar') return;
    if (event.data.status === 'connected') toast(t('Google Calendar connected.'));
    else toast(t(event.data.message || 'Could not connect Google Calendar.'), 'error');
    state.calendarPopup = null;
    loadCalendarSync({ force: true });
  });
  $('#staffForm')?.addEventListener('submit', saveStaff);
  $$('[data-close-staff-dialog]').forEach(button => button.addEventListener('click', () => $('#staffDialog').close()));
  $('#addStaffException')?.addEventListener('click', () => addStaffException());
  $('#staffOperationsDate')?.addEventListener('change', event => loadStaffOperations(event.target.value));
  $$('[data-staff-ops-view]').forEach(button => button.addEventListener('click', () => { state.staffOperationsView = button.dataset.staffOpsView === 'calendar' ? 'calendar' : 'list'; renderStaffOperations(); }));
  $('#uploadStaffAvatar')?.addEventListener('click', () => $('#staffAvatarFile').click());
  $('#useStaffInitials')?.addEventListener('click', () => setStaffAvatarDraft({ kind: 'initials', value: '' }, $('#staffName').value || 'Staff'));
  $('#staffName')?.addEventListener('input', () => {
    const preview = $('#staffAvatarPreview');
    if (preview && staffAvatarDraft.kind !== 'custom') setStaffAvatarDraft(staffAvatarDraft, $('#staffName').value || 'Staff');
  });
  $('#staffEmail')?.addEventListener('input', () => {
    const checkbox = $('#staffEmailNotifications');
    const enabled = Boolean($('#staffEmail').value.trim());
    const wasDisabled = checkbox.disabled;
    checkbox.disabled = !enabled;
    if (!enabled) checkbox.checked = false;
    else if (wasDisabled) checkbox.checked = true;
  });
  $('#staffAvatarFile')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const value = await processStaffAvatarFile(file);
      setStaffAvatarDraft({ kind: 'custom', value }, $('#staffName').value || 'Staff');
    } catch (error) {
      $('#staffFormError').textContent = t(error.message);
      $('#staffFormError').classList.remove('hidden');
    } finally { event.target.value = ''; }
  });
  $$('#staffAssignmentGrid [data-staff-mode]').forEach(button => button.addEventListener('click', () => setStaffAssignmentMode(button.dataset.staffMode)));
  $('#authorizeOrderAccess')?.addEventListener('click', () => openOrderAuthorization());
  $('#reconcileOrders')?.addEventListener('click', reconcileOrdersNow);
    $('#bookingSearch').addEventListener('input', renderBookings);
  ['bookingServiceFilter', 'bookingStaffFilter', 'bookingStatusFilter', 'bookingFrom', 'bookingTo'].forEach(id => $(`#${id}`)?.addEventListener('change', renderBookings));
  $$('[data-booking-view]').forEach(button => button.addEventListener('click', () => setBookingView(button.dataset.bookingView)));
  $('#clearBookingFilters')?.addEventListener('click', () => {
    $('#bookingSearch').value = '';
    $('#bookingServiceFilter').value = '';
    $('#bookingStatusFilter').value = '';
    if ($('#bookingStaffFilter')) $('#bookingStaffFilter').value = '';
    $('#bookingFrom').value = '';
    $('#bookingTo').value = '';
    renderBookings();
  });
  $('#calendarPrev')?.addEventListener('click', () => shiftCalendarMonth(-1));
  $('#calendarNext')?.addEventListener('click', () => shiftCalendarMonth(1));
  $('#exportBookings')?.addEventListener('click', exportBookingsCsv);
  $('#addException')?.addEventListener('click', () => addException());
  $('#serviceType')?.addEventListener('change', event => setServiceType(event.target.value));
  $$('#bookingTypeGrid [data-booking-type]').forEach(button => button.addEventListener('click', () => setBookingType(button.dataset.bookingType)));
  $$('#paymentModeGrid [data-payment-mode]').forEach(button => button.addEventListener('click', () => setPaymentMode(button.dataset.paymentMode)));
  $('#placementProductBlock')?.addEventListener('change', refreshPlacementUi);
  $$('[data-product-placement-scope]').forEach(button => button.addEventListener('click', () => setProductPlacementScope(button.dataset.productPlacementScope)));
  $$('#commerceModeGrid [data-commerce-mode]').forEach(button => button.addEventListener('click', () => {}));
  $$('#bookingSourceGrid [data-booking-source]').forEach(button => button.addEventListener('click', () => {}));
  $$('#bookingModeGrid [data-booking-mode]').forEach(button => button.addEventListener('click', () => setBookingMode(button.dataset.bookingMode)));
  $('#allDayCapacityMirror')?.addEventListener('input', event => { $('#capacity').value = event.target.value; });
  $('#capacity')?.addEventListener('input', event => { if ($('#bookingMode').value === 'all_day') $('#allDayCapacityMirror').value = event.target.value; });
  ['duration', 'buffer'].forEach(id => $(`#${id}`)?.addEventListener('input', renderSlotLogic));
  $('#confirmNo').addEventListener('click', () => { pendingConfirm = null; $('#confirmDialog').close(); });
  $('#confirmYes').addEventListener('click', async () => {
    const action = pendingConfirm;
    pendingConfirm = null;
    $('#confirmDialog').close();
    if (action) try { await action(); } catch (error) { showError(error); }
  });
  $('#saveStorefrontSettings')?.addEventListener('click', saveStorefrontSettings);
  $$('#storefrontThemeOptions [data-storefront-theme]').forEach(button => button.addEventListener('click', () => setStorefrontTheme(button.dataset.storefrontTheme)));
  $$('#storefrontIntensityOptions [data-storefront-intensity]').forEach(button => button.addEventListener('click', () => setStorefrontIntensity(button.dataset.storefrontIntensity)));
  $$('#storefrontCornerOptions [data-storefront-corner]').forEach(button => button.addEventListener('click', () => setStorefrontCornerStyle(button.dataset.storefrontCorner)));
  $$('#storefrontPrimaryStyleOptions [data-storefront-primary-style]').forEach(button => button.addEventListener('click', () => setStorefrontPrimaryStyle(button.dataset.storefrontPrimaryStyle)));
  $('#storefrontUnifiedFlow')?.addEventListener('input', renderStorefrontPreview);
  $$('#storefrontButtonWidthOptions [data-storefront-width]').forEach(button => button.addEventListener('click', () => setStorefrontButtonWidth(button.dataset.storefrontWidth)));
  $$('#storefrontButtonAlignmentOptions [data-storefront-alignment]').forEach(button => button.addEventListener('click', () => { if (!button.disabled) setStorefrontButtonAlignment(button.dataset.storefrontAlignment); }));
  $$('#storefrontPrimaryWidthOptions [data-storefront-primary-width]').forEach(button => button.addEventListener('click', () => setStorefrontPrimaryWidth(button.dataset.storefrontPrimaryWidth)));
  $$('#storefrontPrimaryAlignmentOptions [data-storefront-primary-alignment]').forEach(button => button.addEventListener('click', () => { if (!button.disabled) setStorefrontPrimaryAlignment(button.dataset.storefrontPrimaryAlignment); }));
  ['storefrontButtonLabel', 'storefrontButtonRadius', 'storefrontModalTitle', 'storefrontShowSummary', 'storefrontShowTimezone', 'storefrontShowPhone', 'storefrontShowNotes', 'storefrontShowFooterNote'].forEach(id => $(`#${id}`)?.addEventListener('input', renderStorefrontPreview));
  [['storefrontButtonColor','storefrontButtonColorHex'],['storefrontButtonTextColor','storefrontButtonTextColorHex'],['storefrontModalAccent','storefrontModalAccentHex'],['storefrontModalTextColor','storefrontModalTextColorHex']].forEach(([colorId, hexId]) => {
    $(`#${colorId}`)?.addEventListener('input', () => syncStorefrontColor(colorId, hexId, 'color'));
    $(`#${hexId}`)?.addEventListener('input', () => syncStorefrontColor(colorId, hexId, 'hex'));
  });
  $('#saveEmailSettings').addEventListener('click', () => saveEmailSettings());
  $('#sendTestEmail').addEventListener('click', openTestEmailDialog);
  $('#testEmailForm').addEventListener('submit', sendTest);
  $$('[data-close-test-email]').forEach(button => button.addEventListener('click', () => $('#testEmailDialog').close()));
  $('#confirmAppBlock').addEventListener('click', confirmAppBlockEnabled);
  $('#quickstartConfirmBlock').addEventListener('click', confirmAppBlockEnabled);
  $$('[data-dismiss-quickstart]').forEach(button => button.addEventListener('click', dismissQuickstart));
  $('#dismissQuickstart').addEventListener('click', dismissQuickstart);
  $('#quickstartDone').addEventListener('click', dismissQuickstart);
  $('#quickstartCreateService').addEventListener('click', () => { if ($('#quickstartDialog').open) $('#quickstartDialog').close(); openRule(); });
  ['openThemeEditor', 'quickstartThemeEditor'].forEach(id => $(`#${id}`)?.addEventListener('click', () => { updateOnboarding('theme-editor-opened', { reload: false }).catch(() => {}); }));
  ['emailBrandName', 'emailLogoUrl', 'templateSubject', 'templateHeading', 'templateBody'].forEach(id => $(`#${id}`).addEventListener('input', renderEmailPreview));
  $('#emailAccentColor').addEventListener('input', event => { $('#emailAccentHex').value = event.target.value.toUpperCase(); renderEmailPreview(); });
  $('#emailAccentHex').addEventListener('input', event => { if (/^#[0-9a-f]{6}$/i.test(event.target.value)) $('#emailAccentColor').value = event.target.value; renderEmailPreview(); });
}

bind();
$('#bookingsList').innerHTML = bookingSkeletons();
loadBootstrap().catch(showError);


Object.assign(zh, {
  'Customers buy first, then receive a private scheduling link after payment.': '客户先完成购买，付款成功后收到私密预约链接。',
  'Installation, delivery setup, onboarding, or post-purchase service.': '适合安装、交付调试、开通服务或其他购买后服务。',
  'Customers complete the normal SHOPLINE purchase first. After payment, Appointment Lite emails the buyer a private link to schedule the included service.': '客户先完成正常的 SHOPLINE 购买。付款成功后，Appointment Lite 会向买家发送私密链接，用于预约随订单提供的服务。',
  'Private order scheduling link': '订单专属预约链接',
  'Appointment Lite waits for a paid SHOPLINE order, then emails the buyer a private scheduling link. One purchased unit provides one appointment.': 'Appointment Lite 会等待 SHOPLINE 订单付款成功，然后向买家发送私密预约链接。每购买 1 件商品可预约 1 次服务。',
  'Order-linked': '订单关联',
  'Customers who pay for this product receive a private scheduling link for the included service.': '购买并支付该商品的客户，会收到用于预约随订单服务的私密链接。',
  'No booking button is shown before purchase. The buyer schedules from the private order email after payment.': '购买前不会显示预约按钮。付款成功后，买家通过订单邮件中的私密链接进行预约。',
  'Private order link': '订单私密链接'
});


Object.assign(zh, {
  'AFTER PAYMENT': '付款后',
  'Appointment Lite waits for a paid SHOPLINE order, then emails the buyer a private scheduling link.': 'Appointment Lite 会等待 SHOPLINE 订单付款成功，然后向买家发送私密预约链接。',
  '1 purchased unit = 1 appointment': '每购买 1 件商品可预约 1 次',
  'SHOPLINE order stays unchanged': '不会修改 SHOPLINE 订单',
  'Select a location managed in SHOPLINE Admin.': '选择一个在 SHOPLINE 后台维护的地点。',
  'Managed in SHOPLINE Admin': '由 SHOPLINE 后台维护',
  'Default location': '默认地点',
  'Refresh locations and choose another one.': '请刷新地点并重新选择。',
  'No SHOPLINE locations found': '未找到 SHOPLINE 地点',
  'Create a location in SHOPLINE Admin, then refresh this list.': '请先在 SHOPLINE 后台创建地点，然后刷新此列表。',
  'Delete this order scheduling record?': '删除这条订单预约记录？',
  'Delete this booking record?': '删除这条预约记录？',
  'This removes the order-linked scheduling record from Appointment Lite and revokes any remaining private scheduling access. The SHOPLINE order is not deleted.': '删除后，这条订单关联预约记录会从 Appointment Lite 中移除，并停止剩余的私密预约权限；SHOPLINE 订单不会被删除。',
  'This removes the record from Appointment Lite. If the appointment is still active, its time will be released and calendar events will be removed. The SHOPLINE order is not deleted.': '删除后，这条记录会从 Appointment Lite 中移除；如果预约仍然有效，将释放对应时段并移除日历事件。SHOPLINE 订单不会被删除。',
  'Delete record': '删除记录',
  'Booking record deleted.': '预约记录已删除。'
});

Object.assign(zh, {
  'Read-only archive': '只读归档',
  'Read-only': '只读',
  'Read only': '只读',
  'Renew with SHOPLINE': '前往 SHOPLINE 续费',
  'Your SHOPLINE subscription has ended. Booking records remain available for review and CSV export, but editing and operational actions are locked until you renew.': 'SHOPLINE 套餐已到期。你仍可以查看预约记录并导出 CSV，但编辑和所有运营操作都会锁定，续费后即可恢复。'
});
