import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Users, MessageSquare, Settings as SettingsIcon, BarChart3, Eye, Ban, Crown, Trash2, RefreshCw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

const ALL_MODELS = [
  "gpt-oss-120b", "gpt-oss-20b", "gpt-4o-mini",
];

export default function Admin() {
  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-[#5C6A64] mb-3">Administration</div>
          <h1 className="font-heading text-4xl md:text-5xl text-[#1A2E25]">Admin Dashboard</h1>
        </div>
        <Tabs defaultValue="overview">
          <TabsList className="bg-white border border-[#E1DFDA] rounded-full p-1 h-12 mb-8">
            <TabsTrigger value="overview" className="rounded-full px-5 data-[state=active]:bg-[#8BA888] data-[state=active]:text-white" data-testid="tab-overview">
              <BarChart3 className="w-4 h-4 mr-2" />Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-full px-5 data-[state=active]:bg-[#8BA888] data-[state=active]:text-white" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />Users
            </TabsTrigger>
            <TabsTrigger value="convs" className="rounded-full px-5 data-[state=active]:bg-[#8BA888] data-[state=active]:text-white" data-testid="tab-convs">
              <MessageSquare className="w-4 h-4 mr-2" />Conversations
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full px-5 data-[state=active]:bg-[#8BA888] data-[state=active]:text-white" data-testid="tab-settings">
              <SettingsIcon className="w-4 h-4 mr-2" />Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><Overview /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="convs"><ConversationsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  const load = async () => {
    try { const r = await api.get("/admin/analytics"); setData(r.data); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  useEffect(() => { load(); }, []);
  if (!data) return <div className="text-[#5C6A64]">Loading...</div>;

  const cards = [
    { label: "Total users", value: data.total_users, sub: `+${data.new_users_last_7_days} this week` },
    { label: "Total conversations", value: data.total_conversations },
    { label: "Total messages", value: data.total_messages, sub: `${data.messages_last_7_days} last 7d` },
    { label: "Banned users", value: data.banned_users },
  ];
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-[#E1DFDA] rounded-2xl p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-[#5C6A64]">{c.label}</div>
            <div className="font-heading text-3xl text-[#1A2E25] mt-2">{c.value}</div>
            {c.sub && <div className="text-xs text-[#8BA888] mt-1">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E1DFDA] rounded-2xl p-6">
          <h3 className="font-heading text-lg mb-4">Model usage</h3>
          {data.model_usage.length === 0 ? (
            <p className="text-sm text-[#5C6A64]">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.model_usage}>
                <CartesianGrid stroke="#E1DFDA" strokeDasharray="3 3" />
                <XAxis dataKey="model" tick={{ fontSize: 10, fill: "#5C6A64" }} />
                <YAxis tick={{ fontSize: 10, fill: "#5C6A64" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8BA888" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white border border-[#E1DFDA] rounded-2xl p-6">
          <h3 className="font-heading text-lg mb-4">Daily activity (30d)</h3>
          {data.daily_activity.length === 0 ? (
            <p className="text-sm text-[#5C6A64]">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.daily_activity}>
                <CartesianGrid stroke="#E1DFDA" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#5C6A64" }} />
                <YAxis tick={{ fontSize: 10, fill: "#5C6A64" }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8BA888" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userConvs, setUserConvs] = useState([]);
  const [activeConv, setActiveConv] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/users", { params: { q, limit: 100 } });
      setUsers(r.data.users || []);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setRole = async (u, role) => {
    try { await api.patch(`/admin/users/${u.id}/role`, { role }); toast.success("Role updated"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const banUser = async (u, banned) => {
    try { await api.patch(`/admin/users/${u.id}/ban`, { banned }); toast.success(banned ? "User banned" : "User unbanned"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const delUser = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This is permanent.`)) return;
    try { await api.delete(`/admin/users/${u.id}`); toast.success("User deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const openUser = async (u) => {
    setSelectedUser(u); setActiveConv(null);
    try {
      const r = await api.get(`/admin/users/${u.id}/conversations`);
      setUserConvs(r.data || []);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const openConv = async (cid) => {
    try {
      const r = await api.get(`/admin/conversations/${cid}`);
      setActiveConv(r.data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C6A64]" />
          <Input
            placeholder="Search by email or name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="pl-11 h-12 rounded-full border-[#E1DFDA] bg-white"
            data-testid="users-search"
          />
        </div>
        <Button onClick={load} className="rounded-full btn-sage h-12 px-6" data-testid="users-search-btn">Search</Button>
        <Button onClick={load} variant="outline" className="rounded-full h-12 border-[#E1DFDA]" data-testid="users-refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-white border border-[#E1DFDA] rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={5} className="text-center py-10 text-[#5C6A64]">Loading...</TableCell></TableRow>}
            {!loading && users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-[#5C6A64]">No users</TableCell></TableRow>}
            {users.map((u) => (
              <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-[#8BA888]/15 text-[#1A2E25]" : "bg-[#E8E6E1] text-[#5C6A64]"}`}>{u.role}</span>
                </TableCell>
                <TableCell>{u.banned ? <span className="text-xs text-[#CC7A6B]">Banned</span> : <span className="text-xs text-[#8BA888]">Active</span>}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openUser(u)} title="View" data-testid={`user-view-${u.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setRole(u, u.role === "admin" ? "user" : "admin")} title="Toggle admin" data-testid={`user-role-${u.id}`}>
                    <Crown className={`w-4 h-4 ${u.role === "admin" ? "text-[#8BA888]" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => banUser(u, !u.banned)} title={u.banned ? "Unban" : "Ban"} data-testid={`user-ban-${u.id}`}>
                    <Ban className={`w-4 h-4 ${u.banned ? "text-[#CC7A6B]" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => delUser(u)} title="Delete" data-testid={`user-del-${u.id}`}>
                    <Trash2 className="w-4 h-4 text-[#CC7A6B]" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(o) => !o && (setSelectedUser(null), setActiveConv(null))}>
        <DialogContent className="max-w-4xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{selectedUser?.name} <span className="text-[#5C6A64] font-normal text-sm">— {selectedUser?.email}</span></DialogTitle>
            <DialogDescription>Profile and consultation history</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
              <div className="bg-[#F9F8F6] rounded-2xl p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-[#5C6A64] mb-2">Health profile</div>
                {Object.keys(selectedUser.health_profile || {}).length === 0 ? (
                  <span className="text-[#5C6A64]">Not set.</span>
                ) : (
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selectedUser.health_profile, null, 2)}</pre>
                )}
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#5C6A64] mb-2">Consultations ({userConvs.length})</div>
                <div className="space-y-2">
                  {userConvs.length === 0 && <p className="text-sm text-[#5C6A64]">No consultations.</p>}
                  {userConvs.map((c) => (
                    <button key={c.id} onClick={() => openConv(c.id)}
                      className={`w-full text-left rounded-xl p-3 border ${activeConv?.conversation?.id === c.id ? "border-[#8BA888] bg-[#8BA888]/10" : "border-[#E1DFDA] bg-white hover:bg-[#F9F8F6]"}`}
                      data-testid={`admin-conv-${c.id}`}
                    >
                      <div className="text-sm text-[#1A2E25] truncate">{c.title}</div>
                      <div className="text-xs text-[#5C6A64]">{c.message_count} messages · {c.model}</div>
                    </button>
                  ))}
                </div>
              </div>

              {activeConv && (
                <div className="border-t border-[#E1DFDA] pt-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#5C6A64] mb-3">Messages</div>
                  <div className="space-y-3">
                    {activeConv.messages.map((m) => (
                      <div key={m.id} className={`p-3 rounded-xl text-sm ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
                        <div className="text-[10px] uppercase tracking-[0.25em] mb-1 text-[#5C6A64]">{m.role}{m.model ? ` · ${m.model}` : ""}</div>
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConversationsTab() {
  const [q, setQ] = useState("");
  const [convs, setConvs] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const load = async () => {
    try {
      const r = await api.get("/admin/conversations", { params: { q, limit: 100 } });
      setConvs(r.data.conversations || []);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const open = async (cid) => {
    try { const r = await api.get(`/admin/conversations/${cid}`); setActiveConv(r.data); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C6A64]" />
          <Input placeholder="Search by title..." value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="pl-11 h-12 rounded-full border-[#E1DFDA] bg-white" data-testid="convs-search" />
        </div>
        <Button onClick={load} className="rounded-full btn-sage h-12 px-6" data-testid="convs-search-btn">Search</Button>
      </div>

      <div className="bg-white border border-[#E1DFDA] rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Title</TableHead><TableHead>User</TableHead><TableHead>Model</TableHead><TableHead>Messages</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {convs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-[#5C6A64]">No conversations</TableCell></TableRow>}
            {convs.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm truncate max-w-xs">{c.title}</TableCell>
                <TableCell className="text-sm">{c.user?.email || c.user_id}</TableCell>
                <TableCell className="text-xs">{c.model}</TableCell>
                <TableCell className="text-xs">{c.message_count}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => open(c.id)} data-testid={`adminconv-${c.id}`}><Eye className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!activeConv} onOpenChange={(o) => !o && setActiveConv(null)}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{activeConv?.conversation?.title}</DialogTitle>
            <DialogDescription>{activeConv?.conversation?.message_count} messages · {activeConv?.conversation?.model}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-2">
            {activeConv?.messages.map((m) => (
              <div key={m.id} className={`p-3 rounded-xl text-sm ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
                <div className="text-[10px] uppercase tracking-[0.25em] mb-1 text-[#5C6A64]">{m.role}{m.model ? ` · ${m.model}` : ""}</div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try { const r = await api.get("/admin/settings"); setS(r.data); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  useEffect(() => { load(); }, []);

  if (!s) return <div className="text-[#5C6A64]">Loading...</div>;

  const toggleModel = (m) => {
    const enabled = s.enabled_models.includes(m);
    setS({ ...s, enabled_models: enabled ? s.enabled_models.filter((x) => x !== m) : [...s.enabled_models, m] });
  };

  const save = async () => {
    setSaving(true);
    try { await api.put("/admin/settings", s); toast.success("Settings saved"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white border border-[#E1DFDA] rounded-3xl p-6 md:p-8 space-y-5">
        <div>
          <h3 className="font-heading text-lg mb-1">Enabled models</h3>
          <p className="text-sm text-[#5C6A64] mb-4">Toggle which AI models users can pick from.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ALL_MODELS.map((m) => (
              <label key={m} className="flex items-center gap-3 p-3 rounded-xl border border-[#E1DFDA] cursor-pointer hover:bg-[#F9F8F6]">
                <Switch checked={s.enabled_models.includes(m)} onCheckedChange={() => toggleModel(m)} data-testid={`toggle-${m}`} />
                <span className="text-sm">{m}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">Default model</Label>
          <Input value={s.default_model} onChange={(e) => setS({ ...s, default_model: e.target.value })}
            className="mt-2 rounded-xl h-12 border-[#E1DFDA] bg-[#F9F8F6]" data-testid="default-model" />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">Voice (STT/TTS) enabled</Label>
          <div className="mt-2"><Switch checked={s.voice_enabled} onCheckedChange={(v) => setS({ ...s, voice_enabled: v })} data-testid="voice-toggle" /></div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">Max history messages</Label>
          <Input type="number" value={s.max_history_messages}
            onChange={(e) => setS({ ...s, max_history_messages: Number(e.target.value) })}
            className="mt-2 rounded-xl h-12 border-[#E1DFDA] bg-[#F9F8F6]" data-testid="max-history" />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">Disclaimer text</Label>
          <Textarea rows={4} value={s.disclaimer_text}
            onChange={(e) => setS({ ...s, disclaimer_text: e.target.value })}
            className="mt-2 rounded-xl border-[#E1DFDA] bg-[#F9F8F6]" data-testid="disclaimer-input" />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">Extra system prompt instructions</Label>
          <Textarea rows={4} value={s.system_prompt_extra}
            onChange={(e) => setS({ ...s, system_prompt_extra: e.target.value })}
            className="mt-2 rounded-xl border-[#E1DFDA] bg-[#F9F8F6]" placeholder="Optional global instructions appended to every system prompt..."
            data-testid="prompt-input" />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="rounded-full btn-sage h-12 px-10" data-testid="settings-save">
            {saving ? "..." : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
