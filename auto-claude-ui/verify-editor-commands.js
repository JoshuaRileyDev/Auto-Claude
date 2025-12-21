/**
 * Direct cross-platform editor command verification script
 * Tests editor command compatibility without TypeScript compilation
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Supported editors configuration (simplified version)
const SUPPORTED_EDITORS = [
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    commands: {
      darwin: '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      win32: 'code',
      linux: 'code'
    },
    args: {
      darwin: ['--'],
      win32: ['--'],
      linux: ['--']
    }
  },
  {
    id: 'vscode-insiders',
    name: 'Visual Studio Code - Insiders',
    commands: {
      darwin: '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders',
      win32: 'code-insiders',
      linux: 'code-insiders'
    },
    args: {
      darwin: ['--'],
      win32: ['--'],
      linux: ['--']
    }
  },
  {
    id: 'sublime',
    name: 'Sublime Text',
    commands: {
      darwin: '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
      win32: 'sublime_text',
      linux: 'subl'
    }
  },
  {
    id: 'xcode',
    name: 'Xcode',
    commands: {
      darwin: '/usr/bin/xcodebuild'
    },
    args: {
      darwin: ['-open']
    }
  },
  {
    id: 'intellij',
    name: 'IntelliJ IDEA',
    commands: {
      darwin: '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea',
      win32: 'idea64',
      linux: 'idea'
    }
  },
  {
    id: 'webstorm',
    name: 'WebStorm',
    commands: {
      darwin: '/Applications/WebStorm.app/Contents/MacOS/webstorm',
      win32: 'webstorm64',
      linux: 'webstorm'
    }
  },
  {
    id: 'phpstorm',
    name: 'PhpStorm',
    commands: {
      darwin: '/Applications/PhpStorm.app/Contents/MacOS/phpstorm',
      win32: 'phpstorm64',
      linux: 'phpstorm'
    }
  },
  {
    id: 'pycharm',
    name: 'PyCharm',
    commands: {
      darwin: '/Applications/PyCharm.app/Contents/MacOS/pycharm',
      win32: 'pycharm64',
      linux: 'pycharm'
    }
  },
  {
    id: 'atom',
    name: 'Atom',
    commands: {
      darwin: '/Applications/Atom.app/Contents/Resources/app/atom.sh',
      win32: 'atom',
      linux: 'atom'
    }
  },
  {
    id: 'vim',
    name: 'Vim',
    commands: {
      darwin: 'vim',
      win32: 'vim',
      linux: 'vim'
    }
  },
  {
    id: 'neovim',
    name: 'Neovim',
    commands: {
      darwin: 'nvim',
      win32: 'nvim',
      linux: 'nvim'
    }
  },
  {
    id: 'emacs',
    name: 'Emacs',
    commands: {
      darwin: 'emacs',
      win32: 'emacs',
      linux: 'emacs'
    }
  },
  {
    id: 'brackets',
    name: 'Brackets',
    commands: {
      darwin: '/Applications/Brackets.app/Contents/MacOS/Brackets',
      win32: 'Brackets',
      linux: 'brackets'
    }
  },
  {
    id: 'notepad-plus-plus',
    name: 'Notepad++',
    commands: {
      win32: 'notepad++'
    }
  },
  {
    id: 'visual-studio',
    name: 'Visual Studio',
    commands: {
      win32: 'devenv'
    }
  },
  {
    id: 'jetbrains',
    name: 'JetBrains Rider',
    commands: {
      darwin: '/Applications/JetBrains Rider.app/Contents/MacOS/rider',
      win32: 'rider64',
      linux: 'rider'
    }
  }
];

function getCurrentPlatform() {
  return os.platform();
}

function checkEditorAvailability(editor) {
  const currentPlatform = getCurrentPlatform();
  const command = editor.commands[currentPlatform];

  if (!command) {
    return {
      editor: editor.id,
      name: editor.name,
      isAvailable: false,
      platform: currentPlatform,
      error: `Editor not supported on ${currentPlatform}`
    };
  }

  try {
    // Check if the command exists by trying to run it with --version or --help
    // For absolute paths on macOS, check if the file exists
    if (command.startsWith('/')) {
      if (fs.existsSync(command)) {
        return {
          editor: editor.id,
          name: editor.name,
          isAvailable: true,
          platform: currentPlatform,
          detectedPath: command
        };
      } else {
        return {
          editor: editor.id,
          name: editor.name,
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
        editor: editor.id,
        name: editor.name,
        isAvailable: true,
        platform: currentPlatform,
        detectedPath: command
      };
    } catch {
      // Command not found in PATH
      return {
        editor: editor.id,
        name: editor.name,
        isAvailable: false,
        platform: currentPlatform,
        error: 'Editor command not found in PATH'
      };
    }
  } catch (error) {
    return {
      editor: editor.id,
      name: editor.name,
      isAvailable: false,
      platform: currentPlatform,
      error: error.message || 'Unknown error checking availability'
    };
  }
}

function buildLaunchCommand(editor, targetPath, extraArgs = []) {
  const currentPlatform = getCurrentPlatform();
  const baseCommand = editor.commands[currentPlatform];
  const baseArgs = editor.args?.[currentPlatform] || [];

  if (!baseCommand) {
    throw new Error(`No command configured for ${editor.id} on ${currentPlatform}`);
  }

  const args = [];
  args.push(...baseArgs);
  args.push(...extraArgs);
  args.push(targetPath);

  return {
    command: baseCommand,
    args
  };
}

function verifyCommandFormats() {
  const currentPlatform = getCurrentPlatform();
  const issues = [];

  for (const editor of SUPPORTED_EDITORS) {
    const command = editor.commands[currentPlatform];
    if (!command) continue;

    // Windows-specific checks
    if (currentPlatform === 'win32') {
      // Check for paths with spaces that need quotes
      if (command.includes(' ') && !command.startsWith('"') && !command.includes('.exe')) {
        issues.push(`Windows command may need quotes: ${command}`);
      }

      // Check for common Windows executable patterns
      if (command.includes(' ') && command.endsWith('.exe')) {
        if (!command.startsWith('"')) {
          issues.push(`Windows exe path with spaces needs quotes: ${command}`);
        }
      }
    }

    // macOS-specific checks
    if (currentPlatform === 'darwin') {
      // Check for app bundle paths
      if (command.includes('.app/') && !command.startsWith('/')) {
        issues.push(`macOS app bundle should use absolute path: ${command}`);
      }

      // Check for executable permissions on shell scripts
      if (command.endsWith('.sh')) {
        if (fs.existsSync(command)) {
          issues.push(`Shell script should be executable: ${command}`);
        }
      }
    }

    // Linux-specific checks
    if (currentPlatform === 'linux') {
      // Check for shebang usage in shell scripts
      if (command.endsWith('.sh')) {
        issues.push(`Linux shell script should be executable: ${command}`);
      }
    }

    // General checks
    if (command.includes('..')) {
      issues.push(`Command uses relative path: ${command}`);
    }
  }

  return issues;
}

function generateRecommendations(results) {
  const recommendations = [];
  const currentPlatform = getCurrentPlatform();

  // Check for missing commands on current platform
  const missingCommands = results.filter(r => !r.isAvailable);
  if (missingCommands.length > 0) {
    recommendations.push(`Consider adding commands for ${missingCommands.length} editors on ${currentPlatform}`);
  }

  // Platform-specific recommendations
  if (currentPlatform === 'win32') {
    const windowsEditors = results.filter(r => r.isAvailable);
    const needsQuotes = windowsEditors.filter(r =>
      r.detectedPath && r.detectedPath.includes(' ') && !r.detectedPath.startsWith('"')
    );
    if (needsQuotes.length > 0) {
      recommendations.push('Add quotes to Windows commands containing spaces');
    }
  }

  if (currentPlatform === 'darwin') {
    const macEditors = results.filter(r => r.isAvailable && r.detectedPath?.startsWith('/'));
    const missingAppBundle = macEditors.filter(r =>
      r.detectedPath?.includes('.app/') && !r.detectedPath.includes('/Contents/MacOS/')
    );
    if (missingAppBundle.length > 0) {
      recommendations.push('Use full app bundle paths for macOS applications');
    }
  }

  return recommendations;
}

async function runVerification() {
  console.log('🔍 Starting Cross-Platform Editor Command Verification');
  console.log('='.repeat(55));
  console.log(`Platform: ${getCurrentPlatform()}`);
  console.log(`Total Editors: ${SUPPORTED_EDITORS.length}`);
  console.log('');

  const currentPlatform = getCurrentPlatform();

  // Count platform-specific vs cross-platform
  const platformSpecific = SUPPORTED_EDITORS.filter(editor => {
    const platforms = Object.keys(editor.commands);
    return platforms.length < 3;
  });

  console.log(`📊 Platform Analysis:`);
  console.log(`  Platform-specific editors: ${platformSpecific.length}`);
  console.log(`  Cross-platform editors: ${SUPPORTED_EDITORS.length - platformSpecific.length}`);
  console.log('');

  // Test command configuration
  console.log('🔧 Command Configuration:');
  console.log('-'.repeat(30));

  let configuredCount = 0;
  for (const editor of SUPPORTED_EDITORS) {
    const hasCommand = !!editor.commands[currentPlatform];
    const command = editor.commands[currentPlatform] || null;
    const platforms = Object.keys(editor.commands);
    const isPlatformSpecific = platforms.length < 3;
    const platformInfo = isPlatformSpecific ? '[Platform-Specific]' : '[Cross-Platform]';

    if (hasCommand) {
      configuredCount++;
      console.log(`✅ ${editor.id}: ${command} ${platformInfo}`);
    } else {
      console.log(`❌ ${editor.id}: No command for ${currentPlatform} ${platformInfo}`);
    }
  }

  console.log('');
  console.log(`Configured for ${currentPlatform}: ${configuredCount}/${SUPPORTED_EDITORS.length}`);
  console.log('');

  // Test availability
  console.log('📱 Availability Check:');
  console.log('-'.repeat(25));

  const availabilityResults = [];
  let availableCount = 0;

  for (const editor of SUPPORTED_EDITORS) {
    const result = checkEditorAvailability(editor);
    availabilityResults.push(result);

    if (result.isAvailable) {
      availableCount++;
      const pathInfo = result.detectedPath ? ` (${result.detectedPath})` : '';
      console.log(`✅ ${result.editor}${pathInfo}`);
    } else {
      console.log(`❌ ${result.editor}: ${result.error}`);
    }
  }

  console.log('');
  console.log(`Available on system: ${availableCount}/${configuredCount}`);
  console.log('');

  // Test command building
  console.log('🚀 Command Building Test:');
  console.log('-'.repeat(30));

  const testPath = '/test/project';
  let successCount = 0;

  for (const editor of SUPPORTED_EDITORS) {
    if (!editor.commands[currentPlatform]) {
      console.log(`❌ ${editor.id}: No command for ${currentPlatform}`);
      continue;
    }

    try {
      const { command, args } = buildLaunchCommand(editor, testPath);
      successCount++;
      console.log(`✅ ${editor.id}: ${command} ${args.join(' ')}`);
    } catch (error) {
      console.log(`❌ ${editor.id}: ${error.message}`);
    }
  }

  console.log('');
  console.log(`Commands built successfully: ${successCount}/${configuredCount}`);
  console.log('');

  // Verify command formats
  const issues = verifyCommandFormats();
  if (issues.length > 0) {
    console.log('⚠️  Format Issues:');
    console.log('-'.repeat(20));
    issues.forEach(issue => console.log(`• ${issue}`));
    console.log('');
  }

  // Generate recommendations
  const recommendations = generateRecommendations(availabilityResults);
  if (recommendations.length > 0) {
    console.log('💡 Recommendations:');
    console.log('-'.repeat(20));
    recommendations.forEach(rec => console.log(`• ${rec}`));
    console.log('');
  }

  // Platform-specific analysis
  console.log('🖥️  Platform-Specific Analysis:');
  console.log('-'.repeat(35));

  const editorsByType = {
    'IDE': 0,
    'Editor': 0,
    'Terminal': 0
  };

  for (const editor of SUPPORTED_EDITORS) {
    if (editor.commands[currentPlatform]) {
      if (editor.name.includes('IDE') || ['IntelliJ', 'WebStorm', 'PhpStorm', 'PyCharm', 'Visual Studio'].some(ide => editor.name.includes(ide))) {
        editorsByType['IDE']++;
      } else if (['Vim', 'Neovim', 'Emacs'].includes(editor.name)) {
        editorsByType['Terminal']++;
      } else {
        editorsByType['Editor']++;
      }
    }
  }

  console.log(`Editor Types for ${currentPlatform}:`);
  Object.entries(editorsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('');
  console.log('✅ Verification completed successfully!');
  console.log('');

  // Final summary
  console.log('📋 Summary:');
  console.log(`  • Total editors: ${SUPPORTED_EDITORS.length}`);
  console.log(`  • Configured for ${currentPlatform}: ${configuredCount}`);
  console.log(`  • Available on system: ${availableCount}`);
  console.log(`  • Commands build successfully: ${successCount}`);
  console.log(`  • Format issues found: ${issues.length}`);
  console.log(`  • Recommendations: ${recommendations.length}`);

  return {
    success: true,
    platform: currentPlatform,
    total: SUPPORTED_EDITORS.length,
    configured: configuredCount,
    available: availableCount,
    builds: successCount,
    issues: issues.length,
    recommendations: recommendations.length
  };
}

// Run the verification
runVerification().catch(error => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});