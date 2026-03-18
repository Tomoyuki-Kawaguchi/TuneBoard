import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';
import { type PublicLiveResponse, type PublicSettingSheetSubmissionDetailResponse, type SettingSheetConfigResponse } from '@/features/lives/types/type';

export const PublicSubmissionSharedPage = () => {
  const { publicToken, submissionId } = useParams<{ publicToken: string; submissionId?: string }>();
  const [live, setLive] = useState<PublicLiveResponse | null>(null);
  const [submissions, setSubmissions] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicToken) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [liveResponse, submissionResponse] = await Promise.all([
          apiClient.get<PublicLiveResponse>(`/public/lives/${publicToken}`),
          apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/public/lives/${publicToken}/setting-sheet/submissions/shared`),
        ]);

        if (!cancelled) {
          setLive(liveResponse ?? null);
          const allSubmissions = submissionResponse ?? [];
          setSubmissions(submissionId ? allSubmissions.filter((item) => item.id === submissionId) : allSubmissions);
          setErrorMessage('');
        }
      } catch (error: unknown) {
        if (!cancelled) {
          if (error instanceof ApiClientError) {
            const message = error.apiError?.message ?? '共有提出データの取得に失敗しました';
            setErrorMessage(message);
            toast.error(message, { position: 'top-center' });
          } else {
            setErrorMessage('共有提出データの取得に失敗しました');
            toast.error('共有提出データの取得に失敗しました', { position: 'top-center' });
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [publicToken, submissionId]);

  const labelMap = useMemo(() => buildFieldLabelMap(live?.settingSheetConfig ?? null), [live?.settingSheetConfig]);

  if (!publicToken) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">共有データを読み込み中です...</div>;
  }

  if (!live) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <h1 className="text-xl font-semibold">TuneBoard</h1>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMessage || '共有データが見つかりませんでした。'}</p>
            <Link to={`/public/lives/${publicToken}`} className="mt-3 inline-block text-sm text-primary underline underline-offset-4">公開フォームに戻る</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold">{live.name} - 提出共有一覧</h1>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">公開設定された提出済みデータを一覧で確認できます。</p>
            <p className="text-xs text-muted-foreground">件数: {submissions.length}件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">公開項目</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">公開可能な提出データがありません。</p>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {submissions.map((submission) => (
                  <AccordionItem key={submission.id} value={submission.id} className="rounded-md border px-3">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex w-full items-center justify-between gap-2 pr-2 text-left">
                        <p className="truncate font-medium">{submission.bandName}</p>
                        <p className="text-xs text-muted-foreground">{formatSubmittedAt(submission.submittedAt)}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">{renderAnswers(submission.answers, labelMap, submission.id)}</div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
            <Separator />
            <p className="text-xs text-muted-foreground">このページには管理者が公開設定した項目のみ表示されます。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function buildFieldLabelMap(config: SettingSheetConfigResponse | null) {
  const map = new Map<string, string>();
  const visit = (blocks: SettingSheetConfigResponse['blocks']) => {
    for (const block of blocks) {
      map.set(block.id, block.label);
      if (block.fields.length > 0) {
        visit(block.fields);
      }
    }
  };

  if (config) {
    visit(config.blocks);
  }

  return map;
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function renderAnswers(
  answers: PublicSettingSheetSubmissionDetailResponse['answers'],
  labelMap: Map<string, string>,
  path: string,
) {
  return answers.map((answer, index) => {
    const key = `${path}-${answer.fieldId}-${index}`;
    const label = labelMap.get(answer.fieldId) ?? answer.fieldId;

    if (answer.items.length > 0) {
      return (
        <div key={key} className="space-y-2 rounded-md border p-3">
          <p className="font-medium">{label}</p>
          {answer.items.map((item, itemIndex) => (
            <div key={`${key}-${itemIndex}`} className="rounded-md bg-muted/40 p-3">
              <p className="mb-1 text-xs text-muted-foreground">{itemIndex + 1}件目</p>
              <div className="space-y-2">{renderAnswers(item.answers, labelMap, `${key}-item-${itemIndex}`)}</div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div key={key} className="rounded-md border p-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 wrap-break-word font-medium">{answer.values.length > 0 ? answer.values.join(' / ') : '未入力'}</p>
      </div>
    );
  });
}
