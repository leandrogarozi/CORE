"use client";

export function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={"toggle-switch" + (checked ? " on" : "")}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}
