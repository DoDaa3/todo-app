import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link — no token provided.");
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    api
      .get(`/auth/verify/${token}`)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.error || "Verification failed. Please try again."
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 via-brand-50 to-stone-100 dark:from-stone-950 dark:via-brand-950/20 dark:to-stone-950 px-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-brand-900/10 border border-stone-200/50 dark:border-stone-800 w-full max-w-sm p-8 text-center animate-fade-up">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 dark:border-t-brand-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-stone-600 dark:text-stone-400">Verifying your email...</p>
          </>
        )}

        {status === "success" && (
          <>
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
              Email Verified!
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold rounded-lg
                hover:from-brand-700 hover:to-brand-800 transition-all shadow-md shadow-brand-600/25"
            >
              Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
              Verification Failed
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold rounded-lg
                hover:from-brand-700 hover:to-brand-800 transition-all shadow-md shadow-brand-600/25"
            >
              Go to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
