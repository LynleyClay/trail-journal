# Trail GeoJSON Files

Place simplified GeoJSON files for the three long trails here:

- `pct.geojson` — Pacific Crest Trail
- `cdt.geojson` — Continental Divide Trail
- `at.geojson` — Appalachian Trail

## Sourcing

- PCT: https://github.com/osm-us/pct-data (or export from OpenStreetMap relation 1243790)
- CDT: Export from OpenStreetMap relation 921859
- AT: Export from OpenStreetMap relation 3238008

## Simplification

Full-resolution files can exceed 50 MB. Simplify to ≤ 500 KB per file using
[Mapshaper](https://mapshaper.org/) with Douglas-Peucker at 0.001° tolerance
before committing.
