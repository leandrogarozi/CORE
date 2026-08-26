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
