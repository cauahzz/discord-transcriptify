import React from 'react';

interface DiscordButtonProps {
  type: string;
  url?: string;
  emoji?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const SAFE_BUTTON_PROTOCOLS = new Set(['http:', 'https:', 'discord:']);

function safeButtonUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return SAFE_BUTTON_PROTOCOLS.has(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

export function DiscordButton({ type, url, emoji, disabled, children }: DiscordButtonProps) {
  // a link button that is disabled is not clickable either, so it drops the anchor
  const safeUrl = safeButtonUrl(url);
  const href = safeUrl && !disabled ? safeUrl : undefined;
  const buttonType = type || 'secondary';
  const className = `discord-button discord-button-${buttonType}${disabled ? ' discord-button-disabled' : ''}`;
  const isPremium = buttonType === 'premium';

  const content = (
    <>
      <span className="discord-button-content">
        {isPremium && !emoji && (
          <span className="discord-button-premium-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4.24 4.75a1 1 0 0 0-1.98.3l1.39 7.42A3 3 0 0 0 6.6 15h10.8a3 3 0 0 0 2.94-2.41l1.15-5.75A1 1 0 0 0 20.51 5.6H6.1L5.85 4.3A1 1 0 0 0 4.24 4.75Z" />
            </svg>
          </span>
        )}
        {emoji && <img src={emoji} alt="" className="discord-button-emoji" draggable={false} />}
        <span className="discord-button-label">{children ?? (isPremium ? 'Shop' : null)}</span>
      </span>
      {url && (
        <span className="discord-button-launch" aria-hidden="true">
          <svg role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M15 2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V4.41l-4.3 4.3a1 1 0 1 1-1.4-1.42L19.58 3H16a1 1 0 0 1-1-1Z"
            />
            <path
              fill="currentColor"
              d="M5 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-6a1 1 0 1 0-2 0v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6a1 1 0 1 0 0-2H5Z"
            />
          </svg>
        </span>
      )}
    </>
  );

  // a button that opens nothing is a span: an anchor without href is not a control
  if (!href) {
    return <span className={className}>{content}</span>;
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  );
}

export default DiscordButton;
