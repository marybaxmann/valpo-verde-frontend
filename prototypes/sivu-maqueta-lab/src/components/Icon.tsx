const PATHS = {
  leaf: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z M9 4v14 M15 6v14",
  inbox: "M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h5",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9 7 7 M17 17l2.1 2.1 M4.9 19.1 7 17 M17 7l2.1-2.1",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-3.5-3.5",
  chevronDown: "m6 9 6 6 6-6",
  chevronUp: "m18 15-6-6-6 6",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  close: "M18 6 6 18 M6 6l12 12",
  expand: "M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7",
  moon: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  locate: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M12 2v3 M12 19v3 M2 12h3 M19 12h3",
  layers: "m12 2 10 5-10 5L2 7l10-5Z M2 12l10 5 10-5 M2 17l10 5 10-5",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z m4.2-14.2-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1Z",
  filter: "M3 5h18 M6 12h12 M10 19h4",
  list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  ruler: "M21 6H3 M21 12H9 M21 18H3",
  edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  alert: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z M12 9v4 M12 17h.01",
  clipboard: "M9 4h6v3H9z M7 5H5v16h14V5h-2 M9 12h6 M9 16h4",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  building: "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16 M16 9h2a2 2 0 0 1 2 2v10 M3 21h18 M8 7h4 M8 11h4 M8 15h4",
  sparkle: "M12 3v4 M12 17v4 M3 12h4 M17 12h4",
  arrowRight: "M5 12h14 M13 6l6 6-6 6",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  check: "M5 12.5 10 17l9-10",
  table: "M3 5h18v14H3z M3 10h18 M3 15h18 M9 5v14",
  download: "M12 4v11 M7 10l5 5 5-5 M5 20h14",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2",
  qr: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 14h2 M14 18h2 M18 18h2v2h-2z M7 7h.01 M17 7h.01 M7 17h.01",
  camera: "M4 8h3l2-3h6l2 3h3v11H4z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0",
  send: "M22 2 11 13 M22 2l-7 20-4-9-9-4 20-7Z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  mail: "M3 5h18v14H3z M3 6l9 7 9-7",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  image: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M15.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  printer: "M6 9V3h12v6 M6 18H4v-7h16v7h-2 M6 14h12v7H6z",
  reply: "M9 14 4 9l5-5 M4 9h11a5 5 0 0 1 5 5v6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
