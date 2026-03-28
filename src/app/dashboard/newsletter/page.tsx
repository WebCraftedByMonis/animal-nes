"use client";

import { useEffect, useState } from "react";
import { Mail, Trash2, Send, Users, RefreshCw } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: "Newsletter" | "User";
  subscribedAt: string;
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent?: number; failed?: number; errors?: string[] } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSubscribers = async () => {
    setLoading(true);
    const res = await fetch("/api/newsletter/subscribers");
    const data = await res.json();
    if (data.success) setSubscribers(data.subscribers);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    await fetch("/api/newsletter/subscribers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSubscribers(s => s.filter(x => x.id !== id));
    setDeleteId(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    const res = await fetch("/api/newsletter/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, previewText }),
    });
    const data = await res.json();
    setSendResult(data);
    setSending(false);
    if (data.success) { setSubject(""); setMessage(""); setPreviewText(""); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
          <Mail className="w-7 h-7 text-emerald-600" />
          Newsletter
        </h1>
        <p className="text-gray-500 text-sm">Manage subscribers and send email campaigns.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ── Send Email ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            Send Newsletter
          </h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preview Text (optional)</label>
              <input
                type="text"
                value={previewText}
                onChange={e => setPreviewText(e.target.value)}
                placeholder="Short teaser shown in inbox preview..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Message *</label>
              <textarea
                required
                rows={10}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your newsletter content here. You can use line breaks for formatting."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400 resize-y"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-400">
                Will be sent to <span className="font-semibold text-gray-600">{subscribers.length}</span> subscriber{subscribers.length !== 1 ? "s" : ""}
              </p>
              <button
                type="submit"
                disabled={sending || subscribers.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending ? "Sending..." : "Send to All"}
              </button>
            </div>
          </form>

          {/* Result */}
          {sendResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${sendResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {sendResult.success
                ? `✓ Sent to ${sendResult.sent} subscriber${sendResult.sent !== 1 ? "s" : ""}${sendResult.failed ? ` (${sendResult.failed} failed)` : ""}`
                : `✗ ${(sendResult as any).error}`}
              {sendResult.errors && sendResult.errors.length > 0 && (
                <ul className="mt-2 text-xs opacity-80 space-y-1">
                  {sendResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Subscribers List ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Subscribers
              <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {subscribers.length}
              </span>
            </h2>
            <button onClick={fetchSubscribers} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : subscribers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No subscribers yet.</p>
          ) : (
            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
              {subscribers.map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{sub.email}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                      {sub.name && <span>{sub.name}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        sub.source === "Newsletter" ? "bg-emerald-100 text-emerald-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{sub.source}</span>
                      <span>{sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString() : ""}</span>
                    </p>
                  </div>
                  {sub.source === "Newsletter" && (
                    <button
                      onClick={() => handleDelete(sub.id)}
                      disabled={deleteId === sub.id}
                      className="ml-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
