export type Locale = 'nl' | 'en';
// English equivalents of domain/server error codes. The Dutch originals live in
// src/domain/* and src/server/api.ts; when no English entry exists the Dutch
// message is used as-is.
export const ERROR_MESSAGES_EN: Record<string, string> = {
  'E-AUDIT-01': 'Audit chain broken. Restore the demo first.',
  'E-CASE-01': 'Case not found.',
  'E-STORY-01': 'Story not found.',
  'E-DUP-01': 'This case already exists or has already been approved.',
  'E-APPROVAL-01': 'A transfer requires approval by the pharmacist.',
  'E-EDIT-01': 'Medical rules and sources are not freely editable.',
  'E-HANDOVER-01': 'Handover not found.',
  'E-INPUT-01': 'Invalid input.',
  'E-ORIGIN-01': 'Only actions from this demo are allowed.',
  'E-NOTRIAGE-01': 'We do not assess complaints.',
  'E-CONFIRM-01': 'Confirm each line individually.',
  'E-SUBSTANCE-01': 'Unknown substance — no guessing.',
  'E-UNKNOWN-01': 'The action could not be completed. Try again.',
};
export function errorMessageEn(code: string): string | undefined {
  return ERROR_MESSAGES_EN[code];
}
