import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { Link, useNavigate, useParams } from 'react-router';
import { Plus, Search, Filter, Calendar as CalendarIcon, Clock, ArrowRight, Download, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { ResolutionStatus } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ResolutionDetail } from './ResolutionDetail';

export function ResolutionsList() {
  const { resolutions, currentUser, statusCategories, departments, committees, rolePermissions, deleteResolution, logAudit, searchTerm, setSearchTerm } = useAppContext();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);

  // Sync route ID with open tabs
  useEffect(() => {
    if (id && id !== 'new') {
      setOpenTabIds(prev => {
        if (!prev.includes(id)) {
          return [...prev, id];
        }
        return prev;
      });
    }
  }, [id]);

  const closeTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const updatedTabs = openTabIds.filter(tid => tid !== tabId);
    setOpenTabIds(updatedTabs);
    
    if (id === tabId) {
      if (updatedTabs.length > 0) {
        const nextActiveId = updatedTabs[updatedTabs.length - 1];
        navigate(`/resolutions/${nextActiveId}`);
      } else {
        navigate('/resolutions');
      }
    }
  };

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [committeeFilter, setCommitteeFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<'status' | 'dept' | 'comm' | 'date'>('status');
  const [isFiltersExposed, setIsFiltersExposed] = useState<boolean>(false);

  const filteredResolutions = resolutions.filter(res => {
    const title = res.title ? res.title.toLowerCase() : '';
    const refNum = res.referenceNumber ? res.referenceNumber.toLowerCase() : '';
    const term = searchTerm.toLowerCase();
    const matchesSearch = title.includes(term) || refNum.includes(term);
    const matchesStatus = statusFilter === 'All' || res.status === statusFilter;
    const matchesDepartment = departmentFilter === 'All' || (res.departmentId && res.departmentId.split(',').map(s => s.trim()).includes(departmentFilter));
    const matchesCommittee = committeeFilter === 'All' || (res.committeeId && res.committeeId.split(',').map(s => s.trim()).includes(committeeFilter));
    const matchesDate = !dateFilter || res.datePassed === dateFilter;

    return matchesSearch && matchesStatus && matchesDepartment && matchesCommittee && matchesDate;
  });

  const exportToExcel = () => {
    logAudit('View', 'System', 'system', 'Exported resolutions to Excel report', '/api/reports/excel', 'GET');
    const data = filteredResolutions.map(res => ({
      'Reference Number': res.referenceNumber,
      'Title': res.title,
      'Status': res.status,
      'Date Passed': res.datePassed,
      'Target Department': res.departmentId ? res.departmentId.split(',').map(id => departments.find(d => d.id === id.trim())?.name).filter(Boolean).join(', ') : 'N/A',
      'Oversight Committee': res.committeeId ? res.committeeId.split(',').map(id => committees.find(c => c.id === id.trim())?.name).filter(Boolean).join(', ') : 'N/A',
      'Time Limit (Days)': res.implementationTimeDays,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resolutions");
    XLSX.writeFile(wb, "Resolutions_Report.xlsx");
  };

  const exportToPDF = () => {
    logAudit('View', 'System', 'system', 'Exported resolutions to PDF report', '/api/reports/pdf', 'GET');
    const doc = new jsPDF('landscape');
    
    doc.text("Resolutions Report", 14, 15);
    
    const tableData = filteredResolutions.map(res => [
      res.referenceNumber,
      res.title,
      res.status,
      res.datePassed,
      res.departmentId ? res.departmentId.split(',').map(id => departments.find(d => d.id === id.trim())?.name).filter(Boolean).join(', ') : 'N/A',
      res.committeeId ? res.committeeId.split(',').map(id => committees.find(c => c.id === id.trim())?.name).filter(Boolean).join(', ') : 'N/A',
      res.implementationTimeDays.toString()
    ]);

    autoTable(doc, {
      head: [['Ref Number', 'Title', 'Status', 'Date Passed', 'Department', 'Committee', 'Time Limit']],
      body: tableData,
      startY: 20,
    });
    
    doc.save("Resolutions_Report.pdf");
  };

  const getStatusBadgeColor = (statusName: string) => {
    const custom = statusCategories?.find(s => s.name === statusName);
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

  const canCreate = currentUser?.role === 'County Assembly Clerk' || currentUser?.role === 'Assistant County Assembly Clerk' || ['System Administrator', 'ICT Director'].includes(currentUser?.role || '');
  const userPermissions = currentUser ? rolePermissions[currentUser.role] : null;
  const canDelete = userPermissions?.delete_resolution || ['System Administrator', 'ICT Director', 'ICT', 'County Assembly Clerk', 'Assistant County Assembly Clerk'].includes(currentUser?.role || '');

  const isAnyFilterActive = statusFilter !== 'All' || departmentFilter !== 'All' || committeeFilter !== 'All' || dateFilter !== '';
  const clearAllFilters = () => {
    setStatusFilter('All');
    setDepartmentFilter('All');
    setCommitteeFilter('All');
    setDateFilter('');
  };

  if (openTabIds.length > 0) {
    return (
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)] min-h-[500px]">
        {/* Minimized Sidebar */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col space-y-4 h-full overflow-hidden border-r border-slate-200 pr-4">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Archive</h2>
              <p className="text-[11px] text-gray-500">Compact list of resolutions</p>
            </div>
            {canCreate && (
              <Link
                to="/resolutions/new"
                className="inline-flex items-center p-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 cursor-pointer"
                title="Register Resolution"
              >
                <Plus className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Filters Container */}
          <div className="bg-white p-4 shadow-sm rounded-xl border border-slate-300 text-xs shrink-0 flex flex-col">
            {/* Filter Section with Toggle */}
            <div className="flex flex-col gap-2.5">
              <div 
                className="flex items-center justify-between shrink-0 cursor-pointer select-none group"
                onClick={() => setIsFiltersExposed(!isFiltersExposed)}
                title={isFiltersExposed ? "Hide filters" : "Show filters"}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">FILTER BY</span>
                  {isFiltersExposed ? (
                    <ChevronUp className="h-3.5 w-3.5 text-gray-400 group-hover:text-slate-600 transition-colors" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-slate-600 transition-colors" />
                  )}
                </div>
                {isAnyFilterActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllFilters();
                    }}
                    className="text-[9px] font-extrabold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {isFiltersExposed && (
                <div className="flex flex-col gap-2.5">
                  {/* Filter Tab Bar */}
                  <div className="flex border-b border-slate-100 gap-1 overflow-x-auto shrink-0 pb-1 scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('status')}
                      className={clsx(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                        activeFilterTab === 'status'
                          ? "bg-orange-50 text-orange-700 shadow-sm border border-orange-200"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      Status
                      {statusFilter !== 'All' && <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('dept')}
                      className={clsx(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                        activeFilterTab === 'dept'
                          ? "bg-orange-50 text-orange-700 shadow-sm border border-orange-200"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      Dept
                      {departmentFilter !== 'All' && <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('comm')}
                      className={clsx(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                        activeFilterTab === 'comm'
                          ? "bg-orange-50 text-orange-700 shadow-sm border border-orange-200"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      Comm
                      {committeeFilter !== 'All' && <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('date')}
                      className={clsx(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                        activeFilterTab === 'date'
                          ? "bg-orange-50 text-orange-700 shadow-sm border border-orange-200"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      Date
                      {dateFilter !== '' && <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>}
                    </button>
                  </div>

                  {/* Filter Content */}
                  <div className="min-h-[44px] flex flex-col justify-center">
                    {activeFilterTab === 'status' && (
                      <div className="flex flex-wrap gap-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('All')}
                          className={clsx(
                            "px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer border",
                            statusFilter === 'All'
                              ? "bg-slate-800 border-slate-800 text-white font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          All
                        </button>
                        {statusCategories.filter(cat => cat.name !== 'Assigned' && cat.name !== 'Declined').map(cat => (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => setStatusFilter(cat.name)}
                            className={clsx(
                              "px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer border",
                              statusFilter === cat.name
                                ? "bg-slate-800 border-slate-800 text-white font-semibold"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {activeFilterTab === 'dept' && (
                      <select
                        className="focus:ring-orange-500 focus:border-orange-500 block w-full text-xs border-gray-300 rounded-md py-1 px-2 border bg-white cursor-pointer"
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                      >
                        <option value="All">All Departments</option>
                        {departments.filter(d => d.isActive !== false).map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    )}

                    {activeFilterTab === 'comm' && (
                      <select
                        className="focus:ring-orange-500 focus:border-orange-500 block w-full text-xs border-gray-300 rounded-md py-1 px-2 border bg-white cursor-pointer"
                        value={committeeFilter}
                        onChange={(e) => setCommitteeFilter(e.target.value)}
                      >
                        <option value="All">All Committees</option>
                        {committees.filter(c => c.isActive !== false).map(comm => (
                          <option key={comm.id} value={comm.id}>{comm.name}</option>
                        ))}
                      </select>
                    )}

                    {activeFilterTab === 'date' && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          className="focus:ring-orange-500 focus:border-orange-500 block w-full text-xs border-gray-300 rounded-md py-1 px-2 border cursor-pointer"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                        />
                        {dateFilter && (
                          <button
                            type="button"
                            onClick={() => setDateFilter('')}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Clear date"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compact Resolution Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-4 min-h-0">
            {filteredResolutions.length > 0 ? (
              filteredResolutions.map((res) => {
                const isActive = res.id === id;
                return (
                  <div
                    key={res.id}
                    onClick={() => navigate(`/resolutions/${res.id}`)}
                    className={clsx(
                      "p-3 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1",
                      isActive 
                        ? "bg-orange-50/70 border-orange-200 shadow-sm ring-1 ring-orange-500/20 font-semibold text-slate-900" 
                        : "bg-white border-slate-100 hover:border-orange-200 hover:bg-orange-50/10 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-bold text-slate-700 break-all">{res.referenceNumber}</span>
                      <span className={clsx(
                        "px-1.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase shrink-0",
                        getStatusBadgeColor(res.status)
                      )}>
                        {res.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-tight">{res.title}</p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No resolutions found.
              </div>
            )}
          </div>
        </div>

        {/* Tabbed Detail Column */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col h-full overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-end border-b border-slate-200 overflow-x-auto bg-slate-100 rounded-t-xl pt-2 px-3 gap-1 shrink-0 scrollbar-hide">
            {openTabIds.map((tid) => {
              const tabRes = resolutions.find(r => r.id === tid);
              if (!tabRes) return null;
              const isActive = tid === id;
              return (
                <div
                  key={tid}
                  onClick={() => navigate(`/resolutions/${tid}`)}
                  className={clsx(
                    "group relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all border-x border-t rounded-t-lg min-w-[140px] max-w-[240px]",
                    isActive 
                      ? "bg-white text-gray-900 border-slate-200 border-t-2 border-t-orange-600 -mb-[1px] shadow-sm font-bold" 
                      : "bg-slate-100/80 text-gray-500 border-transparent hover:bg-slate-50 hover:text-gray-700"
                  )}
                >
                  <span className="truncate max-w-[120px] font-mono font-bold">{tabRes.referenceNumber}</span>
                  <span className={clsx(
                    "px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded-md shrink-0",
                    getStatusBadgeColor(tabRes.status)
                  )}>
                    {tabRes.status}
                  </span>
                  <button
                    onClick={(e) => closeTab(tid, e)}
                    className="ml-auto p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-1 overflow-y-auto bg-white p-4 border border-t-0 border-slate-200 rounded-b-xl min-h-0">
            {id ? (
              <ResolutionDetail id={id} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                <p className="text-sm font-medium">Select a resolution tab above to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resolutions Archive</h1>
          <p className="mt-1 text-sm text-gray-500">
            A searchable archive of all County Assembly resolutions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          {canCreate && (
            <Link
              to="/resolutions/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Register Resolution
            </Link>
          )}
          <button
            onClick={exportToExcel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Download className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
            Export Excel
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Download className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 shadow rounded-lg flex flex-col space-y-4 border border-gray-100">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
              placeholder="Search by reference number or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="sm:w-48 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border appearance-none bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {statusCategories.filter(cat => cat.name !== 'Assigned' && cat.name !== 'Declined').map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="sm:w-64 relative">
            <select
              className="focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border bg-white"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              {departments.filter(d => d.isActive !== false).map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:w-64 relative">
            <select
              className="focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border bg-white"
              value={committeeFilter}
              onChange={(e) => setCommitteeFilter(e.target.value)}
            >
              <option value="All">All Committees</option>
              {committees.filter(c => c.isActive !== false).map(comm => (
                <option key={comm.id} value={comm.id}>{comm.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:w-48 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Filter by Date Passed"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="px-4 py-3">Ref Number</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Time Limit</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-50">
            {filteredResolutions.length > 0 ? (
              filteredResolutions.map((res) => (
                <tr 
                  key={res.id} 
                  className="hover:bg-orange-50/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/resolutions/${res.id}`)}
                >
                  <td className="px-4 py-3 font-semibold text-slate-700">{res.referenceNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-600 truncate max-w-xs">{res.title}</td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      "px-2 py-1 rounded-full text-[9px] font-bold uppercase",
                      getStatusBadgeColor(res.status)
                    )}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-bold italic">{res.implementationTimeDays} Days</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <Link 
                        to={`/resolutions/${res.id}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="text-orange-500 hover:underline cursor-pointer font-medium"
                      >
                        View Resolution
                      </Link>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete resolution ${res.referenceNumber}? This action cannot be undone.`)) {
                              const success = await deleteResolution(res.id);
                              if (success && openTabIds.includes(res.id)) {
                                closeTab(res.id, e);
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-800 cursor-pointer font-semibold hover:underline bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs border border-red-100 transition-colors"
                          title="Delete Resolution"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No resolutions found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
