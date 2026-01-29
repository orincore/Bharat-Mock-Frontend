'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Settings, 
  Eye,
  Save,
  Undo,
  Redo
} from 'lucide-react';
import { BlockRenderer, getBlockIcon } from './BlockRenderer';

interface Block {
  id: string;
  block_type: string;
  content: any;
  settings?: any;
  display_order: number;
  section_id?: string;
}

interface Section {
  id: string;
  title: string;
  subtitle?: string;
  display_order: number;
  blocks: Block[];
}

interface BlockEditorProps {
  subcategoryId: string;
  sections: Section[];
  onSave: (sections: Section[]) => void;
}

const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', description: 'Add a heading' },
  { type: 'paragraph', label: 'Paragraph', description: 'Add text content' },
  { type: 'list', label: 'List', description: 'Bulleted or numbered list' },
  { type: 'table', label: 'Table', description: 'Add a data table' },
  { type: 'image', label: 'Image', description: 'Add an image' },
  { type: 'chart', label: 'Chart', description: 'Add a chart or graph' },
  { type: 'quote', label: 'Quote', description: 'Add a blockquote' },
  { type: 'code', label: 'Code', description: 'Add code snippet' },
  { type: 'divider', label: 'Divider', description: 'Add a horizontal line' },
  { type: 'button', label: 'Button', description: 'Add a call-to-action button' },
  { type: 'accordion', label: 'Accordion', description: 'Collapsible content' },
  { type: 'tabs', label: 'Tabs', description: 'Tabbed content' },
  { type: 'card', label: 'Card', description: 'Content card' },
  { type: 'alert', label: 'Alert', description: 'Alert or notice box' },
  { type: 'video', label: 'Video', description: 'Embed video' },
  { type: 'html', label: 'HTML', description: 'Custom HTML' },
  { type: 'spacer', label: 'Spacer', description: 'Add vertical space' }
];

export const BlockEditor: React.FC<BlockEditorProps> = ({ 
  subcategoryId, 
  sections: initialSections, 
  onSave 
}) => {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);

  useEffect(() => {
    setSections(initialSections.map(section => ({
      ...section,
      blocks: section.blocks || []
    })));
  }, [initialSections]);

  const addSection = () => {
    const newSection: Section = {
      id: `temp-${Date.now()}`,
      title: 'New Section',
      display_order: sections.length,
      blocks: []
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId));
  };

  const addBlock = (sectionId: string, blockType: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const defaultContent = getDefaultBlockContent(blockType);
    const newBlock: Block = {
      id: `temp-${Date.now()}`,
      block_type: blockType,
      content: defaultContent,
      display_order: section.blocks.length,
      section_id: sectionId
    };

    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, blocks: [...s.blocks, newBlock] }
        : s
    ));
    setShowBlockPicker(null);
    setEditingBlock(newBlock);
  };

  const updateBlock = (sectionId: string, blockId: string, updates: Partial<Block>) => {
    setSections(sections.map(section => 
      section.id === sectionId
        ? {
            ...section,
            blocks: section.blocks.map(block =>
              block.id === blockId ? { ...block, ...updates } : block
            )
          }
        : section
    ));
  };

  const deleteBlock = (sectionId: string, blockId: string) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            blocks: section.blocks.filter(block => block.id !== blockId)
          }
        : section
    ));
  };

  const moveBlock = (sectionId: string, blockId: string, direction: 'up' | 'down') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const blockIndex = section.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    const newBlocks = [...section.blocks];
    const targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;

    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;

    [newBlocks[blockIndex], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[blockIndex]];

    newBlocks.forEach((block, index) => {
      block.display_order = index;
    });

    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, blocks: newBlocks } : s
    ));
  };

  const handleSave = () => {
    onSave(sections);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Block Picker */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Content Blocks</h2>
          <p className="text-sm text-gray-600 mt-1">Drag or click to add</p>
        </div>
        <div className="p-4 space-y-2">
          {BLOCK_TYPES.map(blockType => {
            const Icon = getBlockIcon(blockType.type);
            return (
              <button
                key={blockType.type}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                title={blockType.description}
              >
                <div className="flex items-center">
                  <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">{blockType.label}</div>
                    <div className="text-xs text-gray-500">{blockType.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded" title="Undo">
              <Undo className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Redo">
              <Redo className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`px-4 py-2 rounded flex items-center space-x-2 ${
                isPreview ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{isPreview ? 'Edit' : 'Preview'}</span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={addSection}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Section</span>
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8">
            {sections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No sections yet. Add a section to get started.</p>
                <button
                  onClick={addSection}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add First Section
                </button>
              </div>
            ) : (
              sections.map((section, sectionIndex) => (
                <div key={section.id} className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Section Header */}
                  {!isPreview && (
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                          placeholder="Section Title"
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowBlockPicker(showBlockPicker === section.id ? null : section.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            <Plus className="w-4 h-4 inline mr-1" />
                            Add Block
                          </button>
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {section.subtitle !== undefined && (
                        <input
                          type="text"
                          value={section.subtitle ?? ''}
                          onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                          className="mt-2 text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 w-full"
                          placeholder="Section Subtitle (optional)"
                        />
                      )}
                    </div>
                  )}

                  {/* Block Picker Dropdown */}
                  {showBlockPicker === section.id && !isPreview && (
                    <div className="p-4 bg-blue-50 border-b border-blue-200">
                      <p className="text-sm font-semibold mb-3">Choose a block type:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {BLOCK_TYPES.map(blockType => {
                          const Icon = getBlockIcon(blockType.type);
                          return (
                            <button
                              key={blockType.type}
                              onClick={() => addBlock(section.id, blockType.type)}
                              className="p-3 bg-white border border-gray-200 rounded hover:border-blue-500 hover:bg-blue-50 text-left"
                            >
                              <Icon className="w-5 h-5 text-blue-600 mb-1" />
                              <div className="text-sm font-medium">{blockType.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section Blocks */}
                  <div className="p-6">
                    {section.blocks.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No blocks in this section. Click "Add Block" to add content.
                      </div>
                    ) : (
                      section.blocks.map((block, blockIndex) => (
                        <div
                          key={block.id}
                          className={`relative group mb-4 ${
                            selectedBlock === block.id ? 'ring-2 ring-blue-500 rounded' : ''
                          }`}
                          onClick={() => {
                            setSelectedBlock(block.id);
                          }}
                          onDoubleClick={() => {
                            if (!isPreview) {
                              setEditingBlock(block);
                            }
                          }}
                        >
                          {/* Block Controls */}
                          {!isPreview && (
                            <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
                              <button
                                onClick={() => moveBlock(section.id, block.id, 'up')}
                                disabled={blockIndex === 0}
                                className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30"
                              >
                                <GripVertical className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingBlock(block)}
                                className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteBlock(section.id, block.id)}
                                className="p-1 bg-white border border-red-300 rounded hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingBlock(block)}
                                className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Edit
                              </button>
                            </div>
                          )}

                          {/* Block Content */}
                          <BlockRenderer block={block} isEditing={!isPreview} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Block Settings Panel */}
      {editingBlock && (
        <BlockSettingsPanel
          block={editingBlock}
          onUpdate={(updates) => {
            const section = sections.find(s => s.id === editingBlock.section_id);
            if (section) {
              updateBlock(section.id, editingBlock.id, updates);
            }
            setEditingBlock(null);
          }}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
};

const BlockSettingsPanel: React.FC<{
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onClose: () => void;
}> = ({ block, onUpdate, onClose }) => {
  const [content, setContent] = useState(block.content);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-bold">Edit Block</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Block Type</label>
          <div className="px-3 py-2 bg-gray-100 rounded">{block.block_type}</div>
        </div>
        
        <BlockContentEditor
          blockType={block.block_type}
          content={content}
          onChange={setContent}
        />

        <div className="mt-6 flex space-x-2">
          <button
            onClick={() => onUpdate({ content })}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const BlockContentEditor: React.FC<{
  blockType: string;
  content: any;
  onChange: (content: any) => void;
}> = ({ blockType, content, onChange }) => {
  switch (blockType) {
    case 'heading':
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Text</label>
            <input
              type="text"
              value={content.text || ''}
              onChange={(e) => onChange({ ...content, text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Level</label>
            <select
              value={content.level || 2}
              onChange={(e) => onChange({ ...content, level: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6].map(level => (
                <option key={level} value={level}>H{level}</option>
              ))}
            </select>
          </div>
        </>
      );
    
    case 'paragraph':
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Text</label>
          <textarea
            value={content.text || ''}
            onChange={(e) => onChange({ ...content, text: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    
    case 'image':
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Image URL</label>
            <input
              type="text"
              value={content.url || ''}
              onChange={(e) => onChange({ ...content, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Alt Text</label>
            <input
              type="text"
              value={content.alt || ''}
              onChange={(e) => onChange({ ...content, alt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Caption</label>
            <input
              type="text"
              value={content.caption || ''}
              onChange={(e) => onChange({ ...content, caption: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );
    
    default:
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Content (JSON)</label>
          <textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch (err) {
                // Invalid JSON, ignore
              }
            }}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
      );
  }
};

const getDefaultBlockContent = (blockType: string): any => {
  const defaults: Record<string, any> = {
    heading: { text: 'New Heading', level: 2, alignment: 'left' },
    paragraph: { text: 'Enter your text here...', alignment: 'left' },
    list: { type: 'unordered', items: ['Item 1', 'Item 2', 'Item 3'] },
    table: { 
      headers: ['Column 1', 'Column 2', 'Column 3'], 
      rows: [['Data 1', 'Data 2', 'Data 3']], 
      hasHeader: true, 
      striped: true 
    },
    image: { url: '', alt: '', caption: '', width: '100%', alignment: 'center' },
    quote: { text: 'Enter quote text...', author: '' },
    button: { text: 'Click Here', url: '#', variant: 'primary', size: 'medium' },
    accordion: { items: [{ title: 'Question 1', content: 'Answer 1' }] },
    alert: { text: 'This is an alert message', type: 'info' }
  };
  
  return defaults[blockType] || {};
};
