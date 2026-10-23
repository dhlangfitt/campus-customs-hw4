import { Fragment } from 'react'

/**
 * Minimal markdown for chat bubbles: **bold**, line breaks, and `- ` bullets.
 *
 * The supplied chat history was written with markdown in it, so printing the
 * content raw shows shoppers literal asterisks. A full markdown parser is a
 * dependency this needs no part of — the agent is instructed to write plain
 * prose, and these three cases cover the seeded data.
 */
export default function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const bullet = line.startsWith('- ')
        const body = bullet ? line.slice(2) : line
        return (
          <Fragment key={i}>
            {i > 0 && <br />}
            {bullet && '• '}
            {bold(body)}
          </Fragment>
        )
      })}
    </>
  )
}

/** Split on **…** and wrap the inner runs in <strong>. */
function bold(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}
