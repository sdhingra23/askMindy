'use client'

interface Props {
  answer: string
  isLoading: boolean
  status: string
}

export default function AnswerCard({ answer, isLoading, status }: Props) {
  const showSpinner = isLoading && !answer

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[80px]">
      {showSpinner && (
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <LoadingDots />
          <span>{status || 'Searching...'}</span>
        </div>
      )}

      {answer && (
        <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
          {answer.trim()}
          {isLoading && (
            <span className="inline-block ml-0.5 w-0.5 h-4 bg-gray-400 animate-pulse align-text-bottom" />
          )}
        </div>
      )}
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1 shrink-0">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-[#534AB7] rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
