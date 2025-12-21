/**
 * Enhanced editor detection with real-world installation paths
 * Tests improved detection logic for Homebrew, MacPorts, and other common installations
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');
const os = require('os');

// Enhanced editor configurations with additional paths
const ENHANCED_EDITORS = {
  vscode: {
    name: 'Visual Studio Code',
    commands: {
      darwin: [
        '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
        '/Applications/VS Code.app/Contents/Resources/app/bin/code',
        '/usr/local/bin/code',  // Homebrew Intel
        '/opt/homebrew/bin/code',  // Homebrew ARM
        'code'  // PATH fallback
      ],
      win32: [
        'code',
        'C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd',
        'C:\\Program Files (x86)\\Microsoft VS Code\\bin\\code.cmd'
      ],
      linux: [
        'code',
        '/usr/bin/code',
        '/usr/local/bin/code',
        '/snap/bin/code'
      ]
    },
    args: {
      darwin: ['--'],
      win32: ['--'],
      linux: ['--']
    }
  },

  cursor: {
    name: 'Cursor',
    commands: {
      darwin: [
        '/Applications/Cursor.app/Contents/Resources/app/bin/code',  // Cursor uses 'code' command
        '/usr/local/bin/cursor',
        '/opt/homebrew/bin/cursor',
        'cursor'
      ]
    },
    args: {
      darwin: ['--']
    }
  },

  sublime: {
    name: 'Sublime Text',
    commands: {
      darwin: [
        '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
        '/Applications/Sublime Text Dev.app/Contents/SharedSupport/bin/subl',
        '/usr/local/bin/subl',
        '/opt/homebrew/bin/subl',
        'subl'
      ],
      win32: [
        'sublime_text',
        'C:\\Program Files\\Sublime Text 3\\sublime_text.exe',
        'C:\\Program Files\\Sublime Text 4\\sublime_text.exe'
      ],
      linux: [
        'subl',
        '/usr/bin/subl',
        '/usr/local/bin/subl'
      ]
    }
  },

  vim: {
    name: 'Vim',
    commands: {
      darwin: ['vim', '/usr/bin/vim', '/opt/homebrew/bin/vim'],
      win32: ['vim', 'C:\\Program Files\\Vim\\vim90\\vim.exe'],
      linux: ['vim', '/usr/bin/vim', '/usr/local/bin/vim']
    }
  },

  neovim: {
    name: 'Neovim',
    commands: {
      darwin: ['nvim', '/usr/local/bin/nvim', '/opt/homebrew/bin/nvim'],
      win32: ['nvim'],
      linux: ['nvim', '/usr/bin/nvim', '/usr/local/bin/nvim']
    }
  },

  xcode: {
    name: 'Xcode',
    commands: {
      darwin: [
        '/usr/bin/xcodebuild',
        '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild',
        '/usr/bin/open'  // Use 'open' command for .xcodeproj files
      ]
    },
    args: {
      darwin: ['-open']
    }
  },

  intellij: {
    name: 'IntelliJ IDEA',
    commands: {
      darwin: [
        '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea',
        '/Applications/IntelliJ IDEA CE.app/Contents/MacOS/idea',
        'idea'
      ],
      win32: [
        'idea64',
        'idea',
        'C:\\Program Files\\JetBrains\\IntelliJ IDEA 2023.2\\bin\\idea64.exe'
      ],
      linux: [
        'idea',
        '/usr/bin/idea',
        '/opt/idea/bin/idea.sh'
      ]
    }
  },

  webstorm: {
    name: 'WebStorm',
    commands: {
      darwin: [
        '/Applications/WebStorm.app/Contents/MacOS/webstorm',
        'webstorm'
      ],
      win32: [
        'webstorm64',
        'webstorm'
      ],
      linux: [
        'webstorm',
        '/usr/bin/webstorm'
      ]
    }
  },

  atom: {
    name: 'Atom',
    commands: {
      darwin: [
        '/Applications/Atom.app/Contents/Resources/app/atom',
        '/usr/local/bin/atom',
        'atom'
      ],
      win32: [
        'atom',
        'C:\\Users\\%USERNAME%\\AppData\\Local\\atom\\bin\\atom.cmd'
      ],
      linux: [
        'atom',
        '/usr/bin/atom'
      ]
    }
  }
};

// Test results
const testResults = {
  platform: os.platform(),
  timestamp: new Date().toISOString(),
  tests: [],
  detectedEditors: []
};

function addTest(name, passed, details = '') {
  testResults.tests.push({
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Enhanced editor availability checking
function checkEditorAvailability(editorId, editorConfig) {
  const platform = os.platform();
  const commands = editorConfig.commands[platform] || [];

  if (commands.length === 0) {
    addTest(`${editorConfig.name} platform support`, false, `No commands configured for ${platform}`);
    return null;
  }

  for (const command of commands) {
    try {
      if (command.startsWith('/')) {
        // Absolute path - check if file exists
        if (existsSync(command)) {
          addTest(`${editorConfig.name} availability`, true, `Found at: ${command}`);
          return { available: true, command, path: command };
        }
      } else if (command.startsWith('C:\\')) {
        // Windows absolute path
        if (existsSync(command)) {
          addTest(`${editorConfig.name} availability`, true, `Found at: ${command}`);
          return { available: true, command, path: command };
        }
      } else {
        // Command name - check if exists in PATH
        execSync(`which ${command}`, { stdio: 'ignore' });
        const fullPath = execSync(`which ${command}`, { encoding: 'utf8' }).trim();
        addTest(`${editorConfig.name} availability`, true, `Found in PATH: ${command} (${fullPath})`);
        return { available: true, command, path: fullPath };
      }
    } catch (error) {
      // Try next command
      continue;
    }
  }

  addTest(`${editorConfig.name} availability`, false, `None of the commands were found`);
  return { available: false, command: null, path: null };
}

// Test additional installation methods
function testInstallationMethods() {
  const platform = os.platform();

  if (platform === 'darwin') {
    // Test MacPorts
    try {
      const macportsPath = '/opt/local/bin';
      if (existsSync(macportsPath)) {
        addTest('MacPorts detection', true, `MacPorts found at ${macportsPath}`);

        // Check for Macports-installed editors
        const macportsEditors = ['vim', 'emacs', 'nano'];
        for (const editor of macportsEditors) {
          const editorPath = path.join(macportsPath, editor);
          if (existsSync(editorPath)) {
            addTest(`MacPorts editor: ${editor}`, true, `Found at ${editorPath}`);
          }
        }
      } else {
        addTest('MacPorts detection', false, 'MacPorts not installed');
      }
    } catch (error) {
      addTest('MacPorts detection', false, `Error checking MacPorts: ${error.message}`);
    }

    // Test common installation directories
    const commonDirs = [
      '/Applications',
      '/Applications/Utilities',
      '/usr/local/bin',
      '/opt/homebrew/bin',
      '/opt/local/bin'  // MacPorts
    ];

    for (const dir of commonDirs) {
      if (existsSync(dir)) {
        addTest(`Common directory check: ${dir}`, true, 'Directory exists');

        // List some potential editor files
        try {
          const files = execSync(`ls -la "${dir}" | grep -i -E "(code|sublime|vim|atom|intellij|webstorm|xcode)" | head -5`, {
            encoding: 'utf8',
            stdio: 'pipe'
          }).trim();

          if (files) {
            addTest(`Editor files in ${dir}`, true, `Found potential editor files:\n${files}`);
          } else {
            addTest(`Editor files in ${dir}`, true, 'No obvious editor files found');
          }
        } catch (error) {
          addTest(`Editor files in ${dir}`, true, 'Could not list files (permission denied)');
        }
      } else {
        addTest(`Common directory check: ${dir}`, false, 'Directory does not exist');
      }
    }
  }
}

// Test environment variables and PATH
function testEnvironmentConfiguration() {
  const pathEnv = process.env.PATH || '';
  const pathDirs = pathEnv.split(path.delimiter);

  addTest('PATH environment variable', true, `PATH contains ${pathDirs.length} directories`);

  // Check for developer-related directories in PATH
  const devPaths = pathDirs.filter(dir =>
    dir.includes('bin') &&
    (dir.includes('local') || dir.includes('homebrew') || dir.includes('node'))
  );

  if (devPaths.length > 0) {
    addTest('Development directories in PATH', true, `Found ${devPaths.length} dev directories:\n${devPaths.join('\n')}`);
  } else {
    addTest('Development directories in PATH', false, 'No obvious development directories in PATH');
  }

  // Check Homebrew environment
  if (process.env.HOMEBREW_PREFIX) {
    addTest('Homebrew environment', true, `Homebrew prefix: ${process.env.HOMEBREW_PREFIX}`);
  } else {
    // Try to detect Homebrew
    const homebrewPaths = ['/opt/homebrew', '/usr/local'];
    const homebrewFound = homebrewPaths.some(p => existsSync(p));
    addTest('Homebrew detection', homebrewFound, homebrewFound ? 'Homebrew installation detected' : 'Homebrew not found in common locations');
  }
}

// Generate enhanced recommendations
function generateRecommendations() {
  const platform = os.platform();
  const availableEditors = testResults.detectedEditors.filter(e => e.available);

  console.log('\n' + '='.repeat(70));
  console.log('ENHANCED CROSS-PLATFORM EDITOR COMPATIBILITY RECOMMENDATIONS');
  console.log('='.repeat(70));

  console.log(`\nPlatform: ${platform}`);
  console.log(`Detected Editors: ${availableEditors.length}/${testResults.detectedEditors.length}`);

  if (availableEditors.length > 0) {
    console.log('\n✅ Available Editors:');
    availableEditors.forEach(editor => {
      console.log(`   • ${editor.name}: ${editor.command}`);
    });
  }

  console.log('\n🔧 Installation Recommendations:');

  if (platform === 'darwin') {
    console.log('\nmacOS:');
    console.log('   • VS Code: brew install --cask visual-studio-code');
    console.log('   • Sublime Text: brew install --cask sublime-text');
    console.log('   • IntelliJ IDEA: brew install --cask intellij-idea');
    console.log('   • Vim: brew install vim (or built-in vim)');
    console.log('   • Neovim: brew install neovim');
    console.log('   • Xcode: Install from App Store (includes xcodebuild)');

    console.log('\nAlternative Installation Methods:');
    console.log('   • Download directly from editor websites');
    console.log('   • Use MacPorts: sudo port install <editor>');
    console.log('   • Manual installation to /Applications/');
  } else if (platform === 'win32') {
    console.log('\nWindows:');
    console.log('   • VS Code: Download from code.visualstudio.com');
    console.log('   • Sublime Text: Download from sublimetext.com');
    console.log('   • IntelliJ IDEA: Download from jetbrains.com');
    console.log('   • Vim: Download from vim.org or use WSL');

    console.log('\nPackage Managers:');
    console.log('   • Chocolatey: choco install visualstudiocode');
    console.log('   • Scoop: scoop install vscode');
    console.log('   • Winget: winget install Microsoft.VisualStudioCode');
  } else if (platform === 'linux') {
    console.log('\nLinux:');
    console.log('   • VS Code: Download .deb/.rpm from code.visualstudio.com');
    console.log('   • Sublime Text: Add repository and install');
    console.log('   • Vim: sudo apt install vim (Ubuntu/Debian)');
    console.log('   • Neovim: sudo apt install neovim');
    console.log('   • IntelliJ IDEA: Download from jetbrains.com');

    console.log('\nPackage Managers:');
    console.log('   • Snap: sudo snap install code --classic');
    console.log('   • Flatpak: flatpak install flathub com.visualstudio.code');
    console.log('   • APT: Available in some repositories');
  }

  console.log('\n📝 Configuration Notes:');
  console.log('   • The editor-launcher.ts should try multiple command paths');
  console.log('   • Consider using "which <command>" for PATH detection');
  console.log('   • Fall back to common installation directories');
  console.log('   • Handle both absolute paths and command names');

  console.log('\n' + '='.repeat(70));
}

// Run enhanced detection
function runEnhancedDetection() {
  console.log('🔍 Starting Enhanced Editor Detection...\n');

  // Test each editor
  for (const [editorId, editorConfig] of Object.entries(ENHANCED_EDITORS)) {
    const result = checkEditorAvailability(editorId, editorConfig);
    testResults.detectedEditors.push({
      id: editorId,
      name: editorConfig.name,
      ...result
    });
  }

  testInstallationMethods();
  testEnvironmentConfiguration();

  // Summary
  const totalEditors = Object.keys(ENHANCED_EDITORS).length;
  const availableEditors = testResults.detectedEditors.filter(e => e.available).length;
  const passedTests = testResults.tests.filter(t => t.passed).length;
  const totalTests = testResults.tests.length;

  console.log('\n' + '='.repeat(60));
  console.log('ENHANCED DETECTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Editors Available: ${availableEditors}/${totalEditors}`);
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  generateRecommendations();

  return testResults;
}

// Execute if run directly
if (require.main === module) {
  const results = runEnhancedDetection();

  // Write detailed results
  const fs = require('fs');
  const resultsPath = path.join(__dirname, 'enhanced-editor-detection-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
}

module.exports = {
  runEnhancedDetection,
  ENHANCED_EDITORS,
  testResults
};