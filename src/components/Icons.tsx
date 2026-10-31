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
  | "moon"
  | "chevron-down"
  | "pin"
  | "lock"
  | "unlock"
  | "calendar"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "clipboard"
  | "clock"
  | "close"
  | "compass"
  | "download"
  | "expand"
  | "filter"
  | "image"
  | "inbox"
  | "layers"
  | "locate"
  | "mail"
  | "map"
  | "minus"
  | "more"
  | "printer"
  | "qr"
  | "reply"
  | "ruler"
  | "send"
  | "settings"
  | "sparkle"
  | "table";


/**
 * Trazos de la maqueta SIVU Lab (`Icon.tsx`, copiados sin cambios; CC-058:
 * solo presentación). Mandan sobre los anteriores para que los íconos sean
 * los mismos de la maqueta; los que la maqueta no tiene siguen abajo.
 */
const lab: Partial<Record<IconName, string>> = {
  "leaf": "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",
  "map": "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z M9 4v14 M15 6v14",
  "inbox": "M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h5",
  "chart": "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  "settings": "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9 7 7 M17 17l2.1 2.1 M4.9 19.1 7 17 M17 7l2.1-2.1",
  "search": "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-3.5-3.5",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-up": "m18 15-6-6-6 6",
  "plus": "M12 5v14 M5 12h14",
  "minus": "M5 12h14",
  "close": "M18 6 6 18 M6 6l12 12",
  "expand": "M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7",
  "moon": "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",
  "sun": "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  "locate": "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M12 2v3 M12 19v3 M2 12h3 M19 12h3",
  "layers": "m12 2 10 5-10 5L2 7l10-5Z M2 12l10 5 10-5 M2 17l10 5 10-5",
  "compass": "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z m4.2-14.2-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1Z",
  "filter": "M3 5h18 M6 12h12 M10 19h4",
  "list": "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  "ruler": "M21 6H3 M21 12H9 M21 18H3",
  "edit": "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  "alert": "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z M12 9v4 M12 17h.01",
  "clipboard": "M9 4h6v3H9z M7 5H5v16h14V5h-2 M9 12h6 M9 16h4",
  "more": "M5 12h.01 M12 12h.01 M19 12h.01",
  "building": "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16 M16 9h2a2 2 0 0 1 2 2v10 M3 21h18 M8 7h4 M8 11h4 M8 15h4",
  "sparkle": "M12 3v4 M12 17v4 M3 12h4 M17 12h4",
  "wrench": "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z",
  "calendar": "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4",
  "chevron-left": "m15 18-6-6 6-6",
  "chevron-right": "m9 18 6-6-6-6",
  "check": "M5 12.5 10 17l9-10",
  "table": "M3 5h18v14H3z M3 10h18 M3 15h18 M9 5v14",
  "download": "M12 4v11 M7 10l5 5 5-5 M5 20h14",
  "pin": "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  "clock": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2",
  "qr": "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 14h2 M14 18h2 M18 18h2v2h-2z M7 7h.01 M17 7h.01 M7 17h.01",
  "camera": "M4 8h3l2-3h6l2 3h3v11H4z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  "user": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0",
  "send": "M22 2 11 13 M22 2l-7 20-4-9-9-4 20-7Z",
  "eye": "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  "mail": "M3 5h18v14H3z M3 6l9 7 9-7",
  "lock": "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  "image": "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M15.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  "printer": "M6 9V3h12v6 M6 18H4v-7h16v7h-2 M6 14h12v7H6z",
  "reply": "M9 14 4 9l5-5 M4 9h11a5 5 0 0 1 5 5v6",
  "arrow-right": "M5 12h14 M13 6l6 6-6 6",
};

const paths: Partial<Record<IconName, React.ReactNode>> = {
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
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
      {lab[name] ? <path d={lab[name]} /> : paths[name]}
    </svg>
  );
}
