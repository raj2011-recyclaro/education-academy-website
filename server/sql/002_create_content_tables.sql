CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  video_type TEXT NOT NULL CHECK (video_type IN ('orientation', 'course')),
  category_id UUID REFERENCES categories(id),
  related_program_slug TEXT,
  description TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_type ON videos (video_type);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos (status);
CREATE INDEX IF NOT EXISTS idx_videos_category_id ON videos (category_id);
CREATE INDEX IF NOT EXISTS idx_videos_related_program_slug ON videos (related_program_slug);

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
