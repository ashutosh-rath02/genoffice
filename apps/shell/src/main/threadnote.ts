import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron'
import { existsSync, mkdirSync, readFileSync, unwatchFile, watchFile, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createServer, type Server } from 'node:http'
import { createHash } from 'node:crypto'
import type {
  ThreadnoteFile,
  ThreadnotePairing,
  ThreadnoteProject,
  ThreadnoteStatus,
} from '../shared/threadnote-api'
import { THREADNOTE_CHANNELS } from '../shared/threadnote-api'

interface StoredAuth {
  baseUrl: string
  token?: string
}

interface ManagedFile {
  fileId: string
  version: number
  checksum: string
  saving: boolean
  pending: boolean
  timer?: NodeJS.Timeout
}

const managedFiles = new Map<string, ManagedFile>()
let localBridge: Server | null = null
const DEFAULT_THREADNOTE_URL = 'https://threadnote.ashutosh123rath.workers.dev'

function authPath(): string {
  return join(app.getPath('userData'), 'threadnote-auth.json')
}

function normalizeBaseUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a valid Threadnote URL.')
  const url = new URL(value.trim())
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) {
    throw new Error('Threadnote must use HTTPS, except on 127.0.0.1 for local development.')
  }
  return url.origin
}

function readAuth(): StoredAuth {
  try {
    const data = JSON.parse(readFileSync(authPath(), 'utf8')) as StoredAuth
    return { baseUrl: normalizeBaseUrl(data.baseUrl), token: data.token }
  } catch {
    return { baseUrl: DEFAULT_THREADNOTE_URL }
  }
}

async function officeAvailable(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl + '/api/desktop/capabilities', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) return false
    const data = (await response.json()) as { office?: unknown }
    return data.office === true
  } catch {
    return false
  }
}

function writeAuth(value: StoredAuth): void {
  const target = authPath()
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(target, JSON.stringify(value, null, 2), { mode: 0o600 })
}

function decodedToken(auth: StoredAuth): string | null {
  if (!auth.token || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(auth.token, 'base64'))
  } catch {
    return null
  }
}

async function api<T>(baseUrl: string, path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const result = await fetch(baseUrl + path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  })
  const body = (await result.json().catch(() => ({}))) as { error?: string }
  if (!result.ok) throw new Error(body.error || `Threadnote request failed (${result.status}).`)
  return body as T
}

function authenticated() {
  const auth = readAuth()
  const token = decodedToken(auth)
  if (!token) throw new Error('Connect Threadnote first.')
  return { ...auth, token }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
}

async function chooseProject(projects: ThreadnoteProject[], fileName: string): Promise<ThreadnoteProject | null> {
  const parent = BrowserWindow.getFocusedWindow() ?? undefined
  const chooser = new BrowserWindow({
    width: 480,
    height: 560,
    parent,
    modal: Boolean(parent),
    show: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    title: 'Share through Threadnote',
    backgroundColor: '#18181f',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  })
  chooser.removeMenu()
  const rows = projects.map((project) =>
    `<button data-id="${encodeURIComponent(project.id)}"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.description || 'Threadnote project')}</small></button>`,
  ).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Share through Threadnote</title><style>
:root{color-scheme:dark;font:14px Inter,system-ui,sans-serif;background:#18181f;color:#f5f2fa}*{box-sizing:border-box}body{margin:0;padding:24px}h1{font-size:21px;margin:0 0 6px}p{margin:0 0 18px;color:#aaa7b4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}input{width:100%;height:42px;border:1px solid #454451;border-radius:8px;background:#22222b;color:#fff;padding:0 12px;outline:none}input:focus{border-color:#8a72dd}.list{display:grid;gap:8px;margin-top:14px;max-height:390px;overflow:auto}button{display:flex;flex-direction:column;gap:3px;width:100%;padding:12px;border:1px solid #34333e;border-radius:9px;background:#22222b;color:#f5f2fa;text-align:left;cursor:pointer}button:hover,button:focus{border-color:#8a72dd;background:#2a2835}small{color:#9996a3}#empty{display:none;padding:28px;text-align:center;color:#9996a3}</style></head><body><h1>Share through Threadnote</h1><p>${escapeHtml(fileName)}</p><input autofocus placeholder="Search projects" aria-label="Search projects"><div class="list">${rows}<div id="empty">No matching projects</div></div><script>
const input=document.querySelector('input'),buttons=[...document.querySelectorAll('button')],empty=document.querySelector('#empty');input.addEventListener('input',()=>{const query=input.value.trim().toLowerCase();let shown=0;for(const button of buttons){const visible=button.textContent.toLowerCase().includes(query);button.style.display=visible?'flex':'none';if(visible)shown++}empty.style.display=shown?'none':'block'});for(const button of buttons)button.addEventListener('click',()=>location.href='threadnote-share://select?id='+button.dataset.id);</script></body></html>`
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (project: ThreadnoteProject | null) => {
      if (settled) return
      settled = true
      resolve(project)
      if (!chooser.isDestroyed()) chooser.close()
    }
    chooser.webContents.on('will-navigate', (event, target) => {
      const url = new URL(target)
      if (url.protocol !== 'threadnote-share:') return
      event.preventDefault()
      const id = url.searchParams.get('id')
      finish(projects.find((project) => project.id === id) ?? null)
    })
    chooser.once('closed', () => finish(null))
    chooser.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      .then(() => { if (!chooser.isDestroyed()) chooser.show() })
      .catch(reject)
  })
}

function trackManagedFile(filePath: string, file: ThreadnoteFile): void {
  unwatchFile(filePath)
  const managed: ManagedFile = { fileId: file.id, version: file.version, checksum: file.checksum, saving: false, pending: false }
  managedFiles.set(filePath, managed)
  const save = async () => {
    if (managed.saving) {
      managed.pending = true
      return
    }
    managed.saving = true
    try {
      const auth = authenticated()
      const bytes = readFileSync(filePath)
      const checksum = createHash('sha256').update(bytes).digest('hex')
      if (checksum === managed.checksum) return
      const form = new FormData()
      form.append('file', new Blob([bytes]), basename(filePath))
      const updated = await api<ThreadnoteFile>(auth.baseUrl, `/api/office-files/${encodeURIComponent(managed.fileId)}/content`, {
        method: 'PUT',
        headers: { 'X-Threadnote-Base-Version': String(managed.version) },
        body: form,
      }, auth.token)
      managed.version = updated.version
      managed.checksum = updated.checksum
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not sync this document to Threadnote.'
      await dialog.showMessageBox({ type: 'error', title: 'Threadnote sync failed', message, detail: 'Your local file is still saved.', buttons: ['Close'] })
    } finally {
      managed.saving = false
      if (managed.pending) {
        managed.pending = false
        void save()
      }
    }
  }
  watchFile(filePath, { interval: 800 }, (current, previous) => {
    if (current.mtimeMs === previous.mtimeMs || current.size <= 0) return
    if (managed.timer) clearTimeout(managed.timer)
    managed.timer = setTimeout(() => void save(), 1200)
  })
}

async function openManagedFile(fileId: string, openPath: (path: string) => boolean): Promise<void> {
  const auth = authenticated()
  const details = await api<ThreadnoteFile>(auth.baseUrl, `/api/office-files/${encodeURIComponent(fileId)}`, {}, auth.token)
  const response = await fetch(auth.baseUrl + `/api/office-files/${encodeURIComponent(fileId)}/content`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Could not download ${details.name}.`)
  const safeName = [...basename(details.name)]
    .map((character) => '<>:"/\\|?*'.includes(character) || character.charCodeAt(0) < 32 ? '-' : character)
    .join('')
  const dir = join(app.getPath('userData'), 'threadnote-files', fileId)
  const target = join(dir, safeName)
  mkdirSync(dir, { recursive: true })
  unwatchFile(target)
  writeFileSync(target, Buffer.from(await response.arrayBuffer()))
  if (!existsSync(target) || !openPath(target)) throw new Error('This file type cannot be opened.')
  trackManagedFile(target, details)
}

export async function openThreadnoteUrl(rawUrl: string, openPath: (path: string) => boolean): Promise<void> {
  const url = new URL(rawUrl)
  if (url.protocol !== 'threadnote:' || url.hostname !== 'open') throw new Error('Invalid Threadnote link.')
  const fileId = url.searchParams.get('fileId')
  if (!fileId) throw new Error('This Threadnote link has no document.')
  await openManagedFile(fileId, openPath)
}

export function startThreadnoteBridge(openPath: (path: string) => boolean): void {
  if (localBridge) return
  localBridge = createServer((request, response) => {
    const origin = String(request.headers.origin || '')
    let allowed = false
    try {
      const configured = new URL(readAuth().baseUrl).origin
      allowed = origin === configured || ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin)
    } catch {
      allowed = false
    }
    if (allowed) response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    if (request.method === 'OPTIONS') {
      response.writeHead(allowed ? 204 : 403).end()
      return
    }
    const url = new URL(request.url || '/', 'http://127.0.0.1:47831')
    const fileId = url.searchParams.get('fileId')
    if (!allowed || request.method !== 'GET' || url.pathname !== '/open' || !fileId) {
      response.writeHead(allowed ? 404 : 403).end()
      return
    }
    response.writeHead(202, { 'Content-Type': 'application/json' }).end('{"opening":true}')
    void openManagedFile(fileId, openPath).catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : 'Could not open this Threadnote document.'
      void dialog.showMessageBox({ type: 'error', title: 'Threadnote could not open the document', message, buttons: ['Close'] })
    })
  })
  localBridge.on('error', (cause) => console.warn('[threadnote] local bridge unavailable:', cause))
  localBridge.listen(47831, '127.0.0.1')
}

export function registerThreadnoteIpc(openPath: (path: string) => boolean, activePath: () => string | undefined): void {
  ipcMain.handle(THREADNOTE_CHANNELS.status, async (): Promise<ThreadnoteStatus> => {
    const auth = readAuth()
    return { connected: Boolean(decodedToken(auth)), baseUrl: auth.baseUrl, available: await officeAvailable(auth.baseUrl) }
  })
  ipcMain.handle(THREADNOTE_CHANNELS.startPairing, async (_event, rawBaseUrl: unknown) => {
    const baseUrl = normalizeBaseUrl(rawBaseUrl)
    if (!await officeAvailable(baseUrl)) throw new Error('Threadnote Office sharing is not available on this server yet.')
    const pairing = await api<ThreadnotePairing>(baseUrl, '/api/desktop/pairings', {
      method: 'POST',
    })
    writeAuth({ baseUrl })
    await shell.openExternal(pairing.verificationUrl)
    return pairing
  })
  ipcMain.handle(THREADNOTE_CHANNELS.pollPairing, async (_event, raw: unknown) => {
    const pairing = raw as ThreadnotePairing
    const auth = readAuth()
    const result = await api<{ status: 'pending' | 'approved'; token?: string }>(
      auth.baseUrl,
      `/api/desktop/pairings/${encodeURIComponent(pairing.deviceToken)}/poll`,
      { method: 'POST' },
    )
    if (result.status === 'approved') {
      if (!result.token || !safeStorage.isEncryptionAvailable()) {
        throw new Error('Secure credential storage is unavailable on this computer.')
      }
      writeAuth({
        baseUrl: auth.baseUrl,
        token: safeStorage.encryptString(result.token).toString('base64'),
      })
    }
    return result.status
  })
  ipcMain.handle(THREADNOTE_CHANNELS.disconnect, () => writeAuth({ baseUrl: readAuth().baseUrl }))
  ipcMain.handle(THREADNOTE_CHANNELS.projects, async (): Promise<ThreadnoteProject[]> => {
    const auth = authenticated()
    return api(auth.baseUrl, '/api/projects', {}, auth.token)
  })
  ipcMain.handle(THREADNOTE_CHANNELS.files, async (_event, projectId: unknown): Promise<ThreadnoteFile[]> => {
    const auth = authenticated()
    const query = typeof projectId === 'string' && projectId
      ? `?projectId=${encodeURIComponent(projectId)}`
      : ''
    return api(auth.baseUrl, '/api/office-files' + query, {}, auth.token)
  })
  ipcMain.handle(THREADNOTE_CHANNELS.openFile, async (_event, fileId: unknown) => {
    if (typeof fileId !== 'string' || !fileId) throw new Error('Invalid Threadnote file.')
    await openManagedFile(fileId, openPath)
  })
  ipcMain.handle(THREADNOTE_CHANNELS.shareCurrentFile, async (): Promise<ThreadnoteFile | null> => {
    try {
      const filePath = activePath()
      if (!filePath || !existsSync(filePath)) throw new Error('Save this document before sharing it.')
      const auth = authenticated()
      if (!await officeAvailable(auth.baseUrl)) throw new Error('Threadnote Office sharing is not available on this server yet.')
      const projects = await api<ThreadnoteProject[]>(auth.baseUrl, '/api/projects', {}, auth.token)
      const writable = projects.filter((project) => project.capability !== 'viewer')
      if (writable.length === 0) throw new Error('You do not have a Threadnote project that accepts uploads.')
      const project = await chooseProject(writable, basename(filePath))
      if (!project) return null
      const form = new FormData()
      form.append('file', new Blob([readFileSync(filePath)]), basename(filePath))
      const shared = await api<ThreadnoteFile>(auth.baseUrl, `/api/projects/${encodeURIComponent(project.id)}/office-files`, { method: 'POST', body: form }, auth.token)
      trackManagedFile(filePath, shared)
      await dialog.showMessageBox({ type: 'info', title: 'Shared through Threadnote', message: `${basename(filePath)} was shared`, detail: `Project: ${project.name}`, buttons: ['Done'] })
      return shared
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not share this document.'
      await dialog.showMessageBox({ type: 'error', title: 'Threadnote sharing failed', message, buttons: ['Close'] })
      throw cause
    }
  })
}
