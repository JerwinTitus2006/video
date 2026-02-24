import React, { useState } from 'react';
import { ListBulletIcon, UserIcon, CalendarIcon, FlagIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '@/components/ui';

interface NewActionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actionItemData: any) => void;
}

const NewActionItemModal: React.FC<NewActionItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    priority: 'medium',
    category: 'follow-up',
    meetingId: '',
    meetingTitle: '',
    tags: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Action item title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.assignee.trim()) newErrors.assignee = 'Assignee is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const actionItemData = {
        title: formData.title,
        description: formData.description,
        assignee: formData.assignee,
        dueDate: new Date(formData.dueDate).toISOString(),
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        status: 'todo' as const,
        createdDate: new Date().toISOString(),
        meetingId: formData.meetingId || `meeting-${Date.now()}`,
        meetingTitle: formData.meetingTitle || 'Manual Entry',
        category: formData.category as 'follow-up' | 'research' | 'development' | 'documentation' | 'meeting',
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        progress: 0,
      };

      await onSubmit(actionItemData);
      handleClose();
    } catch (error) {
      console.error('Error creating action item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      assignee: '',
      dueDate: '',
      priority: 'medium',
      category: 'follow-up',
      meetingId: '',
      meetingTitle: '',
      tags: '',
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

  // Set default due date to 7 days from now
  React.useEffect(() => {
    if (!formData.dueDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setFormData(prev => ({ ...prev, dueDate: defaultDate.toISOString().split('T')[0] }));
    }
  }, [formData.dueDate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Action Item"
      description="Create a new action item to track tasks and follow-ups"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <Input
          label="Action Item Title"
          placeholder="What needs to be done?"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          leftIcon={<ListBulletIcon className="w-5 h-5" />}
          fullWidth
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description *
          </label>
          <textarea
            placeholder="Provide detailed information about what needs to be accomplished..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                     placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     dark:bg-neutral-800 dark:border-neutral-600 dark:text-white dark:placeholder-neutral-500"
          />
          {errors.description && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.description}</p>}
        </div>

        {/* Assignee and Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Assignee"
            placeholder="Who is responsible for this?"
            value={formData.assignee}
            onChange={(e) => handleChange('assignee', e.target.value)}
            error={errors.assignee}
            leftIcon={<UserIcon className="w-5 h-5" />}
            fullWidth
          />
          <Input
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange('dueDate', e.target.value)}
            error={errors.dueDate}
            leftIcon={<CalendarIcon className="w-5 h-5" />}
            fullWidth
          />
        </div>

        {/* Priority and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
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
              <option value="follow-up">Follow-up</option>
              <option value="research">Research</option>
              <option value="development">Development</option>
              <option value="documentation">Documentation</option>
              <option value="meeting">Meeting</option>
            </select>
          </div>
        </div>

        {/* Meeting Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Meeting ID (Optional)"
            placeholder="Related meeting ID"
            value={formData.meetingId}
            onChange={(e) => handleChange('meetingId', e.target.value)}
            leftIcon={<VideoCameraIcon className="w-5 h-5" />}
            helpText="Link to a specific meeting"
            fullWidth
          />
          <Input
            label="Meeting Title (Optional)"
            placeholder="Meeting where this was discussed"
            value={formData.meetingTitle}
            onChange={(e) => handleChange('meetingTitle', e.target.value)}
            fullWidth
          />
        </div>

        {/* Tags */}
        <Input
          label="Tags (Optional)"
          placeholder="Enter tags separated by commas"
          value={formData.tags}
          onChange={(e) => handleChange('tags', e.target.value)}
          helpText="e.g. urgent, customer-request, technical"
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
            {loading ? 'Creating...' : 'Create Action Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewActionItemModal;