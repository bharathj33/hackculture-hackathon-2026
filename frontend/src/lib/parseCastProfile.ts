import type { CastProfile } from '@/mock/types'

/** Structured fields parsed from the backend cast summary string. */
export interface ParsedCastProfile extends CastProfile {
  displayName: string
  gender: 'She' | 'He' | null
  age: number | null
  city: string | null
  market: string | null
  language: string | null
  languageLabel: string | null
  genre: string | null
  habit: string | null
  bio: string | null
  isCritic: boolean
  /** Compact metadata chips for roster cards — never the bio paragraph. */
  cardMeta: string[]
}

const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

const FEMALE_NAMES = new Set([
  'Asha', 'Meena', 'Divya', 'Pooja', 'Neha', 'Lata', 'Sunita', 'Priya', 'Kavya',
  'Rekha', 'Tara', 'Isha', 'Bina', 'Uma', 'Zoya',
])

const MALE_NAMES = new Set([
  'Ravi', 'Kiran', 'Sanjay', 'Amit', 'Vikram', 'Rohan', 'Dev', 'Arjun',
  'Nikhil', 'Suresh', 'Manoj', 'Gopal', 'Harish', 'Yash', 'Farhan',
])

const LISTENER_RE =
  /^([^,]+), (\d+), lives in ([^ (]+) \(market ([^,]+), language ([^)]+)\)\. Favorite genre: ([^;]+); listening habit: ([^.]+)\. (.+)$/s

function displayNameFromHandle(handle: string): string {
  const match = handle.match(/^(.+?)-L\d+$/)
  return match?.[1] ?? handle
}

function inferGender(name: string): ParsedCastProfile['gender'] {
  if (FEMALE_NAMES.has(name)) return 'She'
  if (MALE_NAMES.has(name)) return 'He'
  return null
}

function languageLabel(code: string | null): string | null {
  if (!code) return null
  return languageNames.of(code) ?? code.toUpperCase()
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function parseCastProfile(profile: CastProfile): ParsedCastProfile {
  const displayName = displayNameFromHandle(profile.handle)
  const isCritic = profile.group_label === 'Critic'
  const match = profile.profile.match(LISTENER_RE)

  if (!match) {
    return {
      ...profile,
      displayName,
      gender: isCritic ? null : inferGender(displayName),
      age: null,
      city: null,
      market: null,
      language: null,
      languageLabel: null,
      genre: null,
      habit: null,
      bio: isCritic ? profile.profile : null,
      isCritic,
      cardMeta: isCritic ? ['Professional critic'] : [profile.group_label],
    }
  }

  const [, , ageRaw, city, market, language, genre, habit, bio] = match
  const genreLabel = titleCase(genre.trim())
  const habitLabel = titleCase(habit.trim())

  return {
    ...profile,
    displayName,
    gender: inferGender(displayName),
    age: Number.parseInt(ageRaw, 10),
    city: city.trim(),
    market: market.trim(),
    language: language.trim(),
    languageLabel: languageLabel(language.trim()),
    genre: genreLabel,
    habit: habitLabel,
    bio: bio.trim(),
    isCritic: false,
    cardMeta: [`${ageRaw} yrs`, city.trim(), genreLabel],
  }
}

export const GROUP_ACCENT: Record<string, string> = {
  Fan: 'bg-chart-1',
  'Casual listener': 'bg-chart-2',
  'Genre purist': 'bg-chart-3',
  Critic: 'bg-chart-4',
}
