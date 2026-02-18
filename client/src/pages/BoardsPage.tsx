import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { BoardSummary } from "../types";
import Navbar from "../components/Navbar";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    boardId: string | null;
  }>({ open: false, boardId: null });
  const navigate = useNavigate();
  const { showToast } = useToast();

  const fetchBoards = useCallback(async () => {
    try {
      const res = await api.get("/boards");
      setBoards(res.data);
    } catch (err) {
      showToast("Failed to fetch boards", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await api.post("/boards", { title: newTitle.trim() });
      showToast("Board created", "success");
      navigate(`/board/${res.data.id}`);
    } catch (err) {
      showToast("Failed to create board", "error");
    }
  }

  async function confirmDeleteBoard() {
    if (!deleteConfirm.boardId) return;
    try {
      await api.delete(`/boards/${deleteConfirm.boardId}`);
      setBoards((prev) => prev.filter((b) => b.id !== deleteConfirm.boardId));
      showToast("Board deleted", "success");
    } catch (err) {
      showToast("Failed to delete board", "error");
    }
    setDeleteConfirm({ open: false, boardId: null });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Boards</h1>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium
              rounded-lg hover:bg-brand-700 transition-colors"
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
            className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Board name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg
                hover:bg-brand-700 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewTitle("");
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 text-sm font-medium rounded-lg
                hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              No boards yet. Create your first board to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md
                  transition-shadow cursor-pointer group"
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                      {board.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {board._count.columns} columns
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ open: true, boardId: board.id });
                    }}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors
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
                <div className="mt-4 flex items-center text-xs text-gray-400">
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
            ))}
          </div>
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
    </div>
  );
}
