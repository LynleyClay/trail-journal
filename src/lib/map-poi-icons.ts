/** Shared Leaflet divIcon factories for trail/resupply map markers. */

export function townPoiIcon() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  return L.divIcon({
    className: 'poi-marker',
    html: `<span class="poi-marker__badge poi-marker__badge--town" title="Resupply">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6zm0 2.2 5 3.75V19h-2v-6H9v6H7v-10.05L12 5.2z"/>
      </svg>
    </span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
    popupAnchor: [0, -32],
  });
}

export function waterPoiIcon() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  return L.divIcon({
    className: 'poi-marker',
    html: `<span class="poi-marker__badge poi-marker__badge--water" title="Water">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M12 2.5c-2.2 3.5-6 8.1-6 12a6 6 0 1 0 12 0c0-3.9-3.8-8.5-6-12zm0 17.5a3.5 3.5 0 0 1-3.5-3.5c0-2.2 2.2-5.6 3.5-7.4 1.3 1.8 3.5 5.2 3.5 7.4A3.5 3.5 0 0 1 12 20z"/>
      </svg>
    </span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
    popupAnchor: [0, -32],
  });
}

export function highlightPoiIcon() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  return L.divIcon({
    className: 'poi-marker',
    html: `<span class="poi-marker__badge poi-marker__badge--highlight" title="Highlight">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6L12 2z"/>
      </svg>
    </span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
    popupAnchor: [0, -32],
  });
}

export function guideStopIcon(kind: 'highlight' | 'resupply' | 'water') {
  if (kind === 'water') return waterPoiIcon();
  if (kind === 'resupply') return townPoiIcon();
  return highlightPoiIcon();
}
