ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived'));

ALTER TABLE waitlist_entries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived'));

ALTER TABLE instructor_applications
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived'));

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived'));
