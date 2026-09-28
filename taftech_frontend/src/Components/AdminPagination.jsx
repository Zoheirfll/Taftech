import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { tw } from "../theme";

// Numéros de page à afficher : toujours la 1re et la dernière, la page courante ±1, et "…"
// pour les trous. Remplace l'ancien `.slice(0, 10)` qui rendait les pages 11+ inaccessibles.
const pagesVisibles = (page, total) => {
  const set = new Set([1, total, page - 1, page, page + 1]);
  const liste = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const resultat = [];
  liste.forEach((p, i) => {
    if (i > 0 && p - liste[i - 1] > 1) resultat.push(`…${p}`);
    resultat.push(p);
  });
  return resultat;
};

const AdminPagination = ({ page, totalPages, totalCount, onChange, disabled = false }) => {
  if (!totalPages || totalPages <= 1) {
    return totalCount != null && totalCount > 0 ? (
      <div className={`px-5 py-3 border-t ${tw.borderSubtle} text-xs ${tw.textMuted}`}>{totalCount} résultat(s)</div>
    ) : null;
  }
  const boutonNav = `flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border ${tw.borderBase} ${tw.surface} ${tw.hoverSurfaceSubtle} disabled:opacity-40 ${tw.focusRing}`;
  return (
    <nav
      className={`flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3 border-t ${tw.borderSubtle} ${tw.surfaceMuted}`}
      aria-label="Pagination"
    >
      <p className={`text-xs ${tw.textMuted}`}>
        {totalCount != null ? `${totalCount} résultat(s) · ` : ""}page {page} / {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(page - 1)} disabled={disabled || page <= 1} className={boutonNav} aria-label="Page précédente">
          <ChevronLeft size={14} />
        </button>
        {pagesVisibles(page, totalPages).map((p) =>
          typeof p === "string" ? (
            <span key={p} className={`px-1 text-xs ${tw.textMuted}`}>…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              disabled={disabled}
              aria-current={p === page ? "page" : undefined}
              className={`min-w-7 h-7 px-1.5 text-xs font-semibold rounded-lg ${tw.focusRing} ${
                p === page ? "bg-indigo-600 text-white" : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" onClick={() => onChange(page + 1)} disabled={disabled || page >= totalPages} className={boutonNav} aria-label="Page suivante">
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
};

export default AdminPagination;
