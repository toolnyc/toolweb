-- Allow inserts from the service role (admin operations)
CREATE POLICY "Service role can insert inquiries"
  ON project_inquiries FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow anon inserts since this is a public-facing form
CREATE POLICY "Public can insert inquiries"
  ON project_inquiries FOR INSERT
  TO anon
  WITH CHECK (true);
