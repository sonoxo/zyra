import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Eye, EyeOff, ArrowRight, CheckCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const forgotSchema = z.object({
  email: z.string().email("Valid email required"),
});

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ForgotForm = z.infer<typeof forgotSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirmPassword: "" } });

  const forgotMutation = useMutation({
    mutationFn: async (data: ForgotForm) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      return res.json();
    },
    onSuccess: () => setSent(true),
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to send reset email", variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetForm) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password: data.password });
      return res.json();
    },
    onSuccess: () => setResetDone(true),
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to reset password", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div className="font-bold text-lg tracking-tight">Zyra</div>
        </div>

        {resetDone ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Password reset</h2>
              <p className="text-sm text-muted-foreground">Your password has been updated. You can now sign in with your new password.</p>
            </div>
            <Button className="w-full" onClick={() => navigate("/auth")} data-testid="button-back-to-login">
              Back to sign in <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : token ? (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">Set new password</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your new password below</p>
            </div>
            <form onSubmit={resetForm.handleSubmit((d) => resetMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-sm font-medium">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    data-testid="input-new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    {...resetForm.register("password")}
                    className="h-10 pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{resetForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm password</Label>
                <Input
                  id="confirm-password"
                  data-testid="input-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  {...resetForm.register("confirmPassword")}
                  className="h-10"
                />
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{resetForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-10" disabled={resetMutation.isPending} data-testid="button-reset-password">
                {resetMutation.isPending ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</span> : "Reset password"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button variant="ghost" className="text-sm text-muted-foreground" onClick={() => navigate("/auth")} data-testid="button-cancel-reset">
                Back to sign in
              </Button>
            </div>
          </div>
        ) : sent ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account exists with that email, we sent a password reset link. The link expires in 1 hour.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth")} data-testid="button-back-to-login-sent">
              Back to sign in
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">Forgot your password?</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset link</p>
            </div>
            <form onSubmit={forgotForm.handleSubmit((d) => forgotMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="forgot-email"
                  data-testid="input-forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...forgotForm.register("email")}
                  className="h-10"
                />
                {forgotForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{forgotForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-10" disabled={forgotMutation.isPending} data-testid="button-send-reset">
                {forgotMutation.isPending ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending...</span> : (
                  <span className="flex items-center gap-2">Send reset link <ArrowRight className="w-4 h-4" /></span>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button variant="ghost" className="text-sm text-muted-foreground" onClick={() => navigate("/auth")} data-testid="button-cancel-forgot">
                Back to sign in
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
