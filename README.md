# TGS Forward Flipbook — SPFx Web Part

A premium, image-based flipbook web part for SharePoint Online modern pages. Displays page images from a SharePoint document library as an interactive 3D flipbook with realistic page-turn animations — no external services required.

---

## Features

| Feature | Details |
|---|---|
| **3D Page Flip** | CSS `perspective` + `preserve-3d` with fold shadows, edge highlights, and page-thickness indicators |
| **Two-page spread** | Desktop shows a full book spread; mobile automatically switches to single-page |
| **Drag-to-flip** | Pointer drag controls the flip angle in real time; release completes or snaps back |
| **Touch & swipe** | Full mobile support via Pointer Events |
| **Keyboard** | Arrow keys, Home / End |
| **Corner hover cue** | Subtle folded-corner hint when hovering near the bottom-right |
| **Fullscreen** | Toggle fullscreen from the toolbar |
| **Zoom** | 4-step zoom with fit-to-width toggle |
| **PDF link** | Optional download button linking to a PDF |
| **Auto-detect pages** | Probes the folder sequentially, validates `Content-Type`, stops on first miss |
| **Image cache** | In-memory preload via `requestIdleCallback`; images are never re-fetched |
| **Error diagnostics** | Detailed panel showing attempted URLs, HTTP status, and content types |

---

## A) Prerequisites

| Tool | Version |
|---|---|
| **Node.js** | 16.x or 18.x LTS (SPFx 1.18.x supported range) |
| **npm** | 8+ (ships with Node) |
| **Yeoman** | `npm install -g yo` |
| **SPFx Yeoman generator** | `npm install -g @microsoft/generator-sharepoint` |
| **Gulp CLI** | `npm install -g gulp-cli` |

### Trust the dev certificate (first time only)

```bash
gulp trust-dev-cert
```

---

## B) Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the local workbench
gulp serve
```

This opens the SharePoint Workbench at `https://localhost:4321/temp/workbench.html`.
To test against a real site, update `config/serve.json` → `initialPage` to your site's workbench URL:

```
https://YOUR-TENANT.sharepoint.com/sites/YOUR-SITE/_layouts/workbench.aspx
```

---

## C) Build & Package (Production)

```bash
# Bundle for production
gulp bundle --ship

# Create the .sppkg package
gulp package-solution --ship
```

The package is output to:

```
sharepoint/solution/tgs-forward-flipbook-spfx.sppkg
```

---

## D) Deployment to SharePoint Online

1. **Upload** the `.sppkg` file to your **Tenant App Catalog**
   - Go to **SharePoint Admin Center → More features → Apps → App Catalog**
   - Or navigate directly: `https://YOUR-TENANT.sharepoint.com/sites/appcatalog/AppCatalog`
   - Upload `tgs-forward-flipbook-spfx.sppkg`
   - Check **"Make this solution available to all sites in the organization"** and click **Deploy**

2. **Add the web part** to a modern SharePoint page
   - Edit a page → **Add a web part** → search for **"TGS Forward Flipbook"**
   - The web part appears with a configuration prompt

3. **Configure** in the property pane
   - **Pages folder URL** (required): absolute or server-relative path to the images folder
     ```
     /sites/SiteName/SiteAssets/tgs-forward/Feb-2026/pages/
     ```
   - **PDF URL** (optional): link to a downloadable PDF version
   - Adjust other settings as needed (file prefix, extension, padding, etc.)

4. **Publish** the page

---

## E) Content Preparation Checklist

### Exporting newsletter pages to images

| Setting | Recommended Value |
|---|---|
| Width | 1800–2200 px |
| Format | **WEBP** (best size/quality) or PNG |
| WEBP quality | 80–90 |
| Resolution | 150+ DPI |

### Naming convention

Files must be zero-padded sequentially:

```
page-001.webp
page-002.webp
page-003.webp
…
```

The prefix (`page-`), extension (`.webp`), starting index (`1`), and zero-padding digits (`3`) are all configurable in the web part properties.

### Upload location

Upload the images folder to **Site Assets** (recommended):

```
SiteAssets/
  tgs-forward/
    Feb-2026/
      pages/
        page-001.webp
        page-002.webp
        …
```

### Permissions

Ensure **all target readers** (e.g. all employees) have **Read** access to the document library and folder. The web part runs under the current user's permissions.

---

## F) Troubleshooting

### Images return 403 Forbidden

- The current user lacks Read permission on the document library or specific folder.
- Check inheritance: the images folder may have broken permission inheritance.
- Fix: grant Read access at the library or folder level.

### Page detection stops early (fewer pages than expected)

- Verify filenames match the expected pattern exactly (prefix + zero-padded index + extension).
- Check that there are no gaps in the numbering.
- Try setting **Force page count** in the property pane to bypass auto-detection.

### Using `forcePageCount`

Set this property to the exact number of pages (e.g. `24`) to skip the sequential probe loop. This is useful when:
- Auto-detection is slow due to high page counts
- The SharePoint environment returns unexpected responses for missing files

### Verifying URLs in the browser

1. Copy the **Pages folder URL** from the property pane
2. Append a filename: `page-001.webp`
3. Paste into the browser address bar
4. You should see the image. If you see a SharePoint error page or login prompt, the URL or permissions are incorrect.

### Common URL patterns

```
# Absolute
https://contoso.sharepoint.com/sites/Intranet/SiteAssets/newsletters/Jan-2026/pages/

# Server-relative
/sites/Intranet/SiteAssets/newsletters/Jan-2026/pages/
```

Both formats are accepted; the web part normalises them automatically.

---

## Project Structure

```
tgs-forward-flipbook-spfx/
├── config/                          # SPFx build configuration
│   ├── config.json
│   ├── package-solution.json
│   ├── serve.json
│   └── …
├── src/
│   └── webparts/
│       └── tgsForwardFlipbook/
│           ├── TgsForwardFlipbookWebPart.ts          # SPFx entry point
│           ├── TgsForwardFlipbookWebPart.manifest.json
│           ├── loc/                                   # Localisation strings
│           ├── components/
│           │   ├── TgsForwardFlipbook.tsx             # Container: loading, discovery, error
│           │   ├── FlipbookViewer.tsx                 # 3D flipbook rendering engine
│           │   ├── FlipbookControls.tsx               # Toolbar + page slider
│           │   ├── ErrorPanel.tsx                     # Diagnostic error display
│           │   ├── LoadingSpinner.tsx                 # Loading indicator
│           │   └── *.module.scss                      # Component styles
│           └── utils/
│               ├── types.ts                           # Shared TypeScript types
│               ├── urlUtils.ts                        # URL normalisation + builder
│               ├── pageDiscovery.ts                   # Sequential page probing
│               ├── imagePreloader.ts                  # In-memory image cache
│               └── gestureHandler.ts                  # Pointer drag / swipe hook
├── package.json
├── tsconfig.json
├── gulpfile.js
└── README.md
```

---

## License

Internal use — TGS.
