import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, FolderKanban, ClipboardList, TrendingUp, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "client" | "campaign" | "task" | "lead" | "script";
  url: string;
}

const typeConfig = {
  client: { icon: Users, color: "text-primary", label: "Client" },
  campaign: { icon: FolderKanban, color: "text-accent", label: "Campaign" },
  task: { icon: ClipboardList, color: "text-[hsl(280_60%_55%)]", label: "Task" },
  lead: { icon: TrendingUp, color: "text-success", label: "Lead" },
  script: { icon: FileText, color: "text-warning", label: "Script" },
};

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 250);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [clients, campaigns, tasks, leads, scripts] = await Promise.all([
        supabase.from("clients").select("id, name, email").ilike("name", `%${q}%`).limit(3),
        supabase.from("campaigns").select("id, name, clients(name)").ilike("name", `%${q}%`).limit(3),
        supabase.from("tasks").select("id, title, status").ilike("title", `%${q}%`).limit(3),
        supabase.from("leads").select("id, nombre, email, status").ilike("nombre", `%${q}%`).limit(3),
        supabase.from("scripts").select("id, title, status").ilike("title", `%${q}%`).limit(3),
      ]);

      const all: SearchResult[] = [
        ...(clients.data || []).map(c => ({ id: c.id, title: c.name, subtitle: c.email || "Client", type: "client" as const, url: "/clients" })),
        ...(campaigns.data || []).map(c => ({ id: c.id, title: c.name, subtitle: (c as any).clients?.name, type: "campaign" as const, url: `/campaigns/${c.id}` })),
        ...(tasks.data || []).map(t => ({ id: t.id, title: t.title, subtitle: t.status, type: "task" as const, url: "/campaigns" })),
        ...(leads.data || []).map(l => ({ id: l.id, title: l.nombre, subtitle: l.email, type: "lead" as const, url: "/leads" })),
        ...(scripts.data || []).map(s => ({ id: s.id, title: s.title, subtitle: s.status, type: "script" as const, url: "/scripts" })),
      ];
      setResults(all);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { search(debouncedQuery); }, [debouncedQuery, search]);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); setSelected(0); }
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) { handleSelect(results[selected]); }
    if (e.key === "Escape") { onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {loading ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" /> : <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clients, campaigns, tasks, leads..."
            className="border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0 placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
        </div>

        {results.length > 0 && (
          <div className="py-2 max-h-80 overflow-y-auto">
            {results.map((result, i) => {
              const config = typeConfig[result.type];
              const Icon = config.icon;
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    i === selected ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0")}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    {result.subtitle && <p className="text-xs text-muted-foreground truncate capitalize">{result.subtitle}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{config.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No results for "{query}"</p>
          </div>
        )}

        {!query && (
          <div className="py-6 px-4 text-center text-muted-foreground text-sm">
            Type to search across all data...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
