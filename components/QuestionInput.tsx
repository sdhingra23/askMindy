'use client'

const SUGGESTIONS = [
  "Why isn't my job showing on Indeed?",
  "I can't log in / my employee can't log in",
  'Why am I not getting email notifications?',
  'How do I add a new location?',
]

interface Props {
  value: string
  onChange: (v: string) => void
  onAsk: (q: string) => void
  isLoading: boolean
  showSuggestions: boolean
}

export default function QuestionInput({
  value,
  onChange,
  onAsk,
  isLoading,
  showSuggestions,
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onAsk(value)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about our processes, policies, or procedures..."
          disabled={isLoading}
          className="
            flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900
            placeholder-gray-400 text-sm
            focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7]
            disabled:opacity-50 transition-colors
          "
        />
        <button
          onClick={() => onAsk(value)}
          disabled={isLoading || !value.trim()}
          className="
            px-5 py-3 bg-[#534AB7] text-white rounded-xl text-sm font-medium
            hover:bg-[#4540A0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          "
        >
          Ask
        </button>
      </div>

      {showSuggestions && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s)
                onAsk(s)
              }}
              className="
                px-3 py-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg
                hover:border-[#534AB7]/50 hover:text-[#534AB7] transition-colors
              "
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
