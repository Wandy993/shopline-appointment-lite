export function bookingPage(ruleId) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <title>Book an appointment</title>
  <link rel="stylesheet" href="/book/assets/styles.css?v=0.5.0">
</head>
<body data-rule-id="${String(ruleId).replace(/[^a-f\d]/gi, '')}">
  <main class="booking-shell">
    <header class="booking-brand"><span id="brandMark" class="brand-mark">A</span><div><strong id="brandName">Appointment Lite</strong><span>Online booking</span></div></header>
    <section id="loading" class="booking-card loading-card"><div class="spinner"></div><p>Loading appointment service…</p></section>
    <section id="errorView" class="booking-card hidden"><div class="empty-state"><span>!</span><h1>Service unavailable</h1><p id="errorMessage">This booking link is no longer available.</p></div></section>
    <section id="bookingView" class="booking-card hidden">
      <div class="service-head"><span id="serviceType" class="service-badge">Appointment</span><h1 id="serviceTitle"></h1><p id="serviceDescription" class="service-description"></p><div id="serviceMeta" class="service-meta"></div></div>
      <form id="bookingForm">
        <div class="form-section"><div class="section-heading"><span>01</span><div><strong id="scheduleHeading">Choose a time</strong><small id="timezoneText">Times use the store time zone.</small></div></div><label id="staffField" class="field staff-choice hidden"><span>Staff</span><select id="staffSelect" name="staffId"><option value="">Choose staff</option></select><small>Choose who you would like to book with. Availability updates automatically.</small></label><div class="field-grid schedule-grid"><label class="field"><span>Date</span><input id="bookingDate" name="date" type="date" required></label><div id="timeField" class="field"><span id="timeLabel">Time</span><div id="timeSlots" class="time-slots"><span class="muted">Choose a date first.</span></div></div></div><div id="selectedSessions" class="selected-sessions hidden"></div></div>
        <div class="form-section"><div class="section-heading"><span>02</span><div><strong>Your details</strong><small>We use these details only for this appointment.</small></div></div><div class="field-grid"><label class="field"><span>Name</span><input name="name" autocomplete="name" maxlength="120" required></label><label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" maxlength="254" required></label></div><label class="field"><span>Phone <i>optional</i></span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label><label class="field"><span id="noteLabel">Anything we should know?</span><textarea name="note" maxlength="2000"></textarea></label><div id="customQuestions"></div></div>
        <div id="formError" class="form-error hidden" role="alert"></div>
        <button id="submitBooking" class="primary" type="submit">Confirm booking</button>
      </form>
    </section>
    <section id="successView" class="booking-card hidden"><div class="success-state"><span class="success-mark">✓</span><span class="eyebrow">BOOKING CONFIRMED</span><h1 id="successTitle">You're booked.</h1><p id="successWhen"></p><p id="successDetails" class="muted"></p><a id="manageBooking" class="primary link-button" href="#">Manage appointment</a></div></section>
    <footer>Powered by Appointment Lite</footer>
  </main>
  <script type="module" src="/book/assets/app.js?v=0.5.0"></script>
</body>
</html>`;
}
