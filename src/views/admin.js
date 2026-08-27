const icon = (path, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

const icons = {
  overview: icon('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  rules: icon('<path d="M8 6h13M8 12h13M8 18h13"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>'),
  bookings: icon('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m8 15 2 2 5-5"/>'),
  staff: icon('<circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V20"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.5h1.7a3.8 3.8 0 0 1 3.8 3.8V20"/>'),
  email: icon('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>'),
  calendarSync: icon('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h3v3H8zM13 14h3v3h-3z"/>'),
  setup: icon('<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  arrow: icon('<path d="m9 18 6-6-6-6"/>'),
  check: icon('<path d="m5 12 4 4L19 6"/>'),
  spark: icon('<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/>'),
  globe: icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>'),
  close: icon('<path d="m6 6 12 12M18 6 6 18"/>'),
  search: icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
  refresh: icon('<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/>'),
  chevron: icon('<path d="m6 9 6 6 6-6"/>')
};

function brand() {
  return `<span class="brand-symbol"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 8.5h14a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z"/><path d="M11 5v7M21 5v7M6 14h20"/><circle cx="16" cy="19" r="3"/></svg></span>`;
}

function googleG(className = '') {
  return `<span class="google-g ${className}" aria-hidden="true"><svg viewBox="0 0 24 24" role="img"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.24-.2-1.8H12v3.28h5.52a4.72 4.72 0 0 1-2.05 3.01l-.02.11 2.98 2.31.21.02c1.93-1.78 3.04-4.4 3.04-6.93Z"/><path fill="#34A853" d="M12 22c2.76 0 5.08-.91 6.78-2.48l-3.23-2.5c-.86.6-2.04 1.01-3.55 1.01a6.17 6.17 0 0 1-5.83-4.26l-.1.01-3.1 2.4-.04.1A10.24 10.24 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.17 13.77A6.3 6.3 0 0 1 5.83 12c0-.62.12-1.22.33-1.78l-.01-.12-3.14-2.44-.1.05A10 10 0 0 0 1.82 12c0 1.55.38 3.02 1.08 4.29l3.27-2.52Z"/><path fill="#EA4335" d="M12 5.97c1.92 0 3.22.83 3.97 1.52l2.88-2.81C17.08 3.03 14.76 2 12 2a10.24 10.24 0 0 0-9.08 5.71l3.24 2.51A6.19 6.19 0 0 1 12 5.97Z"/></svg></span>`;
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
  <link rel="stylesheet" href="/admin/styles.css?v=0.6.1">
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
        ${navButton('staff', 'Staff', icons.staff)}
        <span class="nav-label nav-label-spaced">Configuration</span>
        ${navButton('calendar', 'Calendar Sync', icons.calendarSync)}
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
          <div class="page-heading"><div><span class="eyebrow">SERVICE CATALOG</span><h1>Services & appointment rules</h1><p>Create appointment services, bind them to SHOPLINE products when needed, and choose product-page, direct, or dual booking channels.</p></div><button class="primary" data-new-rule>${icons.plus} New service</button></div>
          <div class="toolbar"><label class="search-field">${icons.search}<input id="ruleSearch" type="search" placeholder="Search services, staff, or location"></label><div class="toolbar-meta"><span id="ruleResultCount">0 services</span></div></div>
          <div id="rulesList" class="service-grid"><div class="panel loading">Loading services…</div></div>
        </section>

        <section id="bookingsView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">SCHEDULING OPERATIONS</span><h1>Bookings</h1><p>Run your daily schedule in a list or calendar, update status, and export records when needed.</p></div><div class="heading-actions"><div class="timezone-pill">${icons.globe}<span id="bookingTimezone">Store time</span></div><button id="exportBookings" class="secondary" type="button">Export CSV</button></div></div>
          <div class="booking-filter-panel panel">
            <div class="booking-filter-main">
              <label class="booking-search">${icons.search}<input id="bookingSearch" type="search" placeholder="Search customer, service, or email"></label>
              <label class="filter-control"><span>Service</span><select id="bookingServiceFilter"><option value="">All services</option></select></label>
              <label class="filter-control"><span>Staff</span><select id="bookingStaffFilter"><option value="">All staff</option></select></label><label class="filter-control"><span>Status</span><select id="bookingStatusFilter"><option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="no_show">No-show</option><option value="cancelled">Cancelled</option></select></label>
              <label class="filter-control filter-date"><span>From</span><input id="bookingFrom" type="date"></label>
              <label class="filter-control filter-date"><span>To</span><input id="bookingTo" type="date"></label>
              <button id="clearBookingFilters" class="secondary filter-reset hidden" type="button">Clear</button>
            </div>
            <div class="booking-filter-footer"><span id="bookingResultCount" class="filter-count"></span><div class="segmented view-switch" role="group" aria-label="Booking view"><button class="active" data-booking-view="list">List</button><button data-booking-view="calendar">Calendar</button></div></div>
          </div>
          <div id="calendarControls" class="calendar-controls hidden"><button id="calendarPrev" class="secondary icon-only" type="button" aria-label="Previous month">‹</button><strong id="calendarMonthLabel"></strong><button id="calendarNext" class="secondary icon-only" type="button" aria-label="Next month">›</button></div>
          <div id="bookingCalendar" class="booking-calendar panel hidden" aria-live="polite"></div>
          <div id="bookingTable" class="booking-table panel"><div class="table-head"><span>Customer & service</span><span>Date & time</span><span>Assignment</span><span>Status</span><span></span></div><div id="bookingsList" aria-live="polite"></div></div>
        </section>

        <section id="staffView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">TEAM SCHEDULING</span><h1>Staff</h1><p>Create bookable team members, set their working hours, and connect them to appointment services.</p></div><button id="newStaffButton" class="primary" type="button">${icons.plus} Add staff</button></div>
          <article class="panel staff-operations-panel"><div class="panel-head staff-operations-head"><div><span class="eyebrow">STAFF OPERATIONS</span><h2>Team schedule</h2><p>Review staff appointments in a compact list or daily calendar.</p></div><div class="staff-operations-controls"><div class="segmented staff-ops-segmented" role="group" aria-label="Schedule view"><button type="button" class="active" data-staff-ops-view="list">List</button><button type="button" data-staff-ops-view="calendar">Calendar</button></div><label class="staff-operations-date"><span>Date</span><input id="staffOperationsDate" type="date"></label></div></div><div id="staffOperationsList" class="staff-operations-list"><div class="empty-compact">Loading team schedule…</div></div></article>
          <div class="toolbar"><label class="search-field">${icons.search}<input id="staffSearch" type="search" placeholder="Search staff by name or email"></label><div class="toolbar-meta"><span id="staffResultCount">0 staff</span></div></div>
          <div id="staffList" class="staff-list"><div class="panel loading">Loading staff…</div></div>
        </section>


        <section id="calendarView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">CALENDAR SYNC</span><h1>Google Calendar</h1><p>Connect one business Google Calendar to keep your store appointments together. Staff can receive assignment updates by email and do not need a Google account.</p></div></div>
          <article class="panel calendar-provider-panel"><div class="calendar-provider-mark">${googleG()}</div><div class="calendar-provider-copy"><div class="panel-head"><div><span class="eyebrow">GOOGLE CALENDAR</span><h2 id="calendarConfigTitle">Checking Google Calendar…</h2></div><span id="calendarConfigBadge" class="status-badge disabled">Checking</span></div><p id="calendarConfigText">Connect your store calendar once and Appointment Lite will keep confirmed appointments in sync.</p></div></article>
          <div class="calendar-section-head"><div><span class="eyebrow">BUSINESS CALENDAR</span><h2>Business appointment calendar</h2><p>Use one Google account for the store. New bookings, changes, and cancellations will sync automatically.</p></div></div>
          <div id="calendarBusinessCard" class="calendar-business-root"><div class="panel loading">Loading calendar…</div></div>
          <article class="panel calendar-staff-email-note"><div><span class="eyebrow">STAFF NOTIFICATIONS</span><h2>Staff do not need to connect Google</h2><p>Add an email address to each staff member and Appointment Lite will send their assigned booking updates automatically.</p></div><button type="button" class="secondary" data-go-view="staff">Manage staff emails</button></article>
        </section>

        <section id="emailView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">CUSTOMER COMMUNICATION</span><h1>Email Studio</h1><p>Give every appointment email a consistent voice and visual identity.</p></div><div class="heading-actions"><button id="sendTestEmail" class="secondary" type="button">Send test</button><button id="saveEmailSettings" class="primary" type="button">Save email design</button></div></div>
          <div class="email-status-bar"><span id="emailStatusDot" class="status-dot"></span><div><strong id="emailStatusTitle">Checking email notifications…</strong><span id="emailStatusText"></span></div><span id="emailFromText" class="sender-chip"></span></div>
          <div class="email-studio-grid">
            <div class="email-controls">
              <article class="panel form-section"><div class="section-title"><span class="section-number">01</span><div><h2>Brand identity</h2><p>Choose how your store appears inside appointment emails.</p></div></div><div class="field-row"><div class="field"><label for="emailBrandName">Brand name</label><input id="emailBrandName" maxlength="80" placeholder="Your store name"></div><div class="field color-field"><label for="emailAccentColor">Accent color</label><div><input id="emailAccentColor" type="color" value="#2F6FED"><input id="emailAccentHex" maxlength="7" value="#2F6FED" aria-label="Accent color hex"></div></div></div><div class="field"><label for="emailLogoUrl">Email logo URL <span>optional</span></label><input id="emailLogoUrl" type="url" maxlength="500" placeholder="https://cdn.example.com/logo.png"><p class="hint">Use a square HTTPS image, ideally 160 × 160 px. If empty, your brand initial is shown.</p></div></article>
              <article class="panel form-section notification-section">
                <div class="section-title"><span class="section-number">02</span><div><h2>Notification recipients</h2><p>Choose where appointment emails are delivered and which updates each audience receives.</p></div></div>
                <div class="field-row">
                  <div class="field"><label for="emailReplyTo">Customer reply-to</label><input id="emailReplyTo" type="email" maxlength="254" placeholder="support@yourstore.com"><p class="field-help">Replies from customers will be sent here.</p></div>
                  <div class="field"><label for="merchantNotificationEmail">Primary merchant inbox</label><input id="merchantNotificationEmail" type="email" maxlength="254" placeholder="appointments@yourstore.com"><p class="field-help">Receives store-wide appointment notifications.</p></div>
                </div>
                <div class="field"><label for="merchantNotificationAdditional">Additional merchant inboxes <span>optional</span></label><textarea id="merchantNotificationAdditional" rows="3" placeholder="owner@qq.com&#10;ops@163.com"></textarea><p class="hint">One address per line, up to 8 addresses in total.</p></div>

                <div class="notification-preferences">
                  <div class="notification-preferences-head"><div><strong>Email notifications</strong><small>Turn each message on or off. Staff assignment emails are managed from Staff.</small></div></div>

                  <section class="notification-group">
                    <div class="notification-group-head"><div><strong>Customer notifications</strong><small>Emails sent to the customer who made the appointment.</small></div></div>
                    <div class="notification-toggle-grid four">
                      <label class="notification-option"><input id="customerNotifyConfirmation" type="checkbox"><span class="notification-option-copy"><strong>Booking confirmation</strong><small>Send after a booking is created.</small></span></label>
                      <label class="notification-option"><input id="customerNotifyChanged" type="checkbox"><span class="notification-option-copy"><strong>Appointment changes</strong><small>Send when appointment details change.</small></span></label>
                      <label class="notification-option"><input id="customerNotifyCancelled" type="checkbox"><span class="notification-option-copy"><strong>Cancellation</strong><small>Send when the appointment is cancelled.</small></span></label>
                      <label class="notification-option"><input id="customerNotifyReminder" type="checkbox"><span class="notification-option-copy"><strong>Pre-appointment reminder</strong><small>Send before the appointment starts.</small></span></label>
                    </div>
                  </section>

                  <section class="notification-group">
                    <div class="notification-group-head"><div><strong>Merchant notifications</strong><small>Store-wide updates sent to the merchant inboxes above.</small></div></div>
                    <div class="notification-toggle-grid four">
                      <label class="notification-option"><input id="merchantNotifyNew" type="checkbox"><span class="notification-option-copy"><strong>New bookings</strong><small>Send after a customer completes a booking.</small></span></label>
                      <label class="notification-option"><input id="merchantNotifyChanged" type="checkbox"><span class="notification-option-copy"><strong>Changes &amp; reschedules</strong><small>Send when appointment details change.</small></span></label>
                      <label class="notification-option"><input id="merchantNotifyCancelled" type="checkbox"><span class="notification-option-copy"><strong>Cancellations</strong><small>Send when an appointment is cancelled.</small></span></label>
                      <label class="notification-option"><input id="merchantNotifyReminder" type="checkbox"><span class="notification-option-copy"><strong>Pre-appointment reminder</strong><small>Send before the appointment starts.</small></span></label>
                    </div>
                  </section>

                  <div class="reminder-timing-row">
                    <div><strong>Reminder timing</strong><small>Used for both customer and merchant pre-appointment reminders.</small></div>
                    <label class="reminder-select-wrap"><span>Send reminder</span><select id="emailReminderLeadHours"><option value="3">3 hours before</option><option value="6">6 hours before</option><option value="12">12 hours before</option><option value="24">24 hours before</option><option value="48">48 hours before</option><option value="72">72 hours before</option></select></label>
                  </div>
                </div>
              </article>
              <article class="panel form-section template-editor"><div class="section-title"><span class="section-number">03</span><div><h2>Message templates</h2><p>Customize the message while core appointment details remain protected and consistent.</p></div></div><div id="templateTabs" class="template-tabs" role="tablist"></div><div class="field"><label for="templateSubject">Email subject</label><input id="templateSubject" maxlength="180"></div><div class="field"><label for="templateHeading">Email heading</label><input id="templateHeading" maxlength="120"></div><div class="field"><label for="templateBody">Intro message</label><textarea id="templateBody" rows="7" maxlength="3000"></textarea></div><div><span class="field-label">Insert a variable</span><div id="variableChips" class="variable-chips"></div></div></article>
            </div>
            <aside class="email-preview-wrap"><div class="preview-sticky"><div class="preview-toolbar"><div><span class="eyebrow">INBOX PREVIEW</span><strong id="previewTemplateLabel">Confirmation</strong></div><span class="desktop-chip">Desktop</span></div><div class="email-preview-canvas"><div id="emailPreview" class="email-preview"></div></div><p class="preview-footnote">Preview content uses sample appointment data. Customer details are never stored in this editor.</p></div></aside>
          </div>
        </section>

        <section id="setupView" class="view hidden">
          <div class="page-heading"><div><span class="eyebrow">QUICK SETUP</span><h1>Launch Appointment Lite</h1><p>Connect the App Block for product-page services, or use a direct booking page, then test the booking flow.</p></div><span class="status-badge success">Store connected</span></div>
          <div class="setup-layout">
            <article class="panel setup-steps">
              <div id="setupBlockStep" class="setup-step"><span>1</span><div><strong>Enable the Appointment Lite App Block</strong><p>Required when a service uses the SHOPLINE product page. Open the product template, add or activate the Appointment Lite App Block, then save the theme. Direct-booking-only services can continue without it.</p><div class="setup-step-actions"><a id="openThemeEditor" class="button-link primary disabled" href="#" target="_blank" rel="noopener noreferrer">Open theme editor ${icons.arrow}</a><button id="confirmAppBlock" class="secondary" type="button">I've enabled the App Block</button></div><p id="themeEditorHint" class="hint">Preparing your theme editor link…</p></div></div>
              <div id="setupServiceStep" class="setup-step"><span>2</span><div><strong>Create your first appointment service</strong><p>Choose the service type and booking source, then configure duration, availability, location, and specialist.</p><button class="text-button" data-new-rule>Create a service ${icons.arrow}</button></div></div>
              <div id="setupTestStep" class="setup-step"><span>3</span><div><strong>Test the storefront booking flow</strong><p>Open the configured product page or direct booking page and submit one test booking. The booking should appear in Bookings.</p><a id="setupPreviewProduct" class="button-link secondary-link disabled" href="#" target="_blank" rel="noopener noreferrer">Open booking experience ${icons.arrow}</a></div></div>
            </article>
            <aside class="panel diagnostics"><div class="diagnostic-icon">${icons.check}</div><h2>Quick setup</h2><p>Any service can use the product-page App Block, a direct booking page, or both. The booking source is configured independently from the service type.</p><span id="setupStoreId" class="setup-meta">Loading store…</span><ul><li>Step 1 connects product-page services to the storefront App Block</li><li>Step 2 creates the first appointment service</li><li>Step 3 verifies the complete customer booking experience</li></ul></aside>
          </div>
        </section>
      </main>
    </div>
  </div>

  <dialog id="ruleDialog" class="modal rule-modal">
    <form id="ruleForm" novalidate>
      <div class="modal-head"><div><span class="eyebrow">SERVICE CONFIGURATION</span><h2 id="ruleDialogTitle">New appointment service</h2><p id="ruleDialogSubtitle">Choose how customers will book this service.</p></div><button type="button" class="icon-button" data-close-dialog aria-label="Close">${icons.close}</button></div>
      <div class="wizard-steps booking-mode-wizard"><button type="button" class="active" data-rule-step-button="0"><span>1</span>Service</button><i></i><button type="button" data-rule-step-button="1"><span>2</span>Booking mode</button><i></i><button type="button" data-rule-step-button="2"><span>3</span>Availability</button><i></i><button type="button" data-rule-step-button="3"><span>4</span>Experience</button></div>
      <div class="modal-body">
        <input type="hidden" id="ruleId"><input type="hidden" id="productSelect"><input type="hidden" id="serviceType" value="appointment"><input type="hidden" id="commerceMode" value="product_pre_purchase"><input type="hidden" id="bookingSource" value="product"><input type="hidden" id="sourceType" value="product"><input type="hidden" id="bookingMode" value="slot">
        <section class="rule-step" data-rule-step="0">
          <div class="step-intro"><h3>Define the appointment service</h3><p>Choose the service type, how it relates to a purchase, and where customers enter the booking flow.</p></div>
          <div class="field"><label for="serviceTitle">Service name</label><input id="serviceTitle" maxlength="255" placeholder="e.g. Home installation service" required><p class="hint">Describe the service customers are booking, independent of the linked product.</p></div>
          <fieldset class="choice-fieldset"><legend>Service type</legend><div id="serviceTypeGrid" class="service-type-grid">
            <button type="button" class="service-type-option selected" data-service-type="appointment"><strong>Appointment</strong><span>General service appointments and product consultations.</span></button>
            <button type="button" class="service-type-option" data-service-type="in_store"><strong>In-store appointment</strong><span>Showroom visits, fittings, measurements, or store services.</span></button>
            <button type="button" class="service-type-option" data-service-type="onsite"><strong>Home / onsite service</strong><span>Installation, repair, measurement, or technician visits.</span></button>
            <button type="button" class="service-type-option" data-service-type="consultation"><strong>Consultation</strong><span>Design, sales, remote, or professional consultations.</span></button>
            <button type="button" class="service-type-option" data-service-type="class"><strong>Class / course</strong><span>Lessons, workshops, group sessions, and classes.</span></button>
            <button type="button" class="service-type-option" data-service-type="other"><strong>Other service</strong><span>Use a flexible service category for other appointment scenarios.</span></button>
          </div></fieldset>
          <fieldset class="choice-fieldset commerce-fieldset"><legend>Booking & purchase relationship</legend><div id="commerceModeGrid" class="commerce-mode-grid">
            <button type="button" class="commerce-mode-option" data-commerce-mode="standalone_free"><span class="commerce-option-head"><strong>Standalone · no payment</strong><em class="commerce-state ready">Ready</em></span><span>Customers book the service directly without checkout.</span><small>Free consultations, free measurements, or appointment-only service pages.</small></button>
            <button type="button" class="commerce-mode-option" data-commerce-mode="standalone_paid" disabled aria-disabled="true"><span class="commerce-option-head"><strong>Standalone · payment required</strong><em class="commerce-state planned">Checkout next</em></span><span>Customers choose a time first, then complete SHOPLINE checkout.</span><small>Paid classes, massage, photography, or professional sessions.</small></button>
            <button type="button" class="commerce-mode-option selected" data-commerce-mode="product_pre_purchase"><span class="commerce-option-head"><strong>Product + appointment</strong><em class="commerce-state ready">Ready</em></span><span>Keep the normal product purchase flow and add appointment booking as another action.</span><small>Design consultations, showroom visits, measurement, or pre-sale services.</small></button>
            <button type="button" class="commerce-mode-option" data-commerce-mode="product_post_purchase" disabled aria-disabled="true"><span class="commerce-option-head"><strong>Purchase first · schedule after</strong><em class="commerce-state planned">Order flow next</em></span><span>Customers buy first, then schedule the included service from an eligible order.</span><small>Installation, delivery setup, onboarding, or post-purchase service.</small></button>
          </div><div id="commerceGuidance" class="commerce-guidance"></div></fieldset>
          <fieldset class="choice-fieldset"><legend>Booking entry</legend><div id="bookingSourceGrid" class="booking-source-grid">
            <button type="button" class="booking-source-option selected" data-booking-source="product"><strong>Product page only</strong><span>Display the Appointment Lite action on the linked SHOPLINE product.</span></button>
            <button type="button" class="booking-source-option" data-booking-source="direct"><strong>Booking page only</strong><span>Use a shareable Appointment Lite booking page.</span></button>
            <button type="button" class="booking-source-option" data-booking-source="both"><strong>Both</strong><span>Use both the linked product page and a shareable booking page.</span></button>
          </div></fieldset>
          <div id="productSourceFields"><div class="field"><label>Linked SHOPLINE product</label><div id="productPicker" class="custom-select"><button id="productPickerButton" type="button" aria-haspopup="dialog"><span id="productPickerLabel">Select a product</span>${icons.chevron}</button></div><p id="productBindingHint" class="hint">Choose the SHOPLINE product connected to this appointment experience.</p></div></div>
        </section>
        <section class="rule-step hidden" data-rule-step="1">
          <div class="step-intro"><h3>How should customers book time?</h3><p>Choose a booking mode. Appointment Lite will only show settings that apply to that mode.</p><small id="bookingModeRecommendation" class="mode-recommendation"></small></div>
          <fieldset class="choice-fieldset booking-mode-fieldset"><legend>Booking mode</legend><div id="bookingModeGrid" class="booking-mode-grid">
            <button type="button" class="booking-mode-option selected" data-booking-mode="slot"><span class="mode-icon">30m</span><strong>Minute / hour</strong><span>Customers choose one start time. Best for consultations, installation, visits, and single classes.</span></button>
            <button type="button" class="booking-mode-option" data-booking-mode="all_day"><span class="mode-icon">1d</span><strong>All day</strong><span>Customers choose a date only. Best for day-long installation, events, passes, or day services.</span></button>
            <button type="button" class="booking-mode-option" data-booking-mode="multi_slot"><span class="mode-icon">×3</span><strong>Multiple sessions</strong><span>Customers choose several time slots in one booking. Best for course packs and repeat services.</span></button>
          </div></fieldset>
          <div id="timedModeFields" class="mode-settings"><div class="field-row thirds"><div class="field"><label for="duration">Duration</label><div class="input-suffix"><input id="duration" type="number" min="5" max="480" step="5" value="60" required><span>min</span></div></div><div class="field"><label for="buffer">Buffer</label><div class="input-suffix"><input id="buffer" type="number" min="0" max="240" step="5" value="0" required><span>min</span></div></div><div class="field"><label for="capacity">Capacity</label><div class="input-suffix"><input id="capacity" type="number" min="1" max="100" step="1" value="1" required><span id="capacitySuffix">spots</span></div></div></div><div class="timing-helper"><strong>How timing works</strong><p>Duration is the appointment length. Buffer is reserved after each appointment before the next start time. Capacity controls how many customers can book the same start time.</p></div></div>
          <div id="allDayModeFields" class="mode-settings hidden"><div class="field-row"><div class="field"><label for="allDayCapacityMirror">Daily capacity</label><div class="input-suffix"><input id="allDayCapacityMirror" type="number" min="1" max="100" step="1" value="1" disabled><span>bookings / day</span></div></div><div class="mode-explainer"><strong>No time selection</strong><span>Customers choose a date only. Duration and buffer do not apply to all-day bookings.</span></div></div></div>
          <div id="multiSlotModeFields" class="mode-settings hidden"><div class="field"><label for="sessionsRequired">Sessions per booking</label><div class="input-suffix compact-suffix"><input id="sessionsRequired" type="number" min="2" max="12" step="1" value="3" disabled><span>sessions</span></div><p class="hint">Customers must select exactly this many available sessions before confirming.</p></div></div>
        </section>
        <section class="rule-step hidden" data-rule-step="2">
          <div class="step-intro"><h3>When can customers book?</h3><p id="availabilityIntro">Set regular hours, booking policies, and date-specific exceptions in the service time zone.</p></div>
          <div id="slotLogicNotice" class="slot-logic-notice"><div class="slot-logic-icon">i</div><div><strong>Start-time calculation</strong><p id="slotLogicText"></p><small id="slotLogicExample"></small></div></div>
          <div class="field"><label for="serviceTimezone">Service time zone</label><input id="serviceTimezone" list="serviceTimezoneOptions" maxlength="80" autocomplete="off" placeholder="Use store default time zone"><datalist id="serviceTimezoneOptions"></datalist><p id="serviceTimezoneHint" class="hint">Leave blank to inherit the SHOPLINE store time zone. Keep one time zone across services that share the same staff.</p></div><div class="field-row"><div class="field"><label for="minimumNoticeMinutes">Minimum notice</label><select id="minimumNoticeMinutes"><option value="0">No minimum</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="720">12 hours</option><option value="1440">1 day</option><option value="2880">2 days</option><option value="10080">7 days</option></select></div><div class="field"><label for="bookingWindowDays">Booking window</label><div class="input-suffix"><input id="bookingWindowDays" type="number" min="1" max="365" value="90" required><span>days ahead</span></div></div></div>
          <div class="field-row"><div class="field"><label for="dateFrom">Available from <span>optional</span></label><input id="dateFrom" type="date"></div><div class="field"><label for="dateUntil">Available until <span>optional</span></label><input id="dateUntil" type="date"></div></div>
          <fieldset><legend id="weeklyScheduleLegend">Weekly schedule</legend><div id="weeklySchedule" class="schedule"></div><p id="weeklyScheduleHint" class="hint">Enable the days customers can normally book.</p></fieldset>
          <fieldset class="exceptions-fieldset"><div class="label-row"><legend>Availability exceptions</legend><button id="addException" class="text-button" type="button">${icons.plus} Add exception</button></div><div id="availabilityExceptions" class="exceptions-list"></div><p id="exceptionHint" class="hint">Close a holiday or override one date with special opening hours.</p></fieldset>
        </section>
        <section class="rule-step hidden" data-rule-step="3"><div class="step-intro"><h3>Shape the customer experience</h3><p>Add the location, specialist, service details, and questions customers should see.</p></div><div class="field"><label for="serviceDescription">Service description <span>optional</span></label><textarea id="serviceDescription" maxlength="500" rows="3" placeholder="What should customers know before booking?"></textarea></div><div class="field"><label for="location">Location</label><input id="location" maxlength="200" placeholder="e.g. Main showroom or customer address"></div><input id="staff" type="hidden"><fieldset class="choice-fieldset staff-assignment-fieldset"><legend>Staff assignment</legend><p class="fieldset-hint">Choose how this service uses the team schedule. Managed staff availability is checked together with the service schedule.</p><div id="staffAssignmentGrid" class="staff-assignment-grid"><button type="button" class="staff-assignment-option selected" data-staff-mode="none"><strong>No staff required</strong><span>Use the service schedule without staff conflict checks.</span></button><button type="button" class="staff-assignment-option" data-staff-mode="any"><strong>Any available staff</strong><span>Appointment Lite automatically assigns one available team member.</span></button><button type="button" class="staff-assignment-option" data-staff-mode="customer_choice"><strong>Customer chooses</strong><span>Customers choose a team member before selecting an available time.</span></button><button type="button" class="staff-assignment-option" data-staff-mode="fixed"><strong>Fixed staff</strong><span>This service always uses one selected team member.</span></button></div><div id="ruleStaffPicker" class="rule-staff-picker hidden"><div class="label-row"><strong>Available staff for this service</strong><span id="ruleStaffPickerHint">Select one or more active staff members.</span></div><div id="ruleStaffOptions" class="staff-check-list"></div></div></fieldset><div class="field"><label for="questionLabel">Notes prompt</label><input id="questionLabel" maxlength="120" value="Anything we should know?"></div><div class="field"><div class="label-row"><label>Custom questions <span>up to 5</span></label><button id="addQuestion" class="text-button" type="button">${icons.plus} Add question</button></div><div id="questions" class="questions"></div></div><label class="toggle-row"><input id="enabled" type="checkbox" checked><span class="toggle"><i></i></span><span><strong>Service is active</strong><small id="serviceActiveHint">Show the booking experience when customers open this service.</small></span></label></section>
        <div id="formError" class="form-error hidden" role="alert"></div>
      </div>
      <div class="modal-actions"><button type="button" class="secondary" data-close-dialog>Cancel</button><span class="action-spacer"></span><button id="ruleBack" type="button" class="secondary hidden">Back</button><button id="ruleNext" type="button" class="primary">Continue ${icons.arrow}</button><button id="saveRule" type="submit" class="primary hidden">Save service rule</button></div>
    </form>
  </dialog>

  <dialog id="productDialog" class="modal picker-modal"><div class="modal-head"><div><span class="eyebrow">PRODUCT CATALOG</span><h2>Select a product</h2><p>Choose the product customers will book.</p></div><button type="button" class="icon-button" data-close-product-dialog aria-label="Close">${icons.close}</button></div><div class="picker-search-wrap"><div class="picker-search-row"><label class="select-search">${icons.search}<input id="productSearch" type="search" placeholder="Search products by name"></label><button id="productSyncButton" type="button" class="secondary product-sync-button">${icons.refresh}<span>Sync SHOPLINE products</span></button></div><p id="productSyncMeta" class="picker-sync-meta">Products refresh automatically when this dialog is opened for the first time.</p></div><div id="productOptions" class="product-dialog-options" role="listbox"></div><div class="modal-actions"><button type="button" class="secondary" data-close-product-dialog>Back to service</button></div></dialog>

  <dialog id="staffDialog" class="modal staff-modal">
    <form id="staffForm">
      <div class="modal-head"><div><span class="eyebrow">TEAM MEMBER</span><h2 id="staffDialogTitle">Add staff</h2><p>Set the team member profile, notifications, and store-local working schedule.</p></div><button type="button" class="icon-button" data-close-staff-dialog aria-label="Close">${icons.close}</button></div>
      <div class="modal-body"><input type="hidden" id="staffId"><input type="hidden" id="staffAvatarKind" value="preset"><input type="hidden" id="staffAvatarValue" value="aurora"><section class="staff-profile-editor"><div id="staffAvatarPreview" class="staff-avatar preview">S</div><div class="staff-avatar-controls"><div class="label-row"><label>Avatar</label><span>Built-in portrait or custom image</span></div><div id="staffAvatarPresets" class="staff-avatar-presets"></div><div class="staff-avatar-actions"><button id="uploadStaffAvatar" type="button" class="secondary small">Upload image</button><button id="useStaffInitials" type="button" class="text-button">Use initials</button><input id="staffAvatarFile" type="file" accept="image/png,image/jpeg,image/webp" hidden></div><p class="hint">Choose a built-in staff portrait, upload a photo, or use initials. Custom images are resized in your browser before saving.</p></div></section><div class="field-row"><div class="field"><label for="staffName">Name</label><input id="staffName" maxlength="120" required placeholder="e.g. Sarah Chen"></div><div class="field"><label for="staffEmail">Email <span>optional</span></label><input id="staffEmail" type="email" maxlength="254" placeholder="sarah@example.com"></div></div><div class="field-row"><div class="field"><label for="staffPhone">Phone <span>optional</span></label><input id="staffPhone" maxlength="40"></div><div class="field"><label for="staffStatus">Status</label><select id="staffStatus"><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div><label class="toggle-row staff-notification-toggle"><input id="staffEmailNotifications" type="checkbox"><span class="toggle"><i></i></span><span><strong>Email appointment updates</strong><small>Send this staff member new assignment, reschedule, reassignment, and cancellation emails.</small></span></label><fieldset><legend>Weekly working hours</legend><div id="staffWeeklySchedule" class="schedule"></div><p class="hint">Staff availability intersects with the service schedule. A time is bookable only when both are open.</p></fieldset><fieldset class="exceptions-fieldset"><div class="label-row"><legend>Schedule exceptions</legend><button id="addStaffException" class="text-button" type="button">${icons.plus} Add exception</button></div><div id="staffAvailabilityExceptions" class="exceptions-list"></div><p class="hint">Use exceptions for holidays, leave, or one-off staff working hours. Staff exceptions do not open a service date that is closed in the service schedule.</p></fieldset><div id="staffFormError" class="form-error hidden" role="alert"></div></div>
      <div class="modal-actions"><button type="button" class="secondary" data-close-staff-dialog>Cancel</button><button id="saveStaff" type="submit" class="primary">Save staff</button></div>
    </form>
  </dialog>

  <dialog id="bookingDialog" class="modal booking-modal"><form id="bookingForm"><div class="modal-head"><div><span class="eyebrow">BOOKING DETAILS</span><h2>Edit appointment</h2><p id="bookingDialogSummary">Update the customer appointment.</p></div><button type="button" class="icon-button" data-close-booking-dialog aria-label="Close">${icons.close}</button></div><div class="modal-body"><input type="hidden" id="bookingId"><div class="inline-notice">${icons.globe}<span id="bookingEditTimezone">Times use the store time zone.</span></div><div class="field-row"><div class="field"><label for="bookingDate">Date</label><input id="bookingDate" type="date" required></div><div class="field"><label for="bookingTime">Time</label><input id="bookingTime" type="time" required></div></div><div class="field-row"><div class="field"><label for="bookingLocation">Location</label><input id="bookingLocation" maxlength="200"></div><div class="field"><label for="bookingStaff">Staff</label><select id="bookingStaff"><option value="">No managed staff</option></select><input id="bookingStaffLegacy" type="hidden"></div></div><p class="hint">Saving validates the selected slot and emails the customer when delivery is configured. Email failure never rolls back the booking.</p><div id="bookingFormError" class="form-error hidden" role="alert"></div></div><div class="modal-actions"><button type="button" class="secondary" data-close-booking-dialog>Cancel</button><button id="saveBooking" type="submit" class="primary">Save and notify</button></div></form></dialog>

  <dialog id="calendarDayDialog" class="modal compact-modal calendar-day-modal"><div class="modal-head"><div><span class="eyebrow">BOOKINGS</span><h2 id="calendarDayTitle">Appointments</h2><p id="calendarDaySubtitle"></p></div><button type="button" class="icon-button" data-close-calendar-day aria-label="Close">${icons.close}</button></div><div class="modal-body"><div id="calendarDayList" class="calendar-day-list"></div></div><div class="modal-actions"><button type="button" class="primary" data-close-calendar-day>Done</button></div></dialog>

    <dialog id="bookingFlowDialog" class="modal flow-modal"><div class="modal-head"><div><span class="eyebrow">BOOKING ACTIVITY</span><h2>Appointment history</h2><p id="bookingFlowSummary"></p></div><button type="button" class="icon-button" data-close-flow-dialog aria-label="Close">${icons.close}</button></div><div class="modal-body"><div id="bookingFlow" class="booking-flow"></div></div><div class="modal-actions"><button type="button" class="primary" data-close-flow-dialog>Done</button></div></dialog>


  <dialog id="calendarDialog" class="modal compact-modal calendar-modal">
    <form id="calendarForm">
      <div class="modal-head"><div><span class="eyebrow">GOOGLE CALENDAR</span><h2 id="calendarDialogTitle">Choose business calendar</h2><p id="calendarDialogSubtitle">Choose the Google Calendar your store will use for appointments.</p></div><button type="button" class="icon-button" data-close-calendar-dialog aria-label="Close">${icons.close}</button></div>
      <div class="modal-body"><input id="calendarStaffId" type="hidden"><div id="calendarAccountNotice" class="inline-notice">Loading Google calendars…</div><div class="field"><label for="calendarSelect">Calendar</label><select id="calendarSelect"><option value="">Loading calendars…</option></select><p class="hint">New bookings and appointment changes sync automatically after you save.</p></div><div id="calendarFormError" class="form-error hidden" role="alert"></div></div>
      <div class="modal-actions"><button type="button" class="secondary" data-close-calendar-dialog>Cancel</button><button id="saveCalendarSelection" type="submit" class="primary">Save calendar</button></div>
    </form>
  </dialog>

  <dialog id="testEmailDialog" class="modal compact-modal">
    <form id="testEmailForm">
      <div class="modal-head"><div><span class="eyebrow">EMAIL TEST</span><h2>Send a test email</h2><p>Choose the inbox that should receive this preview.</p></div><button type="button" class="icon-button" data-close-test-email aria-label="Close">${icons.close}</button></div>
      <div class="modal-body"><div class="field"><label for="testEmailRecipient">Test recipient</label><input id="testEmailRecipient" type="email" maxlength="254" autocomplete="email" placeholder="you@example.com" required><p class="hint">This address is used only for this test. It does not change your saved notification recipients.</p></div><div id="testEmailError" class="form-error hidden" role="alert"></div></div>
      <div class="modal-actions"><button type="button" class="secondary" data-close-test-email>Cancel</button><button id="confirmSendTestEmail" type="submit" class="primary">Send test email</button></div>
    </form>
  </dialog>

  <dialog id="quickstartDialog" class="modal quickstart-modal">
    <div class="modal-head"><div><span class="eyebrow">QUICK START</span><h2>Set up Appointment Lite</h2><p>Get your first booking flow ready in three steps.</p></div><button type="button" class="icon-button" data-dismiss-quickstart aria-label="Close">${icons.close}</button></div>
    <div class="modal-body quickstart-body">
      <div class="quickstart-progress"><div><strong id="quickstartProgressLabel">0 of 3 complete</strong><span>The App Block is required for product-page services. Direct-booking-only services can continue directly to Step 2.</span></div><div class="progress-track"><span id="quickstartProgress"></span></div></div>
      <div class="quickstart-steps">
        <article id="quickstartBlockStep" class="quickstart-step"><span class="quickstart-number" data-step="1">1</span><div><strong>Enable the Appointment Lite App Block</strong><p>For services using the product page, open the product template, activate the Appointment Lite App Block, and save the theme. Direct-booking-only services can skip this step.</p><div class="setup-step-actions"><a id="quickstartThemeEditor" class="button-link primary disabled" href="#" target="_blank" rel="noopener noreferrer">Open theme editor ${icons.arrow}</a><button id="quickstartConfirmBlock" class="secondary" type="button">I've enabled the App Block</button></div></div></article>
        <article id="quickstartServiceStep" class="quickstart-step"><span class="quickstart-number" data-step="2">2</span><div><strong>Create your first appointment service</strong><p>Choose a service type, booking source, and schedule.</p><button id="quickstartCreateService" class="secondary" type="button">Create a service ${icons.arrow}</button></div></article>
        <article id="quickstartTestStep" class="quickstart-step"><span class="quickstart-number" data-step="3">3</span><div><strong>Test a booking on your storefront</strong><p>Open the configured booking experience and complete one test appointment.</p><a id="quickstartPreviewProduct" class="button-link secondary-link disabled" href="#" target="_blank" rel="noopener noreferrer">Open booking experience ${icons.arrow}</a></div></article>
      </div>
    </div>
    <div class="modal-actions"><button id="dismissQuickstart" type="button" class="secondary">I'll finish later</button><button id="quickstartDone" type="button" class="primary hidden">Done</button></div>
  </dialog>

  <dialog id="confirmDialog" class="confirm-modal"><div class="confirm-icon">!</div><div class="confirm-copy"><h2 id="confirmTitle">Please confirm</h2><p id="confirmMessage"></p></div><div class="modal-actions"><button id="confirmNo" class="secondary">Keep it</button><button id="confirmYes" class="danger">Confirm</button></div></dialog>
  <script type="module" src="/admin/app.js?v=0.6.1"></script>
</body>
</html>`;
}
