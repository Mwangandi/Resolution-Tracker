import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../store';
import { FileText, Save, X, Plus, Upload, Trash2 } from 'lucide-react';
import { ResolutionDocument } from '../types';

export function CreateResolution() {
  const navigate = useNavigate();
  const appContext = useAppContext();
  const { createResolution, currentUser } = appContext;

  if (!currentUser || !['County Assembly Clerk', 'Assistant County Assembly Clerk', 'System Administrator', 'ICT Director', 'MCA', 'Committee Clerk'].includes(currentUser.role)) {
    return (
      <div className="p-6 text-center text-slate-500 font-sans">
        You do not have permission to register new resolutions.
      </div>
    );
  }

  const departments = appContext.departments.filter(d => d.isActive !== false);
  const committees = appContext.committees.filter(c => c.isActive !== false);
  const docCategories = appContext.docCategories.filter(c => c.isActive !== false);
  
  const [formData, setFormData] = useState({
    referenceNumber: '',
    title: '',
    description: '',
    datePassed: new Date().toISOString().split('T')[0],
    implementationTimeDays: 30,
  });

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]);
  const [showAddDeptSelect, setShowAddDeptSelect] = useState(false);
  const [showAddCommSelect, setShowAddCommSelect] = useState(false);

  const [documents, setDocuments] = useState<Partial<ResolutionDocument>[]>([]);

  const handleSelectDepartment = (deptId: string) => {
    if (deptId && !selectedDepartments.includes(deptId)) {
      setSelectedDepartments([...selectedDepartments, deptId]);
    }
    setShowAddDeptSelect(false);
  };

  const handleRemoveSelectedDepartment = (deptId: string) => {
    setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
  };

  const handleSelectCommittee = (commId: string) => {
    if (commId && !selectedCommittees.includes(commId)) {
      setSelectedCommittees([...selectedCommittees, commId]);
    }
    setShowAddCommSelect(false);
  };

  const handleRemoveSelectedCommittee = (commId: string) => {
    setSelectedCommittees(selectedCommittees.filter(id => id !== commId));
  };

  const handleSubmitWithStatus = (status: 'Draft' | 'Pending Approval') => {
    if (!formData.title.trim()) {
      alert('Please provide a resolution title');
      return;
    }
    if (selectedDepartments.length === 0) {
      alert('Please select at least one Target Department');
      return;
    }
    if (selectedCommittees.length === 0) {
      alert('Please select at least one Oversight Committee');
      return;
    }
    if (formData.implementationTimeDays < 1 || formData.implementationTimeDays > 60) {
      alert('Implementation timeline must be between 1 and 60 days');
      return;
    }

    createResolution({
      ...formData,
      status,
      departmentId: selectedDepartments.join(','),
      committeeId: selectedCommittees.join(','),
      documents: documents.map(doc => ({
        ...doc,
        id: Math.random().toString(36).substring(7),
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.id || 'unknown'
      })) as ResolutionDocument[]
    });
    navigate('/resolutions');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'implementationTimeDays' ? parseInt(value) || 0 : value
    }));
  };

  const handleAddDocument = () => {
    setDocuments(prev => [...prev, { name: '', url: '#', categoryId: docCategories[0]?.id }]);
  };

  const handleDocumentChange = (index: number, field: keyof ResolutionDocument, value: string) => {
    setDocuments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Register New Resolution</h1>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6 p-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700">
                Resolution Reference No (Optional)
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="referenceNumber"
                  id="referenceNumber"
                  className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  placeholder="e.g. TTCA/CS/7/VOL.8/(001) (auto-generated if empty)"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Resolution Title
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  placeholder="e.g. Upgrading of Voi County Referral Hospital"
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description & Details
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                placeholder="Detailed explanation of the resolution..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Target Departments
              </label>
              <div className="mt-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {selectedDepartments.map(deptId => {
                    const dept = departments.find(d => d.id === deptId);
                    return (
                      <span key={deptId} className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {dept?.name || deptId}
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedDepartment(deptId)}
                          className="text-orange-500 hover:text-orange-700 focus:outline-none"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                
                {showAddDeptSelect ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-1.5 px-3 border bg-white"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectDepartment(e.target.value);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select Department...</option>
                      {departments.filter(d => !selectedDepartments.includes(d.id)).map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddDeptSelect(false)}
                      className="p-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddDeptSelect(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-orange-200 shadow-sm text-xs font-semibold rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Department
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Oversight Committees
              </label>
              <div className="mt-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {selectedCommittees.map(commId => {
                    const comm = committees.find(c => c.id === commId);
                    return (
                      <span key={commId} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {comm?.name || commId}
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedCommittee(commId)}
                          className="text-blue-500 hover:text-blue-700 focus:outline-none"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>

                {showAddCommSelect ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-1.5 px-3 border bg-white"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectCommittee(e.target.value);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select Committee...</option>
                      {committees.filter(c => !selectedCommittees.includes(c.id)).map(comm => (
                        <option key={comm.id} value={comm.id}>{comm.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCommSelect(false)}
                      className="p-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddCommSelect(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-200 shadow-sm text-xs font-semibold rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Committee
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="datePassed" className="block text-sm font-medium text-gray-700">
                Date Passed by Assembly
              </label>
              <div className="mt-1">
                <input
                  type="date"
                  name="datePassed"
                  id="datePassed"
                  required
                  className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  value={formData.datePassed}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="implementationTimeDays" className="block text-sm font-medium text-gray-700">
                Implementation Time (Days) - Maximum 60 Days
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="implementationTimeDays"
                  id="implementationTimeDays"
                  required
                  min="1"
                  max="60"
                  className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  value={formData.implementationTimeDays}
                  onChange={handleChange}
                />
                <span className="text-xs text-slate-500 mt-1 block">Customize implementation timeline (up to 60 days)</span>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Supporting Documents</h3>
              <button
                type="button"
                onClick={handleAddDocument}
                className="inline-flex items-center px-3 py-1.5 border border-orange-200 shadow-sm text-xs font-medium rounded text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Document
              </button>
            </div>
            
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Document Description / Note <span className="text-gray-400 font-normal capitalize">(Optional - describes document contents)</span>
                        </label>
                        <input
                          type="text"
                          value={doc.description || ''}
                          onChange={(e) => handleDocumentChange(index, 'description', e.target.value)}
                          className="block w-full sm:text-sm border-gray-300 rounded-md py-1.5 px-3 border focus:ring-orange-500 focus:border-orange-500 bg-white"
                          placeholder="e.g. Official Signed Hansard Copy, Minutes of Committee Meeting..."
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 min-w-0">
                        <div className="w-full sm:w-1/3 min-w-0">
                          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Category</label>
                          <select
                            value={doc.categoryId}
                            onChange={(e) => handleDocumentChange(index, 'categoryId', e.target.value)}
                            className="block w-full sm:text-sm border-gray-300 rounded-md py-1.5 px-3 border focus:ring-orange-500 focus:border-orange-500 bg-white"
                          >
                            {docCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Attach Document File</label>
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            <label className={`flex items-center justify-center w-full py-2 px-3 border border-dashed rounded-lg text-sm transition-all cursor-pointer overflow-hidden ${doc.fileName ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
                              {doc.fileName ? (
                                <div className="flex items-center gap-1.5 min-w-0 w-full flex-wrap justify-start sm:justify-center py-0.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="text-xs font-bold text-emerald-800 break-all break-words whitespace-normal text-left sm:text-center min-w-0">{doc.fileName}</span>
                                  {doc.fileName.includes('.') && (
                                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded font-black shrink-0">
                                      {doc.fileName.split('.').pop()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center text-xs font-medium text-slate-600 min-w-0">
                                  <Upload className="h-4 w-4 mr-2 text-slate-400 shrink-0" />
                                  <span className="truncate">Choose File (PDF, Word, Excel, etc)...</span>
                                </div>
                              )}
                              <input 
                                type="file" 
                                className="sr-only"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const dataUrl = reader.result as string;
                                      setDocuments(prev => {
                                        const updated = [...prev];
                                        const curr = updated[index] || {};
                                        updated[index] = {
                                          ...curr,
                                          fileName: file.name,
                                          name: curr.description || file.name,
                                          url: dataUrl
                                        };
                                        return updated;
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                <FileText className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">No documents added yet.</p>
              </div>
            )}
          </div>

          <div className="pt-5 flex justify-end space-x-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/resolutions')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmitWithStatus('Draft')}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmitWithStatus('Pending Approval')}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <FileText className="mr-2 h-4 w-4" />
              Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
