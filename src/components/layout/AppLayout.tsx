import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { useAppContext } from '../../store';
// @ts-ignore
import taitaTavetaLogo from '../../assets/images/taita_taveta_logo_1784192264343.jpg';
import {
  LayoutDashboard,
  FileText,
  Activity,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Shield,
  Settings,
  Users,
  Check,
  Database
} from 'lucide-react';
import { clsx } from 'clsx';

export function AppLayout() {
  const { currentUser, logout, resolutions, auditLogs, logAudit, customLogo, searchTerm, setSearchTerm } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen]);

  // Client-side persistence for read notifications
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markAsRead = (id: string) => {
    setReadNotificationIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('read_notifications', JSON.stringify(next));
      return next;
    });
  };

  // Derive real notifications from audit logs that correspond to existing resolutions
  const realNotifications = React.useMemo(() => {
    if (!auditLogs || !resolutions) return [];
    
    return auditLogs
      .filter(log => {
        if (log.entityType !== 'Resolution' && log.entityType !== 'Document') {
          return false;
        }
        if (log.action === 'Delete' && log.entityType === 'Resolution') {
          return false;
        }
        if (log.action === 'View') {
          return false;
        }
        return resolutions.some(res => res.id === log.entityId);
      })
      .map(log => {
        const res = resolutions.find(r => r.id === log.entityId)!;
        
        let title = 'Resolution Updated';
        let description = log.details;

        if (log.action === 'Create' && log.entityType === 'Resolution') {
          title = 'New Resolution Registered';
          description = `Resolution ${res.referenceNumber} was registered by ${log.userName}.`;
        } else if (log.action === 'Status_Change') {
          title = 'Status Changed';
          description = `${res.referenceNumber} status changed to "${res.status}".`;
        } else if (log.details.toLowerCase().includes('comment')) {
          title = 'New Comment Added';
          description = `${log.userName} commented on ${res.referenceNumber}.`;
        } else if (log.details.toLowerCase().includes('document')) {
          title = 'Document Uploaded';
          description = `${log.userName} uploaded a document for ${res.referenceNumber}.`;
        } else if (log.details.toLowerCase().includes('executive update')) {
          title = 'Executive Update';
          description = `${log.userName} submitted an executive update for ${res.referenceNumber}.`;
        } else if (log.action === 'Approve') {
          title = 'Update Approved';
          description = `${log.userName} approved progress update on ${res.referenceNumber}.`;
        }

        return {
          id: log.id,
          resolutionId: res.id,
          referenceNumber: res.referenceNumber,
          title,
          description,
          timestamp: new Date(log.timestamp),
          userName: log.userName,
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [auditLogs, resolutions]);

  const formatTimeAgo = (date: Date) => {
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleNotificationClick = (notificationId: string, resolutionId: string) => {
    markAsRead(notificationId);
    setNotificationsOpen(false);
    navigate(`/resolutions/${resolutionId}`);
  };

  // Protected route check
  React.useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const lastLoggedPathRef = React.useRef<string>('');

  React.useEffect(() => {
    if (!currentUser || !location.pathname) return;
    
    // Skip if we already logged this exact path in this render cycle
    if (lastLoggedPathRef.current === location.pathname) return;
    lastLoggedPathRef.current = location.pathname;

    let pageName = '';
    let details = '';
    let entityType: any = 'System';
    let entityId = 'system';

    if (location.pathname === '/dashboard') {
      pageName = 'Dashboard';
      details = 'Viewed Dashboard';
    } else if (location.pathname === '/resolutions') {
      pageName = 'Resolutions List';
      details = 'Viewed Resolutions List';
      entityType = 'Resolution';
    } else if (location.pathname.startsWith('/resolutions/')) {
      const parts = location.pathname.split('/');
      const id = parts[parts.length - 1];
      if (id && id !== 'new') {
        const res = resolutions.find(r => r.id === id);
        pageName = 'Resolution Details';
        details = res 
          ? `Viewed Resolution: ${res.referenceNumber} - ${res.title}`
          : `Viewed Resolution details for ID: ${id}`;
        entityType = 'Resolution';
        entityId = id;
      } else if (id === 'new') {
        pageName = 'Create Resolution';
        details = 'Viewed Create Resolution form';
        entityType = 'Resolution';
      }
    } else if (location.pathname === '/settings') {
      pageName = 'System Settings';
      details = 'Viewed System Settings';
    } else if (location.pathname === '/users') {
      pageName = 'User Management';
      details = 'Viewed User Management';
      entityType = 'User';
    } else if (location.pathname === '/audit-logs') {
      pageName = 'Audit Logs';
      details = 'Viewed Audit Logs';
    }

    if (pageName) {
      logAudit('View', entityType, entityId, details, `/api/pages${location.pathname}`, 'GET');
    }
  }, [location.pathname, currentUser, resolutions, logAudit]);

  if (!currentUser) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Resolutions', href: '/resolutions', icon: FileText },
    ...(['ICT', 'System Administrator', 'ICT Director', 'County Assembly Clerk', 'Assistant County Assembly Clerk'].includes(currentUser.role)
      ? [{ name: 'System Settings', href: '/settings', icon: Settings }] 
      : []),
    ...(['ICT', 'System Administrator', 'ICT Director'].includes(currentUser.role)
      ? [{ name: 'User Management', href: '/users', icon: Users }] 
      : []),
    ...(currentUser.role === 'System Administrator'
      ? [{ name: 'Database Connection', href: '/database-connection', icon: Database }] 
      : []),
    ...(['ICT', 'System Administrator', 'ICT Director'].includes(currentUser.role)
      ? [{ name: 'Audit Logs', href: '/audit-logs', icon: Activity }] 
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-900 bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-30 w-64 bg-orange-600 shadow-xl flex flex-col text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-orange-500/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-0.5 shadow-md overflow-hidden shrink-0">
              <img 
                src={customLogo || taitaTavetaLogo} 
                alt="Taita Taveta County Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight uppercase tracking-wider">Taita Taveta</h1>
              <p className="text-orange-100 text-xs opacity-80">Resolution Tracker</p>
            </div>
          </div>
          <button className="md:hidden text-orange-200 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col">
          <div className="px-6 mb-2 text-[10px] uppercase font-semibold text-orange-200 tracking-widest">Main Menu</div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/');
              return (
                <React.Fragment key={item.name}>
                  <Link
                    to={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-6 py-3 transition-colors",
                      isActive 
                        ? "bg-white/10 text-white border-l-4 border-yellow-400 font-medium" 
                        : "text-orange-100 hover:bg-white/5 border-l-4 border-transparent"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                  </Link>
                </React.Fragment>
              );
            })}
          </div>

          <hr className="border-white/20 my-2 mx-6" />

          <div className="p-4 mt-2">
            <div className="bg-orange-700/40 rounded-xl p-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white/20">
                  {currentUser.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
                  <p className="text-orange-200 text-[10px] truncate uppercase">{currentUser.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-medium text-orange-200 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 shadow-sm z-10 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center w-full max-w-xl">
            <button
              className="md:hidden text-slate-500 hover:text-slate-700 focus:outline-none mr-4"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden md:flex flex-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input 
                type="text" 
                placeholder="Search by Reference Number or Title..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (location.pathname !== '/resolutions' && !location.pathname.startsWith('/resolutions/')) {
                    navigate('/resolutions');
                  }
                }}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6 ml-4">
            <div className="relative" ref={notificationsRef}>
              <button 
                className="text-slate-500 hover:text-slate-700 focus:outline-none relative p-1"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                {realNotifications.filter(n => !readNotificationIds.includes(n.id)).length > 0 && (
                  <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white">
                    {realNotifications.filter(n => !readNotificationIds.includes(n.id)).length}
                  </div>
                )}
                <Bell className="w-6 h-6" />
              </button>
              
              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-96 md:w-[480px] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-50">
                  <div className="px-4 py-3 flex items-center justify-between bg-slate-50 rounded-t-md">
                    <p className="text-xs text-gray-900 font-bold uppercase tracking-wider">Notifications</p>
                    {realNotifications.filter(n => !readNotificationIds.includes(n.id)).length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const allIds = realNotifications.map(n => n.id);
                          setReadNotificationIds(allIds);
                          localStorage.setItem('read_notifications', JSON.stringify(allIds));
                        }}
                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {realNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-gray-400">
                        No notifications found
                      </div>
                    ) : (
                      realNotifications.map(notification => {
                        const isRead = readNotificationIds.includes(notification.id);
                        return (
                          <div 
                            key={notification.id} 
                            onClick={() => handleNotificationClick(notification.id, notification.resolutionId)}
                            className={clsx(
                              "px-4 py-3 cursor-pointer transition-colors border-l-2 flex items-start gap-2 group/item",
                              isRead 
                                ? "opacity-50 bg-slate-50/50 border-l-transparent hover:bg-slate-100/60" 
                                : "border-l-orange-500 hover:bg-orange-50/40 bg-white"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={clsx("text-xs font-bold", isRead ? "text-slate-500" : "text-slate-800")}>
                                {notification.title}
                              </p>
                              <p className={clsx("text-xs mt-0.5 leading-normal", isRead ? "text-slate-400" : "text-slate-600")}>
                                {notification.description}
                              </p>
                              <p className="text-[10px] text-orange-600 mt-1.5 font-bold flex items-center gap-1">
                                {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                            {!isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                title="Mark as Read"
                                className="p-1 text-slate-400 hover:text-green-600 hover:bg-slate-100 rounded-md transition-colors self-center"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {['ICT', 'System Administrator', 'ICT Director'].includes(currentUser.role) && (
                    <div className="px-4 py-2 text-center border-t border-gray-100 bg-gray-50/50">
                      <Link 
                        to="/audit-logs" 
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        View Audit Logs
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Download Report / New Resolution buttons would ideally go here if we had them in AppLayout instead of specific pages */}
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
