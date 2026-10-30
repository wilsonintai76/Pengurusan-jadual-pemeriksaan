import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, 
  Navigation, 
  Crosshair, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building, 
  UserCheck, 
  ExternalLink, 
  Edit3, 
  Compass, 
  Search, 
  X, 
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  LocateFixed
} from 'lucide-react';
import { LocationInfo, InspectionStatus } from '@/lib/types';

interface DirektoriLokasiMapViewProps {
  locations: LocationInfo[];
  onEditLocation?: (location: LocationInfo) => void;
  onNavigateToSchedule?: (jadualId?: string) => void;
  highlightLocationId?: string;
}

const POLIKU_DEFAULT_LAT = 1.621425;
const POLIKU_DEFAULT_LNG = 110.323580;

const CAMPUS_ZONES = [
  { name: 'Keseluruhan Kampus', lat: POLIKU_DEFAULT_LAT, lng: POLIKU_DEFAULT_LNG, zoom: 17 },
  { name: 'Blok E (JTMK)', lat: 1.621810, lng: 110.324100, zoom: 19 },
  { name: 'Kompleks JKM', lat: 1.621425, lng: 110.323580, zoom: 19 },
  { name: 'Blok C (JKE)', lat: 1.621050, lng: 110.322900, zoom: 19 },
  { name: 'Blok B (JKA)', lat: 1.620800, lng: 110.324500, zoom: 19 },
  { name: 'Pentadbiran & UAP', lat: 1.622500, lng: 110.323000, zoom: 19 },
  { name: 'Perpustakaan (PSA)', lat: 1.622350, lng: 110.324400, zoom: 19 },
];

// Haversine formula to compute distance in meters between two lat/lng points
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export default function DirektoriLokasiMapView({
  locations,
  onEditLocation,
  onNavigateToSchedule,
  highlightLocationId,
}: DirektoriLokasiMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);
  const locationMarkersMapRef = useRef<Map<string, any>>(new Map());

  // Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showLocationList, setShowLocationList] = useState<boolean>(true);
  const [listSearchTerm, setListSearchTerm] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(highlightLocationId || null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorted locations with distances if user coordinates exist
  const locationsWithDistance = useMemo(() => {
    return locations.map((loc) => {
      const lat = loc.latitude || POLIKU_DEFAULT_LAT;
      const lng = loc.longitude || POLIKU_DEFAULT_LNG;
      const distance = userCoords
        ? calculateDistanceMeters(userCoords.lat, userCoords.lng, lat, lng)
        : null;
      return {
        ...loc,
        lat,
        lng,
        distance,
      };
    });
  }, [locations, userCoords]);

  // Closest location to user
  const closestLocation = useMemo(() => {
    if (!userCoords) return null;
    const sorted = [...locationsWithDistance].sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    return sorted[0] || null;
  }, [locationsWithDistance, userCoords]);

  // Filtered for sidebar list
  const filteredListLocations = useMemo(() => {
    return locationsWithDistance.filter((loc) => {
      const matchSearch =
        loc.kodRuang.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        loc.nama.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        loc.jabatan.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        loc.bangunan.toLowerCase().includes(listSearchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ? true : loc.statusPemeriksaan === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [locationsWithDistance, listSearchTerm, statusFilter]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix Leaflet's default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        // Create map
        const map = L.map(mapContainerRef.current, {
          center: [POLIKU_DEFAULT_LAT, POLIKU_DEFAULT_LNG],
          zoom: 17,
          zoomControl: true,
        });

        // OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | POLIKU Asset Portal',
        }).addTo(map);

        const markersGroup = L.layerGroup().addTo(map);
        markersGroupRef.current = markersGroup;
        mapInstanceRef.current = map;
      }

      // Update location markers
      renderLocationMarkers(L);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Re-render markers when locations, userCoords, or handlers change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      renderLocationMarkers(L);
    });
  }, [locationsWithDistance, selectedLocationId]);

  // Invalidate map size when fullscreen or drawer toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isFullscreen, showLocationList]);

  // Create custom HTML pins for locations
  const renderLocationMarkers = (L: any) => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    locationMarkersMapRef.current.clear();

    locationsWithDistance.forEach((loc) => {
      const isSelected = selectedLocationId === loc.id;
      const isSelesai = loc.statusPemeriksaan === 'Selesai';
      const isSedang = loc.statusPemeriksaan === 'Sedang Dijalankan';

      // Pin Color Scheme
      const bgColor = isSelesai ? '#059669' : isSedang ? '#d97706' : '#475569';
      const badgeText = loc.kodRuang.replace(/^(MAK|BKG|SRV|LIB|KUL|STU|STR|HEP)-/, '');

      // Create Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-location-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            <div style="
              background-color: ${bgColor};
              color: white;
              font-family: ui-monospace, monospace;
              font-weight: 700;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 9999px;
              white-space: nowrap;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
              border: 2px solid #ffffff;
              display: flex;
              align-items: center;
              gap: 3px;
              margin-bottom: 2px;
              ${isSelected ? 'outline: 3px solid #f59e0b; transform: scale(1.15);' : ''}
              transition: transform 0.15s ease-in-out;
            ">
              <span>${badgeText}</span>
              <span style="font-size: 8px; opacity: 0.85;">(${loc.anggaranAset})</span>
            </div>
            <div style="
              width: 14px;
              height: 14px;
              background-color: ${bgColor};
              border: 2px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });

      // Build Rich HTML Popup Content
      const distanceHtml = loc.distance !== null
        ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 6px 10px; border-radius: 8px; font-size: 11px; margin-top: 8px; display: flex; align-items: center; gap: 6px; font-weight: 600;">
            <span>📍 Anggaran Jarak: <strong>${formatDistance(loc.distance)}</strong> dari anda</span>
          </div>
        `
        : '';

      const statusBadgeHtml = isSelesai
        ? '<span style="background-color: #d1fae5; color: #065f46; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid #a7f3d0;">✓ Selesai Diperiksa</span>'
        : isSedang
        ? '<span style="background-color: #fef3c7; color: #92400e; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid #fde68a;">⏳ Sedang Diperiksa</span>'
        : '<span style="background-color: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid #e2e8f0;">Belum Mula</span>';

      const popupHtml = `
        <div style="font-family: inherit; width: 280px; padding: 14px; box-sizing: border-box;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 4px;">
            <span style="font-family: ui-monospace, monospace; font-size: 11px; font-weight: 800; background: #0f172a; color: #fbbf24; padding: 2px 6px; border-radius: 4px;">
              ${loc.kodRuang}
            </span>
            ${statusBadgeHtml}
          </div>

          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3;">
            ${loc.nama}
          </h4>

          <div style="font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.4;">
            <div>🏢 <strong>${loc.bangunan}</strong> • ${loc.aras}</div>
            <div>🏷️ Kategori: <strong>${loc.kategoriRuang}</strong> (${loc.jabatan})</div>
            <div>📦 Bilangan Aset: <strong>${loc.anggaranAset} unit</strong></div>
            <div style="margin-top: 3px;">👤 Penjaga: <strong>${loc.penjaga}</strong></div>
          </div>

          ${distanceHtml}

          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <a 
              href="https://www.google.com/maps?q=${loc.lat},${loc.lng}" 
              target="_blank" 
              rel="noopener noreferrer" 
              style="font-size: 10px; color: #0284c7; text-decoration: none; font-weight: 700;"
            >
              Google Maps ↗
            </a>

            <div style="display: flex; gap: 4px;">
              <button 
                id="btn-edit-${loc.id}" 
                style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: 700; color: #334155; cursor: pointer;"
              >
                Kemaskini
              </button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      // Attach event listeners when popup opens
      marker.on('popupopen', () => {
        setSelectedLocationId(loc.id);
        const editBtn = document.getElementById(`btn-edit-${loc.id}`);
        if (editBtn && onEditLocation) {
          editBtn.onclick = () => {
            onEditLocation(loc);
          };
        }
      });

      marker.on('click', () => {
        setSelectedLocationId(loc.id);
      });

      marker.addTo(markersGroupRef.current);
      locationMarkersMapRef.current.set(loc.id, marker);
    });
  };

  // Handle 'Show My Location' via Geolocation API
  const handleShowMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Pelayar web anda tidak menyokong fungsi Geolocation API.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude, accuracy });
        setIsLocating(false);

        import('leaflet').then((L) => {
          if (!mapInstanceRef.current) return;
          const map = mapInstanceRef.current;

          // Remove old user marker/circle if present
          if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
          if (userCircleRef.current) map.removeLayer(userCircleRef.current);

          // Add pulsing User Location Marker
          const userIcon = L.divIcon({
            className: 'user-live-pin',
            html: `
              <div style="position: relative; width: 24px; height: 24px;">
                <div class="user-radar-pulse" style="
                  position: absolute;
                  inset: -6px;
                  background-color: #3b82f6;
                  border-radius: 50%;
                  opacity: 0.4;
                "></div>
                <div style="
                  width: 24px;
                  height: 24px;
                  background-color: #2563eb;
                  border: 3px solid #ffffff;
                  border-radius: 50%;
                  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%;"></div>
                </div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const userMarker = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

          userMarker.bindPopup(`
            <div style="padding: 10px; font-family: inherit;">
              <div style="font-weight: 800; color: #1e3a8a; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                <span>📍 Lokasi Anda Sekarang</span>
              </div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px; font-family: monospace;">
                GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
              </div>
              <div style="font-size: 10px; color: #059669; font-weight: 600; margin-top: 4px;">
                Ketepatan: ±${Math.round(accuracy || 10)} meter
              </div>
            </div>
          `);

          // Draw accuracy circle
          const userCircle = L.circle([latitude, longitude], {
            radius: Math.max(accuracy || 15, 10),
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(map);

          userMarkerRef.current = userMarker;
          userCircleRef.current = userCircle;

          // Smooth fly to user location
          map.flyTo([latitude, longitude], 18, { animate: true, duration: 1.2 });
        });
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation Error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('Kebenaran akses lokasi ditolak oleh pelayar web. Sila benarkan perkongsian lokasi pada peranti anda.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError('Maklumat koordinat GPS tidak dapat diperolehi pada masa ini.');
        } else {
          setGeoError('Masa menunggu GPS tamat (timeout). Sila cuba sekali lagi.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Fly to specific location and open its popup
  const handleFocusLocation = (loc: any) => {
    setSelectedLocationId(loc.id);
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.flyTo([loc.lat, loc.lng], 19, { animate: true, duration: 1 });

    const marker = locationMarkersMapRef.current.get(loc.id);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 600);
    }
  };

  // Fly to campus preset zone
  const handleSelectZone = (zone: (typeof CAMPUS_ZONES)[0]) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([zone.lat, zone.lng], zone.zoom, {
      animate: true,
      duration: 1,
    });
  };

  return (
    <div className={`relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl' : 'w-full'
    }`}>
      
      {/* Map Header & Toolbar */}
      <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Title & Live Summary */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                Peta Visual Direktori Lokasi & Makmal
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Leaflet & OpenStreetMap
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Memaparkan {locations.length} lokasi fizikal dan bilik aset di kampus Politeknik Kuching Sarawak
            </p>
          </div>
        </div>

        {/* Right: Actions ('Show My Location' & Tools) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* SHOW MY LOCATION BUTTON */}
          <button
            type="button"
            onClick={handleShowMyLocation}
            disabled={isLocating}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs ${
              userCoords 
                ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400' 
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300'
            }`}
            title="Kesan koordinat GPS semasa peranti menggunakan Geolocation API"
          >
            {isLocating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : userCoords ? (
              <LocateFixed className="w-4 h-4 text-white" />
            ) : (
              <Crosshair className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            )}
            <span>
              {isLocating
                ? 'Mengesan GPS...'
                : userCoords
                ? 'Lokasi Anda Aktif (Kemas Kini)'
                : 'Papar Lokasi Saya (GPS)'}
            </span>
          </button>

          {/* Toggle Location List Drawer */}
          <button
            type="button"
            onClick={() => setShowLocationList(!showLocationList)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              showLocationList
                ? 'bg-slate-800 text-amber-300 border-slate-700'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title="Buka / Tutup Senarai Bilik & Makmal"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Senarai Ruang</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
            title={isFullscreen ? 'Keluar Mod Skrin Penuh' : 'Mod Skrin Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Geolocation Error Alert if any */}
      {geoError && (
        <div className="bg-rose-950/80 border-b border-rose-800/60 p-2.5 px-4 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{geoError}</span>
          </div>
          <button 
            onClick={() => setGeoError(null)} 
            className="text-rose-300 hover:text-white font-bold text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Closest Location Proximity Banner (Active when GPS is loaded) */}
      {userCoords && closestLocation && (
        <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-4 py-2.5 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <span>
              Ruang Aset Paling Hampir: <strong>{closestLocation.nama}</strong> ({closestLocation.kodRuang})
            </span>
            <span className="bg-emerald-800/80 text-emerald-100 font-mono font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-700">
              ~{formatDistance(closestLocation.distance || 0)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleFocusLocation(closestLocation)}
            className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
          >
            <span>Fokus Lokasi Ini</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Campus Zone Quick Jump Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-300">
        <span className="font-bold text-slate-400 shrink-0 text-[10px] uppercase font-mono mr-1">Fokus Zon:</span>
        {CAMPUS_ZONES.map((zone, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectZone(zone)}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-400 hover:text-slate-950 font-medium text-slate-200 border border-slate-700/60 transition whitespace-nowrap cursor-pointer shrink-0"
          >
            {zone.name}
          </button>
        ))}
      </div>

      {/* Main Map Body + Side Drawer */}
      <div className="relative flex flex-col md:flex-row h-[550px] sm:h-[620px] w-full">
        
        {/* Leaflet Map Canvas */}
        <div className="flex-1 h-full w-full relative z-0">
          <div ref={mapContainerRef} className="h-full w-full z-0 bg-slate-950" />

          {/* Floating Map Legend (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-xl border border-slate-700/80 shadow-lg text-[11px] space-y-1.5 pointer-events-auto">
            <span className="font-bold text-slate-300 block text-[10px] uppercase tracking-wider font-mono">
              Petunjuk Status
            </span>
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-600 border border-white"></div>
                <span className="text-slate-200">Selesai Pemeriksaan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
                <span className="text-slate-200">Sedang Dijalankan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500 border border-white"></div>
                <span className="text-slate-200">Belum Mula</span>
              </div>
              {userCoords && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white animate-pulse"></div>
                  <span className="text-blue-300 font-bold">Lokasi Saya (GPS)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Location Drawer on the Right */}
        {showLocationList && (
          <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-72 md:h-full z-10 shrink-0">
            
            {/* Drawer Search & Status Filter */}
            <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={listSearchTerm}
                  onChange={(e) => setListSearchTerm(e.target.value)}
                  placeholder="Cari ruang / makmal pada peta..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Status Tabs */}
              <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-center">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`py-1 rounded cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({locations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Selesai')}
                  className={`py-1 rounded cursor-pointer ${
                    statusFilter === 'Selesai'
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Selesai
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Sedang Dijalankan')}
                  className={`py-1 rounded cursor-pointer ${
                    statusFilter === 'Sedang Dijalankan'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Sedang
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Belum Mula')}
                  className={`py-1 rounded cursor-pointer ${
                    statusFilter === 'Belum Mula'
                      ? 'bg-slate-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Belum
                </button>
              </div>
            </div>

            {/* Scrollable Room List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
              {filteredListLocations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <MapPin className="w-6 h-6 mx-auto mb-1.5 text-slate-600" />
                  Tiada lokasi sepadan carian pada peta.
                </div>
              ) : (
                filteredListLocations.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  const isSelesai = loc.statusPemeriksaan === 'Selesai';
                  const isSedang = loc.statusPemeriksaan === 'Sedang Dijalankan';

                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleFocusLocation(loc)}
                      className={`p-3 cursor-pointer transition text-xs rounded-xl mx-1 my-0.5 ${
                        isSelected
                          ? 'bg-amber-400/15 border border-amber-400/50 text-white'
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-[11px] text-amber-300">
                          {loc.kodRuang}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {loc.distance !== null && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                              {formatDistance(loc.distance)}
                            </span>
                          )}
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelesai ? 'bg-emerald-500' : isSedang ? 'bg-amber-500' : 'bg-slate-500'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="font-bold text-white leading-tight mb-1">
                        {loc.nama}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{loc.bangunan}</span>
                        <span className="font-mono text-slate-500">{loc.anggaranAset} aset</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 text-center font-mono">
              Klik mana-mana ruang untuk zum & buka maklumat pada peta
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
