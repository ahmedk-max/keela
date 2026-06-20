/* Keela — icon + colour system.
   Hand-drawn 1px line icons (Lucide-derived geometry), tuned to mid-tone hues that
   read on BOTH the parchment (light) and espresso (dark) canvases. Categories,
   ledger entries, upcoming, wishlist and subscriptions all draw from here so the
   app reads with life instead of bare letter codes. */
import React from 'react'
import {
  siNetflix, siSpotify, siIcloud, siYoutube, siYoutubemusic, siApplemusic,
  siAppletv, siNotion, siFigma, siGoogledrive, siDropbox,
} from 'simple-icons'

const svg = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

/* ---------- Category badges (icon + colour) ---------- */
export const CAT = {
  Food: { color: '#C4623A', icon: svg(<>
    <path d="M4 9h13v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
    <path d="M17 10h2a2.5 2.5 0 0 1 0 5h-2" />
    <path d="M7 2v3M11 2v3M15 2v3" /></>) },
  Groceries: { color: '#4E8A5A', icon: svg(<>
    <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
    <path d="M2 2h2l2.6 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 1.95-1.57L21.5 7H5.1" /></>) },
  Transport: { color: '#6E8CA0', icon: svg(<>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>) },
  Shopping: { color: '#B07A2E', icon: svg(<>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>) },
  Health: { color: '#C25A52', icon: svg(<>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.2 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.3" /></>) },
  Personal: { color: '#8A6C9A', icon: svg(<>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>) },
  Bills: { color: '#8A7C6C', icon: svg(<>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></>) },
  Housing: { color: '#6B8A7A', icon: svg(<>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" /></>) },
  Utilities: { color: '#C99A52', icon: svg(<>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></>) },
  Travel: { color: '#4E8C8C', icon: svg(<>
    <path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.8l3.3 4.3-2.4 2.4-2-.4a.5.5 0 0 0-.5.8L5.8 18l1.9 2.6a.5.5 0 0 0 .8-.1l2.4-2.4 4.3 3.3a.5.5 0 0 0 .8-.5Z" /></>) },
  Entertainment: { color: '#9A5C7A', icon: svg(<>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v14" strokeDasharray="2 2" /></>) },
  Education: { color: '#5C6CA0', icon: svg(<>
    <path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" /></>) },
  Gifts: { color: '#C25A7A', icon: svg(<>
    <path d="M20 12v9H4v-9" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>) },
  Subscriptions: { color: '#C4623A', icon: svg(<>
    <path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>) },
  Other: { color: '#9A8E80', icon: svg(<>
    <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
    <circle cx="7.5" cy="7.5" r=".6" fill="currentColor" /></>) },
}

export const getCat = (name) => CAT[name] || null

/* ---------- Ledger entry types (bucket / holding activity) ----------
   `tone` resolves to a theme colour at render time via entryMeta(type, th). */
export const ENTRY = {
  deposit:    { tone: 'gain', sign: '+', label: 'Deposit',    icon: svg(<><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>) },
  withdrawal: { tone: 'loss', sign: '−', label: 'Withdrawal', icon: svg(<><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>) },
  withdraw:   { tone: 'loss', sign: '−', label: 'Withdraw',   icon: svg(<><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>) },
  spend:      { tone: 'loss', sign: '−', label: 'Spent',      icon: svg(<><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>) },
  buy:        { tone: 'gain', sign: '+', label: 'Buy',        icon: svg(<><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>) },
  sell:       { tone: 'loss', sign: '−', label: 'Sell',       icon: svg(<><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>) },
  initial:    { tone: 'ink3', sign: '',  label: 'Opening',    icon: svg(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>) },
  update:     { tone: 'accent', sign: '', label: 'Update',    icon: svg(<><path d="m3 17 6-6 4 4 8-8" /><path d="M17 7h4v4" /></>) },
}
export const getEntry = (type) => ENTRY[type] || ENTRY.update
// Resolve an entry's display colour against the active theme object.
export const entryMeta = (type, th) => {
  const e = ENTRY[type] || ENTRY.update
  return { ...e, color: th[e.tone] || th.accent }
}

/* ---------- Misc badges ---------- */
export const MISC = {
  calendar: svg(<><rect x="3" y="4" width="18" height="18" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  star: svg(<><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" /></>),
}
export const UPCOMING_COLOR = '#6E8CA0'

/* ---------- Subscription company logos (Simple Icons, bundled / offline) ----------
   Matched by name. Rendered in the brand colour via currentColor so black logos
   (Apple TV etc.) flip with the theme. Returns null → caller falls back to the
   generic Subscriptions badge. */
const SUBS = [
  { re: /netflix/i, ic: siNetflix },
  { re: /spotify/i, ic: siSpotify },
  { re: /you ?tube ?music/i, ic: siYoutubemusic },
  { re: /you ?tube/i, ic: siYoutube },
  { re: /apple ?music/i, ic: siApplemusic },
  { re: /apple ?tv/i, ic: siAppletv },
  { re: /icloud|apple ?one/i, ic: siIcloud },
  { re: /notion/i, ic: siNotion },
  { re: /figma/i, ic: siFigma },
  { re: /google ?(drive|one)/i, ic: siGoogledrive },
  { re: /dropbox/i, ic: siDropbox },
]

export function subLogo(name) {
  if (!name) return null
  const m = SUBS.find((s) => s.re.test(name))
  if (!m || !m.ic) return null
  // Near-black brand marks (Apple TV, Notion) follow the theme foreground via
  // currentColor (the caller sets colour on the tile).
  const dark = /^0{2}/.test(m.ic.hex)
  const color = dark ? 'currentColor' : '#' + m.ic.hex
  const icon = (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={m.ic.path} /></svg>
  )
  return { color, icon }
}
