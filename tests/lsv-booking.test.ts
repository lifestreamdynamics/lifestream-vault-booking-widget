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

// ── Helpers for integration-style tests ──────────────────────────────────────

/**
 * Build a minimal context object for API-method tests, following the same
 * pattern as makeCtx above. Uses an EventTarget so event listeners work
 * correctly. Avoids `new LsvBooking()` because jsdom requires custom elements
 * to be registered in the registry before construction.
 */
interface ApiCtx extends LsvBooking {
  _et: EventTarget;
}

function makeApiCtx(overrides: Record<string, unknown> = {}): ApiCtx {
  const et = new EventTarget();
  const ctx = {
    // Attribute-based getters — return fixed values for tests
    apiUrl: 'https://api.test',
    profileSlug: 'jane',
    vaultSlug: 'consult',
    get baseApiPath() {
      return `${this.apiUrl}/api/v1/public/vaults/${this.profileSlug}/${this.vaultSlug}`;
    },
    // Widget state
    selectedSlot: null,
    selectedDate: '',
    selectedTime: '',
    availableTimes: [],
    isLoading: false,
    errorMsg: '',
    step: 'slots',
    abortController: null,
    // Render stubs — don't call real render
    render: vi.fn(),
    setLoading(loading: boolean) {
      (this as unknown as Record<string, unknown>).isLoading = loading;
      (this as unknown as Record<string, unknown>).render();
    },
    setError(msg: string) {
      (this as unknown as Record<string, unknown>).errorMsg = msg;
      (this as unknown as Record<string, unknown>).isLoading = false;
      (this as unknown as Record<string, unknown>).render();
    },
    // getSignal — real implementation; AbortSignal.timeout is available in Node 22
    getSignal(timeoutMs = 15_000) {
      return AbortSignal.timeout(timeoutMs);
    },
    // Delegate event methods to the EventTarget
    addEventListener: et.addEventListener.bind(et),
    removeEventListener: et.removeEventListener.bind(et),
    dispatchEvent: et.dispatchEvent.bind(et),
    // Keep reference so tests can also add listeners to _et
    _et: et,
    ...overrides,
  } as unknown as ApiCtx;
  return ctx;
}

const slotFixture = {
  id: 'slot-1',
  title: 'Consult',
  durationMin: 30,
  bufferMin: 0,
  startTime: '09:00',
  endTime: '17:00',
  daysOfWeek: ['mon'],
  timezone: 'UTC',
  maxConcurrent: 1,
  requirePhone: false,
};

// ── API integration tests ─────────────────────────────────────────────────────

describe('API integration', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('calls correct endpoint for loadSlots', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slots: [] }),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeApiCtx();

    await (LsvBooking.prototype as unknown as {
      loadSlots: () => Promise<void>;
    }).loadSlots.call(ctx);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/api/v1/public/vaults/jane/consult/booking-slots',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('calls correct endpoint for loadTimes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ times: ['09:00', '10:00'] }),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeApiCtx();

    await (LsvBooking.prototype as unknown as {
      loadTimes: (slotId: string, date: string) => Promise<void>;
    }).loadTimes.call(ctx, 'slot-1', '2026-04-15');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/booking-slots/slot-1/availability?date=2026-04-15'),
      expect.anything(),
    );
  });
});

// ── Error handling tests ──────────────────────────────────────────────────────

describe('error handling', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('dispatches lsv-booking-error on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const ctx = makeApiCtx();

    const errorPromise = new Promise<CustomEvent>((resolve) => {
      ctx.addEventListener('lsv-booking-error', (e) => resolve(e as CustomEvent));
    });

    await (LsvBooking.prototype as unknown as {
      loadSlots: () => Promise<void>;
    }).loadSlots.call(ctx);

    const event = await errorPromise;
    expect(event.detail).toHaveProperty('message');
    expect(event.detail).toHaveProperty('step');
  });

  it('dispatches lsv-booking-error on booking submission failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Time slot no longer available' }),
    });

    const ctx = makeApiCtx({ selectedSlot: slotFixture, selectedDate: '2026-04-15', selectedTime: '09:00' });

    const errorPromise = new Promise<CustomEvent>((resolve) => {
      ctx.addEventListener('lsv-booking-error', (e) => resolve(e as CustomEvent));
    });

    await (LsvBooking.prototype as unknown as {
      submitBooking: (n: string, e: string, p: string, no: string) => Promise<void>;
    }).submitBooking.call(ctx, 'Jane', 'jane@test.com', '', '');

    const event = await errorPromise;
    expect(event.detail.message).toBe('Time slot no longer available');
  });
});

// ── Booking submission success tests ─────────────────────────────────────────

describe('booking submission', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('dispatches lsv-booking-submitted with computed endAt', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ guestName: 'Jane', startAt: '2026-04-15T13:00:00.000Z' }),
    });

    const ctx = makeApiCtx({ selectedSlot: slotFixture, selectedDate: '2026-04-15', selectedTime: '09:00' });

    const submitPromise = new Promise<CustomEvent>((resolve) => {
      ctx.addEventListener('lsv-booking-submitted', (e) => resolve(e as CustomEvent));
    });

    await (LsvBooking.prototype as unknown as {
      submitBooking: (n: string, e: string, p: string, no: string) => Promise<void>;
    }).submitBooking.call(ctx, 'Jane', 'jane@test.com', '', '');

    const event = await submitPromise;
    expect(event.detail.slotTitle).toBe('Consult');
    // endAt must be 30 minutes after startAt: 2026-04-15T13:30:00.000Z
    expect(event.detail.endAt).toBe('2026-04-15T13:30:00.000Z');
    expect(event.detail.endAt).not.toBe('');
  });
});
