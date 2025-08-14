import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { NavLink, Link } from "react-router-dom";
import { NotificationDropdown } from '../Dropdowns/notification-dropdown';
import { UserProfileDropdown } from '../Dropdowns/user-profile-dropdown';
import { supabase } from '../../supabaseClient';
import WelcomeMessage from "../ui/WelcomeMessage";
import { useAuth } from '../../Context/AuthContext';
import { GlobalSearchBar } from './GlobalSearchBar';
import AppFooter from "../ui/AppFooter";

const capitalizeFirstLetter = (string: string) => {
  if (!string) return '';
  const spacedString = string.replace(/-/g, ' ');
  return spacedString.charAt(0).toUpperCase() + spacedString.slice(1);
};

const pathSegmentDisplayNames: { [key: string]: string } = {
  '/': 'Panel Principal',
  'clients': 'Clientes',
  'inventory': 'Inventario',
  'invoicing': 'Facturación',
  'providers': 'Proveedores',
  'accounts-payable': 'Cuentas por Pagar',
  'reports': 'Reportes',
  'audit-log': 'Auditoría',
};

interface SidebarProps {
  collapsed: boolean;
  toggleCollapse: () => void;
  handleLogout: () => void;
  isMobileView: boolean;
  sidebarItems: Array<{ to: string; label: string; icon: string; }>;
}

function Sidebar({ collapsed, toggleCollapse, handleLogout, isMobileView, sidebarItems }: SidebarProps): JSX.Element {
  const width = isMobileView ? 'w-64' : collapsed ? 'w-20' : 'w-64';
  const transform = isMobileView
    ? (collapsed ? '-translate-x-full' : 'translate-x-0')
    : 'translate-x-0';

  return (
    <aside className={`${width} ${transform} bg-white border-r border-slate-200 shadow-lg fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out`}>
      <div className={`flex items-center border-b border-slate-200 px-4 h-16 ${collapsed && !isMobileView ? 'justify-center' : 'justify-between'}`}>
        {(!collapsed || (isMobileView && !collapsed)) && (
          <span className="text-xl font-bold text-slate-800 whitespace-nowrap">Distribudora Chan</span>
        )}
        <button
          onClick={toggleCollapse}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors duration-150"
        >
          <Icon
            icon={(isMobileView ? !collapsed : collapsed) ? 'lucide:align-justify' : 'lucide:x'}
            className="w-5 h-5"
          />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 py-4">
        {sidebarItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => { if (isMobileView && !collapsed) toggleCollapse(); }}
            className={({ isActive }) => `
              flex items-center rounded-lg py-3 transition-all duration-200 group hover:scale-[1.01]
              ${collapsed ? 'justify-center px-2' : 'px-4'}
              ${isActive
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-sky-100/70 hover:text-sky-700'}
            `}
          >
            <Icon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <span className="ml-3 text-sm font-medium transition-opacity duration-200">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={() => { handleLogout(); if (isMobileView && !collapsed) toggleCollapse(); }}
          className={`w-full flex items-center rounded-lg py-3 transition-colors duration-200
            ${collapsed ? 'justify-center px-2' : 'px-4'}
            text-red-600 hover:bg-red-100/70 hover:text-red-700`}
        >
          <Icon icon="lucide:log-out" className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="ml-3 text-sm font-medium">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}

interface TopbarProps {
  handleLogout: () => void;
  toggleMobileSidebar: () => void;
}

function Topbar({ handleLogout, toggleMobileSidebar }: TopbarProps): JSX.Element {
  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
      <div className="flex items-center">
        <button
          onClick={toggleMobileSidebar}
          aria-label="Abrir menú"
          className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors duration-150 md:hidden"
        >
          <Icon icon="lucide:menu" className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-700 hidden sm:block">Bienvenido</h1>
      </div>
      <GlobalSearchBar />
      <div className="flex items-center space-x-3">
        <NotificationDropdown />
        <UserProfileDropdown onLogout={handleLogout} />
      </div>
    </header>
  );
}

function Breadcrumbs(): JSX.Element {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="breadcrumb" className="text-sm text-slate-600 px-4 py-2">
      <ol className="inline-flex items-center space-x-2">
        <li className="flex items-center">
          <Link to="/" className="flex items-center hover:text-sky-600">
            <Icon icon="lucide:home" className="w-4 h-4 mr-1.5" />
            {pathSegmentDisplayNames['/']}
          </Link>
        </li>
        {pathnames.map((segment, idx) => {
          const to = '/' + pathnames.slice(0, idx + 1).join('/');
          const isLast = idx === pathnames.length - 1;
          const name = pathSegmentDisplayNames[segment] || capitalizeFirstLetter(segment);
          return (
            <React.Fragment key={to}>
              <li><Icon icon="lucide:chevron-right" className="w-4 h-4 text-slate-400" /></li>
              <li className="flex items-center">
                {isLast ? (
                  <span className="font-medium text-slate-700">{name}</span>
                ) : (
                  <Link to={to} className="hover:text-sky-600">{name}</Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default function Layout(): JSX.Element {
  const { role } = useAuth();
  const [isDesktopMdView, setIsDesktopMdView] = useState(window.innerWidth >= 768);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsedDesktop, setIsSidebarCollapsedDesktop] = useState(false);
  const navigate = useNavigate();

  const mainSidebarItems = [
    { to: '/', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
    { to: '/clients', label: 'Clientes', icon: 'lucide:users' },
    { to: '/inventory', label: 'Inventario', icon: 'lucide:package' },
    { to: '/invoicing', label: 'Facturación', icon: 'lucide:file-text' },
    { to: '/providers', label: 'Proveedores', icon: 'lucide:truck' },
    { to: '/accounts-payable', label: 'Cuentas por Pagar', icon: 'lucide:credit-card' },
    { to: '/reports', label: 'Reportes', icon: 'lucide:bar-chart-3' },
  ];
  if (role === 'admin') {
    mainSidebarItems.push({ to: '/audit-log', label: 'Auditoría', icon: 'lucide:shield-check' });
  }

  useEffect(() => {
    const resize = () => setIsDesktopMdView(window.innerWidth >= 768);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const toggleMainSidebar = () => {
    if (isDesktopMdView) setIsSidebarCollapsedDesktop(prev => !prev);
    else setIsSidebarOpenMobile(prev => !prev);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
    else navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <WelcomeMessage />

      <Sidebar
        collapsed={isDesktopMdView ? isSidebarCollapsedDesktop : !isSidebarOpenMobile}
        toggleCollapse={toggleMainSidebar}
        handleLogout={handleLogout}
        isMobileView={!isDesktopMdView}
        sidebarItems={mainSidebarItems}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        isDesktopMdView ? (isSidebarCollapsedDesktop ? 'md:ml-20' : 'md:ml-64') : 'ml-0'
      }`}>
        <Topbar handleLogout={handleLogout} toggleMobileSidebar={toggleMainSidebar} />
        <Breadcrumbs />

        <div className="flex-1 flex flex-col">
         <div className="flex-1 p-4 pt-0 overflow-y-auto">
  <Outlet />
</div>
<AppFooter />
        </div>
      </div>
    </div>
  );
}
