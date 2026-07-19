import React, { useEffect, useMemo, useState } from "react";
import {
  Radio,
  Image as ImageIcon,
  Users,
  Check,
  X as XIcon,
  Send,
  Clock,
  ShieldCheck,
  ChevronRight,
  FileText,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const PLATFORMS = [
  { id: "x", label: "X", icon: Radio },
  { id: "facebook", label: "Facebook", icon: Users },
  { id: "instagram", label: "Instagram", icon: ImageIcon },
  { id: "press", label: "Press statement", icon: FileText },
];

const STATUS = {
  draft: { label: "Draft", color: "#7C8699" },
  pending: { label: "Awaiting approval", color: "#B8935F" },
  approved: { label: "Cleared", color: "#4C6B52" },
  rejected: { label: "Returned", color: "#A8352E" },
};

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return new Date(ts).toLocaleDateString();
}

function Seal({ show }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-500 ${
        show ? "opacity-100 scale-100" : "opacity-0 scale-150"
      }`}
      style={{ transitionTimingFunction: "cubic-bezier(.2,1.4,.4,1)" }}
    >
      <div
        className="flex h-28 w-28 rotate-[-14deg] items-center justify-center rounded-full border-4 text-center"
        style={{ borderColor: "#B8935F", color: "#B8935F" }}
      >
        <span className="font-mono text-[10px] font-semibold tracking-[0.2em]">
          CLEARED
          <br />
          FOR RELEASE
        </span>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div
      className="flex h-screen w-full items-center justify-center"
      style={{ background: "#0F1626", color: "#EDEBE3", fontFamily: "Inter, sans-serif" }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-6">
        <div className="font-display text-2xl font-semibold" style={{ color: "#B8935F", fontFamily: "Fraunces, serif" }}>
          The Desk
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5B6478" }}>
          Office of Public Voice
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "#9AA3B5" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style={{ background: "#111A2C", borderColor: "#2C3752", color: "#EDEBE3" }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "#9AA3B5" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style={{ background: "#111A2C", borderColor: "#2C3752", color: "#EDEBE3" }}
            />
          </div>
          {error && (
            <div className="text-xs" style={{ color: "#A8352E" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-2.5 text-sm font-semibold transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "#B8935F", color: "#0F1626" }}
          >
            {loading ? "Signing in鈥�" : "Sign in"}
          </button>
          <p className="text-xs" style={{ color: "#5B6478" }}>
            Accounts are created in the Supabase dashboard for now (Authentication 鈫� Users 鈫� Add user). See README.md.
          </p>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [principals, setPrincipals] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [roleView, setRoleView] = useState("approver");
  const [composing, setComposing] = useState(false);
  const [sealing, setSealing] = useState(null);
  const [draft, setDraft] = useState({ principalId: "", platform: "x", content: "" });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadData();

    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        loadData();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadData() {
    setLoadingData(true);
    const [{ data: principalsData }, { data: postsData }] = await Promise.all([
      supabase.from("principals").select("*").order("name"),
      supabase.from("posts").select("*").order("created_at", { ascending: false }),
    ]);
    setPrincipals(principalsData || []);
    setPosts(postsData || []);
    if (principalsData && principalsData.length && !draft.principalId) {
      setDraft((d) => ({ ...d, principalId: principalsData[0].id }));
    }
    if (postsData && postsData.length && !selectedId) {
      setSelectedId(postsData[0].id);
    }
    setLoadingData(false);
  }

  const selected = posts.find((p) => p.id === selectedId) || null;

  const grouped = useMemo(() => {
    const order = ["pending", "draft", "rejected", "approved"];
    return [...posts].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  }, [posts]);

  function principalOf(id) {
    return principals.find((p) => p.id === id) || { name: "Unknown", role: "" };
  }
  function platformOf(id) {
    return PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];
  }

  async function act(id, status, note) {
    if (status === "approved") {
      setSealing(id);
      setTimeout(() => setSealing(null), 900);
    }
    const update = { status };
    if (note !== undefined) update.note = note;
    await supabase.from("posts").update(update).eq("id", id);
    loadData();
  }

  async function submitDraft(sendNow) {
    if (!draft.content.trim() || !draft.principalId) return;
    const email = session?.user?.email || "Unknown";
    await supabase.from("posts").insert({
      principal_id: draft.principalId,
      platform: draft.platform,
      content: draft.content.trim(),
      status: sendNow ? "pending" : "draft",
      author: email,
    });
    setDraft((d) => ({ ...d, content: "" }));
    setComposing(false);
    loadData();
  }

  if (session === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "#0F1626", color: "#5B6478" }}>
        Loading鈥�
      </div>
    );
  }
  if (!session) return <LoginScreen />;

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "#0F1626", color: "#EDEBE3", fontFamily: "Inter, sans-serif" }}
    >
      <style>{`
        .font-display { font-family: 'Fraunces', serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r md:flex" style={{ borderColor: "#232C42", background: "#0B1220" }}>
        <div className="px-6 py-6">
          <div className="font-display text-xl font-semibold tracking-tight" style={{ color: "#B8935F" }}>
            The Desk
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5B6478" }}>
            Office of Public Voice
          </div>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-3">
          <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5B6478" }}>
            Principals
          </div>
          {principals.map((p) => (
            <div key={p.id} className="mx-1 mb-1 rounded-md px-3 py-2.5" style={{ background: "#111A2C" }}>
              <div className="text-sm font-medium" style={{ color: "#EDEBE3" }}>
                {p.name}
              </div>
              <div className="text-xs" style={{ color: "#7C8699" }}>
                {p.role}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t px-4 py-4" style={{ borderColor: "#232C42" }}>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5B6478" }}>
            Viewing as
          </div>
          <div className="flex rounded-md p-1" style={{ background: "#111A2C" }}>
            {["approver", "ghostwriter"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleView(r)}
                className="flex-1 rounded px-2 py-1.5 text-xs font-medium capitalize transition"
                style={{ background: roleView === r ? "#B8935F" : "transparent", color: roleView === r ? "#0F1626" : "#9AA3B5" }}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-3 flex items-center gap-1.5 text-xs"
            style={{ color: "#5B6478" }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Queue */}
      <section className="flex w-full max-w-md shrink-0 flex-col border-r" style={{ borderColor: "#232C42" }}>
        <div className="flex items-center justify-between px-5 py-5">
          <h1 className="font-display text-lg font-semibold">Dispatch queue</h1>
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:brightness-110"
            style={{ background: "#B8935F", color: "#0F1626" }}
          >
            <FileText size={13} /> New
          </button>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-6">
          {loadingData && posts.length === 0 && (
            <div className="px-4 py-6 text-sm" style={{ color: "#5B6478" }}>
              Loading dispatches鈥�
            </div>
          )}
          {!loadingData && posts.length === 0 && (
            <div className="px-4 py-6 text-sm" style={{ color: "#5B6478" }}>
              No dispatches yet. Create one with "New".
            </div>
          )}
          {grouped.map((post) => {
            const principal = principalOf(post.principal_id);
            const platform = platformOf(post.platform);
            const st = STATUS[post.status];
            const Icon = platform.icon;
            const isSelected = post.id === selectedId;
            return (
              <button
                key={post.id}
                onClick={() => setSelectedId(post.id)}
                className="relative block w-full rounded-lg px-4 py-3.5 text-left transition"
                style={{ background: isSelected ? "#151F35" : "transparent", border: `1px solid ${isSelected ? "#2C3752" : "transparent"}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "#9AA3B5" }}>
                    {principal.name}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: "#5B6478" }}>
                    {timeAgo(post.created_at)}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm leading-snug" style={{ color: "#D9D6CC" }}>
                  {post.content}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                    style={{ background: st.color + "22", color: st.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
                    {st.label}
                  </span>
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: "#5B6478" }}>
                    <Icon size={11} /> {platform.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Detail / case file */}
      <section className="relative flex-1 overflow-y-auto">
        {composing ? (
          <div className="mx-auto max-w-xl px-8 py-10">
            <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "#5B6478" }}>
              New dispatch
            </div>
            <h2 className="font-display text-2xl font-semibold" style={{ color: "#EDEBE3" }}>
              Draft a statement
            </h2>

            <div className="mt-7 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "#9AA3B5" }}>
                  Principal
                </label>
                <select
                  value={draft.principalId}
                  onChange={(e) => setDraft((d) => ({ ...d, principalId: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
                  style={{ background: "#111A2C", borderColor: "#2C3752", color: "#EDEBE3" }}
                >
                  {principals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "#9AA3B5" }}>
                  Platform
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((pl) => {
                    const Icon = pl.icon;
                    const active = draft.platform === pl.id;
                    return (
                      <button
                        key={pl.id}
                        onClick={() => setDraft((d) => ({ ...d, platform: pl.id }))}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition"
                        style={{ background: active ? "#B8935F" : "#111A2C", color: active ? "#0F1626" : "#9AA3B5", border: `1px solid ${active ? "#B8935F" : "#2C3752"}` }}
                      >
                        <Icon size={12} /> {pl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "#9AA3B5" }}>
                  Content
                </label>
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                  rows={6}
                  placeholder="Write in the principal's voice鈥�"
                  className="w-full resize-none rounded-md border px-3 py-2.5 text-sm leading-relaxed outline-none"
                  style={{ background: "#111A2C", borderColor: "#2C3752", color: "#EDEBE3" }}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => submitDraft(false)}
                  className="rounded-md px-4 py-2.5 text-sm font-medium transition"
                  style={{ background: "#1B2438", color: "#D9D6CC", border: "1px solid #2C3752" }}
                >
                  Save as draft
                </button>
                <button
                  onClick={() => submitDraft(true)}
                  className="flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold transition hover:brightness-110"
                  style={{ background: "#B8935F", color: "#0F1626" }}
                >
                  <Send size={13} /> Send for approval
                </button>
                <button onClick={() => setComposing(false)} className="ml-auto px-3 py-2.5 text-sm" style={{ color: "#5B6478" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="relative mx-auto max-w-xl px-8 py-10">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "#5B6478" }}>
              Case file 路 {selected.id.slice(0, 8)}
            </div>

            <div className="mt-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold" style={{ color: "#EDEBE3" }}>
                  {principalOf(selected.principal_id).name}
                </h2>
                <p className="text-sm" style={{ color: "#7C8699" }}>
                  {principalOf(selected.principal_id).role}
                </p>
              </div>
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wide"
                style={{ background: STATUS[selected.status].color + "22", color: STATUS[selected.status].color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS[selected.status].color }} />
                {STATUS[selected.status].label}
              </span>
            </div>

            <div className="relative mt-7 rounded-lg border p-6" style={{ background: "#111A2C", borderColor: "#2C3752" }}>
              <Seal show={sealing === selected.id} />
              <div className="flex items-center gap-2 text-xs" style={{ color: "#5B6478" }}>
                {React.createElement(platformOf(selected.platform).icon, { size: 12 })}
                {platformOf(selected.platform).label}
                <span>路</span>
                <Clock size={11} /> {timeAgo(selected.created_at)}
              </div>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#EDEBE3" }}>
                {selected.content}
              </p>
              <div className="mt-4 border-t pt-3 text-xs" style={{ borderColor: "#232C42", color: "#5B6478" }}>
                Drafted by {selected.author}
              </div>
            </div>

            {selected.note && (
              <div
                className="mt-4 flex items-start gap-2 rounded-md border px-4 py-3 text-sm"
                style={{ borderColor: "#3A2622", background: "#1F1613", color: "#D6A79A" }}
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {selected.note}
              </div>
            )}

            {roleView === "approver" && selected.status === "pending" && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => act(selected.id, "approved")}
                  className="flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold transition hover:brightness-110"
                  style={{ background: "#4C6B52", color: "#EDEBE3" }}
                >
                  <Check size={14} /> Clear for release
                </button>
                <button
                  onClick={() => act(selected.id, "rejected", "Returned for revision.")}
                  className="flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold transition hover:brightness-110"
                  style={{ background: "#A8352E", color: "#EDEBE3" }}
                >
                  <XIcon size={14} /> Return
                </button>
              </div>
            )}

            {roleView === "ghostwriter" && selected.status === "draft" && (
              <div className="mt-6">
                <button
                  onClick={() => act(selected.id, "pending")}
                  className="flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold transition hover:brightness-110"
                  style={{ background: "#B8935F", color: "#0F1626" }}
                >
                  <Send size={14} /> Send for approval
                </button>
              </div>
            )}

            {selected.status === "approved" && (
              <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: "#4C6B52" }}>
                <ShieldCheck size={15} /> Ready to publish — queued for release.
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: "#5B6478" }}>
            Select a dispatch <ChevronRight size={14} className="ml-1" />
          </div>
        )}
      </section>
    </div>
  );
}
