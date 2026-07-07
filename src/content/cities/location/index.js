import modesto from './modesto'
import salida from './salida'
import riverbank from './riverbank'
import ceres from './ceres'
import turlock from './turlock'
import ripon from './ripon'
import oakdale from './oakdale'

export const LOCATION_PAGES = [modesto, salida, riverbank, ceres, turlock, ripon, oakdale]

export const PRIORITY_LOCATION_SLUGS = LOCATION_PAGES.map((p) => p.citySlug)

export function getLocationPage(citySlug) {
  return LOCATION_PAGES.find((p) => p.citySlug === citySlug) ?? null
}

export function getOtherLocationPages(currentSlug) {
  return LOCATION_PAGES.filter((p) => p.citySlug !== currentSlug)
}
