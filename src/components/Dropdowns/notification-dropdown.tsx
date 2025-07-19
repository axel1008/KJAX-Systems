// src/components/Dropdowns/notification-dropdown.tsx
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../Context/NotificationContext";
import { timeAgo } from '../../utils/time-helpers';
import { AppNotification } from "../../types/notifications";

const getIconForType = (type: string) => {
  switch (type) {
    case 'new_invoice':
      return <Icon icon="lucide:file-text" width={18} height={18} className="text-sky-500"/>;
    case 'new_client':
      return <Icon icon="lucide:user-plus" width={18} height={18} className="text-green-500"/>;
    case 'new_provider':
      return <Icon icon="lucide:truck" width={18} height={18} className="text-purple-500"/>;
    case 'new_supplier_bill':
      return <Icon icon="lucide:receipt" width={18} height={18} className="text-orange-500"/>;
    case 'low_stock':
      return <Icon icon="lucide:wheat" width={18} height={18} className="text-yellow-500"/>;
    default:
      return <Icon icon="lucide:bell-ring" width={18} height={18} className="text-slate-500"/>;
  }
};

export const NotificationDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = async (notificationId: number, url: string | null) => {
    await markAsRead(notificationId);
    if (url) {
      navigate(url);
    }
  };

  type MenuItem = AppNotification | { key: string; message?: string };

  const menuItems: MenuItem[] = [
    { key: 'header' },
  ];

  if (loading) {
    menuItems.push({ key: 'status-loading', message: 'Cargando...' });
  } else if (notifications.length === 0) {
    menuItems.push({ key: 'status-empty', message: 'No hay notificaciones nuevas.' });
  } else {
    menuItems.push(...notifications);
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          className="relative p-2 rounded-full hover:bg-slate-200/70 transition-colors"
        >
          <Icon icon="lucide:bell" width={22} height={22} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </Button>
      </DropdownTrigger>
      
      <DropdownMenu 
        aria-label="Notificaciones" 
        className="w-80"
        items={menuItems}
      >
        {(item: MenuItem) => {
          
          if ('key' in item && item.key === 'header') {
            return (
              <DropdownItem key="header" className="p-3 border-b border-slate-200 flex justify-between items-center" isReadOnly textValue="Header">
                <h4 className="text-sm font-semibold text-slate-700">Notificaciones</h4>
                {unreadCount > 0 && !loading && (
                  <Button size="sm" variant="light" className="text-xs text-sky-600 hover:underline" onPress={markAllAsRead}>
                    Marcar todas como leídas
                  </Button>
                )}
              </DropdownItem>
            );
          }

          if ('key' in item && typeof item.key === 'string' && item.key.startsWith('status-')) {
            return (
              <DropdownItem key={item.key} className="p-4 text-center text-slate-500 text-sm" isReadOnly textValue={item.message}>
                {item.message}
              </DropdownItem>
            );
          }
          
          const notif = item as AppNotification;
          const notificationText = notif.creator_name
            ? `${notif.message}`
            : notif.message;
            
          return (
            <DropdownItem 
              key={notif.id} 
              className={`p-3 hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0 ${!notif.is_read ? 'bg-sky-50/70' : ''}`}
              onPress={() => handleNotificationClick(notif.id, notif.related_url)}
              textValue={notificationText}
            >
              <div className="flex items-start w-full gap-3">
                {/* Contenedor del Ícono */}
                <div className="flex-shrink-0 mt-0.5 p-1.5 bg-slate-100 rounded-full">
                    {getIconForType(notif.type)}
                </div>

                {/* Contenedor del Texto (se expande) */}
                <div className="flex-grow min-w-0">
                    <p className={`text-xs whitespace-normal ${!notif.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {notificationText}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{timeAgo(new Date(notif.created_at))}</p>
                </div>

                {/* Contenedor del Punto de 'No Leído' */}
                {!notif.is_read && (
                    <div className="flex-shrink-0 self-start mt-1">
                        <span className="w-2 h-2 bg-sky-500 rounded-full block"></span>
                    </div>
                )}
              </div>
            </DropdownItem>
          );
        }}
      </DropdownMenu>
    </Dropdown>
  );
};