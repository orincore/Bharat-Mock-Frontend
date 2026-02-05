  "use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, Plus, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, FileText, CheckCircle2, Clock3, FileQuestion, Save, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { graphqlExamService, GraphQLExamSection } from '@/lib/services/graphqlExamService';
import { taxonomyService, Category, Subcategory, Difficulty } from '@/lib/api/taxonomyService';
import { CSVImportDialog } from '@/components/admin/CSVImportDialog';
import { ParsedSection } from '@/lib/utils/csvParser';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useAutosave } from '@/hooks/useAutosave';
import { ToastNotification } from '@/components/ui/toast-notification';
import { InlineRichTextEditor } from '@/components/PageEditor/BlockEditor';
import { adminService } from '@/lib/api/adminService';

interface Option {
  id: string;
  option_text: string;
  option_text_hi?: string;
  is_correct: boolean;
  option_order: number;
  image?: File | null;
  imagePreview?: string;
  requires_image?: boolean;
  image_url?: string | null;
}

interface Question {
  id: string;
  type: 'single' | 'multiple' | 'truefalse' | 'numerical';
  text: string;
  text_hi?: string;
  marks: number;
  negative_marks: number;
  explanation?: string;
  explanation_hi?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string | null;
  image?: File | null;
  imagePreview?: string;
  requires_image?: boolean;
  question_order?: number | null;
  question_number?: number | null;
  options: Option[];
}

interface Section {
  id: string;
  name: string;
  name_hi?: string;
  language: 'en' | 'hi';
  total_questions: number;
  marks_per_question: number;
  duration: number;
  section_order: number;
  questions: Question[];
  expanded: boolean;
}

type ApiSection = {
  id: string;
  name: string;
  name_hi?: string | null;
  total_questions: number;
  marks_per_question: number;
  duration?: number | null;
  section_order: number;
  questions: ApiQuestion[];
};

type ApiQuestion = {
  id: string;
  type: string;
  text: string;
  text_hi?: string | null;
  marks: number;
  negative_marks: number;
  explanation?: string | null;
  explanation_hi?: string | null;
  difficulty: string;
  image_url?: string | null;
  question_order?: number | null;
  question_number?: number | null;
  options: ApiOption[];
};

type ApiOption = {
  id: string;
  option_text: string;
};

export default function ExamFormPage() {
  const router = useRouter();
  const params = useParams();
  const routeExamId = params?.id === 'new' ? null : (params?.id as string | null);
  const [persistedExamId, setPersistedExamId] = useState<string | null>(routeExamId);
  const isEditMode = !!persistedExamId;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
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
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed' | 'anytime',
    start_date: '',
    end_date: '',
    pass_percentage: 33,
    is_free: true,
    price: 0,
    negative_marking: false,
    negative_mark_value: 0,
    is_published: false,
    allow_anytime: false,
    exam_type: 'mock_test' as 'past_paper' | 'mock_test' | 'short_quiz',
    show_in_mock_tests: false,
    syllabus: [] as string[]
  });

  const [sections, setSections] = useState<Section[]>([]);
  const hasUnsavedChangesRef = useRef(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const sectionsForDisplay = useMemo(
    () => sections.filter(section => section.language === selectedLanguage),
    [sections, selectedLanguage]
  );

  const examId = persistedExamId;
  const [creatingDraft, setCreatingDraft] = useState(false);

  const derivedTotals = useMemo(() => {
    const englishSections = sections.filter(section => section.language === 'en');
    const totalQuestions = englishSections.reduce((sum, section) => sum + section.questions.length, 0);
    const totalMarks = englishSections.reduce(
      (sum, section) => sum + section.questions.reduce((qSum, question) => qSum + (question.marks || 0), 0),
      0
    );
    return { totalQuestions, totalMarks };
  }, [sections]);

  useEffect(() => {
    setFormData(prev => {
      if (prev.total_questions === derivedTotals.totalQuestions && prev.total_marks === derivedTotals.totalMarks) {
        return prev;
      }
      return {
        ...prev,
        total_questions: derivedTotals.totalQuestions,
        total_marks: derivedTotals.totalMarks
      };
    });
  }, [derivedTotals.totalMarks, derivedTotals.totalQuestions]);

  useEffect(() => {
    if (!formData.negative_marking && formData.negative_mark_value !== 0) {
      setFormData(prev => ({ ...prev, negative_mark_value: 0 }));
    }
  }, [formData.negative_marking, formData.negative_mark_value]);

  const [syllabusInput, setSyllabusInput] = useState('');
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
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, completed: 0, current: '' });
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string[]}>({});
  const [computedErrors, setComputedErrors] = useState<{[key: string]: string[]}>({});
  const [draftSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'loading' | 'warning'>('success');
  const [questionSaveStatus, setQuestionSaveStatus] = useState<Record<string, boolean>>({});
  const questionStatusTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const markQuestionSaved = useCallback((questionId: string) => {
    if (!questionId) return;
    setQuestionSaveStatus(prev => ({ ...prev, [questionId]: true }));

    if (questionStatusTimeouts.current[questionId]) {
      clearTimeout(questionStatusTimeouts.current[questionId]);
    }

    questionStatusTimeouts.current[questionId] = setTimeout(() => {
      setQuestionSaveStatus(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      delete questionStatusTimeouts.current[questionId];
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(questionStatusTimeouts.current).forEach(timeout => clearTimeout(timeout));
      questionStatusTimeouts.current = {};
    };
  }, []);

  const extractQuestionIdFromFieldPath = useCallback((fieldPath: string) => {
    if (!fieldPath) return null;
    const parts = fieldPath.split('.');
    const questionIndex = parts.indexOf('questions');
    if (questionIndex !== -1 && parts.length > questionIndex + 1) {
      return parts[questionIndex + 1];
    }
    return null;
  }, []);

  // Initialize autosave hook with enhanced status
  const draftKey = persistedExamId ? `exam-${persistedExamId}` : 'exam-new';
  const { saveDraftField, clearDraft, loadDraftFields, status: autosaveStatus, lastSaved } = useAutosave({
    examId: persistedExamId,
    draftKey,
    debounceMs: 1500,
    onSave: (fieldPath) => {
      console.log(`Auto-saved: ${fieldPath}`);
      const isBasicInfoField = fieldPath?.startsWith('formData');
      if (isBasicInfoField) {
        setToastMessage('Basic Information updated locally. Click “Update Exam/Publish Exam” to persist these details.');
        setToastType('warning');
      } else {
        setToastMessage(`Last draft saved on ${new Date().toLocaleString()}`);
        setToastType('success');
      }
      setShowToast(true);
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;

      const questionId = extractQuestionIdFromFieldPath(fieldPath);
      if (questionId) {
        markQuestionSaved(questionId);
      }
    },
    onError: (error) => {
      console.error('Autosave error:', error);
      setToastMessage('Failed to save draft');
      setToastType('error');
      setShowToast(true);
    }
  });

  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const isTempQuestionId = (id: string) => id.startsWith('question-');
  const isTempOptionId = (id: string) => id.startsWith('opt-');

  const ignoreImageRequirement = (sectionId: string, questionId: string, optionId?: string) => {
    setSections(prevSections => prevSections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        questions: section.questions.map(question => {
          if (question.id !== questionId) return question;
          if (optionId) {
            return {
              ...question,
              options: question.options.map(option =>
                option.id === optionId ? { ...option, requires_image: false } : option
              )
            };
          } else {
            return { ...question, requires_image: false };
          }
        })
      };
    }));
    setHasUnsavedChanges(true);
  };

  const totals = useMemo(() => {
    const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
    const totalMarks = sections.reduce(
      (sum, section) => sum + section.questions.reduce((qSum, question) => qSum + (question.marks || 0), 0),
      0
    );
    return { totalQuestions, totalMarks };
  }, [sections]);

  useEffect(() => {
    fetchTaxonomies();
    if (isEditMode && examId) {
      loadExamData();
    } else {
      // For new exams, load any existing draft data
      loadDraftData();
    }
  }, []);

  const serializeSectionsForDraft = useCallback(() => {
    return sections.map((section, sectionIdx) => ({
      id: section.id,
      name: section.name,
      name_hi: section.name_hi || null,
      total_questions: section.questions.length,
      marks_per_question: section.marks_per_question,
      duration: section.duration || null,
      section_order: section.section_order ?? sectionIdx + 1,
      questions: section.questions.map((question, questionIdx) => ({
        id: question.id,
        type: question.type,
        text: question.text,
        text_hi: question.text_hi || null,
        marks: question.marks,
        negative_marks: question.negative_marks,
        explanation: question.explanation || null,
        explanation_hi: question.explanation_hi || null,
        difficulty: question.difficulty,
        question_order: question.question_order ?? questionIdx + 1,
        question_number: question.question_number ?? questionIdx + 1,
        options: question.options.map((option, optionIdx) => ({
          id: option.id,
          option_text: option.option_text,
          option_text_hi: option.option_text_hi || null,
          is_correct: option.is_correct,
          option_order: option.option_order ?? optionIdx + 1
        }))
      }))
    }));
  }, [sections]);

  const getMissingBasicFields = useCallback(() => {
    const missing: string[] = [];
    if (!formData.title.trim()) missing.push('title');
    if (!formData.description.trim()) missing.push('description');
    if (!formData.category_id) missing.push('category');
    if (formData.duration <= 0) missing.push('duration');
    if (!formData.allow_anytime) {
      if (!formData.status) missing.push('status');
      if (!formData.start_date) missing.push('start date');
      if (!formData.end_date) missing.push('end date');
    }
    return missing;
  }, [formData]);

  const basicsComplete = useMemo(() => getMissingBasicFields().length === 0, [getMissingBasicFields]);

  const ensureDraftExam = useCallback(async () => {
    if (creatingDraft || persistedExamId) return;
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) return;

    const missingBasics = getMissingBasicFields();
    if (missingBasics.length > 0) {
      setToastMessage(`Add required basics (${missingBasics.join(', ')}) before we auto-save a draft.`);
      setToastType('warning');
      setShowToast(true);
      return;
    }

    const normalizeDate = (value?: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    };

    try {
      setCreatingDraft(true);
      const examPayload = {
        ...formData,
        title: trimmedTitle,
        is_published: false,
        status: formData.allow_anytime ? 'anytime' : formData.status,
        start_date: formData.allow_anytime ? null : normalizeDate(formData.start_date),
        end_date: formData.allow_anytime ? null : normalizeDate(formData.end_date)
      };

      const sanitizedSections = serializeSectionsForDraft();
      const draftResponse = await adminService.saveDraftExam(examPayload, sanitizedSections);
      const newExamId = draftResponse?.exam?.id;
      if (newExamId) {
        setPersistedExamId(newExamId);
        if (draftResponse.exam?.slug && !formData.slug) {
          setFormData(prev => ({ ...prev, slug: draftResponse.exam.slug }));
        }
        setToastMessage('Draft created automatically. Continue editing.');
        setToastType('success');
        setShowToast(true);
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
      }
    } catch (error) {
      console.error('Failed to auto-create exam draft:', error);
      setToastMessage('Failed to auto-create exam draft');
      setToastType('error');
      setShowToast(true);
    } finally {
      setCreatingDraft(false);
    }
  }, [creatingDraft, persistedExamId, formData, getMissingBasicFields, serializeSectionsForDraft]);

  useEffect(() => {
    if (!persistedExamId && basicsComplete) {
      ensureDraftExam();
    }
  }, [basicsComplete, ensureDraftExam, persistedExamId]);

  const loadDraftData = async () => {
    try {
      const draftFields = await loadDraftFields();
      if (draftFields.length > 0) {
        // Apply draft data to form state
        draftFields.forEach(field => {
          if (field.field_path === 'formData') {
            setFormData(prev => ({ ...prev, ...field.payload }));
          } else if (field.field_path === 'sections') {
            setSections(field.payload);
          }
        });
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Failed to load draft data:', error);
    }
  };

  const loadExamData = async () => {
    if (!examId) return;
    setInitialLoading(true);
    try {
      const { exam, sections: structure } = await graphqlExamService.fetchExamDetail(examId);

      if (exam) {
        setFormData({
          title: exam.title || '',
          description: exam.description || '',
          duration: exam.duration || 180,
          total_marks: exam.total_marks || 100,
          total_questions: exam.total_questions || 50,
          category: exam.category || '',
          category_id: exam.category_id || '',
          subcategory: exam.subcategory || '',
          subcategory_id: exam.subcategory_id || '',
          difficulty: exam.difficulty || '',
          difficulty_id: exam.difficulty_id || '',
          slug: exam.slug || '',
          status: (exam.status || 'upcoming') as 'upcoming' | 'ongoing' | 'completed' | 'anytime',
          start_date: exam.start_date ? new Date(exam.start_date).toISOString().slice(0, 10) : '',
          end_date: exam.end_date ? new Date(exam.end_date).toISOString().slice(0, 10) : '',
          pass_percentage: exam.pass_percentage || 33,
          is_free: exam.is_free ?? true,
          price: exam.price || 0,
          negative_marking: exam.negative_marking ?? false,
          negative_mark_value: exam.negative_mark_value || 0,
          is_published: exam.is_published ?? false,
          allow_anytime: exam.allow_anytime ?? false,
          exam_type: (exam.exam_type || 'mock_test') as 'past_paper' | 'mock_test' | 'short_quiz',
          show_in_mock_tests: exam.show_in_mock_tests ?? false,
          syllabus: exam.syllabus || []
        });

        if (exam.logo_url) setLogoPreview(exam.logo_url);
        if (exam.thumbnail_url) setThumbnailPreview(exam.thumbnail_url);
      }

      const apiSections = (structure || []) as GraphQLExamSection[];
      const sortedApiSections = [...apiSections].sort((a, b) => {
        const orderA = typeof a.section_order === 'number' ? a.section_order : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.section_order === 'number' ? b.section_order : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });

      const loadedSections: Section[] = sortedApiSections.map(section => {
        const hasHindi = Boolean(section.name_hi);
        const sortedQuestions = [...(section.questions || [])].sort((a, b) => {
          const orderA = typeof a.question_number === 'number' ? a.question_number
            : typeof a.question_order === 'number' ? a.question_order
            : Number.MAX_SAFE_INTEGER;
          const orderB = typeof b.question_number === 'number' ? b.question_number
            : typeof b.question_order === 'number' ? b.question_order
            : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        return {
          id: section.id,
          name: section.name,
          name_hi: section.name_hi || '',
          language: hasHindi ? 'hi' : 'en',
          total_questions: section.total_questions,
          marks_per_question: section.marks_per_question,
          duration: section.duration || 0,
          section_order: section.section_order,
          expanded: false,
          questions: sortedQuestions.map(q => {
            const sortedOptions = [...(q.options || [])].sort((a, b) => {
              const orderA = typeof a.option_order === 'number' ? a.option_order : Number.MAX_SAFE_INTEGER;
              const orderB = typeof b.option_order === 'number' ? b.option_order : Number.MAX_SAFE_INTEGER;
              return orderA - orderB;
            });
            return {
              id: q.id,
              type: q.type as 'single' | 'multiple' | 'truefalse' | 'numerical',
              text: q.text,
              text_hi: q.text_hi || '',
              marks: q.marks,
              negative_marks: q.negative_marks,
              explanation: q.explanation || '',
              explanation_hi: q.explanation_hi || '',
              difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
              image_url: q.image_url || null,
              imagePreview: q.image_url || undefined,
              question_order: q.question_order,
              question_number: q.question_number,
              options: sortedOptions.map(opt => ({
                id: opt.id,
                option_text: opt.option_text,
                option_text_hi: opt.option_text_hi || '',
                is_correct: opt.is_correct,
                option_order: opt.option_order,
                image_url: opt.image_url || null,
                imagePreview: opt.image_url || undefined
              }))
            };
          })
        };
      });

      setSections(loadedSections);
      
      // After loading exam data, check for any draft changes
      const draftFields = await loadDraftFields();
      if (draftFields.length > 0) {
        // Apply draft data to form state
        draftFields.forEach(field => {
          if (field.field_path === 'formData') {
            setFormData(prev => ({ ...prev, ...field.payload }));
          } else if (field.field_path === 'sections') {
            setSections(field.payload);
          }
        });
        setHasUnsavedChanges(true);
        hasUnsavedChangesRef.current = true;
      } else {
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
      }
    } catch (error) {
      console.error('Failed to load exam data:', error);
      alert('Failed to load exam data');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleQuestionImagePaste = (sectionId: string, questionId: string, file: File) => {
    if (!questionId) {
      setToastMessage('Question ID missing. Please try again.');
      setToastType('error');
      setShowToast(true);
      return;
    }
    handleQuestionImageChange(sectionId, questionId, file);
  };

  const handleOptionImagePaste = (sectionId: string, questionId: string, optionId: string, file: File) => {
    if (!optionId) {
      setToastMessage('Option ID missing. Please try again.');
      setToastType('error');
      setShowToast(true);
      return;
    }
    handleOptionImageChange(sectionId, questionId, optionId, file);
  };

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

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    };

    const handlePopState = () => {
      if (!hasUnsavedChangesRef.current) return;
      const confirmLeave = window.confirm('You have unsaved changes. Do you really want to leave this page?');
      if (!confirmLeave) {
        window.history.pushState(null, '', window.location.href);
      } else {
        setHasUnsavedChanges(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const isClientGeneratedId = (id: string | null | undefined) => {
    if (!id) return true;
    return id.startsWith('question-') || id.startsWith('opt-') || id.startsWith('temp-');
  };

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    setHasUnsavedChanges(true);

    if (type === 'checkbox') {
      const inputTarget = event.target as HTMLInputElement;
      const checked = inputTarget.checked;
      if (name === 'allow_anytime') {
        const newData = {
          allow_anytime: checked,
          status: checked
            ? ('anytime' as const)
            : formData.status === 'anytime'
              ? ('upcoming' as const)
              : (formData.status || 'upcoming' as const),
          start_date: checked ? '' : formData.start_date,
          end_date: checked ? '' : formData.end_date
        };
        setFormData(prev => ({ ...prev, ...newData }));
        saveDraftField(`formData.${name}`, newData);
        return;
      }
      setFormData(prev => ({ ...prev, [name]: checked }));
      saveDraftField(`formData.${name}`, checked);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      saveDraftField(`formData.${name}`, value);
    }
  }, [formData, saveDraftField]);

  const handleTitleBlur = useCallback(() => {
    ensureDraftExam();
  }, [ensureDraftExam]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'thumbnail') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHasUnsavedChanges(true);

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
      setHasUnsavedChanges(true);
      setSyllabusInput('');
    }
  };

  const removeSyllabusItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      syllabus: prev.syllabus.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  const addSection = () => {
    const languageSections = sections.filter(section => section.language === selectedLanguage);
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name: `Section ${languageSections.length + 1}`,
      total_questions: 0,
      marks_per_question: 1,
      duration: 0,
      section_order: sections.length + 1,
      language: selectedLanguage,
      questions: [],
      expanded: true
    };
    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
  };

  const removeSection = (sectionId: string) => {
    const updatedSections = sections.filter(s => s.id !== sectionId);
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
  };

  const updateSection = (sectionId: string, field: keyof Section, value: any) => {
    const updatedSections = sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s);
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
  };

  const toggleSection = (sectionId: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, expanded: !s.expanded } : s));
    setHasUnsavedChanges(true);
  };

  const addQuestion = (sectionId: string) => {
    const newQuestion: Question = {
      id: `question-${Date.now()}`,
      type: 'single',
      text: '',
      marks: 1,
      negative_marks: 0,
      explanation: '',
      difficulty: 'medium',
      question_number: 0,
      options: [
        { id: `opt-1-${Date.now()}`, option_text: '', is_correct: false, option_order: 1 },
        { id: `opt-2-${Date.now()}`, option_text: '', is_correct: false, option_order: 2 },
        { id: `opt-3-${Date.now()}`, option_text: '', is_correct: false, option_order: 3 },
        { id: `opt-4-${Date.now()}`, option_text: '', is_correct: false, option_order: 4 }
      ]
    };
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        const nextQuestionNumber = (s.questions.length ? Math.max(...s.questions.map(q => q.question_number || 0)) : 0) + 1;
        return {
          ...s,
          questions: [...s.questions, { ...newQuestion, question_number: nextQuestionNumber }],
          total_questions: s.questions.length + 1
        };
      }
      return s;
    });
    setSections(updatedSections);
    saveDraftField('sections', updatedSections);
    const updatedSection = updatedSections.find(s => s.id === sectionId);
    if (updatedSection) {
      saveDraftField(`sections.${sectionId}.total_questions`, updatedSection.total_questions);
    }
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, questions: s.questions.filter(q => q.id !== questionId), total_questions: s.questions.length - 1 };
      }
      return s;
    });
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
    const updatedSection = updatedSections.find(s => s.id === sectionId);
    if (updatedSection) {
      saveDraftField(`sections.${sectionId}.total_questions`, updatedSection.total_questions);
    }
  };

  const updateQuestion = (sectionId: string, questionId: string, field: keyof Question, value: any) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q => q.id === questionId ? { ...q, [field]: value } : q)
        };
      }
      return s;
    });
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
  };

  const updateOption = (sectionId: string, questionId: string, optionId: string, field: keyof Option, value: any) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q => {
            if (q.id === questionId) {
              return {
                ...q,
                options: q.options.map(o => o.id === optionId ? { ...o, [field]: value } : o)
              };
            }
            return q;
          })
        };
      }
      return s;
    });
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
  };

  const setCorrectAnswer = (sectionId: string, questionId: string, optionId: string, questionType: string) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q => {
            if (q.id === questionId) {
              if (questionType === 'single' || questionType === 'truefalse') {
                return {
                  ...q,
                  options: q.options.map(opt => ({ ...opt, is_correct: opt.id === optionId }))
                };
              }
              return {
                ...q,
                options: q.options.map(opt =>
                  opt.id === optionId ? { ...opt, is_correct: !opt.is_correct } : opt
                )
              };
            }
            return q;
          })
        };
      }
      return s;
    });
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
  };

  const addOption = (sectionId: string, questionId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q => {
            if (q.id === questionId) {
              const newOption: Option = {
                id: `opt-${Date.now()}`,
                option_text: '',
                is_correct: false,
                option_order: q.options.length + 1
              };
              return { ...q, options: [...q.options, newOption] };
            }
            return q;
          })
        };
      }
      return s;
    });
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
  };

  const removeOption = (sectionId: string, questionId: string, optionId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q => {
            if (q.id === questionId) {
              return { ...q, options: q.options.filter(opt => opt.id !== optionId) };
            }
            return q;
          })
        };
      }
      return s;
    });
    setSections(updatedSections);
    setHasUnsavedChanges(true);
    saveDraftField('sections', updatedSections);
  };

  const handleQuestionImageChange = async (sectionId: string, questionId: string, file: File) => {
    if (!questionId) {
      setToastMessage('Question ID missing. Please try again.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    const isLocalOnly = isClientGeneratedId(questionId);

    if (isLocalOnly) {
      const previewUrl = URL.createObjectURL(file);
      const updatedSections = sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          questions: section.questions.map(question =>
            question.id === questionId
              ? { ...question, image: file, imagePreview: previewUrl }
              : question
          )
        };
      });

      setSections(updatedSections);
      saveDraftField('sections', updatedSections);
      setHasUnsavedChanges(true);
      setToastMessage('Image attached. It will upload once the question is saved.');
      setToastType('success');
      setShowToast(true);
      return;
    }

    try {
      setToastMessage('Uploading image...');
      setToastType('loading');
      setShowToast(true);

      const imageUrl = await graphqlExamService.uploadQuestionImage(questionId, file);

      if (imageUrl) {
        const updatedSections = sections.map(section => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            questions: section.questions.map(question =>
              question.id === questionId
                ? { ...question, image: null, image_url: imageUrl, imagePreview: imageUrl }
                : question
            )
          };
        });

        setSections(updatedSections);
        saveDraftField('sections', updatedSections);
        setHasUnsavedChanges(true);

        setToastMessage('Image uploaded successfully');
        setToastType('success');
        setShowToast(true);
      } else {
        throw new Error('Image upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      setToastMessage('Image upload failed');
      setToastType('error');
      setShowToast(true);
    }
  };

  const clearQuestionImage = (sectionId: string, questionId: string) => {
    setSections(prevSections => {
      const updatedSections = prevSections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          questions: section.questions.map(question =>
            question.id === questionId
              ? { ...question, image: null, image_url: null, imagePreview: undefined }
              : question
          )
        };
      });

      saveDraftField('sections', updatedSections);
      return updatedSections;
    });
    setHasUnsavedChanges(true);
  };

  const handleOptionImageChange = async (sectionId: string, questionId: string, optionId: string, file: File) => {
    if (!optionId) {
      setToastMessage('Option ID missing. Please try again.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    const isLocalOnly = isClientGeneratedId(optionId);

    if (isLocalOnly) {
      const previewUrl = URL.createObjectURL(file);
      const updatedSections = sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          questions: section.questions.map(question => {
            if (question.id !== questionId) return question;
            return {
              ...question,
              options: question.options.map(option =>
                option.id === optionId
                  ? { ...option, image: file, imagePreview: previewUrl }
                  : option
              )
            };
          })
        };
      });

      setSections(updatedSections);
      saveDraftField('sections', updatedSections);
      setHasUnsavedChanges(true);
      setToastMessage('Image attached. It will upload once the option is saved.');
      setToastType('success');
      setShowToast(true);
      return;
    }

    try {
      setToastMessage('Uploading option image...');
      setToastType('loading');
      setShowToast(true);

      const imageUrl = await graphqlExamService.uploadOptionImage(optionId, file);

      if (imageUrl) {
        // Update UI with the uploaded image URL
        const updatedSections = sections.map(section => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            questions: section.questions.map(question => {
              if (question.id !== questionId) return question;
              return {
                ...question,
                options: question.options.map(option =>
                  option.id === optionId ? { ...option, image_url: imageUrl, imagePreview: imageUrl } : option
                )
              };
            })
          };
        });
        
        setSections(updatedSections);
        saveDraftField('sections', updatedSections);
        
        setToastMessage('Option image uploaded successfully');
        setToastType('success');
        setShowToast(true);
      } else {
        throw new Error('Option image upload failed');
      }
    } catch (error) {
      console.error('Option image upload error:', error);
      setToastMessage('Option image upload failed');
      setToastType('error');
      setShowToast(true);
    }
  };

  const clearOptionImage = (sectionId: string, questionId: string, optionId: string) => {
    setSections(prevSections => {
      const updatedSections = prevSections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          questions: section.questions.map(question => {
            if (question.id !== questionId) return question;
            return {
              ...question,
              options: question.options.map(option =>
                option.id === optionId
                  ? { ...option, image: null, image_url: null, imagePreview: undefined }
                  : option
              )
            };
          })
        };
      });

      saveDraftField('sections', updatedSections);
      return updatedSections;
    });
    setHasUnsavedChanges(true);
  };

  const handleCSVImport = (parsedSections: ParsedSection[], language: 'en' | 'hi' = 'en') => {
    setSections(prevSections => {
      const maxSectionOrder = prevSections.reduce((max, section) => Math.max(max, section.section_order), 0);

      const convertedSections: Section[] = parsedSections.map((parsedSection, idx) => {
        const questions: Question[] = parsedSection.questions.map((parsedQuestion, qIdx) => {
          const options: Option[] = parsedQuestion.options.map((parsedOption, oIdx) => ({
            id: generateId(`opt-${idx}-${qIdx}-${oIdx}`),
            option_text: language === 'en' ? parsedOption.option_text : '',
            option_text_hi: language === 'hi' ? parsedOption.option_text : undefined,
            is_correct: parsedOption.is_correct,
            option_order: parsedOption.option_order,
            requires_image: parsedOption.requires_image
          }));

          return {
            id: generateId(`question-${idx}-${qIdx}`),
            type: parsedQuestion.type,
            text: language === 'en' ? parsedQuestion.text : '',
            text_hi: language === 'hi' ? parsedQuestion.text : undefined,
            marks: parsedQuestion.marks,
            negative_marks: parsedQuestion.negative_marks,
            explanation: language === 'en' ? parsedQuestion.explanation : '',
            explanation_hi: language === 'hi' ? parsedQuestion.explanation : undefined,
            difficulty: parsedQuestion.difficulty,
            options,
            requires_image: parsedQuestion.requires_image
          };
        });

        return {
          id: generateId(`section-${idx}`),
          name: language === 'en' ? parsedSection.name : '',
          name_hi: language === 'hi' ? parsedSection.name : undefined,
          language,
          total_questions: parsedSection.questions.length,
          marks_per_question: parsedSection.marks_per_question,
          duration: parsedSection.duration,
          section_order: maxSectionOrder + idx + 1,
          questions,
          expanded: true
        };
      });

      return [...prevSections, ...convertedSections];
    });

    setSelectedLanguage(language);
    setShowCSVImport(false);
  };

  const hasPendingImageRequirements = useMemo(() => {
    return sections.some(section =>
      section.questions.some(question =>
        (question.requires_image && !question.image && !question.imagePreview) ||
        question.options.some(option => option.requires_image && !option.image && !option.imagePreview)
      )
    );
  }, [sections]);

  const pendingRequirements = useMemo(() => {
    const requirements: string[] = [];
    const errors: {[key: string]: string[]} = {};
    const needsSchedule = !formData.allow_anytime;
    const scheduleComplete = needsSchedule ? Boolean(formData.start_date && formData.end_date && formData.status) : true;
    
    if (!formData.title.trim()) requirements.push('❌ Exam title is required');
    if (!formData.description.trim()) requirements.push('❌ Exam description is required');
    if (!formData.category_id) requirements.push('❌ Category must be selected');
    if (formData.duration <= 0) requirements.push('❌ Duration must be greater than 0 minutes');
    if (!scheduleComplete) requirements.push('❌ Start date, end date, and status are required (or enable "Allow anytime")');

    const MAX_ERRORS_TO_SHOW = 50;
    let totalErrors = 0;

    const hasQuestionContent = (question: Question, language: 'en' | 'hi') => {
      const textValue = language === 'hi' ? question.text_hi : question.text;
      const explanationValue = language === 'hi' ? question.explanation_hi : question.explanation;
      return Boolean(textValue?.trim()) || Boolean(explanationValue?.trim()) || Boolean(question.image || question.imagePreview || question.image_url);
    };

    const hasOptionContent = (option: Option, language: 'en' | 'hi') => {
      const textValue = language === 'hi' ? option.option_text_hi : option.option_text;
      return Boolean(textValue?.trim()) || Boolean(option.image || option.imagePreview || option.image_url);
    };

    const sectionNameForLanguage = (section: Section, language: 'en' | 'hi') => {
      if (language === 'hi') {
        return section.name_hi || '';
      }
      return section.name;
    };

    const languageConfigs: Array<{ language: 'en' | 'hi'; label: string; requireAtLeastOne: boolean }> = [
      { language: 'en', label: 'English', requireAtLeastOne: true },
      { language: 'hi', label: 'Hindi', requireAtLeastOne: false }
    ];

    for (const config of languageConfigs) {
      const languageSections = sections.filter(section => section.language === config.language);

      if (config.requireAtLeastOne && languageSections.length === 0) {
        requirements.push(`❌ Add at least one ${config.label} section with questions`);
        continue;
      }

      if (languageSections.length === 0) {
        continue;
      }

      for (let sIdx = 0; sIdx < languageSections.length; sIdx++) {
        const section = languageSections[sIdx];
        const sectionKey = `section-${section.id}`;
        const sectionLabel = `${config.label} Section ${sIdx + 1}`;
        const sectionName = sectionNameForLanguage(section, config.language);

        if (!sectionName.trim()) {
          if (totalErrors < MAX_ERRORS_TO_SHOW) {
            requirements.push(`❌ ${sectionLabel}: Section name (${config.label}) is required`);
          }
          if (!errors[sectionKey]) errors[sectionKey] = [];
          errors[sectionKey].push(`Section name (${config.label}) is required`);
          totalErrors++;
        }

        if (section.questions.length === 0) {
          if (totalErrors < MAX_ERRORS_TO_SHOW) {
            requirements.push(`❌ ${sectionLabel} (${sectionName || 'Unnamed'}): Must have at least one question`);
          }
          if (!errors[sectionKey]) errors[sectionKey] = [];
          errors[sectionKey].push('Must have at least one question');
          totalErrors++;
        }

        for (let qIdx = 0; qIdx < section.questions.length; qIdx++) {
          const question = section.questions[qIdx];
          const questionKey = `question-${section.id}-${question.id}`;
          const questionLabel = `${sectionLabel}, Question ${qIdx + 1}`;
          let hasError = false;

          if (!hasQuestionContent(question, config.language)) {
            if (totalErrors < MAX_ERRORS_TO_SHOW) {
              requirements.push(`❌ ${questionLabel}: Provide ${config.label} text or attach an image for the question`);
            }
            if (!errors[questionKey]) errors[questionKey] = [];
            errors[questionKey].push(`Provide ${config.label} text or attach an image for the question`);
            hasError = true;
          }

          if (question.marks <= 0) {
            if (totalErrors < MAX_ERRORS_TO_SHOW) {
              requirements.push(`❌ ${questionLabel}: Marks must be greater than 0`);
            }
            if (!errors[questionKey]) errors[questionKey] = [];
            errors[questionKey].push('Marks must be greater than 0');
            hasError = true;
          }

          if (question.type !== 'numerical') {
            if (question.options.length < 2) {
              if (totalErrors < MAX_ERRORS_TO_SHOW) {
                requirements.push(`❌ ${questionLabel}: Must have at least 2 answer options`);
              }
              if (!errors[questionKey]) errors[questionKey] = [];
              errors[questionKey].push('Must have at least 2 answer options');
              hasError = true;
            }

            let missingContentCount = 0;
            for (const opt of question.options) {
              if (!hasOptionContent(opt, config.language)) missingContentCount++;
            }

            if (missingContentCount > 0) {
              if (totalErrors < MAX_ERRORS_TO_SHOW) {
                requirements.push(`❌ ${questionLabel}: ${missingContentCount} option(s) need ${config.label} text or an image`);
              }
              if (!errors[questionKey]) errors[questionKey] = [];
              errors[questionKey].push(`${missingContentCount} option(s) need ${config.label} text or an image`);
              hasError = true;
            }

            let correctCount = 0;
            for (const opt of question.options) {
              if (opt.is_correct) correctCount++;
            }

            if (correctCount === 0) {
              if (totalErrors < MAX_ERRORS_TO_SHOW) {
                requirements.push(`❌ ${questionLabel}: Must select at least one correct answer`);
              }
              if (!errors[questionKey]) errors[questionKey] = [];
              errors[questionKey].push('Must select at least one correct answer');
              hasError = true;
            }
          }

          if (question.requires_image && !question.image && !question.imagePreview) {
            if (totalErrors < MAX_ERRORS_TO_SHOW) {
              requirements.push(`❌ ${questionLabel}: Image upload required (imported from CSV)`);
            }
            if (!errors[questionKey]) errors[questionKey] = [];
            errors[questionKey].push('Image upload required (or click "Ignore Image")');
            hasError = true;
          }

          for (let oIdx = 0; oIdx < question.options.length; oIdx++) {
            const option = question.options[oIdx];
            if (option.requires_image && !option.image && !option.imagePreview) {
              if (totalErrors < MAX_ERRORS_TO_SHOW) {
                requirements.push(`❌ ${questionLabel}, Option ${String.fromCharCode(65 + oIdx)}: Image upload required (imported from CSV)`);
              }
              if (!errors[questionKey]) errors[questionKey] = [];
              errors[questionKey].push(`Option ${String.fromCharCode(65 + oIdx)}: Image required (or click "Ignore Image")`);
              hasError = true;
            }
          }

          if (hasError) totalErrors++;
        }
      }
    }

    if (totalErrors > MAX_ERRORS_TO_SHOW) {
      requirements.push(`❌ ... and ${totalErrors - MAX_ERRORS_TO_SHOW} more errors`);
    }

    setComputedErrors(errors);
    return requirements;
  }, [formData, sections]);

  useEffect(() => {
    setValidationErrors(computedErrors);
  }, [computedErrors]);

  const canSubmit = pendingRequirements.length === 0 && !loading;
  const canSaveDraft = false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setUploadProgress({ total: 3, completed: 0, current: 'Preparing exam data...' });

    try {
      const normalizeDate = (value: string) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      };

      const payload: any = {
        ...formData,
        start_date: formData.allow_anytime ? null : normalizeDate(formData.start_date),
        end_date: formData.allow_anytime ? null : normalizeDate(formData.end_date)
      };
      if (payload.exam_type !== 'past_paper') {
        payload.show_in_mock_tests = false;
      }
      if (payload.allow_anytime) {
        delete payload.status;
        delete payload.start_date;
        delete payload.end_date;
      }

      setUploadProgress({ total: 3, completed: 1, current: 'Saving exam via GraphQL...' });

      if (logoFile || thumbnailFile) {
        setUploadProgress(prev => ({ ...prev, completed: 2, current: 'Uploading media files...' }));
      }

      // Use GraphQL for instant updates instead of REST
      const sectionsPayload = sections.map((section, sectionIdx) => ({
        id: section.id,
        name: section.name,
        name_hi: section.name_hi || null,
        total_questions: section.questions.length,
        marks_per_question: section.marks_per_question,
        duration: section.duration || null,
        section_order: section.section_order ?? sectionIdx + 1,
        questions: section.questions.map((question, questionIdx) => ({
          id: question.id,
          type: question.type,
          text: question.text,
          text_hi: question.text_hi || null,
          marks: question.marks,
          negative_marks: question.negative_marks,
          explanation: question.explanation || null,
          explanation_hi: question.explanation_hi || null,
          difficulty: question.difficulty,
          image_url: question.image_url || null,
          question_order: question.question_order ?? questionIdx + 1,
          question_number: question.question_number ?? questionIdx + 1,
          options: question.options.map((option, optionIdx) => ({
            id: option.id,
            option_text: option.option_text,
            option_text_hi: option.option_text_hi || null,
            is_correct: option.is_correct,
            option_order: option.option_order ?? optionIdx + 1,
            image_url: option.image_url || null
          }))
        }))
      }));

      if (isEditMode && examId) {
        await graphqlExamService.updateExam({
          id: examId,
          input: payload,
          sections: sectionsPayload,
          logo: logoFile || undefined,
          thumbnail: thumbnailFile || undefined
        });
        
        // Clear draft after successful update
        await clearDraft();
        
        setUploadProgress({ total: 3, completed: 3, current: 'Exam updated successfully!' });
        setToastMessage('Exam updated successfully!');
        setToastType('success');
        setShowToast(true);
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
      } else {
        const result = await graphqlExamService.createExam({
          input: payload,
          sections: sectionsPayload,
          logo: logoFile || undefined,
          thumbnail: thumbnailFile || undefined
        });
        setUploadProgress({ total: 3, completed: 3, current: 'Exam created successfully!' });
        alert('Exam created successfully with all sections and questions!');
      }

      setLogoFile(null);
      setThumbnailFile(null);
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      router.push('/admin/exams');
    } catch (error: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} exam:`, error);
      alert(error.message || `Failed to ${isEditMode ? 'update' : 'create'} exam. Please try again.`);
    } finally {
      setLoading(false);
      setUploadProgress({ total: 0, completed: 0, current: '' });
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {showCSVImport && (
        <CSVImportDialog
          onImport={handleCSVImport}
          onClose={() => setShowCSVImport(false)}
        />
      )}

      <div className="mb-8">
        <Link href="/admin/exams" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Exams
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              {isEditMode ? 'Edit Exam' : 'Create New Exam'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update exam details and content' : 'Fill in the details to create a new exam'}
            </p>
            {autosaveStatus !== 'idle' && (
              <div className="text-xs mt-1 flex items-center gap-1">
                {autosaveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    <span className="text-blue-600">Saving...</span>
                  </>
                )}
                {autosaveStatus === 'saved' && (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      Saved as draft {lastSaved && `at ${lastSaved.toLocaleTimeString()}`}
                    </span>
                  </>
                )}
                {autosaveStatus === 'error' && (
                  <>
                    <XCircle className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">Save failed</span>
                  </>
                )}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Import from CSV
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {loading && uploadProgress.total > 0 && (
          <div className="bg-muted/60 border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Uploading exam content...</span>
              <span className="text-muted-foreground">
                {uploadProgress.completed}/{uploadProgress.total}
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((uploadProgress.completed / uploadProgress.total) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{uploadProgress.current || 'Working...'}</p>
          </div>
        )}
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
                onBlur={handleTitleBlur}
                placeholder="e.g., JEE Main Mock Test 2026"
                required
              />
              {!persistedExamId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tip: fill in description, category, duration, and schedule basics before clicking away to trigger auto draft.
                </p>
              )}
              {creatingDraft && !persistedExamId && (
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Preparing draft...
                </p>
              )}
            </div>

            <div className="md:col-span-2 grid gap-4 lg:grid-cols-2">
              <div className={`rounded-2xl border ${formData.is_published ? 'border-primary/40 bg-primary/5' : 'border-border'} p-4 flex items-start gap-4`}>
                <CheckCircle2 className="h-8 w-8 text-primary shrink-0 mt-1" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-foreground">Publish exam (visible to users)</p>
                  <p className="text-sm text-muted-foreground">Toggle on to push this exam to the learner catalog once content is ready.</p>
                </div>
                <input
                  type="checkbox"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleChange}
                  className="h-5 w-5 accent-primary"
                />
              </div>

              <div className={`rounded-2xl border ${formData.allow_anytime ? 'border-secondary/40 bg-secondary/5' : 'border-border'} p-4 flex items-start gap-4`}>
                <Clock3 className="h-8 w-8 text-secondary shrink-0 mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">Allow users to attempt anytime</p>
                    <input
                      type="checkbox"
                      name="allow_anytime"
                      checked={formData.allow_anytime}
                      onChange={handleChange}
                      className="h-5 w-5 accent-secondary"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Ignore schedule windows and keep this exam open 24/7.</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-3">
                Exam Type *
              </label>
              <div className="grid gap-3 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, exam_type: 'past_paper' }))}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    formData.exam_type === 'past_paper'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileQuestion className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Past Question Paper</p>
                      <p className="text-xs text-muted-foreground mt-1">Previous year exam papers for practice</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, exam_type: 'mock_test' }))}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    formData.exam_type === 'mock_test'
                      ? 'border-secondary bg-secondary/5 ring-2 ring-secondary/20'
                      : 'border-border hover:border-secondary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-6 w-6 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Mock Test</p>
                      <p className="text-xs text-muted-foreground mt-1">Full-length practice test with timer</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, exam_type: 'short_quiz' }))}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    formData.exam_type === 'short_quiz'
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Short Quiz</p>
                      <p className="text-xs text-muted-foreground mt-1">Quick assessment with fewer questions</p>
                    </div>
                  </div>
                </button>
              </div>

              {formData.exam_type === 'past_paper' && (
                <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="show_in_mock_tests"
                      checked={formData.show_in_mock_tests}
                      onChange={handleChange}
                      className="h-5 w-5 accent-primary mt-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-foreground cursor-pointer">
                        Also display in Mock Tests section
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable this to show this past paper in both "Past Papers" and "Mock Tests" sections
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                Select Tier
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
                  <option value="">Select Tier (Optional)</option>
                  {difficulties.map(diff => (
                    <option key={diff.id} value={diff.id}>{diff.name}</option>
                  ))}
                </select>
                {!showNewDifficulty ? (
                  <Button type="button" onClick={() => setShowNewDifficulty(true)} variant="outline" size="sm" className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Create New Tier
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

            {!formData.allow_anytime && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required={!formData.allow_anytime}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}

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
                readOnly
                min="0"
                className="bg-muted/50"
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
                readOnly
                min="0"
                className="bg-muted/50"
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

            {!formData.allow_anytime && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required={!formData.allow_anytime}
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
                    required={!formData.allow_anytime}
                  />
                </div>
              </>
            )}
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
                <p className="text-sm text-muted-foreground">
                  Set negative marks individually for each question in the sections below. Global negative value is ignored.
                </p>
              </div>
            )}
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

        {/* Sections and Questions Builder */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="font-display text-xl font-bold text-foreground">Sections & Questions</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Language:</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as 'en' | 'hi')}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>
            </div>
            <Button type="button" onClick={addSection} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {sectionsForDisplay.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No sections added yet. Click "Add Section" to create your first section.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sectionsForDisplay.map((section) => (
                <div key={section.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/30 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection(section.id)}
                      >
                        {section.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Input
                        value={selectedLanguage === 'en' ? section.name : (section.name_hi || '')}
                        onChange={(e) => updateSection(section.id, selectedLanguage === 'en' ? 'name' : 'name_hi', e.target.value)}
                        placeholder={selectedLanguage === 'en' ? 'Section name' : 'अनुभाग का नाम'}
                        className="max-w-xs"
                      />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{section.questions.length} questions</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {section.expanded && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Marks per Question</label>
                          <Input
                            type="number"
                            value={section.marks_per_question}
                            onChange={(e) => updateSection(section.id, 'marks_per_question', parseFloat(e.target.value))}
                            min="0"
                            step="0.5"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Section Duration (min)</label>
                          <Input
                            type="number"
                            value={section.duration}
                            onChange={(e) => updateSection(section.id, 'duration', parseInt(e.target.value))}
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">Questions</h3>
                          <Button
                            type="button"
                            onClick={() => addQuestion(section.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Question
                          </Button>
                        </div>

                        {section.questions.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No questions added</p>
                        ) : (
                          <div className="space-y-6">
                            {section.questions.map((question, qIndex) => {
                              const questionNeedsImage = Boolean(question.requires_image && !question.image && !question.imagePreview);
                              const questionKey = `question-${section.id}-${question.id}`;
                              const hasErrors = validationErrors[questionKey] && validationErrors[questionKey].length > 0;
                              const questionColors = ['bg-blue-50/50 border-blue-200', 'bg-green-50/50 border-green-200', 'bg-purple-50/50 border-purple-200', 'bg-amber-50/50 border-amber-200', 'bg-pink-50/50 border-pink-200'];
                              const colorClass = questionColors[qIndex % questionColors.length];
                              return (
                                <div
                                  key={question.id}
                                  className={`border-2 rounded-xl p-5 transition-all ${
                                    hasErrors
                                      ? 'border-red-500 bg-red-50/60 dark:bg-red-950/20 shadow-lg shadow-red-100'
                                      : questionNeedsImage
                                      ? 'border-orange-400 bg-orange-50/40 dark:bg-orange-950/10'
                                      : `${colorClass} dark:bg-slate-800/50 dark:border-slate-700`
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-base bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border-2 border-current">Q{qIndex + 1}</span>
                                      {hasErrors && (
                                        <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full animate-pulse">
                                          <XCircle className="h-3 w-3" />
                                          Has Errors
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {questionSaveStatus[question.id] && (
                                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Question data saved
                                        </span>
                                      )}
                                      {questionNeedsImage && (
                                        <span className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                                          <ImageIcon className="h-3 w-3" />
                                          Image required
                                        </span>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeQuestion(section.id, question.id)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  {hasErrors && (
                                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-600 rounded">
                                      <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">⚠️ Issues to fix:</p>
                                      <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5 list-disc list-inside">
                                        {validationErrors[questionKey].map((error, idx) => (
                                          <li key={idx}>{error}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Question Type</label>
                                      <select
                                        value={question.type}
                                        onChange={(e) => updateQuestion(section.id, question.id, 'type', e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                      >
                                        <option value="single">Single Choice</option>
                                        <option value="multiple">Multiple Choice</option>
                                        <option value="truefalse">True/False</option>
                                        <option value="numerical">Numerical</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Difficulty</label>
                                      <select
                                        value={question.difficulty}
                                        onChange={(e) => updateQuestion(section.id, question.id, 'difficulty', e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                      >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Marks</label>
                                      <Input
                                        type="number"
                                        value={question.marks}
                                        onChange={(e) => updateQuestion(section.id, question.id, 'marks', parseFloat(e.target.value))}
                                        min="0"
                                        step="0.5"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Negative Marks</label>
                                      <Input
                                        type="number"
                                        value={question.negative_marks}
                                        onChange={(e) => updateQuestion(section.id, question.id, 'negative_marks', parseFloat(e.target.value))}
                                        min="0"
                                        step="0.25"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <InlineRichTextEditor
                                      label={`Question Text (${selectedLanguage === 'en' ? 'English' : 'Hindi'}) *`}
                                      value={(selectedLanguage === 'en' ? question.text : question.text_hi) || ''}
                                      onChange={(content) => updateQuestion(section.id, question.id, selectedLanguage === 'en' ? 'text' : 'text_hi', content)}
                                      placeholder={selectedLanguage === 'en' ? 'Enter question text...' : 'प्रश्न पाठ दर्ज करें...'}
                                      rows={4}
                                      onImagePaste={(file) => handleQuestionImagePaste(section.id, question.id, file)}
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between">
                                      <label className="block text-sm font-medium mb-2">
                                        Question Image {question.requires_image ? '*' : '(Optional)'}
                                      </label>
                                      <div className="flex items-center gap-2">
                                        {questionNeedsImage && (
                                          <span className="text-xs font-semibold text-orange-600">Upload required</span>
                                        )}
                                        {question.requires_image && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => ignoreImageRequirement(section.id, question.id)}
                                            className="text-xs h-7 px-2"
                                          >
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Ignore Image
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    {question.imagePreview ? (
                                      <div className="flex items-center gap-4">
                                        <img src={question.imagePreview} alt="Question" className="h-20 object-contain" />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => clearQuestionImage(section.id, question.id)}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    ) : (
                                      <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted ${questionNeedsImage ? 'border-orange-400 text-orange-700' : 'border-border'}`}>
                                        <ImageIcon className="h-4 w-4" />
                                        <span className="text-sm">Upload Image</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleQuestionImageChange(section.id, question.id, file);
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>

                                  {question.type !== 'numerical' && (
                                    <div>
                                      <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-medium">Answer Options *</label>
                                        <Button
                                          type="button"
                                          onClick={() => addOption(section.id, question.id)}
                                          size="sm"
                                          variant="outline"
                                        >
                                          <Plus className="h-4 w-4 mr-1" />
                                          Add Option
                                        </Button>
                                      </div>
                                      <div className="space-y-3">
                                        {question.options.map((option, optIndex) => {
                                          const optionNeedsImage = Boolean(option.requires_image && !option.image && !option.imagePreview);
                                          return (
                                            <div
                                              key={option.id}
                                              className={`flex items-start gap-3 p-3 border rounded-lg ${
                                                optionNeedsImage
                                                  ? 'border-orange-300 bg-orange-50/40 dark:bg-orange-950/10'
                                                  : 'border-border bg-muted/30'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 pt-2">
                                                <input
                                                  type={question.type === 'multiple' ? 'checkbox' : 'radio'}
                                                  name={`correct-${question.id}`}
                                                  checked={option.is_correct}
                                                  onChange={() => setCorrectAnswer(section.id, question.id, option.id, question.type)}
                                                  className="h-4 w-4"
                                                />
                                                <span className="text-sm font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                              </div>
                                              <div className="flex-1 space-y-2">
                                                <InlineRichTextEditor
                                                  value={(selectedLanguage === 'en' ? option.option_text : option.option_text_hi) || ''}
                                                  onChange={(content) => updateOption(section.id, question.id, option.id, selectedLanguage === 'en' ? 'option_text' : 'option_text_hi', content)}
                                                  placeholder={selectedLanguage === 'en' ? `Option ${optIndex + 1}` : `विकल्प ${optIndex + 1}`}
                                                  rows={2}
                                                  variant="compact"
                                                  onImagePaste={(file) => handleOptionImagePaste(section.id, question.id, option.id, file)}
                                                />
                                                {optionNeedsImage && (
                                                  <div className="flex items-center justify-between">
                                                    <div className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                                                      <ImageIcon className="h-3 w-3" />
                                                      Image required
                                                    </div>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => ignoreImageRequirement(section.id, question.id, option.id)}
                                                      className="text-xs h-6 px-2 text-orange-700 hover:text-orange-900"
                                                    >
                                                      <XCircle className="h-3 w-3 mr-1" />
                                                      Ignore
                                                    </Button>
                                                  </div>
                                                )}
                                                {option.imagePreview ? (
                                                  <div className="flex items-center gap-2">
                                                    <img src={option.imagePreview} alt="Option" className="h-16 object-contain" />
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => clearOptionImage(section.id, question.id, option.id)}
                                                    >
                                                      Remove
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <label
                                                    className={`cursor-pointer inline-flex items-center gap-1 text-xs hover:text-foreground ${
                                                      optionNeedsImage ? 'text-orange-600' : 'text-muted-foreground'
                                                    }`}
                                                  >
                                                    <ImageIcon className="h-3 w-3" />
                                                    <span>Add image</span>
                                                    <input
                                                      type="file"
                                                      accept="image/*"
                                                      onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleOptionImageChange(section.id, question.id, option.id, file);
                                                      }}
                                                      className="hidden"
                                                    />
                                                  </label>
                                                )}
                                              </div>
                                              {question.options.length > 2 && (
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeOption(section.id, question.id, option.id)}
                                                  className="text-destructive hover:text-destructive"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {question.type === 'single' && !question.options.some(o => o.is_correct) && (
                                        <p className="text-xs text-destructive mt-2">Please select the correct answer</p>
                                      )}
                                      {question.type === 'multiple' && !question.options.some(o => o.is_correct) && (
                                        <p className="text-xs text-destructive mt-2">Please select at least one correct answer</p>
                                      )}
                                    </div>
                                  )}

                                  <div>
                                    <InlineRichTextEditor
                                      label={`Explanation (${selectedLanguage === 'en' ? 'English' : 'Hindi'}) (Optional)`}
                                      value={(selectedLanguage === 'en' ? question.explanation : question.explanation_hi) || ''}
                                      onChange={(content) => updateQuestion(section.id, question.id, selectedLanguage === 'en' ? 'explanation' : 'explanation_hi', content)}
                                      placeholder={selectedLanguage === 'en' ? 'Explain the correct answer...' : 'सही उत्तर की व्याख्या करें...'}
                                      rows={3}
                                      variant="compact"
                                    />
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                            <div className="mt-4 flex justify-center">
                              <Button
                                type="button"
                                onClick={() => addQuestion(section.id)}
                                variant="outline"
                                className="w-full max-w-md border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Another Question
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {pendingRequirements.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-800 dark:text-red-200 mb-3 text-base">
                    ⚠️ Complete the following to publish exam:
                  </p>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <ul className="space-y-2 text-sm">
                      {pendingRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-red-700 dark:text-red-300">
                          <span className="shrink-0 mt-0.5">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-3 italic">
                    💡 Tip: You can save as draft to continue editing later
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin/exams">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Exam' : 'Create Exam'
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Toast Notification */}
      {showToast && (
        <ToastNotification
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
