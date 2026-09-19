// Auto-loaded by TypeScript via types/google-maps.d.ts
// Declares the global `google` namespace so @types/google.maps works
// whether the package is installed or not.

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions);
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
    }
    class TrafficLayer {
      setMap(map: Map | null): void;
    }
    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      addListener(event: string, handler: () => void): void;
    }
    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map: Map, anchor?: Marker): void;
    }
    enum SymbolPath {
      CIRCLE = 0,
    }
    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: string;
      styles?: object[];
    }
    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      icon?: Symbol | string;
      title?: string;
      label?: string | MarkerLabel;
    }
    interface MarkerLabel {
      text: string;
      color?: string;
      fontSize?: string;
      fontWeight?: string;
    }
    interface Symbol {
      path: SymbolPath | string;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }
    interface InfoWindowOptions {
      content?: string | HTMLElement;
    }
    interface LatLng {
      lat(): number;
      lng(): number;
    }
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    namespace places {
      class Autocomplete {
        constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(event: string, handler: () => void): void;
        getPlace(): PlaceResult;
      }
      interface AutocompleteOptions {
        componentRestrictions?: { country: string | string[] };
        fields?: string[];
        types?: string[];
      }
      interface PlaceResult {
        name?: string;
        formatted_address?: string;
        geometry?: {
          location?: LatLng;
        };
      }
    }
  }
}

interface Window {
  google: typeof google;
}