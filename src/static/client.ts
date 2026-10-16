export const scrollToMessage =
  'document.addEventListener("click",t=>{let e=t.target;if(!e)return;let o=e?.getAttribute("data-goto");if(o){let r=document.getElementById(`m-${o}`);r?(r.scrollIntoView({behavior:"smooth",block:"center"}),r.style.backgroundColor="rgba(148, 156, 247, 0.1)",r.style.transition="background-color 0.5s ease",setTimeout(()=>{r.style.backgroundColor="transparent"},1e3)):console.warn("Message "+o+" not found.")}});';

export const revealSpoiler =
  'const s=document.querySelectorAll(".discord-spoiler");s.forEach(s=>s.addEventListener("click",()=>{if(s.classList.contains("discord-spoiler")){s.classList.remove("discord-spoiler");s.classList.add("discord-spoiler--revealed");}}));';

export const enableImagePreview = `
(() => {
  const t = window.__transcript;
  // images smaller than this in an embed are author and footer icons, and opening them would be noise
  const MIN_EMBED_WIDTH = 48;
  const SELECTOR = [
    'discord-attachment img',
    '.discord-attachment-gallery img',
    '.discord-media-gallery img',
    'discord-embed img',
  ].join(',');

  const overlay = document.createElement('div');
  overlay.className = 'discord-image-preview-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Image preview');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = \`
    <button type="button" class="discord-image-preview-close" aria-label="Close image preview">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M17.66 6.34a1 1 0 0 0-1.41 0L12 10.59 7.76 6.34a1 1 0 1 0-1.41 1.41L10.59 12l-4.24 4.24a1 1 0 1 0 1.41 1.41L12 13.41l4.24 4.24a1 1 0 0 0 1.41-1.41L13.41 12l4.24-4.24a1 1 0 0 0 0-1.41Z" />
      </svg>
    </button>
    <div class="discord-image-preview-stage">
      <img class="discord-image-preview-image" alt="" />
    </div>
  \`;

  const previewImage = overlay.querySelector('.discord-image-preview-image');
  const closeButton = overlay.querySelector('.discord-image-preview-close');
  let previousOverflow = '';
  let opener = null;

  const closePreview = () => {
    overlay.classList.remove('is-open');
    previewImage.removeAttribute('src');
    previewImage.alt = '';
    document.body.style.overflow = previousOverflow;
    // a clicked image is not focusable, so the opener is often the body and focus would stay on the hidden button
    closeButton.blur();
    // the opener may have been removed from the page meanwhile
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  };

  const openPreview = (image) => {
    opener = document.activeElement;
    previousOverflow = document.body.style.overflow;
    previewImage.src = image.currentSrc || image.src;
    previewImage.alt = image.alt || 'Image preview';
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  };

  const isPreviewable = (image) => {
    if (!image.matches(SELECTOR)) return false;
    // an image behind a spoiler stays hidden until the spoiler itself is revealed
    if (image.closest('.discord-spoiler')) return false;
    return !(image.closest('discord-embed') && image.getBoundingClientRect().width < MIN_EMBED_WIDTH);
  };

  t.onReady(() => {
    document.body.appendChild(overlay);

    // capture phase: the spoiler's own handler reveals it during bubbling, which would let the revealing click through
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        if (target === overlay || target.closest('.discord-image-preview-close') || target.closest('.discord-image-preview-stage') === target) {
          event.preventDefault();
          closePreview();
          return;
        }

        const image = target.closest('img');
        if (!image || !isPreviewable(image)) return;

        event.preventDefault();
        event.stopPropagation();
        openPreview(image);
      },
      true
    );

    document.addEventListener('keydown', (event) => {
      if (!overlay.classList.contains('is-open')) return;
      if (event.key === 'Escape') closePreview();
      // the close button is the only control, so Tab stays on it instead of reaching the page behind
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.focus();
      }
    });
  });
})();
`;
export const enableMessageSearch = `
(() => {
  const t = window.__transcript;
  const MIN_QUERY_LENGTH = 2;
  const DEBOUNCE_MS = 150;
  const searchSelector = 'discord-message, discord-system-message';
  const matchClass = 'discord-search-match';
  const activeClass = 'discord-search-match--active';
  const shellClass = 'discord-transcript-search-shell';
  const panelClass = 'discord-transcript-search';
  const openClass = 'is-open';

  const normalize = (value) => value.toLowerCase().replace(/\\s+/g, ' ').trim();

  const extractMessageId = (value) => {
    const trimmed = value.trim();
    const directMatch = trimmed.match(/^(?:m-)?(\\d{15,21})$/);
    if (directMatch) {
      return directMatch[1];
    }

    const linkMatch = trimmed.match(/\\/(\\d{15,21})(?:\\/?(?:\\?.*)?)?$/);
    return linkMatch ? linkMatch[1] : null;
  };

  const getMessages = () =>
    Array.from(document.querySelectorAll(searchSelector))
      .filter((element) => element instanceof HTMLElement)
      .map((element) => ({
        element,
        id: (element.id || '').replace(/^ms?-/, ''),
        // the messages of a thread inside a parent are messages of their own
        text: normalize(t.ownText(element)),
      }));

  const shell = document.createElement('div');
  shell.className = shellClass;
  shell.innerHTML =
    '<button class="discord-transcript-search-toggle" type="button" aria-label="Toggle transcript search" aria-expanded="false">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16Zm0 2a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm11.71 15.29a1 1 0 0 1 0 1.42a1 1 0 0 1-1.42 0l-3.4-3.39a1 1 0 0 1 1.42-1.42l3.4 3.39Z"/></svg>' +
    '</button>' +
    '<div class="' +
    panelClass +
    '" role="search" aria-hidden="true">' +
    '<label class="discord-transcript-search-bar">' +
    '<input class="discord-transcript-search-input" type="search" aria-label="Search transcript messages" />' +
    '<button class="discord-transcript-search-submit" type="button" data-action="next" aria-label="Search transcript">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16Zm0 2a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm11.71 15.29a1 1 0 0 1 0 1.42a1 1 0 0 1-1.42 0l-3.4-3.39a1 1 0 0 1 1.42-1.42l3.4 3.39Z"/></svg>' +
    '</button>' +
    '</label>' +
    '<div class="discord-transcript-search-meta">' +
    '<span class="discord-transcript-search-count" aria-live="polite">Ready</span>' +
    '<div class="discord-transcript-search-actions">' +
    '<button class="discord-transcript-search-button" type="button" data-action="prev" aria-label="Previous match">\u2191</button>' +
    '<button class="discord-transcript-search-button" type="button" data-action="next" aria-label="Next match">\u2193</button>' +
    '<button class="discord-transcript-search-button discord-transcript-search-button--ghost" type="button" data-action="clear" aria-label="Clear search">\u2715</button>' +
    '</div>' +
    '</div>' +
    '</div>';

  const desktopMedia = window.matchMedia('(min-width: 901px)');
  const panel = shell.querySelector('.discord-transcript-search');
  const toggleButton = shell.querySelector('.discord-transcript-search-toggle');
  const input = shell.querySelector('.discord-transcript-search-input');
  const count = shell.querySelector('.discord-transcript-search-count');
  const previousButton = shell.querySelector('[data-action="prev"]');
  const nextButton = shell.querySelectorAll('[data-action="next"]')[1];
  const submitButton = shell.querySelector('.discord-transcript-search-submit');
  const clearButton = shell.querySelector('[data-action="clear"]');
  const headerChannel =
    document.querySelector('.discord-transcript-header-bar')?.getAttribute('data-channel-name') ||
    document.title ||
    'transcript';

  let matches = [];
  let activeIndex = -1;
  let scheduled = false;
  let timer = null;
  // typing highlights the first match without scrolling to it, so the first step has to land on it instead of passing it
  let navigated = false;
  let hasUserToggled = false;

  input.placeholder = 'Search ' + headerChannel;

  const setOpen = (next, focus = false) => {
    shell.classList.toggle(openClass, next);
    toggleButton.setAttribute('aria-expanded', String(next));
    panel.setAttribute('aria-hidden', String(!next));

    if (focus && next) {
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }

    if (!next) {
      input.blur();
    }
  };

  const syncDefaultVisibility = (force = false) => {
    if (!force && hasUserToggled) {
      return;
    }

    setOpen(desktopMedia.matches, false);
  };

  const clearHighlights = () => {
    document.querySelectorAll('.' + matchClass).forEach((message) => {
      message.classList.remove(matchClass, activeClass);
    });
  };

  const updateControls = () => {
    const total = matches.length;
    const query = (input.value || '').trim();
    panel.classList.toggle('has-query', Boolean(query));
    count.textContent =
      !query ? 'Ready' : total > 0 && activeIndex >= 0 ? activeIndex + 1 + ' of ' + total : 'No matches';
    previousButton.disabled = total === 0;
    nextButton.disabled = total === 0;
    clearButton.disabled = !(input.value || '').trim();
  };

  const focusMatch = (index, scroll = true) => {
    if (matches.length === 0) {
      activeIndex = -1;
      updateControls();
      return;
    }

    if (activeIndex >= 0 && matches[activeIndex]) {
      matches[activeIndex].element.classList.remove(activeClass);
    }

    navigated = scroll;
    activeIndex = ((index % matches.length) + matches.length) % matches.length;
    const match = matches[activeIndex];
    match.element.classList.add(activeClass);

    if (scroll) {
      // a hit inside a collapsed thread cannot be scrolled to until the thread is open
      t.reveal(match.element);
      match.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    updateControls();
  };

  // keepPlace: a refresh caused by the page changing keeps the reader on the match they are on
  const runSearch = (scroll = true, keepPlace = false) => {
    const placed = keepPlace && activeIndex >= 0 && matches[activeIndex] ? matches[activeIndex].element : null;
    const wasNavigated = navigated;
    clearTimeout(timer);
    timer = null;
    clearHighlights();
    matches = [];
    activeIndex = -1;
    navigated = false;

    const rawQuery = (input.value || '').trim();
    if (!rawQuery) {
      updateControls();
      return;
    }

    const normalizedQuery = normalize(rawQuery);
    const exactMessageId = extractMessageId(rawQuery);
    if (!exactMessageId && normalizedQuery.length < MIN_QUERY_LENGTH) {
      updateControls();
      return;
    }

    // a message id or link finds that message; any other query is matched against the text
    matches = getMessages().filter((message) =>
      exactMessageId ? message.id === exactMessageId : message.text.includes(normalizedQuery)
    );

    matches.forEach((match) => match.element.classList.add(matchClass));
    const kept = placed ? matches.findIndex((match) => match.element === placed) : -1;
    if (kept >= 0) {
      focusMatch(kept, false);
      navigated = wasNavigated;
      return;
    }

    focusMatch(0, scroll);
  };

  const scheduleSearchRefresh = () => {
    if (scheduled || !(input.value || '').trim()) {
      return;
    }

    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      runSearch(false, true);
    });
  };

  // the header is inside the observed element, and the search itself writes to it (the counter), so its changes are not page changes
  const onPageChange = (records) => {
    const outside = records.some((record) => {
      const node = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      return !(node && node.closest('.discord-transcript-header-bar'));
    });
    if (outside) scheduleSearchRefresh();
  };

  // a keystroke followed at once by Enter must not navigate the previous list
  const step = (direction) => {
    if (timer !== null) runSearch(false);
    if (matches.length === 0) {
      runSearch();
      return;
    }

    focusMatch(!navigated && direction > 0 ? activeIndex : activeIndex + direction);
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(false), DEBOUNCE_MS);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === 'Escape') {
      if ((input.value || '').trim()) {
        input.value = '';
        runSearch(false);
      } else {
        setOpen(false, false);
      }
    }
  });

  toggleButton.addEventListener('click', () => {
    hasUserToggled = true;
    setOpen(!shell.classList.contains(openClass), !shell.classList.contains(openClass));
  });

  previousButton.addEventListener('click', () => step(-1));
  nextButton.addEventListener('click', () => step(1));
  submitButton.addEventListener('click', () => step(1));
  clearButton.addEventListener('click', () => {
    input.value = '';
    runSearch(false);
    input.focus();
  });

  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || desktopMedia.matches || !shell.classList.contains(openClass)) {
        return;
      }

      if (!shell.contains(target)) {
        setOpen(false, false);
      }
    },
    true
  );

  desktopMedia.addEventListener('change', () => syncDefaultVisibility(false));

  const mount = () => {
    const mountTarget = document.querySelector('.discord-transcript-header-search-slot') || document.body;

    if (!mountTarget.contains(shell)) {
      mountTarget.appendChild(shell);
      syncDefaultVisibility(true);
      updateControls();
    }
  };

  t.onReady(() => {
    mount();

    const transcriptRoot = document.querySelector('discord-messages');
    if (transcriptRoot) {
      new MutationObserver(onPageChange).observe(transcriptRoot, { childList: true, subtree: true });
    }
  });
})();
`;
export const enableMemberStats = `
(() => {
  const t = window.__transcript;

  const formatMessageCount = (count) => {
    if (count === 1) return '1 message';
    return count + ' messages';
  };

  // every discord-message counts, a thread's included; a forwarded message belongs to whoever forwarded it
  const buildRows = () => {
    const authors = new Map();
    document.querySelectorAll('discord-message[data-author-id]').forEach((element) => {
      const id = element.getAttribute('data-author-id');
      const entry = authors.get(id);
      if (entry) {
        entry.count += 1;
      } else {
        authors.set(id, { count: 1, profile: t.profile(element) });
      }
    });
    return [...authors.values()].sort((a, b) => b.count - a.count || a.profile.author.localeCompare(b.profile.author));
  };

  const renderPanel = (panel) => {
    const rows = buildRows();
    if (rows.length === 0) {
      panel.innerHTML = '<div class="discord-transcript-members-empty">No user messages found.</div>';
      return;
    }

    const list = rows
      .map((row) => {
        const nameStyle = row.profile.roleColor ? ' style="color:' + t.escapeHtml(row.profile.roleColor) + '"' : '';
        return (
          '<div class="discord-transcript-members-row">' +
          t.avatar('discord-transcript-members-avatar', row.profile) +
          '<span class="discord-transcript-members-name"' +
          nameStyle +
          '>' +
          t.escapeHtml(row.profile.author) +
          '</span>' +
          '<span class="discord-transcript-members-count">' +
          t.escapeHtml(formatMessageCount(row.count)) +
          '</span>' +
          '</div>'
        );
      })
      .join('');

    panel.innerHTML =
      '<div class="discord-transcript-members-heading">Members \xB7 ' +
      t.escapeHtml(String(rows.length)) +
      '</div><div class="discord-transcript-members-list">' +
      list +
      '</div>';
  };

  t.onReady(() => {
    t.dropdown('members', renderPanel);
  });
})();
`;
export const enablePinnedMessages = `
(() => {
  const t = window.__transcript;
  const PREVIEW_LENGTH = 120;

  const truncate = (value, max = PREVIEW_LENGTH) => {
    const text = String(value || '').replace(/\\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 3) + '...' : text;
  };

  const formatTimestamp = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const sameYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleDateString('en-US', sameYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // the text of the message itself: not its reply, reactions or command, and not the messages of a thread inside it
  const getMessageBodyText = (message) => {
    const body = message.querySelector('.discord-message-body') || message;
    const clone = body.cloneNode(true);
    clone
      .querySelectorAll(
        'discord-reply, [slot="reply"], discord-reactions, [slot="reactions"], discord-command, [slot="command"], discord-thread, [slot="thread"], .discord-thread-messages'
      )
      .forEach((element) => element.remove());

    const text = truncate(clone.textContent);
    if (text) return text;

    const embed = message.querySelector('discord-embed');
    if (embed) {
      const title = embed.getAttribute('embed-title') || embed.querySelector('.discord-embed-title')?.textContent?.trim();
      const description = embed.querySelector('.discord-embed-description')?.textContent?.trim();
      const fallback = [title, description].filter(Boolean).join(' - ');
      return truncate(fallback) || 'Embed';
    }

    return 'Pinned message';
  };

  const renderPanel = (panel, pinned) => {
    const list = pinned
      .map((message, index) => {
        const profile = t.profile(message);
        const authorStyle = profile.roleColor ? ' style="color:' + t.escapeHtml(profile.roleColor) + '"' : '';
        const timestamp = formatTimestamp(message.getAttribute('timestamp'));
        const dateMarkup = timestamp
          ? '<span class="discord-transcript-pins-date">' + t.escapeHtml(timestamp) + '</span>'
          : '';

        return (
          '<a class="discord-transcript-pins-row" href="#' +
          t.escapeHtml(message.id) +
          '" data-pin-index="' +
          index +
          '">' +
          t.avatar('discord-transcript-pins-avatar', profile) +
          '<div class="discord-transcript-pins-copy"><div class="discord-transcript-pins-header"><span class="discord-transcript-pins-author"' +
          authorStyle +
          '>' +
          t.escapeHtml(profile.author) +
          '</span>' +
          dateMarkup +
          '</div><span class="discord-transcript-pins-preview">' +
          t.escapeHtml(getMessageBodyText(message)) +
          '</span></div></a>'
        );
      })
      .join('');

    panel.innerHTML =
      '<div class="discord-transcript-pins-heading">Pinned Messages \xB7 ' +
      t.escapeHtml(String(pinned.length)) +
      '</div><div class="discord-transcript-pins-list">' +
      list +
      '</div>';
  };

  t.onReady(() => {
    // data-pinned is the message's own state, so a pin that was later removed is not listed
    const pinned = Array.from(document.querySelectorAll('discord-message[data-pinned]'));
    if (pinned.length === 0) {
      document.querySelector('.discord-transcript-pins-anchor')?.remove();
      return;
    }

    const dropdown = t.dropdown('pins', (panel) => renderPanel(panel, pinned));
    if (!dropdown) return;

    dropdown.panel.addEventListener('click', (event) => {
      const row = event.target.closest('.discord-transcript-pins-row[data-pin-index]');
      if (!row) return;
      event.preventDefault();
      dropdown.close();
      t.goTo(pinned[Number(row.getAttribute('data-pin-index'))]);
    });
  });
})();
`;
export const enableVoicePlayback = `
(() => {
  const t = window.__transcript;
  const PLAYING = 'is-playing';

  const playersIn = (audio) => audio.closest('.discord-voice-message');
  const isVoiceAudio = (node) => node instanceof Element && node.tagName === 'AUDIO' && playersIn(node) !== null;
  const buttonOf = (audio) => {
    const message = playersIn(audio);
    return message ? message.querySelector('.discord-voice-play-button') : null;
  };

  t.onReady(() => {
    document.querySelectorAll('.discord-voice-message audio').forEach((audio) => {
      // the native controls stay in the markup for pages without this script
      audio.removeAttribute('controls');
      playersIn(audio).classList.add('is-enhanced');
    });
  });

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('.discord-voice-play-button') : null;
    const message = button && button.closest('.discord-voice-message');
    const audio = message && message.querySelector('audio');
    if (!audio) return;

    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });

  // media events do not bubble; the capture phase sees them for every audio element. They also cover a message paused because another one started
  document.addEventListener(
    'play',
    (event) => {
      const audio = event.target;
      if (!isVoiceAudio(audio)) return;
      document.querySelectorAll('.discord-voice-message audio').forEach((other) => {
        if (other !== audio && !other.paused) other.pause();
      });
      const button = buttonOf(audio);
      if (button) button.classList.add(PLAYING);
    },
    true
  );

  const stopped = (event) => {
    const audio = event.target;
    if (!isVoiceAudio(audio)) return;
    const button = buttonOf(audio);
    if (button) button.classList.remove(PLAYING);
  };
  document.addEventListener('pause', stopped, true);
  document.addEventListener('ended', stopped, true);
})();
`;
export const enableThreadModal = `
(() => {
  const t = window.__transcript;
  const OPEN = 'is-open';

  const overlay = document.createElement('div');
  overlay.className = 'discord-thread-modal-overlay';
  overlay.innerHTML = \`
    <div class="discord-thread-modal" role="dialog" aria-labelledby="discord-thread-modal-title">
      <div class="discord-thread-modal-header">
        <div class="discord-thread-modal-title" id="discord-thread-modal-title">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" data-thread-glyph d="M12 2.81a1 1 0 0 1 0-1.41l.36-.36a1 1 0 0 1 1.41 0l9.2 9.2a1 1 0 0 1 0 1.4l-.7.7a1 1 0 0 1-1.3.13l-9.54-6.72a1 1 0 0 1-.08-1.58l1-1L12 2.8ZM12 21.2a1 1 0 0 1 0 1.41l-.35.35a1 1 0 0 1-1.41 0l-9.2-9.19a1 1 0 0 1 0-1.41l.7-.7a1 1 0 0 1 1.3-.12l9.54 6.72a1 1 0 0 1 .07 1.58l-1 1 .35.36ZM15.66 16.8a1 1 0 0 1-1.38.28l-8.49-5.66A1 1 0 1 1 6.9 9.76l8.49 5.65a1 1 0 0 1 .27 1.39ZM17.1 14.25a1 1 0 1 0 1.11-1.66L9.73 6.93a1 1 0 0 0-1.11 1.66l8.49 5.66Z" />
          </svg>
          <span class="discord-thread-modal-name"></span>
        </div>
        <button type="button" class="discord-thread-modal-close" aria-label="Close thread">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M17.66 6.34a1 1 0 0 0-1.41 0L12 10.59 7.76 6.34a1 1 0 1 0-1.41 1.41L10.59 12l-4.24 4.24a1 1 0 1 0 1.41 1.41L12 13.41l4.24 4.24a1 1 0 0 0 1.41-1.41L13.41 12l4.24-4.24a1 1 0 0 0 0-1.41Z" />
          </svg>
        </button>
      </div>
      <div class="discord-thread-modal-body">
        <div class="discord-thread-intro">
          <span class="discord-thread-intro-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24"><path fill="currentColor" data-thread-glyph d="M12 2.81a1 1 0 0 1 0-1.41l.36-.36a1 1 0 0 1 1.41 0l9.2 9.2a1 1 0 0 1 0 1.4l-.7.7a1 1 0 0 1-1.3.13l-9.54-6.72a1 1 0 0 1-.08-1.58l1-1L12 2.8ZM12 21.2a1 1 0 0 1 0 1.41l-.35.35a1 1 0 0 1-1.41 0l-9.2-9.19a1 1 0 0 1 0-1.41l.7-.7a1 1 0 0 1 1.3-.12l9.54 6.72a1 1 0 0 1 .07 1.58l-1 1 .35.36ZM15.66 16.8a1 1 0 0 1-1.38.28l-8.49-5.66A1 1 0 1 1 6.9 9.76l8.49 5.65a1 1 0 0 1 .27 1.39ZM17.1 14.25a1 1 0 1 0 1.11-1.66L9.73 6.93a1 1 0 0 0-1.11 1.66l8.49 5.66Z" /></svg>
          </span>
          <h2 class="discord-thread-intro-name"></h2>
          <p class="discord-thread-intro-starter"></p>
          <span class="discord-thread-modal-count"></span>
        </div>
      </div>
    </div>
  \`;

  const modalName = overlay.querySelector('.discord-thread-modal-name');
  const modalCount = overlay.querySelector('.discord-thread-modal-count');
  const modalBody = overlay.querySelector('.discord-thread-modal-body');
  const closeButton = overlay.querySelector('.discord-thread-modal-close');
  const list = document.createElement('discord-messages');
  modalBody.appendChild(list);

  // trigger element -> the thread it opens; details element -> what the modal header shows
  const threadOf = new Map();
  const headerOf = new Map();
  // one entry per thread that can be opened, in page order, for the list in the header
  const listed = [];
  const threadGlyph = () => overlay.querySelector('.discord-thread-modal-title svg').outerHTML;
  const introName = overlay.querySelector('.discord-thread-intro-name');
  const introStarter = overlay.querySelector('.discord-thread-intro-starter');
  // the page makes room for the panel instead of being covered by it
  const SPLIT = 'has-thread-panel';
  let active = null;
  let lastTrigger = null;

  // the messages are moved, not copied, so their ids and the other panels' references stay valid
  const close = () => {
    if (!active) return;
    active.messages.forEach((node) => active.source.appendChild(node));
    active = null;
    overlay.classList.remove(OPEN);
    document.body.classList.remove(SPLIT);
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
    lastTrigger = null;
  };

  const open = (details, trigger) => {
    if (active) close();
    const header = headerOf.get(details) || { name: 'Thread', count: '' };
    const source = details.querySelector('discord-messages') || details;
    const messages = Array.from(source.children).filter((node) => node.tagName !== 'SUMMARY');
    messages.forEach((node) => list.appendChild(node));
    active = { details, source, messages };
    lastTrigger = trigger || null;

    modalName.textContent = header.name;
    modalCount.textContent = header.count;
    introName.textContent = header.name;
    const starter = details.getAttribute('data-thread-starter');
    const starterColor = details.getAttribute('data-thread-starter-color');
    introStarter.innerHTML = starter
      ? 'Started by <strong' +
        (starterColor ? ' style="color:' + t.escapeHtml(starterColor) + '"' : '') +
        '>' +
        t.escapeHtml(starter) +
        '</strong>'
      : '';
    document.body.classList.add(SPLIT);
    overlay.classList.add(OPEN);
    modalBody.scrollTop = 0;
    // search and the pins list open it without a click, and the reader keeps typing in the search box
    if (trigger) closeButton.focus();
  };

  const triggerOf = (target) => (target instanceof Element ? target.closest('.is-openable') : null);

  t.onReady(() => {
    const boxes = Array.from(document.querySelectorAll('.discord-thread-preview-box'));
    document.querySelectorAll('.discord-thread-messages').forEach((details) => {
      // the thread bar belongs to the same message; once the component has drawn itself the two are no longer siblings
      const owner = details.closest('discord-message');
      const bar = owner
        ? Array.from(owner.querySelectorAll('discord-thread')).find((node) => node.closest('discord-message') === owner)
        : null;
      const id = details.getAttribute('data-thread-id');
      const named = boxes.filter((box) => id && box.getAttribute('data-thread-id') === id);
      const triggers = (bar ? [bar] : []).concat(named);
      // without anything to open it from, the plain block stays visible
      if (triggers.length === 0) return;

      const summary = details.querySelector('summary');
      const nameOf = (trigger) =>
        details.getAttribute('data-thread-name') ||
        trigger.getAttribute('name') ||
        trigger.getAttribute('data-thread-name') ||
        'Thread';
      details.classList.add('is-modal-backed');
      triggers.forEach((trigger) => {
        trigger.classList.add('is-openable');
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
        threadOf.set(trigger, details);
      });
      headerOf.set(details, { name: nameOf(triggers[0]), count: summary ? summary.textContent : '' });
      listed.push({ details: details, trigger: triggers[0] });
    });

    document.body.appendChild(overlay);

    // one thread icon everywhere: the one the header tool was rendered with
    const toolGlyph = document.querySelector('[data-transcript-action="threads"] path');
    if (toolGlyph) {
      overlay.querySelectorAll('[data-thread-glyph]').forEach((node) => node.setAttribute('d', toolGlyph.getAttribute('d')));
    }

    // the header tool is only rendered when threads were saved; without one that can be opened it has no use
    if (listed.length === 0) {
      document.querySelector('.discord-transcript-threads-anchor')?.remove();
      return;
    }

    const dateOf = (iso) => {
      const date = iso ? new Date(iso) : null;
      return date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
    };
    const avatarOf = (className, src) =>
      src ? '<img class="' + className + '" src="' + t.escapeHtml(src) + '" alt="" loading="lazy" draggable="false" />' : '';

    const cardOf = (entry, index) => {
      const data = (name) => entry.details.getAttribute(name) || '';
      const color = data('data-last-color');
      const date = dateOf(data('data-last-timestamp'));
      return (
        '<a class="discord-transcript-threads-card" href="#" data-thread-index="' +
        index +
        '"><span class="discord-transcript-threads-copy"><span class="discord-transcript-threads-name">' +
        t.escapeHtml(headerOf.get(entry.details).name) +
        '</span><span class="discord-transcript-threads-last">' +
        avatarOf('discord-transcript-threads-last-avatar', data('data-last-avatar')) +
        '<span class="discord-transcript-threads-last-author"' +
        (color ? ' style="color:' + t.escapeHtml(color) + '"' : '') +
        '>' +
        t.escapeHtml(data('data-last-author')) +
        '</span><span class="discord-transcript-threads-last-text">: ' +
        t.escapeHtml(data('data-last-text')) +
        '</span>' +
        (date ? '<span class="discord-transcript-threads-date">\u2022 ' + t.escapeHtml(date) + '</span>' : '') +
        '</span></span>' +
        avatarOf('discord-transcript-threads-starter', data('data-thread-starter-avatar')) +
        '</a>'
      );
    };

    const dropdown = t.dropdown('threads', (panel) => {
      panel.innerHTML =
        '<div class="discord-transcript-threads-head"><span class="discord-transcript-threads-title">' +
        threadGlyph() +
        'Threads</span><input class="discord-transcript-threads-filter" type="search" placeholder="Search for thread name" aria-label="Search for thread name" /></div>' +
        '<div class="discord-transcript-threads-label">' +
        t.escapeHtml(String(listed.length)) +
        (listed.length === 1 ? ' thread' : ' threads') +
        '</div><div class="discord-transcript-threads-list">' +
        listed.map(cardOf).join('') +
        '</div>';
    });
    if (!dropdown) return;

    dropdown.panel.addEventListener('input', (event) => {
      if (!event.target.classList.contains('discord-transcript-threads-filter')) return;
      const query = event.target.value.trim().toLowerCase();
      dropdown.panel.querySelectorAll('[data-thread-index]').forEach((card) => {
        const name = headerOf.get(listed[Number(card.getAttribute('data-thread-index'))].details).name;
        card.hidden = query !== '' && name.toLowerCase().indexOf(query) === -1;
      });
    });

    dropdown.panel.addEventListener('click', (event) => {
      const row = event.target.closest('[data-thread-index]');
      if (!row) return;
      event.preventDefault();
      dropdown.close();
      const entry = listed[Number(row.getAttribute('data-thread-index'))];
      open(entry.details, entry.trigger);
    });
  });

  // search and the pins list reach a message of a thread through the modal that shows it
  t.onReveal((node) => {
    const details = node.closest('.discord-thread-messages.is-modal-backed');
    if (details) {
      open(details, null);
      return true;
    }
    // a message of the page itself is behind the modal
    if (active && !overlay.contains(node)) close();
    return false;
  });

  document.addEventListener('click', (event) => {
    const trigger = triggerOf(event.target);
    const details = trigger && threadOf.get(trigger);
    if (!details) return;
    event.preventDefault();
    open(details, trigger);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const trigger = triggerOf(event.target);
    const details = trigger && trigger === event.target && threadOf.get(trigger);
    if (!details) return;
    event.preventDefault();
    open(details, trigger);
  });

  closeButton.addEventListener('click', close);
})();
`;
export const closeSelectMenus = `
(() => {
  const OPEN = 'details.discord-select-menu[open]';
  const closeAll = (except) => {
    document.querySelectorAll(OPEN).forEach((menu) => {
      if (menu !== except) menu.removeAttribute('open');
    });
  };

  // the menu opens and closes by itself; this adds what the client does around it:
  // a click anywhere else, or on another menu, closes the one that is open
  document.addEventListener('click', (event) => {
    const inside = event.target instanceof Element ? event.target.closest('details.discord-select-menu') : null;
    closeAll(inside);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !document.querySelector(OPEN)) return;
    event.preventDefault();
    closeAll(null);
  });
})();
`;
export const applyServerTags = `
(() => {
  const t = window.__transcript;
  // a message, the last message in a thread bar and a slash command line; a reply carries no profile
  const HOSTS = 'discord-message[profile], discord-thread-message[profile], discord-command[profile]';
  const OWNERS = 'discord-message, discord-thread-message, discord-command';
  const decorated = new WeakSet();

  // a message that started a thread contains the thread's messages, whose names are not its own
  const ownedBy = (host) => (node) => node.closest(OWNERS) === host;

  const usernameOf = (host) => {
    const selector = host.tagName === 'DISCORD-COMMAND' ? '.discord-replied-message-username' : '.discord-author-username';
    return Array.from(host.querySelectorAll(selector)).find(ownedBy(host)) || null;
  };

  const buildTag = (text, badge, guildId) => {
    const tag = document.createElement('span');
    tag.className = 'discord-server-tag';
    tag.title = 'Server Tag: ' + text;
    if (guildId) tag.setAttribute('data-guild-id', guildId);

    if (badge) {
      const image = document.createElement('img');
      image.className = 'discord-server-tag-badge';
      image.src = badge;
      image.alt = '';
      image.loading = 'lazy';
      image.draggable = false;
      tag.appendChild(image);
    }

    const label = document.createElement('span');
    label.className = 'discord-server-tag-text';
    label.textContent = text;
    tag.appendChild(label);
    return tag;
  };

  const apply = (host, known) => {
    if (decorated.has(host)) return;
    decorated.add(host);

    const username = usernameOf(host);
    if (!username || !username.parentNode) return;

    const badge = typeof known.serverTagBadge === 'string' && known.serverTagBadge.indexOf('https:') === 0 ? known.serverTagBadge : '';
    const guildId = typeof known.serverTagGuildId === 'string' ? known.serverTagGuildId : '';
    const tag = buildTag(known.serverTagText.trim(), badge, guildId);
    username.parentNode.insertBefore(tag, username.nextSibling);
  };

  // the components draw their name after the module has loaded, which the page does not wait for
  const whenRendered = (host) => {
    const name = host.tagName.toLowerCase();
    const registry = window.customElements;
    if (!registry) return Promise.resolve();
    return registry.whenDefined(name).then(() => (typeof host.componentOnReady === 'function' ? host.componentOnReady() : null));
  };

  t.onReady(() => {
    // a page rendered on the server carries no profiles, so there is nothing to show
    const profiles = window.$discordMessage && window.$discordMessage.profiles;
    if (!profiles) return;

    document.querySelectorAll(HOSTS).forEach((host) => {
      const known = profiles[host.getAttribute('profile')];
      if (!known || typeof known.serverTagText !== 'string' || !known.serverTagText.trim()) return;
      whenRendered(host).then(() => apply(host, known), () => {});
    });
  });
})();
`;
