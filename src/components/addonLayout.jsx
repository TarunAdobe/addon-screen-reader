/* eslint-disable no-unused-vars */
import React, { Component } from 'react';
import styled from 'styled-components';
import { addons } from '@storybook/manager-api';
import { STORY_CHANGED } from '@storybook/core-events';
import ScreenReader from '../screen-reader/screenReader';

const Container = styled.div`
  padding: 16px;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 12px;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const ToggleWrapper = styled.label`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
  margin-right: 10px;
  cursor: pointer;
`;

const ToggleInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  cursor: pointer;
  z-index: 1;

  &:checked + span {
    background-color: #029cfd;
  }

  &:checked + span:before {
    transform: translateX(22px);
  }

  &:focus + span {
    box-shadow: 0 0 0 2px rgba(2, 156, 253, 0.3);
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.2s;
  border-radius: 22px;
  pointer-events: none;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
`;

const Toggle = ({ name, onToggle, checked }) => (
  <ToggleWrapper>
    <ToggleInput
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onToggle}
    />
    <ToggleSlider />
  </ToggleWrapper>
);

const TextContent = styled.div`
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  padding: 12px;
  margin-top: 12px;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 60px;
  max-height: 200px;
  overflow-y: auto;
`;

const StatusText = styled.p`
  font-size: 12px;
  color: #666;
  margin: 8px 0 0 0;
  font-style: italic;
`;

export default class AddonLayout extends Component {
  constructor(props) {
    super(props);
    this.state = {
      screenReaderText: '',
      voice: false,
      text: false,
      isActive: false,
    };
    this.screenReader = null;
    this.channel = null;
    
    this.handleTextToggleChange = this.handleTextToggleChange.bind(this);
    this.handleVoiceToggleChange = this.handleVoiceToggleChange.bind(this);
    this.handleTextChange = this.handleTextChange.bind(this);
    this.handleStoryChange = this.handleStoryChange.bind(this);
  }

  componentDidMount() {
    // Listen for text changes from the screen reader
    window.addEventListener('screen-reader-text-changed', this.handleTextChange);

    // Listen for story changes via Storybook API
    this.channel = addons.getChannel();
    this.channel.on(STORY_CHANGED, this.handleStoryChange);
  }

  componentWillUnmount() {
    window.removeEventListener('screen-reader-text-changed', this.handleTextChange);
    
    if (this.channel) {
      this.channel.off(STORY_CHANGED, this.handleStoryChange);
    }

    // Clean up screen reader
    this.stopScreenReader();
  }

  handleStoryChange() {
    // When story changes, stop the screen reader and reset state
    const { isActive } = this.state;
    
    if (isActive && this.screenReader) {
      // Stop current instance
      this.screenReader.stop();
      this.screenReader = null;
      
      // Wait a bit for the new story to load, then restart if still enabled
      setTimeout(() => {
        const { voice, text } = this.state;
        if (voice || text) {
          this.startScreenReader();
        }
      }, 500);
    }
  }

  handleTextChange(evt) {
    const { text } = evt.detail;
    this.setState({ screenReaderText: text });
  }

  handleVoiceToggleChange(ev) {
    const voice = ev.currentTarget.checked;
    this.setState({ voice }, () => {
      this.updateScreenReader();
    });
  }

  handleTextToggleChange(ev) {
    const text = ev.currentTarget.checked;
    this.setState({ text }, () => {
      this.updateScreenReader();
    });
  }

  findStorybookIframe() {
    return document.getElementById('storybook-preview-iframe')
      || document.querySelector('iframe[data-is-storybook="true"]')
      || document.querySelector('iframe[title*="storybook"]')
      || document.querySelector('iframe');
  }

  startScreenReader() {
    const iframe = this.findStorybookIframe();
    
    if (!iframe) {
      console.error('[Screen Reader Addon] Cannot find preview iframe');
      return;
    }

    this.screenReader = new ScreenReader();
    this.screenReader.voiceEnabled = this.state.voice;
    this.screenReader.textEnabled = this.state.text;
    this.screenReader.start(iframe);
    
    this.setState({ isActive: true });
  }

  stopScreenReader() {
    if (this.screenReader) {
      this.screenReader.stop();
      this.screenReader = null;
    }
    this.setState({ isActive: false, screenReaderText: '' });
  }

  updateScreenReader() {
    const { voice, text, isActive } = this.state;
    const shouldBeActive = voice || text;

    if (shouldBeActive && !isActive) {
      // Start the screen reader
      this.startScreenReader();
    } else if (!shouldBeActive && isActive) {
      // Stop the screen reader
      this.stopScreenReader();
    } else if (shouldBeActive && this.screenReader) {
      // Update settings
      this.screenReader.voiceEnabled = voice;
      this.screenReader.textEnabled = text;
    }
  }

  render() {
    const { voice, text, screenReaderText, isActive } = this.state;

    return (
      <Container>
        <Label>
          <Toggle
            name="toggle-voice"
            checked={voice}
            onToggle={this.handleVoiceToggleChange}
          />
          Voice Reader
        </Label>
        <Label>
          <Toggle
            name="toggle-text"
            checked={text}
            onToggle={this.handleTextToggleChange}
          />
          Text Reader
        </Label>
        
        {text && (
          <TextContent>
            {screenReaderText || 'Navigate to hear announcements...'}
          </TextContent>
        )}
        
        {isActive && (
          <StatusText>
            Use Tab or arrow keys to navigate. Focus changes will be announced.
          </StatusText>
        )}
      </Container>
    );
  }
}
