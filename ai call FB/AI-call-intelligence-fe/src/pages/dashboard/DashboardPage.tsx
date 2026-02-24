import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon,
  ListBulletIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BellIcon,
  PlayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store';
import { Breadcrumb } from '@/components/layouts';
import { useToast } from '@/contexts/NotificationContext';
import AdvancedTable from '@/components/AdvancedTable';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [realtimeData, setRealtimeData] = useState({
    activeMeetings: 3,
    onlineUsers: 42,
    pendingActions: 17,
    systemHealth: 98.5
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate real-time data updates
  useEffect(() => {
    const dataTimer = setInterval(() => {
      setRealtimeData(prev => ({
        activeMeetings: Math.max(0, prev.activeMeetings + Math.floor(Math.random() * 3) - 1),
        onlineUsers: Math.max(0, prev.onlineUsers + Math.floor(Math.random() * 5) - 2),
        pendingActions: Math.max(0, prev.pendingActions + Math.floor(Math.random() * 3) - 1),
        systemHealth: Math.min(100, Math.max(90, prev.systemHealth + (Math.random() - 0.5) * 2))
      }));
    }, 5000);
    
    return () => clearInterval(dataTimer);
  }, []);

  // Demo notification on mount
  useEffect(() => {
    setTimeout(() => {
      toast.success(
        'System Status', 
        'All services are operational and running smoothly.',
        { duration: 3000 }
      );
    }, 2000);
  }, []); // Remove toast from dependency array to prevent infinite loop

  const statsCards = [
    {
      title: 'Total Meetings',
      value: '1,247',
      change: '+12%',
      changeType: 'positive',
      icon: VideoCameraIcon,
      color: 'blue',
      realtime: realtimeData.activeMeetings,
      realtimeLabel: 'Active now',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      darkBgGradient: 'from-blue-900/20 to-blue-800/20'
    },
    {
      title: 'People',
      value: '342',
      change: '+5%',
      changeType: 'positive',
      icon: UsersIcon,
      color: 'green',
      realtime: realtimeData.onlineUsers,
      realtimeLabel: 'Online',
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
      darkBgGradient: 'from-green-900/20 to-green-800/20'
    },
    {
      title: 'Pain Points',
      value: '89',
      change: '-8%',
      changeType: 'negative',
      icon: ExclamationTriangleIcon,
      color: 'red',
      realtime: 89 - realtimeData.pendingActions,
      realtimeLabel: 'Unresolved',
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-50 to-red-100',
      darkBgGradient: 'from-red-900/20 to-red-800/20'
    },
    {
      title: 'Action Items',
      value: '156',
      change: '+23%',
      changeType: 'positive',
      icon: ListBulletIcon,
      color: 'purple',
      realtime: realtimeData.pendingActions,
      realtimeLabel: 'Pending',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      darkBgGradient: 'from-purple-900/20 to-purple-800/20'
    },
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'meeting':
        toast.info('New Meeting', 'Meeting room initialized. Share the link to get started.');
        break;
      case 'person':
        toast.success('Person Added', 'New person has been successfully registered.');
        break;
      case 'analytics':
        toast.info('Analytics', 'Loading comprehensive analytics dashboard...');
        break;
      case 'tasks':
        toast.warning('Tasks Review', 'You have 17 pending action items that need attention.');
        break;
      default:
        break;
    }
  };

  // Sample data for recent meetings table
  const meetingsTableData = [
    {
      id: '1',
      title: 'Product Strategy Meeting',
      participants: 'John Doe, Jane Smith, Mike Johnson',
      date: '2024-02-24',
      duration: '45 min',
      status: 'completed',
      painPoints: 3,
      sentiment: 'positive'
    },
    {
      id: '2',
      title: 'Quarterly Business Review',
      participants: 'Mike Johnson, Sarah Wilson',
      date: '2024-02-23',
      duration: '90 min',
      status: 'completed',
      painPoints: 1,
      sentiment: 'neutral'
    },
    {
      id: '3',
      title: 'Vendor Partnership Call',
      participants: 'Bob Brown, Alice Green, Tom White',
      date: '2024-02-22',
      duration: '30 min',
      status: 'completed',
      painPoints: 5,
      sentiment: 'negative'
    },
  ];

  const meetingsColumns = [
    {
      key: 'title',
      label: 'Meeting Title',
      sortable: true,
      searchable: true,
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.participants}</div>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.duration}</div>
        </div>
      )
    },
    {
      key: 'painPoints',
      label: 'Pain Points',
      sortable: true,
      align: 'center' as const,
      render: (value: number) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value === 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
          value <= 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'sentiment',
      label: 'Sentiment',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
          value === 'neutral' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {value}
        </span>
      )
    }
  ];

  const meetingsActions = [
    {
      label: 'View Details',
      onClick: (row: any) => toast.info('Meeting Details', `Loading details for ${row.title}`),
      icon: EyeIcon,
      variant: 'primary' as const
    },
    {
      label: 'Play Recording',
      onClick: (row: any) => toast.success('Playing Recording', `Starting playback for ${row.title}`),
      icon: PlayIcon,
      variant: 'secondary' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Real-time Info */}
      <div className="relative">
        <Breadcrumb items={[]} />
        <div className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Here's what's happening with your meetings today • {currentTime.toLocaleTimeString()}
              </p>
            </div>
            
            {/* System Health Indicator */}
            <div className="mt-4 lg:mt-0">
              <div className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/10 rounded-2xl p-4 border border-white/20 dark:border-gray-700/20">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    realtimeData.systemHealth > 95 ? 'bg-green-500' : 
                    realtimeData.systemHealth > 90 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      System Health: {realtimeData.systemHealth.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      All services operational
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Stats Cards with Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="group"
          >
            <div className="relative backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 shadow-lg hover:shadow-xl">
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} dark:bg-gradient-to-br ${stat.darkBgGradient} opacity-50 rounded-2xl`} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${stat.color === 'green' ? 'text-green-600 dark:text-green-400' : 
                      stat.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      stat.color === 'red' ? 'text-red-600 dark:text-red-400' :
                      'text-purple-600 dark:text-purple-400'}`}>
                      Live: {stat.realtime}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{stat.realtimeLabel}</div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {stat.value}
                  </p>
                  <div className="flex items-center">
                    {stat.changeType === 'positive' ? (
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-4 h-4 text-red-600 dark:text-red-400 mr-1" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        stat.changeType === 'positive'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      from last month
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Meetings Table - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="xl:col-span-2"
        >
          <div className="backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Recent Meetings
                </h2>
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </div>
            </div>
            <div className="p-6">
              <AdvancedTable
                data={meetingsTableData}
                columns={meetingsColumns}
                actions={meetingsActions}
                searchable={false}
                pagination={undefined}
                compact
                hoverable
                className="bg-transparent"
              />
            </div>
          </div>
        </motion.div>

        {/* Activity Feed - Takes 1 column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-6"
        >
          {/* Today's Schedule */}
          <div className="backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Today's Schedule
              </h3>
            </div>
            <div className="space-y-3">
              {[
                { time: '09:00', title: 'Team Standup', type: 'meeting' },
                { time: '11:30', title: 'Client Presentation', type: 'important' },
                { time: '14:00', title: 'Product Review', type: 'meeting' },
                { time: '16:30', title: 'One-on-One', type: 'personal' },
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-white/40 dark:bg-gray-700/40">
                  <div className={`w-2 h-2 rounded-full ${
                    item.type === 'important' ? 'bg-red-500' :
                    item.type === 'personal' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: VideoCameraIcon, label: 'New Meeting', action: 'meeting', color: 'blue' },
                { icon: UsersIcon, label: 'Add Person', action: 'person', color: 'green' },
                { icon: ChartBarIcon, label: 'Analytics', action: 'analytics', color: 'purple' },
                { icon: ListBulletIcon, label: 'Tasks', action: 'tasks', color: 'orange' },
              ].map((item, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleQuickAction(item.action)}
                  className={`p-4 rounded-xl bg-gradient-to-br ${
                    item.color === 'blue' ? 'from-blue-500 to-blue-600' :
                    item.color === 'green' ? 'from-green-500 to-green-600' :
                    item.color === 'purple' ? 'from-purple-500 to-purple-600' :
                    'from-orange-500 to-orange-600'
                  } text-white shadow-lg hover:shadow-xl transition-all duration-200 text-left`}
                >
                  <item.icon className="w-6 h-6 mb-2" />
                  <div className="text-sm font-medium">{item.label}</div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Notifications Demo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <div className="backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <BellIcon className="w-5 h-5 mr-2" />
            Notification System Demo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="secondary" 
              onClick={() => toast.success('Success!', 'Operation completed successfully.')}
              className="justify-center"
            >
              Success Toast
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => toast.error('Error!', 'Something went wrong. Please try again.')}
              className="justify-center"
            >
              Error Toast
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => toast.warning('Warning!', 'Please review your settings before proceeding.')}
              className="justify-center"
            >
              Warning Toast
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => toast.info('Info', 'Here is some helpful information for you.')}
              className="justify-center"
            >
              Info Toast
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;