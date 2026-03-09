export type LiveStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface LiveResponse {
  id: string;
  tenantId: string;
  tenantName: string;
  publicToken: string;
  name: string;
  date: string | null;
  location: string | null;
  deadlineAt: string | null;
  status: LiveStatus;
}

export interface PublicLiveResponse {
  name: string;
  date: string | null;
  location: string | null;
  deadlineAt: string | null;
  status: LiveStatus;
}

export interface FormField {
  value: string;
  error?: string;
}

export interface LiveFormValues {
  tenantId: FormField;
  name: FormField;
  date: FormField;
  location: FormField;
  deadlineAt: FormField;
  status: { value: LiveStatus; error?: string };
}

export const LIVE_STATUS_LABELS: Record<LiveStatus, string> = {
  DRAFT: '下書き',
  PUBLISHED: '公開中',
  CLOSED: '締切済み',
};

export const LIVE_STATUS_OPTIONS: Array<{ value: LiveStatus; label: string }> = [
  { value: 'DRAFT', label: LIVE_STATUS_LABELS.DRAFT },
  { value: 'PUBLISHED', label: LIVE_STATUS_LABELS.PUBLISHED },
  { value: 'CLOSED', label: LIVE_STATUS_LABELS.CLOSED },
];

export function createEmptyLiveForm(defaultTenantId = ''): LiveFormValues {
  return {
    tenantId: { value: defaultTenantId },
    name: { value: '' },
    date: { value: '' },
    location: { value: '' },
    deadlineAt: { value: '' },
    status: { value: 'DRAFT' },
  };
}

export function createTenantScopedLiveForm(): LiveFormValues {
  return createEmptyLiveForm('');
}

export function createLiveFormFromResponse(live: LiveResponse): LiveFormValues {
  return {
    tenantId: { value: live.tenantId },
    name: { value: live.name },
    date: { value: live.date ?? '' },
    location: { value: live.location ?? '' },
    deadlineAt: { value: live.deadlineAt ? live.deadlineAt.slice(0, 16) : '' },
    status: { value: live.status },
  };
}

export function toLiveCreatePayload(tenantId: string, formValues: LiveFormValues) {
  return {
    tenantId,
    name: formValues.name.value,
    date: formValues.date.value || null,
    location: formValues.location.value || null,
    deadlineAt: formValues.deadlineAt.value || null,
    status: formValues.status.value,
  };
}

export function toLiveUpdatePayload(formValues: LiveFormValues) {
  return {
    name: formValues.name.value,
    date: formValues.date.value || null,
    location: formValues.location.value || null,
    deadlineAt: formValues.deadlineAt.value || null,
    status: formValues.status.value,
  };
}

export function buildPublicLiveUrl(publicToken: string) {
  return `${window.location.origin}/public/lives/${publicToken}`;
}

export function formatLiveDate(value: string | null) {
  if (!value) {
    return '未定';
  }

  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long' }).format(new Date(value));
}

export function formatDeadline(value: string | null) {
  if (!value) {
    return '未設定';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatOptionalText(value: string | null) {
  if (!value || !value.trim()) {
    return '未定';
  }

  return value;
}