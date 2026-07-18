# Coordinate research

The app maps the 40 rows from the Wikipedia **Topographic isolation** page table titled "The 40 most topographically isolated summits on Earth". The table's summit names, elevations, isolation distances, and nearest-higher-neighbour names are used as the dataset source.

Coordinates are **not** sourced from that table. Each summit and nearest-higher-neighbour target is entered in `src/main.js` as researched WGS84 decimal latitude/longitude and converted to GeoJSON `[longitude, latitude]` arrays through `location(latitude, longitude)`.

Primary list source: <https://en.wikipedia.org/wiki/Topographic_isolation>

Additional coordinate cross-check sources used while entering WGS84 points include individual Wikipedia mountain pages, Peakbagger, LatLong.net, Coordinates Converter, and map coordinate references.
