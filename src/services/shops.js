import mongoose from 'mongoose';
import { Shop } from '../models/Shop.js';

export function validShopHandle(value) {
  return /^[a-z0-9][a-z0-9-]{1,62}$/i.test(String(value || ''));
}

export function validShoplineStoreId(value) {
  return /^\d{3,32}$/.test(String(value || ''));
}

export async function findInstalledShop({ shopId, shop: handle, objectId }, ShopModel = Shop) {
  const normalizedObjectId = String(objectId || '').trim();
  if (mongoose.isValidObjectId(normalizedObjectId)) {
    const byObjectId = await ShopModel.findOne({ _id: normalizedObjectId, uninstalledAt: null }).lean();
    if (byObjectId) return byObjectId;
  }
  const normalizedStoreId = String(shopId || '').trim();
  if (validShoplineStoreId(normalizedStoreId)) {
    const byStoreId = await ShopModel.findOne({ shoplineStoreId: normalizedStoreId, uninstalledAt: null }).lean();
    if (byStoreId) return byStoreId;
  }
  const normalizedHandle = String(handle || '').trim().toLowerCase();
  if (validShopHandle(normalizedHandle)) return ShopModel.findOne({ handle: normalizedHandle, uninstalledAt: null }).lean();
  return null;
}
