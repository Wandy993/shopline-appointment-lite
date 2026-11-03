export function managePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#F5F6F3">
  <title>Manage appointment</title>
  <link rel="stylesheet" href="/manage/assets/styles.css?v=0.8.29">
</head>
<body>
  <main class="shell">
    <header><span class="mark">A</span><strong>Appointment Lite</strong></header>
    <section class="card" aria-live="polite">
      <div id="loading" class="center"><div class="spinner"></div><p>Loading your appointment…</p></div>
      <div id="errorView" class="hidden center"><h1>Unable to open appointment</h1><p id="errorMessage"></p></div>
      <div id="bookingView" class="hidden">
        <div class="heading"><div><span class="eyebrow">Appointment booked</span><h1 id="productTitle"></h1></div><span id="statusBadge" class="badge"></span></div>
        <div class="summary">
          <span class="summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M7.5 3v4M16.5 3v4M3.5 10h17"/><path d="M8 14h3M8 17h3"/></svg></span>
          <div class="summary-copy"><strong id="bookingWhen"></strong><span id="bookingDetails"></span></div>
          <span class="summary-art" aria-hidden="true"><svg viewBox="0 0 150 82" fill="none"><circle cx="112" cy="42" r="36" fill="#E8F1E8"/><path d="M87 69c8-18 21-30 43-38" stroke="#91B39A" stroke-width="2.2" stroke-linecap="round"/><path d="M102 50c-1-10 4-18 14-22 2 10-3 18-14 22Z" fill="#B6CFB9"/><path d="M117 41c2-10 9-15 20-15-1 10-8 16-20 15Z" fill="#C5D9C7"/><path d="M89 65c-2-10-9-16-19-17 1 10 8 16 19 17Z" fill="#C5D9C7"/><path d="M75 69h66" stroke="#D2E1D3" stroke-width="2" stroke-linecap="round"/></svg></span>
        </div>
        <div id="meetingCard" class="meeting-card hidden"><div class="meeting-copy"><span class="meeting-kicker">Online meeting</span><strong id="meetingProvider">Online meeting</strong></div><a id="meetingButton" class="meeting-button" href="#" target="_blank" rel="noopener noreferrer"><span id="meetingBrandIcon" class="meeting-brand-icon" aria-hidden="true"></span><span id="meetingLabel">Join meeting</span></a></div>
        <div id="limitNotice" class="notice"></div>
        <div id="mainActions" class="actions"><button id="changeButton" class="primary">Change date or time</button><button id="cancelButton" class="danger-outline">Cancel appointment</button></div>
        <form id="changeForm" class="hidden">
          <button id="backButton" class="back" type="button">← Back</button>
          <h2>Change date or time</h2>
          <p class="notice warning">This is your only online change. After saving, contact the store if you need another change.</p>
          <label for="newDate">New date</label><input id="newDate" type="date" required>
          <fieldset><legend>New time</legend><div id="timeSlots" class="slots"><span class="muted">Choose a date first.</span></div></fieldset>
          <div id="formError" class="error hidden"></div>
          <button id="saveButton" class="primary" type="submit">Save changes</button>
        </form>
        <div id="cancelConfirm" class="hidden confirm"><h2>Cancel this appointment?</h2><p>The reserved time will become available to other customers.</p><div class="actions"><button id="keepButton" class="secondary">Keep appointment</button><button id="confirmCancelButton" class="danger">Yes, cancel</button></div></div>
      </div>
    </section>
    <footer>This private page grants access to your appointment. Do not share its link.</footer>
  </main>
  <script type="module" src="/manage/assets/app.js?v=0.8.29"></script>
</body>
</html>`;
}
