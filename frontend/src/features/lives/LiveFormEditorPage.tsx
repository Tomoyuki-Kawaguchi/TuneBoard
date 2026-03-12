import { Fragment, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronLeft, Plus, RotateCcw, Save, Sparkles, Trash2, Wrench } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';

import {
  canUseAsTitleSourceBlock,
  canAddBlock,
  canContainBlocks,
  createBlockTemplate,
  createEmptySettingSheetConfig,
  createTemplateSettingSheetConfig,
  isInputBlock,
  isOptionBlock,
  isRepeatableGroupBlock,
  isSectionBlock,
  isTextBlock,
  normalizeSettingSheetConfig,
  SETTING_SHEET_APPEARANCE_OPTIONS,
  SETTING_SHEET_BLOCK_OPTIONS,
  type LiveResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetOptionSource,
} from './types/type';

const moveBlock = (blocks: SettingSheetBlock[], blockIndex: number, direction: 'up' | 'down') => {
  const targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
  if (targetIndex < 0 || targetIndex >= blocks.length) {
    return blocks;
  }

  const next = [...blocks];
  [next[blockIndex], next[targetIndex]] = [next[targetIndex], next[blockIndex]];
  return next;
};

const widthOptions = [
  { value: 'full', label: '横幅いっぱい' },
  { value: 'two-thirds', label: '3カラム中2つ分' },
  { value: 'half', label: '2列の1カラム' },
  { value: 'third', label: '3カラム中1つ分' },
] as const;

const optionColumnOptions = [1, 2, 3];

const updateBlockTree = (blocks: SettingSheetBlock[], blockId: string, updater: (block: SettingSheetBlock) => SettingSheetBlock): SettingSheetBlock[] => {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return updater(block);
    }
    if (!canContainBlocks(block.type)) {
      return block;
    }
    return {
      ...block,
      fields: updateBlockTree(block.fields, blockId, updater),
    };
  });
};

const removeBlockTree = (blocks: SettingSheetBlock[], blockId: string): SettingSheetBlock[] => {
  return blocks
    .filter((block) => block.id !== blockId)
    .map((block) => canContainBlocks(block.type) ? { ...block, fields: removeBlockTree(block.fields, blockId) } : block);
};

const insertChildBlock = (blocks: SettingSheetBlock[], parentId: string | null, insertIndex: number, child: SettingSheetBlock): SettingSheetBlock[] => {
  if (!parentId) {
    const next = [...blocks];
    next.splice(insertIndex, 0, child);
    return next;
  }

  return blocks.map((block) => {
    if (block.id === parentId && canContainBlocks(block.type)) {
      const nextFields = [...block.fields];
      nextFields.splice(insertIndex, 0, child);
      return { ...block, fields: nextFields };
    }
    if (!canContainBlocks(block.type)) {
      return block;
    }
    return { ...block, fields: insertChildBlock(block.fields, parentId, insertIndex, child) };
  });
};

const moveBlockTree = (blocks: SettingSheetBlock[], parentId: string | null, blockIndex: number, direction: 'up' | 'down'): SettingSheetBlock[] => {
  if (!parentId) {
    return moveBlock(blocks, blockIndex, direction);
  }

  return blocks.map((block) => {
    if (block.id === parentId && canContainBlocks(block.type)) {
      return { ...block, fields: moveBlock(block.fields, blockIndex, direction) };
    }
    if (!canContainBlocks(block.type)) {
      return block;
    }
    return { ...block, fields: moveBlockTree(block.fields, parentId, blockIndex, direction) };
  });
};

const getSiblingCount = (blocks: SettingSheetBlock[], parentId: string | null): number => {
  if (!parentId) {
    return blocks.length;
  }

  for (const block of blocks) {
    if (block.id === parentId && canContainBlocks(block.type)) {
      return block.fields.length;
    }
    if (canContainBlocks(block.type)) {
      const nested = getSiblingCount(block.fields, parentId);
      if (nested >= 0) {
        return nested;
      }
    }
  }

  return -1;
};

const collectOptionSourceCandidates = (blocks: SettingSheetBlock[], trail: string[] = []) => {
  const candidates: Array<{ value: string; label: string }> = [];

  for (const block of blocks) {
    const nextTrail = [...trail, block.label];
    if (isRepeatableGroupBlock(block.type)) {
      for (const child of block.fields) {
        if (isInputBlock(child.type) && !isRepeatableGroupBlock(child.type)) {
          candidates.push({
            value: `${block.id}:${child.id}`,
            label: `${nextTrail.join(' / ')} -> ${child.label}`,
          });
        }
      }
      candidates.push(...collectOptionSourceCandidates(block.fields, nextTrail));
    } else if (isSectionBlock(block.type)) {
      candidates.push(...collectOptionSourceCandidates(block.fields, nextTrail));
    }
  }

  return candidates;
};

const collectTitleSourceCandidates = (fields: SettingSheetBlock[]) => {
  return fields
    .filter((field) => canUseAsTitleSourceBlock(field.type))
    .map((field) => ({ value: field.id, label: field.label || field.id }));
};

const summarizeBlock = (block: SettingSheetBlock) => {
  if (isSectionBlock(block.type)) {
    return `${block.fields.length}件の子ブロック`;
  }
  if (isRepeatableGroupBlock(block.type)) {
    return `${block.fields.length}件の子フィールド`;
  }
  if (isOptionBlock(block.type)) {
    return block.optionSource ? '外部参照の選択肢' : `${block.options.length}件の選択肢`;
  }
  return block.description?.trim() || '単体入力フィールド';
};

const resolveSharedChildAppearance = (block: SettingSheetBlock) => {
  if (!canContainBlocks(block.type) || block.fields.length === 0) {
    return '';
  }

  const appearances = Array.from(new Set(block.fields.map((field) => field.appearance)));
  return appearances.length === 1 ? appearances[0] : '__mixed__';
};

const pickCompatibleChild = (block: SettingSheetBlock, nextType: SettingSheetBlock['type']) => {
  if (!canContainBlocks(block.type)) {
    return null;
  }

  if (block.titleSourceFieldId) {
    const preferred = block.fields.find((field) => field.id === block.titleSourceFieldId);
    if (preferred && (
      preferred.type === nextType
      || (isTextBlock(preferred.type) && isTextBlock(nextType))
      || (isOptionBlock(preferred.type) && isOptionBlock(nextType))
    )) {
      return preferred;
    }
  }

  return block.fields.find((field) => (
    field.type === nextType
    || (isTextBlock(field.type) && isTextBlock(nextType))
    || (isOptionBlock(field.type) && isOptionBlock(nextType))
  )) ?? null;
};

const convertBlockForType = (block: SettingSheetBlock, nextType: SettingSheetBlock['type']) => {
  const template = createBlockTemplate(nextType);

  if (block.type === nextType) {
    return { ...block };
  }

  if (!canContainBlocks(block.type) && canContainBlocks(nextType)) {
    const child = {
      ...block,
      itemAppearance: 'plain' as const,
      titleSourceFieldId: '',
      fields: [],
      minItems: 0,
      addButtonLabel: '',
      entryTitle: '',
    };

    return {
      ...template,
      id: block.id,
      label: block.label,
      description: block.description,
      hidden: block.hidden,
      required: block.required,
      appearance: block.appearance,
      itemAppearance: nextType === 'REPEATABLE_GROUP'
        ? ((block.appearance === 'plain' ? 'outline' : block.appearance) as SettingSheetBlock['appearance'])
        : 'plain',
      layout: { ...template.layout, width: block.layout.width },
      titleSourceFieldId: nextType === 'REPEATABLE_GROUP' && canUseAsTitleSourceBlock(child.type) ? child.id : '',
      fields: [child],
    };
  }

  if (canContainBlocks(block.type) && !canContainBlocks(nextType)) {
    const compatibleChild = pickCompatibleChild(block, nextType);
    if (compatibleChild) {
      return {
        ...template,
        id: block.id,
        label: block.label,
        description: block.description,
        hidden: block.hidden,
        required: block.required,
        appearance: compatibleChild.appearance,
        options: isOptionBlock(nextType) ? [...compatibleChild.options] : [],
        layout: {
          ...template.layout,
          width: block.layout.width,
          optionColumns: isOptionBlock(nextType) ? compatibleChild.layout.optionColumns : template.layout.optionColumns,
          optionFitContent: isOptionBlock(nextType) ? compatibleChild.layout.optionFitContent : false,
        },
        optionSource: isOptionBlock(nextType) ? compatibleChild.optionSource : null,
      };
    }

    return {
      ...template,
      id: block.id,
      label: block.label,
      description: block.description,
      hidden: block.hidden,
      required: block.required,
      appearance: block.appearance,
      layout: { ...template.layout, width: block.layout.width },
    };
  }

  if (canContainBlocks(block.type) && canContainBlocks(nextType)) {
    return {
      ...template,
      id: block.id,
      label: block.label,
      description: block.description,
      hidden: block.hidden,
      required: nextType === 'REPEATABLE_GROUP' ? block.required : false,
      appearance: block.appearance,
      itemAppearance: nextType === 'REPEATABLE_GROUP' ? block.itemAppearance : 'plain',
      collapsible: nextType === 'REPEATABLE_GROUP' ? block.collapsible : false,
      minItems: nextType === 'REPEATABLE_GROUP' ? block.minItems : 0,
      addButtonLabel: nextType === 'REPEATABLE_GROUP' ? block.addButtonLabel : '',
      entryTitle: nextType === 'REPEATABLE_GROUP' ? block.entryTitle : '',
      titleSourceFieldId: nextType === 'REPEATABLE_GROUP' ? block.titleSourceFieldId : '',
      fields: block.fields,
      layout: { ...template.layout, width: block.layout.width },
    };
  }

  return {
    ...template,
    id: block.id,
    label: block.label,
    description: block.description,
    hidden: block.hidden,
    required: block.required,
    appearance: block.appearance,
    layout: {
      ...template.layout,
      width: block.layout.width,
      optionColumns: isOptionBlock(nextType) && isOptionBlock(block.type) ? block.layout.optionColumns : template.layout.optionColumns,
      optionFitContent: isOptionBlock(nextType) && isOptionBlock(block.type) ? block.layout.optionFitContent : false,
    },
    options: isOptionBlock(nextType) && isOptionBlock(block.type) ? [...block.options] : template.options,
    optionSource: isOptionBlock(nextType) && isOptionBlock(block.type) ? block.optionSource : null,
  };
};

export const LiveFormEditorPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!liveId) {
      return;
    }

    Promise.all([
      apiClient.get<LiveResponse>(`/lives/${liveId}`),
      apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
    ])
      .then(([liveResponse, configResponse]) => {
        if (liveResponse) {
          setLive(liveResponse);
        }
        setConfig(normalizeSettingSheetConfig(configResponse ?? null));
      })
      .catch(() => {
        toast.error('フォーム設定の読み込みに失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [liveId]);

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">フォーム設定を読み込み中です...</div>;
  }

  if (!live || !config) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const addableBlocks = SETTING_SHEET_BLOCK_OPTIONS.filter((option) => canAddBlock(config, option.value));
  const optionSourceCandidates = collectOptionSourceCandidates(config.blocks);

  const updateBlock = (blockId: string, patch: Partial<SettingSheetBlock>) => {
    setConfig((current) => current ? {
      ...current,
      blocks: updateBlockTree(current.blocks, blockId, (block) => {
        const nextBlock = { ...block, ...patch };
        if (nextBlock.type === 'SECTION') {
          return { ...nextBlock, required: false, collapsible: false, itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', optionSource: null };
        }
        if (isTextBlock(nextBlock.type)) {
          return { ...nextBlock, collapsible: false, itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], optionSource: null };
        }
        if (isOptionBlock(nextBlock.type)) {
          return { ...nextBlock, collapsible: false, itemAppearance: 'plain', minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [] };
        }
        if (nextBlock.type === 'BOOLEAN') {
          return { ...nextBlock, collapsible: false, itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], optionSource: null };
        }
        return { ...nextBlock, options: [], optionSource: null };
      }),
    } : current);
  };

  const applyAppearanceToGroupFields = (blockId: string, appearance: SettingSheetBlock['appearance']) => {
    setConfig((current) => current ? {
      ...current,
      blocks: updateBlockTree(current.blocks, blockId, (block) => {
        if (!canContainBlocks(block.type)) {
          return block;
        }
        return {
          ...block,
          fields: block.fields.map((field) => ({
            ...field,
            appearance,
          })),
        };
      }),
    } : current);
  };

  const saveConfig = () => {
    setIsSaving(true);
    apiClient
      .post<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`, config)
      .then((response) => {
        if (!response) {
          return;
        }

        setConfig(normalizeSettingSheetConfig(response));
        toast.success('フォーム設定を保存しました', { position: 'top-center' });
      })
      .catch(() => {
        toast.error('フォーム設定の保存に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const updateOptionSource = (blockId: string, value: string) => {
    const nextSource: SettingSheetOptionSource | null = value
      ? { blockId: value.split(':')[0], fieldId: value.split(':')[1] }
      : null;
    updateBlock(blockId, { optionSource: nextSource });
  };

  const changeBlockType = (blockId: string, nextType: SettingSheetBlock['type']) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      const nextConfig = {
        ...current,
        blocks: updateBlockTree(current.blocks, blockId, (block) => {
          return convertBlockForType(block, nextType);
        }),
      };

      return normalizeSettingSheetConfig(nextConfig);
    });
  };

  const insertBlock = (parentId: string | null, insertIndex: number, type: SettingSheetBlock['type']) => {
    setConfig((current) => current ? normalizeSettingSheetConfig({
      ...current,
      blocks: insertChildBlock(current.blocks, parentId, insertIndex, createBlockTemplate(type)),
    }) : current);
  };

  const renderBlockEditor = (block: SettingSheetBlock, index: number, parentId: string | null, depth = 0) => {
    const usesOptions = isOptionBlock(block.type);
    const usesRequired = isInputBlock(block.type) || isRepeatableGroupBlock(block.type);
    const usesChildren = canContainBlocks(block.type);
    const blockTypeLabel = SETTING_SHEET_BLOCK_OPTIONS.find((option) => option.value === block.type)?.label;
    const currentSourceValue = block.optionSource ? `${block.optionSource.blockId}:${block.optionSource.fieldId}` : '';
    const siblingCount = getSiblingCount(config.blocks, parentId);
    const titleSourceCandidates = isRepeatableGroupBlock(block.type) ? collectTitleSourceCandidates(block.fields) : [];
    const sharedChildAppearance = resolveSharedChildAppearance(block);

    return (
      <Accordion key={block.id} type="single" collapsible className="w-full" defaultValue={depth === 0 && index === 0 ? 'details' : undefined}>
        <div className="rounded-2xl border bg-background p-3 shadow-sm sm:p-4" style={{ marginLeft: depth * 12 }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{blockTypeLabel}</Badge>
              {isRepeatableGroupBlock(block.type) && block.titleSourceFieldId ? <Badge variant="outline">タイトル連動</Badge> : null}
              {block.hidden ? <Badge variant="outline">非表示</Badge> : null}
            </div>
            <div>
              <p className="text-sm font-medium">{index + 1}. {block.label || '無題のブロック'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summarizeBlock(block)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfig((current) => current ? { ...current, blocks: moveBlockTree(current.blocks, parentId, index, 'up') } : current)} disabled={index === 0}>
              <ArrowUp className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfig((current) => current ? { ...current, blocks: moveBlockTree(current.blocks, parentId, index, 'down') } : current)} disabled={index >= siblingCount - 1}>
              <ArrowDown className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfig((current) => current ? { ...current, blocks: removeBlockTree(current.blocks, block.id) } : current)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          </div>
          <AccordionItem value="details" className="mt-3 border-none">
            <AccordionTrigger className="rounded-xl border px-3 py-2 text-sm hover:bg-muted/40 hover:no-underline">
              ブロック設定を開く
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">入力タイプ</p>
                  <Select value={block.type} onValueChange={(value) => changeBlockType(block.id, value as SettingSheetBlock['type'])}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETTING_SHEET_BLOCK_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">見出し</p>
                  <Input value={block.label} onChange={(event) => updateBlock(block.id, { label: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">説明</p>
                  <Input value={block.description} onChange={(event) => updateBlock(block.id, { description: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">見た目</p>
                  <Select value={block.appearance} onValueChange={(value) => updateBlock(block.id, { appearance: value as SettingSheetBlock['appearance'] })}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETTING_SHEET_APPEARANCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="lg:col-span-2 rounded-xl border border-dashed p-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Checkbox checked={block.hidden} onCheckedChange={(checked) => updateBlock(block.id, { hidden: checked === true })} />
                    今はこのブロックを公開フォームで非表示にする
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">横幅</p>
                  <Select value={block.layout.width} onValueChange={(value) => updateBlock(block.id, { layout: { ...block.layout, width: value as SettingSheetBlock['layout']['width'] } })}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {widthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {usesOptions ? (
                  <div>
                    <p className="text-xs text-muted-foreground">選択肢カラム数</p>
                    <Select value={String(block.layout.optionColumns)} onValueChange={(value) => updateBlock(block.id, { layout: { ...block.layout, optionColumns: Number(value) } })}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {optionColumnOptions.map((count) => (
                          <SelectItem key={count} value={String(count)}>{count}列</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {isRepeatableGroupBlock(block.type) ? (
                  <Fragment>
                    <div>
                      <p className="text-xs text-muted-foreground">繰り返し項目の枠見た目</p>
                      <Select value={block.itemAppearance} onValueChange={(value) => updateBlock(block.id, { itemAppearance: value as SettingSheetBlock['appearance'] })}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SETTING_SHEET_APPEARANCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">項目タイトルの連動元</p>
                      <Select value={block.titleSourceFieldId || '__manual__'} onValueChange={(value) => updateBlock(block.id, { titleSourceFieldId: value === '__manual__' ? '' : value })}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__manual__">固定タイトルを使う</SelectItem>
                          {titleSourceCandidates.map((candidate) => (
                            <SelectItem key={candidate.value} value={candidate.value}>{candidate.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">子フィールド見た目を一括変更</p>
                      <Select value={sharedChildAppearance || '__mixed__'} onValueChange={(value) => {
                        if (value !== '__mixed__') {
                          applyAppearanceToGroupFields(block.id, value as SettingSheetBlock['appearance']);
                        }
                      }}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__mixed__" disabled>個別設定あり</SelectItem>
                          {SETTING_SHEET_APPEARANCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">追加ボタン文言</p>
                      <Input value={block.addButtonLabel} onChange={(event) => updateBlock(block.id, { addButtonLabel: event.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">1件ごとの表示名</p>
                      <Input value={block.entryTitle} onChange={(event) => updateBlock(block.id, { entryTitle: event.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">最小件数</p>
                      <Input type="number" min={0} value={block.minItems} onChange={(event) => updateBlock(block.id, { minItems: Math.max(0, Number(event.target.value || 0)) })} className="mt-1" />
                    </div>
                    <div className="lg:col-span-2 rounded-xl border border-dashed p-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Checkbox checked={block.collapsible} onCheckedChange={(checked) => updateBlock(block.id, { collapsible: checked === true })} />
                        このグループを accordion として折り畳み可能にする
                      </div>
                    </div>
                  </Fragment>
                ) : null}
              </div>

              {usesRequired ? (
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <Checkbox checked={block.required} onCheckedChange={(checked) => updateBlock(block.id, { required: checked === true })} />
                  この質問を必須にする
                </div>
              ) : null}

              {usesOptions ? (
                <Accordion type="single" collapsible className="mt-4 w-full" defaultValue={block.optionSource ? 'options' : undefined}>
                  <AccordionItem value="options" className="rounded-xl border px-3 border-slate-200">
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">選択肢設定</AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">選択肢の取得元</p>
                        <Select value={currentSourceValue || '__manual__'} onValueChange={(value) => updateOptionSource(block.id, value === '__manual__' ? '' : value)}>
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__manual__">手動で入力する</SelectItem>
                            {optionSourceCandidates.map((candidate) => (
                              <SelectItem key={candidate.value} value={candidate.value}>{candidate.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="rounded-xl border border-dashed p-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Checkbox checked={block.layout.optionFitContent} onCheckedChange={(checked) => updateBlock(block.id, { layout: { ...block.layout, optionFitContent: checked === true } })} />
                          複数選択の選択肢を文字幅に合わせて詰める
                        </div>
                      </div>
                      {!block.optionSource ? (
                        <div>
                          <p className="text-xs text-muted-foreground">選択肢（1行に1件）</p>
                          <Textarea value={block.options.join('\n')} onChange={(event) => updateBlock(block.id, { options: event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) })} rows={5} className="mt-1" />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">回答時に参照元フィールドの値から選択肢を自動生成します。</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : null}

              {usesChildren ? (
                <Accordion type="single" collapsible className="mt-4 w-full" defaultValue={block.fields.length > 0 ? 'fields' : undefined}>
                  <AccordionItem value="fields" className="rounded-2xl border border-dashed px-4">
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">{isSectionBlock(block.type) ? 'セクション内ブロック' : 'グループ内フィールド'}</AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      <p className="text-xs text-muted-foreground">{isSectionBlock(block.type) ? 'このセクションの中に表示するブロックを定義します。' : 'このグループの中で繰り返し入力される項目を定義します。'}</p>
                      <AnimatePresence initial={false}>
                        <motion.div layout className="space-y-3">
                          {block.fields.map((child, childIndex) => (
                            <motion.div key={child.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                              {renderBlockEditor(child, childIndex, block.id, depth + 1)}
                              <div className="mt-2 rounded-xl border border-dashed px-3 py-3">
                                <p className="mb-2 text-xs text-muted-foreground">この下に追加</p>
                                <div className="flex flex-wrap gap-2">
                                  {SETTING_SHEET_BLOCK_OPTIONS.map((option) => (
                                    <Button key={`${block.id}-${child.id}-${option.value}`} type="button" variant="outline" size="sm" onClick={() => insertBlock(block.id, childIndex + 1, option.value)}>
                                      <Plus className="size-4" />
                                      {option.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                      <div className="flex flex-wrap gap-2">
                        {SETTING_SHEET_BLOCK_OPTIONS.map((option) => (
                          <Button key={`${block.id}-${option.value}`} type="button" variant="outline" size="sm" onClick={() => insertBlock(block.id, block.fields.length, option.value)}>
                            <Plus className="size-4" />
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : null}

              <div className="mt-4 rounded-xl border border-dashed px-3 py-3">
                <p className="mb-2 text-xs text-muted-foreground">この下に追加</p>
                <div className="flex flex-wrap gap-2">
                  {SETTING_SHEET_BLOCK_OPTIONS.map((option) => (
                    <Button key={`${block.id}-after-${option.value}`} type="button" variant="outline" size="sm" onClick={() => insertBlock(parentId, index + 1, option.value)}>
                      <Plus className="size-4" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </div>
      </Accordion>
    );
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
            <BreadcrumbPage>ライブフォーム作成</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Wrench className="size-5" />
                  <div>
                    <h1 className="text-xl font-semibold">ライブフォーム作成</h1>
                    <p className="text-sm text-muted-foreground">フォーム全体の情報と追加ブロックをここで管理します。</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to={`/tenants/${tenantId}/lives/${liveId}`}>
                    <ChevronLeft className="size-4" />
                    ライブ管理へ戻る
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border bg-muted/20 px-3 py-2">
                  <p className="text-muted-foreground">ブロック数</p>
                  <p className="font-medium">{config.blocks.length}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 px-3 py-2">
                  <p className="text-muted-foreground">公開ラベル</p>
                  <p className="truncate font-medium">{config.submitButtonLabel}</p>
                </div>
              </div>

              <Accordion type="multiple" defaultValue={["form", "add"]} className="w-full space-y-3">
                <AccordionItem value="form" className="rounded-2xl border px-4">
                  <AccordionTrigger className="py-3 text-sm hover:no-underline">フォーム全体設定</AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setConfig(createTemplateSettingSheetConfig())}>
                        <Sparkles className="size-4" />
                        テンプレート適用
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setConfig((current) => current ? { ...createEmptySettingSheetConfig(), title: current.title, description: current.description, submitButtonLabel: current.submitButtonLabel } : createEmptySettingSheetConfig())}>
                        <RotateCcw className="size-4" />
                        空から作る
                      </Button>
                    </div>
                    <div>
                      <p className="text-sm font-medium">フォームタイトル</p>
                      <Input value={config.title} onChange={(event) => setConfig((current) => current ? { ...current, title: event.target.value } : current)} className="mt-2" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">送信ボタン文言</p>
                      <Input value={config.submitButtonLabel} onChange={(event) => setConfig((current) => current ? { ...current, submitButtonLabel: event.target.value } : current)} className="mt-2" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">フォーム説明</p>
                      <Textarea value={config.description} onChange={(event) => setConfig((current) => current ? { ...current, description: event.target.value } : current)} rows={4} className="mt-2" />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {addableBlocks.length > 0 ? (
                  <AccordionItem value="add" className="rounded-2xl border px-4">
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">ブロックを追加</AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-4">
                      <p className="text-xs text-muted-foreground">繰り返しグループを使うと、メンバーや曲のような可変件数の入力を構築できます。</p>
                      <div className="flex flex-wrap gap-2">
                        {addableBlocks.map((option) => (
                          <Button key={option.value} type="button" variant="outline" size="sm" onClick={() => setConfig((current) => current ? normalizeSettingSheetConfig({ ...current, blocks: [...current.blocks, createBlockTemplate(option.value)] }) : current)}>
                            <Plus className="size-4" />
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
              </Accordion>

              <Button type="button" onClick={saveConfig} disabled={isSaving} className="w-full">
                <Save className="size-4" />
                {isSaving ? '保存中...' : 'フォーム設定を保存'}
              </Button>
            </CardContent>
          </Card>
        </aside>

        <Card>
          <CardHeader>
            <div>
              <h2 className="text-lg font-semibold">ブロック構成</h2>
              <p className="text-sm text-muted-foreground">並び順、見た目、必須設定、入れ子構造をここで調整します。</p>
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence initial={false}>
              <motion.div layout className="space-y-3">
                {config.blocks.map((block, index) => (
                  <motion.div key={block.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                    {renderBlockEditor(block, index, null)}
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
