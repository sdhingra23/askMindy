'use client'

interface Props {
  activeSources: string[]
  onChange: (sources: string[]) => void
}

const SOURCES = [
  { id: 'notion', label: 'Notion', color: '#00B45E' },
  { id: 'slack', label: 'Slack', color: '#4A154B' },
  { id: 'zoom', label: 'Zoom', color: '#2D8CFF' },
]

export default function SourceToggle({ activeSources, onChange }: Props) {
  const toggle = (id: string) => {
    if (activeSources.includes(id)) {
      // Keep at least one source active
      if (activeSources.length > 1) {
        onChange(activeSources.filter((s) => s !== id))
      }
    } else {
      onChange([...activeSources, id])
    }
  }

  return (
    <div className="flex gap-2 mb-5">
      {SOURCES.map(({ id, label, color }) => {
        const active = activeSources.includes(id)
        return (
          <button
            key={id}
            onClick={() => toggle(id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
              ${
                active
                  ? 'bg-white border-gray-200 text-gray-700 shadow-sm'
                  : 'bg-transparent border-gray-200 text-gray-400'
              }
            `}
          >
            <span
              className="w-2 h-2 rounded-full transition-opacity"
              style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}
