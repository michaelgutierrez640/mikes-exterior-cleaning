import { BUSINESS } from '../../config/business'
import {
  BRAND_LOGO_ALT,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_PATH,
  BRAND_LOGO_WIDTH,
} from '../../config/site'

/**
 * Official transparent brand mark — keep proportions with object-contain.
 */
export default function BrandLogo({
  className = 'h-[48px] w-auto max-w-none object-contain object-left sm:h-[62px]',
  alt = BRAND_LOGO_ALT,
  priority = false,
}) {
  return (
    <img
      src={BRAND_LOGO_PATH}
      alt={alt || BUSINESS.name}
      width={BRAND_LOGO_WIDTH}
      height={BRAND_LOGO_HEIGHT}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      loading={priority ? 'eager' : 'lazy'}
      draggable={false}
      className={className}
    />
  )
}
