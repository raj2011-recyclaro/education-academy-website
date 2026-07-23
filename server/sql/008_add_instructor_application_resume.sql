ALTER TABLE instructor_applications
  ADD COLUMN IF NOT EXISTS resume_file_name TEXT,
  ADD COLUMN IF NOT EXISTS resume_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS resume_file_size INT,
  ADD COLUMN IF NOT EXISTS resume_data BYTEA;
