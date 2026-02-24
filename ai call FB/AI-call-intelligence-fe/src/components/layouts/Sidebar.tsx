import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  HomeIcon,
  UsersIcon,
  VideoCameraIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ListBulletIcon,
  FolderIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore, useUIStore } from '@/store';
import type { NavItem } from '@/types';

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: HomeIcon,
  },
  {
    id: 'meetings',
    label: 'Meetings',
    path: '/meetings',
    icon: VideoCameraIcon,
  },
  {
    id: 'persons',
    label: 'People',
    path: '/persons',
    icon: UsersIcon,
  },
  {
    id: 'pain-points',
    label: 'Pain Points',
    path: '/pain-points',
    icon: ExclamationTriangleIcon,
  },
  {
    id: 'action-items',
    label: 'Action Items',
    path: '/action-items',
    icon: ListBulletIcon,
  },
  {
    id: 'resources',
    label: 'Resources',
    path: '/resources',
    icon: FolderIcon,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: ChartBarIcon,
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: DocumentTextIcon,
  },
];

const secondaryItems: NavItem[] = [
  {
    id: 'search',
    label: 'Search',
    path: '/search',
    icon: MagnifyingGlassIcon,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: BellIcon,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Cog6ToothIcon,
  },
];

interface SidebarProps {
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();

  const isCollapsed = isMobile ? false : sidebarCollapsed;

  const handleLogout = () => {
    logout();
  };

  const NavLink: React.FC<{ item: NavItem; collapsed?: boolean }> = ({ item, collapsed = false }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    const IconComponent = item.icon as React.ComponentType<{ className?: string }>;

    return (
      <Link
        to={item.path!}
        className={clsx(
          'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
          'hover:bg-primary-50 dark:hover:bg-primary-900/50',
          {
            'bg-accent/10 text-accent border-r-2 border-accent': isActive,
            'text-neutral-700 hover:text-primary-900 dark:text-neutral-300 dark:hover:text-white': !isActive,
            'justify-center': collapsed,
          }
        )}
      >
        <IconComponent
          className={clsx(
            'flex-shrink-0 h-5 w-5',
            isActive ? 'text-accent' : 'text-neutral-500 group-hover:text-primary-700',
            collapsed ? '' : 'mr-3'
          )}
        />
        {!collapsed && (
          <span className="truncate">
            {item.label}
          </span>
        )}
        {item.badge && !collapsed && (
          <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-accent text-xs text-white">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className={clsx(
      'flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700',
      {
        'w-64': !isCollapsed,
        'w-16': isCollapsed,
      }
    )}>
      {/* Logo */}
      <div className={clsx('flex items-center px-4 py-4', isCollapsed ? 'justify-center' : 'justify-between')}>
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-white">
              Call Intel
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isCollapsed ? <Bars3Icon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
        <div className={clsx('mb-6', isCollapsed && 'mb-4')}>
          {!isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              Main
            </h3>
          )}
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink key={item.id} item={item} collapsed={isCollapsed} />
            ))}
          </div>
        </div>

        <div className={clsx('mb-6', isCollapsed && 'mb-4')}>
          {!isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              Tools
            </h3>
          )}
          <div className="space-y-1">
            {secondaryItems.map((item) => (
              <NavLink key={item.id} item={item} collapsed={isCollapsed} />
            ))}
          </div>
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-3">
        {user && (
          <div className={clsx('flex items-center', isCollapsed ? 'justify-center' : 'space-x-3')}>
            {!isCollapsed && (
              <>
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  title="Logout"
                >
                  <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                </button>
              </>
            )}
            {isCollapsed && (
              <button
                onClick={handleLogout}
                className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white hover:bg-accent-700 transition-colors"
                title="Logout"
              >
                <UserIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        exit={{ x: -300 }}
        className="fixed inset-y-0 left-0 z-50 w-64"
      >
        {sidebarContent}
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex-shrink-0"
    >
      {sidebarContent}
    </motion.div>
  );
};

export default Sidebar;