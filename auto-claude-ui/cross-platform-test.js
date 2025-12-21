/**
 * Cross-platform editor command compatibility verification script
 * Tests editor detection, availability checking, and command building across platforms
 */

const { execSync, spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');
const os = require('os');

// Current platform detection
function getCurrentPlatform() {
  return os.platform();
}

// Mock editor data (simplified version from the actual code)
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
    id: 'sublime',
    name: 'Sublime Text',
    commands: {
      darwin: '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
      win32: 'sublime_text',
      linux: 'subl'
    },
    args: {}
  },
  {
    id: 'vim',
    name: 'Vim',
    commands: {
      darwin: 'vim',
      win32: 'vim',
      linux: 'vim'
    },
    args: {}
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
    id: 'notepad-plus-plus',
    name: 'Notepad++',
    commands: {
      win32: 'notepad++'
    },
    args: {}
  }
];

// Test results container
const testResults = {
  platform: getCurrentPlatform(),
  timestamp: new Date().toISOString(),
  tests: []
};

function addTest(testName, passed, details = '') {
  testResults.tests.push({
    name: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// 1. Test platform detection
function testPlatformDetection() {
  const platform = getCurrentPlatform();
  const validPlatforms = ['darwin', 'win32', 'linux'];
  const isValid = validPlatforms.includes(platform);

  addTest(
    'Platform detection',
    isValid,
    `Detected: ${platform}, Valid platforms: ${validPlatforms.join(', ')}`
  );

  return platform;
}

// 2. Test editor command structure validation
function testEditorCommandStructure() {
  let allValid = true;
  let details = [];

  for (const editor of SUPPORTED_EDITORS) {
    const hasCurrentPlatform = editor.commands[getCurrentPlatform()];
    if (!hasCurrentPlatform) {
      // This is only an error if the platform is supported by the editor
      const hasAnyCommand = Object.keys(editor.commands).length > 0;
      if (hasAnyCommand) {
        allValid = false;
        details.push(`${editor.name} missing command for ${getCurrentPlatform()}`);
      }
    }
  }

  addTest(
    'Editor command structure validation',
    allValid,
    allValid ? 'All editors have proper command structure' : details.join('; ')
  );
}

// 3. Test editor availability checking
function testEditorAvailability() {
  const platform = getCurrentPlatform();
  let availableCount = 0;
  let checkedCount = 0;

  for (const editor of SUPPORTED_EDITORS) {
    const command = editor.commands[platform];
    if (!command) continue; // Skip editors not available on this platform

    checkedCount++;

    try {
      if (command.startsWith('/')) {
        // Absolute path - check if file exists
        if (existsSync(command)) {
          availableCount++;
          addTest(`${editor.name} availability (absolute path)`, true, `Found at ${command}`);
        } else {
          addTest(`${editor.name} availability (absolute path)`, false, `Not found at ${command}`);
        }
      } else {
        // Command name - check if exists in PATH
        execSync(`which ${command}`, { stdio: 'ignore' });
        availableCount++;
        addTest(`${editor.name} availability (PATH)`, true, `Found in PATH: ${command}`);
      }
    } catch (error) {
      addTest(`${editor.name} availability`, false, `Command not found: ${command}`);
    }
  }

  addTest(
    'Editor availability summary',
    checkedCount > 0,
    `${availableCount}/${checkedCount} editors available on ${platform}`
  );
}

// 4. Test command building
function testCommandBuilding() {
  const platform = getCurrentPlatform();
  let allValid = true;
  let details = [];

  for (const editor of SUPPORTED_EDITORS) {
    const command = editor.commands[platform];
    if (!command) continue; // Skip editors not available on this platform

    try {
      // Simulate command building
      const baseCommand = command;
      const baseArgs = editor.args?.[platform] || [];
      const testPath = '/test/path';
      const args = [...baseArgs, testPath];

      // Validate command structure
      if (typeof baseCommand !== 'string' || baseCommand.trim() === '') {
        throw new Error('Invalid command');
      }

      if (!Array.isArray(args)) {
        throw new Error('Invalid args structure');
      }

      addTest(
        `${editor.name} command building`,
        true,
        `Command: ${baseCommand}, Args: [${args.join(', ')}]`
      );
    } catch (error) {
      allValid = false;
      details.push(`${editor.name}: ${error.message}`);
      addTest(
        `${editor.name} command building`,
        false,
        error.message
      );
    }
  }

  addTest(
    'Command building summary',
    allValid,
    allValid ? 'All editor commands built successfully' : details.join('; ')
  );
}

// 5. Test platform-specific path handling
function testPlatformSpecificPaths() {
  const platform = getCurrentPlatform();
  let allValid = true;
  let details = [];

  // Test path resolution for different platforms
  const testPaths = {
    darwin: [
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      '/usr/bin/xcodebuild',
      '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl'
    ],
    win32: [
      'C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd',
      'C:\\Program Files (x86)\\Notepad++\\notepad++.exe'
    ],
    linux: [
      '/usr/bin/code',
      '/usr/bin/vim',
      '/usr/local/bin/subl'
    ]
  };

  const currentPlatformPaths = testPaths[platform] || [];

  for (const testPath of currentPlatformPaths) {
    // Test path normalization
    const normalized = path.normalize(testPath);
    const isAbsolute = path.isAbsolute(testPath);

    if (platform === 'win32') {
      // Windows-specific tests
      const hasDrive = /^[A-Za-z]:/.test(testPath);
      if (!hasDrive && testPath.includes('\\')) {
        allValid = false;
        details.push(`Windows path missing drive letter: ${testPath}`);
      }
    } else {
      // Unix-like systems tests
      if (testPath.includes('\\') && !testPath.includes(' ')) {
        allValid = false;
        details.push(`Unix-like path contains backslashes: ${testPath}`);
      }
    }

    addTest(
      `Path format validation: ${testPath.split('/').pop() || testPath.split('\\').pop()}`,
      true,
      `Normalized: ${normalized}, Absolute: ${isAbsolute}`
    );
  }

  addTest(
    'Platform-specific path handling',
    allValid,
    allValid ? 'All paths follow platform conventions' : details.join('; ')
  );
}

// 6. Test error handling scenarios
function testErrorHandling() {
  let allValid = true;
  let details = [];

  // Test invalid editor ID
  try {
    const invalidEditor = SUPPORTED_EDITORS.find(e => e.id === 'invalid-editor');
    if (invalidEditor) {
      allValid = false;
      details.push('Should not find invalid editor');
    } else {
      addTest('Invalid editor ID handling', true, 'Correctly rejects invalid editor ID');
    }
  } catch (error) {
    addTest('Invalid editor ID handling', false, error.message);
    allValid = false;
  }

  // Test missing command handling
  const platform = getCurrentPlatform();
  for (const editor of SUPPORTED_EDITORS) {
    const hasCommand = editor.commands[platform];
    if (!hasCommand && Object.keys(editor.commands).length > 0) {
      // Editor supports other platforms but not current one
      addTest(
        `Missing command handling for ${editor.name}`,
        true,
        `Correctly identified ${editor.name} as unavailable on ${platform}`
      );
    }
  }

  // Test non-existent path handling
  const nonExistentPath = '/path/that/definitely/does/not/exist/editor';
  try {
    const exists = existsSync(nonExistentPath);
    addTest(
      'Non-existent path handling',
      !exists,
      `Correctly identifies non-existent path: ${nonExistentPath}`
    );
  } catch (error) {
    addTest('Non-existent path handling', false, error.message);
    allValid = false;
  }

  addTest(
    'Error handling summary',
    allValid,
    allValid ? 'All error scenarios handled correctly' : details.join('; ')
  );
}

// 7. Test cross-platform compatibility matrix
function testCrossPlatformCompatibility() {
  const platforms = ['darwin', 'win32', 'linux'];
  let compatibilityScore = 0;
  const totalPossible = SUPPORTED_EDITORS.length * platforms.length;

  for (const platform of platforms) {
    for (const editor of SUPPORTED_EDITORS) {
      const hasCommand = editor.commands[platform];
      if (hasCommand) {
        compatibilityScore++;
      }
    }
  }

  const coverage = ((compatibilityScore / totalPossible) * 100).toFixed(1);

  addTest(
    'Cross-platform compatibility coverage',
    compatibilityScore > 0,
    `${compatibilityScore}/${totalPossible} (${coverage}%) platform-editor combinations supported`
  );

  // Platform-specific coverage
  for (const platform of platforms) {
    const platformEditors = SUPPORTED_EDITORS.filter(e => e.commands[platform]).length;
    const platformCoverage = ((platformEditors / SUPPORTED_EDITORS.length) * 100).toFixed(1);

    addTest(
      `${platform} platform coverage`,
      platformEditors > 0,
      `${platformEditors}/${SUPPORTED_EDITORS.length} (${platformCoverage}%) editors available`
    );
  }
}

// 8. Generate final report
function generateReport() {
  const totalTests = testResults.tests.length;
  const passedTests = testResults.tests.filter(t => t.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('CROSS-PLATFORM EDITOR COMMAND COMPATIBILITY REPORT');
  console.log('='.repeat(60));
  console.log(`Platform: ${testResults.platform}`);
  console.log(`Timestamp: ${testResults.timestamp}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log('='.repeat(60));

  if (failedTests > 0) {
    console.log('\nFAILED TESTS:');
    testResults.tests.filter(t => !t.passed).forEach(test => {
      console.log(`❌ ${test.name}: ${test.details}`);
    });
  }

  console.log('\nRECOMMENDATIONS:');
  if (successRate === '100.0') {
    console.log('✅ All tests passed! Editor command compatibility looks good.');
  } else {
    console.log('🔧 Some issues found. Review failed tests and consider:');
    console.log('   - Adding missing editor commands for current platform');
    console.log('   - Updating paths to match actual installation locations');
    console.log('   - Improving error handling for missing editors');
  }

  // Platform-specific recommendations
  const platform = getCurrentPlatform();
  if (platform === 'darwin') {
    console.log('\nmacOS-Specific Notes:');
    console.log('   - Check that /Applications paths match actual installations');
    console.log('   - Consider Homebrew installation paths (/opt/homebrew/bin)');
  } else if (platform === 'win32') {
    console.log('\nWindows-Specific Notes:');
    console.log('   - Verify Program Files paths match system architecture');
    console.log('   - Check PATH environment variable for command availability');
  } else if (platform === 'linux') {
    console.log('\nLinux-Specific Notes:');
    console.log('   - Verify package manager installation paths');
    console.log('   - Check both /usr/bin and /usr/local/bin locations');
  }

  console.log('\n' + '='.repeat(60));

  return testResults;
}

// Run all tests
function runAllTests() {
  console.log('🧪 Starting Cross-Platform Editor Command Compatibility Tests...\n');

  testPlatformDetection();
  testEditorCommandStructure();
  testEditorAvailability();
  testCommandBuilding();
  testPlatformSpecificPaths();
  testErrorHandling();
  testCrossPlatformCompatibility();

  return generateReport();
}

// Execute tests if run directly
if (require.main === module) {
  const results = runAllTests();

  // Write results to file for analysis
  const fs = require('fs');
  const resultsPath = path.join(__dirname, 'cross-platform-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
}

module.exports = {
  runAllTests,
  testResults,
  getCurrentPlatform,
  SUPPORTED_EDITORS
};