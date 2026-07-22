"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudCog,
  DatabaseZap,
  FileSpreadsheet,
  KeyRound,
  Link2,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Webhook,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DemoIntegration = {
  id: string;
  provider: string;
  displayName: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastSync: string;
  bills: number;
  mappings: number;
};

const initialIntegrations: DemoIntegration[] = [
  {
    id: "mock-main",
    provider: "MOCK",
    displayName: "Main Outlet POS",
    status: "CONNECTED",
    lastSync: "Today, 9:46 PM",
    bills: 31,
    mappings: 18,
  },
];

const syncHistory = [
  { id: "SYNC-2048", type: "Incremental", time: "Today, 9:46 PM", result: "31 received · 2 updated", status: "Completed", duration: "1.4s" },
  { id: "SYNC-2047", type: "Webhook", time: "Today, 9:42 PM", result: "1 bill · 1 tip", status: "Completed", duration: "320ms" },
  { id: "SYNC-2046", type: "Manual", time: "Today, 6:03 PM", result: "16 received · 1 needs review", status: "Partial", duration: "2.1s" },
] as const;

export function IntegrationsWorkspace() {
  const [integrations, setIntegrations] = useState<DemoIntegration[]>(initialIntegrations);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [provider, setProvider] = useState("GENERIC_API");
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authType, setAuthType] = useState("API_KEY");
  const [secret, setSecret] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [notice, setNotice] = useState("Mock POS is ready for a safe development sync.");
  const [tableMapping, setTableMapping] = useState("pending");

  async function pause(milliseconds: number) {
    await new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function testConnection(id: string) {
    setTesting(id);
    setNotice("");
    await pause(700);
    setTesting(null);
    setNotice("Connection verified. Credentials were accepted and were not returned to the browser.");
  }

  async function runSync(id: string) {
    setSyncing(id);
    setNotice("");
    await pause(950);
    setIntegrations((current) =>
      current.map((integration) =>
        integration.id === id
          ? { ...integration, lastSync: "Just now", bills: integration.bills + 1 }
          : integration,
      ),
    );
    setSyncing(null);
    setNotice("Sync complete: 1 bill updated, 1 confirmed tip allocated, and no duplicates created.");
  }

  function addIntegration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) return;
    setIntegrations((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        provider,
        displayName: displayName.trim(),
        status: "DISCONNECTED",
        lastSync: "Never",
        bills: 0,
        mappings: 0,
      },
    ]);
    setDisplayName("");
    setBaseUrl("");
    setSecret("");
    setDialogOpen(false);
    setNotice("Integration saved. Test the connection before its first sync.");
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Data connections</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">POS integrations</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Connect your existing billing system. TipSathi stays focused on tip allocation and never replaces the POS.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-[#d7d0c4] bg-white/65"><Link href="/manager/integrations/csv"><FileSpreadsheet className="size-4" /> Import CSV</Link></Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4" /> Add integration</Button></DialogTrigger>
            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[520px]">
              <form onSubmit={addIntegration}>
                <DialogHeader>
                  <DialogTitle>Connect a POS</DialogTitle>
                  <DialogDescription>Credentials are encrypted on the server. Saved secrets are never shown again.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-5">
                  <div className="grid gap-2"><Label htmlFor="provider">Provider</Label><Select value={provider} onValueChange={setProvider}><SelectTrigger id="provider"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GENERIC_API">Generic REST API</SelectItem><SelectItem value="CSV_IMPORT">CSV import</SelectItem><SelectItem value="MANUAL">Manual entry</SelectItem><SelectItem value="MOCK">Mock POS (development)</SelectItem><SelectItem value="PETPOOJA" disabled>Petpooja · API docs required</SelectItem><SelectItem value="RESTROWORKS" disabled>Restroworks · API docs required</SelectItem></SelectContent></Select></div>
                  <div className="grid gap-2"><Label htmlFor="display-name">Display name</Label><Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Main Outlet POS" required /></div>
                  {provider === "GENERIC_API" && (
                    <>
                      <div className="grid gap-2"><Label htmlFor="base-url">HTTPS base URL</Label><Input id="base-url" type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://pos.example.com/api/" required /><p className="text-[11px] text-muted-foreground">Local, private-network, metadata, and credential-embedded URLs are blocked.</p></div>
                      <div className="grid gap-2"><Label htmlFor="auth-type">Authentication</Label><Select value={authType} onValueChange={setAuthType}><SelectTrigger id="auth-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">None</SelectItem><SelectItem value="API_KEY">API key</SelectItem><SelectItem value="BEARER_TOKEN">Bearer token</SelectItem><SelectItem value="BASIC_AUTH">Basic auth</SelectItem></SelectContent></Select></div>
                      {authType !== "NONE" && <div className="grid gap-2"><Label htmlFor="secret">{authType === "API_KEY" ? "API key" : authType === "BEARER_TOKEN" ? "Bearer token" : "Password"}</Label><div className="relative"><KeyRound className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="secret" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} className="ps-9" autoComplete="new-password" required /></div></div>}
                    </>
                  )}
                </div>
                <DialogFooter><Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">Save integration</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {notice && <Alert className="border-primary/15 bg-[#e7f1ec]"><CheckCircle2 className="size-4 text-primary" /><AlertTitle className="text-xs text-primary">Integration update</AlertTitle><AlertDescription className="text-xs text-[#4d6b61]">{notice}</AlertDescription></Alert>}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Connected systems", value: integrations.filter((item) => item.status === "CONNECTED").length, copy: `${integrations.length} configured`, icon: Link2, tone: "bg-[#e4efe9] text-primary" },
          { label: "Imported bills", value: integrations.reduce((sum, item) => sum + item.bills, 0), copy: "Today across all sources", icon: DatabaseZap, tone: "bg-[#f4e9c9] text-[#956b1f]" },
          { label: "Needs mapping", value: tableMapping === "pending" ? 1 : 0, copy: tableMapping === "pending" ? "1 external table" : "Everything is mapped", icon: AlertTriangle, tone: "bg-[#f3e5df] text-[#a15737]" },
        ].map((metric) => <Card key={metric.label} className="gap-2 border-[#dfd8ca] bg-white/72 py-4 shadow-none"><CardContent className="flex items-start justify-between px-4"><div><p className="text-xs text-muted-foreground">{metric.label}</p><p className="font-tabular mt-2 text-2xl font-semibold">{metric.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{metric.copy}</p></div><span className={`flex size-9 items-center justify-center rounded-xl ${metric.tone}`}><metric.icon className="size-[17px]" /></span></CardContent></Card>)}
      </section>

      <Tabs defaultValue="connections" className="gap-4">
        <TabsList className="h-10 border border-[#ddd5c8] bg-white/55 p-1">
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="mappings" className="gap-2">Mappings {tableMapping === "pending" && <span className="size-1.5 rounded-full bg-[#c17a3d]" />}</TabsTrigger>
          <TabsTrigger value="history">Sync history</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {integrations.map((integration) => (
            <Card key={integration.id} className="gap-0 overflow-hidden border-[#ded7ca] bg-white/76 py-0 shadow-none">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#173a34] text-[#f5c95f]"><CloudCog className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold tracking-[-0.02em]">{integration.displayName}</h2><Badge variant="outline" className={integration.status === "CONNECTED" ? "border-[#c8dfd4] bg-[#e5f0ea] text-[#2e735f]" : "border-[#e0d8c9] bg-[#f3efe8] text-[#746f66]"}><span className={`me-1.5 size-1.5 rounded-full ${integration.status === "CONNECTED" ? "bg-[#3f9076]" : "bg-[#9d968b]"}`} />{integration.status === "CONNECTED" ? "Connected" : "Setup needed"}</Badge></div>
                      <p className="mt-1 text-xs text-muted-foreground">{integration.provider === "MOCK" ? "Development adapter · Main Outlet" : integration.provider.replaceAll("_", " ")}</p>
                      <div className="mt-5 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
                        <div><p className="text-[10px] text-muted-foreground">Last sync</p><p className="mt-1 text-xs font-medium">{integration.lastSync}</p></div>
                        <div><p className="text-[10px] text-muted-foreground">Bills imported</p><p className="font-tabular mt-1 text-xs font-medium">{integration.bills}</p></div>
                        <div><p className="text-[10px] text-muted-foreground">Mappings</p><p className="font-tabular mt-1 text-xs font-medium">{integration.mappings}</p></div>
                        <div><p className="text-[10px] text-muted-foreground">Webhook</p><p className="mt-1 flex items-center gap-1.5 text-xs font-medium"><span className="size-1.5 rounded-full bg-[#3d9377]" /> Healthy</p></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-[#e8e1d6] bg-[#faf8f3] px-5 py-4 lg:border-s lg:border-t-0">
                  <Button variant="outline" size="sm" onClick={() => testConnection(integration.id)} disabled={testing === integration.id} className="bg-white"><>{testing === integration.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />} Test</></Button>
                  <Button size="sm" onClick={() => runSync(integration.id)} disabled={syncing === integration.id || integration.status !== "CONNECTED"}><>{syncing === integration.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Sync now</></Button>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Integration actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><CloudCog className="size-4" /> Edit settings</DropdownMenuItem><DropdownMenuItem><Webhook className="size-4" /> Webhook details</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive"><Unplug className="size-4" /> Disconnect</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </div>
              </div>
            </Card>
          ))}

          <Card className="gap-0 border-dashed border-[#d8d0c3] bg-transparent py-0 shadow-none">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-white text-[#947027]"><FileSpreadsheet className="size-4" /></span><div><p className="text-sm font-semibold">Have a POS export instead?</p><p className="mt-1 text-xs text-muted-foreground">Preview every row before importing bills and tips from CSV.</p></div></div><Button variant="outline" size="sm" asChild className="bg-white"><Link href="/manager/integrations/csv">Open CSV importer <ArrowRight className="size-3.5" /></Link></Button></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="gap-0 border-[#ded7ca] bg-white/76 py-0 shadow-none">
            <CardHeader className="border-b border-[#e8e1d6] px-5 py-4"><CardTitle className="text-sm">Mapping review</CardTitle><p className="text-xs text-muted-foreground">Code and table-number matches are automatic. Names alone are never merged.</p></CardHeader>
            <CardContent className="divide-y divide-[#ebe5db] px-5">
              <div className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"><div><p className="text-[10px] text-muted-foreground">External employee</p><p className="mt-1 text-xs font-semibold">W001 · Arjun</p></div><ChevronRight className="hidden size-4 text-muted-foreground sm:block" /><div><p className="text-[10px] text-muted-foreground">TipSathi employee</p><p className="mt-1 text-xs font-semibold">Arjun Mehta · W001</p></div><Badge variant="outline" className="w-fit border-[#c8dfd4] bg-[#e5f0ea] text-[#2e735f]"><Check className="size-3" /> Auto-matched</Badge></div>
              <div className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"><div><p className="text-[10px] text-muted-foreground">External table</p><p className="mt-1 text-xs font-semibold">Table 12 · mock-table-12</p></div><ChevronRight className="hidden size-4 text-muted-foreground sm:block" /><Select value={tableMapping} onValueChange={setTableMapping}><SelectTrigger className="h-9"><SelectValue placeholder="Choose TipSathi table" /></SelectTrigger><SelectContent><SelectItem value="pending">Choose a table…</SelectItem><SelectItem value="table-6">Table 6</SelectItem><SelectItem value="table-9">Table 9</SelectItem><SelectItem value="ignored">Ignore this table</SelectItem></SelectContent></Select>{tableMapping === "pending" ? <Badge variant="outline" className="w-fit border-[#e8d2aa] bg-[#f7ecd5] text-[#966b20]"><Clock3 className="size-3" /> Review</Badge> : <Badge variant="outline" className="w-fit border-[#c8dfd4] bg-[#e5f0ea] text-[#2e735f]"><Check className="size-3" /> Mapped</Badge>}</div>
            </CardContent>
          </Card>
          <Card className="gap-4 border-[#ded7ca] bg-[#173a34] py-5 text-white shadow-none"><CardHeader className="px-5"><span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-[#f5c95f]"><ShieldCheck className="size-4" /></span><CardTitle className="mt-2 text-sm">Safe matching rules</CardTitle></CardHeader><CardContent className="space-y-3 px-5 text-xs leading-5 text-white/62"><p>Employee codes may match automatically. Names alone never do.</p><Separator className="bg-white/10" /><p>Table numbers or exact table names may match. Pending mappings block financial imports.</p><Separator className="bg-white/10" /><p>PINs, passwords, and historical employee records are never changed by a sync.</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="gap-0 overflow-hidden border-[#ded7ca] bg-white/76 py-0 shadow-none">
            <CardHeader className="border-b border-[#e8e1d6] px-5 py-4"><CardTitle className="text-sm">Recent sync runs</CardTitle></CardHeader>
            <CardContent className="divide-y divide-[#ebe5db] px-5">
              {syncHistory.map((run) => <div key={run.id} className="grid gap-2 py-4 sm:grid-cols-[120px_1fr_1fr_100px_80px] sm:items-center"><div><p className="font-mono text-[10px] text-muted-foreground">{run.id}</p><p className="mt-1 text-xs font-medium">{run.type}</p></div><p className="text-xs text-muted-foreground">{run.time}</p><p className="text-xs">{run.result}</p><Badge variant="outline" className={run.status === "Completed" ? "w-fit border-[#c8dfd4] bg-[#e5f0ea] text-[#2e735f]" : "w-fit border-[#e8d2aa] bg-[#f7ecd5] text-[#966b20]"}>{run.status}</Badge><p className="font-mono text-[10px] text-muted-foreground">{run.duration}</p></div>)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
