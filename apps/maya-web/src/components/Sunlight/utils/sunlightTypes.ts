/**
 * Sunlight Simulation Types
 * 
 * Type definitions for the sunlight/daylighting simulation system.
 */

export interface GeoLocation {
  latitude: number;   // -90 to 90
  longitude: number;  // -180 to 180
  name?: string;      // e.g., "San Francisco, CA"
  timezone?: string;  // e.g., "America/Los_Angeles"
}

export interface SunPosition {
  azimuth: number;    // Degrees from North (0-360), clockwise
  altitude: number;   // Degrees above horizon (-90 to 90)
  isAboveHorizon: boolean;
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  dawn: Date;         // Civil twilight start
  dusk: Date;         // Civil twilight end
}

export interface LightPatch {
  id: string;
  openingId: string;
  paths: Point2D[][];  // Multi-polygon (can be disjoint)
  intensity: number;  // 0-1, based on sun angle to wall
  color: string;      // Rendered color with opacity
  litSegments: LitWallSegment[];
  debugInfo?: string;
}

export interface LitWallSegment {
  id: string;
  wallId: string;
  start: Point2D;
  end: Point2D;
  heightRange: [number, number]; // [bottom, top] of the light on the wall
  intensity: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface OpeningForSunlight {
  id: string;
  // Position on wall (wall-local coordinates)
  wallId: string;
  positionOnWall: number;  // 0-1, distance along wall

  // Dimensions
  width: number;           // meters
  height: number;          // meters
  sillHeight: number;      // meters from floor (0 for doors)

  // World position (calculated)
  centerPoint: Point2D;

  // Type affects how light is projected
  type: 'window' | 'door' | 'opening';
}

export interface WallForSunlight {
  id: string;
  startPoint: Point2D;
  endPoint: Point2D;
  height: number;          // meters
  thickness: number;       // meters

  // Calculated properties
  angle: number;           // radians, direction of wall
  normalAngle: number;     // radians, outward-facing normal
  length: number;          // meters

  // Openings in this wall
  openings: OpeningForSunlight[];
}

export interface SunlightConfig {
  // Location & Time
  location: GeoLocation;
  dateTime: Date;
  buildingOrientation: number;  // Degrees clockwise from North (0-360)

  // Animation
  animating: boolean;
  animationSpeed: number;       // Minutes per second of animation

  // Visualization
  showLightPatches: boolean;
  showSunDirection: boolean;
  showSunPath: boolean;
  showCompass: boolean;         // Show N/S/E/W compass indicator
  patchOpacity: number;         // 0-1
  colorScheme: 'warm' | 'analysis' | 'heatmap';

  // Wall Occlusion
  enableWallOcclusion: boolean; // Clip light patches against interior walls
}

export const DEFAULT_SUNLIGHT_CONFIG: SunlightConfig = {
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    name: 'San Francisco, CA',
  },
  dateTime: new Date(),
  buildingOrientation: 0,
  animating: false,
  animationSpeed: 60,  // 1 hour per second
  showLightPatches: true,
  showSunDirection: true,
  showSunPath: false,
  showCompass: true,    // Show compass by default
  patchOpacity: 0.4,
  colorScheme: 'warm',
  enableWallOcclusion: true,  // Interior walls block sunlight by default
};

// Preset locations for quick selection
export const PRESET_LOCATIONS: GeoLocation[] = [
  { latitude: 37.7749, longitude: -122.4194, name: 'San Francisco, CA' },
  { latitude: 40.7128, longitude: -74.0060, name: 'New York, NY' },
  { latitude: 51.5074, longitude: -0.1278, name: 'London, UK' },
  { latitude: 35.6762, longitude: 139.6503, name: 'Tokyo, Japan' },
  { latitude: 28.6139, longitude: 77.2090, name: 'New Delhi, India' },
  { latitude: -33.8688, longitude: 151.2093, name: 'Sydney, Australia' },
  { latitude: 55.7558, longitude: 37.6173, name: 'Moscow, Russia' },
  { latitude: 19.4326, longitude: -99.1332, name: 'Mexico City, Mexico' },
  { latitude: 1.3521, longitude: 103.8198, name: 'Singapore' },
  { latitude: 25.2048, longitude: 55.2708, name: 'Dubai, UAE' },
];

// Color schemes for light patches
export const LIGHT_COLORS = {
  warm: {
    bright: 'rgba(255, 220, 120, 0.5)',
    medium: 'rgba(255, 200, 100, 0.35)',
    soft: 'rgba(255, 180, 80, 0.2)',
  },
  analysis: {
    bright: 'rgba(255, 200, 0, 0.6)',
    medium: 'rgba(255, 160, 0, 0.4)',
    soft: 'rgba(255, 120, 0, 0.25)',
  },
  heatmap: {
    bright: 'rgba(255, 50, 50, 0.5)',
    medium: 'rgba(255, 180, 50, 0.4)',
    soft: 'rgba(100, 180, 255, 0.3)',
  },
};

