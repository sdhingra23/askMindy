'use client'

import { useState, useCallback } from 'react'
import SourceToggle from '@/components/SourceToggle'
import QuestionInput from '@/components/QuestionInput'
import AnswerCard from '@/components/AnswerCard'
import SourceCitations, { type Citation } from '@/components/SourceCitations'
import FeedbackBar from '@/components/FeedbackBar'
import TeamHistory, { saveToHistory } from '@/components/TeamHistory'

export default function Page() {
  const [activeSources, setActiveSources] = useState<string[]>(['notion', 'slack', 'zoom', 'zendesk'])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [hasAsked, setHasAsked] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)

  const handleAsk = useCallback(
    async (q: string) => {
      if (!q.trim() || isLoading) return

      setHasAsked(true)
      setIsLoading(true)
      setAnswer('')
      setCitations([])
      setStatus('Searching Notion, Slack, Zoom...')

      try {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, sources: activeSources }),
        })

        if (!response.ok || !response.body) {
          setAnswer("Something went wrong — please try again")
          setIsLoading(false)
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let currentAnswer = ''
        let currentCitations: Citation[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE events are delimited by double newlines
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            let eventType = 'message'
            let eventData = ''

            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) eventType = line.slice(7).trim()
              if (line.startsWith('data: ')) eventData = line.slice(6).trim()
            }

            if (!eventData) continue

            try {
              const payload = JSON.parse(eventData)

              if (eventType === 'status') {
                setStatus(payload.message)
              } else if (eventType === 'chunk') {
                setStatus('')
                currentAnswer += payload.text
                setAnswer((prev) => prev + payload.text)
              } else if (eventType === 'sources') {
                currentCitations = payload
                setCitations(payload)
              } else if (eventType === 'done') {
                saveToHistory(q, currentAnswer, currentCitations)
                setHistoryKey((k) => k + 1)
                setIsLoading(false)
              } else if (eventType === 'error') {
                setAnswer(payload.message ?? "Something went wrong — please try again")
                setIsLoading(false)
              }
            } catch {
              // Ignore malformed SSE frames
            }
          }
        }

        setIsLoading(false)
      } catch {
        setAnswer("Something went wrong — please try again")
        setIsLoading(false)
      }
    },
    [activeSources, isLoading],
  )

  const showAnswerArea = hasAsked || isLoading

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#534AB7' }}>
            askMindy
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ask anything across HigherMe&apos;s knowledge base
          </p>
        </div>

        {/* Source Toggle */}
        <SourceToggle activeSources={activeSources} onChange={setActiveSources} />

        {/* Question Input */}
        <QuestionInput
          value={question}
          onChange={setQuestion}
          onAsk={handleAsk}
          isLoading={isLoading}
          showSuggestions={!hasAsked}
        />

        {/* Answer + Citations + Feedback */}
        {showAnswerArea && (
          <div className="mt-6 space-y-3">
            <AnswerCard answer={answer} isLoading={isLoading} status={status} />

            {!isLoading && answer && (
              <>
                <SourceCitations citations={citations} />
                <FeedbackBar question={question} answer={answer} />
              </>
            )}
          </div>
        )}

        <TeamHistory key={historyKey} onSelect={(item) => {
          setQuestion(item.question)
          setAnswer(item.answer)
          setCitations(item.citations)
          setHasAsked(true)
        }} />

      </div>
    </div>
  )
}
