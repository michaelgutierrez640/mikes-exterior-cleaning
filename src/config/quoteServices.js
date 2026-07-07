export const QUOTE_SERVICES = [
  {
    id: 'window-cleaning',
    name: 'Window Cleaning',
    shortDescription: 'Interior & exterior glass, tracks, and screens',
    icon: 'windows',
  },
  {
    id: 'pressure-washing',
    name: 'Pressure Washing',
    shortDescription: 'Driveways, patios, siding, and walkways',
    icon: 'pressure',
  },
  {
    id: 'gutter-cleaning',
    name: 'Gutter Cleaning',
    shortDescription: 'Debris removal, downspout flushing, flow testing',
    icon: 'gutters',
  },
  {
    id: 'solar-panel-cleaning',
    name: 'Solar Panel Cleaning',
    shortDescription: 'Safe roof access and purified-water rinsing',
    icon: 'solar',
  },
]

export const WINDOW_COUNT_OPTIONS = [
  { value: '10', label: 'Up to 10 windows', count: 10 },
  { value: '15', label: '11–15 windows', count: 15 },
  { value: '20', label: '16–20 windows', count: 20 },
  { value: '25', label: '21–25 windows', count: 25 },
  { value: '30', label: '26–30 windows', count: 30 },
  { value: '40', label: '31–40 windows', count: 40 },
  { value: '50', label: '40+ windows', count: 50 },
]

export const CLEANING_TYPE_OPTIONS = [
  { value: 'exterior', label: 'Exterior only' },
  { value: 'both', label: 'Interior & exterior' },
]

export const STORY_OPTIONS = [
  { value: '1', label: '1 story', multiplier: 1 },
  { value: '2', label: '2 stories', multiplier: 1.25 },
  { value: '3', label: '3+ stories', multiplier: 1.45 },
]

export const PRESSURE_SURFACE_OPTIONS = [
  { value: 'driveway', label: 'Driveway / patio' },
  { value: 'siding', label: 'House siding' },
  { value: 'both', label: 'Driveway & siding' },
]

export const SQFT_OPTIONS = [
  { value: '200', label: 'Up to 200 sq ft', sqft: 200 },
  { value: '400', label: '201–400 sq ft', sqft: 400 },
  { value: '600', label: '401–600 sq ft', sqft: 600 },
  { value: '800', label: '601–800 sq ft', sqft: 800 },
  { value: '1000', label: '801–1,000 sq ft', sqft: 1000 },
  { value: '1500', label: '1,001–1,500 sq ft', sqft: 1500 },
  { value: '2000', label: '1,500+ sq ft', sqft: 2000 },
]

export const GUTTER_LENGTH_OPTIONS = [
  { value: '100', label: 'Up to 100 linear ft', feet: 100 },
  { value: '150', label: '101–150 linear ft', feet: 150 },
  { value: '200', label: '151–200 linear ft', feet: 200 },
  { value: '250', label: '201–250 linear ft', feet: 250 },
  { value: '300', label: '250+ linear ft', feet: 300 },
]

export const PANEL_COUNT_OPTIONS = [
  { value: '8', label: 'Up to 8 panels', count: 8 },
  { value: '12', label: '9–12 panels', count: 12 },
  { value: '16', label: '13–16 panels', count: 16 },
  { value: '20', label: '17–20 panels', count: 20 },
  { value: '24', label: '21–24 panels', count: 24 },
  { value: '30', label: '25–30 panels', count: 30 },
  { value: '40', label: '30+ panels', count: 40 },
]

export const DEFAULT_ANSWERS = {
  'window-cleaning': {
    windowCount: '',
    cleaningType: 'exterior',
    stories: '1',
  },
  'pressure-washing': {
    surface: 'driveway',
    sqft: '',
    stories: '1',
  },
  'gutter-cleaning': {
    linearFeet: '',
    stories: '1',
  },
  'solar-panel-cleaning': {
    panelCount: '',
    stories: '1',
  },
}

export function getServiceById(id) {
  return QUOTE_SERVICES.find((s) => s.id === id)
}
