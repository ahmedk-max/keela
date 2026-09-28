/* =========================================================================
   Keela — "Warm" design language (soft-rounded fintech on sand & espresso).
   Semantic references for inline elements, backed by styles/tokens.css.
   `accent` is the terracotta ember; warm earth tones throughout.
   ========================================================================= */
import { createContext, useContext } from 'react'

// The palette lives in styles/tokens.css. SVG accepts CSS variables directly.
const tokens = {
  bg: 'var(--k-bg)', card: 'var(--c-paper)', card2: 'var(--c-soft)',
  ink: 'var(--c-ink)', ink2: 'var(--c-muted)', ink3: 'var(--c-muted)',
  line: 'var(--c-line)', track: 'var(--c-track)', darkcard: 'var(--c-dark)',
  tabbar: 'var(--c-tabbar)', accent: 'var(--c-accent)', accentPress: 'var(--c-action)', accentSoft: 'var(--c-wash)',
  onAccent: 'var(--c-on-action)', onDark: 'var(--c-on-dark)', onDarkDim: 'var(--c-on-dark-muted)',
  amber: 'var(--c-amber)', rose: 'var(--c-rose)', green: 'var(--c-green)', blue: 'var(--c-blue)',
  loss: 'var(--c-loss)', gain: 'var(--c-gain)', flat: 'var(--c-flat)', shadow: 'var(--c-shadow)', tile: 'var(--c-soft)',
};
export const LIGHT = { name: 'light', ...tokens };
export const DARK = { name: 'dark', ...tokens };
export const themeFor = (name) => name === 'dark' ? DARK : LIGHT;

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
