/** Mobile-only search pill — desktop uses DashboardShell header search. */
export function MobileSearchField({
  value,
  onChange,
  placeholder = 'Search here...',
  ariaLabel = 'Search',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <label className="mb-0 flex w-full items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-muted shadow-[0_2px_10px_rgba(26,29,33,0.03)] lg:hidden">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-0 bg-transparent text-[0.9rem] text-ink outline-none"
        aria-label={ariaLabel}
      />
    </label>
  )
}
