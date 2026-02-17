"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface CustomTab {
  id: string;
  title: string;
  tab_key: string;
  description?: string | null;
}

interface TabConfig {
  id: string;
  tab_type: 'overview' | 'mock-tests' | 'question-papers' | 'custom';
  tab_label: string;
  tab_key: string;
  custom_tab_id?: string | null;
  display_order: number;
  is_active: boolean;
  custom_tab?: CustomTab | null;
}

interface TabConfigManagerProps {
  subcategoryId: string;
  apiBase: string;
  authToken?: string;
  onConfigChange?: () => void;
}

const TAB_TYPE_OPTIONS = [
  { value: 'overview', label: 'Overview', description: 'Main overview content' },
  { value: 'mock-tests', label: 'Mock Tests', description: 'Mock test listing' },
  { value: 'question-papers', label: 'Previous Papers', description: 'Question papers listing' },
  { value: 'custom', label: 'Custom Tab', description: 'Custom content tab' }
];

export default function TabConfigManager({ subcategoryId, apiBase, authToken, onConfigChange }: TabConfigManagerProps) {
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTab, setEditingTab] = useState<TabConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [token, setToken] = useState<string | null>(authToken || null);
  const [formData, setFormData] = useState({
    tab_type: 'overview' as TabConfig['tab_type'],
    tab_label: '',
    tab_key: '',
    custom_tab_id: ''
  });

  useEffect(() => {
    if (authToken) {
      setToken(authToken);
      return;
    }
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (stored) {
      setToken(stored);
    }
  }, [authToken]);

  const fetchTabConfig = async () => {
    try {
      const response = await fetch(`${apiBase}/api/v1/page-content/${subcategoryId}/tab-config`);
      const data = await response.json();
      if (data.success) {
        setTabs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tab config:', error);
      toast.error('Failed to load tab configuration');
    }
  };

  const fetchCustomTabs = async () => {
    try {
      const response = await fetch(`${apiBase}/api/v1/page-content/${subcategoryId}/custom-tabs`);
      const data = await response.json();
      if (data.success) {
        setCustomTabs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch custom tabs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTabConfig(), fetchCustomTabs()]);
      setLoading(false);
    };
    loadData();
  }, [subcategoryId]);

  const handleInitializeDefaultTabs = async () => {
    try {
      const response = await fetch(
        `${apiBase}/api/v1/page-content/${subcategoryId}/tab-config/initialize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Default tabs initialized successfully');
        await fetchTabConfig();
        onConfigChange?.();
      } else {
        toast.error(data.message || 'Failed to initialize tabs');
      }
    } catch (error) {
      console.error('Failed to initialize tabs:', error);
      toast.error('Failed to initialize default tabs');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(tabs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTabs(items);

    try {
      const response = await fetch(
        `${apiBase}/api/v1/page-content/${subcategoryId}/tab-config/reorder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            tabConfigIds: items.map(item => item.id)
          })
        }
      );

      const data = await response.json();
      if (!data.success) {
        toast.error('Failed to reorder tabs');
        await fetchTabConfig();
      } else {
        toast.success('Tabs reordered successfully');
      }
    } catch (error) {
      console.error('Failed to reorder tabs:', error);
      toast.error('Failed to reorder tabs');
      await fetchTabConfig();
    }
  };

  const handleSave = async () => {
    if (!formData.tab_label) {
      toast.error('Tab label is required');
      return;
    }

    if (formData.tab_type === 'custom' && !formData.custom_tab_id) {
      toast.error('Please select a custom tab');
      return;
    }

    try {
      const url = editingTab
        ? `${apiBase}/api/v1/page-content/${subcategoryId}/tab-config/${editingTab.id}`
        : `${apiBase}/api/v1/page-content/${subcategoryId}/tab-config`;

      const response = await fetch(url, {
        method: editingTab ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          tab_type: formData.tab_type,
          tab_label: formData.tab_label,
          tab_key: formData.tab_key || formData.tab_label.toLowerCase().replace(/\s+/g, '-'),
          custom_tab_id: formData.tab_type === 'custom' ? formData.custom_tab_id : null
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingTab ? 'Tab updated successfully' : 'Tab created successfully');
        setEditingTab(null);
        setIsCreating(false);
        setFormData({ tab_type: 'overview', tab_label: '', tab_key: '', custom_tab_id: '' });
        await fetchTabConfig();
        onConfigChange?.();
      } else {
        toast.error(data.message || 'Failed to save tab');
      }
    } catch (error) {
      console.error('Failed to save tab:', error);
      toast.error('Failed to save tab');
    }
  };

  const handleDelete = async (tabId: string) => {
    if (!confirm('Are you sure you want to delete this tab?')) return;

    try {
      const response = await fetch(
        `${apiBase}/api/v1/page-content/${subcategoryId}/tab-config/${tabId}`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Tab deleted successfully');
        await fetchTabConfig();
        onConfigChange?.();
      } else {
        toast.error('Failed to delete tab');
      }
    } catch (error) {
      console.error('Failed to delete tab:', error);
      toast.error('Failed to delete tab');
    }
  };

  const handleEdit = (tab: TabConfig) => {
    setEditingTab(tab);
    setFormData({
      tab_type: tab.tab_type,
      tab_label: tab.tab_label,
      tab_key: tab.tab_key,
      custom_tab_id: tab.custom_tab_id || ''
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setEditingTab(null);
    setIsCreating(false);
    setFormData({ tab_type: 'overview', tab_label: '', tab_key: '', custom_tab_id: '' });
  };

  const reservedInfoMap = useMemo(() => ({
    'mock-tests': {
      label: 'Reserved system tab',
      description: 'Automatically lists mock tests for this subcategory. Add your own sections before or after this tab using the Page Editor.'
    },
    'question-papers': {
      label: 'Reserved system tab',
      description: 'Displays last year papers & derived PDFs. Use custom tabs to sandwich extra content around this reserved area.'
    }
  }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tab Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage and reorder tabs for this subcategory page
          </p>
        </div>
        <div className="flex gap-2">
          {tabs.length === 0 && (
            <button
              onClick={handleInitializeDefaultTabs}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Initialize Default Tabs
            </button>
          )}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Tab
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingTab ? 'Edit Tab' : 'Create New Tab'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tab Type
              </label>
              <select
                value={formData.tab_type}
                onChange={(e) => setFormData({ ...formData, tab_type: e.target.value as TabConfig['tab_type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!editingTab}
              >
                {TAB_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tab Label *
              </label>
              <input
                type="text"
                value={formData.tab_label}
                onChange={(e) => setFormData({ ...formData, tab_label: e.target.value })}
                placeholder="e.g., Mock Tests, Previous Papers"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tab Key (URL slug)
              </label>
              <input
                type="text"
                value={formData.tab_key}
                onChange={(e) => setFormData({ ...formData, tab_key: e.target.value })}
                placeholder="Auto-generated from label if empty"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {formData.tab_type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Tab *
                </label>
                <select
                  value={formData.custom_tab_id}
                  onChange={(e) => setFormData({ ...formData, custom_tab_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a custom tab</option>
                  {customTabs.map(tab => (
                    <option key={tab.id} value={tab.id}>
                      {tab.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {tabs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No tabs configured</p>
          <p className="text-sm">Click "Initialize Default Tabs" to get started</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tabs">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {tabs.map((tab, index) => (
                  <Draggable key={tab.id} draggableId={tab.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
                          snapshot.isDragging ? 'shadow-lg border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{tab.tab_label}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              tab.tab_type === 'mock-tests' || tab.tab_type === 'question-papers'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {tab.tab_type}
                            </span>
                            {(tab.tab_type === 'mock-tests' || tab.tab_type === 'question-papers') && (
                              <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                                Reserved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Key: {tab.tab_key}
                            {tab.custom_tab && ` • Custom: ${tab.custom_tab.title}`}
                          </p>
                          {(tab.tab_type === 'mock-tests' || tab.tab_type === 'question-papers') && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mt-2">
                              {reservedInfoMap[tab.tab_type].description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(tab)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit tab"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tab.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete tab"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
