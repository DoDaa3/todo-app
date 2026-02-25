import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { BoardSummary } from "../types";
import Navbar from "../components/Navbar";
import SearchModal from "../components/SearchModal";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { getSocket } from "../lib/socket";

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [sharedBoards, setSharedBoards] = useState<(BoardSummary & { sharedRole?: string; ownerName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    boardId: string | null;
  }>({ open: false, boardId: null });
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Global Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await api.get("/boards");
      const data = res.data;
      // Backend returns { owned: [...], shared: [...] }
      if (data.owned) {
        setBoards(data.owned);
        setSharedBoards(data.shared || []);
      } else {
        // Fallback for backward compatibility
        setBoards(Array.isArray(data) ? data : []);
        setSharedBoards([]);
      }
    } catch {
      showToast("Failed to fetch boards", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Real-time: refresh boards when membership changes via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("boards:updated", fetchBoards);
    return () => {
      socket.off("boards:updated", fetchBoards);
    };
  }, [fetchBoards]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await api.post("/boards", { title: newTitle.trim() });
      showToast("Board created", "success");
      navigate(`/board/${res.data.id}`);
    } catch {
      showToast("Failed to create board", "error");
    }
  }

  async function confirmDeleteBoard() {
    if (!deleteConfirm.boardId) return;
    try {
      await api.delete(`/boards/${deleteConfirm.boardId}`);
      setBoards((prev) => prev.filter((b) => b.id !== deleteConfirm.boardId));
      showToast("Board deleted", "success");
    } catch {
      showToast("Failed to delete board", "error");
    }
    setDeleteConfirm({ open: false, boardId: null });
  }

  const boardColors = [
    "from-brand-500 to-brand-700",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-sky-600",
    "from-violet-500 to-purple-600",
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">My Boards</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Manage and organize your projects</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold
              rounded-lg hover:from-brand-700 hover:to-brand-800 transition-all shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Board
          </button>
        </div>

        {creating && (
          <form
            onSubmit={handleCreate}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 p-4 mb-6 flex gap-3 shadow-sm"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Board name..."
              className="flex-1 px-3.5 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400
                placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold rounded-lg
                hover:from-brand-700 hover:to-brand-800 transition-all shadow-sm"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewTitle("");
              }}
              className="px-4 py-2 text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 text-sm font-medium rounded-lg
                hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 dark:border-t-brand-400 rounded-full animate-spin" />
          </div>
        ) : boards.length === 0 && sharedBoards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500/10 to-brand-700/10 dark:from-brand-500/20 dark:to-brand-700/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-brand-500 dark:text-brand-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              No boards yet. Create your first board to get started.
            </p>
          </div>
        ) : (
          <>
            {boards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {boards.map((board, i) => (
                  <div
                    key={board.id}
                    className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 overflow-hidden hover:shadow-lg
                      transition-all duration-200 cursor-pointer group hover:border-stone-300 dark:hover:border-stone-700"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    <div className={`h-2 bg-gradient-to-r ${boardColors[i % boardColors.length]}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {board.title}
                          </h3>
                          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                            {board._count.columns} columns
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, boardId: board.id });
                          }}
                          className="p-1.5 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors
                            opacity-0 group-hover:opacity-100"
                          title="Delete board"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-4 flex items-center text-xs text-stone-400 dark:text-stone-500">
                        <svg
                          className="w-3.5 h-3.5 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {new Date(board.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sharedBoards.length > 0 && (
              <>
                <div className="mt-10 mb-4">
                  <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Shared with me</h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Boards others have shared with you</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedBoards.map((board, i) => (
                    <div
                      key={board.id}
                      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 overflow-hidden hover:shadow-lg
                        transition-all duration-200 cursor-pointer group hover:border-stone-300 dark:hover:border-stone-700"
                      onClick={() => navigate(`/board/${board.id}`)}
                    >
                      <div className={`h-2 bg-gradient-to-r ${boardColors[(i + 3) % boardColors.length]}`} />
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {board.title}
                            </h3>
                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                              {board._count.columns} columns
                              {board.ownerName && <> &middot; by {board.ownerName}</>}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            board.sharedRole === "ADMIN"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : board.sharedRole === "EDITOR"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                          }`}>
                            {board.sharedRole === "ADMIN" ? "Admin" : board.sharedRole === "EDITOR" ? "Editor" : "Viewer"}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center text-xs text-stone-400 dark:text-stone-500">
                          <svg
                            className="w-3.5 h-3.5 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {new Date(board.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={deleteConfirm.open}
        title="Delete Board"
        message="Are you sure you want to delete this board? All columns and tasks will be permanently removed."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDeleteBoard}
        onCancel={() => setDeleteConfirm({ open: false, boardId: null })}
      />

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
