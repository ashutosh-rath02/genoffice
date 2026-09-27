import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

function checksum(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Versioned downloads belong in Threadnote's library, not the user's local recent files. */
export function isThreadnoteCachePath(userDataDir: string, filePath: string): boolean {
  const normalized = (path: string) =>
    process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path)
  const candidate = normalized(filePath)
  return ['threadnote-files', 'threadnote-documents', 'threadnote-personal-files'].some((folder) =>
    candidate.startsWith(normalized(join(userDataDir, folder)) + sep),
  )
}

function saveVerifiedDownload(
  userDataDir: string,
  collection: 'threadnote-files' | 'threadnote-documents' | 'threadnote-personal-files',
  fileId: string,
  versionKey: string,
  fileName: string,
  bytes: Buffer,
  expectedChecksum: string,
): string {
  if (!/^[a-z0-9_-]{1,128}$/i.test(fileId) || !/^[a-f0-9]{1,64}$/i.test(versionKey)) {
    throw new Error('Invalid Threadnote file version.')
  }
  if (
    !fileName ||
    fileName === '.' ||
    fileName === '..' ||
    fileName.includes('/') ||
    fileName.includes('\\')
  ) {
    throw new Error('Invalid Threadnote file name.')
  }
  if (checksum(bytes) !== expectedChecksum) {
    throw new Error('The downloaded file did not match its server checksum.')
  }
  const dir = join(userDataDir, collection, fileId, versionKey)
  const target = join(dir, fileName)
  mkdirSync(dir, { recursive: true })
  if (existsSync(target)) {
    if (checksum(readFileSync(target)) !== expectedChecksum) {
      throw new Error('Your local copy has unsynced changes. It was not overwritten.')
    }
    return target
  }
  writeFileSync(target, bytes)
  return target
}

/** Preserve a local edit if a previous sync failed; each server version gets its own path. */
export function saveOfficeDownload(
  userDataDir: string,
  fileId: string,
  version: number,
  fileName: string,
  bytes: Buffer,
  expectedChecksum: string,
): string {
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error('Invalid Threadnote file version.')
  }
  return saveVerifiedDownload(
    userDataDir,
    'threadnote-files',
    fileId,
    String(version),
    fileName,
    bytes,
    expectedChecksum,
  )
}

export function savePersonalDownload(
  userDataDir: string,
  fileId: string,
  version: number,
  fileName: string,
  bytes: Buffer,
  expectedChecksum: string,
): string {
  if (!Number.isSafeInteger(version) || version < 1)
    throw new Error('Invalid Threadnote file version.')
  return saveVerifiedDownload(
    userDataDir,
    'threadnote-personal-files',
    fileId,
    String(version),
    fileName,
    bytes,
    expectedChecksum,
  )
}

export function saveDocumentDownload(
  userDataDir: string,
  documentId: string,
  revision: string | null,
  fileName: string,
  markdown: string,
): string {
  const bytes = Buffer.from(markdown, 'utf8')
  const revisionKey = checksum(Buffer.from(revision ?? 'unpublished')).slice(0, 16)
  return saveVerifiedDownload(
    userDataDir,
    'threadnote-documents',
    documentId,
    revisionKey,
    fileName,
    bytes,
    checksum(bytes),
  )
}
