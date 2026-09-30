# Hopean hintahistorian validointi (30.9.2026)

Aineisto: `silver-price-history-archive.json` + `silver-price-history.json`, haettu
`social/scripts/backfill-silver.mjs`:llä (MetalPrice API, timeframe, `currencies=XAG,EUR`).
Alla vuosikeskiarvot arkipäivistä ILMAN poistettuja jaksoja. Raakavastauksia ei tallenneta
repoon (MetalPrice API:n ehdot kieltävät raakadatan jakelun) — tämä taulukko on johdettua dataa.

Vertailuarvot: LBMA:n hopean vuosikeskiarvot (USD/oz; 2023 ja 2024 vahvistettu myös
Silver Instituten / pv magazinen julkaisusta: 23,35 ja 28,27; 2025: 40,03) ja EKP:n
EUR/USD-viitekurssien vuosikeskiarvot.

| Vuosi | n | XAG USD/oz (aineisto) | LBMA | ero | EUR/USD (aineisto) | EKP | ero |
|---|---|---|---|---|---|---|---|
| 2011 | 153 | 35.38 | – | – | 1.3888 | – | – |
| 2012 | 261 | 31.13 | 31.15 | -0.08 % | 1.2858 | 1.2848 | 0.08 % |
| 2013 | 248 | 23.99 | 23.79 | 0.84 % | 1.3294 | 1.3281 | 0.10 % |
| 2014 | 261 | 19.03 | 19.08 | -0.26 % | 1.3285 | 1.3285 | -0.00 % |
| 2015 | 261 | 15.69 | 15.68 | 0.05 % | 1.1101 | 1.1095 | 0.05 % |
| 2016 | 261 | 17.11 | 17.14 | -0.20 % | 1.1070 | 1.1069 | 0.01 % |
| 2017 | 260 | 17.06 | 17.05 | 0.06 % | 1.1301 | 1.1297 | 0.03 % |
| 2018 | 261 | 15.70 | 15.71 | -0.04 % | 1.1811 | 1.1810 | 0.01 % |
| 2019 | 261 | 16.21 | 16.21 | -0.01 % | 1.1197 | 1.1195 | 0.02 % |
| 2020 | 262 | 20.57 | 20.55 | 0.11 % | 1.1421 | 1.1422 | -0.01 % |
| 2021 | 261 | 25.13 | 25.14 | -0.04 % | 1.1829 | 1.1827 | 0.01 % |
| 2022 | 260 | 21.78 | 21.73 | 0.21 % | 1.0535 | 1.0530 | 0.05 % |
| 2023 | 260 | 23.41 | 23.35 | 0.24 % | 1.0817 | 1.0813 | 0.04 % |
| 2024 | 262 | 28.25 | 28.27 | -0.07 % | 1.0822 | 1.0824 | -0.02 % |
| 2025 | 261 | 40.06 | 40.03 | 0.06 % | 1.1300 | – | – |
| 2026 | 194 | 73.40 | – | – | 1.1615 | – | – |

- 2011 alkaa kesäkuusta ja 2026 on kesken → ei vertailukelpoisia.
- 2013: +0,84 % johtuu poistetuista päivistä. LBMA:n keskiarvo sisältää ne päivät
  todellisilla (matalilla) hinnoilla, tämä aineisto ei sisällä niitä lainkaan.

## Poistetut jaksot

| Jakso | Havainto | Peruste |
|---|---|---|
| 16.–23.4.2013 | XAG ~24,9 $/oz lähes muuttumattomana, 24.4. −7,0 % | Kulta liikkui samana aikana normaalisti (1 352 → 1 419 $); kulta–hopea-suhde hyppäsi pysyvästi ~57 → ~61. Ainoa osuma koko aineistolle ajetussa "hopea seisoo (±1,2 %), kulta liikkuu (>3 %) 4 päivän ikkunassa" -haussa, jota seuraa kiinniottohyppy. |
| 20.–28.6.2013 | XAG ~21,4–22,1 $/oz, 1.7. −10,7 % | Sama jumijakso kuin kullan aineistossa (ks. `backfill-archive.mjs`). |

Muut yli 7 %:n päivähypyt (esim. 22.–23.9.2011, 11.8.2020, 30.1.–2.2.2026) ovat
uutislähteistä tunnettuja todellisia markkinaliikkeitä.
