/**
 * dsh-token-dog — Client half.
 *
 * One page in two views: the overview (range totals, a per-day stacked bar chart,
 * model and session rankings, and a year-long calendar heatmap) and a model detail
 * (the same day chart for one model plus every session that spent it).
 *
 * All numbers arrive from the Host route `/token-dog/usage`; this module only
 * aggregates, so the browser never keeps a second ledger.
 */
window.__ModuleLoader__.load({
  id: 'dsh-token-dog',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    const NS = 'token-dog'
    const ENDPOINT = 'token-dog/usage'
    const RANGES = ['7', '30', '90', 'all']
    const PANEL_ID = 'token-dog'
    const CALENDAR_WEEKS = 52
    const MAX_BARS = 120
    const SEGMENT_LIMIT = 6
    const FETCH_TIMEOUT_MS = 30_000

    const DICTS = {
      zh: {
        'nav': 'Token 用量',
        'pageSub': '统计每个会话与模型的 Token 消耗',
        'updated': '更新于 {time}',
        'refresh': '刷新',
        'theme': '主题色',
        'theme.slate': '雾蓝',
        'theme.teal': '青',
        'theme.moss': '苔绿',
        'theme.sand': '麦',
        'theme.clay': '陶土',
        'theme.mauve': '藕紫',
        'theme.rose': '豆沙',
        'theme.gray': '中性',
        'theme.custom': '自定义',
        'sidebar': '侧栏图标',
        'depth': '浓淡',
        'depth.soft': '淡',
        'depth.medium': '中',
        'depth.bold': '浓',
        'refreshing': '正在刷新…',
        'loading': '正在汇总会话用量…',
        'loadFailed': '读取用量失败：{error}',
        'retry': '重试',
        'empty': '这段时间还没有可统计的用量。发起一次对话后再回来看看。',
        'range.7': '近 7 天',
        'range.30': '近 30 天',
        'range.90': '近 90 天',
        'range.all': '全部',
        'total': '总 Token',
        'cacheRate': '缓存命中率',
        'output': '输出 Token',
        'calls': '调用次数',
        'sub.sessions': '{n} 个会话',
        'sub.cache': '缓存读 {cache} / 输入 {input}',
        'sub.share': '占总量的 {p}',
        'sub.avg': '日均 {n} 次',
        'models': '模型用量',
        'sessions': '会话排行',
        'allSessions': '全部会话',
        'sessionsNote': '按用量排序',
        'clickModel': '点击模型查看它的全部会话',
        'back': '返回',
        'daily': '每日消耗',
        'dailyStacked': '按会话堆叠',
        'peak': '峰值 {n}',
        'recentBars': '最近 {n} 天',
        'others': '其他',
        'calendar': '活跃日历',
        'calendarNote': '近一年 · 悬停查看每日用量',
        'calendarSummary': '{days} 天有记录 · 共 {tokens}',
        'less': '少',
        'more': '多',
        'noData': '这段时间没有用量',
        'untitled': '未命名会话',
        'callsCount': '{n} 次调用',
        'modelsCount': '{n} 个模型',
        'lastDay': '最后 {date}',
        'tip.date': '{month} 月 {day} 日 {weekday}',
        'tip.tokens': '总 Token',
        'tip.calls': '调用',
        'tip.sessions': '会话',
        'tip.models': '模型占比',
        'tip.empty': '无用量',
        'tip.breakdown': '会话构成',
        'partial': '{n} 个会话读取失败，未计入统计',
        'skipped': '另有 {n} 个更早的会话未纳入统计',
        'weekdays': '一,三,五',
      },
      en: {
        'nav': 'Token Usage',
        'pageSub': 'Tokens spent per session and per model',
        'updated': 'Updated {time}',
        'refresh': 'Refresh',
        'theme': 'Theme',
        'theme.slate': 'Slate',
        'theme.teal': 'Teal',
        'theme.moss': 'Moss',
        'theme.sand': 'Sand',
        'theme.clay': 'Clay',
        'theme.mauve': 'Mauve',
        'theme.rose': 'Rose',
        'theme.gray': 'Neutral',
        'theme.custom': 'Custom',
        'sidebar': 'Sidebar icon',
        'depth': 'Strength',
        'depth.soft': 'Soft',
        'depth.medium': 'Normal',
        'depth.bold': 'Strong',
        'refreshing': 'Refreshing…',
        'loading': 'Summing up session usage…',
        'loadFailed': 'Could not read usage: {error}',
        'retry': 'Retry',
        'empty': 'No usage in this range yet. Start a conversation and come back.',
        'range.7': '7 days',
        'range.30': '30 days',
        'range.90': '90 days',
        'range.all': 'All',
        'total': 'Total tokens',
        'cacheRate': 'Cache hit rate',
        'output': 'Output tokens',
        'calls': 'Calls',
        'sub.sessions': '{n} sessions',
        'sub.cache': 'cache {cache} / input {input}',
        'sub.share': '{p} of total',
        'sub.avg': '{n} calls a day',
        'models': 'Models',
        'sessions': 'Sessions',
        'allSessions': 'All sessions',
        'sessionsNote': 'by tokens',
        'clickModel': 'click a model for all its sessions',
        'back': 'Back',
        'daily': 'Daily usage',
        'dailyStacked': 'stacked by session',
        'peak': 'peak {n}',
        'recentBars': 'last {n} days',
        'others': 'Others',
        'calendar': 'Activity calendar',
        'calendarNote': 'last year · hover a day for its usage',
        'calendarSummary': '{days} active days · {tokens}',
        'less': 'Less',
        'more': 'More',
        'noData': 'No usage in this range',
        'untitled': 'Untitled session',
        'callsCount': '{n} calls',
        'modelsCount': '{n} models',
        'lastDay': 'last {date}',
        'tip.date': '{weekday}, {month}/{day}',
        'tip.tokens': 'Tokens',
        'tip.calls': 'Calls',
        'tip.sessions': 'Sessions',
        'tip.models': 'Models by share',
        'tip.empty': 'No usage',
        'tip.breakdown': 'Sessions',
        'partial': '{n} sessions could not be read and are not counted',
        'skipped': '{n} older sessions are outside the scan window',
        'weekdays': 'Mon,Wed,Fri',
      },
    }

    /** Interpolate `{name}` placeholders; an unknown name stays visible instead of blank. */
    function interpolate(text, params) {
      return String(text).replace(/\{(\w+)\}/g, (whole, name) => (
        params !== undefined && params[name] !== undefined ? String(params[name]) : whole
      ))
    }

    function createTranslate(locale) {
      let bound
      if (locale !== undefined && locale !== null && typeof locale.bind === 'function') {
        try {
          bound = locale.bind(NS)
        } catch {
          bound = undefined
        }
      }
      return (key, params) => {
        let text
        if (bound !== undefined) {
          try {
            const value = bound(key)
            if (typeof value === 'string' && value !== key) text = value
          } catch {
            text = undefined
          }
        }
        if (text === undefined) text = DICTS.zh[key] ?? key
        return interpolate(text, params)
      }
    }

    function compactNumber(value) {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return '0'
      if (n >= 1e9) return `${trimZero(n / 1e9)}B`
      if (n >= 1e6) return `${trimZero(n / 1e6)}M`
      if (n >= 1e3) return `${trimZero(n / 1e3)}K`
      return String(Math.round(n))
    }

    function trimZero(value) {
      const fixed = value >= 100 ? Math.round(value).toString() : value.toFixed(1)
      return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed
    }

    function percentOf(part, total) {
      if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return '0%'
      const ratio = (part / total) * 100
      if (ratio > 0 && ratio < 1) return '<1%'
      return `${Math.round(ratio)}%`
    }

    function totalOf(row) {
      return row.input + row.cacheRead + row.cacheWrite + row.output
    }

    function rowsOf(data) {
      return Array.isArray(data?.rows) ? data.rows : []
    }

    function sessionsOf(data) {
      return data !== null && typeof data?.sessions === 'object' && data.sessions !== null ? data.sessions : {}
    }

    function modelKeyOf(row) {
      return `${row.provider}\u0000${row.model}`
    }

    // ---------------------------------------------------------------- dates

    function dateKey(date) {
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${date.getFullYear()}-${month}-${day}`
    }

    function parseDay(key) {
      const parts = String(key).split('-')
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12)
    }

    function startOfWeek(date) {
      const copy = new Date(date)
      copy.setHours(12, 0, 0, 0)
      copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
      return copy
    }

    function rangeStart(rangeId, today) {
      if (rangeId === 'all') return null
      const days = Number(rangeId)
      if (!Number.isFinite(days) || days <= 0) return null
      const start = new Date(today)
      start.setDate(start.getDate() - (days - 1))
      return dateKey(start)
    }

    function dayLabel(key, weekday, t) {
      const date = parseDay(key)
      return t('tip.date', { month: date.getMonth() + 1, day: date.getDate(), weekday })
    }

    function shortDay(key, localeTag) {
      const date = parseDay(key)
      try {
        return new Intl.DateTimeFormat(localeTag, { month: 'numeric', day: 'numeric' }).format(date)
      } catch {
        return `${date.getMonth() + 1}/${date.getDate()}`
      }
    }

    function timeLabel(ms) {
      try {
        return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
      } catch {
        return ''
      }
    }

    function monthLabel(date, localeTag) {
      try {
        return new Intl.DateTimeFormat(localeTag, { month: 'short' }).format(date)
      } catch {
        return `${date.getMonth() + 1}`
      }
    }

    function weekdayLabel(date, localeTag) {
      try {
        return new Intl.DateTimeFormat(localeTag, { weekday: 'short' }).format(date)
      } catch {
        return ''
      }
    }

    function modelName(model) {
      return typeof model === 'string' && model !== '' ? model : 'unknown'
    }

    function folderName(cwd) {
      if (typeof cwd !== 'string') return ''
      const parts = cwd.split('/').filter((part) => part !== '')
      return parts.length > 0 ? parts[parts.length - 1] : ''
    }

    function sessionName(meta, id, t) {
      const entry = meta[id]
      if (entry !== undefined) {
        if (typeof entry.title === 'string' && entry.title !== '') return entry.title
        const folder = folderName(entry.cwd)
        if (folder !== '') return folder
      }
      return t('untitled')
    }

    // -------------------------------------------------------------- fetching

    async function fetchUsage(force, signal) {
      const query = `?tz=${encodeURIComponent(detectTimeZone())}${force ? '&refresh=1' : ''}`
      let response
      try {
        response = await fetch(ENDPOINT + query, { signal, cache: 'no-store', headers: { accept: 'application/json' } })
      } catch (error) {
        if (signal !== undefined && signal.aborted) throw error
        response = undefined
      }
      // A sub-path deployment resolves the relative URL elsewhere; retry at the origin root.
      if (response === undefined || response.status === 404) {
        response = await fetch(`/${ENDPOINT}${query}`, { signal, cache: 'no-store', headers: { accept: 'application/json' } })
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      if (body === null || typeof body !== 'object' || body.ok !== true) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'invalid response')
      }
      return body
    }

    function detectTimeZone() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
      } catch {
        return 'UTC'
      }
    }

    function useUsage() {
      const [state, setState] = useState({ status: 'loading', data: null, error: null })
      const [nonce, setNonce] = useState(0)
      const force = useRef(false)

      useEffect(() => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        let alive = true
        setState((prev) => (prev.data === null
          ? { status: 'loading', data: null, error: null }
          : { status: 'refreshing', data: prev.data, error: null }))
        fetchUsage(force.current, controller.signal)
          .then((data) => {
            if (alive) setState({ status: 'ready', data, error: null })
          })
          .catch((error) => {
            if (!alive) return
            setState((prev) => ({
              status: prev.data === null ? 'error' : 'ready',
              data: prev.data,
              error: error instanceof Error ? error.message : String(error),
            }))
          })
          .finally(() => clearTimeout(timer))
        force.current = false
        return () => {
          alive = false
          clearTimeout(timer)
          controller.abort()
        }
      }, [nonce])

      const refresh = useCallback(() => {
        force.current = true
        setNonce((value) => value + 1)
      }, [])

      return { ...state, refresh }
    }

    const SIDEBAR_KEY = 'dsh-token-dog:sidebar'
    const THEME_KEY = 'dsh-token-dog:theme'
    // Whether the rail shows this plugin's icon; shared by the Host-less half
    // (`apply`, which owns the registration) and the page (which flips it).
    function createSidebarPreference() {
      let value
      try {
        value = window.localStorage.getItem(SIDEBAR_KEY) !== 'hidden'
      } catch {
        value = true
      }
      const listeners = new Set()
      return {
        get: () => value,
        set(next) {
          if (next === value) return
          value = next
          try {
            window.localStorage.setItem(SIDEBAR_KEY, next ? 'shown' : 'hidden')
          } catch {
            // A storage-denied browser keeps the choice for this page only.
          }
          for (const listener of [...listeners]) {
            try {
              listener()
            } catch {
              // One stale listener must not block the rest.
            }
          }
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
    }

    const sidebarPreference = createSidebarPreference()

    const DEPTH_KEY = 'dsh-token-dog:depth'
    const CUSTOM_KEY = 'dsh-token-dog:custom'
    // Muted, low-saturation accents: present on the page without shouting.
    const THEMES = [
      { id: 'slate', accent: '#5a7c9c' },
      { id: 'teal', accent: '#4f8b86' },
      { id: 'moss', accent: '#5f8663' },
      { id: 'sand', accent: '#a08455' },
      { id: 'clay', accent: '#a06f5c' },
      { id: 'mauve', accent: '#7d739e' },
      { id: 'rose', accent: '#a06a80' },
      { id: 'gray', accent: '#8a8f98' },
    ]
    const DEPTHS = ['soft', 'medium', 'bold']
    // Ids from the earlier pickers map onto the closest new tone.
    const THEME_ALIASES = { blue: 'slate', green: 'moss', amber: 'sand', violet: 'mauve', mono: 'gray' }

    function themeOf(id) {
      return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
    }

    function readCustom() {
      try {
        const stored = window.localStorage.getItem(CUSTOM_KEY)
        if (typeof stored === 'string' && /^#[0-9a-f]{6}$/i.test(stored)) return stored
      } catch {
        // Fall through to the seed colour.
      }
      return '#6b7f8f'
    }

    function readTheme() {
      try {
        const stored = window.localStorage.getItem(THEME_KEY)
        if (stored === 'custom') return 'custom'
        if (THEMES.some((theme) => theme.id === stored)) return stored
        if (THEME_ALIASES[stored] !== undefined) return THEME_ALIASES[stored]
        const legacy = window.localStorage.getItem('dsh-token-dog:tone.v2') ?? window.localStorage.getItem('dsh-token-dog:tone')
        if (legacy === 'mono') return 'gray'
      } catch {
        // A storage-denied browser simply starts from the default.
      }
      return 'slate'
    }

    function readDepth() {
      try {
        const stored = window.localStorage.getItem(DEPTH_KEY)
        if (DEPTHS.includes(stored)) return stored
      } catch {
        // Fall through to the default.
      }
      return 'medium'
    }

    function useSidebarIcon() {
      const [visible, setVisible] = useState(() => sidebarPreference.get())
      useEffect(() => sidebarPreference.subscribe(() => setVisible(sidebarPreference.get())), [])
      return [visible, (next) => sidebarPreference.set(next)]
    }

    function useLocaleTag(locale) {
      const read = useCallback(() => {
        try {
          const snapshot = typeof locale?.getLocale === 'function' ? locale.getLocale() : undefined
          return snapshot?.active ?? undefined
        } catch {
          return undefined
        }
      }, [locale])
      const [tag, setTag] = useState(read)
      useEffect(() => {
        if (locale === undefined || locale === null || typeof locale.subscribe !== 'function') return undefined
        const off = locale.subscribe(() => setTag(read()))
        return off
      }, [locale, read])
      return tag
    }

    // ----------------------------------------------------------- aggregation

    /** Fold rows into per-day, per-session and per-model totals. */
    function aggregate(rows) {
      const totals = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, calls: 0 }
      const days = new Map()
      const sessions = new Map()
      const models = new Map()

      for (const row of rows) {
        const tokens = totalOf(row)
        totals.input += row.input
        totals.cacheRead += row.cacheRead
        totals.cacheWrite += row.cacheWrite
        totals.output += row.output
        totals.calls += row.calls

        const day = days.get(row.day) ?? { day: row.day, tokens: 0, calls: 0, sessions: new Map() }
        day.tokens += tokens
        day.calls += row.calls
        day.sessions.set(row.session, (day.sessions.get(row.session) ?? 0) + tokens)
        days.set(row.day, day)

        const session = sessions.get(row.session) ?? { key: row.session, tokens: 0, calls: 0, models: new Set(), lastDay: '' }
        session.tokens += tokens
        session.calls += row.calls
        session.models.add(modelName(row.model))
        if (row.day > session.lastDay) session.lastDay = row.day
        sessions.set(row.session, session)

        const key = modelKeyOf(row)
        const model = models.get(key) ?? { key, name: modelName(row.model), provider: row.provider, tokens: 0, calls: 0, sessions: new Set() }
        model.tokens += tokens
        model.calls += row.calls
        model.sessions.add(row.session)
        models.set(key, model)
      }

      return {
        totals,
        totalTokens: totals.input + totals.cacheRead + totals.cacheWrite + totals.output,
        days,
        sessions,
        models,
        sessionCount: sessions.size,
      }
    }

    function inRange(data, start) {
      const rows = rowsOf(data)
      return start === null ? rows : rows.filter((row) => row.day >= start)
    }

    function toSeries(days) {
      return [...days.values()]
        .sort((a, b) => (a.day < b.day ? -1 : 1))
        .map((day) => {
          const ranked = [...day.sessions.entries()].sort((a, b) => b[1] - a[1])
          const segments = ranked.slice(0, SEGMENT_LIMIT).map(([key, tokens], index) => ({ key, tokens, shade: index }))
          const rest = ranked.slice(SEGMENT_LIMIT).reduce((sum, [, tokens]) => sum + tokens, 0)
          if (rest > 0) segments.push({ key: '__rest', tokens: rest, shade: SEGMENT_LIMIT })
          return { day: day.day, tokens: day.tokens, calls: day.calls, segments: segments.reverse() }
        })
    }

    function buildHome(data, rangeId) {
      const today = new Date()
      today.setHours(12, 0, 0, 0)
      const start = rangeStart(rangeId, today)
      const rows = inRange(data, start)
      const agg = aggregate(rows)
      const meta = sessionsOf(data)
      return {
        start,
        agg,
        totalTokens: agg.totalTokens,
        sessionCount: agg.sessionCount,
        dayCount: start === null ? spanDays(rows) : Number(rangeId),
        models: [...agg.models.values()].sort((a, b) => b.tokens - a.tokens),
        sessions: [...agg.sessions.values()]
          .map((entry) => ({
            ...entry,
            title: meta[entry.key]?.title ?? '',
            folder: folderName(meta[entry.key]?.cwd),
          }))
          .sort((a, b) => b.tokens - a.tokens)
          .slice(0, 8),
        series: toSeries(agg.days),
        meta,
      }
    }

    function buildModel(data, modelKey, rangeId) {
      const today = new Date()
      today.setHours(12, 0, 0, 0)
      const start = rangeStart(rangeId, today)
      const rows = inRange(data, start).filter((row) => modelKeyOf(row) === modelKey)
      const agg = aggregate(rows)
      const meta = sessionsOf(data)
      const first = rows[0]
      return {
        start,
        agg,
        modelKey,
        name: first === undefined ? '' : modelName(first.model),
        provider: first === undefined ? '' : first.provider,
        totalTokens: agg.totalTokens,
        sessionCount: agg.sessionCount,
        dayCount: start === null ? spanDays(rows) : Number(rangeId),
        series: toSeries(agg.days),
        sessions: [...agg.sessions.values()]
          .map((entry) => ({
            ...entry,
            title: meta[entry.key]?.title ?? '',
            folder: folderName(meta[entry.key]?.cwd),
          }))
          .sort((a, b) => b.tokens - a.tokens),
        meta,
      }
    }

    function spanDays(rows) {
      if (rows.length === 0) return 1
      let first = rows[0].day
      for (const row of rows) if (row.day < first) first = row.day
      const today = new Date()
      today.setHours(12, 0, 0, 0)
      return Math.max(1, Math.round((today.getTime() - parseDay(first).getTime()) / 86_400_000) + 1)
    }

    // ------------------------------------------------------------ components

    function StatCard({ label, value, sub }) {
      return h('div', { className: 'dtd-card' },
        h('div', { className: 'dtd-card-label' }, label),
        h('div', { className: 'dtd-card-value' }, value),
        sub === '' ? null : h('div', { className: 'dtd-card-sub' }, sub))
    }

    function RankRow({ title, amount, meta, share, onClick }) {
      const props = {
        className: onClick === undefined ? 'dtd-row' : 'dtd-row dtd-row-click',
        onClick,
        onKeyDown: onClick === undefined
          ? undefined
          : (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onClick()
            }
          },
      }
      if (onClick !== undefined) {
        props.role = 'button'
        props.tabIndex = 0
      }
      return h('div', props,
        h('div', { className: 'dtd-row-head' },
          h('span', { className: 'dtd-row-name', title }, title),
          h('span', { className: 'dtd-row-amount' }, amount)),
        h('div', { className: 'dtd-bar' }, h('i', { style: { width: `${Math.max(3, Math.min(100, share * 100))}%` } })),
        h('div', { className: 'dtd-row-meta', title: meta }, meta))
    }

    function Panel({ title, note, children }) {
      return h('section', { className: 'dtd-panel' },
        h('div', { className: 'dtd-panel-head' },
          h('span', { className: 'dtd-panel-title' }, title),
          h('span', { className: 'dtd-panel-note' }, note)),
        children)
    }

    function Cards({ totals, totalTokens, sessionCount, dayCount, t }) {
      return h('div', { className: 'dtd-cards' },
        h(StatCard, { label: t('total'), value: compactNumber(totalTokens), sub: t('sub.sessions', { n: sessionCount }) }),
        h(StatCard, {
          label: t('cacheRate'),
          value: percentOf(totals.cacheRead, totals.cacheRead + totals.input),
          sub: t('sub.cache', { cache: compactNumber(totals.cacheRead), input: compactNumber(totals.input) }),
        }),
        h(StatCard, {
          label: t('output'),
          value: compactNumber(totals.output),
          sub: t('sub.share', { p: percentOf(totals.output, totalTokens) }),
        }),
        h(StatCard, {
          label: t('calls'),
          value: compactNumber(totals.calls),
          sub: t('sub.avg', { n: dayCount > 0 ? (totals.calls / dayCount).toFixed(1) : '0' }),
        }))
    }

    /** Per-day bars, each stacked by the sessions that spent tokens that day. */
    function DayChart({ series, t, localeTag, labelOf }) {
      const rootRef = useRef(null)
      const [tip, setTip] = useState(null)
      const shown = series.length > MAX_BARS ? series.slice(series.length - MAX_BARS) : series
      const peak = shown.reduce((max, day) => Math.max(max, day.tokens), 1)
      // Few days spread out across the panel; many days keep a tight gap.
      const gap = shown.length > 40 ? 2 : shown.length > 20 ? 4 : 8

      const enter = (event, day) => {
        const names = [...day.segments]
          .filter((segment) => segment.key !== '__rest')
          .sort((a, b) => b.tokens - a.tokens)
          .slice(0, 4)
          .map((segment) => ({ key: segment.key, label: labelOf(segment.key), tokens: segment.tokens }))
        setTip({
          day: day.day,
          ...anchorOf(rootRef.current, event.currentTarget),
          tokens: day.tokens,
          calls: day.calls,
          names,
          weekday: weekdayLabel(parseDay(day.day), localeTag),
        })
      }

      const plot = h('div', { className: 'dtd-chart-plot', style: { gap: `${gap}px` } },
        shown.map((day) => h('div', {
          key: day.day,
          className: 'dtd-bar-slot',
          onMouseEnter: (event) => enter(event, day),
          onMouseLeave: () => setTip(null),
        }, day.tokens <= 0
          ? h('i', { className: 'dtd-bar-empty' })
          : day.segments.map((segment) => h('i', {
            key: segment.key,
            className: 'dtd-bar-seg',
            'data-shade': String(segment.shade),
            style: { height: `${(segment.tokens / peak) * 100}%` },
          })))))

      const axis = h('div', { className: 'dtd-chart-axis', style: { gap: `${gap}px` } },
        axisLabels(shown, localeTag).map((label, index) => h('span', { key: index }, label)))

      return h('div', { className: 'dtd-chart', ref: rootRef },
        plot,
        axis,
        tip === null ? null : chartTip(tip, t))
    }

    /** One slot per bar so a printed date sits exactly under its own bar. */
    function axisLabels(series, localeTag) {
      if (series.length === 0) return []
      const picks = series.length <= 8
        ? series.map((day, index) => index)
        : [0, Math.floor(series.length * 0.25), Math.floor(series.length * 0.5), Math.floor(series.length * 0.75), series.length - 1]
      return series.map((day, index) => (picks.includes(index) ? shortDay(day.day, localeTag) : ''))
    }

    function chartTip(tip, t) {
      const rows = [
        h('div', { className: 'dtd-tip-row', key: 'tokens' },
          h('span', null, t('tip.tokens')),
          h('b', null, compactNumber(tip.tokens))),
        h('div', { className: 'dtd-tip-row', key: 'calls' },
          h('span', null, t('tip.calls')),
          h('b', null, String(tip.calls))),
      ]
      const names = tip.names.map((entry) => h('div', { className: 'dtd-tip-row dtd-tip-session', key: entry.key },
        h('span', { title: entry.label }, entry.label),
        h('b', null, compactNumber(entry.tokens))))
      return h('div', { className: 'dtd-tip', style: { left: `${tip.x}px`, top: `${tip.y}px` } },
        h('div', { className: 'dtd-tip-title' }, dayLabel(tip.day, tip.weekday, t)),
        ...rows,
        names.length === 0 ? null : h('div', { className: 'dtd-tip-sep' }, t('tip.breakdown')),
        ...names)
    }

    function Calendar({ days, t, localeTag }) {
      const today = useMemo(() => {
        const now = new Date()
        now.setHours(12, 0, 0, 0)
        return now
      }, [])
      const columns = useMemo(() => buildCalendar(CALENDAR_WEEKS, today, localeTag), [today, localeTag])
      const thresholds = useMemo(() => levelThresholds(days), [days])
      const [tip, setTip] = useState(null)
      const rootRef = useRef(null)
      const scrollRef = useRef(null)

      // A narrow column cannot hold a year: start at the newest days instead of
      // twelve months back.
      useEffect(() => {
        const node = scrollRef.current
        if (node === null) return
        const overflow = node.scrollWidth - node.clientWidth
        if (overflow > 4) node.scrollLeft = overflow
      }, [columns])

      const enter = (event, cell) => {
        if (!cell.inRange) return
        const entry = days.get(cell.key)
        const ranked = entry === undefined ? [] : [...entry.models.entries()].sort((a, b) => b[1] - a[1])
        setTip({
          key: cell.key,
          ...anchorOf(rootRef.current, event.currentTarget),
          tokens: entry?.tokens ?? 0,
          calls: entry?.calls ?? 0,
          sessions: entry?.sessions.size ?? 0,
          models: ranked.map(([name, tokens]) => ({ name, tokens })),
          weekday: weekdayLabel(cell.date, localeTag),
        })
      }

      const leave = () => setTip(null)

      const weekdayColumn = h('div', { className: 'dtd-cal-weekdays' },
        [0, 1, 2, 3, 4, 5, 6].map((row) => h('span', { key: row }, weekdayName(t, row))))

      const monthRow = h('div', { className: 'dtd-cal-months' },
        columns.map((column, index) => h('span', { key: index }, column.month)))

      const grid = h('div', { className: 'dtd-cal-grid' },
        columns.flatMap((column) => column.cells.map((cell) => calendarCell(cell, days, thresholds, enter, leave))))

      const body = h('div', { className: 'dtd-cal-body' }, monthRow, grid)

      const legend = h('div', { className: 'dtd-cal-legend' },
        h('span', null, t('less')),
        [0, 1, 2, 3, 4].map((level) => h('span', { key: level, className: 'dtd-cell', 'data-level': String(level) })),
        h('span', null, t('more')))

      return h('div', { className: 'dtd-calendar', ref: rootRef },
        h('div', { className: 'dtd-cal', ref: scrollRef }, weekdayColumn, body),
        legend,
        tip === null ? null : tipBubble(tip, t))
    }

    /** Tooltip coordinates relative to the panel, kept clear of its left and right edges. */
    function anchorOf(root, target) {
      if (root === null || typeof root.getBoundingClientRect !== 'function'
        || target === null || typeof target.getBoundingClientRect !== 'function') {
        return { x: 0, y: 0 }
      }
      const panel = root.getBoundingClientRect()
      const cell = target.getBoundingClientRect()
      const half = 110
      const center = cell.left + cell.width / 2 - panel.left
      return {
        x: Math.max(half, Math.min(Math.max(half, panel.width - half), center)),
        y: cell.top - panel.top - 6,
      }
    }

    function weekdayName(t, row) {
      if (row !== 0 && row !== 2 && row !== 4) return ''
      const names = t('weekdays').split(',')
      return names[[0, 2, 4].indexOf(row)] ?? ''
    }

    function calendarCell(cell, days, thresholds, enter, leave) {
      if (!cell.inRange) return h('span', { key: cell.key, className: 'dtd-cell', 'data-empty': 'true' })
      const entry = days.get(cell.key)
      const level = levelOf(entry?.tokens ?? 0, thresholds)
      return h('span', {
        key: cell.key,
        className: 'dtd-cell',
        'data-level': String(level),
        'aria-label': `${cell.key} ${compactNumber(entry?.tokens ?? 0)}`,
        onMouseEnter: (event) => enter(event, cell),
        onMouseLeave: leave,
      })
    }

    function tipBubble(tip, t) {
      const title = h('div', { className: 'dtd-tip-title', key: 'title' }, dayLabel(tip.key, tip.weekday, t))
      if (tip.tokens <= 0) {
        return h('div', { className: 'dtd-tip', style: { left: `${tip.x}px`, top: `${tip.y}px` } },
          title,
          h('div', { className: 'dtd-tip-row' }, h('span', null, t('tip.empty'))))
      }
      const rows = [
        h('div', { className: 'dtd-tip-row', key: 'tokens' },
          h('span', null, t('tip.tokens')),
          h('b', null, compactNumber(tip.tokens))),
        h('div', { className: 'dtd-tip-row', key: 'calls' },
          h('span', null, t('tip.calls')),
          h('b', null, String(tip.calls))),
        h('div', { className: 'dtd-tip-row', key: 'sessions' },
          h('span', null, t('tip.sessions')),
          h('b', null, String(tip.sessions))),
      ]
      if (Array.isArray(tip.models) && tip.models.length > 0) {
        rows.push(h('div', { className: 'dtd-tip-sep', key: 'models-label' }, t('tip.models')))
        tip.models.forEach((entry, index) => {
          rows.push(h('div', { className: 'dtd-tip-row dtd-tip-session', key: `model-${index}` },
            h('span', { title: entry.name }, entry.name),
            h('b', null, `${compactNumber(entry.tokens)} · ${percentOf(entry.tokens, tip.tokens)}`)))
        })
      }
      return h('div', { className: 'dtd-tip', style: { left: `${tip.x}px`, top: `${tip.y}px` } }, title, ...rows)
    }

    function buildCalendar(weeks, today, localeTag) {
      const end = new Date(today)
      const start = new Date(today)
      start.setDate(start.getDate() - (weeks * 7 - 1))
      const columns = []
      let lastMonth = ''
      const cursor = startOfWeek(start)
      while (cursor <= end) {
        const month = `${cursor.getFullYear()}-${cursor.getMonth()}`
        const label = month === lastMonth ? '' : monthLabel(cursor, localeTag)
        lastMonth = month
        const cells = []
        for (let row = 0; row < 7; row += 1) {
          const date = new Date(cursor)
          date.setDate(date.getDate() + row)
          cells.push({ key: dateKey(date), date, inRange: date >= start && date <= end })
        }
        columns.push({ cells, month: label })
        cursor.setDate(cursor.getDate() + 7)
      }
      return columns
    }

    function levelThresholds(days) {
      const values = [...days.values()].map((entry) => entry.tokens).filter((value) => value > 0).sort((a, b) => a - b)
      if (values.length === 0) return [0, 0, 0]
      const at = (quantile) => values[Math.min(values.length - 1, Math.floor(quantile * values.length))]
      return [at(0.25), at(0.5), at(0.75)]
    }

    function levelOf(tokens, thresholds) {
      if (tokens <= 0) return 0
      if (tokens <= thresholds[0]) return 1
      if (tokens <= thresholds[1]) return 2
      if (tokens <= thresholds[2]) return 3
      return 4
    }

    // -------------------------------------------------------------- the page

    function UsagePage({ t, locale, variant }) {
      const localeTag = useLocaleTag(locale)
      const usage = useUsage()
      const [range, setRange] = useState('7')
      const [modelKey, setModelKey] = useState(null)
      const [themeId, setThemeId] = useState(readTheme)
      const [depthId, setDepthId] = useState(readDepth)
      const [custom, setCustom] = useState(readCustom)
      const [sidebarIcon, setSidebarIcon] = useSidebarIcon()
      const accent = themeId === 'custom' ? custom : themeOf(themeId).accent
      useEffect(() => {
        try {
          window.localStorage.setItem(THEME_KEY, themeId)
          window.localStorage.setItem(DEPTH_KEY, depthId)
          window.localStorage.setItem(CUSTOM_KEY, custom)
        } catch {
          // A storage-denied browser keeps the choice for this page only.
        }
      }, [themeId, depthId, custom])
      const data = usage.data

      const home = useMemo(() => (data === null ? null : buildHome(data, range)), [data, range])
      const detail = useMemo(() => (data === null || modelKey === null ? null : buildModel(data, modelKey, range)), [data, modelKey, range])
      const dayMap = useMemo(() => (data === null ? new Map() : buildDayMap(rowsOf(data))), [data])
      const meta = useMemo(() => sessionsOf(data), [data])
      const calendarSummary = useMemo(() => {
        if (data === null) return ''
        const today = new Date()
        today.setHours(12, 0, 0, 0)
        const start = new Date(today)
        start.setDate(start.getDate() - (CALENDAR_WEEKS * 7 - 1))
        const startKey = dateKey(start)
        let days = 0
        let tokens = 0
        for (const [key, entry] of dayMap) {
          if (key < startKey || entry.tokens <= 0) continue
          days += 1
          tokens += entry.tokens
        }
        return t('calendarSummary', { days: String(days), tokens: compactNumber(tokens) })
      }, [data, dayMap, t])

      const labelOf = useCallback((sessionId) => (sessionId === '__rest'
        ? t('others')
        : sessionName(meta, sessionId, t)), [meta, t])

      const header = h('div', { className: 'dtd-toolbar' },
        h('div', { className: 'dtd-seg', role: 'group' },
          RANGES.map((id) => h('button', {
            key: id,
            type: 'button',
            className: 'dtd-seg-btn',
            'aria-pressed': range === id ? 'true' : 'false',
            onClick: () => setRange(id),
          }, t(`range.${id}`)))),
        h('div', { className: 'dtd-actions' },
          h('span', { className: 'dtd-updated' }, usage.status === 'refreshing'
            ? t('refreshing')
            : t('updated', { time: timeLabel(data?.generatedAt ?? Date.now()) })),
          h('div', { className: 'dtd-themes', role: 'group', 'aria-label': t('theme'), title: t('theme') },
            THEMES.map((option) => h('button', {
              key: option.id,
              type: 'button',
              className: 'dtd-theme-dot',
              'data-theme-id': option.id,
              'aria-pressed': themeId === option.id ? 'true' : 'false',
              title: t(`theme.${option.id}`),
              'aria-label': t(`theme.${option.id}`),
              style: { background: option.accent },
              onClick: () => setThemeId(option.id),
            }))),
          h('input', {
            type: 'color',
            className: themeId === 'custom' ? 'dtd-theme-dot dtd-theme-custom dtd-custom-active' : 'dtd-theme-dot dtd-theme-custom',
            value: custom,
            title: t('theme.custom'),
            'aria-label': t('theme.custom'),
            onChange: (event) => {
              setCustom(event.target.value)
              setThemeId('custom')
            },
          }),
          h('div', { className: 'dtd-depth', role: 'group', 'aria-label': t('depth'), title: t('depth') },
            DEPTHS.map((option) => h('button', {
              key: option,
              type: 'button',
              className: 'dtd-depth-btn',
              'aria-pressed': depthId === option ? 'true' : 'false',
              onClick: () => setDepthId(option),
            }, t(`depth.${option}`)))),
          h('label', { className: 'dtd-switch', title: t('sidebar') },
            h('input', {
              type: 'checkbox',
              checked: sidebarIcon,
              onChange: (event) => setSidebarIcon(event.target.checked),
            }),
            h('span', null, t('sidebar'))),
          h('button', {
            type: 'button',
            className: 'dtd-refresh',
            onClick: usage.refresh,
            disabled: usage.status === 'refreshing' || usage.status === 'loading',
          }, t('refresh'))))

      const error = usage.error === null
        ? null
        : h('div', { className: 'dtd-error' },
          h('span', null, t('loadFailed', { error: usage.error })),
          h('button', { type: 'button', className: 'dtd-refresh', onClick: usage.refresh }, t('retry')))

      const notices = []
      if (data !== null && data.failures > 0) notices.push(t('partial', { n: data.failures }))
      if (data !== null && data.skipped > 0) notices.push(t('skipped', { n: data.skipped }))

      const loading = usage.status === 'loading'
        ? h('p', { className: 'dtd-note' }, t('loading'))
        : null

      const view = detail !== null ? detail : home
      const empty = view !== null && view.totalTokens === 0
        ? h('p', { className: 'dtd-note' }, t('empty'))
        : null

      let content = null
      if (view !== null && view.totalTokens > 0) {
        const peak = view.series.reduce((max, day) => Math.max(max, day.tokens), 0)
        const cards = h(Cards, {
          key: 'cards',
          totals: view.agg.totals,
          totalTokens: view.totalTokens,
          sessionCount: view.sessionCount,
          dayCount: view.dayCount,
          t,
        })
        const chart = h(Panel, {
          key: 'chart',
          title: t('daily'),
          note: `${t('dailyStacked')} · ${t('peak', { n: compactNumber(peak) })}${view.series.length > MAX_BARS ? ` · ${t('recentBars', { n: MAX_BARS })}` : ''}`,
        }, h(DayChart, { series: view.series, t, localeTag, labelOf }))

        if (detail !== null) {
          content = [
            cards,
            chart,
            h(Panel, { key: 'sessions', title: t('allSessions'), note: t('sessionsNote') },
              h('div', { className: 'dtd-list' }, detail.sessions.slice(0, 40).map((row) => h(RankRow, {
                key: row.key,
                title: row.title !== '' ? row.title : (row.folder !== '' ? row.folder : t('untitled')),
                amount: compactNumber(row.tokens),
                meta: `${t('callsCount', { n: row.calls })} · ${t('lastDay', { date: row.lastDay })}`,
                share: row.tokens / detail.totalTokens,
              })))),
          ]
        } else {
          content = [
            cards,
            chart,
            h('div', { className: 'dtd-grid2', key: 'rankings' },
              h(Panel, { title: t('models'), note: t('clickModel') },
                h('div', { className: 'dtd-list' }, home.models.map((row) => h(RankRow, {
                  key: row.key,
                  title: row.name,
                  amount: compactNumber(row.tokens),
                  meta: `${row.provider} · ${t('callsCount', { n: row.calls })} · ${t('sub.sessions', { n: row.sessions.size })}`,
                  share: row.tokens / home.totalTokens,
                  onClick: () => setModelKey(row.key),
                })))),
              h(Panel, { title: t('sessions'), note: t('sessionsNote') },
                h('div', { className: 'dtd-list' }, home.sessions.map((row) => h(RankRow, {
                  key: row.key,
                  title: row.title !== '' ? row.title : (row.folder !== '' ? row.folder : t('untitled')),
                  amount: compactNumber(row.tokens),
                  meta: `${t('callsCount', { n: row.calls })} · ${t('lastDay', { date: row.lastDay })}`,
                  share: row.tokens / home.totalTokens,
                }))))),
            h(Panel, {
              key: 'calendar',
              title: t('calendar'),
              note: `${t('calendarNote')} · ${calendarSummary}`,
            }, h(Calendar, { days: dayMap, t, localeTag })),
          ]
        }
      }

      const back = detail === null
        ? null
        : h('div', { className: 'dtd-detail-head' },
          h('button', { type: 'button', className: 'dtd-back', onClick: () => setModelKey(null) }, `← ${t('back')}`),
          h('span', { className: 'dtd-detail-title' }, detail.name === '' ? modelKey : detail.name),
          h('span', { className: 'dtd-detail-sub' }, detail.provider))

      const body = h('div', { className: 'dtd-root', 'data-dsh-plugin': 'token-dog', 'data-depth': depthId, style: { '--dtd-accent': accent } },
        h('style', null, CSS),
        variant === 'panel' && detail === null
          ? h('div', { className: 'dtd-page-head' },
            h('h1', { className: 'dtd-page-title' }, t('nav')),
            h('span', { className: 'dtd-page-sub' }, t('pageSub')))
          : null,
        back,
        header,
        notices.length === 0 ? null : h('p', { className: 'dtd-note' }, notices.join(' · ')),
        error,
        loading,
        empty,
        content)

      // The settings section renders inside the settings content column, which
      // already pads and scrolls; the main panel needs its own page box.
      return variant === 'panel'
        ? h('div', { className: 'dtd-page' }, h('div', { className: 'dtd-page-inner' }, body))
        : body
    }

    function buildDayMap(rows) {
      const map = new Map()
      for (const row of rows) {
        const entry = map.get(row.day) ?? { tokens: 0, calls: 0, sessions: new Set(), models: new Map() }
        const tokens = totalOf(row)
        entry.tokens += tokens
        entry.calls += row.calls
        entry.sessions.add(row.session)
        const name = modelName(row.model)
        entry.models.set(name, (entry.models.get(name) ?? 0) + tokens)
        map.set(row.day, entry)
      }
      return map
    }

    /** Sidebar rail icon: a line-art dog with a coin, in the rail's own text color. */
    function PanelIcon({ size = 16 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      h('circle', { cx: 11, cy: 13, r: 6.4 }),
      h('path', { d: 'M7.6 9.2 5.2 4.8l4.8 1.6' }),
      h('path', { d: 'M14.4 9.2 18.8 4.8 14 6.4' }),
      h('circle', { cx: 11, cy: 15.6, r: 2.6 }),
      h('circle', { cx: 8.8, cy: 12, r: 0.9, fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: 13.2, cy: 12, r: 0.9, fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: 19, cy: 18.4, r: 3.1 }),
      h('path', { d: 'M19 16.6v3.6M17.6 18.4h2.8', strokeWidth: 1 }))
    }

    const CSS = `
.dtd-page { height: 100%; min-height: 0; overflow: auto; box-sizing: border-box; padding: 24px clamp(16px, 4vw, 48px) 32px; }
.dtd-page-inner { display: flex; flex-direction: column; gap: 14px; max-width: 1040px; margin: 0 auto; }
.dtd-page-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 10px; }
.dtd-page-title { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -.015em; }
.dtd-page-sub { font-size: 12px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .9; }
.dtd-root {
  --dtd-accent: currentColor;
  --dtd-ink1: 24%; --dtd-ink2: 42%; --dtd-ink3: 64%; --dtd-ink4: 90%;
  --dtd-g1: 95%; --dtd-g2: 74%; --dtd-g3: 58%; --dtd-g4: 44%; --dtd-g5: 32%; --dtd-g6: 22%; --dtd-g7: 14%;
  --dtd-bar-track: 9%; --dtd-bar-fill: 82%;
  display: flex; flex-direction: column; gap: 14px; min-width: 0; color: inherit; font-size: 13px; line-height: 1.5;
}
.dtd-root[data-depth="soft"] {
  --dtd-ink1: 15%; --dtd-ink2: 28%; --dtd-ink3: 44%; --dtd-ink4: 66%;
  --dtd-g1: 74%; --dtd-g2: 57%; --dtd-g3: 44%; --dtd-g4: 33%; --dtd-g5: 24%; --dtd-g6: 17%; --dtd-g7: 11%;
  --dtd-bar-fill: 64%;
}
.dtd-root[data-depth="bold"] {
  --dtd-ink1: 34%; --dtd-ink2: 58%; --dtd-ink3: 80%; --dtd-ink4: 100%;
  --dtd-g1: 100%; --dtd-g2: 84%; --dtd-g3: 68%; --dtd-g4: 54%; --dtd-g5: 42%; --dtd-g6: 30%; --dtd-g7: 20%;
  --dtd-bar-fill: 100%;
}
.dtd-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; }
.dtd-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 9px; background: color-mix(in srgb, currentColor 7%, transparent); }
.dtd-seg-btn { appearance: none; border: 0; background: transparent; color: inherit; font: inherit; font-size: 12px; padding: 3px 10px; border-radius: 7px; cursor: pointer; opacity: .62; transition: opacity .12s ease, background-color .12s ease; }
.dtd-seg-btn:hover { opacity: .95; }
.dtd-seg-btn[aria-pressed="true"] { opacity: 1; font-weight: 600; background: var(--dsw-alias-label-primary, #1f2329); color: var(--dsw-alias-bg-base, #ffffff); }
.dtd-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 12px; }
.dtd-updated { color: var(--dsw-alias-label-secondary, currentColor); opacity: .9; font-variant-numeric: tabular-nums; }
.dtd-refresh { appearance: none; border: 1px solid color-mix(in srgb, currentColor 22%, transparent); background: var(--dsw-alias-bg-layer-1, transparent); color: inherit; font: inherit; font-size: 12px; padding: 3px 10px; border-radius: 7px; cursor: pointer; }
.dtd-refresh:hover:not(:disabled) { border-color: color-mix(in srgb, currentColor 40%, transparent); }
.dtd-refresh:disabled { opacity: .45; cursor: default; }
.dtd-themes { display: inline-flex; align-items: center; gap: 6px; }
.dtd-theme-dot { appearance: none; width: 13px; height: 13px; padding: 0; border-radius: 50%; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); cursor: pointer; transition: box-shadow .12s ease, transform .12s ease; }
.dtd-theme-dot:hover { transform: scale(1.14); }
.dtd-theme-dot[aria-pressed="true"] { box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 30%, transparent), 0 0 0 4px color-mix(in srgb, var(--dtd-accent) 30%, transparent); }
.dtd-theme-custom { appearance: none; -webkit-appearance: none; overflow: hidden; padding: 0; }
.dtd-theme-custom::-webkit-color-swatch-wrapper { padding: 0; }
.dtd-theme-custom::-webkit-color-swatch { border: 0; border-radius: 50%; }
.dtd-theme-custom::-moz-color-swatch { border: 0; border-radius: 50%; }
.dtd-custom-active { box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 30%, transparent), 0 0 0 4px color-mix(in srgb, var(--dtd-accent) 30%, transparent); }
.dtd-depth { display: inline-flex; gap: 2px; padding: 2px; border-radius: 6px; background: color-mix(in srgb, currentColor 7%, transparent); }
.dtd-depth-btn { appearance: none; border: 0; background: transparent; color: inherit; font: inherit; font-size: 11px; padding: 1px 7px; border-radius: 4px; cursor: pointer; opacity: .6; }
.dtd-depth-btn[aria-pressed="true"] { opacity: 1; background: color-mix(in srgb, currentColor 18%, transparent); font-weight: 600; }
.dtd-switch { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; opacity: .8; user-select: none; }
.dtd-switch:hover { opacity: 1; }
.dtd-switch input { appearance: none; -webkit-appearance: none; position: relative; width: 26px; height: 15px; margin: 0; border-radius: 999px; background: color-mix(in srgb, currentColor 22%, transparent); cursor: pointer; transition: background-color .15s ease; }
.dtd-switch input::after { content: ''; position: absolute; top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, .3); transition: transform .15s ease; }
.dtd-switch input:checked { background: color-mix(in srgb, var(--dtd-accent) 82%, transparent); }
.dtd-switch input:checked::after { transform: translateX(11px); }
.dtd-switch input:focus-visible { outline: 2px solid color-mix(in srgb, var(--dtd-accent) 60%, transparent); outline-offset: 2px; }
.dtd-note { margin: 0; font-size: 12px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .9; }
.dtd-error { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--dsw-alias-state-error-primary, inherit); }
.dtd-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.dtd-card { min-width: 0; padding: 13px 15px 14px; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 10%, transparent); background: var(--dsw-alias-bg-layer-1, #ffffff); box-shadow: 0 1px 2px rgba(0, 0, 0, .04); }
.dtd-card-label { font-size: 12px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .95; }
.dtd-card-value { margin-top: 4px; font-size: 26px; font-weight: 700; letter-spacing: -.02em; color: var(--dtd-accent); font-variant-numeric: tabular-nums; }
.dtd-card-sub { margin-top: 3px; font-size: 11px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .85; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtd-grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(248px, 1fr)); gap: 10px; }
.dtd-panel { min-width: 0; padding: 13px 15px 14px; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 10%, transparent); background: var(--dsw-alias-bg-layer-1, #ffffff); box-shadow: 0 1px 2px rgba(0, 0, 0, .04); }
.dtd-panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.dtd-panel-title { font-size: 13px; font-weight: 650; color: var(--dsw-alias-label-primary, inherit); }
.dtd-panel-note { font-size: 11px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtd-list { display: flex; flex-direction: column; }
.dtd-row { min-width: 0; padding: 9px 0 10px; border-top: 1px solid color-mix(in srgb, currentColor 8%, transparent); }
.dtd-row:first-child { border-top: 0; padding-top: 0; }
.dtd-row-click { cursor: pointer; border-radius: 6px; transition: background-color .12s ease; }
.dtd-row-click:hover { background: color-mix(in srgb, currentColor 5%, transparent); }
.dtd-row-click:focus-visible { outline: 2px solid color-mix(in srgb, var(--dtd-accent) 55%, transparent); outline-offset: 1px; }
.dtd-row-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; min-width: 0; }
.dtd-row-name { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtd-row-amount { font-size: 12.5px; font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dtd-bar { margin-top: 7px; height: 5px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, currentColor var(--dtd-bar-track), transparent); }
.dtd-bar > i { display: block; height: 100%; border-radius: 3px; background: color-mix(in srgb, var(--dtd-accent) var(--dtd-bar-fill), transparent); }
.dtd-row-meta { margin-top: 5px; font-size: 11px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtd-chart { position: relative; display: flex; flex-direction: column; gap: 6px; }
.dtd-chart-plot { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; height: 180px; padding-top: 6px; border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.dtd-bar-slot { flex: 0 1 30px; min-width: 4px; max-width: 30px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; border-radius: 2px 2px 0 0; overflow: hidden; }
.dtd-bar-slot:hover { background: color-mix(in srgb, currentColor 6%, transparent); }
.dtd-bar-seg { display: block; width: 100%; min-height: 1px; }
.dtd-bar-empty { display: block; width: 100%; height: 2px; background: color-mix(in srgb, var(--dtd-accent) 18%, transparent); }
.dtd-bar-seg[data-shade="0"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-g1), transparent); }
.dtd-bar-seg[data-shade="1"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-g2), transparent); }
.dtd-bar-seg[data-shade="2"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-g3), transparent); }
.dtd-bar-seg[data-shade="3"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-g4), transparent); }
.dtd-bar-seg[data-shade="4"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-g5), transparent); }
.dtd-bar-seg[data-shade="5"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-g6), transparent); }
.dtd-bar-seg[data-shade="6"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-g7), transparent); }
.dtd-chart-axis { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .9; font-variant-numeric: tabular-nums; }
.dtd-chart-axis > span { flex: 0 1 30px; min-width: 4px; max-width: 30px; text-align: center; white-space: nowrap; overflow: visible; }
.dtd-detail-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 10px; }
.dtd-back { appearance: none; border: 0; background: transparent; color: inherit; font: inherit; font-size: 12px; padding: 2px 6px 2px 0; cursor: pointer; opacity: .7; }
.dtd-back:hover { opacity: 1; }
.dtd-detail-title { font-size: 15px; font-weight: 700; }
.dtd-detail-sub { font-size: 11px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .9; }
.dtd-calendar { position: relative; display: flex; flex-direction: column; }
.dtd-cal { position: relative; display: flex; gap: 7px; align-items: flex-start; overflow-x: auto; padding-bottom: 2px; }
.dtd-cal-weekdays { display: grid; grid-template-rows: repeat(7, 14px); gap: 3px; padding-top: 17px; font-size: 10px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .8; }
.dtd-cal-weekdays > span { width: 14px; line-height: 14px; text-align: right; }
.dtd-cal-body { display: flex; flex-direction: column; gap: 4px; }
.dtd-cal-months { display: grid; grid-auto-flow: column; grid-auto-columns: 14px; gap: 3px; height: 13px; font-size: 10px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .8; }
.dtd-cal-months > span { line-height: 13px; white-space: nowrap; }
.dtd-cal-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 14px); grid-auto-columns: 14px; gap: 3px; }
.dtd-cell { display: block; width: 14px; height: 14px; border-radius: 3px; background: color-mix(in srgb, currentColor 6%, transparent); }
.dtd-cell[data-empty="true"] { background: transparent; }
.dtd-cell[data-level="1"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-ink1), transparent); }
.dtd-cell[data-level="2"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-ink2), transparent); }
.dtd-cell[data-level="3"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-ink3), transparent); }
.dtd-cell[data-level="4"] { background: color-mix(in srgb, var(--dtd-accent) var(--dtd-ink4), transparent); }
.dtd-cell[data-empty="true"]:hover { outline: none; }
.dtd-cell:hover { outline: 1px solid color-mix(in srgb, currentColor 45%, transparent); outline-offset: 1px; }
.dtd-cal-legend { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 9px; font-size: 10px; color: var(--dsw-alias-label-secondary, currentColor); opacity: .85; }
.dtd-tip { position: absolute; z-index: 60; transform: translate(-50%, -100%); min-width: 180px; max-width: 340px; padding: 8px 10px 9px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, .35)); background: var(--dsw-alias-bg-overlay, #1f2329); color: var(--dsw-alias-label-primary, #ffffff); box-shadow: 0 6px 22px rgba(0, 0, 0, .24); pointer-events: none; font-size: 11.5px; }
.dtd-tip-title { margin-bottom: 5px; font-weight: 650; }
.dtd-tip-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dtd-tip-row > span { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; opacity: .7; }
.dtd-tip-row > b { flex: 0 0 auto; font-weight: 650; }
.dtd-tip-session { gap: 10px; }
.dtd-tip-session > span { flex: 1 1 auto; opacity: .85; }
.dtd-tip-sep { margin: 6px 0 4px; padding-top: 5px; border-top: 1px solid color-mix(in srgb, currentColor 16%, transparent); font-size: 10.5px; opacity: .6; }
`

    function apply(ctx) {
      const locale = ctx.locale
      ctx.effect(() => {
        const disposers = []
        if (locale !== undefined && locale !== null && typeof locale.register === 'function') {
          try {
            disposers.push(locale.register(NS, { zh: DICTS.zh, en: DICTS.en }))
          } catch {
            // Already registered by an earlier generation of this module.
          }
        }
        return () => {
          for (const dispose of disposers) {
            try {
              dispose()
            } catch {
              // A torn-down locale registry has nothing left to remove.
            }
          }
        }
      }, 'dsh-token-dog: locale')

      const t = createTranslate(locale)

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: PANEL_ID,
        order: 25,
        label: () => t('nav'),
      }, () => h(UsagePage, { t, locale, variant: 'section' })))

      // The same page as a first-class main panel: one click from the left rail.
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
      }, () => h(UsagePage, { t, locale, variant: 'panel' })))

      // The rail icon follows the page's switch: disposing the injection removes
      // the registration, so the button disappears from the sidebar as well.
      let stopIcon = null
      const syncIcon = () => {
        const wanted = sidebarPreference.get()
        if (wanted && stopIcon === null) {
          stopIcon = ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 12,
            label: () => t('nav'),
          }, PanelIcon))
        } else if (!wanted && stopIcon !== null) {
          stopIcon()
          stopIcon = null
        }
      }
      ctx.effect(() => {
        const unsubscribe = sidebarPreference.subscribe(syncIcon)
        syncIcon()
        return () => {
          unsubscribe()
          if (stopIcon !== null) {
            stopIcon()
            stopIcon = null
          }
        }
      }, 'dsh-token-dog: sidebar icon')
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
