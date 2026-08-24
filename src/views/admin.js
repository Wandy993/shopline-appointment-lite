export function adminPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Appointment Lite</title>
  <link rel="stylesheet" href="/admin/styles.css">
</head>
<body>
  <div class="app-shell">
    <header class="topbar"><div><span class="brand-mark">A</span><strong>Appointment Lite</strong></div><span id="shopBadge" class="badge">Loading…</span></header>
    <div class="layout">
      <nav class="sidebar" aria-label="Main navigation">
        <button class="nav-item active" data-view="dashboard">Overview</button>
        <button class="nav-item" data-view="rules">Appointment rules</button>
        <button class="nav-item" data-view="bookings">Bookings</button>
        <button class="nav-item" data-view="setup">Storefront setup</button>
      </nav>
      <main class="content">
        <div id="toastRegion" class="toast-region" aria-live="polite"></div>
        <section id="dashboardView" class="view">
          <div class="page-heading"><div><h1>Overview</h1><p>Appointments at a glance.</p></div><button class="primary" data-new-rule>New appointment rule</button></div>
          <div class="stats">
            <article><span>Active rules</span><strong id="activeRuleCount">—</strong></article>
            <article><span>All bookings</span><strong id="bookingCount">—</strong></article>
            <article><span>Upcoming</span><strong id="upcomingCount">—</strong></article>
            <article><span>Rule access</span><strong id="planName">—</strong></article>
          </div>
          <article class="card"><h2>Get ready to take appointments</h2><ol class="setup-list"><li>Create a rule and select a SHOPLINE product.</li><li>Deploy the backend and confirm the health check.</li><li>Push the Theme App Extension and add its zero-configuration block to the product template.</li></ol></article>
        </section>
        <section id="rulesView" class="view hidden">
          <div class="page-heading"><div><h1>Appointment rules</h1><p>Turn selected products into bookable services.</p></div><button class="primary" data-new-rule>New rule</button></div>
          <div id="rulesList" class="card list-card"><div class="loading">Loading rules…</div></div>
        </section>
        <section id="bookingsView" class="view hidden">
          <div class="page-heading"><div><h1>Bookings</h1><p>Review, edit, and cancel customer appointments.</p></div><select id="bookingFilter" aria-label="Filter bookings"><option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select></div>
          <div id="bookingsList" class="card list-card"><div class="loading">Loading bookings…</div></div>
        </section>
        <section id="setupView" class="view hidden">
          <div class="page-heading"><div><h1>Storefront setup</h1><p>Complete this after creating the extension through SHOPLINE CLI.</p></div></div>
          <article class="card prose"><h2>Zero-configuration App Block</h2><p>The App Block has no merchant settings. Adding it to a product template turns the integration on; removing it turns the integration off.</p><p>The extension reads SHOPLINE's store ID and product ID automatically. It only becomes visible when that exact product has an enabled appointment rule.</p><p>For diagnostics, open the storefront preview console and filter for <code>[Appointment Lite]</code>. The source files are in <code>theme-extension-source/</code>.</p></article>
          <article class="card email-card"><div><h2>Email delivery</h2><p id="emailStatusText" class="hint">Loading provider status…</p><p id="emailFromText" class="hint"></p></div><button id="sendTestEmail" class="secondary" type="button">Send test email</button></article>
        </section>
      </main>
    </div>
  </div>

  <dialog id="ruleDialog" class="modal">
    <form id="ruleForm" method="dialog">
      <div class="modal-head"><div><h2 id="ruleDialogTitle">New appointment rule</h2><p>Choose a product and define bookable hours.</p></div><button type="button" class="icon-button" data-close-dialog aria-label="Close">×</button></div>
      <div class="modal-body">
        <input type="hidden" id="ruleId">
        <div class="field"><label for="productSelect">Product</label><select id="productSelect" required><option value="">Loading products…</option></select><p class="hint">One rule per product.</p></div>
        <div class="field-row"><div class="field"><label for="duration">Duration (minutes)</label><input id="duration" type="number" min="5" max="480" step="5" value="60" required></div><div class="field"><label for="buffer">Buffer after booking</label><input id="buffer" type="number" min="0" max="240" step="5" value="0" required></div></div>
        <div class="field-row"><div class="field"><label for="dateFrom">Available from</label><input id="dateFrom" type="date"></div><div class="field"><label for="dateUntil">Available until</label><input id="dateUntil" type="date"></div></div>
        <fieldset><legend>Weekly availability</legend><div id="weeklySchedule" class="schedule"></div><p class="hint">MVP supports one daily window. The data model supports multiple windows.</p></fieldset>
        <div class="field-row"><div class="field"><label for="location">Location</label><input id="location" maxlength="200" placeholder="e.g. Central showroom"></div><div class="field"><label for="staff">Staff</label><input id="staff" maxlength="200" placeholder="e.g. Sarah"></div></div>
        <div class="field"><label for="questionLabel">Notes prompt</label><input id="questionLabel" maxlength="120" value="Anything we should know?"></div>
        <div class="field"><label>Custom questions (up to 5)</label><div id="questions"></div><button id="addQuestion" class="secondary small" type="button">Add question</button></div>
        <label class="switch-row"><input id="enabled" type="checkbox" checked><span>Rule enabled</span></label>
        <div id="formError" class="form-error hidden" role="alert"></div>
      </div>
      <div class="modal-actions"><button type="button" class="secondary" data-close-dialog>Cancel</button><button id="saveRule" type="submit" class="primary">Save rule</button></div>
    </form>
  </dialog>

  <dialog id="bookingDialog" class="modal">
    <form id="bookingForm">
      <div class="modal-head"><div><h2>Edit booking</h2><p id="bookingDialogSummary">Update the customer appointment.</p></div><button type="button" class="icon-button" data-close-booking-dialog aria-label="Close">×</button></div>
      <div class="modal-body">
        <input type="hidden" id="bookingId">
        <div class="field-row"><div class="field"><label for="bookingDate">Date</label><input id="bookingDate" type="date" required></div><div class="field"><label for="bookingTime">Time</label><input id="bookingTime" type="time" required></div></div>
        <div class="field-row"><div class="field"><label for="bookingLocation">Location</label><input id="bookingLocation" maxlength="200"></div><div class="field"><label for="bookingStaff">Staff</label><input id="bookingStaff" maxlength="200"></div></div>
        <p class="hint">The date and time must match the product's appointment rule. Saving sends the customer an update when Aliyun DirectMail or Resend is configured; email failure never rolls back the booking.</p>
        <div id="bookingFormError" class="form-error hidden" role="alert"></div>
      </div>
      <div class="modal-actions"><button type="button" class="secondary" data-close-booking-dialog>Cancel</button><button id="saveBooking" type="submit" class="primary">Save booking</button></div>
    </form>
  </dialog>

  <dialog id="confirmDialog" class="confirm-modal"><div class="modal-head"><div><h2 id="confirmTitle">Please confirm</h2><p id="confirmMessage"></p></div></div><div class="modal-actions"><button id="confirmNo" class="secondary">Keep it</button><button id="confirmYes" class="danger">Confirm</button></div></dialog>
  <script type="module" src="/admin/app.js"></script>
</body>
</html>`;
}
