export function LoadingHint({
  label,
  compact = false,
}: {
  label: string
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2.5 ${compact ? 'py-3' : 'my-10 py-6'}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-[#e8eaee] border-t-fuel"
        aria-hidden="true"
      />
      <p className={`m-0 font-semibold text-muted ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
    </div>
  )
}
