// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// Named launch/target/city sites for the GLOBAL THERMONUCLEAR WAR map.
// Referenced by id from warRoutes.js and warStrategyProfiles.js's
// strikes arrays (see tests/unit/warGeoValidation.test.js for the
// automated check that every such reference resolves to an id below).
//
// Each entry: {id, label, lon, lat, type}
//   id    unique string, referenced elsewhere by exact match
//   label short display text drawn on the map (game.js's drawNodes())
//   lon/lat  plain geographic coordinates, projected via game.js's
//            project(lon,lat) into the map SVG's 1600x800 viewBox space
//   type  one of "launch" | "target" | "city" — sets the SVG node's CSS
//         class in drawNodes() (an impacted node instead gets the
//         "impact" class, overriding this). Any other value silently
//         falls through as an unstyled/mis-styled class name.
window.JOSHUA_NODES = {
  "nodes": [
    {"id":"na-west",      "label":"NA WEST",       "lon":-122, "lat":38,  "type":"launch"},
    {"id":"na-east",      "label":"NA EAST",        "lon":-77,  "lat":39,  "type":"launch"},
    {"id":"north-atlantic","label":"N ATL",          "lon":-35,  "lat":48,  "type":"target"},
    {"id":"northern-europe","label":"N EUROPE",      "lon":18,   "lat":60,  "type":"target"},
    {"id":"central-europe","label":"C EUROPE",       "lon":10,   "lat":50,  "type":"target"},
    {"id":"russia-west",  "label":"RUS WEST",        "lon":38,   "lat":56,  "type":"launch"},
    {"id":"siberian-corridor","label":"SIBERIA",     "lon":95,   "lat":58,  "type":"launch"},
    {"id":"arctic",       "label":"ARCTIC",          "lon":60,   "lat":72,  "type":"target"},
    {"id":"china-coast",  "label":"CHINA COAST",     "lon":121,  "lat":31,  "type":"launch"},
    {"id":"taiwan-strait","label":"STRAIT",          "lon":121,  "lat":24,  "type":"target"},
    {"id":"western-pacific","label":"W PACIFIC",     "lon":140,  "lat":32,  "type":"target"},
    {"id":"korea-japan",  "label":"K/J",             "lon":132,  "lat":37,  "type":"target"},
    {"id":"persian-gulf", "label":"GULF",            "lon":51,   "lat":27,  "type":"target"},
    {"id":"iran-corridor","label":"IRAN",            "lon":53,   "lat":32,  "type":"launch"},
    {"id":"levant",       "label":"LEVANT",          "lon":35,   "lat":32,  "type":"launch"},
    {"id":"east-med",     "label":"E MED",           "lon":31,   "lat":35,  "type":"target"},
    {"id":"central-asia", "label":"C ASIA",          "lon":66,   "lat":42,  "type":"target"},
    {"id":"pacific-routes","label":"PAC ROUTES",     "lon":170,  "lat":18,  "type":"target"},
    {"id":"middle-east",  "label":"M EAST",          "lon":45,   "lat":29,  "type":"target"},
    {"id":"north-america","label":"N AMERICA",       "lon":-100, "lat":42,  "type":"target"},
    {"id":"south-china-sea","label":"S CHINA SEA",   "lon":114,  "lat":14,  "type":"target"},
    {"id":"washington",   "label":"WASHINGTON",      "lon":-77,  "lat":38.9,"type":"city"},
    {"id":"new-york",     "label":"NEW YORK",        "lon":-74,  "lat":40.7,"type":"city"},
    {"id":"los-angeles",  "label":"LOS ANGELES",     "lon":-118, "lat":34,  "type":"city"},
    {"id":"moscow",       "label":"MOSCOW",          "lon":37.6, "lat":55.7,"type":"city"},
    {"id":"st-petersburg","label":"ST PETERSBURG",   "lon":30.3, "lat":59.9,"type":"city"},
    {"id":"london",       "label":"LONDON",          "lon":-0.1, "lat":51.5,"type":"city"},
    {"id":"paris",        "label":"PARIS",           "lon":2.35, "lat":48.9,"type":"city"},
    {"id":"berlin",       "label":"BERLIN",          "lon":13.4, "lat":52.5,"type":"city"},
    {"id":"rome",         "label":"ROME",            "lon":12.5, "lat":41.9,"type":"city"},
    {"id":"milan",        "label":"MILAN",           "lon":9.19, "lat":45.5,"type":"city"},
    {"id":"tehran",       "label":"TEHRAN",          "lon":51.4, "lat":35.7,"type":"city"},
    {"id":"tel-aviv",     "label":"TEL AVIV",        "lon":34.8, "lat":32.1,"type":"city"},
    {"id":"riyadh",       "label":"RIYADH",          "lon":46.7, "lat":24.7,"type":"city"},
    {"id":"beijing",      "label":"BEIJING",         "lon":116.4,"lat":39.9,"type":"city"},
    {"id":"shanghai",     "label":"SHANGHAI",        "lon":121.5,"lat":31.2,"type":"city"},
    {"id":"tokyo",        "label":"TOKYO",           "lon":139.7,"lat":35.7,"type":"city"},
    {"id":"guam",         "label":"GUAM",            "lon":144.8,"lat":13.4,"type":"city"},
    {"id":"nuuk",         "label":"NUUK",            "lon":-51.7,"lat":64.2,"type":"city"}
  ]
};
