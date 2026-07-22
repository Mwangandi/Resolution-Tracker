import React from 'react';
import { useAppContext } from '../store';
import { DatabaseConnectionSettings } from '../components/DatabaseConnectionSettings';
import { Database, ShieldCheck, Server, ShieldAlert, Cpu } from 'lucide-react';

export function DatabaseConnection() {
  const { currentUser } = useAppContext();

  if (currentUser?.role !== 'System Administrator') {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-gradient-to-b from-red-50 to-red-100/50 border border-red-200 rounded-2xl shadow-sm text-center text-red-900 font-sans">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-xl tracking-tight text-red-950">Access Restricted</h3>
        <p className="text-sm text-red-700 max-w-md mx-auto mt-2 leading-relaxed">
          Database connection configuration and engine settings are reserved exclusively for accounts with the <strong className="font-semibold text-red-900">System Administrator</strong> role.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Database Connection</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-900 rounded-md border border-orange-200/80">
                <Cpu className="w-3 h-3 text-orange-700" />
                SysAdmin Console
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Manage database engines (SQLite 3, PostgreSQL, MariaDB/MySQL), configure credentials, test active latency, and monitor Prisma ORM schema models.
            </p>
          </div>
        </div>
      </div>

      {/* Main Database Settings Panel */}
      <DatabaseConnectionSettings />
    </div>
  );
}

