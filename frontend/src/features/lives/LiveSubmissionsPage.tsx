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
  resolveMainDisplayFieldLabel,
  type LiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionResponse,
} from './types/type';

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
  const [submissions, setSubmissions] = useState<SettingSheetSubmissionResponse[]>([]);
  const [detailsById, setDetailsById] = useState<Record<string, PublicSettingSheetSubmissionDetailResponse>>({});
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzingDuplicates, setIsAnalyzingDuplicates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!liveId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [liveResponse, configResponse, listResponse] = await Promise.all([
          apiClient.get<LiveResponse>(`/lives/${liveId}`),
          apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
          apiClient.get<SettingSheetSubmissionResponse[]>(`/lives/${liveId}/setting-sheet/submissions`),
        ]);

        if (!liveResponse || !configResponse) {
          throw new Error('required data missing');
        }

        if (cancelled) {
          return;
        }

        setLive(liveResponse);
        setConfig(configResponse);
        setSubmissions(listResponse ?? []);
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
  const mainDisplayLabel = useMemo(() => config ? resolveMainDisplayFieldLabel(config) : 'メイン表示', [config]);
  const duplicateSongs = useMemo(() => collectDuplicateSongs(Object.values(detailsById)), [detailsById]);
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) {
      return submissions;
    }
    const query = searchQuery.trim().toLowerCase();
    return submissions.filter((submission) => submission.bandName.toLowerCase().includes(query));
  }, [searchQuery, submissions]);

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">提出情報を読み込み中です...</div>;
  }

  if (!live) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const selectedSubmission = filteredSubmissions.find((submission) => submission.id === selectedSubmissionId)
    ?? submissions.find((submission) => submission.id === selectedSubmissionId)
    ?? null;
  const selectedDetail = selectedSubmission ? detailsById[selectedSubmission.id] ?? null : null;
  const sharedListUrl = `${window.location.origin}/public/lives/${live.publicToken}/submissions/shared`;
  const buildEditFormUrl = (submissionId: string) => `${window.location.origin}/public/lives/${live.publicToken}/submissions/${submissionId}`;

  const openDetail = async (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setIsDetailDialogOpen(true);
    if (detailsById[submissionId]) {
      return;
    }
    try {
      const detail = await apiClient.get<PublicSettingSheetSubmissionDetailResponse>(`/lives/${liveId}/setting-sheet/submissions/${submissionId}`);
      if (detail) {
        setDetailsById((current) => ({ ...current, [submissionId]: detail }));
      }
    } catch {
      toast.error('提出詳細の取得に失敗しました', { position: 'top-center' });
    }
  };

  const analyzeDuplicates = async () => {
    setIsAnalyzingDuplicates(true);
    try {
      const missingIds = submissions.map((submission) => submission.id).filter((id) => !detailsById[id]);
      if (missingIds.length > 0) {
        const detailPairs = await Promise.all(
          missingIds.map(async (id) => {
            const detail = await apiClient.get<PublicSettingSheetSubmissionDetailResponse>(`/lives/${liveId}/setting-sheet/submissions/${id}`);
            return detail ? [id, detail] : null;
          }),
        );
        const loaded = Object.fromEntries(detailPairs.filter((pair): pair is [string, PublicSettingSheetSubmissionDetailResponse] => pair !== null));
        setDetailsById((current) => ({ ...current, ...loaded }));
      }
    } catch {
      toast.error('曲の被り解析に失敗しました', { position: 'top-center' });
    } finally {
      setIsAnalyzingDuplicates(false);
    }
  };

  const copySharedLink = async () => {
    try {
      await navigator.clipboard.writeText(sharedListUrl);
      toast.success('共有リンクをコピーしました', { position: 'top-center' });
    } catch {
      toast.error('リンクのコピーに失敗しました', { position: 'top-center' });
    }
  };


  const toEditForm = async (submissionId: string) => {
    const editFormUrl = buildEditFormUrl(submissionId);
    try {
      await navigator.clipboard.writeText(editFormUrl);
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
              <p className="text-sm text-muted-foreground">{live.name} / {formatLiveDate(live.date)} / 全{submissions.length}件</p>
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
              <p className="text-sm text-muted-foreground">候補だけを先に一覧化して確認できます。</p>
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
              <Button variant="outline" size="sm" onClick={analyzeDuplicates} disabled={isAnalyzingDuplicates || submissions.length === 0}>
                {isAnalyzingDuplicates ? '解析中...' : '被り候補を解析'}
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
                    <TableHead>重複バンド</TableHead>
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
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-8" placeholder="バンド名で検索" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する提出はありません。</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{mainDisplayLabel}</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>提出日時</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.bandName}</TableCell>
                      <TableCell><Badge variant="secondary">{submission.submissionStatus}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{formatSubmittedAt(submission.submittedAt)}</TableCell>
                      <TableCell className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => openDetail(submission.id)}>詳細</Button>
                        <Button variant="outline" size="sm" onClick={() => toEditForm(submission.id)}><Copy/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            {!selectedSubmission ? (
              <p className="text-sm text-muted-foreground">提出を選択してください。</p>
            ) : !selectedDetail ? (
              <p className="text-sm text-muted-foreground">提出内容を読み込み中です...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{mainDisplayLabel}</p>
                  <p className="font-semibold">{selectedDetail.bandName}</p>
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
        existing.bands.add(submission.bandName);
      } else {
        songMap.set(song.key, { title: song.title, artist: song.artist, bands: new Set([submission.bandName]) });
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
