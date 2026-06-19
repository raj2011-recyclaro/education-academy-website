import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CategoryFilter, SearchBar } from "../components/Common";
import { CourseCard } from "../components/CourseCards";
import { masterclasses as fallbackMasterclasses } from "../data/masterclasses";
import { categoryMatches, normalizeCategoryKey, useCategories } from "../hooks/useCategories";
import { getMasterclasses } from "../lib/api";

function normalizeInitialCategory(value) {
  const normalized = normalizeCategoryKey(value || "all");
  return normalized.startsWith("all") ? "all" : normalized;
}

export default function MasterclassesPage() {
  const [params] = useSearchParams();
  const [courses, setCourses] = useState(fallbackMasterclasses);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") || "");
  const [category, setCategory] = useState(normalizeInitialCategory(params.get("category")));
  const [sort, setSort] = useState("Soonest");
  const { categories, isLoading: categoriesLoading } = useCategories();

  useEffect(() => {
    let active = true;
    getMasterclasses()
      .then((data) => {
        if (active) setCourses(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const results = useMemo(
    () =>
      courses
        .filter(
          (item) =>
            categoryMatches(category, item.category) &&
            `${item.title} ${item.summary}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "Popular"
            ? b.registered - a.registered
            : sort === "Price"
              ? a.price.localeCompare(b.price)
              : 0,
        ),
    [courses, search, category, sort],
  );

  return (
    <main className="section listing-page">
      <header className="page-header">
        <div className="eyebrow">Live, practical, useful</div>
        <h1>Masterclasses</h1>
        <p>
          Prestige education without the passive lecture. Learn directly from
          experts in focused live sessions.
        </p>
      </header>
      <div className="filter-panel">
        <SearchBar value={search} onChange={setSearch} placeholder="Search masterclasses..." />
        <CategoryFilter categories={categories} active={category} onChange={setCategory} />
        <div className="sort-chips">
          {["Soonest", "Popular", "Price"].map((item) => (
            <button
              key={item}
              className={sort === item ? "chip active" : "chip"}
              onClick={() => setSort(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {(loading || categoriesLoading) && <p className="loading-note">Loading live catalog...</p>}
      {results.length ? (
        <div className="grid three">
          {results.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No masterclasses found</h2>
          <p>Try another topic or a broader search phrase.</p>
          <button
            className="button secondary"
            onClick={() => {
              setSearch("");
              setCategory("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </main>
  );
}
