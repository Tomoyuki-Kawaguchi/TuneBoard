import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { SettingSheetForm } from '@/features/setting-sheet/SettingSheetForm';
import { ApiClientError } from '@/lib/api/type';

import { type PublicLiveResponse, type PublicSettingSheetSubmissionDetailResponse } from '@/features/lives/types/type';

export const PublicLivePage = () => {
  const { publicToken, submissionId } = useParams<{ publicToken: string; submissionId?: string }>();
  const [live, setLive] = useState<PublicLiveResponse | null>(null);
  const [submission, setSubmission] = useState<PublicSettingSheetSubmissionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!publicToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage('公開URLが不正です');
      setIsLoading(false);
      return;
    }

    apiClient
      .get<PublicLiveResponse>(`/public/lives/${publicToken}`)
      .then(async (response) => {
        if (!response || !(response as PublicLiveResponse).settingSheetConfig) {
          setErrorMessage('公開フォームを読み込めませんでした');
          return;
        }

        setLive(response as PublicLiveResponse);

        if (!submissionId) {
          setSubmission(null);
          return;
        }

        const submissionResponse = await apiClient.get<PublicSettingSheetSubmissionDetailResponse>(
          `/public/lives/${publicToken}/setting-sheet/submissions/${submissionId}`,
        );

        if (!submissionResponse || !(submissionResponse as PublicSettingSheetSubmissionDetailResponse).id) {
          setErrorMessage('提出済みシートを読み込めませんでした');
          return;
        }

        setSubmission(submissionResponse as PublicSettingSheetSubmissionDetailResponse);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.status === 404) {
          setErrorMessage(submissionId ? '提出済みシートが見つかりません' : '公開ライブフォームが見つかりません');
          return;
        }

        setErrorMessage(submissionId
          ? '提出済みシートを取得できませんでした。バックエンドの起動状態とURLを確認してください。'
          : '公開フォームを取得できませんでした。バックエンドの起動状態とURLを確認してください。');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [publicToken, submissionId]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">公開ライブを読み込み中です...</div>;
  }

  if (!live) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <h1 className="text-2xl font-semibold">TuneBoard</h1>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!publicToken) {
    return null;
  }

  return <SettingSheetForm key={`${publicToken}:${submissionId ?? 'new'}`} publicToken={publicToken} live={live} submission={submission} />;
};