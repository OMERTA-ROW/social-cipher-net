INSERT INTO public.fee_settings (category, operation, rail, asset, currency, payer, minor_unit_scale, quote_ttl_seconds, is_configured, is_active, notes)
VALUES
  ('exchange','spot_maker',NULL,NULL,'USD','sender',2,60,false,false,'Rate not set yet.'),
  ('exchange','spot_taker',NULL,NULL,'USD','sender',2,60,false,false,'Rate not set yet.'),
  ('exchange','conversion',NULL,NULL,'USD','sender',2,60,false,false,'Rate not set yet.'),
  ('wallet','send',NULL,NULL,'USD','sender',2,60,false,false,'Rate not set yet. Network cost must come from a real integration.'),
  ('bank','deposit','ach',NULL,'USD','sender',2,60,false,false,'Rate not set yet. Processor cost unknown until a provider is chosen.'),
  ('bank','withdrawal','ach',NULL,'USD','receiver',2,60,false,false,'Rate not set yet. Processor cost unknown until a provider is chosen.')
ON CONFLICT DO NOTHING;