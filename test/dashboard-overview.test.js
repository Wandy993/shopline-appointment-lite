import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('overview presents operational metrics instead of duplicating setup and lifetime totals', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const dashboard = view.slice(view.indexOf('<section id="dashboardView"'), view.indexOf('<section id="rulesView"'));
  assert.match(dashboard, /data-dashboard-range="today"/);
  assert.match(dashboard, /data-dashboard-range="next7"/);
  assert.match(dashboard, /data-dashboard-range="unassigned"/);
  assert.match(dashboard, /data-dashboard-range="payment_conflict"/);
  assert.match(dashboard, /id="dashboardAttentionList"/);
  assert.doesNotMatch(dashboard, /dashboardSystemStatus/);
  assert.ok(dashboard.indexOf('id="upcomingList"') < dashboard.indexOf('class="dashboard-kpis"'));
  assert.ok(dashboard.indexOf('class="dashboard-kpis"') < dashboard.indexOf('id="dashboardAttentionList"'));
  assert.match(dashboard, /data-go-view="bookings"/);
  assert.match(view, /<option value="__unassigned__">Unassigned<\/option>/);
  assert.doesNotMatch(dashboard, /id="bookingCount"/);
  assert.doesNotMatch(dashboard, /id="setupChecklist"/);
  assert.doesNotMatch(dashboard, /id="setupPercent"/);
});

test('dashboard metrics use store-local dates and distinguish staff, payment, and calendar issues', async () => {
  const route = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  assert.match(route, /function addDashboardDays/);
  assert.match(route, /function dashboardOccurrencesInRange/);
  assert.match(route, /todayAppointmentCount/);
  assert.match(route, /next7AppointmentCount/);
  assert.match(route, /unassignedUpcomingCount/);
  assert.match(route, /pendingPaymentCount/);
  assert.match(route, /paymentConflictCount/);
  assert.match(route, /calendarIssueCount/);
  assert.match(route, /staffManagedRuleIds: \[\.\.\.managedStaffRuleIds\]/);
});

test('dashboard cards and attention items navigate to filtered operational destinations', async () => {
  const app = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.match(app, /function dashboardGoToBookings/);
  assert.match(app, /function dashboardHandleAction/);
  assert.match(app, /\$\$\('\[data-go-view\]'\)\.forEach/);
  assert.match(app, /\$\$\('\[data-new-rule\]'\)\.forEach/);
  assert.match(app, /data-dashboard-range/);
  assert.match(app, /data-dashboard-action/);
  assert.match(app, /data-dashboard-booking/);
  assert.match(app, /dashboard-attention-item severity-\$\{item\.severity\}/);
  assert.doesNotMatch(app, /dashboard-attention-item \$\{item\.severity\}/);
  assert.doesNotMatch(app, /dashboardSystemStatus/);
  assert.match(app, /state\.pendingDashboardBookingId/);
  assert.match(app, /staffId === '__unassigned__'/);
  assert.match(app, /state\.bootstrap\?\.staffManagedRuleIds/);
});

test('dashboard layout remains responsive and supports clickable card feedback', async () => {
  const styles = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.dashboard-kpis/);
  assert.match(styles, /\.dashboard-kpi:hover/);
  assert.match(styles, /\.dashboard-attention-item/);
  assert.match(styles, /\.dashboard-next-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.dashboard-attention-item\.severity-danger/);
  assert.doesNotMatch(styles, /\.dashboard-attention-item\.danger/);
  assert.doesNotMatch(styles, /\.dashboard-system-row/);
  assert.match(styles, /@media\(max-width:480px\)/);
});
