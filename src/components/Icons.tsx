import React from "react";

export type IconName =
  | "leaf"
  | "grid"
  | "list"
  | "check-square"
  | "link"
  | "alert"
  | "sort"
  | "wrench"
  | "chart"
  | "plus"
  | "arrow-left"
  | "arrow-right"
  | "check"
  | "camera"
  | "building"
  | "user"
  | "logout"
  | "search"
  | "eye"
  | "edit"
  | "play"
  | "sun"
  | "moon";

const paths: Record<IconName, React.ReactNode> = {
  leaf: (
    <path d="M5 21c9-1 14-6 15-15C11 6 6 11 5 21ZM5 21c1-4 3-7 6-9" />
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  list: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  "check-square": (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  link: <path d="M9 15 15 9M8 17l-2 2a4 4 0 0 1-6-6l3-3M16 7l2-2a4 4 0 0 1 6 6l-3 3" />,
  alert: (
    <>
      <path d="M10.6 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.4 3.9a2 2 0 0 0-3.4 0Z" />
      <line x1="12" y1="9" x2="12" y2="13.5" />
      <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
    </>
  ),
  sort: (
    <>
      <line x1="4" y1="6" x2="14" y2="6" />
      <line x1="4" y1="12" x2="11" y2="12" />
      <line x1="4" y1="18" x2="8" y2="18" />
      <path d="M17 4v16m0 0-3-3m3 3 3-3" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.6 5.1L3 17.5V21h3.5l6.1-6.1a4 4 0 0 0 5.1-5.6l-3 3-2-2 3-3Z" />,
  chart: (
    <>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="12" width="3" height="8" />
      <rect x="11" y="7" width="3" height="13" />
      <rect x="16" y="4" width="3" height="16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  "arrow-left": <path d="M19 12H5M12 19l-7-7 7-7" />,
  "arrow-right": <path d="M5 12h14M12 5l7 7-7 7" />,
  check: <path d="M20 6 9 17l-5-5" />,
  camera: (
    <>
      <path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="8" y1="7" x2="8.01" y2="7" />
      <line x1="12" y1="7" x2="12.01" y2="7" />
      <line x1="16" y1="7" x2="16.01" y2="7" />
      <line x1="8" y1="11" x2="8.01" y2="11" />
      <line x1="12" y1="11" x2="12.01" y2="11" />
      <line x1="16" y1="11" x2="16.01" y2="11" />
      <line x1="9" y1="21" x2="9" y2="16" />
      <line x1="15" y1="21" x2="15" y2="16" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />,
  play: <path d="M7 4v16l13-8L7 4Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
};

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
