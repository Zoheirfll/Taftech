import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { tw } from "../theme";

const SortableTh = ({ field, label, ordering, onSort, className = "", align = "left" }) => {
  const active = ordering.replace("-", "") === field;
  const isDesc = ordering.startsWith("-");
  const Icon = !active ? ArrowUpDown : isDesc ? ArrowDown : ArrowUp;

  return (
    <th className={`${className} ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 ${tw.focusRing} rounded ${active ? tw.textPrimary : ""}`}
      >
        {label}
        <Icon size={11} className={active ? "" : "opacity-40"} />
      </button>
    </th>
  );
};

export default SortableTh;
