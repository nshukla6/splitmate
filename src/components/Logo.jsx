export default function Logo({ className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Splitmate"
      className={`h-12 w-auto ${className}`}
    />
  )
}
