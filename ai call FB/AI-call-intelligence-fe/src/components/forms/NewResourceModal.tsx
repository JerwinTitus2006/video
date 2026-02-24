import React, { useState } from 'react';
import { FolderIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon, LinkIcon, TagIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '@/components/ui';

interface NewResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resourceData: any) => void;
}

const NewResourceModal: React.FC<NewResourceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'document',
    category: 'other',
    tags: '',
    meetingId: '',
    meetingTitle: '',
    url: '',
    file: null as File | null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resourceTypes = [
    { value: 'document', label: 'Document', icon: DocumentTextIcon },
    { value: 'image', label: 'Image', icon: PhotoIcon },
    { value: 'video', label: 'Video', icon: VideoCameraIcon },
    { value: 'link', label: 'Link/URL', icon: LinkIcon },
    { value: 'folder', label: 'Folder', icon: FolderIcon },
  ];

  const categories = [
    { value: 'presentation', label: 'Presentation' },
    { value: 'contract', label: 'Contract' },
    { value: 'specification', label: 'Specification' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'training', label: 'Training' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Resource name is required';
    if (formData.type === 'link' && !formData.url.trim()) newErrors.url = 'URL is required for link type';
    if (formData.type !== 'link' && formData.type !== 'folder' && !formData.file) {
      newErrors.file = 'File is required';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const resourceData = {
        name: formData.name,
        type: formData.type as 'document' | 'image' | 'video' | 'link' | 'folder',
        description: formData.description || `${formData.type} resource`,
        category: formData.category as 'presentation' | 'contract' | 'specification' | 'marketing' | 'training' | 'other',
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        meetingId: formData.meetingId,
        meetingTitle: formData.meetingTitle,
        url: formData.url,
        file: formData.file,
        size: formData.file ? formData.file.size : 0,
        owner: 'Current User', // Should come from auth store
        shared: false,
        downloads: 0,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
      };

      await onSubmit(resourceData);
      handleClose();
    } catch (error) {
      console.error('Error creating resource:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      type: 'document',
      category: 'other',
      tags: '',
      meetingId: '',
      meetingTitle: '',
      url: '',
      file: null,
    });
    setErrors({});
    onClose();
  };

  const handleChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleChange('file', file);
    if (file && !formData.name) {
      // Auto-fill name from filename
      handleChange('name', file.name);
    }
  };

  const selectedType = resourceTypes.find(type => type.value === formData.type);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Resource"
      description="Add a new resource to share with your team"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Resource Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Resource Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {resourceTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('type', type.value)}
                  className={`p-3 border rounded-lg transition-all duration-200 ${
                    formData.type === type.value
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-600'
                  }`}
                >
                  <IconComponent className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">{type.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resource Name */}
        <Input
          label="Resource Name"
          placeholder="Enter a descriptive name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          leftIcon={selectedType ? <selectedType.icon className="w-5 h-5" /> : undefined}
          fullWidth
        />

        {/* File Upload or URL */}
        {formData.type === 'link' ? (
          <Input
            label="URL"
            type="url"
            placeholder="https://example.com"
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            error={errors.url}
            leftIcon={<LinkIcon className="w-5 h-5" />}
            fullWidth
          />
        ) : formData.type !== 'folder' ? (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              File Upload
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept={
                formData.type === 'image' ? 'image/*' :
                formData.type === 'video' ? 'video/*' :
                formData.type === 'document' ? '.pdf,.doc,.docx,.txt,.md' :
                '*'
              }
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                       file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 
                       file:text-sm file:font-semibold file:bg-accent file:text-white
                       hover:file:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent/50
                       dark:border-neutral-600 dark:bg-neutral-800"
            />
            {formData.file && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {errors.file && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.file}</p>}
          </div>
        ) : null}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            placeholder="Brief description of this resource..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                     placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     dark:bg-neutral-800 dark:border-neutral-600 dark:text-white dark:placeholder-neutral-500"
          />
        </div>

        {/* Category and Tags */}
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
              {categories.map(category => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Tags (Optional)"
            placeholder="Enter tags separated by commas"
            value={formData.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            leftIcon={<TagIcon className="w-5 h-5" />}
            helpText="e.g. important, shared, draft"
            fullWidth
          />
        </div>

        {/* Meeting Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Meeting ID (Optional)"
            placeholder="Related meeting ID"
            value={formData.meetingId}
            onChange={(e) => handleChange('meetingId', e.target.value)}
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
            {loading ? 'Uploading...' : 'Upload Resource'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewResourceModal;