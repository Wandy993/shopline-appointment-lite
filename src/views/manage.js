export function managePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Manage appointment</title>
  <link rel="stylesheet" href="/manage/assets/styles.css?v=0.8.1.4.1">
</head>
<body>
  <main class="shell">
    <header><span class="mark">A</span><strong>Appointment Lite</strong></header>
    <section class="card" aria-live="polite">
      <div id="loading" class="center"><div class="spinner"></div><p>Loading your appointment…</p></div>
      <div id="errorView" class="hidden center"><h1>Unable to open appointment</h1><p id="errorMessage"></p></div>
      <div id="bookingView" class="hidden">
        <div class="heading"><div><span class="eyebrow">Appointment booked</span><h1 id="productTitle"></h1></div><span id="statusBadge" class="badge"></span></div>
        <div class="summary"><strong id="bookingWhen"></strong><span id="bookingDetails"></span></div>
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
  <script type="module" src="/manage/assets/app.js?v=0.8.1.4.1"></script>
</body>
</html>`;
}
