'use client'

import { useEffect, useState } from 'react'
import type { Citation } from './SourceCitations'

export interface HistoryItem {
  id: string
  question: string
  answer: string
  citations: Citation[]
  timestamp: string
}

const STORAGE_KEY = 'askmindy_history'
const MAX_ITEMS = 20

export function saveToHistory(question: string, answer: string, citations: Citation[]) {
  if (!question || !answer) return
  try {
    const existing = loadHistory()
    const item: HistoryItem = {
      id: Date.now().toString(),
      question,
      answer,
      citations,
      timestamp: new Date().toISOString(),
    }
    const updated = [item, ...existing].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable
  }
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface Props {
  onReask: (question: string) => void
}

export default function TeamHistory({ onReask }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  if (history.length === 0) return null

  return (
    <div className="mt-10 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-600">Recent questions</h2>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY)
            setHistory([])
          }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Clear
        </button>
      </div>
      <ul className="space-y-2">
        {history.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onReask(item.question)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-100 bg-white hover:border-[#534AB7]/30 hover:bg-[#534AB7]/5 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm text-gray-700 group-hover:text-gray-900 line-clamp-2 leading-snug">
                  {item.question}
                </span>
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
              </div>
              {item.citations.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {item.citations.map((c, i) => (
                    <span key={i} className="text-xs text-gray-400 capitalize">{c.source}</span>
                  ))}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
