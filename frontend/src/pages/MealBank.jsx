import { useEffect, useMemo, useState } from 'react';
import MealCard from '../components/MealCard';
import { apiClient } from '../services/apiClient';

const preferenceOptions = [
  { label: 'All meals', value: 'all' },
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
  { label: 'Slow cooker', value: 'slow_cooker' },
  { label: 'Freezer', value: 'freezer' },
  { label: 'Baby', value: 'baby' },
  { label: 'Dessert', value: 'dessert' },
];

const unitOptions = [
  { label: 'Units', value: 'unit' },
  { label: 'Cups', value: 'cup' },
  { label: 'Tablespoons', value: 'tbsp' },
  { label: 'Teaspoons', value: 'tsp' },
  { label: 'Millilitres', value: 'ml' },
  { label: 'Litres', value: 'l' },
  { label: 'Grams', value: 'g' },
  { label: 'Kilograms', value: 'kg' },
  { label: 'With love', value: 'with_love' },
];

const blankIngredient = { name: '', amount: '', unit: 'unit', category: 'produce' };
const createInitialForm = () => ({
  name: '',
  servings: 2,
  preference: [],
  notes: '',
  imageUrl: '',
  recipeLink: '',
  recipeAttachment: [],
  ingredients: [{ ...blankIngredient }],
});

const MealBank = ({ meals, onRefresh, user }) => {
  const [preferenceFilter, setPreferenceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formState, setFormState] = useState(createInitialForm());
  const [editingMealId, setEditingMealId] = useState(null);
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

  const filteredMeals = useMemo(() => {
    return meals
      .filter((meal) =>
        preferenceFilter === 'all'
          ? true
          : Array.isArray(meal.preference) && meal.preference.includes(preferenceFilter),
      )
      .filter((meal) => meal.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [meals, preferenceFilter, searchTerm]);

  const updateIngredient = (index, field, value) => {
    setFormState((prev) => {
      const next = [...prev.ingredients];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, ingredients: next };
    });
  };

  const addIngredientRow = () => {
    setFormState((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...blankIngredient }],
    }));
  };

  const resetForm = () => {
    setFormState(createInitialForm());
    setEditingMealId(null);
    setError('');
  };

  const handleImageFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormState((prev) => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRecipeAttachment = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const readers = Array.from(files).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ name: file.name, data: reader.result });
          reader.readAsDataURL(file);
        }),
    );
    const results = await Promise.all(readers);
    setFormState((prev) => ({
      ...prev,
      recipeAttachment: [
        ...prev.recipeAttachment,
        ...results.filter((item) => item && item.data),
      ],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      ...formState,
      preference: formState.preference.filter(Boolean),
      recipeAttachment: (formState.recipeAttachment || []).map((item, index) => ({
        name: item?.name || `Attachment ${index + 1}`,
        data: item?.data || item,
      })),
      ingredients: formState.ingredients
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

    if (!payload.name.trim() || payload.ingredients.length === 0) {
      setError('Provide a meal name and at least one ingredient.');
      return;
    }

    setSaving(true);
    try {
      if (editingMealId) {
        await apiClient.updateMeal(user, editingMealId, payload);
      } else {
        await apiClient.createMeal(user, payload);
      }
      resetForm();
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err.message || 'Unable to save meal');
    } finally {
      setSaving(false);
    }
  };

  const scrollToForm = () => {
    window.requestAnimationFrame(() => {
      const formEl = document.querySelector('.form-card');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleEditMeal = (meal) => {
    setEditingMealId(meal.id);
    setShowForm(true);
    setFormState({
      name: meal.name,
      servings: meal.servings || 1,
      preference: Array.isArray(meal.preference) ? meal.preference : [],
      notes: meal.notes || '',
      imageUrl: meal.imageUrl || '',
      recipeLink: meal.recipeLink || '',
      recipeAttachment: (meal.recipeAttachment || []).map((item, index) => ({
        name: item?.name || `Attachment ${index + 1}`,
        data: item?.data || item,
      })),
      ingredients:
        meal.ingredients?.map((item) => ({
          name: item.name,
          amount: item.MealIngredient?.quantityValue ?? '',
          unit: item.MealIngredient?.quantityUnit || 'unit',
          category: item.category || 'produce',
        })) || [{ ...blankIngredient }],
    });
  };

  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm('Remove this meal?')) return;
    try {
      await apiClient.deleteMeal(user, mealId);
      onRefresh();
    } catch (err) {
      setError(err.message || 'Unable to delete meal');
    }
  };

  const handleUpdateAttachments = async (mealId, attachments) => {
    const target = meals.find((m) => m.id === mealId);
    if (!target) throw new Error('Meal not found');
    const payload = {
      name: target.name,
      servings: target.servings || 1,
      preference: Array.isArray(target.preference) ? target.preference : [],
      notes: target.notes || '',
      imageUrl: target.imageUrl || '',
      recipeLink: target.recipeLink || '',
      recipeAttachment: (attachments || []).map((item, index) => ({
        name: item?.name || `Attachment ${index + 1}`,
        data: item?.data || item,
      })),
      ingredients: (target.ingredients || []).map((item) => ({
        name: item.name,
        amount: item.MealIngredient?.quantityValue ?? null,
        unit: item.MealIngredient?.quantityUnit || 'unit',
        category: item.category || 'produce',
      })),
    };
    await apiClient.updateMeal(user, mealId, payload);
    await onRefresh();
  };

  return (
    <section className="page">
      <div className="page-head-group">
        <header className="page-header">
          <p className="eyebrow">Meal Bank</p>
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
                Bank your meals, attach recipes and ingredients, and pull them into rotations without
                rebuilding the details.
              </p>
              <ul>
                <li>Filter by meal type or search by name to find an existing meal.</li>
                <li>Add or edit a meal with servings, notes, links, and file attachments.</li>
                <li>
                  Each ingredient needs a name and amount/unit to save; add multiple rows as needed.
                </li>
                <li>Use the rotation page to drop saved meals into weekly plans.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="filters stretch with-action">
        <div className="filters-group">
          <input
            placeholder="Search meals"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select value={preferenceFilter} onChange={(e) => setPreferenceFilter(e.target.value)}>
            {preferenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          {showForm ? 'Close form' : 'Add meal'}
        </button>
      </div>

      {showForm && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-block inline-two">
            <label>
              Meal name
              <input
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Lemon Herb Chicken"
              />
            </label>
            <label>
              Servings
              <input
                type="number"
                min="1"
                value={formState.servings}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setFormState((prev) => ({
                    ...prev,
                    servings: !Number.isNaN(value) && value >= 1 ? value : 1,
                  }));
                }}
              />
            </label>
          </div>

          <div className="form-block">
            <p className="small-label">Meal type(s)</p>
            <div className="pill-options wide">
              {preferenceOptions
                .filter((option) => option.value !== 'all')
                .map((option) => {
                  const checked = formState.preference.includes(option.value);
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={checked ? 'pill active' : 'pill'}
                      onClick={() =>
                        setFormState((prev) => {
                          const next = new Set(prev.preference);
                          if (checked) {
                            next.delete(option.value);
                          } else {
                            next.add(option.value);
                          }
                          return { ...prev, preference: Array.from(next) };
                        })
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="form-block">
            <p className="small-label">Cover photo</p>
            <label className="upload-card wide">
              <div className="upload-header">
                <p className="muted small-label">Upload an image for this meal</p>
                {formState.imageUrl && (
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() => setFormState((prev) => ({ ...prev, imageUrl: '' }))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="dropzone">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/*"
                  onChange={handleImageFile}
                />
              </div>
              {formState.imageUrl && (
                <img src={formState.imageUrl} alt="Meal preview" className="image-preview" />
              )}
            </label>
          </div>

          <div className="form-block">
            <p className="small-label">Recipe link</p>
            <label className="upload-card wide">
              <input
                type="url"
                placeholder="https://..."
                value={formState.recipeLink || ''}
                onChange={(e) => setFormState((prev) => ({ ...prev, recipeLink: e.target.value }))}
              />
            </label>
          </div>

          <div className="form-block">
            <div className="upload-header">
              <p className="small-label">Recipe files (images/PDFs)</p>
              {formState.recipeAttachment?.length > 0 && (
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => setFormState((prev) => ({ ...prev, recipeAttachment: [] }))}
                >
                  Clear all
                </button>
              )}
            </div>
            <label className="upload-card wide">
                <div className="dropzone">
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif,image/*,application/pdf"
                    onChange={handleRecipeAttachment}
                  />
                </div>
              {formState.recipeAttachment?.length > 0 && (
                <p className="muted small-label">
                  {formState.recipeAttachment.length} file(s) ready to save
                </p>
              )}
            </label>
          </div>

          <div className="form-block">
            <p className="small-label">Notes</p>
            <textarea
              value={formState.notes}
              onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Serving notes, prep, etc."
            />
          </div>

          <div className="form-block">
            <p className="muted small-label">Ingredients</p>
            {formState.ingredients.map((ingredient, index) => (
              <div className="ingredient-row" key={`ingredient-${index}`}>
                <input
                  placeholder="Ingredient"
                  value={ingredient.name}
                  onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="Amount"
                  value={ingredient.amount}
                  onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                />
                <select value={ingredient.unit} onChange={(e) => updateIngredient(index, 'unit', e.target.value)}>
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={ingredient.category}
                  onChange={(e) => updateIngredient(index, 'category', e.target.value)}
                >
                  <option value="produce">Produce</option>
                  <option value="meats">Meats</option>
                  <option value="seafood">Seafood</option>
                  <option value="dairy">Dairy</option>
                  <option value="pantry">Pantry</option>
                  <option value="frozen">Frozen</option>
                  <option value="bakery">Bakery</option>
                  <option value="beverages">Beverages</option>
                  <option value="other">Other</option>
                </select>
                <button
                  type="button"
                  className="ghost small danger"
                  onClick={() =>
                    setFormState((prev) => ({
                      ...prev,
                      ingredients: prev.ingredients.filter((_, i) => i !== index),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="ghost add-ingredient" onClick={addIngredientRow}>
              + Add ingredient
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            {editingMealId && (
              <button type="button" className="ghost" onClick={resetForm}>
                Cancel edit
              </button>
            )}
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingMealId ? 'Update meal' : 'Save meal'}
            </button>
          </div>
        </form>
      )}
      <div className="grid gallery">
        {filteredMeals.map((meal, index) => {
          const rowIndex = Math.floor(index / columns);
          const isOpen = expandedRows.has(rowIndex);
          return (
          <MealCard
            key={meal.id}
            meal={meal}
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
            onUpdateAttachments={(attachments) => handleUpdateAttachments(meal.id, attachments)}
            onEdit={() => {
              handleEditMeal(meal);
              scrollToForm();
            }}
            onDelete={() => handleDeleteMeal(meal.id)}
          />
        );
        })}
        {filteredMeals.length === 0 && (
          <div className="empty-state">No meals match that search just yet.</div>
        )}
      </div>
    </section>
  );
};

export default MealBank;
