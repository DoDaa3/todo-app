import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setSubmitting(true);
    try {
      const result = await signup(email, name, password);
      setSuccessMessage(result.message);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Signup failed. Please try again.");
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
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Create account</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Start organizing your projects
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-4 border border-red-100 dark:border-red-800/30">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-emerald-700 dark:text-emerald-400 font-medium mb-2">
              {successMessage}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
              We sent a verification link to <strong className="text-stone-700 dark:text-stone-300">{email}</strong>. Click the
              link in the email to activate your account.
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold rounded-lg
                hover:from-brand-700 hover:to-brand-800 transition-all shadow-md shadow-brand-600/25"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                    bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400
                    placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors"
                  placeholder="Your name"
                />
              </div>
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
                  minLength={6}
                  className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                    bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400
                    placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors"
                  placeholder="Min. 6 characters"
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
                {submitting ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
