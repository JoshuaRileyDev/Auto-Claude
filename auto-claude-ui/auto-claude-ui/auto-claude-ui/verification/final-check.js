/**
 * Final Cross-Platform Verification Check
 */

const { existsSync } = require('fs');
const path = require('path');

console.log('🔍 Final Cross-Platform Verification');
console.log('=====================================');

// Check all required files exist
const requiredFiles = [
  'auto-claude-ui/src/shared/types/editor.ts',
  'auto-claude-ui/src/shared/constants/editors.ts',
  'auto-claude-ui/src/main/utils/editor-detector.ts',
  'auto-claude-ui/src/main/utils/editor-launcher.ts',
  'auto-claude-ui/src/renderer/components/settings/EditorSettings.tsx'
];

console.log('\n📁 File Structure Check:');
let filesOk = true;
requiredFiles.forEach(file => {
  if (existsSync(file)) {
    console.log('✅ ' + file);
  } else {
    console.log('❌ ' + file);
    filesOk = false;
  }
});

// Test platform support
console.log('\n🌍 Platform Support Check:');
const platforms = ['darwin', 'win32', 'linux'];
const fs = require('fs');
const content = fs.readFileSync('auto-claude-ui/src/shared/constants/editors.ts', 'utf8');

let totalCommands = 0;
platforms.forEach(platform => {
  const regex = new RegExp(platform + '\\s*:\\s*[\'"`]([^\'"`]+)[\'"`]', 'g');
  const matches = content.match(regex);
  const count = matches ? matches.length : 0;
  totalCommands += count;
  const icon = platform === 'darwin' ? '🍎' : platform === 'win32' ? '🪟' : '🐧';
  console.log(icon + ' ' + platform + ': ' + count + ' commands');
});

console.log('\n📊 Summary:');
console.log('Total platform commands: ' + totalCommands);
console.log('Files present: ' + (filesOk ? '✅' : '❌'));

if (filesOk && totalCommands >= 40) {
  console.log('\n🎉 Cross-platform verification PASSED');
} else {
  console.log('\n❌ Cross-platform verification FAILED');
}