import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import {
  Database,
  Server,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  Check,
  Copy,
  Download,
  Cpu,
  Zap,
  Globe,
  Sliders,
  Lock,
  Unlock,
  Info,
  Save,
  Radio,
  Eye,
  EyeOff,
  Activity,
  Terminal,
  FileCode2,
  Layers,
  Users,
  FileText,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export function DatabaseConnectionSettings() {
  const { currentUser } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Connection State
  const [dbData, setDbData] = useState<{
    provider: 'sqlite' | 'postgresql' | 'mariadb' | 'mysql';
    host: string;
    port: number;
    database: string;
    username: string;
    password?: string;
    ssl: 'disable' | 'require' | 'prefer';
    poolSize: number;
    useCustomUrl: boolean;
    connectionString: string;
    maskedEnvUrl: string;
    activeStatus: string;
    latencyMs: number;
    tablesCount: number;
    usersCount: number;
    resolutionsCount: number;
    auditCount: number;
    lastTested: string;
  }>({
    provider: 'sqlite',
    host: 'localhost',
    port: 5432,
    database: 'taita_taveta_db',
    username: 'postgres',
    password: '',
    ssl: 'disable',
    poolSize: 10,
    useCustomUrl: false,
    connectionString: '',
    maskedEnvUrl: 'file:./prisma/dev.db',
    activeStatus: 'connected',
    latencyMs: 6,
    tablesCount: 7,
    usersCount: 0,
    resolutionsCount: 0,
    auditCount: 0,
    lastTested: new Date().toISOString(),
  });

  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error';
    message: string;
    latencyMs?: number;
    tablesVerified?: string[];
  } | null>(null);

  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch current database settings
  const fetchDbSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/database');
      if (res.ok) {
        const data = await res.json();
        setDbData(prev => ({
          ...prev,
          ...data,
        }));
      }
    } catch (err) {
      console.error('Failed to load DB settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'System Administrator') {
      fetchDbSettings();
    }
  }, [currentUser]);

  // Handle engine change
  const handleSelectProvider = (prov: 'sqlite' | 'postgresql' | 'mariadb' | 'mysql') => {
    setTestResult(null);
    setSaveMessage(null);
    let defaultPort = 5432;
    if (prov === 'mariadb' || prov === 'mysql') defaultPort = 3306;
    if (prov === 'sqlite') defaultPort = 0;

    let defaultUser = dbData.username;
    if (prov === 'postgresql' && (!defaultUser || defaultUser === 'root')) defaultUser = 'postgres';
    if ((prov === 'mariadb' || prov === 'mysql') && (!defaultUser || defaultUser === 'postgres')) defaultUser = 'root';

    setDbData(prev => ({
      ...prev,
      provider: prov,
      port: defaultPort,
      username: defaultUser,
    }));
  };

  // Construct connection URL string preview
  const buildConnectionString = () => {
    if (dbData.useCustomUrl && dbData.connectionString) {
      return dbData.connectionString;
    }
    if (dbData.provider === 'sqlite') {
      return 'file:./prisma/dev.db';
    }
    const passPart = dbData.password ? `:${dbData.password}` : '';
    const userPart = dbData.username ? `${dbData.username}${passPart}@` : '';
    const portPart = dbData.port ? `:${dbData.port}` : '';
    const sslPart = dbData.ssl !== 'disable' ? `?sslmode=${dbData.ssl}` : '';

    if (dbData.provider === 'postgresql') {
      return `postgresql://${userPart}${dbData.host || 'localhost'}${portPart}/${dbData.database || 'taita_taveta_db'}${sslPart}`;
    }
    if (dbData.provider === 'mariadb' || dbData.provider === 'mysql') {
      return `mysql://${userPart}${dbData.host || 'localhost'}${portPart}/${dbData.database || 'taita_taveta_db'}`;
    }
    return '';
  };

  // Mask sensitive password in display string
  const getDisplayConnectionString = () => {
    const raw = buildConnectionString();
    if (!raw) return '';
    return raw.replace(/:([^:@]+)@/, ':••••••••@');
  };

  const handleCopyUrl = () => {
    const connStr = buildConnectionString();
    navigator.clipboard.writeText(connStr);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Test connection handler
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setSaveMessage(null);

    const payload = {
      provider: dbData.provider,
      host: dbData.host,
      port: dbData.port,
      database: dbData.database,
      username: dbData.username,
      password: dbData.password,
      ssl: dbData.ssl,
      useCustomUrl: dbData.useCustomUrl,
      connectionString: buildConnectionString(),
    };

    try {
      const res = await fetch('/api/settings/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({
          type: 'success',
          message: data.message || 'Database connection test passed!',
          latencyMs: data.latencyMs,
          tablesVerified: data.details?.tablesVerified,
        });
      } else {
        setTestResult({
          type: 'error',
          message: data.message || 'Database connection test failed. Please check credentials.',
        });
      }
    } catch (err: any) {
      setTestResult({
        type: 'error',
        message: 'Network error occurred while testing database connection.',
      });
    } finally {
      setTesting(false);
    }
  };

  // Save database settings
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    const fullConnUrl = buildConnectionString();

    const payload = {
      provider: dbData.provider,
      host: dbData.host,
      port: Number(dbData.port),
      database: dbData.database,
      username: dbData.username,
      password: dbData.password,
      ssl: dbData.ssl,
      poolSize: Number(dbData.poolSize),
      useCustomUrl: dbData.useCustomUrl,
      connectionString: fullConnUrl,
    };

    try {
      const res = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSaveMessage({
          type: 'success',
          message: data.message || 'Database configuration saved successfully!',
        });

        // Log Audit Trail
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser?.id,
            userName: currentUser?.name,
            userRole: currentUser?.role,
            action: 'Edit',
            entityType: 'System',
            entityId: 'db-connection-config',
            details: `Database connection provider updated to ${dbData.provider.toUpperCase()} (${dbData.host}:${dbData.port}/${dbData.database})`,
            apiEndpoint: '/api/settings/database',
            apiMethod: 'POST',
          }),
        });

        fetchDbSettings();
      } else {
        setSaveMessage({
          type: 'error',
          message: data.message || 'Failed to save database configuration.',
        });
      }
    } catch (err) {
      setSaveMessage({
        type: 'error',
        message: 'Network error occurred while saving database configuration.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (currentUser?.role !== 'System Administrator') {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center text-red-900 font-sans">
        <ShieldCheck className="w-10 h-10 mx-auto text-red-500 mb-2" />
        <h3 className="font-extrabold text-lg">Access Restricted</h3>
        <p className="text-sm mt-1 text-red-700">Database connection settings are reserved exclusively for System Administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-3xs flex flex-col items-center justify-center py-20 text-slate-500 gap-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-600" />
        <span className="font-semibold text-sm text-slate-700">Connecting to database telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Active Database Status Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-3xs border border-slate-200/90 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100/80 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Database className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  CONNECTED & ACTIVE
                </span>
                <span className="text-[11px] text-slate-600 uppercase tracking-widest font-extrabold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                  Dialect: {dbData.provider.toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
                {dbData.provider === 'sqlite'
                  ? 'SQLite 3 (Embedded File)'
                  : dbData.provider === 'postgresql'
                  ? 'PostgreSQL Enterprise Engine'
                  : 'MariaDB / MySQL Enterprise Server'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-mono break-all flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{dbData.maskedEnvUrl}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-t lg:border-t-0 lg:border-l border-slate-200/80 pt-5 lg:pt-0 lg:pl-6 shrink-0">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Latency</span>
              <span className="text-base font-extrabold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                {dbData.latencyMs}ms
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Tables</span>
              <span className="text-base font-extrabold text-slate-800 mt-0.5 block flex items-center justify-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                {dbData.tablesCount}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Users</span>
              <span className="text-base font-extrabold text-slate-800 mt-0.5 block flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                {dbData.usersCount}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Resolutions</span>
              <span className="text-base font-extrabold text-orange-700 mt-0.5 block flex items-center justify-center gap-1">
                <FileText className="w-3.5 h-3.5 text-orange-600" />
                {dbData.resolutionsCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Select Database Engine */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-3xs p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-orange-600" />
              Select Database Provider Engine
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose the target relational engine for storing resolution records, user profiles, and audit trails.
            </p>
          </div>
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest self-start sm:self-auto bg-slate-100 px-2.5 py-1 rounded-md">
            Prisma ORM Supported
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SQLite Option */}
          <div
            onClick={() => handleSelectProvider('sqlite')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              dbData.provider === 'sqlite'
                ? 'border-orange-500 bg-orange-50/30 shadow-md ring-2 ring-orange-500/20'
                : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
            }`}
          >
            {dbData.provider === 'sqlite' && (
              <span className="absolute top-4 right-4 text-orange-600">
                <CheckCircle2 className="w-5 h-5 fill-orange-600 text-white" />
              </span>
            )}
            <div>
              <div className="w-11 h-11 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-800 flex items-center justify-center font-bold mb-3 shadow-2xs">
                <HardDrive className="w-5 h-5 text-amber-700" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">SQLite 3</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Local file-based embedded SQL database. Zero external setup required. Ideal for standalone setups and preview deployments.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="font-mono text-slate-600">file:./prisma/dev.db</span>
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-extrabold text-[10px] uppercase">Embedded</span>
            </div>
          </div>

          {/* PostgreSQL Option */}
          <div
            onClick={() => handleSelectProvider('postgresql')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              dbData.provider === 'postgresql'
                ? 'border-orange-500 bg-orange-50/30 shadow-md ring-2 ring-orange-500/20'
                : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
            }`}
          >
            {dbData.provider === 'postgresql' && (
              <span className="absolute top-4 right-4 text-orange-600">
                <CheckCircle2 className="w-5 h-5 fill-orange-600 text-white" />
              </span>
            )}
            <div>
              <div className="w-11 h-11 rounded-xl bg-blue-100/80 border border-blue-200 text-blue-800 flex items-center justify-center font-bold mb-3 shadow-2xs">
                <Database className="w-5 h-5 text-blue-700" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">PostgreSQL</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enterprise object-relational database. Supports high concurrency, complex transactions, and Cloud SQL / AWS RDS hosting.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Port: 5432</span>
              <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-extrabold text-[10px] uppercase">Recommended</span>
            </div>
          </div>

          {/* MariaDB / MySQL Option */}
          <div
            onClick={() => handleSelectProvider('mariadb')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              dbData.provider === 'mariadb' || dbData.provider === 'mysql'
                ? 'border-orange-500 bg-orange-50/30 shadow-md ring-2 ring-orange-500/20'
                : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
            }`}
          >
            {(dbData.provider === 'mariadb' || dbData.provider === 'mysql') && (
              <span className="absolute top-4 right-4 text-orange-600">
                <CheckCircle2 className="w-5 h-5 fill-orange-600 text-white" />
              </span>
            )}
            <div>
              <div className="w-11 h-11 rounded-xl bg-teal-100/80 border border-teal-200 text-teal-800 flex items-center justify-center font-bold mb-3 shadow-2xs">
                <Server className="w-5 h-5 text-teal-700" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">MariaDB / MySQL</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                High-performance open-source relational database server with wide cloud hosting and clustering support.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Port: 3306</span>
              <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-extrabold text-[10px] uppercase">Enterprise</span>
            </div>
          </div>
        </div>

        {/* Input Mode Toggle */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-600" />
              Connection Input Mode
            </label>
            <p className="text-xs text-slate-500 mt-0.5">Switch between structured form parameters and raw connection string URL.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDbData(prev => ({ ...prev, useCustomUrl: false }))}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                !dbData.useCustomUrl
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Structured Parameters
            </button>
            <button
              type="button"
              onClick={() => setDbData(prev => ({ ...prev, useCustomUrl: true }))}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                dbData.useCustomUrl
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Custom Connection URL
            </button>
          </div>
        </div>

        {/* Database Form Fields */}
        <form onSubmit={handleSaveConnection} className="space-y-6">
          {dbData.useCustomUrl ? (
            /* Custom Connection URL Input */
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Database Connection URL (DATABASE_URL)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dbData.connectionString}
                  onChange={(e) => setDbData(prev => ({ ...prev, connectionString: e.target.value }))}
                  placeholder={
                    dbData.provider === 'postgresql'
                      ? 'postgresql://user:password@localhost:5432/taita_taveta_db?sslmode=disable'
                      : dbData.provider === 'mariadb' || dbData.provider === 'mysql'
                      ? 'mysql://user:password@localhost:3306/taita_taveta_db'
                      : 'file:./prisma/dev.db'
                  }
                  className="w-full px-4 py-3 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Specify the complete database connection string formatted for Prisma ORM.
              </p>
            </div>
          ) : dbData.provider === 'sqlite' ? (
            /* SQLite specific info */
            <div className="bg-amber-50/80 p-5 rounded-xl border border-amber-200 space-y-2 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>SQLite Embedded File Configuration</span>
              </div>
              <p className="leading-relaxed">
                The application uses a local file database stored at <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900 font-bold">/prisma/dev.db</code>. No server address, port, or user authentication credentials are required.
              </p>
            </div>
          ) : (
            /* Standard Parameters Form for PostgreSQL & MariaDB/MySQL */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Server Host / IP Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={dbData.host}
                    onChange={(e) => setDbData(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="localhost or postgres.example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Port Number
                </label>
                <input
                  type="number"
                  required
                  value={dbData.port}
                  onChange={(e) => setDbData(prev => ({ ...prev, port: parseInt(e.target.value) || 0 }))}
                  placeholder={dbData.provider === 'postgresql' ? '5432' : '3306'}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Database Name
                </label>
                <input
                  type="text"
                  required
                  value={dbData.database}
                  onChange={(e) => setDbData(prev => ({ ...prev, database: e.target.value }))}
                  placeholder="taita_taveta_db"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Database Username
                </label>
                <input
                  type="text"
                  required
                  value={dbData.username}
                  onChange={(e) => setDbData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder={dbData.provider === 'postgresql' ? 'postgres' : 'root'}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Database Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={dbData.password || ''}
                    onChange={(e) => setDbData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter database password"
                    className="w-full pl-4 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  SSL / TLS Mode
                </label>
                <select
                  value={dbData.ssl}
                  onChange={(e) => setDbData(prev => ({ ...prev, ssl: e.target.value as any }))}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                >
                  <option value="disable">Disable SSL (Default Local)</option>
                  <option value="require">Require SSL (Cloud SQL / RDS)</option>
                  <option value="prefer">Prefer SSL</option>
                </select>
              </div>
            </div>
          )}

          {/* Connection URL Preview Box */}
          <div className="bg-slate-50 text-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                </div>
                <span className="text-slate-600 font-mono text-[11px] ml-1">DATABASE_URL Preview</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 text-xs text-orange-700 hover:text-orange-800 cursor-pointer font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs transition-all"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs break-all bg-white p-3.5 rounded-xl border border-slate-200 text-slate-800 select-all leading-relaxed shadow-2xs">
              {getDisplayConnectionString()}
            </div>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-5 rounded-2xl border flex items-start gap-3.5 text-xs ${
                testResult.type === 'success'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : 'bg-red-50/90 border-red-200 text-red-950'
              }`}
            >
              {testResult.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5">
                <span className="font-bold text-sm block">{testResult.message}</span>
                {testResult.latencyMs !== undefined && (
                  <p className="text-emerald-800 font-medium">
                    Diagnostic Roundtrip Latency: <strong className="font-extrabold">{testResult.latencyMs} ms</strong>
                  </p>
                )}
                {testResult.tablesVerified && (
                  <p className="text-emerald-900 text-[11px] leading-relaxed">
                    Verified Schema Models: <code className="bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono text-emerald-900 font-bold">{testResult.tablesVerified.join(', ')}</code>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Save Result Message */}
          {saveMessage && (
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="font-bold text-sm">{saveMessage.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                  <span>Testing Connection...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-slate-600" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md shadow-orange-600/20 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Save & Apply Connection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Migration & Schema Synchronization Guide */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-3xs">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-orange-600" />
            Prisma ORM Schema Synchronization & Deployment
          </h4>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference Documentation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-2">
            <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black">1</span>
              Prisma Provider Configuration
            </h5>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              When migrating from SQLite to PostgreSQL or MariaDB, update the datasource provider inside <code className="bg-slate-100 px-1 rounded font-mono text-slate-800">prisma/schema.prisma</code>:
            </p>
            <div className="bg-slate-100 text-slate-800 p-3 rounded-lg text-[11px] font-mono leading-relaxed border border-slate-200 font-semibold">
              datasource db &#123;<br />
              &nbsp;&nbsp;provider = "{dbData.provider}"<br />
              &nbsp;&nbsp;url&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= env("DATABASE_URL")<br />
              &#125;
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-2">
            <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black">2</span>
              Push Schema & Seed Database
            </h5>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              After applying your connection settings, execute the schema sync command to prepare tables and initial admin seed data:
            </p>
            <div className="bg-slate-100 text-slate-800 p-3 rounded-lg text-[11px] font-mono leading-relaxed space-y-1 border border-slate-200">
              <div className="text-slate-500 font-normal"># Push models to database engine</div>
              <div className="text-slate-900 font-bold">npx prisma db push</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
