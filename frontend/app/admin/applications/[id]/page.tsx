"use client";

import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, ArrowLeft, Check, X, MessageSquare, Save,
  Download, ZoomIn, ExternalLink, User, MapPin, Phone,
  Mail, Calendar, Building2, CreditCard, FileText,
  Shield, Clock, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  REVIEWING: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  APPROVED: "bg-green-500/15 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/15 text-red-400 border-red-500/30",
  INFO_REQUESTED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const REJECTION_REASONS = [
  "Incomplete documents",
  "Invalid or expired Ghana Card",
  "Business information could not be verified",
  "Suspicious activity detected",
  "Duplicate application",
  "Other",
];

export default function ApplicationReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Action modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDetails, setRejectDetails] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Image viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const res = await api.getAdminSellerApplication(id as string);
        if (res.success && res.data) {
          setApplication(res.data.application);
          setActivityLogs(res.data.activityLogs || []);
          setAdminNotes(res.data.application?.adminNotes || "");
        }
      } catch (err) {
        console.error("Failed to fetch application:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplication();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await api.approveSellerApplication(id as string);
      if (res.success) {
        toast.success(res.message || "Application approved!");
        setApplication({ ...application, status: "APPROVED" });
        setShowApproveModal(false);
      } else {
        toast.error(res.message || "Failed to approve");
      }
    } catch (err) {
      toast.error("Failed to approve application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectReason === "Other" ? rejectDetails : rejectReason;
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.rejectSellerApplication(id as string, reason);
      if (res.success) {
        toast.success("Application rejected");
        setApplication({ ...application, status: "REJECTED" });
        setShowRejectModal(false);
      } else {
        toast.error(res.message || "Failed to reject");
      }
    } catch (err) {
      toast.error("Failed to reject application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!infoMessage.trim()) {
      toast.error("Please provide a message");
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.requestApplicationInfo(id as string, infoMessage);
      if (res.success) {
        toast.success("Info requested from applicant");
        setApplication({ ...application, status: "INFO_REQUESTED" });
        setShowInfoModal(false);
      } else {
        toast.error(res.message || "Failed to request info");
      }
    } catch (err) {
      toast.error("Failed to request info");
    } finally {
      setActionLoading(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.updateApplicationNotes(id as string, adminNotes);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-20">
        <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Application not found</p>
        <Link href="/admin/applications" className="text-blue-400 text-sm mt-2 inline-block hover:underline">
          ← Back to applications
        </Link>
      </div>
    );
  }

  const canTakeAction = ["PENDING", "REVIEWING", "INFO_REQUESTED"].includes(application.status);
  const app = application;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/applications" className="text-slate-400 hover:text-white text-xs flex items-center gap-1 mb-2 transition">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Applications
          </Link>
          <h1 className="text-xl font-bold text-white">{app.storeName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${STATUS_STYLES[app.status] || ""}`}>
              {app.status === "INFO_REQUESTED" ? "NEEDS INFO" : app.status}
            </span>
            <span className="text-xs text-slate-500">
              Applied {new Date(app.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Application Details (2 columns) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Applicant Info */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              Applicant Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Full Name</p>
                <p className="text-white">{app.user?.firstName} {app.user?.lastName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Email</p>
                <p className="text-white">{app.user?.email}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Phone</p>
                <p className="text-white">{app.user?.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Account Created</p>
                <p className="text-white">{new Date(app.user?.createdAt).toLocaleDateString("en-GB")}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Email Verified</p>
                <p className={app.user?.emailVerified ? "text-green-400" : "text-red-400"}>
                  {app.user?.emailVerified ? "✓ Verified" : "✗ Not verified"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Orders Placed</p>
                <p className="text-white">{app.user?._count?.orders ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              Business Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Store Name</p>
                <p className="text-white font-medium">{app.storeName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Business Type</p>
                <p className="text-white">{app.businessType}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Business Email</p>
                <p className="text-white">{app.businessEmail}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Business Phone</p>
                <p className="text-white">{app.businessPhone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 text-xs mb-0.5">Business Address</p>
                <p className="text-white">{app.businessAddress}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Ghana Region</p>
                <p className="text-white flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-500" />{app.ghanaRegion}</p>
              </div>
            </div>
          </div>

          {/* Verification Documents */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              Verification Documents
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Ghana Card Number</p>
                <p className="text-white font-mono">{app.ghanaCardNumber}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {app.ghanaCardImageUrl && (
                <DocumentCard label="Ghana Card (Front)" url={app.ghanaCardImageUrl} onView={() => setViewingImage(app.ghanaCardImageUrl)} />
              )}
              {app.ghanaCardBackImageUrl && (
                <DocumentCard label="Ghana Card (Back)" url={app.ghanaCardBackImageUrl} onView={() => setViewingImage(app.ghanaCardBackImageUrl)} />
              )}
              {app.businessRegImageUrl && (
                <DocumentCard label="Business Registration" url={app.businessRegImageUrl} onView={() => setViewingImage(app.businessRegImageUrl)} />
              )}
            </div>
            {!app.ghanaCardImageUrl && !app.ghanaCardBackImageUrl && !app.businessRegImageUrl && (
              <p className="text-slate-500 text-sm italic">No documents uploaded</p>
            )}
          </div>

          {/* Payment Information */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-400" />
              Mobile Money Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Provider</p>
                <p className="text-white">{app.mobileMoneyProvider}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Number</p>
                <p className="text-white font-mono">{app.mobileMoneyNumber}</p>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          {activityLogs.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Activity Log
              </h2>
              <div className="space-y-2">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className="h-1.5 w-1.5 bg-slate-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-slate-300">{log.action.replace(/_/g, " ")}</span>
                      <span className="text-slate-600 ml-2">by {log.adminEmail}</span>
                      <span className="text-slate-600 ml-2">
                        {new Date(log.createdAt).toLocaleString("en-GB")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions Panel */}
        <div className="space-y-5">
          {/* Action Buttons */}
          {canTakeAction && (
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white mb-1">Actions</h2>
              <button
                onClick={() => setShowApproveModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition"
              >
                <Check className="h-4 w-4" />
                Approve Application
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium transition"
              >
                <X className="h-4 w-4" />
                Reject Application
              </button>
              <button
                onClick={() => setShowInfoModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-orange-600/80 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium transition"
              >
                <MessageSquare className="h-4 w-4" />
                Request More Info
              </button>
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {app.status === "REJECTED" && app.rejectionReason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-red-400 mb-1">Rejection Reason</h3>
              <p className="text-sm text-red-300">{app.rejectionReason}</p>
            </div>
          )}

          {/* Internal Notes */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Internal Notes</h2>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add private notes about this application..."
              rows={4}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium disabled:opacity-50"
            >
              {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save Notes
            </button>
          </div>

          {/* Reviewed By */}
          {app.reviewedBy && (
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4 text-xs text-slate-500">
              <p>Reviewed by: <span className="text-slate-300">{app.reviewedBy}</span></p>
              {app.reviewedAt && (
                <p className="mt-0.5">at {new Date(app.reviewedAt).toLocaleString("en-GB")}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Modals ===== */}

      {/* Approve Modal */}
      {showApproveModal && (
        <Modal onClose={() => setShowApproveModal(false)}>
          <h2 className="text-lg font-bold text-white mb-2">Approve Application</h2>
          <p className="text-slate-400 text-sm mb-4">
            Are you sure you want to approve <strong className="text-white">{app.storeName}</strong>?
            This will:
          </p>
          <ul className="text-sm text-slate-400 space-y-1 mb-6 ml-4 list-disc">
            <li>Grant <strong className="text-white">{app.user?.firstName}</strong> the Seller role</li>
            <li>Create their seller profile and wallet</li>
            <li>Send an approval email notification</li>
          </ul>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancel</button>
            <button onClick={handleApprove} disabled={actionLoading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Approve
            </button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      <ConfirmationModal
        isOpen={showRejectModal}
        title="Reject Application"
        confirmLabel="Reject"
        onConfirm={handleReject}
        onCancel={() => setShowRejectModal(false)}
        isDangerous={true}
      >
        <div className="mb-4">
          <label className="block text-sm text-slate-300 mb-1.5">Reason</label>
          <select
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg text-sm text-white p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <option value="">Select a reason...</option>
            {REJECTION_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </div>
        {rejectReason === "Other" && (
          <div className="mb-4">
            <textarea
              value={rejectDetails}
              onChange={(e) => setRejectDetails(e.target.value)}
              placeholder="Specify the reason..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg text-sm text-white p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
            />
          </div>
        )}
      </ConfirmationModal>

      {/* Request Info Modal */}
      {showInfoModal && (
        <Modal onClose={() => setShowInfoModal(false)}>
          <h2 className="text-lg font-bold text-white mb-4">Request More Information</h2>
          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-1.5">Message to applicant</label>
            <textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="We need additional documents or information..."
              rows={4}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg text-sm text-white p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowInfoModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancel</button>
            <button onClick={handleRequestInfo} disabled={actionLoading || !infoMessage.trim()}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Request
            </button>
          </div>
        </Modal>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8" onClick={() => setViewingImage(null)}>
          <div className="max-w-4xl max-h-full relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewingImage(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white">
              <X className="h-6 w-6" />
            </button>
            <div className="relative w-[80vw] h-[80vh] max-w-4xl max-h-[80vh]">
              <Image src={viewingImage} alt="Document" fill className="object-contain rounded-lg" unoptimized />
            </div>
            <div className="mt-3 flex justify-center">
              <a href={viewingImage} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Download className="h-3.5 w-3.5" /> Download Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Sub-components =====

function DocumentCard({ label, url, onView }: { label: string; url: string; onView: () => void }) {
  return (
    <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <div className="aspect-[4/3] bg-slate-900 rounded overflow-hidden cursor-pointer relative group" onClick={onView}>
        <Image src={url} alt={label} fill sizes="300px" className="object-cover" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <ZoomIn className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
