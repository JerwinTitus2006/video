import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  accessor?: (row: T) => any;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
  className?: string;
}

export interface TableAction<T = any> {
  label: string;
  onClick: (row: T, index: number) => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

export interface TableFilter {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
}

interface AdvancedTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  
  // Selection
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  rowKey?: string | ((row: T) => string);
  
  // Pagination
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  
  // Sorting
  sortable?: boolean;
  defaultSort?: { column: string; direction: 'asc' | 'desc' };
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  
  // Search & Filtering
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: TableFilter[];
  onFiltersChange?: (filters: TableFilter[]) => void;
  
  // Actions
  actions?: TableAction<T>[];
  bulkActions?: TableAction<T>[];
  
  // Export
  exportable?: boolean;
  onExport?: (format: 'csv' | 'xlsx' | 'pdf') => void;
  
  // Styling
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  className?: string;
  
  // Empty state
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
}

const AdvancedTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error = null,
  onRetry,
  
  // Selection
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey = 'id',
  
  // Pagination
  pagination,
  
  // Sorting
  sortable = true,
  defaultSort,
  onSortChange,
  
  // Search & Filtering
  searchable = true,
  searchValue = '',
  onSearchChange,
  filters = [],
  onFiltersChange,
  
  // Actions
  actions = [],
  bulkActions = [],
  
  // Export
  exportable = false,
  onExport,
  
  // Styling
  striped = true,
  hoverable = true,
  bordered = false,
  compact = false,
  className = '',
  
  // Empty state
  emptyMessage = 'No data available',
  emptyDescription = 'There are no items to display at the moment.',
  emptyAction
}: AdvancedTableProps<T>) => {
  const [localSort, setLocalSort] = useState(defaultSort || { column: '', direction: 'asc' as const });
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRowsLocal, setSelectedRowsLocal] = useState<string[]>(selectedRows);

  // Get row ID
  const getRowId = useCallback((row: T, index: number) => {
    if (typeof rowKey === 'function') return rowKey(row);
    return row[rowKey] || index.toString();
  }, [rowKey]);

  // Handle sorting
  const handleSort = useCallback((column: string) => {
    if (!sortable) return;
    
    const direction: 'asc' | 'desc' = localSort.column === column && localSort.direction === 'asc' ? 'desc' : 'asc';
    const newSort = { column, direction };
    
    setLocalSort(newSort);
    onSortChange?.(column, direction);
  }, [localSort, sortable, onSortChange]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  }, [onSearchChange]);

  // Handle selection
  const handleRowSelection = useCallback((rowId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedRowsLocal, rowId]
      : selectedRowsLocal.filter(id => id !== rowId);
    
    setSelectedRowsLocal(newSelection);
    onSelectionChange?.(newSelection);
  }, [selectedRowsLocal, onSelectionChange]);

  const handleSelectAll = useCallback((checked: boolean) => {
    const newSelection = checked 
      ? data.map((row, index) => getRowId(row, index))
      : [];
    
    setSelectedRowsLocal(newSelection);
    onSelectionChange?.(newSelection);
  }, [data, getRowId, onSelectionChange]);

  // Sync external selected rows
  useEffect(() => {
    setSelectedRowsLocal(selectedRows);
  }, [selectedRows]);

  // Filter and sort data locally if no external handlers
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Search filter
    if (localSearch && !onSearchChange) {
      const searchTerm = localSearch.toLowerCase();
      result = result.filter(row => 
        columns.some(column => {
          if (!column.searchable) return false;
          
          const value = column.accessor ? column.accessor(row) : row[column.key];
          return String(value).toLowerCase().includes(searchTerm);
        })
      );
    }
    
    // Apply filters
    if (filters.length > 0 && !onFiltersChange) {
      result = result.filter(row => 
        filters.every(filter => {
          const value = row[filter.column];
          const filterValue = filter.value;
          
          switch (filter.operator) {
            case 'equals': return value === filterValue;
            case 'contains': return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'startsWith': return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
            case 'endsWith': return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
            case 'gt': return Number(value) > Number(filterValue);
            case 'lt': return Number(value) < Number(filterValue);
            case 'gte': return Number(value) >= Number(filterValue);
            case 'lte': return Number(value) <= Number(filterValue);
            default: return true;
          }
        })
      );
    }
    
    // Sort
    if (localSort.column && !onSortChange) {
      const column = columns.find(col => col.key === localSort.column);
      if (column) {
        result.sort((a, b) => {
          const aValue = column.accessor ? column.accessor(a) : a[column.key];
          const bValue = column.accessor ? column.accessor(b) : b[column.key];
          
          if (localSort.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }
    }
    
    return result;
  }, [data, columns, localSearch, filters, localSort, onSearchChange, onFiltersChange, onSortChange]);

  // Pagination calculations
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    return processedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [processedData, pagination]);

  const isAllSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every((row, index) => 
      selectedRowsLocal.includes(getRowId(row, index))
    );
  }, [paginatedData, selectedRowsLocal, getRowId]);

  const isPartiallySelected = useMemo(() => {
    if (selectedRowsLocal.length === 0) return false;
    return paginatedData.some((row, index) => 
      selectedRowsLocal.includes(getRowId(row, index))
    ) && !isAllSelected;
  }, [paginatedData, selectedRowsLocal, getRowId, isAllSelected]);

  // Render states
  if (loading) {
    return (
      <div className="w-full">
        <LoadingState type="skeleton" size="lg" className="p-8" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        type="server"
        title="Failed to load data"
        message={error}
        onRetry={onRetry}
        showRetry={!!onRetry}
        className="p-8"
      />
    );
  }

  if (paginatedData.length === 0 && !localSearch && filters.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title={emptyMessage}
        description={emptyDescription}
        onAction={emptyAction?.onClick}
        actionLabel={emptyAction?.label}
        showAction={!!emptyAction}
        className="p-8"
      />
    );
  }

  if (paginatedData.length === 0 && (localSearch || filters.length > 0)) {
    return (
      <EmptyState
        type={localSearch ? "search" : "filter"}
        onAction={() => {
          setLocalSearch('');
          onSearchChange?.('');
          onFiltersChange?.([]);
        }}
        className="p-8"
      />
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Table Controls */}
      {(searchable || exportable || bulkActions.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {/* Filters */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-accent text-white' : ''}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </Button>

            {/* Export */}
            {exportable && (
              <Button variant="outline" size="sm" onClick={() => onExport?.('csv')}>
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${bordered ? 'border border-gray-200 dark:border-gray-700' : ''}`}>
          {/* Table Header */}
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {/* Selection Header */}
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-accent bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-accent dark:focus:ring-accent focus:ring-2"
                    />
                  </div>
                </th>
              )}

              {/* Column Headers */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                    column.sortable && sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                  } ${column.className || ''}`}
                  style={{ 
                    width: column.width, 
                    minWidth: column.minWidth,
                    textAlign: column.align || 'left'
                  }}
                  onClick={() => column.sortable && sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortable && (
                      <div className="flex flex-col">
                        <ChevronUpIcon 
                          className={`w-3 h-3 ${localSort.column === column.key && localSort.direction === 'asc' ? 'text-accent' : 'text-gray-400'}`} 
                        />
                        <ChevronDownIcon 
                          className={`w-3 h-3 -mt-1 ${localSort.column === column.key && localSort.direction === 'desc' ? 'text-accent' : 'text-gray-400'}`} 
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}

              {/* Actions Header */}
              {actions.length > 0 && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
              {paginatedData.map((row, index) => {
                const rowId = getRowId(row, index);
                const isSelected = selectedRowsLocal.includes(rowId);

                return (
                  <motion.tr
                    key={rowId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={`
                      ${striped && index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/50' : ''}
                      ${hoverable ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}
                      transition-colors duration-150
                    `}
                  >
                    {/* Selection Cell */}
                    {selectable && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleRowSelection(rowId, e.target.checked)}
                          className="w-4 h-4 text-accent bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-accent dark:focus:ring-accent focus:ring-2"
                        />
                      </td>
                    )}

                    {/* Data Cells */}
                    {columns.map((column) => {
                      const value = column.accessor ? column.accessor(row) : row[column.key];
                      
                      return (
                        <td
                          key={column.key}
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 ${column.className || ''} ${compact ? 'py-2' : ''}`}
                          style={{ textAlign: column.align || 'left' }}
                        >
                          {column.render ? column.render(value, row, index) : String(value || '')}
                        </td>
                      );
                    })}

                    {/* Actions Cell */}
                    {actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {actions.map((action, actionIndex) => {
                            if (action.hidden?.(row)) return null;
                            
                            return (
                              <Button
                                key={actionIndex}
                                size="sm"
                                variant={action.variant === 'danger' ? 'outline' : 'ghost'}
                                onClick={() => action.onClick(row, index)}
                                disabled={action.disabled?.(row)}
                                className={action.variant === 'danger' ? 'text-red-600 hover:text-red-700' : ''}
                              >
                                {action.icon && <action.icon className="w-4 h-4" />}
                                <span className="sr-only">{action.label}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          {/* Page Info */}
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">Rows per page:</label>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {[10, 25, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.pageSize)) }, (_, i) => {
              const pageNumber = pagination.page - 2 + i;
              if (pageNumber < 1 || pageNumber > Math.ceil(pagination.total / pagination.pageSize)) return null;
              
              return (
                <Button
                  key={pageNumber}
                  variant={pageNumber === pagination.page ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => pagination.onPageChange(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export { AdvancedTable };
export default AdvancedTable;