"use client";

import { Download } from "lucide-react";

/** Opens the browser's print dialog, where the customer can choose "Save as PDF". */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary">
      <Download className="size-4" aria-hidden="true" /> Download PDF
    </button>
  );
}
