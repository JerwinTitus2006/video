import React from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  BellIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { useAuthStore, useUIStore } from '@/store';
import { Button } from '@/components/ui';

const Header: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    theme, 
    toggleTheme,
    toggleSidebar,
    isMobile,
    unreadCount,
    setSearchOpen
  } = useUIStore();

  const handleSearchClick = () => {
    setSearchOpen(true);
  };

  const themeIcons = {
    light: SunIcon,
    dark: MoonIcon,
    system: ComputerDesktopIcon,
  };

  const ThemeIcon = themeIcons[theme];

  return (
    <motion.header
      className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-4 sm:px-6 lg:px-8"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex h-16 items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
            >
              <Bars3Icon className="w-5 h-5" />
            </Button>
          )}

          {/* Search */}
          <div className="hidden sm:block">
            <button
              onClick={handleSearchClick}
              className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors w-64"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              <span className="text-sm">Search meetings, people...</span>
            </button>
          </div>

          {/* Mobile search button */}
          <div className="sm:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSearchClick}
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-3">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="relative"
          >
            <ThemeIcon className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative"
          >
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* User menu */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {user.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                  {user.role}
                </p>
              </div>
              
              <button className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;