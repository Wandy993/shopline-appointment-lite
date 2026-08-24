export function buildThemeAppBlockDeepLink({ handle, themeId, extensionUuid, blockHandle = 'appointment-lite' }) {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/i.test(String(handle || ''))) throw new Error('Invalid store handle');
  for (const [name, value] of Object.entries({ themeId, extensionUuid, blockHandle })) {
    if (!String(value || '').trim()) throw new Error(`Missing ${name}`);
  }
  const url = new URL(`https://${handle}.myshopline.com/admin/theme-editor/editing/ProductsDetail`);
  url.search = new URLSearchParams({
    themeId: String(themeId),
    templateName: 'templates/product.json',
    activateAppId: `${extensionUuid}/${blockHandle}`,
    target: 'newAppsSection'
  }).toString();
  return url.toString();
}
