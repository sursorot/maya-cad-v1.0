import type { GridSystem } from '../types';

// Conversion constants
const INCH_IN_METERS = 0.0254; // 1 inch = 0.0254 meters
const FOOT_IN_METERS = 0.3048; // 1 foot = 0.3048 meters

/**
 * Professional CAD grid system (like AutoCAD/Revit)
 * Model Space: 1 SVG unit = 1 meter (full scale)
 * Grid adapts based on zoom level to show appropriate detail
 * 
 * Supports inch-level precision for accurate architectural drawing:
 * - 1 inch = 0.0254 meters
 * - 1 foot = 0.3048 meters (12 inches)
 */
export const calculateGridSystem = (viewWidth: number): GridSystem => {
  let minorUnit: number; // in meters
  let mediumUnit: number; // in meters (intermediate level)
  let majorUnit: number; // in meters
  let label: string;

  // Professional grid adaptation based on view width (like AutoCAD dynamic grid)
  // Grid spacing adjusts to maintain ~20-50px on screen regardless of zoom
  // Now with inch-level precision support for architectural accuracy
  
  if (viewWidth < 0.15) {
    // Ultra zoom in: 1/4 inch precision (6.35mm)
    minorUnit = INCH_IN_METERS * 0.25; // 1/4 inch ≈ 6.35mm
    mediumUnit = INCH_IN_METERS; // 1 inch
    majorUnit = INCH_IN_METERS * 6; // 6 inches
    label = 'in';
  } else if (viewWidth < 0.3) {
    // Extreme zoom in: 1/2 inch precision (12.7mm)
    minorUnit = INCH_IN_METERS * 0.5; // 1/2 inch ≈ 12.7mm
    mediumUnit = INCH_IN_METERS * 3; // 3 inches
    majorUnit = FOOT_IN_METERS; // 1 foot
    label = 'in';
  } else if (viewWidth < 0.6) {
    // Very zoomed in: 1 inch precision
    minorUnit = INCH_IN_METERS; // 1 inch = 25.4mm
    mediumUnit = INCH_IN_METERS * 6; // 6 inches
    majorUnit = FOOT_IN_METERS; // 1 foot
    label = 'in';
  } else if (viewWidth < 1.5) {
    // Zoomed in: 2 inch precision
    minorUnit = INCH_IN_METERS * 2; // 2 inches ≈ 5cm
    mediumUnit = INCH_IN_METERS * 6; // 6 inches
    majorUnit = FOOT_IN_METERS; // 1 foot
    label = 'in';
  } else if (viewWidth < 3) {
    // Close view: 3 inch precision
    minorUnit = INCH_IN_METERS * 3; // 3 inches ≈ 7.6cm
    mediumUnit = FOOT_IN_METERS; // 1 foot
    majorUnit = FOOT_IN_METERS * 3; // 3 feet
    label = 'ft';
  } else if (viewWidth <= 12) {
    // Zoomed in: 6 inch precision (includes default 10m view)
    minorUnit = INCH_IN_METERS * 6; // 6 inches ≈ 15cm
    mediumUnit = FOOT_IN_METERS; // 1 foot
    majorUnit = FOOT_IN_METERS * 3; // 3 feet ≈ 1m
    label = 'ft';
  } else if (viewWidth < 50) {
    // Normal view: foot precision (typical room scale)
    minorUnit = FOOT_IN_METERS; // 1 foot ≈ 30cm
    mediumUnit = FOOT_IN_METERS * 3; // 3 feet
    majorUnit = FOOT_IN_METERS * 10; // 10 feet ≈ 3m
    label = 'ft';
  } else if (viewWidth < 200) {
    // Medium zoom out: multi-foot precision
    minorUnit = FOOT_IN_METERS * 5; // 5 feet
    mediumUnit = FOOT_IN_METERS * 10; // 10 feet
    majorUnit = FOOT_IN_METERS * 50; // 50 feet
    label = 'ft';
  } else if (viewWidth < 500) {
    // Zoomed out: building scale
    minorUnit = 5; // 5m
    mediumUnit = 25; // 25m
    majorUnit = 50; // 50m
    label = 'm';
  } else if (viewWidth < 1000) {
    // More zoomed out: large building/site scale
    minorUnit = 10; // 10m
    mediumUnit = 50; // 50m
    majorUnit = 100; // 100m
    label = 'm';
  } else {
    // Max zoom out: campus scale (up to 2km)
    minorUnit = 25; // 25m
    mediumUnit = 100; // 100m
    majorUnit = 250; // 250m
    label = 'm';
  }

  return {
    minor: minorUnit, // in meters
    medium: mediumUnit, // in meters
    major: majorUnit, // in meters
    minorUnit,
    mediumUnit,
    majorUnit,
    label,
  };
};

