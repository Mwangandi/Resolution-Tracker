import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAppContext } from '../store';
import { 
  FileText, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, 
  Upload, MessageSquare, ShieldCheck, UserPlus, AlertCircle, X, Trash2
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
    committees,
    statusCategories,
    logAudit,
    addDocument,
    addComment,
    auditLogs,
    deleteResolution,
    rolePermissions
  } = useAppContext();

  const docCategories = useAppContext().docCategories.filter(c => c.isActive !== false);
  
  const [commentText, setCommentText] = useState('');
  
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    categoryId: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [showExecReply, setShowExecReply] = useState(false);
  const [execReplyData, setExecReplyData] = useState({
    proposedStatus: '',
    text: '',
    documentName: '',
  });
  const [selectedEvidenceFile, setSelectedEvidenceFile] = useState<File | null>(null);
  const [selectedReportFile, setSelectedReportFile] = useState<File | null>(null);

  // State variables for canonical workflow actions
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedComms, setSelectedComms] = useState<string[]>([]);
  const [assignDeadlineDays, setAssignDeadlineDays] = useState<number>(60);
  const [requestMoreInfoNote, setRequestMoreInfoNote] = useState<string>('');
  const [showRequestMoreInfo, setShowRequestMoreInfo] = useState<boolean>(false);
  const [submitReportText, setSubmitReportText] = useState<string>('');
  const [submitReportDocName, setSubmitReportDocName] = useState<string>('');
  const [showSubmitReportForm, setShowSubmitReportForm] = useState<boolean>(false);
  const [evidenceDocDesc, setEvidenceDocDesc] = useState<string>('');

  // Committee Remarks & Minutes state
  const [showCommitteeModal, setShowCommitteeModal] = useState<boolean>(false);
  const [committeeRemarksText, setCommitteeRemarksText] = useState<string>('');
  const [committeeMinutesDocName, setCommitteeMinutesDocName] = useState<string>('');
  const [selectedCommitteeMinutesFile, setSelectedCommitteeMinutesFile] = useState<File | null>(null);

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
    const category = uploadData.categoryId || docCategories[0]?.id || 'cat1';
    const description = uploadData.name.trim();
    const fileName = selectedFile?.name || 'Document.pdf';
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        addDocument(resolution.id, {
          name: fileName,
          fileName: fileName,
          description: description,
          categoryId: category,
          url: reader.result as string,
        });
      };
      reader.readAsDataURL(selectedFile);
    } else {
      addDocument(resolution.id, {
        name: fileName,
        fileName: fileName,
        description: description,
        categoryId: category,
        url: '#'
      });
    }
    
    setShowUpload(false);
    setUploadData({ name: '', categoryId: '' });
    setSelectedFile(null);
  };

  const getStatusBadgeColor = (statusName: string) => {
    const custom = statusCategories.find(s => s.name === statusName);
    if (custom && custom.badgeClass) return custom.badgeClass;
    
    switch (statusName) {
      case 'Draft': return 'bg-slate-100 text-slate-800 border border-slate-200';
      case 'Pending Approval': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Assigned': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'In Progress': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'Pending Report Review': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Done': return 'bg-green-100 text-green-800 border border-green-200';
      case 'Declined': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitForApproval = () => {
    updateResolutionStatus(resolution.id, 'Pending Approval');
  };

  const handleApproveAndAssign = () => {
    const days = resolution.implementationTimeDays || 30;
    updateResolutionStatus(resolution.id, 'In Progress', {
      approvedAt: new Date().toISOString(),
      approvedBy: currentUser?.id,
      assignedAt: new Date().toISOString(),
      assignedBy: currentUser?.id,
      dueDate: addDays(new Date(), days).toISOString(),
    });
    addComment(resolution.id, `✓ Resolution Approved by County Secretary. Implementation has officially started (Status: In Progress). Automated SMS & Email notifications dispatched systemwide to assigned Department Heads (CECM/CCO) and Oversight Committees.`);
  };

  const handleExecReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!execReplyData.text && !execReplyData.documentName) return;
    
    const submitUpdate = (fileUrl: string) => {
      addExecutiveUpdate(resolution.id, {
        text: execReplyData.text,
        proposedStatus: resolution.status,
        documents: execReplyData.documentName ? [{
          id: Math.random().toString(36).substring(7),
          name: execReplyData.documentName + (evidenceDocDesc ? ` (${evidenceDocDesc})` : ''),
          url: fileUrl,
          categoryId: 'reply_doc',
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser?.name || 'unknown'
        }] : []
      });

      addComment(resolution.id, `Uploaded evidence / status update: ${execReplyData.text}`);
      
      setExecReplyData({ proposedStatus: '', text: '', documentName: '' });
      setEvidenceDocDesc('');
      setSelectedEvidenceFile(null);
      setShowExecReply(false);
    };

    if (selectedEvidenceFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        submitUpdate(reader.result as string);
      };
      reader.readAsDataURL(selectedEvidenceFile);
    } else {
      submitUpdate('#');
    }
  };

  const handleSubmitFinalReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitReportText.trim()) {
      alert('Please provide report content / summary');
      return;
    }
    
    const submitReport = (fileUrl: string) => {
      addExecutiveUpdate(resolution.id, {
        text: `[FINAL REPORT] ${submitReportText}`,
        proposedStatus: 'Pending Report Review',
        documents: submitReportDocName ? [{
          id: Math.random().toString(36).substring(7),
          name: `Final Report: ${submitReportDocName}`,
          url: fileUrl,
          categoryId: 'cat3', // Report category
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser?.name || 'unknown'
        }] : []
      });
      
      updateResolutionStatus(resolution.id, 'Pending Report Review');
      addComment(resolution.id, `📝 Submitted Final Implementation Report for County Assembly review.`);
      
      setSubmitReportText('');
      setSubmitReportDocName('');
      setSelectedReportFile(null);
      setShowSubmitReportForm(false);
    };

    if (selectedReportFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        submitReport(reader.result as string);
      };
      reader.readAsDataURL(selectedReportFile);
    } else {
      submitReport('#');
    }
  };

  const handleAcceptReport = () => {
    updateResolutionStatus(resolution.id, 'Done');
    addComment(resolution.id, `✓ County Assembly accepted the report and closed the resolution.`);
  };

  const handleRequestMoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestMoreInfoNote.trim()) {
      alert('Please provide a reason / note for requesting more information');
      return;
    }
    updateResolutionStatus(resolution.id, 'In Progress');
    addComment(resolution.id, `⚠️ Request for More Information: ${requestMoreInfoNote}`);
    setRequestMoreInfoNote('');
    setShowRequestMoreInfo(false);
  };

  const handleSaveCommitteeRemarksAndMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!committeeRemarksText.trim() && !selectedCommitteeMinutesFile && !committeeMinutesDocName.trim()) {
      alert('Please enter committee remarks or attach committee minutes file.');
      return;
    }

    const saveAction = (fileUrl?: string) => {
      const minutesLabel = committeeMinutesDocName.trim() || selectedCommitteeMinutesFile?.name || '';
      
      if (selectedCommitteeMinutesFile && fileUrl) {
        addDocument(resolution.id, {
          name: minutesLabel ? (minutesLabel.startsWith('Implementation Committee Minutes:') ? minutesLabel : `Implementation Committee Minutes: ${minutesLabel}`) : selectedCommitteeMinutesFile.name,
          fileName: selectedCommitteeMinutesFile.name,
          description: 'Implementation Committee Meeting Minutes',
          categoryId: 'cat3',
          url: fileUrl,
        });
      }

      updateResolutionStatus(resolution.id, resolution.status, {
        committeeRemarks: committeeRemarksText.trim() || resolution.committeeRemarks,
        committeeMinutesDocName: minutesLabel ? (minutesLabel.startsWith('Implementation Committee Minutes:') ? minutesLabel : `Implementation Committee Minutes: ${minutesLabel}`) : resolution.committeeMinutesDocName,
        committeeMinutesUrl: fileUrl || resolution.committeeMinutesUrl,
      });

      addComment(
        resolution.id,
        `📋 Implementation Committee Remarks & Minutes updated by ${currentUser?.name || 'Committee Officer'}.${committeeRemarksText.trim() ? `\nRemarks: ${committeeRemarksText.trim()}` : ''}${minutesLabel ? `\nAttached Minutes: ${minutesLabel}` : ''}`
      );

      setShowCommitteeModal(false);
      setSelectedCommitteeMinutesFile(null);
      setCommitteeMinutesDocName('');
    };

    if (selectedCommitteeMinutesFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        saveAction(reader.result as string);
      };
      reader.readAsDataURL(selectedCommitteeMinutesFile);
    } else {
      saveAction();
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    addComment(resolution.id, commentText);
    setCommentText('');
  };

  const handleDownloadFile = async (name: string, url: string, fileName?: string) => {
    try {
      // Determine base name and extension
      let downloadName = fileName || name;

      if (!downloadName.includes('.') && fileName && fileName.includes('.')) {
        const ext = fileName.split('.').pop();
        if (ext) downloadName = `${downloadName}.${ext}`;
      }

      // 1. Data URLs, Blob URLs, server paths (/Private/...), or external HTTP URLs
      if (url && (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/Private/') || url.startsWith('Private/'))) {
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Detect extension from MIME type if missing
        if (!downloadName.includes('.')) {
          const type = blob.type.toLowerCase();
          if (type.includes('pdf')) downloadName += '.pdf';
          else if (type.includes('word') || type.includes('docx')) downloadName += '.docx';
          else if (type.includes('excel') || type.includes('xlsx') || type.includes('sheet')) downloadName += '.xlsx';
          else if (type.includes('png')) downloadName += '.png';
          else if (type.includes('jpeg') || type.includes('jpg')) downloadName += '.jpg';
          else downloadName += '.pdf';
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        // 2. Pre-seeded or placeholder document records without binary payload
        let ext = 'pdf';
        if (downloadName.includes('.')) {
          ext = downloadName.split('.').pop()?.toLowerCase() || 'pdf';
        } else {
          ext = 'pdf';
          downloadName = `${downloadName}.pdf`;
        }

        let mimeType = 'application/pdf';
        if (ext === 'docx' || ext === 'doc') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === 'xlsx' || ext === 'xls') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'txt') mimeType = 'text/plain;charset=utf-8';

        let blobContent: BlobPart[];
        if (ext === 'pdf') {
          // Standard minimal PDF binary structure
          const pdfData = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 140 >>\nstream\nBT /F1 14 Tf 50 720 Td (COUNTY ASSEMBLY OF TAITA TAVETA) Tj 0 -25 Td (Official Document: ${name}) Tj 0 -20 Td (Resolution Ref: ${resolution.referenceNumber}) Tj 0 -20 Td (Status: ${resolution.status}) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000262 00000 n \n0000000443 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n520\n%%EOF`;
          blobContent = [pdfData];
        } else {
          const fileContent = `COUNTY ASSEMBLY OF TAITA TAVETA\nDocument: ${name}\nResolution Ref: ${resolution.referenceNumber}\nTitle: ${resolution.title}\nStatus: ${resolution.status}\nDate: ${new Date().toLocaleDateString()}`;
          blobContent = [fileContent];
        }

        const blob = new Blob(blobContent, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Derived state for permissions
  const isSysAdmin = currentUser?.role && ['System Administrator', 'ICT Director'].includes(currentUser.role);
  const isClerkOrAssistant = currentUser?.role && ['County Assembly Clerk', 'Assistant County Assembly Clerk'].includes(currentUser.role);
  const isCountySecretary = currentUser?.role && ['County Secretary', "County Secretary's Assistant"].includes(currentUser.role);
  const isExecutiveUser = currentUser?.role && ['CECM', 'CCO', 'Director', 'County Secretary', "County Secretary's Assistant"].includes(currentUser.role);

  const userPerms = currentUser ? rolePermissions[currentUser.role] : null;
  const canDeleteResolution = userPerms?.delete_resolution || ['System Administrator', 'ICT Director', 'ICT', 'County Assembly Clerk', 'Assistant County Assembly Clerk'].includes(currentUser?.role || '');

  const canSubmitForApproval = (isClerkOrAssistant || isSysAdmin) && resolution.status === 'Draft';
  const canApproveAndAssign = (isCountySecretary || isSysAdmin) && resolution.status === 'Pending Approval';
  
  const canUploadEvidence = (isExecutiveUser || isSysAdmin) && resolution.status === 'In Progress';
  const canSubmitReport = (isExecutiveUser || isSysAdmin) && resolution.status === 'In Progress';
  
  const canReviewReport = (isClerkOrAssistant || isSysAdmin) && resolution.status === 'Pending Report Review';
  
  const isLocked = resolution.status === 'Done' && !isSysAdmin;

  const isApprovedByCS = Boolean(
    resolution.approvedAt ||
    resolution.approvedBy ||
    ['In Progress', 'Pending Report Review', 'Done'].includes(resolution.status)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row justify-between items-start gap-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h3 className="text-lg leading-6 font-bold text-slate-700 font-mono">
              {resolution.referenceNumber}
            </h3>
            <p className="mt-1 max-w-2xl text-xl font-medium text-gray-900">
              {resolution.title}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {isApprovedByCS && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs" title="Approved by County Secretary">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Approved by County Secretary</span>
              </span>
            )}
            <span className={clsx(
              "px-3 py-1 rounded-full text-sm font-semibold shadow-sm",
              getStatusBadgeColor(resolution.status)
            )}>
              {resolution.status}
            </span>
            {canDeleteResolution && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to delete resolution ${resolution.referenceNumber}? This action cannot be undone.`)) {
                    const success = await deleteResolution(resolution.id);
                    if (success) {
                      navigate('/resolutions');
                    }
                  }
                }}
                className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Delete Resolution"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
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
      {/* Action Panels based on roles */}
      {canSubmitForApproval && (
        <div className="bg-white border border-slate-200 p-6 shadow-sm rounded-xl flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Draft Resolution</h4>
              <p className="text-xs text-slate-500 mt-0.5">This resolution is currently a Draft. Submit it to start the approval and routing process.</p>
            </div>
          </div>
          <button
            onClick={handleSubmitForApproval}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer"
          >
            Submit for Approval
          </button>
        </div>
      )}

      {canApproveAndAssign && (
        <div className="bg-white border border-yellow-200 p-6 shadow-sm rounded-xl space-y-6">
          <div className="flex items-start gap-3 border-b border-yellow-100 pb-4">
            <ShieldCheck className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="text-sm font-bold text-yellow-900 uppercase tracking-wide">Approve and assign to respective department</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assigned Departments</span>
              <div className="flex flex-wrap gap-1.5">
                {resolution.departmentId ? resolution.departmentId.split(',').map(id => {
                  const d = departments.find(dept => dept.id === id.trim());
                  return d ? (
                    <span key={id} className="inline-flex items-center bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {d.name}
                    </span>
                  ) : null;
                }) : <span className="text-xs text-slate-400 italic">None assigned</span>}
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Oversight Committees</span>
              <div className="flex flex-wrap gap-1.5">
                {resolution.committeeId ? resolution.committeeId.split(',').map(id => {
                  const c = committees.find(comm => comm.id === id.trim());
                  return c ? (
                    <span key={id} className="inline-flex items-center bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {c.name}
                    </span>
                  ) : null;
                }) : <span className="text-xs text-slate-400 italic">None assigned</span>}
              </div>
            </div>

            <div className="md:col-span-2 border-t border-slate-200 pt-3 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Implementation Timeline</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                  {resolution.implementationTimeDays} Days (Customized timeline, up to 60 days)
                </span>
              </div>

              <button
                type="button"
                onClick={handleApproveAndAssign}
                className="px-5 py-2.5 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/15 transition-all duration-150 cursor-pointer"
              >
                Approve & Start Implementation
              </button>
            </div>
          </div>
        </div>
      )}

      {(canUploadEvidence || canSubmitReport || (resolution.executiveUpdates && resolution.executiveUpdates.length > 0)) && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-slate-700 mr-2.5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Departmental Implementation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage departmental implementation progress updates, evidence uploads, and report submissions.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {canUploadEvidence && (
              <div className="bg-orange-50/70 border border-orange-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center">
                    <Activity className="h-5 w-5 text-orange-600 mr-2.5 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <h4 className="text-sm font-bold text-orange-950">Upload Evidence & Status Update</h4>
                      <p className="text-xs text-orange-800/90 mt-0.5">Add an ongoing implementation update or upload evidence files.</p>
                    </div>
                  </div>
                  {!showExecReply && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExecReply(true);
                        setShowSubmitReportForm(false);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-orange-800 bg-white border border-orange-300 hover:bg-orange-100/50 shadow-2xs cursor-pointer shrink-0"
                    >
                      Add Update / Evidence
                    </button>
                  )}
                </div>

                {showExecReply && (
                  <form onSubmit={handleExecReplySubmit} className="p-5 bg-white border-t border-orange-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Progress Update / Evidence</h5>
                      <button
                        type="button"
                        onClick={() => setShowExecReply(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Progress Details / Remarks</label>
                      <textarea
                        required
                        rows={3}
                        value={execReplyData.text}
                        onChange={(e) => setExecReplyData({...execReplyData, text: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Provide specific details about the ongoing implementation progress..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Evidence File (Optional)</label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center justify-center py-2 px-3 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 bg-white cursor-pointer transition-colors w-full">
                            <Upload className={`h-4 w-4 mr-2 ${selectedEvidenceFile ? 'text-green-500' : 'text-gray-400'}`} />
                            <span className="truncate font-medium max-w-[150px]">
                              {selectedEvidenceFile ? `✓ ${selectedEvidenceFile.name}` : 'Choose File...'}
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip,*/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSelectedEvidenceFile(file);
                                  setExecReplyData({
                                    ...execReplyData,
                                    documentName: file.name
                                  });
                                }
                              }}
                            />
                          </label>
                          {selectedEvidenceFile && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEvidenceFile(null);
                                setExecReplyData({ ...execReplyData, documentName: '' });
                              }}
                              className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 bg-white cursor-pointer"
                              title="Remove file"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Document Name / Label</label>
                        <input
                          type="text"
                          value={execReplyData.documentName}
                          onChange={(e) => setExecReplyData({...execReplyData, documentName: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-orange-500"
                          placeholder="e.g. Site Photo, Receipts..."
                        />
                      </div>
                    </div>

                    {execReplyData.documentName && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Attachment Description</label>
                        <input
                          type="text"
                          value={evidenceDocDesc}
                          onChange={(e) => setEvidenceDocDesc(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-orange-500"
                          placeholder="Brief explanation of this attachment..."
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowExecReply(false)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 border border-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!execReplyData.text}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 cursor-pointer"
                      >
                        Submit Update
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {canSubmitReport && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-2.5 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <h4 className="text-sm font-bold text-blue-950">Submit Implementation Reports</h4>
                      <p className="text-xs text-blue-800/90 mt-0.5">Conclude implementation and forward a formal report to the Assembly for review.</p>
                    </div>
                  </div>
                  {!showSubmitReportForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubmitReportForm(true);
                        setShowExecReply(false);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-blue-800 bg-white border border-blue-300 hover:bg-blue-100/50 shadow-2xs cursor-pointer shrink-0"
                    >
                      Submit Reports
                    </button>
                  )}
                </div>

                {showSubmitReportForm && (
                  <form onSubmit={handleSubmitFinalReport} className="p-5 bg-white border-t border-blue-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Submit Formal Implementation Report</h5>
                      <button
                        type="button"
                        onClick={() => setShowSubmitReportForm(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Report Summary & Content (Required)</label>
                      <textarea
                        required
                        rows={4}
                        value={submitReportText}
                        onChange={(e) => setSubmitReportText(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-blue-500"
                        placeholder="Provide a comprehensive summary of the implemented works and outcomes..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Report File (Optional)</label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center justify-center py-2 px-3 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 bg-white cursor-pointer transition-colors w-full">
                            <Upload className={`h-4 w-4 mr-2 ${selectedReportFile ? 'text-green-500' : 'text-gray-400'}`} />
                            <span className="truncate font-medium max-w-[150px]">
                              {selectedReportFile ? `✓ ${selectedReportFile.name}` : 'Choose File...'}
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSelectedReportFile(file);
                                  setSubmitReportDocName(file.name);
                                }
                              }}
                            />
                          </label>
                          {selectedReportFile && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReportFile(null);
                                setSubmitReportDocName('');
                              }}
                              className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 bg-white cursor-pointer"
                              title="Remove file"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Report Document Name / Label</label>
                        <input
                          type="text"
                          value={submitReportDocName}
                          onChange={(e) => setSubmitReportDocName(e.target.value)}
                          className="block w-full border border-gray-300 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-blue-500"
                          placeholder="e.g. Voi Hospital Upgrade Phase 1 Report.pdf"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowSubmitReportForm(false)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 border border-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      >
                        Submit Report to Assembly
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {resolution.executiveUpdates && resolution.executiveUpdates.length > 0 && (
              <div className="bg-gray-50 border border-slate-200 rounded-xl overflow-hidden mt-2">
                <ul className="divide-y divide-gray-200">
                  {resolution.executiveUpdates.map(update => (
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
                        </div>
                        
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
                                <button
                                  onClick={() => handleDownloadFile(doc.name, doc.url, doc.fileName)}
                                  className="hover:underline cursor-pointer text-left focus:outline-none"
                                >
                                  {doc.name}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Implementation Committee Remarks & Minutes Section */}
      <div className="bg-white shadow-sm rounded-xl border border-purple-200 p-6 space-y-5">
        <div className="border-b border-purple-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center">
            <ShieldCheck className="h-5 w-5 text-purple-700 mr-2.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Implementation Committee Remarks & Minutes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Record committee remarks, observations, and attach official committee meeting minutes.</p>
            </div>
          </div>
          {!showCommitteeModal && (
            <button
              type="button"
              onClick={() => {
                setCommitteeRemarksText(resolution.committeeRemarks || '');
                setShowCommitteeModal(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-purple-900 bg-purple-50 hover:bg-purple-100/80 border border-purple-300 shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto"
            >
              {resolution.committeeRemarks || resolution.committeeMinutesDocName ? 'Edit Remarks & Minutes' : '+ Add Remarks & Minutes'}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {(resolution.committeeRemarks || resolution.committeeMinutesDocName) && !showCommitteeModal && (
            <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 space-y-3">
              {resolution.committeeRemarks && (
                <div>
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mb-1">Committee Remarks:</span>
                  <p className="text-xs text-slate-700 bg-white p-3.5 rounded-lg border border-purple-100 whitespace-pre-wrap leading-relaxed shadow-2xs">
                    {resolution.committeeRemarks}
                  </p>
                </div>
              )}

              {resolution.committeeMinutesDocName && (
                <div>
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mb-1">Committee Minutes Document:</span>
                  <div className="flex items-center text-xs font-medium text-purple-800 bg-white px-3 py-2 rounded-lg border border-purple-200 shadow-2xs w-max">
                    <FileText className="h-4 w-4 mr-1.5 text-purple-600 shrink-0" />
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(resolution.committeeMinutesDocName!, resolution.committeeMinutesUrl || '#', 'Committee_Minutes.pdf')}
                      className="hover:underline cursor-pointer text-left font-semibold"
                    >
                      {resolution.committeeMinutesDocName}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showCommitteeModal && (
            <form onSubmit={handleSaveCommitteeRemarksAndMinutes} className="bg-purple-50/40 border border-purple-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Record Committee Remarks & Attach Minutes</h5>
                <button
                  type="button"
                  onClick={() => setShowCommitteeModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Implementation Committee Remarks</label>
                <textarea
                  rows={3}
                  value={committeeRemarksText}
                  onChange={(e) => setCommitteeRemarksText(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-white"
                  placeholder="Provide official observations, findings, or directives from the Implementation Committee..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Committee Minutes File (Optional)</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center justify-center py-2 px-3 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 bg-white cursor-pointer transition-colors w-full">
                      <Upload className={`h-4 w-4 mr-2 ${selectedCommitteeMinutesFile ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className="truncate font-medium max-w-[150px]">
                        {selectedCommitteeMinutesFile ? `✓ ${selectedCommitteeMinutesFile.name}` : 'Choose File...'}
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip,*/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedCommitteeMinutesFile(file);
                            if (!committeeMinutesDocName) {
                              setCommitteeMinutesDocName(file.name);
                            }
                          }
                        }}
                      />
                    </label>
                    {selectedCommitteeMinutesFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCommitteeMinutesFile(null);
                        }}
                        className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 bg-white cursor-pointer"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Minutes Document Title / Label</label>
                  <input
                    type="text"
                    value={committeeMinutesDocName}
                    onChange={(e) => setCommitteeMinutesDocName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-purple-500 bg-white"
                    placeholder="e.g. Implementation Committee Meeting Minutes #4.pdf"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-purple-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCommitteeModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-purple-700 hover:bg-purple-800 cursor-pointer"
                >
                  Save Remarks & Minutes
                </button>
              </div>
            </form>
          )}

          {!resolution.committeeRemarks && !resolution.committeeMinutesDocName && !showCommitteeModal && (
            <div className="text-center py-6 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
              <ShieldCheck className="h-8 w-8 text-purple-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">No committee remarks or meeting minutes recorded yet.</p>
              <button
                type="button"
                onClick={() => {
                  setCommitteeRemarksText('');
                  setShowCommitteeModal(true);
                }}
                className="mt-2.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 cursor-pointer inline-flex items-center gap-1.5"
              >
                + Add Committee Remarks & Minutes
              </button>
            </div>
          )}
        </div>
      </div>

      {canReviewReport && (
        <div className="bg-white border border-indigo-200 p-6 shadow-sm rounded-xl space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wide">Review Implementation Report</h3>
              <p className="text-xs text-indigo-700 mt-1">
                An Executive department has submitted an implementation report. Please review the reports and either accept them (closing the resolution) or bounce back to In Progress with more information requested.
              </p>
            </div>
          </div>

          {!showRequestMoreInfo ? (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRequestMoreInfo(true)}
                className="px-4 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer"
              >
                Bounce Back (Request More Info)
              </button>
              <button
                onClick={handleAcceptReport}
                className="px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg cursor-pointer"
              >
                Accept & Conclude Resolution
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestMoreInfo} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Note / Request Reason (Required)</label>
                <textarea
                  required
                  rows={3}
                  value={requestMoreInfoNote}
                  onChange={(e) => setRequestMoreInfoNote(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-orange-500"
                  placeholder="Detail exactly what additional information, documentation, or action is required..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestMoreInfo(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  Send Request & Reopen
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {resolution.status === 'Done' && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <h4 className="text-sm font-semibold text-green-900">✓ Resolution Concluded & Done</h4>
            <p className="text-xs text-green-700 mt-0.5">The Assembly accepted the final implementation report and successfully closed this resolution record.</p>
          </div>
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
                  <label className="block text-sm font-medium text-gray-700">
                    Document Description / Note <span className="text-xs text-gray-400 font-normal">(Optional - describes document contents)</span>
                  </label>
                  <input
                    type="text"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white"
                    placeholder="e.g. Official Hansard Scan, Signed Resolution Minutes..."
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
                  <label className="block text-sm font-medium text-gray-700">Attach Document File</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-white">
                    <div className="space-y-1 text-center">
                      <Upload className={`mx-auto h-12 w-12 ${selectedFile ? 'text-green-500' : 'text-gray-400'}`} />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500"
                        >
                          <span>{selectedFile ? 'Change file' : 'Upload a file'}</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedFile(file);
                              }
                            }}
                          />
                        </label>
                        {!selectedFile && <p className="pl-1 text-slate-500">or drag & drop</p>}
                      </div>
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 max-w-full flex-wrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                          <span className="break-all break-words text-center min-w-0">{selectedFile.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-normal shrink-0">
                            ({(selectedFile.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Supports PDF, DOCX, XLSX, Images & Any Document Format</p>
                      )}
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
                    {resolution.documents.map((doc) => {
                      const displayName = doc.fileName || doc.name;
                      const desc = doc.description || (doc.name !== doc.fileName ? doc.name : '');
                      return (
                        <li key={doc.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                          <div className="w-0 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <FileText className="flex-shrink-0 h-5 w-5 text-orange-500 shrink-0" />
                              <span className="font-bold text-gray-900 break-all break-words min-w-0">{displayName}</span>
                              {displayName.includes('.') && (
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-bold shrink-0 border border-slate-200">
                                  {displayName.split('.').pop()}
                                </span>
                              )}
                            </div>
                            {desc && desc !== displayName && (
                              <p className="ml-7 text-xs text-slate-600 mt-0.5 font-medium">
                                <span className="text-slate-400 font-normal">Description: </span>{desc}
                              </p>
                            )}
                            <span className="ml-7 text-[11px] text-gray-400 mt-0.5">
                              {docCategories.find(c => c.id === doc.categoryId)?.name || 'Document'} • Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')} {doc.uploadedBy ? `by ${doc.uploadedBy}` : ''}
                            </span>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(displayName, doc.url, displayName)}
                              className="font-medium text-orange-600 hover:text-orange-700 hover:underline cursor-pointer focus:outline-none text-xs bg-orange-50 px-2.5 py-1 rounded border border-orange-200"
                            >
                              Download
                            </button>
                          </div>
                        </li>
                      );
                    })}
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
