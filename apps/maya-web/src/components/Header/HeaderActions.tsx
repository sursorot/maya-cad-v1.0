/**
 * Header Action Buttons
 * 
 * Memoized component for export, save, and auth buttons.
 */

import { memo, useState } from 'react';
import { Download, LogIn } from 'lucide-react';
import type { ToolbarStyle } from '../Workspace/types';
import type { AutoSaveState } from '../../lib/supabase/types';
import { HeaderButton, getHeaderIconProps } from './HeaderButton';
import { headerStyles, buttonStyles } from '../../theme/componentStyles';
import { useAuth } from '../../lib/supabase';
import { UserMenu, AuthModal } from '../Auth';
import { ProjectNameEditor } from './ProjectNameEditor';
import { AutoSaveIndicator } from './AutoSaveIndicator';

interface HeaderActionsProps {
  toolbarStyle: ToolbarStyle;
  canvasOpen: boolean;
  // Project
  projectName?: string;
  onRenameProject?: (newName: string) => Promise<boolean>;
  autoSaveState?: AutoSaveState;
  onRetrySave?: () => void;
  onManualSave?: () => void;
  // Export
  onExport?: () => void;
}

/**
 * Action buttons for the header
 */
export const HeaderActions = memo(function HeaderActions({
  toolbarStyle,
  canvasOpen,
  projectName,
  onRenameProject,
  autoSaveState,
  onRetrySave,
  onManualSave,
  onExport,
}: HeaderActionsProps) {
  const styles = headerStyles[toolbarStyle];
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'signIn' | 'signUp'>('signIn');

  const openSignIn = () => {
    setAuthModalView('signIn');
    setAuthModalOpen(true);
  };

  const textColor = buttonStyles[toolbarStyle].text;

  return (
    <div style={styles.rightGroup}>
      {/* Project name editor (only when canvas is open) */}
      {canvasOpen && projectName !== undefined && (
        <ProjectNameEditor
          projectName={projectName}
          onRenameProject={onRenameProject}
          toolbarStyle={toolbarStyle}
        />
      )}

      {/* Auto-save indicator */}
      {canvasOpen && autoSaveState && (
        <AutoSaveIndicator
          autoSaveState={autoSaveState}
          onRetrySave={onRetrySave}
          onManualSave={onManualSave}
          toolbarStyle={toolbarStyle}
        />
      )}

      {/* Export button */}
      {canvasOpen && onExport && (
        <HeaderButton
          onClick={onExport}
          title="Export"
          toolbarStyle={toolbarStyle}
          width="auto"
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            padding: '0 8px',
          }}>
            <Download {...getHeaderIconProps(toolbarStyle, false, 14)} />
            <span style={{ 
              color: textColor, 
              fontSize: '11px',
              fontWeight: 500,
            }}>
              Export
            </span>
          </div>
        </HeaderButton>
      )}

      {/* Auth section */}
      {!authLoading && (
        isAuthenticated ? (
          <UserMenu variant={toolbarStyle} />
        ) : (
          <HeaderButton
            onClick={openSignIn}
            title="Sign In"
            toolbarStyle={toolbarStyle}
            width="auto"
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              padding: '0 8px',
            }}>
              <LogIn {...getHeaderIconProps(toolbarStyle, false, 14)} />
              <span style={{ 
                color: textColor, 
                fontSize: '11px',
                fontWeight: 500,
              }}>
                Sign In
              </span>
            </div>
          </HeaderButton>
        )
      )}

      {/* Auth modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialView={authModalView}
      />
    </div>
  );
});

