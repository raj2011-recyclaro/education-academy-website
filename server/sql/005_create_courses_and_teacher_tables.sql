CREATE TABLE IF NOT EXISTS bootcamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  code TEXT,
  category_id UUID REFERENCES categories(id),
  instructor_id UUID REFERENCES users(id),
  -- Fallback while a course has no real teacher account attributed yet: matches a key
  -- in src/data/instructors.js. Once instructor_id is set (a real users.id), that takes
  -- priority — see docs/PLATFORM_AUTH_RBAC_PRD.md §7.6.
  instructor_key TEXT,
  duration TEXT,
  level TEXT,
  delivery_mode TEXT,
  live_sessions TEXT,
  start_date TEXT,
  certificate BOOLEAN DEFAULT true,
  price TEXT,
  status TEXT,
  ideal_for TEXT,
  exam_body TEXT,
  exam_fee TEXT,
  pass_mark TEXT,
  image TEXT,
  summary TEXT,
  why_course TEXT,
  about_course TEXT,
  who_should_attend JSONB DEFAULT '[]',
  outcomes JSONB DEFAULT '[]',
  curriculum JSONB DEFAULT '[]',
  refund_conditions JSONB DEFAULT '[]',
  faq JSONB DEFAULT '[]',
  disclaimer TEXT,
  visibility_status TEXT NOT NULL DEFAULT 'draft' CHECK (visibility_status IN ('draft', 'published')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bootcamps_visibility_status ON bootcamps (visibility_status);
CREATE INDEX IF NOT EXISTS idx_bootcamps_instructor_id ON bootcamps (instructor_id);

CREATE TABLE IF NOT EXISTS masterclasses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  instructor_id UUID REFERENCES users(id),
  instructor_key TEXT,
  date TEXT,
  time TEXT,
  registered INT DEFAULT 0,
  price TEXT,
  status TEXT,
  image TEXT,
  summary TEXT,
  overview TEXT,
  learn JSONB DEFAULT '[]',
  audience JSONB DEFAULT '[]',
  agenda JSONB DEFAULT '[]',
  disclaimer TEXT,
  visibility_status TEXT NOT NULL DEFAULT 'draft' CHECK (visibility_status IN ('draft', 'published')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_masterclasses_visibility_status ON masterclasses (visibility_status);
CREATE INDEX IF NOT EXISTS idx_masterclasses_instructor_id ON masterclasses (instructor_id);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  bio TEXT,
  highlights JSONB DEFAULT '[]',
  credentials JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_type TEXT NOT NULL CHECK (course_type IN ('bootcamp', 'masterclass')),
  course_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INT NOT NULL,
  file_data BYTEA NOT NULL,
  sort_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_materials_course ON course_materials (course_type, course_slug);

ALTER TABLE instructor_applications
  ADD COLUMN IF NOT EXISTS promoted_user_id UUID REFERENCES users(id);
