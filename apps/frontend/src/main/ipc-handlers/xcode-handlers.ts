import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { IPC_CHANNELS, AUTO_BUILD_PATHS } from '../../shared/constants';
import type { IPCResult, XcodeProjectInfo, XcodeProjectUpdate } from '../../shared/types';
import { projectStore } from '../project-store';

/**
 * Register Xcode project management handlers
 */
export function registerXcodeHandlers(
  _getMainWindow: () => BrowserWindow | null
): void {
  
  // Get Xcode project info (bundle ID, version, build number)
  ipcMain.handle(
    IPC_CHANNELS.XCODE_GET_PROJECT_INFO,
    async (_, projectId: string): Promise<IPCResult<XcodeProjectInfo>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Load project index
        const indexPath = path.join(project.path, AUTO_BUILD_PATHS.PROJECT_INDEX);
        if (!existsSync(indexPath)) {
          return { success: false, error: 'Project index not found. Please refresh context first.' };
        }

        const projectIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));
        
        // Find all mobile services
        const mobileServices = Object.entries(projectIndex.services || {})
          .filter(([_, service]: [string, any]) => service.type === 'mobile' && service.xcodeproj_path)
          .map(([serviceName, service]: [string, any]) => {
            const xcodeProjectPath = service.xcodeproj_path;

            // Handle both relative and absolute service paths
            let servicePath = service.path || '';
            if (path.isAbsolute(servicePath)) {
              // If service path is absolute, make it relative to project root
              servicePath = path.relative(project.path, servicePath);
            }

            // Construct path to project.pbxproj
            const pbxprojPath = path.join(
              project.path,
              servicePath,
              xcodeProjectPath,
              'project.pbxproj'
            );

            if (!existsSync(pbxprojPath)) {
              console.error(`pbxproj not found: ${pbxprojPath}`);
              return null;
            }

            try {
              // Parse Xcode project
              const { parse } = require('@bacons/xcode/json');
              const pbxprojData = parse(readFileSync(pbxprojPath, 'utf-8'));

              // Extract build settings from target configuration (not project level)
              let bundleIdentifier = '';
              let version = '';
              let buildNumber = '';

              // Find the main app target (first non-test target)
              const targets = Object.entries(pbxprojData.objects || {})
                .filter(([_, obj]: [string, any]) => obj.isa === 'PBXNativeTarget')
                .filter(([_, obj]: [string, any]) => {
                  // Exclude test targets
                  const name = obj.name || '';
                  return !name.endsWith('Tests') && !name.endsWith('UITests');
                })
                .map(([key, obj]: [string, any]) => ({ key, name: obj.name, configListRef: obj.buildConfigurationList }));

              if (targets.length > 0) {
                const mainTarget = targets[0];
                const configList = pbxprojData.objects[mainTarget.configListRef];

                if (configList?.buildConfigurations) {
                  // Prefer Release configuration, fall back to first config
                  let configRef = configList.buildConfigurations.find((ref: string) => {
                    const config = pbxprojData.objects[ref];
                    return config?.name === 'Release';
                  });

                  if (!configRef) {
                    configRef = configList.buildConfigurations[0];
                  }

                  const config = pbxprojData.objects[configRef];
                  if (config?.buildSettings) {
                    bundleIdentifier = config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER || '';
                    version = config.buildSettings.MARKETING_VERSION || '';
                    buildNumber = config.buildSettings.CURRENT_PROJECT_VERSION || '';
                  }
                }
              }

              return {
                serviceName,
                servicePath: service.path || '',
                xcodeProjectPath,
                bundleIdentifier,
                version,
                buildNumber
              };
            } catch (error: any) {
              console.error(`Failed to parse Xcode project: ${error.message}`);
              return null;
            }
          })
          .filter(Boolean) as any[];

        if (mobileServices.length === 0) {
          return { 
            success: false, 
            error: 'No valid Xcode projects found in mobile services' 
          };
        }

        return {
          success: true,
          data: { services: mobileServices }
        };
      } catch (error: any) {
        console.error('Error getting Xcode project info:', error);
        return {
          success: false,
          error: error.message || 'Failed to load Xcode project info'
        };
      }
    }
  );
  
  // Update Xcode project settings
  ipcMain.handle(
    IPC_CHANNELS.XCODE_UPDATE_PROJECT,
    async (_, projectId: string, updates: XcodeProjectUpdate): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Validate inputs
        if (updates.bundleIdentifier) {
          if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/i.test(updates.bundleIdentifier)) {
            return {
              success: false,
              error: 'Invalid bundle identifier format. Use reverse domain notation (e.g., com.company.app)'
            };
          }
        }

        if (updates.version) {
          if (!/^\d+\.\d+\.\d+$/.test(updates.version)) {
            return {
              success: false,
              error: 'Invalid version format. Use Major.Minor.Patch (e.g., 1.0.0)'
            };
          }
        }

        if (updates.buildNumber) {
          if (!/^\d+$/.test(updates.buildNumber)) {
            return {
              success: false,
              error: 'Invalid build number. Must be a positive integer.'
            };
          }
        }

        // Load project index to find service
        const indexPath = path.join(project.path, AUTO_BUILD_PATHS.PROJECT_INDEX);
        const projectIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));
        
        const service = projectIndex.services?.[updates.serviceName];
        if (!service || service.type !== 'mobile') {
          return { success: false, error: 'Service not found or not a mobile service' };
        }

        const xcodeProjectPath = service.xcodeproj_path;
        if (!xcodeProjectPath) {
          return { success: false, error: 'Xcode project path not found in service info' };
        }

        // Handle both relative and absolute service paths
        let servicePath = service.path || '';
        if (path.isAbsolute(servicePath)) {
          // If service path is absolute, make it relative to project root
          servicePath = path.relative(project.path, servicePath);
        }

        // Construct path to project.pbxproj
        const pbxprojPath = path.join(
          project.path,
          servicePath,
          xcodeProjectPath,
          'project.pbxproj'
        );

        if (!existsSync(pbxprojPath)) {
          return { success: false, error: `Xcode project not found at: ${pbxprojPath}` };
        }

        // Parse, modify, and save
        const { parse, build } = require('@bacons/xcode/json');
        const pbxprojData = parse(readFileSync(pbxprojPath, 'utf-8'));

        // Find the main app target (first non-test target)
        const targets = Object.entries(pbxprojData.objects || {})
          .filter(([_, obj]: [string, any]) => obj.isa === 'PBXNativeTarget')
          .filter(([_, obj]: [string, any]) => {
            // Exclude test targets
            const name = obj.name || '';
            return !name.endsWith('Tests') && !name.endsWith('UITests');
          })
          .map(([key, obj]: [string, any]) => ({ key, name: obj.name, configListRef: obj.buildConfigurationList }));

        if (targets.length === 0) {
          return { success: false, error: 'No main app target found in Xcode project' };
        }

        // Update configurations for the main target only
        const mainTarget = targets[0];
        const configList = pbxprojData.objects[mainTarget.configListRef];

        if (!configList?.buildConfigurations) {
          return { success: false, error: 'No build configurations found for target' };
        }

        // Update all configurations (Debug and Release) for the main target
        configList.buildConfigurations.forEach((configRef: string) => {
          const config = pbxprojData.objects[configRef];
          if (config?.buildSettings) {
            if (updates.bundleIdentifier !== undefined) {
              config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = updates.bundleIdentifier;
            }
            if (updates.version !== undefined) {
              config.buildSettings.MARKETING_VERSION = updates.version;
            }
            if (updates.buildNumber !== undefined) {
              config.buildSettings.CURRENT_PROJECT_VERSION = updates.buildNumber;
            }
          }
        });

        // Serialize and write atomically
        const pbxprojString = build(pbxprojData);
        const tempPath = pbxprojPath + '.tmp';
        writeFileSync(tempPath, pbxprojString, 'utf-8');
        
        // Atomic rename
        const fs = require('fs');
        fs.renameSync(tempPath, pbxprojPath);

        console.log(`Successfully updated Xcode project at ${pbxprojPath}`);
        return { success: true };
      } catch (error: any) {
        console.error('Error updating Xcode project:', error);
        return {
          success: false,
          error: error.message || 'Failed to update Xcode project'
        };
      }
    }
  );
}
