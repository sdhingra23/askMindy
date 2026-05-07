'use client'

export interface Citation {
  source: 'notion' | 'slack' | 'zoom' | 'zendesk'
  title: string
  url: string
  age: string
}

const STYLES: Record<
  Citation['source'],
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  notion: {
    label: 'Notion',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  slack: {
    label: 'Slack',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
  zoom: {
    label: 'Zoom',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  zendesk: {
    label: 'Zendesk',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    dot: 'bg-teal-500',
  },
}

interface Props {
  citations: Citation[]
}

export default function SourceCitations({ citations }: Props) {
  const isKnowledgeGap = citations.length < 2

  return (
    <div className="space-y-2">
      {citations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {citations.map((c, i) => {
            const s = STYLES[c.source]
            return (
              <a
                key={i}
                href={c.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border text-xs
                  ${s.bg} ${s.border} ${s.text}
                  hover:opacity-80 transition-opacity
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                <span className="font-semibold">{s.label}</span>
                <span className="text-gray-600 max-w-[200px] truncate">{c.title}</span>
                {c.age && <span className="text-gray-400 shrink-0">· {c.age}</span>}
              </a>
            )
          })}
        </div>
      )}

      {isKnowledgeGap && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <span>⚠</span>
          <span>Knowledge gap — consider documenting this</span>
        </div>
      )}
    </div>
  )
}
