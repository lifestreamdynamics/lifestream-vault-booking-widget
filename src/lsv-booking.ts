import { WIDGET_STYLES } from './styles.js';

// ── Types ──────────────────────────────────────────────────────────────────

interface Slot {
  id: string;
  title: string;
  description?: string;
  durationMin: number;
  bufferMin: number;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  timezone: string;
  maxConcurrent: number;
  requirePhone: boolean;
}

type Step = 'slots' | 'date' | 'time' | 'form' | 'success';

const DAY_ABBR = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ── LsvBooking Web Component ───────────────────────────────────────────────

export class LsvBooking extends HTMLElement {
  static observedAttributes = ['api-url', 'profile-slug', 'vault-slug', 'theme'];

  private root: ShadowRoot;
  private step: Step = 'slots';
  private slots: Slot[] = [];
  private selectedSlot: Slot | null = null;
  private selectedDate: string = '';
  private selectedTime: string = '';
  private availableTimes: string[] = [];
  private isLoading = false;
  private errorMsg = '';

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.loadSlots();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    if (name === 'theme') {
      this.render();
    } else if (this.isConnected) {
      this.reset();
    }
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  private get apiUrl(): string {
    return (this.getAttribute('api-url') ?? '').replace(/\/$/, '');
  }

  private get profileSlug(): string {
    return this.getAttribute('profile-slug') ?? '';
  }

  private get vaultSlug(): string {
    return this.getAttribute('vault-slug') ?? '';
  }

  private get baseApiPath(): string {
    return `${this.apiUrl}/api/v1/public/vaults/${this.profileSlug}/${this.vaultSlug}`;
  }

  // ── State helpers ────────────────────────────────────────────────────────

  private reset() {
    this.step = 'slots';
    this.slots = [];
    this.selectedSlot = null;
    this.selectedDate = '';
    this.selectedTime = '';
    this.availableTimes = [];
    this.isLoading = false;
    this.errorMsg = '';
    this.render();
    this.loadSlots();
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
    this.render();
  }

  private setError(msg: string) {
    this.errorMsg = msg;
    this.isLoading = false;
    this.render();
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  private async loadSlots() {
    this.setLoading(true);
    try {
      const res = await fetch(`${this.baseApiPath}/booking-slots`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { slots: Slot[] };
      this.slots = data.slots;
      this.errorMsg = '';
    } catch {
      this.setError('Failed to load booking slots. Please try again.');
      return;
    }
    this.isLoading = false;
    this.render();
  }

  private async loadTimes(slotId: string, date: string) {
    this.setLoading(true);
    try {
      const res = await fetch(
        `${this.baseApiPath}/booking-slots/${slotId}/availability?date=${date}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { times: string[] };
      this.availableTimes = data.times;
      this.errorMsg = '';
    } catch {
      this.setError('Failed to load available times. Please try again.');
      return;
    }
    this.isLoading = false;
    this.step = 'time';
    this.render();
  }

  private async submitBooking(
    name: string,
    email: string,
    phone: string,
    notes: string,
  ) {
    if (!this.selectedSlot || !this.selectedDate || !this.selectedTime) return;

    this.setLoading(true);

    // Build ISO startAt from date + time
    const startAt = new Date(`${this.selectedDate}T${this.selectedTime}`).toISOString();
    const slotId = this.selectedSlot.id;

    const body: Record<string, string> = {
      guestName: name,
      guestEmail: email,
      startAt,
    };
    if (phone) body.guestPhone = phone;
    if (notes) body.notes = notes;

    try {
      const res = await fetch(
        `${this.baseApiPath}/booking-slots/${slotId}/book`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string; message?: string };
        throw new Error(errData.error ?? errData.message ?? `HTTP ${res.status}`);
      }
      const result = await res.json() as { guestName: string; startAt: string };
      this.isLoading = false;
      this.step = 'success';
      this.render();

      // Dispatch success event
      this.dispatchEvent(new CustomEvent('lsv-booking-submitted', {
        bubbles: true,
        composed: true,
        detail: {
          bookingId: '',
          startAt: result.startAt,
          endAt: '',
          slotTitle: this.selectedSlot.title,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed. Please try again.';
      this.dispatchEvent(new CustomEvent('lsv-booking-error', {
        bubbles: true,
        composed: true,
        detail: { message: msg, step: 'form' },
      }));
      this.setError(msg);
    }
  }

  // ── Date helpers ──────────────────────────────────────────────────────────

  private getNextDates(): { date: string; label: string; dayOfWeek: number }[] {
    const results: { date: string; label: string; dayOfWeek: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      results.push({ date: iso, label, dayOfWeek: d.getDay() });
    }
    return results;
  }

  private isDateAllowed(dayOfWeek: number): boolean {
    if (!this.selectedSlot) return false;
    const abbr = DAY_ABBR[dayOfWeek];
    return this.selectedSlot.daysOfWeek.includes(abbr);
  }

  private formatTime(iso: string): string {
    // iso is like "09:30" or "2024-01-01T09:30:00.000Z"
    try {
      if (iso.includes('T')) {
        return new Date(iso).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
      // HH:MM format
      const [h, m] = iso.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return iso;
    }
  }

  private formatDate(iso: string): string {
    try {
      const d = new Date(`${iso}T12:00:00`);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private render() {
    const style = document.createElement('style');
    style.textContent = WIDGET_STYLES;

    const container = document.createElement('div');
    container.className = 'widget';

    if (this.step === 'success') {
      container.appendChild(this.renderSuccess());
    } else {
      container.appendChild(this.renderStepIndicator());

      if (this.isLoading) {
        container.appendChild(this.renderLoading());
      } else if (this.errorMsg) {
        container.appendChild(this.renderError());
      } else {
        switch (this.step) {
          case 'slots': container.appendChild(this.renderSlots()); break;
          case 'date':  container.appendChild(this.renderDate());  break;
          case 'time':  container.appendChild(this.renderTime());  break;
          case 'form':  container.appendChild(this.renderForm());  break;
        }
      }
    }

    // Replace shadow root content
    this.root.replaceChildren(style, container);
    this.attachEvents();
  }

  private renderStepIndicator(): HTMLElement {
    const steps: Step[] = ['slots', 'date', 'time', 'form'];
    const current = steps.indexOf(this.step);
    const div = document.createElement('div');
    div.className = 'step-indicator';
    steps.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = `step-dot${i === current ? ' active' : i < current ? ' done' : ''}`;
      div.appendChild(dot);
    });
    return div;
  }

  private renderLoading(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'loading';
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    const text = document.createElement('span');
    text.textContent = 'Loading…';
    div.appendChild(spinner);
    div.appendChild(text);
    return div;
  }

  private renderError(): HTMLElement {
    const frag = document.createDocumentFragment();

    const box = document.createElement('div');
    box.className = 'error-box';
    box.textContent = this.errorMsg;
    frag.appendChild(box);

    const btn = document.createElement('button');
    btn.className = 'btn-retry';
    btn.dataset.action = 'retry';
    btn.textContent = 'Try again';
    frag.appendChild(btn);

    const wrapper = document.createElement('div');
    wrapper.appendChild(frag);
    return wrapper;
  }

  private renderSlots(): HTMLElement {
    const frag = document.createDocumentFragment();

    const title = document.createElement('p');
    title.className = 'section-title';
    title.textContent = 'Choose a booking type';
    frag.appendChild(title);

    if (this.slots.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-msg';
      empty.textContent = 'No booking slots available.';
      frag.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'slot-list';
      this.slots.forEach((slot) => {
        const card = document.createElement('button');
        card.className = 'slot-card';
        card.dataset.action = 'select-slot';
        card.dataset.slotId = slot.id;

        const titleEl = document.createElement('p');
        titleEl.className = 'slot-card-title';
        titleEl.textContent = slot.title;

        const meta = document.createElement('p');
        meta.className = 'slot-card-meta';
        const days = this.formatDayList(slot.daysOfWeek);
        meta.textContent = `${slot.durationMin} min  ·  ${days}  ·  ${slot.startTime}–${slot.endTime}`;

        card.appendChild(titleEl);
        if (slot.description) {
          const desc = document.createElement('p');
          desc.className = 'slot-card-meta';
          desc.style.marginTop = '0.25rem';
          desc.textContent = slot.description;
          card.appendChild(desc);
        }
        card.appendChild(meta);
        list.appendChild(card);
      });
      frag.appendChild(list);
    }

    const wrapper = document.createElement('div');
    wrapper.appendChild(frag);
    return wrapper;
  }

  private formatDayList(days: string[]): string {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('sat') && !days.includes('sun')) return 'Weekdays';
    if (days.length === 2 && days.includes('sat') && days.includes('sun')) return 'Weekends';
    const map: Record<string, string> = {
      mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
      fri: 'Fri', sat: 'Sat', sun: 'Sun',
    };
    return days.map((d) => map[d] ?? d).join(', ');
  }

  private renderDate(): HTMLElement {
    const frag = document.createDocumentFragment();

    const back = document.createElement('button');
    back.className = 'btn-back';
    back.dataset.action = 'back-to-slots';
    back.textContent = '← Back';
    frag.appendChild(back);

    const title = document.createElement('p');
    title.className = 'section-title';
    title.textContent = 'Select a date';
    frag.appendChild(title);

    const dates = this.getNextDates();

    // Day-of-week headers (start Sun)
    const grid = document.createElement('div');
    grid.className = 'date-grid';

    DAY_LABELS.forEach((label) => {
      const h = document.createElement('div');
      h.className = 'date-header';
      h.textContent = label;
      grid.appendChild(h);
    });

    // Offset first date so it aligns to correct day column
    const firstDow = dates[0]?.dayOfWeek ?? 0;
    for (let i = 0; i < firstDow; i++) {
      const empty = document.createElement('div');
      empty.className = 'date-cell empty';
      grid.appendChild(empty);
    }

    dates.forEach(({ date, label, dayOfWeek }) => {
      const cell = document.createElement('button');
      const allowed = this.isDateAllowed(dayOfWeek);
      cell.className = `date-cell${!allowed ? ' disabled' : ''}${date === this.selectedDate ? ' selected' : ''}`;
      cell.textContent = new Date(`${date}T12:00:00`).getDate().toString();
      cell.title = label;
      if (allowed) {
        cell.dataset.action = 'select-date';
        cell.dataset.date = date;
      } else {
        cell.disabled = true;
      }
      grid.appendChild(cell);
    });

    frag.appendChild(grid);

    const wrapper = document.createElement('div');
    wrapper.appendChild(frag);
    return wrapper;
  }

  private renderTime(): HTMLElement {
    const frag = document.createDocumentFragment();

    const back = document.createElement('button');
    back.className = 'btn-back';
    back.dataset.action = 'back-to-date';
    back.textContent = '← Back';
    frag.appendChild(back);

    const title = document.createElement('p');
    title.className = 'section-title';
    title.textContent = `Available times · ${this.formatDate(this.selectedDate)}`;
    frag.appendChild(title);

    if (this.availableTimes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-msg';
      empty.textContent = 'No times available on this date. Try another day.';
      frag.appendChild(empty);
    } else {
      const grid = document.createElement('div');
      grid.className = 'time-grid';
      this.availableTimes.forEach((t) => {
        const btn = document.createElement('button');
        btn.className = `time-btn${t === this.selectedTime ? ' selected' : ''}`;
        btn.dataset.action = 'select-time';
        btn.dataset.time = t;
        btn.textContent = this.formatTime(t);
        grid.appendChild(btn);
      });
      frag.appendChild(grid);
    }

    if (this.selectedTime) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      const next = document.createElement('button');
      next.className = 'btn-primary';
      next.dataset.action = 'go-to-form';
      next.textContent = 'Continue';
      actions.appendChild(next);
      frag.appendChild(actions);
    }

    const wrapper = document.createElement('div');
    wrapper.appendChild(frag);
    return wrapper;
  }

  private renderForm(): HTMLElement {
    const frag = document.createDocumentFragment();

    const back = document.createElement('button');
    back.className = 'btn-back';
    back.dataset.action = 'back-to-time';
    back.textContent = '← Back';
    frag.appendChild(back);

    // Summary
    const summary = document.createElement('div');
    summary.className = 'booking-summary';
    const strong = document.createElement('strong');
    strong.textContent = this.selectedSlot?.title ?? '';
    summary.appendChild(strong);
    const detail = document.createElement('span');
    detail.textContent = `${this.formatDate(this.selectedDate)} at ${this.formatTime(this.selectedTime)}`;
    summary.appendChild(detail);
    frag.appendChild(summary);

    // Form
    const form = document.createElement('form');
    form.id = 'lsv-booking-form';

    form.appendChild(this.makeField('guestName', 'Full name', 'text', true));
    form.appendChild(this.makeField('guestEmail', 'Email address', 'email', true));

    if (this.selectedSlot?.requirePhone) {
      form.appendChild(this.makeField('guestPhone', 'Phone number', 'tel', true));
    }

    // Notes textarea
    const notesGroup = document.createElement('div');
    notesGroup.className = 'form-group';
    const notesLabel = document.createElement('label');
    notesLabel.className = 'form-label';
    notesLabel.setAttribute('for', 'lsv-notes');
    notesLabel.textContent = 'Notes (optional)';
    const notesArea = document.createElement('textarea');
    notesArea.className = 'form-textarea';
    notesArea.id = 'lsv-notes';
    notesArea.name = 'notes';
    notesArea.rows = 3;
    notesArea.placeholder = 'Anything you\'d like to share…';
    notesGroup.appendChild(notesLabel);
    notesGroup.appendChild(notesArea);
    form.appendChild(notesGroup);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn-primary';
    submit.textContent = 'Confirm Booking';
    actions.appendChild(submit);
    form.appendChild(actions);

    frag.appendChild(form);

    const wrapper = document.createElement('div');
    wrapper.appendChild(frag);
    return wrapper;
  }

  private makeField(name: string, label: string, type: string, required: boolean): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const lbl = document.createElement('label');
    lbl.className = 'form-label';
    lbl.setAttribute('for', `lsv-${name}`);
    lbl.textContent = required ? `${label} *` : label;

    const input = document.createElement('input');
    input.className = 'form-input';
    input.type = type;
    input.id = `lsv-${name}`;
    input.name = name;
    input.required = required;
    input.autocomplete = name === 'guestName' ? 'name'
      : name === 'guestEmail' ? 'email'
      : name === 'guestPhone' ? 'tel'
      : 'off';

    group.appendChild(lbl);
    group.appendChild(input);
    return group;
  }

  private renderSuccess(): HTMLElement {
    const view = document.createElement('div');
    view.className = 'success-view';

    const icon = document.createElement('div');
    icon.className = 'success-icon';
    icon.textContent = '✓';

    const title = document.createElement('p');
    title.className = 'success-title';
    title.textContent = 'Booking requested!';

    const msg = document.createElement('p');
    msg.className = 'success-msg';
    msg.textContent = 'Check your email to confirm your booking.';

    view.appendChild(icon);
    view.appendChild(title);
    view.appendChild(msg);
    return view;
  }

  // ── Event handling ────────────────────────────────────────────────────────

  private attachEvents() {
    this.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const el = target.closest('[data-action]') as HTMLElement | null;
      if (!el) return;
      this.handleAction(el.dataset.action ?? '', el);
    });

    const form = this.root.querySelector<HTMLFormElement>('#lsv-booking-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const name = (data.get('guestName') as string ?? '').trim();
        const email = (data.get('guestEmail') as string ?? '').trim();
        const phone = (data.get('guestPhone') as string ?? '').trim();
        const notes = (data.get('notes') as string ?? '').trim();
        if (!name || !email) return;
        void this.submitBooking(name, email, phone, notes);
      });
    }
  }

  private handleAction(action: string, el: HTMLElement) {
    switch (action) {
      case 'retry':
        this.errorMsg = '';
        if (this.step === 'slots') {
          this.loadSlots();
        } else if (this.step === 'time' && this.selectedSlot) {
          void this.loadTimes(this.selectedSlot.id, this.selectedDate);
        } else {
          this.render();
        }
        break;

      case 'select-slot': {
        const slotId = el.dataset.slotId;
        const slot = this.slots.find((s) => s.id === slotId);
        if (!slot) return;
        this.selectedSlot = slot;
        this.step = 'date';
        this.render();
        break;
      }

      case 'back-to-slots':
        this.selectedSlot = null;
        this.selectedDate = '';
        this.selectedTime = '';
        this.step = 'slots';
        this.render();
        break;

      case 'select-date': {
        const date = el.dataset.date;
        if (!date || !this.selectedSlot) return;
        this.selectedDate = date;
        this.selectedTime = '';
        void this.loadTimes(this.selectedSlot.id, date);
        break;
      }

      case 'back-to-date':
        this.selectedTime = '';
        this.step = 'date';
        this.render();
        break;

      case 'select-time': {
        const time = el.dataset.time;
        if (!time) return;
        this.selectedTime = time;
        this.render();
        break;
      }

      case 'go-to-form':
        if (this.selectedTime) {
          this.step = 'form';
          this.render();
        }
        break;

      case 'back-to-time':
        this.step = 'time';
        this.render();
        break;
    }
  }
}
