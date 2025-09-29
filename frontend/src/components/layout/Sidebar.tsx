import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/lib/storage';
import { User } from '@/types';
import {
  Home,
  Users,
  MessageSquare,
  FileText,
  Calendar,
  CheckSquare,
  Settings,
  Network,
  Mail,
  Activity,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Feed', href: '/feed', icon: Activity },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Meetings', href: '/meetings', icon: Calendar },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Network', href: '/network', icon: Network },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const roleLabels = {
  job_seeker: 'Job Seeker',
  consultant: 'Solo Consultant',
  community_manager: 'Community Manager',
  sales_rep: 'Sales Rep'
};

export function Sidebar() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className={cn(
      "flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex flex-col">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">ConnectorPro</span>
            </div>
            <p className="text-xs text-gray-500 italic ml-2">Connections to Outcomes</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span>{item.name}</span>
                  {item.name === 'Tasks' && (
                    <Badge variant="secondary" className="ml-auto">
                      3
                    </Badge>
                  )}
                  {item.name === 'Messages' && (
                    <Badge variant="secondary" className="ml-auto">
                      2
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 border-t border-gray-200">
        {/* User Profile */}
        {isAuthenticated && user && (
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user.name ? getInitials(user.name) : 'U'}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                {/* <p className="text-xs text-gray-500 truncate">{user && user.role ? roleLabels[user.role] : ''}</p> */}
              </div>
            )}
          </div>
        )}

        {/* Logout Button */}
        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            {!collapsed && <span>Logout</span>}
          </Button>
        )}
      </div>
    </div>
  );
}