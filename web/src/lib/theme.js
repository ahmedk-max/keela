/* =========================================================================
   Keela — "Warm" design language (soft-rounded fintech on sand & espresso).
   The single source of truth for colour. Light & dark theme objects, consumed
   inline via the ThemeContext (matches the design prototype's `theme()` model).
   `accent` is the terracotta ember; warm earth tones throughout.
   ========================================================================= */
import { createContext, useContext } from 'react'

export const LIGHT = {
  name: 'light',
  bg: '#ECE5D6', card: '#FDFBF6', card2: '#F2EBDC',
  ink: '#2A2521', ink2: '#7A7163', ink3: '#A8A091',
  line: '#E0D8C6', track: '#E4DCC9', darkcard: '#241F1A',
  tabbar: 'rgba(253,251,246,.96)',
  accent: '#C4623A', accentPress: '#8B4220', accentSoft: '#F3E2D5',
  onAccent: '#FFFFFF', onDark: '#F3EEE3', onDarkDim: 'rgba(243,238,227,.55)',
  amber: '#C68A3C', rose: '#B16A88', green: '#5C9A6A', blue: '#5570B8',
  loss: '#B5403A', gain: '#3D7A4A', flat: '#BEB6A3',
  shadow: '0 1px 2px rgba(74,54,35,.05), 0 14px 34px -18px rgba(74,54,35,.18)',
  tile: '#F2EBDC',
}

export const DARK = {
  name: 'dark',
  bg: '#16120F', card: '#221E1A', card2: '#2E2823',
  ink: '#F4EFE6', ink2: '#B5AB9C', ink3: '#837A6D',
  line: '#322B25', track: '#392F28', darkcard: '#312A25',
  tabbar: 'rgba(40,34,30,.94)',
  accent: '#D6794C', accentPress: '#B5673E', accentSoft: '#3A271D',
  onAccent: '#FFFFFF', onDark: '#F3EEE3', onDarkDim: 'rgba(243,238,227,.6)',
  amber: '#E0A23A', rose: '#C2607F', green: '#5FA873', blue: '#6E86D8',
  loss: '#E0786C', gain: '#5FA873', flat: '#6B6356',
  shadow: '0 1px 2px rgba(0,0,0,.3), 0 18px 40px -22px rgba(0,0,0,.7)',
  tile: '#211C18',
}

export const themeFor = (name) => (name === 'dark' ? DARK : LIGHT)

// Swatch palette for goal / portfolio colours and the colour picker.
export const SWATCHES = [
  '#C4623A', '#E0913A', '#5C9A6A', '#C2607F', '#5570B8', '#A86A92',
  '#C2574E', '#8A6CB0', '#6B8A7A', '#C99A52', '#6F7787', '#94897A',
]

export const ThemeContext = createContext(LIGHT)
export const useTheme = () => useContext(ThemeContext)

// Soft tile behind a coloured glyph — the accentSoft-style wash for any hue.
export const tint = (color, pct = 13, base = 'var(--k-card)') =>
  `color-mix(in srgb, ${color} ${pct}%, ${base})`
