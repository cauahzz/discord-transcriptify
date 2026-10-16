import type { CSSProperties } from 'react';
import { ButtonStyle } from 'discord.js';

export const containerStyle = {
  display: 'grid',
  gap: '4px',
  width: '100%',
} satisfies CSSProperties;

export const baseImageStyle = {
  overflow: 'hidden',
  position: 'relative',
  background: 'var(--dt-surface)',
} satisfies CSSProperties;

export const ButtonStyleMapping = {
  [ButtonStyle.Primary]: 'primary',
  [ButtonStyle.Secondary]: 'secondary',
  [ButtonStyle.Success]: 'success',
  [ButtonStyle.Danger]: 'destructive',
  [ButtonStyle.Link]: 'link',
} as const;

export const globalStyles = `
  /* Voice message */
  .discord-voice-message {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    background-color: var(--dt-mod-subtle);
    border: 1px solid var(--dt-border-subtle);
    border-radius: 24px;
    padding: 11px;
    margin-top: 8px;
    width: fit-content;
    max-width: min(400px, 100%);
    min-width: 0;
    box-sizing: border-box;
    overflow: hidden;
    gap: 12px;
    font-family: var(--dt-font);
  }

  /* without the player script the native controls sit on their own row */
  .discord-voice-message audio {
    flex: 1 1 100%;
    width: 100%;
    min-width: 0;
  }

  .discord-voice-play-button {
    display: none;
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 50%;
    border: 0;
    background-color: var(--dt-brand);
    color: white;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
  }

  .discord-voice-play-button.is-playing {
    background-color: #4452bb;
  }

  .discord-voice-icon-pause,
  .is-playing .discord-voice-icon-play {
    display: none;
  }

  .is-playing .discord-voice-icon-pause {
    display: inline;
  }

  .discord-voice-message.is-enhanced {
    flex-wrap: nowrap;
  }

  .discord-voice-message.is-enhanced audio {
    display: none;
  }

  .discord-voice-message.is-enhanced .discord-voice-play-button {
    display: inline-flex;
  }

  .discord-voice-waveform {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 24px;
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
  }

  .discord-voice-waveform-bar {
    width: 3px;
    flex: 0 0 3px;
    min-height: 4px;
    border-radius: 2px;
    background-color: var(--dt-text-interactive);
    transition: background-color 0.15s;
  }

  .discord-voice-duration {
    font-size: 14px;
    font-weight: 400;
    color: var(--dt-text-interactive);
    white-space: nowrap;
    min-width: 30px;
  }

  /* Components V2 */
  .discord-v2-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-sizing: border-box;
    width: fit-content;
    min-width: 0;
    max-width: min(100%, 600px);
    padding: 16px;
    background-color: var(--dt-surface);
    border: 1px solid var(--dt-border-subtle);
    border-radius: 8px;
    overflow: hidden;
  }

  /* a gallery has no width of its own, so it asks for the whole row */
  .discord-v2-container:has(.discord-media-gallery) {
    width: 100%;
  }

  .discord-v2-container.has-accent::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    background-color: var(--dt-accent);
  }

  .discord-text-display {
    font-family: var(--dt-font);
    font-size: 14px;
    line-height: 1.375;
    color: var(--dt-text);
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }

  .discord-separator.is-large {
    margin: 8px 0;
  }

  .discord-separator.has-divider {
    border-bottom: 1px solid var(--dt-border);
  }

  .discord-section {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
  }

  .discord-section-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .discord-section-accessory {
    flex: none;
  }

  .discord-thumbnail {
    display: block;
    width: 85px;
    height: 85px;
    object-fit: cover;
    border-radius: 8px;
  }

  .discord-media-gallery,
  .discord-attachment-gallery {
    max-width: 550px;
    border-radius: 8px;
    overflow: hidden;
  }

  .discord-v2-container .discord-media-gallery {
    max-width: none;
  }

  /* the rows of components sit 6px apart, 4px from the grid and 2px from here */
  .discord-attachments > .discord-component-row + .discord-component-row {
    margin-top: 2px;
  }

  /* fixed-width children (select menus, file cards) would otherwise stretch the column past a narrow screen */
  discord-messages .discord-message-content {
    min-width: 0;
  }

  discord-messages discord-attachments.discord-attachments {
    grid-template-columns: minmax(0, 100%);
  }

  discord-messages discord-attachments.discord-attachments > * {
    min-width: 0;
    max-width: 100%;
  }

  discord-action-row.discord-action-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  /* Buttons */
  .discord-button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    height: 32px;
    min-width: 0;
    margin: 0;
    padding: 3px 11px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #fff !important;
    font-family: var(--dt-font);
    font-size: 14px;
    font-weight: 500;
    line-height: 18px;
    text-align: center;
    text-decoration: none !important;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.17s ease;
  }

  .discord-button-content,
  .discord-button-launch {
    display: inline-flex;
    align-items: center;
  }

  .discord-button-emoji {
    width: 19px;
    height: 19px;
    margin-right: 4px;
    flex-shrink: 0;
  }

  .discord-button-label {
    line-height: 18px;
  }

  .discord-button-launch {
    margin-left: 8px;
  }

  .discord-button-primary {
    background-color: var(--dt-brand);
  }
  .discord-button-primary:hover {
    background-color: #4452bb;
  }

  .discord-button-secondary,
  .discord-button-link {
    background-color: var(--dt-mod-subtle);
    border-color: rgba(153, 153, 153, 0.04);
    color: var(--dt-text-strong) !important;
  }
  .discord-button-secondary:hover,
  .discord-button-link:hover {
    background-color: var(--dt-mod-normal);
  }

  .discord-button-success {
    background-color: #008545;
  }
  .discord-button-success:hover {
    background-color: #006b37;
  }

  .discord-button-destructive {
    background-color: #d22d39;
  }
  .discord-button-destructive:hover {
    background-color: #a9232e;
  }

  .discord-button-disabled,
  .discord-button-disabled:hover {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Select Menu */
  .discord-select-menu {
    position: relative;
    box-sizing: border-box;
    flex: 1 1 auto;
    /* a fixed width, as the row shrinks to its content and would otherwise leave the menu as wide as its label */
    width: 400px;
    max-width: 100%;
    min-width: 0;
    color: var(--dt-text);
    font-family: var(--dt-font);
  }

  .discord-select-menu-control {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    height: 40px;
    padding: 8px 8px 8px 12px;
    background-color: rgba(0, 0, 0, 0.12);
    border: 1px solid var(--dt-border);
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: default;
    /* the summary's own marker, which the chevron replaces */
    list-style: none;
  }

  .discord-select-menu-control::-webkit-details-marker {
    display: none;
  }

  details.discord-select-menu > .discord-select-menu-control {
    cursor: pointer;
    user-select: none;
  }

  details.discord-select-menu[open] > .discord-select-menu-control {
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
  }

  details.discord-select-menu[open] .discord-select-menu-chevron {
    transform: rotate(180deg);
  }

  .discord-select-menu-control:focus-visible {
    outline: 2px solid #5865f2;
    outline-offset: 2px;
  }

  .discord-select-menu-disabled {
    opacity: 0.5;
  }

  .discord-select-menu-disabled .discord-select-menu-control {
    cursor: not-allowed;
  }

  .discord-select-menu-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--dt-text-interactive);
  }

  .discord-select-menu-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--dt-text);
  }

  .discord-select-menu-chevron svg {
    width: 18px;
    height: 18px;
  }

  /* laid over what follows, as the client's list is, so opening a menu does not move the page */
  .discord-select-menu-options {
    position: absolute;
    top: 100%;
    right: 0;
    left: 0;
    z-index: 20;
    box-sizing: border-box;
    max-height: 322px;
    overflow-y: auto;
    border: 1px solid var(--dt-border);
    border-top: 0;
    border-radius: 0 0 8px 8px;
    background: var(--dt-surface);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
    color-scheme: dark;
  }

  .discord-select-menu-option {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 8px 12px;
    box-sizing: border-box;
  }

  .discord-select-menu-option:hover,
  .discord-select-menu-option.is-selected {
    background: rgba(255, 255, 255, 0.06);
  }

  .discord-select-menu-option-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .discord-select-menu-option-label {
    overflow: hidden;
    font-size: 14px;
    font-weight: 500;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .discord-select-menu-option-description {
    overflow: hidden;
    color: var(--dt-text-muted);
    font-size: 12px;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .discord-select-menu-option-emoji {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  /* File attachment card */
  .discord-custom-file-base {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    box-sizing: border-box;
    width: 432px;
    max-width: 100%;
    min-width: 0;
    padding: 16px;
    background-color: var(--dt-surface);
    border: 1px solid var(--dt-border-subtle);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
  }

  .discord-custom-file-icon {
    display: flex;
    flex-shrink: 0;
  }

  .discord-custom-file-inner {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }

  .discord-custom-file-name {
    display: block;
    overflow: hidden;
    color: var(--dt-link);
    font-size: 16px;
    line-height: 20px;
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .discord-custom-file-name:hover {
    text-decoration: underline;
  }

  .discord-custom-file-size {
    color: var(--dt-text-muted);
    font-size: 12px;
    line-height: 16px;
  }

  /* like the client, the download button waits for the pointer */
  .discord-custom-file-download {
    position: absolute;
    top: -8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    box-sizing: border-box;
    padding: 6px;
    background-color: var(--dt-bg-low);
    border: 1px solid var(--dt-border-subtle);
    border-radius: 5px;
    color: var(--dt-text-interactive);
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  .discord-custom-file-base:hover .discord-custom-file-download,
  .discord-custom-file-download:focus-visible {
    opacity: 1;
  }

  .discord-custom-file-download:hover {
    color: var(--dt-text);
  }

  .discord-custom-file-download svg {
    width: 20px;
    height: 20px;
  }

  /* Thread messages */
  .discord-thread-messages {
    margin: 4px 0;
    padding-left: 12px;
    border-left: 4px solid var(--dt-border);
    color: var(--dt-text);
  }

  .discord-thread-messages > summary {
    cursor: pointer;
    font-size: 14px;
  }

  discord-messages.discord-thread-message-list {
    display: block;
    min-height: auto;
    border: 0;
    background: none;
  }

  /* the thread modal shows these messages instead */
  .discord-thread-messages.is-modal-backed {
    display: none;
  }

  .discord-thread-preview-container {
    position: relative;
    margin-top: 4px;
    margin-bottom: 2px;
  }

  /* the connector runs from the system icon, which sits in the avatar column */
  .discord-thread-preview-container::before {
    content: '';
    position: absolute;
    top: -8px;
    bottom: 50%;
    left: -36px;
    width: 36px;
    box-sizing: border-box;
    border-left: 2px solid var(--dt-border-strong);
    border-bottom: 2px solid var(--dt-border-strong);
    border-bottom-left-radius: 8px;
  }

  .discord-thread-preview-box {
    display: inline-flex;
    flex-direction: column;
    box-sizing: border-box;
    max-width: min(100%, 480px);
    min-width: 0;
    padding: 8px;
    background-color: var(--dt-surface);
    border: 1px solid var(--dt-border-subtle);
    border-radius: 4px;
    font-size: 14px;
    line-height: 18px;
    transition: background-color 0.16s ease, border-color 0.16s ease;
  }

  .discord-thread-preview-box.is-openable {
    cursor: pointer;
  }

  .discord-thread-preview-box.is-openable:hover {
    background-color: var(--dt-surface-higher);
  }

  .discord-thread-preview-box:focus-visible {
    outline: 2px solid var(--dt-link);
    outline-offset: 2px;
  }

  .discord-thread-preview-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-weight: 600;
    color: var(--dt-text-strong);
    overflow-wrap: anywhere;
  }

  .discord-thread-preview-header span {
    flex-shrink: 0;
    color: var(--dt-link);
    white-space: nowrap;
  }

  .discord-thread-preview-box.is-openable:hover .discord-thread-preview-header span {
    text-decoration: underline;
  }

  .discord-thread-preview-message {
    display: flex;
    align-items: center;
    min-width: 0;
    margin-top: 2px;
    color: var(--dt-text);
  }

  .discord-thread-preview-message img {
    flex: none;
    width: 16px;
    height: 16px;
    margin-right: 8px;
    border-radius: 50%;
  }

  .discord-thread-preview-message strong {
    flex: none;
    margin-right: 4px;
    font-weight: 500;
    color: var(--dt-text-strong);
  }

  .discord-thread-preview-message span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  discord-thread.is-openable {
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.16s ease;
  }

  discord-thread.is-openable:hover {
    background: rgba(79, 84, 92, 0.16);
  }

  /* below the image preview, which images inside a thread open */
  /* the thread opens beside the channel, as the client's split view does; only the panel takes clicks */
  .discord-thread-modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: flex-end;
    visibility: hidden;
    pointer-events: none;
    z-index: 9300;
  }

  .discord-thread-modal-overlay.is-open {
    visibility: visible;
  }

  .discord-thread-modal {
    --dt-thread-panel: min(100vw, max(420px, 42vw));
    display: flex;
    flex-direction: column;
    width: var(--dt-thread-panel);
    height: 100%;
    background: var(--dt-bg);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    box-sizing: border-box;
    font-family: var(--dt-font);
    pointer-events: auto;
  }

  body.has-thread-panel > discord-messages {
    margin-right: min(100vw, max(420px, 42vw));
  }

  @media (max-width: 900px) {
    .discord-thread-modal {
      --dt-thread-panel: 100vw;
    }

    body.has-thread-panel > discord-messages {
      margin-right: 0;
    }
  }

  .discord-thread-intro {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 24px 16px 16px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--dt-text);
  }

  .discord-thread-intro-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
  }

  .discord-thread-intro-name {
    margin: 16px 0 8px;
    font-size: 32px;
    font-weight: 700;
    line-height: 40px;
    overflow-wrap: anywhere;
  }

  .discord-thread-intro-starter {
    margin: 0;
    font-size: 16px;
    line-height: 20px;
  }

  .discord-thread-intro-starter:empty {
    display: none;
  }

  .discord-thread-intro-starter strong {
    font-weight: 500;
  }

  .discord-thread-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;
    padding: 0 8px 0 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(36, 36, 41, 0.96);
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .discord-thread-modal-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
    color: var(--dt-text-strong);
    font-size: 16px;
    font-weight: 600;
  }

  .discord-thread-modal-title svg {
    flex-shrink: 0;
    color: var(--dt-text-muted);
  }

  .discord-thread-modal-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .discord-thread-modal-count {
    margin-top: 8px;
    color: var(--dt-text-muted);
    font-size: 12px;
    line-height: 16px;
  }

  .discord-thread-modal-close {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--dt-text-interactive);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.16s ease, color 0.16s ease;
  }

  .discord-thread-modal-close:hover {
    background: rgba(79, 84, 92, 0.32);
    color: var(--dt-text-strong);
  }

  .discord-thread-modal-body {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    background: var(--dt-bg);
  }

  .discord-thread-modal-body discord-messages {
    display: block;
    min-height: auto;
    border: 0;
    background: var(--dt-bg);
    padding: 8px 0 16px;
  }

  /* Server tags */
  .discord-server-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 6px;
    padding: 2px 6px 2px 4px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(18, 18, 20, 0.55);
    color: var(--dt-text);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    vertical-align: middle;
    white-space: nowrap;
  }

  .discord-server-tag-badge {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .discord-server-tag-text {
    letter-spacing: 0.02em;
  }

  .discord-light-theme .discord-server-tag {
    border-color: rgba(116, 127, 141, 0.18);
    background: rgba(116, 127, 141, 0.12);
    color: #4f5660;
  }

  /* Forwarded message */
  .discord-forwarded {
    border-left: 4px solid var(--dt-border);
    border-radius: 4px;
    padding-left: 12px;
    margin: 2px 0;
  }

  .discord-forwarded-label,
  .discord-forwarded-meta {
    color: var(--dt-text-muted);
    font-size: 13px;
    font-weight: 500;
  }

  .discord-forwarded-label {
    font-style: italic;
    margin-bottom: 4px;
  }

  .discord-forwarded-meta {
    font-size: 12px;
    margin-top: 4px;
  }

  /* Sticker */
  .discord-sticker {
    display: block;
    width: 160px;
    height: 160px;
    margin: 4px 0;
    object-fit: contain;
  }

  .discord-sticker--lottie {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 8px;
    text-align: center;
    background-color: var(--dt-surface);
    border-radius: 8px;
  }

  .discord-sticker-name {
    font-weight: 600;
  }

  .discord-sticker-hint {
    color: var(--dt-text-muted);
    font-size: 13px;
  }

  /* Poll */
  .discord-poll {
    border: 1px solid var(--dt-border-subtle);
    border-radius: 8px;
    padding: 16px;
    margin-top: 8px;
    max-width: 500px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .discord-poll-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .discord-poll-question {
    font-size: 16px;
    font-weight: 700;
    color: var(--dt-text-strong);
    overflow-wrap: anywhere;
  }

  .discord-poll-subtitle {
    font-size: 12px;
    color: var(--dt-text-muted);
    font-weight: 400;
  }

  .discord-poll-answers {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .discord-poll-answer {
    position: relative;
    background-color: var(--dt-surface);
    border: 1px solid var(--dt-border-subtle);
    border-radius: 8px;
    overflow: hidden;
    min-height: 44px;
  }

  .discord-poll-bar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background-color: #5865f2;
    opacity: 0.2;
    border-radius: 7px;
  }

  .discord-poll-content {
    display: flex;
    align-items: center;
    padding: 0 16px;
    width: 100%;
    min-height: 44px;
    z-index: 1;
    position: relative;
    gap: 8px;
    box-sizing: border-box;
  }

  .discord-poll-emoji {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  .discord-poll-emoji img {
    max-width: 100%;
    max-height: 100%;
  }

  .discord-poll-text {
    flex-grow: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 16px;
    color: var(--dt-text);
    font-weight: 500;
  }

  .discord-poll-votes {
    font-size: 13px;
    color: var(--dt-text-muted);
    font-weight: 600;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .discord-poll-footer {
    font-size: 14px;
    color: var(--dt-text-muted);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 4px 12px;
  }

  .discord-poll-footer-left {
    font-weight: 700;
    color: var(--dt-text-interactive);
  }

  /* Discord's current dark palette, read from the live client */
  :root {
    --dt-font: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    --dt-font-mono: 'gg mono', 'Source Code Pro', Consolas, 'Andale Mono WT', 'Andale Mono', 'Lucida Console',
      'Lucida Sans Typewriter', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Liberation Mono', 'Nimbus Mono L',
      Monaco, 'Courier New', Courier, monospace;
    --dt-bg: #1a1a1e;
    --dt-bg-low: #202024;
    --dt-bg-lowest: #121214;
    --dt-surface: #242429;
    --dt-surface-higher: #28282d;
    --dt-surface-highest: #2c2d32;
    --dt-text: #efeff1;
    --dt-text-strong: #fbfbfb;
    --dt-text-muted: #96979e;
    --dt-text-subtle: #81828a;
    --dt-text-interactive: #abacb2;
    --dt-link: #4d96ee;
    --dt-brand: #5865f2;
    --dt-border-subtle: rgba(148, 148, 156, 0.12);
    --dt-border: rgba(150, 150, 160, 0.2);
    --dt-border-strong: rgba(150, 150, 159, 0.44);
    --dt-mod-subtle: rgba(148, 148, 156, 0.12);
    --dt-mod-normal: rgba(149, 149, 162, 0.16);
    --dt-mod-strong: rgba(150, 150, 160, 0.2);
    --dt-code-bg: rgba(89, 102, 242, 0.08);
    --dt-code-text: #e4e4e6;
    --dt-mention-bg: rgba(88, 100, 242, 0.24);
    --dt-mention-text: #a9bbff;
  }

  /* Messages and their components */
  discord-messages.discord-messages {
    background-color: var(--dt-bg);
    color: var(--dt-text);
    font-family: var(--dt-font);
    font-size: 16px;
    line-height: 22px;
    border: 0;
  }

  discord-message.discord-message {
    color: var(--dt-text);
    font-family: var(--dt-font);
    font-size: 16px;
  }

  discord-message.discord-message:hover {
    background-color: var(--dt-mod-subtle);
  }

  discord-message.discord-message {
    padding-right: 24px !important;
  }

  .discord-message .discord-message-content {
    line-height: 22px;
  }

  /* the avatar column stays so the text keeps its indent; the page scripts still find every element they read */
  discord-message.discord-message-continuation {
    margin-top: 0;
  }

  /* child combinators: the messages of a thread sit inside their parent message and keep their own headers */
  discord-message.discord-message-continuation > .discord-message-inner > .discord-author-avatar img,
  discord-message.discord-message-continuation > .discord-message-inner > .discord-message-content > .discord-author-info,
  discord-message.discord-message-continuation > .discord-message-inner > .discord-message-content > .discord-message-timestamp {
    display: none;
  }

  .discord-message .discord-author-avatar {
    margin-top: 4px;
  }

  .discord-message a {
    color: var(--dt-link);
  }

  .discord-message .discord-author-info .discord-author-username {
    color: var(--dt-text-strong);
  }

  .discord-message .discord-message-timestamp {
    color: var(--dt-text-subtle);
    font-weight: 500;
  }

  .discord-message .discord-message-edited {
    color: var(--dt-text-subtle);
    font-size: 10px;
  }

  /* the library spells it "Bot"; the client calls these accounts apps */
  .discord-author-info > .discord-application-tag:not(.discord-application-tag-op),
  .discord-replied-message > .discord-application-tag:not(.discord-application-tag-op) {
    font-size: 0;
  }

  .discord-author-info > .discord-application-tag:not(.discord-application-tag-op)::after,
  .discord-replied-message > .discord-application-tag:not(.discord-application-tag-op)::after {
    content: 'APP';
    font-size: 10px;
    font-weight: 400;
    line-height: 15px;
  }

  discord-messages discord-inline-code > code,
  .discord-message .discord-message-body discord-inline-code > code {
    margin: -0.2em 0;
    padding: 0 0.2em;
    background: var(--dt-code-bg);
    color: var(--dt-text);
    border: 1px solid var(--dt-border);
    border-radius: 4px;
    font-family: var(--dt-font-mono);
    font-size: 0.85em;
    line-height: 18px;
    white-space: break-spaces;
  }

  /* the code element is the box, so it draws the same chip whatever it sits in */
  discord-messages .discord-code-block-pre,
  discord-messages .discord-embed .discord-code-block-pre,
  discord-messages .discord-code-block-pre.hljs {
    margin: 6px 0 0;
    padding: 7px;
    background: var(--dt-code-bg);
    color: var(--dt-code-text);
    border: 1px solid var(--dt-border);
    border-radius: 4px;
    font-family: var(--dt-font-mono);
    font-size: 14px;
    line-height: 18px;
  }

  discord-messages .discord-code-block-pre code.hljs,
  discord-messages .discord-embed .discord-code-block-pre code.hljs {
    background: transparent;
    color: inherit;
    font-family: inherit;
  }

  /* outranks the generic message pre rule, so the block matches the highlighted ones */
  discord-messages pre.discord-ansi.discord-code-block-pre {
    border-color: var(--dt-border);
  }
  /* Discord's own ANSI palette */
  .discord-ansi .ansi-30 { color: #4f545c; }
  .discord-ansi .ansi-31 { color: #dc322f; }
  .discord-ansi .ansi-32 { color: #859900; }
  .discord-ansi .ansi-33 { color: #b58900; }
  .discord-ansi .ansi-34 { color: #268bd2; }
  .discord-ansi .ansi-35 { color: #d33682; }
  .discord-ansi .ansi-36 { color: #2aa198; }
  .discord-ansi .ansi-37 { color: #ffffff; }
  .discord-ansi .ansi-40 { background-color: #002b36; }
  .discord-ansi .ansi-41 { background-color: #cb4b16; }
  .discord-ansi .ansi-42 { background-color: #586e75; }
  .discord-ansi .ansi-43 { background-color: #657b83; }
  .discord-ansi .ansi-44 { background-color: #839496; }
  .discord-ansi .ansi-45 { background-color: #6c71c4; }
  .discord-ansi .ansi-46 { background-color: #93a1a1; }
  .discord-ansi .ansi-47 { background-color: #fdf6e3; }
  .discord-ansi .ansi-bold { font-weight: 700; }
  .discord-ansi .ansi-underline { text-decoration: underline; }

  .discord-code-block-pre .hljs-comment {
    color: #999aa1;
  }

  .discord-code-block-pre .hljs-keyword,
  .discord-code-block-pre .hljs-selector-tag,
  .discord-code-block-pre .hljs-doctag,
  .discord-code-block-pre .hljs-section,
  .discord-code-block-pre .hljs-deletion {
    color: #ff9691;
  }

  .discord-code-block-pre .hljs-string,
  .discord-code-block-pre .hljs-regexp,
  .discord-code-block-pre .hljs-addition,
  .discord-code-block-pre .hljs-code {
    color: #73c48b;
  }

  .discord-code-block-pre .hljs-number,
  .discord-code-block-pre .hljs-literal,
  .discord-code-block-pre .hljs-symbol,
  .discord-code-block-pre .hljs-bullet {
    color: #efa275;
  }

  .discord-code-block-pre .hljs-title,
  .discord-code-block-pre .hljs-title.class_,
  .discord-code-block-pre .hljs-title.function_ {
    color: #9db0ff;
  }

  .discord-code-block-pre .hljs-built_in,
  .discord-code-block-pre .hljs-meta {
    color: #f49f00;
  }

  .discord-code-block-pre .hljs-attr,
  .discord-code-block-pre .hljs-attribute,
  .discord-code-block-pre .hljs-name,
  .discord-code-block-pre .hljs-link,
  .discord-code-block-pre .hljs-template-variable,
  .discord-code-block-pre .hljs-variable {
    color: #82b7f8;
  }

  .discord-code-block-pre .hljs-type,
  .discord-code-block-pre .hljs-tag {
    color: #ff8be2;
  }

  /* Mentions */
  .discord-message .discord-mention {
    color: var(--dt-mention-text);
    background-color: var(--dt-mention-bg);
    border-radius: 3px;
  }

  .discord-message .discord-mention:hover {
    color: #fff;
    background-color: var(--dt-brand);
  }

  discord-message.discord-message.discord-highlight-mention {
    background-color: rgba(242, 166, 0, 0.08);
    border-radius: 0 4px 4px 0;
  }

  discord-message.discord-message.discord-highlight-mention:hover {
    background-color: rgba(255, 153, 0, 0.04);
  }

  .discord-message.discord-highlight-mention::before {
    background-color: #ea9800;
  }

  /* System messages */
  discord-system-message.discord-system-message {
    color: var(--dt-text-subtle);
    font-family: var(--dt-font);
    padding-right: 24px;
  }

  .discord-system-message:hover {
    background-color: var(--dt-mod-subtle);
  }

  .discord-system-message .discord-message-content {
    line-height: 22px;
  }

  .discord-system-message .discord-message-content i,
  .discord-system-message .discord-message-content strong {
    color: var(--dt-text-strong);
  }

  .discord-system-message .discord-message-icon svg {
    width: 18px;
    height: 18px;
  }

  .discord-system-message .discord-message-timestamp {
    color: var(--dt-text-subtle);
    font-weight: 500;
  }

  /* Replies */
  .discord-replied-message {
    color: var(--dt-text-muted);
    font-family: var(--dt-font);
  }

  .discord-replied-message:before {
    border-color: var(--dt-border-strong);
  }

  /* Spoilers: text hides behind a bar, anything else behind a card with a label */
  discord-messages discord-spoiler.discord-spoiler {
    position: relative;
    display: block;
    overflow: hidden;
    background-color: #666770;
    border-radius: 8px;
    box-shadow: rgba(0, 0, 0, 0.08) 0.5px 0.5px 1px 1px;
    cursor: pointer;
  }

  discord-messages discord-spoiler.discord-spoiler > * {
    visibility: hidden;
  }

  discord-messages discord-spoiler.discord-spoiler::after {
    content: 'Spoiler';
    position: absolute;
    top: 50%;
    left: 50%;
    padding: 8px 12px;
    background-color: rgba(0, 0, 0, 0.6);
    border-radius: 20px;
    color: #e4e4e6;
    font-size: 15px;
    font-weight: 600;
    line-height: 15px;
    text-transform: uppercase;
    transform: translate(-50%, -50%);
    transition: background-color 0.1s ease;
  }

  discord-messages discord-spoiler.discord-spoiler:hover {
    background-color: #84858d;
  }

  discord-messages discord-spoiler.discord-spoiler:hover::after {
    background-color: rgba(0, 0, 0, 0.88);
  }

  discord-messages discord-spoiler.discord-spoiler--revealed {
    display: block;
    background-color: transparent;
    box-shadow: none;
    cursor: auto;
  }

  discord-messages discord-spoiler.discord-spoiler--revealed > * {
    visibility: visible;
  }

  discord-messages discord-spoiler.discord-spoiler--revealed::after {
    content: none;
  }

  .discord-message .discord-message-body discord-spoiler.discord-spoiler {
    display: inline;
    overflow: visible;
    background-color: #666770;
    border-radius: 3px;
    box-shadow: none;
  }

  .discord-message .discord-message-body discord-spoiler.discord-spoiler:hover {
    background-color: #84858d;
  }

  .discord-message .discord-message-body discord-spoiler.discord-spoiler::after {
    content: none;
  }

  .discord-message .discord-message-body discord-spoiler.discord-spoiler > * {
    visibility: visible;
  }

  .discord-message .discord-message-body discord-spoiler.discord-spoiler--revealed {
    display: inline;
    background-color: var(--dt-mod-subtle);
  }

  /* Reactions */
  .discord-reaction {
    background-color: var(--dt-mod-subtle);
  }

  .discord-reaction:hover {
    background-color: var(--dt-mod-normal);
  }

  /* Embeds */
  .discord-embed {
    color: var(--dt-text);
  }

  .discord-embed .discord-left-border {
    background-color: var(--dt-border);
  }

  .discord-embed .discord-embed-wrapper {
    background-color: var(--dt-surface);
    border: 1px solid var(--dt-border-subtle);
    border-left: 0;
  }

  .discord-embed .discord-embed-author,
  .discord-embed .discord-embed-author a,
  .discord-embed .discord-embed-title,
  .discord-embed .discord-embed-field .discord-field-title {
    color: var(--dt-text-strong);
  }

  .discord-embed .discord-embed-title a {
    color: var(--dt-link);
  }

  .discord-embed-footer,
  .discord-embed-footer .discord-footer-separator {
    color: var(--dt-text);
  }

  .discord-embed .discord-embed-description blockquote::before {
    background-color: var(--dt-border-strong);
  }

  /* Attachments: a lone image or video is fitted into 550 by 350 */
  .discord-attachment {
    margin: 0;
    color: var(--dt-text);
  }

  .discord-attachment .discord-image-wrapper {
    border-radius: 8px;
  }

  .discord-attachment .discord-image-wrapper img,
  .discord-attachment .discord-image-wrapper video {
    display: block;
    width: auto;
    height: auto;
    max-width: min(550px, 100%);
    max-height: 350px;
  }

  .discord-attachment-generic {
    background-color: var(--dt-surface);
    border-color: var(--dt-border-subtle);
  }

  /* Quotes */
  .discord-message .discord-message-body .discord-quote-container > .discord-quote-divider {
    background-color: var(--dt-border-strong);
  }

  .discord-image-preview-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(5, 5, 7, 0.88);
    backdrop-filter: blur(8px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.16s ease;
    z-index: 9999;
  }

  .discord-image-preview-overlay.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  .discord-image-preview-stage {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    max-width: min(100vw - 48px, 1440px);
    max-height: min(100vh - 48px, 1100px);
  }

  .discord-image-preview-image {
    display: block;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 12px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    background: var(--dt-bg-lowest);
  }

  .discord-image-preview-close {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 999px;
    background: rgba(18, 18, 20, 0.9);
    color: var(--dt-text-strong);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.16s ease, transform 0.16s ease;
  }

  .discord-image-preview-close:hover {
    background: rgba(36, 36, 41, 0.96);
  }

  .discord-image-preview-close:active {
    transform: scale(0.97);
  }

  .discord-transcript-header-bar {
    position: sticky;
    top: 0;
    z-index: 9200;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 48px;
    padding: 8px 16px;
    background: rgba(36, 36, 41, 0.96);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
    box-sizing: border-box;
  }

  .discord-transcript-header-main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .discord-transcript-header-server-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    flex: 0 0 auto;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  .discord-transcript-header-glyph,
  .discord-transcript-header-avatar {
    width: 24px;
    height: 24px;
    flex: 0 0 auto;
  }

  .discord-transcript-header-glyph {
    color: var(--dt-text-interactive);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .discord-transcript-header-glyph--hash {
    font-size: 24px;
    font-weight: 500;
    line-height: 1;
    transform: translateY(-1px);
  }

  .discord-transcript-header-avatar {
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  .discord-transcript-header-copy {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    white-space: nowrap;
  }

  .discord-transcript-header-title {
    color: var(--dt-text-strong);
    font-size: 16px;
    font-weight: 700;
    line-height: 1.2;
    flex: 0 0 auto;
  }

  .discord-transcript-header-separator {
    color: var(--dt-border);
    flex: 0 0 auto;
  }

  .discord-transcript-header-topic {
    color: var(--dt-text-muted);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .discord-transcript-header-topic > * {
    display: inline;
  }

  .discord-transcript-header-tools {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    flex: 0 1 auto;
    min-width: 0;
  }

  .discord-transcript-header-tool {
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--dt-text-interactive);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    transition: background-color 0.16s ease, color 0.16s ease;
  }

  .discord-transcript-header-tool:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--dt-text-strong);
  }

  .discord-transcript-header-tool[data-transcript-action] {
    cursor: pointer;
  }

  .discord-transcript-header-tool.is-active {
    background: rgba(255, 255, 255, 0.1);
    color: var(--dt-text-strong);
  }

  .discord-transcript-members-anchor,
  .discord-transcript-threads-anchor,
  .discord-transcript-pins-anchor {
    position: relative;
    flex: 0 0 auto;
  }

  .discord-transcript-members-panel,
  .discord-transcript-threads-panel,
  .discord-transcript-pins-panel {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: min(320px, calc(100vw - 32px));
    max-height: min(420px, 60vh);
    overflow-x: hidden;
    overflow-y: auto;
    color-scheme: dark;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(18, 18, 20, 0.98);
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(16px);
    box-sizing: border-box;
    z-index: 9600;
  }

  /* the list of threads, measured on the client's own */
  .discord-transcript-threads-panel {
    width: min(520px, calc(100vw - 32px));
    max-height: min(640px, 80vh);
    padding: 0;
    font-family: var(--dt-font);
  }

  .discord-transcript-threads-head {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .discord-transcript-threads-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--dt-text);
    font-size: 16px;
    font-weight: 600;
    line-height: 20px;
  }

  .discord-transcript-threads-title svg {
    color: var(--dt-text-muted);
  }

  .discord-transcript-threads-filter {
    flex: 1 1 auto;
    min-width: 0;
    height: 32px;
    padding: 0 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    color: var(--dt-text);
    font: inherit;
    font-size: 14px;
  }

  .discord-transcript-threads-filter:focus {
    border-color: #5865f2;
    outline: none;
  }

  .discord-transcript-threads-label {
    margin: 8px 0;
    padding: 0 16px;
    color: var(--dt-text);
    font-size: 12px;
    font-weight: 700;
    line-height: 16px;
    text-transform: uppercase;
  }

  .discord-transcript-threads-list {
    padding: 0 16px 8px;
  }

  .discord-transcript-threads-card {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    padding: 15px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: var(--dt-surface);
    color: var(--dt-text);
    text-decoration: none;
  }

  .discord-transcript-threads-card[hidden] {
    display: none;
  }

  .discord-transcript-threads-card:hover,
  .discord-transcript-threads-card:focus-visible {
    background: rgba(255, 255, 255, 0.08);
  }

  .discord-transcript-threads-copy {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .discord-transcript-threads-name {
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .discord-transcript-threads-last {
    display: flex;
    align-items: center;
    min-width: 0;
    font-size: 14px;
    line-height: 18px;
    white-space: nowrap;
  }

  .discord-transcript-threads-last-avatar {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    margin-right: 8px;
    border-radius: 50%;
  }

  .discord-transcript-threads-last-author {
    flex: 0 0 auto;
    font-weight: 500;
  }

  .discord-transcript-threads-last-text {
    overflow: hidden;
    margin-right: 6px;
    text-overflow: ellipsis;
  }

  .discord-transcript-threads-date {
    flex: 0 0 auto;
    color: var(--dt-text-muted);
  }

  .discord-transcript-threads-starter {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }

  .discord-transcript-members-panel.is-open,
  .discord-transcript-threads-panel.is-open,
  .discord-transcript-pins-panel.is-open {
    display: block;
  }

  .discord-transcript-members-heading,
  .discord-transcript-pins-heading {
    padding: 4px 8px 8px;
    color: var(--dt-text-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .discord-transcript-members-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .discord-transcript-members-row,
  .discord-transcript-pins-row {
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px;
    border-radius: 8px;
    min-width: 0;
  }

  .discord-transcript-pins-row {
    cursor: pointer;
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    text-decoration: none;
    display: flex;
  }

  .discord-transcript-pins-row:hover {
    color: inherit;
    text-decoration: none;
  }

  .discord-transcript-members-row:hover,
  .discord-transcript-pins-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .discord-transcript-members-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex: 0 0 auto;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  .discord-transcript-members-avatar--fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #5865f2;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }

  .discord-transcript-members-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--dt-text-strong);
  }

  .discord-transcript-members-count {
    flex: 0 0 auto;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--dt-text-interactive);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.4;
    white-space: nowrap;
  }

  .discord-transcript-members-empty {
    padding: 12px 8px;
    color: var(--dt-text-muted);
    font-size: 13px;
    text-align: center;
  }

  .discord-transcript-pins-copy {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .discord-transcript-pins-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  .discord-transcript-pins-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex: 0 0 auto;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  .discord-transcript-pins-avatar--fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #5865f2;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }

  .discord-transcript-pins-author {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--dt-text-strong);
  }

  .discord-transcript-pins-date {
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;
    color: var(--dt-text-muted);
  }

  .discord-transcript-pins-preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.25;
    color: var(--dt-text-interactive);
  }

  .discord-transcript-header-search-slot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
    flex: 0 1 auto;
  }

  .discord-transcript-header-search-slot .discord-transcript-search-shell {
    position: static;
    top: auto;
    right: auto;
    max-width: none;
    align-items: center;
  }

  .discord-transcript-header-search-slot .discord-transcript-search {
    position: relative;
    overflow: visible;
    transform-origin: center right;
  }

  /* collapsed, its hidden contents would still widen the page */
  .discord-transcript-header-search-slot .discord-transcript-search-shell:not(.is-open) .discord-transcript-search {
    overflow: hidden;
  }

  .discord-transcript-header-search-slot .discord-transcript-search-bar {
    box-shadow: none;
  }

  .discord-transcript-header-search-slot .discord-transcript-search-meta {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: max-content;
    padding: 8px 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    background: rgba(18, 18, 20, 0.98);
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(16px);
  }

  .discord-transcript-search-shell {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 16px);
    right: calc(env(safe-area-inset-right) + 16px);
    z-index: 9500;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 0;
    max-width: calc(100vw - 24px);
  }

  .discord-transcript-search-shell.is-open {
    gap: 8px;
  }

  .discord-transcript-search-toggle {
    width: 42px;
    height: 42px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(18, 18, 20, 0.92);
    color: var(--dt-text);
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 18px 32px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(14px);
    transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
  }

  .discord-transcript-search-toggle:hover {
    background: rgba(40, 40, 45, 0.96);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .discord-transcript-search-toggle:active {
    transform: translateY(1px);
  }

  .discord-transcript-search-shell.is-open .discord-transcript-search-toggle {
    color: #ffffff;
    border-color: rgba(88, 101, 242, 0.35);
    background: rgba(36, 36, 41, 0.96);
  }

  .discord-transcript-search {
    width: 0;
    max-width: 0;
    display: grid;
    gap: 6px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    box-sizing: border-box;
    overflow: hidden;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px) scale(0.98);
    transform-origin: top right;
    pointer-events: none;
    transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease, width 0.16s ease, max-width 0.16s ease;
  }

  .discord-transcript-search-shell.is-open .discord-transcript-search {
    width: min(248px, calc(100vw - 84px));
    max-width: min(248px, calc(100vw - 84px));
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .discord-transcript-search-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: 36px;
    padding: 0 8px 0 12px;
    border-radius: 8px;
    border: 1px solid var(--dt-surface);
    background: var(--dt-bg-lowest);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
    box-sizing: border-box;
    transition: border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
  }

  .discord-transcript-search-bar:focus-within {
    border-color: var(--dt-border-subtle);
    box-shadow: 0 0 0 1px rgba(88, 101, 242, 0.18), 0 12px 28px rgba(0, 0, 0, 0.24);
    background: var(--dt-surface);
  }

  .discord-transcript-search-input {
    min-width: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border-radius: 0;
    border: 0;
    background: transparent;
    color: var(--dt-text-strong);
    font: inherit;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
  }

  .discord-transcript-search-input::placeholder {
    color: var(--dt-text-muted);
  }

  .discord-transcript-search-submit {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #aeb4bb;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: 0 0 auto;
    transition: background-color 0.16s ease, color 0.16s ease;
  }

  .discord-transcript-search-submit:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--dt-text-strong);
  }

  .discord-transcript-search-meta {
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    padding: 0 2px;
  }

  .discord-transcript-search.has-query .discord-transcript-search-meta {
    display: flex;
  }

  .discord-transcript-search-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
  }

  .discord-transcript-search-count {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    color: var(--dt-text-interactive);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
    flex: 1 1 auto;
  }

  .discord-transcript-search-button {
    height: 30px;
    min-width: 30px;
    padding: 0 8px;
    border-radius: 8px;
    border: 1px solid var(--dt-surface);
    background: rgba(18, 18, 20, 0.92);
    color: #c9ced6;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.16s ease, border-color 0.16s ease, opacity 0.16s ease;
  }

  .discord-transcript-search-button:hover:not(:disabled) {
    background: var(--dt-surface);
    border-color: var(--dt-border-subtle);
  }

  .discord-transcript-search-button:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .discord-transcript-search-button--ghost {
    color: var(--dt-text-interactive);
  }

  discord-message.discord-search-match {
    background: rgba(88, 101, 242, 0.08);
    border-radius: 8px;
    transition: background-color 0.16s ease, box-shadow 0.16s ease;
  }

  discord-message.discord-search-match--active {
    background: rgba(88, 101, 242, 0.14);
    box-shadow: 0 0 0 1px rgba(88, 101, 242, 0.55), 0 0 0 6px rgba(88, 101, 242, 0.12);
  }

  .discord-transcript-header-guild {
    color: var(--dt-text-muted);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.2;
    min-width: 0;
    max-width: 30%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 0 1 auto;
  }

  .discord-image-preview-overlay:focus {
    outline: none;
  }

  .discord-transcript-footer {
    display: flex;
    justify-content: center;
    padding: 28px 16px 36px;
    margin-top: 8px;
  }

  .discord-transcript-footer-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0;
    padding: 7px 16px;
    border-radius: 999px;
    background-color: var(--dt-surface);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--dt-text-muted);
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.01em;
    user-select: none;
  }

  .discord-transcript-footer-pill-separator {
    /* the pill is a flex row, which drops the spaces written around the bar */
    margin: 0 6px;
    color: var(--dt-text-subtle);
    font-weight: 400;
  }

  .discord-transcript-footer-powered {
    color: var(--dt-text-subtle);
    font-weight: 400;
  }

  .discord-transcript-footer-powered a {
    color: var(--dt-link);
    text-decoration: none;
  }

  @media (min-width: 901px) {
    .discord-transcript-search-toggle {
      display: none;
    }

    .discord-transcript-search {
      opacity: 1;
      visibility: visible;
      transform: none;
      pointer-events: auto;
      width: 240px;
    }
  }

  @media (max-width: 768px) {
    .discord-server-tag {
      margin-left: 4px;
      padding: 1px 5px 1px 3px;
      font-size: 9px;
    }

    .discord-server-tag-badge {
      width: 12px;
      height: 12px;
    }

    .discord-image-preview-overlay {
      padding: 16px;
    }

    .discord-image-preview-close {
      top: calc(env(safe-area-inset-top) + 14px);
      right: calc(env(safe-area-inset-right) + 14px);
    }

    .discord-image-preview-stage {
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
    }

    /* an open search takes the whole header, as there is no room beside the channel name */
    .discord-transcript-header-bar:has(.discord-transcript-search-shell.is-open) .discord-transcript-header-main,
    .discord-transcript-header-bar:has(.discord-transcript-search-shell.is-open)
      .discord-transcript-header-tools
      > :not(.discord-transcript-header-search-slot) {
      display: none;
    }

    .discord-transcript-header-bar:has(.discord-transcript-search-shell.is-open) .discord-transcript-header-tools,
    .discord-transcript-header-search-slot:has(.is-open),
    .discord-transcript-header-search-slot .discord-transcript-search-shell.is-open,
    .discord-transcript-header-search-slot .discord-transcript-search-shell.is-open .discord-transcript-search {
      flex: 1 1 auto;
      width: auto;
      max-width: none;
    }

    .discord-transcript-header-bar {
      gap: 10px;
      padding: 8px 12px;
    }

    .discord-transcript-header-server-icon {
      width: 23px;
      height: 23px;
    }

    .discord-transcript-header-copy {
      gap: 6px;
    }

    .discord-transcript-header-title {
      font-size: 15px;
    }

    .discord-transcript-header-topic {
      font-size: 13px;
    }

    .discord-transcript-header-tool {
      width: 30px;
      height: 30px;
    }

    .discord-transcript-header-tool--hide-mobile {
      display: none;
    }

    .discord-transcript-search-shell {
      top: calc(env(safe-area-inset-top) + 12px);
      right: calc(env(safe-area-inset-right) + 12px);
      align-items: flex-end;
      gap: 8px;
    }

    .discord-transcript-header-search-slot .discord-transcript-search-shell {
      top: auto;
      right: auto;
      align-items: center;
      max-width: 100%;
    }

    .discord-transcript-search {
      width: min(calc(100vw - 76px), 248px);
    }

    .discord-transcript-search-meta {
      gap: 8px;
      align-items: center;
      flex-direction: row;
    }

    .discord-transcript-search-actions {
      justify-content: flex-end;
    }

    .discord-transcript-search-count {
      min-width: 0;
    }
  }

  @media (max-width: 480px) {
    .discord-select-menu {
      max-width: 100%;
      flex-basis: 100%;
    }

    .discord-button {
      max-width: 100%;
    }

    .discord-transcript-header-bar {
      padding: 8px 10px;
    }

    .discord-transcript-header-server-icon,
    .discord-transcript-header-glyph,
    .discord-transcript-header-avatar {
      width: 22px;
      height: 22px;
    }

    .discord-transcript-header-topic,
    .discord-transcript-header-separator {
      display: none;
    }

    .discord-transcript-header-tools {
      gap: 8px;
    }

    .discord-transcript-search-shell {
      top: calc(env(safe-area-inset-top) + 10px);
      right: calc(env(safe-area-inset-right) + 10px);
      max-width: calc(100vw - 20px);
    }

    .discord-transcript-search-toggle {
      width: 40px;
      height: 40px;
      border-radius: 11px;
    }

    .discord-transcript-search {
      width: min(calc(100vw - 72px), 228px);
    }

    .discord-transcript-search-bar {
      height: 38px;
    }
  }
`;
