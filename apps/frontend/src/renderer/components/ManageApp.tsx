import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '../hooks/use-toast';
import type { XcodeProjectInfo, XcodeServiceInfo } from '../../shared/types';

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
  const [formData, setFormData] = useState({
    bundleIdentifier: '',
    version: '',
    buildNumber: ''
  });

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
          setFormData({
            bundleIdentifier: firstService.bundleIdentifier,
            version: firstService.version,
            buildNumber: firstService.buildNumber
          });
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
    if (service) {
      setFormData({
        bundleIdentifier: service.bundleIdentifier,
        version: service.version,
        buildNumber: service.buildNumber
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await window.electronAPI.updateXcodeProject(projectId, {
        serviceName: selectedService,
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
              {currentService && (
                <div className="rounded-lg bg-muted p-4 space-y-1">
                  <p className="text-sm font-medium">Current Values:</p>
                  <p className="text-xs text-muted-foreground">
                    Bundle ID: {currentService.bundleIdentifier}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Version: {currentService.version}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Build: {currentService.buildNumber}
                  </p>
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
