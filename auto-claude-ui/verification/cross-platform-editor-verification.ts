/**
 * Cross-Platform Editor Command Compatibility Verification
 *
 * This script verifies that editor commands are properly configured
 * for different platforms (Windows, macOS, Linux) and provides
 * detailed analysis of potential issues.
 */

import { existsSync } from 'fs';
import { SUPPORTED_EDITORS } from '../src/shared/constants/editors';
import type { CodeEditor, Platform } from '../src/shared/types/editor';

// ============================================
// Verification Types
// ============================================

interface PlatformCommand {
  platform: Platform;
  command: string | undefined;
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

interface EditorVerification {
  editor: CodeEditor;
  platformCommands: PlatformCommand[];
  overallScore: number; // 0-100
  criticalIssues: string[];
  recommendations: string[];
}

interface CompatibilityReport {
  summary: {
    totalEditors: number;
    fullyCompatible: number;
    partiallyCompatible: number;
    notCompatible: number;
    platformSupport: Record<Platform, number>;
  };
  editorResults: EditorVerification[];
  platformAnalysis: Record<Platform, {
    supportedEditors: number;
    commonIssues: string[];
    recommendations: string[];
  }>;
  overallAssessment: {
    score: number;
    status: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
    summary: string;
  };
}

// ============================================
// Platform Detection
// ============================================

function getCurrentPlatform(): Platform {
  const platform = process.platform;
  return platform as Platform;
}

function getAllPlatforms(): Platform[] {
  return ['darwin', 'win32', 'linux'];
}

// ============================================
// Command Validation Utilities
// ============================================

function validateWindowsCommand(command: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  let isValid = true;

  // Check for common Windows command patterns
  if (!command.includes('.') && !command.includes('\\') && !command.includes('/')) {
    // Likely a PATH-based command, verify it's a reasonable executable name
    if (!/^[a-zA-Z0-9_\-\+]+(\.exe)?$/i.test(command)) {
      issues.push('Command contains unusual characters for Windows executable');
      isValid = false;
    }
  }

  // Check for problematic characters
  if (command.includes('"') || command.includes("'") || command.includes('|')) {
    issues.push('Command contains potentially problematic characters');
    isValid = false;
  }

  return { isValid, issues };
}

function validateMacCommand(command: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  let isValid = true;

  // Check for absolute path to app bundle
  if (command.startsWith('/Applications/')) {
    if (!command.includes('.app/')) {
      issues.push('macOS app path should include .app bundle');
      isValid = false;
    }

    // Check for executable path within app bundle
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

  // Check for command-line tools
  if (!command.startsWith('/') && command.includes(' ')) {
    issues.push('Command name should not contain spaces (use absolute path instead)');
    isValid = false;
  }

  return { isValid, issues };
}

function validateLinuxCommand(command: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  let isValid = true;

  // Check for absolute paths
  if (command.startsWith('/')) {
    if (!existsSync(command)) {
      issues.push('Absolute path does not exist on this system');
      isValid = false;
    }
  } else {
    // Check for reasonable command names
    if (!/^[a-z0-9_\-]+$/i.test(command)) {
      issues.push('Command name contains unusual characters');
      isValid = false;
    }
  }

  return { isValid, issues };
}

function validateCommand(platform: Platform, command: string | undefined): { isValid: boolean; issues: string[]; recommendations: string[] } {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;

  if (!command) {
    return {
      isValid: false,
      issues: ['No command configured for this platform'],
      recommendations: [`Add a command for ${platform} platform`]
    };
  }

  // Platform-specific validation
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

  // Common validations
  if (command.length > 200) {
    issues.push('Command path is unusually long');
    isValid = false;
  }

  if (command.includes('..')) {
    issues.push('Command contains relative path traversal');
    isValid = false;
  }

  // Add recommendations
  if (isValid && !command.startsWith('/') && platform !== 'win32') {
    recommendations.push('Consider using absolute path for more reliable launching');
  }

  if (platform === 'win32' && !command.toLowerCase().endsWith('.exe') && !command.includes('\\')) {
    recommendations.push('Consider adding .exe extension for Windows commands');
  }

  return { isValid, issues, recommendations };
}

// ============================================
// Editor Verification
// ============================================

function verifyEditor(editor: CodeEditor): EditorVerification {
  const platforms = getAllPlatforms();
  const platformCommands: PlatformCommand[] = [];
  const criticalIssues: string[] = [];
  const recommendations: string[] = [];
  let totalScore = 0;

  for (const platform of platforms) {
    const command = editor.commands[platform];
    const validation = validateCommand(platform, command);

    const platformCommand: PlatformCommand = {
      platform,
      command,
      isValid: validation.isValid,
      issues: validation.issues,
      recommendations: validation.recommendations
    };

    platformCommands.push(platformCommand);

    // Calculate score for this platform
    let platformScore = 0;
    if (command) {
      platformScore += 50; // Base score for having a command
      if (validation.isValid) {
        platformScore += 50; // Full score for valid command
      } else {
        platformScore += Math.max(0, 25 - validation.issues.length * 5); // Partial score
      }
    }

    totalScore += platformScore;

    // Collect critical issues
    if (!command && platform === getCurrentPlatform()) {
      criticalIssues.push(`No command for current platform (${platform})`);
    }

    if (validation.issues.some(issue => issue.includes('path') || issue.includes('executable'))) {
      criticalIssues.push(`Path/executable issue on ${platform}: ${validation.issues.join(', ')}`);
    }
  }

  const overallScore = Math.round(totalScore / platforms.length);

  // Add general recommendations
  if (platformCommands.filter(pc => pc.command).length === 1) {
    recommendations.push('Consider adding support for more platforms');
  }

  if (editor.recommendedFor && editor.recommendedFor.length === 0) {
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
// Platform Analysis
// ============================================

function analyzePlatformCompatibility(editorResults: EditorVerification[]): Record<Platform, any> {
  const platforms = getAllPlatforms();
  const analysis: Record<Platform, any> = {};

  for (const platform of platforms) {
    const platformEditors = editorResults.map(er => ({
      editor: er.editor,
      command: er.platformCommands.find(pc => pc.platform === platform)
    })).filter(item => item.command);

    const supportedEditors = platformEditors.filter(item => item.command!.isValid).length;
    const commonIssues: string[] = [];
    const recommendations: string[] = [];

    // Analyze common issues
    const allIssues = platformEditors
      .flatMap(item => item.command!.issues)
      .filter(issue => issue.length > 0);

    // Count issue frequency
    const issueCounts = new Map<string, number>();
    allIssues.forEach(issue => {
      const count = issueCounts.get(issue) || 0;
      issueCounts.set(issue, count + 1);
    });

    // Get most common issues
    issueCounts.forEach((count, issue) => {
      if (count >= 2) {
        commonIssues.push(`${issue} (${count} editors)`);
      }
    });

    // Platform-specific recommendations
    if (platform === 'win32') {
      if (supportedEditors < platformEditors.length * 0.7) {
        recommendations.push('Consider adding more .exe extensions or absolute paths');
      }
    } else if (platform === 'darwin') {
      if (supportedEditors < platformEditors.length * 0.7) {
        recommendations.push('Consider adding more absolute app bundle paths');
      }
    } else if (platform === 'linux') {
      if (supportedEditors < platformEditors.length * 0.7) {
        recommendations.push('Consider adding more /usr/bin or absolute paths');
      }
    }

    analysis[platform] = {
      supportedEditors,
      totalEditors: platformEditors.length,
      commonIssues,
      recommendations
    };
  }

  return analysis;
}

// ============================================
// Report Generation
// ============================================

function generateCompatibilityReport(): CompatibilityReport {
  console.log('🔍 Verifying cross-platform editor command compatibility...\n');

  const editorResults = SUPPORTED_EDITORS.map(verifyEditor);
  const platformAnalysis = analyzePlatformCompatibility(editorResults);

  // Calculate summary
  const totalEditors = editorResults.length;
  const fullyCompatible = editorResults.filter(er => er.overallScore >= 90).length;
  const partiallyCompatible = editorResults.filter(er => er.overallScore >= 50 && er.overallScore < 90).length;
  const notCompatible = editorResults.filter(er => er.overallScore < 50).length;

  const platformSupport = getAllPlatforms().reduce((acc, platform) => {
    acc[platform] = platformAnalysis[platform].supportedEditors;
    return acc;
  }, {} as Record<Platform, number>);

  // Calculate overall assessment
  const averageScore = Math.round(
    editorResults.reduce((sum, er) => sum + er.overallScore, 0) / totalEditors
  );

  let status: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  let summary: string;

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

  return {
    summary: {
      totalEditors,
      fullyCompatible,
      partiallyCompatible,
      notCompatible,
      platformSupport
    },
    editorResults,
    platformAnalysis,
    overallAssessment: {
      score: averageScore,
      status,
      summary
    }
  };
}

// ============================================
// Output Functions
// ============================================

function printCompatibilityReport(report: CompatibilityReport): void {
  console.log('🌍 Cross-Platform Editor Command Compatibility Report');
  console.log('='.repeat(60));

  // Summary
  console.log('\n📊 SUMMARY');
  console.log(`Total Editors: ${report.summary.totalEditors}`);
  console.log(`✅ Fully Compatible: ${report.summary.fullyCompatible}`);
  console.log(`⚠️  Partially Compatible: ${report.summary.partiallyCompatible}`);
  console.log(`❌ Not Compatible: ${report.summary.notCompatible}`);
  console.log(`\nPlatform Support:`);
  Object.entries(report.summary.platformSupport).forEach(([platform, count]) => {
    const icon = platform === 'darwin' ? '🍎' : platform === 'win32' ? '🪟' : '🐧';
    console.log(`  ${icon} ${platform}: ${count} editors`);
  });

  // Overall Assessment
  const statusIcon = report.overallAssessment.status === 'EXCELLENT' ? '🌟' :
                    report.overallAssessment.status === 'GOOD' ? '✅' :
                    report.overallAssessment.status === 'NEEDS_IMPROVEMENT' ? '⚠️' : '❌';
  console.log(`\n${statusIcon} OVERALL ASSESSMENT: ${report.overallAssessment.status}`);
  console.log(`Score: ${report.overallAssessment.score}/100`);
  console.log(`Summary: ${report.overallAssessment.summary}`);

  // Platform Analysis
  console.log('\n🖥️  PLATFORM ANALYSIS');
  Object.entries(report.platformAnalysis).forEach(([platform, analysis]) => {
    const icon = platform === 'darwin' ? '🍎' : platform === 'win32' ? '🪟' : '🐧';
    console.log(`\n${icon} ${platform.toUpperCase()}`);
    console.log(`  Supported Editors: ${analysis.supportedEditors}/${analysis.totalEditors}`);

    if (analysis.commonIssues.length > 0) {
      console.log('  Common Issues:');
      analysis.commonIssues.forEach(issue => console.log(`    - ${issue}`));
    }

    if (analysis.recommendations.length > 0) {
      console.log('  Recommendations:');
      analysis.recommendations.forEach(rec => console.log(`    • ${rec}`));
    }
  });

  // Editor Details
  console.log('\n📝 EDITOR DETAILS');
  report.editorResults.forEach(result => {
    const scoreIcon = result.overallScore >= 90 ? '🌟' :
                     result.overallScore >= 75 ? '✅' :
                     result.overallScore >= 50 ? '⚠️' : '❌';

    console.log(`\n${scoreIcon} ${result.editor.displayName} (${result.editor.id})`);
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

  // Final Recommendations
  console.log('\n🎯 FINAL RECOMMENDATIONS');
  if (report.overallAssessment.score >= 90) {
    console.log('✨ Excellent work! The editor configuration has comprehensive cross-platform support.');
    console.log('   Consider testing on actual different platforms to verify real-world compatibility.');
  } else if (report.overallAssessment.score >= 75) {
    console.log('👍 Good foundation! Address the issues above for better cross-platform compatibility.');
    console.log('   Focus on the critical issues and platform-specific recommendations.');
  } else {
    console.log('🔧 Significant improvements needed for reliable cross-platform compatibility.');
    console.log('   Prioritize adding commands for missing platforms and fixing path/executable issues.');
  }
}

// ============================================
// Main Execution
// ============================================

if (require.main === module) {
  try {
    const report = generateCompatibilityReport();
    printCompatibilityReport(report);

    // Exit with appropriate code
    if (report.overallAssessment.score >= 75) {
      console.log('\n✅ Cross-platform compatibility verification PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ Cross-platform compatibility verification FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  }
}

export { generateCompatibilityReport, printCompatibilityReport };
export type { CompatibilityReport, EditorVerification, PlatformCommand };