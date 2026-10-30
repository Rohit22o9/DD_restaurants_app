/**
 * Australian Western Standard Time (AWST - Perth, Western Australia, UTC+8)
 * and Australian Dollar (AUD) formatting utilities.
 */

export const PERTH_TIMEZONE = 'Australia/Perth';

/**
 * Format a number or numeric string as Australian Dollars (AUD)
 * e.g., formatAUD(24.5) => "$24.50"
 */
export function formatAUD(amount: number | string | null | undefined, showCents = true): string {
  const num = Number(amount);
  if (isNaN(num)) return '$0.00';
  return `$${num.toLocaleString('en-AU', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a timestamp into Perth time (12-hour format with AM/PM)
 * e.g., "12:15 PM AWST"
 */
export function formatPerthTime(dateInput?: string | Date | null, includeZone = false): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '12:15 PM';

  try {
    const formatted = new Intl.DateTimeFormat('en-AU', {
      timeZone: PERTH_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);

    return includeZone ? `${formatted} AWST` : formatted;
  } catch (e) {
    // Fallback if Intl timeZone is unsupported
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }
}

/**
 * Format date in Perth timezone
 * e.g., "Friday, 30 Oct" or "Today, 30 Oct"
 */
export function formatPerthDate(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return 'Today';

  try {
    const nowPerth = new Intl.DateTimeFormat('en-AU', {
      timeZone: PERTH_TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date());

    const targetPerth = new Intl.DateTimeFormat('en-AU', {
      timeZone: PERTH_TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(d);

    const pretty = new Intl.DateTimeFormat('en-AU', {
      timeZone: PERTH_TIMEZONE,
      month: 'short',
      day: 'numeric',
    }).format(d);

    if (nowPerth === targetPerth) {
      return `Today, ${pretty}`;
    }
    return pretty;
  } catch (e) {
    return 'Today, 30 Oct';
  }
}

/**
 * Format date and time for Perth, Australia
 */
export function formatPerthDateTime(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';

  try {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: PERTH_TIMEZONE,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d) + ' AWST';
  } catch (e) {
    return d.toLocaleString();
  }
}
