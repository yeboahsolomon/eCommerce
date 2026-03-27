"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  
  const token = params.token as string;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token) {
      toast.error("Invalid or missing password reset token");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await api.resetPassword(token, data.newPassword);
      if (response.success) {
        toast.success("Password reset successfully! Please log in.");
        router.push("/auth/login");
      } else {
        toast.error(response.message || "Failed to reset password. The link may have expired.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col space-y-2 text-center mb-8">
        <div className="h-10 w-10 bg-blue-600 rounded-lg mx-auto flex items-center justify-center mb-2">
           <span className="text-white font-bold text-xl">G</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Set New Password
        </h1>
        <p className="text-sm text-slate-500">
          Your new password must be different from previously used passwords.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PasswordInput
          label="New Password"
          placeholder="••••••••"
          {...register("newPassword")}
          error={errors.newPassword?.message}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="••••••••"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />

        <button
          type="submit"
          disabled={isLoading || !token}
          className="w-full flex items-center justify-center bg-blue-600 text-white h-10 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Reset Password"
          )}
        </button>
      </form>

      {/* Footer Link */}
      <div className="mt-6 text-center text-sm text-slate-500">
        Changed your mind?{" "}
        <Link href="/auth/login" className="font-bold text-blue-600 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
