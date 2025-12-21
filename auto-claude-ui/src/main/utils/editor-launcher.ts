/**
 * Cross-platform code editor launching utilities
 * Handles launching different code editors with proper platform detection and command construction
 */

import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import { platform } from 'os';
import type {
  CodeEditorType,
  CodeEditor,
  EditorLaunchRequest,
  EditorLaunchResult,
  EditorAvailabilityResult,
  Platform
} from '../../shared/types/editor';
import { SUPPORTED_EDITORS, getEditorById } from '../../shared/constants/editors';

/**
 * Get the current platform
 */
function getCurrentPlatform(): Platform {
  const currentPlatform = platform();
  return currentPlatform as Platform;
}

/**
 * Check if a specific editor is available on the current platform
 */
export async function checkEditorAvailability(editorId: CodeEditorType): Promise<EditorAvailabilityResult> {
  const currentPlatform = getCurrentPlatform();
  const editor = getEditorById(editorId);

  if (!editor) {
    return {
      editor: editorId,
      isAvailable: false,
      platform: currentPlatform,
      error: 'Unknown editor'
    };
  }

  // Check if editor supports current platform
  const command = editor.commands[currentPlatform];
  if (!command) {
    return {
      editor: editorId,
      isAvailable: false,
      platform: currentPlatform,
      error: `Editor not supported on ${currentPlatform}`
    };
  }

  try {
    // Check if the command exists by trying to run it with --version or --help
    // For absolute paths on macOS, check if the file exists
    if (command.startsWith('/')) {
      if (existsSync(command)) {
        return {
          editor: editorId,
          isAvailable: true,
          platform: currentPlatform,
          detectedPath: command
        };
      } else {
        return {
          editor: editorId,
          isAvailable: false,
          platform: currentPlatform,
          error: 'Editor executable not found at expected path'
        };
      }
    }

    // For command names, try to check if they exist in PATH
    try {
      execSync(`which ${command}`, { stdio: 'ignore' });
      return {
        editor: editorId,
        isAvailable: true,
        platform: currentPlatform,
        detectedPath: command
      };
    } catch {
      // Command not found in PATH
      return {
        editor: editorId,
        isAvailable: false,
        platform: currentPlatform,
        error: 'Editor command not found in PATH'
      };
    }
  } catch (error) {
    return {
      editor: editorId,
      isAvailable: false,
      platform: currentPlatform,
      error: error instanceof Error ? error.message : 'Unknown error checking availability'
    };
  }
}

/**
 * Get all available editors on the current platform
 */
export async function getAvailableEditors(): Promise<EditorAvailabilityResult[]> {
  const currentPlatform = getCurrentPlatform();
  const platformEditors = SUPPORTED_EDITORS.filter(
    editor => editor.commands[currentPlatform]
  );

  const availabilityPromises = platformEditors.map(editor =>
    checkEditorAvailability(editor.id)
  );

  return Promise.all(availabilityPromises);
}

/**
 * Build the command and arguments for launching an editor
 */
function buildLaunchCommand(
  editor: CodeEditor,
  targetPath: string,
  extraArgs: string[] = []
): { command: string; args: string[] } {
  const currentPlatform = getCurrentPlatform();
  const baseCommand = editor.commands[currentPlatform];
  const baseArgs = editor.args?.[currentPlatform] || [];

  if (!baseCommand) {
    throw new Error(`No command configured for ${editor.id} on ${currentPlatform}`);
  }

  // Build arguments array
  const args: string[] = [];

  // Add base args (like '--' for VS Code)
  args.push(...baseArgs);

  // Add extra args from the request
  args.push(...extraArgs);

  // Add the target path as the last argument
  args.push(targetPath);

  return {
    command: baseCommand,
    args
  };
}

/**
 * Launch a code editor with the specified configuration
 */
export async function launchEditor(request: EditorLaunchRequest): Promise<EditorLaunchResult> {
  try {
    // Validate the target path
    if (!request.path || !existsSync(request.path)) {
      return {
        success: false,
        error: 'Target path does not exist'
      };
    }

    let editor: CodeEditor | undefined;

    // If specific editor is requested, use it
    if (request.editor) {
      editor = getEditorById(request.editor);
      if (!editor) {
        return {
          success: false,
          error: `Unknown editor: ${request.editor}`
        };
      }
    } else {
      // Use the first available editor as fallback
      const currentPlatform = getCurrentPlatform();
      const availableEditors = SUPPORTED_EDITORS.filter(
        e => e.commands[currentPlatform]
      );

      if (availableEditors.length === 0) {
        return {
          success: false,
          error: 'No editors available on this platform'
        };
      }

      // Default to VS Code if available, otherwise use the first available
      editor = availableEditors.find(e => e.id === 'vscode') || availableEditors[0];
    }

    // Check if the editor is available
    const availability = await checkEditorAvailability(editor.id);
    if (!availability.isAvailable) {
      return {
        success: false,
        error: `Editor not available: ${availability.error}`
      };
    }

    // Build the launch command
    const { command, args } = buildLaunchCommand(
      editor,
      request.path,
      request.extraArgs || []
    );

    // Launch the editor
    return new Promise((resolve) => {
      const childProcess = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });

      // Unref the child process to allow the parent to exit
      childProcess.unref();

      childProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to launch editor: ${error.message}`,
          launchedEditor: editor.id,
          command: `${command} ${args.join(' ')}`
        });
      });

      childProcess.on('spawn', () => {
        resolve({
          success: true,
          data: undefined,
          launchedEditor: editor.id,
          command: `${command} ${args.join(' ')}`
        });
      });

      // Handle cases where the process exits immediately (error condition)
      childProcess.on('close', (code) => {
        if (code !== 0) {
          resolve({
            success: false,
            error: `Editor exited with code ${code}`,
            launchedEditor: editor.id,
            command: `${command} ${args.join(' ')}`
          });
        }
      });
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error launching editor'
    };
  }
}

/**
 * Launch an editor for a specific worktree directory
 */
export async function launchEditorForWorktree(
  worktreePath: string,
  editorId?: CodeEditorType,
  extraArgs?: string[]
): Promise<EditorLaunchResult> {
  return launchEditor({
    path: worktreePath,
    editor: editorId,
    extraArgs
  });
}

/**
 * Launch an editor for a specific file
 */
export async function launchEditorForFile(
  filePath: string,
  editorId?: CodeEditorType,
  extraArgs?: string[]
): Promise<EditorLaunchResult> {
  return launchEditor({
    path: filePath,
    editor: editorId,
    extraArgs
  });
}

/**
 * Get the best available editor for a project (with optional user preference)
 */
export async function getBestAvailableEditor(
  preferredEditor?: CodeEditorType
): Promise<CodeEditorType | null> {
  // If user has a preference, check if it's available first
  if (preferredEditor) {
    const availability = await checkEditorAvailability(preferredEditor);
    if (availability.isAvailable) {
      return preferredEditor;
    }
  }

  // Get all available editors and return the first one
  const available = await getAvailableEditors();
  const availableEditors = available.filter(a => a.isAvailable);

  if (availableEditors.length === 0) {
    return null;
  }

  // Prefer VS Code if available, otherwise use the first available
  const vscode = availableEditors.find(a => a.editor === 'vscode');
  return vscode ? vscode.editor : availableEditors[0].editor;
}

/**
 * Test if an editor can be launched (without actually launching it)
 */
export async function testEditorLaunch(editorId: CodeEditorType): Promise<EditorLaunchResult> {
  const availability = await checkEditorAvailability(editorId);

  if (!availability.isAvailable) {
    return {
      success: false,
      error: availability.error || 'Editor not available',
      launchedEditor: editorId
    };
  }

  const editor = getEditorById(editorId);
  if (!editor) {
    return {
      success: false,
      error: 'Unknown editor configuration',
      launchedEditor: editorId
    };
  }

  try {
    // Just test building the command, don't actually launch
    const { command, args } = buildLaunchCommand(editor, '/test/path');
    return {
      success: true,
      data: undefined,
      launchedEditor: editorId,
      command: `${command} ${args.join(' ')}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error testing launch',
      launchedEditor: editorId
    };
  }
}