import test from 'node:test';
import assert from 'node:assert/strict';
import { findInstalledShop, validShopHandle, validShoplineStoreId } from '../src/services/shops.js';

test('SHOPLINE store IDs and legacy handles have strict formats', () => {
  assert.equal(validShoplineStoreId('1672369729606'), true);
  assert.equal(validShoplineStoreId('not-an-id'), false);
  assert.equal(validShopHandle('apptest'), true);
  assert.equal(validShopHandle('https://apptest.myshopline.com'), false);
});

test('store ID is preferred over the legacy handle', async () => {
  const calls = [];
  const ShopModel = {
    findOne(query) {
      calls.push(query);
      return { async lean() { return { _id: 'shop-1', shoplineStoreId: query.shoplineStoreId }; } };
    }
  };
  const shop = await findInstalledShop({ shopId: '1672369729606', shop: 'apptest' }, ShopModel);
  assert.equal(shop.shoplineStoreId, '1672369729606');
  assert.deepEqual(calls, [{ shoplineStoreId: '1672369729606', uninstalledAt: null }]);
});
