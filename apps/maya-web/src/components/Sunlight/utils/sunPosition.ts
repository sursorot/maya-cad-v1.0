/**
 * Sun Position Calculator
 * 
 * Calculates sun position (azimuth and altitude) based on:
 * - Geographic location (latitude, longitude)
 * - Date and time
 * 
 * Based on NOAA solar position algorithms.
 * Reference: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 */

import type { GeoLocation, SunPosition, SunTimes } from './sunlightTypes';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculate Julian Day from a Date object.
 */
function dateToJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  
  let jy = year;
  let jm = month;
  
  if (month <= 2) {
    jy -= 1;
    jm += 12;
  }
  
  const a = Math.floor(jy / 100);
  const b = 2 - a + Math.floor(a / 4);
  
  return Math.floor(365.25 * (jy + 4716)) + 
         Math.floor(30.6001 * (jm + 1)) + 
         day + hour / 24 + b - 1524.5;
}

/**
 * Calculate Julian Century from Julian Day.
 */
function julianDayToJulianCentury(jd: number): number {
  return (jd - 2451545) / 36525;
}

/**
 * Calculate the geometric mean longitude of the sun (degrees).
 */
function sunGeomMeanLong(t: number): number {
  let l0 = 280.46646 + t * (36000.76983 + 0.0003032 * t);
  while (l0 > 360) l0 -= 360;
  while (l0 < 0) l0 += 360;
  return l0;
}

/**
 * Calculate the geometric mean anomaly of the sun (degrees).
 */
function sunGeomMeanAnomaly(t: number): number {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

/**
 * Calculate the eccentricity of Earth's orbit.
 */
function earthOrbitEccentricity(t: number): number {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

/**
 * Calculate the sun's equation of center (degrees).
 */
function sunEquationOfCenter(t: number): number {
  const m = sunGeomMeanAnomaly(t);
  const mrad = m * DEG_TO_RAD;
  const sinm = Math.sin(mrad);
  const sin2m = Math.sin(2 * mrad);
  const sin3m = Math.sin(3 * mrad);
  
  return sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) +
         sin2m * (0.019993 - 0.000101 * t) +
         sin3m * 0.000289;
}

/**
 * Calculate the sun's true longitude (degrees).
 */
function sunTrueLong(t: number): number {
  return sunGeomMeanLong(t) + sunEquationOfCenter(t);
}

/**
 * Calculate the sun's apparent longitude (degrees).
 */
function sunApparentLong(t: number): number {
  const o = sunTrueLong(t);
  const omega = 125.04 - 1934.136 * t;
  return o - 0.00569 - 0.00478 * Math.sin(omega * DEG_TO_RAD);
}

/**
 * Calculate the mean obliquity of the ecliptic (degrees).
 */
function meanObliquityOfEcliptic(t: number): number {
  const seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
  return 23 + (26 + seconds / 60) / 60;
}

/**
 * Calculate the corrected obliquity of the ecliptic (degrees).
 */
function obliquityCorrection(t: number): number {
  const e0 = meanObliquityOfEcliptic(t);
  const omega = 125.04 - 1934.136 * t;
  return e0 + 0.00256 * Math.cos(omega * DEG_TO_RAD);
}

/**
 * Calculate the sun's declination (degrees).
 */
function sunDeclination(t: number): number {
  const e = obliquityCorrection(t);
  const lambda = sunApparentLong(t);
  const sint = Math.sin(e * DEG_TO_RAD) * Math.sin(lambda * DEG_TO_RAD);
  return Math.asin(sint) * RAD_TO_DEG;
}

/**
 * Calculate the equation of time (minutes).
 */
function equationOfTime(t: number): number {
  const e = earthOrbitEccentricity(t);
  const l0 = sunGeomMeanLong(t);
  const m = sunGeomMeanAnomaly(t);
  const oc = obliquityCorrection(t);
  
  let y = Math.tan((oc / 2) * DEG_TO_RAD);
  y *= y;
  
  const l0rad = l0 * DEG_TO_RAD;
  const mrad = m * DEG_TO_RAD;
  const sin2l0 = Math.sin(2 * l0rad);
  const sinm = Math.sin(mrad);
  const cos2l0 = Math.cos(2 * l0rad);
  const sin4l0 = Math.sin(4 * l0rad);
  const sin2m = Math.sin(2 * mrad);
  
  const eqTime = y * sin2l0 - 2 * e * sinm + 4 * e * y * sinm * cos2l0 -
                 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
  
  return eqTime * 4 * RAD_TO_DEG;  // Convert to minutes
}

/**
 * Calculate hour angle for sunrise/sunset (degrees).
 */
function hourAngleSunrise(lat: number, solarDec: number, zenith: number = 90.833): number {
  const latRad = lat * DEG_TO_RAD;
  const sdRad = solarDec * DEG_TO_RAD;
  
  const HA = Math.acos(
    Math.cos(zenith * DEG_TO_RAD) / (Math.cos(latRad) * Math.cos(sdRad)) -
    Math.tan(latRad) * Math.tan(sdRad)
  );
  
  return HA * RAD_TO_DEG;
}

/**
 * Calculate sun position (azimuth and altitude) for a given location and time.
 */
export function getSunPosition(date: Date, location: GeoLocation): SunPosition {
  const jd = dateToJulianDay(date);
  const t = julianDayToJulianCentury(jd);
  
  // Calculate solar time
  const eqTime = equationOfTime(t);
  const decl = sunDeclination(t);
  
  // Get time zone offset (in hours)
  const tzOffset = -date.getTimezoneOffset() / 60;
  
  // Calculate true solar time
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const trueSolarTime = (hours * 60 + eqTime + 4 * location.longitude - 60 * tzOffset) % 1440;
  
  // Calculate hour angle
  let hourAngle: number;
  if (trueSolarTime / 4 < 0) {
    hourAngle = trueSolarTime / 4 + 180;
  } else {
    hourAngle = trueSolarTime / 4 - 180;
  }
  
  // Calculate solar zenith and altitude
  const latRad = location.latitude * DEG_TO_RAD;
  const declRad = decl * DEG_TO_RAD;
  const haRad = hourAngle * DEG_TO_RAD;
  
  const csz = Math.sin(latRad) * Math.sin(declRad) +
              Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);
  
  const zenith = Math.acos(Math.max(-1, Math.min(1, csz))) * RAD_TO_DEG;
  const altitude = 90 - zenith;
  
  // Calculate azimuth
  let azimuth: number;
  if (hourAngle > 0) {
    azimuth = (Math.acos(
      ((Math.sin(latRad) * Math.cos(zenith * DEG_TO_RAD)) - Math.sin(declRad)) /
      (Math.cos(latRad) * Math.sin(zenith * DEG_TO_RAD))
    ) * RAD_TO_DEG + 180) % 360;
  } else {
    azimuth = (540 - Math.acos(
      ((Math.sin(latRad) * Math.cos(zenith * DEG_TO_RAD)) - Math.sin(declRad)) /
      (Math.cos(latRad) * Math.sin(zenith * DEG_TO_RAD))
    ) * RAD_TO_DEG) % 360;
  }
  
  return {
    azimuth,
    altitude,
    isAboveHorizon: altitude > 0,
  };
}

/**
 * Calculate sunrise, sunset, and solar noon times.
 */
export function getSunTimes(date: Date, location: GeoLocation): SunTimes {
  // Use noon of the given date
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);
  
  const jd = dateToJulianDay(noon);
  const t = julianDayToJulianCentury(jd);
  
  const eqTime = equationOfTime(t);
  const decl = sunDeclination(t);
  
  // Get timezone offset
  const tzOffset = -date.getTimezoneOffset() / 60;
  
  // Solar noon
  const noonMinutes = 720 - 4 * location.longitude - eqTime + tzOffset * 60;
  const solarNoon = new Date(date);
  solarNoon.setHours(0, 0, 0, 0);
  solarNoon.setMinutes(noonMinutes);
  
  // Hour angle for sunrise/sunset
  let haRise: number;
  try {
    haRise = hourAngleSunrise(location.latitude, decl);
  } catch {
    // Sun never rises or never sets at this location/date
    haRise = NaN;
  }
  
  // Sunrise
  const sunriseMinutes = noonMinutes - haRise * 4;
  const sunrise = new Date(date);
  sunrise.setHours(0, 0, 0, 0);
  sunrise.setMinutes(sunriseMinutes);
  
  // Sunset
  const sunsetMinutes = noonMinutes + haRise * 4;
  const sunset = new Date(date);
  sunset.setHours(0, 0, 0, 0);
  sunset.setMinutes(sunsetMinutes);
  
  // Civil twilight (sun 6° below horizon)
  let haCivil: number;
  try {
    haCivil = hourAngleSunrise(location.latitude, decl, 96);
  } catch {
    haCivil = NaN;
  }
  
  const dawnMinutes = noonMinutes - haCivil * 4;
  const dawn = new Date(date);
  dawn.setHours(0, 0, 0, 0);
  dawn.setMinutes(dawnMinutes);
  
  const duskMinutes = noonMinutes + haCivil * 4;
  const dusk = new Date(date);
  dusk.setHours(0, 0, 0, 0);
  dusk.setMinutes(duskMinutes);
  
  return {
    sunrise,
    sunset,
    solarNoon,
    dawn,
    dusk,
  };
}

/**
 * Convert sun position to a 3D direction vector.
 * X = East, Y = North, Z = Up
 */
export function sunPositionToVector(position: SunPosition): { x: number; y: number; z: number } {
  const azRad = position.azimuth * DEG_TO_RAD;
  const altRad = position.altitude * DEG_TO_RAD;
  
  // Convert spherical to Cartesian
  // Azimuth: 0° = North, 90° = East (clockwise from North)
  const cosAlt = Math.cos(altRad);
  
  return {
    x: cosAlt * Math.sin(azRad),   // East component
    y: cosAlt * Math.cos(azRad),   // North component  
    z: Math.sin(altRad),           // Up component
  };
}

/**
 * Format time as HH:MM AM/PM.
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format sun position for display.
 */
export function formatSunPosition(position: SunPosition): string {
  const az = position.azimuth.toFixed(1);
  const alt = position.altitude.toFixed(1);
  
  // Convert azimuth to compass direction
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(position.azimuth / 22.5) % 16;
  const compass = directions[index];
  
  return `${compass} (${az}°), ${alt}° alt`;
}

