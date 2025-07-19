// src/components/Layout/Sidebar.tsx (versión original)

import React from "react";
import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useIsMobile } from "../../hooks/useIsMobile";
import logo from "../../assets/logo.avif";

const items = [
  { to: "/",            label: "Dashboard", icon: "lucide:layout-dashboard" },
  { to: "/clients",     label: "Clientes",  icon: "lucide:users" },
  { to: "/inventory",   label: "Inventario", icon: "lucide:package" },
  { to: "/invoicing",   label: "Facturación", icon: "lucide:credit-card" },
  { to: "/suppliers",   label: "Proveedores", icon: "lucide:truck" },
  { to: "/reports",     label: "Reportes", icon: "lucide:bar-chart" },
];

interface SidebarProps {
  collapsed: boolean;
  toggleCollapse: () => void;
}

export default function Sidebar({
  collapsed,
  toggleCollapse
}: SidebarProps): JSX.Element {
  const isMobile = useIsMobile();

  // Si es mobile podemos forzar a colapsar al inicio
  React.useEffect(() => {
    if (isMobile && !collapsed) {
      toggleCollapse();
    }
  }, [isMobile]);

  return (
    <aside 
      className={`bg-white border-r transition-all duration-300 
        ${collapsed ? "w-20" : "w-64"}`}
    >
      {/* LOGO O NOMBRE */}
      <div className="h-16 flex items-center justify-center">
        <img src={logo} alt="Logo" className="h-8 w-8" />
        {!collapsed && <span className="ml-2 font-bold text-lg">Bakery</span>}
      </div>

      <nav className="mt-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              "flex items-center px-4 py-3 transition-colors " +
              (isActive
                ? "bg-gray-100 text-gray-900"
                : "text-gray-700 hover:bg-gray-50")
            }
          >
            <Icon 
              icon={item.icon} 
              className="w-5 h-5" 
            />
            {!collapsed && <span className="ml-3">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* BOTÓN PARA COLAPSAR O EXPANDIR (en desktop) */}
      {!isMobile && (
        <button
          className="absolute bottom-4 left-0 right-0 mx-auto"
          onClick={toggleCollapse}
        >
          <Icon 
            icon={collapsed ? "lucide:chevron-right" : "lucide:chevron-left"} 
            className="w-5 h-5 text-gray-700"
          />
        </button>
      )}
    </aside>
  );
}
