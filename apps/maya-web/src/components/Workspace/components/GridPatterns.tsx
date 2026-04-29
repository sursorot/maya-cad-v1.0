import type { GridSystem, ToolbarStyle } from '../types';

interface GridPatternsProps {
  gridSystem: GridSystem;
  toolbarStyle?: ToolbarStyle;
}

export const GridPatterns: React.FC<GridPatternsProps> = ({ gridSystem, toolbarStyle = 'modern' }) => {
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';
  
  // Grid colors based on theme
  const getGridColors = () => {
    if (isClean) {
      // Clean uses subtle blue-tinted gray grid lines on white background
      return {
        minor: '#f5f6f8',
        medium: '#E8EAED',
        major: '#d0d4da',
      };
    }
    if (isCyber) {
      // Cyber uses cyan grid lines on deep blue background
      return {
        minor: 'rgba(77, 166, 255, 0.15)',   // Subtle cyan
        medium: 'rgba(77, 166, 255, 0.25)',  // Medium cyan
        major: 'rgba(77, 166, 255, 0.4)',    // Stronger cyan
      };
    }
    if (isFunk) {
      // Funk uses a funky cyan/pink pattern on light background
      return {
        minor: 'rgba(0, 240, 255, 0.15)',    // Subtle cyan
        medium: 'rgba(255, 105, 180, 0.2)',  // Pink
        major: 'rgba(30, 30, 30, 0.3)',      // Dark for contrast
      };
    }
    if (isWindows95) {
      // Windows 95 uses white grid lines on the teal background
      return {
        minor: 'rgba(255, 255, 255, 0.15)',
        medium: 'rgba(255, 255, 255, 0.25)',
        major: 'rgba(255, 255, 255, 0.4)',
      };
    }
    // Modern
    return {
      minor: '#ebebeb',
      medium: '#d8d8d8',
      major: '#dddddd',
    };
  };

  const colors = getGridColors();
  const minorColor = colors.minor;
  const mediumColor = colors.medium;
  const majorColor = colors.major;

  return (
    <defs>
      {/* Minor grid pattern - finest subdivision */}
      <pattern
        id="minorGrid"
        width={gridSystem.minor}
        height={gridSystem.minor}
        patternUnits="userSpaceOnUse"
      >
        <rect
          width={gridSystem.minor}
          height={gridSystem.minor}
          fill="none"
          stroke={minorColor}
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
      </pattern>

      {/* Medium grid pattern - intermediate subdivision */}
      <pattern
        id="mediumGrid"
        width={gridSystem.medium}
        height={gridSystem.medium}
        patternUnits="userSpaceOnUse"
      >
        <rect
          width={gridSystem.medium}
          height={gridSystem.medium}
          fill="none"
          stroke={mediumColor}
          strokeWidth={0.75}
          vectorEffect="non-scaling-stroke"
        />
      </pattern>

      {/* Major grid pattern - primary subdivision */}
      <pattern
        id="majorGrid"
        width={gridSystem.major}
        height={gridSystem.major}
        patternUnits="userSpaceOnUse"
      >
        <rect
          width={gridSystem.major}
          height={gridSystem.major}
          fill="none"
          stroke={majorColor}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </pattern>

      {/* Zone hatch pattern */}
      <pattern
        id="zoneHatch"
        width="10"
        height="10"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="10"
          stroke={isClean ? '#1565C0' : isCyber ? '#4da6ff' : isFunk ? '#ff69b4' : isWindows95 ? '#000080' : '#3b82f6'}
          strokeWidth={isFunk ? '1' : '0.5'}
          opacity={isClean ? '0.25' : isCyber ? '0.4' : isFunk ? '0.5' : '0.3'}
        />
      </pattern>
    </defs>
  );
};
