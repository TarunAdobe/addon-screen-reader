import React from 'react';
import { createComponent } from '@lit/react';
import { addons, types } from '@storybook/manager-api';
import { AddonPanel } from '@storybook/components';
import { ScreenReaderPanel } from './components/screen-reader-panel';

// Create React wrapper for our Lit component
const ScreenReaderPanelReact = createComponent({
  tagName: 'screen-reader-panel',
  elementClass: ScreenReaderPanel,
  react: React,
});

const ADDON_ID = 'screenreader';
const PANEL_ID = `${ADDON_ID}/panel`;

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Screen Reader',
    render: ({ active }) => (
      <AddonPanel active={active}>
        <ScreenReaderPanelReact />
      </AddonPanel>
    ),
  });
});
