// src/components/Layout/Layout.tsx

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { NavLink, Link } from "react-router-dom";
import { NotificationDropdown } from '../Dropdowns/notification-dropdown';
import { UserProfileDropdown } from '../Dropdowns/user-profile-dropdown';
import { supabase } from '../../supabaseClient';
import WelcomeMessage from "../ui/WelcomeMessage";
// --- 1. IMPORTAMOS EL HOOK DE AUTENTICACIÓN ---
import { useAuth } from '../../Context/AuthContext';
import { GlobalSearchBar } from './GlobalSearchBar';

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
  'audit-log': 'Auditoría', // Agregamos el nombre para el breadcrumb
};

// Se elimina la lista estática de aquí para moverla dentro del componente Layout

interface SidebarProps {
  collapsed: boolean;
  toggleCollapse: () => void;
  handleLogout: () => void;
  isMobileView: boolean;
  // --- 3. ACTUALIZAMOS LAS PROPS DEL SIDEBAR ---
  sidebarItems: Array<{ to: string; label: string; icon: string; }>;
}

function Sidebar({ collapsed, toggleCollapse, handleLogout, isMobileView, sidebarItems }: SidebarProps): JSX.Element {
  const sidebarWidthClass = isMobileView
    ? 'w-64'
    : collapsed ? 'w-20' : 'w-64';

  const sidebarTransformClass = isMobileView
    ? (collapsed ? '-translate-x-full' : 'translate-x-0')
    : 'translate-x-0';

  return (
    <aside
      className={`bg-white border-r border-slate-200 shadow-lg transition-all duration-300 ease-in-out flex flex-col fixed inset-y-0 left-0 z-50 
        ${sidebarWidthClass}
        ${sidebarTransformClass}
      `}
    >
      <div
        className={`flex items-center border-b border-slate-200 px-4 min-h-[64px]
          ${collapsed && !isMobileView ? "justify-center" : "justify-between"}
        `}
      >
        {(!collapsed || (isMobileView && !collapsed)) && (
          <div className="flex items-center overflow-hidden">
            <span className="text-xl font-bold text-slate-800 whitespace-nowrap">
              Panadería
            </span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className={`p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors duration-150
            ${!collapsed && !isMobileView ? "ml-2" : ""}
            ${isMobileView || collapsed ? "" : "md:block"}
          `}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <Icon
            icon={ (isMobileView ? !collapsed : collapsed) ? "lucide:align-justify" : "lucide:x" }
            className="w-5 h-5"
          />
        </button>
      </div>

      <nav className="flex-1 mt-4 px-3 space-y-1.5 pb-4 overflow-y-auto">
        {/* --- 4. USAMOS LA LISTA PASADA POR PROPS --- */}
        {sidebarItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => { if (isMobileView && !collapsed) toggleCollapse(); }}
            end={item.to === "/"}
            className={({ isActive }) =>
              `relative flex items-center py-3 rounded-lg cursor-pointer transition-all duration-200 group transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
              ${collapsed && !isMobileView ? "justify-center px-2" : "px-4"}
              ${isActive ? "bg-sky-500 text-white font-semibold shadow-md hover:bg-sky-600" : "text-slate-600 hover:bg-sky-100/70 hover:text-sky-700"}
            `}
            title={collapsed && !isMobileView ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon
                  icon={item.icon}
                  className={`flex-shrink-0 w-5 h-5 transition-colors duration-200
                    ${isActive ? "text-white" : "text-slate-500 group-hover:text-sky-600"}
                  `}
                />
                {(!collapsed || (isMobileView && !collapsed) ) && (
                  <span
                    className={`ml-3 text-sm font-medium transition-opacity duration-200 whitespace-nowrap
                      ${isActive ? "text-white" : "text-slate-700 group-hover:text-sky-700"}
                    `}
                  >
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3 border-t border-slate-200">
        <button
          onClick={() => {
            handleLogout();
            if (isMobileView && !collapsed) toggleCollapse();
          }}
          className={`w-full flex items-center py-3 rounded-lg cursor-pointer transition-colors duration-200 group text-red-600 hover:bg-red-100/70 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
            ${collapsed && !isMobileView ? "justify-center px-2" : "px-4"}
          `}
          title={collapsed && !isMobileView ? "Cerrar Sesión" : undefined}
        >
          <Icon icon="lucide:log-out" className="flex-shrink-0 w-5 h-5" />
          {(!collapsed || (isMobileView && !collapsed)) && (
            <span className="ml-3 text-sm font-medium">
              Cerrar Sesión
            </span>
          )}
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
          className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors duration-150 mr-2 md:hidden"
          aria-label="Abrir menú"
        >
          <Icon icon="lucide:menu" className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-700 hidden sm:block">
          Bienvenido
        </h1>
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
  const pathnames = location.pathname.split('/').filter((x) => x);
  const homeBreadcrumb = (
    <li className="flex items-center">
      <Link to="/" className="text-slate-500 hover:text-sky-600 transition-colors flex items-center">
        <Icon icon="lucide:home" className="w-4 h-4 mr-1.5" />
        {pathSegmentDisplayNames['/'] || 'Inicio'}
      </Link>
    </li>
  );
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
      <ol className="list-none p-0 inline-flex items-center space-x-2">
        {homeBreadcrumb}
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const displayName = pathSegmentDisplayNames[value.toLowerCase()] || capitalizeFirstLetter(value);
          return (
            <React.Fragment key={to}>
              <li className="flex items-center">
                <Icon icon="lucide:chevron-right" className="w-4 h-4 text-slate-400" />
              </li>
              <li className="flex items-center">
                {isLast ? (
                  <span className="font-medium text-slate-700">{displayName}</span>
                ) : (
                  <Link to={to} className="text-slate-500 hover:text-sky-600 transition-colors">{displayName}</Link>
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
  // --- 2. OBTENEMOS EL ROL DEL USUARIO CON EL HOOK ---
  const { role } = useAuth();

  const [isDesktopMdView, setIsDesktopMdView] = useState(window.innerWidth >= 768);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsedDesktop, setIsSidebarCollapsedDesktop] = useState(false);

  const navigate = useNavigate();

  // --- 2.1. DEFINIMOS LA LISTA DE ÍTEMS BASE DENTRO DEL COMPONENTE ---
  const mainSidebarItems = [
    { to: "/", label: "Dashboard", icon: "lucide:layout-dashboard" },
    { to: "/clients", label: "Clientes", icon: "lucide:users" },
    { to: "/inventory", label: "Inventario", icon: "lucide:package" },
    { to: "/invoicing", label: "Facturación", icon: "lucide:file-text" },
    { to: "/providers", label: "Proveedores", icon: "lucide:truck" },
    { to: "/accounts-payable", label: "Cuentas por Pagar", icon: "lucide:credit-card" },
    { to: "/reports", label: "Reportes", icon: "lucide:bar-chart-3" },
  ];

  // --- 2.2. AÑADIMOS EL ÍTEM DE AUDITORÍA SOLO SI EL ROL ES 'admin' ---
  if (role === 'admin') {
    mainSidebarItems.push({ to: "/audit-log", label: "Auditoría", icon: "lucide:shield-check" });
  }

  const checkDesktopView = () => {
    const newIsDesktopMd = window.innerWidth >= 768;
    if (newIsDesktopMd !== isDesktopMdView) {
      setIsDesktopMdView(newIsDesktopMd);
      if (newIsDesktopMd) {
        setIsSidebarOpenMobile(false);
      } else {
        setIsSidebarOpenMobile(false);
      }
    }
  };

  useEffect(() => {
    const initialIsDesktop = window.innerWidth >= 768;
    setIsDesktopMdView(initialIsDesktop);
    setIsSidebarOpenMobile(false);
    setIsSidebarCollapsedDesktop(false);

    window.addEventListener('resize', checkDesktopView);
    return () => window.removeEventListener('resize', checkDesktopView);
  }, []);

  const toggleMainSidebar = () => {
    if (isDesktopMdView) {
      setIsSidebarCollapsedDesktop(prev => !prev);
    } else {
      setIsSidebarOpenMobile(prev => !prev);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error logging out:", error.message);
    else navigate('/login');
  };

  const effectivelyCollapsed = isDesktopMdView ? isSidebarCollapsedDesktop : !isSidebarOpenMobile;

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Bienvenida flotante */}
      <WelcomeMessage />

      {/* FONDO OSCURO si sidebar móvil abierto */}
      {!isDesktopMdView && isSidebarOpenMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleMainSidebar}
        ></div>
      )}

      {/* --- 5. PASAMOS LA LISTA DINÁMICA AL COMPONENTE SIDEBAR --- */}
      <Sidebar
        collapsed={effectivelyCollapsed}
        toggleCollapse={toggleMainSidebar}
        handleLogout={handleLogout}
        isMobileView={!isDesktopMdView}
        sidebarItems={mainSidebarItems}
      />

      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out
                  ${isDesktopMdView ? (isSidebarCollapsedDesktop ? "md:ml-20" : "md:ml-64") : "ml-0"}`}
      >
        <Topbar
          handleLogout={handleLogout}
          toggleMobileSidebar={toggleMainSidebar}
        />
        <div className="p-4">
          <Breadcrumbs />
        </div>
        <main className="flex-1 p-4 pt-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}