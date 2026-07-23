// One-time (re-runnable/idempotent) backfill: reads the real course catalog from the
// frontend's src/data/*.js and upserts it into the bootcamps/masterclasses tables, per
// docs/ADMIN_PORTAL_PRD.md §13. Run with: node src/scripts/backfillCourses.js
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pool, query } from "../db/pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

const { bootcamps } = await import(pathToFileURL(path.join(repoRoot, "src/data/bootcamps.js")));
const { masterclasses } = await import(pathToFileURL(path.join(repoRoot, "src/data/masterclasses.js")));

async function loadCategoryMap() {
  const result = await query("SELECT id, name FROM categories");
  const map = new Map();
  for (const row of result.rows) {
    map.set(row.name.toLowerCase(), row.id);
  }
  return map;
}

async function backfillBootcamps(categoryMap) {
  let count = 0;
  for (const course of bootcamps) {
    await query(
      `INSERT INTO bootcamps (
        slug, title, code, category_id, instructor_key, duration, level, delivery_mode,
        live_sessions, start_date, certificate, price, status, ideal_for, exam_body,
        exam_fee, pass_mark, image, summary, why_course, about_course, who_should_attend,
        outcomes, curriculum, refund_conditions, faq, disclaimer, visibility_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, 'published'
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        code = EXCLUDED.code,
        category_id = EXCLUDED.category_id,
        instructor_key = EXCLUDED.instructor_key,
        duration = EXCLUDED.duration,
        level = EXCLUDED.level,
        delivery_mode = EXCLUDED.delivery_mode,
        live_sessions = EXCLUDED.live_sessions,
        start_date = EXCLUDED.start_date,
        certificate = EXCLUDED.certificate,
        price = EXCLUDED.price,
        status = EXCLUDED.status,
        ideal_for = EXCLUDED.ideal_for,
        exam_body = EXCLUDED.exam_body,
        exam_fee = EXCLUDED.exam_fee,
        pass_mark = EXCLUDED.pass_mark,
        image = EXCLUDED.image,
        summary = EXCLUDED.summary,
        why_course = EXCLUDED.why_course,
        about_course = EXCLUDED.about_course,
        who_should_attend = EXCLUDED.who_should_attend,
        outcomes = EXCLUDED.outcomes,
        curriculum = EXCLUDED.curriculum,
        refund_conditions = EXCLUDED.refund_conditions,
        faq = EXCLUDED.faq,
        disclaimer = EXCLUDED.disclaimer,
        updated_at = NOW()`,
      [
        course.slug,
        course.title,
        course.code || null,
        categoryMap.get((course.category || "").toLowerCase()) || null,
        course.instructorId || null,
        course.duration || null,
        course.level || null,
        course.deliveryMode || null,
        course.liveSessions || null,
        course.startDate || null,
        course.certificate !== false,
        course.price || null,
        course.status || null,
        course.idealFor || null,
        course.examBody || null,
        course.examFee || null,
        course.passMark || null,
        course.image || null,
        course.summary || null,
        course.whyCourse || null,
        course.aboutCourse || null,
        JSON.stringify(course.whoShouldAttend || []),
        JSON.stringify(course.outcomes || []),
        JSON.stringify(course.curriculum || []),
        JSON.stringify(course.refundConditions || []),
        JSON.stringify(course.faq || []),
        course.disclaimer || null,
      ],
    );
    count += 1;
  }
  return count;
}

async function backfillMasterclasses(categoryMap) {
  let count = 0;
  for (const course of masterclasses) {
    await query(
      `INSERT INTO masterclasses (
        slug, title, category_id, instructor_key, date, time, registered, price, status,
        image, summary, overview, learn, audience, agenda, disclaimer, visibility_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'published')
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        category_id = EXCLUDED.category_id,
        instructor_key = EXCLUDED.instructor_key,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        registered = EXCLUDED.registered,
        price = EXCLUDED.price,
        status = EXCLUDED.status,
        image = EXCLUDED.image,
        summary = EXCLUDED.summary,
        overview = EXCLUDED.overview,
        learn = EXCLUDED.learn,
        audience = EXCLUDED.audience,
        agenda = EXCLUDED.agenda,
        disclaimer = EXCLUDED.disclaimer,
        updated_at = NOW()`,
      [
        course.slug,
        course.title,
        categoryMap.get((course.category || "").toLowerCase()) || null,
        course.instructorId || null,
        course.date || null,
        course.time || null,
        course.registered || 0,
        course.price || null,
        course.status || null,
        course.image || null,
        course.summary || null,
        course.overview || null,
        JSON.stringify(course.learn || []),
        JSON.stringify(course.audience || []),
        JSON.stringify(course.agenda || []),
        course.disclaimer || null,
      ],
    );
    count += 1;
  }
  return count;
}

try {
  const categoryMap = await loadCategoryMap();
  const bootcampCount = await backfillBootcamps(categoryMap);
  const masterclassCount = await backfillMasterclasses(categoryMap);
  console.log(`Backfilled ${bootcampCount} bootcamps and ${masterclassCount} masterclasses.`);
} catch (error) {
  console.error("Backfill failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
