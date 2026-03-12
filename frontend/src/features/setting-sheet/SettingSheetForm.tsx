import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Copy, Plus, Send, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  formatDeadline,
  formatLiveDate,
  formatOptionalText,
  isSectionBlock,
  isOptionBlock,
  isRepeatableGroupBlock,
  LIVE_STATUS_LABELS,
  type PublicLiveResponse,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetOptionSource,
} from '@/features/lives/types/type';
import { cn } from '@/lib/utils';

import {
  cloneGroupItemValue,
  createGroupItemValue,
  createSettingSheetFieldValue,
  fieldIdFromKey,
  resolveOptionSourceValues,
  type SettingSheetFieldValue,
  type SettingSheetGroupItemValue,
} from './types';
import { appearanceClass, fieldWidthClass, formatGroupItemTitle, moveItem, optionLayoutClass } from './SettingSheetForm.helpers';
import { useSettingSheetForm } from './useSettingSheetForm';

interface SettingSheetFormProps {
  publicToken: string;
  live: PublicLiveResponse;
  submission: PublicSettingSheetSubmissionDetailResponse | null;
}

export const SettingSheetForm = ({ publicToken, live, submission }: SettingSheetFormProps) => {
  const navigate = useNavigate();
  const {
    errorMap,
    focusIssue,
    formValues,
    handleSubmit,
    isSubmitting,
    issues,
    setFormValues,
    settingSheetConfig,
    updateScopedAnswers,
  } = useSettingSheetForm({
    publicToken,
    live,
    submission,
    onSubmitted: (submissionId) => navigate(`/public/lives/${publicToken}/submissions/${submissionId}`, { replace: true }),
  });

  const resolveOptions = (block: SettingSheetBlock) => {
    if (!block.optionSource) {
      return block.options;
    }
    return resolveOptionSourceValues(settingSheetConfig.blocks, formValues.answers, block.optionSource as SettingSheetOptionSource);
  };

  const renderField = (
    block: SettingSheetBlock,
    scopedAnswers: Record<string, SettingSheetFieldValue>,
    pathPrefix: string,
    setScopedAnswer: (blockId: string, nextValue: SettingSheetFieldValue) => void,
  ) => {
    if (block.hidden) {
      return null;
    }

    const fieldValue = scopedAnswers[block.id] ?? createSettingSheetFieldValue(block);
    const pathKey = `${pathPrefix}${block.id}`;
    const inputId = fieldIdFromKey(pathKey);
    const values = fieldValue.values;
    const firstValue = values[0] ?? '';
    const options = isOptionBlock(block.type) ? resolveOptions(block) : [];

    if (isSectionBlock(block.type)) {
      return (
        <section key={block.id} className={`${appearanceClass(block.appearance, 'section')} ${fieldWidthClass(block.layout.width)}`}>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{block.label}</h2>
          {block.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{block.description}</p> : null}
          {block.fields.length > 0 ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-6">
              {block.fields.map((child) => (
                <Fragment key={child.id}>
                  {renderField(child, scopedAnswers, pathPrefix, setScopedAnswer)}
                </Fragment>
              ))}
            </div>
          ) : null}
        </section>
      );
    }

    if (isRepeatableGroupBlock(block.type)) {
      return renderGroupBlock(block, fieldValue, pathKey, (nextValue) => setScopedAnswer(block.id, nextValue));
    }

    return (
      <section key={pathKey} className={`${appearanceClass(block.appearance, 'field')} ${fieldWidthClass(block.layout.width)}`}>
        <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {block.label}
          {block.required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        {block.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{block.description}</p> : null}

        {block.type === 'SHORT_TEXT' ? (
          <Input id={inputId} value={firstValue} onChange={(event) => setScopedAnswer(block.id, { values: event.target.value.trim() ? [event.target.value] : [], items: [] })} className="mt-3" />
        ) : null}

        {block.type === 'LONG_TEXT' ? (
          <Textarea id={inputId} value={firstValue} onChange={(event) => setScopedAnswer(block.id, { values: event.target.value.trim() ? [event.target.value] : [], items: [] })} rows={5} className="mt-3" />
        ) : null}

        {block.type === 'SINGLE_SELECT' ? (
          <Select value={firstValue || undefined} onValueChange={(value) => setScopedAnswer(block.id, { values: value ? [value] : [], items: [] })}>
            <SelectTrigger id={inputId} className="mt-3 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}

        {block.type === 'MULTI_SELECT' || block.type === 'CHECKBOX' ? (
          <div id={inputId} className={`mt-3 ${optionLayoutClass(block.layout.optionColumns, block.layout.optionFitContent)}`}>
            {options.map((option) => {
              const checked = values.includes(option);
              return (
                <Label key={option} className={cn(
                  'flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                  block.layout.optionFitContent ? 'w-fit min-w-0' : '',
                )}>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) => setScopedAnswer(block.id, {
                      values: nextChecked === true ? [...values, option] : values.filter((value) => value !== option),
                      items: [],
                    })}
                  />
                  <span>{option}</span>
                </Label>
              );
            })}
            {options.length === 0 ? <p className="text-sm text-muted-foreground">まだ選択肢がありません。</p> : null}
          </div>
        ) : null}

        {block.type === 'BOOLEAN' ? (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Label htmlFor={inputId} className="text-sm font-medium text-foreground">チェックする</Label>
            <Switch id={inputId} checked={firstValue === 'true'} onCheckedChange={(checked) => setScopedAnswer(block.id, { values: checked ? ['true'] : [], items: [] })} />
          </div>
        ) : null}

        {errorMap[pathKey] ? <p className="mt-2 text-sm text-destructive">{errorMap[pathKey]}</p> : null}
      </section>
    );
  };

  const renderGroupItem = (
    block: SettingSheetBlock,
    item: SettingSheetGroupItemValue,
    itemIndex: number,
    pathKey: string,
    groupValue: SettingSheetFieldValue,
    setFieldValue: (nextValue: SettingSheetFieldValue) => void,
  ) => {
    const resolveItemTitle = () => {
      const fallback = `${block.entryTitle || '項目'} ${itemIndex + 1}`;
      if (!block.titleSourceFieldId) {
        return fallback;
      }

      const sourceBlock = block.fields.find((field) => field.id === block.titleSourceFieldId);
      const sourceValue = item.answers[block.titleSourceFieldId];
      if (!sourceBlock || !sourceValue) {
        return fallback;
      }

      const normalized = sourceValue.values.map((value) => value.trim()).filter(Boolean);
      if (normalized.length === 0) {
        return fallback;
      }

      return formatGroupItemTitle(sourceBlock.type === 'MULTI_SELECT' ? normalized.join(' / ') : normalized[0]);
    };

    const itemTitle = resolveItemTitle();

    const updateItem = (nextItem: SettingSheetGroupItemValue) => {
      setFieldValue({
        values: [],
        items: groupValue.items.map((currentItem, index) => index === itemIndex ? nextItem : currentItem),
      });
    };

    const content = (
      <div className="grid gap-4 px-4 py-4 sm:px-5 xl:grid-cols-6">
        {block.fields.map((child) => renderField(
          child,
          item.answers,
          `${pathKey}.items[${itemIndex}].answers.`,
          (childId, nextChildValue) => updateItem({
            ...item,
            answers: updateScopedAnswers(item.answers, childId, nextChildValue),
          }),
        ))}
      </div>
    );

    return (
      <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className={appearanceClass(block.itemAppearance, 'group-item')}>
        {block.collapsible ? (
          <Accordion type="single" collapsible className="w-full" defaultValue={undefined}>
            <AccordionItem value={`${pathKey}-${item.id}`} className="border-none">
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <AccordionTrigger className="min-w-0 flex-1 py-0 text-left hover:no-underline">
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold text-foreground">{itemTitle}</p>
                      <p className="text-xs text-muted-foreground">{block.entryTitle || '項目'} {itemIndex + 1}</p>
                    </div>
                  </AccordionTrigger>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: moveItem(groupValue.items, itemIndex, 'up') })} disabled={itemIndex === 0}>
                      <ArrowUp className="size-4" />
                      上へ
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: moveItem(groupValue.items, itemIndex, 'down') })} disabled={itemIndex === groupValue.items.length - 1}>
                      <ArrowDown className="size-4" />
                      下へ
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: [...groupValue.items, cloneGroupItemValue(block.fields, item)] })}>
                      <Copy className="size-4" />
                      複製
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: groupValue.items.filter((_, index) => index !== itemIndex) })}>
                      <Trash2 className="size-4" />
                      削除
                    </Button>
                  </div>
                </div>
              </div>
              <AccordionContent>{content}</AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <>
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{itemTitle}</p>
                  <p className="text-xs text-muted-foreground">{block.entryTitle || '項目'} {itemIndex + 1}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: moveItem(groupValue.items, itemIndex, 'up') })} disabled={itemIndex === 0}>
                    <ArrowUp className="size-4" />
                    上へ
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: moveItem(groupValue.items, itemIndex, 'down') })} disabled={itemIndex === groupValue.items.length - 1}>
                    <ArrowDown className="size-4" />
                    下へ
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: [...groupValue.items, cloneGroupItemValue(block.fields, item)] })}>
                    <Copy className="size-4" />
                    複製
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: groupValue.items.filter((_, index) => index !== itemIndex) })}>
                    <Trash2 className="size-4" />
                    削除
                  </Button>
                </div>
              </div>
            </div>
            {content}
          </>
        )}
      </motion.div>
    );
  };

  const renderGroupBlock = (
    block: SettingSheetBlock,
    fieldValue: SettingSheetFieldValue,
    pathKey: string,
    setFieldValue: (nextValue: SettingSheetFieldValue) => void,
  ) => {
    return (
      <section key={pathKey} className={`${appearanceClass(block.appearance, 'group')} ${fieldWidthClass(block.layout.width)}`}>
        <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5 sm:pt-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-medium text-foreground">
              {block.label}
              {block.required ? <span className="ml-1 text-destructive">*</span> : null}
            </h2>
            {block.description ? <p className="mt-1 text-sm text-muted-foreground">{block.description}</p> : null}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setFieldValue({ values: [], items: [...fieldValue.items, createGroupItemValue(block.fields)] })} className="w-full md:w-auto">
            <Plus className="size-4" />
            {block.addButtonLabel || '項目を追加'}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          <motion.div layout className="space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            {fieldValue.items.map((item, itemIndex) => renderGroupItem(block, item, itemIndex, pathKey, fieldValue, setFieldValue))}
          </motion.div>
        </AnimatePresence>
        {fieldValue.items.length === 0 ? <p className="mx-4 mb-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground sm:mx-5 sm:mb-5">まだ入力項目がありません。追加ボタンから作成してください。</p> : null}

        {errorMap[`${pathKey}.items`] ? <p className="mt-3 text-sm text-destructive">{errorMap[`${pathKey}.items`]}</p> : null}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden border-border bg-card text-card-foreground">
            <CardHeader className="space-y-5 pb-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">TuneBoard Setting Sheet</p>
                <Badge variant={live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                  {LIVE_STATUS_LABELS[live.status]}
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl">{live.name}</h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{settingSheetConfig.title}</p>
                {settingSheetConfig.description ? <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{settingSheetConfig.description}</p> : null}
              </div>
              <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
                <div>
                  <p className="text-muted-foreground">開催日</p>
                  <p className="mt-1 font-medium text-card-foreground">{formatLiveDate(live.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">会場</p>
                  <p className="mt-1 font-medium text-card-foreground">{formatOptionalText(live.location)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">回答締切</p>
                  <p className="mt-1 font-medium text-card-foreground">{formatDeadline(live.deadlineAt)}</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </aside>

        <main className="space-y-6">
          {issues.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>入力内容に問題があります</AlertTitle>
              <AlertDescription>
                <ul className="space-y-2">
                  {issues.map((issue) => (
                    <li key={issue.key}>
                      <button type="button" onClick={() => focusIssue(issue)} className="text-left underline underline-offset-4">
                        {issue.label}: {issue.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-5">
              <div>
                <h2 className="text-xl font-semibold text-card-foreground">セッティングシート回答</h2>
                <p className="mt-1 text-sm text-muted-foreground">{submission ? '提出済みの内容を編集して更新できます。' : '各項目に回答して送信してください。'}</p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6 xl:grid-cols-6">
              {settingSheetConfig.blocks.map((block) => (
                <Fragment key={block.id}>
                  {renderField(
                    block,
                    formValues.answers,
                    'answers.',
                    (blockId, nextValue) => setFormValues((current) => ({
                      ...current,
                      answers: updateScopedAnswers(current.answers, blockId, nextValue),
                    })),
                  )}
                </Fragment>
              ))}
            </CardContent>
          </Card>

          <div className="sticky bottom-4 flex justify-end">
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full px-6 sm:w-auto">
              <Send className="size-4" />
              {isSubmitting ? (submission ? '更新中...' : '送信中...') : (submission ? '更新する' : settingSheetConfig.submitButtonLabel)}
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};
