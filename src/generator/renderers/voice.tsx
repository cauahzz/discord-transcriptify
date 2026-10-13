import React from 'react';
import type { APIAttachment, APIMessage, Attachment as AttachmentType, Message } from 'discord.js';
import type { RenderMessageContext } from '..';

const MAX_BARS = 32;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 24;

/**
 * Bar heights in pixels for a Discord waveform (base64, one byte per sample).
 * A missing or undecodable waveform gives flat bars rather than none, so the
 * message still reads as a voice message.
 */
export function waveformBars(waveform: string | null | undefined): number[] {
  const bytes = waveform ? Buffer.from(waveform, 'base64') : Buffer.alloc(0);
  if (bytes.length === 0) return Array.from({ length: MAX_BARS }, () => MIN_BAR_HEIGHT);

  const count = Math.min(MAX_BARS, bytes.length);
  return Array.from({ length: count }, (_, index) => {
    const value = bytes[Math.floor((index * bytes.length) / count)];
    return Math.round(MIN_BAR_HEIGHT + (value / 255) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT));
  });
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Renders a voice message attachment. The `<audio>` keeps its native controls,
 * so the message plays offline, under a strict CSP and without the player
 * script; the script hides the controls and drives the play button instead.
 */
export async function VoiceMessage({
  attachment,
  context,
  message,
}: {
  attachment: AttachmentType;
  context: RenderMessageContext;
  message: Message;
}) {
  const resolved = await context.callbacks.resolveVoiceSrc(
    attachment.toJSON() as APIAttachment,
    message.toJSON() as APIMessage
  );
  const src = resolved ?? attachment.url;

  // waveform and duration only exist on newer discord.js 14.x releases
  const { waveform, duration } = attachment as { waveform?: string | null; duration?: number | null };

  return (
    <div className="discord-voice-message" slot="attachment">
      <button type="button" className="discord-voice-play-button" aria-label="Play voice message">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path className="discord-voice-icon-play" fill="currentColor" d="M8 5.14v14l11-7-11-7z" />
          <path className="discord-voice-icon-pause" fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
        </svg>
      </button>
      <div className="discord-voice-waveform" aria-hidden="true">
        {waveformBars(waveform).map((height, index) => (
          <div className="discord-voice-waveform-bar" style={{ height: `${height}px` }} key={index} />
        ))}
      </div>
      {typeof duration === 'number' && <div className="discord-voice-duration">{formatDuration(duration)}</div>}
      <audio controls preload="none" src={src} />
    </div>
  );
}
