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
  sections: initialSections, 
  onSave 
}) => {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState<string | null>(null);
  const [openBlockEditor, setOpenBlockEditor] = useState<string | null>(null);

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
    setOpenBlockEditor(newBlock.id);
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
                      section.blocks.map((block, blockIndex) => {
                        const isSelected = selectedBlock === block.id;
                        const isTableBlock = block.block_type === 'table';
                        const isTableEditing = !isPreview && isTableBlock && openBlockEditor === block.id;
                        const showSideEditor = !isTableBlock && !isPreview && openBlockEditor === block.id;

                        return (
                          <div
                            key={block.id}
                            className={`relative group mb-4 ${isSelected ? 'ring-2 ring-blue-500 rounded' : ''}`}
                            onClick={() => setSelectedBlock(block.id)}
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
                                  onClick={() => deleteBlock(section.id, block.id)}
                                  className="p-1 bg-white border border-red-300 rounded hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {!isTableBlock && (
                                  <button
                                    onClick={() =>
                                      setOpenBlockEditor((prev) => (prev === block.id ? null : block.id))
                                    }
                                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    {showSideEditor ? 'Close' : 'Edit'}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Block Content */}
                            {isTableBlock && !isPreview && (
                              <div className="flex justify-end gap-2 mb-3">
                                <button
                                  type="button"
                                  onClick={() => setOpenBlockEditor((prev) => (prev === block.id ? null : prev))}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                                    !isTableEditing ? 'bg-white text-blue-600 border-blue-600' : 'text-gray-500 border-gray-200'
                                  }`}
                                >
                                  Preview Table
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setOpenBlockEditor(block.id)}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                                    isTableEditing ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-600 border-blue-600'
                                  }`}
                                >
                                  Edit Table
                                </button>
                              </div>
                            )}

                            {isTableBlock && isTableEditing && (
                              <InlineTableEditor
                                content={block.content}
                                onChange={(updatedContent) =>
                                  updateBlock(section.id, block.id, { content: updatedContent })
                                }
                              />
                            )}

                            <BlockRenderer block={block} isEditing={!isPreview} />

                            {showSideEditor && (
                              <div className="mt-4 border border-blue-200 bg-blue-50/40 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                                    <Settings className="w-4 h-4" />
                                    Configure {block.block_type} block
                                  </div>
                                  <button
                                    className="text-blue-600 text-sm font-medium"
                                    onClick={() => setOpenBlockEditor(null)}
                                  >
                                    Done
                                  </button>
                                </div>
                                <BlockContentEditor
                                  blockType={block.block_type}
                                  content={block.content}
                                  onChange={(updatedContent) =>
                                    updateBlock(section.id, block.id, { content: updatedContent })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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

    case 'list':
      return <ListContentEditor content={content} onChange={onChange} />;

    case 'table':
      return <TableContentEditor content={content} onChange={onChange} />;

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
    
    case 'button':
      return <ButtonContentEditor content={content} onChange={onChange} />;

    case 'quote':
      return <QuoteContentEditor content={content} onChange={onChange} />;

    case 'code':
      return <CodeContentEditor content={content} onChange={onChange} />;

    case 'accordion':
      return <AccordionContentEditor content={content} onChange={onChange} />;

    case 'tabs':
      return <TabsContentEditor content={content} onChange={onChange} />;

    case 'alert':
      return <AlertContentEditor content={content} onChange={onChange} />;

    case 'video':
      return <VideoContentEditor content={content} onChange={onChange} />;

    case 'card':
      return <CardContentEditor content={content} onChange={onChange} />;

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

const ListContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const items: string[] = Array.isArray(content.items) && content.items.length ? content.items : [''];
  const listType = content.type || 'unordered';

  const handleItemChange = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange({ ...content, items: next });
  };

  const addItem = () => onChange({ ...content, items: [...items, ''] });
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    onChange({ ...content, items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">List Type</label>
        <select
          value={listType}
          onChange={(e) => onChange({ ...content, type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="unordered">Bulleted</option>
          <option value="ordered">Numbered</option>
        </select>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Items</label>
          <button type="button" onClick={addItem} className="text-blue-600 text-sm font-semibold">
            + Add Item
          </button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <textarea
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
              disabled={items.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const TableContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const headers: string[] = Array.isArray(content.headers) && content.headers.length ? content.headers : ['Column 1'];
  const rows: string[][] = Array.isArray(content.rows) && content.rows.length ? content.rows : [headers.map(() => '')];
  const hasHeader = content.hasHeader ?? true;
  const striped = content.striped ?? true;

  const update = (next: Partial<any>) => onChange({ ...content, ...next });

  const handleHeaderChange = (index: number, value: string) => {
    const nextHeaders = [...headers];
    nextHeaders[index] = value;
    update({ headers: nextHeaders });
  };

  const addColumn = () => {
    const nextHeaders = [...headers, `Column ${headers.length + 1}`];
    const nextRows = rows.map((row) => [...row, '']);
    update({ headers: nextHeaders, rows: nextRows });
  };

  const removeColumn = (index: number) => {
    if (headers.length === 1) return;
    const nextHeaders = headers.filter((_, i) => i !== index);
    const nextRows = rows.map((row) => row.filter((_, i) => i !== index));
    update({ headers: nextHeaders, rows: nextRows });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const nextRow = [...row];
      nextRow[colIndex] = value;
      return nextRow;
    });
    update({ rows: nextRows });
  };

  const addRow = () => update({ rows: [...rows, headers.map(() => '')] });
  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    update({ rows: rows.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Headers</label>
          <button type="button" onClick={addColumn} className="text-blue-600 text-sm font-semibold">
            + Add Column
          </button>
        </div>
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={header}
                onChange={(e) => handleHeaderChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeColumn(index)}
                className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                disabled={headers.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Rows</label>
          <button type="button" onClick={addRow} className="text-blue-600 text-sm font-semibold">
            + Add Row
          </button>
        </div>
        <div className="space-y-4">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Row {rowIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                  className="text-red-600"
                  disabled={rows.length === 1}
                >
                  Remove Row
                </button>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>
                {headers.map((_, colIndex) => (
                  <textarea
                    key={colIndex}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    value={row[colIndex] || ''}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => update({ hasHeader: e.target.checked })}
          />
          Show header row
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={striped}
            onChange={(e) => update({ striped: e.target.checked })}
          />
          Striped rows
        </label>
      </div>
    </div>
  );
};

const ButtonContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Label</label>
      <input
        type="text"
        value={content.text || ''}
        onChange={(e) => onChange({ ...content, text: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">URL</label>
      <input
        type="text"
        value={content.url || ''}
        onChange={(e) => onChange({ ...content, url: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Variant</label>
        <select
          value={content.variant || 'primary'}
          onChange={(e) => onChange({ ...content, variant: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Size</label>
        <select
          value={content.size || 'medium'}
          onChange={(e) => onChange({ ...content, size: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  </div>
);

const QuoteContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Quote</label>
      <textarea
        rows={4}
        value={content.text || ''}
        onChange={(e) => onChange({ ...content, text: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Author</label>
      <input
        type="text"
        value={content.author || ''}
        onChange={(e) => onChange({ ...content, author: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
);

const CodeContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Language</label>
      <select
        value={content.language || 'javascript'}
        onChange={(e) => onChange({ ...content, language: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      >
        {['javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go', 'ruby', 'php', 'sql', 'bash'].map((lang) => (
          <option key={lang} value={lang}>
            {lang.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Code</label>
      <textarea
        rows={8}
        value={content.code || ''}
        onChange={(e) => onChange({ ...content, code: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
);

const AccordionContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const items = Array.isArray(content.items) && content.items.length ? content.items : [{ title: 'Accordion Title', content: 'Accordion content' }];

  const updateItems = (next: any[]) => onChange({ ...content, items: next });

  const addItem = () => updateItems([...items, { title: `Item ${items.length + 1}`, content: '' }]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    updateItems(items.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, key: 'title' | 'content', value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    updateItems(next);
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={addItem} className="text-blue-600 text-sm font-semibold">
        + Add Accordion Item
      </button>
      {items.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Item {index + 1}</p>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-red-600 text-sm"
              disabled={items.length === 1}
            >
              Remove
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={item.title || ''}
              onChange={(e) => handleChange(index, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              rows={4}
              value={item.content || ''}
              onChange={(e) => handleChange(index, 'content', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const TabsContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const tabs = Array.isArray(content.tabs) && content.tabs.length ? content.tabs : [{ title: 'Tab 1', content: '' }];

  const updateTabs = (next: any[]) => onChange({ ...content, tabs: next });

  const addTab = () => updateTabs([...tabs, { title: `Tab ${tabs.length + 1}`, content: '' }]);
  const removeTab = (index: number) => {
    if (tabs.length === 1) return;
    updateTabs(tabs.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, key: 'title' | 'content', value: string) => {
    const next = [...tabs];
    next[index] = { ...next[index], [key]: value };
    updateTabs(next);
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={addTab} className="text-blue-600 text-sm font-semibold">
        + Add Tab
      </button>
      {tabs.map((tab, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Tab {index + 1}</p>
            <button
              type="button"
              onClick={() => removeTab(index)}
              className="text-red-600 text-sm"
              disabled={tabs.length === 1}
            >
              Remove
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={tab.title || ''}
              onChange={(e) => handleChange(index, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              rows={4}
              value={tab.content || ''}
              onChange={(e) => handleChange(index, 'content', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const AlertContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Alert Type</label>
      <select
        value={content.type || 'info'}
        onChange={(e) => onChange({ ...content, type: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      >
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Content</label>
      <textarea
        rows={4}
        value={content.text || ''}
        onChange={(e) => onChange({ ...content, text: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
  </div>
);

const InlineTableEditor = ({
  content,
  onChange
}: {
  content: any;
  onChange: (content: any) => void;
}) => {
  const headers: string[] = Array.isArray(content.headers) ? content.headers : [];
  const rows: string[][] = Array.isArray(content.rows) ? content.rows : [];
  const hasHeader = content.hasHeader ?? true;
  const striped = content.striped ?? false;

  const update = (next: Partial<any>) => onChange({ ...content, ...next });

  const addColumn = () => {
    const nextHeaders = [...headers, `Column ${headers.length + 1}`];
    const nextRows = rows.length ? rows.map((row) => [...row, '']) : [[...nextHeaders.map(() => '')]];
    update({ headers: nextHeaders, rows: nextRows });
  };

  const removeColumn = (index: number) => {
    if (headers.length <= 1) return;
    const nextHeaders = headers.filter((_, i) => i !== index);
    const nextRows = rows.map((row) => row.filter((_, i) => i !== index));
    update({ headers: nextHeaders, rows: nextRows });
  };

  const addRow = () => {
    if (!headers.length) return;
    update({ rows: [...rows, headers.map(() => '')] });
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    update({ rows: rows.filter((_, i) => i !== index) });
  };

  const handleHeaderChange = (index: number, value: string) => {
    const next = [...headers];
    next[index] = value;
    update({ headers: next });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const nextRow = [...row];
      nextRow[colIndex] = value;
      return nextRow;
    });
    update({ rows: nextRows });
  };

  const ensureStructure = () => {
    if (!headers.length) {
      update({ headers: ['Column 1'], rows: [['']] });
    } else if (!rows.length) {
      update({ rows: [headers.map(() => '')] });
    }
  };

  React.useEffect(() => {
    ensureStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!headers.length || !rows.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={addColumn} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
          + Column
        </button>
        <button type="button" onClick={addRow} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
          + Row
        </button>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasHeader} onChange={(e) => update({ hasHeader: e.target.checked })} />
          Header Row
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={striped} onChange={(e) => update({ striped: e.target.checked })} />
          Striped Rows
        </label>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          {hasHeader && (
            <thead className="bg-gray-100">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="border border-gray-200 p-2 align-top">
                    <div className="flex flex-col gap-2">
                      <input
                        value={header}
                        onChange={(e) => handleHeaderChange(index, e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeColumn(index)}
                        className="text-xs text-red-600 hover:underline"
                        disabled={headers.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={striped && rowIndex % 2 === 1 ? 'bg-gray-50' : ''}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-gray-200 p-2">
                    <textarea
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      rows={2}
                    />
                  </td>
                ))}
                <td className="p-2 align-top">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    className="text-xs text-red-600 hover:underline"
                    disabled={rows.length <= 1}
                  >
                    Remove Row
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const VideoContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Embed / Video URL</label>
      <input
        type="text"
        value={content.url || ''}
        onChange={(e) => onChange({ ...content, url: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Caption (optional)</label>
      <input
        type="text"
        value={content.caption || ''}
        onChange={(e) => onChange({ ...content, caption: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
  </div>
);

const CardContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Description</label>
      <textarea
        rows={4}
        value={content.description || ''}
        onChange={(e) => onChange({ ...content, description: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Image URL</label>
      <input
        type="text"
        value={content.image || ''}
        onChange={(e) => onChange({ ...content, image: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Link Text</label>
        <input
          type="text"
          value={(content.link && content.link.text) || ''}
          onChange={(e) => onChange({ ...content, link: { ...(content.link || {}), text: e.target.value } })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Link URL</label>
        <input
          type="text"
          value={(content.link && content.link.url) || ''}
          onChange={(e) => onChange({ ...content, link: { ...(content.link || {}), url: e.target.value } })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>
    </div>
  </div>
);

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
