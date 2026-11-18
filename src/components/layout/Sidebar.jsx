import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Layers, BookOpen, Airplay, Target,
  TrendingUp, GitFork, Award, FileBarChart, Bot,
  Users, ScrollText, Settings, LogOut, AlertTriangle,
  Fingerprint, CalendarClock, Calendar, FileClock, User
} from 'lucide-react';
import clsx from 'clsx';
import Avatar from '../ui/Avatar';
import BrandLogo from '../ui/BrandLogo';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useInsights } from '../../context/InsightsContext';

const adminMenuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/competency', label: 'Competency Management', icon: Layers },
  { path: '/learning', label: 'Learning Management', icon: BookOpen },
  { path: '/training', label: 'Training Management', icon: Airplay },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/performance', label: 'Performance Management', icon: TrendingUp },
  { path: '/succession', label: 'Succession Planning', icon: GitFork },
  { path: '/recognition', label: 'Social Recognition', icon: Award },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
  { path: '/analytics', label: 'AI Models', icon: Bot, badgeName: 'ai' },
  { path: '/employees', label: 'Employees', icon: Users },
  { path: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const employeeMenuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/my-attendance', label: 'My Attendance', icon: Fingerprint },
  { path: '/my-schedule', label: 'My Schedule', icon: CalendarClock },
  { path: '/leave', label: 'Leave Requests', icon: Calendar },
  { path: '/my-timesheet', label: 'My Timesheet', icon: FileClock },
  { path: '/my-profile', label: 'My Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const { user, logout } = useAuth();
  const { unresolvedCount } = useInsights();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const renderNavItem = (item) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path));

    return (
      <NavLink
        key={item.label}
        to={item.path}
        onClick={onClose}
        className={clsx(
          'flex items-center gap-3 px-3.5 h-[40px] rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 group',
          isActive
            ? 'bg-[#2563EB] text-white font-semibold shadow-sm shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-white/5'
        )}
      >
        <item.icon
          className={clsx(
            'w-[18px] h-[18px] flex-shrink-0 transition-colors duration-150',
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
          )}
        />
        <span className="truncate">{item.label}</span>
        {item.badgeName && unresolvedCount > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
            {unresolvedCount > 99 ? '99+' : unresolvedCount}
          </span>
        )}
      </NavLink>
    );
  };

  const handleSignOut = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 w-64 bg-[#0B132B] border-r border-slate-800/80 z-50 flex flex-col justify-between py-4 transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-col gap-3 overflow-hidden flex-1">
          {/* Logo Header */}
          <div className="px-5 py-2 flex items-center gap-2.5 flex-shrink-0">
            <BrandLogo variant="wordmark" className="h-10 w-auto filter brightness-105" />
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
            {currentRole === 'Employee' ? (
              <div className="space-y-0.5">
                {employeeMenuItems.map(renderNavItem)}
              </div>
            ) : (
              <div className="space-y-0.5">
                {adminMenuItems.map(renderNavItem)}
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="px-4 pt-3 border-t border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-xl bg-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar src={user?.avatar} firstName={user?.firstName} lastName={user?.lastName} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'System Admin'}
                </span>
                <span className="text-[10px] text-slate-400 truncate leading-tight">
                  {user?.roleLabel || currentRole || 'Admin'}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Confirm Logout" size="sm">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-base">Are you sure you want to logout?</p>
            <p className="text-gray-500 text-sm mt-1">You will be redirected to the sign-in enclave.</p>
          </div>
          <div className="flex items-center gap-3 mt-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setShowLogoutModal(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={confirmLogout}>Sign Out</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
