import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FolderIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  LinkIcon,
  CloudArrowDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import { NewResourceModal } from '@/components/forms';
import AdvancedTable from '@/components/AdvancedTable';
import type { TableColumn } from '@/components/AdvancedTable';

interface Resource {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'link' | 'folder';
  size: number;
  createdDate: string;
  modifiedDate: string;
  owner: string;
  category: 'presentation' | 'contract' | 'specification' | 'marketing' | 'training' | 'other';
  tags: string[];
  shared: boolean;
  downloads: number;
  meetingId?: string;
  meetingTitle?: string;
  url?: string;
  description: string;
}

const mockResources: Resource[] = [
  {
    id: '1',
    name: 'TechCorp API Integration Guide.pdf',
    type: 'document',
    size: 2457600, // 2.4MB
    createdDate: '2024-02-20T10:00:00Z',
    modifiedDate: '2024-02-23T14:30:00Z',
    owner: 'Alex Rodriguez',
    category: 'specification',
    tags: ['api', 'integration', 'techcorp', 'documentation'],
    shared: true,
    downloads: 24,
    meetingId: '2',
    meetingTitle: 'Client Discovery Call - TechCorp',
    description: 'Comprehensive guide for integrating with TechCorp\'s API endpoints'
  },
  {
    id: '2',
    name: 'Sales Presentation Q4 2024.pptx',
    type: 'document',
    size: 15728640, // 15MB
    createdDate: '2024-02-15T09:00:00Z',
    modifiedDate: '2024-02-22T16:45:00Z',
    owner: 'Sarah Johnson',
    category: 'presentation',
    tags: ['sales', 'presentation', 'q4', '2024'],
    shared: true,
    downloads: 18,
    meetingId: '1',
    meetingTitle: 'Q4 Sales Review',
    description: 'Q4 sales performance review and 2024 projections'
  },
  {
    id: '3',
    name: 'Product Demo Recording',
    type: 'video',
    size: 157286400, // 150MB
    createdDate: '2024-02-18T14:00:00Z',
    modifiedDate: '2024-02-18T14:45:00Z',
    owner: 'Mike Chen',
    category: 'training',
    tags: ['demo', 'product', 'training', 'video'],
    shared: true,
    downloads: 31,
    description: 'Complete product demonstration for new customers'
  },
  {
    id: '4',
    name: 'CloudServ Contract Terms',
    type: 'document',
    size: 524288, // 512KB
    createdDate: '2024-02-22T11:00:00Z',
    modifiedDate: '2024-02-22T11:00:00Z',
    owner: 'Emma Davis',
    category: 'contract',
    tags: ['contract', 'vendor', 'cloudserv', 'legal'],
    shared: false,
    downloads: 5,
    meetingId: '4',
    meetingTitle: 'Vendor Negotiation - CloudServ',
    description: 'Contract terms and conditions for CloudServ partnership'
  },
  {
    id: '5',
    name: 'Competitor Analysis Dashboard',
    type: 'link',
    size: 0,
    createdDate: '2024-02-21T13:00:00Z',
    modifiedDate: '2024-02-23T09:15:00Z',
    owner: 'David Kim',
    category: 'marketing',
    tags: ['analysis', 'competition', 'dashboard', 'research'],
    shared: true,
    downloads: 12,
    url: 'https://analytics.example.com/competitor-analysis',
    description: 'Interactive dashboard showing competitor analysis and market trends'
  },
  {
    id: '6',
    name: 'Meeting Screenshots',
    type: 'folder',
    size: 10485760, // 10MB
    createdDate: '2024-02-19T16:30:00Z',
    modifiedDate: '2024-02-23T11:20:00Z',
    owner: 'Sarah Johnson',
    category: 'other',
    tags: ['screenshots', 'meetings', 'archive'],
    shared: false,
    downloads: 3,
    description: 'Collection of screenshots and images from various meetings'
  }
];

const ResourcesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sharedFilter, setSharedFilter] = useState<string>('all');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [resources, setResources] = useState(mockResources);
  const [isNewResourceModalOpen, setIsNewResourceModalOpen] = useState(false);

  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      const matchesSearch = resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = typeFilter === 'all' || resource.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
      const matchesShared = sharedFilter === 'all' || 
        (sharedFilter === 'shared' && resource.shared) ||
        (sharedFilter === 'private' && !resource.shared);
      
      return matchesSearch && matchesType && matchesCategory && matchesShared;
    });
  }, [resources, searchQuery, typeFilter, categoryFilter, sharedFilter]);
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return DocumentTextIcon;
      case 'image':
        return PhotoIcon;
      case 'video':
        return VideoCameraIcon;
      case 'link':
        return LinkIcon;
      case 'folder':
        return FolderIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      document: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      image: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      video: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      link: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      folder: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[type as keyof typeof colors] || colors.document}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      presentation: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      contract: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      specification: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      marketing: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      training: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[category as keyof typeof colors] || colors.other}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const columns: TableColumn<Resource>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      searchable: true,
      render: (value, row) => {
        const Icon = getTypeIcon(row.type);
        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{row.description}</p>
              <div className="flex items-center space-x-2 mt-1">
                {getTypeBadge(row.type)}
                {row.shared && (
                  <span className="flex items-center text-xs text-green-600 dark:text-green-400">
                    <ShareIcon className="w-3 h-3 mr-1" />
                    Shared
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'category',
      label: 'Category',
      filterable: true,
      render: (value) => getCategoryBadge(value)
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
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
          <CloudArrowDownIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'modifiedDate',
      label: 'Modified',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(value)}</span>
      )
    },
    {
      key: 'meetingTitle',
      label: 'Source Meeting',
      render: (value) => value ? (
        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
          {value}
        </span>
      ) : (
        <span className="text-xs text-gray-400">Direct upload</span>
      )
    }
  ];

  const handleNewResource = async (resourceData: Partial<Resource>) => {
    try {
      // Generate a new ID (in real app, this would be handled by the backend)
      const id = `${Date.now()}`;
      
      const newResource: Resource = {
        id,
        name: resourceData.name!,
        type: resourceData.type as 'document' | 'image' | 'video' | 'link' | 'folder',
        size: resourceData.size || 0,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        owner: resourceData.owner || 'Current User',
        category: resourceData.category as 'presentation' | 'contract' | 'specification' | 'marketing' | 'training' | 'other',
        tags: resourceData.tags || [],
        shared: resourceData.shared || false,
        downloads: 0,
        meetingId: resourceData.meetingId,
        meetingTitle: resourceData.meetingTitle,
        url: resourceData.url,
        description: resourceData.description || '',
      };

      // Add to resources state (in real app, this would be an API call)
      setResources(prev => [newResource, ...prev]);
      
      console.log('New resource created:', newResource);
    } catch (error) {
      console.error('Error creating resource:', error);
    }
  };

  const handleViewResource = (resource: Resource) => {
    if (resource.type === 'link' && resource.url) {
      window.open(resource.url, '_blank');
    } else {
      // In a real app, this would open a preview or download the file
      alert(`Opening ${resource.name}...`);
    }
  };

  const handleDownloadResource = (resource: Resource) => {
    // In a real app, this would trigger a file download
    setResources(prev => 
      prev.map(r => 
        r.id === resource.id 
          ? { ...r, downloads: r.downloads + 1 }
          : r
      )
    );
    alert(`Downloading ${resource.name}...`);
  };

  const handleShareResource = (resource: Resource) => {
    // In a real app, this would open a sharing modal or copy a link
    navigator.clipboard.writeText(`${window.location.origin}/resources/${resource.id}/shared`);
    alert('Resource link copied to clipboard!');
    
    // Update shared status
    setResources(prev => 
      prev.map(r => 
        r.id === resource.id 
          ? { ...r, shared: true }
          : r
      )
    );
  };

  const stats = [
    {
      title: 'Total Resources',
      value: resources.length,
      change: '+4',
      positive: true,
      icon: FolderIcon
    },
    {
      title: 'Shared',
      value: resources.filter(r => r.shared).length,
      change: '+2',
      positive: true,
      icon: ShareIcon
    },
    {
      title: 'Total Downloads',
      value: resources.reduce((acc, r) => acc + r.downloads, 0),
      change: '+23',
      positive: true,
      icon: CloudArrowDownIcon
    },
    {
      title: 'Storage Used',
      value: formatFileSize(resources.reduce((acc, r) => acc + r.size, 0)),
      change: '+15MB',
      positive: true,
      icon: DocumentTextIcon
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resources</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage documents, files, and resources shared during meetings.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setIsNewResourceModalOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Upload Resource
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
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
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
            <option value="document">Document</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="link">Link</option>
            <option value="folder">Folder</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="presentation">Presentation</option>
            <option value="contract">Contract</option>
            <option value="specification">Specification</option>
            <option value="marketing">Marketing</option>
            <option value="training">Training</option>
            <option value="other">Other</option>
          </select>
          <select
            value={sharedFilter}
            onChange={(e) => setSharedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Access</option>
            <option value="shared">Shared</option>
            <option value="private">Private</option>
          </select>
        </div>
      </Card>

      {/* Resources Table */}
      <Card>
        <AdvancedTable
          data={filteredResources}
          columns={columns}
          selectable={true}
          selectedRows={selectedResources}
          onSelectionChange={setSelectedResources}
          actions={[
            {
              label: 'View',
              onClick: handleViewResource,
              icon: EyeIcon,
              variant: 'primary'
            },
            {
              label: 'Download',
              onClick: handleDownloadResource,
              icon: CloudArrowDownIcon
            },
            {
              label: 'Share',
              onClick: handleShareResource,
              icon: ShareIcon
            }
          ]}
          emptyMessage="No resources found"
          emptyDescription="Resources from meetings and uploaded files will appear here."
        />
      </Card>

      {/* New Resource Modal */}
      <NewResourceModal
        isOpen={isNewResourceModalOpen}
        onClose={() => setIsNewResourceModalOpen(false)}
        onSubmit={handleNewResource}
      />
    </div>
  );
};

export default ResourcesPage;