import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { useAppContext } from '../store';
import { Role, PermissionKey } from '../types';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Shield, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Key, 
  Search, 
  Filter, 
  Smartphone, 
  Send, 
  CheckCircle2, 
  Loader2, 
  RotateCcw 
} from 'lucide-react';

export function UserManagement() {
  const location = useLocation();
  const {
    currentUser,
    users,
    departments,
    directorates,
    committees,
    createUser,
    updateUser,
    deleteUser,
    rolePermissions,
    updateRolePermission
  } = useAppContext();

  // Navigation states
  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions' | 'otp-bypass'>('accounts');
  const [selectedRole, setSelectedRole] = useState<Role>('County Assembly Clerk');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'permissions') {
      setActiveTab('permissions');
    } else if (tabParam === 'otp-bypass' && currentUser?.role === 'System Administrator') {
      setActiveTab('otp-bypass');
    } else if (tabParam === 'accounts') {
      setActiveTab('accounts');
    }
  }, [location.search, currentUser]);

  // OTP Bypass Settings States
  const [otpSkipEnabled, setOtpSkipEnabled] = useState(false);
  const [loadingOtpSkip, setLoadingOtpSkip] = useState(true);
  const [savingOtpSkip, setSavingOtpSkip] = useState(false);

  React.useEffect(() => {
    if (currentUser?.role === 'System Administrator') {
      fetch('/api/settings/otp-skip')
        .then(res => {
          if (!res.ok) throw new Error('Failed to load');
          return res.json();
        })
        .then(data => {
          setOtpSkipEnabled(data.enabled);
          setLoadingOtpSkip(false);
        })
        .catch(err => {
          console.error('Error loading otp-skip setting:', err);
          setLoadingOtpSkip(false);
        });
    }
  }, [currentUser]);

  const handleToggleOtpSkip = async () => {
    setSavingOtpSkip(true);
    const targetVal = !otpSkipEnabled;
    try {
      const response = await fetch('/api/settings/otp-skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: targetVal }),
      });
      if (response.ok) {
        setOtpSkipEnabled(targetVal);
        // Log audit log
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser?.id,
            userName: currentUser?.name,
            userRole: currentUser?.role,
            action: 'Edit',
            entityType: 'System',
            entityId: 'otp-skip-bypass',
            details: `System-wide OTP bypass toggled to: ${targetVal ? 'ENABLED' : 'DISABLED'}`,
            apiEndpoint: '/api/settings/otp-skip',
            apiMethod: 'POST',
          }),
        });
      }
    } catch (err) {
      console.error('Error saving otp-skip setting:', err);
    } finally {
      setSavingOtpSkip(false);
    }
  };

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // OTP test states for registering users
  const [otpSentPhone, setOtpSentPhone] = useState('');
  const [otpSendStatus, setOtpSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [testOtpCode, setTestOtpCode] = useState('');
  const [otpVerifyStatus, setOtpVerifyStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const [otpMessage, setOtpMessage] = useState('');

  // User management states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'Committee Clerk' as string,
    departmentId: '',
    directorateId: '',
  });

  if (!currentUser || !['ICT', 'System Administrator', 'ICT Director'].includes(currentUser.role)) {
    return (
      <div className="p-6 text-center text-slate-500 font-sans">
        You do not have permission to view this page.
      </div>
    );
  }

  // User management operations
  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'Committee Clerk',
      departmentId: '',
      directorateId: '',
    });
    // Reset OTP states
    setOtpSentPhone('');
    setOtpSendStatus('idle');
    setTestOtpCode('');
    setOtpVerifyStatus('idle');
    setOtpMessage('');
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: user.password || '',
      phone: user.phone || '',
      role: user.role,
      departmentId: user.departmentId || '',
      directorateId: user.directorateId || '',
    });
    // Reset OTP states
    setOtpSentPhone('');
    setOtpSendStatus('idle');
    setTestOtpCode('');
    if (user.phoneVerified || user.phone) {
      setOtpVerifyStatus('verified');
      setOtpMessage('Mobile number has already been verified.');
    } else {
      setOtpVerifyStatus('idle');
      setOtpMessage('');
    }
    setUserModalOpen(true);
  };

  const handleSendTestOtp = async () => {
    if (!userForm.phone) {
      setOtpMessage('Please enter a mobile number first.');
      setOtpSendStatus('error');
      return;
    }
    
    setOtpSendStatus('sending');
    setOtpMessage('');
    setOtpVerifyStatus('idle');
    setTestOtpCode('');

    try {
      const response = await fetch('/api/auth/test-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: userForm.phone }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSendStatus('sent');
        setOtpSentPhone(userForm.phone);
        setOtpMessage(`OTP sent successfully to ${userForm.phone}`);
      } else {
        setOtpSendStatus('error');
        setOtpMessage(data.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setOtpSendStatus('error');
      setOtpMessage('Failed to connect to server.');
    }
  };

  const handleVerifyTestOtp = async () => {
    if (!testOtpCode) {
      setOtpMessage('Please enter the 6-digit code.');
      setOtpVerifyStatus('error');
      return;
    }

    setOtpVerifyStatus('verifying');
    setOtpMessage('');

    try {
      const response = await fetch('/api/auth/verify-test-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpSentPhone, code: testOtpCode }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpVerifyStatus('verified');
        setOtpMessage('Mobile number verified successfully!');
      } else {
        setOtpVerifyStatus('error');
        setOtpMessage(data.message || 'Invalid or expired code.');
      }
    } catch (err: any) {
      setOtpVerifyStatus('error');
      setOtpMessage('Verification failed.');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.role) {
      alert('Please fill out all required fields.');
      return;
    }

    // Require mobile verification if phone is entered on registration
    if (!editingUserId && userForm.phone && otpVerifyStatus !== 'verified') {
      alert('Please verify the mobile number via OTP before proceeding with the registration.');
      return;
    }

    const payload = {
      ...userForm,
      role: userForm.role as Role,
      departmentId: userForm.departmentId || undefined,
      directorateId: userForm.directorateId || undefined,
      phoneVerified: otpVerifyStatus === 'verified',
    };

    let success = false;
    if (editingUserId) {
      success = await updateUser(editingUserId, payload);
    } else {
      success = await createUser(payload);
    }

    if (success) {
      setUserModalOpen(false);
    } else {
      alert('Operation failed. Please check if email is unique.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user account?')) {
      const success = await deleteUser(id);
      if (!success) {
        alert('Failed to delete user.');
      }
    }
  };

  // Roles list
  const roles: Role[] = [
    'County Assembly Clerk',
    'Assistant County Assembly Clerk',
    'Committee Clerk',
    'County Secretary',
    "County Secretary's Assistant",
    'CECM',
    'CCO',
    'Director',
    'Assistant Director Liaison',
    'ICT',
    'System Administrator',
    'ICT Director',
  ];

  // Permission definitions
  const permissionDefinitions = [
    {
      key: 'create_resolution' as PermissionKey,
      label: 'Create Resolutions',
      description: 'Enables users to register and draft new Assembly Resolutions.'
    },
    {
      key: 'edit_resolution' as PermissionKey,
      label: 'Edit Resolutions',
      description: 'Enables users to modify, update details, or correct drafted Resolutions.'
    },
    {
      key: 'delete_resolution' as PermissionKey,
      label: 'Delete Resolutions',
      description: 'Enables users with sufficient clearance to delete existing Resolutions.'
    },
    {
      key: 'upload_documents' as PermissionKey,
      label: 'Upload Documents',
      description: 'Allows users to upload official documents, hansards, and reports to a Resolution.'
    },
    {
      key: 'view_resolutions' as PermissionKey,
      label: 'View Resolutions',
      description: 'Allows users to view the list and individual details of all Resolutions.'
    },
    {
      key: 'approve_resolutions' as PermissionKey,
      label: 'Approve & Sign Resolutions',
      description: 'Allows formal approval/rejection signatures, or submitting executive implementation replies.'
    },
    {
      key: 'reject_resolutions' as PermissionKey,
      label: 'Reject Resolutions',
      description: 'Allows formal rejection of Resolutions pending approval.'
    },
    {
      key: 'assign_resolutions' as PermissionKey,
      label: 'Delegate / Assign Resolutions',
      description: 'Allows assigning active resolutions to Executive Departments and Directorates.'
    },
    {
      key: 'manage_users' as PermissionKey,
      label: 'User Management & Settings',
      description: 'Allows administrators to configure system defaults, add user accounts, and change permissions.'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 font-sans mt-1">
            Configure system access, user mappings, and manage granular role-based permissions.
          </p>
        </div>
        {activeTab === 'accounts' && (
          <button
            onClick={handleOpenAddUser}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md shadow-orange-600/10 hover:shadow-lg hover:shadow-orange-600/20 active:scale-95 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm font-sans flex items-center gap-2 transition-colors ${
              activeTab === 'accounts'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            User Accounts
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm font-sans flex items-center gap-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            Role Permissions
          </button>
          {currentUser?.role === 'System Administrator' && (
            <button
              onClick={() => setActiveTab('otp-bypass')}
              className={`py-4 px-1 border-b-2 font-medium text-sm font-sans flex items-center gap-2 transition-colors ${
                activeTab === 'otp-bypass'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              OTP Bypass Setting
            </button>
          )}
        </nav>
      </div>

      {activeTab === 'accounts' && (
        /* User Accounts View with Search & Filter */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
            <div className="flex-1 min-w-[240px] relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by name, email or phone..."
                className="block w-full pl-10 pr-10 py-2 text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg bg-slate-50/50 focus:bg-white transition-all font-medium text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filters:</span>
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs border-slate-200 rounded-lg py-1.5 px-3 border bg-white font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs border-slate-200 rounded-lg py-1.5 px-3 border bg-white font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {(searchTerm || roleFilter || deptFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('');
                    setDeptFilter('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm font-sans">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700">User Details</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">System Role</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Organizational Mapping</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(() => {
                    const filteredUsers = users.filter((u) => {
                      const matchesSearch = 
                        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.phone && u.phone.includes(searchTerm));
                      
                      const matchesRole = roleFilter ? u.role === roleFilter : true;
                      const matchesDept = deptFilter ? u.departmentId === deptFilter : true;

                      return matchesSearch && matchesRole && matchesDept;
                    });

                    if (filteredUsers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                            No user accounts found matching the search/filter criteria.
                          </td>
                        </tr>
                      );
                    }

                    return filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] text-slate-400 font-mono">OTP Phone: {u.phone}</span>
                              {u.phoneVerified ? (
                                <span className="inline-flex items-center text-[9px] font-extrabold text-green-700 bg-green-50 px-1.5 py-0.2 rounded border border-green-100">
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
                                  Unverified
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-100">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {u.departmentId && (
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block">Department</span>
                              {departments.find(d => d.id === u.departmentId)?.name || u.departmentId}
                            </div>
                          )}
                          {u.directorateId && (
                            <div className="mt-1.5">
                              <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block">Directorate/Committee</span>
                              {directorates.find(d => d.id === u.directorateId)?.name || 
                               committees.find(c => c.id === u.directorateId)?.name || u.directorateId}
                            </div>
                          )}
                          {!u.departmentId && !u.directorateId && <span className="text-slate-400 italic">No mapping assigned</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        /* Role Permissions View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Vertical Roles List */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-3 font-sans">System Roles</h3>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium font-sans flex items-center justify-between transition-colors ${
                  selectedRole === role
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{role}</span>
                {selectedRole === role && <CheckCircle className="w-4 h-4 text-orange-600" />}
              </button>
            ))}
          </div>

          {/* Permissions Form / Details */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950 font-sans flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-orange-600" />
                  {selectedRole} Permissions
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Configure granular controls for user actions associated with this role.
                </p>
              </div>
              {selectedRole === 'System Administrator' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  System Admin (Full Bypass)
                </span>
              )}
            </div>

            <div className="space-y-4">
              {permissionDefinitions.map((permission) => {
                const isEnabled = rolePermissions[selectedRole]?.[permission.key] ?? false;
                return (
                  <div
                    key={permission.key}
                    className="flex items-start justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-150 transition-colors"
                  >
                    <div className="pr-4 space-y-1">
                      <label
                        htmlFor={`perm-${permission.key}`}
                        className="text-sm font-semibold text-slate-800 font-sans block cursor-pointer"
                      >
                        {permission.label}
                      </label>
                      <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        {permission.description}
                      </p>
                    </div>
                    <div className="flex items-center h-5">
                      <input
                        id={`perm-${permission.key}`}
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => updateRolePermission(selectedRole, permission.key, e.target.checked)}
                        className="h-4.5 w-4.5 text-orange-600 focus:ring-orange-500 border-slate-300 rounded cursor-pointer transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Summary Footer */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
              <Key className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-600 font-sans leading-normal">
                Changes made here are applied immediately. Users currently logged in with the <strong>{selectedRole}</strong> role will receive these permissions on their next navigation or data refresh.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'otp-bypass' && currentUser?.role === 'System Administrator' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 font-sans animate-in fade-in-50 duration-200">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-600 animate-pulse" />
              OTP Bypass Configuration
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure environment-specific security controls. Bypassing OTP simplifies the local development flow but must be disabled in production.
            </p>
          </div>

          {loadingOtpSkip ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Loading security configuration...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Banner */}
              {otpSkipEnabled && (
                <div className="p-4 rounded-xl border flex items-start gap-3 transition-all bg-amber-50 border-amber-200 text-amber-900">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  <div>
                    <h4 className="text-sm font-bold">
                      System-Wide OTP Skipping is ACTIVE (Development Mode)
                    </h4>
                    <p className="text-xs opacity-90 mt-1 leading-relaxed">
                      Users are allowed to log in using only their email and password. No SMS or Email OTP verification codes will be sent or required. This is highly recommended ONLY for development/local sandbox testing.
                    </p>
                  </div>
                </div>
              )}

              {/* Toggle Setting Card */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Security Control</span>
                  <h5 className="text-base font-bold text-slate-800">Allow System-Wide OTP Skipping</h5>
                  <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                    Toggle this to temporarily bypass OTP checks during development sessions, demo days, or automated frontend testing.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleToggleOtpSkip}
                  disabled={savingOtpSkip}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shrink-0 flex items-center gap-2 ${
                    savingOtpSkip 
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                      : otpSkipEnabled
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-600/15 cursor-pointer active:scale-95 hover:scale-[1.02]'
                      : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 shadow-md shadow-orange-600/15 cursor-pointer active:scale-95 hover:scale-[1.02]'
                  }`}
                >
                  {savingOtpSkip && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {savingOtpSkip 
                      ? 'Updating...' 
                      : otpSkipEnabled 
                      ? 'Disable Skip (Enforce OTP)' 
                      : 'Enable Skip (Allow Bypass)'}
                  </span>
                </button>
              </div>

              {/* Recommendations Box */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Administrator Security Guidelines</h5>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-sans leading-relaxed">
                  <li><strong>Development / Testing:</strong> Enabling OTP skip is highly recommended to avoid exhausting SMS credits or waiting for email delivery during prototyping.</li>
                  <li><strong>Production Deployments:</strong> Always ensure system-wide OTP skipping is disabled before publishing to staging or production systems.</li>
                  <li><strong>Audit Logs:</strong> Toggling this state triggers an immutable audit trail entry linked to your administrator account.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 animate-in fade-in-50 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                {editingUserId ? 'Edit User Account' : 'Create New User Account'}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g. johndoe@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Mobile No (for OTP SMS)</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    disabled={otpVerifyStatus === 'verified'}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed transition-all duration-200"
                    placeholder="e.g. 254712345678"
                  />
                </div>

                {userForm.phone && (
                  <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-slate-100/75 border border-slate-200 rounded-2xl p-5 space-y-4 font-sans shadow-xs transition-all duration-300">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2.5 text-slate-800">
                        <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">SMS Gateway Connectivity</span>
                      </div>
                      {otpVerifyStatus === 'verified' ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-green-700 bg-green-100/80 border border-green-200 px-3 py-1 rounded-full shadow-3xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" /> VERIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full shadow-3xs">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" /> UNVERIFIED
                        </span>
                      )}
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 shrink-0 mt-0.5">
                          <Send className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800">Test OTP Gateway Delivery</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            Triggers a mock SMS route simulating the live Tilil gateway. Required to activate new users.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!userForm.phone || otpSendStatus === 'sending'}
                        onClick={handleSendTestOtp}
                        className={`inline-flex items-center justify-center px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-200 shrink-0 select-none cursor-pointer ${
                          otpSendStatus === 'sending'
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : otpSendStatus === 'sent'
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95 hover:scale-[1.02] shadow-md shadow-orange-600/10'
                        }`}
                      >
                        {otpSendStatus === 'sending' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Sending...
                          </>
                        ) : otpSendStatus === 'sent' ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Resend OTP
                          </>
                        ) : (
                          'Send Test OTP'
                        )}
                      </button>
                    </div>

                    {otpSendStatus === 'sent' && otpVerifyStatus !== 'verified' && (
                      <div className="bg-orange-50/30 border border-orange-100/60 p-4 rounded-xl space-y-3 animate-in slide-in-from-top duration-300">
                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">Enter OTP Code Received</p>
                        <div className="flex items-center gap-3">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              maxLength={6}
                              value={testOtpCode}
                              onChange={(e) => setTestOtpCode(e.target.value)}
                              placeholder="0 0 0 0 0 0"
                              className="block w-full text-sm font-bold border-slate-200 rounded-xl py-2.5 px-4 border focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white font-mono tracking-[0.75em] text-center uppercase shadow-3xs transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={!testOtpCode || otpVerifyStatus === 'verifying'}
                            onClick={handleVerifyTestOtp}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-all duration-200 shrink-0 cursor-pointer active:scale-95 hover:scale-[1.02] shadow-md shadow-green-600/10"
                          >
                            {otpVerifyStatus === 'verifying' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                Verifying
                              </>
                            ) : (
                              'Verify Code'
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {otpMessage && (
                      <div className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 ${
                        otpVerifyStatus === 'verified' || (otpSendStatus === 'sent' && otpVerifyStatus === 'idle')
                          ? 'bg-green-50 border-green-200/60 text-green-800' 
                          : 'bg-red-50 border-red-200/60 text-red-800'
                      }`}>
                        {otpVerifyStatus === 'verified' || (otpSendStatus === 'sent' && otpVerifyStatus === 'idle') ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="leading-relaxed">{otpMessage}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className={['CECM', 'CCO', 'Director', 'Assistant Director Liaison', 'County Secretary', "County Secretary's Assistant", 'Committee Clerk'].includes(userForm.role) ? 'col-span-1' : 'md:col-span-2'}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Role *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500 bg-white"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Conditional mappings */}
                {['CECM', 'CCO', 'Director', 'Assistant Director Liaison', 'County Secretary', "County Secretary's Assistant"].includes(userForm.role) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Department</label>
                    <select
                       value={userForm.departmentId}
                       onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}
                       className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500 bg-white"
                    >
                       <option value="">Select Department...</option>
                       {departments.map((d) => (
                         <option key={d.id} value={d.id}>{d.name}</option>
                       ))}
                    </select>
                  </div>
                )}

                {userForm.role === 'Committee Clerk' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Committee</label>
                    <select
                      value={userForm.directorateId}
                      onChange={(e) => setUserForm({ ...userForm, directorateId: e.target.value })}
                      className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500 bg-white"
                    >
                      <option value="">Select Committee...</option>
                      {committees.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {['Director', 'Assistant Director Liaison'].includes(userForm.role) && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Directorate</label>
                    <select
                      value={userForm.directorateId}
                      onChange={(e) => setUserForm({ ...userForm, directorateId: e.target.value })}
                      className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500 bg-white"
                    >
                      <option value="">Select Directorate...</option>
                      {directorates.map((dir) => (
                        <option key={dir.id} value={dir.id}>{dir.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
