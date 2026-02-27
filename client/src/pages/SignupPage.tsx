import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

interface StrengthCheck {
  label: string;
  met: boolean;
}

function getPasswordStrength(password: string): { score: number; checks: StrengthCheck[] } {
  const checks: StrengthCheck[] = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.met).length;
  return { score, checks };
}

function getStrengthLabel(score: number): { text: string; color: string; barColor: string } {
  if (score === 0) return { text: "", color: "", barColor: "" };
  if (score <= 2) return { text: "Weak", color: "text-red-500", barColor: "bg-red-500" };
  if (score <= 3) return { text: "Fair", color: "text-amber-500", barColor: "bg-amber-500" };
  if (score <= 4) return { text: "Good", color: "text-brand-500", barColor: "bg-brand-500" };
  return { text: "Strong", color: "text-emerald-500", barColor: "bg-emerald-500" };
}

export default function SignupPage() {
  const { signup } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { score, checks } = useMemo(() => getPasswordStrength(password), [password]);
  const strengthInfo = useMemo(() => getStrengthLabel(score), [score]);
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (score < 3) {
      setError("Please choose a stronger password.");
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 via-brand-50 to-stone-100 dark:from-stone-950 dark:via-brand-950/20 dark:to-stone-950 px-4 relative">
      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-2.5 text-stone-500 dark:text-stone-400 hover:text-amber-500 dark:hover:text-amber-400
          rounded-xl bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm border border-stone-200/60 dark:border-stone-700/60
          hover:bg-white dark:hover:bg-stone-800 shadow-sm transition-all"
        title={darkMode ? "Light mode" : "Dark mode"}
      >
        {darkMode ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

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
                  className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
                    bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400
                    placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors"
                  placeholder="Create a strong password"
                />

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-3">
                    {/* Strength bars */}
                    <div className="flex gap-1.5 mb-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className="h-1.5 flex-1 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden"
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              score >= level ? strengthInfo.barColor : ""
                            }`}
                            style={{
                              width: score >= level ? "100%" : "0%",
                              transitionDelay: `${(level - 1) * 75}ms`,
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Strength label */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold transition-colors ${strengthInfo.color}`}>
                        {strengthInfo.text}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-stone-500">
                        {score}/5 requirements
                      </span>
                    </div>

                    {/* Requirements checklist */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {checks.map((check) => (
                        <div
                          key={check.label}
                          className={`flex items-center gap-1.5 text-[11px] transition-colors duration-300 ${
                            check.met
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-stone-400 dark:text-stone-500"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                              check.met
                                ? "bg-emerald-100 dark:bg-emerald-900/40 scale-100"
                                : "bg-stone-100 dark:bg-stone-800 scale-90"
                            }`}
                          >
                            {check.met ? (
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600" />
                            )}
                          </div>
                          {check.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm
                    bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                    focus:outline-none focus:ring-2 focus:ring-brand-500/40
                    placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors ${
                      !passwordsMatch
                        ? "border-red-400 dark:border-red-600 focus:border-red-400"
                        : "border-stone-300 dark:border-stone-700 focus:border-brand-500 dark:focus:border-brand-400"
                    }`}
                  placeholder="Re-enter your password"
                />
                {!passwordsMatch && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !passwordsMatch || score < 3}
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
