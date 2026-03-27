"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { api } from "@/lib/api";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);
    
    try {
      const response = await api.forgotPassword(data.email);
      if (response.success) {
        setIsSubmitted(true);
        toast.success("Reset link sent!");
      } else {
        toast.error(response.message || "Failed to send reset link");
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
          Reset Password
        </h1>
        <p className="text-sm text-slate-500">
          {isSubmitted 
            ? "Check your email for a reset link."
            : "Enter your email address to receive a password reset link."}
        </p>
      </div>

      {/* Form */}
      {!isSubmitted ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="kwame@example.com"
            {...register("email")}
            error={errors.email?.message}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center bg-blue-600 text-white h-10 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      ) : (
        <div className="bg-green-50 text-green-800 p-4 rounded-md border border-green-200 text-sm mb-6 text-center">
          We&apos;ve sent an email to the address provided. Please click the link inside to reset your password.
        </div>
      )}

      {/* Footer Link */}
      <div className="mt-6 text-center text-sm text-slate-500">
        Remember your password?{" "}
        <Link href="/auth/login" className="font-bold text-blue-600 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
