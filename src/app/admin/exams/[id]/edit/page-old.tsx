"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, Plus, Trash2, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminService } from '@/lib/api/adminService';
import { taxonomyService, Category, Subcategory, Difficulty } from '@/lib/api/taxonomyService';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/common/LoadingStates';

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
  image?: File | null;
  imagePreview?: string;
}

interface Question {
  id: string;
  type: 'single' | 'multiple' | 'truefalse' | 'numerical';
  text: string;
  marks: number;
  negative_marks: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  image?: File | null;
  imagePreview?: string;
  options: Option[];
}

type ExamStatus = 'upcoming' | 'ongoing' | 'completed' | 'anytime';

interface Section {
  id: string;
  name: string;
  total_questions: number;
  marks_per_question: number;
  duration: number;
  section_order: number;
  questions: Question[];
  expanded: boolean;
}

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 180,
    total_marks: 100,
    total_questions: 50,
    category: '',
    category_id: '',
    subcategory: '',
    subcategory_id: '',
    difficulty: '',
    difficulty_id: '',
    slug: '',
    status: 'upcoming' as ExamStatus,
    start_date: '',
    end_date: '',
    pass_percentage: 33,
    is_free: true,
    price: 0,
    negative_marking: false,
    negative_mark_value: 0,
    is_published: false,
    allow_anytime: false,
    syllabus: [] as string[]
  });

  const [syllabusInput, setSyllabusInput] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newDifficultyName, setNewDifficultyName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [showNewDifficulty, setShowNewDifficulty] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');

  useEffect(() => {
    loadExamData();
    fetchTaxonomies();
  }, [examId]);

  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories(formData.category_id);
    } else {
      setSubcategories([]);
    }
  }, [formData.category_id]);

  useEffect(() => {
    generateUrl();
  }, [formData.category_id, formData.subcategory_id, formData.slug, formData.title]);

  const loadExamData = async () => {
    try {
      const exam = await adminService.getExamById(examId);
      if (!exam) {
        alert('Exam not found');
        router.push('/admin/exams');
        return;
      }

      setFormData({
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        total_marks: exam.total_marks,
        total_questions: exam.total_questions,
        category: exam.category || '',
        category_id: exam.category_id || '',
        subcategory: exam.subcategory || '',
        subcategory_id: exam.subcategory_id || '',
        difficulty: exam.difficulty || '',
        difficulty_id: exam.difficulty_id || '',
        slug: exam.slug || '',
        status: (exam.status as ExamStatus) ?? 'upcoming',
        start_date: exam.start_date?.split('T')[0] || '',
        end_date: exam.end_date?.split('T')[0] || '',
        pass_percentage: exam.pass_percentage,
        is_free: exam.is_free,
        price: exam.price,
        negative_marking: exam.negative_marking,
        negative_mark_value: exam.negative_mark_value,
        is_published: exam.is_published,
        allow_anytime: exam.allow_anytime ?? false,
        syllabus: exam.syllabus || []
      });

      if (exam.logo_url) setLogoPreview(exam.logo_url);
      if (exam.thumbnail_url) setThumbnailPreview(exam.thumbnail_url);

    } catch (error) {
      console.error('Failed to load exam:', error);
      alert('Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxonomies = async () => {
    try {
      const [cats, diffs] = await Promise.all([
        taxonomyService.getCategories(),
        taxonomyService.getDifficulties()
      ]);
      setCategories(cats);
      setDifficulties(diffs);
    } catch (error) {
      console.error('Failed to fetch taxonomies:', error);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      const subs = await taxonomyService.getSubcategories(categoryId);
      setSubcategories(subs);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    }
  };

  const generateUrl = () => {
    const category = categories.find(c => c.id === formData.category_id);
    const subcategory = subcategories.find(s => s.id === formData.subcategory_id);
    const slug = formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    const parts = [];
    if (category) parts.push(category.slug);
    if (subcategory) parts.push(subcategory.slug);
    if (slug) parts.push(slug);
    
    setGeneratedUrl(parts.length > 0 ? `/${parts.join('/')}` : '');
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await taxonomyService.createCategory({ name: newCategoryName });
      setCategories([...categories, newCat]);
      setFormData(prev => ({ ...prev, category_id: newCat.id, category: newCat.name }));
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (error) {
      alert('Failed to create category');
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !formData.category_id) return;
    try {
      const newSub = await taxonomyService.createSubcategory({
        category_id: formData.category_id,
        name: newSubcategoryName
      });
      setSubcategories([...subcategories, newSub]);
      setFormData(prev => ({ ...prev, subcategory_id: newSub.id, subcategory: newSub.name }));
      setNewSubcategoryName('');
      setShowNewSubcategory(false);
    } catch (error) {
      alert('Failed to create subcategory');
    }
  };

  const handleCreateDifficulty = async () => {
    if (!newDifficultyName.trim()) return;
    try {
      const newDiff = await taxonomyService.createDifficulty({
        name: newDifficultyName,
        level_order: difficulties.length + 1
      });
      setDifficulties([...difficulties, newDiff]);
      setFormData(prev => ({ ...prev, difficulty_id: newDiff.id, difficulty: newDiff.name }));
      setNewDifficultyName('');
      setShowNewDifficulty(false);
    } catch (error) {
      alert('Failed to create difficulty level');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'thumbnail') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'logo') {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const addSyllabusItem = () => {
    if (syllabusInput.trim()) {
      setFormData(prev => ({
        ...prev,
        syllabus: [...prev.syllabus, syllabusInput.trim()]
      }));
      setSyllabusInput('');
    }
  };

  const removeSyllabusItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      syllabus: prev.syllabus.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = { ...formData } as typeof formData;

      if (!payload.category_id) delete (payload as any).category_id;
      if (!payload.subcategory_id) delete (payload as any).subcategory_id;
      if (!payload.difficulty_id) delete (payload as any).difficulty_id;
      if (!payload.subcategory) delete (payload as any).subcategory;
      if (!payload.difficulty) delete (payload as any).difficulty;
      if (!payload.slug) delete (payload as any).slug;

      await adminService.updateExam(examId, payload, logoFile || undefined, thumbnailFile || undefined);
      alert('Exam updated successfully!');
      router.push('/admin/exams');
    } catch (error: any) {
      console.error('Failed to update exam:', error);
      alert(error.message || 'Failed to update exam. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/exams" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Exams
        </Link>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Edit Exam
        </h1>
        <p className="text-muted-foreground">
          Update exam details and configuration
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Exam Title *
              </label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., JEE Main Mock Test 2026"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the exam..."
                required
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category *
              </label>
              <div className="space-y-2">
                <select
                  value={formData.category_id}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      category_id: e.target.value, 
                      category: cat?.name || '',
                      subcategory_id: '',
                      subcategory: ''
                    }));
                  }}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {!showNewCategory ? (
                  <Button type="button" onClick={() => setShowNewCategory(true)} variant="outline" size="sm" className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Create New Category
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleCreateCategory} size="sm">Add</Button>
                    <Button type="button" onClick={() => setShowNewCategory(false)} variant="outline" size="sm">Cancel</Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Subcategory
              </label>
              <div className="space-y-2">
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => {
                    const sub = subcategories.find(s => s.id === e.target.value);
                    setFormData(prev => ({ ...prev, subcategory_id: e.target.value, subcategory: sub?.name || '' }));
                  }}
                  disabled={!formData.category_id}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">Select Subcategory (Optional)</option>
                  {subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
                {formData.category_id && !showNewSubcategory ? (
                  <Button type="button" onClick={() => setShowNewSubcategory(true)} variant="outline" size="sm" className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Create New Subcategory
                  </Button>
                ) : showNewSubcategory ? (
                  <div className="flex gap-2">
                    <Input
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      placeholder="New subcategory name"
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleCreateSubcategory} size="sm">Add</Button>
                    <Button type="button" onClick={() => setShowNewSubcategory(false)} variant="outline" size="sm">Cancel</Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Difficulty Level
              </label>
              <div className="space-y-2">
                <select
                  value={formData.difficulty_id}
                  onChange={(e) => {
                    const diff = difficulties.find(d => d.id === e.target.value);
                    setFormData(prev => ({ ...prev, difficulty_id: e.target.value, difficulty: diff?.name || '' }));
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Difficulty (Optional)</option>
                  {difficulties.map(diff => (
                    <option key={diff.id} value={diff.id}>{diff.name}</option>
                  ))}
                </select>
                {!showNewDifficulty ? (
                  <Button type="button" onClick={() => setShowNewDifficulty(true)} variant="outline" size="sm" className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Create New Difficulty Level
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newDifficultyName}
                      onChange={(e) => setNewDifficultyName(e.target.value)}
                      placeholder="e.g., Tier I, Tier II"
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleCreateDifficulty} size="sm">Add</Button>
                    <Button type="button" onClick={() => setShowNewDifficulty(false)} variant="outline" size="sm">Cancel</Button>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Exam URL Slug
              </label>
              <Input
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="Leave empty to auto-generate from title"
              />
              {generatedUrl && (
                <p className="text-xs text-muted-foreground mt-2">
                  URL Preview: <span className="font-mono text-primary">{generatedUrl}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Duration (minutes) *
              </label>
              <Input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Total Questions *
              </label>
              <Input
                type="number"
                name="total_questions"
                value={formData.total_questions}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Total Marks *
              </label>
              <Input
                type="number"
                name="total_marks"
                value={formData.total_marks}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Pass Percentage *
              </label>
              <Input
                type="number"
                name="pass_percentage"
                value={formData.pass_percentage}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start Date *
              </label>
              <Input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                End Date *
              </label>
              <Input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">Pricing & Marking</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_free"
                checked={formData.is_free}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border"
              />
              <label className="text-sm font-medium text-foreground">
                Free Exam
              </label>
            </div>

            {!formData.is_free && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price (₹)
                </label>
                <Input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="negative_marking"
                checked={formData.negative_marking}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border"
              />
              <label className="text-sm font-medium text-foreground">
                Negative Marking
              </label>
            </div>

            {formData.negative_marking && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Negative Mark Value
                </label>
                <Input
                  type="number"
                  name="negative_mark_value"
                  value={formData.negative_mark_value}
                  onChange={handleChange}
                  min="0"
                  step="0.25"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border"
              />
              <label className="text-sm font-medium text-foreground">
                Publish exam (visible to users)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="allow_anytime"
                checked={formData.allow_anytime}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border"
              />
              <label className="text-sm font-medium text-foreground">
                Allow attempts anytime (ignore schedule window)
              </label>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">Media Files</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Exam Logo
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {logoPreview ? (
                  <div className="space-y-2">
                    <img src={logoPreview} alt="Logo preview" className="h-32 w-32 object-contain mx-auto" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview('');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Click to upload logo</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 500KB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Exam Thumbnail
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {thumbnailPreview ? (
                  <div className="space-y-2">
                    <img src={thumbnailPreview} alt="Thumbnail preview" className="h-32 w-full object-cover mx-auto rounded" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setThumbnailFile(null);
                        setThumbnailPreview('');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Click to upload thumbnail</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 1MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'thumbnail')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">Syllabus</h2>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={syllabusInput}
                onChange={(e) => setSyllabusInput(e.target.value)}
                placeholder="Add syllabus topic..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSyllabusItem();
                  }
                }}
              />
              <Button type="button" onClick={addSyllabusItem} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.syllabus.length > 0 && (
              <div className="space-y-2">
                {formData.syllabus.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">{item}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSyllabusItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">Sections & Questions</h2>
          <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
            <p className="text-muted-foreground mb-4">
              To add or edit sections and questions for this exam, please use the exam creation workflow.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              The current edit page focuses on basic exam metadata. Section and question management requires the full builder interface available during exam creation.
            </p>
            <Link href="/admin/exams/create">
              <Button variant="outline">
                Go to Create Exam Page
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/exams">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-secondary hover:bg-secondary/90">
            {saving ? 'Updating...' : 'Update Exam'}
          </Button>
        </div>
      </form>
    </div>
  );
}
