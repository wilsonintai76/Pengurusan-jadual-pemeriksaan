import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Crosshair, CheckCircle2 } from 'lucide-react';

interface GpsMapPickerProps {
  lat?: number;
  lng?: number;
  locationName?: string;
  onChangeGps?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  height?: string;
}

const POLIKU_DEFAULT_LAT = 1.621425;
const POLIKU_DEFAULT_LNG = 110.323580;

/**
 * Peta GPS ruang. Tiada senarai "zon/blok" pra-tetap di sini — koordinat sebenar
 * ditetapkan melalui klik/drag pada peta, GPS peranti, atau input latitud/longitud.
 */

export default function GpsMapPicker({
  lat = POLIKU_DEFAULT_LAT,
  lng = POLIKU_DEFAULT_LNG,
  locationName = 'Lokasi Makmal / Bengkel POLIKU',
  onChangeGps,
  readOnly = false,
  height = '280px',
}: GpsMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const [currentLat, setCurrentLat] = useState<number>(lat || POLIKU_DEFAULT_LAT);
  const [currentLng, setCurrentLng] = useState<number>(lng || POLIKU_DEFAULT_LNG);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [gpsLocked, setGpsLocked] = useState<boolean>(false);
  const [tilesReady, setTilesReady] = useState<boolean>(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Sync state if incoming props change externally
  useEffect(() => {
    if (lat && lng && (lat !== currentLat || lng !== currentLng)) {
      setCurrentLat(lat);
      setCurrentLng(lng);
      if (mapInstanceRef.current && markerInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 17);
        markerInstanceRef.current.setLatLng([lat, lng]);
        markerInstanceRef.current.setPopupContent(`<b>${locationName}</b><br>GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    }
  }, [lat, lng, locationName]);

  useEffect(() => {
    let isMounted = true;

    // Dynamically import leaflet on client side to avoid SSR errors
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix Leaflet default icon URL issues in bundlers (Vite/Webpack)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        // Initialize Leaflet Map
        const map = L.map(mapContainerRef.current).setView(
          [currentLat, currentLng],
          17
        );

        const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        layer.on('load', () => setTilesReady(true));

        const marker = L.marker([currentLat, currentLng], {
          draggable: !readOnly,
        }).addTo(map);

        marker.bindPopup(`<b>${locationName}</b><br>GPS: ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`).openPopup();

        if (!readOnly && onChangeGps) {
          // Drag marker listener
          marker.on('dragend', (event: any) => {
            const position = event.target.getLatLng();
            setCurrentLat(position.lat);
            setCurrentLng(position.lng);
            setGpsLocked(true);
            onChangeGps(position.lat, position.lng);
            marker.setPopupContent(`<b>${locationName}</b><br>GPS: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`).openPopup();
          });

          // Map click listener
          map.on('click', (event: any) => {
            const { lat: clickLat, lng: clickLng } = event.latlng;
            marker.setLatLng([clickLat, clickLng]);
            setCurrentLat(clickLat);
            setCurrentLng(clickLng);
            setGpsLocked(true);
            onChangeGps(clickLat, clickLng);
            marker.setPopupContent(`<b>${locationName}</b><br>GPS: ${clickLat.toFixed(6)}, ${clickLng.toFixed(6)}`).openPopup();
          });
        }

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        // Peta dalam modal boleh berubah saiz selepas animasi/scroll — pastikan Leaflet
        // sentiasa mengira semula dimensi, jika tidak jubin tidak dimuatkan (kotak kelabu).
        const invalidate = () => mapInstanceRef.current?.invalidateSize();
        [0, 120, 300, 700].forEach((delay) => window.setTimeout(invalidate, delay));

        if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
          resizeObserverRef.current = new ResizeObserver(invalidate);
          resizeObserverRef.current.observe(mapContainerRef.current);
        }
        window.addEventListener('resize', invalidate);
      } else {
        // Update existing map & marker
        mapInstanceRef.current.setView([currentLat, currentLng], 17);
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([currentLat, currentLng]);
          markerInstanceRef.current.setPopupContent(`<b>${locationName}</b><br>GPS: ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`);
        }
      }
    });

    return () => {
      isMounted = false;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [readOnly]);

  // Use Browser Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('GPS Browser tidak disokong oleh peranti ini.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setCurrentLat(newLat);
        setCurrentLng(newLng);
        setGpsLocked(true);
        if (onChangeGps) onChangeGps(newLat, newLng);

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.flyTo([newLat, newLng], 18, { animate: true, duration: 1 });
          markerInstanceRef.current.setLatLng([newLat, newLng]);
          markerInstanceRef.current.setPopupContent(`<b>${locationName}</b><br>GPS dikesan: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`).openPopup();
        }

        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation Error:', error);
        setGeoError('Tidak dapat mengesan lokasi GPS. Sila beri kebenaran lokasi pada peranti anda.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-2.5 select-none">
      
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <MapPin className="w-4 h-4 text-amber-600" />
          <span>Pemetaan GPS & OpenStreetMap (POLIKU)</span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-bold text-[11px] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Crosshair className={`w-3.5 h-3.5 text-amber-300 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Mengesan GPS...' : 'Kesan GPS Saya Sekarang'}</span>
          </button>
        )}
      </div>

      {geoError && (
        <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
          {geoError}
        </p>
      )}

      {/* Leaflet Map Container */}
      <div className="relative border border-slate-300 rounded-xl overflow-hidden shadow-2xs z-0">
        <div 
          ref={mapContainerRef} 
          style={{ height }} 
          className="w-full z-0 bg-slate-100"
        />

        {!tilesReady && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none bg-slate-100/60">
            <span className="text-[11px] font-semibold text-slate-500">Memuatkan peta OpenStreetMap…</span>
          </div>
        )}

        {!readOnly && (
          <div className="absolute top-2 right-2 z-10 bg-slate-900/90 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-mono border border-slate-700/80 shadow-xs">
            Klik / Tarik Pin Pada Peta
          </div>
        )}
      </div>

      {/* Lat Lng Input Fields & Presets */}
      {!readOnly ? (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Latitud (Lat)</label>
              <input
                type="number"
                step="0.000001"
                value={currentLat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || POLIKU_DEFAULT_LAT;
                  setCurrentLat(val);
                  setGpsLocked(true);
                  if (onChangeGps) onChangeGps(val, currentLng);
                  if (markerInstanceRef.current) {
                    markerInstanceRef.current.setLatLng([val, currentLng]);
                  }
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Longitud (Lng)</label>
              <input
                type="number"
                step="0.000001"
                value={currentLng}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || POLIKU_DEFAULT_LNG;
                  setCurrentLng(val);
                  setGpsLocked(true);
                  if (onChangeGps) onChangeGps(currentLat, val);
                  if (markerInstanceRef.current) {
                    markerInstanceRef.current.setLatLng([currentLat, val]);
                  }
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pilihan pantas mock dibuang — koordinat sebenar sahaja (klik peta / GPS / lat-lng). */}

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/80 font-mono">
            <span className="flex items-center gap-1 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Koordinat GPS: <strong>{currentLat.toFixed(6)}, {currentLng.toFixed(6)}</strong>
            </span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${currentLat}&mlon=${currentLng}#map=18/${currentLat}/${currentLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-700 hover:underline font-bold"
            >
              Buka di OpenStreetMap
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono">
          <span>Koordinat GPS: <strong>{currentLat.toFixed(6)}, {currentLng.toFixed(6)}</strong></span>
          <a
            href={`https://www.openstreetmap.org/?mlat=${currentLat}&mlon=${currentLng}#map=18/${currentLat}/${currentLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 hover:underline font-bold flex items-center gap-1"
          >
            <span>Buka di OpenStreetMap</span>
          </a>
        </div>
      )}

    </div>
  );
}
