import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import AdvancedTable from '@/components/AdvancedTable';
import type { TableColumn } from '@/components/AdvancedTable';

interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  department: string;
  meetingsCount: number;
  lastMeeting: string;
  status: 'active' | 'inactive';
  avgSentiment: 'positive' | 'neutral' | 'negative';
  engagementScore: number;
}

const mockPersons: Person[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 123-4567',
    company: 'TechCorp Inc.',
    role: 'Sales Director',
    department: 'Sales',
    meetingsCount: 24,
    lastMeeting: '2024-02-23T14:00:00Z',
    status: 'active',
    avgSentiment: 'positive',
    engagementScore: 85
  },
  {
    id: '2',
    name: 'Mike Chen',
    email: 'mike.chen@company.com',
    phone: '+1 (555) 234-5678',
    company: 'TechCorp Inc.',
    role: 'Account Manager',
    department: 'Sales',
    meetingsCount: 18,
    lastMeeting: '2024-02-22T10:30:00Z',
    status: 'active',
    avgSentiment: 'positive',
    engagementScore: 92
  },
  {
    id: '3',
    name: 'Alex Rodriguez',
    email: 'alex.rodriguez@company.com',
    phone: '+1 (555) 345-6789',
    company: 'TechCorp Inc.',
    role: 'Product Manager',
    department: 'Product',
    meetingsCount: 31,
    lastMeeting: '2024-02-21T16:00:00Z',
    status: 'active',
    avgSentiment: 'neutral',
    engagementScore: 78
  },
  {
    id: '4',
    name: 'Emma Davis',
    email: 'emma.davis@vendor.com',
    phone: '+1 (555) 456-7890',
    company: 'CloudServ Solutions',
    role: 'Solutions Architect',
    department: 'Technical',
    meetingsCount: 12,
    lastMeeting: '2024-02-20T11:00:00Z',
    status: 'active',
    avgSentiment: 'negative',
    engagementScore: 65
  }
];

const PersonsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);

  const filteredPersons = useMemo(() => {
    return mockPersons.filter(person => {
      const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.company.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'all' || person.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
      
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [searchQuery, departmentFilter, statusFilter]);

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</span>
    ) : (
      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Inactive</span>
    );
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Positive</span>;
      case 'neutral':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Neutral</span>;
      case 'negative':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Negative</span>;
      default:
        return null;
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const columns: TableColumn<Person>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      searchable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
            <span className="text-accent font-medium text-sm">{value.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.role}</p>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Contact',
      render: (value, row) => (
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{value}</span>
          </div>
          <div className="flex items-center space-x-2">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{row.phone}</span>
          </div>
        </div>
      )
    },
    {
      key: 'company',
      label: 'Organization',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-sm">{value}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{row.department}</span>
        </div>
      )
    },
    {
      key: 'meetingsCount',
      label: 'Meetings',
      sortable: true,
      render: (value) => (
        <div className="text-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white">{value}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">total</p>
        </div>
      )
    },
    {
      key: 'engagementScore',
      label: 'Engagement',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${getEngagementColor(value)}`}>{value}%</span>
        </div>
      )
    },
    {
      key: 'avgSentiment',
      label: 'Sentiment',
      render: (value) => getSentimentBadge(value)
    },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      render: (value) => getStatusBadge(value)
    }
  ];

  const stats = [
    {
      title: 'Total People',
      value: mockPersons.length,
      change: '+5',
      positive: true,
      icon: UsersIcon
    },
    {
      title: 'Active',
      value: mockPersons.filter(p => p.status === 'active').length,
      change: '+2',
      positive: true,
      icon: UsersIcon
    },
    {
      title: 'Avg Engagement',
      value: `${Math.round(mockPersons.reduce((acc, p) => acc + p.engagementScore, 0) / mockPersons.length)}%`,
      change: '+3%',
      positive: true,
      icon: UsersIcon
    },
    {
      title: 'Companies',
      value: new Set(mockPersons.map(p => p.company)).size,
      change: '+1',
      positive: true,
      icon: BuildingOfficeIcon
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">People</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage contacts, analyze participant behavior, and track engagement metrics.
          </p>
        </div>
        <Button 
          className="shrink-0" 
          onClick={() => alert('Add Person functionality would open a modal form to add a new person contact')}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Person
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
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
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
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Departments</option>
            <option value="Sales">Sales</option>
            <option value="Product">Product</option>
            <option value="Technical">Technical</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* People Table */}
      <Card>
        <AdvancedTable
          data={filteredPersons}
          columns={columns}
          selectable={true}
          selectedRows={selectedPersons}
          onSelectionChange={setSelectedPersons}
          actions={[
            {
              label: 'View Profile',
              onClick: (person) => alert(`Viewing profile for ${person.name}\\n\\nRole: ${person.role}\\nCompany: ${person.company}\\nEmail: ${person.email}\\nMeetings: ${person.meetingsCount}\\nEngagement: ${person.engagementScore}%`),
              variant: 'primary'
            },
            {
              label: 'Send Message',
              onClick: (person) => alert(`Opening email client to send message to ${person.name} (${person.email})`),
              icon: EnvelopeIcon
            }
          ]}
          emptyMessage="No people found"
          emptyDescription="Start by adding contacts or importing from your CRM."
        />
      </Card>
    </div>
  );
};

export default PersonsPage;