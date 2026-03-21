"use client";

import { useEffect, useState } from 'react';
import {
  Loader2, ArrowUp, ArrowDown, ChevronDown, ChevronUp,
  FileText, Settings, Trash2, Edit, Save, Plus, Layers
} from 'lucide-react';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { paperSectionsService, PaperSection, PaperTopic } from '@/lib/api/paperSectionsService';

interface SectionWithTopics extends PaperSection {
  topics: PaperTopic[];
}

export default function PreviousYearPapersAdmin() {
  const { toast } = useToast();

  const [sections, setSections] = useState<SectionWithTopics[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Inline edit state
  const [editingItem, setEditingItem] = useState<{ type: 'section' | 'topic'; id: string } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Add new section
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSectionLoading, setAddingSectionLoading] = useState(false);

  // Add new topic
  const [addingTopicForSection, setAddingTopicForSection] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [addingTopicLoading, setAddingTopicLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sectionsData, topicsData] = await Promise.all([
        paperSectionsService.getSections(),
        paperSectionsService.getTopics(),
      ]);
      const merged: SectionWithTopics[] = sectionsData.map(s => ({
        ...s,
        topics: topicsData
          .filter(t => t.section_id === s.id)
          .sort((a, b) => a.display_order - b.display_order),
      }));
      setSections(merged.sort((a, b) => a.display_order - b.display_order));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Section ordering ──────────────────────────────────────────────────────
  const moveSectionUp = async (index: number) => {
    if (index === 0) return;
    const next = [...sections];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    next.forEach((s, i) => { s.display_order = i; });
    setSections(next);
    try {
      await paperSectionsService.reorderSections(next.map(s => s.id));
      toast({ title: 'Success', description: 'Section order updated' });
    } catch {
      toast({ title: 'Error', description: 'Failed to reorder', variant: 'destructive' });
      fetchData();
    }
  };

  const moveSectionDown = async (index: number) => {
    if (index === sections.length - 1) return;
    const next = [...sections];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    next.forEach((s, i) => { s.display_order = i; });
    setSections(next);
    try {
      await paperSectionsService.reorderSections(next.map(s => s.id));
      toast({ title: 'Success', description: 'Section order updated' });
    } catch {
      toast({ title: 'Error', description: 'Failed to reorder', variant: 'destructive' });
      fetchData();
    }
  };

  // ── Topic ordering ────────────────────────────────────────────────────────
  const moveTopicUp = async (sectionId: string, index: number) => {
    if (index === 0) return;
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      const next = [...s.topics];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      next.forEach((t, i) => { t.display_order = i; });
      return { ...s, topics: next };
    }));
    const section = sections.find(s => s.id === sectionId)!;
    const next = [...section.topics];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    try {
      await paperSectionsService.reorderTopics(next.map(t => t.id));
      toast({ title: 'Success', description: 'Topic order updated' });
    } catch {
      toast({ title: 'Error', description: 'Failed to reorder', variant: 'destructive' });
      fetchData();
    }
  };

  const moveTopicDown = async (sectionId: string, index: number) => {
    const section = sections.find(s => s.id === sectionId)!;
    if (index === section.topics.length - 1) return;
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      const next = [...s.topics];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      next.forEach((t, i) => { t.display_order = i; });
      return { ...s, topics: next };
    }));
    const next = [...section.topics];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    try {
      await paperSectionsService.reorderTopics(next.map(t => t.id));
      toast({ title: 'Success', description: 'Topic order updated' });
    } catch {
      toast({ title: 'Error', description: 'Failed to reorder', variant: 'destructive' });
      fetchData();
    }
  };

  // ── Inline edit ───────────────────────────────────────────────────────────
  const startEditing = (type: 'section' | 'topic', id: string, name: string) => {
    setEditingItem({ type, id });
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditingName('');
  };

  const saveEditing = async () => {
    if (!editingItem || !editingName.trim()) return;
    setEditSaving(true);
    try {
      if (editingItem.type === 'section') {
        await paperSectionsService.updateSection(editingItem.id, { name: editingName.trim() });
        setSections(prev => prev.map(s => s.id === editingItem.id ? { ...s, name: editingName.trim() } : s));
      } else {
        await paperSectionsService.updateTopic(editingItem.id, { name: editingName.trim() });
        setSections(prev => prev.map(s => ({
          ...s,
          topics: s.topics.map(t => t.id === editingItem.id ? { ...t, name: editingName.trim() } : t),
        })));
      }
      toast({ title: 'Saved', description: 'Name updated' });
      cancelEditing();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteSection = async (id: string, name: string) => {
    if (!confirm(`Delete section "${name}" and all its topics?`)) return;
    try {
      await paperSectionsService.deleteSection(id);
      setSections(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Deleted', description: 'Section deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleDeleteTopic = async (topicId: string, name: string) => {
    if (!confirm(`Delete topic "${name}"?`)) return;
    try {
      await paperSectionsService.deleteTopic(topicId);
      setSections(prev => prev.map(s => ({ ...s, topics: s.topics.filter(t => t.id !== topicId) })));
      toast({ title: 'Deleted', description: 'Topic deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  // ── Add section ───────────────────────────────────────────────────────────
  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    setAddingSectionLoading(true);
    try {
      const created = await paperSectionsService.createSection({
        name: newSectionName.trim(),
        display_order: sections.length,
      });
      setSections(prev => [...prev, { ...created, topics: [] }]);
      setNewSectionName('');
      setShowAddSection(false);
      toast({ title: 'Created', description: 'Section added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create', variant: 'destructive' });
    } finally {
      setAddingSectionLoading(false);
    }
  };

  // ── Add topic ─────────────────────────────────────────────────────────────
  const handleAddTopic = async (sectionId: string) => {
    if (!newTopicName.trim()) return;
    setAddingTopicLoading(true);
    const section = sections.find(s => s.id === sectionId)!;
    try {
      const created = await paperSectionsService.createTopic({
        paper_section_id: sectionId,
        name: newTopicName.trim(),
        display_order: section.topics.length,
      });
      setSections(prev => prev.map(s =>
        s.id === sectionId ? { ...s, topics: [...s.topics, { ...created, section_id: sectionId }] } : s
      ));
      setNewTopicName('');
      setAddingTopicForSection(null);
      toast({ title: 'Created', description: 'Topic added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create', variant: 'destructive' });
    } finally {
      setAddingTopicLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-2">
          <Breadcrumbs
            items={[AdminBreadcrumb(), { label: 'Pages', href: '/admin/pages' }, { label: 'Previous Year Papers' }]}
            className="mb-2"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Previous Year Papers</p>
            <h1 className="font-display text-3xl font-bold text-slate-900">Sections & Topics</h1>
            <p className="text-muted-foreground">Manage sections and topics used to organise previous year papers.</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Sections</h2>
              <p className="text-sm text-muted-foreground">e.g. Tier I, Tier II, Prelims, Mains</p>
            </div>
            <Button onClick={() => setShowAddSection(v => !v)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Section
            </Button>
          </div>

          {/* Add section form */}
          {showAddSection && (
            <div className="flex items-center gap-3 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Input
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                placeholder="Section name (e.g. Tier I)"
                className="flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowAddSection(false); }}
                autoFocus
              />
              <Button onClick={handleAddSection} disabled={addingSectionLoading || !newSectionName.trim()}>
                {addingSectionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowAddSection(false); setNewSectionName(''); }}>Cancel</Button>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading sections...</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sections yet. Add one above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <Card key={section.id} className="p-4 bg-white">
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleSection(section.id)} className="h-8 w-8 p-0">
                        {expandedSections.has(section.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => moveSectionUp(sectionIndex)} disabled={sectionIndex === 0} className="h-7 w-7 p-0" title="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => moveSectionDown(sectionIndex)} disabled={sectionIndex === sections.length - 1} className="h-7 w-7 p-0" title="Move down">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <Settings className="h-4 w-4 text-blue-600" />
                      {editingItem?.type === 'section' && editingItem.id === section.id ? (
                        <div className="flex items-center gap-2">
                          <Input value={editingName} onChange={e => setEditingName(e.target.value)} className="h-8 text-sm w-44"
                            onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }} autoFocus />
                          <Button size="sm" onClick={saveEditing} disabled={editSaving} className="h-8 px-2">
                            {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-8 px-2">×</Button>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-900">{section.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{section.topics.length} topics</span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditing('section', section.id, section.name)} title="Rename">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteSection(section.id, section.name)} title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Topics */}
                  {expandedSections.has(section.id) && (
                    <div className="mt-4 ml-10 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" /> Topics
                        </h5>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => { setAddingTopicForSection(section.id); setNewTopicName(''); }}>
                          <Plus className="h-3 w-3" /> Add Topic
                        </Button>
                      </div>

                      {/* Add topic form */}
                      {addingTopicForSection === section.id && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 mb-2">
                          <Input value={newTopicName} onChange={e => setNewTopicName(e.target.value)}
                            placeholder="Topic name (e.g. 2024)" className="flex-1 h-8 text-sm"
                            onKeyDown={e => { if (e.key === 'Enter') handleAddTopic(section.id); if (e.key === 'Escape') setAddingTopicForSection(null); }}
                            autoFocus />
                          <Button size="sm" onClick={() => handleAddTopic(section.id)} disabled={addingTopicLoading || !newTopicName.trim()} className="h-8">
                            {addingTopicLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingTopicForSection(null)} className="h-8">Cancel</Button>
                        </div>
                      )}

                      {section.topics.length === 0 && addingTopicForSection !== section.id && (
                        <p className="text-xs text-muted-foreground py-2">No topics yet.</p>
                      )}

                      {section.topics.map((topic, topicIndex) => (
                        <div key={topic.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => moveTopicUp(section.id, topicIndex)} disabled={topicIndex === 0} className="h-6 w-6 p-0">
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => moveTopicDown(section.id, topicIndex)} disabled={topicIndex === section.topics.length - 1} className="h-6 w-6 p-0">
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            {editingItem?.type === 'topic' && editingItem.id === topic.id ? (
                              <div className="flex items-center gap-1">
                                <Input value={editingName} onChange={e => setEditingName(e.target.value)} className="h-6 text-xs w-32"
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }} autoFocus />
                                <Button size="sm" onClick={saveEditing} disabled={editSaving} className="h-6 px-1">
                                  {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-6 px-1">×</Button>
                              </div>
                            ) : (
                              <span className="text-sm">{topic.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground mr-1">#{topicIndex + 1}</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEditing('topic', topic.id, topic.name)} title="Rename">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteTopic(topic.id, topic.name)} title="Delete">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
