/**
 * Shared by every client script, which is why it is a separate script and not
 * part of any of them. Emitted once, and only when a feature script follows.
 */
export const prelude = `(function () {
  var HIGHLIGHT = 'rgba(148, 156, 247, 0.1)';

  var queue = [];
  var ready = false;
  var dropdowns = [];
  var revealers = [];
  var dismissal = false;

  function flush() {
    ready = true;
    queue.forEach(run);
    queue = [];
  }

  // one feature's failure must not take the other features down with it
  function run(fn) {
    try {
      fn();
    } catch (error) {
      console.error(error);
    }
  }

  function setOpen(entry, open) {
    entry.panel.classList.toggle('is-open', open);
    entry.button.classList.toggle('is-active', open);
    entry.button.setAttribute('aria-expanded', String(open));
  }

  function closeAll() {
    dropdowns.forEach(function (entry) {
      setOpen(entry, false);
    });
  }

  // one listener pair for every dropdown, added when the first one exists
  function listenForDismissal() {
    if (dismissal) return;
    dismissal = true;
    document.addEventListener('click', function (event) {
      dropdowns.forEach(function (entry) {
        if (!entry.anchor.contains(event.target)) setOpen(entry, false);
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', flush);
  } else {
    ready = true;
  }

  var api = {
    onReady: function (fn) {
      if (ready) run(fn);
      else queue.push(fn);
    },

    // for every value that ends up in an innerHTML string, attribute values included
    escapeHtml: function (value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    // a message that started a thread contains the thread's messages in its subtree, so their text is left out of the parent
    ownText: function (node) {
      var text = node.textContent;
      node.querySelectorAll('.discord-thread-messages').forEach(function (thread) {
        text = text.replace(thread.textContent, '');
      });
      return text;
    },

    // a feature that shows a message some other way than the open details (a thread modal) takes it over by returning true
    onReveal: function (fn) {
      revealers.push(fn);
    },

    // a message inside a collapsed thread cannot be scrolled to until every details around it is open
    reveal: function (node) {
      for (var i = 0; i < revealers.length; i++) {
        if (revealers[i](node)) return;
      }
      for (var thread = node.closest('details'); thread; thread = thread.parentElement && thread.parentElement.closest('details')) {
        thread.open = true;
      }
    },

    goTo: function (node) {
      api.reveal(node);
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node.style.backgroundColor = HIGHLIGHT;
      node.style.transition = 'background-color 0.5s ease';
      setTimeout(function () {
        node.style.backgroundColor = '';
      }, 1000);
    },

    // what a panel shows about the author of a message element; the name and id are attributes the server escaped
    profile: function (node) {
      var id = node.getAttribute('data-author-id') || '';
      var profiles = (window.$discordMessage && window.$discordMessage.profiles) || {};
      var known = profiles[id] || {};
      // a hydrated page carries no profiles, but its components render the avatar
      var rendered = known.avatar ? null : node.querySelector('.discord-author-avatar img');
      var color = known.roleColor;
      return {
        author: node.getAttribute('data-author-name') || known.author || 'Unknown User',
        avatar: known.avatar || (rendered && rendered.getAttribute('src')) || '',
        // #000000 is what a member without a coloured role reports, and it would vanish on the dark panel
        roleColor: /^#[0-9a-f]{3,8}$/i.test(color || '') && color !== '#000000' ? color : '',
      };
    },

    avatar: function (prefix, profile) {
      if (profile.avatar) {
        return '<img class="' + prefix + '" src="' + api.escapeHtml(profile.avatar) + '" alt="" loading="lazy" decoding="async" draggable="false" />';
      }
      var initial = api.escapeHtml((profile.author || '?').trim().charAt(0) || '?');
      return '<span class="' + prefix + ' ' + prefix + '--fallback" aria-hidden="true">' + initial + '</span>';
    },

    // the panel under a header tool; at most one is open at a time, and render fills it each time it opens
    dropdown: function (action, render) {
      var button = document.querySelector('[data-transcript-action="' + action + '"]');
      var anchor = button && button.closest('.discord-transcript-' + action + '-anchor');
      if (!button || !anchor) return null;

      var panel = document.createElement('div');
      panel.className = 'discord-transcript-' + action + '-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', button.getAttribute('aria-label') || action);
      anchor.appendChild(panel);

      var entry = { anchor: anchor, button: button, panel: panel };
      dropdowns.push(entry);
      button.addEventListener('click', function () {
        var wasOpen = panel.classList.contains('is-open');
        closeAll();
        if (wasOpen) return;
        setOpen(entry, true);
        render(panel);
      });
      listenForDismissal();

      return {
        panel: panel,
        close: function () {
          setOpen(entry, false);
        },
      };
    },
  };

  window.__transcript = api;
})();`;
