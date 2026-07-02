export default function GoogleStars({ count = 5, className = 'h-4 w-4' }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars on Google`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#FBBC05"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      ))}
    </div>
  )
}
