import { useState, useEffect } from "react";
import api from "../lib/api";
import { useToast } from "./Toast";
import { BoardRole } from "../types";

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
  currentUserId?: string;
  userRole?: BoardRole;
  onClose: () => void;
  onLeave: () => void;
}

const roleBadge: Record<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER", string> = {
  OWNER: "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
  ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  EDITOR: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  VIEWER: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

function Avatar({ name, color }: { name: string; color: "brand" | "stone" }) {
  const cls =
    color === "brand"
      ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400";
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${cls}`}>
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

export default function ShareBoardModal({
  open,
  boardId,
  currentUserId,
  userRole,
  onClose,
  onLeave,
}: ShareBoardModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">("VIEWER");
  const [shares, setShares] = useState<Share[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { showToast } = useToast();

  const isManager = userRole === "OWNER" || userRole === "ADMIN";

  useEffect(() => {
    if (open) {
      fetchShares();
      setEmail("");
      setRole("VIEWER");
      setLeaveConfirm(false);
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
      showToast(err.response?.data?.error || "Failed to invite user", "error");
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

  async function handleLeave() {
    const myShare = shares.find((s) => s.user.id === currentUserId);
    if (!myShare) return;
    setLeaving(true);
    try {
      await api.delete(`/boards/${boardId}/shares/${myShare.id}`);
      showToast("You have left the board", "success");
      onLeave();
    } catch {
      showToast("Failed to leave board", "error");
      setLeaving(false);
    }
  }

  if (!open) return null;

  const myShare = shares.find((s) => s.user.id === currentUserId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Share Board</h2>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
              {isManager ? "Manage who has access to this board" : "People with access to this board"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invite form — only for managers */}
        {isManager && (
          <form onSubmit={handleInvite} className="px-6 pb-4 border-b border-stone-200 dark:border-stone-800">
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
              {inviting ? "Sending…" : "Send Invite"}
            </button>
          </form>
        )}

        {/* People list */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">
            People with access
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {/* Owner row */}
              {owner && (
                <div className="flex items-center justify-between px-2 py-2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Avatar name={owner.name} color="brand" />
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-tight">
                        {owner.name}
                        {owner.id === currentUserId && (
                          <span className="ml-1.5 text-xs text-stone-400 dark:text-stone-500 font-normal">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{owner.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${roleBadge.OWNER}`}>
                    Owner
                  </span>
                </div>
              )}

              {/* Collaborator rows */}
              {shares.map((share) => {
                const isMe = share.user.id === currentUserId;
                return (
                  <div key={share.id}>
                    <div className={`flex items-center justify-between px-2 py-2 rounded-xl transition-colors ${
                      isMe ? "bg-stone-50 dark:bg-stone-800/50" : "hover:bg-stone-50 dark:hover:bg-stone-800/30"
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={share.user.name} color="stone" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-tight truncate">
                            {share.user.name}
                            {isMe && (
                              <span className="ml-1.5 text-xs text-stone-400 dark:text-stone-500 font-normal">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{share.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {isManager && !isMe ? (
                          /* Manager sees dropdown + remove button for others */
                          <>
                            <select
                              value={share.role}
                              onChange={(e) => handleUpdateRole(share.id, e.target.value as "ADMIN" | "EDITOR" | "VIEWER")}
                              className="text-xs px-2 py-1 border border-stone-200 dark:border-stone-700 rounded-lg
                                bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300
                                focus:outline-none focus:ring-1 focus:ring-brand-500/40 transition-colors cursor-pointer"
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemove(share.id)}
                              className="p-1.5 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400
                                hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove collaborator"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : isMe && !isManager ? (
                          /* Non-manager sees their own role badge + Leave button */
                          <>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${roleBadge[share.role]}`}>
                              {share.role.charAt(0) + share.role.slice(1).toLowerCase()}
                            </span>
                            <button
                              onClick={() => setLeaveConfirm(true)}
                              className="text-xs px-2.5 py-1.5 text-red-600 dark:text-red-400 font-medium
                                border border-red-200 dark:border-red-800 rounded-lg
                                hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Leave
                            </button>
                          </>
                        ) : (
                          /* Manager looking at their own row — just a badge */
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${roleBadge[share.role]}`}>
                            {share.role.charAt(0) + share.role.slice(1).toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Leave confirmation — inline, below that row */}
                    {isMe && leaveConfirm && (
                      <div className="mx-2 mb-2 mt-1 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Leave this board?</p>
                            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5 leading-relaxed">
                              You'll lose access immediately. The board owner can re-invite you later.
                            </p>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={handleLeave}
                                disabled={leaving}
                                className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold
                                  rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {leaving ? "Leaving…" : "Yes, leave board"}
                              </button>
                              <button
                                onClick={() => setLeaveConfirm(false)}
                                disabled={leaving}
                                className="flex-1 px-3 py-1.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300
                                  text-xs font-semibold border border-stone-200 dark:border-stone-700 rounded-lg
                                  hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {shares.length === 0 && (
                <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-4">
                  No collaborators yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer hint for non-managers */}
        {!isManager && myShare && (
          <div className="px-6 pb-5">
            <p className="text-xs text-stone-400 dark:text-stone-500 text-center">
              Contact the board owner to change your access level.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
