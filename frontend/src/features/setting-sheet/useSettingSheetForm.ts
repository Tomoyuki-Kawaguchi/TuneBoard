import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  DEFAULT_SETTING_SHEET_CONFIG,
  normalizeSettingSheetConfig,
  type PublicLiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetSubmissionResponse,
} from '@/features/lives/types/type';
import { apiClient } from '@/lib/api/client';
import type { ApiClientError } from '@/lib/api/type';

import {
  createDefaultSettingSheetValues,
  createSettingSheetValuesFromSubmissionAnswers,
  fieldIdFromKey,
  parseSettingSheetDraft,
  toSettingSheetSubmissionPayload,
  validateSettingSheetForm,
  type SettingSheetFieldValue,
  type SettingSheetFormValues,
  type SettingSheetIssue,
} from './types';

interface UseSettingSheetFormParams {
  publicToken: string;
  live: PublicLiveResponse;
  submission: PublicSettingSheetSubmissionDetailResponse | null;
  onSubmitted: (submissionId: string) => void;
}

export function useSettingSheetForm({ publicToken, live, submission, onSubmitted }: UseSettingSheetFormParams) {
  const settingSheetConfig = useMemo(
    () => normalizeSettingSheetConfig(live.settingSheetConfig ?? DEFAULT_SETTING_SHEET_CONFIG),
    [live.settingSheetConfig],
  );
  const storageKey = submission
    ? `tuneboard:setting-sheet:${publicToken}:submission:${submission.id}`
    : `tuneboard:setting-sheet:${publicToken}`;
  const initialValues = useMemo(
    () => submission
      ? createSettingSheetValuesFromSubmissionAnswers(settingSheetConfig.blocks, submission.answers)
      : createDefaultSettingSheetValues(settingSheetConfig.blocks),
    [settingSheetConfig.blocks, submission],
  );

  const [formValues, setFormValues] = useState<SettingSheetFormValues>(() => {
    const draft = window.localStorage.getItem(storageKey);
    return draft ? parseSettingSheetDraft(draft, settingSheetConfig.blocks).values : initialValues;
  });
  const [issues, setIssues] = useState<SettingSheetIssue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSavedAt = new Date().toISOString();
      window.localStorage.setItem(storageKey, JSON.stringify({ savedAt: nextSavedAt, values: formValues }));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formValues, storageKey]);

  const errorMap = useMemo(
    () => Object.fromEntries(issues.map((issue) => [issue.key, issue.message])) as Record<string, string>,
    [issues],
  );

  const focusIssue = (issue: SettingSheetIssue) => {
    window.setTimeout(() => {
      const target = document.getElementById(fieldIdFromKey(issue.key));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if ('focus' in target && typeof target.focus === 'function') {
          target.focus();
        }
      }
    }, 120);
  };

  const applyServerErrors = (error: ApiClientError) => {
    const serverFieldErrors = error.apiError?.fieldErrors;
    if (!serverFieldErrors) {
      return;
    }

    const nextIssues = Object.entries(serverFieldErrors).map(([key, message]) => ({ key, label: key, message }));
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      focusIssue(nextIssues[0]);
    }
  };

  const updateScopedAnswers = (
    answers: Record<string, SettingSheetFieldValue>,
    blockId: string,
    nextValue: SettingSheetFieldValue,
  ) => ({
    ...answers,
    [blockId]: nextValue,
  });

  const handleSubmit = () => {
    const nextIssues = validateSettingSheetForm(formValues, settingSheetConfig);
    setIssues(nextIssues);

    if (nextIssues.length > 0) {
      toast.error('未入力または不足している項目があります。', { position: 'top-center' });
      focusIssue(nextIssues[0]);
      return;
    }

    setIsSubmitting(true);
    const requestPath = submission
      ? `/public/lives/${publicToken}/setting-sheet/submissions/${submission.id}`
      : `/public/lives/${publicToken}/setting-sheet/submissions`;
    const request = toSettingSheetSubmissionPayload(formValues, settingSheetConfig);
    const submitRequest = submission
      ? apiClient.put<SettingSheetSubmissionResponse>(requestPath, request)
      : apiClient.post<SettingSheetSubmissionResponse>(requestPath, request);

    submitRequest
      .then((response) => {
        setIssues([]);
        window.localStorage.removeItem(storageKey);

        if (submission) {
          toast.success('提出済みシートを更新しました。', { position: 'top-center' });
          return;
        }

        const savedSubmission = response as SettingSheetSubmissionResponse | void;
        if (savedSubmission?.id) {
          toast.success('ライブフォームを送信しました。', { position: 'top-center' });
          onSubmitted(savedSubmission.id);
          return;
        }

        setFormValues(createDefaultSettingSheetValues(settingSheetConfig.blocks));
        toast.success('ライブフォームを送信しました。', { position: 'top-center' });
      })
      .catch((error: ApiClientError) => {
        applyServerErrors(error);
        toast.error(error.apiError?.message ?? (submission ? '提出済みシートの更新に失敗しました。' : 'ライブフォームの送信に失敗しました。'), {
          position: 'top-center',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return {
    errorMap,
    focusIssue,
    formValues,
    handleSubmit,
    initialValues,
    isSubmitting,
    issues,
    setFormValues,
    settingSheetConfig,
    updateScopedAnswers,
  };
}