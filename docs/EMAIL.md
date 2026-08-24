# Email delivery: Aliyun DirectMail and Resend

Appointment Lite sends email through HTTPS APIs, not SMTP. Railway therefore does not need outbound SMTP access. Email delivery is optional: a missing provider or provider failure never rolls back booking creation, cancellation, or rescheduling.

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
ALIYUN_DIRECTMAIL_TAG_NAME=appointment_lite
MERCHANT_NOTIFICATION_EMAIL=optional-merchant@example.com
```

`ALIBABA_CLOUD_SECURITY_TOKEN` is supported for temporary STS credentials. A Railway container cannot automatically inherit an ECS service-linked role, so an ECS RAM role name by itself is not enough. For the current deployment, use the dedicated least-privilege RAM user AccessKey. If temporary credentials are introduced later, add an external STS refresh path and rotate the token before expiry.

After deployment, open **Storefront setup → Email delivery** in the app admin. It shows the selected provider, transport, and sender without exposing secrets. Use **Send test email** before accepting live appointments.

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

The private link is built as `/manage?booking=BOOKING_ID#token=SECRET`. The fragment is not sent to the server. JavaScript stores it in session storage and removes it from the visible URL. MongoDB stores only its SHA-256 hash.

## Operations and security

- Rotate AccessKeys periodically and immediately after any suspected disclosure.
- Keep the RAM policy restricted to `dm:SingleSendMail`.
- Never expose AccessKeys, Resend keys, or the management token in storefront source or diagnostics.
- Monitor rejected and bounced mail in the provider console.
- A successful booking response is authoritative even when email delivery reports a failure.
