"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

interface SellerApplication {
  id: string;
  status: "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED" | "INFO_REQUESTED";
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
}

export default function SellerStatusPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [sellerProfile, setSellerProfile] = useState<{ isActive: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/seller/status");
    }
  }, [isLoading, isAuthenticated, router]);

  const { data: appData, isLoading: loadingApp, error: fetchErr } = useQuery({
    queryKey: ['mySellerApplication'],
    queryFn: async () => {
      const res = await api.getMySellerApplication();
      if (!res.success) throw new Error(res.message || "Failed to fetch");
      return res.data?.application || null;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const application = appData || null;

  useEffect(() => {
    if (fetchErr) setError(fetchErr.message);
  }, [fetchErr]);

  useEffect(() => {
    if (!loadingApp && !application && isAuthenticated) {
       router.push("/seller/apply");
    }
  }, [loadingApp, application, isAuthenticated, router]);

  useEffect(() => {
    if (application?.status === 'APPROVED') {
       api.getSellerProfile().then(res => {
          if (res.success && res.data?.profile) setSellerProfile(res.data.profile);
       }).catch(console.error);
    }
  }, [application?.status]);

  if (isLoading || loadingApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!application) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          
          {/* Header */}
          <div className="p-8 text-center border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Status</h1>
            <p className="text-slate-500">Track the status of your seller application</p>
          </div>

          <div className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              
              {/* Status Icon & Badge */}
              <StatusDisplay status={application.status} isActive={sellerProfile?.isActive} />

              {/* Status Message */}
              <div className="max-w-md">
                {(application.status === 'PENDING' || application.status === 'REVIEWING') && (
                  <p className="text-slate-600">
                    Your application is currently under review. Our team typically reviews applications within 2-3 business days. You will be notified via email once a decision is made.
                  </p>
                )}
                {application.status === 'APPROVED' && (
                  <div className="space-y-4 flex flex-col items-center">
                    {sellerProfile?.isActive === false ? (
                        <>
                            <p className="text-red-700 font-medium">
                              Your seller account is currently suspended.
                            </p>
                            <p className="text-sm text-red-600 mb-2">
                              Access to your seller dashboard and product listings has been temporarily disabled. Please contact our support team to resolve any outstanding issues with your account.
                            </p>
                            <Link href="/contact" className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200">
                              Contact Support <ChevronRight className="w-5 h-5" />
                            </Link>
                        </>
                    ) : (
                        <>
                            <p className="text-slate-600 font-medium">
                              Congratulations! You're an active seller
                            </p>
                            <Link href="/seller/dashboard" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                              Go to Dashboard <ChevronRight className="w-5 h-5" />
                            </Link>
                        </>
                    )}
                  </div>
                )}
                {application.status === 'REJECTED' && (
                  <div className="bg-red-50 p-6 rounded-xl text-left w-full border border-red-100">
                    <h3 className="font-bold text-red-800 mb-2">Reason for rejection:</h3>
                    <p className="text-red-700 mb-4">{application.rejectionReason || "Requirements not met."}</p>
                    <div className="pt-4 border-t border-red-100 flex justify-end">
                       <Link href="/seller/apply" className="text-sm font-bold text-red-600 hover:text-red-700 flex items-center gap-1 bg-white px-4 py-2 rounded-lg shadow-sm border border-red-200 transition">
                          Reapply later <RefreshCw className="w-4 h-4 ml-1" />
                       </Link>
                    </div>
                  </div>
                )}
                {application.status === 'INFO_REQUESTED' && (
                  <div className="bg-orange-50 p-6 rounded-xl text-left w-full border border-orange-100">
                    <h3 className="font-bold text-orange-800 mb-2">Additional information required</h3>
                    <p className="text-orange-700 mb-4">{application.adminNotes || "We need more information to process your application."}</p>
                    <Link href="/seller/apply" className="inline-block bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition shadow">
                      Update Application
                    </Link>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="w-full pt-8 border-t border-slate-100">
                 <h3 className="text-sm font-bold text-slate-900 mb-4 text-left">Application Timeline</h3>
                 <div className="space-y-6 relative pl-4 border-l-2 border-slate-100 text-left">
                    <div className="relative">
                       <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
                       <p className="text-sm font-bold text-slate-900">Application Submitted</p>
                       <p className="text-xs text-slate-500">{new Date(application.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="relative">
                       <div className={`absolute -left-[21px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${application.status === 'PENDING' ? 'bg-blue-100 animate-pulse' : 'bg-blue-600'}`}></div>
                       <p className={`text-sm ${application.status === 'PENDING' ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}>Review in Progress</p>
                       {(application.status === 'PENDING' || application.status === 'REVIEWING') && (
                           <p className="text-xs text-slate-400">Estimated completion: 2-3 days</p>
                       )}
                    </div>
                    
                    {application.status === 'APPROVED' && (
                        <div className="relative">
                           <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                           <p className="text-sm font-bold text-slate-900">Approved</p>
                           <p className="text-xs text-slate-500">Welcome to GhanaMarket!</p>
                        </div>
                    )}

                    {application.status === 'REJECTED' && (
                        <div className="relative">
                           <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
                           <p className="text-sm font-bold text-slate-900">Rejected</p>
                           <p className="text-xs text-slate-500">Application did not meet requirements</p>
                        </div>
                    )}

                    {application.status === 'INFO_REQUESTED' && (
                        <div className="relative">
                           <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
                           <p className="text-sm font-bold text-slate-900">Needs Information</p>
                           <p className="text-xs text-slate-500">Please provide additional details</p>
                        </div>
                    )}
                 </div>
              </div>

            </div>
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-500">Need help? <a href="/contact" className="text-blue-600 hover:underline">Contact Support</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusDisplay({ status, isActive }: { status: string, isActive?: boolean }) {
  switch (status) {
    case 'PENDING':
    case 'REVIEWING':
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10" />
          </div>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold uppercase tracking-wide">
            {status === 'REVIEWING' ? 'In Review' : 'Under Review'}
          </span>
        </div>
      );
    case 'APPROVED':
      return (
        <div className="flex flex-col items-center gap-3">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isActive === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
             {isActive === false ? <AlertCircle className="w-10 h-10" /> : <CheckCircle className="w-10 h-10" />}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isActive === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {isActive === false ? 'Seller Account: Suspended' : 'Seller Account: Active'}
          </span>
        </div>
      );
    case 'REJECTED':
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10" />
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wide">
            Application Rejected
          </span>
        </div>
      );
    case 'INFO_REQUESTED':
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10" />
          </div>
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wide">
            Needs Information
          </span>
        </div>
      );
    default:
      return null;
  }
}
