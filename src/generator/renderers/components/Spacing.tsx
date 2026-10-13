import React from 'react';
import { SeparatorSpacingSize } from 'discord.js';

function DiscordSeparator({ divider, spacing }: { divider: boolean; spacing: SeparatorSpacingSize }) {
  const isLarge = spacing === SeparatorSpacingSize.Large;

  return <div className={`discord-separator${isLarge ? ' is-large' : ''}${divider ? ' has-divider' : ''}`} />;
}

export default DiscordSeparator;
