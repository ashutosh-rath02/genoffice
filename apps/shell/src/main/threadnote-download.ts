import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function checksum(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
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
  if (!/^[0-9a-f-]{36}$/i.test(fileId) || !Number.isSafeInteger(version) || version < 1) {
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
  const dir = join(userDataDir, 'threadnote-files', fileId, String(version))
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
