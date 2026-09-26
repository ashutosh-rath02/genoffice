# Threadnote Office

Threadnote Office is the desktop companion for Threadnote. It edits documents locally and lets a signed-in user explicitly share a file with a Threadnote project. The editor supports Docs, Sheets, Slides, PDF, Markdown and HTML. Shared files use Threadnote permissions and versioned storage; local files remain on the device until the user shares them.

This fork is under active development. The desktop sign-in, file round trip and installer must be tested before distribution. No release download is offered from this source tree yet.

## Development

Use Node.js 22.12+ and npm 10+.

```sh
npm ci
npm run dev
```

The root npm workspaces contain the Electron shell in `apps/shell`, the document editors in `apps/*`, and reusable engines in `packages/*`. To validate a change:

```sh
npm run typecheck
npm test
npm run build:all
```

Run `npm run notices` before building an installer. Installers use the generated third-party notices and the original Apache-2.0 license.

## Threadnote connection

Open the Threadnote area in the desktop home screen, connect the app through the browser sign-in flow, then select a project. Files shared to a project are accessed through the Threadnote API. The desktop app does not need a Discord bot token or permanent object-storage credentials.

The Threadnote service is developed in a separate repository. This desktop fork is a client; it is not a second authority for project membership, sharing permissions or server versions.

## Source and attribution

Threadnote Office builds on open-source editor code. The Apache-2.0 license is in [LICENSE](LICENSE), upstream attribution is retained in [NOTICE](NOTICE), and release packages include generated third-party notices. Trademarked upstream logos and product-facing names are not used in Threadnote Office.
