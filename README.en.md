Language:
- [ITA](README.md)
- [ENG](README.en.md)

# Statistics Widget

React + TypeScript application built with Vite that exposes a widget to display statistics and charts via AG Grid/AG Charts Enterprise. The bundle can be embedded into external pages and adapts to multiple data-display scenarios.

## Widget variants
- Static widget: `statId` + `graphId` render the saved chart for a specific statistic
- Dynamic snapshot: `token` loads a time-limited public snapshot and rebuilds the chart
- Dynamic table: `token` + `view=table` shows a pivotable/filterable table with the snapshot data

## Requirements
- Node.js 18+ and npm
- Access to Plank APIs
- AG Grid Enterprise license
- For local env with auto-login: `VITE_APP_ENV=local`, `VITE_API_USER`, `VITE_API_PASSWORD`

Example `.env`:
```
VITE_API_BASE_URL=https://api.example.com
VITE_AG_GRID_LICENSE=your-license-key

# For local environment only
VITE_APP_ENV=local
VITE_API_USER=demo
VITE_API_PASSWORD=demo
```

## Install
```bash
npm install
```

## Development (HMR)
```bash
npm run dev
```
Starts the Vite dev server with hot reload. The widget mounts on `#stats-widget` reading URL parameters (`statId`/`graphId` or `token` plus optional `view=table`).

## Build
- `npm run build`: `tsc` + `vite build --mode development` for test/stage artifacts (output in `dist/`)
- `npm run release`: `tsc` + `vite build --mode production` for the production bundle
- `npm run preview`: serves the produced build for a local check

The output goes to `dist/` with JS/CSS under `dist/assets/` (no hashes thanks to Rollup config). Public path is set to `base: ./` so assets can be hosted as static files If necessary, update the version number of main.js and main.css in widget.html when performing local tests.

Specifically, for release into **production** after `npm run release`, execute:
- git add .
- git commit -m “RELEASE”
- git push origin main
- git tag vX.X.X (check previous tag on GitHub)
- git push origin vX.X.X

## Quick embed
Example of embedding that loads the static widget:
```php

<?php
                $baseUrl = 'path_to_widget/widget.html';
                $token   = 'token_value' ?? ‘’;
                $statId  = 0;
                $graphId = 0;

				$query = 'token=' . $token . '&statId=' . $statId . ‘'&graphId=' . $graphId;
                $src   = $baseUrl . ‘?’ . $query;
				?>
                <div style="width:100%;height:400px;max-height:100vh;position:relative;">
                    <iframe
                        src="<?php echo $src ?>"
                    ></iframe>
                </div>
```
Supported URL parameters:
- `statId` + `graphId`: static widget (token only used for sessionStorage if provided)
- `token`: dynamic widget; add `view=table` for the pivotable table
