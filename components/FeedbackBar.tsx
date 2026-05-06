'use client'

import { useState } from 'react'

interface Props {
  question: string
  answer: string
}

type Stage = 'idle' | 'missing-followup' | 'done'

export default function FeedbackBar({ question, answer }: Props) {
  const [stage, setStage] = useState<Stage>('idle')

  const submit = async (rating: string) => {
    setStage('done')
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: rating, question, answer }),
      })
    } catch {
      // Fire-and-forget
    }
  }

  if (stage === 'done') {
    return <span className="text-xs text-gray-400">Thanks for your feedback!</span>
  }

  if (stage === 'missing-followup') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">Is the answer documented somewhere?</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => submit('missing-not-surfaced')}
            className="px-3 py-1 rounded-full text-xs border bg-white text-gray-500 border-gray-200 hover:border-amber-400 hover:text-amber-600 transition-all"
          >
            Yes, but wasn&apos;t surfaced
          </button>
          <button
            onClick={() => submit('missing-not-documented')}
            className="px-3 py-1 rounded-full text-xs border bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-600 transition-all"
          >
            Not documented anywhere
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400">Was this helpful?</span>
      <div className="flex gap-1.5">
        <button
          onClick={() => submit('yes')}
          className="px-3 py-1 rounded-full text-xs border bg-white text-gray-500 border-gray-200 hover:border-[#534AB7]/40 hover:text-[#534AB7] transition-all"
        >
          Yes
        </button>
        <button
          onClick={() => setStage('missing-followup')}
          className="px-3 py-1 rounded-full text-xs border bg-white text-gray-500 border-gray-200 hover:border-[#534AB7]/40 hover:text-[#534AB7] transition-all"
        >
          Missing info
        </button>
        <button
          onClick={() => submit('wrong')}
          className="px-3 py-1 rounded-full text-xs border bg-white text-gray-500 border-gray-200 hover:border-[#534AB7]/40 hover:text-[#534AB7] transition-all"
        >
          Wrong answer
        </button>
      </div>
    </div>
  )
}
