import { SettingsSection } from './SettingsSection';
import type { AppSettings } from '../../../shared/types';

interface EditorSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

/**
 * Code editor settings section
 * Wraps the EditorSelector component with a consistent settings section layout
 * TODO: EditorSelector component will be implemented in a subsequent task
 */
export function EditorSettings({ settings, onSettingsChange }: EditorSettingsProps) {
  return (
    <SettingsSection
      title="Code Editor"
      description="Configure your preferred code editor for worktree review"
    >
      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-md">
        Editor configuration interface coming soon...
      </div>
    </SettingsSection>
  );
}