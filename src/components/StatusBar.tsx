import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Plus, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Globe,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Check,
  Eye
} from 'lucide-react';
import { Transition } from '@headlessui/react';
import { useStatsContext } from '../domains/stats/context/StatsContext';
import { formatCurrency } from '../domains/stats/utils/stats.utils';
import { API_BASE_URL } from '../config/constants';
import { secureApiClient } from '../config/api';
import { ApiResponse } from '../domains/auth/types/auth.types';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, isYesterday, isThisWeek } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface StatusBarProps {
  token: string | null;
  userRole: string;
  userEmail: string;
  company: any;
  i18n: any;
  t: any;
  handleLogout: () => void;
  toggleLanguage: () => void;
  sidebarCollapsed: boolean;
  isMobile: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({
  token,
  userRole,
  userEmail,
  company,
  i18n,
  t,
  handleLogout,
  toggleLanguage,
  sidebarCollapsed,
  isMobile
}) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month'>('month');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { stats, fetchNavbarStats } = useStatsContext();

  // Fetch unread count on mount and when notification actions occur
  const fetchUnreadCount = async () => {
    try {
      const res = await secureApiClient.get(`${API_BASE_URL}/notifications/counts`);
      const data: ApiResponse<any> = await res.json();
      if (res.ok && data.succeeded) {
        setUnreadCount(data.data?.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (userRole !== 'Clerk') {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setPeriodDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (notificationOpen && userRole !== 'Clerk') {
      setNotificationsLoading(true);
      setNotificationsError(null);
      (async () => {
        try {
          const res = await secureApiClient.get(`${API_BASE_URL}/notifications?page=1&pageSize=5&includeRead=true`);
          
          const data: ApiResponse<any> = await res.json();
          if (!res.ok || !data.succeeded) {
            const errorMsg = (data.errors && data.errors.length > 0) ? data.errors.join(', ') : (data.message || 'Failed to fetch notifications');
            throw new Error(errorMsg);
          }
          setNotifications(data.data?.items || []);
        } catch (err: any) {
          let errorMessage = err.message || 'Error fetching notifications';
          
          // Handle network error
          if (errorMessage === 'NETWORK_ERROR') {
            errorMessage = t('errors.networkError');
          }
          
          setNotificationsError(errorMessage);
        } finally {
          setNotificationsLoading(false);
        }
      })();
    }
  }, [notificationOpen, userRole]);

  const currentMonthRevenue = stats.navbarStats?.periodRevenue 
    ? `${stats.navbarStats.periodRevenue.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} MAD`
    : `${(0).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} MAD`;
  const pendingPayments = stats.overdueStats?.count || stats.navbarStats?.overdueStats?.count || 0;
  const pendingAmount = stats.overdueStats?.totalAmount || stats.navbarStats?.overdueStats?.totalAmount
    ? `${(stats.overdueStats?.totalAmount || stats.navbarStats?.overdueStats?.totalAmount || 0).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} MAD`
    : `${(0).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} MAD`;

  const periodOptions = [
    { value: 'today', label: t('common.today') || "Aujourd'hui" },
    { value: 'week', label: t('common.thisWeek') || 'Cette semaine' },
    { value: 'month', label: t('common.thisMonth') || 'Ce mois' }
  ];

  function timeAgo(dateString: string) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = differenceInSeconds(now, date);
    const minutes = differenceInMinutes(now, date);
    const hours = differenceInHours(now, date);
    const days = differenceInDays(now, date);
    const lang = i18n.language === 'fr' ? 'fr' : 'en';
    
    if (seconds < 30) return t('notifications.time.justNow') || (lang === 'fr' ? "À l'instant" : 'Just now');
    if (minutes < 60) return t('notifications.time.minutesAgo', { count: minutes }) || (lang === 'fr' ? `il y a ${minutes} minute${minutes > 1 ? 's' : ''}` : `${minutes} min${minutes > 1 ? 's' : ''} ago`);
    if (hours < 24) return t('notifications.time.hoursAgo', { count: hours }) || (lang === 'fr' ? `il y a ${hours} heure${hours > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`);
    if (isYesterday(date)) return t('notifications.time.yesterday') || (lang === 'fr' ? 'Hier' : 'Yesterday');
    if (isThisWeek(date, { weekStartsOn: 1, locale: lang === 'fr' ? fr : enUS })) return t('notifications.time.thisWeek') || (lang === 'fr' ? 'Cette semaine' : 'This week');
    return format(date, 'P', { locale: lang === 'fr' ? fr : enUS });
  }

  return (
    <div className={`
      fixed top-0 h-16 bg-white border-b border-gray-200 shadow-sm z-30 flex items-center transition-all duration-300
      ${isMobile ? 'left-0 right-0' : (sidebarCollapsed ? 'left-20 right-0' : 'left-64 right-0')}
    `}>
      <div className="w-full px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
                         {userRole !== 'Clerk' && (
              <div className="hidden lg:flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="text-gray-400" size={18} />
                  <span className="text-sm font-medium text-gray-600">{stats.navbarStats?.period || t('common.december2024')}:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {stats.loading.navbar ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    ) : (
                      currentMonthRevenue
                    )}
                  </span>

                 <div className="relative ml-3" ref={periodDropdownRef}>
                   <button
                     onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
                     className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                   >
                     <span>{periodOptions.find(opt => opt.value === periodFilter)?.label}</span>
                     <ChevronDown size={14} className={`text-gray-500 transition-transform ${periodDropdownOpen ? 'rotate-180' : ''}`} />
                   </button>
                   
                   <Transition
                     show={periodDropdownOpen}
                     enter="transition ease-out duration-200"
                     enterFrom="transform opacity-0 scale-95"
                     enterTo="transform opacity-100 scale-100"
                     leave="transition ease-in duration-75"
                     leaveFrom="transform opacity-100 scale-100"
                     leaveTo="transform opacity-0 scale-95"
                   >
                     <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                       {periodOptions.map((option) => (
                         <button
                           key={option.value}
                           onClick={() => {
                             setPeriodFilter(option.value as any);
                             setPeriodDropdownOpen(false);
                             fetchNavbarStats(option.value as any);
                           }}
                           className={`
                             w-full text-left px-3 py-2 text-sm transition-colors
                             ${periodFilter === option.value 
                               ? 'bg-blue-50 text-blue-600 font-medium' 
                               : 'text-gray-700 hover:bg-gray-50'
                             }
                           `}
                         >
                           {option.label}
                         </button>
                       ))}
                     </div>
                   </Transition>
                 </div>
               </div>
               
               <div className="h-8 w-px bg-gray-200" />
               
               {pendingPayments > 0 && (
                 <div className="flex items-center gap-2">
                   <AlertTriangle className="text-orange-500" size={18} />
                   <span className="text-sm text-gray-600">
                     {stats.loading.navbar ? (
                       <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                     ) : (
                       <>
                         <span className="font-bold text-orange-600">{pendingPayments}</span> {t('common.overdueInvoices')}
                       </>
                     )}
                   </span>
                   <span className="text-sm text-gray-500">
                     {stats.loading.navbar ? (
                       <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                     ) : (
                       `(${pendingAmount})`
                     )}
                   </span>
                 </div>
               )}
             </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {userRole !== 'Clerk' && (
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </button>
              
              <Transition
                show={notificationOpen}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      <button
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                        disabled={markingAllRead}
                        onClick={async () => {
                          setMarkingAllRead(true);
                          try {
                            const res = await secureApiClient.post(`${API_BASE_URL}/notifications/mark-all-read`);
                            const data: ApiResponse<any> = await res.json();
                            if (!res.ok || !data.succeeded) {
                              throw new Error(data.message || 'Failed to mark all as read');
                            }
                            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                            setUnreadCount(0);
                          } catch {}
                          setMarkingAllRead(false);
                        }}
                      >
                        {markingAllRead ? t('common.loading') || 'Loading...' : t('notifications.markAllAsRead') || 'Mark all as read'}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading && (
                      <div className="p-4 text-center text-gray-400">{t('common.loading') || 'Loading...'}</div>
                    )}
                    {notificationsError && (
                      <div className="p-4 text-center text-red-500">{t('common.error') || 'Error'}: {notificationsError}</div>
                    )}
                    {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                      <div className="p-4 text-center text-gray-400">{t('notifications.empty') || 'No notifications'}</div>
                    )}
                    {!notificationsLoading && !notificationsError && notifications.map((notification) => {
                      // Numeric severity: 0=Info, 1=Success, 2=Warning, 3=Error
                      let Icon = Bell;
                      let color = 'text-gray-600 bg-gray-100';
                      if (notification.severity === 2) {
                        Icon = AlertTriangle;
                        color = 'text-orange-600 bg-orange-50';
                      } else if (notification.severity === 1) {
                        Icon = DollarSign;
                        color = 'text-green-600 bg-green-50';
                      } else if (notification.severity === 0) {
                        Icon = User;
                        color = 'text-blue-600 bg-blue-50';
                      } else if (notification.severity === 3) {
                        Icon = AlertTriangle;
                        color = 'text-red-600 bg-red-50';
                      }
                      // Optionally map type to icon (example: InvoiceCreated, CustomerCreated, etc.)
                      if (notification.type === 0) {
                        Icon = DollarSign; // InvoiceCreated
                      } else if (notification.type === 26) {
                        Icon = User; // CustomerCreated
                      }
                      return (
                        <div
                          key={notification.id}
                          className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <div className="flex gap-3 items-start">
                            <div className={`p-2 rounded-lg ${color}`}> <Icon size={16} /> </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1" title={`${new Date(notification.createdAt).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} - ${notification.createdBy || 'Unknown'}`}>{timeAgo(notification.createdAt)}</p>
                            </div>
                            {!notification.isRead && (
                              <button
                                className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"
                                disabled={markingReadId === notification.id}
                                title={t('notifications.markAsRead') || 'Mark as read'}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setMarkingReadId(notification.id);
                                  try {
                                    const res = await secureApiClient.post(`${API_BASE_URL}/notifications/${notification.id}/mark-read`);
                                    const data: ApiResponse<any> = await res.json();
                                    if (!res.ok || !data.succeeded) {
                                      throw new Error(data.message || 'Failed to mark as read');
                                    }
                                    setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, isRead: true } : n));
                                    setUnreadCount((prev) => Math.max(0, prev - 1));
                                  } catch {}
                                  setMarkingReadId(null);
                                }}
                              >
                                {markingReadId === notification.id ? (
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                                ) : (
                                  <Check size={16} />
                                )}
                              </button>
                            )}
                            {!notification.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full self-start mt-2" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button 
                      onClick={() => {
                        navigate('/notifications');
                        setNotificationOpen(false);
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('notifications.showAll') || 'Show all notifications'}
                    </button>
                  </div>
                </div>
              </Transition>
              </div>
            )}
            
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Globe size={18} />
              <span>{i18n.language === 'en' ? 'FR' : 'EN'}</span>
            </button>
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                  {userEmail?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-900">{userEmail?.split('@')[0] || 'User'}</div>
                  <div className="text-xs text-gray-500 capitalize">{userRole}</div>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <Transition
                show={dropdownOpen}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                        {userEmail?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 truncate">{userEmail}</div>
                        <div className="text-sm text-gray-500 capitalize flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            userRole === 'Admin' ? 'bg-purple-500' : 
                            userRole === 'Manager' ? 'bg-amber-500' : 
                            'bg-green-500'
                          }`} />
                          {userRole}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  
                  
                                     <div className="py-2">
                     <NavLink
                       to="/profile"
                       onClick={() => setDropdownOpen(false)}
                       className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                     >
                       <User size={16} />
                       <span>{t('common.profile')}</span>
                     </NavLink>
                   </div>
                  
                  <div className="border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      <span className="font-medium">{t('auth.logout')}</span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
