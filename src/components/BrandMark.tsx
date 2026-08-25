/** Yellow droplet mark used in FuelLedger dashboard chrome. */
export function BrandMark({ className = '', size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 3.5C20 3.5 8.5 15.2 8.5 24.2C8.5 30.6 13.6 35.5 20 35.5C26.4 35.5 31.5 30.6 31.5 24.2C31.5 15.2 20 3.5 20 3.5Z"
        fill="#F5C518"
      />
      <path
        d="M20 14.5C20 14.5 14.8 19.8 14.8 24C14.8 26.9 17.1 29.2 20 29.2C22.9 29.2 25.2 26.9 25.2 24C25.2 19.8 20 14.5 20 14.5Z"
        fill="#FFFFFF"
        opacity="0.95"
      />
    </svg>
  )
}

export default BrandMark
