/**
 * Window Cleaning city landing pages — slugs must match SERVICE_CITIES (excluding Manteca).
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
]

export const WINDOW_CLEANING_CITY_SLUGS = WINDOW_CLEANING_CITY_PAGES.map((p) => p.citySlug)

export function getWindowCleaningCityPage(citySlug) {
  return WINDOW_CLEANING_CITY_PAGES.find((p) => p.citySlug === citySlug) ?? null
}

export function getOtherWindowCleaningCities(currentSlug) {
  return WINDOW_CLEANING_CITY_PAGES.filter((p) => p.citySlug !== currentSlug)
}
