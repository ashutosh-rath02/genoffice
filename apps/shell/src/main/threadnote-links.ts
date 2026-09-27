import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

export interface ThreadnoteFileLink {
  fileId: string
  version: number
  checksum: string
}

function registryPath(userDataDir: string): string {
  return join(userDataDir, 'threadnote-file-links.json')
}

function key(baseUrl: string, filePath: string, projectId: string): string {
  const absolute = resolve(filePath)
  return JSON.stringify([
    baseUrl,
    process.platform === 'win32' ? absolute.toLowerCase() : absolute,
    projectId,
  ])
}

function registry(userDataDir: string): Record<string, ThreadnoteFileLink> {
  try {
    const parsed = JSON.parse(readFileSync(registryPath(userDataDir), 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function readThreadnoteFileLink(
  userDataDir: string,
  baseUrl: string,
  filePath: string,
  projectId: string,
): ThreadnoteFileLink | null {
  const link = registry(userDataDir)[key(baseUrl, filePath, projectId)]
  return link &&
    typeof link.fileId === 'string' &&
    Number.isSafeInteger(link.version) &&
    link.version > 0 &&
    typeof link.checksum === 'string'
    ? link
    : null
}

export function writeThreadnoteFileLink(
  userDataDir: string,
  baseUrl: string,
  filePath: string,
  projectId: string,
  link: ThreadnoteFileLink,
): void {
  const links = registry(userDataDir)
  links[key(baseUrl, filePath, projectId)] = {
    fileId: link.fileId,
    version: link.version,
    checksum: link.checksum,
  }
  writeFileSync(registryPath(userDataDir), JSON.stringify(links), { mode: 0o600 })
}
