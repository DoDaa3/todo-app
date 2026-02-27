import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import Navbar from "../components/Navbar";
import ImageCropModal from "../components/ImageCropModal";
import api from "../lib/api";

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

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile info
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Image crop
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Password strength
  const { score, checks } = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const strengthInfo = useMemo(() => getStrengthLabel(score), [score]);
  const passwordsMatch = confirmNewPassword === "" || newPassword === confirmNewPassword;

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCropDone(croppedImage: string) {
    setAvatarPreview(croppedImage);
    setCropModalOpen(false);
  }

  function removeAvatar() {
    setAvatarPreview(null);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");
    setEmailError("");

    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.patch("/auth/profile", {
        name: name.trim(),
        email: email.trim(),
        avatarUrl: avatarPreview || null,
      });

      // Update auth context directly (no page reload needed)
      updateUser(res.data.user);

      if (res.data.pendingEmail) {
        setPendingEmail(res.data.pendingEmail);
        // Reset email input to current (unchanged) email since new one needs verification
        setEmail(res.data.user.email);
        showToast("Verification email sent to " + res.data.pendingEmail, "success");
      } else {
        setPendingEmail(null);
        showToast("Profile updated", "success");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to update profile";
      if (errorMsg.toLowerCase().includes("name")) {
        setNameError(errorMsg);
      } else if (errorMsg.toLowerCase().includes("email")) {
        setEmailError(errorMsg);
      } else {
        showToast(errorMsg, "error");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (score < 3) {
      showToast("Please choose a stronger password", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch("/auth/password", {
        currentPassword,
        newPassword,
      });
      showToast("Password changed successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to change password", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      showToast("Enter your password to confirm", "error");
      return;
    }
    setDeleting(true);
    try {
      await api.delete("/auth/account", { data: { password: deletePassword } });
      showToast("Account deleted", "info");
      logout();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to delete account", "error");
    } finally {
      setDeleting(false);
    }
  }

  const inputClass = `w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-lg text-sm
    bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
    focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400
    placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-colors`;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Profile Settings</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Manage your account information</p>
          </div>
        </div>

        {/* Profile Information */}
        <form onSubmit={handleSaveProfile} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white mb-5">Profile Information</h2>

          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6">
            <div className="relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-stone-200 dark:border-stone-700"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              >
                Change photo
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="block text-sm text-stone-500 dark:text-stone-400 hover:text-red-500 dark:hover:text-red-400 mt-1 transition-colors"
                >
                  Remove photo
                </button>
              )}
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">JPG, PNG. Max 2MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              required
              className={`${inputClass} ${nameError ? "!border-red-400 dark:!border-red-600 !ring-red-500/40" : ""}`}
              placeholder="Your name"
            />
            {nameError && (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {nameError}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              required
              className={`${inputClass} ${emailError ? "!border-red-400 dark:!border-red-600 !ring-red-500/40" : ""}`}
              placeholder="you@example.com"
            />
            {emailError ? (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {emailError}
              </p>
            ) : pendingEmail ? (
              <div className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Verification email sent to <strong>{pendingEmail}</strong>. Check your inbox to confirm the change.
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Changing your email requires verification from the new email.</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold rounded-lg
                hover:from-brand-700 hover:to-brand-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all
                shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30"
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white mb-5">Change Password</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="Enter current password"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="Create a strong password"
            />

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <div className="mt-3">
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

                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold transition-colors ${strengthInfo.color}`}>
                    {strengthInfo.text}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">
                    {score}/5 requirements
                  </span>
                </div>

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

          <div className="mb-5">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              className={`${inputClass} ${
                !passwordsMatch ? "!border-red-400 dark:!border-red-600" : ""
              }`}
              placeholder="Re-enter new password"
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || !passwordsMatch || score < 3}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold rounded-lg
                hover:from-brand-700 hover:to-brand-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all
                shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30"
            >
              {savingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            Once you delete your account, there is no going back. All your boards, tasks, and data will be permanently removed.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800
                rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800/50">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-3">
                Enter your password to confirm deletion:
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className={`${inputClass} mb-3 !border-red-300 dark:!border-red-800`}
                placeholder="Your password"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePassword}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700
                    rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800
                    rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={cropModalOpen}
        imageSrc={rawImageSrc}
        onClose={() => setCropModalOpen(false)}
        onCropDone={handleCropDone}
      />
    </div>
  );
}
