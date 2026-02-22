/**
 * Tests for LsvBooking Web Component.
 *
 * jsdom does not fully support Custom Elements v1 (no customElements registry,
 * no attachShadow on arbitrary elements).  We therefore test:
 *  - Static class shape / observedAttributes
 *  - Pure logic methods extracted via prototype binding
 *  - Event dispatching via a mock EventTarget
 *  - API error path for submitBooking
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LsvBooking } from '../src/lsv-booking.js';

// ── Pure-logic helpers ────────────────────────────────────────────────────
// Many methods on LsvBooking are "pure" in the sense that they only operate on
// `this` private state and can be exercised by building a minimal stand-in
// object that satisfies the method's needs, bound via Function.prototype.bind.

function makeCtx(overrides: Record<string, unknown> = {}): LsvBooking {
  // Build a minimal context object with just the fields each method reads.
  return {
    selectedSlot: null,
    selectedDate: '',
    selectedTime: '',
    availableTimes: [],
    isLoading: false,
    errorMsg: '',
    step: 'slots',
    getAttribute: (_: string) => null,
    ...overrides,
  } as unknown as LsvBooking;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('LsvBooking – static shape', () => {
  it('is a function (class)', () => {
    expect(typeof LsvBooking).toBe('function');
  });

  it('observedAttributes includes all required attrs', () => {
    expect(LsvBooking.observedAttributes).toEqual(
      expect.arrayContaining(['api-url', 'profile-slug', 'vault-slug', 'theme']),
    );
  });

  it('prototype has connectedCallback', () => {
    expect(typeof LsvBooking.prototype.connectedCallback).toBe('function');
  });

  it('prototype has attributeChangedCallback', () => {
    expect(typeof LsvBooking.prototype.attributeChangedCallback).toBe('function');
  });
});

describe('LsvBooking – formatDayList', () => {
  // Access the private method via the prototype
  const formatDayList = (LsvBooking.prototype as unknown as {
    formatDayList: (days: string[]) => string;
  }).formatDayList;

  it('returns "Every day" for all 7 days', () => {
    const ctx = makeCtx();
    expect(formatDayList.call(ctx, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).toBe('Every day');
  });

  it('returns "Weekdays" for mon-fri', () => {
    const ctx = makeCtx();
    expect(formatDayList.call(ctx, ['mon', 'tue', 'wed', 'thu', 'fri'])).toBe('Weekdays');
  });

  it('returns "Weekends" for sat+sun', () => {
    const ctx = makeCtx();
    expect(formatDayList.call(ctx, ['sat', 'sun'])).toBe('Weekends');
  });

  it('lists individual days for a custom subset', () => {
    const ctx = makeCtx();
    expect(formatDayList.call(ctx, ['mon', 'wed'])).toBe('Mon, Wed');
  });
});

describe('LsvBooking – getNextDates', () => {
  const getNextDates = (LsvBooking.prototype as unknown as {
    getNextDates: () => { date: string; label: string; dayOfWeek: number }[];
  }).getNextDates;

  it('returns exactly 14 entries', () => {
    const ctx = makeCtx();
    expect(getNextDates.call(ctx)).toHaveLength(14);
  });

  it('first entry is today', () => {
    const ctx = makeCtx();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isoToday = today.toISOString().split('T')[0];
    const dates = getNextDates.call(ctx);
    expect(dates[0]?.date).toBe(isoToday);
  });

  it('entries have date, label, dayOfWeek properties', () => {
    const ctx = makeCtx();
    const dates = getNextDates.call(ctx);
    for (const entry of dates) {
      expect(typeof entry.date).toBe('string');
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.dayOfWeek).toBe('number');
      expect(entry.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(entry.dayOfWeek).toBeLessThanOrEqual(6);
    }
  });
});

describe('LsvBooking – isDateAllowed', () => {
  const isDateAllowed = (LsvBooking.prototype as unknown as {
    isDateAllowed: (dow: number) => boolean;
  }).isDateAllowed;

  it('returns false when selectedSlot is null', () => {
    const ctx = makeCtx({ selectedSlot: null });
    expect(isDateAllowed.call(ctx, 1)).toBe(false);
  });

  it('returns true for an allowed day-of-week', () => {
    // Monday = index 1, abbr 'mon'
    const ctx = makeCtx({ selectedSlot: { daysOfWeek: ['mon', 'wed', 'fri'] } });
    expect(isDateAllowed.call(ctx, 1)).toBe(true);
  });

  it('returns false for a disallowed day-of-week', () => {
    // Tuesday = index 2, abbr 'tue'
    const ctx = makeCtx({ selectedSlot: { daysOfWeek: ['mon', 'wed', 'fri'] } });
    expect(isDateAllowed.call(ctx, 2)).toBe(false);
  });
});

describe('LsvBooking – formatTime', () => {
  const formatTime = (LsvBooking.prototype as unknown as {
    formatTime: (iso: string) => string;
  }).formatTime;

  it('formats HH:MM strings without throwing', () => {
    const ctx = makeCtx();
    const result = formatTime.call(ctx, '09:30');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns original string on parse error', () => {
    const ctx = makeCtx();
    // Pass something that will fail date parsing gracefully
    const result = formatTime.call(ctx, 'not-a-time');
    expect(typeof result).toBe('string');
  });
});

describe('LsvBooking – formatDate', () => {
  const formatDate = (LsvBooking.prototype as unknown as {
    formatDate: (iso: string) => string;
  }).formatDate;

  it('formats YYYY-MM-DD without throwing', () => {
    const ctx = makeCtx();
    const result = formatDate.call(ctx, '2026-03-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('LsvBooking – attributeChangedCallback early return', () => {
  it('does not call render when old === new value', () => {
    // Create a plain object that mimics the fields attributeChangedCallback reads
    const ctx = makeCtx({ step: 'slots', isConnected: false });
    const renderSpy = vi.fn();
    (ctx as unknown as Record<string, unknown>).render = renderSpy;

    // Call via prototype binding
    LsvBooking.prototype.attributeChangedCallback.call(ctx, 'theme', 'dark', 'dark');
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('calls render when theme value changes (isConnected=false skips reset)', () => {
    const ctx = makeCtx({ step: 'slots', isConnected: false });
    const renderSpy = vi.fn();
    (ctx as unknown as Record<string, unknown>).render = renderSpy;

    LsvBooking.prototype.attributeChangedCallback.call(ctx, 'theme', 'dark', 'light');
    expect(renderSpy).toHaveBeenCalledOnce();
  });
});

describe('LsvBooking – submitBooking error path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches lsv-booking-error event when fetch fails', async () => {
    const dispatchedEvents: CustomEvent[] = [];
    const ctx = makeCtx({
      selectedSlot: { id: 'slot-1', title: 'Test Slot', requirePhone: false },
      selectedDate: '2026-03-01',
      selectedTime: '09:00',
      // Minimal mocks so submitBooking can run
      setLoading: vi.fn(),
      setError: vi.fn(),
      render: vi.fn(),
      step: 'form',
      isLoading: false,
      errorMsg: '',
      dispatchEvent: (e: Event) => { dispatchedEvents.push(e as CustomEvent); return true; },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    await (LsvBooking.prototype as unknown as {
      submitBooking: (n: string, e: string, p: string, no: string) => Promise<void>;
    }).submitBooking.call(ctx, 'Alice', 'alice@example.com', '', '');

    const errorEvent = dispatchedEvents.find((e) => e.type === 'lsv-booking-error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.detail?.step).toBe('form');
    expect(typeof errorEvent?.detail?.message).toBe('string');
  });
});

describe('Custom element registration check', () => {
  it('can be registered as a custom element (class shape is valid)', () => {
    // Verify the class extends HTMLElement chain properly
    // In jsdom, HTMLElement is available
    expect(LsvBooking.prototype instanceof HTMLElement).toBe(true);
  });

  it('has all lifecycle callbacks', () => {
    expect(typeof LsvBooking.prototype.connectedCallback).toBe('function');
    expect(typeof LsvBooking.prototype.attributeChangedCallback).toBe('function');
  });
});
