"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Activity, Search, Filter, ShieldAlert, Download, AlertTriangle, RefreshCw } from "lucide-react";

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

interface SecurityLog {
  id: string;
  ip: string;
  email: string;
  timestamp: string;
  status: string;
  attempts: number;
}

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  
  // System Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Security Logs State
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [securityPage, setSecurityPage] = useState(1);
  const [securityTotalPages, setSecurityTotalPages] = useState(1);
  
  // Filters
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  
  // Tabs
  const [activeTab, setActiveTab] = useState<"system" | "logins">("system");

  const exportFailedLogins = () => {
    if (securityLogs.length === 0) {
      toast.error("No security logs to export");
      return;
    }
    const csvContent = [
      ["IP Address", "Attempted Email", "Timestamp", "Status", "Attempts (24h)"],
      ...securityLogs.map(log => [log.ip, log.email, log.timestamp, log.status, log.attempts.toString()])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `security_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Security logs exported to CSV");
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      
      if (entityType) queryParams.append("entityType", entityType);
      if (actionFilter) queryParams.append("action", actionFilter);

      const res = await api.request<any>("GET", `/admin/audit-logs?${queryParams.toString()}`);
      
      if (res.success) {
        setLogs(res.data.logs);
        setTotalPages(res.data.pagination.pages);
      } else {
        toast.error(res.message || "Failed to fetch audit logs");
      }
    } catch (error) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityLogs = async () => {
    setLoadingSecurity(true);
    try {
      const res = await api.request<any>("GET", `/admin/audit-logs/security-logs?page=${securityPage}&limit=20`);
      if (res.success) {
        setSecurityLogs(res.data.logs);
        setSecurityTotalPages(res.data.pagination.pages);
      } else {
        toast.error(res.message || "Failed to fetch security logs");
      }
    } catch (error) {
      toast.error("Failed to load security logs");
    } finally {
      setLoadingSecurity(false);
    }
  };

  useEffect(() => {
    if (activeTab === "system") {
      fetchLogs();
    }
  }, [activeTab, page, entityType, actionFilter]);

  useEffect(() => {
    if (activeTab === "logins") {
      fetchSecurityLogs();
    }
  }, [activeTab, securityPage]);

  const handleEntityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEntityType(e.target.value);
      setPage(1);
  }

  const handleRefresh = () => {
    if (activeTab === "system") {
      fetchLogs();
    } else {
      fetchSecurityLogs();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Security & Audit Logs
          </h1>
          <p className="text-slate-400 mt-1">Review administrative actions and security events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || loadingSecurity) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {activeTab === "logins" && (
            <button 
              onClick={exportFailedLogins}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-sm font-medium transition-colors border border-blue-500/30 shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("system")}
          className={`whitespace-nowrap px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "system" 
              ? "border-blue-500 text-blue-400" 
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
          }`}
        >
          System Events
        </button>
        <button
          onClick={() => setActiveTab("logins")}
          className={`whitespace-nowrap flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "logins" 
              ? "border-red-500 text-red-400" 
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Failed Logins
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700/50 overflow-hidden">
        {activeTab === "system" ? (
          <>
            {/* System Events Filters */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 max-w-xs relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-4 w-4 text-slate-400" />
                </div>
                <select 
                  className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-900 text-white"
                  value={entityType}
                  onChange={handleEntityChange}
                >
                    <option value="">All Entities</option>
                    <option value="seller_application">Seller Applications</option>
                    <option value="seller">Sellers</option>
                    <option value="user">Users</option>
                    <option value="order">Orders</option>
                    <option value="product">Products</option>
                </select>
              </div>
              
              <div className="flex-1 max-w-xs relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Filter by specific action..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-900 text-white placeholder-slate-500"
                    value={actionFilter}
                    onChange={(e) => {
                        setActionFilter(e.target.value);
                        setPage(1);
                    }}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/50 font-medium">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Timestamp</th>
                    <th className="px-6 py-4 whitespace-nowrap">Admin Email</th>
                    <th className="px-6 py-4 whitespace-nowrap">Action</th>
                    <th className="px-6 py-4 whitespace-nowrap">Entity</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm">Loading system logs...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700">
                          <Activity className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="font-medium text-white mb-1">No Audit Logs Found</p>
                        <p className="text-sm">We couldn't find any system events matching your criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                          {log.adminEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-white font-medium capitalize">{log.entityType.replace(/_/g, ' ')}</div>
                          <div className="text-slate-500 text-xs font-mono mt-0.5">{log.entityId}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 max-w-sm truncate" title={JSON.stringify(log.details)}>
                          {log.details ? (
                            <div className="bg-slate-900 rounded px-2 py-1 border border-slate-700 text-xs font-mono truncate">
                              {JSON.stringify(log.details)}
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="p-4 border-t border-slate-700/50 flex items-center justify-between bg-slate-800">
                <div className="text-sm text-slate-400">
                  Page <span className="font-medium text-white">{page}</span> of <span className="font-medium text-white">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/50 font-medium">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">IP Address</th>
                    <th className="px-6 py-4 whitespace-nowrap">Attempted Email</th>
                    <th className="px-6 py-4 whitespace-nowrap">Timestamp</th>
                    <th className="px-6 py-4 whitespace-nowrap">Attempts (24h)</th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {loadingSecurity ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm">Loading security logs...</p>
                      </td>
                    </tr>
                  ) : securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700">
                          <ShieldAlert className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="font-medium text-white mb-1">Secure & Clear</p>
                        <p className="text-sm">No suspicious login attempts recorded.</p>
                      </td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {log.ip}
                          {log.attempts >= 5 && (
                            <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase mt-1">
                              <AlertTriangle className="w-3 h-3" /> Auto-blocked
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                          {log.email}
                        </td>
                        <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold border ${
                            log.attempts >= 5 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-slate-700 text-slate-300 border-slate-600"
                          }`}>
                            {log.attempts}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${
                            log.status === "Blocked" 
                              ? "bg-red-500/10 text-red-400 border-red-500/20" 
                              : log.status === "Failed"
                                ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                : "bg-green-500/10 text-green-400 border-green-500/20"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Security Pagination */}
            {!loadingSecurity && securityTotalPages > 1 && (
              <div className="p-4 border-t border-slate-700/50 flex items-center justify-between bg-slate-800">
                <div className="text-sm text-slate-400">
                  Page <span className="font-medium text-white">{securityPage}</span> of <span className="font-medium text-white">{securityTotalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={securityPage === 1}
                    onClick={() => setSecurityPage(p => p - 1)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={securityPage === securityTotalPages}
                    onClick={() => setSecurityPage(p => p + 1)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
