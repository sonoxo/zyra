import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, X, Bookmark, CalendarIcon, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SavedView } from "@shared/schema";

export interface FilterDefinition {
  key: string;
  label: string;
  type: "select" | "text" | "date-range";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

function parseSearch(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((v, k) => { if (v) result[k] = v; });
  return result;
}

function buildSearch(values: Record<string, string>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => { if (v && v !== "all") params.set(k, v); });
  const str = params.toString();
  return str ? `?${str}` : "";
}

export interface FilterState {
  values: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  clearAll: () => void;
  activeCount: number;
  applyFilters: (filterData: Record<string, string>) => void;
}

export function useFilterValues(filters: FilterDefinition[]): FilterState {
  const [values, setValues] = useState<Record<string, string>>(() => parseSearch(window.location.search));

  useEffect(() => {
    const onPopState = () => setValues(parseSearch(window.location.search));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setValues(prev => {
      const next = { ...prev };
      if (!value || value === "all") {
        delete next[key];
      } else {
        next[key] = value;
      }
      const path = window.location.pathname;
      window.history.replaceState(null, "", path + buildSearch(next));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setValues({});
    const path = window.location.pathname;
    window.history.replaceState(null, "", path);
  }, []);

  const applyFilters = useCallback((filterData: Record<string, string>) => {
    setValues(filterData);
    const path = window.location.pathname;
    window.history.replaceState(null, "", path + buildSearch(filterData));
  }, []);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const f of filters) {
      if (f.type === "date-range") {
        if (values[`${f.key}_from`] || values[`${f.key}_to`]) count++;
      } else {
        const v = values[f.key];
        if (v && v !== "all") count++;
      }
    }
    return count;
  }, [filters, values]);

  return { values, setFilter, clearAll, activeCount, applyFilters };
}

interface FilterBarProps {
  page: string;
  filters: FilterDefinition[];
  totalCount: number;
  filteredCount: number;
  filterState: FilterState;
}

export function FilterBar({ page, filters, totalCount, filteredCount, filterState }: FilterBarProps) {
  const { values, setFilter, clearAll, activeCount, applyFilters } = filterState;
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  const { data: savedViews = [] } = useQuery<SavedView[]>({
    queryKey: ["/api/saved-views", `page=${page}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/saved-views?page=${page}`);
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; page: string; filters: Record<string, string> }) => {
      return apiRequest("POST", "/api/saved-views", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-views", `page=${page}`] });
      setSaveDialogOpen(false);
      setViewName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/saved-views/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-views", `page=${page}`] });
    },
  });

  const handleSave = () => {
    if (!viewName.trim()) return;
    const activeFilters: Record<string, string> = {};
    for (const f of filters) {
      if (f.type === "date-range") {
        const fromKey = `${f.key}_from`;
        const toKey = `${f.key}_to`;
        if (values[fromKey]) activeFilters[fromKey] = values[fromKey];
        if (values[toKey]) activeFilters[toKey] = values[toKey];
      } else {
        const v = values[f.key];
        if (v && v !== "all") activeFilters[f.key] = v;
      }
    }
    saveMutation.mutate({ name: viewName.trim(), page, filters: activeFilters });
  };

  return (
    <div className="space-y-3" data-testid="filter-bar">
      {savedViews.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
          {savedViews.map(view => (
            <Badge
              key={view.id}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/10 transition-colors gap-1 pl-2.5 pr-1"
              data-testid={`saved-view-${view.id}`}
            >
              <span onClick={() => applyFilters(view.filters as Record<string, string>)}>{view.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(view.id); }}
                className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                data-testid={`delete-view-${view.id}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />

        {filters.map(f => {
          if (f.type === "text") {
            return (
              <div key={f.key} className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={f.placeholder || `Search ${f.label.toLowerCase()}...`}
                  value={values[f.key] || ""}
                  onChange={(e) => setFilter(f.key, e.target.value)}
                  className="pl-8 h-9 w-48 text-sm"
                  data-testid={`filter-text-${f.key}`}
                />
              </div>
            );
          }

          if (f.type === "select" && f.options) {
            return (
              <Select
                key={f.key}
                value={values[f.key] || "all"}
                onValueChange={(v) => setFilter(f.key, v)}
              >
                <SelectTrigger className="h-9 w-[150px] text-sm" data-testid={`filter-select-${f.key}`}>
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {f.label}</SelectItem>
                  {f.options.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          if (f.type === "date-range") {
            const fromKey = `${f.key}_from`;
            const toKey = `${f.key}_to`;
            const fromDate = values[fromKey] ? new Date(values[fromKey]) : undefined;
            const toDate = values[toKey] ? new Date(values[toKey]) : undefined;
            return (
              <Popover key={f.key}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-9 text-sm gap-1.5 font-normal", (fromDate || toDate) && "text-foreground")}
                    data-testid={`filter-date-${f.key}`}
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {fromDate && toDate
                      ? `${format(fromDate, "MMM d")} - ${format(toDate, "MMM d")}`
                      : fromDate
                        ? `From ${format(fromDate, "MMM d")}`
                        : toDate
                          ? `Until ${format(toDate, "MMM d")}`
                          : f.label}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-2 p-3">
                    <div>
                      <p className="text-xs font-medium mb-1 text-muted-foreground">From</p>
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={(d) => setFilter(fromKey, d ? d.toISOString().split("T")[0] : "")}
                        initialFocus
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1 text-muted-foreground">To</p>
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={(d) => setFilter(toKey, d ? d.toISOString().split("T")[0] : "")}
                      />
                    </div>
                  </div>
                  {(fromDate || toDate) && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => { setFilter(fromKey, ""); setFilter(toKey, ""); }}
                      >
                        Clear dates
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            );
          }

          return null;
        })}

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={clearAll}
            data-testid="button-clear-filters"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear all
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground" data-testid="text-filter-count">
            {filteredCount === totalCount
              ? `${totalCount} total`
              : `Showing ${filteredCount} of ${totalCount}`}
          </span>

          {activeCount > 0 && (
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1" data-testid="button-save-view">
                  <Bookmark className="w-3.5 h-3.5" />
                  Save View
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Save Current View</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    placeholder="View name (e.g. Critical Active)"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    data-testid="input-view-name"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {filters.map(f => {
                      if (f.type === "date-range") {
                        const from = values[`${f.key}_from`];
                        const to = values[`${f.key}_to`];
                        if (!from && !to) return null;
                        return (
                          <Badge key={f.key} variant="outline" className="text-xs">
                            {f.label}: {from || "..."} to {to || "..."}
                          </Badge>
                        );
                      }
                      const v = values[f.key];
                      if (!v || v === "all") return null;
                      return (
                        <Badge key={f.key} variant="outline" className="text-xs">
                          {f.label}: {v}
                        </Badge>
                      );
                    })}
                  </div>
                  <Button
                    onClick={handleSave}
                    className="w-full"
                    disabled={!viewName.trim() || saveMutation.isPending}
                    data-testid="button-confirm-save-view"
                  >
                    Save View
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}
