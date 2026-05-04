import { Bell, Calendar, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, School, Sun, Trophy, User as UserIcon, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import MembersList from './components/MembersList';
import Messaging from './components/Messaging';
import ScheduleManager from './components/ScheduleManager';
import SchoolsManager from './components/SchoolsManager';
import CoachManager from './components/CoachManager';

import StandingsManager from './components/StandingsManager';
import { AuthProvider, useAuth } from './context/AuthContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './lib/firebase';

function SidebarContent({ collapsed, onItemClick }: { collapsed: boolean; onItemClick?: () => void }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/members', label: 'Members', icon: Users },
    { path: '/coaches', label: 'Coaching staff', icon: UserIcon },
    { path: '/messaging', label: 'Messaging', icon: MessageSquare },
    { path: '/schedules', label: 'Schedules', icon: Calendar },
    { path: '/schools', label: 'Schools', icon: School },
    { path: '/standings', label: 'Standings', icon: Trophy },
  ];

  return (
    <div className="flex flex-col h-full bg-indigo-900 dark:bg-indigo-950 text-indigo-100 transition-colors duration-300">
      <div className={`p-2 flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
        <img src="/favicon.png" alt="Logo" className="w-15 h-10 rounded-xl shadow-lg border border-white/10" />
        {!collapsed && <span className="font-black text-xl tracking-tighter text-white uppercase">YAU Panel</span>}
      </div>

      <nav className={`flex-1 px-3 py-6 space-y-2 ${collapsed ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={`
                flex items-center p-3 rounded-2xl transition-all duration-200 group relative
                ${isActive
                  ? 'bg-white text-indigo-900 shadow-lg shadow-indigo-950/20'
                  : 'text-indigo-100 hover:bg-white/10'}
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon size={20} className={collapsed ? '' : 'min-w-[20px]'} />
              {!collapsed && <span className="ml-4 font-bold text-sm tracking-tight">{item.label}</span>}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-white text-gray-900 text-[13px] font-semibold rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 z-[200] whitespace-nowrap border border-gray-100 flex items-center justify-center">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-indigo-800/50 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? '' : 'space-x-3'} p-2 bg-indigo-800/30 rounded-xl`}>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/50 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-indigo-100" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Administrator</p>
              <p className="text-[10px] text-indigo-400 truncate">v1.2.0-STABLE</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

import { Loader2 } from 'lucide-react';

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPosts, setUnreadPosts] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    // Listen for admin posts with unread replies
    const q = query(collection(db, 'admin_posts'), where('adminUnreadCount', '>', 0));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      const posts: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        total += (data.adminUnreadCount || 0);
        posts.push({ id: doc.id, ...data });
      });
      setUnreadCount(total);
      setUnreadPosts(posts);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('admin-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('admin-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-indigo-950/20 overflow-hidden font-sans text-gray-900 dark:text-indigo-50 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col transition-all duration-300 ease-in-out border-r border-indigo-800/10 dark:border-white/5
          ${collapsed ? 'w-20 overflow-visible' : 'w-64'}
        `}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-indigo-950/60 backdrop-blur-sm z-[100] lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 w-72 bg-indigo-900 dark:bg-indigo-950 z-[101] lg:hidden transition-transform duration-300 transform
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent collapsed={false} onItemClick={() => setMobileMenuOpen(false)} />
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 text-indigo-300 hover:text-white"
        >
          <X size={24} />
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-black border-b border-gray-100 dark:border-white/10 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Menu size={24} />
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 text-gray-400 dark:text-white hover:text-indigo-600 transition-colors"
            >
              <Menu size={24} />
            </button>

            <div className="hidden md:block">
              <p className="text-[10px] font-black text-gray-400 dark:text-white uppercase tracking-[0.2em]">Administrative Control Center</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-indigo-900/50 text-gray-500 dark:text-indigo-300 hover:bg-gray-200 dark:hover:bg-indigo-800 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-gray-400 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-white relative transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-[8px] font-bold text-white shadow-sm translate-x-1 -translate-y-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {unreadPosts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500 font-bold">No new messages.</div>
                    ) : (
                      unreadPosts.map(post => (
                        <Link 
                          key={post.id} 
                          to="/messaging" 
                          onClick={() => setIsNotifOpen(false)}
                          className="block p-3 border-b border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate pr-2">{post.title}</span>
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded-md font-black">{post.adminUnreadCount} New</span>
                          </div>
                          <p className="text-[10px] text-gray-500 line-clamp-1">{post.description}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-white/10 hidden sm:block"></div>

            {/* Logout Button */}
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 p-2 px-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
            >
              <LogOut size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="w-full">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/members" element={<MembersList />} />
              <Route path="/messaging" element={<Messaging />} />
              <Route path="/coaches" element={<CoachManager />} />
              <Route path="/uniforms" element={<Navigate to="/" replace />} />
              <Route path="/schedules" element={<ScheduleManager />} />
              <Route path="/schools" element={<SchoolsManager />} />
              <Route path="/standings" element={<StandingsManager />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
