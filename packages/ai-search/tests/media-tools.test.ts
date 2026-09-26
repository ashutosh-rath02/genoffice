import { describe, expect, it } from 'vitest'
import { analyzeMediaTool, generateImageTool, MEDIA_PROVIDER_NOT_CONFIGURED } from '../src/media-tools'

const SETTINGS = '/nonexistent/threadnote-ai-settings.json'

describe('media tools without a configured provider', () => {
  it('asks for a provider before image generation', async () => {
    expect(await generateImageTool(SETTINGS, { prompt: 'diagram' })).toEqual({
      error: MEDIA_PROVIDER_NOT_CONFIGURED,
    })
  })

  it('asks for a provider before media analysis', async () => {
    expect(await analyzeMediaTool(SETTINGS, {
      mediaUrls: ['https://example.com/image.png'],
      requirements: 'describe',
    })).toEqual({ error: MEDIA_PROVIDER_NOT_CONFIGURED })
  })
})
