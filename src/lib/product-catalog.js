export function normalizeProductId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const gidMatch = raw.match(/\/Product\/([^/?#]+)$/i);
  return gidMatch ? gidMatch[1] : raw;
}

function pathFromUrl(value) {
  try { return new URL(String(value || '')).pathname || ''; }
  catch { return ''; }
}

export function normalizeCatalogProduct(product = {}) {
  const id = normalizeProductId(product.id);
  if (!id) return null;
  return {
    id,
    title: String(product.title || 'Untitled product'),
    handle: String(product.handle || ''),
    path: String(product.path || pathFromUrl(product.onlineStoreUrl) || ''),
    status: String(product.status || 'active').toLowerCase(),
    productType: String(product.product_type || product.productType || ''),
    createdAt: String(product.created_at || product.createdAt || '')
  };
}

export function mergeCatalogProducts(...lists) {
  const merged = new Map();
  for (const list of lists) {
    for (const raw of list || []) {
      const product = normalizeCatalogProduct(raw);
      if (!product) continue;
      const previous = merged.get(product.id) || {};
      merged.set(product.id, {
        ...previous,
        ...product,
        title: product.title || previous.title || 'Untitled product',
        handle: product.handle || previous.handle || '',
        path: product.path || previous.path || '',
        productType: product.productType || previous.productType || '',
        createdAt: product.createdAt || previous.createdAt || ''
      });
    }
  }
  return [...merged.values()]
    .filter(product => product.status !== 'archived')
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || a.title.localeCompare(b.title));
}
