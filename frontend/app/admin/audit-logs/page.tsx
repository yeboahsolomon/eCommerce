"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Activity, Search, Filter, ShieldAlert, Download, AlertTriangle } from "lucide-react";

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

const mockFailedLogins = [
  { id: "1", ip: "192.168.1.15", email: "admin@ecommerce.com", timestamp: "2026-04-29T15:30:00Z", status: "Allowed", attempts: 2 },
  { id: "2", ip: "45.22.19.102", email: "superadmin@ecommerce.com", timestamp: "2026-04-29T14:15:00Z", status: "Blocked", attempts: 12 },
  { id: "3", ip: "10.0.0.55", email: "manager@ecommerce.com", timestamp: "2026-04-29T12:00:00Z", status: "Allowed", attempts: 4 },
  { id: "4", ip: "89.120.44.3", email: "admin@ecommerce.com", timestamp: "2026-04-29T09:45:00Z", status: "Blocked", attempts: 6 },
  { id: "5", ip: "192.168.1.20", email: "support@ecommerce.com", timestamp: "2026-04-28T18:20:00Z", status: "Allowed", attempts: 1 },
];

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  
  // Tabs
  const [activeTab, setActiveTab] = useState<"system" | "logins">("system");
  const [failedLogins, setFailedLogins] = useState(mockFailedLogins);

  const exportFailedLogins = () => {
    const csvContent = [
      ["IP Address", "Attempted Email", "Timestamp", "Status", "Attempts"],
      ...failedLogins.map(log => [log.ip, log.email, log.timestamp, log.status, log.attempts.toString()])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "failed_logins.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Failed logins exported to CSV");
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

  useEffect(() => {
    fetchLogs();
  }, [page, entityType, actionFilter]);

  const handleEntityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEntityType(e.target.value);
      setPage(1);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Security & Audit Logs
          </h1>
          <p className="text-slate-500 mt-1">Review administrative actions and security events.</p>
        </div>
        {activeTab === "logins" && (
          <button 
            onClick={exportFailedLogins}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("system")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "system" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          System Events
        </button>
        <button
          onClick={() => setActiveTab("logins")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "logins" 
              ? "border-red-600 text-red-600" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Failed Logins
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === "system" ? (
          <>
            {/* System Events Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 max-w-xs relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
             </div>
             <select 
               className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                value={actionFilter}
                onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                }}
             />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Admin Email</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No audit logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {log.adminEmail}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                         {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">{log.entityType}</div>
                      <div className="text-slate-500 text-xs font-mono">{log.entityId}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-500" title={JSON.stringify(log.details)}>
                      {log.details ? JSON.stringify(log.details) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
            <div className="text-sm text-slate-500">
              Page <span className="font-medium text-slate-900">{page}</span> of <span className="font-medium text-slate-900">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <tr>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Attempted Email</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Attempts (24h)</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {failedLogins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No failed login attempts recorded.
                    </td>
                  </tr>
                ) : (
                  failedLogins.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {log.ip}
                        {log.attempts >= 5 && (
                          <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase mt-1">
                            <AlertTriangle className="w-3 h-3" /> Auto-blocked
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {log.email}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold ${
                          log.attempts >= 5 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          {log.attempts}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          log.status === "Blocked" 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : "bg-green-50 text-green-700 border-green-200"
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
        )}
      </div>
    </div>
  );
}
