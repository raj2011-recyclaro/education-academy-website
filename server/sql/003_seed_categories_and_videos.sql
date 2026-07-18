-- Seed data mirrors the content already hardcoded in the repo:
--   categories  <- server/src/data/categories.js
--   videos      <- youtubeId entries in src/data/masterclasses.js (orientation) and src/data/bootcamps.js (course)

INSERT INTO categories (slug, name, description, icon, sort_order, featured) VALUES
  ('artificial-intelligence', 'Artificial Intelligence', 'Practical AI workflows, language models, evaluation, and responsible adoption.', 'spark', 10, true),
  ('finance', 'Finance', 'Financial thinking, markets, analysis, and decision-making for modern teams.', 'chart', 20, true),
  ('trading', 'Trading', 'Risk-aware market research, backtesting, signals, and trading systems.', 'candles', 30, true),
  ('career-growth', 'Career Growth', 'Communication, portfolio-building, leadership, and clearer professional direction.', 'ladder', 40, true),
  ('business', 'Business', 'Strategy, operations, product judgment, and better business systems.', 'briefcase', 50, false),
  ('spirituality', 'Spirituality', 'Reflective practices, values-led leadership, and grounded personal clarity.', 'lotus', 60, false),
  ('wellness', 'Wellness', 'Sustainable routines, emotional steadiness, and healthier work rhythms.', 'leaf', 70, false),
  ('engineering', 'Engineering', 'Cloud systems, architecture, reliability, and practical software leadership.', 'terminal', 80, true)
ON CONFLICT (slug) DO NOTHING;

-- Orientation videos (free teaser sessions, one per masterclass listing)
INSERT INTO videos (title, youtube_url, youtube_video_id, video_type, category_id, related_program_slug, status) VALUES
  ('Basics of Stock Market — Free Orientation Session', 'https://www.youtube.com/watch?v=Jsxn4pOe-9I', 'Jsxn4pOe-9I', 'orientation', (SELECT id FROM categories WHERE slug = 'finance'), 'free-orientation-basics-of-stock-market', 'published'),
  ('Technical Analysis Masterclass — Free Orientation Session', 'https://www.youtube.com/watch?v=FOW0vJvf0cs', 'FOW0vJvf0cs', 'orientation', (SELECT id FROM categories WHERE slug = 'trading'), 'free-orientation-technical-analysis-masterclass', 'published'),
  ('Options Trading — Free Income Strategy Session', 'https://www.youtube.com/watch?v=sjqFmVkwrvk', 'sjqFmVkwrvk', 'orientation', (SELECT id FROM categories WHERE slug = 'trading'), 'free-orientation-options-trading', 'published'),
  ('Algo Trading with Python — Free Coding Clinic', 'https://www.youtube.com/watch?v=zFH7_SFGomo', 'zFH7_SFGomo', 'orientation', (SELECT id FROM categories WHERE slug = 'trading'), 'free-orientation-algo-trading-python', 'published'),
  ('CMT Level 1 — Free Chart Clinic and Exam Overview', 'https://www.youtube.com/watch?v=RUc3gyfdqfA', 'RUc3gyfdqfA', 'orientation', (SELECT id FROM categories WHERE slug = 'trading'), 'free-orientation-cmt-level-1', 'published');

-- Course videos (embedded on the paid bootcamp detail pages)
INSERT INTO videos (title, youtube_url, youtube_video_id, video_type, category_id, related_program_slug, status) VALUES
  ('Basics of Stock Market', 'https://www.youtube.com/watch?v=Jsxn4pOe-9I', 'Jsxn4pOe-9I', 'course', (SELECT id FROM categories WHERE slug = 'finance'), 'basics-of-stock-market', 'published'),
  ('Technical Analysis Masterclass', 'https://www.youtube.com/watch?v=FOW0vJvf0cs', 'FOW0vJvf0cs', 'course', (SELECT id FROM categories WHERE slug = 'trading'), 'technical-analysis-masterclass', 'published'),
  ('NISM Series X-A: Investment Adviser Level 1 Certification', 'https://www.youtube.com/watch?v=YMM1w3L-Sdk', 'YMM1w3L-Sdk', 'course', (SELECT id FROM categories WHERE slug = 'finance'), 'nism-series-x-a-investment-adviser', 'published'),
  ('Options Trading: Basics to Income Strategy', 'https://www.youtube.com/watch?v=sjqFmVkwrvk', 'sjqFmVkwrvk', 'course', (SELECT id FROM categories WHERE slug = 'trading'), 'options-trading-basics-to-income-strategy', 'published'),
  ('Algo Trading with Python', 'https://www.youtube.com/watch?v=zFH7_SFGomo', 'zFH7_SFGomo', 'course', (SELECT id FROM categories WHERE slug = 'trading'), 'algo-trading-with-python', 'published'),
  ('CMT Level 1: Foundation of Technical Analysis', 'https://www.youtube.com/watch?v=RUc3gyfdqfA', 'RUc3gyfdqfA', 'course', (SELECT id FROM categories WHERE slug = 'trading'), 'cmt-level-1-foundation-of-technical-analysis', 'published'),
  ('CFA Level 1 Coaching', 'https://www.youtube.com/watch?v=nx7jd4vhw_k', 'nx7jd4vhw_k', 'course', (SELECT id FROM categories WHERE slug = 'finance'), 'cfa-level-1-coaching', 'published');
