import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Save, RefreshCw, AlertCircle, Image as ImageIcon, Upload, Wand2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';
import type { XcodeProjectInfo, XcodeServiceInfo, IconGenerationMethod } from '../../shared/types';

interface ManageAppProps {
  projectId: string;
}

export function ManageApp({ projectId }: ManageAppProps) {
  const { t } = useTranslation(['navigation', 'common']);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectInfo, setProjectInfo] = useState<XcodeProjectInfo | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [formData, setFormData] = useState({
    bundleIdentifier: '',
    version: '',
    buildNumber: ''
  });

  // Icon generation state
  const [iconMethod, setIconMethod] = useState<IconGenerationMethod>('openai');
  const [iconPrompt, setIconPrompt] = useState('');
  const [iconApiKey, setIconApiKey] = useState('');
  const [iconModel, setIconModel] = useState('openai/dall-e-3');
  const [generatedIconPath, setGeneratedIconPath] = useState<string | null>(null);
  const [generatingIcon, setGeneratingIcon] = useState(false);
  const [settingIcon, setSettingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project info on mount
  useEffect(() => {
    loadProjectInfo();
  }, [projectId]);

  const loadProjectInfo = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getXcodeProjectInfo(projectId);
      if (result.success && result.data) {
        setProjectInfo(result.data);
        if (result.data.services.length > 0) {
          const firstService = result.data.services[0];
          setSelectedService(firstService.serviceName);

          // Set first target as default
          if (firstService.targets.length > 0) {
            const firstTarget = firstService.targets[0];
            setSelectedTarget(firstTarget.name);
            setFormData({
              bundleIdentifier: firstTarget.bundleIdentifier,
              version: firstTarget.version,
              buildNumber: firstTarget.buildNumber
            });
          }
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load Xcode project',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load Xcode project',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (serviceName: string) => {
    setSelectedService(serviceName);
    const service = projectInfo?.services.find(s => s.serviceName === serviceName);
    if (service && service.targets.length > 0) {
      const firstTarget = service.targets[0];
      setSelectedTarget(firstTarget.name);
      setFormData({
        bundleIdentifier: firstTarget.bundleIdentifier,
        version: firstTarget.version,
        buildNumber: firstTarget.buildNumber
      });
    }
  };

  const handleTargetChange = (targetName: string) => {
    setSelectedTarget(targetName);
    const service = projectInfo?.services.find(s => s.serviceName === selectedService);
    const target = service?.targets.find(t => t.name === targetName);
    if (target) {
      setFormData({
        bundleIdentifier: target.bundleIdentifier,
        version: target.version,
        buildNumber: target.buildNumber
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await window.electronAPI.updateXcodeProject(projectId, {
        serviceName: selectedService,
        targetName: selectedTarget,
        ...formData
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Xcode project updated successfully'
        });
        await loadProjectInfo(); // Reload to confirm changes
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update project',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateIcon = async () => {
    if (iconMethod !== 'upload' && !iconPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt for icon generation',
        variant: 'destructive'
      });
      return;
    }

    if (iconMethod !== 'upload' && !iconApiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an API key',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingIcon(true);
    try {
      const result = await window.electronAPI.generateAppIcon(projectId, {
        serviceName: selectedService,
        method: iconMethod,
        prompt: iconPrompt,
        apiKey: iconApiKey,
        model: iconModel
      });

      if (result.success && result.data?.imageUrl) {
        setGeneratedIconPath(result.data.imageUrl);
        toast({
          title: 'Success',
          description: 'Icon generated successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to generate icon',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate icon',
        variant: 'destructive'
      });
    } finally {
      setGeneratingIcon(false);
    }
  };

  const handleUploadIcon = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingIcon(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;

        const result = await window.electronAPI.generateAppIcon(projectId, {
          serviceName: selectedService,
          method: 'upload',
          imageData
        });

        if (result.success && result.data?.imageUrl) {
          setGeneratedIconPath(result.data.imageUrl);
          toast({
            title: 'Success',
            description: 'Image uploaded successfully'
          });
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to upload image',
            variant: 'destructive'
          });
        }
        setGeneratingIcon(false);
      };

      reader.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to read image file',
          variant: 'destructive'
        });
        setGeneratingIcon(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive'
      });
      setGeneratingIcon(false);
    }
  };

  const handleSetIcon = async () => {
    if (!generatedIconPath) {
      toast({
        title: 'Error',
        description: 'Please generate or upload an icon first',
        variant: 'destructive'
      });
      return;
    }

    setSettingIcon(true);
    try {
      const result = await window.electronAPI.setAppIcon(projectId, selectedService, generatedIconPath);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'App icon set successfully. Rebuild your app to see changes.'
        });
        setGeneratedIconPath(null);
        setIconPrompt('');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to set app icon',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set app icon',
        variant: 'destructive'
      });
    } finally {
      setSettingIcon(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!projectInfo || projectInfo.services.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              No Mobile Projects Found
            </CardTitle>
            <CardDescription>
              No Xcode projects were detected in this project. Make sure you have a .xcodeproj file.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentService = projectInfo.services.find(s => s.serviceName === selectedService);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Manage App</h1>
              <p className="text-sm text-muted-foreground">
                Configure bundle identifier, version, and build number
              </p>
            </div>
          </div>
          <Button onClick={loadProjectInfo} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Service selector (if multiple services) */}
          {projectInfo.services.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Service</CardTitle>
                <CardDescription>
                  This project has multiple mobile services. Select one to configure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedService} onValueChange={handleServiceChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectInfo.services.map(service => (
                      <SelectItem key={service.serviceName} value={service.serviceName}>
                        {service.serviceName} ({service.servicePath})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Target selector */}
          {currentService && currentService.targets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Target</CardTitle>
                <CardDescription>
                  {currentService.targets.length > 1
                    ? 'Select which target to configure (e.g., main app, widget, watch app).'
                    : 'The target being configured.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedTarget} onValueChange={handleTargetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentService.targets.map(target => (
                      <SelectItem key={target.name} value={target.name}>
                        {target.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Configuration form */}
          <Card>
            <CardHeader>
              <CardTitle>App Configuration</CardTitle>
              <CardDescription>
                Update your app's bundle identifier, version, and build number
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bundle Identifier */}
              <div className="space-y-2">
                <Label htmlFor="bundleId">Bundle Identifier</Label>
                <Input
                  id="bundleId"
                  value={formData.bundleIdentifier}
                  onChange={(e) => setFormData({ ...formData, bundleIdentifier: e.target.value })}
                  placeholder="com.company.appname"
                />
                <p className="text-xs text-muted-foreground">
                  Format: com.company.appname (reverse domain notation)
                </p>
              </div>

              {/* Version Number */}
              <div className="space-y-2">
                <Label htmlFor="version">Version Number</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                />
                <p className="text-xs text-muted-foreground">
                  Format: Major.Minor.Patch (e.g., 1.0.0)
                </p>
              </div>

              {/* Build Number */}
              <div className="space-y-2">
                <Label htmlFor="buildNumber">Build Number</Label>
                <Input
                  id="buildNumber"
                  value={formData.buildNumber}
                  onChange={(e) => setFormData({ ...formData, buildNumber: e.target.value })}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  Integer that increments with each build
                </p>
              </div>

              {/* Current values display */}
              {currentService && selectedTarget && (
                <div className="rounded-lg bg-muted p-4 space-y-1">
                  <p className="text-sm font-medium">Current Values for {selectedTarget}:</p>
                  {(() => {
                    const target = currentService.targets.find(t => t.name === selectedTarget);
                    if (!target) return null;
                    return (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Bundle ID: {target.bundleIdentifier}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Version: {target.version}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Build: {target.buildNumber}
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Save button */}
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* App Icon Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                App Icon
              </CardTitle>
              <CardDescription>
                Generate an app icon with AI or upload your own image
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Method selection */}
              <div className="space-y-2">
                <Label>Generation Method</Label>
                <Select value={iconMethod} onValueChange={(value) => setIconMethod(value as IconGenerationMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        OpenAI DALL-E
                      </div>
                    </SelectItem>
                    <SelectItem value="openrouter">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        OpenRouter
                      </div>
                    </SelectItem>
                    <SelectItem value="upload">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI Generation Options */}
              {iconMethod !== 'upload' && (
                <>
                  {/* Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="iconPrompt">Icon Description</Label>
                    <Textarea
                      id="iconPrompt"
                      value={iconPrompt}
                      onChange={(e) => setIconPrompt(e.target.value)}
                      placeholder="A modern, minimalist icon for a fitness tracking app with a running shoe"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe the icon you want to generate
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label htmlFor="iconApiKey">
                      {iconMethod === 'openai' ? 'OpenAI API Key' : 'OpenRouter API Key'}
                    </Label>
                    <Input
                      id="iconApiKey"
                      type="password"
                      value={iconApiKey}
                      onChange={(e) => setIconApiKey(e.target.value)}
                      placeholder={iconMethod === 'openai' ? 'sk-...' : 'sk-or-v1-...'}
                    />
                    <p className="text-xs text-muted-foreground">
                      {iconMethod === 'openai'
                        ? 'Your OpenAI API key from platform.openai.com'
                        : 'Your OpenRouter API key from openrouter.ai'}
                    </p>
                  </div>

                  {/* Model selection for OpenRouter */}
                  {iconMethod === 'openrouter' && (
                    <div className="space-y-2">
                      <Label htmlFor="iconModel">Model</Label>
                      <Select value={iconModel} onValueChange={setIconModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai/dall-e-3">DALL-E 3 (OpenAI)</SelectItem>
                          <SelectItem value="stabilityai/stable-diffusion-xl">Stable Diffusion XL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Generate button */}
                  <Button
                    onClick={handleGenerateIcon}
                    disabled={generatingIcon}
                    className="w-full"
                    variant="outline"
                  >
                    {generatingIcon ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Icon
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Upload Option */}
              {iconMethod === 'upload' && (
                <div className="space-y-2">
                  <Label>Upload Image</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadIcon}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={generatingIcon}
                    className="w-full"
                    variant="outline"
                  >
                    {generatingIcon ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Upload a square image (1024x1024 recommended). It will be automatically resized for all iOS icon sizes.
                  </p>
                </div>
              )}

              {/* Preview and Set Icon */}
              {generatedIconPath && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="flex items-center gap-4">
                    <img
                      src={`file://${generatedIconPath}`}
                      alt="Generated icon"
                      className="w-24 h-24 rounded-lg border"
                    />
                    <Button
                      onClick={handleSetIcon}
                      disabled={settingIcon}
                      className="flex-1"
                    >
                      {settingIcon ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Setting Icon...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Set as App Icon
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will replace all icon sizes in your Assets.xcassets/AppIcon.appiconset
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">About These Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Bundle Identifier:</strong> Unique identifier for your app on the App Store. Cannot be changed after first submission.
              </p>
              <p>
                <strong>Version Number:</strong> User-facing version (e.g., 1.0.0). Increment for each release.
              </p>
              <p>
                <strong>Build Number:</strong> Internal build counter. Must be unique and increment with each upload to App Store Connect.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
