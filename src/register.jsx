import React from 'react';
import { addons, types } from '@storybook/manager-api';
import { AddonPanel } from '@storybook/components';
import AddonLayout from './components/addonLayout';

const ADDON_ID = 'screenreader';
const PANEL_ID = `${ADDON_ID}/panel`;

// Debug logging
console.log('[Screen Reader Addon] Registering addon...', ADDON_ID);

addons.register(ADDON_ID, () => {
  console.log('[Screen Reader Addon] Registration callback called');
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Screen Reader',
    render: ({ active, key }) => {
      console.log('[Screen Reader Addon] Rendering panel', { active, key });
      return (
        <AddonPanel active={active} key={key}>
          <AddonLayout />
        </AddonPanel>
      );
    },
  });
  console.log('[Screen Reader Addon] Panel added:', PANEL_ID);
});
