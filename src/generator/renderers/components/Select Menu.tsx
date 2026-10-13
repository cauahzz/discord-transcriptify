import React from 'react';
import { type MessageActionRowComponent, ComponentType } from 'discord.js';
import { parseDiscordEmoji } from '../../../utils/utils';
import { getSelectTypeLabel } from './utils';

function DiscordSelectMenu({
  component,
}: {
  component: Exclude<MessageActionRowComponent, { type: ComponentType.Button }>;
}) {
  const placeholder = component.placeholder || getSelectTypeLabel(component.type);
  // only a string select carries its options; the others list users, roles or channels the client fills in
  const options = component.type === ComponentType.StringSelect ? (component.options ?? []) : [];
  const classes = `discord-select-menu${component.disabled ? ' discord-select-menu-disabled' : ''}`;

  const control = (
    <>
      <div className="discord-select-menu-label">{placeholder}</div>
      <div className="discord-select-menu-chevron">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M7 10L12 15L17 10H7Z" />
        </svg>
      </div>
    </>
  );

  // a disabled menu does not open in the client either
  if (options.length === 0 || component.disabled) {
    return (
      <div className={classes}>
        <div className="discord-select-menu-control">{control}</div>
      </div>
    );
  }

  // details and summary open and close without a script, so the options can be read in any transcript
  return (
    <details className={classes}>
      <summary className="discord-select-menu-control">{control}</summary>
      <div className="discord-select-menu-options" role="listbox" aria-label={placeholder}>
        {options.map((option, idx) => {
          const emojiUrl = option.emoji ? parseDiscordEmoji(option.emoji) : null;
          return (
            <div
              key={idx}
              className={`discord-select-menu-option${option.default ? ' is-selected' : ''}`}
              role="option"
              aria-selected={option.default ? 'true' : 'false'}
            >
              {emojiUrl && (
                <img
                  src={emojiUrl}
                  alt={option.emoji?.name ?? ''}
                  className="discord-select-menu-option-emoji"
                  draggable={false}
                />
              )}
              <div className="discord-select-menu-option-copy">
                <span className="discord-select-menu-option-label">{option.label}</span>
                {option.description && (
                  <span className="discord-select-menu-option-description">{option.description}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export default DiscordSelectMenu;
