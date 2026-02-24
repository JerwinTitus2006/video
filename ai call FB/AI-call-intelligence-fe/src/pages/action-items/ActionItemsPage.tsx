import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ListBulletIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import { NewActionItemModal } from '@/components/forms';
import AdvancedTable from '@/components/AdvancedTable';
import type { TableColumn } from '@/components/AdvancedTable';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'completed' | 'overdue';
  createdDate: string;
  meetingId: string;
  meetingTitle: string;
  category: 'follow-up' | 'research' | 'development' | 'documentation' | 'meeting';
  tags: string[];
  progress: number;
}

const mockActionItems: ActionItem[] = [
  {
    id: '1',
    title: 'Follow up on API performance issues',
    description: 'Investigate and resolve the API response time problems discussed with TechCorp',
    assignee: 'Alex Rodriguez',
    dueDate: '2024-02-28T17:00:00Z',
    priority: 'high',
    status: 'in-progress',
    createdDate: '2024-02-23T14:00:00Z',
    meetingId: '1',
    meetingTitle: 'Q4 Sales Review',
    category: 'follow-up',
    tags: ['api', 'performance', 'techcorp'],
    progress: 65
  },
  {
    id: '2',
    title: 'Prepare Salesforce integration proposal',
    description: 'Create detailed proposal for native Salesforce integration based on client feedback',
    assignee: 'Mike Chen',
    dueDate: '2024-03-05T12:00:00Z',
    priority: 'high',
    status: 'todo',
    createdDate: '2024-02-22T10:30:00Z',
    meetingId: '2',
    meetingTitle: 'Client Discovery Call - TechCorp',
    category: 'development',
    tags: ['salesforce', 'integration', 'proposal'],
    progress: 0
  },
  {
    id: '3',
    title: 'Update product roadmap documentation',
    description: 'Reflect the new priorities and timelines discussed in the roadmap meeting',
    assignee: 'Sarah Johnson',
    dueDate: '2024-02-26T16:00:00Z',
    priority: 'medium',
    status: 'completed',
    createdDate: '2024-02-22T16:00:00Z',
    meetingId: '3',
    meetingTitle: 'Product Roadmap Discussion',
    category: 'documentation',
    tags: ['roadmap', 'documentation', 'planning'],
    progress: 100
  },
  {
    id: '4',
    title: 'Schedule vendor contract review',
    description: 'Arrange follow-up meeting to discuss contract terms with CloudServ',
    assignee: 'Emma Davis',
    dueDate: '2024-02-25T10:00:00Z',
    priority: 'urgent',
    status: 'overdue',
    createdDate: '2024-02-22T11:00:00Z',
    meetingId: '4',
    meetingTitle: 'Vendor Negotiation - CloudServ',
    category: 'meeting',
    tags: ['vendor', 'contract', 'cloudserv'],
    progress: 25
  },
  {
    id: '5',
    title: 'Research competitor pricing models',
    description: 'Analyze pricing strategies of key competitors mentioned in the standup',
    assignee: 'David Kim',
    dueDate: '2024-03-01T15:00:00Z',
    priority: 'low',
    status: 'todo',
    createdDate: '2024-02-23T09:00:00Z',
    meetingId: '5',
    meetingTitle: 'Team Standup',
    category: 'research',
    tags: ['research', 'pricing', 'competitors'],
    progress: 0
  }
];

const ActionItemsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [selectedActionItems, setSelectedActionItems] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState(mockActionItems);
  const [isNewActionItemModalOpen, setIsNewActionItemModalOpen] = useState(false);

  const filteredActionItems = useMemo(() => {
    return actionItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesAssignee = assigneeFilter === 'all' || item.assignee === assigneeFilter;
      
      return matchesSearch && matchesPriority && matchesStatus && matchesAssignee;
    });
  }, [actionItems, searchQuery, priorityFilter, statusFilter, assigneeFilter]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1"><ExclamationCircleIcon className="w-3 h-3" />Urgent</span>;
      case 'high':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">High</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Medium</span>;
      case 'low':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Low</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" />Completed</span>;
      case 'in-progress':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">In Progress</span>;
      case 'todo':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">To Do</span>;
      case 'overdue':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Overdue</span>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'follow-up':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Follow-up</span>;
      case 'research':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Research</span>;
      case 'development':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Development</span>;
      case 'documentation':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Documentation</span>;
      case 'meeting':
        return <span className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400">Meeting</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)}d`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays}d`;
    }
  };

  const columns: TableColumn<ActionItem>[] = [
    {
      key: 'title',
      label: 'Action Item',
      sortable: true,
      searchable: true,
      render: (value, row) => (
        <div className="flex items-start space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            row.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
            row.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/30' :
            row.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/30' :
            'bg-gray-100 dark:bg-gray-700'
          }`}>
            {row.status === 'completed' ? (
              <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <ListBulletIcon className={`w-4 h-4 ${
                row.status === 'in-progress' ? 'text-blue-600 dark:text-blue-400' :
                row.status === 'overdue' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{row.description}</p>
            <div className="flex items-center space-x-2 mt-2">
              {getCategoryBadge(row.category)}
              <span className="text-xs text-gray-400">from {row.meetingTitle}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'assignee',
      label: 'Assignee',
      filterable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center">
            <span className="text-accent text-xs font-medium">{value.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-sm">{value}</span>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      filterable: true,
      render: (value) => getPriorityBadge(value)
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (value, row) => {
        const isOverdue = new Date(value) < new Date() && row.status !== 'completed';
        return (
          <div className="flex items-center space-x-2">
            <CalendarIcon className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`} />
            <div>
              <span className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                {new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                {formatDate(value)}
              </p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                row.status === 'completed' ? 'bg-green-500' :
                row.status === 'in-progress' ? 'bg-blue-500' :
                row.status === 'overdue' ? 'bg-red-500' :
                'bg-gray-400'
              }`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}%</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      render: (value) => getStatusBadge(value)
    }
  ];

  const handleNewActionItem = async (actionItemData: Partial<ActionItem>) => {
    try {
      // Generate a new ID (in real app, this would be handled by the backend)
      const id = `${Date.now()}`;
      
      const newActionItem: ActionItem = {
        id,
        title: actionItemData.title!,
        description: actionItemData.description!,
        assignee: actionItemData.assignee!,
        dueDate: actionItemData.dueDate!,
        priority: actionItemData.priority as 'low' | 'medium' | 'high' | 'urgent',
        status: 'todo',
        createdDate: new Date().toISOString(),
        meetingId: actionItemData.meetingId || `meeting-${Date.now()}`,
        meetingTitle: actionItemData.meetingTitle || 'Manual Entry',
        category: actionItemData.category as 'follow-up' | 'research' | 'development' | 'documentation' | 'meeting',
        tags: actionItemData.tags || [],
        progress: 0,
      };

      // Add to action items state (in real app, this would be an API call)
      setActionItems(prev => [newActionItem, ...prev]);
      
      console.log('New action item created:', newActionItem);
    } catch (error) {
      console.error('Error creating action item:', error);
    }
  };

  const handleUpdateActionItem = (actionItem: ActionItem, updates: Partial<ActionItem>) => {
    setActionItems(prev => 
      prev.map(item => 
        item.id === actionItem.id 
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const handleMarkComplete = (actionItem: ActionItem) => {
    handleUpdateActionItem(actionItem, { 
      status: 'completed', 
      progress: 100 
    });
  };

  const handleViewActionItem = (actionItem: ActionItem) => {
    // In a real app, this could navigate to a detail page or open a detail modal
    alert(`Action Item Details:\\n\\nTitle: ${actionItem.title}\\nDescription: ${actionItem.description}\\nAssignee: ${actionItem.assignee}\\nDue: ${new Date(actionItem.dueDate).toLocaleDateString()}\\nPriority: ${actionItem.priority}\\nStatus: ${actionItem.status}\\nProgress: ${actionItem.progress}%`);
  };

  const uniqueAssignees = Array.from(new Set(actionItems.map(item => item.assignee)));

  const stats = [
    {
      title: 'Total Action Items',
      value: actionItems.length,
      change: '+3',
      positive: true,
      icon: ListBulletIcon
    },
    {
      title: 'Completed',
      value: actionItems.filter(item => item.status === 'completed').length,
      change: '+2',
      positive: true,
      icon: CheckCircleIcon
    },
    {
      title: 'In Progress',
      value: actionItems.filter(item => item.status === 'in-progress').length,
      change: '+1',
      positive: true,
      icon: ClockIcon
    },
    {
      title: 'Overdue',
      value: actionItems.filter(item => item.status === 'overdue').length,
      change: '-1',
      positive: false,
      icon: ExclamationCircleIcon
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Action Items</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track and manage action items generated from meetings and discussions.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setIsNewActionItemModalOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          New Action Item
        </Button>
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
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from last period</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search action items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Assignees</option>
            {uniqueAssignees.map(assignee => (
              <option key={assignee} value={assignee}>{assignee}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Action Items Table */}
      <Card>
        <AdvancedTable
          data={filteredActionItems}
          columns={columns}
          selectable={true}
          selectedRows={selectedActionItems}
          onSelectionChange={setSelectedActionItems}
          actions={[
            {
              label: 'Mark Complete',
              onClick: handleMarkComplete,
              variant: 'primary',
              disabled: (item) => item.status === 'completed'
            },
            {
              label: 'View Details',
              onClick: handleViewActionItem
            }
          ]}
          bulkActions={[
            {
              label: 'Mark Selected Complete',
              onClick: () => {
                selectedActionItems.forEach(id => {
                  const item = actionItems.find(i => i.id === id);
                  if (item && item.status !== 'completed') {
                    handleMarkComplete(item);
                  }
                });
                setSelectedActionItems([]);
              }
            }
          ]}
          emptyMessage="No action items found"
          emptyDescription="Action items will appear here when they're created from meeting discussions."
        />
      </Card>

      {/* New Action Item Modal */}
      <NewActionItemModal
        isOpen={isNewActionItemModalOpen}
        onClose={() => setIsNewActionItemModalOpen(false)}
        onSubmit={handleNewActionItem}
      />
    </div>
  );
};

export default ActionItemsPage;