import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Shield, CheckCircle, XCircle } from "lucide-react";

export default function AcceptInvitePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [inviteInfo, setInviteInfo] = useState<{ email: string; role: string; orgName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invite token provided");
      setLoading(false);
      return;
    }
    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Invalid invite");
        }
        return res.json();
      })
      .then((data) => {
        setInviteInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    if (!fullName || !username || !password) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", `/api/invite/${token}/accept`, {
        fullName,
        username,
        password,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to accept invite");
      setAccepted(true);
      toast({ title: "Welcome to Zyra!", description: "Your account has been created." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md" data-testid="card-accept-invite">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-white" />
          </div>
          {error ? (
            <>
              <XCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          ) : accepted ? (
            <>
              <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
              <CardTitle>You're In!</CardTitle>
              <CardDescription>Your account has been created. Sign in to get started.</CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Join Zyra</CardTitle>
              <CardDescription>
                You've been invited as <strong>{inviteInfo?.role}</strong> ({inviteInfo?.email})
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {error ? (
            <Button className="w-full" onClick={() => setLocation("/auth")} data-testid="button-go-login">
              Go to Sign In
            </Button>
          ) : accepted ? (
            <Button className="w-full" onClick={() => setLocation("/auth")} data-testid="button-go-login-accepted">
              Sign In
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  data-testid="input-invite-fullname"
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="janedoe"
                  data-testid="input-invite-username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  data-testid="input-invite-password"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={submitting}
                data-testid="button-accept-invite"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accept Invite & Create Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
