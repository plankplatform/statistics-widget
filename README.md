Lingua:
- [ITA](README.md)
- [ENG](README.en.md)


# Statistics Widget

Applicazione React + TypeScript basata su Vite che espone un widget per visualizzare statistiche e grafici tramite AG Grid/AG Charts Enterprise. Il bundle può essere incorporato in pagine esterne e si adatta a più scenari di visualizzazione dati.

## Varianti del widget
- Widget statico: `statId` + `graphId` renderizzano il grafico salvato per una specifica statistica
- Snapshot dinamico: `token` richiama uno snapshot pubblico a scadenza e ricostruisce il grafico
- Tabella dinamica: `token` + `view=table` mostra una tabella a scadenza, pivotabile e filtrabile con i dati dello snapshot

## Requisiti
- Node.js 18+ e npm
- Accesso alle Plank API
- Licenza AG Grid Enterprise
- Per ambiente locale e login automatico: `VITE_APP_ENV=local`, `VITE_API_USER`, `VITE_API_PASSWORD`

Esempio `.env`:
```
VITE_API_BASE_URL=https://api.example.com
VITE_AG_GRID_LICENSE=your-license-key

# Solo per ambiente locale
VITE_APP_ENV=local
VITE_API_USER=demo
VITE_API_PASSWORD=demo
```

## Installazione
```bash
npm install
```

## Sviluppo
```bash
npm run dev
```
Avvia il dev server Vite con hot reload. Il widget viene montato sull' elemento `#stats-widget` leggendo i parametri dell URL (`statId`/`graphId` o `token` + opzionale `view=table`)

## Build
- `npm run build`: `tsc` + `vite build --mode development` per artefatti usati in test/stage (output in `dist/`)
- `npm run release`: `tsc` + `vite build --mode production` per il bundle da mettere in produzione


L' output finisce in `dist/` con file JS/CSS/HTML in `dist/assets/` (senza hash grazie alla configurazione Rollup). Public path configurato su `base: ./` per permettere hostaggio come asset statici. Se necessario aggiornare il numero della versione del main.js e main.css in widget.html quando si eseguono test locali.

In particolare per il rilascio in **produzione** successivamente a `npm run release`eseguire:
- git add .
- git commit -m "RELEASE"
- git push origin main
- git tag vX.X.X (guardare tag precedente su github)
- git push origin vX.X.X

## Embed rapido
Esempio di embedding che carica il widget statico:
```php

<?php
				$baseUrl = 'percorso_al_widget/widget.html';
				$token   = 'valore_token' ?? '';
				$statId  = 0;
				$graphId = 0;

				$query = 'token=' . $token . '&statId=' . $statId . '&graphId=' . $graphId;
				$src   = $baseUrl . '?' . $query;
				?>
				<div style="width:100%;height:400px;max-height:100vh;position:relative;">
					<iframe
						src="<?php echo $src ?>"
					></iframe>
				</div>
```
Parametri URL supportati:
- `statId` + `graphId`: widget statico (usa token solo per sessionStorage se passato)
- `token`: widget dinamico; aggiungere `view=table` per la tabella pivotabile
