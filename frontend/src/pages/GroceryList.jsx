import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';

const ALL_WEEKS = [1, 2, 3, 4];

const formatCategory = (value) => value.replace(/_/g, ' ');
const capitalize = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);

const GroceryList = ({ user }) => {
  const [selectedWeeks, setSelectedWeeks] = useState([1]);
  const [list, setList] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [exportPreview, setExportPreview] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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
      const itemsByCategory = data.items || {};
      setList(itemsByCategory);
      const checkedKeys = Object.values(itemsByCategory).flatMap((items) =>
        items.filter((item) => item.checked).map((item) => item.itemKey),
      );
      setCheckedItems(new Set(checkedKeys));
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

  const toggleItem = async (itemKey) => {
    setError('');
    const willCheck = !checkedItems.has(itemKey);
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (willCheck) {
        next.add(itemKey);
      } else {
        next.delete(itemKey);
      }
      return next;
    });

    try {
      await apiClient.setGroceryCheck(user, { itemKey, checked: willCheck });
    } catch (err) {
      setError(err.message || 'Unable to update grocery item');
      setCheckedItems((prev) => {
        const next = new Set(prev);
        if (willCheck) {
          next.delete(itemKey);
        } else {
          next.add(itemKey);
        }
        return next;
      });
    }
  };

  const handleExport = () => {
    const remaining = flatList.filter((item) => !checkedItems.has(item.itemKey));
    const text = remaining
      .map(
        (item) => `${item.name} – ${item.combinedQuantity} – meals: ${item.meals.join(', ')}`,
      )
      .join('\n');
    setExportPreview(text || 'All ingredients already ticked off.');
  };

  const handleRefresh = async () => {
    setError('');
    setCheckedItems(new Set());
    try {
      await apiClient.clearGroceryChecks(user);
      await fetchList();
    } catch (err) {
      setError(err.message || 'Unable to refresh grocery list');
    }
  };

  return (
    <section className="page">
      <div className="page-head-group">
        <header className="page-header column">
          <p className="eyebrow">Grocery List</p>
        </header>

        <div className="info-card grocery-guide guide-card">
          <button
            type="button"
            className="collapsible-header"
            onClick={() => setShowGuide((open) => !open)}
            aria-expanded={showGuide}
          >
            <span>Dashboard guide</span>
            <span className="collapsible-arrow">{showGuide ? '▾' : '▸'}</span>
          </button>
          {showGuide && (
            <div className="collapsible-body">
              <p className="lead">
                Select which weeks youd like included in your grocery list. (You might have a 4 week
                rotation but only be getting groceries for the next 1 or 2 weeks.), and export the
                rest directly into your Woolies list. Tick off ingredients you already own and then you
                can export remaining items or only show unchecked items and take the list to the
                grocery store.
              </p>
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
          )}
        </div>
      </div>

      <div className="action-row">
        <button onClick={handleExport}>Export remaining items</button>
        <button className="ghost" type="button" onClick={handleRefresh} disabled={loading}>
          Refresh list
        </button>
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
        <div className="empty-state">
          No grocery items yet. Add meals to your rotation or include items from your Household Bank.
        </div>
      )}

      {Object.keys(list).length > 0 && (
        <div className="card grocery-collection">
          {Object.entries(list).map(([category, items]) => (
            <div className="grocery-category" key={category}>
              <h3 className="category-title">{formatCategory(category)}</h3>
              {items
                .filter((item) => (showOnlyPending ? !checkedItems.has(item.itemKey) : true))
                .map((item) => (
                  <label
                    key={`${category}-${item.name}`}
                    className={`grocery-row ${checkedItems.has(item.itemKey) ? 'checked' : ''}`}
                  >
                    <span className="checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={checkedItems.has(item.itemKey)}
                        onChange={() => toggleItem(item.itemKey)}
                      />
                    </span>
                    <div>
                      <p>{capitalize(item.name)}</p>
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
