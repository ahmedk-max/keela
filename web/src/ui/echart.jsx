/* Keela — ECharts wrapper. ECharts is heavy, so it's loaded as a lazy chunk
   (dynamic import) — the app shell stays light and charts hydrate a beat later.
   SVG renderer for crisp hairlines, transparent background, theme-aware: reads the
   Qahwa CSS variables and re-renders when the data-theme attribute flips. */
import { useRef, useEffect } from 'react'

// Load + register only what we use, once, as a split chunk.
let _echarts
function loadECharts() {
  if (!_echarts) {
    _echarts = Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ]).then(([core, charts, comps, renderers]) => {
      core.use([charts.LineChart, charts.BarChart, comps.GridComponent, comps.MarkLineComponent, comps.TooltipComponent, renderers.SVGRenderer])
      return core
    })
  }
  return _echarts
}

export function hexToRgba(hex, a) {
  const h = (hex || '').trim().replace('#', '')
  if (h.length < 3) return hex
  const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
  const n = parseInt(f, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Resolve the live Qahwa palette from the chart element's inherited CSS variables.
export function themeColors(el) {
  const cs = getComputedStyle(el)
  const v = (n) => cs.getPropertyValue(n).trim()
  return {
    accent: v('--qahwa-accent'),
    fg1: v('--qahwa-fg-1'), fg2: v('--qahwa-fg-2'), fg3: v('--qahwa-fg-3'),
    border: v('--qahwa-border'), borderStrong: v('--qahwa-border-strong'),
    gain: v('--qahwa-gain'), loss: v('--qahwa-loss'),
    canvas: v('--qahwa-canvas'),
  }
}

/* Generic chart host. `make(colors) => echarts option`; `sig` is a primitive that
   changes when the data changes (so we re-apply without re-initialising). */
export function EChart({ make, sig, height = 110, ariaLabel }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const makeRef = useRef(make)
  makeRef.current = make

  useEffect(() => {
    const el = ref.current
    let killed = false, ro, mo
    loadECharts().then((echarts) => {
      if (killed || !el) return
      const chart = echarts.init(el, null, { renderer: 'svg' })
      chartRef.current = chart
      const apply = () => chart.setOption(makeRef.current(themeColors(el)), true)
      apply()
      ro = new ResizeObserver(() => chart.resize())
      ro.observe(el)
      const root = el.closest('[data-theme]') || document.body
      mo = new MutationObserver(apply)
      mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    })
    return () => {
      killed = true
      if (ro) ro.disconnect()
      if (mo) mo.disconnect()
      if (chartRef.current) { chartRef.current.dispose(); chartRef.current = null }
    }
  }, [])

  useEffect(() => {
    if (chartRef.current) chartRef.current.setOption(makeRef.current(themeColors(ref.current)), true)
  }, [sig])

  return <div ref={ref} role="img" aria-label={ariaLabel} style={{ width: '100%', height }} />
}

/* Single-series area trend (sparkline replacement). tone ∈ accent | gain | loss. */
export function TrendChart({ values, height = 46, tone = 'accent', area = true }) {
  const sig = values.join(',') + '|' + tone
  const make = (c) => {
    const color = c[tone] || c.accent
    const min = Math.min(...values), max = Math.max(...values), span = (max - min) || 1
    return {
      animation: true, animationDuration: 600,
      grid: { left: 0, right: 0, top: 6, bottom: 2 },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: values.map((_, i) => i) },
      yAxis: { type: 'value', show: false, min: min - span * 0.12, max: max + span * 0.12 },
      series: [{
        type: 'line', data: values, smooth: true, showSymbol: false, silent: true,
        lineStyle: { color, width: 1.75 },
        areaStyle: area ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: hexToRgba(color, 0.18) }, { offset: 1, color: hexToRgba(color, 0) },
        ] } } : undefined,
      }],
    }
  }
  return <EChart make={make} sig={sig} height={height} ariaLabel="trend" />
}
