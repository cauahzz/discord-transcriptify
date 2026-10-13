import { DiscordTime } from '../discordComponents';
import type { Poll } from 'discord.js';
import React from 'react';
import { parseDiscordEmoji } from '../../utils/utils';

/**
 * Renders a poll with its results.
 *
 * Discord hides the counts until you vote; a transcript is a record, so the
 * counts are always shown. While a poll is still open they are approximate.
 */
export default function DiscordPoll({ poll }: { poll: Poll }) {
  const answers = [...poll.answers.values()];
  const totalVotes = answers.reduce((sum, answer) => sum + (answer.voteCount ?? 0), 0);

  return (
    <div className="discord-poll">
      <div className="discord-poll-header">
        <div className="discord-poll-question">
          <strong>{poll.question.text}</strong>
        </div>
        <div className="discord-poll-subtitle">
          {poll.allowMultiselect ? 'Select one or more answers' : 'Select one answer'}
        </div>
      </div>

      <div className="discord-poll-answers">
        {answers.map((answer) => {
          const votes = answer.voteCount ?? 0;
          const share = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

          return (
            <div className="discord-poll-answer" key={answer.id}>
              <div className="discord-poll-bar" style={{ width: `${share}%` }} />
              <div className="discord-poll-content">
                {answer.emoji?.name && (
                  <span className="discord-poll-emoji">
                    <img src={parseDiscordEmoji(answer.emoji)} alt={answer.emoji.name} />
                  </span>
                )}
                {answer.text && <span className="discord-poll-text">{answer.text}</span>}
                <span className="discord-poll-votes">
                  {share}% ({votes})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="discord-poll-footer">
        <span className="discord-poll-footer-left">
          {totalVotes} vote{totalVotes === 1 ? '' : 's'}
        </span>
        <span className="discord-poll-footer-right">
          {poll.resultsFinalized ? (
            'Final results'
          ) : poll.expiresTimestamp ? (
            <>
              Closes <DiscordTime timestamp={poll.expiresTimestamp} format="f" />
            </>
          ) : (
            'Open'
          )}
        </span>
      </div>
    </div>
  );
}
