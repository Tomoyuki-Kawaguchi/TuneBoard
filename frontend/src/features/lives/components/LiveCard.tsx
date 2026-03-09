import { useState } from 'react';
import { CalendarDays, Copy, ExternalLink, MapPin, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { ConfirmButton } from '@/components/original/ConfirmButton';
import { InlineEditPanel } from '@/components/original/InlineEditPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import type { ApiClientError } from '@/lib/api/type';

import {
  buildPublicLiveUrl,
  createLiveFormFromResponse,
  formatDeadline,
  formatLiveDate,
  formatOptionalText,
  LIVE_STATUS_LABELS,
  LIVE_STATUS_OPTIONS,
  type LiveFormValues,
  type LiveResponse,
  toLiveUpdatePayload,
} from '../types/type';

interface LiveCardProps {
  live: LiveResponse;
  tenantId: string;
  onUpdateSuccess: (live: LiveResponse) => void;
  onDelete: (id: string) => void;
}

export const LiveCard = ({ live, tenantId, onUpdateSuccess, onDelete }: LiveCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<LiveFormValues>(() => createLiveFormFromResponse(live));

  const publicUrl = buildPublicLiveUrl(live.publicToken);

  const setFieldValue = (field: keyof LiveFormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: { ...prev[field], value, error: undefined },
    }));
  };

  const applyServerErrors = (error: ApiClientError) => {
    const serverFieldErrors = error.apiError?.fieldErrors;
    if (!serverFieldErrors) {
      return;
    }

    setFormValues((prev) => {
      const next = { ...prev } as LiveFormValues;
      const mutableFields = next as Record<keyof LiveFormValues, { value: string; error?: string }>;
      for (const [key, value] of Object.entries(serverFieldErrors)) {
        if (key in next) {
          const fieldKey = key as keyof LiveFormValues;
          mutableFields[fieldKey] = { ...mutableFields[fieldKey], error: value };
        }
      }
      return next;
    });
  };

  const onSubmit = () => {
    apiClient
      .post<LiveResponse>('/lives/update', {
        id: live.id,
        ...toLiveUpdatePayload(formValues),
      })
      .then((response) => {
        if (!response) {
          return;
        }

        onUpdateSuccess(response);
        setFormValues(createLiveFormFromResponse(response));
        setIsEditing(false);
        toast.success('ライブを更新しました', { position: 'top-center' });
      })
      .catch((error: ApiClientError) => {
        applyServerErrors(error);
      });
  };

  const handleDelete = () => {
    apiClient.post<void>('/lives/delete', { id: live.id }).then(() => {
      onDelete(live.id);
      toast.success('ライブを削除しました', { position: 'top-center' });
    }).catch(() => {
      toast.error('ライブの削除に失敗しました', { position: 'top-center' });
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success('公開URLをコピーしました', { position: 'top-center' });
  };

  const badgeVariant = live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary';

  return (
    <motion.div layout>
    <Card className={isEditing ? 'border-primary/30 shadow-md shadow-primary/5' : undefined}>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="break-words text-lg font-semibold sm:text-xl">{live.name}</h3>
              <Badge variant={badgeVariant}>{LIVE_STATUS_LABELS[live.status]}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button className="w-full sm:w-auto" type="button" variant="outline" size="sm" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="size-4" />
              公開ページ
            </Button>
            <Button asChild className="w-full sm:w-auto" type="button" variant="outline" size="sm">
              <Link to={`/tenants/${tenantId}/lives/${live.id}`}>
                <Settings2 className="size-4" />
                管理
              </Link>
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="size-4" />
              URLコピー
            </Button>
            <Button className="col-span-2 w-full sm:col-span-1 sm:w-auto" type="button" variant='outline' size="sm" onClick={() => setIsEditing((prev) => !prev)}>
              {isEditing ? 'キャンセル' : '編集'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="min-w-0 break-words">{formatLiveDate(live.date)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
            <MapPin className="size-4 text-muted-foreground" />
            <span className="min-w-0 break-words">{formatOptionalText(live.location)}</span>
          </div>
        </div>
        <div className="rounded-md border px-3 py-2 text-sm">
          <p className="font-medium">回答締切</p>
          <p className="text-muted-foreground">{formatDeadline(live.deadlineAt)}</p>
        </div>
        <div className="rounded-md border px-3 py-2 text-sm">
          <p className="font-medium">公開URL</p>
          <p className="break-all text-muted-foreground">{publicUrl}</p>
        </div>
      </CardContent>

      <InlineEditPanel open={isEditing} >
          <motion.div layout className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`name-${live.id}`}>ライブ名<span className="text-red-500">*</span></FieldLabel>
                <Input id={`name-${live.id}`} value={formValues.name.value} onChange={(event) => setFieldValue('name', event.target.value)} />
                {formValues.name.error ? <FieldError>{formValues.name.error}</FieldError> : null}
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`date-${live.id}`}>開催日</FieldLabel>
                  <Input id={`date-${live.id}`} type="date" value={formValues.date.value} onChange={(event) => setFieldValue('date', event.target.value)} />
                  {formValues.date.error ? <FieldError>{formValues.date.error}</FieldError> : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor={`deadline-${live.id}`}>回答締切</FieldLabel>
                  <Input
                    id={`deadline-${live.id}`}
                    type="datetime-local"
                    value={formValues.deadlineAt.value}
                    onChange={(event) => setFieldValue('deadlineAt', event.target.value)}
                  />
                  {formValues.deadlineAt.error ? <FieldError>{formValues.deadlineAt.error}</FieldError> : null}
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <Field>
                  <FieldLabel htmlFor={`location-${live.id}`}>会場</FieldLabel>
                  <Input id={`location-${live.id}`} value={formValues.location.value} onChange={(event) => setFieldValue('location', event.target.value)} />
                  {formValues.location.error ? <FieldError>{formValues.location.error}</FieldError> : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor={`status-${live.id}`}>公開状態</FieldLabel>
                  <Select value={formValues.status.value} onValueChange={(value) => setFieldValue('status', value)}>
                    <SelectTrigger id={`status-${live.id}`} className="w-full">
                      <SelectValue placeholder="状態を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIVE_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formValues.status.error ? <FieldError>{formValues.status.error}</FieldError> : null}
                </Field>
              </div>
            </FieldGroup>

            <div className="flex border-t pt-2 gap-2 justify-end">
              <ConfirmButton onClick={onSubmit}>更新</ConfirmButton>
              <ConfirmButton onClick={handleDelete} defaultVariant="outline" confirmVariant="destructive">
                削除
              </ConfirmButton>
            </div>
          </motion.div>
      </InlineEditPanel>
    </Card>
    </motion.div>
  );
};