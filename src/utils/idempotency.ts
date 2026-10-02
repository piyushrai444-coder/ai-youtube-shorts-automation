import { getCurrentSlotDate } from './timezone.js';

export type ShortSlot = 'short-1' | 'short-2' | 'manual';

export function generateSlotKey(slot: ShortSlot, dateStr?: string): string {
  const date = dateStr || getCurrentSlotDate();
  if (slot === 'manual') {
    return `${date}-manual-${Date.now()}`;
  }
  return `${date}-${slot}`;
}

export function isValidSlot(slot: string): slot is ShortSlot {
  return slot === 'short-1' || slot === 'short-2' || slot === 'manual';
}

export function parseSlotKey(slotKey: string): { date: string; slot: string } | null {
  const match = slotKey.match(/^(\d{4}-\d{2}-\d{2})-(short-1|short-2|manual.*)$/);
  if (!match) return null;
  return { date: match[1], slot: match[2] };
}
