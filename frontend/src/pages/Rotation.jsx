import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';

const timeframeOptions = [
  { label: '1 week', value: 1 },
  { label: '2 weeks', value: 2 },
  { label: '4 weeks', value: 4 },
];

const rotationGuide = [
  {
    title: 'Choose your rhythm',
    body: 'Set a 1, 2, or 4 week window. This is supposed to reflect repeated meals. you can update these every month though so dont stress if you dont wanna repeat meals.',
  },
  {
    title: 'Drop meals in',
    body: 'Use the Add meal menu under each week to pull favourites from the bank.',
  },
  {
    title: 'Adjust servings',
    body: 'Scale portions per meal; ingredient totals and the grocery list update automatically.',
  },
];

const Rotation = ({ user, meals }) => {
  const [config, setConfig] = useState({ timeframeWeeks: 1 });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState({});
  const [servingDrafts, setServingDrafts] = useState({});

  const groupedEntries = useMemo(() => {
    const result = { 1: [], 2: [], 3: [], 4: [] };
    entries.forEach((entry) => {
      if (!result[entry.weekNumber]) {
        result[entry.weekNumber] = [];
      }
      result[entry.weekNumber].push(entry);
    });
    return result;
  }, [entries]);

  const loadRotation = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getRotation(user);
      setConfig(data.config);
      setEntries(data.entries);
      setServingDrafts({});
    } catch (err) {
      setError(err.message || 'Unable to load rotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleTimeframeChange = async (value) => {
    try {
      await apiClient.updateRotationConfig(user, { timeframeWeeks: Number(value) });
      setSelection({});
      await loadRotation();
    } catch (err) {
      setError(err.message || 'Unable to update timeframe');
    }
  };

  const handleAddMeal = async (weekNumber, mealId) => {
    if (!mealId) return;
    try {
      await apiClient.addRotationEntry(user, {
        weekNumber,
        mealId: Number(mealId),
      });
      setSelection((prev) => ({ ...prev, [weekNumber]: '' }));
      await loadRotation();
    } catch (err) {
      setError(err.message || 'Unable to add meal');
    }
  };

  const handleRemoveMeal = async (entryId) => {
    try {
      await apiClient.deleteRotationEntry(user, entryId);
      await loadRotation();
    } catch (err) {
      setError(err.message || 'Unable to remove meal');
    }
  };

  const servingValueForEntry = (entry) =>
    servingDrafts[entry.id] ?? entry.servings ?? entry.meal?.servings ?? 1;

  const handleServingsBlur = async (entryId) => {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const draftValue = Number(servingDrafts[entryId]);
    const fallback = entry.servings ?? entry.meal?.servings ?? 1;
    const numeric = !Number.isNaN(draftValue) && draftValue >= 1 ? draftValue : fallback;

    setServingDrafts((prev) => ({ ...prev, [entryId]: numeric }));

    if (numeric === entry.servings) return;

    try {
      await apiClient.updateRotationEntryServings(user, entryId, numeric);
      await loadRotation();
    } catch (err) {
      setError(err.message || 'Unable to update servings');
    }
  };

  return (
    <section className="page">
      <header className="page-header column">
        <p className="eyebrow">Rotation</p>
        <p className="lead">
          Pick a timeframe for a rotation, add meals into each week, and resize servings when plans change. Every
          tweak feeds straight into the grocery list Test.
        </p>
      </header>

      <div className="info-grid">
        {rotationGuide.map((card) => (
          <article className="info-card" key={card.title}>
            <h4>{card.title}</h4>
            <p>{card.body}</p>
          </article>
        ))}
      </div>

      <div className="filters tight">
        <label>
          Rotation length
          <select
            value={config.timeframeWeeks}
            onChange={(e) => handleTimeframeChange(e.target.value)}
          >
            {timeframeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <div className="loading">Loading rotation…</div>}

      <div className="weeks-grid">
        {Array.from({ length: config.timeframeWeeks || 1 }).map((_, index) => {
          const weekNumber = index + 1;
          const weekEntries = groupedEntries[weekNumber] || [];
          return (
            <div className="card week-card" key={`week-${weekNumber}`}>
              <div className="week-header">
                <h3>Week {weekNumber}</h3>
                <select
                  value={selection[weekNumber] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelection((prev) => ({ ...prev, [weekNumber]: value }));
                    handleAddMeal(weekNumber, value);
                  }}
                >
                  <option value="">Add meal…</option>
                  {meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="week-body">
                {weekEntries.length === 0 && (
                  <p className="muted small-label">No meals yet</p>
                )}
                {weekEntries.map((entry) => (
                  <div className="week-item" key={entry.id}>
                    <div className="week-item-info">
                      <div>
                        <p>{entry.meal?.name}</p>
                        <p className="muted small-label">
                          {entry.meal?.preference} • base {entry.meal?.servings || 1} servings
                        </p>
                      </div>
                      <label className="servings-input">
                        <span className="muted small-label">Servings</span>
                        <input
                          type="number"
                          min="1"
                          value={servingValueForEntry(entry)}
                          onChange={(e) =>
                            setServingDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))
                          }
                          onBlur={() => handleServingsBlur(entry.id)}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => handleRemoveMeal(entry.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Rotation;
