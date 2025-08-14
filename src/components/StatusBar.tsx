import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';
import { Transition } from '@headlessui/react';

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month'>('month');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

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

  const currentMonthRevenue = '127,450 MAD';
  const pendingPayments = 3;
  const pendingAmount = '23,500 MAD';

  const periodOptions = [
    { value: 'today', label: t('common.today') || "Aujourd'hui" },
    { value: 'week', label: t('common.thisWeek') || 'Cette semaine' },
    { value: 'month', label: t('common.thisMonth') || 'Ce mois' }
  ];

  const notifications = [
    {
      id: 1,
      type: 'warning',
      title: 'Facture en retard',
      message: 'INV-2024-001 est en retard de 5 jours',
      time: 'Il y a 2h',
      icon: AlertTriangle,
      color: 'text-orange-600 bg-orange-50'
    },
    {
      id: 2,
      type: 'success',
      title: 'Paiement reçu',
      message: '15,000 MAD reçu pour INV-2024-003',
      time: 'Il y a 5h',
      icon: DollarSign,
      color: 'text-green-600 bg-green-50'
    },
    {
      id: 3,
      type: 'info',
      title: 'Nouveau client',
      message: 'Société ABC ajoutée avec succès',
      time: 'Hier',
      icon: User,
      color: 'text-blue-600 bg-blue-50'
    }
  ];

  return (
    <div className={`
      fixed top-0 h-16 bg-white border-b border-gray-200 shadow-sm z-30 flex items-center transition-all duration-300
      ${isMobile ? 'left-0 right-0' : (sidebarCollapsed ? 'left-20 right-0' : 'left-64 right-0')}
    `}>
      <div className="w-full px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
                         <div className="hidden lg:flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <Calendar className="text-gray-400" size={18} />
                 <span className="text-sm font-medium text-gray-600">Décembre 2024:</span>
                 <span className="text-lg font-bold text-gray-900">{currentMonthRevenue}</span>

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
               
               <div className="flex items-center gap-2">
                 <AlertTriangle className="text-orange-500" size={18} />
                 <span className="text-sm text-gray-600">
                   <span className="font-bold text-orange-600">{pendingPayments}</span> factures en retard
                 </span>
                 <span className="text-sm text-gray-500">({pendingAmount})</span>
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell size={20} />
                {pendingPayments > 0 && (
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
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Marquer tout comme lu
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => {
                      const Icon = notification.icon;
                      return (
                        <div key={notification.id} className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                          <div className="flex gap-3">
                            <div className={`p-2 rounded-lg ${notification.color}`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Voir toutes les notifications
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
            
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
