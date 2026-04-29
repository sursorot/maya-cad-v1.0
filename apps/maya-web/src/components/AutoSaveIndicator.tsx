/**
 * AutoSaveIndicator Component
 * 
 * Displays the current auto-save status with visual feedback.
 */

import { Cloud, CloudOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { AutoSaveState } from '../lib/supabase/types';
import { formatLastSaved } from '../lib/supabase/hooks/useAutoSave';

interface AutoSaveIndicatorProps {
  state: AutoSaveState;
  projectName?: string;
  onRetry?: () => void;
}

export default function AutoSaveIndicator({ 
  state, 
  projectName,
  onRetry,
}: AutoSaveIndicatorProps) {
  const getStatusDisplay = () => {
    switch (state.status) {
      case 'pending':
        return {
          icon: <Cloud className="w-4 h-4 text-amber-400" />,
          text: 'Unsaved changes',
          subtext: null,
          color: 'text-amber-400',
          animate: false,
        };
      case 'saving':
        return {
          icon: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
          text: 'Saving...',
          subtext: null,
          color: 'text-blue-400',
          animate: true,
        };
      case 'saved':
        return {
          icon: <Check className="w-4 h-4 text-green-400" />,
          text: 'Saved',
          subtext: state.lastSavedAt ? formatLastSaved(state.lastSavedAt) : null,
          color: 'text-green-400',
          animate: false,
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
          text: 'Save failed',
          subtext: onRetry ? 'Click to retry' : state.lastError,
          color: 'text-red-400',
          animate: false,
        };
      default:
        return {
          icon: state.lastSavedAt 
            ? <Cloud className="w-4 h-4 text-zinc-500" />
            : <CloudOff className="w-4 h-4 text-zinc-600" />,
          text: state.lastSavedAt ? 'Synced' : 'Not saved',
          subtext: state.lastSavedAt ? formatLastSaved(state.lastSavedAt) : null,
          color: 'text-zinc-500',
          animate: false,
        };
    }
  };

  const display = getStatusDisplay();
  const isClickable = state.status === 'error' && onRetry;

  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md
        transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:bg-zinc-800' : ''}
        ${state.status === 'saving' ? 'bg-blue-500/10' : ''}
        ${state.status === 'error' ? 'bg-red-500/10' : ''}
      `}
      onClick={isClickable ? onRetry : undefined}
      title={state.lastError || undefined}
    >
      {display.icon}
      
      <div className="flex flex-col">
        {projectName && (
          <span className="text-xs text-zinc-300 font-medium truncate max-w-[150px]">
            {projectName}
          </span>
        )}
        <span className={`text-xs ${display.color}`}>
          {display.text}
          {display.subtext && (
            <span className="text-zinc-500 ml-1">
              · {display.subtext}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact version for tight spaces (footer)
 */
export function AutoSaveIndicatorCompact({ state }: { state: AutoSaveState }) {
  const getIcon = () => {
    switch (state.status) {
      case 'pending':
        return <div className="w-2 h-2 rounded-full bg-amber-400" />;
      case 'saving':
        return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
      case 'saved':
        return <div className="w-2 h-2 rounded-full bg-green-400" />;
      case 'error':
        return <div className="w-2 h-2 rounded-full bg-red-400" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-zinc-600" />;
    }
  };

  const getText = () => {
    switch (state.status) {
      case 'pending': return 'Unsaved';
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'error': return 'Error';
      default: return state.lastSavedAt ? 'Synced' : '';
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
      {getIcon()}
      <span>{getText()}</span>
    </div>
  );
}

