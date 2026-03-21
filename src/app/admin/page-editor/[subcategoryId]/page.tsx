'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BlockEditor } from '@/components/PageEditor/BlockEditor';
import { ArrowLeft, Save, Eye, History, Settings } from 'lucide-react';

interface Section {
  id: string;
  section_key?: string;
  title: string;
  subtitle?: string;
  display_order: number;
  blocks: any[];
  is_sidebar?: boolean;
  sidebar_tab_id?: string | null;
}

export default function PageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const subcategoryId = params.subcategoryId as string;
  
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subcategoryInfo, setSubcategoryInfo] = useState<any>(null);
  const [showSEOPanel, setShowSEOPanel] = useState(false);
  const [showTocPanel, setShowTocPanel] = useState(false);
  const [seoData, setSeoData] = useState<any>({});
  const [customTabs, setCustomTabs] = useState<any[]>([]);
  const [tocOrder, setTocOrder] = useState<Record<string, number | ''>>({});
  const [tabHeadings, setTabHeadings] = useState<Record<string, string>>({});
  const [showTabHeadingsPanel, setShowTabHeadingsPanel] = useState(false);

  useEffect(() => {
    fetchPageContent();
    fetchSubcategoryInfo();
  }, [subcategoryId]);

  const fetchSubcategoryInfo = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/taxonomy/subcategories/${subcategoryId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      setSubcategoryInfo(data);
    } catch (error) {
      console.error('Error fetching subcategory info:', error);
    }
  };

  const fetchPageContent = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}`
      );
      const data = await response.json();
      setSections(data.sections || []);
      setSeoData(data.seo || {});
      setCustomTabs(data.customTabs || []);
      setTocOrder(data.tocOrder || {});
      setTabHeadings(data.tabHeadings || {});
    } catch (error) {
      console.error('Error fetching page content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedSections: Section[]) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to save changes.');
        return;
      }

      const currentIds = new Set(updatedSections.map((section) => section.id).filter(Boolean));
      const originalIds = new Set(sections.map((section) => section.id).filter(Boolean));
      const deletedSectionIds = Array.from(originalIds).filter((id) => !currentIds.has(id));

      const syncPayload = {
        sections: updatedSections.map((section) => ({
          ...section,
          blocks: (section.blocks || []).map((block, idx) => ({
            ...block,
            display_order: block.display_order ?? idx
          })),
          display_order: section.display_order ?? 0,
          is_sidebar: section.is_sidebar || false,
          sidebar_tab_id: section.sidebar_tab_id ?? null
        })),
        deletedSectionIds
      };

      const syncEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/sections/sync`;
      const syncResponse = await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(syncPayload)
      });

      if (!syncResponse.ok) {
        throw new Error('Section sync failed');
      }

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/revisions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            change_summary: 'Manual save from page editor'
          })
        }
      );

      alert('Page saved successfully!');
      fetchPageContent();
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Failed to save page. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSEO = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/seo`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(seoData)
        }
      );
      alert('SEO settings saved successfully!');
      setShowSEOPanel(false);
    } catch (error) {
      console.error('Error saving SEO:', error);
      alert('Failed to save SEO settings.');
    }
  };

  const handleSaveTocOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const cleanOrder: Record<string, number> = {};
      Object.entries(tocOrder).forEach(([tab, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          cleanOrder[tab] = Number(val);
        }
      });
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/seo`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            ...seoData,
            structured_data: { ...(seoData.structured_data || {}), toc_order: cleanOrder }
          })
        }
      );
      setSeoData((prev: any) => ({
        ...prev,
        structured_data: { ...(prev.structured_data || {}), toc_order: cleanOrder }
      }));
      alert('TOC positions saved!');
      setShowTocPanel(false);
    } catch (error) {
      console.error('Error saving TOC order:', error);
      alert('Failed to save TOC positions.');
    }
  };

  const handleSaveTabHeadings = async () => {
    try {
      const token = localStorage.getItem('token');
      const cleanHeadings: Record<string, string> = {};
      Object.entries(tabHeadings).forEach(([tab, val]) => {
        if (val && val.trim()) cleanHeadings[tab] = val.trim();
      });
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/seo`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            ...seoData,
            structured_data: { ...(seoData.structured_data || {}), tab_headings: cleanHeadings }
          })
        }
      );
      setSeoData((prev: any) => ({
        ...prev,
        structured_data: { ...(prev.structured_data || {}), tab_headings: cleanHeadings }
      }));
      alert('Tab headings saved!');
      setShowTabHeadingsPanel(false);
    } catch (error) {
      console.error('Error saving tab headings:', error);
      alert('Failed to save tab headings.');
    }
  };

  const handlePreview = () => {
    if (subcategoryInfo?.slug) {
      window.open(`/${subcategoryInfo.slug}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading page editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-4 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                Page Editor: {subcategoryInfo?.name || 'Loading...'}
              </h1>
              <p className="text-sm text-gray-600 truncate">
                {subcategoryInfo?.category_name} / {subcategoryInfo?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowSEOPanel(true)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">SEO</span>
            </button>
            <button
              onClick={() => setShowTocPanel(true)}
              className="px-3 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 text-sm font-medium"
            >
              <span>TOC Order</span>
            </button>
            <button
              onClick={() => setShowTabHeadingsPanel(true)}
              className="px-3 py-2 border border-purple-300 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center gap-1.5 text-sm font-medium"
            >
              <span>Tab Headings</span>
            </button>
            <button
              onClick={handlePreview}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={() => handleSave(sections)}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <BlockEditor
        sections={sections}
        onSave={handleSave}
        onSectionsChange={setSections}
        onTocOrderClick={() => setShowTocPanel(true)}
        availableTabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'mock-tests', label: 'Mock Tests' },
          { id: 'previous-papers', label: 'Previous Papers' },
          ...customTabs.map(tab => ({ id: tab.id, label: tab.title }))
        ]}
      />

      {/* TOC Order Panel */}
      {showTocPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">TOC Mobile Position</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Set the CSS <code>order</code> of the Table of Contents on mobile per tab. Lower = appears earlier. Default is 0 (top).
                </p>
              </div>
              <button onClick={() => setShowTocPanel(false)} className="text-gray-500 hover:text-gray-700 ml-4">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'mock-tests', label: 'Mock Tests' },
                { id: 'previous-papers', label: 'Previous Papers' },
                ...customTabs.map(tab => ({ id: tab.id, label: tab.title }))
              ].map(tab => (
                <div key={tab.id} className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700 flex-1">{tab.label}</label>
                  <input
                    type="number"
                    min={0}
                    value={tocOrder[tab.id] ?? ''}
                    onChange={e => setTocOrder(prev => ({
                      ...prev,
                      [tab.id]: e.target.value === '' ? '' : parseInt(e.target.value, 10)
                    }))}
                    placeholder="0"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-2">
              <button onClick={() => setShowTocPanel(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveTocOrder} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Positions</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Headings Panel */}
      {showTabHeadingsPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Tab Headings</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Set a custom heading shown at the top of each tab's content. Leave blank to use the tab label.
                </p>
              </div>
              <button onClick={() => setShowTabHeadingsPanel(false)} className="text-gray-500 hover:text-gray-700 ml-4">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'mock-tests', label: 'Mock Tests' },
                { id: 'previous-papers', label: 'Previous Papers' },
                ...customTabs.map(tab => ({ id: tab.id, label: tab.title }))
              ].map(tab => (
                <div key={tab.id} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{tab.label}</label>
                  <input
                    type="text"
                    value={tabHeadings[tab.id] || ''}
                    onChange={e => setTabHeadings(prev => ({ ...prev, [tab.id]: e.target.value }))}
                    placeholder={`e.g. ${tab.label} for SSC CGL`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-2">
              <button onClick={() => setShowTabHeadingsPanel(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveTabHeadings} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Headings</button>
            </div>
          </div>
        </div>
      )}

      {/* SEO Panel */}
      {showSEOPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">SEO Settings</h2>
              <button
                onClick={() => setShowSEOPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Meta Title</label>
                <input
                  type="text"
                  value={seoData.meta_title || ''}
                  onChange={(e) => setSeoData({ ...seoData, meta_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter meta title (50-60 characters)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Meta Description</label>
                <textarea
                  value={seoData.meta_description || ''}
                  onChange={(e) => setSeoData({ ...seoData, meta_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter meta description (150-160 characters)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Meta Keywords</label>
                <input
                  type="text"
                  value={seoData.meta_keywords || ''}
                  onChange={(e) => setSeoData({ ...seoData, meta_keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">OG Title</label>
                <input
                  type="text"
                  value={seoData.og_title || ''}
                  onChange={(e) => setSeoData({ ...seoData, og_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Open Graph title for social media"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">OG Description</label>
                <textarea
                  value={seoData.og_description || ''}
                  onChange={(e) => setSeoData({ ...seoData, og_description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Open Graph description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">OG Image URL</label>
                <input
                  type="text"
                  value={seoData.og_image_url || ''}
                  onChange={(e) => setSeoData({ ...seoData, og_image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Canonical URL</label>
                <input
                  type="text"
                  value={seoData.canonical_url || ''}
                  onChange={(e) => setSeoData({ ...seoData, canonical_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/canonical-url"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Robots Meta</label>
                <select
                  value={seoData.robots_meta || 'index,follow'}
                  onChange={(e) => setSeoData({ ...seoData, robots_meta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="index,follow">Index, Follow</option>
                  <option value="noindex,follow">No Index, Follow</option>
                  <option value="index,nofollow">Index, No Follow</option>
                  <option value="noindex,nofollow">No Index, No Follow</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowSEOPanel(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSEO}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save SEO Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
