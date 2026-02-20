"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader2, Check, ChevronRight, ChevronLeft, Upload, CreditCard, Building2, User, FileText } from "lucide-react";
import { useDropzone } from "react-dropzone";

// ==================== SCHEMAS ====================

const step1Schema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters"),
  businessType: z.enum(["INDIVIDUAL", "BUSINESS"]),
  businessEmail: z.string().email("Invalid email address"),
  businessPhone: z.string().min(10, "Invalid phone number"),
  ghanaRegion: z.string().min(1, "Please select a region"),
});

const step2Schema = z.object({
  businessAddress: z.string().min(10, "Address must be detailed"),
  ghanaCardNumber: z.string().regex(/^GHA-\d{9}-\d$/, "Invalid Ghana Card format (GHA-XXXXXXXXX-X)"),
  description: z.string().min(20, "Please provide a brief description").max(500, "Description too long"),
});

const step3Schema = z.object({
  ghanaCardImage: z.any().refine((file) => file, "Ghana Card Front is required"),
  ghanaCardBackImage: z.any().refine((file) => file, "Ghana Card Back is required"),
  businessCertificate: z.any().optional(), // Validated conditionally
});

const step4Schema = z.object({
  mobileMoneyProvider: z.enum(["MTN", "TELECEL", "AIRTELTIGO"]),
  mobileMoneyNumber: z.string().regex(/^\+233\d{9}$/, "Format: +233XXXXXXXXX"),
  mobileMoneyName: z.string().min(3, "Name on account is required"),
});

// Combined schema for final submission
const sellerApplicationSchema = step1Schema.merge(step2Schema).merge(step3Schema).merge(step4Schema);
type SellerApplicationData = z.infer<typeof sellerApplicationSchema>;

// ==================== COMPONENTS ====================

export default function SellerApplyPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<SellerApplicationData>>({});
  
  // Persist progress
  useEffect(() => {
    const saved = localStorage.getItem("sellerApplicationProgress");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
      } catch (e) {
        console.error("Failed to load progress", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sellerApplicationProgress", JSON.stringify(formData));
  }, [formData]);

  const handleNext = (data: any) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((prev) => prev + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
    window.scrollTo(0, 0);
  };

  const submitApplication = async () => {
    setIsSubmitting(true);
    try {
      // 1. Upload Ghana Card
      let imageUrl = formData.ghanaCardImage; 
      
      if (formData.ghanaCardImage instanceof File) {
         const uploadRes = await api.uploadImage(formData.ghanaCardImage, 'product') as any; 
         if (!uploadRes.success || !uploadRes.data) {
            throw new Error(uploadRes.message || "Failed to upload Ghana Card");
         }
         imageUrl = uploadRes.data.url;
      }

      // 2. Upload Ghana Card Back
      let backImageUrl = formData.ghanaCardBackImage;
      if (formData.ghanaCardBackImage instanceof File) {
         const uploadRes = await api.uploadImage(formData.ghanaCardBackImage, 'product') as any;
         if (!uploadRes.success || !uploadRes.data) {
            throw new Error(uploadRes.message || "Failed to upload Ghana Card Back");
         }
         backImageUrl = uploadRes.data.url;
      }

      // 3. Upload Business Certificate (if applicable)
      let certUrl = typeof formData.businessCertificate === 'string' ? formData.businessCertificate : undefined;
      
      if (formData.businessCertificate instanceof File) {
         const uploadRes = await api.uploadImage(formData.businessCertificate, 'product') as any;
         if (!uploadRes.success || !uploadRes.data) {
            throw new Error(uploadRes.message || "Failed to upload Business Certificate");
         }
         certUrl = uploadRes.data.url;
      }

      const finalData = {
        ...formData,
        ghanaCardImageUrl: imageUrl,
        ghanaCardBackImageUrl: backImageUrl,
        businessRegImageUrl: certUrl,
        // Exclude File objects
        ghanaCardImage: undefined,
        ghanaCardBackImage: undefined,
        businessCertificate: undefined,
      };

      const res = await api.createSellerApplication(finalData);

      if (res.success) {
        toast.success("Application submitted successfully!");
        localStorage.removeItem("sellerApplicationProgress");
        router.push("/seller/status");
      } else {
        if (res.errors && Array.isArray(res.errors)) {
          // Show the first validation error
          const firstError = res.errors[0];
          const errorField = firstError.path && firstError.path.length > 0 ? firstError.path[0] : "Validation Error";
          toast.error(`${errorField}: ${firstError.message}`);
        } else {
          toast.error(res.message || "Failed to submit application");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
     return (
       <div className="container mx-auto py-20 text-center">
         <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
         <p className="text-slate-600 mb-6">You need an account to apply as a seller.</p>
         <button onClick={() => router.push('/auth/login?redirect=/seller/apply')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Sign In</button>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Become a Seller</h1>
          <p className="mt-2 text-slate-600">Start your selling journey on GhanaMarket in 5 easy steps.</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10"></div>
             {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors ${step >= s ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                   {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
             ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-medium text-slate-500 max-w-[110%] -mx-2">
             <span className="w-10 text-center">Basic</span>
             <span className="w-10 text-center">Details</span>
             <span className="w-10 text-center">Docs</span>
             <span className="w-10 text-center">Payment</span>
             <span className="w-10 text-center">Review</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {step === 1 && <Step1Form defaultValues={formData} onNext={handleNext} />}
          {step === 2 && <Step2Form defaultValues={formData} onBack={handleBack} onNext={handleNext} />}
          {step === 3 && <Step3Form defaultValues={formData} onBack={handleBack} onNext={handleNext} />}
          {step === 4 && <Step4Form defaultValues={formData} onBack={handleBack} onNext={handleNext} />}
          {step === 5 && <Step5Review formData={formData} onBack={handleBack} onSubmit={submitApplication} isSubmitting={isSubmitting} />}
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 1 ====================

function Step1Form({ defaultValues, onNext }: { defaultValues: any, onNext: (data: any) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <User className="w-5 h-5" />
        </div>
        <div>
           <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
           <p className="text-sm text-slate-500">Tell us about you and your business.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
          <input {...register("storeName")} className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="My Awesome Store" />
          {errors.storeName && <p className="text-red-500 text-xs mt-1">{errors.storeName.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
          <div className="grid grid-cols-2 gap-4">
             <label className="border rounded-lg p-3 flex items-center gap-2 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 hover:bg-slate-50 transition">
                <input type="radio" {...register("businessType")} value="INDIVIDUAL" className="accent-blue-600" />
                <span className="text-sm font-medium">Individual</span>
             </label>
             <label className="border rounded-lg p-3 flex items-center gap-2 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 hover:bg-slate-50 transition">
                <input type="radio" {...register("businessType")} value="BUSINESS" className="accent-blue-600" />
                <span className="text-sm font-medium">Registered Business</span>
             </label>
          </div>
          {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType.message as string}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Business Email</label>
             <input type="email" {...register("businessEmail")} className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="store@example.com" />
             {errors.businessEmail && <p className="text-red-500 text-xs mt-1">{errors.businessEmail.message as string}</p>}
           </div>
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Business Phone</label>
             <input {...register("businessPhone")} className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="024XXXXXXX" />
             {errors.businessPhone && <p className="text-red-500 text-xs mt-1">{errors.businessPhone.message as string}</p>}
           </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
           <select {...register("ghanaRegion")} className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white">
              <option value="">Select Region</option>
              {["Greater Accra", "Ashanti", "Western", "Central", "Eastern", "Volta", "Northern", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo", "Oti", "North East", "Savannah", "Western North"].map(r => (
                 <option key={r} value={r}>{r}</option>
              ))}
           </select>
           {errors.ghanaRegion && <p className="text-red-500 text-xs mt-1">{errors.ghanaRegion.message as string}</p>}
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
           Next Step <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

// ==================== STEP 2 ====================

function Step2Form({ defaultValues, onBack, onNext }: { defaultValues: any, onBack: () => void, onNext: (data: any) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
           <h2 className="text-xl font-bold text-slate-900">Business Details</h2>
           <p className="text-sm text-slate-500">Location and verification details.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
          <textarea {...register("businessAddress")} className="w-full h-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition resize-none" placeholder="Street name, landmark, digital address (e.g. GA-183-8164)" />
          {errors.businessAddress && <p className="text-red-500 text-xs mt-1">{errors.businessAddress.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ghana Card Number</label>
          <input {...register("ghanaCardNumber")} className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition uppercase" placeholder="GHA-123456789-0" maxLength={15} />
          <p className="text-xs text-slate-400 mt-1">Format: GHA-XXXXXXXXX-X</p>
          {errors.ghanaCardNumber && <p className="text-red-500 text-xs mt-1">{errors.ghanaCardNumber.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea {...register("description")} className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition resize-none" placeholder="Briefly describe what you sell..." />
          <div className="flex justify-between mt-1">
             {errors.description && <p className="text-red-500 text-xs">{errors.description.message as string}</p>}
             <p className="text-xs text-slate-400 ml-auto">Max 500 chars</p>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition">
           <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
           Next Step <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

// ==================== STEP 3 ====================


function Step3Form({ defaultValues, onBack, onNext }: { defaultValues: any, onBack: () => void, onNext: (data: any) => void }) {
  const isBusiness = defaultValues.businessType === 'BUSINESS';

  // Ghana Card Front State
  const [ghanaCardFile, setGhanaCardFile] = useState<File | string | null>(defaultValues.ghanaCardImage || null);
  const [ghanaCardPreview, setGhanaCardPreview] = useState<string | null>(
     typeof defaultValues.ghanaCardImage === 'string' ? defaultValues.ghanaCardImage : null
  );
  const [ghanaCardError, setGhanaCardError] = useState<string | null>(null);

  // Ghana Card Back State
  const [ghanaCardBackFile, setGhanaCardBackFile] = useState<File | string | null>(defaultValues.ghanaCardBackImage || null);
  const [ghanaCardBackPreview, setGhanaCardBackPreview] = useState<string | null>(
     typeof defaultValues.ghanaCardBackImage === 'string' ? defaultValues.ghanaCardBackImage : null
  );
  const [ghanaCardBackError, setGhanaCardBackError] = useState<string | null>(null);

  // Business Certificate State
  const [certFile, setCertFile] = useState<File | string | null>(defaultValues.businessCertificate || null);
  const [certPreview, setCertPreview] = useState<string | null>(
     typeof defaultValues.businessCertificate === 'string' ? defaultValues.businessCertificate : null
  );
  const [certError, setCertError] = useState<string | null>(null);

  const onDropGhanaCard = (acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setGhanaCardError("File size must be under 5MB");
        return;
      }
      setGhanaCardFile(selected);
      setGhanaCardPreview(URL.createObjectURL(selected));
      setGhanaCardError(null);
    }
  };

  const onDropGhanaCardBack = (acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setGhanaCardBackError("File size must be under 5MB");
        return;
      }
      setGhanaCardBackFile(selected);
      setGhanaCardBackPreview(URL.createObjectURL(selected));
      setGhanaCardBackError(null);
    }
  };

  const onDropCert = (acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setCertError("File size must be under 5MB");
        return;
      }
      setCertFile(selected);
      setCertPreview(URL.createObjectURL(selected));
      setCertError(null);
    }
  };

  const { getRootProps: getRootGhana, getInputProps: getInputGhana, isDragActive: isDragGhana } = useDropzone({ 
    onDrop: onDropGhanaCard, 
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1
  });

  const { getRootProps: getRootGhanaBack, getInputProps: getInputGhanaBack, isDragActive: isDragGhanaBack } = useDropzone({ 
    onDrop: onDropGhanaCardBack, 
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1
  });

  const { getRootProps: getRootCert, getInputProps: getInputCert, isDragActive: isDragCert } = useDropzone({ 
    onDrop: onDropCert, 
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'], 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!ghanaCardFile) {
      setGhanaCardError("Please upload the front of your Ghana Card");
      hasError = true;
    }

    if (!ghanaCardBackFile) {
      setGhanaCardBackError("Please upload the back of your Ghana Card");
      hasError = true;
    }

    if (isBusiness && !certFile) {
      setCertError("Please upload your Business Certificate");
      hasError = true;
    }

    if (hasError) return;
    
    onNext({ 
      ghanaCardImage: ghanaCardFile,
      ghanaCardBackImage: ghanaCardBackFile,
      businessCertificate: certFile
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <FileText className="w-5 h-5" />
        </div>
        <div>
           <h2 className="text-xl font-bold text-slate-900">Document Upload</h2>
           <p className="text-sm text-slate-500">Verify your identity and business.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Ghana Card Front */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Ghana Card (Front) <span className="text-red-500">*</span></label>
          <div {...getRootGhana()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragGhana ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
             <input {...getInputGhana()} />
             {ghanaCardPreview ? (
               <div className="relative h-40 w-full max-w-sm mx-auto">
                 <img src={ghanaCardPreview} alt="Ghana Card Front" className="h-full w-full object-contain rounded-lg" />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                   <p className="text-white font-medium">Click to change</p>
                 </div>
               </div>
             ) : (
               <div className="flex flex-col items-center">
                 <Upload className="w-8 h-8 text-slate-400 mb-2" />
                 <p className="text-sm font-medium text-slate-700">Upload Front Side</p>
                 <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 5MB</p>
               </div>
             )}
          </div>
          {ghanaCardError && <p className="text-red-500 text-xs">{ghanaCardError}</p>}
        </div>

        {/* Ghana Card Back */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Ghana Card (Back) <span className="text-red-500">*</span></label>
          <div {...getRootGhanaBack()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragGhanaBack ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
             <input {...getInputGhanaBack()} />
             {ghanaCardBackPreview ? (
               <div className="relative h-40 w-full max-w-sm mx-auto">
                 <img src={ghanaCardBackPreview} alt="Ghana Card Back" className="h-full w-full object-contain rounded-lg" />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                   <p className="text-white font-medium">Click to change</p>
                 </div>
               </div>
             ) : (
               <div className="flex flex-col items-center">
                 <Upload className="w-8 h-8 text-slate-400 mb-2" />
                 <p className="text-sm font-medium text-slate-700">Upload Back Side</p>
                 <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 5MB</p>
               </div>
             )}
          </div>
          {ghanaCardBackError && <p className="text-red-500 text-xs">{ghanaCardBackError}</p>}
        </div>

        {/* Business Certificate Upload (Conditional) */}
        {isBusiness && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mt-4">Business Certificate <span className="text-red-500">*</span></label>
            <div {...getRootCert()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragCert ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
               <input {...getInputCert()} />
               {certPreview ? (
                 <div className="relative h-40 w-full max-w-sm mx-auto flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                   {/* If it's an image, show it. If PDF, show icon */}
                   {typeof certFile === 'string' || (certFile as File).type.startsWith('image/') ? (
                      <img src={certPreview} alt="Certificate" className="h-full w-full object-contain rounded-lg" />
                   ) : (
                      <div className="flex flex-col items-center p-4">
                        <FileText className="w-12 h-12 text-red-500 mb-2" />
                        <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{(certFile as File).name}</p>
                      </div>
                   )}
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                     <p className="text-white font-medium">Click to change</p>
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center">
                   <Upload className="w-8 h-8 text-slate-400 mb-2" />
                   <p className="text-sm font-medium text-slate-700">Upload Business Certificate</p>
                   <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF up to 5MB</p>
                 </div>
               )}
            </div>
            {certError && <p className="text-red-500 text-xs">{certError}</p>}
          </div>
        )}
      </div>

      <div className="pt-4 flex justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition">
           <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
           Next Step <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ==================== STEP 4 ====================

function Step4Form({ defaultValues, onBack, onNext }: { defaultValues: any, onBack: () => void, onNext: (data: any) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step4Schema),
    defaultValues
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
           <h2 className="text-xl font-bold text-slate-900">Payment Information</h2>
           <p className="text-sm text-slate-500">Where you'll receive your payouts.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Money Provider</label>
           <select {...register("mobileMoneyProvider")} className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white">
              <option value="">Select Provider</option>
              <option value="MTN">MTN MobileMoney</option>
              <option value="TELECEL">Telecel Cash</option>
              <option value="AIRTELTIGO">AirtelTigo Money</option>
           </select>
           {errors.mobileMoneyProvider && <p className="text-red-500 text-xs mt-1">{errors.mobileMoneyProvider.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Money Number</label>
          <input {...register("mobileMoneyNumber")} className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="+233XXXXXXXXX" />
          <p className="text-xs text-slate-400 mt-1">Must start with +233</p>
          {errors.mobileMoneyNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileMoneyNumber.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
          <input {...register("mobileMoneyName")} className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="Kwame Mensah" />
          <p className="text-xs text-slate-400 mt-1">Match the name on your MoMo account</p>
          {errors.mobileMoneyName && <p className="text-red-500 text-xs mt-1">{errors.mobileMoneyName.message as string}</p>}
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition">
           <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
           Review <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

// ==================== STEP 5 ====================

function Step5Review({ formData, onBack, onSubmit, isSubmitting }: { formData: any, onBack: () => void, onSubmit: () => void, isSubmitting: boolean }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <Check className="w-5 h-5" />
        </div>
        <div>
           <h2 className="text-xl font-bold text-slate-900">Review & Submit</h2>
           <p className="text-sm text-slate-500">Please review your information carefully.</p>
        </div>
      </div>

      <div className="space-y-6">
        <ReviewSection title="Basic Info" data={{
           "Store Name": formData.storeName,
           "Business Type": formData.businessType,
           "Email": formData.businessEmail,
           "Phone": formData.businessPhone,
           "Region": formData.ghanaRegion
        }} />
        
        <ReviewSection title="Business Details" data={{
           "Address": formData.businessAddress,
           "Ghana Card": formData.ghanaCardNumber,
           "Description": formData.description
        }} />

        <ReviewSection title="Payment" data={{
           "Provider": formData.mobileMoneyProvider,
           "Number": formData.mobileMoneyNumber,
           "Name": formData.mobileMoneyName
        }} />

        <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3">
          <input type="checkbox" id="terms" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
          <label htmlFor="terms" className="text-sm text-slate-700 leading-relaxed cursor-pointer select-none">
             I certify that all information provided is accurate and I agree to the <span className="text-blue-600 font-medium">Seller Terms & Conditions</span> and <span className="text-blue-600 font-medium">Privacy Policy</span>. I understand that false information may lead to account suspension.
          </label>
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition" disabled={isSubmitting}>
           <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onSubmit} disabled={!agreed || isSubmitting} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
           {isSubmitting ? (
             <>
               <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
             </>
           ) : (
             "Submit Application"
           )}
        </button>
      </div>
    </div>
  );
}

function ReviewSection({ title, data }: { title: string, data: Record<string, any> }) {
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 font-medium text-sm text-slate-700">
        {title}
      </div>
      <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-2">
        {Object.entries(data).map(([key, value]) => (
           <div key={key}>
             <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{key}</p>
             <p className="text-sm font-medium text-slate-900 truncate">{value || '-'}</p>
           </div>
        ))}
      </div>
    </div>
  );
}
