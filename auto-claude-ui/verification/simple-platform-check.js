/**
 * Simple Cross-Platform Editor Command Verification
 *
 * Performs basic verification of cross-platform editor command compatibility
 * by analyzing the editors.ts file and checking for platform coverage.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Cross-Platform Editor Command Compatibility Verification');
console.log('='.repeat(60));

// Read the editors.ts file
const editorsPath = path.join(__dirname, '../src/shared/constants/editors.ts');

if (!fs.existsSync(editorsPath)) {
  console.error('❌ editors.ts file not found!');
  process.exit(1);
}

const content = fs.readFileSync(editorsPath, 'utf8');

// Extract platform-specific commands
const platforms = ['darwin', 'win32', 'linux'];
const editorStats = {
  totalEditors: 0,
  platformSupport: {
    darwin: 0,
    win32: 0,
    linux: 0
  },
  editors: []
};

// Find all editor objects and extract their commands
const editorMatches = content.match(/\{[\s\S]*?displayName:[\s\S]*?commands:[\s\S]*?\}/g);

if (!editorMatches) {
  console.error('❌ Could not parse editor data from editors.ts');
  process.exit(1);
}

editorMatches.forEach(editorStr => {
  // Extract display name
  const nameMatch = editorStr.match(/displayName:\s*['"`]([^'"`]+)['"`]/);
  const displayName = nameMatch ? nameMatch[1] : 'Unknown';

  // Extract id
  const idMatch = editorStr.match(/id:\s*['"`]([^'"`]+)['"`]/);
  const id = idMatch ? idMatch[1] : 'unknown';

  const editorInfo = {
    id,
    displayName,
    commands: {},
    hasPlatformSupport: {
      darwin: false,
      win32: false,
      linux: false
    }
  };

  // Extract commands for each platform
  platforms.forEach(platform => {
    const commandMatch = editorStr.match(new RegExp(platform + '\\s*:\\s*[\'"`]([^\'"`]+)[\'"`]'));
    if (commandMatch) {
      editorInfo.commands[platform] = commandMatch[1];
      editorInfo.hasPlatformSupport[platform] = true;
      editorStats.platformSupport[platform]++;
    }
  });

  editorStats.editors.push(editorInfo);
  editorStats.totalEditors++;
});

// Calculate statistics
const totalPossibleSupport = editorStats.totalEditors * platforms.length;
const actualSupport = Object.values(editorStats.platformSupport).reduce((sum, count) => sum + count, 0);
const supportPercentage = Math.round((actualSupport / totalPossibleSupport) * 100);

// Calculate compatibility score
const fullyCompatibleEditors = editorStats.editors.filter(editor =>
  platforms.every(platform => editor.hasPlatformSupport[platform])
).length;

const compatibilityScore = Math.round((fullyCompatibleEditors / editorStats.totalEditors) * 100);

console.log('\n📊 ANALYSIS RESULTS');
console.log('==================');

console.log(`\n📈 Overall Statistics:`);
console.log(`   Total Editors Configured: ${editorStats.totalEditors}`);
console.log(`   Editors with Full Platform Support: ${fullyCompatibleEditors}/${editorStats.totalEditors}`);
console.log(`   Overall Compatibility Score: ${compatibilityScore}%`);

console.log(`\n🌍 Platform Support Breakdown:`);
platforms.forEach(platform => {
  const icon = platform === 'darwin' ? '🍎' : platform === 'win32' ? '🪟' : '🐧';
  const percentage = Math.round((editorStats.platformSupport[platform] / editorStats.totalEditors) * 100);
  console.log(`   ${icon} ${platform}: ${editorStats.platformSupport[platform]}/${editorStats.totalEditors} editors (${percentage}%)`);
});

console.log(`\n📝 Editor Details:`);
editorStats.editors.forEach(editor => {
  const supportedPlatforms = platforms.filter(p => editor.hasPlatformSupport[p]);
  const missingPlatforms = platforms.filter(p => !editor.hasPlatformSupport[p]);
  const status = supportedPlatforms.length === platforms.length ? '🌟' :
                 supportedPlatforms.length >= 2 ? '✅' :
                 supportedPlatforms.length >= 1 ? '⚠️' : '❌';

  console.log(`\n   ${status} ${editor.displayName} (${editor.id})`);
  console.log(`      Supported: ${supportedPlatforms.join(', ') || 'None'}`);

  if (missingPlatforms.length > 0) {
    console.log(`      Missing: ${missingPlatforms.join(', ')}`);
  }

  platforms.forEach(platform => {
    if (editor.commands[platform]) {
      const command = editor.commands[platform];
      const platformIcon = platform === 'darwin' ? '🍎' : platform === 'win32' ? '🪟' : '🐧';

      // Basic validation
      let issues = [];
      if (platform === 'darwin' && command.startsWith('/Applications/') && !command.includes('.app/')) {
        issues.push('Missing .app bundle');
      }
      if (platform === 'win32' && !command.includes('\\') && !command.includes('/') && !command.includes('.')) {
        issues.push('Consider .exe extension');
      }

      const validationIcon = issues.length === 0 ? '✅' : '⚠️';
      console.log(`      ${platformIcon} ${validationIcon} ${platform}: ${command}`);
      if (issues.length > 0) {
        issues.forEach(issue => console.log(`         ⚠️  ${issue}`));
      }
    }
  });
});

console.log(`\n🎯 Key Findings:`);

// Find common issues
const darwinIssues = [];
const win32Issues = [];
const linuxIssues = [];

editorStats.editors.forEach(editor => {
  if (editor.commands.darwin) {
    if (editor.commands.darwin.startsWith('/Applications/') && !editor.commands.darwin.includes('.app/')) {
      darwinIssues.push(editor.displayName);
    }
  }

  if (editor.commands.win32) {
    if (!editor.commands.win32.includes('\\') && !editor.commands.win32.includes('/') && !editor.commands.win32.includes('.')) {
      win32Issues.push(editor.displayName);
    }
  }
});

if (darwinIssues.length > 0) {
  console.log(`   🍎 macOS: ${darwinIssues.length} editors may have app bundle path issues`);
}

if (win32Issues.length > 0) {
  console.log(`   🪟 Windows: ${win32Issues.length} editors could benefit from .exe extensions`);
}

const unsupportedEditors = editorStats.editors.filter(editor =>
  platforms.some(platform => !editor.hasPlatformSupport[platform])
);

if (unsupportedEditors.length > 0) {
  console.log(`   📋 ${unsupportedEditors.length} editors lack support for some platforms`);
}

// Overall assessment
let status, statusIcon, message;
if (compatibilityScore >= 80) {
  status = 'EXCELLENT';
  statusIcon = '🌟';
  message = 'Excellent cross-platform support with comprehensive platform coverage';
} else if (compatibilityScore >= 60) {
  status = 'GOOD';
  statusIcon = '✅';
  message = 'Good cross-platform support with minor gaps';
} else if (compatibilityScore >= 40) {
  status = 'NEEDS_IMPROVEMENT';
  statusIcon = '⚠️';
  message = 'Moderate support that needs platform-specific improvements';
} else {
  status = 'POOR';
  statusIcon = '❌';
  message = 'Limited cross-platform support requiring significant improvements';
}

console.log(`\n${statusIcon} OVERALL ASSESSMENT: ${status}`);
console.log(`   Compatibility Score: ${compatibilityScore}%`);
console.log(`   Message: ${message}`);

// Recommendations
console.log(`\n💡 Recommendations:`);

if (compatibilityScore < 80) {
  console.log(`   • Add missing platform commands for better cross-platform support`);
  console.log(`   • Consider absolute paths for macOS app bundles`);
  console.log(`   • Use .exe extensions for Windows executables when appropriate`);
}

if (editorStats.platformSupport.darwin < editorStats.totalEditors) {
  console.log(`   • Add macOS commands for ${editorStats.totalEditors - editorStats.platformSupport.darwin} editors`);
}

if (editorStats.platformSupport.win32 < editorStats.totalEditors) {
  console.log(`   • Add Windows commands for ${editorStats.totalEditors - editorStats.platformSupport.win32} editors`);
}

if (editorStats.platformSupport.linux < editorStats.totalEditors) {
  console.log(`   • Add Linux commands for ${editorStats.totalEditors - editorStats.platformSupport.linux} editors`);
}

if (compatibilityScore >= 80) {
  console.log(`   • Test on actual different platforms to verify real-world compatibility`);
  console.log(`   • Consider adding platform-specific fallback mechanisms`);
}

// Pass/Fail determination
const passed = compatibilityScore >= 60 && fullyCompatibleEditors >= Math.floor(editorStats.totalEditors * 0.5);

console.log(`\n${passed ? '✅' : '❌'} Cross-platform compatibility verification ${passed ? 'PASSED' : 'FAILED'}`);

if (!passed) {
  console.log(`\n   To pass verification, ensure:`);
  console.log(`   • At least 50% of editors support all platforms`);
  console.log(`   • Overall compatibility score is at least 60%`);
}

process.exit(passed ? 0 : 1);