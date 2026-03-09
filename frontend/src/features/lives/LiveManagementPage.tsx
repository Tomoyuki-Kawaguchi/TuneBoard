import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, Link2, MapPin, Settings2 } from 'lucide-react';
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
import { buildPublicLiveUrl, formatDeadline, formatLiveDate, formatOptionalText, LIVE_STATUS_LABELS, type LiveResponse } from './types/type';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';

export const LiveManagementPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!liveId) {
      return;
    }

    apiClient
      .get<LiveResponse>(`/lives/${liveId}`)
      .then((response) => {
        if (response) {
          setLive(response);
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
  const badgeVariant = live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary';

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
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Link2 className="size-4" />
                公開フォームを開く
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};