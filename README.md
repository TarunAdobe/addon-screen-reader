# Storybook Screen Reader Addon

[![NPM Version](https://img.shields.io/npm/v/storybook-screen-reader.svg)](https://www.npmjs.com/package/storybook-screen-reader)

A screen reader addon for Storybook that helps developers test accessibility without external screen reader software. It announces focused elements via voice synthesis and/or text display.

![Screen Reader Demo](screenshots/screen-reader-example.gif)

## Features

- **Voice Reader** - Uses Web Speech API to announce focused elements
- **Text Reader** - Displays announcements in the addon panel
- **Focus Tracking** - Automatically tracks focus changes (Tab, arrow keys, clicks)
- **Web Component Support** - Works with Shadow DOM and custom elements
- **ARIA Support** - Reads `aria-label`, `aria-selected`, `aria-checked`, roles, etc.
- **Story Navigation** - Automatically resets when switching between stories
- **Storybook 8.x Compatible** - Updated for modern Storybook

## Installation

```bash
npm install storybook-screen-reader
```

or

```bash
yarn add storybook-screen-reader
```

## Setup

Add the addon to your `.storybook/main.js`:

```js
module.exports = {
  addons: [
    // ... other addons
    'storybook-screen-reader',
  ],
};
```

## Usage

1. Open Storybook and navigate to any story
2. Click the **"Screen Reader"** tab in the addons panel
3. Enable **Voice Reader** and/or **Text Reader**
4. Navigate through your component:
   - **Tab** / **Shift+Tab** - Move between focusable elements
   - **Arrow keys** - Navigate within menus, listboxes, etc.
   - **Click** - Focus any element

The addon will announce each focused element with its role and accessible name.

## What Gets Announced

| Element | Announcement Example |
|---------|---------------------|
| Button | "Button, Submit. Press Space or Enter to activate." |
| Link | "Link, Learn more. Press Enter to follow." |
| Checkbox | "Checkbox, Accept terms, not checked." |
| Menu item | "Menu item, Settings" |
| Heading | "Heading level 2, Welcome" |
| Text field | "Text field, Email. Empty." |

## Supported Elements

The addon tracks all focusable elements including:

- `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`
- Elements with `[tabindex]`
- Elements with `[role]` attributes
- Web components with `[focusable]` attribute
- `<details>`, `<summary>`, `[contenteditable]`

## Limitations

This addon is a development aid, not a replacement for testing with real screen readers like:
- VoiceOver (macOS/iOS)
- NVDA (Windows)
- JAWS (Windows)

Always test with actual assistive technology before shipping.

## Compatibility

- Storybook 8.x
- React, Vue, Angular, Web Components, HTML

## Contributing

Issues and PRs welcome! [GitHub Repository](https://github.com/TarunAdobe/addon-screen-reader)

## Credits

Originally created by [Víctor Lara](https://github.com/vlaraort/addon-screen-reader). Updated and maintained by [Tarun Tomar](https://github.com/TarunAdobe).

## License

MIT
