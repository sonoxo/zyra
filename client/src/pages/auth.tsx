import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, ChevronRight, Mail, Loader2 } from "lucide-react";
import zyraLogo from "@assets/ChatGPT_Image_Mar_30,_2026,_05_28_39_PM_1775166956477.png";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, setTokens } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

const loginSchema = z.object({
  username: z.string().min(1, "Username or email required"),
  password: z.string().min(1, "Password required"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(2, "Organization name required"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const features = [
  "AI-native threat detection and autonomous remediation",
  "Multi-framework compliance (SOC2, HIPAA, ISO27001, PCI-DSS, FedRAMP, GDPR)",
  "Continuous exposure management with attack path visualization",
  "Intelligent SOAR automation and security orchestration",
  "Enterprise-grade multi-tenant architecture with RBAC",
];

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState("login");
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", username: "", password: "", organizationName: "" }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.requiresVerification) {
          setVerificationEmail(body.email);
          throw new Error("VERIFICATION_REQUIRED");
        }
        throw new Error(body.message || "Invalid credentials");
      }
      return body;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      qc.setQueryData(["/api/auth/me"], data.user);
      navigate("/dashboard");
    },
    onError: (err: any) => {
      if (err.message === "VERIFICATION_REQUIRED") return;
      toast({ title: "Login failed", description: err.message || "Invalid credentials", variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.requiresVerification) {
        setVerificationEmail(data.email);
      }
    },
    onError: (err: any) => toast({ title: "Registration failed", description: err.message || "Try again", variant: "destructive" }),
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!verificationEmail) return;
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email: verificationEmail });
      return res.json();
    },
    onSuccess: () => toast({ title: "Verification email sent", description: "Please check your inbox." }),
    onError: () => toast({ title: "Failed to resend", description: "Please try again.", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-primary/10 via-background to-background border-r border-border p-12 justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <img src={zyraLogo} alt="Zyra" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
            <div>
              <div className="font-bold text-lg text-foreground tracking-tight">Zyra</div>
              <div className="text-xs text-muted-foreground">AI-Native Cybersecurity Platform</div>
            </div>
          </div>

          <div className="mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              AI-Native Security Ecosystem
            </Badge>
            <h1 className="text-3xl font-bold text-foreground leading-tight mb-4">
              Autonomous cybersecurity<br />intelligence, unified.
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              From vulnerability scanning to threat hunting, compliance to remediation — Zyra protects your entire infrastructure with AI-powered precision.
            </p>
          </div>

          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <ChevronRight className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            { label: "Frameworks", value: "6+" },
            { label: "Scan Tools", value: "4" },
            { label: "Compliance Coverage", value: "98%" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-card-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <img src={zyraLogo} alt="Zyra" className="w-9 h-9 rounded-xl object-cover" />
            <div className="font-bold text-lg tracking-tight">Zyra</div>
          </div>

          {verificationEmail ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We sent a verification link to<br />
                  <span className="font-medium text-foreground">{verificationEmail}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the link in the email to verify your account. The link expires in 24 hours.
              </p>
              <div className="space-y-3">
                <Button
                  data-testid="button-resend-verification"
                  variant="outline"
                  className="w-full"
                  disabled={resendMutation.isPending}
                  onClick={() => resendMutation.mutate()}
                >
                  {resendMutation.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending...</span>
                  ) : "Resend verification email"}
                </Button>
                <Button
                  data-testid="button-back-to-signin"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setVerificationEmail(null)}
                >
                  Back to sign in
                </Button>
              </div>
            </div>
          ) : (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-0">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
                <p className="text-sm text-muted-foreground mt-1">Sign in to your security console</p>
              </div>
              <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-username" className="text-sm font-medium">Username or email</Label>
                  <Input
                    id="login-username"
                    data-testid="input-username"
                    placeholder="Enter your username or email"
                    autoComplete="username"
                    {...loginForm.register("username")}
                    className="h-10"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      data-testid="input-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...loginForm.register("password")}
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                  <div className="text-right">
                    <Link href="/reset-password" className="text-xs text-primary hover:underline" data-testid="link-forgot-password">
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <Button
                  type="submit"
                  data-testid="button-login"
                  className="w-full h-10"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : (
                    <span className="flex items-center gap-2">Sign in <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-0">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Create your account</h2>
                <p className="text-sm text-muted-foreground mt-1">Set up your security compliance platform</p>
              </div>
              <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Full name</Label>
                    <Input
                      data-testid="input-fullname"
                      placeholder="John Doe"
                      {...registerForm.register("fullName")}
                      className="h-10"
                    />
                    {registerForm.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Username</Label>
                    <Input
                      data-testid="input-reg-username"
                      placeholder="johndoe"
                      {...registerForm.register("username")}
                      className="h-10"
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input
                    data-testid="input-email"
                    type="email"
                    placeholder="you@company.com"
                    {...registerForm.register("email")}
                    className="h-10"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Organization name</Label>
                  <Input
                    data-testid="input-org-name"
                    placeholder="Acme Corp"
                    {...registerForm.register("organizationName")}
                    className="h-10"
                  />
                  {registerForm.formState.errors.organizationName && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.organizationName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      data-testid="input-reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      {...registerForm.register("password")}
                      className="h-10 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  data-testid="button-register"
                  className="w-full h-10"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating account..." : (
                    <span className="flex items-center gap-2">Create account <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
