import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 via-brand-50 to-stone-100 dark:from-stone-950 dark:via-brand-950/20 dark:to-stone-950 px-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-brand-900/10 border border-stone-200/50 dark:border-stone-800 w-full max-w-sm p-8 animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/25">
            <svg
              className="w-7 h-7 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Sign in to your FlowBoard</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-4 border border-red-100 dark:border-red-800/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400
                placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400
                placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold rounded-lg
              hover:from-brand-700 hover:to-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
              dark:focus:ring-offset-stone-900
              disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-6">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
