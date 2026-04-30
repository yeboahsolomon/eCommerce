"use client";

import { useState } from "react";
import { 
  User, Lock, Settings as SettingsIcon, AlertTriangle, Edit2, Shield, Eye, EyeOff, Save, Database, Download, Check, Monitor
} from "lucide-react";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar: string;
}

export interface PlatformConfig {
  platformName: string;
  currency: string;
  supportEmail: string;
  supportPhone: string;
  feePercentage: number;
}

const mockProfile: AdminProfile = {
  name: "Super Admin",
  email: "admin@ecommerce.com",
  phone: "+233 20 000 0000",
  role: "SUPERADMIN",
  avatar: "SA",
};

const mockConfig: PlatformConfig = {
  platformName: "GhanaMarket",
  currency: "GHS (₵)",
  supportEmail: "support@ghanamarket.com",
  supportPhone: "+233 24 111 2222",
  feePercentage: 5.0,
};

const mockSessions = [
  { id: "1", device: "MacBook Pro", browser: "Chrome 120", ip: "197.251.10.15", location: "Accra, Ghana", lastActive: "Just now", isCurrent: true },
  { id: "2", device: "iPhone 13", browser: "Safari Mobile", ip: "197.251.10.42", location: "Kumasi, Ghana", lastActive: "2 hours ago", isCurrent: false },
  { id: "3", device: "Windows Desktop", browser: "Firefox 118", ip: "154.160.2.19", location: "Lagos, Nigeria", lastActive: "3 days ago", isCurrent: false },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<AdminProfile>(mockProfile);
  const [config, setConfig] = useState<PlatformConfig>(mockConfig);
  
  // Passwords
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Toggles
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newRegistrations, setNewRegistrations] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  // Modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [pendingMaintenanceMode, setPendingMaintenanceMode] = useState<boolean | null>(null);

  // Sessions
  const [sessions, setSessions] = useState(mockSessions);
  const [sessionToLogout, setSessionToLogout] = useState<string | null>(null);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);

  const handleMaintenanceToggle = (newValue: boolean) => {
    if (newValue) {
      setPendingMaintenanceMode(true);
    } else {
      setMaintenanceMode(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score += 1;
    if (pass.match(/[A-Z]/)) score += 1;
    if (pass.match(/[0-9]/)) score += 1;
    if (pass.match(/[^A-Za-z0-9]/)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong", "Excellent"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

  const Toggle = ({ enabled, onChange, label, description }: any) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="pr-4">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button 
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${enabled ? "bg-green-500" : "bg-slate-600"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your platform configuration, security, and administrative preferences.</p>
      </div>

      <div className="space-y-6">
        
        {/* ROW 1: Profile & Config */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Admin Profile */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 shadow-sm flex flex-col h-full">
              <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Admin Profile
              </h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-green-500/20 flex-shrink-0">
                  {profile.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-white">{profile.name}</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase mt-1">
                    <Shield className="w-3 h-3" /> {profile.role}
                  </span>
                </div>
              </div>
              <div className="space-y-3 text-sm flex-1">
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white font-medium">{profile.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-white font-medium">{profile.phone}</span>
                </div>
              </div>
              <button className="w-full mt-5 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
            </div>
          </div>

          {/* Platform Config */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 shadow-sm flex flex-col h-full">
              <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Platform Configuration
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Platform Name</label>
                  <input 
                    type="text" 
                    value={config.platformName}
                    onChange={(e) => setConfig({...config, platformName: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Base Currency</label>
                  <select 
                    value={config.currency}
                    onChange={(e) => setConfig({...config, currency: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="GHS (₵)">GHS (₵)</option>
                    <option value="USD ($)">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Support Email</label>
                  <input 
                    type="email" 
                    value={config.supportEmail}
                    onChange={(e) => setConfig({...config, supportEmail: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Support Phone</label>
                  <input 
                    type="text" 
                    value={config.supportPhone}
                    onChange={(e) => setConfig({...config, supportPhone: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Platform Fee Percentage (%)</label>
                  <input 
                    type="number" 
                    value={config.feePercentage}
                    onChange={(e) => setConfig({...config, feePercentage: parseFloat(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">This percentage is automatically deducted from seller payouts.</p>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20">
                  <Save className="w-4 h-4" /> Save Configuration
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ROW 2: Preferences & Security */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* System Toggles */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 shadow-sm flex flex-col h-full">
              <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-slate-400" />
                Preferences
              </h2>
              
              {maintenanceMode && (
                <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-start gap-2 text-orange-400 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p><strong>Maintenance Mode is active.</strong> The storefront is currently hidden from public visitors.</p>
                </div>
              )}

              <div className="space-y-1 flex-1">
                <Toggle 
                  enabled={maintenanceMode} 
                  onChange={handleMaintenanceToggle} 
                  label="Maintenance Mode" 
                  description="Temporarily disable public access to the platform." 
                />
                <Toggle 
                  enabled={newRegistrations} 
                  onChange={setNewRegistrations} 
                  label="Seller Registrations" 
                  description="Allow new sellers to submit applications." 
                />
                <Toggle 
                  enabled={emailNotifications} 
                  onChange={setEmailNotifications} 
                  label="Email Alerts" 
                  description="Receive system alerts via email." 
                />
                <Toggle 
                  enabled={smsNotifications} 
                  onChange={setSmsNotifications} 
                  label="SMS Alerts" 
                  description="Receive critical alerts via SMS (charges apply)." 
                />
              </div>
            </div>
          </div>

          {/* Security & Password */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 shadow-sm flex flex-col h-full">
              <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-400" />
                Security & Password
              </h2>
              <div className="space-y-4 max-w-md flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-10 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400">Strength:</span>
                        <span className={`font-bold ${strengthColors[strength] ? strengthColors[strength].replace('bg-', 'text-') : 'text-slate-400'}`}>
                          {strengthLabels[strength]}
                        </span>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div key={level} className={`flex-1 rounded-full ${strength >= level ? strengthColors[strength] : 'bg-slate-700'}`}></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button className="flex items-center justify-center gap-2 w-full px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50" disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}>
                    <Check className="w-4 h-4" /> Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ROW 3: Danger Zone */}
        <div className="grid grid-cols-1 gap-6">
          {/* Danger Zone */}
          <div className="bg-slate-800 rounded-xl border border-red-500/30 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <h2 className="text-lg font-semibold text-red-400 mb-5 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                <h3 className="font-bold text-white text-sm">Clear System Cache</h3>
                <p className="text-xs text-slate-400 mt-1 mb-3">Forces all storefront pages and API routes to rebuild their cached responses.</p>
                <button 
                  onClick={() => setShowClearCacheModal(true)}
                  className="px-4 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                  Clear Cache
                </button>
              </div>
              <div className="p-4 bg-slate-900/50 border border-red-500/20 rounded-lg">
                <h3 className="font-bold text-red-400 text-sm">Export All Data</h3>
                <p className="text-xs text-slate-400 mt-1 mb-3">Download a complete SQL dump of the database. Requires Superadmin OTP.</p>
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded transition-colors"
                >
                  <Database className="w-3.5 h-3.5" /> Export Data
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Active Sessions */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 shadow-sm mt-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-indigo-400" />
            Active Sessions
          </h2>
          <button 
            onClick={() => setShowLogoutAllModal(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Sign Out All Other Sessions
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700/30">
              <tr>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider rounded-tl-lg">Device</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Browser</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">IP Address</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Location</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Last Active</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-700/20 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-white font-medium">
                      {session.device}
                      {session.isCurrent && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Current</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{session.browser}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-xs">{session.ip}</td>
                  <td className="py-3 px-4 text-slate-400">{session.location}</td>
                  <td className="py-3 px-4 text-slate-400">{session.lastActive}</td>
                  <td className="py-3 px-4 text-right">
                    {!session.isCurrent && (
                      <button 
                        onClick={() => setSessionToLogout(session.id)}
                        className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                      >
                        Force Logout
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-red-400" />
                Confirm Data Export
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-300 mb-4">
                You are about to initiate a complete export of the production database. This action is heavily logged and requires confirmation.
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2 text-red-400 text-xs mb-5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>This export will contain sensitive user data, payment logs, and seller information. Handle the resulting file with extreme caution.</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-600/20 flex items-center gap-2"
                >
                  <Database className="w-4 h-4" /> Start Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={pendingMaintenanceMode === true}
        title="Enable Maintenance Mode"
        message="Are you sure you want to enable maintenance mode? The storefront will be hidden from public visitors and only admins will be able to log in."
        confirmLabel="Enable Maintenance"
        onConfirm={() => {
          setMaintenanceMode(true);
          setPendingMaintenanceMode(null);
        }}
        onCancel={() => setPendingMaintenanceMode(null)}
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={showClearCacheModal}
        title="Clear System Cache"
        message="This will force all storefront pages and API routes to rebuild their cached responses. It may temporarily increase server load."
        confirmLabel="Clear Cache"
        onConfirm={() => {
          // Implement cache clearing logic here
          setShowClearCacheModal(false);
        }}
        onCancel={() => setShowClearCacheModal(false)}
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={!!sessionToLogout}
        title="Force Logout Session"
        message="Are you sure you want to force logout this session? The user on that device will be required to log in again."
        confirmLabel="Force Logout"
        onConfirm={() => {
          setSessions(sessions.filter(s => s.id !== sessionToLogout));
          setSessionToLogout(null);
        }}
        onCancel={() => setSessionToLogout(null)}
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={showLogoutAllModal}
        title="Sign Out All Other Sessions"
        message="This will immediately invalidate all other active sessions across all devices. You will remain logged in on this device."
        confirmLabel="Sign Out All"
        onConfirm={() => {
          setSessions(sessions.filter(s => s.isCurrent));
          setShowLogoutAllModal(false);
        }}
        onCancel={() => setShowLogoutAllModal(false)}
        isDangerous={true}
      />

    </div>
  );
}

function Globe(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}

function X(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
