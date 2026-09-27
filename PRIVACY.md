# Threadnote Office privacy

Threadnote Office opens and saves files on your computer. A file is sent to Threadnote only when you explicitly share it with a project or person. Shared files are subject to the selected workspace's access rules.

Signing in to Threadnote uses the Threadnote account connection. AI and search features may contact the provider selected in Settings; using those features can send prompt text and relevant document content to that provider. If no provider is configured, local editing still works.

Packaged builds can send anonymous usage events to Google Analytics 4 only when analytics credentials are supplied at build time and the user has not turned off **Send anonymous usage statistics** in Settings. Source builds without those credentials send no analytics events. Analytics events include app version, platform, interface language, and file type for open/new actions; they do not include document content, file names, paths, or account email.

The app emits these event names when analytics is enabled:

- `app_launch` — the app starts.
- `file_open` — a file opens; includes its extension, not its name.
- `file_new` — a new file is created; includes its type.
- `install_first_launch` — the first launch after installation.

See [NOTICE](NOTICE) and [third-party notices](tools/gen-third-party-notices.mjs) for source and dependency attribution.
