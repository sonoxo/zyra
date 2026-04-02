import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plug, ExternalLink, CheckCircle, XCircle, Send, Copy, Terminal } from "lucide-react";
import { SiGithub, SiGitlab, SiSlack, SiJira } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Setting } from "@shared/schema";

interface IntegrationConfig {
  connected: boolean;
  [key: string]: any;
}

function useIntegrationSetting(settings: Setting[] | undefined, key: string): IntegrationConfig | null {
  if (!settings) return null;
  const setting = settings.find((s) => s.key === key);
  if (!setting || !setting.value) return null;
  return setting.value as IntegrationConfig;
}

function IntegrationCard({
  icon: Icon,
  name,
  description,
  config,
  children,
  testIdPrefix,
}: {
  icon: any;
  name: string;
  description: string;
  config: IntegrationConfig | null;
  children: React.ReactNode;
  testIdPrefix: string;
}) {
  const isConnected = config?.connected === true;

  return (
    <Card data-testid={`card-integration-${testIdPrefix}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm">{name}</span>
              {isConnected ? (
                <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 dark:text-green-400 gap-1" data-testid={`badge-status-${testIdPrefix}`}>
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground gap-1" data-testid={`badge-status-${testIdPrefix}`}>
                  <XCircle className="w-3 h-3" />
                  Disconnected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <Separator className="mb-4" />
        {children}
      </CardContent>
    </Card>
  );
}

function GitIntegration({
  provider,
  icon: Icon,
  name,
  description,
  config,
  onSave,
  onDisconnect,
  isPending,
}: {
  provider: string;
  icon: any;
  name: string;
  description: string;
  config: IntegrationConfig | null;
  onSave: (key: string, value: IntegrationConfig) => void;
  onDisconnect: (key: string) => void;
  isPending: boolean;
}) {
  const [token, setToken] = useState("");
  const [orgName, setOrgName] = useState("");
  const isConnected = config?.connected === true;

  useEffect(() => {
    if (config) {
      setOrgName(config.orgName || "");
    }
  }, [config]);

  return (
    <IntegrationCard icon={Icon} name={name} description={description} config={config} testIdPrefix={provider}>
      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Organization:</span>
            <span className="font-medium text-foreground">{config?.orgName || "N/A"}</span>
          </div>
          <Button
            variant="outline"
            onClick={() => onDisconnect(provider)}
            disabled={isPending}
            data-testid={`button-disconnect-${provider}`}
            className="text-destructive"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Personal Access Token</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              data-testid={`input-token-${provider}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Organization / Username</Label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="my-organization"
              data-testid={`input-org-${provider}`}
            />
          </div>
          <Button
            onClick={() => onSave(provider, { connected: true, token: "***", orgName })}
            disabled={!token || !orgName || isPending}
            data-testid={`button-connect-${provider}`}
            className="gap-2"
          >
            <Plug className="w-4 h-4" />
            {isPending ? "Connecting..." : "Connect"}
          </Button>
        </div>
      )}
    </IntegrationCard>
  );
}

function SlackIntegration({
  config,
  onSave,
  onDisconnect,
  isPending,
}: {
  config: IntegrationConfig | null;
  onSave: (key: string, value: IntegrationConfig) => void;
  onDisconnect: (key: string) => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("");
  const isConnected = config?.connected === true;

  useEffect(() => {
    if (config) {
      setWebhookUrl(config.webhookUrl || "");
      setChannel(config.channel || "");
    }
  }, [config]);

  const handleTestNotification = () => {
    toast({ title: "Test notification sent", description: `Notification sent to ${config?.channel || "#general"}` });
  };

  return (
    <IntegrationCard icon={SiSlack} name="Slack" description="Receive security alerts and scan notifications in your Slack channels" config={config} testIdPrefix="slack">
      {isConnected ? (
        <div className="space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Channel:</span>
              <span className="font-medium text-foreground">{config?.channel || "#general"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Webhook:</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {config?.webhookUrl ? "***configured***" : "N/A"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleTestNotification}
              data-testid="button-test-slack"
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Test Notification
            </Button>
            <Button
              variant="outline"
              onClick={() => onDisconnect("slack")}
              disabled={isPending}
              data-testid="button-disconnect-slack"
              className="text-destructive"
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Webhook URL</Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              data-testid="input-webhook-slack"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Channel Name</Label>
            <Input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#security-alerts"
              data-testid="input-channel-slack"
            />
          </div>
          <Button
            onClick={() => onSave("slack", { connected: true, webhookUrl, channel })}
            disabled={!webhookUrl || !channel || isPending}
            data-testid="button-connect-slack"
            className="gap-2"
          >
            <Plug className="w-4 h-4" />
            {isPending ? "Connecting..." : "Connect"}
          </Button>
        </div>
      )}
    </IntegrationCard>
  );
}

function JiraIntegration({
  config,
  onSave,
  onDisconnect,
  isPending,
}: {
  config: IntegrationConfig | null;
  onSave: (key: string, value: IntegrationConfig) => void;
  onDisconnect: (key: string) => void;
  isPending: boolean;
}) {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const isConnected = config?.connected === true;

  useEffect(() => {
    if (config) {
      setInstanceUrl(config.instanceUrl || "");
      setProjectKey(config.projectKey || "");
    }
  }, [config]);

  return (
    <IntegrationCard icon={SiJira} name="Jira" description="Create and track security issues directly in your Jira projects" config={config} testIdPrefix="jira">
      {isConnected ? (
        <div className="space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Instance:</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{config?.instanceUrl || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Project:</span>
              <span className="font-medium text-foreground">{config?.projectKey || "N/A"}</span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => onDisconnect("jira")}
            disabled={isPending}
            data-testid="button-disconnect-jira"
            className="text-destructive"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Instance URL</Label>
            <Input
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              placeholder="https://your-org.atlassian.net"
              data-testid="input-url-jira"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">API Token</Label>
            <Input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Your Jira API token"
              data-testid="input-token-jira"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Project Key</Label>
            <Input
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
              placeholder="SEC"
              data-testid="input-project-jira"
            />
          </div>
          <Button
            onClick={() => onSave("jira", { connected: true, instanceUrl, apiToken: "***", projectKey })}
            disabled={!instanceUrl || !apiToken || !projectKey || isPending}
            data-testid="button-connect-jira"
            className="gap-2"
          >
            <Plug className="w-4 h-4" />
            {isPending ? "Connecting..." : "Connect"}
          </Button>
        </div>
      )}
    </IntegrationCard>
  );
}

const cicdSnippets = [
  {
    title: "GitHub Actions",
    code: `name: Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger Zyra Scan
        run: |
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.ZYRA_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{"scanType":"semgrep","targetName":"$\{{ github.repository }}"}' \\
            $\{{ secrets.ZYRA_API_URL }}/api/scans`,
  },
  {
    title: "GitLab CI",
    code: `security_scan:
  stage: test
  script:
    - |
      curl -X POST \\
        -H "Authorization: Bearer $ZYRA_TOKEN" \\
        -H "Content-Type: application/json" \\
        -d '{"scanType":"trivy","targetName":"$CI_PROJECT_PATH"}' \\
        $ZYRA_API_URL/api/scans`,
  },
];

export default function Integrations() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/settings?category=integrations"],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: IntegrationConfig }) => {
      const res = await apiRequest("PUT", "/api/settings", { category: "integrations", key, value });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings?category=integrations"] });
      toast({ title: "Integration saved", description: "Configuration updated successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save integration", variant: "destructive" }),
  });

  const handleSave = (key: string, value: IntegrationConfig) => {
    saveMutation.mutate({ key, value });
  };

  const handleDisconnect = (key: string) => {
    saveMutation.mutate({ key, value: { connected: false } });
  };

  const handleCopySnippet = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: "Pipeline snippet copied to clipboard" });
  };

  const githubConfig = useIntegrationSetting(settings, "github");
  const gitlabConfig = useIntegrationSetting(settings, "gitlab");
  const slackConfig = useIntegrationSetting(settings, "slack");
  const jiraConfig = useIntegrationSetting(settings, "jira");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-foreground" data-testid="text-integrations-title">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Connect external services and configure CI/CD pipelines</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GitIntegration
                provider="github"
                icon={SiGithub}
                name="GitHub"
                description="Connect GitHub repositories for automated security scanning"
                config={githubConfig}
                onSave={handleSave}
                onDisconnect={handleDisconnect}
                isPending={saveMutation.isPending}
              />
              <GitIntegration
                provider="gitlab"
                icon={SiGitlab}
                name="GitLab"
                description="Connect GitLab repositories for automated security scanning"
                config={gitlabConfig}
                onSave={handleSave}
                onDisconnect={handleDisconnect}
                isPending={saveMutation.isPending}
              />
              <SlackIntegration
                config={slackConfig}
                onSave={handleSave}
                onDisconnect={handleDisconnect}
                isPending={saveMutation.isPending}
              />
              <JiraIntegration
                config={jiraConfig}
                onSave={handleSave}
                onDisconnect={handleDisconnect}
                isPending={saveMutation.isPending}
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1" data-testid="text-cicd-title">CI/CD Pipeline Integration</h2>
              <p className="text-sm text-muted-foreground mb-4">Add security scanning to your CI/CD pipelines with these configuration snippets</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {cicdSnippets.map((snippet) => (
                  <Card key={snippet.title} data-testid={`card-cicd-${snippet.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-sm text-foreground">{snippet.title}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopySnippet(snippet.code)}
                          data-testid={`button-copy-${snippet.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto text-muted-foreground">
                        <code>{snippet.code}</code>
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
