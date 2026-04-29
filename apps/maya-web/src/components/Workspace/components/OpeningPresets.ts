export type WindowVisualType = 'casement' | 'single' | 'sliding' | 'bay';
export type DoorVisualType = 'swing' | 'sliding' | 'french';

export interface OpeningPreset {
  id: string;
  label: string;
  width: number; // meters
  height: number; // meters
  category: 'door' | 'window' | 'opening';
  visualType?: WindowVisualType | DoorVisualType;
}

const feetInchesToMeters = (feet: number, inches = 0) => ((feet * 12 + inches) * 0.0254);

export const OPENING_PRESETS: OpeningPreset[] = [
  { id: 'door-3068', label: `Swing 3'×6'-8"`, width: feetInchesToMeters(3), height: feetInchesToMeters(6, 8), category: 'door', visualType: 'swing' },
  { id: 'door-3070', label: `Swing 3'×7'`, width: feetInchesToMeters(3), height: feetInchesToMeters(7), category: 'door', visualType: 'swing' },
  { id: 'door-sliding-6068', label: `Sliding 6'×6'-8"`, width: feetInchesToMeters(6), height: feetInchesToMeters(6, 8), category: 'door', visualType: 'sliding' },
  { id: 'door-french-6068', label: `French 6'×6'-8"`, width: feetInchesToMeters(6), height: feetInchesToMeters(6, 8), category: 'door', visualType: 'french' },
  { id: 'window-casement-4040', label: `Casement 4'×4'`, width: feetInchesToMeters(4), height: feetInchesToMeters(4), category: 'window', visualType: 'casement' },
  { id: 'window-single-4040', label: `Single 4'×4'`, width: feetInchesToMeters(4), height: feetInchesToMeters(4), category: 'window', visualType: 'single' },
  { id: 'window-sliding-4040', label: `Sliding 4'×4'`, width: feetInchesToMeters(4), height: feetInchesToMeters(4), category: 'window', visualType: 'sliding' },
  { id: 'window-bay-4040', label: `Bay 4'×4'`, width: feetInchesToMeters(4), height: feetInchesToMeters(4), category: 'window', visualType: 'bay' },
];


