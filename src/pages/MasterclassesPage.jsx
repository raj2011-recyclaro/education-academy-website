import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { masterclasses } from "../data/masterclasses";
import { CategoryFilter, SearchBar } from "../components/Common";
import { CourseCard } from "../components/CourseCards";

export default function MasterclassesPage() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [category, setCategory] = useState(params.get("category") || "All topics");
  const [sort, setSort] = useState("Soonest");
  const categories = ["All topics", ...new Set(masterclasses.map((item) => item.category))];
  const results = useMemo(() => masterclasses.filter((item) => (category === "All topics" || item.category === category) && `${item.title} ${item.summary}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "Popular" ? b.registered - a.registered : sort === "Price" ? a.price.localeCompare(b.price) : 0), [search, category, sort]);
  return <main className="section listing-page"><header className="page-header"><div className="eyebrow">Live, practical, useful</div><h1>Masterclasses</h1><p>Prestige education without the passive lecture. Learn directly from experts in focused live sessions.</p></header><div className="filter-panel"><SearchBar value={search} onChange={setSearch} placeholder="Search masterclasses..." /><CategoryFilter categories={categories} active={category} onChange={setCategory} /><div className="sort-chips">{["Soonest", "Popular", "Price"].map((item) => <button key={item} className={sort === item ? "chip active" : "chip"} onClick={() => setSort(item)}>{item}</button>)}</div></div>{results.length ? <div className="grid three">{results.map((course) => <CourseCard key={course.slug} course={course} />)}</div> : <div className="empty-state"><h2>No masterclasses found</h2><p>Try another topic or a broader search phrase.</p><button className="button secondary" onClick={() => { setSearch(""); setCategory("All topics"); }}>Clear filters</button></div>}</main>;
}
