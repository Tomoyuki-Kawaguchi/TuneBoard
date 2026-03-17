import {
  isOptionBlock,
  isRepeatableGroupBlock,
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetOptionSource,
} from '@/features/lives/types/type';

import {
  createSettingSheetFieldValue,
  normalizeValuesForBlocks,
  type SettingSheetFieldValue,
  type SettingSheetFormValues,
} from './state';

export interface SettingSheetIssue {
  key: string;
  label: string;
  message: string;
}

interface SettingSheetSubmissionAnswer {
  fieldId: string;
  values: string[];
  items: Array<{ answers: SettingSheetSubmissionAnswer[] }>;
}

export function fieldIdFromKey(key: string) {
  return key.replace(/\[/g, '-').replace(/\]\./g, '-').replace(/\]/g, '').replace(/\./g, '-');
}

export function validateSettingSheetForm(values: SettingSheetFormValues, config: SettingSheetConfigResponse): SettingSheetIssue[] {
  const issues: SettingSheetIssue[] = [];

  const validateBlocks = (blocks: SettingSheetBlock[], answers: Record<string, SettingSheetFieldValue>, pathPrefix: string) => {
    for (const block of blocks) {
      if (block.hidden) {
        continue;
      }

      const fieldValue = answers[block.id] ?? createSettingSheetFieldValue(block);
      const key = `${pathPrefix}${block.id}`;

      if (isSectionBlock(block.type)) {
        validateBlocks(block.fields, answers, pathPrefix);
        continue;
      }
      if (isRepeatableGroupBlock(block.type)) {
        const minimum = Math.max(block.required ? 1 : 0, block.minItems);
        if ((block.required || block.minItems > 0) && fieldValue.items.length < minimum) {
          issues.push({ key: `${key}.items`, label: block.label, message: `少なくとも${minimum}件入力してください。` });
        }
        fieldValue.items.forEach((item, index) => validateBlocks(block.fields, item.answers, `${key}.items[${index}].answers.`));
        continue;
      }

      const answerValues = fieldValue.values;
      if (block.required && answerValues.length === 0) {
        issues.push({ key, label: block.label, message: '必須項目です。' });
        continue;
      }
      if (['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_SELECT', 'BOOLEAN'].includes(block.type) && answerValues.length > 1) {
        issues.push({ key, label: block.label, message: '回答は1つだけにしてください。' });
        continue;
      }
      if (block.type === 'BOOLEAN' && answerValues.some((value) => !['true', 'false'].includes(value))) {
        issues.push({ key, label: block.label, message: '真偽値の形式が不正です。' });
        continue;
      }

      const options = resolveBlockOptions(config.blocks, values.answers, block);
      if (isOptionBlock(block.type) && answerValues.some((value) => !options.includes(value))) {
        issues.push({ key, label: block.label, message: '選択肢が不正です。' });
      }
    }
  };

  validateBlocks(config.blocks, values.answers, 'answers.');
  return issues;
}

export function toSettingSheetSubmissionPayload(values: SettingSheetFormValues, config: SettingSheetConfigResponse) {
  return { answers: serializeScopeBlocks(config.blocks, values.answers) };
}

export function normalizeValuesForConfig(values: SettingSheetFormValues, config: SettingSheetConfigResponse): SettingSheetFormValues {
  return { answers: normalizeValuesForBlocks(config.blocks, values.answers as Record<string, unknown>) };
}

export function resolveOptionSourceValues(
  blocks: SettingSheetBlock[],
  answers: Record<string, SettingSheetFieldValue>,
  source: SettingSheetOptionSource,
) {
  const resolved = new Set<string>();

  const visit = (currentBlocks: SettingSheetBlock[], currentAnswers: Record<string, SettingSheetFieldValue>) => {
    for (const block of currentBlocks) {
      if (block.hidden) {
        continue;
      }
      if (isSectionBlock(block.type)) {
        visit(block.fields, currentAnswers);
        continue;
      }

      const fieldValue = currentAnswers[block.id] ?? createSettingSheetFieldValue(block);
      if (!isRepeatableGroupBlock(block.type)) {
        continue;
      }
      if (block.id === source.blockId) {
        for (const item of fieldValue.items) {
          const target = item.answers[source.fieldId];
          if (!target) {
            continue;
          }
          for (const value of target.values) {
            if (value.trim()) {
              resolved.add(value.trim());
            }
          }
        }
      }
      for (const item of fieldValue.items) {
        visit(block.fields, item.answers);
      }
    }
  };

  visit(blocks, answers);
  return Array.from(resolved);
}

export function moveArrayItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [target] = next.splice(from, 1);
  next.splice(to, 0, target);
  return next;
}

function serializeScopeBlocks(blocks: SettingSheetBlock[], answers: Record<string, SettingSheetFieldValue>): SettingSheetSubmissionAnswer[] {
  const serialized: SettingSheetSubmissionAnswer[] = [];
  for (const block of blocks) {
    if (block.hidden) {
      continue;
    }
    if (isSectionBlock(block.type)) {
      serialized.push(...serializeScopeBlocks(block.fields, answers));
      continue;
    }
    serialized.push(serializeFieldValue(block, answers[block.id] ?? createSettingSheetFieldValue(block)));
  }
  return serialized;
}

function serializeFieldValue(block: SettingSheetBlock, value: SettingSheetFieldValue): SettingSheetSubmissionAnswer {
  if (isRepeatableGroupBlock(block.type)) {
    return {
      fieldId: block.id,
      values: [],
      items: value.items.map((item) => ({ answers: serializeScopeBlocks(block.fields, item.answers) })),
    };
  }
  return { fieldId: block.id, values: value.values, items: [] };
}

function resolveBlockOptions(blocks: SettingSheetBlock[], answers: Record<string, SettingSheetFieldValue>, block: SettingSheetBlock) {
  return block.optionSource ? resolveOptionSourceValues(blocks, answers, block.optionSource) : block.options;
}