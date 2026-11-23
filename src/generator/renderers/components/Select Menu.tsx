import React from 'react';
import { type MessageActionRowComponent, ComponentType, SelectMenuDefaultValueType } from 'discord.js';
import type { RenderMessageContext } from '../..';
import { parseDiscordEmoji } from '../../../utils/utils';
import { getSelectTypeLabel } from './utils';

type SelectOptionItem = {
  label: string;
  description?: string;
  emojiUrl?: string | null;
  emojiAlt?: string;
  selected?: boolean;
};

type DefaultValueEntry = { type: SelectMenuDefaultValueType | string; id: string };

async function resolveAutoSelectOptions(
  component: Exclude<MessageActionRowComponent, { type: ComponentType.Button }>,
  context?: RenderMessageContext
): Promise<SelectOptionItem[]> {
  const raw = component as unknown as {
    defaultValues?: readonly DefaultValueEntry[];
    data?: { default_values?: readonly DefaultValueEntry[] };
  };
  const defaults = raw.defaultValues ?? raw.data?.default_values ?? [];
  if (defaults.length === 0) return [];

  return Promise.all(
    defaults.map(async (entry) => {
      if (entry.type === SelectMenuDefaultValueType.User) {
        const user = await context?.callbacks.resolveUser(entry.id);
        return {
          label: user ? `@${user.displayName ?? user.username}` : `<@${entry.id}>`,
          selected: true,
        };
      }
      if (entry.type === SelectMenuDefaultValueType.Role) {
        const role = await context?.callbacks.resolveRole(entry.id);
        return {
          label: role ? `@${role.name}` : `<@&${entry.id}>`,
          selected: true,
        };
      }
      const channel = await context?.callbacks.resolveChannel(entry.id);
      const channelLabel = channel && !channel.isDMBased() ? `#${channel.name}` : `<#${entry.id}>`;
      return {
        label: channelLabel,
        selected: true,
      };
    })
  );
}

async function DiscordSelectMenu({
  component,
  context,
}: {
  component: Exclude<MessageActionRowComponent, { type: ComponentType.Button }>;
  context?: RenderMessageContext;
}) {
  const placeholder = component.placeholder || getSelectTypeLabel(component.type);
  const options: SelectOptionItem[] =
    component.type === ComponentType.StringSelect
      ? (component.options ?? []).map((option) => ({
          label: option.label,
          description: option.description ?? undefined,
          emojiUrl: option.emoji ? parseDiscordEmoji(option.emoji) : null,
          emojiAlt: option.emoji?.name ?? '',
          selected: Boolean(option.default),
        }))
      : await resolveAutoSelectOptions(component, context);
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
        {options.map((option, idx) => (
          <div
            key={idx}
            className={`discord-select-menu-option${option.selected ? ' is-selected' : ''}`}
            role="option"
            aria-selected={option.selected ? 'true' : 'false'}
          >
            {option.emojiUrl && (
              <img
                src={option.emojiUrl}
                alt={option.emojiAlt ?? ''}
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
        ))}
      </div>
    </details>
  );
}

export default DiscordSelectMenu;
