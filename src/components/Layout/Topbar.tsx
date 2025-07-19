// src/components/Layout/Topbar.tsx
import React from 'react';
import { Menu } from 'lucide-react';

const NotificationDropdown = () => <button className="p-2 rounded-full text-sm">NOTIF</button>;

// Mock UserProfileDropdown (si no lo tienes, impórtalo)
const UserProfileDropdown = ({ user, onEditProfile }: { user: any, onEditProfile: () => void }) => (
  <button onClick={onEditProfile} className="p-2 rounded-full text-sm">{user.name?.charAt(0) || 'U'}</button>
);


interface TopbarProps {
  toggleSidebar: () => void;
  user?: { name?: string; email?: string; avatarUrl?: string };
  onEditProfile: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ toggleSidebar, user, onEditProfile }) => {
  const defaultUser = { name: 'Invitado', email: '', avatarUrl: '' };
  const currentUser = user || defaultUser;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 py-3 bg-white shadow-sm sm:px-6 dark:bg-gray-800 dark:border-b dark:border-gray-700 dark:topbar-container">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-gray-600 rounded-md md:hidden dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Abrir menú lateral"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="flex items-center space-x-3">
        {/* Usamos el ThemeToggleButton importado sin clases adicionales que lo oculten o estilicen incorrectamente */}
        
        <NotificationDropdown />
        <UserProfileDropdown user={currentUser} onEditProfile={onEditProfile} />
      </div>
    </header>
  );
};

export default Topbar;
