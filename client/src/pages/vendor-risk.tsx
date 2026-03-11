import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Building2, Plus, Trash2, ShieldCheck, AlertTriangle, RefreshCw, Loader2, Globe, Mail, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vendor } from "@shared/schema";

const vendorSchema = z.object({
  name: z.string().min(2, "Name required"),
  contactEmail: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  category: z.string().min(1, "Category required"),
  notes: z.string().optional(),
});

const CATEGORIES = ["saas", "infrastructure", "security", "payment", "analytics", "communication", "cloud", "other"];
const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function VendorRiskPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/vendors/stats"] });
  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({ queryKey: ["/api/vendors"] });

  const form = useForm<z.infer<typeof vendorSchema>>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { name: "", contactEmail: "", website: "", category: "saas", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vendors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/stats"] });
      setIsOpen(false);
      form.reset();
      toast({ title: "Vendor added" });
    },
  });

  const assessMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/vendors/${id}/assess`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/stats"] });
      toast({ title: "Vendor assessed", description: "Risk score has been updated." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/stats"] });
    },
  });

  const filtered = filter === "all" ? vendors : vendors.filter(v => v.riskRating === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Risk Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assess and track third-party vendor security posture</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-vendor"><Plus className="w-4 h-4 mr-1.5" />Add Vendor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Vendor Name</FormLabel><FormControl>
                    <Input data-testid="input-vendor-name" placeholder="Acme Corp" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem><FormLabel>Contact Email</FormLabel><FormControl>
                    <Input data-testid="input-vendor-email" placeholder="security@vendor.com" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl>
                    <Input data-testid="input-vendor-website" placeholder="https://vendor.com" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-vendor-category"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl>
                    <Textarea data-testid="input-vendor-notes" placeholder="Additional context..." rows={2} {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-vendor">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Add Vendor
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Building2 className="w-4 h-4 text-blue-500" /></div>
            <div><div className="text-2xl font-bold">{stats?.total ?? 0}</div><div className="text-xs text-muted-foreground">Total Vendors</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
            <div><div className="text-2xl font-bold text-red-500">{stats?.high ?? 0}</div><div className="text-xs text-muted-foreground">High Risk</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="w-4 h-4 text-yellow-500" /></div>
            <div><div className="text-2xl font-bold text-yellow-500">{stats?.medium ?? 0}</div><div className="text-xs text-muted-foreground">Medium Risk</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><ShieldCheck className="w-4 h-4 text-green-500" /></div>
            <div><div className="text-2xl font-bold text-green-500">{stats?.low ?? 0}</div><div className="text-xs text-muted-foreground">Low Risk</div></div>
          </div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        {["all", "high", "medium", "low"].map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize" data-testid={`filter-${f}`}>{f}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No vendors found.</p>
          <p className="text-sm text-muted-foreground/60">Add vendors to track their security posture and risk levels.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(vendor => (
            <Card key={vendor.id} data-testid={`card-vendor-${vendor.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{vendor.name}</span>
                      <Badge variant="outline" className={cn("text-xs capitalize", RISK_COLORS[vendor.riskRating] ?? "")}>
                        {vendor.riskRating} risk
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">{vendor.category}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {vendor.contactEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{vendor.contactEmail}</span>}
                      {vendor.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{vendor.website}</span>}
                      <span>Status: <span className="capitalize text-foreground">{vendor.status}</span></span>
                    </div>
                    {vendor.status === "assessed" && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Risk Score:</span>
                        <Progress value={vendor.riskScore} className="h-1.5 flex-1 max-w-32" />
                        <span className="text-xs font-medium">{vendor.riskScore}/100</span>
                        <Badge variant="outline" className={cn("text-xs", vendor.complianceStatus === "compliant" ? "text-green-600 border-green-500/30" : "text-red-600 border-red-500/30")}>
                          {vendor.complianceStatus}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => assessMutation.mutate(vendor.id)} disabled={assessMutation.isPending} data-testid={`button-assess-${vendor.id}`}>
                      <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", assessMutation.isPending && "animate-spin")} />Assess
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(vendor.id)} data-testid={`button-delete-vendor-${vendor.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
