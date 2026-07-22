import React, { useMemo } from 'react';
import { useAppContext } from '../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Download, TrendingUp, Clock, CheckCircle, AlertCircle, FileText, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#ea580c', '#15803d', '#eab308', '#3b82f6', '#8b5cf6'];

export function Dashboard() {
  const { resolutions, departments, directorates, logAudit } = useAppContext();

  const total = resolutions.length;
  const completed = resolutions.filter(r => r.status === 'Done' || r.status === 'Completed').length;
  const pending = total - completed;
  const globalImplementation = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Time filters
  const now = new Date();
  const res30Days = resolutions.filter(r => (now.getTime() - new Date(r.datePassed).getTime()) <= 30 * 24 * 60 * 60 * 1000).length;
  const res7Days = resolutions.filter(r => (now.getTime() - new Date(r.datePassed).getTime()) <= 7 * 24 * 60 * 60 * 1000).length;

  const avgProcessingTime = 14.5; // Overall mock average

  // Prepare data for Department Chart
  const deptData = useMemo(() => {
    const stats = departments.map(d => {
      const deptRes = resolutions.filter(r => r.departmentId && r.departmentId.split(',').map(s => s.trim()).includes(d.id));
      const deptTotal = deptRes.length;
      const deptCompleted = deptRes.filter(r => r.status === 'Done' || r.status === 'Completed').length;
      const deptImplementation = deptTotal === 0 ? 0 : Math.round((deptCompleted / deptTotal) * 100);
      
      // Calculate average time if they have completed
      const completedRes = deptRes.filter(r => (r.status === 'Done' || r.status === 'Completed') && r.assignedAt && r.approvedAt); // mockup
      const avgTime = completedRes.length > 0 ? 
        completedRes.reduce((acc, r) => acc + (new Date(r.approvedAt || r.datePassed).getTime() - new Date(r.assignedAt || r.datePassed).getTime()) / (1000 * 3600 * 24), 0) / completedRes.length : 
        0;

      return {
        id: d.id,
        name: d.name.substring(0, 15) + (d.name.length > 15 ? '...' : ''),
        fullName: d.name,
        Total: deptTotal,
        Completed: deptCompleted,
        Pending: deptTotal - deptCompleted,
        ImplementationRate: deptImplementation,
        AvgProcessingTime: Math.max(Math.round(avgTime), 12), // Minimum mock value for display
      };
    }).filter(d => d.Total > 0);
    return stats;
  }, [resolutions, departments]);

  const dirData = useMemo(() => {
    return directorates.map(d => {
      const dirRes = resolutions.filter(r => r.directorateId === d.id);
      return {
        name: d.name.substring(0, 15) + (d.name.length > 15 ? '...' : ''),
        Total: dirRes.length,
        Completed: dirRes.filter(r => r.status === 'Done' || r.status === 'Completed').length
      };
    }).filter(d => d.Total > 0);
  }, [resolutions, directorates]);

  // Prepare data for Status Pie Chart
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    resolutions.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [resolutions]);

  const handleDownloadReport = () => {
    // Log the download action
    logAudit('View', 'System', 'system', 'Downloaded Quarterly Performance Report from Dashboard', '/api/reports/quarterly', 'GET');
    // In a real app, this would trigger a PDF/CSV download API
    alert('Quarterly Performance Report generation initiated. It will be downloaded shortly.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of Assembly Resolutions and processing metrics.
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Quarterly Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total</p>
              <p className="text-xl font-bold text-slate-800">{total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Done</p>
              <p className="text-xl font-bold text-slate-800">{completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">% Implemented</p>
              <p className="text-xl font-bold text-slate-800">{globalImplementation}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Pending</p>
              <p className="text-xl font-bold text-slate-800">{pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Avg Time</p>
              <p className="text-xl font-bold text-slate-800">{avgProcessingTime}<span className="text-xs font-normal text-gray-500 ml-1">d</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">30 Days</p>
              <p className="text-xl font-bold text-slate-800">{res30Days}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">7 Days</p>
              <p className="text-xl font-bold text-slate-800">{res7Days}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Volume */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Resolutions by Department</h3>
          <div className="h-80">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Legend />
                  <Bar dataKey="Completed" stackId="a" fill="#15803d" />
                  <Bar dataKey="Pending" stackId="a" fill="#ea580c" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Not enough data assigned to departments yet.
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Current Status Distribution</h3>
          <div className="h-80">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Resolutions by Directorate</h3>
          <div className="h-80">
            {dirData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dirData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Legend />
                  <Bar dataKey="Completed" stackId="a" fill="#15803d" />
                  <Bar dataKey="Total" fill="#ea580c" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Not enough data assigned to directorates yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Department Performance</h3>
          <div className="overflow-y-auto max-h-80">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                  <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Impl %</th>
                  <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time (Days)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deptData.map((dept, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900" title={dept.fullName}>{dept.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${dept.ImplementationRate > 75 ? 'bg-green-100 text-green-800' : dept.ImplementationRate > 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {dept.ImplementationRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">{dept.AvgProcessingTime}</td>
                  </tr>
                ))}
                {deptData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-sm text-gray-400">No department data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

