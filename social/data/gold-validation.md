# Kullan hintahistorian validointi (dokumentoitu 30.9.2026)

Aineisto: `price-history-archive.json` + `price-history.json` (€/g, 2 desimaalia).
Alkuperäistä USD-hintaa ei tallenneta, joten dollarimääräinen hinta on palautettu kaavalla
`€/g × 31,1034768 ÷ EUR-kurssi`, jossa EUR/USD on saman hintapalvelun (MetalPrice API)
samojen päivien kurssi hopeahaun raakavastauksista (`backfill-silver.mjs`, 30.9.2026).
Arkipäivät, poistettu jakso 20.–28.6.2013 ei mukana. Raakavastauksia ei tallenneta repoon
(MetalPrice API:n ehdot kieltävät raakadatan jakelun) — tämä taulukko on johdettua dataa.

Vertailuarvot: LBMA:n kullan vuosikeskiarvot (USD/oz). EUR/USD-vertailu EKP:tä vastaan:
ks. `silver-validation.md` (sama kurssisarja, ero enintään 0,10 % vuosina 2012–2024).

| Vuosi | n | Kulta USD/oz (aineisto) | LBMA | ero |
|---|---|---|---|---|
| 2011 | 153 | 1669.94 | – | – |
| 2012 | 261 | 1668.04 | 1668.98 | -0.06 % |
| 2013 | 254 | 1415.02 | 1411.23 | 0.27 % |
| 2014 | 261 | 1265.99 | 1266.40 | -0.03 % |
| 2015 | 261 | 1159.73 | 1160.06 | -0.03 % |
| 2016 | 261 | 1250.50 | 1250.74 | -0.02 % |
| 2017 | 260 | 1258.35 | 1257.15 | 0.10 % |
| 2018 | 261 | 1269.27 | 1268.49 | 0.06 % |
| 2019 | 261 | 1393.40 | 1392.60 | 0.06 % |
| 2020 | 262 | 1771.69 | 1769.64 | 0.12 % |
| 2021 | 261 | 1799.25 | 1798.61 | 0.04 % |
| 2022 | 260 | 1801.93 | 1800.09 | 0.10 % |
| 2023 | 260 | 1944.19 | 1940.54 | 0.19 % |
| 2024 | 262 | 2386.83 | 2386.20 | 0.03 % |
| 2025 | 261 | 3440.46 | – | – |
| 2026 | 193 | 4551.17 | – | – |

- 2011 alkaa kesäkuusta ja 2026 on kesken → ei vertailukelpoisia.
- 2013: vertailuun vaikuttaa poistettu jakso (LBMA:n keskiarvo sisältää ne päivät).
- Kultahistoria alkaa palvelussa 1.6.2011 (backfill-archive.mjs pysähtyi tyhjään jaksoon, testattu 9/2026).

## Poistettu jakso

| Jakso | Havainto | Peruste |
|---|---|---|
| 20.–28.6.2013 | XAU jumissa ~1 340–1 368 $/oz, todellinen ~1 210–1 290 $/oz; 1.7.2013 keinotekoinen −7 %:n hyppy | Ks. `backfill-archive.mjs`. Sama jumijakso myös hopeassa. |
