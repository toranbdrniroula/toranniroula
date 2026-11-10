# Website Studio

Double-click **Website Studio** on your desktop. It opens your local editor in your default browser, Edge. You can also double-click `website.cmd` in the website folder.

## The daily routine

1. Choose Gallery, Projects, Writing, Profile or Publications.
2. Make your changes and click **Save changes** (Ctrl+S also works).
3. Click **Preview**. Studio checks the website and opens a local preview in another tab. Only saved content appears; drafts remain hidden.
4. Click **Publish website** when ready. Confirm publication, then wait for **Published successfully**. That includes the GitHub Pages deployment, not just the upload to GitHub.

Save and Preview work offline. Publishing, video link lookup and YouTube playback require an internet connection. Closing the browser does not delete anything. Reopening the shortcut brings the editor back. The small local server exits when Windows restarts; the shortcut starts it again.

## Add a gallery video

Upload your finished video in [YouTube Studio](https://studio.youtube.com/) as Public or Unlisted. Choose the chapter in Website Studio, click **Add YouTube video**, and paste the video link. The title and thumbnail fill automatically. Add a useful description, switch off Draft, and save.

Use **Choose thumbnail / image** to select a custom image from your laptop. Imported images and PDFs are copied into the website, so moving the original later will not break the page. Video files stay on YouTube. Keep your original recordings separately as your archive.

Use **Move earlier / Move later** to reorder items. Comparison pairs move together. To move one item to a different chapter, unpair it first. The pair must contain two adjacent visible items. Only one item per chapter may be featured; the editor preserves existing featured layouts.

Create a chapter for a new subject. A new chapter starts as Draft. Add content and turn off both the chapter's Draft switch and each ready item's Draft switch. A chapter with no published items stays hidden.

## Projects and writing

Create a page, give it a clear title and keep its address short. Pages start as drafts. Write normal paragraphs separated by blank lines. Use the toolbar for headings, bold, links, images or PDFs. The text preview checks the article body; the main Preview button checks the actual website layout. Turn off Draft before publishing a finished page.

Existing page addresses and custom media settings are preserved. Additional settings expose existing page fields for advanced editing. Most days you only need the main fields and content area.

## Recover an edit

History contains the previous version from each save, stored only on this laptop. Restore the version you want, preview it and publish if needed. Restoring also backs up the current content. If a file was edited somewhere else, Studio refuses to overwrite it; reload the editor to get the current version.

Saving does not publish. Publishing includes **all saved website changes**, including drafts, although drafts are excluded from public pages. The publish confirmation makes this explicit. If a build fails, open **Build and publish details** and correct the issue before retrying. If a push succeeded but deployment status is unavailable, use **Check deployment** to see GitHub Actions.

## Laptop setup

Website source: `C:\Users\ToranBahadurNiroula\Documents\toranniroula`

Private editor files, backups, logs and the portable Node.js runtime live in `.website-studio` inside that folder. This folder is ignored by Git and is never included in the public website. The editor listens only at `127.0.0.1:4317`; other computers cannot connect. It does not upload videos or delete Drive files.

The installed portable Node.js runtime makes everyday editing independent of Codex being open. Git and the website dependencies are already installed. GitHub uses the laptop's existing Git credentials. If Git later asks you to sign in again, complete that sign-in and retry Publish.

Advanced commands remain available: `website.cmd preview`, `website.cmd check`, `website.cmd publish`, and `website.cmd new writing short-address Page title`.

## Git and terminal

**Publish website** runs tests, builds with Eleventy, commits the saved website sources and pushes to GitHub. **Pull updates** uses fast-forward-only Git pull and refuses to proceed if the working folder has local changes, protecting unfinished edits. Publish or commit those changes first. If histories diverge, resolve them in the terminal; Studio never resets or force-pushes your work.

**Open terminal** opens Command Prompt in the website folder with the portable Node runtime on PATH. Run `website.cmd check`, `git status`, `git log` or normal Git commands there. Studio itself provides build and deployment logs. A full embedded terminal is not required for daily editing.

Find the editor by searching **Website Studio** in the Windows Start menu, using its desktop shortcut, or double-clicking `website.cmd` in the website folder.


The private runtime also includes npm and the pinned pnpm package manager, so dependency installation works in the Studio terminal independently of Codex.


## Scientific figures and diagrams

In Projects or Writing, open a page and use the new **3D plot** and **Diagram** toolbar buttons.

For a 3D plot, choose a CSV with named columns or Plotly JSON. CSV supports points, a line following row order, or a surface on a complete rectangular X/Y grid. Select X, Y and Z columns, add labels and units, then choose **Insert plot**. Save the page and Preview. The data is copied into `content/data/imports`; original input is retained alongside the normalized Plotly JSON. Published CSV downloads include X, Y and Z, including every surface grid point. Numerical values are not rounded. The importer supports at most 200,000 points; JSON supports scatter3d and surface traces with explicit X/Y coordinates.

For a diagram, create it in the embedded draw.io editor or use **Open draw.io XML** to load an existing .drawio or .xml file. Click **Save and Exit** inside draw.io. Studio saves a passive SVG and the editable XML in `assets/diagrams/imports` and inserts the figure into the page. Multi-page diagrams export into one SVG with the selected page visible. Keep one intended figure per diagram when possible. To edit it later, download its editable source, reopen it using the same button, and replace the old figure in the article.

The draw.io editor needs internet; saved website diagrams do not. Conversion happens while saving the diagram in Studio. Publishing deploys the saved SVG, so the build server does not need draw.io installed. Block diagrams are drawings; they do not execute a control simulation.

Starter files are in `templates/science`: `3d-points.csv`, `surface.csv` and `control-loop.drawio`. These examples are not displayed on the public site. No chemistry editor or reaction solver has been added in this update.

