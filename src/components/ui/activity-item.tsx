import React from "react";

interface ActivityItemProps {
  icon: React.ReactNode;
  text: string;
  user?: string;
  time: string;
  type: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ icon, text, user, time, type }) => {
  let iconBgColor = 'bg-slate-100';
  
  if (type === 'pedido') iconBgColor = 'bg-sky-100';
  else if (type === 'cliente') iconBgColor = 'bg-green-100';
  else if (type === 'producto') iconBgColor = 'bg-pink-100';

  return (
    <li className="flex items-start space-x-3 py-2.5 border-b border-slate-200/70 last:border-b-0">
      <div className={`p-2 rounded-full ${iconBgColor}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-700">
          {text} {user && <span className="font-semibold text-sky-600">{user}</span>}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{time}</p>
      </div>
    </li>
  );
};