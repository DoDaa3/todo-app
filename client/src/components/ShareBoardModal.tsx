import { useState, useEffect } from "react";
import api from "../lib/api";
import { useToast } from "./Toast";

interface Share {
  id: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

interface Owner {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface ShareBoardModalProps {
  open: boolean;
  boardId: string;
  onClose: () => void;
}

export default function ShareBoardModal({ open, boardId, onClose }: ShareBoardModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">("VIEWER");
  const [shares, setShares] = useState<Share[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      fetchShares();
      setEmail("");
      setRole("VIEWER");
    }
  }, [open, boardId]);

  async function fetchShares() {
    setLoading(true);
    try {
      const res = await api.get(`/boards/${boardId}/shares`);
      setShares(res.data.shares || []);
      setOwner(res.data.owner || null);
    } catch {
      showToast("Failed to load collaborators", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await api.post(`/boards/${boardId}/shares`, { email: email.trim(), role });
      setShares((prev) => [...prev, res.data]);
      setEmail("");
      showToast("Invitation sent", "success");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to invite user";
      showToast(msg, "error");
    } finally {
      setInviting(false);
    }
  }

  async function handleUpdateRole(shareId: string, newRole: "ADMIN" | "EDITOR" | "VIEWER") {
    try {
      const res = await api.patch(`/boards/${boardId}/shares/${shareId}`, { role: newRole });
      setShares((prev) => prev.map((s) => (s.id === shareId ? res.data : s)));
      showToast("Role updated", "success");
    } catch {
      showToast("Failed to update role", "error");
    }
  }

  async function handleRemove(shareId: string) {
    try {
      await api.delete(`/boards/${boardId}/shares/${shareId}`);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      showToast("Collaborator removed", "success");
    } catch {
      showToast("Failed to remove collaborator", "error");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Share Board</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invite form */}
        <form onSubmit={handleInvite} className="px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            Invite by email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "EDITOR" | "VIEWER")}
              className="px-2 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting || !email.trim()}
            className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold
              rounded-lg hover:from-brand-700 hover:to-brand-800 transition-all shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>

        {/* Collaborator list */}
        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
            People with access
          </p>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Owner */}
              {owner && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-300 text-sm font-semibold">
                      {owner.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{owner.name}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{owner.email}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 font-medium">
                    Owner
                  </span>
                </div>
              )}

              {/* Shared users */}
              {shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 text-sm font-semibold">
                      {share.user.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{share.user.name}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{share.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={share.role}
                      onChange={(e) => handleUpdateRole(share.id, e.target.value as "ADMIN" | "EDITOR" | "VIEWER")}
                      className="text-xs px-2 py-1 border border-stone-200 dark:border-stone-700 rounded-lg
                        bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300
                        focus:outline-none focus:ring-1 focus:ring-brand-500/40 transition-colors"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemove(share.id)}
                      className="p-1 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {shares.length === 0 && (
                <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-2">
                  No collaborators yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
