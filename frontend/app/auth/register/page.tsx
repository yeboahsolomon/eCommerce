"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Define the Validation Schema
const registerSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);

    // Simulate API Call
    setTimeout(() => {
      console.log("Registered with:", data);
      setIsLoading(false);
      
      // Success Feedback
      toast.success("Account created successfully!");
      
      // Redirect to Login
      router.push("/auth/login");
    }, 2000);
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
        
        <Input
          label="Full Name"
          placeholder="Kwame Mensah"
          {...register("fullName")}
          error={errors.fullName?.message}
        />

        <Input
          label="Email"
          type="email"
          placeholder="kwame@example.com"
          {...register("email")}
          error={errors.email?.message}
        />
        
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
          error={errors.password?.message}
        />

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
