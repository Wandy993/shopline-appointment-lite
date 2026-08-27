# Email delivery and notification architecture

Appointment Lite v0.6.0.5 keeps email independent from Google Calendar. A merchant or staff notification recipient can use Gmail, QQ, 163, Outlook, or a normal enterprise mailbox; the recipient does not need a Google account or SHOPLINE Admin access.

## Notification routing

- **Customer** — can receive Appointment Lite confirmation/change/cancellation/reminder email according to the merchant’s Email Studio switches. Confirmed appointments and reminders include one **Add to Google Calendar** action.
- **Merchant** — `Primary merchant inbox` plus optional additional inboxes receive store-wide new-booking/change/cancellation/reminder notifications according to Email Studio switches. If no primary inbox is configured, Appointment Lite can fall back to the SHOPLINE store email / deployment fallback address.
- **Staff** — `Staff.email` plus **Email appointment updates** sends assignment, update, reassignment, and cancellation messages only for that employee. Google authorization is not required.

Google guest invitations are not sent by the Business Calendar sync. Customers add the appointment from the Appointment Lite confirmation link instead, avoiding first-contact unknown-sender warnings.

## Recommended production path: Aliyun DirectMail

Use a dedicated RAM user such as `digital-delivery-directmail`. Do not use the Alibaba Cloud root account or copy credentials into source control.

1. In DirectMail, verify the sender domain and create a sender address.
2. Create a custom RAM policy with only the send permission:

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dm:SingleSendMail"],
      "Resource": ["acs:dm:*:*:*"]
    }
  ]
}
```

3. Attach the policy to the dedicated RAM user.
4. Create an AccessKey for that RAM user and store it only in Railway variables.
5. Configure:

```dotenv
EMAIL_PROVIDER=aliyun
ALIBABA_CLOUD_ACCESS_KEY_ID=your_ram_user_access_key_id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_ram_user_access_key_secret
ALIYUN_DIRECTMAIL_ACCOUNT_NAME=bookings@your-verified-domain.com
ALIYUN_DIRECTMAIL_FROM_ALIAS=Appointment Lite
ALIYUN_DIRECTMAIL_REPLY_TO=true
ALIYUN_DIRECTMAIL_ENDPOINT=dm.aliyuncs.com
ALIYUN_DIRECTMAIL_REGION_ID=cn-hangzhou
ALIYUN_DIRECTMAIL_TAG_NAME=
MERCHANT_NOTIFICATION_EMAIL=optional-merchant@example.com
```

`ALIBABA_CLOUD_SECURITY_TOKEN` is supported for temporary STS credentials. A Railway container cannot automatically inherit an ECS service-linked role, so an ECS RAM role name by itself is not enough. For the current deployment, use the dedicated least-privilege RAM user AccessKey. If temporary credentials are introduced later, add an external STS refresh path and rotate the token before expiry.

Leave `ALIYUN_DIRECTMAIL_TAG_NAME` empty unless the same tag already exists in DirectMail.

After deployment, open **Email Studio** in the app admin. It shows whether notifications are ready and the sending address without exposing implementation details or secrets. Configure the store brand and templates, then use **Send test** before accepting live appointments.

## Per-store Email Studio

Provider credentials and verified sender addresses remain environment-level secrets in Railway. Each installed SHOPLINE store can independently save the following non-secret settings in its own `Shop.emailSettings` record:

- Brand name, square HTTPS logo URL, and accent color.
- Customer reply-to address and merchant new-booking notification address.
- Independent customer and merchant notification switches for booking creation/confirmation, changes, cancellation, and pre-appointment reminders.
- Reminder lead time of 3, 6, 12, 24, 48, or 72 hours.
- Subject, heading, and plain-text intro message for confirmation, customer reschedule, merchant edit, cancellation, reminder, and merchant alert emails.
- Safe variables such as `{{customer_name}}`, `{{product_title}}`, `{{date}}`, `{{time}}`, `{{timezone}}`, `{{location}}`, `{{staff}}`, and `{{store_name}}`.

Template text is escaped before it enters HTML email, while the appointment card and private management button remain system controlled. This prevents a merchant template from injecting active HTML or replacing security-critical appointment details.

The logo configured in Email Studio appears inside the email body. Gmail and other inbox sender avatars are not controlled by email HTML. Gmail may use the sending Google account profile image or a domain-level BIMI setup; configure that separately after the sending domain has appropriate SPF, DKIM, and DMARC alignment.

## Resend fallback

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=Appointment Lite <bookings@your-verified-domain.com>
MERCHANT_NOTIFICATION_EMAIL=optional-merchant@example.com
```

With `EMAIL_PROVIDER=auto`, Appointment Lite chooses a fully configured Aliyun DirectMail provider first, then Resend. Set it explicitly in production so configuration mistakes are visible.

## Notification coverage

- New booking: customer confirmation with the private Manage Appointment link; optional merchant copy.
- Customer changes date/time: customer confirmation and a reminder that the single online change was used.
- Customer or merchant cancels: customer cancellation email.
- Merchant edits: customer update email.
- Pre-appointment reminder: optional customer and/or merchant email at the configured lead time. Multi-session services are reminded per occurrence and a Mongo-backed delivery record prevents duplicate sends.
- Managed staff (v0.5.1, per-employee opt-in): new assignment, customer/merchant schedule update, reassignment, and cancellation email. Staff notification delivery is best-effort and never rolls back a booking change.

The private email link is built as `/manage?booking=BOOKING_ID&access=SECRET`. Query delivery is used because some email clients and copy/open flows discard URL fragments. The management response disables caching and referrers; JavaScript immediately stores the token in session storage and replaces the visible URL with `/manage?booking=BOOKING_ID`. Legacy `#token=SECRET` links remain supported. MongoDB stores only the token's SHA-256 hash.

## Operations and security

- Rotate AccessKeys periodically and immediately after any suspected disclosure.
- Keep the RAM policy restricted to `dm:SingleSendMail`.
- Never expose AccessKeys, Resend keys, or the management token in storefront source or diagnostics.
- Monitor rejected and bounced mail in the provider console.
- A successful booking response is authoritative even when email delivery reports a failure.


## Staff notifications (v0.5.1)

Managed staff can enable **Email appointment updates** on their staff profile. This setting is opt-in and requires a valid staff email. Existing staff are not automatically enrolled when upgrading.

The staff message includes the current service/date/time, location, and customer contact summary. When a merchant reassigns a booking, the previous staff member receives a reassignment notice and the newly assigned staff member receives an assignment notice. Staff emails do not include customer management tokens or merchant-admin authentication.

## v0.6.0.6 Email Studio layout

Email notification choices are presented as separate customer and merchant option cards. Each option has a short title and helper sentence so Simplified Chinese and English remain readable at normal admin widths. Customer reply-to, merchant notification inboxes, and reminder timing remain independent settings; this release changes presentation only and does not change notification delivery behavior.
