// RUTA: src/components/Layout/Sidebar.tsx (VERSIÓN DE DEPURACIÓN Y CORRECCIÓN)

import React from "react";
import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../../Context/AuthContext"; // Importamos useAuth

interface SidebarProps {
  collapsed: boolean;
  toggleCollapse: () => void;
  handleLogout: () => void;
  isMobileView: boolean;
}

function Sidebar({ collapsed, toggleCollapse, handleLogout, isMobileView }: SidebarProps): JSX.Element {
  const { role } = useAuth();

  // --- PASO DE DEPURACIÓN: Verificamos el rol en la consola ---
  // Abre la consola del navegador (F12) y busca este mensaje.
  console.log("El componente Sidebar se está renderizando con el rol:", role);

  const mainSidebarItems = [
    { to: "/",            label: "Dashboard",   icon: "lucide:layout-dashboard" },
    { to: "/clients",     label: "Clientes",    icon: "lucide:users" },
    { to: "/inventory",   label: "Inventario",  icon: "lucide:package" },
    { to: "/invoicing",   label: "Facturación", icon: "lucide:file-text" },
    { to: "/providers",   label: "Proveedores", icon: "lucide:truck" },
    { to: "/accounts-payable", label: "Cuentas por Pagar", icon: "lucide:credit-card" },
    { to: "/reports",     label: "Reportes",    icon: "lucide:bar-chart-3" },
  ];

  // --- CORRECCIÓN DEFINITIVA ---
  // Añadimos el item de Auditoría a la lista solo si el rol es 'admin'.
  // Esta es la forma correcta y robusta de hacerlo.
  if (role === 'admin') {
    mainSidebarItems.push({
      to: "/audit-log",
      label: "Log de Auditoría",
      icon: "lucide:clipboard-list"
    });
  }

  return (
    <aside
      className={`bg-white border-r shadow-lg transition-all duration-300 ease-in-out flex flex-col fixed inset-y-0 left-0 z-50
        ${isMobileView ? 'w-64' : (collapsed ? 'w-20' : 'w-64')}
        ${isMobileView ? (collapsed ? '-translate-x-full' : 'translate-x-0') : 'translate-x-0'}
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
        {/* Se mapea la lista que ya incluye (o no) el item de auditoría */}
        {mainSidebarItems.map((item) => (
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

export default Sidebar;
