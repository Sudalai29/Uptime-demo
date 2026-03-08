export default function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        placeholder="Search links by title or URL..."
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className="btn-icon" onClick={() => onChange('')}>✕</button>
      )}
    </div>
  )
}
