import type { OpeningShape } from '../../types';

const WINDOW_HEIGHT_THRESHOLD = 5.5;

export const isWindowLikeOpening = (shape: OpeningShape): boolean => {
  if (shape.category === 'door') {
    return false;
  }
  if (shape.category === 'window') {
    return true;
  }
  if (shape.metadata) {
    const metadataValues = Object.values(shape.metadata);
    const metadataIndicatesWindow = metadataValues.some(
      (value) => typeof value === 'string' && value.toLowerCase().includes('window')
    );
    if (metadataIndicatesWindow) {
      return true;
    }
  }
  if (typeof shape.height === 'number' && shape.height > 0 && shape.height <= WINDOW_HEIGHT_THRESHOLD) {
    return true;
  }
  return false;
};


