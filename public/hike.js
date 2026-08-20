/* Offline hike map — no Next.js required. Reads routes from IndexedDB. */
(function () {
  const DB_NAME = 'trail-journal-offline';
  const STORE = 'routes';
  const TOPO_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
  const TOWN_MAX_MI = 8;
  const WATER_MAX_MI = 0.5;

  /** @type {import('leaflet').Map | null} */
  let map = null;
  /** @type {import('leaflet').LayerGroup | null} */
  let routeLayer = null;
  /** @type {import('leaflet').Marker | null} */
  let gpsMarker = null;
  /** @type {number | null} */
  let gpsWatchId = null;
  /** @type {Array<any>} */
  let routes = [];
  /** @type {string | null} */
  let selectedId = null;

  const statusEl = document.getElementById('status');
  const gpsStatusEl = document.getElementById('gps-status');
  const routeListEl = document.getElementById('route-list');
  const trackGpsEl = document.getElementById('track-gps');

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setGpsStatus(text) {
    if (gpsStatusEl) gpsStatusEl.textContent = text;
  }

  function haversineMiles(a, b) {
    const R = 3958.8;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function distanceToRouteMiles(poi, waypoints) {
    let min = Infinity;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
      min = Math.min(min, haversineMiles(poi, a), haversineMiles(poi, b), haversineMiles(poi, mid));
    }
    if (waypoints.length === 1) min = haversineMiles(poi, waypoints[0]);
    return min;
  }

  function filterPoisNearRoute(pois, waypoints, maxMi) {
    return pois.filter((poi) => distanceToRouteMiles(poi, waypoints) <= maxMi);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async function listOfflineRoutes() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        db.close();
        resolve((req.result || []).map((row) => row.route));
      };
      req.onerror = () => reject(req.error);
    });
  }

  function fixLeafletIcons() {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: '/vendor/leaflet/marker-icon.png',
      iconRetinaUrl: '/vendor/leaflet/marker-icon-2x.png',
      shadowUrl: '/vendor/leaflet/marker-shadow.png',
    });
  }

  function initMap() {
    if (map) return;
    fixLeafletIcons();
    map = L.map('map', { zoomControl: true });
    L.tileLayer(TOPO_URL, {
      attribution:
        '© OpenStreetMap · OpenTopoMap',
      maxZoom: 17,
      crossOrigin: true,
    }).addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    map.setView([39.5, -98], 4);
  }

  function renderRouteList() {
    if (!routeListEl) return;
    routeListEl.innerHTML = '';
    routes.forEach((route) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = route.id === selectedId ? 'active' : '';
      const towns = filterPoisNearRoute(route.resupply || [], route.waypoints, TOWN_MAX_MI).length;
      const water = filterPoisNearRoute(route.water || [], route.waypoints, WATER_MAX_MI).length;
      btn.innerHTML = `<strong>${route.name}</strong><span class="meta">${towns} towns · ${water} water</span>`;
      btn.addEventListener('click', () => selectRoute(route.id));
      li.appendChild(btn);
      routeListEl.appendChild(li);
    });
  }

  function selectRoute(id) {
    selectedId = id;
    renderRouteList();
    drawSelectedRoute();
  }

  function drawSelectedRoute() {
    if (!map || !routeLayer) return;
    routeLayer.clearLayers();
    const route = routes.find((r) => r.id === selectedId);
    if (!route) return;

    const latlngs = route.waypoints.map((w) => [w.lat, w.lng]);
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: '#E85D04', weight: 4, opacity: 0.95 }).addTo(routeLayer);
    }

    route.waypoints.forEach((w, i) => {
      L.circleMarker([w.lat, w.lng], {
        radius: i === 0 || i === route.waypoints.length - 1 ? 7 : 5,
        color: '#fff',
        weight: 2,
        fillColor: '#E85D04',
        fillOpacity: 0.95,
      })
        .bindPopup(`<strong>${w.name}</strong>`)
        .addTo(routeLayer);
    });

    filterPoisNearRoute(route.resupply || [], route.waypoints, TOWN_MAX_MI).forEach((poi) => {
      L.marker([poi.lat, poi.lng])
        .bindPopup(`<strong>${poi.name}</strong><br/>Town · resupply`)
        .addTo(routeLayer);
    });

    filterPoisNearRoute(route.water || [], route.waypoints, WATER_MAX_MI).forEach((poi) => {
      L.marker([poi.lat, poi.lng])
        .bindPopup(`<strong>${poi.name || 'Water'}</strong><br/>Water source`)
        .addTo(routeLayer);
    });

    if (latlngs.length > 0) {
      map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 12 });
    }
  }

  function startGps() {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not available in this browser.');
      return;
    }
    stopGps();
    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!map) return;
        if (!gpsMarker) {
          gpsMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: '',
              html: '<span class="gps-dot"></span>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          })
            .bindPopup('You are here')
            .addTo(map);
        } else {
          gpsMarker.setLatLng([lat, lng]);
        }
        setGpsStatus(`GPS active · ±${Math.round(accuracy)}m`);
      },
      (err) => setGpsStatus(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  function stopGps() {
    if (gpsWatchId != null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId = null;
    }
    if (gpsMarker && map) {
      map.removeLayer(gpsMarker);
      gpsMarker = null;
    }
    setGpsStatus('');
  }

  trackGpsEl?.addEventListener('change', () => {
    if (trackGpsEl.checked) startGps();
    else stopGps();
  });

  async function boot() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    initMap();
    routes = await listOfflineRoutes();
    if (routes.length === 0) {
      setStatus('No downloaded routes. Connect to WiFi, download a route, then reopen this page.');
      return;
    }

    setStatus(
      navigator.onLine
        ? `${routes.length} downloaded route(s) ready.`
        : `Offline — ${routes.length} downloaded route(s).`,
    );
    selectedId = routes[0].id;
    renderRouteList();
    drawSelectedRoute();
  }

  boot().catch(() => {
    setStatus('Could not load offline routes.');
  });
})();
