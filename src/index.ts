import { LsvBooking } from './lsv-booking.js';

// Register the custom element if not already defined
if (!customElements.get('lsv-booking')) {
  customElements.define('lsv-booking', LsvBooking);
}

export { LsvBooking };
