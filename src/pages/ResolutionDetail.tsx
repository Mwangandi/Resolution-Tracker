import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAppContext } from '../store';
import { 
  FileText, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, 
  Upload, MessageSquare, ShieldCheck, UserPlus, AlertCircle
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { clsx } from 'clsx';
import { ResolutionStatus } from '../types';

export function ResolutionDetail({ id: propId }: { id?: string } = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId || routeId;
  const navigate = useNavigate();
  const { 
    resolutions, 
    currentUser, 
    updateResolutionStatus, 
    departments, 
    directorates,
    statusCategories,
    logAudit,
    addDocument,
    addComment,
    auditLogs
  } = useAppContext();

  const docCategories = useAppContext().docCategories.filter(c => c.isActive !== false);
  
  const [commentText, setCommentText] = useState('');
  
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    categoryId: ''
  });
  
  const [showExecReply, setShowExecReply] = useState(false);
  const [execReplyData, setExecReplyData] = useState({
    proposedStatus: '',
    text: '',
    documentName: '',
  });

  const { addExecutiveUpdate, approveExecutiveUpdate } = useAppContext();

  const resolution = resolutions.find(r => r.id === id);
  
  const resolutionAuditLogs = (auditLogs || [])
    .filter(log => log.entityId === id || (log.entityType === 'Resolution' && log.entityId === id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (!resolution) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Resolution not found</h2>
        <button onClick={() => navigate('/resolutions')} className="mt-4 text-orange-600 hover:underline">
          Return to archive
        </button>
      </div>
    );
  }

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.name || !uploadData.categoryId) return;
    
    addDocument(resolution.id, {
      name: uploadData.name,
      categoryId: uploadData.categoryId,
      url: '#'
    });
    
    setShowUpload(false);
    setUploadData({ name: '', categoryId: '' });
  };

  const getStatusBadgeColor = (statusName: string) => {
    const custom = statusCategories.find(s => s.name === statusName);
    if (custom && custom.badgeClass) return custom.badgeClass;
    
    switch (statusName) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Pending Approval': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Active': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Assigned': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'In Progress': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'Completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'Overdue': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = () => {
    if (canApprove) {
      updateResolutionStatus(resolution.id, 'Active', {
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.id
      });
    }
  };

  const handleReject = () => {
    if (canReject) {
      updateResolutionStatus(resolution.id, 'Rejected', {
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.id
      });
    }
  };

  const [assignDept, setAssignDept] = useState('');
  const [assignDir, setAssignDir] = useState('');

  const handleAssign = () => {
    if (canAssign) {
      if (!assignDept || !assignDir) {
        alert('Please select both Department and Directorate');
        return;
      }
      updateResolutionStatus(resolution.id, 'Assigned', {
        departmentId: assignDept,
        directorateId: assignDir,
        assignedAt: new Date().toISOString(),
        assignedBy: currentUser?.id || '',
        // Set due date based on implementation days
        dueDate: addDays(new Date(), resolution.implementationTimeDays).toISOString()
      });
    }
  };

  const handleMarkProgress = () => {
    if (canMarkProgress) {
      updateResolutionStatus(resolution.id, 'In Progress');
    }
  };

  const handleMarkComplete = () => {
    if (canMarkComplete) {
      updateResolutionStatus(resolution.id, 'Completed');
    }
  };

  const handleMarkNotImplemented = () => {
    if (canMarkProgress || canMarkComplete) {
      updateResolutionStatus(resolution.id, 'Overdue');
    }
  };

  const handleExecReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!execReplyData.text && !execReplyData.proposedStatus && !execReplyData.documentName) return;
    
    addExecutiveUpdate(resolution.id, {
      text: execReplyData.text,
      proposedStatus: execReplyData.proposedStatus || undefined,
      documents: execReplyData.documentName ? [{
        id: Math.random().toString(36).substring(7),
        name: execReplyData.documentName,
        url: '#',
        categoryId: 'reply_doc',
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.id || 'unknown'
      }] : []
    });
    
    setExecReplyData({ proposedStatus: '', text: '', documentName: '' });
    setShowExecReply(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    addComment(resolution.id, commentText);
    setCommentText('');
  };

  // Derived state for permissions
  const isSysAdmin = currentUser?.role && ['System Administrator', 'ICT Director'].includes(currentUser.role);
  const canApprove = (currentUser?.role === 'County Assembly Clerk' || currentUser?.role === 'County Secretary' || isSysAdmin) && resolution.status === 'Pending Approval';
  const canReject = (currentUser?.role === 'County Secretary' || isSysAdmin) && resolution.status === 'Pending Approval';
  const canAssign = (currentUser?.role === 'Assistant Director Liaison' || currentUser?.role === 'County Secretary' || isSysAdmin) && (resolution.status === 'Active' || resolution.status === 'Assigned');
  const canMarkProgress = (['CECM', 'CCO', 'Director', 'Assistant Director Liaison'].includes(currentUser?.role || '') || isSysAdmin) && (resolution.status === 'Assigned' || resolution.status === 'In Progress');
  const canMarkComplete = (['CECM', 'CCO', 'Director', 'Assistant Director Liaison'].includes(currentUser?.role || '') || isSysAdmin) && (resolution.status === 'In Progress' || resolution.status === 'Assigned');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-start bg-slate-50 border-b border-slate-200">
          <div>
            <h3 className="text-lg leading-6 font-bold text-slate-700 font-mono">
              {resolution.referenceNumber}
            </h3>
            <p className="mt-1 max-w-2xl text-xl font-medium text-gray-900">
              {resolution.title}
            </p>
          </div>
          <span className={clsx(
            "px-3 py-1 rounded-full text-sm font-semibold shadow-sm",
            getStatusBadgeColor(resolution.status)
          )}>
            {resolution.status}
          </span>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-4">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line bg-gray-50 p-4 rounded-md border border-gray-100">
                {resolution.description}
              </dd>
            </div>
            
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <CalendarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                Date Passed
              </dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">
                {format(new Date(resolution.datePassed), 'MMMM d, yyyy')}
              </dd>
            </div>
            
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Clock className="mr-1.5 h-4 w-4 text-gray-400" />
                Implementation Time
              </dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">
                {resolution.implementationTimeDays} days
              </dd>
            </div>

            {resolution.dueDate && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <AlertCircle className="mr-1.5 h-4 w-4 text-red-400" />
                  Due Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900 font-medium text-red-600">
                  {format(new Date(resolution.dueDate), 'MMMM d, yyyy')}
                </dd>
              </div>
            )}

            {resolution.departmentId && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Assigned Department(s)</dt>
                <dd className="mt-1 text-sm text-gray-900 font-medium flex flex-wrap gap-1.5">
                  {resolution.departmentId.split(',').map(id => {
                    const d = departments.find(dept => dept.id === id.trim());
                    return d ? (
                      <span key={id} className="inline-flex items-center bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded text-xs font-semibold">
                        {d.name}
                      </span>
                    ) : null;
                  })}
                </dd>
              </div>
            )}
            
            {resolution.committeeId && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Oversight Committee(s)</dt>
                <dd className="mt-1 text-sm text-gray-900 font-medium flex flex-wrap gap-1.5">
                  {resolution.committeeId.split(',').map(id => {
                    const c = useAppContext().committees.find(comm => comm.id === id.trim());
                    return c ? (
                      <span key={id} className="inline-flex items-center bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded text-xs font-semibold">
                        {c.name}
                      </span>
                    ) : null;
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Action Panels based on roles */}
      {canApprove && (
        <div className="bg-white border border-yellow-200 p-4 shadow-sm rounded-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Resolution Approval Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please review the resolution details and select an action to make it active or reject it.</p>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  Approve Resolution
                </button>
                {canReject && (
                  <button
                    type="button"
                    onClick={handleReject}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                  >
                    Reject Resolution
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {canAssign && (
        <div className="bg-white border border-blue-200 p-4 shadow-sm rounded-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <UserPlus className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3 w-full">
              <h3 className="text-sm font-medium text-blue-800">Assign to Department & Directorate</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-blue-900">Department</label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={assignDept}
                    onChange={(e) => setAssignDept(e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-900">Directorate</label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={assignDir}
                    onChange={(e) => setAssignDir(e.target.value)}
                    disabled={!assignDept}
                  >
                    <option value="">Select Directorate</option>
                    {directorates.filter(d => d.departmentId === assignDept).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleAssign}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {((canMarkProgress || canMarkComplete) || (resolution.executiveUpdates && resolution.executiveUpdates.length > 0)) && (
        <div className="bg-white border border-orange-200 shadow-sm rounded-xl overflow-hidden">
          {(canMarkProgress || canMarkComplete) && (
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Activity className="h-5 w-5 text-orange-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-orange-900">Executive Reply</h3>
                  <p className="text-xs text-orange-700">Submit implementation progress to the Assembly.</p>
                </div>
              </div>
              {!showExecReply && (
                <button
                  onClick={() => setShowExecReply(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 text-xs font-medium rounded-md shadow-sm text-orange-700 bg-white hover:bg-orange-50"
                >
                  Add Reply
                </button>
              )}
            </div>
          )}
          
          {(canMarkProgress || canMarkComplete) && showExecReply && (
            <form onSubmit={handleExecReplySubmit} className="p-4 bg-white space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Update Status</label>
                <select
                  value={execReplyData.proposedStatus}
                  onChange={(e) => setExecReplyData({...execReplyData, proposedStatus: e.target.value})}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                >
                  <option value="">No change in status</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Not Implemented (Overdue)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reply / Comments</label>
                <textarea
                  rows={3}
                  value={execReplyData.text}
                  onChange={(e) => setExecReplyData({...execReplyData, text: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Provide details on the implementation..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Attach Document (Optional)</label>
                <div className="mt-1 flex items-center">
                  <Upload className="h-5 w-5 text-gray-400 mr-2" />
                  <input
                    type="text"
                    value={execReplyData.documentName}
                    onChange={(e) => setExecReplyData({...execReplyData, documentName: e.target.value})}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="Enter document name to mock upload..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExecReply(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!execReplyData.text && !execReplyData.proposedStatus}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                >
                  Submit Reply
                </button>
              </div>
            </form>
          )}

          {resolution.executiveUpdates && resolution.executiveUpdates.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {resolution.executiveUpdates.filter(u => 
                  !(currentUser?.role === 'County Assembly Clerk' || currentUser?.role === 'Assistant County Assembly Clerk' || currentUser?.role === 'Committee Clerk') || u.approvalStatus === 'Approved'
                ).map(update => (
                  <li key={update.id} className="p-4 flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 uppercase">
                        {update.authorName.substring(0, 2)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{update.authorName}</span>
                          <span className="text-gray-500 text-xs ml-2">({update.authorRole})</span>
                          <span className="text-gray-400 text-xs ml-2">{format(new Date(update.createdAt), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium",
                          update.approvalStatus === 'Approved' ? "bg-green-100 text-green-800" :
                          update.approvalStatus === 'Rejected' ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        )}>
                          {update.approvalStatus}
                        </span>
                      </div>
                      
                      {update.proposedStatus && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Proposed Status: </span>
                          <span className="text-gray-900">{update.proposedStatus}</span>
                        </div>
                      )}
                      {update.text && (
                        <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap bg-white p-3 border border-gray-100 rounded-md">
                          {update.text}
                        </div>
                      )}
                      
                      {update.documents && update.documents.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {update.documents.map(doc => (
                            <div key={doc.id} className="flex items-center text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded w-max border border-orange-100">
                              <FileText className="h-4 w-4 mr-1" />
                              <a href={doc.url} className="hover:underline">{doc.name}</a>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Approval Actions */}
                      {update.approvalStatus !== 'Approved' && update.approvalStatus !== 'Rejected' && (
                        <div className="mt-2 flex space-x-2">
                          {((update.approvalStatus === 'Pending CCO' && ['CECM', 'CCO'].includes(currentUser?.role || '') && currentUser?.departmentId && resolution.departmentId?.split(',').map(s => s.trim()).includes(currentUser.departmentId)) || 
                            (update.approvalStatus === 'Pending Liaison' && 
                             (currentUser?.role === 'Assistant Director Liaison' || currentUser?.role === 'County Secretary'))) && (
                            <>
                              <button
                                onClick={() => approveExecutiveUpdate(resolution.id, update.id, 'Approve')}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => approveExecutiveUpdate(resolution.id, update.id, 'Reject')}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Documents */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200">
          <div className="px-4 py-5 border-b border-slate-200 sm:px-6 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Documents</h3>
            {!showUpload && (
              <button 
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <Upload className="mr-2 h-4 w-4 text-gray-500" />
                Upload
              </button>
            )}
          </div>
          <div className="px-4 py-5 sm:p-6">
            {showUpload ? (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Document Name</label>
                  <input
                    type="text"
                    required
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="e.g. Addendum 1 or Committee Report"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    required
                    value={uploadData.categoryId}
                    onChange={(e) => setUploadData({ ...uploadData, categoryId: e.target.value })}
                    className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  >
                    <option value="">Select Category...</option>
                    {docCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">File</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500"
                        >
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF, DOCX up to 10MB</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Upload Document
                  </button>
                </div>
              </form>
            ) : (
              <>
                {resolution.documents.length > 0 ? (
                  <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                    {resolution.documents.map((doc) => (
                      <li key={doc.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                        <div className="w-0 flex-1 flex flex-col">
                          <div className="flex items-center">
                            <FileText className="flex-shrink-0 h-5 w-5 text-gray-400" />
                            <span className="ml-2 flex-1 w-0 truncate font-medium text-gray-900">{doc.name}</span>
                          </div>
                          <span className="ml-7 text-xs text-gray-500 mt-1">
                            {docCategories.find(c => c.id === doc.categoryId)?.name || 'Document'} • {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <a href={doc.url} className="font-medium text-orange-600 hover:text-orange-500">Download</a>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload Hansards, Reports, or official Resolution scans.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Discussions */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 flex flex-col h-[400px]">
          <div className="px-4 py-5 border-b border-slate-200 sm:px-6 bg-slate-50 rounded-t-xl">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Discussions</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:p-6 space-y-4">
             {resolution.comments && resolution.comments.length > 0 ? (
               resolution.comments.map(c => (
                 <div key={c.id} className="flex space-x-3">
                   <div className="flex-shrink-0">
                     <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 uppercase">
                       {c.authorName.substring(0, 2)}
                     </div>
                   </div>
                   <div className="flex-1">
                     <div className="text-sm">
                       <span className="font-medium text-gray-900">{c.authorName} </span>
                       <span className="text-gray-500 text-xs ml-2">{format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}</span>
                     </div>
                     <div className="mt-1 text-sm text-gray-700">
                       <p>{c.text}</p>
                     </div>
                   </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-12 text-slate-400 text-xs">
                 No discussion comments yet. Use the field below to post a comment or update.
               </div>
             )}
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200">
            <form onSubmit={handleAddComment} className="flex space-x-3">
              <input
                type="text"
                name="comment"
                id="comment"
                className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                placeholder="Add a comment or update..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none cursor-pointer"
              >
                Post
              </button>
            </form>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 flex flex-col">
          <div className="px-4 py-5 border-b border-slate-200 sm:px-6 bg-slate-50 rounded-t-xl">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Audit Logs</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 max-h-[400px] overflow-y-auto space-y-4">
             <div className="flex space-x-3">
               <div className="flex-shrink-0">
                 <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                   SYS
                 </div>
               </div>
               <div className="flex-1">
                 <div className="text-sm">
                   <span className="font-semibold text-gray-900">System Log: </span>
                 </div>
                 <div className="mt-1 text-sm text-gray-700">
                   <p>Resolution created on {format(new Date(resolution.createdAt), 'MMM d, yyyy HH:mm')}</p>
                 </div>
               </div>
             </div>
             {resolution.approvedAt && (
               <div className="flex space-x-3">
                 <div className="flex-shrink-0">
                   <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600">
                     CLK
                   </div>
                 </div>
                 <div className="flex-1">
                   <div className="text-sm">
                     <span className="font-semibold text-gray-900">Clerk Approval: </span>
                   </div>
                   <div className="mt-1 text-sm text-gray-700">
                     <p>Approved on {format(new Date(resolution.approvedAt), 'MMM d, yyyy HH:mm')}</p>
                   </div>
                 </div>
               </div>
             )}
             {resolutionAuditLogs.map((log) => (
               <div key={log.id} className="flex space-x-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                 <div className="flex-shrink-0">
                   <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                     {log.userName.substring(0, 2)}
                   </div>
                 </div>
                 <div className="flex-1">
                   <div className="text-sm">
                     <span className="font-semibold text-gray-900">{log.userName}</span>{' '}
                     <span className="text-gray-500 text-xs">({log.userRole})</span>
                     <span className="text-gray-400 text-xs ml-2">• {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}</span>
                   </div>
                   <div className="mt-1 text-xs text-gray-500 uppercase tracking-wider font-bold">
                     Action: {log.action}
                   </div>
                   <div className="mt-1 text-sm text-gray-700">
                     <p>{log.details}</p>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ensure Activity import is added
import { Activity } from 'lucide-react';
