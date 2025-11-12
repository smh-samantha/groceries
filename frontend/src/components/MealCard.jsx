import { useState } from 'react';
import placeholderImage from '../assets/meal-placeholder.svg';

const formatQuantity = (mealIngredient) => {
  if (!mealIngredient) return '';
  const { quantityValue, quantityUnit } = mealIngredient;
  if (quantityValue === null || quantityValue === undefined) {
    return quantityUnit === 'unit' ? 'as needed' : `as needed ${quantityUnit}`;
  }

  const formatted = Number.isInteger(quantityValue)
    ? Number(quantityValue)
    : Number(quantityValue.toFixed(2));

  return quantityUnit === 'unit' ? `${formatted}` : `${formatted} ${quantityUnit}`;
};

const MealCard = ({ meal, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((prev) => !prev);
  const photo = meal.imageUrl || placeholderImage;

  return (
    <div className={`card meal-card ${open ? 'open' : ''}`}>
      <div className="meal-image">
        <img src={photo} alt={meal.name} />
      </div>
      <button type="button" className="meal-card-toggle" onClick={toggle}>
        <div>
          <p className="eyebrow">{meal.preference}</p>
          <h3>{meal.name}</h3>
        </div>
        <div className="meal-meta">
          <span>{meal.servings || 1} servings</span>
          <span className={`chevron ${open ? 'up' : 'down'}`} />
        </div>
      </button>
      {(onEdit || onDelete) && (
        <div className="card-actions">
          {onEdit && (
            <button type="button" className="ghost small" onClick={onEdit}>
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" className="ghost small danger" onClick={onDelete}>
              Remove
            </button>
          )}
        </div>
      )}
      {open && (
        <div className="meal-details">
          {meal.notes && <p className="notes">{meal.notes}</p>}
          <div className="ingredients-block">
            {meal.ingredients?.map((item) => (
              <div key={`${meal.id}-${item.id}`} className="ingredient">
                <span>{item.name}</span>
                <span className="muted">{formatQuantity(item.MealIngredient)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MealCard;
