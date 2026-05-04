'use client'

import { useState } from 'react'

const OPTIONS = [
  { id: 'yes', label: 'Yes' },
  { id: 'missing', label: 'Missing info' },
  { id: 'wrong', label: 'Wrong answer' },
]

export default function FeedbackBar() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400">Was this helpful?</span>
      <div className="flex gap-1.5">
        {OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`
              px-3 py-1 rounded-full text-xs border transition-all
              ${
                selected === id
                  ? 'bg-[#534AB7] text-white border-[#534AB7]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#534AB7]/40 hover:text-[#534AB7]'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
