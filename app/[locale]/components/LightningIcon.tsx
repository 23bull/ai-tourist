import * as React from "react";

export default function LightningIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M13 2L3 14h8l-1 8 11-14h-8l0-6z"
        fill="currentColor"
      />
    </svg>
  );
}