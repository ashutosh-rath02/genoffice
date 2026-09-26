# @threadnote/cli

`threadnoteoffice` is the ThreadnoteOffice command line. It exposes the suite's document engines
to scripts and AI agents without opening a window: the packaged app runs the
bundled CLI on its own Node runtime (`ELECTRON_RUN_AS_NODE`), so nothing extra
has to be installed.

```
threadnoteoffice info report.docx
threadnoteoffice convert scan.pdf --to docx
threadnoteoffice convert data.csv --to xlsx --out out/data.xlsx
threadnoteoffice open report.docx
threadnoteoffice convert scan.pdf --to pptx --json
threadnoteoffice guide slides                         # op groups; `threadnoteoffice guide slides insert` for one group, `threadnoteoffice guide slides setText` for one op
threadnoteoffice slides read deck.pptx [--full] --json # durable ids + geometry an agent targets ops at; --full: whole text, tables, notes; text elements add `effective` (displayed style of the first run + `src` = the inheritance layer each value comes from)
threadnoteoffice create --type pptx --ops deck.json --out deck.pptx
threadnoteoffice create --type pptx --spec deck/pages --outline deck/outline.json --out deck.pptx   # one page spec file per slide (`threadnoteoffice guide slides design|spec`)
threadnoteoffice slides check deck/outline.json | deck/pages/03.json   # outline rules (exit 1 on errors) / build + audit one page file
threadnoteoffice slides replace deck.pptx --slide 2 --spec deck/pages/03.json   # rebuild one slide from its page file
threadnoteoffice slides apply deck.pptx --ops edit.json [--dry-run] [--out copy.pptx]
threadnoteoffice slides audit deck.pptx [--slide 0] --json            # out-of-bounds / text overflow / overlap: typed issues with durable ids and a setTransform `suggest` where geometry fixes it
threadnoteoffice slides render deck.pptx --out shots/ [--scale 2]     # one PNG per slide through the app's PDF export
threadnoteoffice render report.docx|book.xlsx|page.html|file.pdf --out shots/ [--page 3] [--scale 2]   # one PNG per page of any document, to look at what was made
threadnoteoffice render deck.pptx --out shots/ --el e_12 [--pad 16]   # plus the page cropped to that element (<stem>-NN-e_12.png)
threadnoteoffice render deck.pptx --out shots/ --grid [--cols 4] [--tile 320]   # plus <stem>-grid.png: every page on one contact sheet
threadnoteoffice create --type xlsx --from table.json --out book.xlsx   # 2-D array or {sheets:[{name,rows}]}; "=..." cells are formulas
threadnoteoffice create --type xlsx --from data.csv --out data.xlsx [--header] [--decimal ,]   # ISO dates become real dates; sep= lines are honoured
threadnoteoffice sheet read book.xlsx [--sheet Data] [--range A1:D20] [--formats] --json   # values, formulas, sheet features; --formats adds styles, widths, heights
threadnoteoffice sheet apply book.xlsx --cells cells.json    # [{cell:"B2", value|formula, style?, sheet?}]
threadnoteoffice sheet apply book.xlsx --ops ops.json [--dry-run]   # workbook DSL: cells, formats, charts, tables, filters, conditional formats, validation, links, notes, panes, page setup, sheets (`threadnoteoffice guide sheets`)
threadnoteoffice sheet check book.xlsx --json                # formula errors, missing-sheet references, broken defined names, chart ranges off the data, ### columns (suggest: set_col_width), placeholder text, existing rules; exit 0
threadnoteoffice create --type docx --from report.md --out report.docx      # or --from fragment.html (restricted HTML)
threadnoteoffice convert notes.md --to docx|html
threadnoteoffice convert report.docx --to html               # the Word editor's standalone-HTML export
threadnoteoffice convert page.html --to docx                 # html2docx, same as the HTML app's Export as Word
threadnoteoffice convert report.docx --to md                 # GFM via the markdown editor's serializer
threadnoteoffice convert book.xlsx --to csv [--sheet Data]   # one sheet, cell text as displayed, UTF-8 BOM, CRLF
threadnoteoffice capabilities --json                        # which cloud features ThreadnoteOffice has configured (no network call)
threadnoteoffice search "electron headless export" [--images] [--max 6] --json
threadnoteoffice image "isometric office, soft light" --aspect 16:9 --out hero.png
threadnoteoffice media photo.jpg --ask "What text is in this picture?" --json
threadnoteoffice docs read report.docx [--range 0-9] [--html] [--full] [--comments] [--revisions] [--header-footer] --json   # blocks (--full: whole text), comment threads, tracked changes, header/footer text
threadnoteoffice docs apply report.docx --ops ops.json [--dry-run]           # apply_ops entries + insert_content / replace_blocks / insert_image / insert_chart / edit_chart / set_header_footer / reply_comment / resolve_comment
threadnoteoffice docs check report.docx --json                               # fields without results, broken bookmark references, stale TOC, missing images, empty charts/headings, heading level skips, placeholder text, pending revisions, open comments; exit 0
threadnoteoffice guide docs                                                   # op signatures + restricted-HTML rules (`guide <domain> --json` = the catalog with each op's schema and a fingerprint)
threadnoteoffice selection report.docx --json   # what the user has selected in the editor showing the file
threadnoteoffice skill list   # coding agents found on this machine and the skill version each has
threadnoteoffice skill install --dir ./skills --force   # copy the bundled skill into a skills directory
threadnoteoffice install-cli   # put threadnoteoffice on the PATH
threadnoteoffice mcp --http 3000 [--host 127.0.0.1] [--token secret]   # Streamable HTTP for clients on other machines; omit --http for stdio
```

Word and Markdown commands run the docs and markdown editors under jsdom (installed once per process, loaded lazily). Those modules are imported from the app renderers by relative path until they move into packages of their own.

Workbook writes go through `@threadnote/xlsx-gateway` (the app's save path). The in-memory workbook validates and applies the cell, format and structure ops; ops the snapshot cannot hold (charts, images, tables, filters, conditional formats, validation, hyperlinks, notes, panes, page setup, protection, defined names, tab order) become the gateway's declarative save payloads, as the app's edit journal does. Pivots, sparklines and edits to editor-session objects stay app-only. After writing formulas threadnoteoffice evaluates them with the xlsx sidecar and stores the results as cached values, so `sheet read` and plain readers see numbers, not blanks.

`create`/`slides apply` take the same ops the in-app AI uses (`@threadnote/pptx-ops`), as a JSON array or `{ "ops": [...] }`; `--ops -` reads stdin. Image ops accept a local file path in their `bytes` field. A rejected op comes back with the guided error and its usage line so the caller can fix and retry; atomic transactions leave the file untouched.

`create --type pptx --spec` is the CLI end of the app's deck generation pipeline (`@threadnote/pipelines`): the caller's agent does the design work following `threadnoteoffice guide slides design`, writing the style sheet, the outline and one page spec file per slide (`threadnoteoffice guide slides spec`), and the same page builder the app uses turns them into a pptx, measuring every text box and growing it to its content. Where the app separates the stages into model calls, the CLI separates them into files: `slides check` validates the outline against the planning rules and builds and audits a single page file, then checks it against its outline entry and the style sheet's palette (both found beside the page files), `create --spec <dir>` runs the same checks on every file and refuses to assemble a deck with pages missing or disagreeing with the outline, and `slides replace` rebuilds one slide from its file. `slides audit` runs the app's deterministic layout audit; `slides render` gives the agent PNGs to look at. No model call happens inside threadnoteoffice.

Every command prints a one-line human summary by default or a single JSON
object with `--json` (`{ status, command, summary, output_path?, warnings?, detail? }`);
`warnings[]` (`{ code, message, suggestion? }`) carries advisories about a
result that still succeeded.
Errors are `{ status: "error", code, error, message, suggestion?, detail? }`:
`code` is the exit code, `error` a stable snake_case reason (`unknown_op`,
`target_not_found`, `out_of_range`, `sheet_not_found`, `file_open_in_gui`, …)
and `suggestion` the next step (with `did you mean …?` for one-typo
mistakes); the facts an agent needs to retry (valid
ranges, available ids, sheet names, usage lines) come back as fields in
`detail` rather than only inside the message. Exit codes: `0` ok, `1` usage,
`2` file, `3` conversion failed, `4` app not available.

## MCP server

`threadnoteoffice mcp` serves the same commands as Model Context Protocol tools on
stdio, for clients that cannot run a shell or should not (Claude Desktop,
Cursor, sandboxed agents). Nothing else is needed on the machine: the process
runs on the app's Node runtime like every other command, and ThreadnoteOffice itself
only starts, hidden, for the conversions that need its renderer.

```bash
claude mcp add --transport stdio threadnoteoffice -- threadnoteoffice mcp
```

```json
{ "mcpServers": { "threadnoteoffice": { "command": "threadnoteoffice", "args": ["mcp"] } } }
```

The tool table is `src/mcp/tools.ts`: one tool per command verb
(`docs_read`, `docs_apply`, `sheet_apply`, `slides_render`, `convert`, …),
each parameter taken from the command's own option list, so the two surfaces
cannot drift. Ops, cell lists, specs and Markdown are passed inline and land
in a scratch directory for the length of the call; `render` and
`slides_render` return the PNGs as image content. Results are the same JSON
envelope `--json` prints; an error comes back with `isError` and the same
`error` reason. The op references are also resources (`threadnoteoffice://guide/docs`,
`…/sheets`, `…/slides`, `…/slides/design`, `…/slides/spec`).

A new deck goes through `deck_start` (style sheet + outline, returns the
design and spec guides), `deck_page` (one page per call, checked against its
outline entry and the palette), `deck_build` and `deck_replace`
(`src/mcp/deck.ts`). The deck directory is the state, laid out exactly as the
command line's staged flow, so a deck started from either side can be finished
from the other.

Behind a reverse proxy, set `THREADNOTE_OFFICE_TRUST_PROXY_HEADERS=1` so the download
URLs the server hands out use the forwarded host and scheme; by default the
`X-Forwarded-*` headers are ignored.

`threadnoteoffice mcp --http <port> [--host <addr>] [--token <secret>]` serves the
same tools over Streamable HTTP for clients on other machines (`src/mcp/http.ts`).
Files travel with the calls: `PUT /files/<name>` uploads one and returns a URL,
every path parameter also takes an http(s) URL (fetched into the session's
scratch directory, `src/mcp/files.ts`), and a tool that writes a file returns
`output_url` plus the bytes as an embedded resource when small or a
`resource_link` otherwise (`src/mcp/remote.ts`). Each session has its own
scratch directory, working directory and deck state; `open` is not registered;
with `THREADNOTE_OFFICE_ALLOWED_ROOTS` unset the tools are confined to the server's
file store.

## Putting threadnoteoffice on the PATH

- **macOS**: the app tries to symlink `/usr/local/bin/threadnoteoffice` (or `/opt/homebrew/bin/threadnoteoffice`) on every launch until one succeeds. If neither directory is writable it stays silent; run `threadnoteoffice install-cli` from the launcher, or `sudo mkdir -p /usr/local/bin && sudo ln -sf "/Applications/ThreadnoteOffice.app/Contents/Resources/cli/threadnoteoffice" /usr/local/bin/threadnoteoffice`.
- **Windows**: the installer appends `<install dir>\resources\cli` to the user PATH (`apps/shell/build/installer.nsh`, REG_EXPAND_SZ preserved, removed on uninstall) and the app re-checks once per version; new terminals see `threadnoteoffice`. The directory holds `threadnoteoffice.cmd` for cmd / PowerShell and the extension-less `threadnoteoffice` for Git Bash.
- **Linux**: the deb/rpm post-install links `/usr/bin/threadnoteoffice`; the AppImage relies on the first-launch symlink into `/usr/local/bin` when it is writable.

`threadnoteoffice install-cli` repeats the attempt and prints the manual command when it cannot finish. jsdom (for Word/Markdown) ships beside the bundle as `Resources/cli/node_modules`, collected by `collect-deps.mjs` at build time.

Independently of the PATH, every launch of the packaged app writes the launcher directory to `~/.threadnoteoffice/launcher` (`THREADNOTE_OFFICE_AUTH_DIR` overrides the directory, as for `auth.json`). The `threadnoteoffice` agent skill (`skills/threadnoteoffice/SKILL.md`) reads it when `threadnoteoffice` is not on the PATH. `threadnoteoffice --version` prints this package's version, inlined by `build.mjs`.

## Layout

- `src/cli.ts` — argv parsing, dispatch, output; `runCli()` is embeddable.
- `src/registry.ts` — `CommandDef` table (`name`, `usage`, `run`), the single
  place future entry points (in-app AI, MCP) dispatch through.
- `src/commands/` — `info`, `convert`, `create`, `render`, `slides`, `sheet`, `docs`,
  `guide`, `open`, `capabilities`, `search`, `image`, `media`, `install-cli`.
- `src/dom.ts` — the jsdom bootstrap the Word/Markdown paths need.
- `src/formats/` — thin adapters over `@threadnote/pdf2docx`, the xlsx sidecar
  and the sheets CSV importer.
- `src/resources.ts` — locates pdfium wasm, the xlsx sidecar and the OCR
  helper in both the packaged `Resources/` layout and the dev checkout.
- `bin/threadnoteoffice`, `bin/threadnoteoffice.cmd` — launchers copied next to `threadnoteoffice.cjs` in the
  packaged app.

## Path policy and audit log

- `THREADNOTE_OFFICE_ALLOWED_ROOTS` (PATH-style list of directories) confines every file threadnoteoffice
  reads or writes to those trees; symlinks are resolved before the check. A path
  outside exits 2 with the roots in `detail.allowed_roots`. Unset means
  unrestricted.
- `apply --out` onto another existing file needs `--force`, like `create` / `convert`;
  editing in place never does. Unknown options are rejected instead of ignored.
- A file the running ThreadnoteOffice shell has open in a tab is not rewritten in place
  (exit 2, `detail.gui_pid`): the shell publishes its open tabs to
  `userData/open-documents.json` and threadnoteoffice reads it (`THREADNOTE_OFFICE_USER_DATA`
  overrides the location). `--force` writes anyway; the editor then warns about
  the on-disk change at its next save (Word, Excel) or may overwrite it (PowerPoint).
- Every executed command appends one JSON line (`ts`, `command`, `argv`,
  `status`, `code`, `output_path`, `ms`, `cwd`) to
  `~/.threadnoteoffice/cli-audit.jsonl`, rotated at 2 MB. `THREADNOTE_OFFICE_AUDIT_LOG=<path>`
  redirects it, `THREADNOTE_OFFICE_AUDIT_LOG=off` disables it.

## Cloud commands

`search`, `image` and `media` reuse the editors' provider routing. Search uses
the selected Serper / Tavily provider when its key is configured, or Parallel
with an optional key (a blank saved key uses its free, rate-limited Search MCP);
otherwise Threadnote is the default when signed in (`~/.threadnoteoffice/auth.json`)
and cloud tools are on, with free-source fallbacks when unavailable. Parallel
and Tavily provide web search only. Image generation and media analysis use
the corresponding provider chosen in the app's AI settings
(`ThreadnoteOffice/ai-settings.json` in the platform config directory, override with
`THREADNOTE_OFFICE_AI_SETTINGS`). `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY` are honoured.
Search results, image bytes and analysis text come back in the JSON `detail`;
`image` also writes the file. These are the only commands that send data off
the machine.

## Build and run in a checkout

```
npm run build -w @threadnote/cli       # esbuild → dist/threadnoteoffice.cjs
packages/cli/bin/threadnoteoffice info file.docx  # falls back to the system node
```

Conversions that need an app renderer (Word/PowerPoint/Excel/HTML/Markdown → PDF,
Word → HTML, HTML → Word, `create --type pdf`) run inside the ThreadnoteOffice binary
through its hidden `--headless-export` mode: threadnoteoffice spawns it (Dock hidden, no
window), reads the JSON envelope it prints and maps its exit code. Set
`THREADNOTE_OFFICE_APP_BIN` to point at a specific executable; in a checkout the dev Electron
plus `apps/shell` is used, so `npm run build:all` first.
