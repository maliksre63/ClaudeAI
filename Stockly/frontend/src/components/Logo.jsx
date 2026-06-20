export default function Logo({ size = 32, showText = true, textColor = 'inherit' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="14" fill="#3d0a14"/>
        <polyline points="10,48 22,34 32,40 44,20 54,14"
          fill="none" stroke="#b8a89c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
        <polyline points="10,48 22,34 32,40 44,20 54,14"
          fill="none" stroke="#ddd0c6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="54" cy="14" r="4.5" fill="#ddd0c6"/>
      </svg>
      {showText && (
        <span style={{ fontSize: size * 0.44, fontWeight: 700, letterSpacing: '-0.03em', color: textColor }}>
          Stockly
        </span>
      )}
    </div>
  )
}
