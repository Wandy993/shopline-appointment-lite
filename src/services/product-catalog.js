import { nextPageInfoFromLink } from '../lib/shopline-pagination.js';
import { shoplineGetPage, shoplineGraphql } from './shopline.js';

import { mergeCatalogProducts } from '../lib/product-catalog.js';

const REST_PAGE_LIMIT = 50;
const GRAPHQL_PAGE_LIMIT = 100;
const MAX_PAGES = 20;

async function fetchRestProducts(shopId) {
  const products = [];
  let pageInfo = '';
  let pages = 0;
  do {
    const { payload, link } = await shoplineGetPage(shopId, 'products/products.json', {
      limit: REST_PAGE_LIMIT,
      fields: 'id,title,handle,status,created_at,product_type',
      ...(pageInfo ? { page_info: pageInfo } : { order_by: 'created_at_desc' })
    });
    const pageProducts = payload.products || payload.data?.products || payload.data || [];
    if (Array.isArray(pageProducts)) products.push(...pageProducts);
    pageInfo = nextPageInfoFromLink(link);
    pages += 1;
  } while (pageInfo && pages < MAX_PAGES);
  return products;
}

async function fetchGraphqlProducts(shopId) {
  const products = [];
  let after = null;
  let pages = 0;
  const query = `query AppointmentLiteProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, reverse: true) {
      nodes { id title handle status createdAt onlineStoreUrl productType }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  do {
    const data = await shoplineGraphql(shopId, query, { first: GRAPHQL_PAGE_LIMIT, after });
    const connection = data?.products || {};
    if (Array.isArray(connection.nodes)) products.push(...connection.nodes);
    after = connection.pageInfo?.hasNextPage ? connection.pageInfo.endCursor : null;
    pages += 1;
  } while (after && pages < MAX_PAGES);
  return products;
}

export async function syncProductCatalog(shopId) {
  const [restResult, graphqlResult] = await Promise.allSettled([
    fetchRestProducts(shopId),
    fetchGraphqlProducts(shopId)
  ]);

  if (restResult.status === 'rejected' && graphqlResult.status === 'rejected') {
    throw restResult.reason || graphqlResult.reason || new Error('SHOPLINE product sync failed');
  }

  const restProducts = restResult.status === 'fulfilled' ? restResult.value : [];
  const graphqlProducts = graphqlResult.status === 'fulfilled' ? graphqlResult.value : [];
  const products = mergeCatalogProducts(restProducts, graphqlProducts);
  const diagnostics = {
    restCount: mergeCatalogProducts(restProducts).length,
    graphqlCount: mergeCatalogProducts(graphqlProducts).length,
    mergedCount: products.length,
    restAvailable: restResult.status === 'fulfilled',
    graphqlAvailable: graphqlResult.status === 'fulfilled',
    reconciled: restResult.status === 'fulfilled' && graphqlResult.status === 'fulfilled'
      && mergeCatalogProducts(restProducts).length !== mergeCatalogProducts(graphqlProducts).length
  };
  return { products, diagnostics };
}

export async function getProductVariants(shopId, productId) {
  const { payload } = await shoplineGetPage(shopId, `products/${encodeURIComponent(String(productId))}/variants.json`, {
    limit: 250,
    fields: 'id,title,price,sku,inventory_quantity,inventory_policy,required_shipping'
  });
  const variants = payload.variants || payload.data?.variants || payload.data || [];
  return (Array.isArray(variants) ? variants : []).map(item => ({
    id: String(item.id || ''),
    title: String(item.title || 'Default'),
    price: String(item.price ?? ''),
    sku: String(item.sku || ''),
    inventoryQuantity: Number(item.inventory_quantity ?? 0),
    inventoryPolicy: String(item.inventory_policy || ''),
    requiredShipping: Boolean(item.required_shipping)
  })).filter(item => item.id);
}
