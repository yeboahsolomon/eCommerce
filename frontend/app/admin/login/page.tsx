"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent, useEffect, Suspense } from "react";
import Link from "next/link";
import { Store, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import PhoneVerificationModal from "@/components/auth/PhoneVerificationModal";

function AdminLoginContent() {
  const { isAuthenticated, user, login, verifyAdminOtp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (isAuthenticated && user?.role === "SUPERADMIN") {
      router.push("/admin");
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await login(email, password);
      
      if (res.success) {
        if (res.otpRequired) {
          // Trigger MFA Flow
          setPreAuthToken(res.preAuthToken || "");
          setPhoneNumber(res.user?.phone || "");
          setShowOtpModal(true);
        } else {
          // Fallback (e.g., if a non-superadmin logs in here, though normally blocked)
          const profileRes = await api.getProfile();
          if (profileRes.success && profileRes.data?.user?.role === "SUPERADMIN") {
            router.push("/admin");
          } else {
            setError("Access denied. Super Admin privileges required.");
            await api.logout();
            window.location.reload();
          }
        }
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSuccess = async (idToken: string) => {
    setIsLoading(true);
    setError("");
    setShowOtpModal(false);

    try {
      const res = await verifyAdminOtp(preAuthToken, idToken);
      if (res.success) {
        router.push("/admin");
      } else {
        setError(res.message || "OTP Verification failed.");
      }
    } catch (err) {
      setError("Failed to verify OTP. Please try logging in again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-20 w-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-[24px] mb-6 shadow-2xl shadow-blue-500/20 relative group overflow-hidden">
            <div className="absolute inset-0 bg-white/20 blur-md rounded-full transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <Store className="h-10 w-10 text-white relative z-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Admin Portal</h1>
          <p className="text-slate-400 mt-2 font-medium tracking-wide text-sm uppercase">Ghana Market Management</p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-slate-800/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
          <h2 className="text-xl font-semibold text-white mb-8 text-center">Secure Sign In</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm shadow-inner shadow-red-500/5">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-slate-400 pl-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner shadow-black/20"
                placeholder="superadmin@ghanamarket.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-400 pl-1">
                Password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner shadow-black/20 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transform hover:-translate-y-0.5 active:translate-y-0 mt-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <p className="text-slate-500 text-sm">
              Superadmin configuration required?{" "}
              <Link href="/admin/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Initialize setup
              </Link>
            </p>
          </div>
        </div>

        {/* Back to store */}
        <div className="text-center mt-6">
          <Link href="/" className="text-slate-400 hover:text-white text-sm transition">
            ← Back to Store
          </Link>
        </div>
      </div>

      {/* MFA Modal */}
      <PhoneVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSuccess={handleOtpSuccess}
        phoneNumber={phoneNumber}
      />
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
