import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const baseProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const PlaneIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M22 2 15 22l-4-8-8-4 19-8Z" />
    <path d="m22 2-11 12" />
  </svg>
)

export const SearchIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
)

export const MapPinIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const ClockIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

export const WindIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M3 8h11a3 3 0 1 0-3-3" />
    <path d="M3 12h16" />
    <path d="M3 16h10a3 3 0 1 1-3 3" />
  </svg>
)

export const EyeIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
)

export const ChevronIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)
