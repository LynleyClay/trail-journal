# Trail GeoJSON Files

- `pct.geojson` — Pacific Crest Trail
- `cdt.geojson` — Continental Divide Trail
- `at.geojson` — Appalachian Trail

Each file is a single `MultiLineString` feature, fetched at full precision
and then simplified client-side with Ramer–Douglas–Peucker (~0.0003°
tolerance, per-segment) to keep file size reasonable for a background map
overlay. Earlier versions used the ArcGIS service's own `maxAllowableOffset`
server-side generalization — don't do that again: this dataset is made of
thousands of short, already-tight segments, and any offset large enough to
meaningfully shrink the file collapses most segments down to a single
duplicate point (renders fine zoomed out to see the whole country, but
disappears completely at street-level zoom).

## Source

USGS "National Trails" layer from The National Map transportation service
(public domain, U.S. federal government data):
https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/11

Segments were selected by their `nationaltraildesignation` attribute
(`NST - Appalachian`, `NST - Pacific Crest`, `NST - Continental Divide`),
fetched at full precision (`outSR=4326`, `f=geojson`, no
`maxAllowableOffset`, paginated via `resultOffset`/`resultRecordCount` since
the service caps at 2000 records per request), simplified locally, and
merged into one feature per trail.
