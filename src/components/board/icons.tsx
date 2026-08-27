export function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <circle cx="7" cy="7" r="4.7" stroke="currentColor" strokeWidth="1.3" />
      <line x1="10.3" y1="10.3" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11">
      <path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlagIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13">
      <path d="M3 1.5V14.5M3 2H12L10 4.5L12 7H3" stroke={color} strokeWidth="1.4" fill={color} strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
      <path d="M2.5 4.5H13.5M6.2 4.5V2.9C6.2 2.4 6.6 2 7.1 2H8.9C9.4 2 9.8 2.4 9.8 2.9V4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.6 4.5L4.3 13C4.35 13.55 4.8 14 5.4 14H10.6C11.2 14 11.65 13.55 11.7 13L12.4 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 7V11.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.5 7V11.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function CommentIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
      <path
        d="M2 3.5C2 2.7 2.7 2 3.5 2H12.5C13.3 2 14 2.7 14 3.5V9.5C14 10.3 13.3 11 12.5 11H6.5L3.5 13.5V11C2.7 11 2 10.3 2 9.5V3.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
      <path d="M10.7 2.3L13.7 5.3L5.7 13.3H2.7V10.3L10.7 2.3Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 4L12 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function DuplicateIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
      <rect x="5.3" y="1.7" width="8.3" height="8.3" rx="1.4" stroke="currentColor" strokeWidth="1.3" fill="var(--surface)" />
      <rect x="2" y="5.3" width="8.3" height="8.3" rx="1.4" stroke="currentColor" strokeWidth="1.3" fill="var(--surface)" />
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
      <path d="M2 8C2 5 4.2 3 7 3H12M12 3L9.5 1M12 3L9.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8C14 11 11.8 13 9 13H4M4 13L6.5 11M4 13L6.5 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M4 2.3L13.2 8L4 13.7V2.3Z" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <rect x="3.6" y="2.4" width="3" height="11.2" rx="0.8" />
      <rect x="9.4" y="2.4" width="3" height="11.2" rx="0.8" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15">
      <line x1="2" x2="14" y1="4" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2" x2="14" y1="8" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2" x2="14" y1="12" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path d="M2 7.3L8 2.3L14 7.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 6.3V13H12.5V6.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.3 13V9.3H9.7V13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WeekIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <rect x="2" y="3" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="2" x2="14" y1="6" y2="6" stroke="currentColor" strokeWidth="1.3" />
      <line x1="5" x2="5" y1="1.7" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="11" x2="11" y1="1.7" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <rect x="2.3" y="8.5" width="3" height="5" rx="0.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="4.5" width="3" height="9" rx="0.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.7" y="2" width="3" height="11.5" rx="0.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path
        d="M2.5 3C2.5 2.4 3 2 3.6 2H7.5V13.3H3.6C3 13.3 2.5 12.9 2.5 12.3V3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3C13.5 2.4 13 2 12.4 2H8.5V13.3H12.4C13 13.3 13.5 12.9 13.5 12.3V3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookSolidIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13">
      <rect x="2" y="2.2" width="12" height="11.6" rx="2.2" fill="currentColor" />
      <line x1="8" x2="8" y1="2.2" y2="13.8" stroke="var(--surface)" strokeWidth="1.2" />
    </svg>
  );
}

export function PillIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <rect
        x="2.3"
        y="6.3"
        width="11.4"
        height="5"
        rx="2.5"
        transform="rotate(-45 8 8.8)"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <line x1="7.1" y1="6.1" x2="9.6" y2="8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path
        d="M4 6.5C4 4.3 5.6 2.5 8 2.5C10.4 2.5 12 4.3 12 6.5C12 10 13 10.7 13 11.2H3C3 10.7 4 10 4 6.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.3 13C6.5 13.6 7.1 14 8 14C8.9 14 9.5 13.6 9.7 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15">
      {[[3.5, 10], [8, 5.5], [12.5, 11]].map(([y, cx]) => (
        <g key={y}>
          <line x1="1.3" x2="14.7" y1={y} y2={y} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx={cx} cy={y} r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="1.3" />
        </g>
      ))}
    </svg>
  );
}
