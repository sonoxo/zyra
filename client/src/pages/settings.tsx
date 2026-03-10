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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2, ScanSearch, ShieldCheck, Bell, Database, Sparkles,
  ClipboardList, Save, Loader2
} from "lucide-react";
import type { Setting, AuditLog } from "@shared/schema";
import type { AuthUser } from "@/lib/auth";

function useSettingValue(settings: Setting[] | undefined, category: string, key: string, defaultValue: any) {
  const setting = settings?.find((s) => s.category === category && s.key === key);
  return setting?.value ?? defaultValue;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function OrganizationTab({ settings, isLoading }: { settings: Setting[] | undefined; isLoading: boolean }) {
  const { data: user } = useQuery<AuthUser>({ queryKey: ["/api/auth/me"] });

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Organization Name</Label>
              <p data-testid="text-org-name" className="text-sm text-muted-foreground mt-1">
                {user?.organization?.name || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Current Plan</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge data-testid="text-org-plan" variant="outline" className="capitalize">
                  {user?.organization?.plan || "starter"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Organization Slug</Label>
              <p data-testid="text-org-slug" className="text-sm text-muted-foreground mt-1 font-mono">
                {user?.organization?.slug || "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScanningTab({ settings, isLoading, onSave }: { settings: Setting[] | undefined; isLoading: boolean; onSave: (category: string, key: string, value: any) => void }) {
  const autoScan = useSettingValue(settings, "scanning", "auto_scan_on_push", false);
  const defaultTools = useSettingValue(settings, "scanning", "default_tools", ["semgrep"]);
  const scanTimeout = useSettingValue(settings, "scanning", "scan_timeout", 300);

  const [localAutoScan, setLocalAutoScan] = useState(autoScan);
  const [localTools, setLocalTools] = useState<string[]>(defaultTools);
  const [localTimeout, setLocalTimeout] = useState(String(scanTimeout));

  useEffect(() => {
    setLocalAutoScan(autoScan);
    setLocalTools(Array.isArray(defaultTools) ? defaultTools : ["semgrep"]);
    setLocalTimeout(String(scanTimeout));
  }, [autoScan, JSON.stringify(defaultTools), scanTimeout]);

  if (isLoading) return <SettingsSkeleton />;

  const tools = [
    { id: "semgrep", label: "Semgrep" },
    { id: "trivy", label: "Trivy" },
    { id: "bandit", label: "Bandit" },
    { id: "zap", label: "OWASP ZAP" },
  ];

  function toggleTool(toolId: string) {
    setLocalTools((prev) =>
      prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId]
    );
  }

  function handleSave() {
    onSave("scanning", "auto_scan_on_push", localAutoScan);
    onSave("scanning", "default_tools", localTools);
    onSave("scanning", "scan_timeout", Number(localTimeout));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Scan Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-scan on Push</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically trigger scans when code is pushed</p>
            </div>
            <Switch
              data-testid="switch-auto-scan"
              checked={localAutoScan}
              onCheckedChange={setLocalAutoScan}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Default Scan Tools</Label>
            <div className="grid grid-cols-2 gap-3">
              {tools.map((tool) => (
                <div key={tool.id} className="flex items-center gap-2">
                  <Checkbox
                    data-testid={`checkbox-tool-${tool.id}`}
                    id={`tool-${tool.id}`}
                    checked={localTools.includes(tool.id)}
                    onCheckedChange={() => toggleTool(tool.id)}
                  />
                  <Label htmlFor={`tool-${tool.id}`} className="text-sm cursor-pointer">
                    {tool.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="scan-timeout" className="text-sm font-medium">Scan Timeout (seconds)</Label>
            <Input
              data-testid="input-scan-timeout"
              id="scan-timeout"
              type="number"
              className="mt-1.5 max-w-xs"
              value={localTimeout}
              onChange={(e) => setLocalTimeout(e.target.value)}
            />
          </div>

          <Button data-testid="button-save-scanning" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Scanning Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceTab({ settings, isLoading, onSave }: { settings: Setting[] | undefined; isLoading: boolean; onSave: (category: string, key: string, value: any) => void }) {
  const activeFrameworks = useSettingValue(settings, "compliance", "active_frameworks", ["SOC2", "HIPAA"]);
  const assessmentFrequency = useSettingValue(settings, "compliance", "assessment_frequency", "monthly");

  const [localFrameworks, setLocalFrameworks] = useState<string[]>(activeFrameworks);
  const [localFrequency, setLocalFrequency] = useState(assessmentFrequency);

  useEffect(() => {
    setLocalFrameworks(Array.isArray(activeFrameworks) ? activeFrameworks : ["SOC2", "HIPAA"]);
    setLocalFrequency(assessmentFrequency);
  }, [JSON.stringify(activeFrameworks), assessmentFrequency]);

  if (isLoading) return <SettingsSkeleton />;

  const frameworks = [
    { id: "SOC2", label: "SOC 2" },
    { id: "HIPAA", label: "HIPAA" },
    { id: "ISO27001", label: "ISO 27001" },
    { id: "PCI-DSS", label: "PCI-DSS" },
    { id: "FedRAMP", label: "FedRAMP" },
    { id: "GDPR", label: "GDPR" },
  ];

  function toggleFramework(fw: string) {
    setLocalFrameworks((prev) =>
      prev.includes(fw) ? prev.filter((f) => f !== fw) : [...prev, fw]
    );
  }

  function handleSave() {
    onSave("compliance", "active_frameworks", localFrameworks);
    onSave("compliance", "assessment_frequency", localFrequency);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Compliance Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Active Frameworks</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {frameworks.map((fw) => (
                <div key={fw.id} className="flex items-center gap-2">
                  <Checkbox
                    data-testid={`checkbox-framework-${fw.id}`}
                    id={`fw-${fw.id}`}
                    checked={localFrameworks.includes(fw.id)}
                    onCheckedChange={() => toggleFramework(fw.id)}
                  />
                  <Label htmlFor={`fw-${fw.id}`} className="text-sm cursor-pointer">
                    {fw.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Assessment Frequency</Label>
            <Select
              data-testid="select-assessment-frequency"
              value={localFrequency}
              onValueChange={setLocalFrequency}
            >
              <SelectTrigger data-testid="select-trigger-assessment-frequency" className="mt-1.5 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button data-testid="button-save-compliance" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Compliance Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab({ settings, isLoading, onSave }: { settings: Setting[] | undefined; isLoading: boolean; onSave: (category: string, key: string, value: any) => void }) {
  const emailAlerts = useSettingValue(settings, "notifications", "email_alerts", true);
  const scanAlerts = useSettingValue(settings, "notifications", "scan_completion_alerts", true);
  const complianceAlerts = useSettingValue(settings, "notifications", "compliance_alerts", false);
  const webhookUrl = useSettingValue(settings, "notifications", "webhook_url", "");

  const [localEmail, setLocalEmail] = useState(emailAlerts);
  const [localScan, setLocalScan] = useState(scanAlerts);
  const [localCompliance, setLocalCompliance] = useState(complianceAlerts);
  const [localWebhook, setLocalWebhook] = useState(webhookUrl);

  useEffect(() => {
    setLocalEmail(emailAlerts);
    setLocalScan(scanAlerts);
    setLocalCompliance(complianceAlerts);
    setLocalWebhook(webhookUrl || "");
  }, [emailAlerts, scanAlerts, complianceAlerts, webhookUrl]);

  if (isLoading) return <SettingsSkeleton />;

  function handleSave() {
    onSave("notifications", "email_alerts", localEmail);
    onSave("notifications", "scan_completion_alerts", localScan);
    onSave("notifications", "compliance_alerts", localCompliance);
    onSave("notifications", "webhook_url", localWebhook);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Email Alerts</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Receive security alerts via email</p>
            </div>
            <Switch
              data-testid="switch-email-alerts"
              checked={localEmail}
              onCheckedChange={setLocalEmail}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Scan Completion Alerts</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Get notified when scans complete</p>
            </div>
            <Switch
              data-testid="switch-scan-alerts"
              checked={localScan}
              onCheckedChange={setLocalScan}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Compliance Alerts</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Alerts for compliance status changes</p>
            </div>
            <Switch
              data-testid="switch-compliance-alerts"
              checked={localCompliance}
              onCheckedChange={setLocalCompliance}
            />
          </div>

          <div>
            <Label htmlFor="webhook-url" className="text-sm font-medium">Webhook URL</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Send notifications to an external webhook</p>
            <Input
              data-testid="input-webhook-url"
              id="webhook-url"
              type="url"
              placeholder="https://hooks.example.com/webhook"
              className="max-w-lg"
              value={localWebhook}
              onChange={(e) => setLocalWebhook(e.target.value)}
            />
          </div>

          <Button data-testid="button-save-notifications" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Notification Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RetentionTab({ settings, isLoading, onSave }: { settings: Setting[] | undefined; isLoading: boolean; onSave: (category: string, key: string, value: any) => void }) {
  const scanRetention = useSettingValue(settings, "retention", "scan_retention_days", 90);
  const reportRetention = useSettingValue(settings, "retention", "report_retention_days", 365);
  const autoArchive = useSettingValue(settings, "retention", "auto_archive", false);

  const [localScanRet, setLocalScanRet] = useState(String(scanRetention));
  const [localReportRet, setLocalReportRet] = useState(String(reportRetention));
  const [localAutoArchive, setLocalAutoArchive] = useState(autoArchive);

  useEffect(() => {
    setLocalScanRet(String(scanRetention));
    setLocalReportRet(String(reportRetention));
    setLocalAutoArchive(autoArchive);
  }, [scanRetention, reportRetention, autoArchive]);

  if (isLoading) return <SettingsSkeleton />;

  function handleSave() {
    onSave("retention", "scan_retention_days", Number(localScanRet));
    onSave("retention", "report_retention_days", Number(localReportRet));
    onSave("retention", "auto_archive", localAutoArchive);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Data Retention Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium">Scan Data Retention</Label>
            <Select value={localScanRet} onValueChange={setLocalScanRet}>
              <SelectTrigger data-testid="select-trigger-scan-retention" className="mt-1.5 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Report Retention</Label>
            <Select value={localReportRet} onValueChange={setLocalReportRet}>
              <SelectTrigger data-testid="select-trigger-report-retention" className="mt-1.5 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-Archive</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically archive old scan data</p>
            </div>
            <Switch
              data-testid="switch-auto-archive"
              checked={localAutoArchive}
              onCheckedChange={setLocalAutoArchive}
            />
          </div>

          <Button data-testid="button-save-retention" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Retention Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AIReportsTab({ settings, isLoading, onSave }: { settings: Setting[] | undefined; isLoading: boolean; onSave: (category: string, key: string, value: any) => void }) {
  const aiEnabled = useSettingValue(settings, "ai_reports", "ai_enabled", true);
  const detailLevel = useSettingValue(settings, "ai_reports", "detail_level", "standard");
  const autoGenerate = useSettingValue(settings, "ai_reports", "auto_generate_after_scan", false);

  const [localAi, setLocalAi] = useState(aiEnabled);
  const [localDetail, setLocalDetail] = useState(detailLevel);
  const [localAutoGen, setLocalAutoGen] = useState(autoGenerate);

  useEffect(() => {
    setLocalAi(aiEnabled);
    setLocalDetail(detailLevel);
    setLocalAutoGen(autoGenerate);
  }, [aiEnabled, detailLevel, autoGenerate]);

  if (isLoading) return <SettingsSkeleton />;

  function handleSave() {
    onSave("ai_reports", "ai_enabled", localAi);
    onSave("ai_reports", "detail_level", localDetail);
    onSave("ai_reports", "auto_generate_after_scan", localAutoGen);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">AI Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">AI-Powered Analysis</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Enable AI-generated insights in reports</p>
            </div>
            <Switch
              data-testid="switch-ai-enabled"
              checked={localAi}
              onCheckedChange={setLocalAi}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Report Detail Level</Label>
            <Select value={localDetail} onValueChange={setLocalDetail}>
              <SelectTrigger data-testid="select-trigger-detail-level" className="mt-1.5 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-Generate After Scan</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically create reports when scans complete</p>
            </div>
            <Switch
              data-testid="switch-auto-generate"
              checked={localAutoGen}
              onCheckedChange={setLocalAutoGen}
            />
          </div>

          <Button data-testid="button-save-ai-reports" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save AI Report Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditLogTab() {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({ queryKey: ["/api/audit-logs"] });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Audit Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No audit log entries yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`audit-log-row-${log.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.resourceType ? `${log.resourceType}` : "—"}
                        {log.resourceId ? ` (${log.resourceId.slice(0, 8)}...)` : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const tabConfig = [
  { value: "organization", label: "Organization", icon: Building2 },
  { value: "scanning", label: "Scanning", icon: ScanSearch },
  { value: "compliance", label: "Compliance", icon: ShieldCheck },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "retention", label: "Data Retention", icon: Database },
  { value: "ai_reports", label: "AI Reports", icon: Sparkles },
  { value: "audit_log", label: "Audit Log", icon: ClipboardList },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("organization");

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const visibleTabs = isAdmin ? tabConfig : tabConfig.filter((t) => t.value !== "audit_log");

  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ category, key, value }: { category: string; key: string; value: any }) => {
      await apiRequest("PUT", "/api/settings", { category, key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  function handleSave(category: string, key: string, value: any) {
    saveMutation.mutate(
      { category, key, value },
      {
        onSuccess: () => {
          toast({ title: "Settings saved", description: `${category} / ${key} updated successfully.` });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to save setting", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 backdrop-blur px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your organization and platform configuration</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-1" data-testid="settings-tabs">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                data-testid={`tab-${tab.value}`}
                className="gap-1.5"
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="organization">
            <OrganizationTab settings={settings} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="scanning">
            <ScanningTab settings={settings} isLoading={isLoading} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceTab settings={settings} isLoading={isLoading} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab settings={settings} isLoading={isLoading} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="retention">
            <RetentionTab settings={settings} isLoading={isLoading} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="ai_reports">
            <AIReportsTab settings={settings} isLoading={isLoading} onSave={handleSave} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="audit_log">
              <AuditLogTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
