import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  XMarkIcon,
  FunnelIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import AdvancedTable from '@/components/AdvancedTable';
import type { TableColumn } from '@/components/AdvancedTable';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'meeting' | 'action-item' | 'pain-point' | 'system' | 'mention' | 'reminder';
  isRead: boolean;
  isArchived: boolean;
  createdDate: string;
  source: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Pain Point Identified',
    message: 'A high-severity pain point "Slow API Response Times" was identified in the TechCorp meeting.',
    type: 'warning',
    category: 'pain-point',
    isRead: false,
    isArchived: false,
    createdDate: '2024-02-23T15:30:00Z',
    source: 'AI Analysis',
    actionUrl: '/pain-points/1',
    metadata: {
      severity: 'high',
      meetingId: '1',
      meetingTitle: 'Q4 Sales Review'
    }
  },
  {
    id: '2',
    title: 'Action Item Due Soon',
    message: 'Follow up on API performance issues is due in 2 days. Assigned to Alex Rodriguez.',
    type: 'warning',
    category: 'action-item',
    isRead: false,
    isArchived: false,
    createdDate: '2024-02-23T14:00:00Z',
    source: 'Task Reminder',
    actionUrl: '/action-items/1',
    metadata: {
      dueDate: '2024-02-28T17:00:00Z',
      assignee: 'Alex Rodriguez',
      priority: 'high'
    }
  },
  {
    id: '3',
    title: 'Weekly Report Generated',
    message: 'Your weekly meeting summary report for Feb 19-23, 2024 is now available.',
    type: 'success',
    category: 'system',
    isRead: true,
    isArchived: false,
    createdDate: '2024-02-23T10:00:00Z',
    source: 'Report Generator',
    actionUrl: '/reports/1',
    metadata: {
      reportType: 'weekly-summary',
      period: 'Feb 19-23, 2024'
    }
  },
  {
    id: '4',
    title: 'Mentioned in Meeting',
    message: 'You were mentioned in "Client Discovery Call - TechCorp" by Sarah Johnson.',
    type: 'info',
    category: 'mention',
    isRead: true,
    isArchived: false,
    createdDate: '2024-02-22T11:45:00Z',
    source: 'Meeting Transcript',
    actionUrl: '/meetings/2',
    metadata: {
      mentionedBy: 'Sarah Johnson',
      meetingId: '2',
      timestamp: '0:23:15'
    }
  },
  {
    id: '5',
    title: 'Meeting Recording Processed',
    message: 'The transcript and analysis for "Product Roadmap Discussion" is now ready.',
    type: 'success',
    category: 'meeting',
    isRead: true,
    isArchived: false,
    createdDate: '2024-02-22T17:30:00Z',
    source: 'AI Processing',
    actionUrl: '/meetings/3',
    metadata: {
      meetingId: '3',
      processingTime: '5m 23s',
      sentiment: 'neutral'
    }
  },
  {
    id: '6',
    title: 'Overdue Action Item',
    message: 'Schedule vendor contract review is now overdue. Originally due on Feb 25.',
    type: 'error',
    category: 'action-item',
    isRead: false,
    isArchived: false,
    createdDate: '2024-02-26T09:00:00Z',
    source: 'Task Monitor',
    actionUrl: '/action-items/4',
    metadata: {
      originalDueDate: '2024-02-25T10:00:00Z',
      assignee: 'Emma Davis',
      daysOverdue: 1
    }
  },
  {
    id: '7',
    title: 'System Maintenance Scheduled',
    message: 'Planned system maintenance on March 1st from 2-4 AM EST. Services may be unavailable.',
    type: 'info',
    category: 'system',
    isRead: false,
    isArchived: false,
    createdDate: '2024-02-21T16:00:00Z',
    source: 'System Admin',
    metadata: {
      maintenanceStart: '2024-03-01T02:00:00Z',
      maintenanceEnd: '2024-03-01T04:00:00Z',
      affectedServices: ['transcription', 'analysis']
    }
  },
  {
    id: '8',
    title: 'New Team Member Added',
    message: 'Jessica Wong has been added to your team and will receive meeting notifications.',
    type: 'info',
    category: 'system',
    isRead: true,
    isArchived: false,
    createdDate: '2024-02-20T13:15:00Z',
    source: 'Team Management',
    metadata: {
      newMember: 'Jessica Wong',
      role: 'Sales Associate',
      addedBy: 'Sarah Johnson'
    }
  }
];

const NotificationsPage: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const filteredNotifications = useMemo(() => {
    return mockNotifications.filter(notification => {
      const matchesType = filterType === 'all' || notification.type === filterType;
      const matchesCategory = filterCategory === 'all' || notification.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'unread' && !notification.isRead) ||
        (filterStatus === 'read' && notification.isRead) ||
        (filterStatus === 'archived' && notification.isArchived);
      
      return matchesType && matchesCategory && matchesStatus;
    });
  }, [filterType, filterCategory, filterStatus]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return CheckCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'error':
        return ExclamationTriangleIcon;
      case 'info':
      default:
        return InformationCircleIcon;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'info':
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryMap = {
      meeting: { label: 'Meeting', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      'action-item': { label: 'Action Item', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
      'pain-point': { label: 'Pain Point', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
      system: { label: 'System', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
      mention: { label: 'Mention', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      reminder: { label: 'Reminder', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' }
    };

    const categoryInfo = categoryMap[category as keyof typeof categoryMap] || categoryMap.system;
    return <span className={`px-2 py-1 text-xs rounded-full ${categoryInfo.color}`}>{categoryInfo.label}</span>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600));
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const columns: TableColumn<Notification>[] = [
    {
      key: 'title',
      label: 'Notification',
      sortable: true,
      render: (value, row) => {
        const Icon = getTypeIcon(row.type);
        return (
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColor(row.type)}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <p className={`font-medium ${!row.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {value}
                </p>
                {!row.isRead && (
                  <div className="w-2 h-2 bg-accent rounded-full" />
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{row.message}</p>
              <div className="flex items-center space-x-2 mt-2">
                {getCategoryBadge(row.category)}
                <span className="text-xs text-gray-400">{row.source}</span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'createdDate',
      label: 'Time',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(value)}</span>
        </div>
      )
    }
  ];

  const stats = [
    {
      title: 'Total Notifications',
      value: mockNotifications.length,
      change: '+3',
      positive: true,
      icon: BellIcon
    },
    {
      title: 'Unread',
      value: mockNotifications.filter(n => !n.isRead).length,
      change: '+2',
      positive: false,
      icon: ExclamationTriangleIcon
    },
    {
      title: 'Action Items Due',
      value: mockNotifications.filter(n => n.category === 'action-item' && !n.isRead).length,
      change: '+1',
      positive: false,
      icon: ClockIcon
    },
    {
      title: 'Pain Points Alert',
      value: mockNotifications.filter(n => n.category === 'pain-point' && !n.isRead).length,
      change: '+1',
      positive: false,
      icon: ExclamationTriangleIcon
    }
  ];

  const markAsRead = (notification: Notification) => {
    console.log('Mark as read:', notification.id);
  };

  const markAllAsRead = () => {
    console.log('Mark all as read');
  };

  const archiveNotification = (notification: Notification) => {
    console.log('Archive notification:', notification.id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Stay updated with alerts, reminders, and important updates from your meetings.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline">
            <Cog6ToothIcon className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.positive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <stat.icon className={`w-6 h-6 ${
                    stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from yesterday</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-1">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="meeting">Meetings</option>
            <option value="action-item">Action Items</option>
            <option value="pain-point">Pain Points</option>
            <option value="mention">Mentions</option>
            <option value="system">System</option>
            <option value="reminder">Reminders</option>
          </select>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification, index) => {
          const Icon = getTypeIcon(notification.type);
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-accent' : ''
              }`}>
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-accent rounded-full" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(notification.createdDate)}
                        </span>
                        <button
                          onClick={() => markAsRead(notification)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => archiveNotification(notification)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Archive"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{notification.message}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getCategoryBadge(notification.category)}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {notification.source}
                        </span>
                      </div>
                      
                      {notification.actionUrl && (
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredNotifications.length === 0 && (
        <Card className="p-12 text-center">
          <BellIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notifications found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            You're all caught up! New notifications will appear here when they arrive.
          </p>
        </Card>
      )}
    </div>
  );
};

export default NotificationsPage;