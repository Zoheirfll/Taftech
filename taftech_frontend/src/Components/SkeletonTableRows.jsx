import React from "react";
import { tw } from "../theme";

const SkeletonTableRows = ({ columns = 4, rows = 5 }) => (
  <>
    {[...Array(rows)].map((_, i) => (
      <tr key={i} className="animate-pulse">
        {[...Array(columns)].map((__, j) => (
          <td key={j} className="px-5 py-4">
            <div className={`h-3.5 ${tw.surfaceSubtle} rounded w-3/4`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export default SkeletonTableRows;
