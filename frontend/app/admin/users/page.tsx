"use client";

import { api } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Search, Users as UsersIcon, ChevronLeft, ChevronRight,
  Ban, CheckCircle, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  SELLER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  BUYER: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-400",
  SUSPENDED: "bg-red-500/15 text-red-400",
  DEACTIVATED: "bg-slate-500/15 text-slate-500",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [suspendUser, setSuspendUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminUsers({
        page,
        limit: 20,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, statusFilter, searchQuery]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [roleFilter, statusFilter, searchQuery]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setActionId(userId);
    try {
      const res = await api.updateAdminUserStatus(userId, newStatus);
      if (res.success) {
        toast.success(`User ${newStatus.toLowerCase()} successfully`);
        fetchUsers();
      } else toast.error(res.message || "Failed");
    } catch { toast.error("Error updating user"); }
    finally { setActionId(null); }
  };

  const handleDelete = async (userId: string) => {
    setDeleteUser(null);
    setActionId(userId);
    try {
      const res = await api.deleteAdminUser(userId);
      if (res.success) {
        toast.success("User deactivated");
        fetchUsers();
      } else toast.error(res.message || "Failed");
    } catch { toast.error("Error deactivating user"); }
    finally { setActionId(null); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage platform users
          {pagination && <span> · {pagination.total} total</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All Roles</option>
          <option value="SUPERADMIN">Superadmin</option>
          <option value="ADMIN">Admin (Legacy)</option>
          <option value="SELLER">Seller</option>
          <option value="BUYER">Buyer</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">User</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Role</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Orders</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Joined</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/20 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded border ${ROLE_STYLES[user.role] || ""}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded ${STATUS_STYLES[user.status] || ""}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{user.orderCount || 0}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {user.status === "ACTIVE" ? (
                            <button
                              onClick={() => setSuspendUser(user)}
                              disabled={actionId === user.id || user.role === "SUPERADMIN" || user.role === "ADMIN"}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-20 disabled:cursor-not-allowed"
                              title={user.role === "SUPERADMIN" || user.role === "ADMIN" ? "Cannot suspend admins" : "Suspend user"}
                            >
                              {actionId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            </button>
                          ) : user.status === "SUSPENDED" ? (
                            <button
                              onClick={() => handleStatusChange(user.id, "ACTIVE")}
                              disabled={actionId === user.id}
                              className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition disabled:opacity-30"
                              title="Activate user"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          ) : null}
                          {user.role !== "SUPERADMIN" && user.role !== "ADMIN" && (
                            <button
                              onClick={() => setDeleteUser(user)}
                              disabled={actionId === user.id}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-30"
                              title="Deactivate user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/30">
                <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 transition">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage(Math.min(pagination.pages, page + 1))} disabled={page >= pagination.pages}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 transition">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <UsersIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No users found</p>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!suspendUser}
        title="Suspend User"
        message={`Are you sure you want to suspend ${suspendUser?.firstName} ${suspendUser?.lastName}? They will temporarily lose access to the platform.`}
        confirmLabel="Suspend User"
        onConfirm={() => {
          if (suspendUser) {
            handleStatusChange(suspendUser.id, "SUSPENDED");
            setSuspendUser(null);
          }
        }}
        onCancel={() => setSuspendUser(null)}
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={!!deleteUser}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deleteUser?.firstName} ${deleteUser?.lastName}? This action will permanently remove their access.`}
        confirmLabel="Deactivate User"
        onConfirm={() => handleDelete(deleteUser?.id)}
        onCancel={() => setDeleteUser(null)}
        isDangerous={true}
      />
    </div>
  );
}
