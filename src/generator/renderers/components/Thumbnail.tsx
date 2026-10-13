import React from 'react';
import { DiscordSpoiler } from '../../discordComponents';

interface DiscordThumbnailProps {
  url: string;
  description?: string;
  spoiler?: boolean;
}

function DiscordThumbnail({ url, description, spoiler }: DiscordThumbnailProps) {
  const thumbnail = <img src={url} alt={description || 'Thumbnail'} className="discord-thumbnail" />;

  if (spoiler) {
    return <DiscordSpoiler>{thumbnail}</DiscordSpoiler>;
  }

  return thumbnail;
}

export default DiscordThumbnail;
