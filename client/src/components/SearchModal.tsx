import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { SearchResults } from "../types";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) {
          // Parent handles opening
        } else {
          inputRef.current?.focus();
        }
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/search", { params: { q: q.trim() } });
      setResults(res.data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function goToBoard(boardId: string) {
    navigate(`/board/${boardId}`);
    onClose();
  }

  if (!open) return null;

  const hasResults = results && (results.tasks.length > 0 || results.boards.length > 0 || results.comments.length > 0);
  const noResults = results && !hasResults && query.trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 dark:border-stone-800">
          <svg className="w-5 h-5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search tasks, boards, comments..."
            className="flex-1 text-sm bg-transparent border-none outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-medium text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          )}

          {!loading && noResults && (
            <div className="text-center py-8">
              <p className="text-sm text-stone-400 dark:text-stone-500">No results for "{query}"</p>
            </div>
          )}

          {!loading && hasResults && (
            <div className="py-2">
              {/* Boards */}
              {results!.boards.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Boards
                  </div>
                  {results!.boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => goToBoard(board.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-stone-900 dark:text-stone-100">{board.title}</div>
                        <div className="text-xs text-stone-400">{board._count.columns} columns</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {results!.tasks.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Tasks
                  </div>
                  {results!.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        const boardId = task.column?.board?.id;
                        if (boardId) goToBoard(boardId);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-stone-500 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{task.title}</div>
                        <div className="text-xs text-stone-400 truncate">
                          {task.column?.board?.title || ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Comments */}
              {results!.comments.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Comments
                  </div>
                  {results!.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                    >
                      <div className="text-sm text-stone-700 dark:text-stone-300 line-clamp-1">{comment.content}</div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        on task: {comment.task?.title || "Unknown"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="text-center py-8">
              <p className="text-sm text-stone-400 dark:text-stone-500">Start typing to search...</p>
              <p className="text-xs text-stone-300 dark:text-stone-600 mt-1">Search across tasks, boards, and comments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
