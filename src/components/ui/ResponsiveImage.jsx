export default function ResponsiveImage({
  src,
  webp,
  srcSet,
  alt,
  className = '',
  style,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  onClick,
  draggable,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
}) {
  const imgProps = {
    src,
    alt,
    className,
    style,
    loading,
    decoding,
    fetchPriority,
    onClick,
    draggable,
    sizes: srcSet ? sizes : undefined,
  }

  if (webp || srcSet) {
    return (
      <picture>
        {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
        {webp && !srcSet && <source type="image/webp" srcSet={webp} />}
        <img {...imgProps} />
      </picture>
    )
  }

  return <img {...imgProps} />
}
