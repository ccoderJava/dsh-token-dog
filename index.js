/**
 * dsh-token-dog — Host half.
 *
 * Folds every Session log into token-usage rows (`day / session / provider / model`),
 * and serves that one document to the Web settings page over a loopback-only route.
 * The session log is the source of truth, so calls made before this plugin existed
 * still count, and the page never keeps a second ledger of its own.
 *
 * Folded like DSH counts one billed attempt: a later usage sample of the same
 * `turn:step:attempt` replaces the earlier one, and `llm/retry-started` starts a new
 * attempt. A fork replays its parent's events up to the inherited cut, so that cut
 * drops the inherited rows instead of counting them twice.
 */
const DAY_MS = 86_400_000
// Calls are bucketed per quarter hour for the local-day key cache.
const SLOT_MS = 15 * 60_000
const USAGE_PATH = '/token-dog/usage'
const SCAN_TTL_MS = 60_000
const SCAN_CONCURRENCY = 4
const MAX_AGE_DAYS = 400
const MAX_SESSIONS = 600
const READ_TIMEOUT_MS = 20_000

export const inject = ['webServer', 'sessionQuery']

export function apply(ctx) {
  const state = { cache: null, pending: null }

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact',
      path: USAGE_PATH,
      handler: (req, res) => handleRequest(ctx, state, req, res),
    })
    return () => {
      dispose()
      state.cache = null
      state.pending = null
    }
  }, 'dsh-token-dog: usage route')
}

async function handleRequest(ctx, state, req, res) {
  if (!isLocalRequest(req)) {
    sendJson(res, 403, { ok: false, error: 'forbidden: loopback-only' })
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { ok: false, error: 'method not allowed' })
    return
  }
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const timeZone = sanitizeTimeZone(url.searchParams.get('tz')) ?? localTimeZone()
  const refresh = url.searchParams.get('refresh') === '1'
  try {
    const payload = await snapshot(ctx, state, timeZone, refresh)
    if (req.method === 'HEAD') {
      res.writeHead(204, { 'cache-control': 'no-store' })
      res.end()
      return
    }
    sendJson(res, 200, payload)
  } catch (error) {
    sendJson(res, 500, { ok: false, error: messageOf(error) })
  }
}

/** The cached document, or one shared scan. A forced refresh joins a scan already running. */
function snapshot(ctx, state, timeZone, refresh) {
  const now = Date.now()
  const cached = state.cache
  if (!refresh && cached !== null && cached.timeZone === timeZone && now - cached.at < SCAN_TTL_MS) {
    return Promise.resolve(cached.payload)
  }
  if (state.pending !== null) return state.pending
  const job = scan(ctx, timeZone)
    .then((payload) => {
      state.cache = { timeZone, at: Date.now(), payload }
      return payload
    })
    .finally(() => {
      if (state.pending === job) state.pending = null
    })
  state.pending = job
  return job
}

async function scan(ctx, timeZone) {
  const startedAt = Date.now()
  const records = await ctx.sessionQuery.listSessions()
  const cutoff = startedAt - MAX_AGE_DAYS * DAY_MS
  const usable = (Array.isArray(records) ? records : []).filter((record) => {
    const id = record?.header?.id
    return typeof id === 'string' && id !== ''
  })
  const recent = usable.filter((record) => record.live === true
    || !Number.isFinite(record.header.createdAt)
    || record.header.createdAt >= cutoff)
  const targets = recent.slice(0, MAX_SESSIONS)

  const dayOf = dayKeys(timeZone)
  const rows = new Map()
  const sessions = {}
  const failures = []

  await eachLimited(targets, SCAN_CONCURRENCY, async (record) => {
    const id = String(record.header.id)
    try {
      const log = await withTimeout(ctx.sessionQuery.readSession(id), READ_TIMEOUT_MS)
      const events = Array.isArray(log?.events) ? log.events : []
      for (const call of foldCalls(events)) {
        const day = dayOf(call.time)
        const key = `${day}\u0000${id}\u0000${call.provider}\u0000${call.model}`
        const row = rows.get(key) ?? {
          day,
          session: id,
          provider: call.provider,
          model: call.model,
          input: 0,
          cacheRead: 0,
          cacheWrite: 0,
          output: 0,
          calls: 0,
        }
        row.input += call.input
        row.cacheRead += call.cacheRead
        row.cacheWrite += call.cacheWrite
        row.output += call.output
        row.calls += 1
        rows.set(key, row)
      }
      sessions[id] = {
        title: '',
        createdAt: Number.isFinite(record.header.createdAt) ? record.header.createdAt : 0,
        cwd: typeof record.header.cwd === 'string' ? record.header.cwd : '',
        origin: typeof record.header.origin === 'string' ? record.header.origin : '',
        parent: typeof record.header.parentSession === 'string' ? record.header.parentSession : '',
      }
    } catch (error) {
      failures.push({ id, error: messageOf(error) })
    }
  })

  await attachTitles(ctx, sessions)

  return {
    ok: true,
    generatedAt: Date.now(),
    scanMs: Date.now() - startedAt,
    timeZone,
    rows: [...rows.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)),
    sessions,
    scanned: targets.length,
    skipped: usable.length - targets.length,
    failures: failures.length,
    failureSample: failures.slice(0, 3),
  }
}

/** Titles are display sugar: a failed lookup leaves the id fallback in place. */
async function attachTitles(ctx, sessions) {
  const ids = Object.keys(sessions)
  if (ids.length === 0) return
  try {
    const results = await withTimeout(ctx.sessionQuery.readTitleSnapshots(ids), READ_TIMEOUT_MS)
    for (const result of Array.isArray(results) ? results : []) {
      if (result?.status !== 'fulfilled') continue
      const title = result.value?.title?.title
      const meta = sessions[result.sessionId]
      if (meta !== undefined && typeof title === 'string' && title.trim() !== '') meta.title = title.trim()
    }
  } catch {
    // Titles only label rows; usage numbers are unaffected.
  }
}

/**
 * Fold one Session's events into one entry per billed attempt.
 * @param events - the Session log, oldest first.
 * @returns attempts with their settle time, the model in force, and token counts.
 */
export function foldCalls(events) {
  let provider = ''
  let model = ''
  let retry = null
  const calls = new Map()
  for (const event of events) {
    if (event === null || typeof event !== 'object') continue
    const data = event.data !== null && typeof event.data === 'object' ? event.data : {}
    switch (event.type) {
      case 'request/header': {
        const config = data.header?.config
        if (typeof config?.provider === 'string' && typeof config?.model === 'string') {
          provider = config.provider
          model = config.model
        }
        break
      }
      case 'request/context': {
        if (typeof data.provider === 'string') {
          provider = data.provider
          if (typeof data.model === 'string') model = data.model
        }
        break
      }
      case 'llm/retry-started': {
        const sameAttempt = retry !== null && retry.turn === data.turn && retry.step === data.step
        retry = sameAttempt
          ? { turn: retry.turn, step: retry.step, count: retry.count + 1 }
          : { turn: data.turn, step: data.step, count: 1 }
        break
      }
      case 'session/end-seed': {
        // A fork inherits its parent's events; those calls are the parent's.
        if (data.inherited === true) calls.clear()
        break
      }
      case 'assistant/message':
      case 'assistant/attempt': {
        const usage = usageOf(data.usage ?? usageFromStream(data.stream))
        if (usage === null) break
        const attempt = retry !== null && retry.turn === data.turn && retry.step === data.step ? retry.count : 0
        const key = `${data.turn}:${data.step}:${attempt}`
        calls.set(key, {
          time: Number.isFinite(event.time) ? event.time : Date.now(),
          provider,
          model,
          ...usage,
        })
        break
      }
      default:
        break
    }
  }
  return [...calls.values()]
}

/** The last `usage` chunk of a stream record, the only usage an attempt carries. */
function usageFromStream(stream) {
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record?.type === 'chunk' && record.chunk?.type === 'usage') return record.chunk.usage
  }
  return undefined
}

function usageOf(usage) {
  if (usage === null || typeof usage !== 'object') return null
  const input = count(usage.inputTokens)
  const output = count(usage.outputTokens)
  const cacheRead = count(usage.cacheReadTokens)
  const cacheWrite = count(usage.cacheWriteTokens)
  if (input + output + cacheRead + cacheWrite <= 0) return null
  return { input, output, cacheRead, cacheWrite }
}

function count(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}

/** One local-day key per quarter hour, in the requested time zone. */
function dayKeys(timeZone) {
  let format
  try {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    format = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  const cache = new Map()
  return (time) => {
    const at = Number.isFinite(time) ? time : Date.now()
    const slot = Math.floor(at / SLOT_MS)
    let key = cache.get(slot)
    if (key === undefined) {
      const parts = format.formatToParts(new Date(slot * SLOT_MS))
      const part = (type) => parts.find((entry) => entry.type === type)?.value ?? ''
      key = `${part('year')}-${part('month')}-${part('day')}`
      cache.set(slot, key)
    }
    return key
  }
}

function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

function sanitizeTimeZone(value) {
  if (typeof value !== 'string' || value === '' || value.length > 64) return undefined
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value }).format(0)
    return value
  } catch {
    return undefined
  }
}

function eachLimited(items, limit, work) {
  let next = 0
  const lane = async () => {
    while (next < items.length) {
      const item = items[next]
      next += 1
      await work(item)
    }
  }
  return Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  res.end(JSON.stringify(body))
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Loopback trust fence: a loopback socket and Host header, same-origin browser
 * markers, and no forwarding header. Usage numbers are personal, so a LAN or
 * tunnelled request is refused instead of answered.
 */
function isLocalRequest(req) {
  if (!isLoopbackAddress(req.socket?.remoteAddress)) return false
  if (req.headers['cf-connecting-ip'] !== undefined || req.headers['x-forwarded-for'] !== undefined) return false
  const host = req.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

function isLoopbackAddress(address) {
  if (typeof address !== 'string') return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  const v4 = normalized.startsWith('::ffff:') ? normalized.slice('::ffff:'.length) : normalized
  const parts = v4.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function isLoopbackHostname(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}
