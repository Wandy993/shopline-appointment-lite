# Appointment Lite v0.8.15 — Admin Design System

## Scope

This release standardizes the merchant-facing admin UI only. It does not redesign storefront booking surfaces, customer booking/management pages, transactional email templates, or appointment business logic.

## Typography

- Primary admin UI: Plus Jakarta Sans, weights 400, 500, 600, and 700.
- Chinese/system fallback: system UI, PingFang SC, Microsoft YaHei, and sans-serif.
- Monospaced content: JetBrains Mono, weights 400 and 500.
- Page title: 20px, weight 600–700.
- Section/card title: 16px, weight 600.
- Tabs: 15px, weight 500.
- Body, navigation, form labels, and controls: 14px.
- Helper text: 13px, weight 400, line-height 1.5.
- Captions and monospaced content: 13px.
- Small actions: 12px, weight 500.

Fonts are loaded only on the merchant admin page. The admin CSP permits the Google Fonts stylesheet and font file hosts. The hosted booking pages, customer-facing Theme Extension, and transactional email typography remain unchanged.

## Color tokens

| Token | Value |
|---|---|
| `--bg-color` | `#f9fafb` |
| `--card-bg` | `#ffffff` |
| `--text-main` | `#111827` |
| `--text-muted` | `#6b7280` |
| `--accent` | `#4f46e5` |
| `--accent-hover` | `#4338ca` |
| `--border` | `#e5e7eb` |
| `--danger` | `#dc2626` |
| `--danger-border` | `#fca5a5` |

Existing component variables are aliased to these tokens so existing admin components share the same palette.

## Component rules

- Buttons and text form controls inherit the admin font family.
- Buttons, text inputs, selects, and textareas use a 6px radius.
- Focus indicators use the accent color.
- Tabs use 15px text; small actions use 12px.
- Code, keys, identifiers, and variable chips use JetBrains Mono.
- Code display areas use a neutral background, border, and 12px padding.
- Destructive actions use the danger color and danger border.

Checkboxes and radio controls retain their existing native/custom interaction geometry so their selection behavior and visual affordance are not changed.

## Configuration layout utility

The reusable `.config-layout`, `.configuration-layout`, and `.settings-layout` classes define a 280px description column plus a flexible content column, with a 24px gap. At widths up to 960px, the layout becomes a single column. The utility is available for configuration sections without forcing the Email Studio form/preview or Storefront Setup control/preview workspaces into an unsuitable narrow column.

## Preserved behavior

- No API, data model, scheduling, booking, billing, notification, or authorization logic is changed.
- Email previews retain Jost/Poppins typography to represent the actual customer email output.
- Customer-facing booking and management pages retain their existing typography.
- Theme Extension assets receive only a release version/cache marker update; no customer-facing visual rules are changed.
