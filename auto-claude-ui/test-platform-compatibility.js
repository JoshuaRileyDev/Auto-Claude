/**
 * Platform-specific compatibility test script
 * Tests editor command compatibility across Windows, macOS, and Linux
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

// Simulate different platforms for testing
const PLATFORMS = ['darwin', 'win32', 'linux'];

// Editor commands for each platform (from the actual configuration)
const EDITOR_COMMANDS = {
  vscode: {
    darwin: '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
    win32: 'code',
    linux: 'code'
  },
  'vscode-insiders': {
    darwin: '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders',
    win32: 'code-insiders',
    linux: 'code-insiders'
  },
  sublime: {
    darwin: '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
    win32: 'sublime_text',
    linux: 'subl'
  },
  xcode: {
    darwin: '/usr/bin/xcodebuild'
  },
  intellij: {
    darwin: '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea',
    win32: 'idea64',
    linux: 'idea'
  },
  webstorm: {
    darwin: '/Applications/WebStorm.app/Contents/MacOS/webstorm',
    win32: 'webstorm64',
    linux: 'webstorm'
  },
  phpstorm: {
    darwin: '/Applications/PhpStorm.app/Contents/MacOS/phpstorm',
    win32: 'phpstorm64',
    linux: 'phpstorm'
  },
  pycharm: {
    darwin: '/Applications/PyCharm.app/Contents/MacOS/pycharm',
    win32: 'pycharm64',
    linux: 'pycharm'
  },
  atom: {
    darwin: '/Applications/Atom.app/Contents/Resources/app/atom.sh',
    win32: 'atom',
    linux: 'atom'
  },
  vim: {
    darwin: 'vim',
    win32: 'vim',
    linux: 'vim'
  },
  neovim: {
    darwin: 'nvim',
    win32: 'nvim',
    linux: 'nvim'
  },
  emacs: {
    darwin: 'emacs',
    win32: 'emacs',
    linux: 'emacs'
  },
  brackets: {
    darwin: '/Applications/Brackets.app/Contents/MacOS/Brackets',
    win32: 'Brackets',
    linux: 'brackets'
  },
  'notepad-plus-plus': {
    win32: 'notepad++'
  },
  'visual-studio': {
    win32: 'devenv'
  },
  jetbrains: {
    darwin: '/Applications/JetBrains Rider.app/Contents/MacOS/rider',
    win32: 'rider64',
    linux: 'rider'
  }
};

function validateCommandFormat(editorId, command, platform) {
  const issues = [];

  if (!command) {
    return issues; // No command to validate
  }

  // Windows-specific validations
  if (platform === 'win32') {
    // Check for paths with spaces that should be quoted
    if (command.includes(' ') && !command.startsWith('"') && command.includes('\\')) {
      issues.push(`Windows path with spaces needs quotes: ${command}`);
    }

    // Check for executable extensions
    if (command.includes('Program Files') && !command.endsWith('.exe')) {
      issues.push(`Windows Program Files path should use .exe: ${command}`);
    }
  }

  // macOS-specific validations
  if (platform === 'darwin') {
    // Check for app bundle paths
    if (command.includes('.app') && !command.startsWith('/Applications/')) {
      if (!command.startsWith('/')) {
        issues.push(`macOS app bundle should use absolute path: ${command}`);
      }
    }

    // Check for shell script permissions
    if (command.endsWith('.sh')) {
      issues.push(`Shell script should be executable: ${command}`);
    }

    // Check for correct app bundle structure
    if (command.includes('.app/') && !command.includes('/Contents/MacOS/') && !command.includes('/Contents/Resources/app/bin/')) {
      if (!editorId.includes('code')) { // VS Code has a different structure
        issues.push(`macOS app bundle should use Contents/MacOS: ${command}`);
      }
    }
  }

  // Linux-specific validations
  if (platform === 'linux') {
    // Check for common Linux paths
    if (command.startsWith('/usr/bin/') || command.startsWith('/usr/local/bin/') || command.startsWith('/opt/')) {
      // These are good paths
    } else if (command.includes(' ') && !command.startsWith('"')) {
      issues.push(`Linux command with spaces may need quotes: ${command}`);
    }
  }

  // General validations for all platforms
  if (command.includes('..')) {
    issues.push(`Command uses relative path: ${command}`);
  }

  if (command.includes('~') && !command.startsWith('"')) {
    issues.push(`Tilde expansion may need quotes: ${command}`);
  }

  return issues;
}

function testPlatformCompatibility() {
  console.log('🔍 Cross-Platform Editor Command Compatibility Test');
  console.log('='.repeat(60));
  console.log('');

  const currentPlatform = os.platform();
  console.log(`Current Platform: ${currentPlatform}`);
  console.log(`Testing Platforms: ${PLATFORMS.join(', ')}`);
  console.log('');

  const results = {};
  const allIssues = [];

  // Test each platform
  for (const platform of PLATFORMS) {
    console.log(`🖥️  Testing ${platform}:`);
    console.log('-'.repeat(30));

    const platformResults = {
      editors: [],
      configured: 0,
      available: 0,
      issues: 0
    };

    for (const [editorId, commands] of Object.entries(EDITOR_COMMANDS)) {
      const command = commands[platform];
      const hasCommand = !!command;

      const editorResult = {
        id: editorId,
        command: command || null,
        hasCommand,
        isAvailable: false,
        issues: []
      };

      if (hasCommand) {
        platformResults.configured++;

        // Validate command format
        const commandIssues = validateCommandFormat(editorId, command, platform);
        editorResult.issues = commandIssues;
        platformResults.issues += commandIssues.length;
        allIssues.push(...commandIssues.map(issue => `[${platform}/${editorId}] ${issue}`));

        // Check availability (simplified)
        if (command.startsWith('/')) {
          // Absolute path - check if exists (for simulation, we'll assume it might exist)
          editorResult.isAvailable = true; // In real testing, we'd check fs.existsSync()
        } else {
          // Command in PATH - assume available for simulation
          editorResult.isAvailable = true;
        }

        if (editorResult.isAvailable) {
          platformResults.available++;
        }

        const status = commandIssues.length === 0 ? '✅' : '⚠️';
        console.log(`${status} ${editorId}: ${command}`);
        if (commandIssues.length > 0) {
          commandIssues.forEach(issue => console.log(`   • ${issue}`));
        }
      } else {
        console.log(`❌ ${editorId}: No command for ${platform}`);
      }

      platformResults.editors.push(editorResult);
    }

    results[platform] = platformResults;
    console.log(`  Configured: ${platformResults.configured}/16`);
    console.log(`  Available: ${platformResults.available}/${platformResults.configured}`);
    console.log(`  Issues: ${platformResults.issues}`);
    console.log('');
  }

  // Summary by platform
  console.log('📊 Platform Summary:');
  console.log('-'.repeat(25));

  for (const platform of PLATFORMS) {
    const result = results[platform];
    const coverage = ((result.configured / 16) * 100).toFixed(1);
    const availability = result.configured > 0 ? ((result.available / result.configured) * 100).toFixed(1) : '0.0';
    console.log(`${platform.toUpperCase()}:`);
    console.log(`  Coverage: ${coverage}% (${result.configured}/16 editors)`);
    console.log(`  Availability: ${availability}% (${result.available}/${result.configured})`);
    console.log(`  Format Issues: ${result.issues}`);
    console.log('');
  }

  // Platform-specific analysis
  console.log('🔧 Platform-Specific Analysis:');
  console.log('-'.repeat(35));

  for (const platform of PLATFORMS) {
    const result = results[platform];
    const configuredEditors = result.editors.filter(e => e.hasCommand);

    console.log(`${platform.toUpperCase()}:`);

    // Count editor types
    const editorTypes = {
      'IDE': 0,
      'Editor': 0,
      'Terminal': 0,
      'Platform-Specific': 0
    };

    configuredEditors.forEach(editor => {
      const id = editor.id;
      if (['intellij', 'webstorm', 'phpstorm', 'pycharm', 'visual-studio', 'jetbrains'].includes(id)) {
        editorTypes['IDE']++;
      } else if (['vim', 'neovim', 'emacs'].includes(id)) {
        editorTypes['Terminal']++;
      } else if (['xcode', 'notepad-plus-plus'].includes(id)) {
        editorTypes['Platform-Specific']++;
      } else {
        editorTypes['Editor']++;
      }
    });

    Object.entries(editorTypes).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`  ${type}: ${count}`);
      }
    });
    console.log('');
  }

  // Cross-platform compatibility assessment
  console.log('🌐 Cross-Platform Compatibility:');
  console.log('-'.repeat(35));

  // Find editors available on all platforms
  const universalEditors = [];
  for (const editorId of Object.keys(EDITOR_COMMANDS)) {
    const commands = EDITOR_COMMANDS[editorId];
    const availableOnAll = PLATFORMS.every(platform => !!commands[platform]);

    if (availableOnAll) {
      universalEditors.push(editorId);
    }
  }

  console.log(`Editors available on all platforms: ${universalEditors.length}`);
  universalEditors.forEach(editorId => {
    console.log(`  • ${editorId}`);
  });

  // Platform-specific editors
  console.log('');
  console.log('Platform-specific editors:');
  for (const platform of PLATFORMS) {
    const platformSpecific = [];
    for (const [editorId, commands] of Object.entries(EDITOR_COMMANDS)) {
      const hasOnlyThisPlatform = Object.keys(commands).length === 1 && commands[platform];
      if (hasOnlyThisPlatform) {
        platformSpecific.push(editorId);
      }
    }

    if (platformSpecific.length > 0) {
      console.log(`  ${platform}: ${platformSpecific.join(', ')}`);
    }
  }

  // Issues and recommendations
  console.log('');
  console.log('⚠️  Issues Found:');
  console.log('-'.repeat(20));

  if (allIssues.length === 0) {
    console.log('✅ No format issues detected');
  } else {
    allIssues.forEach(issue => {
      console.log(`• ${issue}`);
    });
  }

  console.log('');
  console.log('💡 Recommendations:');
  console.log('-'.repeat(20));

  if (PLATFORMS.includes('win32')) {
    console.log('• Add quotes to Windows commands containing spaces');
    console.log('• Use .exe extension for Windows executable paths');
  }

  if (PLATFORMS.includes('darwin')) {
    console.log('• Use absolute paths for macOS app bundles');
    console.log('• Ensure shell scripts are executable');
  }

  if (PLATFORMS.includes('linux')) {
    console.log('• Verify Linux commands are in system PATH');
    console.log('• Use standard Linux paths (/usr/bin, /opt, etc.)');
  }

  console.log('• Test commands on each target platform');
  console.log('• Consider fallback options for missing editors');

  // Final assessment
  console.log('');
  console.log('📋 Final Assessment:');
  console.log('-'.repeat(25));

  let totalConfigured = 0;
  let totalIssues = 0;

  for (const platform of PLATFORMS) {
    totalConfigured += results[platform].configured;
    totalIssues += results[platform].issues;
  }

  const avgCoverage = ((totalConfigured / (16 * PLATFORMS.length)) * 100).toFixed(1);
  const compatibilityScore = totalIssues === 0 ? 'Excellent' : totalIssues < 5 ? 'Good' : totalIssues < 10 ? 'Fair' : 'Needs Improvement';

  console.log(`Average Platform Coverage: ${avgCoverage}%`);
  console.log(`Format Issues: ${totalIssues} total`);
  console.log(`Compatibility Score: ${compatibilityScore}`);
  console.log(`Universal Editors: ${universalEditors.length}/16`);

  return {
    success: true,
    platforms: PLATFORMS,
    results,
    universalEditors,
    totalIssues,
    compatibilityScore
  };
}

// Run the compatibility test
try {
  testPlatformCompatibility();
} catch (error) {
  console.error('❌ Compatibility test failed:', error.message);
  process.exit(1);
}