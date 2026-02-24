import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  CalendarIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import { NewReportModal } from '@/components/forms';
import AdvancedTable from '@/components/AdvancedTable';
import type { TableColumn } from '@/components/AdvancedTable';

interface Report {
  id: string;
  name: string;
  type: 'meeting-summary' | 'pain-point-analysis' | 'action-item-report' | 'sentiment-analysis' | 'participant-engagement' | 'custom';
  description: string;
  createdDate: string;
  createdBy: string;
  lastAccessed: string;
  status: 'generating' | 'ready' | 'failed' | 'scheduled';
  format: 'pdf' | 'xlsx' | 'csv' | 'pptx';
  size: number;
  downloads: number;
  shared: boolean;
  period: string;
  category: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
}

const mockReports: Report[] = [
  {
    id: '1',
    name: 'Weekly Meeting Summary - Feb 2024',
    type: 'meeting-summary',
    description: 'Comprehensive summary of all meetings conducted in February 2024',
    createdDate: '2024-02-23T10:00:00Z',
    createdBy: 'Sarah Johnson',
    lastAccessed: '2024-02-23T14:30:00Z',
    status: 'ready',
    format: 'pdf',
    size: 3458560, // 3.3MB
    downloads: 12,
    shared: true,
    period: 'Feb 19-23, 2024',
    category: 'weekly'
  },
  {
    id: '2',
    name: 'Q4 2023 Pain Point Analysis',
    type: 'pain-point-analysis',
    description: 'Analysis of customer pain points identified during Q4 2023 meetings',
    createdDate: '2024-01-15T09:00:00Z',
    createdBy: 'Alex Rodriguez',
    lastAccessed: '2024-02-20T11:15:00Z',
    status: 'ready',
    format: 'xlsx',
    size: 1572864, // 1.5MB
    downloads: 24,
    shared: true,
    period: 'Oct 1 - Dec 31, 2023',
    category: 'quarterly'
  },
  {
    id: '3',
    name: 'Action Items Progress Report',
    type: 'action-item-report',
    description: 'Current status and completion rates of all action items',
    createdDate: '2024-02-22T16:00:00Z',
    createdBy: 'Mike Chen',
    lastAccessed: '2024-02-23T09:45:00Z',
    status: 'ready',
    format: 'pdf',
    size: 2097152, // 2MB
    downloads: 8,
    shared: false,
    period: 'Feb 1-22, 2024',
    category: 'monthly'
  },
  {
    id: '4',
    name: 'Customer Sentiment Dashboard',
    type: 'sentiment-analysis',
    description: 'Real-time sentiment analysis across all customer interactions',
    createdDate: '2024-02-23T08:00:00Z',
    createdBy: 'Emma Davis',
    lastAccessed: '2024-02-23T08:00:00Z',
    status: 'generating',
    format: 'pptx',
    size: 0,
    downloads: 0,
    shared: true,
    period: 'Feb 1-23, 2024',
    category: 'monthly'
  },
  {
    id: '5',
    name: 'Participant Engagement Metrics',
    type: 'participant-engagement',
    description: 'Engagement scores and participation patterns for all team members',
    createdDate: '2024-02-20T14:30:00Z',
    createdBy: 'David Kim',
    lastAccessed: '2024-02-22T10:20:00Z',
    status: 'ready',
    format: 'csv',
    size: 524288, // 512KB
    downloads: 15,
    shared: true,
    period: 'Feb 1-20, 2024',
    category: 'custom'
  },
  {
    id: '6',
    name: 'Vendor Meeting Analysis',
    type: 'custom',
    description: 'Analysis of vendor relationship meetings and negotiation outcomes',
    createdDate: '2024-02-18T11:00:00Z',
    createdBy: 'Emma Davis',
    lastAccessed: '2024-02-21T15:10:00Z',
    status: 'failed',
    format: 'pdf',
    size: 0,
    downloads: 0,
    shared: false,
    period: 'Jan 1 - Feb 18, 2024',
    category: 'custom'
  }
];

const ReportsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [reports, setReports] = useState(mockReports);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || report.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
      
      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });
  }, [reports, searchQuery, typeFilter, statusFilter, categoryFilter]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" />Ready</span>;
      case 'generating':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1"><ClockIcon className="w-3 h-3" />Generating</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Failed</span>;
      case 'scheduled':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Scheduled</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'meeting-summary': { label: 'Meeting Summary', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      'pain-point-analysis': { label: 'Pain Points', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
      'action-item-report': { label: 'Action Items', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      'sentiment-analysis': { label: 'Sentiment', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
      'participant-engagement': { label: 'Engagement', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
      'custom': { label: 'Custom', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
    };

    const typeInfo = typeMap[type as keyof typeof typeMap] || typeMap.custom;
    return <span className={`px-2 py-1 text-xs rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>;
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return '📄';
      case 'xlsx':
        return '📊';
      case 'csv':
        return '📈';
      case 'pptx':
        return '📽️';
      default:
        return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const columns: TableColumn<Report>[] = [
    {
      key: 'name',
      label: 'Report Name',
      sortable: true,
      searchable: true,
      render: (value, row) => (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <span className="text-lg">{getFormatIcon(row.format)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{row.description}</p>
            <div className="flex items-center space-x-2 mt-2">
              {getTypeBadge(row.type)}
              {row.shared && (
                <span className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                  <ShareIcon className="w-3 h-3 mr-1" />
                  Shared
                </span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'createdBy',
      label: 'Created By',
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
      key: 'period',
      label: 'Period',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{value}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'size',
      label: 'Size',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatFileSize(value)}</span>
      )
    },
    {
      key: 'downloads',
      label: 'Downloads',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <ArrowDownTrayIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'createdDate',
      label: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(value)}</span>
      )
    }
  ];

  const reportTemplates = [
    {
      name: 'Weekly Meeting Summary',
      description: 'Summary of all meetings for the past week',
      icon: DocumentTextIcon,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
      name: 'Pain Point Analysis',
      description: 'Detailed analysis of identified customer pain points',
      icon: BuildingOfficeIcon,
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    },
    {
      name: 'Action Item Status',
      description: 'Progress report on all outstanding action items',
      icon: CheckCircleIcon,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
    },
    {
      name: 'Sentiment Analysis',
      description: 'Sentiment trends across meetings and participants',
      icon: ClockIcon,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    }
  ];

  const handleNewReport = async (reportData: Partial<Report>) => {
    try {
      // Generate a new ID (in real app, this would be handled by the backend)
      const id = `${Date.now()}`;
      
      const newReport: Report = {
        id,
        name: reportData.name!,
        type: reportData.type as 'meeting-summary' | 'pain-point-analysis' | 'action-item-report' | 'sentiment-analysis' | 'participant-engagement' | 'custom',
        description: reportData.description || `Generated ${reportData.type?.replace('-', ' ')} report`,
        createdDate: new Date().toISOString(),
        createdBy: 'Current User',
        lastAccessed: new Date().toISOString(),
        status: 'generating',
        format: reportData.format as 'pdf' | 'xlsx' | 'csv' | 'pptx',
        size: 0,
        downloads: 0,
        shared: false,
        period: reportData.period || 'Custom period',
        category: reportData.category as 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom',
      };

      // Add to reports state (in real app, this would be an API call)
      setReports(prev => [newReport, ...prev]);

      // Simulate report generation (change status to ready after 3 seconds)
      setTimeout(() => {
        setReports(prev => 
          prev.map(r => 
            r.id === newReport.id 
              ? { ...r, status: 'ready', size: Math.floor(Math.random() * 5000000) + 500000 }
              : r
          )
        );
      }, 3000);
      
      console.log('New report created:', newReport);
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const handleViewReport = (report: Report) => {
    if (report.status === 'ready') {
      // In a real app, this would open the report in a new tab or download it
      window.open(`/reports/${report.id}/view`, '_blank');
    }
  };

  const handleDownloadReport = (report: Report) => {
    if (report.status === 'ready') {
      // In a real app, this would trigger a file download
      const element = document.createElement('a');
      element.href = `#`; // Would be actual file URL
      element.download = `${report.name}.${report.format}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      // Update download count
      setReports(prev => 
        prev.map(r => 
          r.id === report.id 
            ? { ...r, downloads: r.downloads + 1 }
            : r
        )
      );
    }
  };

  const handleShareReport = (report: Report) => {
    if (report.status === 'ready') {
      // In a real app, this would open a sharing modal or copy a link
      navigator.clipboard.writeText(`${window.location.origin}/reports/${report.id}/shared`);
      alert('Report link copied to clipboard!');
      
      // Update shared status
      setReports(prev => 
        prev.map(r => 
          r.id === report.id 
            ? { ...r, shared: true }
            : r
        )
      );
    }
  };

  const handleGenerateTemplate = (templateName: string) => {
    // Auto-fill the modal with template data
    setIsNewReportModalOpen(true);
    // In a real app, you could pre-fill the form based on the template
  };

  const stats = [
    {
      title: 'Total Reports',
      value: reports.length,
      change: '+3',
      positive: true,
      icon: DocumentTextIcon
    },
    {
      title: 'Generated This Week',
      value: reports.filter(r => {
        const reportDate = new Date(r.createdDate);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return reportDate >= weekAgo;
      }).length,
      change: '+2',
      positive: true,
      icon: CalendarIcon
    },
    {
      title: 'Total Downloads',
      value: reports.reduce((acc, r) => acc + r.downloads, 0),
      change: '+18',
      positive: true,
      icon: ArrowDownTrayIcon
    },
    {
      title: 'Shared Reports',
      value: reports.filter(r => r.shared).length,
      change: '+1',
      positive: true,
      icon: ShareIcon
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Generate and manage comprehensive reports from your meeting intelligence data.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setIsNewReportModalOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Generate Report
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

      {/* Quick Report Templates */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Generate</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTemplates.map((template, index) => (
            <motion.button
              key={template.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              onClick={() => handleGenerateTemplate(template.name)}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${template.color}`}>
                <template.icon className="w-5 h-5" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">{template.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
            </motion.button>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="meeting-summary">Meeting Summary</option>
            <option value="pain-point-analysis">Pain Point Analysis</option>
            <option value="action-item-report">Action Item Report</option>
            <option value="sentiment-analysis">Sentiment Analysis</option>
            <option value="participant-engagement">Participant Engagement</option>
            <option value="custom">Custom</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="ready">Ready</option>
            <option value="generating">Generating</option>
            <option value="failed">Failed</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </Card>

      {/* Reports Table */}
      <Card>
        <AdvancedTable
          data={filteredReports}
          columns={columns}
          selectable={true}
          selectedRows={selectedReports}
          onSelectionChange={setSelectedReports}
          actions={[
            {
              label: 'View',
              onClick: handleViewReport,
              icon: EyeIcon,
              variant: 'primary',
              disabled: (report) => report.status !== 'ready'
            },
            {
              label: 'Download',
              onClick: handleDownloadReport,
              icon: ArrowDownTrayIcon,
              disabled: (report) => report.status !== 'ready'
            },
            {
              label: 'Share',
              onClick: handleShareReport,
              icon: ShareIcon,
              disabled: (report) => report.status !== 'ready'
            }
          ]}
          emptyMessage="No reports found"
          emptyDescription="Generate your first report to see analytics and insights from your meeting data."
        />
      </Card>

      {/* New Report Modal */}
      <NewReportModal
        isOpen={isNewReportModalOpen}
        onClose={() => setIsNewReportModalOpen(false)}
        onSubmit={handleNewReport}
      />
    </div>
  );
};

export default ReportsPage;