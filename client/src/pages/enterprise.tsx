import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2, Shield, Globe, Server, Save, Loader2,
  CheckCircle, XCircle, Activity, Zap, MapPin
} from "lucide-react";
import type { Setting } from "@shared/schema";

interface SsoConfig {
  enabled: boolean;
  provider: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  domains: string;
}

interface RegionConfig {
  primaryRegion: string;
  failoverEnabled: boolean;
  regions: Record<string, { enabled: boolean }>;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  ipWhitelist: string;
}

const defaultSsoConfig: SsoConfig = {
  enabled: false,
  provider: "saml",
  entityId: "",
  ssoUrl: "",
  certificate: "",
  domains: "",
};

const deploymentRegions = [
  { id: "us-east-1", name: "US East", location: "Virginia", latency: "12ms" },
  { id: "us-west-2", name: "US West", location: "Oregon", latency: "45ms" },
  { id: "eu-west-1", name: "EU West", location: "Ireland", latency: "89ms" },
  { id: "eu-central-1", name: "EU Central", location: "Frankfurt", latency: "95ms" },
  { id: "ap-southeast-1", name: "AP Southeast", location: "Singapore", latency: "142ms" },
  { id: "ap-northeast-1", name: "AP Northeast", location: "Tokyo", latency: "158ms" },
];

const defaultRegionConfig: RegionConfig = {
  primaryRegion: "us-east-1",
  failoverEnabled: false,
  regions: Object.fromEntries(
    deploymentRegions.map((r) => [r.id, { enabled: r.id === "us-east-1" }])
  ),
};

const defaultRateLimitConfig: RateLimitConfig = {
  requestsPerMinute: 60,
  burstLimit: 100,
  ipWhitelist: "",
};

function useSettingValue<T>(settings: Setting[] | undefined, category: string, key: string, defaultValue: T): T {
  const setting = settings?.find((s) => s.category === category && s.key === key);
  return (setting?.value as T) ?? defaultValue;
}

function EnterpriseSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SsoTab({ isLoading: _parentLoading }: { settings?: Setting[]; isLoading: boolean }) {
  const { toast } = useToast();

  const { data: ssoData, isLoading } = useQuery<Partial<SsoConfig>>({
    queryKey: ["/api/sso/config"],
  });

  const [config, setConfig] = useState<SsoConfig>(defaultSsoConfig);

  useEffect(() => {
    if (ssoData) {
      setConfig({
        enabled: ssoData.enabled ?? false,
        provider: ssoData.provider ?? "saml",
        entityId: ssoData.entityId ?? "",
        ssoUrl: ssoData.ssoUrl ?? "",
        certificate: ssoData.certificate ?? "",
        domains: ssoData.domains ?? "",
      });
    }
  }, [ssoData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/sso/config", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sso/config"] });
      toast({ title: "SSO configuration saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save SSO configuration", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <EnterpriseSkeleton />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-semibold">SSO Configuration</CardTitle>
            {config.enabled ? (
              <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 dark:text-green-400 gap-1" data-testid="badge-sso-status">
                <CheckCircle className="w-3 h-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground gap-1" data-testid="badge-sso-status">
                <XCircle className="w-3 h-3" />
                Disabled
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sso-toggle" className="text-sm text-muted-foreground">Enable SSO</Label>
            <Switch
              id="sso-toggle"
              data-testid="switch-sso-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig((c) => ({ ...c, enabled: checked }))}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sso-provider" className="text-sm font-medium">Identity Provider</Label>
            <Select
              value={config.provider}
              onValueChange={(v) => setConfig((c) => ({ ...c, provider: v }))}
            >
              <SelectTrigger id="sso-provider" data-testid="select-sso-provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saml">SAML 2.0</SelectItem>
                <SelectItem value="oidc">OpenID Connect (OIDC)</SelectItem>
                <SelectItem value="azure-ad">Azure Active Directory</SelectItem>
                <SelectItem value="okta">Okta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sso-entity-id" className="text-sm font-medium">Entity ID</Label>
            <Input
              id="sso-entity-id"
              data-testid="input-sso-entity-id"
              placeholder="https://your-idp.example.com/entity-id"
              value={config.entityId}
              onChange={(e) => setConfig((c) => ({ ...c, entityId: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sso-url" className="text-sm font-medium">SSO URL</Label>
            <Input
              id="sso-url"
              data-testid="input-sso-url"
              placeholder="https://your-idp.example.com/sso/saml"
              value={config.ssoUrl}
              onChange={(e) => setConfig((c) => ({ ...c, ssoUrl: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sso-certificate" className="text-sm font-medium">Certificate</Label>
            <Textarea
              id="sso-certificate"
              data-testid="input-sso-certificate"
              placeholder="-----BEGIN CERTIFICATE-----&#10;Paste your X.509 certificate here&#10;-----END CERTIFICATE-----"
              rows={5}
              value={config.certificate}
              onChange={(e) => setConfig((c) => ({ ...c, certificate: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sso-domains" className="text-sm font-medium">Allowed Domains</Label>
            <Input
              id="sso-domains"
              data-testid="input-sso-domains"
              placeholder="example.com, corp.example.com"
              value={config.domains}
              onChange={(e) => setConfig((c) => ({ ...c, domains: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of email domains allowed for SSO login.</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              data-testid="button-save-sso"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save SSO Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MultiRegionTab({ isLoading: _parentLoading }: { settings?: Setting[]; isLoading: boolean }) {
  const { toast } = useToast();

  interface RegionInfo { id: string; name: string; latency: string; status: string; }
  const { data: regionsData, isLoading } = useQuery<RegionInfo[]>({
    queryKey: ["/api/deployment/regions"],
  });

  const [config, setConfig] = useState<RegionConfig>(defaultRegionConfig);

  useEffect(() => {
    if (regionsData) {
      const regionMap: Record<string, { enabled: boolean }> = {};
      regionsData.forEach((r) => {
        regionMap[r.id] = { enabled: r.status !== "disabled" };
      });
      const primary = regionsData.find((r) => r.status === "active");
      setConfig((c) => ({
        ...c,
        regions: regionMap,
        primaryRegion: primary?.id || c.primaryRegion,
      }));
    }
  }, [regionsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const regionStatuses: Record<string, string> = {};
      Object.entries(config.regions).forEach(([id, val]) => {
        if (!val.enabled) regionStatuses[id] = "disabled";
        else if (id === config.primaryRegion) regionStatuses[id] = "active";
        else regionStatuses[id] = "standby";
      });
      await apiRequest("PUT", "/api/deployment/config", {
        regions: regionStatuses,
        primaryRegion: config.primaryRegion,
        failoverEnabled: config.failoverEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployment/regions"] });
      toast({ title: "Deployment configuration saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save deployment config", description: err.message, variant: "destructive" });
    },
  });

  const toggleRegion = (regionId: string, enabled: boolean) => {
    setConfig((c) => ({
      ...c,
      regions: {
        ...c.regions,
        [regionId]: { enabled },
      },
    }));
  };

  const getRegionStatus = (regionId: string): "active" | "standby" | "disabled" => {
    const enabled = config.regions[regionId]?.enabled ?? false;
    if (!enabled) return "disabled";
    if (regionId === config.primaryRegion) return "active";
    return "standby";
  };

  if (isLoading) return <EnterpriseSkeleton />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">Deployment Regions</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="failover-toggle" className="text-sm text-muted-foreground">Automatic Failover</Label>
            <Switch
              id="failover-toggle"
              data-testid="switch-failover"
              checked={config.failoverEnabled}
              onCheckedChange={(checked) => setConfig((c) => ({ ...c, failoverEnabled: checked }))}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Primary Region</Label>
            <Select
              value={config.primaryRegion}
              onValueChange={(v) => setConfig((c) => ({ ...c, primaryRegion: v }))}
            >
              <SelectTrigger data-testid="select-primary-region">
                <SelectValue placeholder="Select primary region" />
              </SelectTrigger>
              <SelectContent>
                {deploymentRegions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.location})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {deploymentRegions.map((region) => {
              const status = getRegionStatus(region.id);
              const enabled = config.regions[region.id]?.enabled ?? false;
              return (
                <Card key={region.id} data-testid={`card-region-${region.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{region.name}</div>
                          <div className="text-xs text-muted-foreground">{region.location}</div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        data-testid={`badge-region-status-${region.id}`}
                        className={
                          status === "active"
                            ? "text-xs border-green-500/30 text-green-600 dark:text-green-400 shrink-0"
                            : status === "standby"
                            ? "text-xs border-yellow-500/30 text-yellow-600 dark:text-yellow-400 shrink-0"
                            : "text-xs border-muted-foreground/30 text-muted-foreground shrink-0"
                        }
                      >
                        {status === "active" ? "Active" : status === "standby" ? "Standby" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Activity className="w-3 h-3" />
                        <span data-testid={`text-latency-${region.id}`}>{region.latency}</span>
                      </div>
                      <Switch
                        data-testid={`switch-region-${region.id}`}
                        checked={enabled}
                        onCheckedChange={(checked) => toggleRegion(region.id, checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              data-testid="button-save-regions"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Deployment Config
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">API Rate Limiting</CardTitle>
        </CardHeader>
        <CardContent>
          <RateLimitSection settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}

function RateLimitSection({ settings }: { settings: Setting[] | undefined }) {
  const { toast } = useToast();
  const rateLimitData = useSettingValue<RateLimitConfig>(settings, "deployment", "rate_limit", defaultRateLimitConfig);

  const [config, setConfig] = useState<RateLimitConfig>(defaultRateLimitConfig);

  useEffect(() => {
    if (rateLimitData) {
      setConfig({ ...defaultRateLimitConfig, ...rateLimitData });
    }
  }, [rateLimitData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/deployment/config", { rateLimit: config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Rate limiting configuration saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save rate limit config", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rate-rpm" className="text-sm font-medium">Requests Per Minute</Label>
          <Input
            id="rate-rpm"
            data-testid="input-rate-rpm"
            type="number"
            min={1}
            value={config.requestsPerMinute}
            onChange={(e) => setConfig((c) => ({ ...c, requestsPerMinute: parseInt(e.target.value) || 60 }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-burst" className="text-sm font-medium">Burst Limit</Label>
          <Input
            id="rate-burst"
            data-testid="input-rate-burst"
            type="number"
            min={1}
            value={config.burstLimit}
            onChange={(e) => setConfig((c) => ({ ...c, burstLimit: parseInt(e.target.value) || 100 }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rate-whitelist" className="text-sm font-medium">IP Whitelist</Label>
        <Textarea
          id="rate-whitelist"
          data-testid="input-rate-whitelist"
          placeholder="Enter IP addresses, one per line&#10;192.168.1.0/24&#10;10.0.0.1"
          rows={4}
          value={config.ipWhitelist}
          onChange={(e) => setConfig((c) => ({ ...c, ipWhitelist: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">IPs or CIDR ranges exempt from rate limiting, one per line.</p>
      </div>
      <div className="flex justify-end pt-2">
        <Button
          data-testid="button-save-rate-limit"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Rate Limits
        </Button>
      </div>
    </div>
  );
}

export default function Enterprise() {
  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-enterprise-title">Enterprise</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure enterprise features including SSO, multi-region deployment, and API rate limiting.
        </p>
      </div>

      <Tabs defaultValue="sso" data-testid="tabs-enterprise">
        <TabsList>
          <TabsTrigger value="sso" data-testid="tab-sso">
            <Shield className="w-4 h-4 mr-1.5" />
            SSO
          </TabsTrigger>
          <TabsTrigger value="multi-region" data-testid="tab-multi-region">
            <Globe className="w-4 h-4 mr-1.5" />
            Multi-Region
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sso" className="mt-4">
          <SsoTab settings={settings} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="multi-region" className="mt-4">
          <MultiRegionTab settings={settings} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
