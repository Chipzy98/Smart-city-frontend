// D:\Chipzy\ESOFT LEC\Final project\smart-city-frontend\smart-city-frontend\components\maps\PlaceAutocomplete.tsx

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

export type LatLng = { lat: number; lng: number };

interface PlacesAutocompleteProps {
  value: string;
  onChange: (name: string, latlng: LatLng | null) => void;
  placeholder?: string;
  pinColor?: "blue" | "green";
  label?: string;
  badgeLetter?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Suggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export default function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Type a location…",
  pinColor = "blue",
  label,
  badgeLetter,
}: PlacesAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
        + `?access_token=${MAPBOX_TOKEN}`
        + `&country=lk`          // Sri Lanka only
        + `&language=en`
        + `&limit=5`
        + `&types=place,locality,neighborhood,address,poi`;
      const res  = await fetch(url);
      const data = await res.json();
      setSuggestions(data.features ?? []);
      setOpen((data.features ?? []).length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    if (!val) { onChange("", null); setSuggestions([]); setOpen(false); return; }
    onChange(val, null); // update parent so value prop stays in sync
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (s: Suggestion) => {
    setSuggestions([]);
    setOpen(false);
    onChange(s.place_name, { lat: s.center[1], lng: s.center[0] });
  };

  const colorClasses = pinColor === "green"
    ? { badge: "bg-green-600", border: "focus:border-green-400", icon: "text-green-500" }
    : { badge: "bg-blue-600",  border: "focus:border-blue-400",  icon: "text-blue-500"  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
          {badgeLetter && (
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${colorClasses.badge} text-[10px] font-bold text-white`}>
              {badgeLetter}
            </span>
          )}
          {label}
        </label>
      )}

      <div className="relative">
        <div className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${colorClasses.icon}`}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`w-full rounded-2xl border border-white/50 bg-white/70 py-2.5 pl-9 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:bg-white focus:border-2 ${colorClasses.border}`}
        />
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm hover:bg-slate-50 transition"
              >
                <MapPin size={14} className={`mt-0.5 shrink-0 ${colorClasses.icon}`} />
                <span className="text-slate-700">{s.place_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}