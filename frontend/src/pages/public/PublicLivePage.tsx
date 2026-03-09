import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

import { formatDeadline, formatLiveDate, formatOptionalText, LIVE_STATUS_LABELS, type PublicLiveResponse } from '@/features/lives/types/type';

export const PublicLivePage = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [live, setLive] = useState<PublicLiveResponse | null>(null);
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
      .then((response) => {
        if (!response) {
          setErrorMessage('公開ライブが見つかりません');
          return;
        }

        setLive(response);
      })
      .catch(() => {
        setErrorMessage('公開ライブが見つかりません');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [publicToken]);

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

  const badgeVariant = live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary';

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">TuneBoard Live</p>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h1 className="text-3xl font-semibold">{live.name}</h1>
              <Badge variant={badgeVariant}>{LIVE_STATUS_LABELS[live.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              このページは公開ライブ情報です。セッティングシート入力フォームは今後ここに接続できます。
            </p>
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
            <div className="rounded-lg border px-4 py-3">
              <p className="text-sm text-muted-foreground">回答締切</p>
              <p className="font-medium">{formatDeadline(live.deadlineAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};