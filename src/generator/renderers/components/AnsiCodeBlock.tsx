import React from 'react';

type AnsiStyle = { fg?: number; bg?: number; bold: boolean; underline: boolean };

// only the SGR codes Discord itself renders; anything else is dropped
function applyCodes(style: AnsiStyle, params: string): AnsiStyle {
  const next = { ...style };
  for (const code of (params || '0').split(';').map(Number)) {
    if (code === 0) Object.assign(next, { fg: undefined, bg: undefined, bold: false, underline: false });
    else if (code === 1) next.bold = true;
    else if (code === 4) next.underline = true;
    else if (code >= 30 && code <= 37) next.fg = code;
    else if (code >= 40 && code <= 47) next.bg = code;
  }
  return next;
}

function className(style: AnsiStyle) {
  return [
    style.fg && `ansi-${style.fg}`,
    style.bg && `ansi-${style.bg}`,
    style.bold && 'ansi-bold',
    style.underline && 'ansi-underline',
  ]
    .filter(Boolean)
    .join(' ');
}

export function parseAnsi(code: string): { text: string; className: string }[] {
  const segments: { text: string; className: string }[] = [];
  let style: AnsiStyle = { bold: false, underline: false };
  let last = 0;

  // eslint-disable-next-line no-control-regex -- every ANSI sequence starts with ESC
  for (const match of code.matchAll(/\u001b\[([\d;]*)m/g)) {
    if (match.index > last) segments.push({ text: code.slice(last, match.index), className: className(style) });
    style = applyCodes(style, match[1]);
    last = match.index + match[0].length;
  }
  if (last < code.length) segments.push({ text: code.slice(last), className: className(style) });

  return segments;
}

export default function AnsiCodeBlock({ code }: { code: string }) {
  return (
    <pre className="discord-code-block-pre discord-ansi">
      {parseAnsi(code).map((segment, i) =>
        segment.className ? (
          <span key={i} className={segment.className}>
            {segment.text}
          </span>
        ) : (
          segment.text
        )
      )}
    </pre>
  );
}
