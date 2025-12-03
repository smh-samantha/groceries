import { useMemo, useState } from 'react';
import MealCard from '../components/MealCard';
import { apiClient } from '../services/apiClient';

const preferenceOptions = [
  { label: 'All meals', value: 'all' },
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
  { label: 'Slow cooker', value: 'slow_cooker' },
  { label: 'For freezing', value: 'freezer' },
  { label: 'Baby', value: 'baby' },
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
];

const blankIngredient = { name: '', amount: '', unit: 'unit', category: 'produce' };
const createInitialForm = () => ({
  name: '',
  servings: 2,
  preference: ['dinner'],
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
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        }),
    );
    const results = await Promise.all(readers);
    setFormState((prev) => ({
      ...prev,
      recipeAttachment: [...prev.recipeAttachment, ...results.filter(Boolean)],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      ...formState,
      preference: formState.preference.filter(Boolean),
      recipeAttachment: formState.recipeAttachment || [],
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

    if (!payload.preference || payload.preference.length === 0) {
      setError('Select at least one meal type.');
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
      preference: Array.isArray(meal.preference) ? meal.preference : [meal.preference],
      notes: meal.notes || '',
      imageUrl: meal.imageUrl || '',
      recipeLink: meal.recipeLink || '',
      recipeAttachment: meal.recipeAttachment || [],
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

  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">Meal Bank</p>
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
      </header>

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
                <input type="file" accept="image/*" onChange={handleImageFile} />
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
                  accept="image/*,application/pdf"
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
      <div className="filters stretch">
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

      <div className="grid gallery">
        {filteredMeals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onEdit={() => {
              handleEditMeal(meal);
              scrollToForm();
            }}
            onDelete={() => handleDeleteMeal(meal.id)}
          />
        ))}
        {filteredMeals.length === 0 && (
          <div className="empty-state">No meals match that search just yet.</div>
        )}
      </div>
    </section>
  );
};

export default MealBank;
