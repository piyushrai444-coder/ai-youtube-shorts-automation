import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { config } from '../config/index.js';

export function getZonedDate(date: Date = new Date(), timezone: string = config.cron.timezone): Date {
  return toZonedTime(date, timezone);
}

export function formatZonedDate(date: Date = new Date(), formatStr: string = 'yyyy-MM-dd', timezone: string = config.cron.timezone): string {
  return formatInTimeZone(date, timezone, formatStr);
}

export function getCurrentSlotDate(timezone: string = config.cron.timezone): string {
  return formatZonedDate(new Date(), 'yyyy-MM-dd', timezone);
}

export function formatReadableDateTime(date: Date, timezone: string = config.cron.timezone): string {
  return formatInTimeZone(date, timezone, 'MMM dd, yyyy hh:mm:ss a zzz');
}
