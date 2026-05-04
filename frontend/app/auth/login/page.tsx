"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";

// Define the Validation Schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

// TypeScript type inference from the schema
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, googleLogin, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Initialize the Form Hook
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  // The Submit Handler
  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    
    try {
      const response = await login(data.email, data.password, data.rememberMe);
      
      if (response.success) {
        toast.success("Login successful!");
        router.push("/"); 
      } else {
        toast.error(response.message || "Invalid credentials");
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
          Welcome back
        </h1>
        <p className="text-sm text-slate-500">
          Enter your email to sign in to your account
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="kwame@example.com"
          {...register("email")}
          error={errors.email?.message}
        />
        
        <div className="space-y-1">
           <PasswordInput
            label="Password"
            placeholder="••••••••"
            {...register("password")}
            error={errors.password?.message}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="rememberMe" 
                {...register("rememberMe")} 
              />
              <label
                htmlFor="rememberMe"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer text-slate-600"
              >
                Remember me
              </label>
            </div>
            <Link href="/auth/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center bg-blue-600 text-white h-10 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Sign In"
          )}
        </button>

        {/* Social Login Button Placeholder */}
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <div className="relative my-4 flex flex-col gap-4">
            <div className="relative flex justify-center text-xs uppercase pt-2">
              <span className="bg-white px-2 text-slate-500 z-10">Or continue with</span>
              <div className="absolute inset-0 flex items-center top-[calc(50%+4px)]">
                 <span className="w-full border-t border-slate-300" />
              </div>
            </div>
            
            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={async (credentialResponse: CredentialResponse) => {
                  if (credentialResponse.credential) {
                    setIsLoading(true);
                    try {
                      const response = await googleLogin(credentialResponse.credential);
                      if (response.success) {
                        toast.success("Google Login successful!");
                        router.push("/");
                      } else {
                        toast.error(response.message || "Google login failed");
                      }
                    } catch(e) {
                        toast.error("Unexpected error occurred with Google login");
                    } finally {
                        setIsLoading(false);
                    }
                  }
                }}
                onError={() => {
                  toast.error("Google Login Failed");
                }}
                useOneTap
              />
            </div>
          </div>
        )}
      </form>

      {/* Footer / Register Link */}
      <div className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-bold text-blue-600 hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
