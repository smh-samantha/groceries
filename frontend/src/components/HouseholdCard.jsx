import { useState } from 'react';

const formatQuantity = (value, unit) => {
  if (value === null || value === undefined || value === '') return 'as needed';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 'as needed';
  const formatted = Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(2));
  return unit === 'unit' ? `${formatted}` : `${formatted} ${unit}`;
};

const labelFromCategory = (category) => category.replace(/_/g, ' ');

const HouseholdCard = ({ group, onEdit, onDelete, onToggleInclude, open, onToggle }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const openState = isControlled ? open : internalOpen;
  const toggle = onToggle || (() => setInternalOpen((prev) => !prev));

  return (
    <div className={`card meal-card ${openState ? 'open' : ''}`}>
      <button type="button" className="meal-card-toggle" onClick={toggle}>
        <div>
          <p className="eyebrow">{labelFromCategory(group.category)}</p>
          <h3>{group.name}</h3>
        </div>
        <div className="meal-meta">
          <span>{group.items?.length || 0} items</span>
          <span className={`chevron ${openState ? 'up' : 'down'}`} />
        </div>
      </button>
      {(onEdit || onDelete || onToggleInclude) && (
        <div className="card-actions">
          {onToggleInclude && (
            <button type="button" className="ghost small" onClick={onToggleInclude}>
              {group.includeInGroceryList ? 'Skip this run' : 'Include in list'}
            </button>
          )}
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
      {openState && (
        <div className="meal-details">
          {group.notes && <p className="notes">{group.notes}</p>}
          <div className="ingredients-block">
            {group.items?.map((item) => (
              <div key={`${group.id}-${item.id}`} className="ingredient">
                <span>{item.name}</span>
                <span className="muted">
                  {formatQuantity(item.HouseholdGroupItem?.quantityValue, item.HouseholdGroupItem?.quantityUnit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseholdCard;
