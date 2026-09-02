// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// City targets for the "storm" phases of GLOBAL THERMONUCLEAR WAR
// (strikeStorm() in game.js), grouped by region. Each entry is
// {label, lon, lat} — plain geographic coordinates (not node ids from
// nodes.js; these are rendered directly via project(lon,lat), unlike the
// launch/target sites in nodes.js/scenarios.js which are referenced by id).
//
// Note: JOHANNESBURG and SYDNEY appear only in `south`, not also in `world`,
// because globalBlanket() concatenates [...world, ...south] without
// deduplicating — a city listed in both would be impacted and counted twice
// within a single pass. strikeStorm('south', ...) is unaffected. See
// tests/unit/warGeoValidation.test.js for the regression guard.
window.JOSHUA_CITY_REGIONS = {
  usa: [
    {label:'SEATTLE',lon:-122.33,lat:47.60},{label:'SAN FRANCISCO',lon:-122.42,lat:37.77},{label:'LOS ANGELES',lon:-118.24,lat:34.05},
    {label:'DENVER',lon:-104.99,lat:39.74},{label:'DALLAS',lon:-96.80,lat:32.78},{label:'HOUSTON',lon:-95.37,lat:29.76},
    {label:'CHICAGO',lon:-87.62,lat:41.88},{label:'ATLANTA',lon:-84.39,lat:33.75},{label:'WASHINGTON',lon:-77.03,lat:38.90},
    {label:'NEW YORK',lon:-74.00,lat:40.71},{label:'BOSTON',lon:-71.06,lat:42.36},{label:'MIAMI',lon:-80.19,lat:25.76}
  ],
  europe: [
    {label:'LONDON',lon:-0.1,lat:51.5},{label:'PARIS',lon:2.35,lat:48.86},{label:'AMSTERDAM',lon:4.90,lat:52.37},
    {label:'BRUSSELS',lon:4.35,lat:50.85},{label:'BERLIN',lon:13.40,lat:52.52},{label:'HAMBURG',lon:9.99,lat:53.55},
    {label:'WARSAW',lon:21.01,lat:52.23},{label:'PRAGUE',lon:14.43,lat:50.08},{label:'VIENNA',lon:16.37,lat:48.21},
    {label:'ROME',lon:12.50,lat:41.90},{label:'MADRID',lon:-3.70,lat:40.42},{label:'STOCKHOLM',lon:18.06,lat:59.33}
  ],
  arctic: [
    {label:'REYKJAVIK',lon:-21.94,lat:64.14},{label:'TROMSO',lon:18.96,lat:69.65},{label:'MURMANSK',lon:33.09,lat:68.97},
    {label:'NORILSK',lon:88.20,lat:69.35},{label:'BARROW',lon:-156.79,lat:71.29},{label:'YELLOWKNIFE',lon:-114.37,lat:62.45},
    {label:'NUUK',lon:-51.72,lat:64.18},{label:'SVALBARD',lon:15.63,lat:78.22}
  ],
  world: [
    {label:'TOKYO',lon:139.69,lat:35.68},{label:'SEOUL',lon:126.97,lat:37.56},{label:'SHANGHAI',lon:121.47,lat:31.23},
    {label:'BEIJING',lon:116.40,lat:39.90},{label:'TAIPEI',lon:121.56,lat:25.03},{label:'HONG KONG',lon:114.17,lat:22.31},
    {label:'DELHI',lon:77.10,lat:28.70},{label:'KARACHI',lon:67.01,lat:24.86},{label:'TEHRAN',lon:51.39,lat:35.69},
    {label:'CAIRO',lon:31.24,lat:30.04},{label:'TEL AVIV',lon:34.78,lat:32.08},{label:'LAGOS',lon:3.38,lat:6.52},
    {label:'SAO PAULO',lon:-46.63,lat:-23.55},{label:'RIO',lon:-43.17,lat:-22.91},
    {label:'MEXICO CITY',lon:-99.13,lat:19.43},{label:'MUMBAI',lon:72.87,lat:19.07}
  ],
  south: [
    {label:'BUENOS AIRES',lon:-58.38,lat:-34.60},{label:'SANTIAGO',lon:-70.66,lat:-33.45},{label:'LIMA',lon:-77.04,lat:-12.05},
    {label:'CAPE TOWN',lon:18.42,lat:-33.93},{label:'JOHANNESBURG',lon:28.04,lat:-26.20},{label:'NAIROBI',lon:36.82,lat:-1.29},
    {label:'KINSHASA',lon:15.31,lat:-4.32},{label:'LUANDA',lon:13.23,lat:-8.84},{label:'PERTH',lon:115.86,lat:-31.95},
    {label:'MELBOURNE',lon:144.96,lat:-37.81},{label:'SYDNEY',lon:151.21,lat:-33.87},{label:'AUCKLAND',lon:174.76,lat:-36.85}
  ]
};
