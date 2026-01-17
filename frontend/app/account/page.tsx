import Link from "next/link";
import { UserCircle, LogIn } from "lucide-react";

export default function AccountPage() {
  // In the future, we will check if (user) exists here.
  // If user exists -> Show Profile.
  // If not -> Show this Login prompt.

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="mb-6 rounded-full bg-slate-100 p-6">
        <UserCircle className="h-16 w-16 text-slate-400" />
      </div>
      
      <h1 className="mb-2 text-2xl font-bold text-slate-900">My Account</h1>
      <p className="mb-8 max-w-sm text-slate-500">
        Log in to track your orders, manage your delivery addresses, and view your wishlists.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/auth/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-95"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
        
        <Link
          href="/auth/register"
          className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}
