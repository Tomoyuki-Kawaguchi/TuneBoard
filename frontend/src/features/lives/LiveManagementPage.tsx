import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, Copy, ExternalLink, FileCheck2, Link2, MapPin, Settings2, Wrench } from 'lucide-react';
import { toast } from 'sonner';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  buildPublicLiveUrl,
  formatDeadline,
  formatLiveDate,
  formatOptionalText,
  LIVE_STATUS_LABELS,
  normalizeSettingSheetConfig,
  type LiveResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from './types/type';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';

export const LiveManagementPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);

  useEffect(() => {
    if (!liveId) {
      return;
    }

    apiClient.get<LiveResponse>(`/lives/${liveId}`)
      .then((liveResponse) => {
        if (liveResponse) {
          setLive(liveResponse);
        }
        return apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`);
      })
      .then((configResponse) => {
        if (configResponse) {
          setConfig(normalizeSettingSheetConfig(configResponse));
        }
      })
      .catch(() => {
        toast.error('ライブ情報の取得に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [liveId]);

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">ライブ情報を読み込み中です...</div>;
  }

  if (!live) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const publicUrl = buildPublicLiveUrl(live.publicToken);
  const publicSubmissionListUrl = `${window.location.origin}/public/lives/${live.publicToken}/submissions/shared`;
  const badgeVariant = live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary';
  const visibilityTargets = config ? flattenVisibilityTargets(config.blocks) : [];

  const updateTargetVisibility = (blockId: string, field: 'publicVisible' | 'hidden', nextValue: boolean) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        blocks: updateBlockVisibilityTree(current.blocks, blockId, field, nextValue),
      };
    });
  };

  const togglePublicSubmissionEnabled = (nextValue: boolean) => {
    setConfig((current) => (current ? { ...current, publicSubmissionEnabled: nextValue } : current));
  };

  const saveVisibility = () => {
    if (!config) {
      return;
    }
    setIsSavingVisibility(true);
    apiClient.post<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`, config)
      .then((response) => {
        if (response) {
          setConfig(normalizeSettingSheetConfig(response));
        }
        toast.success('公開共有の表示項目を更新しました', { position: 'top-center' });
      })
      .catch(() => {
        toast.error('公開共有の表示項目更新に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsSavingVisibility(false);
      });
  };

  const copySharedListLink = async () => {
    try {
      await navigator.clipboard.writeText(publicSubmissionListUrl);
      toast.success('共有一覧リンクをコピーしました', { position: 'top-center' });
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
            <BreadcrumbPage>{live.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{live.name}</h1>
                <Badge variant={badgeVariant}>{LIVE_STATUS_LABELS[live.status]}</Badge>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to={`/tenants/${tenantId}/lives`}>
                <ChevronLeft className="size-4" />
                ライブ一覧へ戻る
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
              <CalendarDays className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">開催日</p>
                <p className="font-medium">{formatLiveDate(live.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
              <MapPin className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">会場</p>
                <p className="font-medium">{formatOptionalText(live.location)}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border px-4 py-3">
              <p className="text-sm text-muted-foreground">回答締切</p>
              <p className="font-medium">{formatDeadline(live.deadlineAt)}</p>
            </div>
            <div className="rounded-lg border px-4 py-3">
              <p className="text-sm text-muted-foreground">公開URL</p>
              <p className="break-all font-medium">{publicUrl}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="size-5" />
            <h2 className="text-lg font-semibold">ライブ管理</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>フォーム構成は別ページのビルダーで自由に組み立てます。現在の高機能バンド申請フォームもテンプレートとして適用できます。</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Link2 className="size-4" />
                公開フォームを開く
              </a>
            </Button>
            <Button asChild>
              <Link to={`/tenants/${tenantId}/lives/${liveId}/form`}>
                <Wrench className="size-4" />
                ライブフォーム作成
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={`/tenants/${tenantId}/lives/${liveId}/submissions`}>
                <FileCheck2 className="size-4" />
                提出確認
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={publicSubmissionListUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                共有提出一覧を開く
              </a>
            </Button>
            <Button variant="outline" onClick={copySharedListLink}>
              <Copy className="size-4" />
              共有提出一覧リンクをコピー
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">公開・非表示設定</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">提出済みデータを公開する</p>
                <p className="text-xs text-muted-foreground">OFF の場合、共有提出一覧ページは非公開になります。</p>
              </div>
              <Switch checked={config?.publicSubmissionEnabled === true} onCheckedChange={togglePublicSubmissionEnabled} />
            </div>
          </div>
          <div className="space-y-2">
            {visibilityTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">表示対象の項目がありません。</p>
            ) : visibilityTargets.map((target) => (
              <div key={target.id} className="space-y-2 rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{target.label}</p>
                  <p className="text-xs text-muted-foreground">{target.path}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {target.canControlPublicVisible ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={target.publicVisible} onCheckedChange={(checked) => updateTargetVisibility(target.id, 'publicVisible', checked)} />
                      共有ページで表示
                    </label>
                  ) : (
                    <span className="text-xs text-muted-foreground">セクションは共有表示対象外です</span>
                  )}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={target.hidden} onCheckedChange={(checked) => updateTargetVisibility(target.id, 'hidden', checked)} />
                    フォームで非表示
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={saveVisibility} disabled={isSavingVisibility}>{isSavingVisibility ? '保存中...' : '設定を保存する'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function flattenVisibilityTargets(blocks: SettingSheetBlock[], parentLabel = '') {
  const targets: Array<{ id: string; label: string; path: string; publicVisible: boolean; hidden: boolean; canControlPublicVisible: boolean }> = [];
  for (const block of blocks) {
    const path = parentLabel ? `${parentLabel} / ${block.label}` : block.label;
    targets.push({
      id: block.id,
      label: block.label,
      path,
      publicVisible: block.publicVisible === true,
      hidden: block.hidden === true,
      canControlPublicVisible: block.type !== 'SECTION',
    });
    if (block.fields.length > 0) {
      targets.push(...flattenVisibilityTargets(block.fields, path));
    }
  }
  return targets;
}

function updateBlockVisibilityTree(
  blocks: SettingSheetBlock[],
  blockId: string,
  field: 'publicVisible' | 'hidden',
  nextValue: boolean,
): SettingSheetBlock[] {
  return blocks.map((block) => {
    const nextFields = block.fields.length > 0 ? updateBlockVisibilityTree(block.fields, blockId, field, nextValue) : block.fields;
    if (block.id === blockId) {
      return { ...block, [field]: nextValue, fields: nextFields };
    }
    if (nextFields !== block.fields) {
      return { ...block, fields: nextFields };
    }
    return block;
  });
}