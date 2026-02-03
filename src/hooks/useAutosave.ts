import { useCallback, useRef, useEffect, useState } from 'react';
import { graphqlExamService } from '@/lib/services/graphqlExamService';

interface UseAutosaveOptions {
  examId?: string | null;
  draftKey: string;
  debounceMs?: number;
  onSave?: (fieldPath: string, data: any) => void;
  onError?: (error: Error) => void;
}

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosave({
  examId,
  draftKey,
  debounceMs = 1000,
  onSave,
  onError
}: UseAutosaveOptions) {
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isMountedRef = useRef(true);
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear all pending timeouts on unmount
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const saveDraftField = useCallback(async (fieldPath: string, data: any) => {
    if (!isMountedRef.current) return;

    setStatus('saving');
    try {
      await graphqlExamService.upsertDraftField({
        draft_key: draftKey,
        exam_id: examId,
        field_path: fieldPath,
        data
      });
      
      if (isMountedRef.current) {
        setStatus('saved');
        setLastSaved(new Date());
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current) setStatus('idle');
        }, 2000);
        
        if (onSave) {
          onSave(fieldPath, data);
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        setStatus('error');
        setTimeout(() => {
          if (isMountedRef.current) setStatus('idle');
        }, 3000);
        
        if (onError) {
          onError(error as Error);
        }
      }
    }
  }, [draftKey, examId, onSave, onError]);

  const debouncedSave = useCallback((fieldPath: string, data: any) => {
    // Clear existing timeout for this field
    const existingTimeout = timeoutRefs.current.get(fieldPath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      saveDraftField(fieldPath, data);
      timeoutRefs.current.delete(fieldPath);
    }, debounceMs);

    timeoutRefs.current.set(fieldPath, timeout);
  }, [saveDraftField, debounceMs]);

  const clearDraft = useCallback(async () => {
    try {
      await graphqlExamService.clearDraft(draftKey, examId);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    }
  }, [draftKey, examId, onError]);

  const loadDraftFields = useCallback(async () => {
    try {
      return await graphqlExamService.fetchDraftFields(draftKey, examId);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      return [];
    }
  }, [draftKey, examId, onError]);

  return {
    saveDraftField: debouncedSave,
    clearDraft,
    loadDraftFields,
    status,
    lastSaved
  };
}
