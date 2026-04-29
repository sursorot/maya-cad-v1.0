/**
 * Navigation Simulation Types
 * 
 * Type definitions for the floorplan navigation simulation system.
 */

export interface Point {
  x: number;
  y: number;
}

export interface NavigationWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

export interface NavigationOpening {
  x: number;
  y: number;
  width: number;
  type: 'door' | 'window' | 'opening';
}

export interface NavigationBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface NavigationFloorplan {
  id: string;
  walls: NavigationWall[];
  openings: NavigationOpening[];
  bounds: NavigationBounds;
}

export interface AgentState {
  x: number;
  y: number;
  radius: number;
}

export type GoalShape = 'circle' | 'rectangle' | 'diamond';

export interface GoalState {
  x: number;
  y: number;
  radius: number;      // used for circle
  width: number;       // used for rectangle/diamond
  height: number;      // used for rectangle/diamond
  shape: GoalShape;
}

export interface RaycastResult {
  name: string;
  angle: number;
  distance: number;
  hitX: number;
  hitY: number;
}

export interface SimulationStats {
  stepCount: number;
  collisionCount: number;
  distanceTraveled: number;
  goalsReached: number;
  successRate: number;
}

export type AgentBehavior = 'random' | 'goal' | 'explore' | 'manual';

export interface SimulationConfig {
  stepSize: number;        // meters per step
  speed: number;           // steps per second
  agentRadius: number;     // meters
  goalRadius: number;      // meters (for circle shape)
  goalWidth: number;       // meters (for rectangle/diamond)
  goalHeight: number;      // meters (for rectangle/diamond)
  goalShape: GoalShape;    // shape of the goal area
  maxRayDistance: number;  // meters
  showRaycasts: boolean;
  showRayLabels: boolean;  // show distance measurements on rays
  showPath: boolean;
  showGoal: boolean;
  behavior: AgentBehavior;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  stepSize: 0.2,
  speed: 8,
  agentRadius: 0.25,
  goalRadius: 0.3,
  goalWidth: 0.5,
  goalHeight: 0.4,
  goalShape: 'circle',
  maxRayDistance: 10,
  showRaycasts: true,
  showRayLabels: true,
  showPath: true,
  showGoal: true,
  behavior: 'random',
};

