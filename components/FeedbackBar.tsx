'use client'

import { useState } from 'react'

const OPTIONS = [
  { id: 'yes', label: 'Yes' },
  { id: 'missing', label: 'Missing info' },
  { id: 'wrong', label: 'Wrong answer' },
]

interface Props {
  question: string
  answer: string
}

export default function FeedbackBar({ question, answer }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = async (id: string) => {
    setSelected(id)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: id, question, answer }),
      })
    } catch {
      // Fire-and-forget — don't surface logging errors to the user
    }
  }

  return (
    <div className="flex items-center gap-3">
      {selected ? (
        <span className="text-xs text-gray-400">Thanks for your feedback!</span>
      ) : (
        <>
          <span className="text-xs text-gray-400">Was this helpful?</span>
          <div className="flex gap-1.5">
            {OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className="
                  px-3 py-1 rounded-full text-xs border transition-all
                  bg-white text-gray-500 border-gray-200
                  hover:border-[#534AB7]/40 hover:text-[#534AB7]
                "
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
