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
  kind: string
  size: number
  version: number
  checksum: string
  updatedAt: string
  canEdit: boolean
  projectName: string
}

export interface ThreadnoteDocument {
  id: string
  projectId: string
  title: string
  updatedAt: string
  revision: string | null
  canEdit?: boolean
}

export interface ThreadnotePage<T> {
  items: T[]
  nextCursor: string | null
}

export interface ThreadnotePersonalFile {
  id: string
  name: string
  kind: string
  mime: string
  size: number
  version: number
  checksum: string
  updatedAt: string
  access: 'owner' | 'shared'
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
  documents(projectId: string, cursor?: string): Promise<ThreadnotePage<ThreadnoteDocument>>
  myDocuments(cursor?: string): Promise<ThreadnotePage<ThreadnoteDocument>>
  personalFiles(scope: 'mine' | 'shared'): Promise<ThreadnotePersonalFile[]>
  openFile(fileId: string): Promise<void>
  openDocument(documentId: string): Promise<void>
  openPersonalFile(fileId: string): Promise<void>
  shareCurrentFile(): Promise<ThreadnoteFile | null>
  shareLocalFile(): Promise<ThreadnoteFile | null>
}

export const THREADNOTE_CHANNELS = {
  status: 'threadnote:status',
  startPairing: 'threadnote:start-pairing',
  pollPairing: 'threadnote:poll-pairing',
  disconnect: 'threadnote:disconnect',
  projects: 'threadnote:projects',
  files: 'threadnote:files',
  documents: 'threadnote:documents',
  myDocuments: 'threadnote:my-documents',
  personalFiles: 'threadnote:personal-files',
  openFile: 'threadnote:open-file',
  openDocument: 'threadnote:open-document',
  openPersonalFile: 'threadnote:open-personal-file',
  shareCurrentFile: 'threadnote:share-current-file',
  shareLocalFile: 'threadnote:share-local-file',
} as const
