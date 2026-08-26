# Google Calendar

Appointment Lite v0.6.0.3 uses a merchant-first calendar model.

- The merchant optionally connects **one Business Google Calendar** for the store.
- Confirmed bookings, reschedules and cancellations sync to that business calendar.
- Staff do **not** connect personal Google accounts in the merchant admin. Add staff email addresses to send assignment updates instead.
- Customers receive a clean **Add to Google Calendar** action. Appointment Lite does not add customers as Google event guests, avoiding first-time unknown-sender invitation warnings.
- The internal ICS endpoint remains available for backward compatibility but is not exposed in the customer UI.

Google OAuth credentials and refresh-token encryption remain server-side configuration.
