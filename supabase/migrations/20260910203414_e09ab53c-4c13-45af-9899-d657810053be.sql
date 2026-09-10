CREATE POLICY "Owners read their studio assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'studio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners upload their studio assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'studio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners update their studio assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'studio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete their studio assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'studio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);