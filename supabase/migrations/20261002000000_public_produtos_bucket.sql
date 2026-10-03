INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public can read produtos" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'produtos');
