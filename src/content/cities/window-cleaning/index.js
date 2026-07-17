/**
 * Window Cleaning city landing pages — one per SERVICE_CITIES entry.
 */
import modesto from './modesto'
import salida from './salida'
import riverbank from './riverbank'
import oakdale from './oakdale'
import ripon from './ripon'
import turlock from './turlock'
import ceres from './ceres'
import tracy from './tracy'
import stockton from './stockton'
import manteca from './manteca'

export const WINDOW_CLEANING_CITY_PAGES = [
  modesto,
  salida,
  riverbank,
  oakdale,
  ripon,
  turlock,
  ceres,
  tracy,
  stockton,
  manteca,
]

export const WINDOW_CLEANING_CITY_SLUGS = WINDOW_CLEANING_CITY_PAGES.map((p) => p.citySlug)

export function getWindowCleaningCityPage(citySlug) {
  return WINDOW_CLEANING_CITY_PAGES.find((p) => p.citySlug === citySlug) ?? null
}

export function getOtherWindowCleaningCities(currentSlug) {
  return WINDOW_CLEANING_CITY_PAGES.filter((p) => p.citySlug !== currentSlug)
}
