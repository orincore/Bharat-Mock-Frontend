'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BlockEditor } from '@/components/PageEditor/BlockEditor';
import { ArrowLeft, Save, Eye, History, Settings } from 'lucide-react';

interface Section {
  id: string;
  section_key: string;
  title: string;
  subtitle?: string;
  display_order: number;
  blocks: any[];
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
  const [seoData, setSeoData] = useState<any>({});

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
      
      for (const section of updatedSections) {
        if (section.id.startsWith('temp-')) {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/sections`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                section_key: section.section_key || section.title.toLowerCase().replace(/\s+/g, '-'),
                title: section.title,
                subtitle: section.subtitle,
                display_order: section.display_order
              })
            }
          );
          const newSection = await response.json();
          section.id = newSection.id;
        } else {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/sections/${section.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                title: section.title,
                subtitle: section.subtitle,
                display_order: section.display_order
              })
            }
          );
        }

        for (const block of section.blocks) {
          if (block.id.startsWith('temp-')) {
            await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/blocks`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  section_id: section.id,
                  block_type: block.block_type,
                  content: block.content,
                  settings: block.settings,
                  display_order: block.display_order
                })
              }
            );
          } else {
            await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/blocks/${block.id}`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  section_id: section.id,
                  content: block.content,
                  settings: block.settings,
                  display_order: block.display_order
                })
              }
            );
          }
        }
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

  const handlePreview = () => {
    if (subcategoryInfo) {
      const previewUrl = `/${subcategoryInfo.category_slug}/${subcategoryInfo.slug}`;
      window.open(previewUrl, '_blank');
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Page Editor: {subcategoryInfo?.name || 'Loading...'}
              </h1>
              <p className="text-sm text-gray-600">
                {subcategoryInfo?.category_name} / {subcategoryInfo?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSEOPanel(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>SEO Settings</span>
            </button>
            <button
              onClick={handlePreview}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => handleSave(sections)}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <BlockEditor
        sections={sections}
        onSave={handleSave}
      />

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
