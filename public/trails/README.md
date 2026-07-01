# Trail GeoJSON Files

- `pct.geojson` — Pacific Crest Trail
- `cdt.geojson` — Continental Divide Trail
- `at.geojson` — Appalachian Trail

Each file is a single `MultiLineString` feature, generalized to ~0.001°
tolerance server-side to keep file size reasonable for a background map
overlay (rather than precision navigation data).

## Source

USGS "National Trails" layer from The National Map transportation service
(public domain, U.S. federal government data):
https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/11

Segments were selected by their `nationaltraildesignation` attribute
(`NST - Appalachian`, `NST - Pacific Crest`, `NST - Continental Divide`) and
merged into one feature per trail. To refresh, re-run the same query with
`outSR=4326`, `f=geojson`, and pagination via `resultOffset`/`resultRecordCount`
(the service caps at 2000 records per request).
