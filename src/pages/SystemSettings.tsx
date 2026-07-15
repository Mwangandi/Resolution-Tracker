import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Role } from '../types';
import { Building2, FileText, CheckCircle, Users, Plus, Pencil, Trash2, X, Check, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';

export function SystemSettings() {
  const { 
    currentUser, 
    departments, 
    directorates, 
    committees, 
    docCategories, 
    statusCategories,
    manageSystemItem,
    users,
    createUser,
    updateUser,
    deleteUser
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<string>('departments');

  // Inline configuration item editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // For new config items
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  // For department head and parent department linking
  const [newHeadUserId, setNewHeadUserId] = useState<string>('');
  const [editHeadUserId, setEditHeadUserId] = useState<string>('');
  const [newClerkUserId, setNewClerkUserId] = useState<string>('');
  const [editClerkUserId, setEditClerkUserId] = useState<string>('');
  const [newDepartmentId, setNewDepartmentId] = useState<string>('');
  const [editDepartmentId, setEditDepartmentId] = useState<string>('');

  // Committee members modal states
  const [selectedCommitteeForMembers, setSelectedCommitteeForMembers] = useState<any | null>(null);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberPosition, setNewMemberPosition] = useState('Member');
  const [membersError, setMembersError] = useState<string | null>(null);

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

  if (!currentUser || !['ICT', 'System Administrator', 'ICT Director', 'County Assembly Clerk', 'Assistant County Assembly Clerk'].includes(currentUser.role)) {
    return (
      <div className="p-6 text-center text-slate-500">
        You do not have permission to view this page.
      </div>
    );
  }

  const tabs = [
    { id: 'departments', name: 'Departments', icon: Building2, count: departments.filter(d => d.isActive !== false).length },
    { id: 'directorates', name: 'Directorates', icon: Building2, count: directorates.filter(d => d.isActive !== false).length },
    { id: 'committees', name: 'Committees', icon: Users, count: committees.filter(c => c.isActive !== false).length },
    { id: 'docCategories', name: 'Doc Categories', icon: FileText, count: docCategories.filter(d => d.isActive !== false).length },
    { id: 'statusCategories', name: 'Status Categories', icon: CheckCircle, count: statusCategories.filter(s => s.isActive !== false).length },
  ];

  const getCurrentList = () => {
    switch (activeTab) {
      case 'departments': return departments.filter(i => i.isActive !== false);
      case 'directorates': return directorates.filter(i => i.isActive !== false);
      case 'committees': return committees.filter(i => i.isActive !== false);
      case 'docCategories': return docCategories.filter(i => i.isActive !== false);
      case 'statusCategories': return statusCategories.filter(i => i.isActive !== false);
      default: return [];
    }
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      const item: any = { id, name: editValue };
      if (activeTab === 'departments') {
        item.headUserId = editHeadUserId || null;
      }
      if (activeTab === 'directorates') {
        item.departmentId = editDepartmentId || (departments[0]?.id || null);
        item.headUserId = editHeadUserId || null;
      }
      if (activeTab === 'committees') {
        item.headUserId = editHeadUserId || null;
        item.clerkUserId = editClerkUserId || null;
        // Keep members in sync or initialize
        const existing = committees.find(c => c.id === id);
        let existingMembers = existing?.members || [];
        
        // If headUserId changed, make sure it's in members or update designation
        if (editHeadUserId) {
          const idx = existingMembers.findIndex(m => m.position === 'Chairman' || m.userId === editHeadUserId);
          if (idx >= 0) {
            existingMembers[idx] = { userId: editHeadUserId, position: 'Chairman' };
          } else {
            existingMembers = [...existingMembers, { userId: editHeadUserId, position: 'Chairman' }];
          }
        }
        // If clerkUserId changed, make sure it's in members or update designation
        if (editClerkUserId) {
          const idx = existingMembers.findIndex(m => m.position === 'Clerk/Secretary' || m.userId === editClerkUserId);
          if (idx >= 0) {
            existingMembers[idx] = { userId: editClerkUserId, position: 'Clerk/Secretary' };
          } else {
            existingMembers = [...existingMembers, { userId: editClerkUserId, position: 'Clerk/Secretary' }];
          }
        }
        item.members = existingMembers;
      }
      manageSystemItem(activeTab as any, 'edit', item);
    }
    setEditingId(null);
    setEditHeadUserId('');
    setEditClerkUserId('');
    setEditDepartmentId('');
  };

  const handleSaveNew = () => {
    if (newValue.trim()) {
      const item: any = { name: newValue, isActive: true };
      if (activeTab === 'directorates') {
        item.departmentId = newDepartmentId || (departments[0]?.id || null);
        item.headUserId = newHeadUserId || null;
      }
      if (activeTab === 'statusCategories') {
        item.badgeClass = 'bg-slate-100 text-slate-800';
      }
      if (activeTab === 'departments') {
        item.headUserId = newHeadUserId || null;
      }
      if (activeTab === 'committees') {
        item.headUserId = newHeadUserId || null;
        item.clerkUserId = newClerkUserId || null;
        
        const initialMembers = [];
        if (newHeadUserId) {
          initialMembers.push({ userId: newHeadUserId, position: 'Chairman' });
        }
        if (newClerkUserId) {
          initialMembers.push({ userId: newClerkUserId, position: 'Clerk/Secretary' });
        }
        item.members = initialMembers;
      }
      manageSystemItem(activeTab as any, 'add', item);
    }
    setIsAdding(false);
    setNewValue('');
    setNewHeadUserId('');
    setNewClerkUserId('');
    setNewDepartmentId('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      manageSystemItem(activeTab as any, 'delete', { id });
    }
  };

  const handleOpenMembersModal = (committee: any) => {
    setSelectedCommitteeForMembers(committee);
    setNewMemberUserId('');
    setNewMemberPosition('Member');
    setMembersError(null);
    setMembersModalOpen(true);
  };

  const handleAddMember = () => {
    setMembersError(null);
    if (!selectedCommitteeForMembers || !newMemberUserId) {
      setMembersError('Please select a user to add.');
      return;
    }
    
    const userToAdd = users.find(u => u.id === newMemberUserId);
    if (!userToAdd) {
      setMembersError('Selected user not found.');
      return;
    }

    const currentMembers = selectedCommitteeForMembers.members || [];
    
    // Check if user is already a member
    if (currentMembers.some((m: any) => m.userId === newMemberUserId)) {
      setMembersError(`${userToAdd.name} is already a member of this committee.`);
      return;
    }

    const updatedMembers = [
      ...currentMembers,
      { userId: newMemberUserId, position: newMemberPosition || 'Member' }
    ];

    const updatedCommittee = {
      ...selectedCommitteeForMembers,
      members: updatedMembers
    };

    manageSystemItem('committees', 'edit', updatedCommittee);
    setSelectedCommitteeForMembers(updatedCommittee);
    setNewMemberUserId('');
    setNewMemberPosition('Member');
  };

  const handleRemoveMember = (userId: string) => {
    setMembersError(null);
    if (!selectedCommitteeForMembers) return;

    // Check if the user is the primary Chairman or Clerk
    if (userId === selectedCommitteeForMembers.headUserId) {
      setMembersError('The Committee Chairman cannot be removed from the members list. To change the Chairman, please edit the Committee details directly.');
      return;
    }
    if (userId === selectedCommitteeForMembers.clerkUserId) {
      setMembersError('The Committee Clerk cannot be removed from the members list. To change the Clerk, please edit the Committee details directly.');
      return;
    }

    const currentMembers = selectedCommitteeForMembers.members || [];
    const updatedMembers = currentMembers.filter((m: any) => m.userId !== userId);

    const updatedCommittee = {
      ...selectedCommitteeForMembers,
      members: updatedMembers
    };

    manageSystemItem('committees', 'edit', updatedCommittee);
    setSelectedCommitteeForMembers(updatedCommittee);
  };

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

  const currentList = getCurrentList();

  // Roles list
  const roles = [
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage system configurations, classifications, and user accounts.</p>
      </div>

      {/* Horizontal Tabs Menu */}
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap gap-x-8 gap-y-2" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setEditingId(null);
                  setIsAdding(false);
                }}
                className={clsx(
                  "py-4 px-1 border-b-2 font-medium text-sm font-sans flex items-center gap-2 transition-colors focus:outline-none cursor-pointer",
                  isActive
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <Icon className={clsx("w-4 h-4", isActive ? "text-orange-600" : "text-slate-400")} />
                <span>{tab.name}</span>
                <span className={clsx(
                  "ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold",
                  isActive ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden min-h-[500px]">
        {/* Content Area */}
        <div className="flex-1 p-6 bg-white font-sans">
          {activeTab === 'users' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">User Accounts</h2>
                  <p className="text-xs text-slate-500">Add, edit, or remove user accounts and assign roles.</p>
                </div>
                <button
                  onClick={handleOpenAddUser}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add User
                </button>
              </div>

              {/* Users Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700">User / Contact</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Mapping</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-400 font-mono">OTP No: {u.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-800 border border-orange-100">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {u.departmentId && (
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider text-[9px] block">Department</span>
                              {departments.find(d => d.id === u.departmentId)?.name || u.departmentId}
                            </div>
                          )}
                          {u.directorateId && (
                            <div className="mt-1">
                              <span className="text-slate-400 uppercase tracking-wider text-[9px] block">Directorate/Committee</span>
                              {directorates.find(d => d.id === u.directorateId)?.name || 
                               committees.find(c => c.id === u.directorateId)?.name || u.directorateId}
                            </div>
                          )}
                          {!u.departmentId && !u.directorateId && <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit User"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Permission Reference Table */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider font-sans">Role Permissions Reference</h3>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200 text-xs text-left font-sans">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2 text-center">Create</th>
                        <th className="px-3 py-2 text-center">Edit</th>
                        <th className="px-3 py-2 text-center">Uploads</th>
                        <th className="px-3 py-2 text-center">Viewing</th>
                        <th className="px-3 py-2 text-center">Approval</th>
                        <th className="px-3 py-2 text-center">Reject</th>
                        <th className="px-3 py-2 text-center">Delegation</th>
                        <th className="px-3 py-2 text-center">User Mgmt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">County Assembly Clerk</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">Assistant County Assembly Clerk</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">Committee Clerk</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">County Secretary</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-red-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">County Secretary's Assistant</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">CECM / CCO / Director</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅*</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">Assistant Director Liaison</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">ICT</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-slate-300">—</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">✅</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-2 bg-slate-50 text-[10px] text-slate-500 border-t border-slate-200">
                    * CECM/CCO approval applies only when assigned to their own department, on the Executive side.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 font-sans">
                <h2 className="text-lg font-bold text-slate-800">
                  {tabs.find(t => t.id === activeTab)?.name}
                </h2>
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add New
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm font-sans">
                <ul className="divide-y divide-slate-100">
                  {isAdding && (
                    <li className="p-5 bg-gradient-to-r from-orange-50/40 to-amber-50/20 border-b border-orange-100 flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">
                        <Plus className="w-3.5 h-3.5" />
                        Add New {tabs.find(t => t.id === activeTab)?.name.slice(0, -1) || 'Item'}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className={clsx("col-span-12", activeTab === 'departments' || activeTab === 'directorates' || activeTab === 'committees' ? "md:col-span-4" : "col-span-12 md:col-span-8")}>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Name</label>
                          <input
                            type="text"
                            autoFocus
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="Enter name..."
                            className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                          />
                        </div>

                        {activeTab === 'departments' && (
                          <div className="col-span-12 md:col-span-5">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">CECM / Department Head</label>
                            <select
                              value={newHeadUserId}
                              onChange={(e) => setNewHeadUserId(e.target.value)}
                              className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                            >
                              <option value="">No Department Head Assigned</option>
                              {users
                                .filter(u => u.role === 'CECM' || u.role === 'County Secretary')
                                .map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.role})
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                        )}

                        {activeTab === 'committees' && (
                          <>
                            <div className="col-span-12 md:col-span-2.5">
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Committee Chairman</label>
                              <select
                                value={newHeadUserId}
                                onChange={(e) => setNewHeadUserId(e.target.value)}
                                className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                              >
                                <option value="">Select Chairman...</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-12 md:col-span-2.5">
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Clerk / Secretary</label>
                              <select
                                value={newClerkUserId}
                                onChange={(e) => setNewClerkUserId(e.target.value)}
                                className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                              >
                                <option value="">Select Clerk...</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {activeTab === 'directorates' && (
                          <>
                            <div className="col-span-12 md:col-span-4">
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Parent Department</label>
                              <select
                                value={newDepartmentId}
                                onChange={(e) => setNewDepartmentId(e.target.value)}
                                className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                              >
                                <option value="">Select Department...</option>
                                {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Director / Directorate Head</label>
                              <select
                                value={newHeadUserId}
                                onChange={(e) => setNewHeadUserId(e.target.value)}
                                className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                              >
                                <option value="">No Directorate Head Assigned</option>
                                {users
                                  .filter(u => u.role === 'Director')
                                  .map(u => (
                                    <option key={u.id} value={u.id}>
                                      {u.name} ({u.role})
                                    </option>
                                  ))
                                }
                              </select>
                            </div>
                          </>
                        )}

                        <div className={clsx("col-span-12 flex items-center gap-2 justify-end", (activeTab === 'departments' || activeTab === 'directorates' || activeTab === 'committees') ? "md:col-span-3" : "md:col-span-4")}>
                          <button 
                            onClick={handleSaveNew} 
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm cursor-pointer transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                          <button 
                            onClick={() => { setIsAdding(false); setNewValue(''); setNewHeadUserId(''); setNewClerkUserId(''); setNewDepartmentId(''); }} 
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  )}
                  
                  {currentList.map((item: any) => {
                    // Left border highlight colors depending on tab
                    const borderColors: Record<string, string> = {
                      departments: 'border-l-4 border-l-orange-500',
                      directorates: 'border-l-4 border-l-blue-500',
                      committees: 'border-l-4 border-l-teal-500',
                      docCategories: 'border-l-4 border-l-purple-500',
                      statusCategories: 'border-l-4 border-l-slate-400',
                    };
                    const itemBorderClass = borderColors[activeTab] || '';

                    return (
                      <li key={item.id} className={clsx("flex flex-col hover:bg-slate-50/80 transition-all duration-200 group", itemBorderClass)}>
                        {editingId === item.id ? (
                          <div className="w-full p-5 bg-blue-50/30 flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                              <Pencil className="w-3.5 h-3.5" />
                              Edit {tabs.find(t => t.id === activeTab)?.name.slice(0, -1) || 'Item'}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                              <div className={clsx("col-span-12", activeTab === 'departments' || activeTab === 'directorates' || activeTab === 'committees' ? "md:col-span-4" : "col-span-12 md:col-span-8")}>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Name</label>
                                <input
                                  type="text"
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white font-medium text-slate-800"
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.id)}
                                />
                              </div>

                              {activeTab === 'departments' && (
                                <div className="col-span-12 md:col-span-5">
                                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">CECM / Department Head</label>
                                  <select
                                    value={editHeadUserId}
                                    onChange={(e) => setEditHeadUserId(e.target.value)}
                                    className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                                  >
                                    <option value="">No Department Head Assigned</option>
                                    {users
                                      .filter(u => u.role === 'CECM' || u.role === 'County Secretary')
                                      .map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.name} ({u.role})
                                        </option>
                                      ))
                                    }
                                  </select>
                                </div>
                              )}

                              {activeTab === 'committees' && (
                                <>
                                  <div className="col-span-12 md:col-span-2.5">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Committee Chairman</label>
                                    <select
                                      value={editHeadUserId}
                                      onChange={(e) => setEditHeadUserId(e.target.value)}
                                      className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                                    >
                                      <option value="">Select Chairman...</option>
                                      {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.name} ({u.role})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-12 md:col-span-2.5">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Clerk / Secretary</label>
                                    <select
                                      value={editClerkUserId}
                                      onChange={(e) => setEditClerkUserId(e.target.value)}
                                      className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                                    >
                                      <option value="">Select Clerk...</option>
                                      {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.name} ({u.role})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </>
                              )}

                              {activeTab === 'directorates' && (
                                <>
                                  <div className="col-span-12 md:col-span-4">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Parent Department</label>
                                    <select
                                      value={editDepartmentId}
                                      onChange={(e) => setEditDepartmentId(e.target.value)}
                                      className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                                    >
                                      <option value="">Select Department...</option>
                                      {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-12 md:col-span-4">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Director / Directorate Head</label>
                                    <select
                                      value={editHeadUserId}
                                      onChange={(e) => setEditHeadUserId(e.target.value)}
                                      className="w-full text-sm border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg shadow-sm transition-all py-2 px-3 bg-white"
                                    >
                                      <option value="">No Directorate Head Assigned</option>
                                      {users
                                        .filter(u => u.role === 'Director')
                                        .map(u => (
                                          <option key={u.id} value={u.id}>
                                            {u.name} ({u.role})
                                          </option>
                                        ))
                                      }
                                    </select>
                                  </div>
                                </>
                              )}

                              <div className={clsx("col-span-12 flex items-center gap-2 justify-end", (activeTab === 'departments' || activeTab === 'directorates') ? "md:col-span-3" : "md:col-span-4")}>
                                <button 
                                  onClick={() => handleSaveEdit(item.id)} 
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm cursor-pointer transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Save</span>
                                </button>
                                <button 
                                  onClick={() => setEditingId(null)} 
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-3">
                              {/* Left Icon decoration */}
                              <div className="mt-0.5 p-1.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                {activeTab === 'departments' && <Building2 className="w-4 h-4 text-orange-600" />}
                                {activeTab === 'directorates' && <Building2 className="w-4 h-4 text-blue-600" />}
                                {activeTab === 'committees' && <Users className="w-4 h-4 text-teal-600" />}
                                {activeTab === 'docCategories' && <FileText className="w-4 h-4 text-purple-600" />}
                                {activeTab === 'statusCategories' && <CheckCircle className="w-4 h-4 text-slate-500" />}
                              </div>

                              <div className="flex flex-col">
                                {activeTab === 'statusCategories' && item.badgeClass ? (
                                  <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border border-transparent self-start shadow-xs", item.badgeClass)}>
                                    {item.name}
                                  </span>
                                ) : (
                                  <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                                    {item.name}
                                  </span>
                                )}

                                {/* Subtitle/metadata section for departments */}
                                {activeTab === 'departments' && (
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {item.headUserId ? (
                                      (() => {
                                        const headUser = users.find(u => u.id === item.headUserId);
                                        return headUser ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-100/80 shadow-2xs">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                                            Head of Department: <span className="font-bold text-slate-800">{headUser.name}</span> <span className="text-slate-500 font-normal">({headUser.role})</span>
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 italic">Head assigned but user not found</span>
                                        );
                                      })()
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-slate-300 text-slate-400 bg-slate-50/50">
                                        No Department Head Assigned
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Subtitle/metadata section for directorates */}
                                {activeTab === 'directorates' && (
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {item.departmentId && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100/60 shadow-2xs">
                                        Parent Dept: <span className="font-bold text-slate-800">{departments.find(d => d.id === item.departmentId)?.name || 'Unknown'}</span>
                                      </span>
                                    )}
                                    {item.headUserId ? (
                                      (() => {
                                        const headUser = users.find(u => u.id === item.headUserId);
                                        return headUser ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                            Director: <span className="font-bold text-slate-800">{headUser.name}</span>
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 italic">Director assigned but user not found</span>
                                        );
                                      })()
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-slate-300 text-slate-400 bg-slate-50/50">
                                        No Director Assigned
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Subtitle/metadata section for committees */}
                                {activeTab === 'committees' && (
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {item.headUserId ? (
                                      (() => {
                                        const headUser = users.find(u => u.id === item.headUserId);
                                        return headUser ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100/80 shadow-2xs">
                                            Chairman: <span className="font-bold text-slate-800">{headUser.name}</span>
                                          </span>
                                        ) : null;
                                      })()
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-slate-300 text-slate-400 bg-slate-50/50">
                                        No Chairman Assigned
                                      </span>
                                    )}

                                    {item.clerkUserId ? (
                                      (() => {
                                        const clerkUser = users.find(u => u.id === item.clerkUserId);
                                        return clerkUser ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/80 shadow-2xs">
                                            Clerk: <span className="font-bold text-slate-800">{clerkUser.name}</span>
                                          </span>
                                        ) : null;
                                      })()
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-slate-300 text-slate-400 bg-slate-50/50">
                                        No Clerk Assigned
                                      </span>
                                    )}

                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-3xs">
                                      Members: <span className="font-bold text-slate-800">{item.members?.length || 0}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions panel */}
                            <div className="flex items-center gap-2 self-end sm:self-auto sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              {activeTab === 'committees' && (
                                <button 
                                  onClick={() => handleOpenMembersModal(item)} 
                                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 rounded-lg cursor-pointer transition-all shadow-3xs"
                                  title="Manage Members"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Manage Members ({item.members?.length || 0})</span>
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditValue(item.name);
                                  setEditHeadUserId(item.headUserId || '');
                                  setEditClerkUserId(item.clerkUserId || '');
                                  setEditDepartmentId(item.departmentId || '');
                                }} 
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)} 
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                  
                  {currentList.length === 0 && !isAdding && (
                    <li className="p-8 text-center text-slate-500 text-sm">
                      No items found in this category.
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User Form Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 bg-opacity-50 overflow-y-auto font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">
                {editingUserId ? 'Edit User Account' : 'Add New User Account'}
              </h3>
              <button 
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g. user@taitataveta.go.ke"
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
                  placeholder="Password (e.g. password123)"
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

              <div>
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

              {/* Department Mapping */}
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

              {/* Committee/Directorate Mapping */}
              {userForm.role === 'Committee Clerk' ? (
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
              ) : ['Director', 'Assistant Director Liaison'].includes(userForm.role) ? (
                <div>
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
              ) : null}

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
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Committee Members Modal */}
      {membersModalOpen && selectedCommitteeForMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 bg-opacity-60 overflow-y-auto font-sans backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Manage Committee Members</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Committee: <span className="text-teal-700 font-bold">{selectedCommitteeForMembers.name}</span>
                </p>
              </div>
              <button 
                onClick={() => setMembersModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Info banner */}
              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg text-xs text-teal-800 leading-relaxed font-medium">
                💡 <span className="font-semibold text-teal-900">Note:</span> The Committee Chairman and Clerk/Secretary are registered primary officers. To assign a different Chairman or Clerk, please modify the Committee's main details in the main settings tab.
              </div>

              {/* Members List Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Members List</h4>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Member Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">System Role</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Committee Designation</th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(() => {
                        const currentMembers = selectedCommitteeForMembers.members || [];
                        
                        // Let's filter out duplicate records and make sure Chairman and Clerk are in the list if not explicitly saved
                        let resolvedMembers = [...currentMembers];
                        
                        // Check if Chairman is in resolved list
                        if (selectedCommitteeForMembers.headUserId && !resolvedMembers.some(m => m.userId === selectedCommitteeForMembers.headUserId)) {
                          resolvedMembers.unshift({ userId: selectedCommitteeForMembers.headUserId, position: 'Chairman' });
                        }
                        // Check if Clerk is in resolved list
                        if (selectedCommitteeForMembers.clerkUserId && !resolvedMembers.some(m => m.userId === selectedCommitteeForMembers.clerkUserId)) {
                          resolvedMembers.push({ userId: selectedCommitteeForMembers.clerkUserId, position: 'Clerk/Secretary' });
                        }

                        if (resolvedMembers.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                No members added yet.
                              </td>
                            </tr>
                          );
                        }

                        return resolvedMembers.map((member, idx) => {
                          const mUser = users.find(u => u.id === member.userId);
                          if (!mUser) return null;

                          const isChairman = member.userId === selectedCommitteeForMembers.headUserId;
                          const isClerk = member.userId === selectedCommitteeForMembers.clerkUserId;

                          return (
                            <tr key={`${member.userId}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {mUser.name}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                                {mUser.role}
                              </td>
                              <td className="px-4 py-3">
                                {isChairman ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    👑 Chairman
                                  </span>
                                ) : isClerk ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    📋 Clerk / Secretary
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {member.position}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isChairman || isClerk ? (
                                  <span className="text-[10px] font-medium text-slate-400 select-none">
                                    Primary Officer
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(member.userId)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add New Member Section */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Committee Member</h4>
                
                {membersError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{membersError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="col-span-12 sm:col-span-6">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Select User</label>
                    <select
                      value={newMemberUserId}
                      onChange={(e) => {
                        setNewMemberUserId(e.target.value);
                        setMembersError(null);
                      }}
                      className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-teal-500 focus:border-teal-500 bg-white font-medium"
                    >
                      <option value="">Select User Account...</option>
                      {users
                        .filter(u => {
                          const currentMembers = selectedCommitteeForMembers.members || [];
                          const isAlreadyMember = currentMembers.some((m: any) => m.userId === u.id);
                          const isHead = u.id === selectedCommitteeForMembers.headUserId;
                          const isClerk = u.id === selectedCommitteeForMembers.clerkUserId;
                          return !isAlreadyMember && !isHead && !isClerk;
                        })
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Designation / Position</label>
                    <input
                      type="text"
                      value={newMemberPosition}
                      onChange={(e) => {
                        setNewMemberPosition(e.target.value);
                        setMembersError(null);
                      }}
                      placeholder="e.g. Vice-Chairman, Ex-Officio"
                      className="block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border focus:ring-teal-500 focus:border-teal-500 font-medium"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Suggestions quick Pills */}
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Designations:</span>
                  {['Member', 'Vice-Chairman', 'Ex-Officio Member', 'Liaison Officer', 'Co-opted Member'].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => {
                        setNewMemberPosition(pos);
                        setMembersError(null);
                      }}
                      className={clsx(
                        "px-2 py-1 text-[10px] font-semibold rounded-full border cursor-pointer transition-all shadow-3xs",
                        newMemberPosition === pos 
                          ? "bg-teal-50 text-teal-700 border-teal-200 animate-pulse" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMembersModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors cursor-pointer shadow-3xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
