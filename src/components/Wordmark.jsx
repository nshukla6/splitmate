/**
 * Two shapes that add up to one — the split made into a mark.
 */
export default function Wordmark({ className = '', showText = true }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative inline-flex h-6 w-6 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-violet" />
        <span className="absolute inset-y-0 right-0 w-1/2 rounded-r-full bg-violet-deep" />
        <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-paper/70" />
      </span>
      {showText && (
        <span className="display text-[19px] tracking-[-0.04em]">Splitmate</span>
      )}
    </span>
  )
}
