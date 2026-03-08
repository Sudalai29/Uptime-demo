export default function TagFilter({ tags, activeTag, onSelect }) {
  if (!tags.length) return null

  return (
    <div className="tag-filter">
      <span className="tag-filter-label">Filter:</span>
      <button
        className={`tag ${!activeTag ? 'tag-active' : ''}`}
        onClick={() => onSelect('')}
      >
        All
      </button>
      {tags.map(tag => (
        <button
          key={tag}
          className={`tag ${activeTag === tag ? 'tag-active' : ''}`}
          onClick={() => onSelect(activeTag === tag ? '' : tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
