import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';
import { resolveMainDisplayFieldLabel, type PublicLiveResponse, type PublicSettingSheetSubmissionDetailResponse, type SettingSheetConfigResponse } from '@/features/lives/types/type';

export const PublicSubmissionSharedPage = () => {
  const { publicToken, submissionId } = useParams<{ publicToken: string; submissionId?: string }>();
  const [live, setLive] = useState<PublicLiveResponse | null>(null);
  const [submissions, setSubmissions] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
  const mainDisplayLabel = useMemo(
    () => live ? resolveMainDisplayFieldLabel(live.settingSheetConfig) : 'メイン表示',
    [live],
  );
  const rows = useMemo(() => submissions.map((submission) => ({
    id: submission.id,
    bandName: submission.bandName,
    submittedAt: formatSubmittedAt(submission.submittedAt),
    values: flattenAnswers(submission.answers, labelMap),
  })), [submissions, labelMap]);
  const columns = useMemo(() => {
    const ordered = new Map<string, string>();
    for (const row of rows) {
      for (const [label] of row.values) {
        if (!ordered.has(label)) {
          ordered.set(label, label);
        }
      }
    }
    return Array.from(ordered.keys());
  }, [rows]);
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((row) => {
      if (row.bandName.toLowerCase().includes(query)) {
        return true;
      }

      return Array.from(row.values.values()).some((value) => value.toLowerCase().includes(query));
    });
  }, [rows, searchQuery]);

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
      <div className="mx-auto max-w-7xl space-y-4">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold">{live.name} - 提出共有一覧</h1>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" placeholder="バンド名や内容で検索" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>件数: {filteredRows.length}件</span>
              <span>列数: {columns.length + 2}列</span>
              <Link to={`/public/lives/${publicToken}`} className="underline underline-offset-4">公開フォームに戻る</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">公開項目</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissionId && submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">指定された提出データは公開されていないか、見つかりませんでした。</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">公開可能な提出データがありません。</p>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">検索条件に一致する提出がありません。</p>
            ) : (
              <div className="rounded-lg border">
                <ScrollArea className="h-[70vh] w-full">
                  <Table className="min-w-max">
                    <TableHeader className="sticky top-0 z-20 bg-background">
                      <TableRow>
                        <TableHead className="sticky left-0 z-30 w-[180px] bg-background">{mainDisplayLabel}</TableHead>
                        <TableHead className="w-[170px] bg-background">提出日時</TableHead>
                        {columns.map((column) => (
                          <TableHead key={column} className="w-[220px] whitespace-normal bg-background">{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="sticky left-0 z-10 w-[180px] bg-background font-medium">{row.bandName}</TableCell>
                          <TableCell className="w-[170px] text-muted-foreground">{row.submittedAt}</TableCell>
                          {columns.map((column) => (
                            <TableCell key={`${row.id}-${column}`} className="w-[220px] whitespace-pre-line align-top text-sm">
                              {row.values.get(column) ?? '未入力'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
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

function flattenAnswers(
  answers: PublicSettingSheetSubmissionDetailResponse['answers'],
  labelMap: Map<string, string>,
  parentLabel = '',
) {
  const values = new Map<string, string>();

  for (const answer of answers) {
    const label = labelMap.get(answer.fieldId) ?? answer.fieldId;
    const fullLabel = parentLabel ? `${parentLabel} / ${label}` : label;

    if (answer.items.length > 0) {
      const lines = answer.items.map((item, itemIndex) => {
        const nested = flattenAnswers(item.answers, labelMap);
        const content = Array.from(nested.entries())
          .map(([nestedLabel, value]) => `${nestedLabel}: ${value}`)
          .join('\n');
        return `${itemIndex + 1}件目\n${content || '未入力'}`;
      });
      values.set(fullLabel, lines.join('\n'));
      continue;
    }

    values.set(fullLabel, answer.values.length > 0 ? answer.values.join(' / ') : '未入力');
  }

  return values;
}
