"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, Plus, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, FileText, CheckCircle2, Clock3, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminService } from '@/lib/api/adminService';
import { taxonomyService, Category, Subcategory, Difficulty } from '@/lib/api/taxonomyService';
import { CSVImportDialog } from '@/components/admin/CSVImportDialog';
import { ParsedSection } from '@/lib/utils/csvParser';
import Link from 'next/link';

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
  image?: File | null;
  imagePreview?: string;
  requires_image?: boolean;
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
  requires_image?: boolean;
}

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
  const [initialLoading, setInitialLoading] = useState(true);
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
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed',
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
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, completed: 0, current: '' });

  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    loadExamData();
    fetchTaxonomies();
  }, [examId]);

  const loadExamData = async () => {
    try {
      const exam = await adminService.getExamById(examId);
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
        status: exam.status,
        start_date: exam.start_date?.split('T')[0] || '',
        end_date: exam.end_date?.split('T')[0] || '',
        pass_percentage: exam.pass_percentage,
        is_free: exam.is_free,
        price: exam.price,
        negative_marking: exam.negative_marking,
        negative_mark_value: exam.negative_mark_value,
        is_published: exam.is_published,
        allow_anytime: exam.allow_anytime ?? false,
        exam_type: exam.exam_type || 'mock_test',
        show_in_mock_tests: exam.show_in_mock_tests ?? false,
        syllabus: exam.syllabus || []
      });

      if (exam.logo_url) setLogoPreview(exam.logo_url);
      if (exam.thumbnail_url) setThumbnailPreview(exam.thumbnail_url);

      const sectionsData = await adminService.getExamSectionsAndQuestions(examId);
      const loadedSections: Section[] = sectionsData.sections.map(section => ({
        id: section.id,
        name: section.name,
        total_questions: section.total_questions,
        marks_per_question: section.marks_per_question,
        duration: section.duration || 0,
        section_order: section.section_order,
        expanded: false,
        questions: section.questions.map(q => ({
          id: q.id,
          type: q.type as any,
          text: q.text,
          marks: q.marks,
          negative_marks: q.negative_marks,
          explanation: q.explanation || '',
          difficulty: q.difficulty as any,
          imagePreview: q.image_url,
          options: q.options.map(opt => ({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            option_order: opt.option_order,
            imagePreview: opt.image_url
          }))
        }))
      }));
      setSections(loadedSections);
    } catch (error) {
      console.error('Failed to load exam:', error);
      alert('Failed to load exam data');
      router.push('/admin/exams');
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === 'allow_anytime') {
        setFormData(prev => ({
          ...prev,
          allow_anytime: checked,
          status: checked ? prev.status : (prev.status || 'upcoming'),
          start_date: checked ? '' : prev.start_date,
          end_date: checked ? '' : prev.end_date
        }));
        return;
      }
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

  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name: `Section ${sections.length + 1}`,
      total_questions: 0,
      marks_per_question: 1,
      duration: 0,
      section_order: sections.length + 1,
      questions: [],
      expanded: true
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, field: keyof Section, value: any) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s));
  };

  const toggleSection = (sectionId: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, expanded: !s.expanded } : s));
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
      options: [
        { id: `opt-1-${Date.now()}`, option_text: '', is_correct: false, option_order: 1 },
        { id: `opt-2-${Date.now()}`, option_text: '', is_correct: false, option_order: 2 },
        { id: `opt-3-${Date.now()}`, option_text: '', is_correct: false, option_order: 3 },
        { id: `opt-4-${Date.now()}`, option_text: '', is_correct: false, option_order: 4 }
      ]
    };
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, questions: [...s.questions, newQuestion], total_questions: s.questions.length + 1 };
      }
      return s;
    }));
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, questions: s.questions.filter(q => q.id !== questionId), total_questions: s.questions.length - 1 };
      }
      return s;
    }));
  };

  const updateQuestion = (sectionId: string, questionId: string, field: keyof Question, value: any) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q => q.id === questionId ? { ...q, [field]: value } : q)
        };
      }
      return s;
    }));
  };

  const updateOption = (sectionId: string, questionId: string, optionId: string, field: keyof Option, value: any) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q => {
            if (q.id === questionId) {
              return {
                ...q,
                options: q.options.map(opt => opt.id === optionId ? { ...opt, [field]: value } : opt)
              };
            }
            return q;
          })
        };
      }
      return s;
    }));
  };

  const setCorrectAnswer = (sectionId: string, questionId: string, optionId: string, questionType: string) => {
    setSections(sections.map(s => {
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
              } else {
                return {
                  ...q,
                  options: q.options.map(opt => 
                    opt.id === optionId ? { ...opt, is_correct: !opt.is_correct } : opt
                  )
                };
              }
            }
            return q;
          })
        };
      }
      return s;
    }));
  };

  const addOption = (sectionId: string, questionId: string) => {
    setSections(sections.map(s => {
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
    }));
  };

  const removeOption = (sectionId: string, questionId: string, optionId: string) => {
    setSections(sections.map(s => {
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
    }));
  };

  const handleQuestionImageChange = (sectionId: string, questionId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setSections(prevSections => prevSections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        questions: section.questions.map(question =>
          question.id === questionId ? { ...question, image: file, imagePreview: preview } : question
        )
      };
    }));
  };

  const clearQuestionImage = (sectionId: string, questionId: string) => {
    setSections(prevSections => prevSections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        questions: section.questions.map(question =>
          question.id === questionId ? { ...question, image: null, imagePreview: undefined } : question
        )
      };
    }));
  };

  const handleOptionImageChange = (sectionId: string, questionId: string, optionId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setSections(prevSections => prevSections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        questions: section.questions.map(question => {
          if (question.id !== questionId) return question;
          return {
            ...question,
            options: question.options.map(option =>
              option.id === optionId ? { ...option, image: file, imagePreview: preview } : option
            )
          };
        })
      };
    }));
  };

  const clearOptionImage = (sectionId: string, questionId: string, optionId: string) => {
    setSections(prevSections => prevSections.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        questions: section.questions.map(question => {
          if (question.id !== questionId) return question;
          return {
            ...question,
            options: question.options.map(option =>
              option.id === optionId ? { ...option, image: null, imagePreview: undefined } : option
            )
          };
        })
      };
    }));
  };

  const handleCSVImport = (parsedSections: ParsedSection[]) => {
    setSections(prevSections => {
      const maxSectionOrder = prevSections.reduce((max, section) => Math.max(max, section.section_order), 0);

      const convertedSections: Section[] = parsedSections.map((parsedSection, idx) => {
        const questions: Question[] = parsedSection.questions.map((parsedQuestion, qIdx) => {
          const options: Option[] = parsedQuestion.options.map((parsedOption, oIdx) => ({
            id: generateId(`opt-${idx}-${qIdx}-${oIdx}`),
            option_text: parsedOption.option_text,
            is_correct: parsedOption.is_correct,
            option_order: parsedOption.option_order,
            requires_image: parsedOption.requires_image
          }));

          return {
            id: generateId(`question-${idx}-${qIdx}`),
            type: parsedQuestion.type,
            text: parsedQuestion.text,
            marks: parsedQuestion.marks,
            negative_marks: parsedQuestion.negative_marks,
            explanation: parsedQuestion.explanation,
            difficulty: parsedQuestion.difficulty,
            options,
            requires_image: parsedQuestion.requires_image
          };
        });

        return {
          id: generateId(`section-${idx}`),
          name: parsedSection.name,
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
    const needsSchedule = !formData.allow_anytime;
    const scheduleComplete = needsSchedule ? Boolean(formData.start_date && formData.end_date && formData.status) : true;
    const basicFieldsComplete = Boolean(
      formData.title.trim() &&
      formData.description.trim() &&
      formData.category_id &&
      formData.duration > 0 &&
      formData.total_marks > 0 &&
      formData.total_questions > 0 &&
      scheduleComplete
    );

    if (!basicFieldsComplete) {
      requirements.push('Fill in all basic exam details (title, description, duration, totals, dates, category).');
    }

    if (sections.length === 0) {
      requirements.push('Add at least one section with questions.');
    } else {
      const invalidSection = sections.some(section => !section.name.trim() || section.questions.length === 0);
      if (invalidSection) {
        requirements.push('Every section needs a name and at least one question.');
      }

      const hasInvalidQuestions = sections.some(section =>
        section.questions.some(question => {
          if (!question.text.trim() || question.marks <= 0) return true;
          if (question.type === 'numerical') return false;
          const lackOptions = question.options.length < 2 || question.options.some(option => !option.option_text.trim());
          const noCorrect = !question.options.some(option => option.is_correct);
          return lackOptions || noCorrect;
        })
      );

      if (hasInvalidQuestions) {
        requirements.push('Ensure every question has text, marks, valid options, and at least one correct answer.');
      }
    }

    if (hasPendingImageRequirements) {
      requirements.push('Upload images for all questions/options marked as "Image required" or remove those items.');
    }

    return requirements;
  }, [formData, sections, hasPendingImageRequirements]);

  const canSubmit = pendingRequirements.length === 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const sectionCount = sections.length;
    const questionCount = sections.reduce((sum, section) => sum + section.questions.length, 0);
    const optionCount = sections.reduce((sum, section) => sum + section.questions.reduce((qSum, question) => qSum + question.options.length, 0), 0);
    const totalSteps = Math.max(1, 1 + sectionCount + questionCount + optionCount);

    setUploadProgress({ total: totalSteps, completed: 0, current: 'Updating...am...' });

    const advanceProgress = (current: string) => {
      setUploadProgress(prev => ({
        total: prev.total || totalSteps,
        completed: Math.min(prev.completed + 1, prev.total || totalSteps),
        current
      }));
    };

    try {
      const payload: any = { ...formData };
      if (payload.exam_type !== 'past_paper') {
        payload.show_in_mock_tests = false;
      }
      if (payload.allow_anytime) {
        delete payload.status;
        delete payload.start_date;
        delete payload.end_date;
      }

      await adminService.updateExam(examId, payload, logoFile || undefined, thumbnailFile || undefined);
      advanceProgress('Exam updated');
      
      for (const section of sections) {
        const isNewSection = section.id.startsWith('section-');
        let sectionData;
        
        if (isNewSection) {
          sectionData = await adminService.createSection({
            exam_id: examId,
            name: section.name,
            total_questions: section.total_questions,
            marks_per_question: section.marks_per_question,
            duration: section.duration || undefined,
            section_order: section.section_order
          });
        } else {
          sectionData = await adminService.updateSection(section.id, {
            name: section.name,
            total_questions: section.total_questions,
            marks_per_question: section.marks_per_question,
            duration: section.duration || undefined,
            section_order: section.section_order
          });
          sectionData = { ...sectionData, id: section.id };
        }
        advanceProgress(`Section "${section.name}" saved`);

        for (const question of section.questions) {
          const isNewQuestion = question.id.startsWith('question-');
          let questionData;
          
          if (isNewQuestion) {
            questionData = await adminService.createQuestion(
              {
                exam_id: examId,
                section_id: sectionData.id,
                type: question.type,
                text: question.text,
                marks: question.marks,
                negative_marks: question.negative_marks,
                explanation: question.explanation,
                difficulty: question.difficulty
              },
              question.image || undefined
            );
          } else {
            questionData = await adminService.updateQuestion(
              question.id,
              {
                type: question.type,
                text: question.text,
                marks: question.marks,
                negative_marks: question.negative_marks,
                explanation: question.explanation,
                difficulty: question.difficulty
              },
              question.image || undefined
            );
            questionData = { ...questionData, id: question.id };
          }
          advanceProgress(`Question "${question.text.slice(0, 40) || 'Untitled'}" saved`);

          for (const option of question.options) {
            const isNewOption = option.id.startsWith('opt-');
            
            if (isNewOption) {
              await adminService.createOption(
                {
                  question_id: questionData.id,
                  option_text: option.option_text,
                  is_correct: option.is_correct,
                  option_order: option.option_order
                },
                option.image || undefined
              );
            } else {
              await adminService.updateOption(
                option.id,
                {
                  option_text: option.option_text,
                  is_correct: option.is_correct,
                  option_order: option.option_order
                },
                option.image || undefined
              );
            }
            advanceProgress('Option saved');
          }
        }
      }

      alert('Exam updated successfully with all sections and questions!');
      router.push('/admin/exams');
    } catch (error: any) {
      console.error('Failed to create exam:', error);
      alert(error.message || 'Failed to create exam. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress({ total: 0, completed: 0, current: '' });
    }
  };

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
              Edit Exam
            </h1>
            <p className="text-muted-foreground">
              Update exam details, manage sections, questions, and options
            </p>
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

            {formData.allow_anytime && (
              <div className="md:col-span-2 text-sm text-muted-foreground bg-muted/50 border border-dashed border-border rounded-lg p-3">
                Users can attempt anytime once this exam is published. Scheduling fields are ignored while enabled.
              </div>
            )}
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
                placeholder="e.g., JEE Main Mock Test 2026"
                required
              />
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

            {formData.allow_anytime && (
              <div className="md:col-span-2 text-sm text-muted-foreground bg-muted/50 border border-dashed border-border rounded-lg p-3">
                Users can attempt anytime once this exam is published. Scheduling fields are ignored while enabled.
              </div>
            )}

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
            <h2 className="font-display text-xl font-bold text-foreground">Sections & Questions</h2>
            <Button type="button" onClick={addSection} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No sections added yet. Click "Add Section" to create your first section.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => (
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
                        value={section.name}
                        onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                        placeholder="Section name"
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
                              return (
                                <div
                                  key={question.id}
                                  className={`border rounded-lg p-4 ${
                                    questionNeedsImage
                                      ? 'border-orange-400 bg-orange-50/40 dark:bg-orange-950/10'
                                      : 'border-border bg-background'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-4">
                                    <span className="font-semibold text-sm">Question {qIndex + 1}</span>
                                    <div className="flex items-center gap-3">
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
                                    <label className="block text-sm font-medium mb-1">Question Text *</label>
                                    <textarea
                                      value={question.text}
                                      onChange={(e) => updateQuestion(section.id, question.id, 'text', e.target.value)}
                                      placeholder="Enter question text..."
                                      rows={3}
                                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between">
                                      <label className="block text-sm font-medium mb-2">
                                        Question Image {question.requires_image ? '*' : '(Optional)'}
                                      </label>
                                      {questionNeedsImage && (
                                        <span className="text-xs font-semibold text-orange-600">Upload required</span>
                                      )}
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
                                                <Input
                                                  value={option.option_text}
                                                  onChange={(e) => updateOption(section.id, question.id, option.id, 'option_text', e.target.value)}
                                                  placeholder={`Option ${optIndex + 1}`}
                                                  className="text-sm"
                                                />
                                                {optionNeedsImage && (
                                                  <div className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                                                    <ImageIcon className="h-3 w-3" />
                                                    Image required
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
                                    <label className="block text-sm font-medium mb-1">Explanation (Optional)</label>
                                    <textarea
                                      value={question.explanation}
                                      onChange={(e) => updateQuestion(section.id, question.id, 'explanation', e.target.value)}
                                      placeholder="Explain the correct answer..."
                                      rows={2}
                                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                              );
                            })}
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {pendingRequirements.length > 0 && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground sm:max-w-md">
              <p className="font-semibold text-destructive mb-2">Complete the following to enable exam creation:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {pendingRequirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-end gap-4">
            <Link href="/admin/exams">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={`bg-secondary hover:bg-secondary/90 ${!canSubmit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Updating...' : 'Update Exam'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
