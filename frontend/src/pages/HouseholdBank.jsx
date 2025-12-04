import { useEffect, useMemo, useState } from 'react';
import HouseholdCard from '../components/HouseholdCard';
import { apiClient } from '../services/apiClient';

const unitOptions = [
  { label: 'Units', value: 'unit' },
  { label: 'Cups', value: 'cup' },
  { label: 'Tablespoons', value: 'tbsp' },
  { label: 'Teaspoons', value: 'tsp' },
  { label: 'Millilitres', value: 'ml' },
  { label: 'Litres', value: 'l' },
  { label: 'Grams', value: 'g' },
  { label: 'Kilograms', value: 'kg' },
];

const categoryOptions = [
  { label: 'Household', value: 'household' },
  { label: 'Personal care', value: 'personal_care' },
  { label: 'Pets', value: 'pets' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Paper goods', value: 'paper_goods' },
  { label: 'Pantry', value: 'pantry' },
  { label: 'Other', value: 'other' },
];

const blankItem = { name: '', amount: '', unit: 'unit', category: 'household' };
const createInitialForm = () => ({
  name: '',
  category: 'household',
  notes: '',
  includeInGroceryList: true,
  items: [{ ...blankItem }],
});

const HouseholdBank = ({ items, onRefresh, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formState, setFormState] = useState(createInitialForm());
  const [editingItemId, setEditingItemId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const computeColumns = () => {
      const width = window.innerWidth;
      if (width <= 700) return 1;
      if (width <= 1200) return 2;
      return 3;
    };
    const handler = () => setColumns(computeColumns());
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase().trim()),
    );
  }, [items, searchTerm]);

  const updateItem = (index, field, value) => {
    setFormState((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, items: next };
    });
  };

  const addItemRow = () => {
    setFormState((prev) => ({
      ...prev,
      items: [...prev.items, { ...blankItem }],
    }));
  };

  const resetForm = () => {
    setFormState(createInitialForm());
    setEditingItemId(null);
    setError('');
  };

  const scrollToForm = () => {
    window.requestAnimationFrame(() => {
      const formEl = document.querySelector('.form-card');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      name: formState.name.trim(),
      category: formState.category,
      notes: formState.notes,
      includeInGroceryList: formState.includeInGroceryList,
      items: formState.items
        .filter((item) => item.name.trim())
        .map((item) => ({
          ...item,
          name: item.name.trim(),
          amount:
            item.amount === '' || item.amount === null
              ? null
              : Number.isNaN(Number(item.amount))
                ? null
                : Number(item.amount),
        })),
    };

    if (!payload.name || payload.items.length === 0) {
      setError('Provide a group name and at least one item.');
      return;
    }

    setSaving(true);
    try {
      if (editingItemId) {
        await apiClient.updateHouseholdItem(user, editingItemId, payload);
      } else {
        await apiClient.createHouseholdItem(user, payload);
      }
      resetForm();
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err.message || 'Unable to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItemId(item.id);
    setShowForm(true);
    setFormState({
      name: item.name,
      category: item.category,
      notes: item.notes || '',
      includeInGroceryList: item.includeInGroceryList ?? true,
      items:
        item.items?.map((row) => ({
          name: row.name,
          amount: row.HouseholdGroupItem?.quantityValue ?? '',
          unit: row.HouseholdGroupItem?.quantityUnit || 'unit',
          category: row.category || 'household',
        })) || [{ ...blankItem }],
    });
    scrollToForm();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this group?')) return;
    try {
      await apiClient.deleteHouseholdItem(user, id);
      onRefresh();
    } catch (err) {
      setError(err.message || 'Unable to delete item');
    }
  };

  const handleToggleInclude = async (item) => {
    try {
      await apiClient.updateHouseholdItem(user, item.id, {
        name: item.name,
        category: item.category,
        notes: item.notes,
        includeInGroceryList: !item.includeInGroceryList,
        items: item.items.map((row) => ({
          name: row.name,
          amount: row.HouseholdGroupItem?.quantityValue ?? null,
          unit: row.HouseholdGroupItem?.quantityUnit || 'unit',
          category: row.category || 'household',
        })),
      });
      onRefresh();
    } catch (err) {
      setError(err.message || 'Unable to update item');
    }
  };

  return (
    <section className="page">
      <div className="page-head-group">
        <header className="page-header">
          <p className="eyebrow">Household Bank</p>
        </header>

        <div className="info-card guide-card">
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
                Store household staples, group them, and decide which ones flow into every grocery
                list by default.
              </p>
              <ul>
                <li>
                  Search or browse groups; toggle “Include in grocery list” to auto-add the items.
                </li>
                <li>Add groups with notes and multiple items, each with an amount/unit if needed.</li>
                <li>Edit or remove items inside a group; updates sync to the grocery list totals.</li>
                <li>Use grocery list filters to combine these with your rotation meals.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="filters stretch with-action">
        <div className="filters-group">
          <input
            placeholder="Search household groups"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            setShowForm((prev) => {
              const next = !prev;
              if (!next) {
                resetForm();
              } else {
                scrollToForm();
              }
              return next;
            });
          }}
        >
          {showForm ? 'Close form' : 'Add group'}
        </button>
      </div>

      {showForm && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              Group name
              <input
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Feminine hygiene, Dog essentials"
              />
            </label>
            <label>
              Category
              <select
                value={formState.category}
                onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Notes
            <textarea
              value={formState.notes}
              onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g., preferred brand, reminder cadence"
            />
          </label>

          <div className="ingredients-builder">
            <p className="muted small-label">Items</p>
            {formState.items.map((item, index) => (
              <div className="ingredient-row" key={`item-${index}`}>
                <input
                  placeholder="Item"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="Amount"
                  value={item.amount}
                  onChange={(e) => updateItem(index, 'amount', e.target.value)}
                />
                <select value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)}>
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={item.category}
                  onChange={(e) => updateItem(index, 'category', e.target.value)}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button type="button" className="ghost add-ingredient" onClick={addItemRow}>
              + Add item
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            {editingItemId && (
              <button type="button" className="ghost" onClick={resetForm}>
                Cancel edit
              </button>
            )}
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingItemId ? 'Update group' : 'Save group'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gallery">
        {filteredItems.map((group, index) => {
          const rowIndex = Math.floor(index / columns);
          const isOpen = expandedRows.has(rowIndex);
          return (
          <HouseholdCard
            key={group.id}
            group={group}
            open={isOpen}
            onToggle={() =>
              setExpandedRows((prev) => {
                const next = new Set(prev);
                if (next.has(rowIndex)) {
                  next.delete(rowIndex);
                } else {
                  next.add(rowIndex);
                }
                return next;
              })
            }
            onEdit={() => handleEdit(group)}
            onDelete={() => handleDelete(group.id)}
            onToggleInclude={() => handleToggleInclude(group)}
          />
        );
        })}
        {filteredItems.length === 0 && (
          <div className="empty-state">No household items yet. Add your staples.</div>
        )}
      </div>
    </section>
  );
};

export default HouseholdBank;
