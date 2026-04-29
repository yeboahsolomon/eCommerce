"use client";

import { useState } from "react";
import { 
  Megaphone, Send, Users, Store, Globe, Calendar,
  Edit2, Trash2, PowerOff, Power, Eye, AlertCircle
} from "lucide-react";

export interface Announcement {
  id: string;
  title: string;
  target: "All Users" | "Buyers Only" | "Sellers Only";
  status: "Active" | "Scheduled" | "Inactive";
  datePosted: string;
  message: string;
}

const mockAnnouncements: Announcement[] = [
  { id: "1", title: "Holiday Discount Festival", target: "All Users", status: "Active", datePosted: "2026-04-28T08:00:00Z", message: "Enjoy up to 50% off on all electronics this weekend!" },
  { id: "2", title: "New Seller Policies", target: "Sellers Only", status: "Active", datePosted: "2026-04-25T14:30:00Z", message: "Please review our updated seller commission structure taking effect next month." },
  { id: "3", title: "System Maintenance", target: "All Users", status: "Scheduled", datePosted: "2026-05-01T02:00:00Z", message: "Platform will undergo maintenance on May 1st from 2AM to 4AM UTC." },
  { id: "4", title: "Referral Bonus Extended", target: "Buyers Only", status: "Inactive", datePosted: "2026-04-10T09:15:00Z", message: "Refer a friend and get ₵50! Campaign extended to April 20th." },
];

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Announcement["target"]>("All Users");
  const [schedule, setSchedule] = useState("Post Now");

  const getStatusBadge = (status: Announcement["status"]) => {
    switch(status) {
      case "Active": return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30 uppercase">Active</span>;
      case "Scheduled": return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase">Scheduled</span>;
      case "Inactive": return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30 uppercase">Inactive</span>;
    }
  };

  const getTargetIcon = (targetType: Announcement["target"]) => {
    switch(targetType) {
      case "All Users": return <Globe className="w-3.5 h-3.5" />;
      case "Buyers Only": return <Users className="w-3.5 h-3.5" />;
      case "Sellers Only": return <Store className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Announcements</h1>
        <p className="text-sm text-slate-400 mt-1">Broadcast messages to buyers, sellers, or all users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-400" />
              Create Announcement
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Announcement Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Flash Sale This Weekend!"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Message</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement details here..."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Audience</label>
                  <select 
                    value={target}
                    onChange={(e) => setTarget(e.target.value as Announcement["target"])}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="All Users">All Users</option>
                    <option value="Buyers Only">Buyers Only</option>
                    <option value="Sellers Only">Sellers Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Schedule</label>
                  <select 
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="Post Now">Post Now</option>
                    <option value="Schedule for Later">Schedule for Later...</option>
                  </select>
                </div>
              </div>
              
              {schedule === "Schedule for Later" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Select Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20">
                  {schedule === "Post Now" ? <Send className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  {schedule === "Post Now" ? "Publish Announcement" : "Schedule Announcement"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 shadow-sm sticky top-6">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-400" />
              Live Preview
            </h2>
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="flex gap-3">
                <div className="bg-blue-500/10 p-2 rounded-full h-fit flex-shrink-0">
                  <Megaphone className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">
                    {title || "Your Title Here"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {message || "Your announcement message will preview here exactly as it will appear to users."}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                      {getTargetIcon(target)} {target}
                    </span>
                    <span>•</span>
                    <span>Just now</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-slate-400" />
              <p>This is how the announcement will look in the notification dropdown for targeted users.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Announcements Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-sm mt-8">
        <div className="p-5 border-b border-slate-700/50">
          <h2 className="font-semibold text-white">Manage Announcements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/40 text-slate-400 uppercase text-xs font-semibold border-b border-slate-700/50">
              <tr>
                <th className="py-3.5 px-5">Title</th>
                <th className="py-3.5 px-5">Target</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Date Posted</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {mockAnnouncements.map((announcement) => (
                <tr key={announcement.id} className="hover:bg-slate-700/20 transition-colors group">
                  <td className="py-4 px-5 font-medium text-white max-w-xs truncate" title={announcement.title}>
                    {announcement.title}
                  </td>
                  <td className="py-4 px-5 text-slate-300">
                    <div className="flex items-center gap-1.5 text-xs">
                      {getTargetIcon(announcement.target)}
                      {announcement.target}
                    </div>
                  </td>
                  <td className="py-4 px-5">{getStatusBadge(announcement.status)}</td>
                  <td className="py-4 px-5 text-slate-400 text-xs">
                    {new Date(announcement.datePosted).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" title={announcement.status === "Inactive" ? "Activate" : "Deactivate"}>
                        {announcement.status === "Inactive" ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </button>
                      <button className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
