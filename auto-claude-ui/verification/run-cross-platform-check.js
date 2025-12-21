#!/usr/bin/env node

/**
 * Simple runner for cross-platform editor command verification
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Cross-Platform Editor Command Verification');
console.log('='.repeat(60));

try {
  // Check if TypeScript is available
  try {
    execSync('npx tsc --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ TypeScript not found. Please install it with: npm install -g typescript');
    process.exit(1);
  }

  // Compile and run the verification
  console.log('🔧 Compiling verification script...');
  execSync('npx tsc verification/cross-platform-editor-verification.ts --outDir dist --module commonjs --target es2020 --moduleResolution node --esModuleInterop true --allowSyntheticDefaultImports true', { stdio: 'pipe' });

  console.log('✅ Running cross-platform compatibility check...\n');

  // Run the verification
  execSync('node dist/verification/cross-platform-editor-verification.js', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

} catch (error) {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
}