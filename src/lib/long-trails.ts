import { haversineMiles, uid, type Waypoint } from '@/lib/routes';

export type LatLng = { lat: number; lng: number }

export type LongTrail = {
  id: string
  name: string
  abbrev: string
  region: 'East' | 'Midwest' | 'South' | 'West' | 'Southwest' | 'National'
  miles: number
  color: string
  termini: [string, string]
  /** Simplified corridor vertices south/west → north/east (or conventional thru direction) */
  path: LatLng[]
}

/** Major U.S. (and select North American) long-distance hiking trails — simplified corridors for route stitching. */
export const LONG_TRAILS: LongTrail[] = [
  {
    id: 'at',
    name: 'Appalachian Trail',
    abbrev: 'AT',
    region: 'East',
    miles: 2190,
    color: '#2F6B4F',
    termini: ['Springer Mountain, GA', 'Mount Katahdin, ME'],
    path: [
      { lat: 34.6268, lng: -84.1938 },
      { lat: 35.6118, lng: -83.4895 },
      { lat: 36.106, lng: -82.11 },
      { lat: 37.271, lng: -79.941 },
      { lat: 38.544, lng: -78.337 },
      { lat: 39.325, lng: -77.739 },
      { lat: 40.502, lng: -76.39 },
      { lat: 40.971, lng: -75.137 },
      { lat: 41.25, lng: -74.65 },
      { lat: 42.181, lng: -74.255 },
      { lat: 42.448, lng: -73.254 },
      { lat: 43.147, lng: -72.997 },
      { lat: 44.26, lng: -71.3 },
      { lat: 45.2, lng: -69.3 },
      { lat: 45.9044, lng: -68.9213 },
    ],
  },
  {
    id: 'pct',
    name: 'Pacific Crest Trail',
    abbrev: 'PCT',
    region: 'West',
    miles: 2650,
    color: '#1F6F8B',
    termini: ['Campo, CA (Mexico)', 'Canadian border, WA'],
    path: [
      { lat: 32.589, lng: -116.467 },
      { lat: 33.35, lng: -116.88 },
      { lat: 34.35, lng: -117.7 },
      { lat: 36.05, lng: -118.35 },
      { lat: 37.75, lng: -119.55 },
      { lat: 39.3, lng: -120.35 },
      { lat: 41.0, lng: -122.2 },
      { lat: 42.0, lng: -122.6 },
      { lat: 43.5, lng: -122.0 },
      { lat: 45.3, lng: -121.7 },
      { lat: 46.8, lng: -121.7 },
      { lat: 47.95, lng: -121.1 },
      { lat: 49.0, lng: -120.8 },
    ],
  },
  {
    id: 'cdt',
    name: 'Continental Divide Trail',
    abbrev: 'CDT',
    region: 'West',
    miles: 3100,
    color: '#8B4513',
    termini: ['Crazy Cook, NM (Mexico)', 'Waterton–Glacier, MT/Canada'],
    path: [
      { lat: 31.467, lng: -108.2 },
      { lat: 32.8, lng: -108.0 },
      { lat: 34.0, lng: -107.5 },
      { lat: 35.5, lng: -106.9 },
      { lat: 36.5, lng: -106.5 },
      { lat: 37.5, lng: -106.8 },
      { lat: 38.5, lng: -106.3 },
      { lat: 39.6, lng: -105.9 },
      { lat: 41.0, lng: -106.5 },
      { lat: 42.8, lng: -108.7 },
      { lat: 44.5, lng: -110.0 },
      { lat: 45.5, lng: -112.5 },
      { lat: 47.0, lng: -112.8 },
      { lat: 48.5, lng: -113.5 },
      { lat: 49.0, lng: -113.9 },
    ],
  },
  {
    id: 'nct',
    name: 'North Country Trail',
    abbrev: 'NCT',
    region: 'Midwest',
    miles: 4800,
    color: '#4A7C59',
    termini: ['Lake Sakakawea, ND', 'Green Mountain NF, VT'],
    path: [
      { lat: 47.6, lng: -102.3 },
      { lat: 47.0, lng: -96.5 },
      { lat: 46.8, lng: -92.1 },
      { lat: 46.5, lng: -87.5 },
      { lat: 45.5, lng: -84.7 },
      { lat: 44.5, lng: -85.5 },
      { lat: 43.5, lng: -85.0 },
      { lat: 41.5, lng: -84.5 },
      { lat: 41.0, lng: -81.5 },
      { lat: 41.5, lng: -79.0 },
      { lat: 42.0, lng: -77.5 },
      { lat: 42.8, lng: -76.0 },
      { lat: 43.5, lng: -73.8 },
      { lat: 43.9, lng: -72.9 },
    ],
  },
  {
    id: 'iat',
    name: 'Ice Age Trail',
    abbrev: 'IAT',
    region: 'Midwest',
    miles: 1200,
    color: '#5B8FA8',
    termini: ['Interstate State Park, WI', 'Potawatomi State Park, WI'],
    path: [
      { lat: 45.395, lng: -92.647 },
      { lat: 45.9, lng: -91.5 },
      { lat: 45.5, lng: -90.0 },
      { lat: 44.8, lng: -89.5 },
      { lat: 44.0, lng: -89.5 },
      { lat: 43.5, lng: -89.8 },
      { lat: 42.8, lng: -88.5 },
      { lat: 43.0, lng: -87.9 },
      { lat: 44.2, lng: -87.6 },
      { lat: 44.88, lng: -87.42 },
    ],
  },
  {
    id: 'ft',
    name: 'Florida Trail',
    abbrev: 'FT',
    region: 'South',
    miles: 1500,
    color: '#2E8B57',
    termini: ['Big Cypress, FL', 'Fort Pickens, FL'],
    path: [
      { lat: 25.86, lng: -81.03 },
      { lat: 27.0, lng: -81.3 },
      { lat: 28.5, lng: -81.4 },
      { lat: 29.2, lng: -81.6 },
      { lat: 29.7, lng: -82.3 },
      { lat: 30.2, lng: -82.4 },
      { lat: 30.4, lng: -84.3 },
      { lat: 30.6, lng: -86.5 },
      { lat: 30.33, lng: -87.14 },
    ],
  },
  {
    id: 'azt',
    name: 'Arizona Trail',
    abbrev: 'AZT',
    region: 'Southwest',
    miles: 800,
    color: '#C45C26',
    termini: ['Mexico border, AZ', 'Utah border, AZ'],
    path: [
      { lat: 31.334, lng: -110.468 },
      { lat: 31.7, lng: -110.7 },
      { lat: 32.4, lng: -110.7 },
      { lat: 33.5, lng: -111.0 },
      { lat: 34.3, lng: -111.3 },
      { lat: 35.2, lng: -111.7 },
      { lat: 36.0, lng: -112.1 },
      { lat: 36.5, lng: -112.0 },
      { lat: 37.0, lng: -112.0 },
    ],
  },
  {
    id: 'net',
    name: 'New England Trail',
    abbrev: 'NET',
    region: 'East',
    miles: 215,
    color: '#3D6B4F',
    termini: ['Long Island Sound, CT', 'NH/MA border'],
    path: [
      { lat: 41.27, lng: -72.82 },
      { lat: 41.55, lng: -72.75 },
      { lat: 41.9, lng: -72.7 },
      { lat: 42.2, lng: -72.55 },
      { lat: 42.5, lng: -72.5 },
      { lat: 42.73, lng: -72.5 },
    ],
  },
  {
    id: 'pnt',
    name: 'Pacific Northwest Trail',
    abbrev: 'PNT',
    region: 'West',
    miles: 1200,
    color: '#2A6F7A',
    termini: ['Glacier NP, MT', 'Cape Alava, WA'],
    path: [
      { lat: 48.7, lng: -113.7 },
      { lat: 48.9, lng: -116.0 },
      { lat: 48.7, lng: -118.5 },
      { lat: 48.5, lng: -120.5 },
      { lat: 48.7, lng: -121.5 },
      { lat: 48.0, lng: -123.5 },
      { lat: 48.16, lng: -124.73 },
    ],
  },
  {
    id: 'pht',
    name: 'Potomac Heritage Trail',
    abbrev: 'PHT',
    region: 'East',
    miles: 710,
    color: '#5C6B73',
    termini: ['Pittsburgh area, PA', 'Chesapeake Bay, VA'],
    path: [
      { lat: 40.44, lng: -79.99 },
      { lat: 39.65, lng: -78.76 },
      { lat: 39.32, lng: -77.74 },
      { lat: 38.9, lng: -77.05 },
      { lat: 38.3, lng: -77.0 },
      { lat: 37.95, lng: -76.4 },
    ],
  },
  {
    id: 'lt',
    name: 'Long Trail',
    abbrev: 'LT',
    region: 'East',
    miles: 273,
    color: '#1B4D3E',
    termini: ['Massachusetts border, VT', "Journey's End, Canadian border"],
    path: [
      { lat: 42.745, lng: -73.14 },
      { lat: 43.15, lng: -73.05 },
      { lat: 43.65, lng: -72.84 },
      { lat: 44.15, lng: -72.9 },
      { lat: 44.32, lng: -72.89 },
      { lat: 44.92, lng: -72.52 },
      { lat: 45.013, lng: -72.462 },
    ],
  },
  {
    id: 'ct',
    name: 'Colorado Trail',
    abbrev: 'CT',
    region: 'West',
    miles: 567,
    color: '#A0522D',
    termini: ['Denver, CO', 'Durango, CO'],
    path: [
      { lat: 39.5, lng: -105.1 },
      { lat: 39.3, lng: -105.7 },
      { lat: 38.9, lng: -106.2 },
      { lat: 38.5, lng: -106.3 },
      { lat: 37.9, lng: -106.9 },
      { lat: 37.5, lng: -107.5 },
      { lat: 37.27, lng: -107.88 },
    ],
  },
  {
    id: 'jmt',
    name: 'John Muir Trail',
    abbrev: 'JMT',
    region: 'West',
    miles: 211,
    color: '#3A7CA5',
    termini: ['Happy Isles, Yosemite', 'Mount Whitney'],
    path: [
      { lat: 37.733, lng: -119.558 },
      { lat: 37.8, lng: -119.35 },
      { lat: 37.5, lng: -119.0 },
      { lat: 37.2, lng: -118.85 },
      { lat: 36.8, lng: -118.45 },
      { lat: 36.578, lng: -118.292 },
    ],
  },
  {
    id: 'sht',
    name: 'Superior Hiking Trail',
    abbrev: 'SHT',
    region: 'Midwest',
    miles: 310,
    color: '#2F5D50',
    termini: ['Jay Cooke SP, MN', 'Canadian border, MN'],
    path: [
      { lat: 46.65, lng: -92.37 },
      { lat: 47.0, lng: -91.7 },
      { lat: 47.3, lng: -91.2 },
      { lat: 47.6, lng: -90.8 },
      { lat: 47.9, lng: -89.9 },
      { lat: 48.0, lng: -89.85 },
    ],
  },
  {
    id: 'ouachita',
    name: 'Ouachita Trail',
    abbrev: 'OT',
    region: 'South',
    miles: 223,
    color: '#6B8E23',
    termini: ['Talimena SP, OK', 'Pinnacle Mountain, AR'],
    path: [
      { lat: 34.78, lng: -94.95 },
      { lat: 34.7, lng: -94.2 },
      { lat: 34.65, lng: -93.5 },
      { lat: 34.7, lng: -92.8 },
      { lat: 34.84, lng: -92.46 },
    ],
  },
  {
    id: 'oht',
    name: 'Ozark Highlands Trail',
    abbrev: 'OHT',
    region: 'South',
    miles: 165,
    color: '#556B2F',
    termini: ['Lake Fort Smith, AR', 'Richland Creek, AR'],
    path: [
      { lat: 35.68, lng: -94.12 },
      { lat: 35.75, lng: -93.7 },
      { lat: 35.8, lng: -93.3 },
      { lat: 35.82, lng: -92.9 },
    ],
  },
  {
    id: 'pinhoti',
    name: 'Pinhoti Trail',
    abbrev: 'PHTI',
    region: 'South',
    miles: 335,
    color: '#4F7A4F',
    termini: ['Flagg Mountain, AL', 'Springer approach, GA'],
    path: [
      { lat: 32.98, lng: -86.0 },
      { lat: 33.5, lng: -85.7 },
      { lat: 34.0, lng: -85.5 },
      { lat: 34.3, lng: -85.2 },
      { lat: 34.6, lng: -84.5 },
      { lat: 34.63, lng: -84.2 },
    ],
  },
  {
    id: 'mst',
    name: 'Mountains-to-Sea Trail',
    abbrev: 'MST',
    region: 'East',
    miles: 1175,
    color: '#3E6B5A',
    termini: ['Clingmans Dome, NC', 'Jockey’s Ridge, NC'],
    path: [
      { lat: 35.563, lng: -83.498 },
      { lat: 35.6, lng: -82.5 },
      { lat: 35.8, lng: -81.5 },
      { lat: 35.9, lng: -80.0 },
      { lat: 35.8, lng: -78.6 },
      { lat: 35.7, lng: -77.0 },
      { lat: 35.6, lng: -75.8 },
      { lat: 35.964, lng: -75.633 },
    ],
  },
  {
    id: 'trt',
    name: 'Tahoe Rim Trail',
    abbrev: 'TRT',
    region: 'West',
    miles: 165,
    color: '#4682B4',
    termini: ['Tahoe City loop start', 'Tahoe City loop close'],
    path: [
      { lat: 39.168, lng: -120.145 },
      { lat: 39.25, lng: -120.05 },
      { lat: 39.1, lng: -119.9 },
      { lat: 38.9, lng: -119.95 },
      { lat: 38.85, lng: -120.1 },
      { lat: 39.0, lng: -120.2 },
      { lat: 39.168, lng: -120.145 },
    ],
  },
  {
    id: 'oct',
    name: 'Oregon Coast Trail',
    abbrev: 'OCT',
    region: 'West',
    miles: 425,
    color: '#1E6B7A',
    termini: ['Columbia River, OR', 'California border, OR'],
    path: [
      { lat: 46.2, lng: -123.95 },
      { lat: 45.5, lng: -123.95 },
      { lat: 44.6, lng: -124.05 },
      { lat: 43.4, lng: -124.3 },
      { lat: 42.4, lng: -124.4 },
      { lat: 42.0, lng: -124.2 },
    ],
  },
  {
    id: 'buckeye',
    name: 'Buckeye Trail',
    abbrev: 'BT',
    region: 'Midwest',
    miles: 1444,
    color: '#6B4F3A',
    termini: ['Cincinnati loop', 'Lake Erie (loop system)'],
    path: [
      { lat: 39.1, lng: -84.5 },
      { lat: 39.3, lng: -83.0 },
      { lat: 40.0, lng: -82.0 },
      { lat: 41.0, lng: -81.5 },
      { lat: 41.5, lng: -82.7 },
      { lat: 41.6, lng: -83.5 },
      { lat: 40.5, lng: -84.0 },
      { lat: 39.5, lng: -84.5 },
      { lat: 39.1, lng: -84.5 },
    ],
  },
  {
    id: 'flt',
    name: 'Finger Lakes Trail',
    abbrev: 'FLT',
    region: 'East',
    miles: 580,
    color: '#5A7A4A',
    termini: ['Allegany SP, NY', 'Catskills / Long Path link'],
    path: [
      { lat: 42.1, lng: -78.75 },
      { lat: 42.3, lng: -77.5 },
      { lat: 42.4, lng: -76.5 },
      { lat: 42.45, lng: -75.5 },
      { lat: 42.2, lng: -74.5 },
    ],
  },
  {
    id: 'hayduke',
    name: 'Hayduke Trail',
    abbrev: 'HDT',
    region: 'Southwest',
    miles: 800,
    color: '#B85C38',
    termini: ['Arches NP, UT', 'Zion NP, UT'],
    path: [
      { lat: 38.73, lng: -109.59 },
      { lat: 38.2, lng: -110.0 },
      { lat: 37.7, lng: -110.5 },
      { lat: 37.3, lng: -111.5 },
      { lat: 37.2, lng: -112.5 },
      { lat: 37.25, lng: -112.95 },
    ],
  },
  {
    id: 'bmt',
    name: 'Benton MacKaye Trail',
    abbrev: 'BMT',
    region: 'East',
    miles: 288,
    color: '#3F6B4A',
    termini: ['Springer Mountain, GA', 'Davenport Gap, TN/NC'],
    path: [
      { lat: 34.627, lng: -84.194 },
      { lat: 34.9, lng: -84.3 },
      { lat: 35.2, lng: -84.2 },
      { lat: 35.5, lng: -84.0 },
      { lat: 35.65, lng: -83.7 },
      { lat: 35.769, lng: -83.123 },
    ],
  },
  {
    id: 'sheltowee',
    name: 'Sheltowee Trace',
    abbrev: 'ST',
    region: 'South',
    miles: 290,
    color: '#6B5B3A',
    termini: ['Morehead, KY', 'TN border'],
    path: [
      { lat: 38.18, lng: -83.43 },
      { lat: 37.8, lng: -83.6 },
      { lat: 37.2, lng: -84.0 },
      { lat: 36.8, lng: -84.5 },
      { lat: 36.6, lng: -84.7 },
    ],
  },
  {
    id: 'allegheny',
    name: 'Allegheny Trail',
    abbrev: 'ALT',
    region: 'East',
    miles: 330,
    color: '#4A5E4A',
    termini: ['Pennsylvania border, WV', 'Blackwater Falls area'],
    path: [
      { lat: 39.72, lng: -79.65 },
      { lat: 39.2, lng: -79.8 },
      { lat: 38.7, lng: -79.9 },
      { lat: 38.2, lng: -80.2 },
      { lat: 37.8, lng: -80.5 },
    ],
  },
  {
    id: 'tuscarora',
    name: 'Tuscarora Trail',
    abbrev: 'TT',
    region: 'East',
    miles: 252,
    color: '#5C6B4A',
    termini: ['AT near Mathews Arm, VA', 'AT near Carlisle, PA'],
    path: [
      { lat: 38.75, lng: -78.3 },
      { lat: 39.1, lng: -78.4 },
      { lat: 39.5, lng: -78.2 },
      { lat: 40.0, lng: -77.6 },
      { lat: 40.2, lng: -77.2 },
    ],
  },
  {
    id: 'cohos',
    name: 'Cohos Trail',
    abbrev: 'COHOS',
    region: 'East',
    miles: 170,
    color: '#2F5A4A',
    termini: ['Crawford Notch, NH', 'Canadian border, NH'],
    path: [
      { lat: 44.2, lng: -71.4 },
      { lat: 44.5, lng: -71.35 },
      { lat: 44.8, lng: -71.3 },
      { lat: 45.0, lng: -71.35 },
      { lat: 45.2, lng: -71.35 },
    ],
  },
  {
    id: 'midst',
    name: 'Mid State Trail',
    abbrev: 'MST-PA',
    region: 'East',
    miles: 327,
    color: '#5A6B5A',
    termini: ['Maryland border, PA', 'New York border, PA'],
    path: [
      { lat: 39.72, lng: -78.6 },
      { lat: 40.3, lng: -78.0 },
      { lat: 40.8, lng: -77.5 },
      { lat: 41.3, lng: -77.3 },
      { lat: 41.9, lng: -77.5 },
    ],
  },
  {
    id: 'adt',
    name: 'American Discovery Trail',
    abbrev: 'ADT',
    region: 'National',
    miles: 6800,
    color: '#8B6914',
    termini: ['Cape Henlopen, DE', 'Point Reyes, CA'],
    path: [
      { lat: 38.79, lng: -75.09 },
      { lat: 39.0, lng: -77.0 },
      { lat: 39.1, lng: -80.0 },
      { lat: 39.0, lng: -84.5 },
      { lat: 39.8, lng: -89.6 },
      { lat: 40.0, lng: -95.0 },
      { lat: 39.7, lng: -101.0 },
      { lat: 39.5, lng: -105.0 },
      { lat: 39.0, lng: -110.0 },
      { lat: 38.5, lng: -116.0 },
      { lat: 38.0, lng: -122.8 },
    ],
  },
  {
    id: 'lone-star',
    name: 'Lone Star Trail',
    abbrev: 'LST',
    region: 'South',
    miles: 128,
    color: '#8B5A2B',
    termini: ['Sam Houston NF west', 'Sam Houston NF east'],
    path: [
      { lat: 30.5, lng: -95.7 },
      { lat: 30.55, lng: -95.4 },
      { lat: 30.5, lng: -95.1 },
      { lat: 30.45, lng: -94.9 },
    ],
  },
  {
    id: 'r2r',
    name: 'River to River Trail',
    abbrev: 'R2R',
    region: 'Midwest',
    miles: 160,
    color: '#4A6B4A',
    termini: ['Mississippi River, IL', 'Ohio River / Battery Rock'],
    path: [
      { lat: 37.65, lng: -89.5 },
      { lat: 37.6, lng: -89.0 },
      { lat: 37.55, lng: -88.5 },
      { lat: 37.55, lng: -88.2 },
    ],
  },
  {
    id: 'wonderland',
    name: 'Wonderland Trail',
    abbrev: 'WT',
    region: 'West',
    miles: 93,
    color: '#2F6B6B',
    termini: ['Longmire loop', 'Longmire close'],
    path: [
      { lat: 46.75, lng: -121.81 },
      { lat: 46.85, lng: -121.75 },
      { lat: 46.9, lng: -121.65 },
      { lat: 46.85, lng: -121.55 },
      { lat: 46.78, lng: -121.55 },
      { lat: 46.75, lng: -121.65 },
      { lat: 46.75, lng: -121.81 },
    ],
  },
  {
    id: 'border-route',
    name: 'Border Route Trail',
    abbrev: 'BRT',
    region: 'Midwest',
    miles: 65,
    color: '#3A5A5A',
    termini: ['Superior Hiking Trail link', 'Kekekabic / Gunflint'],
    path: [
      { lat: 48.05, lng: -91.0 },
      { lat: 48.1, lng: -90.7 },
      { lat: 48.1, lng: -90.4 },
      { lat: 48.08, lng: -90.1 },
    ],
  },
  {
    id: 'iat-intl',
    name: 'International Appalachian Trail',
    abbrev: 'IAT-INT',
    region: 'East',
    miles: 1900,
    color: '#2F5A3A',
    termini: ['Katahdin, ME', 'Cap Gaspé, QC'],
    path: [
      { lat: 45.904, lng: -68.921 },
      { lat: 46.5, lng: -68.0 },
      { lat: 47.2, lng: -68.5 },
      { lat: 47.8, lng: -69.0 },
      { lat: 48.5, lng: -67.5 },
      { lat: 48.8, lng: -65.5 },
      { lat: 48.78, lng: -64.2 },
    ],
  },
  {
    id: 'gdt',
    name: 'Great Divide Trail',
    abbrev: 'GDT',
    region: 'West',
    miles: 700,
    color: '#5C4033',
    termini: ['Waterton, AB', 'Kakwa Lake, BC'],
    path: [
      { lat: 49.05, lng: -113.9 },
      { lat: 50.5, lng: -114.8 },
      { lat: 51.5, lng: -116.0 },
      { lat: 52.5, lng: -117.5 },
      { lat: 53.5, lng: -119.5 },
      { lat: 54.0, lng: -120.2 },
    ],
  },
  {
    id: 'bruce',
    name: 'Bruce Trail',
    abbrev: 'BRUCE',
    region: 'Midwest',
    miles: 550,
    color: '#3D6B4A',
    termini: ['Niagara, ON', 'Tobermory, ON'],
    path: [
      { lat: 43.16, lng: -79.05 },
      { lat: 43.4, lng: -79.8 },
      { lat: 43.8, lng: -80.5 },
      { lat: 44.5, lng: -80.9 },
      { lat: 45.0, lng: -81.3 },
      { lat: 45.25, lng: -81.66 },
    ],
  },
  {
    id: 'cct',
    name: 'California Coastal Trail',
    abbrev: 'CCT',
    region: 'West',
    miles: 1200,
    color: '#1A6A7A',
    termini: ['Oregon border, CA', 'Mexico border, CA'],
    path: [
      { lat: 42.0, lng: -124.2 },
      { lat: 40.8, lng: -124.2 },
      { lat: 39.0, lng: -123.7 },
      { lat: 37.8, lng: -122.5 },
      { lat: 36.5, lng: -121.9 },
      { lat: 34.4, lng: -119.7 },
      { lat: 32.75, lng: -117.25 },
      { lat: 32.53, lng: -117.12 },
    ],
  },
  {
    id: 'natchez',
    name: 'Natchez Trace NST',
    abbrev: 'NTNST',
    region: 'South',
    miles: 695,
    color: '#6B5A3A',
    termini: ['Nashville, TN', 'Natchez, MS'],
    path: [
      { lat: 36.05, lng: -86.9 },
      { lat: 35.5, lng: -87.5 },
      { lat: 34.5, lng: -88.5 },
      { lat: 33.5, lng: -89.5 },
      { lat: 32.5, lng: -90.3 },
      { lat: 31.55, lng: -91.39 },
    ],
  },
]

export function trailPositions(trail: LongTrail): [number, number][] {
  return trail.path.map((p) => [p.lat, p.lng])
}

export function nearestEnd(
  point: LatLng,
  trail: LongTrail,
): { end: 'start' | 'finish'; dist: number; reverse: boolean } {
  const start = trail.path[0]!;
  const finish = trail.path[trail.path.length - 1]!;
  const dStart = haversineMiles(point, start);
  const dFinish = haversineMiles(point, finish);
  if (dFinish < dStart) {
    return { end: 'finish', dist: dFinish, reverse: true }
  }
  return { end: 'start', dist: dStart, reverse: false }
}

/** Orient a trail so it continues from `from` with the shortest gap. */
export function orientedPath(trail: LongTrail, from: LatLng | null): LatLng[] {
  if (!from) return [...trail.path]
  const { reverse } = nearestEnd(from, trail)
  return reverse ? [...trail.path].reverse() : [...trail.path]
}

const JOIN_TOLERANCE_MI = 8

export function trailToWaypoints(
  trail: LongTrail,
  path: LatLng[],
  skipFirst: boolean,
  reversed: boolean,
): Waypoint[] {
  const pts = skipFirst ? path.slice(1) : path
  const startName = reversed ? trail.termini[1] : trail.termini[0]
  const endName = reversed ? trail.termini[0] : trail.termini[1]
  return pts.map((p, i) => {
    const isFirst = i === 0 && !skipFirst
    const isLast = i === pts.length - 1
    return {
      id: uid(`${trail.id}`),
      name: isFirst
        ? `${trail.abbrev} · ${startName}`
        : isLast
          ? `${trail.abbrev} · ${endName}`
          : `${trail.abbrev}`,
      lat: p.lat,
      lng: p.lng,
      note: trail.name,
      trailId: trail.id,
    }
  })
}

export function appendTrailToRoute(
  waypoints: Waypoint[],
  trail: LongTrail,
): { waypoints: Waypoint[]; gapMiles: number } {
  const last = waypoints[waypoints.length - 1];
  const from =
    last != null
      ? { lat: last.lat, lng: last.lng }
      : null;
  const reversed = from ? nearestEnd(from, trail).reverse : false
  const path = reversed ? [...trail.path].reverse() : [...trail.path]
  let gapMiles = 0
  let skipFirst = false

  if (from) {
    const pathStart = path[0];
    if (pathStart) {
      gapMiles = haversineMiles(from, pathStart);
      if (gapMiles < JOIN_TOLERANCE_MI) {
        skipFirst = true;
        gapMiles = 0;
      }
    }
  }

  const added = trailToWaypoints(trail, path, skipFirst, reversed);

  if (from && gapMiles >= JOIN_TOLERANCE_MI && added.length > 0) {
    const first = added[0];
    if (first) {
      added[0] = {
        ...first,
        note: `Connect across ~${gapMiles.toFixed(0)} mi gap → ${trail.name}`,
      };
    }
  }

  return { waypoints: [...waypoints, ...added], gapMiles }
}

function almostSame(a: LatLng, b: LatLng, eps = 1e-5): boolean {
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps
}

export type TrailSnap = {
  trailId: string
  lat: number
  lng: number
  index: number
  t: number
  progress: number
  distMiles: number
}

function nearestPointOnSegment(
  p: LatLng,
  a: LatLng,
  b: LatLng,
): { lat: number; lng: number; t: number; distMiles: number } {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const len2 = dx * dx + dy * dy
  const t =
    len2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / len2))
  const lat = a.lat + t * dy
  const lng = a.lng + t * dx
  return { lat, lng, t, distMiles: haversineMiles(p, { lat, lng }) }
}

/** Project a click onto the nearest point along a trail corridor. */
export function snapToTrail(trail: LongTrail, point: LatLng): TrailSnap {
  let best: TrailSnap | null = null
  for (let i = 0; i < trail.path.length - 1; i++) {
    const a = trail.path[i]
    const b = trail.path[i + 1]
    if (!a || !b) continue
    const n = nearestPointOnSegment(point, a, b)
    if (!best || n.distMiles < best.distMiles) {
      best = {
        trailId: trail.id,
        lat: n.lat,
        lng: n.lng,
        index: i,
        t: n.t,
        progress: i + n.t,
        distMiles: n.distMiles,
      }
    }
  }
  const fallback = trail.path[0]
  if (!best && fallback) {
    return {
      trailId: trail.id,
      lat: fallback.lat,
      lng: fallback.lng,
      index: 0,
      t: 0,
      progress: 0,
      distMiles: haversineMiles(point, fallback),
    }
  }
  return best!
}

/** Vertices along `trail` from `from` to `to`, inclusive. */
export function trailSegment(trail: LongTrail, from: LatLng, to: LatLng): LatLng[] {
  const a = snapToTrail(trail, from)
  const b = snapToTrail(trail, to)
  if (Math.abs(a.progress - b.progress) < 1e-6) {
    return [{ lat: a.lat, lng: a.lng }]
  }

  const forward = a.progress <= b.progress
  const lo = forward ? a : b
  const hi = forward ? b : a
  const pts: LatLng[] = [{ lat: lo.lat, lng: lo.lng }]

  for (let i = lo.index + 1; i <= hi.index; i++) {
    const v = trail.path[i]
    if (!v) continue
    const last = pts[pts.length - 1]
    if (last && !almostSame(last, v)) pts.push(v)
  }

  const end = { lat: hi.lat, lng: hi.lng }
  const last = pts[pts.length - 1]
  if (last && !almostSame(last, end)) pts.push(end)
  if (!forward) pts.reverse()
  return pts
}

export function uniqueTrailIds(waypoints: Waypoint[]): string[] {
  const ids: string[] = []
  for (const w of waypoints) {
    if (w.trailId && ids[ids.length - 1] !== w.trailId) ids.push(w.trailId)
  }
  return ids
}

/** Snap a map click onto a nearby long-trail corridor, or null if none are close. */
export const SNAP_TO_TRAIL_MILES = 0.75

export function nearestTrailSnap(
  point: LatLng,
  maxMiles = SNAP_TO_TRAIL_MILES,
): TrailSnap | null {
  let best: TrailSnap | null = null
  for (const trail of LONG_TRAILS) {
    const snap = snapToTrail(trail, point)
    if (!best || snap.distMiles < best.distMiles) best = snap
  }
  if (!best || best.distMiles > maxMiles) return null
  return best
}

/**
 * Drop a pin on `trail`. If the last waypoint is already on the same trail,
 * follow the corridor between the two pins instead of adding the whole trail.
 */
export function appendTrailPin(
  waypoints: Waypoint[],
  trail: LongTrail,
  click: LatLng,
): { waypoints: Waypoint[]; added: number; kind: 'pin' | 'segment' } {
  const snap = snapToTrail(trail, click)
  const last = waypoints[waypoints.length - 1]

  if (last?.trailId === trail.id) {
    const along = trailSegment(trail, last, snap)
    if (along.length < 2) {
      return { waypoints, added: 0, kind: 'pin' }
    }
    const addedWps: Waypoint[] = along.slice(1).map((p, i, arr) => ({
      id: uid(trail.id),
      name: i === arr.length - 1 ? `${trail.abbrev} pin` : trail.abbrev,
      lat: p.lat,
      lng: p.lng,
      note: trail.name,
      trailId: trail.id,
    }))
    return {
      waypoints: [...waypoints, ...addedWps],
      added: addedWps.length,
      kind: 'segment',
    }
  }

  const pin: Waypoint = {
    id: uid(trail.id),
    name: `${trail.abbrev} pin`,
    lat: snap.lat,
    lng: snap.lng,
    note: trail.name,
    trailId: trail.id,
  }
  return { waypoints: [...waypoints, pin], added: 1, kind: 'pin' }
}

export function getTrailById(id: string): LongTrail | undefined {
  return LONG_TRAILS.find((t) => t.id === id)
}

export const TRAIL_REGIONS = [
  'East',
  'Midwest',
  'South',
  'West',
  'Southwest',
  'National',
] as const
