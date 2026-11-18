import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown,
  LogOut, User, Settings, HelpCircle, Menu,
  Sun, Moon, AlertTriangle, WifiOff, Wifi
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import NotificationDropdown from '../common/NotificationDropdown';
import GlobalSearch from '../common/GlobalSearch';
import { useNotifications } from '../../context/NotificationContext';

export default function Topbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { unreadCount } = useNotifications();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOut = () => {
    setShowProfile(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/*
        The header grows by the status-bar inset rather than being pushed down. A phone with a notch
        reports that inset through env(safe-area-inset-top) once viewport-fit=cover is set, and adding
        it as padding keeps the bar flush with the top of the screen - which is what an installed app
        looks like - instead of floating a strip of empty page above it. In a browser tab the value
        is 0 and the bar is the same 64px it always was.
      */}
      <header
        className="sticky top-0 z-30 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-3 sm:px-6"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(4rem + env(safe-area-inset-top))' }}
      >
      {/* Left: Menu toggle + Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuToggle}
          className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <GlobalSearch />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
            title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
          >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold ring-2 ring-white">
              {unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : '1'}
            </span>
          </button>
          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#1E40AF] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              {user?.firstName && user?.lastName
                ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                : 'SA'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'System Admin'}
              </p>
              <p className="text-[10px] text-slate-400 font-normal leading-tight">
                {user?.roleLabel || 'Admin'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 animate-scaleIn z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
              </div>
              <div className="py-1">
                {/* Only employees have a profile page; the HR Admin account has no employee record. */}
                {user?.role !== 'Administrator' && (
                  <button onClick={() => { navigate('/my-profile'); setShowProfile(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4 text-gray-400" /> {t('topbar.profile')}
                  </button>
                )}
                <button onClick={() => { navigate('/settings'); setShowProfile(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4 text-gray-400" /> {t('topbar.settings')}
                </button>
                <button onClick={() => { navigate('/help'); setShowProfile(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <HelpCircle className="w-4 h-4 text-gray-400" /> {t('topbar.help')}
                </button>
              </div>
              <div className="border-t border-gray-100 py-1">
                <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" /> {t('topbar.signOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Confirm Logout" size="sm">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-base">Are you sure you want to logout?</p>
            <p className="text-gray-500 text-sm mt-1">You will be redirected to the login page.</p>
          </div>
          <div className="flex items-center gap-3 mt-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setShowLogoutModal(false)}>No, Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={confirmLogout}>Yes, Logout</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
