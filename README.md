# @lifestreamdynamics/booking-widget

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Embeddable `<lsv-booking>` Web Component that renders a complete booking flow for Lifestream Vault.

## Install

```bash
npm install @lifestreamdynamics/booking-widget
```

## Usage

### Script tag (UMD via unpkg)

```html
<script src="https://unpkg.com/@lifestreamdynamics/booking-widget"></script>
<lsv-booking
  api-url="https://your-vault.example.com"
  profile-slug="jane"
  vault-slug="consulting"
  theme="auto"
></lsv-booking>
```

### ESM import

```js
import '@lifestreamdynamics/booking-widget';
```

Then use the element in your HTML or JSX:

```html
<lsv-booking
  api-url="https://your-vault.example.com"
  profile-slug="jane"
  vault-slug="consulting"
></lsv-booking>
```

## Attributes

| Attribute      | Required | Default  | Description                                                        |
|----------------|----------|----------|--------------------------------------------------------------------|
| `api-url`      | Yes      | —        | Base URL of your Lifestream Vault API instance.                    |
| `profile-slug` | Yes      | —        | Profile slug identifying the booking page host.                    |
| `vault-slug`   | Yes      | —        | Vault slug identifying the booking page.                           |
| `theme`        | No       | `"dark"` | Color theme: `"dark"`, `"light"`, or `"auto"` (system preference).|

## Events

The component dispatches custom events on the host element.

### `lsv-booking-submitted`

Fired when a booking is successfully created.

```js
element.addEventListener('lsv-booking-submitted', (event) => {
  const { bookingId, startAt, endAt, slotTitle } = event.detail;
});
```

| Field        | Type     | Description                        |
|--------------|----------|------------------------------------|
| `bookingId`  | `string` | ID of the created booking.         |
| `startAt`    | `string` | ISO 8601 start timestamp.          |
| `endAt`      | `string` | ISO 8601 end timestamp.            |
| `slotTitle`  | `string` | Title of the booked slot.          |

### `lsv-booking-error`

Fired when an error occurs during the booking flow.

```js
element.addEventListener('lsv-booking-error', (event) => {
  const { message, step } = event.detail;
});
```

| Field     | Type     | Description                                      |
|-----------|----------|--------------------------------------------------|
| `message` | `string` | Human-readable error description.                |
| `step`    | `string` | Flow step where the error occurred.              |

## Styling

The component exposes CSS custom properties on `:host` for theming.

| Property               | Default     | Description                                  |
|------------------------|-------------|----------------------------------------------|
| `--lsv-primary-color`  | `#06b6d4`   | Primary accent color (buttons, highlights).  |
| `--lsv-border-radius`  | `0.5rem`    | Border radius applied to UI elements.        |
| `--lsv-bg-color`       | *(theme)*   | Background color of the widget.              |
| `--lsv-text-color`     | *(theme)*   | Primary text color.                          |
| `--lsv-surface-color`  | *(theme)*   | Surface/card background color.               |
| `--lsv-border-color`   | *(theme)*   | Border color.                                |
| `--lsv-muted-color`    | *(theme)*   | Muted/secondary text color.                  |
| `--lsv-input-bg`       | *(theme)*   | Input field background color.                |

Example:

```css
lsv-booking {
  --lsv-primary-color: #7c3aed;
  --lsv-border-radius: 0.25rem;
}
```

## Build Outputs

| Format | File                       |
|--------|----------------------------|
| ESM    | `dist/lsv-booking.js`      |
| UMD    | `dist/lsv-booking.umd.cjs` |
| Types  | `dist/index.d.ts`          |

## License

MIT — see [LICENSE](LICENSE).
