import React from 'react';
import { useLocation } from 'react-router-dom';

export default function Breadcrumbs(): JSX.Element {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(Boolean);
  return (
    <nav className="p-2 text-sm text-gray-500">
      {paths.length === 0 ? 'Dashboard' : paths.join(' / ')}
    </nav>
  );
}
