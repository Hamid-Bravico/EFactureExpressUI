import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home,
  FileText,
  FileCheck,
  Users,
  Building2,
  UserCog,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { APP_CONFIG } from '../config/app';
import { useStatsContext } from '../domains/stats/context/StatsContext';

interface SidebarProps {
  userRole: string;
  t: any;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, t, isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isAdmin = userRole === 'Admin';
  const isManager = userRole === 'Manager';
  const canAccessUsers = isAdmin || isManager;

  const { stats } = useStatsContext();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigationItems = [
    {
      path: '/',
      label: 'Home',
      icon: Home,
      badge: null,
      permission: true
    },
    {
      path: '/customers',
      label: t('common.customers'),
      icon: Users,
      badge: stats.sidebarCounts?.customersCount?.toString() || '0',
      permission: true
    },
    {
      path: '/invoices',
      label: t('common.invoices'),
      icon: FileText,
      badge: stats.sidebarCounts?.invoicesCount?.toString() || '0',
      permission: true
    },
    {
      path: '/quotes',
      label: t('common.quotes'),
      icon: FileCheck,
      badge: stats.sidebarCounts?.quotesCount?.toString() || '0',
      permission: true
    },
    {
      path: '/credit-notes',
      label: t('common.creditNotes'),
      icon: Receipt,
      badge: stats.sidebarCounts?.creditNotesCount?.toString() || '0',
      permission: true
    }
  ];

  const adminItems = [
    {
      path: '/catalog',
      label: t('common.catalog'),
      icon: Building2,
      badge: null,
      permission: isAdmin || isManager
    },
    {
      path: '/users',
      label: t('common.users'),
      icon: UserCog,
      badge: null,
      permission: canAccessUsers
    }
  ];





  const NavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    if (!item.permission) return null;

    return (
      <NavLink
        to={item.path}
        onClick={() => isMobile && setIsMobileMenuOpen(false)}
        className={`
          group flex items-center gap-3 px-4 py-3 rounded-xl relative transition-all duration-300 mx-2
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
          ${isActive 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-gray-600 hover:bg-white/60 hover:text-gray-900 hover:shadow-sm'
          }
          ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}
        `}
        tabIndex={0}
      >
        {/* Active indicator bar */}
        <span
          className={`absolute left-0 top-3 bottom-3 w-0.5 bg-blue-500 transition-all duration-300
            ${isActive ? 'opacity-100' : 'opacity-0'}
          `}
          aria-hidden="true"
        />
        {/* Icon container */}
        <span
          className={`relative flex items-center justify-center transition-all duration-300
            ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}
            ${isCollapsed && !isMobile ? 'w-8 h-4' : ''}
          `}
        >
          <Icon
            size={isCollapsed && !isMobile ? 22 : 18}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </span>
        {/* Label */}
        {(!isCollapsed || isMobile) && (
          <>
            <span className={`
              flex-1 transition-all duration-300 text-sm
              ${isActive 
                ? 'font-semibold text-gray-900' 
                : 'font-medium text-gray-700 group-hover:text-gray-900'
              }
            `}>
              {item.label}
            </span>
            {/* Badge */}
            {item.badge && (
              <span className={`
                px-2.5 py-1 text-xs rounded-full transition-all duration-300
                ${isActive 
                  ? 'bg-blue-100 text-blue-700 font-semibold' 
                  : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                }
              `}>
                {stats.loading.sidebar ? (
                  <div className="animate-pulse bg-gray-200 h-3 w-4 rounded"></div>
                ) : (
                  item.badge
                )}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      <div className={`p-6 ${!isCollapsed || isMobile ? 'px-6' : 'px-3'} bg-gradient-to-br from-white to-gray-50 border-b border-gray-200/60 relative`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={APP_CONFIG.logo}
              alt={APP_CONFIG.title}
              className={`transition-all duration-300 ${isCollapsed && !isMobile ? 'h-8' : 'h-10'}`}
            />
            {/* Subtle glow effect behind logo */}
            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl -z-10" />
          </div>
          {(!isCollapsed || isMobile) && (
            <span className="text-lg font-bold text-gray-800">{APP_CONFIG.title}</span>
          )}
        </div>
        
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white hover:shadow-lg transition-all duration-200 border border-gray-200/50 bg-white/90 backdrop-blur-sm"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white hover:shadow-lg transition-all duration-200 border border-gray-200/50 bg-white/90 backdrop-blur-sm"
          >
            <X size={18} />
          </button>
        )}
      </div>

             <nav className="flex-1 px-3 pb-4 overflow-y-auto">
          <div className="space-y-1 mt-6">
            {(!isCollapsed || isMobile) && (
              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workflows</h3>
              </div>
            )}
            {navigationItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200/50">
            {(!isCollapsed || isMobile) && (
              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</h3>
              </div>
            )}
            <div className="space-y-1">
              {adminItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          </div>
         

                </nav>
         
         <div className="border-t border-gray-200/50 p-4 bg-white/50">
           <NavLink
             to="/settings"
             className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-500 hover:text-gray-700 hover:bg-white/70"
           >
             <Settings size={18} />
             {(!isCollapsed || isMobile) && (
               <span className="text-sm font-medium">{t('common.settings')}</span>
             )}
           </NavLink>
         </div>
       
     </>
   );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg md:hidden"
        >
          <Menu size={20} />
        </button>
        
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="fixed left-0 top-0 h-full w-72 bg-gray-50 shadow-xl z-50 flex flex-col transition-transform duration-300 md:hidden">
              {sidebarContent}
            </aside>
          </>
        )}
      </>
    );
  }

  return (
    <aside className={`
      fixed left-0 top-0 h-full bg-gray-50 shadow-lg z-40 flex flex-col transition-all duration-300 border-r border-gray-200
      ${isCollapsed ? 'w-20' : 'w-64'}
    `}>
      {sidebarContent}
    </aside>
  );
};

export default Sidebar;
