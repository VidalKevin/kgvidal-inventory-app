CREATE TABLE IF NOT EXISTS shiphero_unfulfilled_orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_date date,
  order_number text,
  status text DEFAULT 'Unfulfilled',
  days_delayed integer,
  reason_for_delay text,
  synced_at timestamptz
);
