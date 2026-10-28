'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Crosshair, Check, Sparkles } from 'lucide-react';

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

const CAMPUS_SHORTCUTS = [
  { name: 'JKM - Kejuruteraan Mekanikal', lat: 1.621425, lng: 110.323580 },
  { name: 'JTMK - Teknologi Maklumat', lat: 1.621810, lng: 110.324100 },
  { name: 'JKE - Kejuruteraan Elektrik', lat: 1.621050, lng: 110.322900 },
  { name: 'JKA - Kejuruteraan Awam', lat: 1.620800, lng: 110.324500 },
  { name: 'Pentadbiran & UAP POLIKU', lat: 1.622500, lng: 110.323000 },
];

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

  const [prevProps, setPrevProps] = useState({ lat, lng });
  const [currentLat, setCurrentLat] = useState<number>(lat || POLIKU_DEFAULT_LAT);
  const [currentLng, setCurrentLng] = useState<number>(lng || POLIKU_DEFAULT_LNG);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  if (prevProps.lat !== lat || prevProps.lng !== lng) {
    setPrevProps({ lat, lng });
    setCurrentLat(lat || POLIKU_DEFAULT_LAT);
    setCurrentLng(lng || POLIKU_DEFAULT_LNG);
  }

  useEffect(() => {
    let isMounted = true;

    // Dynamically import leaflet on client side to avoid SSR errors
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix Leaflet default icon URL issues in Webpack/Next.js
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

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

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
            onChangeGps(position.lat, position.lng);
            marker.setPopupContent(`<b>${locationName}</b><br>GPS: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`).openPopup();
          });

          // Map click listener
          map.on('click', (event: any) => {
            const { lat: clickLat, lng: clickLng } = event.latlng;
            marker.setLatLng([clickLat, clickLng]);
            setCurrentLat(clickLat);
            setCurrentLng(clickLng);
            onChangeGps(clickLat, clickLng);
            marker.setPopupContent(`<b>${locationName}</b><br>GPS: ${clickLat.toFixed(6)}, ${clickLng.toFixed(6)}`).openPopup();
          });
        }

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
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
    };
  }, [currentLat, currentLng, locationName, readOnly, onChangeGps]);

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
        if (onChangeGps) onChangeGps(newLat, newLng);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation Error:', error);
        setGeoError('Tidak dapat mengesan lokasi GPS. Sila beri kebenaran lokasi pada peranti.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectShortcut = (presetLat: number, presetLng: number) => {
    setCurrentLat(presetLat);
    setCurrentLng(presetLng);
    if (onChangeGps) onChangeGps(presetLat, presetLng);
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

        {!readOnly && (
          <div className="absolute top-2 right-2 z-10 bg-slate-900/90 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-mono border border-slate-700/80 shadow-xs">
            Klik/Tarik Pin Pada Peta
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
                  if (onChangeGps) onChangeGps(val, currentLng);
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
                  if (onChangeGps) onChangeGps(currentLat, val);
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Shortcuts for POLIKU Blocks */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 font-mono">Pilihan Zon Kampus:</span>
            {CAMPUS_SHORTCUTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectShortcut(item.lat, item.lng)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 border border-slate-200 transition"
              >
                {item.name}
              </button>
            ))}
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
