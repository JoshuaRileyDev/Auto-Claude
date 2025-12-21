import { Check, Code } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SUPPORTED_EDITORS } from '../../../shared/constants/editors';
import { useSettingsStore } from '../../stores/settings-store';
import type { AppSettings } from '../../../shared/types';
import type { EditorSettings } from '../../../shared/types/editor';

interface EditorSelectorProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

/**
 * Editor selector component for configuring code editor preferences
 *
 * Allows users to:
 * - Select a default code editor from supported options
 * - Enable/disable smart project type detection
 * - Configure per-project-type editor overrides
 */
export function EditorSelector({ settings, onSettingsChange }: EditorSelectorProps) {
  const updateStoreSettings = useSettingsStore((state) => state.updateSettings);

  const editorSettings = settings.editorSettings || {
    enableSmartDetection: true
  };

  const currentEditor = editorSettings.defaultCodeEditor;

  const handleEditorChange = (editorId: string) => {
    const updatedSettings: AppSettings = {
      ...settings,
      editorSettings: {
        ...editorSettings,
        defaultCodeEditor: editorId as any
      }
    };

    // Update local draft state
    onSettingsChange(updatedSettings);
    // Apply immediately to store
    updateStoreSettings({ editorSettings: updatedSettings.editorSettings });
  };

  const handleSmartDetectionToggle = (enabled: boolean) => {
    const updatedSettings: AppSettings = {
      ...settings,
      editorSettings: {
        ...editorSettings,
        enableSmartDetection: enabled
      }
    };

    // Update local draft state
    onSettingsChange(updatedSettings);
    // Apply immediately to store
    updateStoreSettings({ editorSettings: updatedSettings.editorSettings });
  };

  const getSelectedEditor = () => {
    if (!currentEditor) return null;
    return SUPPORTED_EDITORS.find(editor => editor.id === currentEditor);
  };

  const selectedEditor = getSelectedEditor();

  return (
    <div className="space-y-6">
      {/* Default Editor Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Default Code Editor</Label>
        <p className="text-sm text-muted-foreground">
          Choose your preferred code editor for reviewing worktrees
        </p>
        <Select value={currentEditor || ''} onValueChange={handleEditorChange}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Select a code editor" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_EDITORS.map((editor) => (
              <SelectItem key={editor.id} value={editor.id}>
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>{editor.displayName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Selected Editor Description */}
        {selectedEditor && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Code className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{selectedEditor.displayName}</p>
                <p className="text-xs text-muted-foreground">{selectedEditor.description}</p>
                {selectedEditor.recommendedFor && selectedEditor.recommendedFor.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Recommended for: {selectedEditor.recommendedFor.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Detection Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-foreground">Smart Project Detection</Label>
            <p className="text-xs text-muted-foreground">
              Automatically detect project types and suggest appropriate editors
            </p>
          </div>
          <Switch
            checked={editorSettings.enableSmartDetection}
            onCheckedChange={handleSmartDetectionToggle}
          />
        </div>
      </div>

      {/* Editor Preview Grid */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Available Editors</Label>
        <p className="text-sm text-muted-foreground">
          All supported code editors
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {SUPPORTED_EDITORS.map((editor) => {
            const isSelected = currentEditor === editor.id;

            return (
              <button
                key={editor.id}
                onClick={() => handleEditorChange(editor.id)}
                className={cn(
                  'relative flex flex-col p-4 rounded-lg border-2 text-left transition-all',
                  'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-accent/30'
                )}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}

                {/* Editor info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm text-foreground">{editor.displayName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{editor.description}</p>
                  {editor.recommendedFor && editor.recommendedFor.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {editor.recommendedFor.slice(0, 3).map((projectType) => (
                        <span
                          key={projectType}
                          className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded"
                        >
                          {projectType}
                        </span>
                      ))}
                      {editor.recommendedFor.length > 3 && (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                          +{editor.recommendedFor.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}