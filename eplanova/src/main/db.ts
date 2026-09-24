import Firebird from 'node-firebird'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { DDL, SEED } from './schema'

export interface DbConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  charset: string
}

export interface AppConfig extends DbConfig {
  pin: string | null
  kontrolSaniye: number
  /** Hatirlatma penceresinde alarm sesi calsin mi (tanimsiz = evet) */
  alarmSesi?: boolean
  /** Gorunum: 'klasik' kurumsal (varsayilan) ya da 'renkli' */
  tema?: 'renkli' | 'klasik'
  /** Ilk kurulumda "Windows ile baslat" bir kez acildi mi (sonra kullanicinin secimi korunur). */
  otomatikBaslatmaAyarlandi?: boolean
}

const VARSAYILAN: AppConfig = {
  host: '127.0.0.1',
  port: 3050,
  database: 'C:\\planova\\PLANNER.FDB',
  user: 'SYSDBA',
  password: 'masterkey',
  charset: 'UTF8',
  pin: null,
  kontrolSaniye: 30
}

let config: AppConfig = { ...VARSAYILAN }
let pool: any = null

// ------------------------------------------------------------------ ayar dosyasi

function configPath(): string {
  return join(app.getPath('userData'), 'planner-config.json')
}

export function loadConfig(): AppConfig {
  try {
    const p = configPath()
    if (existsSync(p)) {
      config = { ...VARSAYILAN, ...JSON.parse(readFileSync(p, 'utf8')) }
    } else {
      writeFileSync(p, JSON.stringify(VARSAYILAN, null, 2), 'utf8')
    }
  } catch {
    config = { ...VARSAYILAN }
  }
  return config
}

export function getConfig(): AppConfig {
  return config
}

export function saveConfig(next: Partial<AppConfig>): AppConfig {
  config = { ...config, ...next }
  writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf8')
  if (pool) {
    try {
      pool.destroy()
    } catch {
      /* yoksay */
    }
    pool = null
  }
  return config
}

// ------------------------------------------------------------------ tarih yardimcilari

const iki = (n: number): string => String(n).padStart(2, '0')

/** Date -> "YYYY-MM-DDTHH:mm:ss" (yerel saat, UTC kaymasi yok) */
export function localIso(d: Date): string {
  return (
    `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}` +
    `T${iki(d.getHours())}:${iki(d.getMinutes())}:${iki(d.getSeconds())}`
  )
}

/** "YYYY-MM-DD[THH:mm[:ss]]" -> Date (yerel saat) */
export function parseLocal(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))
}

function normalize(row: any): any {
  if (row === null || row === undefined) return row
  const out: any = {}
  for (const k of Object.keys(row)) {
    const v = row[k]
    if (v instanceof Date) out[k] = localIso(v)
    else if (typeof v === 'string') out[k] = v.replace(/\s+$/, '')
    else out[k] = v
  }
  return out
}

// ------------------------------------------------------------------ baglanti

function fbOptions(cfg: DbConfig): any {
  return {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    lowercase_keys: false,
    role: null,
    pageSize: 8192,
    encoding: cfg.charset || 'UTF8',
    retryConnectionInterval: 2000
  }
}

function attachOnce(cfg: DbConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    Firebird.attach(fbOptions(cfg), (err: any, db: any) => (err ? reject(err) : resolve(db)))
  })
}

function createDatabase(cfg: DbConfig): Promise<any> {
  const dir = dirname(cfg.database)
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true })
  return new Promise((resolve, reject) => {
    Firebird.create(fbOptions(cfg), (err: any, db: any) => (err ? reject(err) : resolve(db)))
  })
}

function runRaw(db: any, sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err: any, result: any) => (err ? reject(err) : resolve(result)))
  })
}

/** DDL turune gore varlik kontrolu yapilacak sistem tablosu ve alani. */
const VARLIK_SORGUSU: Record<string, string> = {
  GENERATOR: 'SELECT 1 FROM RDB$GENERATORS WHERE RDB$GENERATOR_NAME = ?',
  TABLE: 'SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = ?',
  TRIGGER: 'SELECT 1 FROM RDB$TRIGGERS WHERE RDB$TRIGGER_NAME = ?',
  INDEX: 'SELECT 1 FROM RDB$INDICES WHERE RDB$INDEX_NAME = ?'
}

/** "CREATE <TUR> <AD>" ifadesindeki nesne zaten varsa true. Taninmayan ifadede false. */
async function nesneVarMi(db: any, stmt: string): Promise<boolean> {
  const m = /^\s*CREATE\s+(GENERATOR|TABLE|TRIGGER|INDEX)\s+(\w+)/i.exec(stmt)
  if (!m) return false
  const r = await runRaw(db, VARLIK_SORGUSU[m[1].toUpperCase()], [m[2].toUpperCase()])
  return Array.isArray(r) && r.length > 0
}

/** Veritabani yoksa olusturur, semayi kurar, havuzu acar. */
export async function initDb(): Promise<void> {
  const cfg = getConfig()
  let db: any

  try {
    db = await attachOnce(cfg)
  } catch (err: any) {
    const msg = String(err?.message ?? err)
    const yok = /No such file|not found|error while trying to open file|I\/O error/i.test(msg)
    if (!yok) throw err
    db = await createDatabase(cfg)
  }

  for (const stmt of DDL) {
    try {
      if (await nesneVarMi(db, stmt)) continue
      await runRaw(db, stmt)
    } catch (err: any) {
      console.error('[sema]', String(err?.message ?? err), '\n', stmt.slice(0, 80))
    }
  }

  const adet = await runRaw(db, 'SELECT COUNT(*) AS N FROM PL_ETIKET')
  const bos = Array.isArray(adet) ? Number(adet[0]?.N ?? 0) === 0 : true
  if (bos) {
    for (const stmt of SEED) {
      try {
        await runRaw(db, stmt)
      } catch {
        /* yoksay */
      }
    }
  }

  db.detach()
  pool = Firebird.pool(5, fbOptions(cfg))
}

function getPool(): any {
  if (!pool) pool = Firebird.pool(5, fbOptions(getConfig()))
  return pool
}

function withDb<T>(fn: (db: any) => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    getPool().get(async (err: any, db: any) => {
      if (err) return reject(err)
      try {
        const r = await fn(db)
        resolve(r)
      } catch (e) {
        reject(e)
      } finally {
        try {
          db.detach()
        } catch {
          /* yoksay */
        }
      }
    })
  })
}

/** Satir listesi dondurur. */
export function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return withDb(async (db) => {
    const r = await runRaw(db, sql, params)
    if (!r) return []
    return (Array.isArray(r) ? r : [r]).map(normalize) as T[]
  })
}

/** Tek satir ya da null. */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows.length ? rows[0] : null
}

/** INSERT/UPDATE/DELETE. RETURNING varsa satiri dondurur. */
export function exec(sql: string, params: any[] = []): Promise<any> {
  return withDb(async (db) => {
    const r = await runRaw(db, sql, params)
    return r ? normalize(Array.isArray(r) ? r[0] : r) : null
  })
}

/** Baglanti testi — ayar ekrani icin. */
export async function testConnection(cfg: DbConfig): Promise<{ ok: boolean; mesaj: string }> {
  try {
    const db = await attachOnce(cfg)
    db.detach()
    return { ok: true, mesaj: 'Bağlantı başarılı.' }
  } catch (err: any) {
    return { ok: false, mesaj: String(err?.message ?? err) }
  }
}
