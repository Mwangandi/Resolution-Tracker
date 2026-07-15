import React from 'react';
import { useAppContext } from '../store';
import { format } from 'date-fns';
import { Shield, Activity, User, FileText, Settings, Key, Eye, Trash2, CheckCircle } from 'lucide-react';

export function AuditLogs() {
  const { auditLogs } = useAppContext();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Login': return <Key className="h-4 w-4 text-blue-500" />;
      case 'Create': return <FileText className="h-4 w-4 text-green-500" />;
      case 'Edit': return <Settings className="h-4 w-4 text-orange-500" />;
      case 'Status_Change': return <Activity className="h-4 w-4 text-purple-500" />;
      case 'View': return <Eye className="h-4 w-4 text-indigo-500" />;
      case 'Delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'Approve': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      default: return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    const m = method.toUpperCase();
    let bg = 'bg-slate-100 text-slate-700 border-slate-200';
    if (m === 'GET') bg = 'bg-blue-50 text-blue-700 border-blue-200';
    if (m === 'POST') bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (m === 'PUT') bg = 'bg-amber-50 text-amber-700 border-amber-200';
    if (m === 'DELETE') bg = 'bg-rose-50 text-rose-700 border-rose-200';

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${bg}`}>
        {m}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500">
            Secure, immutable log of all system activities, actions, and API endpoints accessed.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">API Accessed</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-50">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-700 flex items-center gap-2">
                    <div className="flex-shrink-0 bg-slate-100 p-1.5 rounded-full border border-slate-200">
                      {getActionIcon(log.action)}
                    </div>
                    {log.action}
                  </td>
                  <td className="px-4 py-3">
                    {log.apiEndpoint || log.apiMethod ? (
                      <div className="flex items-center gap-1.5">
                        {getMethodBadge(log.apiMethod)}
                        <span className="font-mono text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title={log.apiEndpoint}>
                          {log.apiEndpoint}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">No direct API record</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="font-medium text-slate-800">{log.details}</span>
                    <br/>
                    <span className="text-[10px] text-slate-400 font-mono">Entity: {log.entityType} ({log.entityId || 'N/A'})</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="font-medium">{log.userName}</span>
                    <br/>
                    <span className="text-[10px] text-slate-400">{log.userRole}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                    {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No audit logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
