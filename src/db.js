import { runWithDatabase } from './db/orm.js';
export async function withDatabase(database, callback) { return runWithDatabase(database, callback); }
export async function connectDatabase() { throw new Error('MongoDB has been removed. Use the Cloudflare D1 binding.'); }
export async function disconnectDatabase() {}
