# RSD static-page pilot

This stage builds a local preview. It does not change GitHub Pages, the domain,
or the production HTML shells. Do not deploy `_site` until the staged migration
and deployment checks are approved.

## Build and inspect

Use Node.js 20.19 or newer and pnpm:

```text
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

Open `http://127.0.0.1:8080/work/compressible-wall-jet-rsd/`.
Stop the preview with Ctrl+C. The generated `_site/` folder is ignored by Git.
Rebuild after source edits; the preview server serves that output directly.

## Authoritative sources

- `content/work/compressible-wall-jet-rsd.md`: unchanged technical body.
- `content/work-index.json`: existing metadata, retained during this pilot.
- `content/site.json`: existing identity and contact information.
- `src/_includes/`: reusable generated-page layouts, navigation, footer.
- `tools/site-build.cjs`: Markdown, strict build-time KaTeX, image dimensions,
  stable heading IDs, URL normalization, chart data fallbacks.
- `js/hero-carousel.js` and `js/plotly-chart.js`: existing scientific components.

This transitional adapter deliberately avoids copying the article into another
content file. Moving metadata into each content item and generating all indexes
is a later stage, not a second metadata source introduced by this pilot.

## URL compatibility

The new canonical route is `/work/compressible-wall-jet-rsd/`.
Only the generated copy of `/work/case-file.html` forwards the matching slug
(with an optional `category=research`, in either parameter order). Other slugs
keep the existing renderer. Hash fragments are retained. With JavaScript off,
the old shell offers a normal link to the complete RSD page.

This is client-side compatibility, not an HTTP 301. Production URLs remain
unchanged until deployment. The preview sitemap substitutes the new RSD route;
existing RSS, CNAME, robots and `.nojekyll` are copied unchanged.

## Checks and scope

`pnpm build` validates the generated page, scientific content, equations,
images, local links, chart fallbacks, metadata and domain files. `pnpm test`
checks nested URL resolution and mathematics/code parsing.

The page contains the full article, navigation and equations without script
execution. Carousel slides retain captions as static figures. Plotly charts
have expandable HTML data tables and links to original JSON. New pilot-page
CSS is scoped; other pages retain their current styling and behavior.

Browser checks should include JavaScript disabled, mobile menu focus/Escape,
both themes, carousel navigation, chart rendering and failed CDN loading.
For a browser preview with all scripts blocked, append `?scripts=off` to the new
article URL. The local server sends `script-src 'none'` for this QA mode;
the generated HTML and published page do not depend on this query parameter.
This stage does not address the already-audited missing assets in other pages.

## Verified pilot results

- Generated HTML contains all original technical paragraphs, list text,
  headings and equation source; validation compares these with the source.
- 18 build-rendered equations, 58 images with intrinsic dimensions,
  six preserved carousels and two Plotly charts.
- Both charts rendered in the desktop browser; expandable tables retain
  axis labels, units and original JSON links.
- With all scripts blocked by the QA response policy, all five navigation
  links, the article, MathML, 25 carousel slide figures and both data tables
  remained present. This tests script failure rather than changing the
  browser's global JavaScript setting.
- Mobile reading fit a 390-pixel viewport. The closed menu was inert;
  opening focused its first link, and Escape closed it and restored focus.
- Light-theme links use a darker accent; desktop and mobile layouts and
  mathematical notation were visually inspected.
- The legacy RSD URL forwarded to the canonical preview route and retained
  its fragment. Build validation also covers parameter order, slug-only
  URLs, unmatched projects, and invalid category combinations.

The pilot loads about 24 KB of local enhancement JavaScript rather than the
old project shell's 164 KB (uncompressed files; excludes lazy Plotly). Its
HTML is about 102 KB because prose and mathematical markup now arrive in the
document. These are source sizes, not Core Web Vitals or transfer measurements.

GitHub Pages configuration, comprehensive screen-reader testing and field-user
performance remain outside this pilot's checks.

## Scientific-viewer extension

The local build now includes hypersonics, dandelion, and Nimbus alongside RSD.
Their Markdown and manifest metadata remain authoritative. Each page has a
canonical `/work/<slug>/` route, metadata, static navigation, and a compatibility
redirect from its existing research query URL in the generated output.

Scientific viewers load only on pages that use them. Three.js keeps the existing
0.165.0 import map. Viewer inputs and camera waypoints are preserved. Static
reference figures and original-file downloads sit outside each viewer so an
upgrade or failed CDN cannot erase them. Nimbus also has an expandable copy of
all six tour captions. Its summary explicitly identifies X-Plane simulation.
Reduced-motion preference disables the dandelion video's automatic playback
and enables native controls before the component upgrades.

Build validation compares all original technical text and TeX, checks local
assets, image dimensions, metadata, viewer attributes, script dependencies,
unique IDs, sitemap entries and legacy redirects for all four pages. The three
new records have seven viewer fallbacks and three build-rendered equations.

Browser verification observed the cylinder VTK field and temperature selection,
the dandelion STL model, muted local video playback, and the Nimbus GLB in both
scroll and interactive modes, including Pan and Reset. No errors were reported
during these checks. At 390 pixels with scripts blocked, all three pages retained
navigation and fallbacks without horizontal overflow; Nimbus's six captions and
dandelion's equations remained readable. Individual clipping/threshold gestures
and the other three VTK datasets have not received exhaustive browser testing.
Reduced-motion adaptation is implemented but was not emulated in this browser.

This remains a local pilot. Publishing is a subsequent stage.

## Index migration

Home, Work and Writing now render from the existing JSON manifests at build
time. Their `/index.html`, `/work.html` and `/writing.html` URLs are preserved.
Home retains its introduction, flow-field enhancement and first eight selected
projects. Work contains all ten entries; Writing contains both posts, newest
first, with complete excerpts and dates. Shared navigation and footer arrive
in HTML. The index data helper does not render scientific articles.

Work cards are ordinary project links rather than buttons opening a lightbox.
The four migrated records use canonical URLs; other project and post links
retain their legacy query routes. Thumbnails are static images, without video
preloads or hover playback. Missing gallery thumbnails use text tiles and the
missing overset writing thumbnail is omitted; existing manifest values and
source assets are unchanged. The writing GIF is hidden under reduced motion.

Category buttons filter existing HTML without fetching or rebuilding it. They
remain hidden until initialized, so script failure leaves complete lists.
Buttons expose pressed state and the result count is announced politely.

Validation checks each entry's title, category, URL, writing excerpt, local
assets, image dimensions, canonical metadata and active navigation. Browser
checks covered Creative and Gallery filtering, keyboard activation, mobile
menu focus/Escape, and script-blocked reading of all three indexes at 390 px
without horizontal overflow. No browser errors were observed on Writing.
Desktop Work and mobile Writing were visually inspected. Individual legacy
article renderers still require JavaScript and are outside this index stage.

No GitHub Pages configuration or production content was changed. The next
migration stage is the remaining project records and writing posts, followed
by About/Contact and a publishing review.

## Remaining records and writing

All ten work records and both writing posts now have complete build-rendered
HTML at `/work/<slug>/` and `/writing/<slug>/`. Indexes, related work and adjacent
record links use these routes. Generated legacy shells redirect known slugs,
retain fragments and check the work category against the manifest. Their
noscript links lead to the static records. Unknown slugs and mismatched work
categories retain the original fallback behavior. RSS keeps its original GUIDs
and legacy links, which now forward; source feed and hosting files are unchanged.

The two gallery records remain explicitly labeled draft scaffolds. Their
original planned sections remain in the article; unavailable hero files are
omitted and social metadata uses the existing site banner. No replacement
scientific media was invented. Other video heroes retain the original local
clip and poster, with a static reference and download outside the component.
FOSSEE's three pinned remote STL URLs retain their original settings and get
local geometry reference figures. All charts retain their HTML data tables.

Writing has static dates, PDF links, heading navigation, build-rendered math
and readable code. Optional Copy buttons do not change the examples. Validation
compares all 26 AMI code blocks byte-for-byte against rendered source, all
technical text and TeX, metadata, local assets and legacy post redirects.
The work records contain 69 equations and the AMI guide contains 31.

Browser checks confirmed the AMI Copy button, legacy post redirect with fragment,
FOSSEE baseline remote STL and PIV video playback. All eight newly migrated
records were checked at 390 pixels with scripts blocked. Navigation, equations,
code and static fallbacks remain present without horizontal page overflow.
KaTeX's hidden MathML layer was positioned relative to its formula to prevent
it extending outside narrow tables. Draft galleries show no broken hero images.
The AMI guide was visually inspected in light theme and its static mobile code
layout in dark theme. The two winglet STL variants and all new charts have not
received exhaustive interactive browser testing.

About and Contact still use their original renderer. Production publishing and
GitHub Pages configuration remain unchanged.

## About and Contact migration

`/about.html` and `/contact.html` now use the shared build-rendered layout.
About preserves every biography paragraph, research-interest statement,
publication record, timeline entry, belief, current activity and skill from
`site.json` and `publications.json`. Section headings have semantic levels;
publication links point to canonical project routes. The existing monochrome
portrait and color hover image have intrinsic dimensions, with the color copy
hidden from assistive technology. The `#publications` fragment remains valid.

Contact preserves all contact prose and email/social links. The existing Google
Apps Script endpoint is read from the original shell during this transitional
build. Its form stays hidden and Submit disabled until the handler initializes;
without scripts, the email link remains usable. Required labeled fields have
name/email autocomplete, feedback uses a live status region, and the original
honeypot is retained. Duplicate requests are prevented. HTTP and network errors
preserve the message and enable retry; the form resets only for an accepted
HTTP response. Success text says submitted, not delivered.

Build validation checks all profile content and local links. Six regression
tests pass, including contact success, HTTP/network failures, invalid/honeypot
entries and duplicate submits using mocked fetch responses. No message was
sent to the live endpoint, and backend delivery has not been verified.
Both pages retained navigation and complete static content at 390 pixels with
scripts blocked, without horizontal overflow. The enhanced form initialized
with required fields and enabled Submit, and no browser errors were observed.
The About portrait and layout were visually inspected in light theme.

All intended content routes now have static HTML. Original root shells remain
in the source checkout as transitional references; `_site` is the generated
output for deployment. A publishing review, GitHub Pages build configuration,
remaining interactive checks and production verification are still pending.

## Publishing preparation

The Pages workflow builds on Ubuntu with Node 24 and pinned pnpm, installs with
the frozen lockfile, runs regression tests, renders all 17 routes and validates
the deployment artifact. Pull requests only build; main pushes and manual main
runs deploy `_site` through the Pages environment. Each build first clears its
generated output so removed pages cannot survive into the next deployment.
Artifact checks reject filesystem links, case-colliding names, unexpected
private/build directories, incorrect-case local URLs on generated pages and
sites at or above 1 GB. The current artifact is approximately 140 MiB.

Repository metadata confirms a public repository, main as default branch and
admin access through the connected account. Pages publishing source, domain
settings and an actual Ubuntu Actions run have not been verified. The workflow
and cutover/rollback instructions are prepared locally; no commit, push, Pages
setting change or production deployment has been performed in this stage.

## Production cutover — 11 October 2026

Migration commit `5ec670a` was pushed to main. GitHub Actions run
`38117948257` passed its Ubuntu build, all six tests, content/artifact checks
and Pages deployment. The custom domain serves the generated static HTML.
All 17 routes were checked live for HTTP 200, static main content, one H1 and
canonical URLs. Sitemap, RSS, both compatibility scripts and the local KaTeX
stylesheet also returned HTTP 200. Browser checks confirmed both legacy work
and writing URLs preserve fragments while forwarding to canonical routes;
the AMI post retains its 26 code blocks. Live theme switching was verified.

The first push also triggered the previous branch-based Pages workflow. The
user then confirmed switching the repository's Pages source to GitHub Actions,
preserving the custom domain. The browser session was signed out; no credential
was extracted for an API call. The generated homepage title was adjusted to
avoid repeating the author name in the browser tab.

Live contact delivery and exhaustive scientific-viewer interaction remain
unverified; no test message was sent. The two gallery draft scaffolds retain
their existing content limitations. Earlier sections record the migration
stages and are historical rather than the current deployment status.

## Static-first scientific media

Scientific media now pairs a custom element with a visible HTML reference in
one container. The viewer loads without taking space from the reference until
it reports its first successful render. Only then is the reference hidden and
the viewer exposed to interaction and assistive technology. A library, asset,
parse or renderer failure keeps the reference; lost WebGL context restores it.
No script, blocked scripts and unsupported component APIs leave the same HTML
image/download baseline intact. Readiness of a nested GLB free-view reader is
forwarded by its parent tour, so mode changes cannot falsely hide the reference.
Video playback reports readiness after loaded data; its click-to-play facade
can replace the reference when available and playback errors restore it.

Regression tests cover pending, failure, readiness, recovery, nested ownership
and context loss. Browser checks cover successful STL/GLB/VTK renders, broken
model/data URLs, GLB tour/free-view switching, video loaded data, and a loaded
static image with scripts blocked. The complete content build still validates.
Local scripts and CSS use content hashes in their URLs so an existing browser
cache cannot pair newly generated markup with an older component implementation.

## Content preservation and chart downloads

A comparison with pre-migration commit `64aa4d9` confirmed that the Markdown
records had not been edited during migration. The Hypersonics page's three
generic headings were also in that original source. It now groups the existing
setup and results by cylinder, shock interactions and intake, with the original
limitations retained. Five other work records use specific section titles in
place of generic reflection headings. Old section fragments have alias anchors.
No prose, equation, numerical result or scientific media was removed.

The build checks all ten work records against a pre-migration prose-token and
media-attribute baseline, allowing changes to headings and paragraph ordering
while detecting textual or media changes. Any future intentional prose edit
requires review before updating that baseline. Existing output validation still
checks every source paragraph and equation against the rendered article.

Charts now have compact CSV and original JSON download links instead of long
expandable tables. Seven datasets are exported with every series and coordinate,
full numeric precision, and axis labels/units in the CSV header. Original JSON
files are preserved byte-for-byte, including Plotly layout and trace metadata.
