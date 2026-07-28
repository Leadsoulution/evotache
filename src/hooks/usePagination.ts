"use client";

import { useState } from "react";

export function usePagination(totalItems: number, pageSize: number | "all") {
  const [pageState, setPage] = useState(1);
  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  // Derived, not stored: if filters shrink the result set below the stored
  // page number, this clamps for render without a setState-in-effect round trip.
  const page = Math.min(pageState, pageCount);
  const start = pageSize === "all" ? 0 : (page - 1) * pageSize;
  const end = pageSize === "all" ? totalItems : Math.min(start + pageSize, totalItems);

  return { page, setPage, pageCount, start, end };
}
