import React, { useState } from 'react';
import { DocumentTextIcon, CalendarIcon, FolderIcon, CogIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '@/components/ui';

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reportData: any) => void;
}

const NewReportModal: React.FC<NewReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'meeting-summary',
    description: '',
    format: 'pdf',
    category: 'weekly',
    startDate: '',
    endDate: '',
    includeTranscripts: true,
    includeSentiment: true,
    includeActionItems: true,
    includePainPoints: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reportTypes = [
    { value: 'meeting-summary', label: 'Meeting Summary', description: 'Comprehensive overview of meetings' },
    { value: 'pain-point-analysis', label: 'Pain Point Analysis', description: 'Analysis of customer pain points' },
    { value: 'action-item-report', label: 'Action Item Report', description: 'Status and progress of action items' },
    { value: 'sentiment-analysis', label: 'Sentiment Analysis', description: 'Emotional insights from conversations' },
    { value: 'participant-engagement', label: 'Engagement Metrics', description: 'Participation and engagement data' },
    { value: 'custom', label: 'Custom Report', description: 'Build a custom report with specific criteria' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Report name is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        name: formData.name,
        type: formData.type as 'meeting-summary' | 'pain-point-analysis' | 'action-item-report' | 'sentiment-analysis' | 'participant-engagement' | 'custom',
        description: formData.description || `Generated ${formData.type.replace('-', ' ')} report`,
        createdDate: new Date().toISOString(),
        createdBy: 'Current User', // Should come from auth store
        lastAccessed: new Date().toISOString(),
        status: 'generating' as const,
        format: formData.format as 'pdf' | 'xlsx' | 'csv' | 'pptx',
        size: 0,
        downloads: 0,
        shared: false,
        period: `${new Date(formData.startDate).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}`,
        category: formData.category as 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom',
        settings: {
          startDate: formData.startDate,
          endDate: formData.endDate,
          includeTranscripts: formData.includeTranscripts,
          includeSentiment: formData.includeSentiment,
          includeActionItems: formData.includeActionItems,
          includePainPoints: formData.includePainPoints,
        },
      };

      await onSubmit(reportData);
      handleClose();
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'meeting-summary',
      description: '',
      format: 'pdf',
      category: 'weekly',
      startDate: '',
      endDate: '',
      includeTranscripts: true,
      includeSentiment: true,
      includeActionItems: true,
      includePainPoints: true,
    });
    setErrors({});
    onClose();
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedReportType = reportTypes.find(type => type.value === formData.type);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate New Report"
      description="Create a comprehensive report from your meeting intelligence data"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Report Name */}
        <Input
          label="Report Name"
          placeholder="Enter a descriptive name for this report"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          leftIcon={<DocumentTextIcon className="w-5 h-5" />}
          fullWidth
        />

        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Report Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
          >
            {reportTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          {selectedReportType && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {selectedReportType.description}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            placeholder="Additional context or specific requirements for this report..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                     placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     dark:bg-neutral-800 dark:border-neutral-600 dark:text-white dark:placeholder-neutral-500"
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            error={errors.startDate}
            leftIcon={<CalendarIcon className="w-5 h-5" />}
            fullWidth
          />
          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            error={errors.endDate}
            leftIcon={<CalendarIcon className="w-5 h-5" />}
            fullWidth
          />
        </div>

        {/* Format and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Output Format
            </label>
            <select
              value={formData.format}
              onChange={(e) => handleChange('format', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
            >
              <option value="pdf">PDF Document</option>
              <option value="xlsx">Excel Spreadsheet</option>
              <option value="csv">CSV Data</option>
              <option value="pptx">PowerPoint Presentation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Include Options */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Include in Report
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.includeTranscripts}
                onChange={(e) => handleChange('includeTranscripts', e.target.checked)}
                className="rounded border-neutral-300 text-accent focus:ring-accent focus:ring-offset-0"
              />
              <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Meeting Transcripts</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.includeSentiment}
                onChange={(e) => handleChange('includeSentiment', e.target.checked)}
                className="rounded border-neutral-300 text-accent focus:ring-accent focus:ring-offset-0"
              />
              <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Sentiment Analysis</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.includeActionItems}
                onChange={(e) => handleChange('includeActionItems', e.target.checked)}
                className="rounded border-neutral-300 text-accent focus:ring-accent focus:ring-offset-0"
              />
              <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Action Items</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.includePainPoints}
                onChange={(e) => handleChange('includePainPoints', e.target.checked)}
                className="rounded border-neutral-300 text-accent focus:ring-accent focus:ring-offset-0"
              />
              <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Pain Points</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewReportModal;