const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const BUTTON_WIDTHS = new Set(['content', 'full']);
const BUTTON_ALIGNMENTS = new Set(['left', 'center', 'right']);
const PRIMARY_BUTTON_WIDTHS = new Set(['content', 'full']);
const PRIMARY_BUTTON_ALIGNMENTS = new Set(['left', 'center', 'right']);
const BOOKING_THEME_TEMPLATES = new Set(['minimal_light', 'warm_luxe', 'soft_editorial']);
const BOOKING_THEME_INTENSITIES = new Set(['soft', 'medium', 'strong']);
const BOOKING_CORNER_STYLES = new Set(['soft', 'rounded', 'square_soft']);
const BOOKING_PRIMARY_STYLES = new Set(['template', 'custom']);

export const DEFAULT_STOREFRONT_SETTINGS = Object.freeze({
  appearance: Object.freeze({
    template: 'warm_luxe',
    backgroundIntensity: 'medium',
    cornerStyle: 'rounded',
    primaryStyle: 'template',
    unifiedBookingFlow: true
  }),
  button: Object.freeze({
    label: 'Book an appointment',
    backgroundColor: '#2F6FED',
    textColor: '#FFFFFF',
    width: 'content',
    alignment: 'left',
    borderRadius: 8
  }),
  modal: Object.freeze({
    title: 'Book an appointment',
    accentColor: '#2F6FED',
    primaryTextColor: '#FFFFFF',
    primaryButtonWidth: 'content',
    primaryButtonAlignment: 'right',
    showServiceSummary: true,
    showTimezoneSelector: true,
    showPhone: true,
    showNotes: true,
    showFooterNote: true
  })
});

function text(value, max) { return String(value ?? '').trim().slice(0, max); }
function color(value, fallback) { return HEX_COLOR_PATTERN.test(String(value || '')) ? String(value).toUpperCase() : fallback; }
function booleanValue(value, fallback = true) { return typeof value === 'boolean' ? value : fallback; }

export function normalizeStorefrontSettings(input = {}) {
  const radius = Number(input.button?.borderRadius);
  return {
    appearance: {
      template: BOOKING_THEME_TEMPLATES.has(input.appearance?.template) ? input.appearance.template : DEFAULT_STOREFRONT_SETTINGS.appearance.template,
      backgroundIntensity: BOOKING_THEME_INTENSITIES.has(input.appearance?.backgroundIntensity) ? input.appearance.backgroundIntensity : DEFAULT_STOREFRONT_SETTINGS.appearance.backgroundIntensity,
      cornerStyle: BOOKING_CORNER_STYLES.has(input.appearance?.cornerStyle) ? input.appearance.cornerStyle : DEFAULT_STOREFRONT_SETTINGS.appearance.cornerStyle,
      primaryStyle: BOOKING_PRIMARY_STYLES.has(input.appearance?.primaryStyle) ? input.appearance.primaryStyle : DEFAULT_STOREFRONT_SETTINGS.appearance.primaryStyle,
      unifiedBookingFlow: booleanValue(input.appearance?.unifiedBookingFlow, DEFAULT_STOREFRONT_SETTINGS.appearance.unifiedBookingFlow)
    },
    button: {
      label: text(input.button?.label, 60) || DEFAULT_STOREFRONT_SETTINGS.button.label,
      backgroundColor: color(input.button?.backgroundColor, DEFAULT_STOREFRONT_SETTINGS.button.backgroundColor),
      textColor: color(input.button?.textColor, DEFAULT_STOREFRONT_SETTINGS.button.textColor),
      width: BUTTON_WIDTHS.has(input.button?.width) ? input.button.width : DEFAULT_STOREFRONT_SETTINGS.button.width,
      alignment: BUTTON_ALIGNMENTS.has(input.button?.alignment) ? input.button.alignment : DEFAULT_STOREFRONT_SETTINGS.button.alignment,
      borderRadius: Number.isFinite(radius) ? Math.min(24, Math.max(0, Math.round(radius))) : DEFAULT_STOREFRONT_SETTINGS.button.borderRadius
    },
    modal: {
      title: text(input.modal?.title, 80) || DEFAULT_STOREFRONT_SETTINGS.modal.title,
      accentColor: color(input.modal?.accentColor, DEFAULT_STOREFRONT_SETTINGS.modal.accentColor),
      primaryTextColor: color(input.modal?.primaryTextColor, DEFAULT_STOREFRONT_SETTINGS.modal.primaryTextColor),
      primaryButtonWidth: PRIMARY_BUTTON_WIDTHS.has(input.modal?.primaryButtonWidth) ? input.modal.primaryButtonWidth : DEFAULT_STOREFRONT_SETTINGS.modal.primaryButtonWidth,
      primaryButtonAlignment: PRIMARY_BUTTON_ALIGNMENTS.has(input.modal?.primaryButtonAlignment) ? input.modal.primaryButtonAlignment : DEFAULT_STOREFRONT_SETTINGS.modal.primaryButtonAlignment,
      showServiceSummary: booleanValue(input.modal?.showServiceSummary, DEFAULT_STOREFRONT_SETTINGS.modal.showServiceSummary),
      showTimezoneSelector: booleanValue(input.modal?.showTimezoneSelector, DEFAULT_STOREFRONT_SETTINGS.modal.showTimezoneSelector),
      showPhone: booleanValue(input.modal?.showPhone, DEFAULT_STOREFRONT_SETTINGS.modal.showPhone),
      showNotes: booleanValue(input.modal?.showNotes, DEFAULT_STOREFRONT_SETTINGS.modal.showNotes),
      showFooterNote: booleanValue(input.modal?.showFooterNote, DEFAULT_STOREFRONT_SETTINGS.modal.showFooterNote)
    }
  };
}

export function validateStorefrontSettings(input = {}) {
  const value = normalizeStorefrontSettings(input);
  const errors = [];
  if (input.appearance?.template && !BOOKING_THEME_TEMPLATES.has(input.appearance.template)) errors.push('Choose a supported booking visual template.');
  if (input.appearance?.backgroundIntensity && !BOOKING_THEME_INTENSITIES.has(input.appearance.backgroundIntensity)) errors.push('Choose a supported booking background intensity.');
  if (input.appearance?.cornerStyle && !BOOKING_CORNER_STYLES.has(input.appearance.cornerStyle)) errors.push('Choose a supported booking corner style.');
  if (input.appearance?.primaryStyle && !BOOKING_PRIMARY_STYLES.has(input.appearance.primaryStyle)) errors.push('Choose a supported primary action style.');
  if (!text(input.button?.label, 60)) errors.push('Booking button text is required.');
  if (input.button?.backgroundColor && !HEX_COLOR_PATTERN.test(String(input.button.backgroundColor))) errors.push('Booking button color must be a six-digit hex color.');
  if (input.button?.textColor && !HEX_COLOR_PATTERN.test(String(input.button.textColor))) errors.push('Booking button text color must be a six-digit hex color.');
  if (input.button?.width && !BUTTON_WIDTHS.has(input.button.width)) errors.push('Choose a supported booking button width.');
  if (input.button?.alignment && !BUTTON_ALIGNMENTS.has(input.button.alignment)) errors.push('Choose a supported booking button alignment.');
  if (input.button?.borderRadius != null && (!Number.isFinite(Number(input.button.borderRadius)) || Number(input.button.borderRadius) < 0 || Number(input.button.borderRadius) > 24)) errors.push('Booking button corner radius must be between 0 and 24.');
  if (!text(input.modal?.title, 80)) errors.push('Booking dialog title is required.');
  if (input.modal?.accentColor && !HEX_COLOR_PATTERN.test(String(input.modal.accentColor))) errors.push('Booking dialog accent color must be a six-digit hex color.');
  if (input.modal?.primaryTextColor && !HEX_COLOR_PATTERN.test(String(input.modal.primaryTextColor))) errors.push('Booking dialog button text color must be a six-digit hex color.');
  if (input.modal?.primaryButtonWidth && !PRIMARY_BUTTON_WIDTHS.has(input.modal.primaryButtonWidth)) errors.push('Choose a supported booking action width.');
  if (input.modal?.primaryButtonAlignment && !PRIMARY_BUTTON_ALIGNMENTS.has(input.modal.primaryButtonAlignment)) errors.push('Choose a supported booking action alignment.');
  return { errors: [...new Set(errors)], value };
}
