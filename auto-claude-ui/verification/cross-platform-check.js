/**
 * Cross-Platform Editor Command Compatibility Verification
 *
 * This script verifies that editor commands are properly configured
 * for different platforms (Windows, macOS, Linux) and provides
 * detailed analysis of potential issues.
 */

const { existsSync } = require('fs');
const path = require('path');

// Import the editor constants (we'll extract them manually for verification)
const editorsPath = path.join(__dirname, '../src/shared/constants/editors.ts');

// ============================================
// Manual extraction of editor data for verification
// ============================================

function extractEditorData() {
  const fs = require('fs');
  const content = fs.readFileSync(editorsPath, 'utf8');

  // Extract SUPPORTED_EDITORS array
  const editorsMatch = content.match(/export const SUPPORTED_EDITORS[^;]+;/s);
  if (!editorsMatch) {
    throw new Error('Could not extract SUPPORTED_EDITORS from editors.ts');
  }

  // Parse the editor data (simplified parsing)
  const editorLines = content.split('\n');
  const editors = [];
  let currentEditor = null;

  for (let i = 0; i < editorLines.length; i++) {
    const line = editorLines[i].trim();

    if (line.includes('{') && line.includes('id:')) {
      if (currentEditor) {
        editors.push(currentEditor);
      }
      currentEditor = {
        id: '',
        name: '',
        displayName: '',
        commands: {},
        recommendedFor: []
      };
    }

    if (currentEditor && line.includes('id:')) {
      const idMatch = line.match(/id:\s*['"`]([^'"`]+)['"`]/);
      if (idMatch) currentEditor.id = idMatch[1];
    }

    if (currentEditor && line.includes('displayName:')) {
      const nameMatch = line.match(/displayName:\s*['"`]([^'"`]+)['"`]/);
      if (nameMatch) currentEditor.displayName = nameMatch[1];
    }

    if (currentEditor && line.includes('commands:')) {
      // Look for the commands object
      let braceCount = 0;
      let commandsStr = '';
      let j = i;

      for (; j < editorLines.length; j++) {
        const cmdLine = editorLines[j];
        commandsStr += cmdLine + '\n';

        if (cmdLine.includes('{')) braceCount++;
        if (cmdLine.includes('}')) {
          braceCount--;
          if (braceCount === 0) break;
        }
      }

      // Extract platform commands
      const platforms = ['darwin', 'win32', 'linux'];
      platforms.forEach(platform => {
        const platformMatch = commandsStr.match(new RegExp(platform + '\\s*:\\s*[\'"`]([^\'"`]+)[\'"`]'));
        if (platformMatch) {
          currentEditor.commands[platform] = platformMatch[1];
        }
      });

      i = j; // Skip past the commands object
    }

    if (currentEditor && line.includes('recommendedFor:')) {
      const recMatch = line.match(/recommendedFor:\s*\[([^\]]+)\]/);
      if (recMatch) {
        currentEditor.recommendedFor = recMatch[1].split(',').map(s => s.trim().replace(/['"`]/g, ''));
      }
    }

    if (currentEditor && line.includes('}')) {
      if (!line.includes(',')) { // End of array
        editors.push(currentEditor);
        break;
      }
    }
  }

  return editors;
}

// ============================================
// Verification Functions
// ============================================

function validateWindowsCommand(command) {
  const issues = [];
  let isValid = true;

  if (!command.includes('.') && !command.includes('\\') && !command.includes('/')) {
    if (!/^[a-zA-Z0-9_\-\+]+(\.exe)?$/i.test(command)) {
      issues.push('Command contains unusual characters for Windows executable');
      isValid = false;
    }
  }

  if (command.includes('"') || command.includes("'") || command.includes('|')) {
    issues.push('Command contains potentially problematic characters');
    isValid = false;
  }

  return { isValid, issues };
}

function validateMacCommand(command) {
  const issues = [];
  let isValid = true;

  if (command.startsWith('/Applications/')) {
    if (!command.includes('.app/')) {
      issues.push('macOS app path should include .app bundle');
      isValid = false;
    }

    const expectedPatterns = [
      '.app/Contents/MacOS/',
      '.app/Contents/Resources/app/bin/',
      '.app/Contents/SharedSupport/bin/'
    ];

    const hasValidPath = expectedPatterns.some(pattern => command.includes(pattern));
    if (!hasValidPath) {
      issues.push('macOS app path should point to executable within app bundle');
      isValid = false;
    }
  }

  if (!command.startsWith('/') && command.includes(' ')) {
    issues.push('Command name should not contain spaces (use absolute path instead)');
    isValid = false;
  }

  return { isValid, issues };
}

function validateLinuxCommand(command) {
  const issues = [];
  let isValid = true;

  if (command.startsWith('/')) {
    if (!existsSync(command)) {
      issues.push('Absolute path does not exist on this system');
      isValid = false;
    }
  } else {
    if (!/^[a-z0-9_\-]+$/i.test(command)) {
      issues.push('Command name contains unusual characters');
      isValid = false;
    }
  }

  return { isValid, issues };
}

function validateCommand(platform, command) {
  const issues = [];
  const recommendations = [];
  let isValid = true;

  if (!command) {
    return {
      isValid: false,
      issues: ['No command configured for this platform'],
      recommendations: [`Add a command for ${platform} platform`]
    };
  }

  switch (platform) {
    case 'win32':
      const windowsValidation = validateWindowsCommand(command);
      issues.push(...windowsValidation.issues);
      if (!windowsValidation.isValid) isValid = false;
      break;

    case 'darwin':
      const macValidation = validateMacCommand(command);
      issues.push(...macValidation.issues);
      if (!macValidation.isValid) isValid = false;
      break;

    case 'linux':
      const linuxValidation = validateLinuxCommand(command);
      issues.push(...linuxValidation.issues);
      if (!linuxValidation.isValid) isValid = false;
      break;
  }

  if (command.length > 200) {
    issues.push('Command path is unusually long');
    isValid = false;
  }

  if (command.includes('..')) {
    issues.push('Command contains relative path traversal');
    isValid = false;
  }

  if (isValid && !command.startsWith('/') && platform !== 'win32') {
    recommendations.push('Consider using absolute path for more reliable launching');
  }

  if (platform === 'win32' && !command.toLowerCase().endsWith('.exe') && !command.includes('\\')) {
    recommendations.push('Consider adding .exe extension for Windows commands');
  }

  return { isValid, issues, recommendations };
}

function verifyEditor(editor, platforms) {
  const platformCommands = [];
  const criticalIssues = [];
  const recommendations = [];
  let totalScore = 0;

  for (const platform of platforms) {
    const command = editor.commands[platform];
    const validation = validateCommand(platform, command);

    const platformCommand = {
      platform,
      command,
      isValid: validation.isValid,
      issues: validation.issues,
      recommendations: validation.recommendations
    };

    platformCommands.push(platformCommand);

    let platformScore = 0;
    if (command) {
      platformScore += 50;
      if (validation.isValid) {
        platformScore += 50;
      } else {
        platformScore += Math.max(0, 25 - validation.issues.length * 5);
      }
    }

    totalScore += platformScore;

    if (!command && platform === process.platform) {
      criticalIssues.push(`No command for current platform (${platform})`);
    }

    if (validation.issues.some(issue => issue.includes('path') || issue.includes('executable'))) {
      criticalIssues.push(`Path/executable issue on ${platform}: ${validation.issues.join(', ')}`);
    }
  }

  const overallScore = Math.round(totalScore / platforms.length);

  if (platformCommands.filter(pc => pc.command).length === 1) {
    recommendations.push('Consider adding support for more platforms');
  }

  if (!editor.recommendedFor || editor.recommendedFor.length === 0) {
    recommendations.push('Add recommended project types for this editor');
  }

  return {
    editor,
    platformCommands,
    overallScore,
    criticalIssues,
    recommendations
  };
}

// ============================================
// Report Generation
// ============================================

function generateCompatibilityReport() {
  console.log('🔍 Verifying cross-platform editor command compatibility...\n');

  try {
    const editors = extractEditorData();
    const platforms = ['darwin', 'win32', 'linux'];
    const editorResults = editors.map(editor => verifyEditor(editor, platforms));

    const totalEditors = editorResults.length;
    const fullyCompatible = editorResults.filter(er => er.overallScore >= 90).length;
    const partiallyCompatible = editorResults.filter(er => er.overallScore >= 50 && er.overallScore < 90).length;
    const notCompatible = editorResults.filter(er => er.overallScore < 50).length;

    const platformSupport = platforms.reduce((acc, platform) => {
      acc[platform] = editorResults.filter(er => {
        const pc = er.platformCommands.find(p => p.platform === platform);
        return pc && pc.isValid;
      }).length;
      return acc;
    }, {});

    const averageScore = Math.round(
      editorResults.reduce((sum, er) => sum + er.overallScore, 0) / totalEditors
    );

    let status, summary;
    if (averageScore >= 90) {
      status = 'EXCELLENT';
      summary = 'Excellent cross-platform compatibility with comprehensive platform support';
    } else if (averageScore >= 75) {
      status = 'GOOD';
      summary = 'Good cross-platform compatibility with minor platform gaps';
    } else if (averageScore >= 50) {
      status = 'NEEDS_IMPROVEMENT';
      summary = 'Moderate compatibility that needs platform-specific improvements';
    } else {
      status = 'POOR';
      summary = 'Poor cross-platform compatibility requiring significant improvements';
    }

    // Print report
    console.log('🌍 Cross-Platform Editor Command Compatibility Report');
    console.log('='.repeat(60));

    console.log('\n📊 SUMMARY');
    console.log(`Total Editors: ${totalEditors}`);
    console.log(`✅ Fully Compatible: ${fullyCompatible}`);
    console.log(`⚠️  Partially Compatible: ${partiallyCompatible}`);
    console.log(`❌ Not Compatible: ${notCompatible}`);
    console.log(`\nPlatform Support:`);
    Object.entries(platformSupport).forEach(([platform, count]) => {
      const icon = platform === 'darwin' ? '🍎' : platform === 'win32' ? '🪟' : '🐧';
      console.log(`  ${icon} ${platform}: ${count} editors`);
    });

    const statusIcon = status === 'EXCELLENT' ? '🌟' :
                      status === 'GOOD' ? '✅' :
                      status === 'NEEDS_IMPROVEMENT' ? '⚠️' : '❌';
    console.log(`\n${statusIcon} OVERALL ASSESSMENT: ${status}`);
    console.log(`Score: ${averageScore}/100`);
    console.log(`Summary: ${summary}`);

    console.log('\n📝 EDITOR DETAILS');
    editorResults.forEach(result => {
      const scoreIcon = result.overallScore >= 90 ? '🌟' :
                       result.overallScore >= 75 ? '✅' :
                       result.overallScore >= 50 ? '⚠️' : '❌';

      console.log(`\n${scoreIcon} ${result.editor.displayName || result.editor.id} (${result.editor.id})`);
      console.log(`   Score: ${result.overallScore}/100`);

      result.platformCommands.forEach(pc => {
        const icon = pc.isValid ? '✅' : '❌';
        const platformIcon = pc.platform === 'darwin' ? '🍎' :
                             pc.platform === 'win32' ? '🪟' : '🐧';
        console.log(`   ${icon} ${platformIcon} ${pc.platform}: ${pc.command || 'Not configured'}`);

        if (pc.issues.length > 0) {
          pc.issues.forEach(issue => console.log(`     ⚠️  ${issue}`));
        }
      });

      if (result.criticalIssues.length > 0) {
        console.log('   🚨 Critical Issues:');
        result.criticalIssues.forEach(issue => console.log(`     - ${issue}`));
      }

      if (result.recommendations.length > 0) {
        console.log('   💡 Recommendations:');
        result.recommendations.forEach(rec => console.log(`     • ${rec}`));
      }
    });

    console.log('\n🎯 FINAL RECOMMENDATIONS');
    if (averageScore >= 90) {
      console.log('✨ Excellent work! The editor configuration has comprehensive cross-platform support.');
      console.log('   Consider testing on actual different platforms to verify real-world compatibility.');
    } else if (averageScore >= 75) {
      console.log('👍 Good foundation! Address the issues above for better cross-platform compatibility.');
      console.log('   Focus on the critical issues and platform-specific recommendations.');
    } else {
      console.log('🔧 Significant improvements needed for reliable cross-platform compatibility.');
      console.log('   Prioritize adding commands for missing platforms and fixing path/executable issues.');
    }

    return {
      success: averageScore >= 75,
      score: averageScore,
      status,
      totalEditors,
      fullyCompatible,
      partiallyCompatible,
      notCompatible,
      platformSupport
    };

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// Main Execution
// ============================================

if (require.main === module) {
  console.log('🚀 Starting Cross-Platform Editor Command Verification');
  console.log('='.repeat(60));

  const result = generateCompatibilityReport();

  if (result.success) {
    console.log('\n✅ Cross-platform compatibility verification PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Cross-platform compatibility verification FAILED');
    process.exit(1);
  }
}

module.exports = { generateCompatibilityReport };