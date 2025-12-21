/**
 * Smart project type detection utilities for code editor integration
 * Analyzes project directory structure and files to suggest appropriate editors
 */

import { existsSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import type { ProjectType, ProjectDetectionResult, CodeEditorType } from '../../shared/types/editor';
import { PROJECT_DETECTION_PATTERNS, SUPPORTED_EDITORS, getRecommendedEditors } from '../../shared/constants/editors';

/**
 * Configuration for project detection
 */
interface DetectionConfig {
  // Maximum directory depth to scan for detection patterns
  maxDepth: number;
  // Minimum confidence threshold (0-1) for considering a detection valid
  confidenceThreshold: number;
  // Files/directories to ignore during detection
  ignorePatterns: string[];
}

/**
 * Default detection configuration
 */
const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  maxDepth: 3,
  confidenceThreshold: 0.6,
  ignorePatterns: [
    'node_modules',
    '.git',
    '.vscode',
    '.idea',
    'dist',
    'build',
    'target',
    'coverage',
    '.pytest_cache',
    '__pycache__',
    '.venv',
    'venv',
    'env'
  ]
};

/**
 * Check if a path should be ignored during detection
 */
function shouldIgnorePath(filePath: string, ignorePatterns: string[]): boolean {
  const baseName = path.basename(filePath);
  return ignorePatterns.some(pattern => {
    // Simple glob pattern matching
    const regex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    );
    return regex.test(baseName) || regex.test(filePath);
  });
}

/**
 * Recursively scan directory for files matching patterns
 */
function scanDirectory(
  dirPath: string,
  patterns: string[],
  config: DetectionConfig,
  currentDepth = 0
): string[] {
  if (currentDepth > config.maxDepth || !existsSync(dirPath)) {
    return [];
  }

  const matches: string[] = [];

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip ignored paths
      if (shouldIgnorePath(fullPath, config.ignorePatterns)) {
        continue;
      }

      // Check if entry matches any pattern
      for (const pattern of patterns) {
        const regex = new RegExp(
          pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
        );
        if (regex.test(entry.name)) {
          matches.push(fullPath);
          break;
        }
      }

      // Recursively scan subdirectories
      if (entry.isDirectory()) {
        const subMatches = scanDirectory(fullPath, patterns, config, currentDepth + 1);
        matches.push(...subMatches);
      }
    }
  } catch (error) {
    // Ignore permission errors and other filesystem issues
    // Gracefully continue detection even if some directories can't be read
  }

  return matches;
}

/**
 * Calculate confidence score for project type detection
 * Based on the number and type of indicators found
 */
function calculateConfidence(
  projectType: ProjectType,
  matches: string[],
  totalPatterns: number
): number {
  if (matches.length === 0) return 0;

  // Base confidence from match ratio
  let confidence = Math.min(matches.length / totalPatterns, 1);

  // Boost confidence for strong indicators
  const strongIndicators: Record<ProjectType, string[]> = {
    ios: ['*.xcodeproj', '*.xcworkspace'],
    android: ['AndroidManifest.xml'],
    web: ['package.json', 'index.html'],
    node: ['package.json'],
    python: ['requirements.txt', 'setup.py', 'pyproject.toml'],
    java: ['pom.xml', 'build.gradle'],
    kotlin: ['build.gradle.kts'],
    php: ['composer.json'],
    csharp: ['*.sln'],
    cpp: ['CMakeLists.txt'],
    rust: ['Cargo.toml'],
    go: ['go.mod'],
    ruby: ['Gemfile'],
    generic: []
  };

  const indicators = strongIndicators[projectType] || [];
  const hasStrongIndicator = matches.some(match => {
    const fileName = path.basename(match);
    return indicators.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(fileName);
    });
  });

  if (hasStrongIndicator) {
    confidence = Math.min(confidence + 0.3, 1);
  }

  return confidence;
}

/**
 * Detect project type from directory structure and files
 */
export function detectProjectType(
  projectPath: string,
  config: Partial<DetectionConfig> = {}
): ProjectDetectionResult | null {
  if (!existsSync(projectPath)) {
    return null;
  }

  const finalConfig = { ...DEFAULT_DETECTION_CONFIG, ...config };
  let bestMatch: ProjectDetectionResult | null = null;

  // Try to detect each project type
  for (const [projectType, patterns] of Object.entries(PROJECT_DETECTION_PATTERNS)) {
    if (patterns.length === 0) continue; // Skip generic type

    const matches = scanDirectory(projectPath, patterns, finalConfig);
    const confidence = calculateConfidence(projectType as ProjectType, matches, patterns.length);

    if (confidence > finalConfig.confidenceThreshold &&
        (!bestMatch || confidence > bestMatch.confidence)) {
      const recommendedEditors = getRecommendedEditors(projectType as ProjectType)
        .map(editor => editor.id);

      bestMatch = {
        detectedType: projectType as ProjectType,
        confidence,
        indicators: matches.map(m => path.relative(projectPath, m)),
        recommendedEditors
      };
    }
  }

  return bestMatch;
}

/**
 * Get suggested editor for a project based on detection
 */
export function getSuggestedEditor(
  projectPath: string,
  userPreference?: CodeEditorType,
  projectTypeOverrides?: Partial<Record<ProjectType, CodeEditorType>>
): CodeEditorType | null {
  const detection = detectProjectType(projectPath);

  // If user has a preference and it's available for this project type, use it
  if (userPreference) {
    const editor = SUPPORTED_EDITORS.find(e => e.id === userPreference);
    if (editor && (!detection || editor.recommendedFor?.includes(detection.detectedType))) {
      return userPreference;
    }
  }

  // If project type has an override, use it
  if (detection && projectTypeOverrides?.[detection.detectedType]) {
    const overrideEditor = projectTypeOverrides[detection.detectedType];
    if (overrideEditor) {
      const editor = SUPPORTED_EDITORS.find(e => e.id === overrideEditor);
      if (editor) {
        return overrideEditor;
      }
    }
  }

  // Fall back to recommended editor for detected type
  if (detection && detection.recommendedEditors.length > 0) {
    return detection.recommendedEditors[0];
  }

  // Default fallback: VS Code if available, otherwise first available editor
  const vscode = SUPPORTED_EDITORS.find(e => e.id === 'vscode');
  return vscode?.id || SUPPORTED_EDITORS[0]?.id || null;
}

/**
 * Get all detection results for analysis (useful for debugging or UI display)
 */
export function getAllDetectionResults(
  projectPath: string,
  config: Partial<DetectionConfig> = {}
): Array<{
  type: ProjectType;
  result: ProjectDetectionResult | null;
}> {
  const results: Array<{ type: ProjectType; result: ProjectDetectionResult | null }> = [];

  for (const projectType of Object.keys(PROJECT_DETECTION_PATTERNS)) {
    if (projectType === 'generic') continue; // Skip generic type in detailed results

    const patterns = PROJECT_DETECTION_PATTERNS[projectType as ProjectType];
    if (patterns.length === 0) continue;

    const finalConfig = { ...DEFAULT_DETECTION_CONFIG, ...config };
    const matches = scanDirectory(projectPath, patterns, finalConfig);
    const confidence = calculateConfidence(projectType as ProjectType, matches, patterns.length);

    if (confidence > 0) {
      const recommendedEditors = getRecommendedEditors(projectType as ProjectType)
        .map(editor => editor.id);

      results.push({
        type: projectType as ProjectType,
        result: {
          detectedType: projectType as ProjectType,
          confidence,
          indicators: matches.map(m => path.relative(projectPath, m)),
          recommendedEditors
        }
      });
    } else {
      results.push({
        type: projectType as ProjectType,
        result: null
      });
    }
  }

  return results.sort((a, b) => {
    const aConfidence = a.result?.confidence || 0;
    const bConfidence = b.result?.confidence || 0;
    return bConfidence - aConfidence;
  });
}

/**
 * Check if a directory is likely a specific project type
 * Quick check that doesn't do deep scanning
 */
export function quickCheckProjectType(
  projectPath: string,
  projectType: ProjectType
): boolean {
  if (!existsSync(projectPath)) {
    return false;
  }

  const patterns = PROJECT_DETECTION_PATTERNS[projectType];
  if (patterns.length === 0) return false;

  try {
    const entries = readdirSync(projectPath, { withFileTypes: true });

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const entry of entries) {
        if (regex.test(entry.name)) {
          return true;
        }
      }
    }
  } catch (error) {
    // If we can't read the directory, assume it doesn't match
  }

  return false;
}

/**
 * Get project name from path (useful for UI display)
 */
export function getProjectName(projectPath: string): string {
  return path.basename(projectPath);
}

/**
 * Check if project type is a strong match (high confidence detection)
 */
export function isStrongMatch(detection: ProjectDetectionResult | null): boolean {
  return detection ? detection.confidence >= 0.8 : false;
}

/**
 * Validate project detection by checking for conflicting types
 */
export function validateDetection(detection: ProjectDetectionResult | null): {
  isValid: boolean;
  conflicts?: ProjectType[];
} {
  if (!detection || !isStrongMatch(detection)) {
    return { isValid: false };
  }

  // Define mutually exclusive project types
  const conflictingTypes: Record<ProjectType, ProjectType[]> = {
    ios: ['android'],
    android: ['ios'],
    // Other types can coexist (e.g., web + node, java + kotlin)
    web: [],
    node: [],
    python: [],
    java: [],
    kotlin: [],
    php: [],
    csharp: [],
    cpp: [],
    rust: [],
    go: [],
    ruby: [],
    generic: []
  };

  const conflicts = conflictingTypes[detection.detectedType] || [];

  return {
    isValid: conflicts.length === 0,
    conflicts: conflicts.length > 0 ? conflicts : undefined
  };
}