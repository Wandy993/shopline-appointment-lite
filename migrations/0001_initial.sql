CREATE TABLE IF NOT EXISTS app_documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (collection, id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_app_documents_collection_updated
  ON app_documents(collection, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_documents_collection_created
  ON app_documents(collection, created_at DESC);

CREATE TABLE IF NOT EXISTS app_unique_keys (
  unique_key TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  document_id TEXT NOT NULL,
  FOREIGN KEY (collection, document_id)
    REFERENCES app_documents(collection, id)
    ON DELETE CASCADE
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_app_unique_keys_document
  ON app_unique_keys(collection, document_id);

CREATE TABLE IF NOT EXISTS staff_reservation_buckets (
  reservation_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  bucket_key TEXT NOT NULL,
  PRIMARY KEY (shop_id, staff_id, bucket_key),
  FOREIGN KEY (reservation_id)
    REFERENCES app_documents(id)
    ON DELETE CASCADE
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_staff_reservation_buckets_reservation
  ON staff_reservation_buckets(reservation_id);
