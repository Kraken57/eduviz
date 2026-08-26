import type { Example } from '../examples/index.js'

interface Props {
  examples: Example[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function ExampleSelector({ examples, selectedIndex, onSelect }: Props) {
  return (
    <ul className="example-list">
      {examples.map((example, index) => (
        <li
          key={index}
          className={`example-item${index === selectedIndex ? ' active' : ''}`}
          onClick={() => onSelect(index)}
        >
          <div className="name">{example.title}</div>
          <div className="tags">
            {example.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
