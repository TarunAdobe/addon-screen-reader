import { querySelectorDeep } from 'query-selector-shadow-dom';

// Inspired from https://github.com/focus-trap/tabbable
const focusables = [
  'input:not([inert])',
  'select:not([inert])',
  'textarea:not([inert])',
  'a[href]:not([inert])',
  'button:not([inert])',
  'label:not([inert])',
  '[tabindex]:not([inert])',
  'audio[controls]:not([inert])',
  'video[controls]:not([inert])',
  '[contenteditable]:not([contenteditable="false"]):not([inert])',
  'details>summary:first-of-type:not([inert])',
  'details:not([inert])',
  '[focusable]:not([focusable="false"])',
];

// eslint-disable-next-line no-unused-vars
const focusableSelector = focusables.join(', ');

/**
 * Get accessible name for an element, handling web components with shadow DOM
 */
function computeAccessibleName(element) {
  if (!element) return '';

  // Priority: aria-label > aria-labelledby > alt > title > text content
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label');
  }

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy && element.ownerDocument) {
    const labelEl = element.ownerDocument.getElementById(labelledBy);
    if (labelEl && labelEl.textContent) {
      return labelEl.textContent.trim();
    }
  }

  if (element.getAttribute('alt')) {
    return element.getAttribute('alt');
  }

  if (element.getAttribute('title')) {
    return element.getAttribute('title');
  }

  // For web components, try to get slotted content or shadow DOM text
  if (element.shadowRoot) {
    const slot = element.shadowRoot.querySelector('slot');
    if (slot) {
      const assignedNodes = slot.assignedNodes({ flatten: true });
      const text = assignedNodes
        .map(node => node.textContent || '')
        .join('')
        .trim();
      if (text) return text;
    }
  }

  return (element.textContent || '').trim();
}

function dispatchTextChanged(text) {
  const evt = new CustomEvent('screen-reader-text-changed', {
    detail: { text },
  });
  window.dispatchEvent(evt);
}

export default class ScreenReader {
  constructor() {
    this.isRunning = false;
    this.voiceEnabled = false;
    this.textEnabled = false;
    this.storyDocument = null;
    this.lastAnnouncedElement = null;

    // Bound handlers for proper cleanup
    this.handleFocusIn = this.onFocusIn.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleMutation = this.onMutation.bind(this);

    this.mutationObserver = null;
  }

  /**
   * Map element to its semantic role
   */
  computeRole(element) {
    if (!element) return 'element';

    // Check explicit role first
    const role = element.getAttribute('role');
    if (role) return role;

    // Map by tag name
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    const tagMappings = {
      a: 'link',
      button: 'button',
      input: this.getInputRole(element),
      select: 'combobox',
      textarea: 'textbox',
      h1: 'heading',
      h2: 'heading',
      h3: 'heading',
      h4: 'heading',
      h5: 'heading',
      h6: 'heading',
      p: 'paragraph',
      img: 'image',
      nav: 'navigation',
      main: 'main',
      aside: 'complementary',
      header: 'banner',
      footer: 'contentinfo',
      li: 'listitem',
      ul: 'list',
      ol: 'list',
      table: 'table',
      details: 'group',
      summary: 'button',
      label: 'label',
    };

    return tagMappings[tagName] || 'element';
  }

  // eslint-disable-next-line class-methods-use-this
  getInputRole(element) {
    const type = element.getAttribute('type') || 'text';
    const inputRoles = {
      checkbox: 'checkbox',
      radio: 'radio',
      button: 'button',
      submit: 'button',
      reset: 'button',
      range: 'slider',
      search: 'searchbox',
    };
    return inputRoles[type] || 'textbox';
  }

  /**
   * Generate announcement for an element based on its role
   */
  announceElement(element) {
    if (!element || element === this.lastAnnouncedElement) return;

    this.lastAnnouncedElement = element;

    const role = this.computeRole(element);
    const name = computeAccessibleName(element);

    const announcements = {
      link: () => `Link, ${name}. Press Enter to follow.`,
      button: () => `Button, ${name}. Press Space or Enter to activate.`,
      checkbox: () => {
        const checked = element.checked || element.getAttribute('aria-checked') === 'true';
        return `Checkbox, ${name}, ${checked ? 'checked' : 'not checked'}.`;
      },
      radio: () => {
        const checked = element.checked || element.getAttribute('aria-checked') === 'true';
        return `Radio button, ${name}, ${checked ? 'selected' : 'not selected'}.`;
      },
      switch: () => {
        const checked = element.getAttribute('aria-checked') === 'true';
        return `Switch, ${name}, ${checked ? 'on' : 'off'}.`;
      },
      textbox: () => {
        const value = element.value || '';
        return `Text field, ${name}. ${value ? `Contains: ${value}` : 'Empty.'}`;
      },
      searchbox: () => `Search field, ${name}.`,
      combobox: () => `Dropdown, ${name}. Press Space to open.`,
      slider: () => {
        const value = element.value || element.getAttribute('aria-valuenow') || '';
        return `Slider, ${name}. Value: ${value}.`;
      },
      heading: () => {
        const level =
          element.getAttribute('aria-level') || (element.tagName ? element.tagName[1] : '1');
        return `Heading level ${level}, ${name}`;
      },
      paragraph: () => name,
      image: () => `Image, ${name || 'no description'}`,
      listitem: () => `List item, ${name}`,
      option: () => {
        const selected = element.getAttribute('aria-selected') === 'true' || element.selected;
        return `Option, ${name}${selected ? ', selected' : ''}`;
      },
      menuitem: () => `Menu item, ${name}`,
      tab: () => {
        const selected = element.getAttribute('aria-selected') === 'true';
        return `Tab, ${name}${selected ? ', selected' : ''}`;
      },
      navigation: () => `Navigation, ${name || 'region'}`,
      main: () => 'Main content',
      label: () => name,
      group: () => (name ? `Group, ${name}` : ''),
      menu: () => `Menu, ${name}`,
      list: () => `List, ${name}`,
    };

    const announcement = announcements[role] ? announcements[role]() : name || `${role} element`;

    if (announcement) {
      this.say(announcement);
    }
  }

  addStyles() {
    if (!this.storyDocument || !this.storyDocument.head) return;

    // Remove existing styles first
    this.removeStyles();

    const styleElement = this.storyDocument.createElement('style');
    styleElement.id = 'screen-reader-addon-styles';
    styleElement.textContent =
      '[data-sr-current] { outline: 3px solid #005fcc !important; outline-offset: 2px !important; }';
    this.storyDocument.head.appendChild(styleElement);
  }

  removeStyles() {
    if (!this.storyDocument) return;
    const styles = this.storyDocument.getElementById('screen-reader-addon-styles');
    if (styles) styles.remove();
  }

  say(speech) {
    if (!speech) return;

    if (this.voiceEnabled) {
      const utterance = new SpeechSynthesisUtterance(speech);
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }

    if (this.textEnabled) {
      dispatchTextChanged(speech);
    }
  }

  /**
   * Update visual focus indicator
   */
  updateFocusIndicator(element) {
    if (!element) return;

    // Remove previous focus indicator
    const prev = querySelectorDeep('[data-sr-current]', this.storyDocument);
    if (prev) prev.removeAttribute('data-sr-current');

    // Add focus indicator to current element
    if (element.setAttribute) {
      element.setAttribute('data-sr-current', 'true');
    }
  }

  /**
   * Handle focus changes - this is the main way we track where user is
   */
  onFocusIn(evt) {
    if (!this.isRunning) return;

    const { target } = evt;
    if (!target) return;

    this.updateFocusIndicator(target);
    this.announceElement(target);
  }

  /**
   * Handle keyboard events for additional navigation feedback
   */
  onKeyDown(evt) {
    if (!this.isRunning) return;

    // After arrow key navigation, check if aria-activedescendant changed
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(evt.key) !== -1) {
      // Use setTimeout to let the component update first
      setTimeout(() => {
        this.checkActiveDescendant(evt.target);
      }, 10);
    }
  }

  /**
   * Check for aria-activedescendant changes (used by menus, listboxes, etc.)
   */
  checkActiveDescendant(element) {
    if (!element) return;

    const activeId = element.getAttribute('aria-activedescendant');
    if (activeId) {
      const activeElement = this.storyDocument.getElementById(activeId);
      if (activeElement) {
        this.updateFocusIndicator(activeElement);
        this.announceElement(activeElement);
        return;
      }
    }

    // Also check shadow DOM for the active element
    if (element.shadowRoot) {
      const activeInShadow = element.shadowRoot.querySelector(
        '[aria-selected="true"], [aria-current="true"], :focus',
      );
      if (activeInShadow) {
        this.updateFocusIndicator(activeInShadow);
        this.announceElement(activeInShadow);
      }
    }
  }

  /**
   * Watch for DOM mutations to catch dynamic focus changes
   */
  onMutation(mutations) {
    if (!this.isRunning) return;

    const watchedAttrs = [
      'aria-selected',
      'aria-checked',
      'aria-expanded',
      'aria-activedescendant',
    ];

    mutations.forEach(mutation => {
      if (mutation.type === 'attributes') {
        const { target } = mutation;

        if (watchedAttrs.indexOf(mutation.attributeName) !== -1) {
          if (mutation.attributeName === 'aria-activedescendant') {
            this.checkActiveDescendant(target);
          } else if (
            target.getAttribute(mutation.attributeName) === 'true' &&
            mutation.attributeName === 'aria-selected'
          ) {
            // Item was just selected
            this.updateFocusIndicator(target);
            this.announceElement(target);
          }
        }
      }
    });
  }

  setupMutationObserver() {
    if (!this.storyDocument || !this.storyDocument.body) return;

    this.mutationObserver = new MutationObserver(this.handleMutation);
    this.mutationObserver.observe(this.storyDocument.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['aria-selected', 'aria-checked', 'aria-expanded', 'aria-activedescendant'],
    });
  }

  start(iframe) {
    // Find iframe if not provided
    let targetIframe = iframe;
    if (!targetIframe) {
      targetIframe =
        document.getElementById('storybook-preview-iframe') ||
        document.querySelector('iframe[data-is-storybook="true"]') ||
        document.querySelector('iframe');
    }

    if (
      !targetIframe ||
      !targetIframe.contentWindow ||
      !targetIframe.contentWindow.document ||
      !targetIframe.contentWindow.document.body
    ) {
      // eslint-disable-next-line no-console
      console.warn('[Screen Reader] Waiting for iframe...');
      setTimeout(() => {
        this.start(targetIframe);
      }, 200);
      return;
    }

    // Stop any existing instance first
    this.stop();

    this.storyDocument = targetIframe.contentWindow.document;

    // Wait for document to be ready
    if (this.storyDocument.readyState === 'loading') {
      this.storyDocument.addEventListener('DOMContentLoaded', () => {
        this.start(targetIframe);
      });
      return;
    }

    this.addStyles();

    // Listen for focus changes - this is the key!
    this.storyDocument.addEventListener('focusin', this.handleFocusIn, true);
    this.storyDocument.addEventListener('keydown', this.handleKeyDown, true);

    // Set up mutation observer for aria attribute changes
    this.setupMutationObserver();

    this.isRunning = true;
    this.lastAnnouncedElement = null;

    this.say('Screen reader enabled. Use Tab or arrow keys to navigate.');

    // Announce current focus if any
    const currentFocus = this.storyDocument.activeElement;
    if (currentFocus && currentFocus !== this.storyDocument.body) {
      this.updateFocusIndicator(currentFocus);
      this.announceElement(currentFocus);
    }
  }

  stop() {
    if (!this.isRunning && !this.storyDocument) return;

    // Clean up event listeners
    if (this.storyDocument) {
      this.storyDocument.removeEventListener('focusin', this.handleFocusIn, true);
      this.storyDocument.removeEventListener('keydown', this.handleKeyDown, true);
    }

    // Clean up mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Remove focus indicator
    if (this.storyDocument) {
      const current = querySelectorDeep('[data-sr-current]', this.storyDocument);
      if (current) current.removeAttribute('data-sr-current');
      this.removeStyles();
    }

    this.isRunning = false;
    this.lastAnnouncedElement = null;

    if (this.voiceEnabled || this.textEnabled) {
      this.say('Screen reader disabled');
    }
  }
}
