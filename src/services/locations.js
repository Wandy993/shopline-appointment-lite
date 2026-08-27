import { shoplineGet } from './shopline.js';

function text(value, max = 255) {
  return String(value ?? '').trim().slice(0, max);
}

export function normalizeShoplineLocation(item = {}) {
  return {
    id: text(item.id, 100),
    name: text(item.name || 'Location', 160),
    address1: text(item.address1, 200),
    address2: text(item.address2, 200),
    city: text(item.city, 120),
    province: text(item.province, 120),
    provinceCode: text(item.province_code || item.provinceCode, 40),
    country: text(item.country, 120),
    countryCode: text(item.country_code || item.countryCode, 8),
    zip: text(item.zip, 40),
    phone: text(item.phone, 60),
    isDefault: String(item.is_default ?? item.isDefault ?? '').toLowerCase() === 'true' || item.is_default === true || item.isDefault === true,
    active: String(item.active ?? 'true').toLowerCase() !== 'false' && item.active !== false
  };
}

export function formatLocationSnapshot(location = {}) {
  const address = [location.address1, location.address2, location.city, location.province, location.zip, location.country]
    .map(value => String(value || '').trim()).filter(Boolean).join(', ');
  return [String(location.name || '').trim(), address].filter(Boolean).join(' · ').slice(0, 300);
}

function listFromPayload(payload = {}) {
  const rows = payload.locations ?? payload.data?.locations ?? payload.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function listShoplineLocations(shopId, { shoplineGetFn = shoplineGet } = {}) {
  const payload = await shoplineGetFn(shopId, 'locations/list.json');
  return listFromPayload(payload)
    .map(normalizeShoplineLocation)
    .filter(item => item.id && item.active)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
}

export async function resolveShoplineLocation(shopId, locationId, options = {}) {
  const locations = await listShoplineLocations(shopId, options);
  return locations.find(item => item.id === String(locationId || '').trim()) || null;
}
