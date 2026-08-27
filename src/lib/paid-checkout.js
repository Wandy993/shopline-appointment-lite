function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function appointmentLabel(booking) {
  const mode = booking.bookingMode || 'slot';
  if (mode === 'all_day') return `${booking.date} · All day · ${booking.timezone || 'UTC'}`;
  if (mode === 'multi_slot') {
    const occurrences = Array.isArray(booking.occurrences) ? booking.occurrences : [];
    return occurrences.map(item => `${item.date} ${item.time}`).join(' · ');
  }
  return `${booking.date} ${booking.time} · ${booking.timezone || 'UTC'}`;
}

export function paidBookingProperties(booking) {
  return [
    { name: '_appointment_lite_booking', value: String(booking._id), type: 'text', show: false, extInfo: '', roleVisibility: 'none' },
    { name: 'Appointment', value: appointmentLabel(booking), type: 'text', show: true, extInfo: '', roleVisibility: 'all' },
    ...(booking.staff ? [{ name: 'Staff', value: booking.staff, type: 'text', show: true, extInfo: '', roleVisibility: 'all' }] : [])
  ];
}

export function buildPaidBookingCheckoutUrl({ handle, variantId, booking }) {
  const safeHandle = String(handle || '').trim().toLowerCase();
  const safeVariantId = String(variantId || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/i.test(safeHandle)) throw new Error('A valid SHOPLINE store handle is required for paid checkout.');
  if (!/^\d{6,64}$/.test(safeVariantId)) throw new Error('A valid SHOPLINE variant is required for paid checkout.');
  const url = new URL(`https://${safeHandle}.myshopline.com/cart/${safeVariantId}:1`);
  url.searchParams.set('properties[0]', base64UrlJson(paidBookingProperties(booking)));
  if (booking.customer?.email) url.searchParams.set('checkout[email]', booking.customer.email);
  if (booking.customer?.phone) url.searchParams.set('checkout[phone]', booking.customer.phone);
  return url.toString();
}

export function appointmentLiteBookingIdFromOrder(order = {}) {
  for (const lineItem of order.line_items || order.lineItems || []) {
    for (const property of lineItem.properties || []) {
      if (String(property?.name || '') === '_appointment_lite_booking') {
        const value = String(property?.value || '').trim();
        if (/^[a-f\d]{24}$/i.test(value)) return value;
      }
    }
  }
  return '';
}
