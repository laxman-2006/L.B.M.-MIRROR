import React from 'react'

/**
 * Laptop + Smartphone mirroring illustration for the Center Card (Photo 1 reference)
 */
export const LaptopPhoneIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 240,
  height = 140,
}) => {
  return (
    <svg
      viewBox="0 0 320 180"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="laptop-phone-svg"
    >
      {/* Soft background glow */}
      <ellipse cx="160" cy="155" rx="140" ry="14" fill="#e2e8f0" opacity="0.6" />

      {/* ── Laptop ── */}
      {/* Laptop Base */}
      <path
        d="M20 145C20 143 22 141 25 141H235C238 141 240 143 240 145L245 152H15L20 145Z"
        fill="#94a3b8"
      />
      <rect x="110" y="142" width="40" height="3" rx="1.5" fill="#64748b" />
      <path d="M12 152H248C250 152 252 154 252 155C252 156 250 157 248 157H12C10 157 8 156 8 155C8 154 10 152 12 152Z" fill="#cbd5e1" />

      {/* Laptop Lid & Screen */}
      <rect x="34" y="24" width="192" height="118" rx="7" fill="#1e293b" />
      <rect x="40" y="30" width="180" height="106" rx="4" fill="#f8fafc" />

      {/* Laptop Screen Content: Mirrored UI */}
      <rect x="40" y="30" width="180" height="14" fill="#3b82f6" />
      <circle cx="48" cy="37" r="3" fill="#ffffff" opacity="0.8" />
      <rect x="56" y="35" width="40" height="4" rx="2" fill="#ffffff" opacity="0.8" />

      {/* Mirrored card inside laptop */}
      <rect x="50" y="52" width="75" height="50" rx="4" fill="#e2e8f0" />
      <rect x="56" y="58" width="40" height="5" rx="2" fill="#3b82f6" />
      <rect x="56" y="67" width="60" height="3" rx="1.5" fill="#94a3b8" />
      <rect x="56" y="73" width="50" height="3" rx="1.5" fill="#94a3b8" />
      <rect x="56" y="82" width="30" height="12" rx="3" fill="#f97316" />

      {/* Laptop mini preview */}
      <rect x="135" y="52" width="75" height="74" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <circle cx="172" cy="74" r="14" fill="#3b82f6" opacity="0.15" />
      <path d="M165 74L170 79L180 69" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="145" y="98" width="55" height="4" rx="2" fill="#93c5fd" />
      <rect x="150" y="106" width="45" height="4" rx="2" fill="#bfdbfe" />

      {/* ── Smartphone (Right Side) ── */}
      {/* Phone Shadow */}
      <ellipse cx="265" cy="155" rx="28" ry="8" fill="#cbd5e1" opacity="0.5" />
      
      {/* Phone Body */}
      <rect x="238" y="44" width="54" height="106" rx="11" fill="#0f172a" />
      {/* Phone Bezel/Border */}
      <rect x="240" y="46" width="50" height="102" rx="9" fill="#1e293b" />
      {/* Phone Screen */}
      <rect x="242" y="48" width="46" height="98" rx="7" fill="#6366f1" />

      {/* Phone Wallpaper / UI */}
      <path d="M242 48H288V146H242V48Z" fill="url(#phoneGrad)" />
      <defs>
        <linearGradient id="phoneGrad" x1="242" y1="48" x2="288" y2="146" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f46e5" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Phone Camera Notch */}
      <circle cx="265" cy="53" r="2" fill="#0f172a" />

      {/* Phone Clock & UI */}
      <text x="265" y="72" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="system-ui, sans-serif">
        15:10
      </text>
      <rect x="248" y="80" width="34" height="2" rx="1" fill="#ffffff" opacity="0.6" />
      <rect x="250" y="86" width="30" height="22" rx="4" fill="#ffffff" opacity="0.25" />
      <circle cx="265" cy="97" r="5" fill="#ffffff" opacity="0.8" />
      <rect x="252" y="114" width="26" height="18" rx="3" fill="#ffffff" opacity="0.25" />

      {/* ── Wireless Beam Connection Waves ── */}
      <path d="M225 78C232 75 235 73 240 76" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
      <path d="M222 88C230 85 234 83 240 86" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
      <path d="M225 98C232 95 235 93 240 96" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  )
}

/**
 * Sleeping laptop character illustration for Empty Device List (Photo 1 reference)
 */
export const SleepingDeviceIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 160,
  height = 140,
}) => {
  return (
    <svg
      viewBox="0 0 200 180"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="sleeping-device-svg"
    >
      {/* Cloud Behind */}
      <path
        d="M165 110C178 110 188 99 188 86C188 74 179 64 167 63C165 46 151 32 133 32C122 32 112 37 106 46C102 43 96 42 90 42C77 42 66 52 66 65C66 67 66 68 67 70C57 73 50 82 50 93C50 106 61 116 74 116H165V110Z"
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />

      {/* Zzz Cloud Bubbles */}
      <path
        d="M138 65L150 65L138 78L150 78"
        stroke="#2563eb"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M154 52L162 52L154 60L162 60"
        stroke="#3b82f6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M166 40L172 40L166 46L172 46"
        stroke="#60a5fa"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Sleeping Character on Laptop */}
      {/* Character body/arm resting */}
      <path
        d="M125 125C125 110 138 98 154 98C170 98 182 110 182 125L180 135H120L125 125Z"
        fill="#1e293b"
      />
      {/* Character head resting on arms */}
      <circle cx="148" cy="108" r="14" fill="#0f172a" />
      <path
        d="M142 110C144 113 148 113 150 110"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Laptop Screen & Base */}
      {/* Open Laptop Screen */}
      <path
        d="M50 85L62 135H125L113 85C113 83 111 81 108 81H55C52 81 50 83 50 85Z"
        fill="#e2e8f0"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {/* Blue screen glow with logo */}
      <path
        d="M56 87L66 130H118L108 87H56Z"
        fill="#f0f9ff"
      />
      <circle cx="85" cy="106" r="4" fill="#38bdf8" />

      {/* Laptop Keyboard Base */}
      <path
        d="M50 135L42 140H140L132 135H50Z"
        fill="#cbd5e1"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Shadow Base */}
      <ellipse cx="100" cy="144" rx="75" ry="5" fill="#e2e8f0" />
    </svg>
  )
}
