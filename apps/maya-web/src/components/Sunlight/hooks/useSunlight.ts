/**
 * useSunlight Hook
 * 
 * Manages state and calculations for the sunlight simulation.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type {
  SunlightConfig,
  SunPosition,
  SunTimes,
  LightPatch,
  WallForSunlight,
  GeoLocation,
} from '../utils/sunlightTypes';
import { DEFAULT_SUNLIGHT_CONFIG, PRESET_LOCATIONS } from '../utils/sunlightTypes';
import { getSunPosition, getSunTimes, formatSunPosition, formatTime } from '../utils/sunPosition';
import { calculateAllLightPatches } from '../utils/lightProjection';
import { extractWallsForSunlight, getWallBounds, hasOpenings, countOpenings } from '../utils/snapshotToSunlight';

export interface SunlightState {
  sunPosition: SunPosition;
  sunTimes: SunTimes;
  lightPatches: LightPatch[];
  walls: WallForSunlight[];
  hasOpenings: boolean;
  openingCounts: { windows: number; doors: number; openings: number; total: number };
  bounds: { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number };
  formattedPosition: string;
  formattedSunrise: string;
  formattedSunset: string;
  isValid: boolean;
}

export const useSunlight = (snapshot: WorkspaceSnapshot | null) => {
  // Configuration state
  const [config, setConfig] = useState<SunlightConfig>(DEFAULT_SUNLIGHT_CONFIG);

  // Animation state
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Extract walls from snapshot
  const walls = useMemo(() => {
    return extractWallsForSunlight(snapshot);
  }, [snapshot]);

  // Get bounds
  const bounds = useMemo(() => {
    return getWallBounds(walls);
  }, [walls]);

  // Check for openings
  const openingsExist = useMemo(() => {
    return hasOpenings(snapshot);
  }, [snapshot]);

  // Count openings
  const openingCounts = useMemo(() => {
    return countOpenings(snapshot);
  }, [snapshot]);

  // Calculate sun position
  const sunPosition = useMemo(() => {
    return getSunPosition(config.dateTime, config.location);
  }, [config.dateTime, config.location]);

  // Calculate sun times
  const sunTimes = useMemo(() => {
    return getSunTimes(config.dateTime, config.location);
  }, [config.dateTime, config.location]);

  // Calculate light patches
  const lightPatches = useMemo(() => {
    if (!config.showLightPatches || walls.length === 0) {
      return [];
    }
    return calculateAllLightPatches(walls, sunPosition, config, { x: bounds.centerX, y: bounds.centerY });
  }, [walls, sunPosition, config, bounds]);

  // Formatted strings
  const formattedPosition = useMemo(() => {
    return formatSunPosition(sunPosition);
  }, [sunPosition]);

  const formattedSunrise = useMemo(() => {
    return formatTime(sunTimes.sunrise);
  }, [sunTimes.sunrise]);

  const formattedSunset = useMemo(() => {
    return formatTime(sunTimes.sunset);
  }, [sunTimes.sunset]);

  // Build state object
  const state: SunlightState = {
    sunPosition,
    sunTimes,
    lightPatches,
    walls,
    hasOpenings: openingsExist,
    openingCounts,
    bounds,
    formattedPosition,
    formattedSunrise,
    formattedSunset,
    isValid: walls.length > 0,
  };

  // Animation loop
  useEffect(() => {
    if (!config.animating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Calculate how many minutes to advance
      const minutesToAdd = (elapsed / 1000) * config.animationSpeed;

      setConfig(prev => {
        const newDate = new Date(prev.dateTime.getTime() + minutesToAdd * 60 * 1000);

        // Wrap around at sunset, go back to sunrise
        const times = getSunTimes(newDate, prev.location);
        if (newDate > times.sunset) {
          // Reset to sunrise of same day
          return { ...prev, dateTime: times.sunrise };
        }

        return { ...prev, dateTime: newDate };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [config.animating, config.animationSpeed]);

  // Update config
  const updateConfig = useCallback((updates: Partial<SunlightConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Set location
  const setLocation = useCallback((location: GeoLocation) => {
    setConfig(prev => ({ ...prev, location }));
  }, []);

  // Set date
  const setDate = useCallback((date: Date) => {
    // Preserve time, just change date
    const newDateTime = new Date(config.dateTime);
    newDateTime.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setConfig(prev => ({ ...prev, dateTime: newDateTime }));
  }, [config.dateTime]);

  // Set time (minutes from midnight)
  const setTimeOfDay = useCallback((minutes: number) => {
    const newDateTime = new Date(config.dateTime);
    newDateTime.setHours(0, 0, 0, 0);
    newDateTime.setMinutes(minutes);
    setConfig(prev => ({ ...prev, dateTime: newDateTime }));
  }, [config.dateTime]);

  // Get current time as minutes from midnight
  const getTimeOfDay = useCallback(() => {
    return config.dateTime.getHours() * 60 + config.dateTime.getMinutes();
  }, [config.dateTime]);

  // Set to current time
  const setToNow = useCallback(() => {
    setConfig(prev => ({ ...prev, dateTime: new Date() }));
  }, []);

  // Set to sunrise
  const setToSunrise = useCallback(() => {
    setConfig(prev => ({ ...prev, dateTime: getSunTimes(prev.dateTime, prev.location).sunrise }));
  }, []);

  // Set to solar noon
  const setToNoon = useCallback(() => {
    setConfig(prev => ({ ...prev, dateTime: getSunTimes(prev.dateTime, prev.location).solarNoon }));
  }, []);

  // Set to sunset
  const setToSunset = useCallback(() => {
    setConfig(prev => ({ ...prev, dateTime: getSunTimes(prev.dateTime, prev.location).sunset }));
  }, []);

  // Toggle animation
  const toggleAnimation = useCallback(() => {
    lastTimeRef.current = 0;
    setConfig(prev => ({ ...prev, animating: !prev.animating }));
  }, []);

  // Stop animation
  const stopAnimation = useCallback(() => {
    setConfig(prev => ({ ...prev, animating: false }));
  }, []);

  return {
    state,
    config,
    presetLocations: PRESET_LOCATIONS,
    updateConfig,
    setLocation,
    setDate,
    setTimeOfDay,
    getTimeOfDay,
    setToNow,
    setToSunrise,
    setToNoon,
    setToSunset,
    toggleAnimation,
    stopAnimation,
  };
};

