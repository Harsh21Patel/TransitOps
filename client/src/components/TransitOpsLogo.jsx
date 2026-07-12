/**
 * TransitOps Logo — inline SVG component.
 * Props:
 *   size    — pixel size of the icon square (default 32)
 *   variant — 'icon' (square only) | 'full' (icon + wordmark side by side)
 *   theme   — 'dark' | 'light' (controls wordmark text color)
 */
const TransitOpsLogo = ({ size = 32, variant = 'icon', theme = 'light' }) => {
  const textColor = theme === 'dark' ? '#f1f5f9' : '#111827';

  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TransitOps logo"
    >
      {/* Rounded square background */}
      <rect width="48" height="48" rx="10" fill="#b45309" />
      {/* Arrow body (horizontal bar) */}
      <rect x="8" y="20" width="22" height="8" rx="2" fill="#fbbf24" />
      {/* Arrow head (chevron pointing right) */}
      <polygon points="26,12 40,24 26,36" fill="#fbbf24" />
      {/* Small route-dot accent, bottom-left */}
      <circle cx="12" cy="36" r="3" fill="#f59e0b" opacity="0.7" />
    </svg>
  );

  if (variant === 'icon') return icon;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon}
      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: size * 0.56, color: textColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
        TransitOps
      </span>
    </div>
  );
};

export default TransitOpsLogo;
