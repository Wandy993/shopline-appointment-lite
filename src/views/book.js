export function bookingPage(ruleId) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <title>Book an appointment</title>
  <link rel="stylesheet" href="/book/assets/styles.css?v=0.6.0">
</head>
<body data-rule-id="${String(ruleId).replace(/[^a-f\d]/gi, '')}">
  <main class="booking-shell">
    <header class="booking-brand"><span id="brandMark" class="brand-mark">A</span><div><strong id="brandName">Appointment Lite</strong><span>Online booking</span></div></header>
    <section id="loading" class="booking-card loading-card"><div class="spinner"></div><p>Loading appointment service…</p></section>
    <section id="errorView" class="booking-card hidden"><div class="empty-state"><span>!</span><h1>Service unavailable</h1><p id="errorMessage">This booking link is no longer available.</p></div></section>
    <section id="bookingView" class="booking-card booking-experience hidden">
      <div class="service-head">
        <div><span id="serviceType" class="service-badge">Appointment</span><h1 id="serviceTitle"></h1><p id="serviceDescription" class="service-description"></p></div>
        <div id="serviceMeta" class="service-meta"></div>
      </div>
      <form id="bookingForm">
        <div class="booking-layout">
          <aside class="calendar-pane">
            <div class="calendar-card">
              <div class="calendar-toolbar">
                <button id="calendarPrev" class="calendar-nav" type="button" aria-label="Previous month">‹</button>
                <strong id="calendarTitle">Calendar</strong>
                <button id="calendarNext" class="calendar-nav" type="button" aria-label="Next month">›</button>
              </div>
              <div class="calendar-weekdays" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
              <div id="calendarGrid" class="calendar-grid" role="grid" aria-label="Choose a booking date"></div>
              <input id="bookingDate" name="date" type="hidden" required>
            </div>
            <div class="timezone-note"><span aria-hidden="true">◷</span><div class="timezone-copy"><p id="timezoneText">All times use the service time zone.</p><div id="timezonePicker" class="timezone-picker"><button id="timezonePickerButton" class="timezone-picker-button" type="button" aria-haspopup="listbox" aria-expanded="false"><span id="timezonePickerValue">Detecting your time zone…</span><span>⌄</span></button><div id="timezonePickerMenu" class="timezone-picker-menu hidden"><input id="timezoneSearch" type="search" placeholder="Search time zones" autocomplete="off"><div id="timezoneOptions" class="timezone-options" role="listbox"></div></div></div></div></div>
            <div id="selectedSessions" class="selected-sessions hidden"></div>
          </aside>
          <section class="booking-panel">
            <div class="selection-block">
              <div id="staffField" class="field staff-choice hidden"><span>Staff</span><div id="staffPicker" class="staff-picker"><button id="staffPickerButton" class="staff-picker-button" type="button" aria-haspopup="listbox" aria-expanded="false"><span id="staffPickerValue" class="staff-picker-value"><span class="staff-avatar customer small">?</span><span><strong>Choose staff</strong><small>Select a team member</small></span></span><span class="staff-picker-chevron">⌄</span></button><div id="staffPickerMenu" class="staff-picker-menu hidden" role="listbox"></div><input id="staffSelect" name="staffId" type="hidden"></div><small>Availability updates for the selected staff member.</small></div>
              <div id="timeField" class="time-field"><div class="field-label-row"><span id="timeLabel">Available time slots</span><small id="selectedDateLabel">Choose a date</small></div><div id="timeSlots" class="time-slots"><span class="muted">Choose a date first.</span></div></div>
            </div>
            <div class="details-divider"><span>Your details</span></div>
            <div class="field-grid"><label class="field"><span>Name *</span><input name="name" autocomplete="name" maxlength="120" placeholder="Enter your name" required></label><label class="field"><span>Email *</span><input name="email" type="email" autocomplete="email" maxlength="254" placeholder="Enter your email" required></label></div>
            <label class="field"><span>Phone <i>optional</i></span><input name="phone" type="tel" autocomplete="tel" maxlength="40" placeholder="Enter your phone number"></label>
            <label class="field"><span id="noteLabel">Anything we should know?</span><textarea name="note" maxlength="2000" placeholder="Add a note for the team"></textarea></label>
            <div id="customQuestions"></div>
          </section>
        </div>
        <div class="booking-actions"><div id="formError" class="form-error hidden" role="alert"></div><button id="submitBooking" class="primary" type="submit">Confirm booking</button><p>You can reschedule or cancel your appointment later.</p></div>
      </form>
    </section>
    <section id="successView" class="booking-card hidden"><div class="success-state"><span class="success-mark">✓</span><span class="eyebrow">BOOKING CONFIRMED</span><h1 id="successTitle">You're booked.</h1><p id="successWhen"></p><p id="successDetails" class="muted"></p><a id="manageBooking" class="primary link-button" href="#">Manage appointment</a></div></section>
    <footer>Powered by Appointment Lite</footer>
  </main>
  <script type="module" src="/book/assets/app.js?v=0.6.0"></script>
</body>
</html>`;
}
