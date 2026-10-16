import { type GuildMember, type Message, type User, UserFlags } from 'discord.js';
import { parseDiscordEmoji } from './utils';

export type Profile = {
  author: string; // author of the message
  avatar?: string; // avatar of the author
  roleColor?: string; // role color of the author
  roleIcon?: string; // role icon of the author
  roleName?: string; // role name of the author

  bot?: boolean; // is the author a bot
  verified?: boolean; // is the author verified

  serverTagText?: string; // the tag of the guild the author wears, e.g. "ABC"
  serverTagBadge?: string; // the badge image of that tag
  serverTagGuildId?: string; // the guild the tag belongs to
};

export type ProfileOptions = {
  /** add the server tag fields; only the script that shows them reads them */
  serverTags?: boolean;
};

export async function buildProfiles(
  messages: Message[],
  threads?: Map<string, Message[]>,
  options: ProfileOptions = {}
) {
  const profiles: Record<string, Profile> = {};

  for (const message of messages) {
    const author = message.author;
    if (!profiles[author.id]) {
      profiles[author.id] = buildProfile(message.member, author, options);
    }

    if (message.interaction) {
      const user = message.interaction.user;
      if (!profiles[user.id]) {
        profiles[user.id] = buildProfile(null, user, options);
      }
    }

    // the preview card under a thread shows its last message
    if (message.thread && message.thread.lastMessage) {
      profiles[message.thread.lastMessage.author.id] = buildProfile(
        message.thread.lastMessage.member,
        message.thread.lastMessage.author,
        options
      );
    }
  }

  // the collected messages of a thread are rendered too, so their authors need profiles
  for (const message of messages) {
    for (const threadMessage of threads?.get(message.id) ?? []) {
      const author = threadMessage.author;
      if (!profiles[author.id]) profiles[author.id] = buildProfile(threadMessage.member, author, options);
    }
  }

  return profiles;
}

/** The colour a member's name is drawn in; a member without a coloured role has none, not black. */
export function roleColor(member: GuildMember | null | undefined): string | undefined {
  // discord.js reports #000000 for "no coloured role"
  return member && member.displayHexColor !== '#000000' ? member.displayHexColor : undefined;
}

/** The icon of a member's highest role that has one, either an uploaded image or a unicode emoji. */
function roleIcon(member: GuildMember | null) {
  const role = member?.roles.icon;
  if (!role) return {};
  const icon = role.iconURL() ?? (role.unicodeEmoji ? parseDiscordEmoji({ name: role.unicodeEmoji }) : null);
  return icon ? { roleIcon: icon, roleName: role.name } : {};
}

/** The name a message author is shown with; the profiles and the message attributes must agree on it. */
export function displayName(member: GuildMember | null, author: User) {
  return member?.nickname ?? author.displayName ?? author.username;
}

// primaryGuild only exists on newer discord.js releases, so it is read as if it could be anything
function buildServerTag(author: User): Pick<Profile, 'serverTagText' | 'serverTagBadge' | 'serverTagGuildId'> {
  const primary = (
    author as { primaryGuild?: { identityEnabled?: unknown; tag?: unknown; identityGuildId?: unknown } | null }
  ).primaryGuild;
  if (!primary?.identityEnabled) return {};

  const tag = typeof primary.tag === 'string' ? primary.tag.trim() : '';
  if (!tag) return {};

  const badge =
    typeof author.guildTagBadgeURL === 'function'
      ? (author.guildTagBadgeURL({ extension: 'png', size: 32 }) ?? undefined)
      : undefined;

  return {
    serverTagText: tag,
    ...(badge ? { serverTagBadge: badge } : {}),
    ...(typeof primary.identityGuildId === 'string' ? { serverTagGuildId: primary.identityGuildId } : {}),
  };
}

function buildProfile(member: GuildMember | null, author: User, options: ProfileOptions): Profile {
  return {
    author: displayName(member, author),
    avatar: member?.displayAvatarURL({ size: 64 }) ?? author.displayAvatarURL({ size: 64 }),
    roleColor: roleColor(member),
    ...roleIcon(member),
    bot: author.bot,
    verified: author.flags?.has(UserFlags.VerifiedBot),
    ...(options.serverTags ? buildServerTag(author) : {}),
  };
}
