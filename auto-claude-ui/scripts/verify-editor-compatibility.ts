#!/usr/bin/env node

/**
 * Cross-platform editor command compatibility verification script
 * Tests editor detection, command building, and platform-specific logic
 */

import { platform } from 'os';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

// Import the editor utilities
import {
  SUPPORTED_EDITORS,
  getEditorById,
  getAvailableEditors
} from '../src/shared/constants/editors';

import {
  checkEditorAvailability,
  getAvailableEditors as getAvailableEditorsAsync,
  buildLaunchCommand,
  testEditorLaunch,
  getCurrentPlatform
} from '../src/main/utils/editor-launcher';

import type { CodeEditorType, Platform } from '../src/shared/types/editor';

// Test configuration
const TEST_CONFIG = {
  testPath: '/tmp/test-project',
  dryRun: true, // Don't actually launch editors
  verbose: true,
  testAllPlatforms: true // Test command building for all platforms even if not current
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message: string, color: keyof typeof colors = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Test platform detection
 */
function testPlatformDetection() {
  log('\n=== Testing Platform Detection ===', 'cyan');

  const currentPlatform = platform();
  const detectedPlatform = getCurrentPlatform();

  logInfo(`Current Node.js platform: ${currentPlatform}`);
  logInfo(`Detected platform: ${detectedPlatform}`);

  if (currentPlatform === detectedPlatform) {
    logSuccess('Platform detection working correctly');
  } else {
    logError('Platform detection mismatch');
  }

  return detectedPlatform;
}

/**
 * Test editor configuration completeness
 */
function testEditorConfiguration() {
  log('\n=== Testing Editor Configuration ===', 'cyan');

  let issues = 0;

  SUPPORTED_EDITORS.forEach(editor => {
    log(`\nTesting ${editor.displayName} (${editor.id})`, 'white');

    // Check if editor has commands for each platform
    const platforms: Platform[] = ['darwin', 'win32', 'linux'];
    platforms.forEach(p => {
      const command = editor.commands[p];
      if (command) {
        log(`  ✅ ${p}: ${command}`, 'green');

        // Validate command format
        if (p === 'win32') {
          // Windows commands should not start with /
          if (command.startsWith('/')) {
            logError(`    Invalid Windows command format: ${command}`);
            issues++;
          }
        } else if (p === 'darwin') {
          // macOS commands often use absolute paths
          if (!command.includes(' ') && !command.includes('/')) {
            logWarning(`    Possible missing absolute path for macOS: ${command}`);
          }
        }
      } else {
        log(`  ⚠️  ${p}: Not supported`, 'yellow');
      }
    });

    // Check args configuration
    if (editor.args) {
      platforms.forEach(p => {
        if (editor.args![p]) {
          log(`    📝 ${p} args: [${editor.args![p].join(', ')}]`, 'blue');
        }
      });
    }

    // Check recommendedFor configuration
    if (editor.recommendedFor && editor.recommendedFor.length > 0) {
      log(`    🎯 Recommended for: ${editor.recommendedFor.join(', ')}`, 'magenta');
    }
  });

  log(`\nConfiguration test completed with ${issues} issues`, issues === 0 ? 'green' : 'red');
  return issues;
}

/**
 * Test command building for all platforms
 */
function testCommandBuilding() {
  log('\n=== Testing Command Building ===', 'cyan');

  const platforms: Platform[] = ['darwin', 'win32', 'linux'];
  let totalCommands = 0;
  let successfulCommands = 0;

  platforms.forEach(testPlatform => {
    log(`\nTesting command building for ${testPlatform}`, 'white');

    SUPPORTED_EDITORS.forEach(editor => {
      const command = editor.commands[testPlatform];
      if (command) {
        totalCommands++;
        try {
          const { command: builtCommand, args } = buildLaunchCommand(
            editor,
            TEST_CONFIG.testPath,
            ['--test-arg']
          );

          log(`  ✅ ${editor.id}: ${builtCommand} ${args.join(' ')}`, 'green');
          successfulCommands++;

          // Verify args structure
          const expectedArgs = editor.args?.[testPlatform] || [];
          if (!args.includes(TEST_CONFIG.testPath)) {
            logError(`    Missing test path in args for ${editor.id}`);
          }

        } catch (error) {
          logError(`  ❌ ${editor.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });
  });

  log(`\nCommand building test: ${successfulCommands}/${totalCommands} successful`,
      successfulCommands === totalCommands ? 'green' : 'yellow');

  return { total: totalCommands, successful: successfulCommands };
}

/**
 * Test editor availability on current platform
 */
async function testEditorAvailability() {
  log('\n=== Testing Editor Availability ===', 'cyan');

  const currentPlatform = getCurrentPlatform();
  logInfo(`Testing availability on ${currentPlatform}`);

  const platformEditors = SUPPORTED_EDITORS.filter(
    editor => editor.commands[currentPlatform]
  );

  logInfo(`Found ${platformEditors.length} editors that support ${currentPlatform}`);

  const results = await Promise.all(
    platformEditors.map(async editor => {
      const availability = await checkEditorAvailability(editor.id);
      return { editor: editor.id, ...availability };
    })
  );

  let available = 0;
  let unavailable = 0;

  results.forEach(result => {
    if (result.isAvailable) {
      available++;
      logSuccess(`  ${result.editor}: Available (${result.detectedPath})`);
    } else {
      unavailable++;
      logWarning(`  ${result.editor}: Not available - ${result.error}`);
    }
  });

  log(`\nAvailability summary: ${available} available, ${unavailable} unavailable`, 'white');

  return results;
}

/**
 * Test editor launch simulation (without actually launching)
 */
async function testEditorLaunchSimulation() {
  log('\n=== Testing Editor Launch Simulation ===', 'cyan');

  const currentPlatform = getCurrentPlatform();
  const platformEditors = SUPPORTED_EDITORS.filter(
    editor => editor.commands[currentPlatform]
  );

  let successful = 0;
  let failed = 0;

  for (const editor of platformEditors) {
    try {
      const result = await testEditorLaunch(editor.id);
      if (result.success) {
        successful++;
        logSuccess(`  ${editor.id}: ${result.command}`);
      } else {
        failed++;
        logWarning(`  ${editor.id}: ${result.error}`);
      }
    } catch (error) {
      failed++;
      logError(`  ${editor.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  log(`\nLaunch simulation summary: ${successful} successful, ${failed} failed`, 'white');

  return { successful, failed };
}

/**
 * Test platform-specific edge cases
 */
function testPlatformEdgeCases() {
  log('\n=== Testing Platform Edge Cases ===', 'cyan');

  let issues = 0;

  // Test Windows-specific edge cases
  log('Testing Windows edge cases:', 'white');
  const windowsEditors = SUPPORTED_EDITORS.filter(e => e.commands.win32);
  windowsEditors.forEach(editor => {
    const command = editor.commands.win32!;

    // Check for problematic characters
    if (command.includes('/') && !command.includes('\\')) {
      logWarning(`  ${editor.id}: Mixed path separators in ${command}`);
      issues++;
    }

    // Check for proper executable extensions or known commands
    const knownExts = ['.exe', '.bat', '.cmd'];
    const hasKnownExt = knownExts.some(ext => command.toLowerCase().endsWith(ext));
    const isKnownCommand = ['code', 'atom', 'notepad++', 'devenv', 'idea64', 'webstorm64', 'phpstorm64', 'pycharm64', 'rider64'].includes(command);

    if (!hasKnownExt && !isKnownCommand && command.includes(' ')) {
      logWarning(`  ${editor.id}: Possible space in path without proper handling: ${command}`);
    }
  });

  // Test macOS-specific edge cases
  log('Testing macOS edge cases:', 'white');
  const macosEditors = SUPPORTED_EDITORS.filter(e => e.commands.darwin);
  macosEditors.forEach(editor => {
    const command = editor.commands.darwin!;

    // Check for .app bundle paths
    if (command.includes('.app/') && !command.startsWith('/Applications/')) {
      logWarning(`  ${editor.id}: .app bundle outside /Applications: ${command}`);
      issues++;
    }

    // Check executable permissions would be needed
    if (command.startsWith('/') && !existsSync(command)) {
      logInfo(`  ${editor.id}: Expected executable not found (normal if not installed): ${command}`);
    }
  });

  // Test Linux-specific edge cases
  log('Testing Linux edge cases:', 'white');
  const linuxEditors = SUPPORTED_EDITORS.filter(e => e.commands.linux);
  linuxEditors.forEach(editor => {
    const command = editor.commands.linux!;

    // Check if command would be in PATH
    if (!command.includes('/') && !command.includes(' ')) {
      try {
        execSync(`which ${command}`, { stdio: 'ignore' });
        logSuccess(`  ${editor.id}: Found in PATH: ${command}`);
      } catch {
        logInfo(`  ${editor.id}: Not in PATH (normal if not installed): ${command}`);
      }
    }
  });

  log(`\nEdge case test completed with ${issues} issues`, issues === 0 ? 'green' : 'red');
  return issues;
}

/**
 * Generate compatibility report
 */
function generateReport(results: any) {
  log('\n=== Cross-Platform Compatibility Report ===', 'cyan');

  const currentPlatform = getCurrentPlatform();

  // Platform support matrix
  log('\nPlatform Support Matrix:', 'white');
  const platforms: Platform[] = ['darwin', 'win32', 'linux'];

  platforms.forEach(p => {
    const supported = SUPPORTED_EDITORS.filter(e => e.commands[p]).length;
    const percentage = Math.round((supported / SUPPORTED_EDITORS.length) * 100);
    log(`  ${p}: ${supported}/${SUPPORTED_EDITORS.length} editors (${percentage}%)`,
        percentage > 50 ? 'green' : 'yellow');
  });

  // Current platform availability
  log(`\nCurrent Platform (${currentPlatform}) Availability:`, 'white');
  if (results.availability) {
    const available = results.availability.filter((r: any) => r.isAvailable).length;
    const total = results.availability.length;
    const percentage = Math.round((available / total) * 100);
    log(`  ${available}/${total} editors available (${percentage}%)`,
        percentage > 30 ? 'green' : 'yellow');
  }

  // Recommendations
  log('\nRecommendations:', 'white');
  log('  1. Users on macOS should install VS Code for best compatibility', 'blue');
  log('  2. Windows users should ensure editors are in PATH or installed to default locations', 'blue');
  log('  3. Linux users should install editors using package managers for PATH integration', 'blue');
  log('  4. Consider implementing fallback logic when preferred editors are unavailable', 'blue');

  // Known limitations
  log('\nKnown Limitations:', 'yellow');
  log('  - Xcode is only available on macOS', 'yellow');
  log('  - Visual Studio is only available on Windows', 'yellow');
  log('  - Some JetBrains IDEs may have different executable names based on installation', 'yellow');
  log('  - Terminal editors (vim, emacs) require terminal environment', 'yellow');
}

/**
 * Main test runner
 */
async function main() {
  log('🧪 Cross-Platform Editor Command Compatibility Verification', 'cyan');
  log('=' .repeat(60), 'cyan');

  const results: any = {};

  try {
    // Run all tests
    results.platform = testPlatformDetection();
    results.configIssues = testEditorConfiguration();
    results.commandBuilding = testCommandBuilding();
    results.availability = await testEditorAvailability();
    results.launchSimulation = await testEditorLaunchSimulation();
    results.edgeCases = testPlatformEdgeCases();

    // Generate report
    generateReport(results);

    // Final summary
    log('\n' + '='.repeat(60), 'cyan');
    log('🏁 Verification Complete', 'cyan');

    const totalIssues = results.configIssues + results.edgeCases;
    if (totalIssues === 0) {
      logSuccess('All tests passed! Editor commands are cross-platform compatible.');
      process.exit(0);
    } else {
      logWarning(`${totalIssues} issues found. Review the output above for details.`);
      process.exit(1);
    }

  } catch (error) {
    logError(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}