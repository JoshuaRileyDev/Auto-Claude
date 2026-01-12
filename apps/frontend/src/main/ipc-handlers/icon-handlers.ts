import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { IPC_CHANNELS, AUTO_BUILD_PATHS } from '../../shared/constants';
import type { IPCResult, IconGenerationRequest, IconGenerationResult } from '../../shared/types';
import { projectStore } from '../project-store';
import sharp from 'sharp';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

// iOS App Icon sizes (in pixels)
const IOS_ICON_SIZES = [
  { size: 20, scale: 2, idiom: 'iphone', filename: 'Icon-20@2x.png' },
  { size: 20, scale: 3, idiom: 'iphone', filename: 'Icon-20@3x.png' },
  { size: 29, scale: 2, idiom: 'iphone', filename: 'Icon-29@2x.png' },
  { size: 29, scale: 3, idiom: 'iphone', filename: 'Icon-29@3x.png' },
  { size: 40, scale: 2, idiom: 'iphone', filename: 'Icon-40@2x.png' },
  { size: 40, scale: 3, idiom: 'iphone', filename: 'Icon-40@3x.png' },
  { size: 60, scale: 2, idiom: 'iphone', filename: 'Icon-60@2x.png' },
  { size: 60, scale: 3, idiom: 'iphone', filename: 'Icon-60@3x.png' },
  { size: 20, scale: 1, idiom: 'ipad', filename: 'Icon-20.png' },
  { size: 20, scale: 2, idiom: 'ipad', filename: 'Icon-20@2x-ipad.png' },
  { size: 29, scale: 1, idiom: 'ipad', filename: 'Icon-29.png' },
  { size: 29, scale: 2, idiom: 'ipad', filename: 'Icon-29@2x-ipad.png' },
  { size: 40, scale: 1, idiom: 'ipad', filename: 'Icon-40.png' },
  { size: 40, scale: 2, idiom: 'ipad', filename: 'Icon-40@2x-ipad.png' },
  { size: 76, scale: 1, idiom: 'ipad', filename: 'Icon-76.png' },
  { size: 76, scale: 2, idiom: 'ipad', filename: 'Icon-76@2x.png' },
  { size: 83.5, scale: 2, idiom: 'ipad', filename: 'Icon-83.5@2x.png' },
  { size: 1024, scale: 1, idiom: 'ios-marketing', filename: 'Icon-1024.png' }
];

/**
 * Generate app icon using AI
 */
async function generateIconWithAI(
  method: 'openai' | 'openrouter',
  prompt: string,
  apiKey: string,
  model?: string
): Promise<string> {
  let imageUrl: string;

  if (method === 'openai') {
    // Generate with OpenAI DALL-E
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `iOS app icon: ${prompt}. Clean, modern, professional design suitable for an app icon. Simple and recognizable.`,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    imageUrl = data.data[0].url;
  } else {
    // Generate with OpenRouter
    const selectedModel = model || 'openai/dall-e-3';
    const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/AndyMik90/Auto-Claude',
        'X-Title': 'Auto Claude'
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt: `iOS app icon: ${prompt}. Clean, modern, professional design suitable for an app icon. Simple and recognizable.`,
        n: 1,
        size: '1024x1024'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    imageUrl = data.data[0].url;
  }

  // Download the generated image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to download generated image');
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  // Save to temp file
  const tempPath = path.join(tmpdir(), `icon-${randomBytes(8).toString('hex')}.png`);
  writeFileSync(tempPath, imageBuffer);

  return tempPath;
}

/**
 * Process and resize icon to all required iOS sizes
 */
async function processIconForIOS(sourcePath: string, outputDir: string): Promise<void> {
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Read source image
  const sourceImage = sharp(sourcePath);
  const metadata = await sourceImage.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image: Could not read dimensions');
  }

  // Generate all required sizes
  for (const iconSpec of IOS_ICON_SIZES) {
    const pixels = Math.round(iconSpec.size * iconSpec.scale);
    const outputPath = path.join(outputDir, iconSpec.filename);

    await sharp(sourcePath)
      .resize(pixels, pixels, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(outputPath);
  }

  // Create Contents.json for AppIcon.appiconset
  const contentsJson = {
    images: IOS_ICON_SIZES.map(spec => ({
      size: `${spec.size}x${spec.size}`,
      idiom: spec.idiom,
      filename: spec.filename,
      scale: `${spec.scale}x`
    })),
    info: {
      version: 1,
      author: 'auto-claude'
    }
  };

  writeFileSync(
    path.join(outputDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
}

/**
 * Register icon generation handlers
 */
export function registerIconHandlers(
  _getMainWindow: () => BrowserWindow | null
): void {

  // Get current app icon
  ipcMain.handle(
    IPC_CHANNELS.XCODE_GET_CURRENT_ICON,
    async (_, projectId: string, serviceName: string): Promise<IPCResult<string>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Load project index to find service
        const indexPath = path.join(project.path, AUTO_BUILD_PATHS.PROJECT_INDEX);
        if (!existsSync(indexPath)) {
          return { success: false, error: 'Project index not found' };
        }

        const projectIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));
        const service = projectIndex.services?.[serviceName];

        if (!service || service.type !== 'mobile') {
          return { success: false, error: 'Service not found or not a mobile service' };
        }

        // Handle both relative and absolute service paths
        let servicePath = service.path || '';
        if (path.isAbsolute(servicePath)) {
          servicePath = path.relative(project.path, servicePath);
        }

        // Find AppIcon in Assets.xcassets
        const serviceDir = path.join(project.path, servicePath);
        const appIconPath = path.join(serviceDir, 'Assets.xcassets', 'AppIcon.appiconset', 'Icon-1024.png');

        if (existsSync(appIconPath)) {
          return {
            success: true,
            data: appIconPath
          };
        }

        // Try to find any icon
        const appiconsetPath = path.join(serviceDir, 'Assets.xcassets', 'AppIcon.appiconset');
        if (existsSync(appiconsetPath)) {
          const files = require('fs').readdirSync(appiconsetPath);
          const iconFile = files.find((f: string) => f.endsWith('.png'));
          if (iconFile) {
            return {
              success: true,
              data: path.join(appiconsetPath, iconFile)
            };
          }
        }

        return { success: false, error: 'No app icon found' };
      } catch (error: any) {
        console.error('Error getting current icon:', error);
        return {
          success: false,
          error: error.message || 'Failed to get current icon'
        };
      }
    }
  );

  // Generate app icon (AI or upload)
  ipcMain.handle(
    IPC_CHANNELS.XCODE_GENERATE_ICON,
    async (_, projectId: string, request: IconGenerationRequest): Promise<IPCResult<IconGenerationResult>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        let iconPath: string;

        if (request.method === 'upload') {
          // Handle uploaded image
          if (!request.imageData) {
            return { success: false, error: 'No image data provided' };
          }

          // Decode base64 image
          const imageBuffer = Buffer.from(request.imageData.split(',')[1], 'base64');

          // Save to temp file
          iconPath = path.join(tmpdir(), `uploaded-icon-${randomBytes(8).toString('hex')}.png`);
          writeFileSync(iconPath, imageBuffer);
        } else {
          // Generate with AI
          if (!request.prompt) {
            return { success: false, error: 'No prompt provided for AI generation' };
          }

          if (!request.apiKey) {
            return { success: false, error: 'API key required for image generation' };
          }

          iconPath = await generateIconWithAI(
            request.method,
            request.prompt,
            request.apiKey,
            request.model
          );
        }

        return {
          success: true,
          data: {
            success: true,
            imageUrl: iconPath
          }
        };
      } catch (error: any) {
        console.error('Error generating icon:', error);
        return {
          success: false,
          error: error.message || 'Failed to generate icon'
        };
      }
    }
  );

  // Set app icon (process and copy to Assets)
  ipcMain.handle(
    IPC_CHANNELS.XCODE_SET_ICON,
    async (_, projectId: string, serviceName: string, iconPath: string): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Validate icon exists
        if (!existsSync(iconPath)) {
          return { success: false, error: 'Icon file not found' };
        }

        // Load project index to find service
        const indexPath = path.join(project.path, AUTO_BUILD_PATHS.PROJECT_INDEX);
        if (!existsSync(indexPath)) {
          return { success: false, error: 'Project index not found' };
        }

        const projectIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));
        const service = projectIndex.services?.[serviceName];

        if (!service || service.type !== 'mobile') {
          return { success: false, error: 'Service not found or not a mobile service' };
        }

        const xcodeProjectPath = service.xcodeproj_path;
        if (!xcodeProjectPath) {
          return { success: false, error: 'Xcode project path not found' };
        }

        // Handle both relative and absolute service paths
        let servicePath = service.path || '';
        if (path.isAbsolute(servicePath)) {
          servicePath = path.relative(project.path, servicePath);
        }

        // Find Assets.xcassets directory
        const serviceDir = path.join(project.path, servicePath);
        const assetsPath = path.join(serviceDir, 'Assets.xcassets');

        if (!existsSync(assetsPath)) {
          return { success: false, error: 'Assets.xcassets not found. Make sure your project has an asset catalog.' };
        }

        // Create/update AppIcon.appiconset
        const appIconPath = path.join(assetsPath, 'AppIcon.appiconset');

        // Process and copy icons
        await processIconForIOS(iconPath, appIconPath);

        console.log(`Successfully set app icon for ${serviceName}`);
        return { success: true };
      } catch (error: any) {
        console.error('Error setting app icon:', error);
        return {
          success: false,
          error: error.message || 'Failed to set app icon'
        };
      }
    }
  );
}
