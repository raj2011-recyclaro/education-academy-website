import { useEffect, useMemo, useState } from "react";
import { getCategories } from "../lib/api";

const fallbackCategoryNames = ["Finance", "Trading"];

export function normalizeCategoryKey(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCategoryOption(category) {
  if (typeof category === "string") {
    return {
      label: category,
      value: normalizeCategoryKey(category),
      name: category,
      slug: normalizeCategoryKey(category),
    };
  }

  const label = category.name || category.label || category.slug || "";
  const value = category.slug || category.value || label;
  return {
    ...category,
    label,
    value: normalizeCategoryKey(value),
  };
}

export function categoryMatches(selectedCategory, itemCategory) {
  const selected = normalizeCategoryKey(selectedCategory);
  if (!selected || selected === "all") return true;

  const current = normalizeCategoryKey(itemCategory);
  return current === selected || current.includes(selected) || selected.includes(current);
}

export function useCategories({ includeAll = true, allLabel = "All" } = {}) {
  const fallbackCategories = useMemo(
    () => fallbackCategoryNames.map(toCategoryOption),
    [],
  );
  const [remoteCategories, setRemoteCategories] = useState(fallbackCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getCategories()
      .then((data) => {
        if (!active) return;
        setRemoteCategories(data.map(toCategoryOption));
        setError(null);
      })
      .catch((requestError) => {
        if (!active) return;
        console.warn("Using fallback categories:", requestError.message);
        setRemoteCategories(fallbackCategories);
        setError(requestError);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fallbackCategories]);

  const categories = useMemo(() => {
    const allOption = {
      label: allLabel,
      value: "all",
      name: allLabel,
      slug: "all",
    };
    return includeAll ? [allOption, ...remoteCategories] : remoteCategories;
  }, [allLabel, includeAll, remoteCategories]);

  return { categories, isLoading, error };
}
