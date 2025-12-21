import { SettingsSection } from './SettingsSection';
import { EditorSelector } from './EditorSelector';
import type { AppSettings } from '../../../shared/types';

interface EditorSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

/**
 * Code editor settings section
 * Wraps the EditorSelector component with a consistent settings section layout
 */
export function EditorSettings({ settings, onSettingsChange }: EditorSettingsProps) {
  return (
    <SettingsSection
      title="Code Editor"
      description="Configure your preferred code editor for worktree review"
    >
      <EditorSelector
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
    </SettingsSection>
  );
}