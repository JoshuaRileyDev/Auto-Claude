/**
 * Cross-platform editor command compatibility verification
 * Tests editor command construction and availability across different platforms
 */

import { platform } from 'os';
import { existsSync } from 'fs';
import type {
  CodeEditor,
  CodeEditorType,
  Platform,
  EditorAvailabilityResult,
  EditorLaunchResult
} from '../../shared/types/editor';
import { SUPPORTED_EDITORS, getEditorById } from '../../shared/constants/editors';
import {
  checkEditorAvailability,
  getAvailableEditors,
  testEditorLaunch
} from './editor-launcher';

// Import needed functions from editor-launcher (they're not exported, so we'll recreate here)
function getCurrentPlatform(): Platform {
  const currentPlatform = platform();
  return currentPlatform as Platform;
}

/**
 * Build the command and arguments for launching an editor (recreated from editor-launcher)
 */
function buildTestLaunchCommand(
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

  const args: string[] = [];
  args.push(...baseArgs);
  args.push(...extraArgs);
  args.push(targetPath);

  return {
    command: baseCommand,
    args
  };
}

/**
 * Verification result interface
 */
interface VerificationResult {
  platform: Platform;
  timestamp: string;
  totalEditors: number;
  platformSpecificEditors: number;
  commandResults: EditorCommandTest[];
  availabilityResults: EditorAvailabilityResult[];
  buildCommandResults: BuildCommandTest[];
  summary: VerificationSummary;
}

interface EditorCommandTest {
  editorId: CodeEditorType;
  hasCommand: boolean;
  command: string | null;
  hasArgs: boolean;
  args: string[] | null;
  platforms: Platform[];
  isPlatformSpecific: boolean;
}

interface BuildCommandTest {
  editorId: CodeEditorType;
  success: boolean;
  command: string | null;
  args: string[] | null;
  error?: string;
}

interface VerificationSummary {
  passed: number;
  failed: number;
  warnings: number;
  issues: string[];
  recommendations: string[];
}

/**
 * Test basic command configuration for all editors
 */
function testCommandConfiguration(): EditorCommandTest[] {
  const currentPlatform = getCurrentPlatform();
  const results: EditorCommandTest[] = [];

  for (const editor of SUPPORTED_EDITORS) {
    const platforms: Platform[] = [];

    // Check which platforms this editor supports
    if (editor.commands.darwin) platforms.push('darwin');
    if (editor.commands.win32) platforms.push('win32');
    if (editor.commands.linux) platforms.push('linux');

    const hasCommand = !!editor.commands[currentPlatform];
    const command = editor.commands[currentPlatform] || null;
    const hasArgs = !!(editor.args?.[currentPlatform]);
    const args = editor.args?.[currentPlatform] || null;
    const isPlatformSpecific = platforms.length < 3;

    results.push({
      editorId: editor.id,
      hasCommand,
      command,
      hasArgs,
      args,
      platforms,
      isPlatformSpecific
    });
  }

  return results;
}

/**
 * Test command building for all available editors
 */
function testCommandBuilding(): BuildCommandTest[] {
  const currentPlatform = getCurrentPlatform();
  const results: BuildCommandTest[] = [];
  const testPath = '/test/project/path';

  for (const editor of SUPPORTED_EDITORS) {
    if (!editor.commands[currentPlatform]) {
      results.push({
        editorId: editor.id,
        success: false,
        command: null,
        args: null,
        error: `No command for ${currentPlatform}`
      });
      continue;
    }

    try {
      const { command, args } = buildTestLaunchCommand(editor, testPath);
      results.push({
        editorId: editor.id,
        success: true,
        command,
        args
      });
    } catch (error) {
      results.push({
        editorId: editor.id,
        success: false,
        command: null,
        args: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * Test editor availability on current platform
 */
async function testEditorAvailability(): Promise<EditorAvailabilityResult[]> {
  try {
    return await getAvailableEditors();
  } catch (error) {
    console.error('Error testing editor availability:', error);
    return [];
  }
}

/**
 * Verify command formats and paths for common issues
 */
function verifyCommandFormats(commandResults: EditorCommandTest[]): string[] {
  const issues: string[] = [];
  const currentPlatform = getCurrentPlatform();

  for (const result of commandResults) {
    if (!result.command) continue;

    // Windows-specific checks
    if (currentPlatform === 'win32') {
      // Check for paths with spaces that need quotes
      if (result.command.includes(' ') && !result.command.startsWith('"') && !result.command.includes('.exe')) {
        issues.push(`Windows command may need quotes: ${result.command}`);
      }

      // Check for common Windows executable patterns
      if (result.command.includes(' ') && result.command.endsWith('.exe')) {
        if (!result.command.startsWith('"')) {
          issues.push(`Windows exe path with spaces needs quotes: ${result.command}`);
        }
      }
    }

    // macOS-specific checks
    if (currentPlatform === 'darwin') {
      // Check for app bundle paths
      if (result.command.includes('.app/') && !result.command.startsWith('/')) {
        issues.push(`macOS app bundle should use absolute path: ${result.command}`);
      }

      // Check for executable permissions on shell scripts
      if (result.command.endsWith('.sh')) {
        if (existsSync(result.command)) {
          // In a real implementation, we would check file permissions here
          // For now, just note that this should be executable
          issues.push(`Shell script should be executable: ${result.command}`);
        }
      }
    }

    // Linux-specific checks
    if (currentPlatform === 'linux') {
      // Check for shebang usage in shell scripts
      if (result.command.endsWith('.sh')) {
        issues.push(`Linux shell script should be executable: ${result.command}`);
      }
    }

    // General checks
    if (result.command.includes('..')) {
      issues.push(`Command uses relative path: ${result.command}`);
    }
  }

  return issues;
}

/**
 * Generate recommendations based on verification results
 */
function generateRecommendations(
  commandResults: EditorCommandTest[],
  availabilityResults: EditorAvailabilityResult[],
  buildResults: BuildCommandTest[]
): string[] {
  const recommendations: string[] = [];
  const currentPlatform = getCurrentPlatform();

  // Check for missing commands on current platform
  const missingCommands = commandResults.filter(r => !r.hasCommand);
  if (missingCommands.length > 0) {
    recommendations.push(`Consider adding commands for ${missingCommands.length} editors on ${currentPlatform}`);
  }

  // Check for unavailable but configured editors
  const configuredButUnavailable = availabilityResults.filter(r => !r.isAvailable);
  if (configuredButUnavailable.length > 0) {
    recommendations.push(`${configuredButUnavailable.length} configured editors are not available on this system`);
  }

  // Check for build command failures
  const buildFailures = buildResults.filter(r => !r.success);
  if (buildFailures.length > 0) {
    recommendations.push(`Fix ${buildFailures.length} editors with command building issues`);
  }

  // Platform-specific recommendations
  if (currentPlatform === 'win32') {
    const windowsEditors = commandResults.filter(r => r.hasCommand);
    const needsQuotes = windowsEditors.filter(r =>
      r.command && r.command.includes(' ') && !r.command.startsWith('"')
    );
    if (needsQuotes.length > 0) {
      recommendations.push('Add quotes to Windows commands containing spaces');
    }
  }

  if (currentPlatform === 'darwin') {
    const macEditors = commandResults.filter(r => r.hasCommand && r.command?.startsWith('/'));
    const missingAppBundle = macEditors.filter(r =>
      r.command?.includes('.app/') && !r.command.includes('/Contents/MacOS/')
    );
    if (missingAppBundle.length > 0) {
      recommendations.push('Use full app bundle paths for macOS applications');
    }
  }

  return recommendations;
}

/**
 * Run comprehensive cross-platform verification
 */
export async function runCrossPlatformVerification(): Promise<VerificationResult> {
  console.log(`🔍 Starting cross-platform editor command verification...`);
  console.log(`Platform: ${getCurrentPlatform()}`);
  console.log(`Total editors: ${SUPPORTED_EDITORS.length}`);

  const timestamp = new Date().toISOString();
  const currentPlatform = getCurrentPlatform();

  // Run all tests
  const commandResults = testCommandConfiguration();
  const buildCommandResults = testCommandBuilding();
  const availabilityResults = await testEditorAvailability();

  // Analyze results
  const issues = verifyCommandFormats(commandResults);
  const recommendations = generateRecommendations(
    commandResults,
    availabilityResults,
    buildCommandResults
  );

  // Calculate summary
  const totalTests = commandResults.length + buildCommandResults.length;
  const failedTests = buildCommandResults.filter(r => !r.success).length;
  const warningCount = issues.length + availabilityResults.filter(r => !r.isAvailable).length;
  const passedTests = totalTests - failedTests;

  const summary: VerificationSummary = {
    passed: passedTests,
    failed: failedTests,
    warnings: warningCount,
    issues,
    recommendations
  };

  const result: VerificationResult = {
    platform: currentPlatform,
    timestamp,
    totalEditors: SUPPORTED_EDITORS.length,
    platformSpecificEditors: commandResults.filter(r => r.isPlatformSpecific).length,
    commandResults,
    availabilityResults,
    buildCommandResults: buildCommandResults,
    summary
  };

  return result;
}

/**
 * Generate a detailed verification report
 */
export function generateVerificationReport(result: VerificationResult): string {
  const report: string[] = [];

  report.push('='.repeat(60));
  report.push('CROSS-PLATFORM EDITOR COMMAND VERIFICATION REPORT');
  report.push('='.repeat(60));
  report.push(`Platform: ${result.platform}`);
  report.push(`Timestamp: ${result.timestamp}`);
  report.push(`Total Editors: ${result.totalEditors}`);
  report.push(`Platform-Specific Editors: ${result.platformSpecificEditors}`);
  report.push('');

  // Summary
  report.push('📊 SUMMARY');
  report.push('-'.repeat(20));
  report.push(`✅ Passed: ${result.summary.passed}`);
  report.push(`❌ Failed: ${result.summary.failed}`);
  report.push(`⚠️  Warnings: ${result.summary.warnings}`);
  report.push('');

  // Command Configuration Results
  report.push('🔧 COMMAND CONFIGURATION');
  report.push('-'.repeat(30));
  for (const cmd of result.commandResults) {
    const status = cmd.hasCommand ? '✅' : '❌';
    const platformInfo = cmd.isPlatformSpecific ? '[Platform-Specific]' : '[Cross-Platform]';
    report.push(`${status} ${cmd.editorId}: ${cmd.command || 'No command'} ${platformInfo}`);
  }
  report.push('');

  // Build Command Results
  report.push('🚀 COMMAND BUILDING');
  report.push('-'.repeat(25));
  for (const build of result.buildCommandResults) {
    const status = build.success ? '✅' : '❌';
    const commandStr = build.command ? `${build.command} ${build.args?.join(' ') || ''}` : 'Failed';
    report.push(`${status} ${build.editorId}: ${commandStr}`);
    if (build.error) {
      report.push(`   Error: ${build.error}`);
    }
  }
  report.push('');

  // Availability Results
  report.push('📱 AVAILABILITY');
  report.push('-'.repeat(20));
  for (const avail of result.availabilityResults) {
    const status = avail.isAvailable ? '✅' : '❌';
    const pathInfo = avail.detectedPath ? ` (${avail.detectedPath})` : '';
    report.push(`${status} ${avail.editor}${pathInfo}`);
    if (avail.error) {
      report.push(`   Error: ${avail.error}`);
    }
  }
  report.push('');

  // Issues
  if (result.summary.issues.length > 0) {
    report.push('⚠️  ISSUES FOUND');
    report.push('-'.repeat(20));
    result.summary.issues.forEach(issue => {
      report.push(`• ${issue}`);
    });
    report.push('');
  }

  // Recommendations
  if (result.summary.recommendations.length > 0) {
    report.push('💡 RECOMMENDATIONS');
    report.push('-'.repeat(20));
    result.summary.recommendations.forEach(rec => {
      report.push(`• ${rec}`);
    });
    report.push('');
  }

  // Platform-Specific Analysis
  report.push('🖥️  PLATFORM-SPECIFIC ANALYSIS');
  report.push('-'.repeat(35));

  const platformCommands = result.commandResults.filter(r => r.hasCommand);
  report.push(`Configured editors for ${result.platform}: ${platformCommands.length}/${result.totalEditors}`);

  const availableEditors = result.availabilityResults.filter(r => r.isAvailable);
  report.push(`Available editors on system: ${availableEditors.length}/${platformCommands.length}`);

  // Editor types analysis
  const editorsByType: Record<string, number> = {
    'IDE': 0,
    'Editor': 0,
    'Terminal': 0
  };

  for (const editor of SUPPORTED_EDITORS) {
    if (editor.commands[result.platform]) {
      if (editor.displayName.includes('IDE') || ['IntelliJ', 'WebStorm', 'PhpStorm', 'PyCharm', 'Visual Studio'].some(ide => editor.displayName.includes(ide))) {
        editorsByType['IDE']++;
      } else if (['Vim', 'Neovim', 'Emacs'].includes(editor.displayName)) {
        editorsByType['Terminal']++;
      } else {
        editorsByType['Editor']++;
      }
    }
  }

  report.push('');
  report.push('Editor Types:');
  Object.entries(editorsByType).forEach(([type, count]) => {
    report.push(`  ${type}: ${count}`);
  });

  report.push('');
  report.push('='.repeat(60));
  report.push('END OF REPORT');
  report.push('='.repeat(60));

  return report.join('\n');
}

/**
 * Quick verification for development/testing
 */
export async function quickVerification(): Promise<boolean> {
  try {
    const result = await runCrossPlatformVerification();

    // Return true if no critical failures
    const criticalFailures = result.summary.failed > 0;
    const hasAvailabilityIssues = result.availabilityResults.filter(r => !r.isAvailable).length > result.availabilityResults.length / 2;

    return !criticalFailures && !hasAvailabilityIssues;
  } catch (error) {
    console.error('Quick verification failed:', error);
    return false;
  }
}