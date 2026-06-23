CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_type TEXT NOT NULL,
  course_slug TEXT NOT NULL,
  course_title TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_consent BOOLEAN DEFAULT false,
  email_consent BOOLEAN DEFAULT false,
  sms_consent BOOLEAN DEFAULT false,
  source_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bootcamp_slug TEXT,
  bootcamp_title TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  source_page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instructor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  topic TEXT NOT NULL,
  experience TEXT,
  social_link TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_course_slug
  ON registrations (course_slug);

CREATE INDEX IF NOT EXISTS idx_registrations_created_at
  ON registrations (created_at);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_bootcamp_slug
  ON waitlist_entries (bootcamp_slug);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_created_at
  ON waitlist_entries (created_at);

CREATE INDEX IF NOT EXISTS idx_instructor_applications_created_at
  ON instructor_applications (created_at);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages (created_at);
