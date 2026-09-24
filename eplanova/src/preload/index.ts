import { contextBridge, ipcRenderer } from 'electron'

const api = {
  platform: 'masaustu' as const,
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    save: (next: any) => ipcRenderer.invoke('config:save', next),
    test: (cfg: any) => ipcRenderer.invoke('config:test', cfg),
    reconnect: () => ipcRenderer.invoke('config:reconnect')
  },
  task: {
    list: (filtre: any) => ipcRenderer.invoke('task:list', filtre),
    get: (id: number) => ipcRenderer.invoke('task:get', id),
    save: (g: any) => ipcRenderer.invoke('task:save', g),
    remove: (id: number) => ipcRenderer.invoke('task:delete', id),
    complete: (id: number, tamam: boolean) => ipcRenderer.invoke('task:complete', id, tamam),
    ertele: (id: number) => ipcRenderer.invoke('task:ertele', id)
  },
  tag: {
    list: () => ipcRenderer.invoke('tag:list'),
    save: (t: any) => ipcRenderer.invoke('tag:save', t),
    remove: (id: number) => ipcRenderer.invoke('tag:delete', id)
  },
  journal: {
    get: (tarih: string) => ipcRenderer.invoke('journal:get', tarih),
    save: (tarih: string, icerik: string, ruhHali: string | null) =>
      ipcRenderer.invoke('journal:save', tarih, icerik, ruhHali),
    remove: (tarih: string) => ipcRenderer.invoke('journal:delete', tarih),
    dates: (bas: string, bit: string) => ipcRenderer.invoke('journal:dates', bas, bit)
  },
  sticky: {
    list: () => ipcRenderer.invoke('sticky:list'),
    save: (s: any) => ipcRenderer.invoke('sticky:save', s),
    remove: (id: number) => ipcRenderer.invoke('sticky:delete', id)
  },
  cikartma: {
    list: (baglam: string) => ipcRenderer.invoke('cikartma:list', baglam),
    save: (c: any) => ipcRenderer.invoke('cikartma:save', c),
    remove: (id: number) => ipcRenderer.invoke('cikartma:delete', id)
  },
  page: {
    list: () => ipcRenderer.invoke('page:list'),
    get: (id: number) => ipcRenderer.invoke('page:get', id),
    save: (p: any) => ipcRenderer.invoke('page:save', p),
    remove: (id: number) => ipcRenderer.invoke('page:delete', id)
  },
  search: (metin: string) => ipcRenderer.invoke('search:all', metin),
  stats: () => ipcRenderer.invoke('stats:summary'),
  onReminder: (cb: (veri: any) => void) => {
    const h = (_e: any, veri: any): void => cb(veri)
    ipcRenderer.on('reminder:fired', h)
    return () => ipcRenderer.removeListener('reminder:fired', h)
  },
  onReminderOpen: (cb: (veri: { gorevId: number }) => void) => {
    const h = (_e: any, veri: { gorevId: number }): void => cb(veri)
    ipcRenderer.on('reminder:open', h)
    return () => ipcRenderer.removeListener('reminder:open', h)
  },
  onDataChanged: (cb: () => void) => {
    const h = (): void => cb()
    ipcRenderer.on('data:changed', h)
    return () => ipcRenderer.removeListener('data:changed', h)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
