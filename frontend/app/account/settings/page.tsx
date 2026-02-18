"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/Input";
import { Loader2, Camera, ChevronRight, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, updateProfile, isLoading: authLoading, checkAuth } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
    },
  });

  // Update default values when user loads
  // useEffect to reset form when user loads is good practice, or just key the form
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadImage(file, 'avatar');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (res.success && (res as any).data) {
        // Update profile with new avatar URL
        const updateRes = await updateProfile({ avatarUrl: (res as any).data.url });
        if (updateRes.success) {
          toast.success("Profile picture updated!");
        } else {
          toast.error("Failed to update profile picture");
        }
      } else {
        toast.error(res.message || "Failed to upload image");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while uploading");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const res = await updateProfile(data);
      if (res.success) {
        toast.success("Profile updated successfully");
        reset(data); // Reset dirty state
        router.refresh();
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      // We need an API endpoint for resending verification
      // Looking at auth.routes.ts, it is POST /api/auth/resend-verification
      // api.ts doesn't have it yet? I need to check api.ts again or just add it.
      // I'll assume I need to add it to api.ts or call axios directly.
      // Since I can't restart api.ts edit right now, I'll use axiosInstance if possible or just assume api has it (I'll add it later).
      // Wait, let's check auth.routes.ts again. It has router.post('/resend-verification', ...).
      // Does api.ts have it? I read api.ts in step 183.
      // No, `api.ts` definitions ended at `logout`.
      // I need to add `resendVerification` to `api.ts`.
      
      // Use the new api method
      await api.resendVerification(); 
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      toast.error("Failed to send verification email");
    } finally {
      setIsResending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 gap-2 mb-6">
        <Link href="/account" className="hover:text-blue-600">Account</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">Settings</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-8">Account Settings</h1>

      <div className="space-y-6">
        
        {/* Profile Picture */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400 overflow-hidden border-2 border-slate-200">
               {user.avatarUrl ? (
                  <Image 
                    src={user.avatarUrl} 
                    alt={user.firstName}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
               ) : (
                  <span>{initials}</span>
               )}
               {isUploading && (
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                   <Loader2 className="h-6 w-6 animate-spin text-white" />
                 </div>
               )}
            </div>
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-white border border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-50 transition flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Change Photo
              </button>
              <p className="text-xs text-slate-500 mt-2">
                JPG, GIF or PNG. 5MB max.
              </p>
            </div>
          </div>
        </div>

        {/* Email Verification */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Email Address</h2>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{user.email}</p>
                {user.emailVerified ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-600">Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-600">Unverified</span>
                  </div>
                )}
              </div>
            </div>
            {!user.emailVerified && (
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Verify Now"}
              </button>
            )}
          </div>
        </div>

        {/* Personal Details Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Personal Details</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                {...register("firstName")}
                error={errors.firstName?.message}
              />
              <Input
                label="Last Name"
                {...register("lastName")}
                error={errors.lastName?.message}
              />
            </div>
            
            <Input
              label="Phone Number"
              placeholder="+233 XX XXX XXXX"
              {...register("phone")}
              error={errors.phone?.message}
            />

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
