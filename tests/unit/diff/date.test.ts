import { describe, it, expect } from 'bun:test';
import { isOverdue, formatDate } from '../../../src/utils/date.js';

describe('isOverdue', () => {
  it('retourne true pour une date passée', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('retourne false pour une date future', () => {
    expect(isOverdue('2099-01-01')).toBe(false);
  });

  it('retourne false pour null ou undefined', () => {
    expect(isOverdue(null)).toBe(false);
    expect(isOverdue(undefined)).toBe(false);
  });
});

describe('formatDate', () => {
  it('formate une date ISO en YYYY-MM-DD', () => {
    expect(formatDate('2026-03-14T10:00:00')).toBe('2026-03-14');
  });

  it('retourne — pour null', () => {
    expect(formatDate(null)).toBe('—');
  });
});
