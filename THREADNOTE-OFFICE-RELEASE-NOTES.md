# Threadnote Office 0.10.0 — desktop release (28 September 2026)

This release is for teammates using Threadnote with Discord. The desktop app keeps local Office editing available and connects to the same Threadnote account used in the browser. Installers are available for Windows x64, macOS Apple Silicon and Intel, and Linux x64.

Download the installer for your system from [the GitHub release](https://github.com/ashutosh-rath02/genoffice/releases/tag/threadnote-office-v0.10.0): Windows `.exe`, macOS `.dmg`, or Linux `.AppImage`, `.deb`, or `.rpm`. macOS `.zip` files are also provided. Verify macOS and Linux downloads with the SHA-256 checksum files on the release.

Windows installer SHA-256: `B91445B709B4197396D908F5D0428BEC647D8334B210051D22770513571D6E95`

## Ready to use

- Create and open local Word, spreadsheet, presentation, Markdown, HTML, and PDF files in the desktop editors.
- Sign in to Threadnote through the browser approval flow using your Discord account.
- Browse one collapsible **Threadnote** folder in the left sidebar. It contains **My Docs**, **Shared with me**, and the projects available to your account.
- Open project Markdown documents in the Markdown editor. Edits to documents you can edit sync back to Threadnote; documents without edit access show a view-only warning.
- Open project files in the matching desktop editor when their type is supported. Shared project files retain their Threadnote identity, so saving an already linked file updates it instead of creating a second entry.
- Share a saved local file to a project using a searchable project picker. The file type is not restricted to Office formats.
- See your authored Markdown documents and personal files in **My Docs**, and files shared directly with you in **Shared with me**.
- Browse recent local files without separate entries for Threadnote's cached server versions.

## Known limitations

- Personal files opened from **My Docs** or **Shared with me** are local copies. Editing those copies does not update the server. The app warns before opening them; use the Threadnote web app to manage or share personal files.
- Office does not yet provide the web app's Tasks, Activity, discussions, archive, or personal-file sharing controls.
- AI tools require a separately configured provider; none is included with this installer.
- Automatic updates are not configured for this release. Install a newer build manually when one is provided.
- The Windows installer and macOS builds are unsigned. Windows may show an unknown-publisher prompt. On macOS, Gatekeeper may require you to explicitly allow the app in System Settings > Privacy & Security. Apple signing and notarization are needed before frictionless macOS distribution.
- Threadnote library and sharing require an internet connection and access to a Discord server where Threadnote is installed. Local editors still work without the connection.

## Install and start

1. Download and install the build for your operating system from the GitHub release. Linux users can use the `.deb` or `.rpm` package, or make the `.AppImage` executable and run it directly.
2. Open **Threadnote Office**, expand **Threadnote** under **Folders**, and choose **Sign in**.
3. Approve the connection in your browser with the Discord account that has access to your Threadnote server.
4. Choose a project folder to view its documents, or open **My Docs** or **Shared with me**.
