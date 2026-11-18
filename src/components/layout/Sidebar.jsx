import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, Calendar, FileText,
  CalendarDays, BarChart3, FileBarChart, Settings,
  LogOut, AlertTriangle, Fingerprint, CalendarClock, FileClock,
  SlidersHorizontal, ScrollText, User, Shield, ChevronDown
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

const adminMenuGroups = [
  {
    label: 'nav.group.main',
    items: [
      { path: '/', key: 'nav.dashboard', icon: LayoutDashboard },
      { path: '/employees', key: 'nav.employees', icon: Users },
    ],
  },
  {
    label: 'nav.group.attendance',
    items: [
      { path: '/attendance', key: 'nav.attendance', icon: Clock },
      { path: '/shifts', key: 'nav.shifts', icon: CalendarDays },
      { path: '/timesheets', key: 'nav.timesheets', icon: FileText },
    ],
  },
  {
    label: 'nav.group.leave',
    items: [
      { path: '/leave', key: 'nav.leave', icon: Calendar },
    ],
  },
  {
    label: 'nav.group.analytics',
    items: [
      { path: '/analytics', key: 'nav.analytics', icon: BarChart3, badgeName: 'ai' },
      { path: '/reports', key: 'nav.reports', icon: FileBarChart },
    ],
  },
  {
    label: 'nav.group.system',
    items: [
      { path: '/audit-logs', key: 'nav.auditLogs', icon: ScrollText },
      { path: '/kiosk-setup', key: 'nav.kioskSetup', icon: SlidersHorizontal },
      { path: '/settings', key: 'nav.settings', icon: Settings },
    ],
  },
];

const employeeMenuItems = [
  { path: '/', key: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/my-attendance', key: 'nav.myAttendance', icon: Fingerprint },
  { path: '/my-schedule', key: 'nav.mySchedule', icon: CalendarClock },
  { path: '/leave', key: 'nav.leaveEmployee', icon: Calendar },
  { path: '/my-timesheet', key: 'nav.timesheetsEmployee', icon: FileClock },
  { path: '/my-profile', key: 'nav.myProfile', icon: User },
  { path: '/settings', key: 'nav.settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { unresolvedCount } = useInsights();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const renderNavItem = (item) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path));
    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onClose}
        className={clsx(
          'flex items-center gap-3 px-3.5 h-[42px] rounded-xl text-[13px] font-medium transition-all duration-200 group',
          isActive
            ? 'bg-[#07203F] text-white shadow-sm shadow-[#07203F]/20 font-semibold'
            : 'text-[#44474E] hover:bg-[#F8F1FF] hover:text-[#000819]'
        )}
      >
        <item.icon className={clsx(
          'w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200',
          isActive ? 'text-white' : 'text-[#74777F] group-hover:text-[#07203F]'
        )} />
        <span className="truncate">{t(item.key)}</span>
        {item.badgeName && unresolvedCount > 0 && (
          <span className="ml-auto min-w-[20px] h-[20px] px-1.5 inline-flex items-center justify-center rounded-full bg-[#8F4C35] text-white text-[10px] font-bold">
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
          className="fixed inset-0 bg-[#000819]/40 z-40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-[#E2E8F0] z-50 flex flex-col justify-between py-5 shadow-xs transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Logo Header */}
          <div className="px-5 flex items-center gap-3 flex-shrink-0">
            <BrandLogo variant="icon" className="w-9 h-9" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base text-[#000819] font-['Plus_Jakarta_Sans'] tracking-tight leading-tight truncate">
                Archon Nell
              </span>
              <span className="text-[10px] font-semibold text-[#8F4C35] uppercase tracking-wider leading-tight">
                Workforce Core
              </span>
            </div>
          </div>

          {/* Node Selector Banner */}
          <div className="px-4">
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#F8F1FF] border border-[#E8DEFA] text-[#000819]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#8F4C35] shrink-0 animate-pulse" />
                <div className="text-left min-w-0">
                  <p className="text-[12px] font-semibold text-[#000819] leading-tight truncate">Global Operations</p>
                  <p className="text-[10px] text-[#44474E] leading-tight truncate">Tier-1 Primary Node</p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#74777F] shrink-0" />
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 overflow-y-auto space-y-1">
            {currentRole === 'Employee' ? (
              <div className="space-y-1">
                {employeeMenuItems.map(renderNavItem)}
              </div>
            ) : (
              <div className="space-y-1">
                {adminMenuGroups.map((group) => (
                  <div key={group.label} className="pt-2 first:pt-0">
                    <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#74777F]">
                      {t(group.label)}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map(renderNavItem)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="px-4 flex flex-col gap-3 pt-3 border-t border-[#E2E8F0] shrink-0">
          {/* Security Enclave Pill */}
          <div className="p-3 rounded-xl bg-[#F8F1FF] border border-[#E8DEFA] flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8F4C35] flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Security Enclave
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#8F4C35]" />
            </div>
            <p className="text-[11px] text-[#44474E] leading-snug">
              Zero Trust active on all cluster connections.
            </p>
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between gap-2.5 px-2 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar src={user?.avatar} firstName={user?.firstName} lastName={user?.lastName} size="sm" online />
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-[#000819] truncate leading-tight">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Executive Suite'}
                </span>
                <span className="text-[10px] text-[#74777F] truncate leading-tight">
                  {user?.roleLabel || currentRole || 'ID: AN-98102'}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg text-[#74777F] hover:text-[#93000A] hover:bg-red-50 transition-colors cursor-pointer"
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
