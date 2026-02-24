import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  FireIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import { NewPainPointModal } from '@/components/forms';
import AdvancedTable from '@/components/AdvancedTable';
import type { TableColumn } from '@/components/AdvancedTable';

interface PainPoint {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'process' | 'business' | 'user-experience';
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  firstReported: string;
  lastReported: string;
  affectedMeetings: number;
  status: 'open' | 'investigating' | 'resolved';
  assignee: string;
  tags: string[];
}

const mockPainPoints: PainPoint[] = [
  {
    id: '1',
    title: 'Slow API Response Times',
    description: 'Customers reporting delays in API responses affecting their applications',
    category: 'technical',
    severity: 'high',
    frequency: 8,
    firstReported: '2024-01-15T10:00:00Z',
    lastReported: '2024-02-23T14:30:00Z',
    affectedMeetings: 12,
    status: 'investigating',
    assignee: 'Alex Rodriguez',
    tags: ['api', 'performance', 'backend']
  },
  {
    id: '2',
    title: 'Complex Onboarding Process',
    description: 'New customers finding the initial setup process too complicated',
    category: 'user-experience',
    severity: 'medium',
    frequency: 5,
    firstReported: '2024-02-01T09:00:00Z',
    lastReported: '2024-02-22T16:00:00Z',
    affectedMeetings: 8,
    status: 'open',
    assignee: 'Sarah Johnson',
    tags: ['onboarding', 'ux', 'documentation']
  },
  {
    id: '3',
    title: 'Missing Integration with Salesforce',
    description: 'Enterprise clients need native Salesforce integration capabilities',
    category: 'business',
    severity: 'high',
    frequency: 6,
    firstReported: '2024-01-20T11:30:00Z',
    lastReported: '2024-02-20T13:45:00Z',
    affectedMeetings: 9,
    status: 'open',
    assignee: 'Mike Chen',
    tags: ['integration', 'salesforce', 'enterprise']
  },
  {
    id: '4',
    title: 'Inconsistent Data Export Format',
    description: 'Data exports have formatting inconsistencies across different reports',
    category: 'process',
    severity: 'low',
    frequency: 3,
    firstReported: '2024-02-05T14:00:00Z',
    lastReported: '2024-02-18T10:15:00Z',
    affectedMeetings: 4,
    status: 'resolved',
    assignee: 'Emma Davis',
    tags: ['export', 'formatting', 'data']
  }
];

const PainPointsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPainPoints, setSelectedPainPoints] = useState<string[]>([]);
  const [painPoints, setPainPoints] = useState(mockPainPoints);
  const [isNewPainPointModalOpen, setIsNewPainPointModalOpen] = useState(false);

  const filteredPainPoints = useMemo(() => {
    return painPoints.filter(painPoint => {
      const matchesSearch = painPoint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        painPoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        painPoint.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || painPoint.category === categoryFilter;
      const matchesSeverity = severityFilter === 'all' || painPoint.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || painPoint.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
    });
  }, [painPoints, searchQuery, categoryFilter, severityFilter, statusFilter]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1"><FireIcon className="w-3 h-3" />Critical</span>;
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
      case 'open':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Open</span>;
      case 'investigating':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Investigating</span>;
      case 'resolved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Resolved</span>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'technical':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Technical</span>;
      case 'process':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Process</span>;
      case 'business':
        return <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">Business</span>;
      case 'user-experience':
        return <span className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400">UX</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const columns: TableColumn<PainPoint>[] = [
    {
      key: 'title',
      label: 'Pain Point',
      sortable: true,
      searchable: true,
      render: (value, row) => (
        <div className="flex items-start space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            row.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
            row.severity === 'high' ? 'bg-orange-100 dark-bg-orange-900/30' :
            row.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
            'bg-green-100 dark:bg-green-900/30'
          }`}>
            <ExclamationTriangleIcon className={`w-4 h-4 ${
              row.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
              row.severity === 'high' ? 'text-orange-600 dark:text-orange-400' :
              row.severity === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-green-600 dark:text-green-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{row.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {row.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      filterable: true,
      render: (value) => getCategoryBadge(value)
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      filterable: true,
      render: (value) => getSeverityBadge(value)
    },
    {
      key: 'frequency',
      label: 'Frequency',
      sortable: true,
      render: (value, row) => (
        <div className="text-center">
          <div className="flex items-center space-x-2 mb-1">
            <ChartBarIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{value}x</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.affectedMeetings} meetings</p>
        </div>
      )
    },
    {
      key: 'assignee',
      label: 'Assignee',
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
      key: 'lastReported',
      label: 'Last Reported',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{formatDate(value)}</span>
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

  const handleNewPainPoint = async (painPointData: Partial<PainPoint>) => {
    try {
      // Generate a new ID (in real app, this would be handled by the backend)
      const id = `${Date.now()}`;
      
      const newPainPoint: PainPoint = {
        id,
        title: painPointData.title!,
        description: painPointData.description!,
        category: painPointData.category as 'technical' | 'process' | 'business' | 'user-experience',
        severity: painPointData.severity as 'low' | 'medium' | 'high' | 'critical',
        frequency: 1,
        firstReported: new Date().toISOString(),
        lastReported: new Date().toISOString(),
        affectedMeetings: 1,
        status: 'open',
        assignee: painPointData.assignee!,
        tags: painPointData.tags || [],
      };

      // Add to pain points state (in real app, this would be an API call)
      setPainPoints(prev => [newPainPoint, ...prev]);
      
      console.log('New pain point created:', newPainPoint);
    } catch (error) {
      console.error('Error creating pain point:', error);
    }
  };

  const handleViewPainPoint = (painPoint: PainPoint) => {
    // In a real app, this could navigate to a detail page or open a detail modal
    alert(`Pain Point Details:\\n\\nTitle: ${painPoint.title}\\nDescription: ${painPoint.description}\\nSeverity: ${painPoint.severity}\\nStatus: ${painPoint.status}\\nAssignee: ${painPoint.assignee}`);
  };

  const handleAssignPainPoint = (painPoint: PainPoint) => {
    // In a real app, this would open an assignment modal
    const newAssignee = prompt('Assign to:', painPoint.assignee);
    if (newAssignee && newAssignee !== painPoint.assignee) {
      setPainPoints(prev => 
        prev.map(p => 
          p.id === painPoint.id 
            ? { ...p, assignee: newAssignee }
            : p
        )
      );
    }
  };

  const stats = [
    {
      title: 'Total Pain Points',
      value: painPoints.length,
      change: '+2',
      positive: false,
      icon: ExclamationTriangleIcon
    },
    {
      title: 'Open Issues',
      value: painPoints.filter(p => p.status === 'open').length,
      change: '+1',
      positive: false,
      icon: FireIcon
    },
    {
      title: 'Avg Resolution Time',
      value: '5.2d',
      change: '-1.1d',
      positive: true,
      icon: ClockIcon
    },
    {
      title: 'Affected Meetings',
      value: painPoints.reduce((acc, p) => acc + p.affectedMeetings, 0),
      change: '+8',
      positive: false,
      icon: UserGroupIcon
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pain Points</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Identify and track customer pain points discovered during meetings.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setIsNewPainPointModalOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Report Pain Point
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
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search pain points..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="technical">Technical</option>
            <option value="process">Process</option>
            <option value="business">Business</option>
            <option value="user-experience">User Experience</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
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
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </Card>

      {/* Pain Points Table */}
      <Card>
        <AdvancedTable
          data={filteredPainPoints}
          columns={columns}
          selectable={true}
          selectedRows={selectedPainPoints}
          onSelectionChange={setSelectedPainPoints}
          actions={[
            {
              label: 'View Details',
              onClick: handleViewPainPoint,
              variant: 'primary'
            },
            {
              label: 'Assign',
              onClick: handleAssignPainPoint
            }
          ]}
          emptyMessage="No pain points found"
          emptyDescription="Great news! No pain points have been reported yet."
        />
      </Card>

      {/* New Pain Point Modal */}
      <NewPainPointModal
        isOpen={isNewPainPointModalOpen}
        onClose={() => setIsNewPainPointModalOpen(false)}
        onSubmit={handleNewPainPoint}
      />
    </div>
  );
};

export default PainPointsPage;