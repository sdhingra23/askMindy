'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  answer: string
  isLoading: boolean
  status: string
  citationCount?: number
}

function ConfidenceBadge({ count }: { count: number }) {
  if (count === 0) return null
  const level = count >= 3 ? 'High' : 'Medium'
  const styles = count >= 3
    ? 'bg-green-50 border-green-200 text-green-700'
    : 'bg-amber-50 border-amber-200 text-amber-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${styles}`}>
      {level} confidence
    </span>
  )
}

export default function AnswerCard({ answer, isLoading, status, citationCount }: Props) {
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
        <>
        {citationCount !== undefined && citationCount > 0 && (
          <div className="flex justify-end mb-2">
            <ConfidenceBadge count={citationCount} />
          </div>
        )}
        <div className="text-gray-800 text-sm leading-relaxed prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-gray-700">{children}</li>,
              h1: ({ children }) => <h1 className="text-base font-semibold text-gray-900 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-semibold text-gray-900 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mb-1">{children}</h3>,
              code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-200 pl-3 text-gray-500 italic">{children}</blockquote>,
            }}
          >
            {answer.trim()}
          </ReactMarkdown>
          {isLoading && (
            <span className="inline-block ml-0.5 w-0.5 h-4 bg-gray-400 animate-pulse align-text-bottom" />
          )}
        </div>
        </>
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
