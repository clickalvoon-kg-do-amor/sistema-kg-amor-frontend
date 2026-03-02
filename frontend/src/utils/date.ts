export const formatLocalDate = (value: Date | string | number = new Date()): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isSameLocalDate = (
  value: Date | string | number,
  reference: Date | string | number = new Date()
): boolean => {
  const a = formatLocalDate(value);
  const b = formatLocalDate(reference);
  return a !== '' && a === b;
};

export const toUtcISOStringFromLocalDate = (
  localDate: string,
  endOfDay = false
): string | null => {
  if (!localDate) return null;

  const [year, month, day] = localDate.split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;

  const parsed = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};
