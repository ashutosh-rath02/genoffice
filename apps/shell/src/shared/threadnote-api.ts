export interface ThreadnoteProject {
  id: string
  name: string
  description: string
  color: string
  capability: 'viewer' | 'author' | 'editor' | 'admin'
}

export interface ThreadnoteFile {
  id: string
  projectId: string
  name: string
  kind: 'docx' | 'xlsx' | 'pptx' | 'pdf'
  size: number
  version: number
  checksum: string
  updatedAt: string
  canEdit: boolean
  projectName: string
}

export interface ThreadnoteStatus {
  connected: boolean
  baseUrl: string
  available: boolean
}

export interface ThreadnotePairing {
  deviceToken: string
  userCode: string
  verificationUrl: string
  expiresIn: number
  interval: number
}

export interface ThreadnoteApi {
  status(): Promise<ThreadnoteStatus>
  startPairing(baseUrl: string): Promise<ThreadnotePairing>
  pollPairing(pairing: ThreadnotePairing): Promise<'pending' | 'approved'>
  disconnect(): Promise<void>
  projects(): Promise<ThreadnoteProject[]>
  files(projectId?: string): Promise<ThreadnoteFile[]>
  openFile(fileId: string): Promise<void>
  shareCurrentFile(): Promise<ThreadnoteFile | null>
}

export const THREADNOTE_CHANNELS = {
  status: 'threadnote:status',
  startPairing: 'threadnote:start-pairing',
  pollPairing: 'threadnote:poll-pairing',
  disconnect: 'threadnote:disconnect',
  projects: 'threadnote:projects',
  files: 'threadnote:files',
  openFile: 'threadnote:open-file',
  shareCurrentFile: 'threadnote:share-current-file',
} as const
