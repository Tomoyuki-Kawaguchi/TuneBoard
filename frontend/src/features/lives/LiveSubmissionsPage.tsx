import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, ExternalLink, Music2, Search } from 'lucide-react';
import { toast } from 'sonner';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api/client';
import {
  formatLiveDate,
  resolveRecordLabel,
  type LiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionAnswerResponse,
} from './types/type';

interface ColumnDef {
  id: string;
  label: string;
  type: SettingSheetBlock['type'];
}

interface DuplicateSongCandidate {
  key: string;
  title: string;
  artist: string;
  bands: string[];
}

export const LiveSubmissionsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [details, setDetails] = useState<PublicSettingSheetSubmissionDetailResponse[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!liveId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [liveResponse, configResponse, detailsResponse] = await Promise.all([
          apiClient.get<LiveResponse>(`/lives/${liveId}`),
          apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
          apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/details`),
        ]);

        if (!liveResponse || !configResponse) {
          throw new Error('required data missing');
        }

        if (cancelled) {
          return;
        }

        setLive(liveResponse);
        setConfig(configResponse);
        setDetails(detailsResponse ?? []);
      } catch {
        if (!cancelled) {
          toast.error('提出情報の取得に失敗しました', { position: 'top-center' });
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
  }, [liveId]);

  const labelMap = useMemo(() => buildFieldLabelMap(config), [config]);
  const recordLabel = useMemo(() => resolveRecordLabel(config), [config]);
  const tableColumns = useMemo(() => collectColumns(config, 'tableVisible'), [config]);
  const duplicateSongs = useMemo(() => collectDuplicateSongs(details), [details]);

  const filteredDetails = useMemo(() => {
    if (!searchQuery.trim()) {
      return details;
    }
    const query = searchQuery.trim().toLowerCase();
    return details.filter((detail) => {
      if (detail.recordLabel.toLowerCase().includes(query)) {
        return true;
      }
      return tableColumns.some((column) => {
        const value = extractCellValue(detail.answers, column.id, column.type);
        return value.toLowerCase().includes(query);
      });
    });
  }, [searchQuery, details, tableColumns]);

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">提出情報を読み込み中です...</div>;
  }

  if (!live) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const selectedDetail = details.find((d) => d.id === selectedSubmissionId) ?? null;
  const sharedListUrl = `${window.location.origin}/public/lives/${live.publicToken}/submissions/shared`;
  const buildEditFormUrl = (submissionId: string) => `${window.location.origin}/public/lives/${live.publicToken}/submissions/${submissionId}`;

  const copySharedLink = async () => {
    try {
      await navigator.clipboard.writeText(sharedListUrl);
      toast.success('共有リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
    }
  };

  const copyEditLink = async (submissionId: string) => {
    try {
      await navigator.clipboard.writeText(buildEditFormUrl(submissionId));
      toast.success('編集リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
    }
  };

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tenants">テナント一覧</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/tenants/${tenantId}/lives`}>{live.tenantName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/tenants/${tenantId}/lives/${liveId}`}>{live.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>提出確認</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold sm:text-2xl">提出済みSettingSheet</h1>
              <p className="text-sm text-muted-foreground">{live.name} / {formatLiveDate(live.date)} / 全{details.length}件</p>
            </div>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/tenants/${tenantId}/lives/${liveId}`}>
                <ChevronLeft className="size-4" />
                ライブ管理へ戻る
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Music2 className="size-5" />
                <CardTitle className="text-base sm:text-lg">曲の被り候補</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">全提出から自動的に被り候補を検出します。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copySharedLink}>
                <Copy className="size-4" />
                共有一覧リンクをコピー
              </Button>
              <Button asChild size="sm">
                <a href={sharedListUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  共有一覧を開く
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {duplicateSongs.length === 0 ? (
            <p className="text-sm text-muted-foreground">現時点で被り候補はありません。</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>曲名</TableHead>
                    <TableHead>アーティスト</TableHead>
                    <TableHead>重複提出</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicateSongs.map((song) => (
                    <TableRow key={song.key}>
                      <TableCell className="font-medium">{song.title}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{song.artist || '未入力'}</TableCell>
                      <TableCell className="whitespace-normal">{song.bands.join(' / ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg">提出一覧</CardTitle>
              {tableColumns.length === 0 && (
                <p className="text-xs text-muted-foreground">フォーム編集画面で「管理者提出一覧でこの項目を列として表示する」を設定すると、ここに列が追加されます。</p>
              )}
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-8" placeholder={`${recordLabel}で検索`} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する提出はありません。</p>
          ) : (
            <div className="rounded-lg border">
              <ScrollArea className="w-full">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-background">{recordLabel}</TableHead>
                      {tableColumns.map((column) => (
                        <TableHead key={column.id} className="w-[200px] whitespace-normal">{column.label}</TableHead>
                      ))}
                      <TableHead>状態</TableHead>
                      <TableHead>提出日時</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDetails.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium">{detail.recordLabel}</TableCell>
                        {tableColumns.map((column) => (
                          <TableCell key={`${detail.id}-${column.id}`} className="w-[200px] whitespace-pre-line align-top text-sm">
                            {extractCellValue(detail.answers, column.id, column.type)}
                          </TableCell>
                        ))}
                        <TableCell><Badge variant="secondary">{detail.submissionStatus}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{formatSubmittedAt(detail.submittedAt)}</TableCell>
                        <TableCell className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedSubmissionId(detail.id); setIsDetailDialogOpen(true); }}>詳細</Button>
                          <Button variant="outline" size="sm" onClick={() => copyEditLink(detail.id)}><Copy className="size-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>提出詳細</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-1">
            {!selectedDetail ? (
              <p className="text-sm text-muted-foreground">提出を選択してください。</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{recordLabel}</p>
                  <p className="font-semibold">{selectedDetail.recordLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">提出日時: {formatSubmittedAt(selectedDetail.submittedAt)}</p>
                </div>
                <Separator />
                <div className="space-y-3">
                  {renderAnswers(selectedDetail.answers, labelMap, selectedDetail.id)}
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function collectColumns(config: SettingSheetConfigResponse | null, visibilityKey: 'publicVisible' | 'tableVisible'): ColumnDef[] {
  if (!config) {
    return [];
  }
  const columns: ColumnDef[] = [];

  const visit = (blocks: SettingSheetConfigResponse['blocks']) => {
    for (const block of blocks) {
      if (block.type === 'SECTION') {
        visit(block.fields);
        continue;
      }
      if (block[visibilityKey]) {
        columns.push({ id: block.id, label: block.label, type: block.type });
      }
    }
  };

  visit(config.blocks);
  return columns;
}

function extractCellValue(
  answers: SettingSheetSubmissionAnswerResponse[],
  fieldId: string,
  blockType: SettingSheetBlock['type'],
): string {
  const answer = answers.find((a) => a.fieldId === fieldId);
  if (!answer) {
    return '未入力';
  }
  if (blockType === 'REPEATABLE_GROUP') {
    if (answer.items.length === 0) {
      return '未入力';
    }
    return `${answer.items.length}件`;
  }
  return answer.values.length > 0 ? answer.values.join(' / ') : '未入力';
}

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

function collectDuplicateSongs(submissions: PublicSettingSheetSubmissionDetailResponse[]): DuplicateSongCandidate[] {
  const songMap = new Map<string, { title: string; artist: string; bands: Set<string> }>();

  for (const submission of submissions) {
    const songs = collectSongsFromAnswers(submission.answers);
    const uniqueKeysInSubmission = new Set<string>();

    for (const song of songs) {
      if (uniqueKeysInSubmission.has(song.key)) {
        continue;
      }
      uniqueKeysInSubmission.add(song.key);

      const existing = songMap.get(song.key);
      if (existing) {
        existing.bands.add(submission.recordLabel);
      } else {
        songMap.set(song.key, { title: song.title, artist: song.artist, bands: new Set([submission.recordLabel]) });
      }
    }
  }

  return Array.from(songMap.entries())
    .filter(([, value]) => value.bands.size > 1)
    .map(([key, value]) => ({ key, title: value.title, artist: value.artist, bands: Array.from(value.bands) }))
    .sort((left, right) => right.bands.length - left.bands.length || left.title.localeCompare(right.title, 'ja'));
}

function collectSongsFromAnswers(answers: PublicSettingSheetSubmissionDetailResponse['answers']) {
  const songs: Array<{ key: string; title: string; artist: string }> = [];

  const walk = (currentAnswers: PublicSettingSheetSubmissionDetailResponse['answers']) => {
    for (const answer of currentAnswers) {
      if (answer.fieldId === 'songs') {
        for (const item of answer.items) {
          const title = findAnswerValue(item.answers, 'song-title', 'title');
          const artist = findAnswerValue(item.answers, 'song-artist', 'artist');
          if (!title) {
            continue;
          }
          songs.push({
            key: normalizeSongKey(title, artist),
            title,
            artist,
          });
        }
      }

      for (const item of answer.items) {
        walk(item.answers);
      }
    }
  };

  walk(answers);
  return songs;
}

function findAnswerValue(
  answers: PublicSettingSheetSubmissionDetailResponse['answers'],
  exactFieldId: string,
  fallbackToken: string,
) {
  const exact = answers.find((answer) => answer.fieldId === exactFieldId)?.values[0]?.trim();
  if (exact) {
    return exact;
  }

  const fallback = answers.find((answer) => answer.fieldId.includes(fallbackToken))?.values[0]?.trim();
  return fallback ?? '';
}

function normalizeSongKey(title: string, artist: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedArtist = artist.trim().toLowerCase();
  return `${normalizedTitle}::${normalizedArtist}`;
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
          <div className="space-y-2">
            {answer.items.map((item, itemIndex) => (
              <div key={`${key}-item-${itemIndex}`} className="rounded-md bg-muted/40 p-3">
                <p className="mb-2 text-xs text-muted-foreground">{itemIndex + 1}件目</p>
                <div className="space-y-2">{renderAnswers(item.answers, labelMap, `${key}-item-${itemIndex}`)}</div>
              </div>
            ))}
          </div>
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
