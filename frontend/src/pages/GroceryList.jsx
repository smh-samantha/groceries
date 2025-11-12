import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';

const ALL_WEEKS = [1, 2, 3, 4];

const GroceryList = ({ user }) => {
  const [selectedWeeks, setSelectedWeeks] = useState([1]);
  const [list, setList] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [exportPreview, setExportPreview] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const toggleWeek = (week) => {
    setSelectedWeeks((prev) => {
      if (prev.includes(week)) {
        if (prev.length === 1) return prev;
        return prev.filter((w) => w !== week);
      }
      return [...prev, week].sort();
    });
  };

  const fetchList = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getGroceryList(user, {
        weeks: selectedWeeks.join(','),
      });
      setList(data.items || {});
      setCheckedItems(new Set());
    } catch (err) {
      setError(err.message || 'Unable to load grocery list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, JSON.stringify(selectedWeeks)]);

  const flatList = useMemo(() => {
    const rows = [];
    Object.entries(list).forEach(([category, items]) => {
      items.forEach((item) => {
        rows.push({ category, ...item });
      });
    });
    return rows;
  }, [list]);

  const toggleItem = (name) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleExport = () => {
    const remaining = flatList.filter((item) => !checkedItems.has(item.name));
    const text = remaining
      .map(
        (item) => `${item.name} – ${item.combinedQuantity} – meals: ${item.meals.join(', ')}`,
      )
      .join('\n');
    setExportPreview(text || 'All ingredients already ticked off.');
  };

  return (
    <section className="page">
      <header className="page-header column">
        <p className="eyebrow">Grocery List</p>
        <p className="lead">
          Select which weeks youd like included in your grocery list. (You might have a 4 week rotation but only be getting groceries for the next 1 or 2 weeks.), and export the rest directly into your Woolies list.
          Tick off ingredients you already own and then you can export remaining items or only show unchecked items and take the list to the grocery store.
        </p>
        <button onClick={handleExport}>Export remaining items</button>
      </header>

      <div className="info-card grocery-guide">
        <h4>How this list behaves</h4>
        <ul>
          <li>Select weeks to pull ingredients from those rotations only.</li>
          <li>
            Check items you already have; we keep an export-ready preview of whatever remains.
          </li>
          <li>
            Totals reflect serving changes from the Rotation page, and each row shows the meals it
            powers.
          </li>
        </ul>
      </div>

      <div className="filters weeks-filter">
        {ALL_WEEKS.map((week) => (
          <button
            key={week}
            className={selectedWeeks.includes(week) ? 'pill active' : 'pill'}
            type="button"
            onClick={() => toggleWeek(week)}
          >
            Week {week}
          </button>
        ))}
        <label className="pending-toggle">
          <input
            type="checkbox"
            checked={showOnlyPending}
            onChange={(e) => setShowOnlyPending(e.target.checked)}
          />
          <span>Only show unchecked</span>
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <div className="loading">Loading grocery list…</div>}

      {Object.keys(list).length === 0 && !loading && (
        <div className="empty-state">No grocery items yet. Add meals to your rotation.</div>
      )}

      {Object.keys(list).length > 0 && (
        <div className="card grocery-collection">
          {Object.entries(list).map(([category, items]) => (
            <div className="grocery-category" key={category}>
              <h3 className="category-title">{category}</h3>
              {items
                .filter((item) => (showOnlyPending ? !checkedItems.has(item.name) : true))
                .map((item) => (
                  <label key={`${category}-${item.name}`} className="grocery-row">
                    <span className="checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={checkedItems.has(item.name)}
                        onChange={() => toggleItem(item.name)}
                      />
                    </span>
                    <div>
                      <p>{item.name}</p>
                      <p className="muted small-label">
                        {item.combinedQuantity} • {item.meals.join(', ')}
                      </p>
                    </div>
                  </label>
                ))}
            </div>
          ))}
        </div>
      )}

      {exportPreview && (
        <div className="card export">
          <p className="muted small-label">Remaining items</p>
          <pre>{exportPreview}</pre>
        </div>
      )}
    </section>
  );
};

export default GroceryList;
