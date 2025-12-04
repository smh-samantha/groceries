import { useEffect, useState } from 'react';
import placeholderImage from '../assets/meal-placeholder.svg';

const formatQuantity = (mealIngredient) => {
  if (!mealIngredient) return '';
  const { quantityValue, quantityUnit } = mealIngredient;
  if (quantityUnit === 'with_love') return 'with love';
  if (quantityValue === null || quantityValue === undefined) {
    return quantityUnit === 'unit' ? 'as needed' : `as needed ${quantityUnit}`;
  }

  const formatted = Number.isInteger(quantityValue)
    ? Number(quantityValue)
    : Number(quantityValue.toFixed(2));

  return quantityUnit === 'unit' ? `${formatted}` : `${formatted} ${quantityUnit}`;
};

const MealCard = ({ meal, onEdit, onDelete, open, onToggle, onUpdateAttachments }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const openState = isControlled ? open : internalOpen;
  const toggle = onToggle || (() => setInternalOpen((prev) => !prev));
  const photo = meal.imageUrl || placeholderImage;
  const preferenceLabel = Array.isArray(meal.preference)
    ? meal.preference.join(', ')
    : meal.preference;
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [previewFull, setPreviewFull] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState(
    Array.isArray(meal.recipeAttachment)
      ? meal.recipeAttachment
      : meal.recipeAttachment
        ? [meal.recipeAttachment]
        : [],
  );
  const [attError, setAttError] = useState('');
  const [attSaving, setAttSaving] = useState(false);

  useEffect(() => {
    setPendingAttachments(
      Array.isArray(meal.recipeAttachment)
        ? meal.recipeAttachment
        : meal.recipeAttachment
          ? [meal.recipeAttachment]
          : [],
    );
  }, [meal.id, meal.recipeAttachment]);

  const handleAddAttachments = async (event) => {
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
    setPendingAttachments((prev) => [...prev, ...results.filter(Boolean)]);
  };

  const handleRemoveAttachment = (index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAttachments = async () => {
    if (!onUpdateAttachments) {
      setAttachmentsOpen(false);
      return;
    }
    setAttError('');
    setAttSaving(true);
    try {
      await onUpdateAttachments(pendingAttachments);
      setAttachmentsOpen(false);
    } catch (err) {
      setAttError(err.message || 'Unable to update attachments');
    } finally {
      setAttSaving(false);
    }
  };

  const attachmentData = (value) => (value && value.data ? value.data : value);

  const attachmentType = (value) => {
    const data = attachmentData(value) || '';
    if (!data) return 'other';
    if (typeof data === 'string' && data.startsWith('data:image')) return 'image';
    if (typeof data === 'string' && data.startsWith('data:application/pdf')) return 'pdf';
    return 'other';
  };

  return (
    <div className={`card meal-card ${openState ? 'open' : ''}`}>
      <div className="meal-image">
        <img src={photo} alt={meal.name} />
      </div>
      <button type="button" className="meal-card-toggle" onClick={toggle}>
        <div>
          <p className="eyebrow">{preferenceLabel || '\u00A0'}</p>
          <h3>{meal.name}</h3>
        </div>
        <div className="meal-meta">
          <span>{meal.servings || 1} servings</span>
          <span className={`chevron ${openState ? 'up' : 'down'}`} />
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
      {openState && (
        <div className="meal-details">
          {meal.notes && <p className="notes">{meal.notes}</p>}
          {(meal.recipeLink || pendingAttachments.length > 0 || onUpdateAttachments) && (
            <div className="resource-links">
              {meal.recipeLink && (
                <a href={meal.recipeLink} target="_blank" rel="noreferrer">
                  Recipe link
                </a>
              )}
              <button
                type="button"
                className="ghost small"
                onClick={() => setAttachmentsOpen(true)}
              >
                Manage files ({pendingAttachments.length})
              </button>
            </div>
          )}
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

      {attachmentsOpen && (
        <div className="modal-backdrop" onClick={() => setAttachmentsOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="modal-header">
              <h4>Recipe files</h4>
              <button className="ghost small" type="button" onClick={() => setAttachmentsOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              {pendingAttachments.length === 0 && <p className="muted">No files uploaded yet.</p>}
              {pendingAttachments.length > 0 && (
                <ul className="attachment-list">
                  {pendingAttachments.map((file, index) => (
                    <li key={`${meal.id}-att-${index}`}>
                      <div className="attachment-row">
                        <input
                          value={file.name}
                          onChange={(e) =>
                            setPendingAttachments((prev) =>
                              prev.map((att, i) =>
                                i === index ? { ...att, name: e.target.value } : att,
                              ),
                            )
                          }
                          placeholder={`Attachment ${index + 1}`}
                        />
                        <div className="attachment-actions">
                          <button
                            type="button"
                            className="ghost small"
                            onClick={() => {
                              setPreviewFull(false);
                              setAttachmentPreview(file);
                            }}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="ghost small"
                            onClick={() => {
                              setPreviewFull(true);
                              setAttachmentPreview(file);
                            }}
                          >
                            Full screen
                          </button>
                          <button
                            type="button"
                            className="ghost small danger"
                            onClick={() => handleRemoveAttachment(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <label className="upload-card wide">
                <div className="dropzone">
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif,image/*,application/pdf"
                    onChange={handleAddAttachments}
                  />
                </div>
                <p className="muted small-label">Add images or PDFs to this meal</p>
              </label>
              {attError && <p className="error">{attError}</p>}
            </div>
            <div className="modal-footer">
              <button className="ghost" type="button" onClick={() => setAttachmentsOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveAttachments} disabled={attSaving}>
                {attSaving ? 'Saving...' : 'Save files'}
              </button>
            </div>
          </div>
          {attachmentPreview && (
            <div
              className={`modal-card preview-card ${previewFull ? 'fullscreen' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h4>Preview</h4>
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => {
                    setAttachmentPreview('');
                    setPreviewFull(false);
                  }}
                >
                  Close
                </button>
              </div>
              <div className={`modal-body ${previewFull ? 'fill' : ''}`}>
                {attachmentType(attachmentPreview) === 'image' && (
                  <img
                    src={attachmentData(attachmentPreview)}
                    alt="Attachment preview"
                    className="preview-image"
                  />
                )}
                {attachmentType(attachmentPreview) === 'pdf' && (
                  <iframe
                    title="Attachment preview"
                    src={attachmentData(attachmentPreview)}
                    className="preview-frame"
                  />
                )}
                {attachmentType(attachmentPreview) === 'other' && (
                  <a href={attachmentData(attachmentPreview)} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MealCard;
