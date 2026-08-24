const icon = (path, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

const icons = {
  overview: icon('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  rules: icon('<path d="M8 6h13M8 12h13M8 18h13"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>'),
  bookings: icon('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m8 15 2 2 5-5"/>'),
  email: icon('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>'),
  setup: icon('<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  arrow: icon('<path d="m9 18 6-6-6-6"/>'),
  check: icon('<path d="m5 12 4 4L19 6"/>'),
  spark: icon('<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/>'),
  globe: icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>'),
  close: icon('<path d="m6 6 12 12M18 6 6 18"/>'),
  search: icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
  chevron: icon('<path d="m6 9 6 6 6-6"/>')
};

function brand() {
  return `<span class="brand-symbol"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 8.5h14a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z"/><path d="M11 5v7M21 5v7M6 14h20"/><circle cx="16" cy="19" r="3"/></svg></span>`;
}

function navButton(view, label, glyph, active = false) {
  return `<button class="nav-item${active ? ' active' : ''}" data-view="${view}">${glyph}<span>${label}</span></button>`;
}

export function adminPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Appointment Lite</title>
  <link rel="stylesheet" href="/admin/styles.css">
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">${brand()}<div><strong>Appointment Lite</strong><span>Appointment management</span></div></div>
      <nav aria-label="Main navigation">
        <span class="nav-label">Workspace</span>
        ${navButton('dashboard', 'Overview', icons.overview, true)}
        ${navButton('rules', 'Services & rules', icons.rules)}
        ${navButton('bookings', 'Bookings', icons.bookings)}
        <span class="nav-label nav-label-spaced">Configuration</span>
        ${navButton('email', 'Email Studio', icons.email)}
        ${navButton('setup', 'Storefront setup', icons.setup)}
      </nav>
      <div class="sidebar-status"><span class="pulse"></span><div><strong>Store connected</strong><span id="sidebarProvider">Checking notifications…</span></div></div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div class="mobile-brand">${brand()}<strong>Appointment Lite</strong></div>
        <div class="topbar-copy"><span id="pageEyebrow">Workspace</span><strong id="pageTitle">Overview</strong></div>
        <div class="topbar-actions">
          <div id="languagePicker" class="language-picker"><button id="languageButton" type="button" aria-haspopup="listbox" aria-expanded="false">${icons.globe}<span id="languageLabel">English</span>${icons.chevron}</button><div id="languageMenu" class="language-menu hidden" role="listbox"><button type="button" data-locale="en" role="option">English<span>EN</span></button><button type="button" data-locale="zh-CN" role="option">简体中文<span>中文</span></button></div></div>
          <div class="store-context"><span class="store-avatar" id="storeAvatar">S</span><div><strong id="shopBadge">Loading store…</strong><span id="timezoneBadge">Syncing time zone</span></div></div>
        </div>
      </header>

      <main class="content">
        <div id="toastRegion" class="toast-region" aria-live="polite"></div>

        <section id="dashboardView" class="view">
          <div class="hero-panel">
            <div class="hero-copy"><span class="eyebrow">APPOINTMENT MANAGEMENT</span><h1>Manage every appointment with clarity.</h1><p>Configure bookable services, coordinate schedules, and keep customer updates consistent.</p><div class="hero-actions"><button class="primary" data-new-rule>${icons.plus} Create service rule</button><button class="ghost" data-go-view="bookings">View bookings ${icons.arrow}</button></div></div>
            <div class="hero-orbit" aria-hidden="true"><span class="orbit orbit-a"></span><span class="orbit orbit-b"></span><div class="orbit-core">${icons.spark}</div><i class="dot dot-a"></i><i class="dot dot-b"></i><i class="dot dot-c"></i></div>
          </div>

          <div class="stats">
            <article><div class="stat-icon violet">${icons.rules}</div><div><span>Active services</span><strong id="activeRuleCount">—</strong><small id="ruleCountNote">Loading rules</small></div></article>
            <article><div class="stat-icon cyan">${icons.bookings}</div><div><span>All bookings</span><strong id="bookingCount">—</strong><small>Lifetime records</small></div></article>
            <article><div class="stat-icon green">${icons.check}</div><div><span>Upcoming</span><strong id="upcomingCount">—</strong><small>Store-local schedule</small></div></article>
            <article><div class="stat-icon amber">${icons.email}</div><div><span>Email notifications</span><strong id="planName">—</strong><small>Customer updates</small></div></article>
          </div>

          <div class="dashboard-grid">
            <article class="panel upcoming-panel"><div class="panel-head"><div><span class="eyebrow">NEXT UP</span><h2>Upcoming appointments</h2></div><button class="text-button" data-go-view="bookings">View all ${icons.arrow}</button></div><div id="upcomingList" class="timeline-list"><div class="skeleton-line"></div><div class="skeleton-line"></div></div></article>
            <article class="panel launch-panel"><div class="panel-head"><div><span class="eyebrow">LAUNCH PATH</span><h2>Workspace readiness</h2></div><strong id="setupPercent" class="progress-number">0%</strong></div><div class="progress-track"><span id="setupProgress"></span></div><div id="setupChecklist" class="checklist"></div></article>
          </div>
        </section>

        <section id="rulesView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">SERVICE CATALOG</span><h1>Services & appointment rules</h1><p>Choose which products are bookable and define the experience around them.</p></div><button class="primary" data-new-rule>${icons.plus} New service rule</button></div>
          <div class="toolbar"><label class="search-field">${icons.search}<input id="ruleSearch" type="search" placeholder="Search services, staff, or location"></label><div class="toolbar-meta"><span id="ruleResultCount">0 services</span></div></div>
          <div id="rulesList" class="service-grid"><div class="panel loading">Loading service rules…</div></div>
        </section>

        <section id="bookingsView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">CUSTOMER SCHEDULE</span><h1>Bookings</h1><p>Review appointments, update service details, and keep customers informed.</p></div><div class="timezone-pill">${icons.globe}<span id="bookingTimezone">Store time</span></div></div>
          <div class="toolbar bookings-toolbar"><label class="search-field">${icons.search}<input id="bookingSearch" type="search" placeholder="Search customer, product, or email"></label><div class="segmented" role="group" aria-label="Filter bookings"><button class="active" data-booking-filter="">All</button><button data-booking-filter="confirmed">Confirmed</button><button data-booking-filter="cancelled">Cancelled</button></div></div>
          <div class="booking-table panel"><div class="table-head"><span>Customer & service</span><span>Date & time</span><span>Assignment</span><span>Status</span><span></span></div><div id="bookingsList" aria-live="polite"></div></div>
        </section>

        <section id="emailView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">CUSTOMER COMMUNICATION</span><h1>Email Studio</h1><p>Give every appointment email a consistent voice and visual identity.</p></div><div class="heading-actions"><button id="sendTestEmail" class="secondary" type="button">Send test</button><button id="saveEmailSettings" class="primary" type="button">Save email design</button></div></div>
          <div class="email-status-bar"><span id="emailStatusDot" class="status-dot"></span><div><strong id="emailStatusTitle">Checking email notifications…</strong><span id="emailStatusText"></span></div><span id="emailFromText" class="sender-chip"></span></div>
          <div class="email-studio-grid">
            <div class="email-controls">
              <article class="panel form-section"><div class="section-title"><span class="section-number">01</span><div><h2>Brand identity</h2><p>Choose how your store appears inside appointment emails.</p></div></div><div class="field-row"><div class="field"><label for="emailBrandName">Brand name</label><input id="emailBrandName" maxlength="80" placeholder="Your store name"></div><div class="field color-field"><label for="emailAccentColor">Accent color</label><div><input id="emailAccentColor" type="color" value="#5B5BD6"><input id="emailAccentHex" maxlength="7" value="#5B5BD6" aria-label="Accent color hex"></div></div></div><div class="field"><label for="emailLogoUrl">Email logo URL <span>optional</span></label><input id="emailLogoUrl" type="url" maxlength="500" placeholder="https://cdn.example.com/logo.png"><p class="hint">Use a square HTTPS image, ideally 160 × 160 px. If empty, your brand initial is shown.</p></div></article>
              <article class="panel form-section"><div class="section-title"><span class="section-number">02</span><div><h2>Notification recipients</h2><p>Choose where customers can reply and where your team receives new-booking alerts.</p></div></div><div class="field-row"><div class="field"><label for="emailReplyTo">Customer reply-to</label><input id="emailReplyTo" type="email" maxlength="254" placeholder="support@yourstore.com"></div><div class="field"><label for="merchantNotificationEmail">New booking notifications</label><input id="merchantNotificationEmail" type="email" maxlength="254" placeholder="appointments@yourstore.com"></div></div></article>
              <article class="panel form-section template-editor"><div class="section-title"><span class="section-number">03</span><div><h2>Message templates</h2><p>Customize the message while core appointment details remain protected and consistent.</p></div></div><div id="templateTabs" class="template-tabs" role="tablist"></div><div class="field"><label for="templateSubject">Email subject</label><input id="templateSubject" maxlength="180"></div><div class="field"><label for="templateHeading">Email heading</label><input id="templateHeading" maxlength="120"></div><div class="field"><label for="templateBody">Intro message</label><textarea id="templateBody" rows="7" maxlength="3000"></textarea></div><div><span class="field-label">Insert a variable</span><div id="variableChips" class="variable-chips"></div></div></article>
            </div>
            <aside class="email-preview-wrap"><div class="preview-sticky"><div class="preview-toolbar"><div><span class="eyebrow">LIVE PREVIEW</span><strong id="previewTemplateLabel">Confirmation</strong></div><span class="desktop-chip">Desktop</span></div><div class="email-preview-canvas"><div id="emailPreview" class="email-preview"></div></div><p class="preview-footnote">Preview content uses sample appointment data. Customer details are never stored in this editor.</p></div></aside>
          </div>
        </section>

        <section id="setupView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">STOREFRONT CONNECTION</span><h1>Storefront setup</h1><p>Add the booking experience to your product page in a few steps.</p></div><span class="status-badge success">Store connected</span></div>
          <div class="setup-layout">
            <article class="panel setup-steps"><div class="setup-step completed"><span>1</span><div><strong>Store connected</strong><p>Your store is ready to use Appointment Lite.</p><span id="setupStoreId" class="setup-meta">Loading store…</span></div></div><div class="setup-step"><span>2</span><div><strong>Create a service rule</strong><p>Select a product, duration, availability, location, and specialist.</p><button class="text-button" data-new-rule>Create a rule ${icons.arrow}</button></div></div><div class="setup-step"><span>3</span><div><strong>Add Appointment Lite to your product page</strong><p>Open the theme editor, place the App Block in the product information area, then save the theme.</p><a id="openThemeEditor" class="button-link primary disabled" href="#" target="_blank" rel="noopener noreferrer">Open theme editor ${icons.arrow}</a><p id="themeEditorHint" class="hint">Preparing your theme editor link…</p></div></div><div class="setup-step"><span>4</span><div><strong>Preview a bookable product</strong><p>Open a product with an active service rule and complete one test booking.</p></div></div></article>
            <aside class="panel diagnostics"><div class="diagnostic-icon">${icons.check}</div><h2>Before you publish</h2><p>Use this short checklist to confirm the customer experience.</p><ul><li>The App Block is visible on product pages</li><li>Date and time choices match your schedule</li><li>Confirmation emails use your store branding</li><li>A test booking appears in Bookings</li></ul></aside>
          </div>
        </section>
      </main>
    </div>
  </div>

  <dialog id="ruleDialog" class="modal rule-modal">
    <form id="ruleForm">
      <div class="modal-head"><div><span class="eyebrow">SERVICE CONFIGURATION</span><h2 id="ruleDialogTitle">New appointment rule</h2><p id="ruleDialogSubtitle">Start with the product customers will book.</p></div><button type="button" class="icon-button" data-close-dialog aria-label="Close">${icons.close}</button></div>
      <div class="wizard-steps"><button type="button" class="active" data-rule-step-button="0"><span>1</span>Service</button><i></i><button type="button" data-rule-step-button="1"><span>2</span>Availability</button><i></i><button type="button" data-rule-step-button="2"><span>3</span>Experience</button></div>
      <div class="modal-body">
        <input type="hidden" id="ruleId"><input type="hidden" id="productSelect">
        <section class="rule-step" data-rule-step="0"><div class="step-intro"><h3>What are customers booking?</h3><p>Connect one SHOPLINE product to this appointment experience.</p></div><div class="field"><label>SHOPLINE product</label><div id="productPicker" class="custom-select"><button id="productPickerButton" type="button" aria-haspopup="dialog"><span id="productPickerLabel">Select a product</span>${icons.chevron}</button></div><p class="hint">Each product can have one appointment rule.</p></div><div class="field-row"><div class="field"><label for="duration">Appointment duration</label><div class="input-suffix"><input id="duration" type="number" min="5" max="480" step="5" value="60" required><span>minutes</span></div></div><div class="field"><label for="buffer">Buffer after appointment</label><div class="input-suffix"><input id="buffer" type="number" min="0" max="240" step="5" value="0" required><span>minutes</span></div></div></div></section>
        <section class="rule-step hidden" data-rule-step="1"><div class="step-intro"><h3>When can customers book?</h3><p>Times are interpreted in the store time zone shown in the top bar.</p></div><div class="field-row"><div class="field"><label for="dateFrom">Available from <span>optional</span></label><input id="dateFrom" type="date"></div><div class="field"><label for="dateUntil">Available until <span>optional</span></label><input id="dateUntil" type="date"></div></div><fieldset><legend>Weekly schedule</legend><div id="weeklySchedule" class="schedule"></div><p class="hint">Enable the days customers can book. Past store-local times are automatically removed.</p></fieldset></section>
        <section class="rule-step hidden" data-rule-step="2"><div class="step-intro"><h3>Shape the customer experience</h3><p>Add lightweight assignment details and collect useful context.</p></div><div class="field-row"><div class="field"><label for="location">Location</label><input id="location" maxlength="200" placeholder="e.g. Main showroom"></div><div class="field"><label for="staff">Staff or specialist</label><input id="staff" maxlength="200" placeholder="e.g. Sarah"></div></div><div class="field"><label for="questionLabel">Notes prompt</label><input id="questionLabel" maxlength="120" value="Anything we should know?"></div><div class="field"><div class="label-row"><label>Custom questions <span>up to 5</span></label><button id="addQuestion" class="text-button" type="button">${icons.plus} Add question</button></div><div id="questions" class="questions"></div></div><label class="toggle-row"><input id="enabled" type="checkbox" checked><span class="toggle"><i></i></span><span><strong>Service is active</strong><small>Show the booking experience on matching product pages.</small></span></label></section>
        <div id="formError" class="form-error hidden" role="alert"></div>
      </div>
      <div class="modal-actions"><button type="button" class="secondary" data-close-dialog>Cancel</button><span class="action-spacer"></span><button id="ruleBack" type="button" class="secondary hidden">Back</button><button id="ruleNext" type="button" class="primary">Continue ${icons.arrow}</button><button id="saveRule" type="submit" class="primary hidden">Save service rule</button></div>
    </form>
  </dialog>

  <dialog id="productDialog" class="modal picker-modal"><div class="modal-head"><div><span class="eyebrow">PRODUCT CATALOG</span><h2>Select a product</h2><p>Choose the product customers will book.</p></div><button type="button" class="icon-button" data-close-product-dialog aria-label="Close">${icons.close}</button></div><div class="picker-search-wrap"><label class="select-search">${icons.search}<input id="productSearch" type="search" placeholder="Search products by name"></label></div><div id="productOptions" class="product-dialog-options" role="listbox"></div><div class="modal-actions"><button type="button" class="secondary" data-close-product-dialog>Back to service</button></div></dialog>

  <dialog id="bookingDialog" class="modal booking-modal"><form id="bookingForm"><div class="modal-head"><div><span class="eyebrow">BOOKING DETAILS</span><h2>Edit appointment</h2><p id="bookingDialogSummary">Update the customer appointment.</p></div><button type="button" class="icon-button" data-close-booking-dialog aria-label="Close">${icons.close}</button></div><div class="modal-body"><input type="hidden" id="bookingId"><div class="inline-notice">${icons.globe}<span id="bookingEditTimezone">Times use the store time zone.</span></div><div class="field-row"><div class="field"><label for="bookingDate">Date</label><input id="bookingDate" type="date" required></div><div class="field"><label for="bookingTime">Time</label><input id="bookingTime" type="time" required></div></div><div class="field-row"><div class="field"><label for="bookingLocation">Location</label><input id="bookingLocation" maxlength="200"></div><div class="field"><label for="bookingStaff">Staff</label><input id="bookingStaff" maxlength="200"></div></div><p class="hint">Saving validates the selected slot and emails the customer when delivery is configured. Email failure never rolls back the booking.</p><div id="bookingFormError" class="form-error hidden" role="alert"></div></div><div class="modal-actions"><button type="button" class="secondary" data-close-booking-dialog>Cancel</button><button id="saveBooking" type="submit" class="primary">Save and notify</button></div></form></dialog>

  <dialog id="bookingFlowDialog" class="modal flow-modal"><div class="modal-head"><div><span class="eyebrow">BOOKING ACTIVITY</span><h2>Appointment history</h2><p id="bookingFlowSummary"></p></div><button type="button" class="icon-button" data-close-flow-dialog aria-label="Close">${icons.close}</button></div><div class="modal-body"><div id="bookingFlow" class="booking-flow"></div></div><div class="modal-actions"><button type="button" class="primary" data-close-flow-dialog>Done</button></div></dialog>

  <dialog id="confirmDialog" class="confirm-modal"><div class="confirm-icon">!</div><div class="confirm-copy"><h2 id="confirmTitle">Please confirm</h2><p id="confirmMessage"></p></div><div class="modal-actions"><button id="confirmNo" class="secondary">Keep it</button><button id="confirmYes" class="danger">Confirm</button></div></dialog>
  <script type="module" src="/admin/app.js"></script>
</body>
</html>`;
}
