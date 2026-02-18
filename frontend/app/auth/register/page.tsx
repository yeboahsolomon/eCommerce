"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// Define the Validation Schema
const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password", "");

  const passwordChecks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "At least 1 uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "At least 1 number", valid: /[0-9]/.test(password) },
  ];

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);

    try {
      const response = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      if (response.success) {
        toast.success("Account created successfully! Logging you in...");
        router.push("/");
      } else {
        toast.error(response.message || "Registration failed");
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
          Create an account
        </h1>
        <p className="text-sm text-slate-500">
          Join GhanaMarket to start shopping
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="Kwame"
            {...register("firstName")}
            error={errors.firstName?.message}
          />
          <Input
            label="Last Name"
            placeholder="Mensah"
            {...register("lastName")}
            error={errors.lastName?.message}
          />
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="kwame@example.com"
          {...register("email")}
          error={errors.email?.message}
        />
        
        <div className="space-y-2">
          <PasswordInput
            label="Password"
            placeholder="••••••••"
            {...register("password")}
            error={errors.password?.message}
          />
          {/* Real-time Password Strength Feedback */}
          <div className="space-y-1 p-3 bg-slate-50 rounded-md border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">Password must contain:</p>
            {passwordChecks.map((check, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                {check.valid ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <X className="h-3 w-3 text-slate-300" />
                )}
                <span className={cn(
                  "transition-colors",
                  check.valid ? "text-green-600 font-medium" : "text-slate-500"
                )}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center bg-blue-600 text-white h-10 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Footer / Login Link */}
      <div className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-bold text-blue-600 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
