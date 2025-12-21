/**
 * Code editor constants and supported editors configuration
 */

import type { CodeEditor, CodeEditorType, ProjectType } from '../types/editor';

// ============================================
// Supported Editors Configuration
// ============================================

export const SUPPORTED_EDITORS: CodeEditor[] = [
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
  }
];

// ============================================
// Editor Detection Patterns
// ============================================

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

// ============================================
// Default Editor Settings
// ============================================

export const DEFAULT_EDITOR_SETTINGS = {
  // Default to VS Code as it's the most popular editor
  defaultCodeEditor: 'vscode' as CodeEditorType,
  // Enable smart project type detection by default
  enableSmartDetection: true,
  // Per-project-type editor overrides (user can configure these)
  projectTypeOverrides: {
    ios: 'xcode' as CodeEditorType,
    android: 'vscode' as CodeEditorType,
    java: 'intellij' as CodeEditorType,
    python: 'pycharm' as CodeEditorType,
    php: 'phpstorm' as CodeEditorType,
    csharp: 'visual-studio' as CodeEditorType,
    rust: 'vscode' as CodeEditorType,
    go: 'vscode' as CodeEditorType,
    ruby: 'vscode' as CodeEditorType
  }
};

// ============================================
// Editor Menu Groups
// ============================================

export const EDITOR_MENU_GROUPS = {
  RECOMMENDED: 'Recommended',
  IDE: 'IDE',
  EDITOR: 'Editor',
  TERMINAL: 'Terminal'
} as const;

// ============================================
// Platform-specific Settings
// ============================================

export const EDITOR_PLATFORM_PATHS = {
  darwin: {
    baseApplicationsPath: '/Applications',
    commonBinPaths: ['/usr/local/bin', '/opt/homebrew/bin']
  },
  win32: {
    programFiles: 'C:\\Program Files',
    programFilesX86: 'C:\\Program Files (x86)',
    appData: '%APPDATA%\\Code',
    localAppData: '%LOCALAPPDATA%\\Programs'
  },
  linux: {
    usrBin: '/usr/bin',
    usrLocalBin: '/usr/local/bin',
    opt: '/opt',
    homeBin: '~/.local/bin'
  }
} as const;

// ============================================
// Utility Functions
// ============================================

/**
 * Get editor by ID from supported editors list
 */
export function getEditorById(id: CodeEditorType): CodeEditor | undefined {
  return SUPPORTED_EDITORS.find(editor => editor.id === id);
}

/**
 * Get editors recommended for a specific project type
 */
export function getRecommendedEditors(projectType: ProjectType): CodeEditor[] {
  return SUPPORTED_EDITORS.filter(editor =>
    editor.recommendedFor?.includes(projectType)
  );
}

/**
 * Get all available editors for the current platform
 */
export function getAvailableEditors(platform: NodeJS.Platform): CodeEditor[] {
  return SUPPORTED_EDITORS.filter(editor =>
    editor.commands[platform as keyof typeof editor.commands]
  );
}