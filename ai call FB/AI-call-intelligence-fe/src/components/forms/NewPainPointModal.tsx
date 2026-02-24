import React, { useState } from 'react';
import { ExclamationTriangleIcon, UserIcon, TagIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '@/components/ui';

interface NewPainPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (painPointData: any) => void;
}

const NewPainPointModal: React.FC<NewPainPointModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
    severity: 'medium',
    assignee: '',
    tags: '',
    meetingId: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Pain point title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.assignee.trim()) newErrors.assignee = 'Assignee is required';

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const painPointData = {
        title: formData.title,
        description: formData.description,
        category: formData.category as 'technical' | 'process' | 'business' | 'user-experience',
        severity: formData.severity as 'low' | 'medium' | 'high' | 'critical',
        frequency: 1,
        firstReported: new Date().toISOString(),
        lastReported: new Date().toISOString(),
        affectedMeetings: formData.meetingId ? 1 : 0,
        status: 'open' as const,
        assignee: formData.assignee,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };

      await onSubmit(painPointData);
      handleClose();
    } catch (error) {
      console.error('Error creating pain point:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: 'technical',
      severity: 'medium',
      assignee: '',
      tags: '',
      meetingId: '',
    });
    setErrors({});
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Report Pain Point"
      description="Report a new customer or business pain point identified during interactions"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <Input
          label="Pain Point Title"
          placeholder="Brief title describing the pain point"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          leftIcon={<ExclamationTriangleIcon className="w-5 h-5" />}
          fullWidth
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description *
          </label>
          <textarea
            placeholder="Detailed description of the pain point, including context and potential impact..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                     placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     dark:bg-neutral-800 dark:border-neutral-600 dark:text-white dark:placeholder-neutral-500"
          />
          {errors.description && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.description}</p>}
        </div>

        {/* Category and Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <option value="technical">Technical</option>
              <option value="process">Process</option>
              <option value="business">Business</option>
              <option value="user-experience">User Experience</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Severity
            </label>
            <select
              value={formData.severity}
              onChange={(e) => handleChange('severity', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Assignee */}
        <Input
          label="Assignee"
          placeholder="Who should handle this pain point?"
          value={formData.assignee}
          onChange={(e) => handleChange('assignee', e.target.value)}
          error={errors.assignee}
          leftIcon={<UserIcon className="w-5 h-5" />}
          fullWidth
        />

        {/* Meeting Reference (Optional) */}
        <Input
          label="Related Meeting (Optional)"
          placeholder="Meeting ID or title where this was identified"
          value={formData.meetingId}
          onChange={(e) => handleChange('meetingId', e.target.value)}
          leftIcon={<BuildingOfficeIcon className="w-5 h-5" />}
          helpText="Link this pain point to a specific meeting if applicable"
          fullWidth
        />

        {/* Tags */}
        <Input
          label="Tags (Optional)"
          placeholder="Enter tags separated by commas"
          value={formData.tags}
          onChange={(e) => handleChange('tags', e.target.value)}
          leftIcon={<TagIcon className="w-5 h-5" />}
          helpText="e.g. api, performance, customer-feedback"
          fullWidth
        />

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
            {loading ? 'Reporting...' : 'Report Pain Point'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewPainPointModal;