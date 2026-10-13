import React, { type CSSProperties } from 'react';
import { DiscordSpoiler } from '../../discordComponents';

interface DiscordContainerProps {
  children: React.ReactNode;
  accentColor?: number;
  spoiler?: boolean;
}

function DiscordContainer({ children, accentColor, spoiler }: DiscordContainerProps) {
  const container = (
    <div
      className={`discord-v2-container${accentColor ? ' has-accent' : ''}`}
      style={
        accentColor ? ({ '--dt-accent': `#${accentColor.toString(16).padStart(6, '0')}` } as CSSProperties) : undefined
      }
    >
      {children}
    </div>
  );

  if (spoiler) {
    return <DiscordSpoiler>{container}</DiscordSpoiler>;
  }

  return container;
}

export default DiscordContainer;
