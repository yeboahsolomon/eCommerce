"use client";

import { api } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, Search, Eye, Check, X, Clock, Filter,
  ChevronLeft, ChevronRight, FileText,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWING", label: "Reviewing" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INFO_REQUESTED", label: "Needs Info" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  REVIEWING: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  APPROVED: "bg-green-500/15 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/15 text-red-400 border-red-500/30",
  INFO_REQUESTED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function SellerApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminSellerApplications({
        page,
        limit: 15,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.success && res.data) {
        setApplications(res.data.applications || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Seller Applications</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review and manage seller applications
          {pagination && <span> · {pagination.total} total</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : applications.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Applicant</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Store Name</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Region</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Applied</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-700/20 transition">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-white text-sm">
                            {app.user?.firstName} {app.user?.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{app.user?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{app.storeName}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{app.ghanaRegion}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {new Date(app.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded border ${
                          STATUS_STYLES[app.status] || "bg-slate-700 text-slate-400 border-slate-600"
                        }`}>
                          {app.status === "INFO_REQUESTED" ? "NEEDS INFO" : app.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end">
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/10 transition font-medium"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Review
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/30">
                <p className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                    disabled={page >= pagination.pages}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No applications found</p>
            {(statusFilter || searchQuery) && (
              <button onClick={() => { setStatusFilter(""); setSearchQuery(""); }} className="text-blue-400 text-xs mt-2 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
