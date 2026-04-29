/**
 * useSimulation Hook
 * 
 * Manages the state and logic for the navigation simulation.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type {
  NavigationFloorplan,
  AgentState,
  GoalState,
  RaycastResult,
  SimulationStats,
  SimulationConfig,
  Point,
} from '../utils/navigationTypes';
import { DEFAULT_SIMULATION_CONFIG } from '../utils/navigationTypes';
import { snapshotToNavigation, isFloorplanValid } from '../utils/snapshotToNavigation';
import { 
  checkWallCollision, 
  checkBoundsCollision,
  findValidSpawnPosition,
  isAgentInGoal,
} from '../utils/collisionDetection';
import { computeRaycasts } from '../utils/raycasting';

export interface SimulationState {
  running: boolean;
  paused: boolean;
  agent: AgentState;
  goal: GoalState;
  path: Point[];
  raycasts: RaycastResult[];
  stats: SimulationStats;
  floorplan: NavigationFloorplan | null;
  isValid: boolean;
  lastCollision: { x: number; y: number; time: number } | null;
}

const createInitialState = (): SimulationState => ({
  running: false,
  paused: false,
  agent: { x: 0, y: 0, radius: 0.25 },
  goal: { x: 0, y: 0, radius: 0.3, width: 0.5, height: 0.4, shape: 'circle' },
  path: [],
  raycasts: [],
  stats: {
    stepCount: 0,
    collisionCount: 0,
    distanceTraveled: 0,
    goalsReached: 0,
    successRate: 0,
  },
  floorplan: null,
  isValid: false,
  lastCollision: null,
});

// Action deltas for 8 directions
const ACTION_DELTAS: Record<number, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },   // N
  1: { dx: 1, dy: -1 },   // NE
  2: { dx: 1, dy: 0 },    // E
  3: { dx: 1, dy: 1 },    // SE
  4: { dx: 0, dy: 1 },    // S
  5: { dx: -1, dy: 1 },   // SW
  6: { dx: -1, dy: 0 },   // W
  7: { dx: -1, dy: -1 },  // NW
};

export function useSimulation(snapshot: WorkspaceSnapshot | null) {
  const [state, setState] = useState<SimulationState>(createInitialState());
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG);
  const animationRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);
  
  // Convert snapshot to floorplan
  const floorplan = useMemo(() => {
    if (!snapshot) return null;
    try {
      const fp = snapshotToNavigation(snapshot);
      return isFloorplanValid(fp) ? fp : null;
    } catch {
      return null;
    }
  }, [snapshot]);
  
  // Reset agent to a valid position
  const resetAgent = useCallback(() => {
    if (!floorplan) return;
    
    const agentPos = findValidSpawnPosition(
      floorplan.walls,
      floorplan.bounds,
      config.agentRadius
    );
    
    const goalPos = findValidSpawnPosition(
      floorplan.walls,
      floorplan.bounds,
      config.goalRadius
    );
    
    if (agentPos && goalPos) {
      const raycasts = computeRaycasts(
        agentPos.x, agentPos.y,
        floorplan.walls,
        floorplan.bounds,
        config.maxRayDistance
      );
      
      setState(prev => ({
        ...prev,
        agent: { ...agentPos, radius: config.agentRadius },
        goal: { 
          ...goalPos, 
          radius: config.goalRadius,
          width: config.goalWidth,
          height: config.goalHeight,
          shape: config.goalShape,
        },
        path: [agentPos],
        raycasts,
        stats: {
          stepCount: 0,
          collisionCount: 0,
          distanceTraveled: 0,
          goalsReached: 0,
          successRate: 0,
        },
        lastCollision: null,
      }));
    }
  }, [floorplan, config.agentRadius, config.goalRadius, config.maxRayDistance]);
  
  // Track previous floorplan to detect changes
  const prevFloorplanRef = useRef<NavigationFloorplan | null>(null);
  
  // Check if floorplan changed and trigger reset
  if (floorplan !== prevFloorplanRef.current) {
    prevFloorplanRef.current = floorplan;
    // Schedule state update for next render cycle (avoids cascading renders warning)
    queueMicrotask(() => {
      if (floorplan) {
        setState(prev => ({
          ...prev,
          floorplan,
          isValid: true,
          running: false,
          paused: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          floorplan: null,
          isValid: false,
          running: false,
        }));
      }
    });
  }
  
  // Reset agent when floorplan changes (uses timeout to avoid cascading render warning)
  useEffect(() => {
    if (floorplan && state.floorplan === floorplan && state.isValid) {
      // Only reset if we haven't already (path is empty or has single initial point)
      if (state.path.length <= 1) {
        // Use setTimeout to break synchronous chain
        const timer = setTimeout(() => resetAgent(), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [floorplan, state.floorplan, state.isValid, state.path.length, resetAgent]);
  
  // Set a new random goal
  const setNewGoal = useCallback(() => {
    if (!floorplan) return;
    
    const goalPos = findValidSpawnPosition(
      floorplan.walls,
      floorplan.bounds,
      config.goalRadius
    );
    
    if (goalPos) {
      setState(prev => ({
        ...prev,
        goal: { 
          ...goalPos, 
          radius: config.goalRadius,
          width: config.goalWidth,
          height: config.goalHeight,
          shape: config.goalShape,
        },
      }));
    }
  }, [floorplan, config.goalRadius]);
  
  // Get action based on behavior
  const getAction = useCallback((): { dx: number; dy: number } => {
    switch (config.behavior) {
      case 'goal': {
        // Move towards goal with some noise
        const dx = state.goal.x - state.agent.x;
        const dy = state.goal.y - state.agent.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.01) return getRandomAction();
        const noise = 0.2;
        return {
          dx: dx / len + (Math.random() - 0.5) * noise,
          dy: dy / len + (Math.random() - 0.5) * noise,
        };
      }
      case 'explore': {
        // Wall following behavior
        let minDist = Infinity;
        let followAngle = 0;
        
        for (const ray of state.raycasts) {
          if (ray.distance < minDist) {
            minDist = ray.distance;
            followAngle = ray.angle + Math.PI / 2;
          }
        }
        
        if (minDist < 0.5) {
          // Too close to wall, move away
          const awayAngle = state.raycasts.find(r => r.distance === minDist)!.angle + Math.PI;
          return {
            dx: Math.cos(awayAngle),
            dy: Math.sin(awayAngle),
          };
        }
        
        return {
          dx: Math.cos(followAngle),
          dy: Math.sin(followAngle),
        };
      }
      case 'manual':
        return { dx: 0, dy: 0 }; // No automatic movement
      case 'random':
      default:
        return getRandomAction();
    }
  }, [config.behavior, state.agent, state.goal, state.raycasts]);
  
  // Move agent in a direction
  const moveAgent = useCallback((dx: number, dy: number) => {
    if (!floorplan) return false;
    
    // Normalize direction
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return false;
    
    const normDx = dx / len;
    const normDy = dy / len;
    
    const newX = state.agent.x + normDx * config.stepSize;
    const newY = state.agent.y + normDy * config.stepSize;
    
    // Check bounds collision
    if (checkBoundsCollision(newX, newY, state.agent.radius, floorplan.bounds)) {
      setState(prev => ({
        ...prev,
        stats: { ...prev.stats, collisionCount: prev.stats.collisionCount + 1 },
        lastCollision: { x: newX, y: newY, time: Date.now() },
      }));
      return false;
    }
    
    // Check wall collision
    if (checkWallCollision(newX, newY, state.agent.radius, floorplan.walls)) {
      setState(prev => ({
        ...prev,
        stats: { ...prev.stats, collisionCount: prev.stats.collisionCount + 1 },
        lastCollision: { x: newX, y: newY, time: Date.now() },
      }));
      return false;
    }
    
    // Calculate distance traveled
    const distTraveled = config.stepSize;
    
    // Check if goal reached (using shape-aware detection)
    const reachedGoal = config.showGoal && isAgentInGoal(
      newX, newY, state.agent.radius,
      state.goal.x, state.goal.y,
      state.goal.shape,
      state.goal.radius,
      state.goal.width,
      state.goal.height
    );
    
    // Compute new raycasts
    const raycasts = computeRaycasts(
      newX, newY,
      floorplan.walls,
      floorplan.bounds,
      config.maxRayDistance
    );
    
    setState(prev => {
      const newPath = [...prev.path, { x: newX, y: newY }];
      // Limit path length
      if (newPath.length > 500) {
        newPath.splice(0, newPath.length - 500);
      }
      
      const newGoalsReached = reachedGoal ? prev.stats.goalsReached + 1 : prev.stats.goalsReached;
      
      return {
        ...prev,
        agent: { ...prev.agent, x: newX, y: newY },
        path: newPath,
        raycasts,
        stats: {
          stepCount: prev.stats.stepCount + 1,
          collisionCount: prev.stats.collisionCount,
          distanceTraveled: prev.stats.distanceTraveled + distTraveled,
          goalsReached: newGoalsReached,
          successRate: newGoalsReached / Math.max(1, newGoalsReached + prev.stats.collisionCount),
        },
      };
    });
    
    // If goal reached, set new goal
    if (reachedGoal) {
      setNewGoal();
    }
    
    return true;
  }, [floorplan, state.agent, state.goal, config, setNewGoal]);
  
  // Step the simulation once
  const step = useCallback(() => {
    if (!state.running || state.paused || config.behavior === 'manual') return;
    
    const action = getAction();
    moveAgent(action.dx, action.dy);
  }, [state.running, state.paused, config.behavior, getAction, moveAgent]);
  
  // Animation loop
  useEffect(() => {
    if (!state.running || state.paused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const animate = (timestamp: number) => {
      const stepInterval = 1000 / config.speed;
      
      if (timestamp - lastStepTimeRef.current >= stepInterval) {
        step();
        lastStepTimeRef.current = timestamp;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.running, state.paused, config.speed, step]);
  
  // Control functions
  const start = useCallback(() => {
    if (!state.isValid) return;
    setState(prev => ({ ...prev, running: true, paused: false }));
  }, [state.isValid]);
  
  const pause = useCallback(() => {
    setState(prev => ({ ...prev, paused: true }));
  }, []);
  
  const resume = useCallback(() => {
    setState(prev => ({ ...prev, paused: false }));
  }, []);
  
  const stop = useCallback(() => {
    setState(prev => ({ ...prev, running: false, paused: false }));
  }, []);
  
  const toggleRunning = useCallback(() => {
    if (state.running) {
      if (state.paused) {
        resume();
      } else {
        pause();
      }
    } else {
      start();
    }
  }, [state.running, state.paused, start, pause, resume]);
  
  const clearPath = useCallback(() => {
    setState(prev => ({
      ...prev,
      path: [{ x: prev.agent.x, y: prev.agent.y }],
      stats: { ...prev.stats, distanceTraveled: 0 },
    }));
  }, []);
  
  const updateConfig = useCallback((updates: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Manual movement (keyboard control)
  const manualMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const deltas: Record<string, { dx: number; dy: number }> = {
      up: { dx: 0, dy: -1 },
      down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 },
      right: { dx: 1, dy: 0 },
    };
    moveAgent(deltas[direction].dx, deltas[direction].dy);
  }, [moveAgent]);
  
  return {
    state,
    config,
    start,
    pause,
    resume,
    stop,
    toggleRunning,
    resetAgent,
    setNewGoal,
    clearPath,
    updateConfig,
    manualMove,
  };
}

// Helper function for random action
function getRandomAction(): { dx: number; dy: number } {
  const actionIndex = Math.floor(Math.random() * 8);
  return ACTION_DELTAS[actionIndex];
}

