import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Save, RefreshCw, AlertCircle, Image as ImageIcon, Upload, Wand2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useToast } from '../hooks/use-toast';
import type { XcodeProjectInfo, XcodeServiceInfo } from '../../shared/types';
import type { APIProfile } from '../../shared/types/profile';

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
  const [iconMethod, setIconMethod] = useState<'openai' | 'openrouter' | 'upload'>('openai');
  const [iconPrompt, setIconPrompt] = useState('');
  const [changeRequest, setChangeRequest] = useState('');
  const [apiProfiles, setApiProfiles] = useState<APIProfile[]>([]);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [iconModel, setIconModel] = useState('openai/dall-e-3');
  const [generatedIconPath, setGeneratedIconPath] = useState<string | null>(null); // File path for setIcon
  const [generatedIconPreview, setGeneratedIconPreview] = useState<string | null>(null); // Data URL for display
  const [currentIconPath, setCurrentIconPath] = useState<string | null>(null);
  const [generatingIcon, setGeneratingIcon] = useState(false);
  const [settingIcon, setSettingIcon] = useState(false);
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project info on mount
  useEffect(() => {
    loadProjectInfo();
    loadApiProfiles();
  }, [projectId]);

  // Load current icon when service changes
  useEffect(() => {
    if (selectedService) {
      loadCurrentIcon();
    }
  }, [selectedService]);

  const loadApiProfiles = async () => {
    try {
      const result = await window.electronAPI.getAPIProfiles();
      if (result.success && result.data) {
        setApiProfiles(result.data.profiles);
      }
    } catch (error) {
      console.error('Failed to load API profiles:', error);
    }
  };

  // Helper function to find matching profile for current method
  const getMatchingProfile = (method: 'openai' | 'openrouter'): APIProfile | null => {
    if (method === 'openai') {
      // Look for OpenAI profile (baseUrl contains 'openai.com')
      return apiProfiles.find(p => p.baseUrl.toLowerCase().includes('openai.com')) || null;
    } else if (method === 'openrouter') {
      // Look for OpenRouter profile (baseUrl contains 'openrouter.ai')
      return apiProfiles.find(p => p.baseUrl.toLowerCase().includes('openrouter.ai')) || null;
    }
    return null;
  };

  const loadCurrentIcon = async () => {
    if (!selectedService) return;

    try {
      const result = await window.electronAPI.getCurrentAppIcon(projectId, selectedService);
      if (result.success && result.data) {
        setCurrentIconPath(result.data);
      } else {
        setCurrentIconPath(null);
      }
    } catch (error) {
      setCurrentIconPath(null);
    }
  };

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
    if (!iconPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt for icon generation',
        variant: 'destructive'
      });
      return;
    }

    // Try to find matching profile for current method
    const matchingProfile = getMatchingProfile(iconMethod);
    let apiKey = '';

    if (matchingProfile) {
      // Use API key from matching profile
      apiKey = matchingProfile.apiKey;
    } else {
      // Use manual API key
      if (!openaiApiKey.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter an API key or configure a profile in Settings',
          variant: 'destructive'
        });
        return;
      }
      apiKey = openaiApiKey;
    }

    // Build prompt with change request if provided
    let fullPrompt = iconPrompt;
    if (changeRequest.trim()) {
      fullPrompt = `${iconPrompt}\n\nChanges requested: ${changeRequest}`;
    }

    setGeneratingIcon(true);
    try {
      const result = await window.electronAPI.generateAppIcon(projectId, {
        serviceName: selectedService,
        method: iconMethod,
        prompt: fullPrompt,
        apiKey,
        model: iconModel
      });

      if (result.success && result.data?.imageUrl && result.data?.previewUrl) {
        setGeneratedIconPath(result.data.imageUrl);
        setGeneratedIconPreview(result.data.previewUrl);
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

        if (result.success && result.data?.imageUrl && result.data?.previewUrl) {
          setGeneratedIconPath(result.data.imageUrl);
          setGeneratedIconPreview(result.data.previewUrl);
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
        setGeneratedIconPreview(null);
        setIconPrompt('');
        setChangeRequest(''); // Clear change request
        await loadCurrentIcon(); // Reload current icon
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Manage App</h1>
              <p className="text-sm text-muted-foreground">
                Configure bundle identifier, version, and build number
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Target selector */}
            {currentService && currentService.targets.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Target:</Label>
                <Select value={selectedTarget} onValueChange={handleTargetChange}>
                  <SelectTrigger className="w-[200px]">
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
              </div>
            )}
            <Button onClick={loadProjectInfo} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="h-full max-w-7xl mx-auto">
          {/* Service selector (if multiple services) */}
          {projectInfo.services.length > 1 && (
            <Card className="mb-6">
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

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left column: Configuration form */}
            <Card className="h-fit">
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

            {/* Right column: App Icon Management */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  App Icon
                </CardTitle>
                <CardDescription>
                  Manage your app's icon with AI generation or upload
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Icon Display */}
                <div className="space-y-3">
                  <Label>Current App Icon</Label>
                  {currentIconPath ? (
                    <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
                      <img
                        src={currentIconPath}
                        alt="Current app icon"
                        className="w-32 h-32 rounded-2xl shadow-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg border-2 border-dashed">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No icon found</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Dialog open={iconModalOpen} onOpenChange={setIconModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate with AI
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Generate App Icon</DialogTitle>
                        <DialogDescription>
                          Use AI to generate a custom app icon from your description
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        {/* AI Provider Selection */}
                        <div className="space-y-2">
                          <Label>AI Provider</Label>
                          <Select value={iconMethod} onValueChange={(value) => setIconMethod(value as 'openai' | 'openrouter')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI DALL-E 3</SelectItem>
                              <SelectItem value="openrouter">OpenRouter</SelectItem>
                            </SelectContent>
                          </Select>
                          {(() => {
                            const matchingProfile = getMatchingProfile(iconMethod);
                            return matchingProfile ? (
                              <p className="text-xs text-muted-foreground">
                                Using API key from profile: <span className="font-medium">{matchingProfile.name}</span>
                              </p>
                            ) : null;
                          })()}
                        </div>

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

                        {/* API Key (only show if no matching profile found) */}
                        {!getMatchingProfile(iconMethod) && (
                          <div className="space-y-2">
                            <Label htmlFor="iconApiKey">
                              {iconMethod === 'openai' ? 'OpenAI API Key' : 'OpenRouter API Key'}
                            </Label>
                            <Input
                              id="iconApiKey"
                              type="password"
                              value={openaiApiKey}
                              onChange={(e) => setOpenaiApiKey(e.target.value)}
                              placeholder={iconMethod === 'openai' ? 'sk-...' : 'sk-or-v1-...'}
                            />
                            <p className="text-xs text-muted-foreground">
                              {iconMethod === 'openai'
                                ? 'Your OpenAI API key from platform.openai.com. Or configure a profile in Settings.'
                                : 'Your OpenRouter API key from openrouter.ai. Or configure a profile in Settings.'}
                            </p>
                          </div>
                        )}

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

                        {/* Preview and Set Icon */}
                        {generatedIconPreview && (
                          <>
                            <div className="border-t" />
                            <div className="space-y-3">
                              <Label>Generated Icon Preview</Label>
                              <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
                                <img
                                  src={generatedIconPreview}
                                  alt="Generated icon"
                                  className="w-32 h-32 rounded-2xl shadow-lg"
                                />
                              </div>

                              {/* Request Changes */}
                              <div className="space-y-2">
                                <Label htmlFor="changeRequest">Request Changes (Optional)</Label>
                                <Textarea
                                  id="changeRequest"
                                  value={changeRequest}
                                  onChange={(e) => setChangeRequest(e.target.value)}
                                  placeholder="Make the icon darker, add more detail to the center, etc."
                                  rows={2}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Describe changes you'd like to make to this icon
                                </p>
                              </div>

                              {/* Regenerate with changes button */}
                              {changeRequest.trim() && (
                                <Button
                                  onClick={handleGenerateIcon}
                                  disabled={generatingIcon}
                                  variant="outline"
                                  className="w-full"
                                >
                                  {generatingIcon ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Regenerating...
                                    </>
                                  ) : (
                                    <>
                                      <Wand2 className="h-4 w-4 mr-2" />
                                      Regenerate with Changes
                                    </>
                                  )}
                                </Button>
                              )}

                              {/* Set Icon button */}
                              <Button
                                onClick={() => {
                                  handleSetIcon();
                                  setIconModalOpen(false);
                                }}
                                disabled={settingIcon}
                                className="w-full"
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
                              <p className="text-xs text-muted-foreground text-center">
                                This will replace all icon sizes in Assets.xcassets
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Upload Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={generatingIcon}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadIcon}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
