'use client'

interface Props {
  activeSources: string[]
  onChange: (sources: string[]) => void
}

const SOURCES = [
  { id: 'notion', label: 'Notion', color: '#00B45E' },
  { id: 'slack', label: 'Slack', color: '#4A154B' },
  { id: 'zoom', label: 'Zoom', color: '#2D8CFF' },
  { id: 'zendesk', label: 'Zendesk', color: '#00A3BF' },
]

export default function SourceToggle({ activeSources, onChange }: Props) {
  const toggle = (id: string) => {
    if (activeSources.includes(id)) {
      if (activeSources.length > 1) {
        onChange(activeSources.filter((s) => s !== id))
      }
    } else {
      onChange([...activeSources, id])
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {SOURCES.map(({ id, label, color }) => {
        const active = activeSources.includes(id)
        return (
          <button
            key={id}
            onClick={() => toggle(id)}
            aria-pressed={active}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
              ${
                active
                  ? 'bg-white border-gray-300 text-gray-800 shadow-sm'
                  : 'bg-gray-100 border-gray-200 text-gray-400'
              }
            `}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 transition-opacity"
              style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}
