export type Role =
  | 'County Assembly Clerk'
  | 'Assistant County Assembly Clerk'
  | 'Committee Clerk'
  | 'County Secretary'
  | 'County Secretary\'s Assistant'
  | 'CECM'
  | 'CCO'
  | 'Director'
  | 'Assistant Director Liaison'
  | 'ICT'
  | 'System Administrator'
  | 'ICT Director';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string;
  directorateId?: string;
  phone?: string;
  phoneVerified?: boolean;
  password?: string;
}

export type ResolutionStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Assigned'
  | 'In Progress'
  | 'Pending Report Review'
  | 'Done'
  | 'Declined';

export interface StatusCategory {
  id: string;
  name: string;
  badgeClass?: string;
  isActive?: boolean;
}

export interface DocumentCategory {
  id: string;
  name: string; // Resolution, Hansard, Report, etc.
  isActive?: boolean;
}

export interface ResolutionDocument {
  id: string;
  name: string;
  url: string;
  categoryId: string;
  uploadedAt: string;
  uploadedBy: string;
  fileName?: string;
  description?: string;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface ExecutiveUpdate {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  text: string;
  documents: ResolutionDocument[];
  proposedStatus?: string;
  approvalStatus: 'Pending CCO' | 'Pending Liaison' | 'Approved' | 'Rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Committee {
  id: string;
  name: string;
  isActive?: boolean;
  headUserId?: string;
  clerkUserId?: string;
  members?: { userId: string; position: string }[];
}

export interface Resolution {
  id: string;
  referenceNumber: string; // e.g., TTCA/CS/7/VOL.8/(001)
  title: string;
  description: string;
  status: string; // allow custom statuses
  datePassed: string;
  implementationTimeDays: number;
  dueDate?: string;
  documents: ResolutionDocument[];
  comments: Comment[];
  executiveUpdates?: ExecutiveUpdate[];

  
  // Implementation Committee Remarks & Minutes
  committeeRemarks?: string;
  committeeMinutesDocName?: string;
  committeeMinutesUrl?: string;

  // Assignment / Context
  departmentId?: string;
  committeeId?: string;
  directorateId?: string;
  
  createdAt: string;
  createdBy: string; // Clerk Assistant ID
  approvedAt?: string;
  approvedBy?: string; // Clerk ID
  assignedAt?: string;
  assignedBy?: string; // County Secretary/Liaison ID
}

export interface Department {
  id: string;
  name: string;
  isActive?: boolean;
  headUserId?: string;
}

export interface Directorate {
  id: string;
  departmentId: string;
  name: string;
  isActive?: boolean;
}

export type AuditAction = 'View' | 'Create' | 'Edit' | 'Delete' | 'Login' | 'Approve' | 'Assign' | 'Status_Change';

export type PermissionKey =
  | 'create_resolution'
  | 'edit_resolution'
  | 'delete_resolution'
  | 'upload_documents'
  | 'view_resolutions'
  | 'approve_resolutions'
  | 'reject_resolutions'
  | 'assign_resolutions'
  | 'manage_users';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: AuditAction;
  entityType: 'Resolution' | 'Document' | 'User' | 'System';
  entityId?: string;
  details: string;
  apiEndpoint?: string;
  apiMethod?: string;
  timestamp: string;
}
