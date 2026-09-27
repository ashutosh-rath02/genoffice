import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  isThreadnoteCachePath,
  saveDocumentDownload,
  saveOfficeDownload,
  savePersonalDownload,
} from '../src/main/threadnote-download'

const roots: string[] = []
const id = '9fd9db59-f639-40da-b0be-f5c9c1a6f46a'
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const scratch = () => {
  const root = mkdtempSync(join(tmpdir(), 'threadnote-download-test-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('Threadnote Office downloads', () => {
  it('preserves an unsynced local edit when the same server version is reopened', () => {
    const root = scratch()
    const server = Buffer.from('server content')
    const target = saveOfficeDownload(root, id, 1, 'plan.pdf', server, sha256(server))
    writeFileSync(target, 'local unsynced edit')

    expect(() => saveOfficeDownload(root, id, 1, 'plan.pdf', server, sha256(server))).toThrow(
      'local copy has unsynced changes',
    )
    expect(readFileSync(target, 'utf8')).toBe('local unsynced edit')
  })

  it('keeps the previous local file when a newer server version opens', () => {
    const root = scratch()
    const first = Buffer.from('old version')
    const second = Buffer.from('new version')
    const original = saveOfficeDownload(root, id, 1, 'plan.pdf', first, sha256(first))
    writeFileSync(original, 'local unsynced edit')
    const latest = saveOfficeDownload(root, id, 2, 'plan.pdf', second, sha256(second))

    expect(latest).not.toBe(original)
    expect(readFileSync(original, 'utf8')).toBe('local unsynced edit')
    expect(readFileSync(latest, 'utf8')).toBe('new version')
  })

  it('rejects a damaged response before writing it', () => {
    const root = scratch()
    expect(() =>
      saveOfficeDownload(
        root,
        id,
        1,
        'plan.pdf',
        Buffer.from('damaged'),
        sha256(Buffer.from('expected')),
      ),
    ).toThrow('server checksum')
  })

  it('keeps managed snapshots out of the local library without hiding the original', () => {
    const root = scratch()
    const serverCopy = saveOfficeDownload(
      root,
      id,
      3,
      'plan.md',
      Buffer.from('server'),
      sha256(Buffer.from('server')),
    )
    const personalCopy = savePersonalDownload(
      root,
      id,
      1,
      'private.md',
      Buffer.from('private'),
      sha256(Buffer.from('private')),
    )
    const documentCopy = saveDocumentDownload(root, id, 'revision-1', 'project.md', '# Project')

    expect(isThreadnoteCachePath(root, serverCopy)).toBe(true)
    expect(isThreadnoteCachePath(root, personalCopy)).toBe(true)
    expect(isThreadnoteCachePath(root, documentCopy)).toBe(true)
    expect(isThreadnoteCachePath(root, join(root, 'work', 'plan.md'))).toBe(false)
  })

  it('preserves an unsynced project Markdown edit when reopened', () => {
    const root = scratch()
    const path = saveDocumentDownload(root, id, 'revision-1', 'project.md', '# Server')
    writeFileSync(path, '# Local edit')
    expect(() => saveDocumentDownload(root, id, 'revision-1', 'project.md', '# Server')).toThrow(
      'local copy has unsynced changes',
    )
    expect(readFileSync(path, 'utf8')).toBe('# Local edit')
  })

  it('opens server document IDs that are slugs while rejecting path traversal', () => {
    const root = scratch()
    const target = saveDocumentDownload(root, 'doc-1', null, 'overview.md', '# Overview')
    expect(readFileSync(target, 'utf8')).toBe('# Overview')
    expect(() => saveDocumentDownload(root, '../other', null, 'overview.md', '# Wrong')).toThrow(
      'Invalid Threadnote file version',
    )
  })
})
