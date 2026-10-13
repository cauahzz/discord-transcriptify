import React from 'react';
import type { Attachment as AttachmentType, ButtonComponent, Message, ThumbnailComponent } from 'discord.js';
import type { RenderMessageContext } from '../../..';
import { Component } from '../../components';
import SectionContent from './SectionContent';
import SectionAccessory from './SectionAccessory';

interface DiscordSectionProps {
  children: React.ReactNode;
  accessory?: ButtonComponent | ThumbnailComponent;
  id: number;
  attachments?: Map<string, AttachmentType>;
  context?: RenderMessageContext;
  message?: Message;
}

function DiscordSection({ children, accessory, id, attachments, context, message }: DiscordSectionProps) {
  return (
    <div className="discord-section">
      <SectionContent>{children}</SectionContent>
      <SectionAccessory>
        {accessory && (
          <Component component={accessory} id={id} attachments={attachments} context={context} message={message} />
        )}
      </SectionAccessory>
    </div>
  );
}

export default DiscordSection;
