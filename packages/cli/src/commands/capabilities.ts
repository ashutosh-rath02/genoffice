import {
  activeMediaProvider,
  activeSearchProvider,
  imageGenerationAvailable,
  mediaAnalysisAvailable,
} from '@threadnote/ai-provider'
import { readAiSettingsFile } from '@threadnote/ai-search'
import { aiSettingsPath, prepareCloud } from '../cloud'
import type { CommandDef } from '../registry'
import { appLaunch } from '../resources'

/**
 * What the cloud commands can do on this machine, decided from ThreadnoteOffice's
 * own settings without a network call: a Threadnote login with cloud tools on,
 * a BYOK key, or explicitly selected free Parallel search. Unkeyed fallbacks (DuckDuckGo)
 * do not count as configured. Agents check this once before planning work
 * that needs photos or web facts.
 */
export const capabilitiesCommand: CommandDef = {
  name: 'capabilities',
  summary:
    'Report which cloud features (search, image search, image generation, media analysis) are configured in ThreadnoteOffice, and whether the app is installed.',
  usage: 'capabilities',
  async run(_args, ctx) {
    await prepareCloud(ctx.env)
    const settings = readAiSettingsFile(aiSettingsPath(ctx.env))
    const searchProvider = activeSearchProvider(settings)
    const imageGeneration = imageGenerationAvailable(settings, false)
    const mediaAnalysis = mediaAnalysisAvailable(settings, false)
    const via = (provider: string) => provider === 'none' ? null : provider
    const detail = {
      search: {
        available: true,
        via: searchProvider,
      },
      image_search: {
        available: searchProvider === 'serper',
        via: searchProvider === 'serper' ? 'serper' : null,
      },
      image_generation: {
        available: imageGeneration,
        via: imageGeneration ? via(activeMediaProvider(settings, 'image')) : null,
      },
      media_analysis: {
        available: mediaAnalysis,
        via: mediaAnalysis ? via(activeMediaProvider(settings, 'analysis')) : null,
      },
      app: { available: appLaunch(ctx.env) !== null },
      settings_path: aiSettingsPath(ctx.env),
    }
    const on = Object.entries(detail)
      .filter(([k, v]) => k !== 'settings_path' && (v as { available: boolean }).available)
      .map(([k]) => k)
    return {
      summary: on.length
        ? `configured: ${on.join(', ')}`
        : 'no cloud feature configured; the app is not installed',
      detail,
    }
  },
}
