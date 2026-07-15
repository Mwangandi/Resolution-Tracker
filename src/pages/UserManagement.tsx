import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Role, PermissionKey } from '../types';
import { Users, Plus, Pencil, Trash2, X, Shield, ShieldAlert, CheckCircle, AlertTriangle, Key } from 'lucide-react';

export function UserManagement() {
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
  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions'>('accounts');
  const [selectedRole, setSelectedRole] = useState<Role>('County Assembly Clerk');

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
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: user.password || 'password123',
      phone: user.phone || '',
      role: user.role,
      departmentId: user.departmentId || '',
      directorateId: user.directorateId || '',
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.role) {
      alert('Please fill out all required fields.');
      return;
    }

    const payload = {
      ...userForm,
      role: userForm.role as Role,
      departmentId: userForm.departmentId || undefined,
      directorateId: userForm.directorateId || undefined,
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
            className="self-start md:self-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-colors focus:outline-none"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
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
        </nav>
      </div>

      {activeTab === 'accounts' ? (
        /* User Accounts View */
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
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                      {u.phone && <div className="text-[10px] text-slate-400 font-mono mt-0.5">OTP Phone: {u.phone}</div>}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                    placeholder="e.g. Patterson Roge"
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
                    placeholder="e.g. patterson@example.com"
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
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g. 254712345678"
                  />
                </div>

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
