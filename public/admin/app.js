const state = {
  csrf: '', shop: null, email: null, emailSettings: null, rules: [], bookings: [], products: [],
  bookingFilter: '', ruleStep: 0, activeTemplate: 'confirmation', emailEditorReady: false,
  locale: 'en', currentView: 'dashboard', themeLinkLoaded: false, bootstrap: null
};
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const viewLabels = {
  dashboard: ['Workspace', 'Overview'], rules: ['Service catalog', 'Services & rules'], bookings: ['Customer schedule', 'Bookings'],
  email: ['Customer communication', 'Email Studio'], setup: ['Configuration', 'Storefront setup']
};
const templateMeta = {
  confirmation: { label: 'Confirmation', manage: true },
  rescheduled: { label: 'Customer changed', manage: true },
  merchantUpdated: { label: 'Store changed', manage: false },
  cancelled: { label: 'Cancelled', manage: false },
  merchantNewBooking: { label: 'Merchant alert', manage: false }
};
const sample = {
  customer_name: 'Jamie Chen', customer_email: 'jamie@example.com', product_title: 'Private design consultation',
  date: '2026-09-08', time: '14:00', timezone: 'Asia/Shanghai', location: 'Main showroom', staff: 'Alex Morgan'
};
const variables = ['customer_name', 'product_title', 'date', 'time', 'timezone', 'location', 'staff', 'store_name'];
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

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
  'Assignment': '服务安排', 'Status': '状态', 'CUSTOMER COMMUNICATION': '客户沟通',
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
  'Search products by name': '按名称搜索商品', 'Your store name': '你的店铺名称', 'e.g. Main showroom': '例如：主展厅', 'e.g. Sarah': '例如：Sarah',
  'Anything we should know?': '还有什么需要我们了解？'
};

const originalText = new WeakMap();
const originalAttributes = new WeakMap();

Object.assign(zh, {
  Sunday: '星期日', Monday: '星期一', Tuesday: '星期二', Wednesday: '星期三', Thursday: '星期四', Friday: '星期五', Saturday: '星期六',
  start: '开始', end: '结束', Ready: '已启用', 'Setup needed': '待设置', Customer: '客户',
  'No upcoming appointments yet. Your next confirmed booking will appear here.': '暂无即将开始的预约。下一条已确认预约会显示在这里。',
  'SHOPLINE store connected': 'SHOPLINE 店铺已连接', 'At least one active service rule': '至少启用一条服务规则',
  'Email notifications ready': '邮件通知已就绪', 'Email notifications need setup': '邮件通知待设置', 'Email design customized': '已自定义邮件设计',
  'Question shown to customers': '向客户展示的问题', Required: '必填', Remove: '移除', 'No matching products': '没有匹配的商品',
  'Could not load products': '无法加载商品', 'Set the store-local schedule customers can choose from.': '设置客户可选择的店铺本地时间。',
  'Finish the customer-facing details and activate the service.': '完善客户看到的服务信息并启用预约。', 'Edit service rule': '编辑预约服务',
  'Service rule updated.': '预约服务已更新。', 'Service rule created.': '预约服务已创建。',
  'No services match your search': '没有匹配的预约服务', 'No service rules yet': '还没有预约服务', 'Try a different keyword.': '请尝试其他关键词。',
  'Create a rule to make a SHOPLINE product bookable.': '创建预约服务，让指定 SHOPLINE 商品支持预约。', 'min appointment': '分钟预约', 'min buffer': '分钟缓冲',
  Active: '已启用', Paused: '已暂停', Specialist: '服务人员', 'Any staff': '未指定人员', 'Not set': '未设置', Questions: '自定义问题', custom: '个',
  'Edit service': '编辑', Delete: '删除', 'Service rule deleted.': '预约服务已删除。', 'No bookings found': '没有找到预约',
  'Try another search.': '请尝试其他搜索条件。', 'Confirmed appointments will appear here.': '已确认的预约会显示在这里。', 'No location': '未设置地点',
  'View history': '查看历史', Edit: '编辑', 'Appointment created': '预约已创建', 'The customer completed this booking.': '客户已完成本次预约。',
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
  'Delete this service rule?': '删除这条服务规则？', 'Rules with booking history cannot be deleted. If customers have booked it before, pause the service instead.': '有预约历史的规则不能删除；如果客户曾预约过，请改为暂停服务。',
  'Delete rule': '删除规则', 'Cancel this appointment?': '取消这条预约？', 'The time will be released immediately. The customer will be emailed when delivery is configured.': '该时间会立即释放；邮件通知启用后将告知客户。',
  'Cancel booking': '取消预约'
});

function t(value, variables = {}) {
  let result = state.locale === 'zh-CN' ? (zh[value] || value) : value;
  for (const [key, replacement] of Object.entries(variables)) result = result.replaceAll(`{${key}}`, replacement);
  return result;
}

function applyStaticTranslations(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) continue;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const original = originalText.get(node);
    const trimmed = original.trim();
    node.nodeValue = trimmed && zh[trimmed] && state.locale === 'zh-CN' ? original.replace(trimmed, zh[trimmed]) : original;
  }
  root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach(element => {
    if (!originalAttributes.has(element)) originalAttributes.set(element, Object.fromEntries(['placeholder', 'aria-label', 'title'].filter(name => element.hasAttribute(name)).map(name => [name, element.getAttribute(name)])));
    for (const [name, original] of Object.entries(originalAttributes.get(element))) element.setAttribute(name, state.locale === 'zh-CN' ? (zh[original] || original) : original);
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

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  $('#toastRegion').append(item);
  setTimeout(() => item.remove(), 4500);
}

function showError(error) { toast(t(error.message || String(error)), 'error'); }

function switchView(name) {
  state.currentView = name;
  $$('.view').forEach(view => view.classList.add('hidden'));
  $(`#${name}View`).classList.remove('hidden');
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  $('#pageEyebrow').textContent = t(viewLabels[name]?.[0] || 'Workspace');
  $('#pageTitle').textContent = t(viewLabels[name]?.[1] || 'Appointment Lite');
  if (name === 'rules') loadRules();
  if (name === 'bookings') loadBookings();
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
    return `<div class="timeline-item"><div class="timeline-date"><strong>${date.day}</strong><span>${date.month}</span></div><div><strong>${escapeHtml(booking.productTitle)}</strong><span>${escapeHtml(booking.customer?.name || t('Customer'))}${booking.staff ? ` · ${escapeHtml(booking.staff)}` : ''}</span></div><time>${escapeHtml(booking.time)}</time></div>`;
  }).join('') : `<div class="empty-compact">${t('No upcoming appointments yet. Your next confirmed booking will appear here.')}</div>`;

  const checks = [
    { done: Boolean(payload.shop.storeId), label: t('SHOPLINE store connected') },
    { done: payload.stats.activeRuleCount > 0, label: t('At least one active service rule') },
    { done: payload.email.configured, label: t('Email notifications ready') },
    { done: Boolean(payload.emailSettings?.brandName), label: t('Email design customized') }
  ];
  const completed = checks.filter(item => item.done).length;
  const percent = Math.round(completed / checks.length * 100);
  $('#setupPercent').textContent = `${percent}%`;
  $('#setupProgress').style.width = `${percent}%`;
  $('#setupChecklist').innerHTML = checks.map(item => `<div class="check-item ${item.done ? 'done' : ''}"><i>✓</i><span>${escapeHtml(item.label)}</span></div>`).join('');
}

function renderSchedule(values = []) {
  $('#weeklySchedule').innerHTML = days.map((day, weekday) => {
    const current = values.find(value => value.weekday === weekday);
    const window = current?.windows?.[0] || { start: '09:00', end: '17:00' };
    const enabled = Boolean(current?.enabled);
    return `<div class="schedule-row ${enabled ? 'enabled' : ''}" data-weekday="${weekday}"><label><input type="checkbox" ${enabled ? 'checked' : ''}>${t(day)}</label><input type="time" value="${escapeHtml(window.start)}" aria-label="${t(day)} ${t('start')}"><input type="time" value="${escapeHtml(window.end)}" aria-label="${t(day)} ${t('end')}"></div>`;
  }).join('');
  $$('.schedule-row input[type=checkbox]').forEach(input => input.addEventListener('change', () => input.closest('.schedule-row').classList.toggle('enabled', input.checked)));
}

function addQuestion(question = {}) {
  if ($$('.question-row').length >= 5) return toast(t('You can add up to five custom questions.'), 'error');
  const row = document.createElement('div');
  row.className = 'question-row';
  row.innerHTML = `<input type="text" maxlength="120" placeholder="${t('Question shown to customers')}" value="${escapeHtml(question.label || '')}"><label><input type="checkbox" ${question.required ? 'checked' : ''}> ${t('Required')}</label><button type="button" class="secondary small">${t('Remove')}</button>`;
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('#questions').append(row);
}

function renderProductOptions(query = '') {
  const normalized = query.trim().toLowerCase();
  const matches = state.products.filter(product => !normalized || product.title.toLowerCase().includes(normalized));
  $('#productOptions').innerHTML = matches.length ? matches.map(product => `<button type="button" class="product-option ${$('#productSelect').value === product.id ? 'selected' : ''}" role="option" aria-selected="${$('#productSelect').value === product.id}" data-product-id="${escapeHtml(product.id)}"><span class="product-option-avatar">${escapeHtml(product.title.slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(product.title)}</strong><small>${escapeHtml(product.handle || t('SHOPLINE product'))}</small></span><i>✓</i></button>`).join('') : `<div class="empty-compact">${t('No matching products')}</div>`;
  $$('#productOptions .product-option').forEach(button => button.addEventListener('click', () => selectProduct(button.dataset.productId)));
}

function selectProduct(productId) {
  const product = state.products.find(item => item.id === productId);
  $('#productSelect').value = productId || '';
  $('#productPickerLabel').textContent = product?.title || t('Select a product');
  $('#productPickerButton').classList.toggle('has-value', Boolean(product));
  if ($('#productDialog').open) $('#productDialog').close();
  renderProductOptions($('#productSearch').value);
}

async function ensureProducts() {
  if (state.products.length) return;
  $('#productOptions').innerHTML = productSkeletons();
  try {
    state.products = (await api('/products')).products;
    renderProductOptions();
  } catch (error) {
    $('#productOptions').innerHTML = `<div class="empty-compact">${t('Could not load products')}</div>`;
    showError(error);
  }
}

function setRuleStep(step) {
  state.ruleStep = Math.max(0, Math.min(2, step));
  $$('[data-rule-step]').forEach(panel => panel.classList.toggle('hidden', Number(panel.dataset.ruleStep) !== state.ruleStep));
  $$('[data-rule-step-button]').forEach(button => button.classList.toggle('active', Number(button.dataset.ruleStepButton) === state.ruleStep));
  $('#ruleBack').classList.toggle('hidden', state.ruleStep === 0);
  $('#ruleNext').classList.toggle('hidden', state.ruleStep === 2);
  $('#saveRule').classList.toggle('hidden', state.ruleStep !== 2);
  const subtitles = ['Start with the product customers will book.', 'Set the store-local schedule customers can choose from.', 'Finish the customer-facing details and activate the service.'];
  $('#ruleDialogSubtitle').textContent = t(subtitles[state.ruleStep]);
  $('#formError').classList.add('hidden');
}

function validateRuleStep(step) {
  let message = '';
  if (step === 0 && !$('#productSelect').value) message = 'Select a SHOPLINE product before continuing.';
  if (step === 0 && (!$('#duration').checkValidity() || !$('#buffer').checkValidity())) message = 'Enter a valid duration and buffer.';
  if (step === 1 && !$$('.schedule-row input[type=checkbox]').some(input => input.checked)) message = 'Enable at least one weekday.';
  if (message) {
    $('#formError').textContent = t(message);
    $('#formError').classList.remove('hidden');
    return false;
  }
  return true;
}

async function openRule(rule = null) {
  $('#ruleForm').reset();
  if (!rule) $('#questionLabel').value = t('Anything we should know?');
  $('#ruleId').value = rule?._id || '';
  $('#ruleDialogTitle').textContent = t(rule ? 'Edit service rule' : 'New service rule');
  $('#questions').innerHTML = '';
  $('#productSearch').value = '';
  renderSchedule(rule?.weeklyAvailability || [1, 2, 3, 4, 5].map(weekday => ({ weekday, enabled: true, windows: [{ start: '09:00', end: '17:00' }] })));
  await ensureProducts();
  if (rule && !state.products.some(product => product.id === rule.productId)) state.products.push({ id: rule.productId, title: rule.productTitle, handle: rule.productHandle || '' });
  selectProduct(rule?.productId || '');
  if (rule) {
    $('#duration').value = rule.duration;
    $('#buffer').value = rule.buffer;
    $('#dateFrom').value = rule.dateFrom || '';
    $('#dateUntil').value = rule.dateUntil || '';
    $('#location').value = rule.location || '';
    $('#staff').value = rule.staff || '';
    $('#questionLabel').value = rule.questionLabel || t('Anything we should know?');
    $('#enabled').checked = rule.enabled;
    (rule.customQuestions || []).forEach(addQuestion);
  }
  setRuleStep(0);
  $('#ruleDialog').showModal();
}

function rulePayload() {
  const product = state.products.find(item => item.id === $('#productSelect').value);
  return {
    productId: product?.id || '', productTitle: product?.title || '', productHandle: product?.handle || '',
    duration: Number($('#duration').value), buffer: Number($('#buffer').value), dateFrom: $('#dateFrom').value, dateUntil: $('#dateUntil').value,
    weeklyAvailability: $$('.schedule-row').map(row => ({ weekday: Number(row.dataset.weekday), enabled: row.querySelector('input[type=checkbox]').checked, windows: [{ start: row.querySelectorAll('input[type=time]')[0].value, end: row.querySelectorAll('input[type=time]')[1].value }] })),
    location: $('#location').value, staff: $('#staff').value, questionLabel: $('#questionLabel').value, enabled: $('#enabled').checked,
    customQuestions: $$('.question-row').map(row => ({ label: row.querySelector('input[type=text]').value, required: row.querySelector('input[type=checkbox]').checked }))
  };
}

async function saveRule(event) {
  event.preventDefault();
  if (![0, 1, 2].every(validateRuleStep)) return;
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
    $('#formError').textContent = t(error.message);
    $('#formError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

function renderRules() {
  const query = $('#ruleSearch').value.trim().toLowerCase();
  const rules = state.rules.filter(rule => !query || [rule.productTitle, rule.staff, rule.location].some(value => String(value || '').toLowerCase().includes(query)));
  $('#ruleResultCount').textContent = state.locale === 'zh-CN' ? `${rules.length} 条预约规则` : `${rules.length} service rule${rules.length === 1 ? '' : 's'}`;
  const root = $('#rulesList');
  if (!rules.length) {
    root.innerHTML = `<div class="panel empty"><strong>${t(state.rules.length ? 'No services match your search' : 'No service rules yet')}</strong><span>${t(state.rules.length ? 'Try a different keyword.' : 'Create a rule to make a SHOPLINE product bookable.')}</span></div>`;
    return;
  }
  root.innerHTML = rules.map(rule => {
    const bufferLabel = state.locale === 'zh-CN' ? (rule.buffer ? `缓冲 ${rule.buffer} 分钟` : '无缓冲') : (rule.buffer ? `${rule.buffer} min buffer` : 'No buffer');
    const timingLabel = state.locale === 'zh-CN' ? `预约 ${rule.duration} 分钟 · ${bufferLabel}` : `${rule.duration} min appointment · ${bufferLabel}`;
    const questionCount = (rule.customQuestions || []).length;
    const questionLabel = state.locale === 'zh-CN' ? (questionCount ? `${questionCount} 个` : '未配置') : (questionCount ? `${questionCount} custom` : 'None');
    return `<article class="panel service-card"><div class="service-head"><div class="service-identity"><div class="service-avatar">${escapeHtml(rule.productTitle.slice(0, 1).toUpperCase())}</div><div><strong title="${escapeHtml(rule.productTitle)}">${escapeHtml(rule.productTitle)}</strong><span>${timingLabel}</span></div></div><span class="status-badge ${rule.enabled ? 'enabled' : 'disabled'}">${t(rule.enabled ? 'Active' : 'Paused')}</span></div><div class="service-meta"><div><span>${t('Specialist')}</span><strong>${escapeHtml(rule.staff || t('Any staff'))}</strong></div><div><span>${t('Location')}</span><strong>${escapeHtml(rule.location || t('Not set'))}</strong></div><div><span>${t('Questions')}</span><strong>${questionLabel}</strong></div></div><div class="service-actions"><button class="secondary small" data-edit="${rule._id}">${t('Edit service')}</button><button class="secondary small" data-delete="${rule._id}">${t('Delete')}</button></div></article>`;
  }).join('');
  $$('[data-edit]').forEach(button => button.addEventListener('click', () => openRule(state.rules.find(rule => rule._id === button.dataset.edit))));
  $$('[data-delete]').forEach(button => button.addEventListener('click', () => confirmAction('Delete this service rule?', 'Rules with booking history cannot be deleted. If customers have booked it before, pause the service instead.', 'Delete rule', async () => {
    await api(`/rules/${button.dataset.delete}`, { method: 'DELETE' });
    toast(t('Service rule deleted.'));
    await Promise.all([loadRules(), loadBootstrap()]);
  })));
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
  $('#bookingStaff').value = booking.staff || '';
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
    const payload = await api(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ date: $('#bookingDate').value, time: $('#bookingTime').value, location: $('#bookingLocation').value, staff: $('#bookingStaff').value }) });
    $('#bookingDialog').close();
    toast(t(payload.notification?.skipped ? 'Booking updated. Email delivery is not configured.' : payload.notification?.failed ? 'Booking updated, but the customer email failed.' : 'Booking updated and customer email sent.'), payload.notification?.failed ? 'error' : 'success');
    await Promise.all([loadBookings(), loadBootstrap()]);
  } catch (error) {
    $('#bookingFormError').textContent = t(error.message);
    $('#bookingFormError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

function renderBookings() {
  const query = $('#bookingSearch').value.trim().toLowerCase();
  const bookings = state.bookings.filter(booking => !query || [booking.productTitle, booking.customer?.name, booking.customer?.email, booking.staff, booking.location].some(value => String(value || '').toLowerCase().includes(query)));
  const root = $('#bookingsList');
  if (!bookings.length) {
    root.innerHTML = `<div class="empty"><strong>${t('No bookings found')}</strong><span>${t(state.bookings.length ? 'Try another search.' : 'Confirmed appointments will appear here.')}</span></div>`;
    return;
  }
  root.innerHTML = bookings.map(booking => `<div class="booking-row"><div class="booking-primary"><strong>${escapeHtml(booking.productTitle)}</strong><span>${escapeHtml(booking.customer.name)} · ${escapeHtml(booking.customer.email)}</span></div><div class="booking-cell"><strong>${escapeHtml(booking.date)}</strong><span>${escapeHtml(booking.time)} · ${escapeHtml(booking.timezone || state.shop?.timezone || 'UTC')}</span></div><div class="booking-cell"><strong>${escapeHtml(booking.staff || t('Any staff'))}</strong><span>${escapeHtml(booking.location || t('No location'))}</span></div><span class="status-badge ${booking.status}">${t(booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled')}</span><div class="row-actions"><button class="secondary small icon-only" data-flow-booking="${booking._id}" title="${t('View history')}" aria-label="${t('View history')}">↻</button>${booking.status === 'confirmed' ? `<button class="secondary small" data-edit-booking="${booking._id}">${t('Edit')}</button><button class="secondary small" data-cancel="${booking._id}">${t('Cancel')}</button>` : ''}</div></div>`).join('');
  $$('[data-flow-booking]').forEach(button => button.addEventListener('click', () => openBookingFlow(state.bookings.find(booking => booking._id === button.dataset.flowBooking))));
  $$('[data-edit-booking]').forEach(button => button.addEventListener('click', () => openBooking(state.bookings.find(booking => booking._id === button.dataset.editBooking))));
  $$('[data-cancel]').forEach(button => button.addEventListener('click', () => confirmAction('Cancel this appointment?', 'The time will be released immediately. The customer will be emailed when delivery is configured.', 'Cancel booking', async () => {
    const payload = await api(`/bookings/${button.dataset.cancel}/cancel`, { method: 'POST', body: '{}' });
    toast(t(payload.notification?.skipped ? 'Booking cancelled. Email delivery is not configured.' : payload.notification?.failed ? 'Booking cancelled, but the customer email failed.' : 'Booking cancelled and customer email sent.'), payload.notification?.failed ? 'error' : 'success');
    await Promise.all([loadBookings(), loadBootstrap()]);
  })));
}

async function loadBookings() {
  const root = $('#bookingsList');
  root.setAttribute('aria-busy', 'true');
  if (!state.bookings.length) root.innerHTML = bookingSkeletons(); else root.classList.add('is-loading');
  try {
    state.bookings = (await api(`/bookings${state.bookingFilter ? `?status=${state.bookingFilter}` : ''}`)).bookings;
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
    created: ['Appointment created', 'The customer completed this booking.'],
    customer_rescheduled: ['Customer changed the time', 'The customer used their online change.'],
    merchant_updated: ['Store updated the appointment', 'The date, time, location, or specialist was updated.'],
    customer_cancelled: ['Customer cancelled', 'The time was released for other customers.'],
    merchant_cancelled: ['Store cancelled the appointment', 'The time was released for other customers.']
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
  $('#bookingFlow').innerHTML = events.map(event => {
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
  state.emailSettings.accentColor = /^#[0-9a-f]{6}$/i.test($('#emailAccentHex').value) ? $('#emailAccentHex').value.toUpperCase() : '#5B5BD6';
  const template = state.emailSettings.templates[state.activeTemplate];
  const brandName = state.emailSettings.brandName;
  const accent = state.emailSettings.accentColor;
  const logo = state.emailSettings.logoUrl ? `<img src="${escapeHtml(state.emailSettings.logoUrl)}" alt="">` : escapeHtml(brandName.slice(0, 1).toUpperCase() || 'A');
  $('#emailPreview').innerHTML = `<div class="preview-brand"><div class="preview-logo" style="background:${accent}">${logo}</div><strong>${escapeHtml(brandName)}</strong></div><div class="preview-email-card"><h2>${escapeHtml(interpolate(template.heading))}</h2><p>${escapeHtml(interpolate(template.body))}</p><div class="preview-appointment" style="border-color:${accent}33;background:${accent}0D"><strong>${escapeHtml(sample.product_title)}</strong><span class="when" style="color:${accent}">${sample.date} ${t('at')} ${sample.time}</span><span>${t('Time zone')}: ${sample.timezone}</span><span>${t('Location')}: ${sample.location}</span><span>${t('Staff')}: ${sample.staff}</span></div>${templateMeta[state.activeTemplate].manage ? `<div class="preview-email-button" style="background:${accent}">${t('Manage appointment')}</div>` : ''}<div class="preview-footer">${t('Sent by')} ${escapeHtml(brandName)}</div></div>`;
}

function renderEmailStudio() {
  if (!state.emailSettings) return;
  state.emailEditorReady = false;
  $('#emailBrandName').value = state.emailSettings.brandName;
  $('#emailLogoUrl').value = state.emailSettings.logoUrl;
  $('#emailAccentColor').value = state.emailSettings.accentColor;
  $('#emailAccentHex').value = state.emailSettings.accentColor;
  $('#emailReplyTo').value = state.emailSettings.replyToEmail;
  $('#merchantNotificationEmail').value = state.emailSettings.merchantNotificationEmail;
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

async function sendTest() {
  const button = $('#sendTestEmail');
  button.disabled = true;
  try {
    if (!await saveEmailSettings({ silent: true })) return;
    const payload = await api('/email/test', { method: 'POST', body: '{}' });
    toast(state.locale === 'zh-CN' ? `测试邮件已发送至 ${payload.to}。` : `Test email sent to ${payload.to}.`);
  } catch (error) { showError(error); }
  finally { button.disabled = !state.email?.configured; }
}

let pendingConfirm = null;
function confirmAction(title, message, actionLabel, action) {
  $('#confirmTitle').textContent = t(title);
  $('#confirmMessage').textContent = t(message);
  $('#confirmYes').textContent = t(actionLabel);
  pendingConfirm = action;
  $('#confirmDialog').showModal();
}

async function loadBootstrap() {
  const payload = await api('/bootstrap');
  state.bootstrap = payload;
  state.csrf = payload.csrfToken;
  state.shop = payload.shop;
  state.email = payload.email;
  state.emailSettings = clone(payload.emailSettings);
  $('#shopBadge').textContent = `${payload.shop.handle}.myshopline.com`;
  $('#timezoneBadge').textContent = payload.shop.timezone || 'UTC';
  $('#bookingTimezone').textContent = payload.shop.timezone || 'UTC';
  $('#storeAvatar').textContent = payload.shop.handle.slice(0, 1).toUpperCase();
  await setLocale(payload.shop.adminLocale || 'en', { save: false });
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
}

async function setLocale(locale, { save = true } = {}) {
  state.locale = locale === 'zh-CN' ? 'zh-CN' : 'en';
  document.documentElement.lang = state.locale;
  $('#languageLabel').textContent = state.locale === 'zh-CN' ? '简体中文' : 'English';
  $$('[data-locale]').forEach(button => button.classList.toggle('selected', button.dataset.locale === state.locale));
  applyStaticTranslations();
  switchView(state.currentView);
  renderTemplateTabs();
  if (state.rules.length) renderRules();
  if (state.bookings.length) renderBookings();
  if (state.bootstrap) renderDashboard(state.bootstrap);
  if (state.emailSettings) renderEmailStudio();
  if (save) {
    try { await api('/preferences', { method: 'PUT', body: JSON.stringify({ adminLocale: state.locale }) }); }
    catch (error) { showError(error); }
  }
}

async function loadThemeEditorLink() {
  if (state.themeLinkLoaded) return;
  const link = $('#openThemeEditor');
  const hint = $('#themeEditorHint');
  try {
    const payload = await api('/storefront/deep-link');
    link.href = payload.url;
    link.classList.remove('disabled');
    hint.textContent = t(payload.available ? 'The editor will open on the product template in a new window.' : 'Open the theme page, choose Customize, then add Appointment Lite to the product template.');
    state.themeLinkLoaded = true;
  } catch (error) {
    hint.textContent = t('The theme editor is temporarily unavailable. Please try again.');
  }
}

function bind() {
  renderTemplateTabs();
  $$('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $$('[data-go-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.goView)));
  $$('[data-new-rule]').forEach(button => button.addEventListener('click', () => openRule()));
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => $('#ruleDialog').close()));
  $$('[data-close-product-dialog]').forEach(button => button.addEventListener('click', () => $('#productDialog').close()));
  $$('[data-close-booking-dialog]').forEach(button => button.addEventListener('click', () => $('#bookingDialog').close()));
  $$('[data-close-flow-dialog]').forEach(button => button.addEventListener('click', () => $('#bookingFlowDialog').close()));
  $('#ruleForm').addEventListener('submit', saveRule);
  $('#bookingForm').addEventListener('submit', saveBooking);
  $('#addQuestion').addEventListener('click', () => addQuestion());
  $('#ruleNext').addEventListener('click', () => { if (validateRuleStep(state.ruleStep)) setRuleStep(state.ruleStep + 1); });
  $('#ruleBack').addEventListener('click', () => setRuleStep(state.ruleStep - 1));
  $$('[data-rule-step-button]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.ruleStepButton);
    if (target <= state.ruleStep || validateRuleStep(state.ruleStep)) setRuleStep(target);
  }));
  $('#productPickerButton').addEventListener('click', async () => {
    $('#productDialog').showModal();
    $('#productSearch').value = '';
    $('#productSearch').focus();
    await ensureProducts();
    renderProductOptions();
  });
  $('#productSearch').addEventListener('input', event => renderProductOptions(event.target.value));
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
  });
  $('#ruleSearch').addEventListener('input', renderRules);
  $('#bookingSearch').addEventListener('input', renderBookings);
  $$('[data-booking-filter]').forEach(button => button.addEventListener('click', () => {
    state.bookingFilter = button.dataset.bookingFilter;
    $$('[data-booking-filter]').forEach(item => item.classList.toggle('active', item === button));
    loadBookings();
  }));
  $('#confirmNo').addEventListener('click', () => { pendingConfirm = null; $('#confirmDialog').close(); });
  $('#confirmYes').addEventListener('click', async () => {
    const action = pendingConfirm;
    pendingConfirm = null;
    $('#confirmDialog').close();
    if (action) try { await action(); } catch (error) { showError(error); }
  });
  $('#saveEmailSettings').addEventListener('click', () => saveEmailSettings());
  $('#sendTestEmail').addEventListener('click', sendTest);
  ['emailBrandName', 'emailLogoUrl', 'templateSubject', 'templateHeading', 'templateBody'].forEach(id => $(`#${id}`).addEventListener('input', renderEmailPreview));
  $('#emailAccentColor').addEventListener('input', event => { $('#emailAccentHex').value = event.target.value.toUpperCase(); renderEmailPreview(); });
  $('#emailAccentHex').addEventListener('input', event => { if (/^#[0-9a-f]{6}$/i.test(event.target.value)) $('#emailAccentColor').value = event.target.value; renderEmailPreview(); });
}

bind();
$('#bookingsList').innerHTML = bookingSkeletons();
loadBootstrap().catch(showError);
