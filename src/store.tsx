import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Resolution,
  Department,
  Directorate,
  Committee,
  AuditLog,
  DocumentCategory,
  ResolutionDocument,
  StatusCategory,
  Role,
  ExecutiveUpdate,
  PermissionKey,
} from './types';

const MOCK_USERS: User[] = [
  { id: 'u0', name: 'John Doe', email: 'johndoe@gmail.com', role: 'System Administrator', phone: '0795752053', password: '**88Donda' },
  { id: 'u1', name: 'Gilbert', email: 'gilbert@taitataveta.go.ke', role: 'ICT' },
  { id: 'u2', name: 'Clerk Assistant Jane', email: 'jane@taitataveta.go.ke', role: 'Assistant County Assembly Clerk' },
  { id: 'u3', name: 'Rehema', email: 'rehema@taitataveta.go.ke', role: 'County Secretary' },
  { id: 'u4', name: 'Chari', email: 'chari@taitataveta.go.ke', role: 'Assistant Director Liaison' },
  { id: 'u5', name: 'Director Health', email: 'health.dir@taitataveta.go.ke', role: 'Director', departmentId: 'd1', directorateId: 'dir1' },
  { id: 'u6', name: 'County Assembly Clerk', email: 'clerk@taitataveta.go.ke', role: 'County Assembly Clerk' },
  { id: 'u7', name: 'Committee Clerk', email: 'committee@taitataveta.go.ke', role: 'Committee Clerk' },
  { id: 'u8', name: 'Secretary Assistant', email: 'sec.assistant@taitataveta.go.ke', role: "County Secretary's Assistant" },
  { id: 'u9', name: 'CECM Health', email: 'health.cecm@taitataveta.go.ke', role: 'CECM', departmentId: 'd1' },
  { id: 'u10', name: 'CCO Health', email: 'health.cco@taitataveta.go.ke', role: 'CCO', departmentId: 'd1' },
];

export const DEFAULT_PERMISSIONS: Record<Role, Record<PermissionKey, boolean>> = {
  'County Assembly Clerk': {
    create_resolution: true,
    edit_resolution: true,
    delete_resolution: true,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: false,
    assign_resolutions: false,
    manage_users: false,
  },
  'Assistant County Assembly Clerk': {
    create_resolution: true,
    edit_resolution: true,
    delete_resolution: true,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: false,
    reject_resolutions: false,
    assign_resolutions: false,
    manage_users: false,
  },
  'Committee Clerk': {
    create_resolution: false,
    edit_resolution: false,
    delete_resolution: false,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: false,
    reject_resolutions: false,
    assign_resolutions: false,
    manage_users: false,
  },
  'County Secretary': {
    create_resolution: false,
    edit_resolution: false,
    delete_resolution: false,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: true,
    assign_resolutions: true,
    manage_users: false,
  },
  "County Secretary's Assistant": {
    create_resolution: false,
    edit_resolution: false,
    delete_resolution: false,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: false,
    reject_resolutions: false,
    assign_resolutions: false,
    manage_users: false,
  },
  'CECM': {
    create_resolution: false,
    edit_resolution: false,
    delete_resolution: false,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: false,
    assign_resolutions: true,
    manage_users: false,
  },
  'CCO': {
    create_resolution: false,
    edit_resolution: false,
    delete_resolution: false,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: false,
    assign_resolutions: true,
    manage_users: false,
  },
  'Director': {
    create_resolution: false,
    edit_resolution: false,
    delete_resolution: false,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: false,
    assign_resolutions: true,
    manage_users: false,
  },
  'Assistant Director Liaison': {
    create_resolution: false,
    edit_resolution: false,
    delete_resolution: false,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: false,
    assign_resolutions: true,
    manage_users: false,
  },
  'ICT': {
    create_resolution: true,
    edit_resolution: true,
    delete_resolution: true,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: true,
    assign_resolutions: true,
    manage_users: true,
  },
  'System Administrator': {
    create_resolution: true,
    edit_resolution: true,
    delete_resolution: true,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: true,
    assign_resolutions: true,
    manage_users: true,
  },
  'ICT Director': {
    create_resolution: true,
    edit_resolution: true,
    delete_resolution: true,
    upload_documents: true,
    view_resolutions: true,
    approve_resolutions: true,
    reject_resolutions: true,
    assign_resolutions: true,
    manage_users: true,
  },
};

interface AppContextType {
  currentUser: User | null;
  sendOtp: (email: string, password: string) => Promise<{ success: boolean; message: string; otpBypassed?: boolean }>;
  login: (email: string, password: string, otp: string) => Promise<boolean>;
  logout: () => void;
  users: User[];
  resolutions: Resolution[];
  departments: Department[];
  directorates: Directorate[];
  committees: Committee[];
  auditLogs: AuditLog[];
  docCategories: DocumentCategory[];
  rolePermissions: Record<Role, Record<PermissionKey, boolean>>;
  updateRolePermission: (role: Role, key: PermissionKey, value: boolean) => void;
  logAudit: (action: AuditLog['action'], entityType: AuditLog['entityType'], entityId: string, details: string, apiEndpoint?: string, apiMethod?: string) => void;
  createResolution: (data: Partial<Resolution>) => void;
  updateResolutionStatus: (id: string, status: Resolution['status'], additionalData?: Partial<Resolution>) => void;
  deleteResolution: (id: string) => Promise<boolean>;
  addDocument: (resolutionId: string, doc: Partial<ResolutionDocument>) => void;
  addComment: (resolutionId: string, text: string) => void;
  addExecutiveUpdate: (resolutionId: string, data: Partial<ExecutiveUpdate>) => void;
  approveExecutiveUpdate: (resolutionId: string, updateId: string, action: 'Approve' | 'Reject') => void;
  statusCategories: StatusCategory[];
  manageSystemItem: <T extends { id: string }>(type: 'departments'|'directorates'|'committees'|'docCategories'|'statusCategories', action: 'add'|'edit'|'delete', item: Partial<T>) => void;
  createUser: (user: Partial<User> & { password?: string; phone?: string }) => Promise<boolean>;
  updateUser: (id: string, user: Partial<User> & { password?: string; phone?: string }) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  customLogo: string | null;
  updateCustomLogo: (logoBase64: string | null) => Promise<boolean>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('resolution_tracker_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('[STORE] Error parsing user from localStorage:', e);
      localStorage.removeItem('resolution_tracker_user');
      return null;
    }
  });

  const authFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = {
      ...(init?.headers || {}),
    } as Record<string, string>;
    if (currentUser) {
      headers['X-User-Id'] = currentUser.id;
      headers['X-User-Name'] = currentUser.name;
      headers['X-User-Role'] = currentUser.role;
    }
    return fetch(input, { ...init, headers });
  };

  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [docCategories, setDocCategories] = useState<DocumentCategory[]>([]);
  const [statusCategories, setStatusCategories] = useState<StatusCategory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [rolePermissions, setRolePermissions] = useState<Record<Role, Record<PermissionKey, boolean>>>(() => {
    try {
      const saved = localStorage.getItem('role_permissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_PERMISSIONS };
        for (const role in parsed) {
          merged[role as Role] = {
            ...DEFAULT_PERMISSIONS[role as Role],
            ...parsed[role]
          };
        }
        return merged;
      }
    } catch (e) {
      console.error('[STORE] Error parsing role_permissions:', e);
    }
    return DEFAULT_PERMISSIONS;
  });

  const updateRolePermission = (role: Role, key: PermissionKey, value: boolean) => {
    setRolePermissions(prev => {
      const updated = {
        ...prev,
        [role]: {
          ...prev[role],
          [key]: value
        }
      };
      localStorage.setItem('role_permissions', JSON.stringify(updated));
      return updated;
    });
  };

  const fetchData = async () => {
    try {
      const response = await authFetch('/api/data');
      if (response.ok) {
        const data = await response.json();
        const sorted = (data.resolutions || []).sort((a: any, b: any) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setResolutions(sorted);
        setDepartments(data.departments || []);
        setDirectorates(data.directorates || []);
        setCommittees(data.committees || []);
        setDocCategories(data.docCategories || []);
        setStatusCategories(data.statusCategories || []);
        setAuditLogs(data.auditLogs || []);
        if (data.customLogo !== undefined) {
          setCustomLogo(data.customLogo);
        }
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error('[STORE] Failed to sync data with NestJS server:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const logAudit = async (
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string,
    apiEndpoint?: string,
    apiMethod?: string
  ) => {
    if (!currentUser) return;
    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action,
          entityType,
          entityId,
          details,
          apiEndpoint,
          apiMethod,
        }),
      });
      fetchData();
    } catch (err) {
      console.error('[STORE] Error registering audit log:', err);
    }
  };

  const sendOtp = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        return { success: false, message: `Server error: ${response.status}` };
      }
      if (response.ok) {
        return { success: true, message: data.message || 'OTP sent successfully', otpBypassed: data.otpBypassed };
      } else {
        return { success: false, message: data.message || `Authentication failed: ${response.status}` };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network connection failed' };
    }
  };

  const login = async (email: string, password: string, otp: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp }),
      });
      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Server error: ${response.status}`);
      }
      if (response.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('resolution_tracker_user', JSON.stringify(data.user));

        // Create log audit on backend
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            userName: data.user.name,
            userRole: data.user.role,
            action: 'Login',
            entityType: 'System',
            entityId: data.user.id,
            details: 'User logged in successfully',
            apiEndpoint: '/api/auth/login',
            apiMethod: 'POST',
          }),
        }).catch(console.error);

        fetchData();
        return true;
      } else {
        throw new Error(data.message || `Login failed: ${response.status}`);
      }
    } catch (err: any) {
      console.error('[STORE] Login request failed:', err);
      throw err;
    }
  };

  const logout = () => {
    if (currentUser) {
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'Login',
          entityType: 'System',
          entityId: currentUser.id,
          details: 'User logged out',
          apiEndpoint: '/api/auth/logout',
          apiMethod: 'POST',
        }),
      }).catch(console.error);
    }
    setCurrentUser(null);
    localStorage.removeItem('resolution_tracker_user');
  };

  const createResolution = async (data: Partial<Resolution>) => {
    if (!currentUser) return;
    try {
      const refNumber = data.referenceNumber || `TTCA/CS/7/VOL.8/(${String(resolutions.length + 1).padStart(3, '0')})`;
      const response = await authFetch('/api/resolutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceNumber: refNumber,
          title: data.title,
          description: data.description,
          status: 'Pending Approval',
          datePassed: data.datePassed || new Date().toISOString().split('T')[0],
          implementationTimeDays: data.implementationTimeDays || 30,
          dueDate: data.dueDate,
          departmentId: data.departmentId,
          committeeId: data.committeeId,
          directorateId: data.directorateId,
          createdBy: currentUser.name,
          documents: data.documents,
        }),
      });

      if (response.ok) {
        const created = await response.json();
        await logAudit('Create', 'Resolution', created.id, `Registered new resolution ${created.referenceNumber}`, '/api/resolutions', 'POST');
        fetchData();
      }
    } catch (err) {
      console.error('[STORE] Failed to create resolution:', err);
    }
  };

  const addDocument = async (resolutionId: string, docData: Partial<ResolutionDocument>) => {
    if (!currentUser) return;
    try {
      const response = await authFetch(`/api/resolutions/${resolutionId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: docData.description || docData.name || docData.fileName || 'Document',
          fileName: docData.fileName || docData.name,
          description: docData.description || (docData.name && docData.name !== docData.fileName ? docData.name : ''),
          url: docData.url || '#',
          categoryId: docData.categoryId || 'cat1',
          uploadedBy: docData.uploadedBy || currentUser.name,
        }),
      });

      if (response.ok) {
        await logAudit('Edit', 'Document', resolutionId, `Added document: ${docData.name}`, `/api/resolutions/${resolutionId}/documents`, 'POST');
        fetchData();
      }
    } catch (err) {
      console.error('[STORE] Failed to upload document:', err);
    }
  };

  const addComment = async (resolutionId: string, text: string) => {
    if (!currentUser) return;
    try {
      const response = await authFetch(`/api/resolutions/${resolutionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          authorId: currentUser.id,
          authorName: currentUser.name,
        }),
      });

      if (response.ok) {
        await logAudit('Edit', 'Resolution', resolutionId, `Added comment`, `/api/resolutions/${resolutionId}/comments`, 'POST');
        fetchData();
      }
    } catch (err) {
      console.error('[STORE] Failed to append comment:', err);
    }
  };

  const addExecutiveUpdate = async (resolutionId: string, data: Partial<ExecutiveUpdate>) => {
    if (!currentUser) return;
    try {
      const response = await authFetch(`/api/resolutions/${resolutionId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          text: data.text,
          proposedStatus: data.proposedStatus,
        }),
      });

      if (response.ok) {
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            await addDocument(resolutionId, doc);
          }
        }
        await logAudit('Edit', 'Resolution', resolutionId, `Added executive update`, `/api/resolutions/${resolutionId}/updates`, 'POST');
        fetchData();
      }
    } catch (err) {
      console.error('[STORE] Failed to create executive update:', err);
    }
  };

  const approveExecutiveUpdate = async (resolutionId: string, updateId: string, action: 'Approve' | 'Reject') => {
    if (!currentUser) return;
    try {
      const response = await authFetch(`/api/resolutions/${resolutionId}/updates/${updateId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approvedBy: currentUser.name,
        }),
      });

      if (response.ok) {
        await logAudit('Approve', 'Resolution', resolutionId, `${action}d executive update`, `/api/resolutions/${resolutionId}/updates/${updateId}/approve`, 'POST');
        fetchData();
      }
    } catch (err) {
      console.error('[STORE] Failed to approve executive update:', err);
    }
  };

  const updateResolutionStatus = async (id: string, status: Resolution['status'], additionalData?: Partial<Resolution>) => {
    try {
      const response = await authFetch(`/api/resolutions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...additionalData,
        }),
      });

      if (response.ok) {
        await logAudit('Status_Change', 'Resolution', id, `Changed status to ${status}`, `/api/resolutions/${id}`, 'PUT');
        fetchData();
      }
    } catch (err) {
      console.error('[STORE] Failed to change status:', err);
    }
  };

  const deleteResolution = async (id: string) => {
    try {
      const response = await authFetch(`/api/resolutions/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await logAudit('Delete', 'Resolution', id, `Deleted resolution ID: ${id}`, `/api/resolutions/${id}`, 'DELETE');
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('[STORE] Failed to delete resolution:', err);
    }
    return false;
  };

  const manageSystemItem = async <T extends { id: string }>(
    type: 'departments'|'directorates'|'committees'|'docCategories'|'statusCategories',
    action: 'add'|'edit'|'delete',
    item: Partial<T>
  ) => {
    try {
      const response = await authFetch('/api/system/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          action,
          item,
        }),
      });

      if (response.ok) {
        await logAudit('Edit', 'System', 'system', `${action} operation on ${type}: ${(item as any).name || item.id}`, '/api/system/manage', 'POST');
        fetchData();
      }
    } catch (err) {
      console.error('[STORE] Failed to manage configuration:', err);
    }
  };

  const createUser = async (userData: Partial<User> & { password?: string; phone?: string }) => {
    try {
      const response = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (response.ok) {
        const created = await response.json();
        await logAudit('Create', 'User', created.id, `Created user account: ${created.email} (${created.role})`, '/api/users', 'POST');
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('[STORE] Failed to create user:', err);
    }
    return false;
  };

  const updateUser = async (id: string, userData: Partial<User> & { password?: string; phone?: string }) => {
    try {
      const response = await authFetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (response.ok) {
        await logAudit('Edit', 'User', id, `Updated user account settings for ${userData.email || id}`, `/api/users/${id}`, 'PUT');
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('[STORE] Failed to update user:', err);
    }
    return false;
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await authFetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await logAudit('Delete', 'User', id, `Deleted user account ID: ${id}`, `/api/users/${id}`, 'DELETE');
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('[STORE] Failed to delete user:', err);
    }
    return false;
  };

  const updateCustomLogo = async (logoBase64: string | null) => {
    try {
      const response = await authFetch('/api/settings/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: logoBase64 }),
      });
      if (response.ok) {
        setCustomLogo(logoBase64);
        await logAudit('Edit', 'System', 'logo', logoBase64 ? 'Uploaded custom system logo' : 'Reset custom system logo to default', '/api/settings/logo', 'POST');
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('[STORE] Failed to update custom logo:', err);
    }
    return false;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        sendOtp,
        login,
        logout,
        users,
        resolutions,
        departments,
        directorates,
        committees,
        auditLogs,
        docCategories,
        statusCategories,
        rolePermissions,
        updateRolePermission,
        logAudit,
        createResolution,
        updateResolutionStatus,
        deleteResolution,
        addDocument,
        addComment,
        addExecutiveUpdate,
        approveExecutiveUpdate,
        manageSystemItem,
        createUser,
        updateUser,
        deleteUser,
        customLogo,
        updateCustomLogo,
        searchTerm,
        setSearchTerm,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
