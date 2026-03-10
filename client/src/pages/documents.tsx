import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen, Upload, FileText, File, Trash2, CheckCircle,
  Clock, AlertTriangle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Document } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileIcon({ type }: { type: string }) {
  const isPdf = type.includes("pdf");
  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
      isPdf ? "bg-red-500/10" : "bg-blue-500/10"
    )}>
      <FileText className={cn("w-5 h-5", isPdf ? "text-red-500" : "text-blue-500")} />
    </div>
  );
}

export default function Documents() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery<Document[]>({ queryKey: ["/api/documents"] });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const uploaded = [];
      for (const file of Array.from(files)) {
        const res = await apiRequest("POST", "/api/documents", {
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
        });
        uploaded.push(await res.json());
      }
      return uploaded;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      setUploading(false);
      toast({ title: "Upload complete", description: "Documents uploaded successfully" });
    },
    onError: () => {
      setUploading(false);
      toast({ title: "Upload failed", description: "Failed to upload documents", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/documents/${id}`, undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowed = Array.from(files).filter((f) =>
      f.type.includes("pdf") || f.name.endsWith(".docx") || f.name.endsWith(".doc")
    );
    if (allowed.length === 0) {
      toast({ title: "Invalid file type", description: "Only PDF and DOCX files are supported", variant: "destructive" });
      return;
    }
    setUploading(true);
    const dt = new DataTransfer();
    allowed.forEach((f) => dt.items.add(f));
    uploadMutation.mutate(dt.files);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload security policies, compliance docs, and audit materials</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} data-testid="button-upload-doc" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Documents
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          data-testid="input-file-upload"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div
          data-testid="drop-zone"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/30"
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
              dragging ? "bg-primary/15" : "bg-muted"
            )}>
              <Upload className={cn("w-6 h-6", dragging ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {dragging ? "Drop files to upload" : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF and DOCX files supported (max 50MB each)</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">PDF</Badge>
              <Badge variant="outline" className="text-xs">DOCX</Badge>
              <Badge variant="outline" className="text-xs">DOC</Badge>
            </div>
          </div>
        </div>

        {uploading && (
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-blue-500 animate-bounce" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Uploading documents...</p>
              <Progress value={60} className="h-1 mt-1.5" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : documents.length === 0 && !uploading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="w-8 h-8 text-muted-foreground opacity-40 mb-3" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            </div>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id} data-testid={`doc-card-${doc.id}`} className="border-card-border hover-elevate">
                <CardContent className="p-4 flex items-center gap-4">
                  <FileIcon type={doc.type} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">{doc.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatBytes(doc.size)}</span>
                      <span>·</span>
                      <span>{doc.type.includes("pdf") ? "PDF" : "DOCX"}</span>
                      <span>·</span>
                      <span>{doc.createdAt ? formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true }) : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn("text-xs",
                        doc.status === "ready" ? "border-green-500/30 text-green-600 dark:text-green-400" :
                        doc.status === "processing" ? "border-blue-500/30 text-blue-500" :
                        "border-red-500/30 text-red-500"
                      )}
                    >
                      {doc.status === "ready" ? <CheckCircle className="w-3 h-3 mr-1" /> :
                       doc.status === "processing" ? <Clock className="w-3 h-3 mr-1" /> :
                       <AlertTriangle className="w-3 h-3 mr-1" />}
                      {doc.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      data-testid={`delete-doc-${doc.id}`}
                      onClick={() => deleteMutation.mutate(doc.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}