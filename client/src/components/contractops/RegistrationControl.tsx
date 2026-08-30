import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, ExternalLink, Loader2, Pencil, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type RegistrationState = "PENDING" | "ACTIVE" | "ACTION_REQUIRED" | "EXPIRED" | "NOT_STARTED";

type RegistrationRow = {
  id: string;
  system: string;
  identifier: string | null;
  status: RegistrationState;
  verificationSource: string | null;
  verifiedAt: string | null;
  notes: string | null;
};

const SYSTEM_LABELS: Record<string, string> = {
  SAM: "SAM.gov",
  UEI: "UEI",
  CAGE: "CAGE",
  SBIR_STTR: "SBIR / STTR",
  DSIP: "DoD DSIP",
  GRANTS_GOV: "Grants.gov",
};

function statusStyle(status: RegistrationState) {
  if (status === "ACTIVE") return "text-green-600 border-green-500/30 bg-green-500/5";
  if (status === "PENDING") return "text-amber-600 border-amber-500/30 bg-amber-500/5";
  if (status === "ACTION_REQUIRED" || status === "EXPIRED") return "text-red-600 border-red-500/30 bg-red-500/5";
  return "text-muted-foreground";
}

function StatusIcon({ status }: { status: RegistrationState }) {
  if (status === "ACTIVE") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "PENDING") return <Clock3 className="h-4 w-4 text-amber-500" />;
  if (status === "ACTION_REQUIRED" || status === "EXPIRED") return <ShieldAlert className="h-4 w-4 text-red-500" />;
  return <Clock3 className="h-4 w-4 text-muted-foreground" />;
}

export function RegistrationControl({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<RegistrationRow | null>(null);
  const [form, setForm] = useState({ status: "PENDING" as RegistrationState, identifier: "", verificationSource: "", notes: "" });

  const { data, isLoading } = useQuery<{ registrations: RegistrationRow[] }>({
    queryKey: ["/api/contractops/registrations"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ system, ...body }: { system: string; status: RegistrationState; identifier: string; verificationSource: string; notes: string }) => {
      const response = await apiRequest("PUT", `/api/contractops/registrations/${system}`, {
        status: body.status,
        identifier: body.identifier || null,
        verificationSource: body.verificationSource || null,
        notes: body.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contractops/registrations"] });
      qc.invalidateQueries({ queryKey: ["/api/contractops/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/contractops/opportunities"] });
      setEditing(null);
      toast({ title: "Registration record updated", description: "The verified state is now available to ContractOps readiness scoring." });
    },
    onError: (error: any) => {
      toast({ title: "Registration update failed", description: error?.message || "Check the verification source and try again.", variant: "destructive" });
    },
  });

  function beginEdit(row: RegistrationRow) {
    setEditing(row);
    setForm({
      status: row.status,
      identifier: row.identifier || "",
      verificationSource: row.verificationSource || "",
      notes: row.notes || "",
    });
  }

  const registrations = data?.registrations ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Federal registration control</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">ContractOps scores only recorded status. It never invents identifiers or treats unrelated credentials as registration.</p>
          </div>
          <Badge variant="outline">{canEdit ? "OWNER / ADMIN EDIT" : "READ ONLY"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading registrations…</div>
        ) : registrations.map((row) => (
          <div key={row.system} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <StatusIcon status={row.status} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{SYSTEM_LABELS[row.system] || row.system}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusStyle(row.status)}`}>{row.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {row.identifier ? `Identifier recorded: ${row.identifier}` : "No identifier recorded"}
                  {row.system === "CAGE" && row.status === "PENDING" ? " · waiting for verified issuance" : ""}
                </div>
                {row.verificationSource && (
                  <a className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline" href={row.verificationSource} target="_blank" rel="noreferrer">
                    Verification source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            {canEdit && <Button size="sm" variant="outline" onClick={() => beginEdit(row)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>}
          </div>
        ))}
      </CardContent>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update {editing ? SYSTEM_LABELS[editing.system] || editing.system : "registration"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as RegistrationState })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not started</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACTION_REQUIRED">Action required</SelectItem>
                  <SelectItem value="ACTIVE">Active / verified</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Identifier</Label><Input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="Enter only an actually issued identifier" /></div>
            <div><Label>Verification source {form.status === "ACTIVE" ? "*" : ""}</Label><Input value={form.verificationSource} onChange={(e) => setForm({ ...form, verificationSource: e.target.value })} placeholder="https://official-or-traceable-source.example/..." /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Pending validation, action needed, expiration note, etc." /></div>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">ACTIVE requires a verification source. Saving a record changes only Zyra's internal readiness record; it does not modify SAM.gov, DLA, DSIP, Grants.gov, or another external system.</div>
            <Button className="w-full" disabled={!editing || updateMutation.isPending || (form.status === "ACTIVE" && !form.verificationSource.trim())} onClick={() => editing && updateMutation.mutate({ system: editing.system, ...form })}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save registration record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
