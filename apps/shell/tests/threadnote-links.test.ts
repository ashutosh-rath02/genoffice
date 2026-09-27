import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { readThreadnoteFileLink, writeThreadnoteFileLink } from '../src/main/threadnote-links'

const roots: string[] = []
const scratch = () => {
  const root = mkdtempSync(join(tmpdir(), 'threadnote-links-test-'))
  roots.push(root)
  return root
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

it('remembers the same local file separately for each project after restart', () => {
  const root = scratch()
  const filePath = join(root, 'notes.md')
  const url = 'https://threadnote.example'
  const first = { fileId: 'first', version: 2, checksum: 'first-checksum' }
  const second = { fileId: 'second', version: 1, checksum: 'second-checksum' }
  const runtime = { ...first, timer: {} as { self?: unknown } }
  runtime.timer.self = runtime
  writeThreadnoteFileLink(root, url, filePath, 'project-a', runtime)
  writeThreadnoteFileLink(root, url, filePath, 'project-b', second)

  expect(readThreadnoteFileLink(root, url, filePath, 'project-a')).toEqual(first)
  expect(readThreadnoteFileLink(root, url, filePath, 'project-b')).toEqual(second)
  expect(readThreadnoteFileLink(root, 'https://another.example', filePath, 'project-a')).toBeNull()
})
