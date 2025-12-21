/**
 * Code editor configuration types for worktree review
 */

import type { IPCResult } from './common';

// Supported code editor types
export type CodeEditorType =
  | 'vscode'
  | 'vscode-insiders'
  | 'sublime'
  | 'xcode'
  | 'intellij'
  | 'webstorm'
  | 'phpstorm'
  | 'pycharm'
  | 'atom'
  | 'vim'
  | 'neovim'
  | 'emacs'
  | 'brackets'
  | 'notepad++'
  | 'visual-studio'
  | 'jetbrains';

// Project types for smart editor detection
export type ProjectType =
  | 'ios'
  | 'android'
  | 'web'
  | 'node'
  | 'python'
  | 'java'
  | 'kotlin'
  | 'php'
  | 'csharp'
  | 'cpp'
  | 'rust'
  | 'go'
  | 'ruby'
  | 'generic';

// Platform types for cross-platform support
export type Platform = 'darwin' | 'win32' | 'linux';

// Editor interface with platform-specific commands
export interface CodeEditor {
  id: CodeEditorType;
  name: string;
  displayName: string;
  description: string;
  icon?: string; // Lucide icon name
  // Platform-specific executable names or paths
  commands: {
    darwin?: string;
    win32?: string;
    linux?: string;
  };
  // Command arguments for opening a directory
  args?: {
    darwin?: string[];
    win32?: string[];
    linux?: string[];
  };
  // Project types this editor is best suited for
  recommendedFor?: ProjectType[];
  // Whether this editor is available on the current platform
  isAvailable?: boolean;
}

// Editor configuration settings
export interface EditorSettings {
  // User's default code editor
  defaultCodeEditor?: CodeEditorType;
  // Whether to enable smart project type detection
  enableSmartDetection: boolean;
  // Per-project-type editor overrides
  projectTypeOverrides?: Partial<Record<ProjectType, CodeEditorType>>;
  // Last used editor per project (for quick access)
  recentEditors?: Array<{
    projectPath: string;
    editor: CodeEditorType;
    lastUsed: Date;
  }>;
}

// Project detection result
export interface ProjectDetectionResult {
  detectedType: ProjectType;
  confidence: number; // 0-1
  // File patterns that led to this detection
  indicators: string[];
  // Recommended editors for this project type
  recommendedEditors: CodeEditorType[];
}

// Editor launch request
export interface EditorLaunchRequest {
  // Path to the directory or file to open
  path: string;
  // Editor to use (overrides default)
  editor?: CodeEditorType;
  // Whether to detect project type and suggest editor
  detectProject?: boolean;
  // Additional command line arguments
  extraArgs?: string[];
}

// Editor launch result
export interface EditorLaunchResult extends IPCResult<void> {
  // The editor that was actually launched
  launchedEditor?: CodeEditorType;
  // Command that was executed (for debugging)
  command?: string;
}

// Editor availability check result
export interface EditorAvailabilityResult {
  editor: CodeEditorType;
  isAvailable: boolean;
  platform: Platform;
  detectedPath?: string;
  error?: string;
}

// Smart detection configuration
export interface SmartDetectionConfig {
  // Enable/disable automatic detection
  enabled: boolean;
  // Minimum confidence threshold to auto-select
  confidenceThreshold: number;
  // File patterns for project type detection
  patterns: Record<ProjectType, string[]>;
}

// Editor menu item for UI dropdown
export interface EditorMenuItem {
  id: CodeEditorType;
  name: string;
  displayName: string;
  icon?: string;
  isRecommended?: boolean;
  isAvailable?: boolean;
  // Group for menu organization (e.g., "Recommended", "IDE", "Editor")
  group?: string;
}

// Editor detection patterns
export const PROJECT_DETECTION_PATTERNS: Record<ProjectType, string[]> = {
  ios: ['*.xcodeproj', '*.xcworkspace', 'Info.plist', 'Podfile'],
  android: ['AndroidManifest.xml', 'build.gradle', 'gradlew', '*.kt', '*.java'],
  web: ['package.json', 'index.html', '*.html', '*.css', '*.js', '*.jsx', '*.ts', '*.tsx'],
  node: ['package.json', 'node_modules', '*.js', '*.ts', '*.jsx', '*.tsx'],
  python: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile', '*.py'],
  java: ['pom.xml', 'build.gradle', '*.java', 'src/main/java'],
  kotlin: ['build.gradle', 'build.gradle.kts', '*.kt', 'src/main/kotlin'],
  php: ['composer.json', '*.php'],
  csharp: ['*.csproj', '*.sln', '*.cs'],
  cpp: ['Makefile', 'CMakeLists.txt', '*.cpp', '*.c', '*.h'],
  rust: ['Cargo.toml', '*.rs'],
  go: ['go.mod', '*.go'],
  ruby: ['Gemfile', '*.rb'],
  generic: []
};

// Default editor configurations
export const DEFAULT_EDITORS: CodeEditor[] = [
  {
    id: 'vscode',
    name: 'vscode',
    displayName: 'Visual Studio Code',
    description: 'Popular lightweight code editor',
    icon: 'code',
    commands: {
      darwin: '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      win32: 'code',
      linux: 'code'
    },
    args: {
      darwin: ['--'],
      win32: ['--'],
      linux: ['--']
    },
    recommendedFor: ['web', 'node', 'python', 'generic']
  },
  {
    id: 'vscode-insiders',
    name: 'vscode-insiders',
    displayName: 'Visual Studio Code - Insiders',
    description: 'Insiders build of VS Code',
    icon: 'code',
    commands: {
      darwin: '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders',
      win32: 'code-insiders',
      linux: 'code-insiders'
    },
    args: {
      darwin: ['--'],
      win32: ['--'],
      linux: ['--']
    },
    recommendedFor: ['web', 'node', 'python', 'generic']
  },
  {
    id: 'xcode',
    name: 'xcode',
    displayName: 'Xcode',
    description: 'Apple\'s IDE for iOS/macOS development',
    icon: 'terminal',
    commands: {
      darwin: '/usr/bin/xcodebuild'
    },
    args: {
      darwin: ['-open']
    },
    recommendedFor: ['ios']
  },
  {
    id: 'intellij',
    name: 'intellij',
    displayName: 'IntelliJ IDEA',
    description: 'JetBrains IDE for Java development',
    icon: 'coffee',
    commands: {
      darwin: '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea',
      win32: 'idea64',
      linux: 'idea'
    },
    recommendedFor: ['java', 'kotlin']
  },
  {
    id: 'webstorm',
    name: 'webstorm',
    displayName: 'WebStorm',
    description: 'JetBrains IDE for web development',
    icon: 'code',
    commands: {
      darwin: '/Applications/WebStorm.app/Contents/MacOS/webstorm',
      win32: 'webstorm64',
      linux: 'webstorm'
    },
    recommendedFor: ['web', 'node']
  },
  {
    id: 'phpstorm',
    name: 'phpstorm',
    displayName: 'PhpStorm',
    description: 'JetBrains IDE for PHP development',
    icon: 'code',
    commands: {
      darwin: '/Applications/PhpStorm.app/Contents/MacOS/phpstorm',
      win32: 'phpstorm64',
      linux: 'phpstorm'
    },
    recommendedFor: ['php']
  },
  {
    id: 'pycharm',
    name: 'pycharm',
    displayName: 'PyCharm',
    description: 'JetBrains IDE for Python development',
    icon: 'coffee',
    commands: {
      darwin: '/Applications/PyCharm.app/Contents/MacOS/pycharm',
      win32: 'pycharm64',
      linux: 'pycharm'
    },
    recommendedFor: ['python']
  },
  {
    id: 'sublime',
    name: 'sublime',
    displayName: 'Sublime Text',
    description: 'Fast and customizable text editor',
    icon: 'file-text',
    commands: {
      darwin: '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
      win32: 'sublime_text',
      linux: 'subl'
    },
    recommendedFor: ['web', 'generic']
  },
  {
    id: 'vim',
    name: 'vim',
    displayName: 'Vim',
    description: 'Terminal-based text editor',
    icon: 'terminal',
    commands: {
      darwin: 'vim',
      win32: 'vim',
      linux: 'vim'
    },
    recommendedFor: ['generic']
  },
  {
    id: 'neovim',
    name: 'neovim',
    displayName: 'Neovim',
    description: 'Modern fork of Vim',
    icon: 'terminal',
    commands: {
      darwin: 'nvim',
      win32: 'nvim',
      linux: 'nvim'
    },
    recommendedFor: ['generic']
  },
  {
    id: 'atom',
    name: 'atom',
    displayName: 'Atom',
    description: 'Hackable text editor',
    icon: 'code',
    commands: {
      darwin: '/Applications/Atom.app/Contents/Resources/app/atom.sh',
      win32: 'atom',
      linux: 'atom'
    },
    recommendedFor: ['web', 'generic']
  },
  {
    id: 'brackets',
    name: 'brackets',
    displayName: 'Brackets',
    description: 'Code editor for web designers',
    icon: 'code',
    commands: {
      darwin: '/Applications/Brackets.app/Contents/MacOS/Brackets',
      win32: 'Brackets',
      linux: 'brackets'
    },
    recommendedFor: ['web']
  },
  {
    id: 'notepad++',
    name: 'notepad-plus-plus',
    displayName: 'Notepad++',
    description: 'Free source code editor',
    icon: 'file-text',
    commands: {
      win32: 'notepad++'
    },
    recommendedFor: ['generic']
  },
  {
    id: 'visual-studio',
    name: 'visual-studio',
    displayName: 'Visual Studio',
    description: 'Microsoft IDE for .NET development',
    icon: 'code',
    commands: {
      win32: 'devenv'
    },
    recommendedFor: ['csharp']
  },
  {
    id: 'jetbrains',
    name: 'jetbrains',
    displayName: 'JetBrains IDEs',
    description: 'Collection of JetBrains IDEs',
    icon: 'coffee',
    commands: {
      darwin: '/Applications/JetBrains Rider.app/Contents/MacOS/rider',
      win32: 'rider64',
      linux: 'rider'
    },
    recommendedFor: ['csharp', 'java']
  },
  {
    id: 'emacs',
    name: 'emacs',
    displayName: 'Emacs',
    description: 'Extensible text editor',
    icon: 'file-text',
    commands: {
      darwin: 'emacs',
      win32: 'emacs',
      linux: 'emacs'
    },
    recommendedFor: ['generic']
  }
];