import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';

const Friends = ({ user, meals, householdItems, onRefreshMeals, onRefreshHousehold }) => {
  const [friends, setFriends] = useState([]);
  const [shares, setShares] = useState({ incoming: [], outgoing: [] });
  const [searchFriend, setSearchFriend] = useState('');
  const [shareTarget, setShareTarget] = useState('');
  const [shareType, setShareType] = useState('meal');
  const [shareItemId, setShareItemId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const sortedMeals = useMemo(() => [...(meals || [])].sort((a, b) => a.name.localeCompare(b.name)), [meals]);
  const sortedGroups = useMemo(
    () => [...(householdItems || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [householdItems],
  );

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [friendRes, shareRes] = await Promise.all([
        apiClient.getFriends(user),
        apiClient.getShares(user),
      ]);
      setFriends(friendRes.friends || []);
      setShares(shareRes || { incoming: [], outgoing: [] });
    } catch (err) {
      setError(err.message || 'Unable to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAddFriend = async () => {
    if (!searchFriend.trim()) return;
    setError('');
    try {
      await apiClient.addFriend(user, searchFriend.trim());
      setSearchFriend('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to add friend');
    }
  };

  const handleSendShare = async () => {
    if (!shareTarget || !shareItemId) return;
    setError('');
    try {
      await apiClient.sendShare(user, {
        username: shareTarget,
        type: shareType,
        id: Number(shareItemId),
      });
      setShareItemId('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to send share');
    }
  };

  const handleAcceptShare = async (shareId) => {
    setError('');
    try {
      await apiClient.acceptShare(user, shareId);
      await loadData();
      await onRefreshMeals();
      await onRefreshHousehold();
    } catch (err) {
      setError(err.message || 'Unable to accept share');
    }
  };

  return (
    <section className="page">
      <div className="page-head-group">
        <header className="page-header column">
          <p className="eyebrow">Friends</p>
        </header>

        <div className="info-card guide-card">
          <button
            type="button"
            className="collapsible-header"
            onClick={() => setGuideOpen((prev) => !prev)}
            aria-expanded={guideOpen}
          >
            <span>Dashboard guide</span>
            <span className="collapsible-arrow">{guideOpen ? '▾' : '▸'}</span>
          </button>
          {guideOpen && (
            <div className="collapsible-body">
              <p className="lead">
                Connect via username, send meals or household groups to friends, and pull shared items
                into your own bank.
              </p>
              <ul>
                <li>Add friends by username (tokens today, accounts later).</li>
                <li>Share your meals or household groups with a friend.</li>
                <li>Accept incoming shares to copy them into your Meal or Household Bank.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <div className="loading">Loading friends…</div>}

      <div className="info-card">
        <h4>Add friend</h4>
        <div className="filters stretch">
          <input
            placeholder="Friend username"
            value={searchFriend}
            onChange={(e) => setSearchFriend(e.target.value)}
          />
          <button type="button" onClick={handleAddFriend}>
            Add friend
          </button>
        </div>
        <p className="muted small-label">Existing friends: {friends.map((f) => f.username).join(', ') || 'none yet'}</p>
      </div>

      <div className="card">
        <h4>Share something</h4>
        <div className="form-row">
          <label>
            Friend
            <select value={shareTarget} onChange={(e) => setShareTarget(e.target.value)}>
              <option value="">Select friend…</option>
              {friends.map((f) => (
                <option key={f.id} value={f.username}>
                  {f.username}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={shareType} onChange={(e) => {
              setShareType(e.target.value);
              setShareItemId('');
            }}>
              <option value="meal">Meal</option>
              <option value="household">Household group</option>
            </select>
          </label>
          <label>
            Item
            <select value={shareItemId} onChange={(e) => setShareItemId(e.target.value)}>
              <option value="">Select…</option>
              {(shareType === 'meal' ? sortedMeals : sortedGroups).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={handleSendShare} disabled={!shareTarget || !shareItemId}>
          Send share
        </button>
      </div>

      <div className="info-grid">
        <article className="info-card">
          <h4>Incoming shares</h4>
          {shares.incoming?.length === 0 && <p className="muted">Nothing shared yet.</p>}
          {shares.incoming?.map((share) => (
            <div key={share.id} className="share-row">
              <div>
                <p className="small-label">{share.type === 'meal' ? 'Meal' : 'Household group'}</p>
                <p className="share-title">
                  {share.meal?.name || share.householdGroup?.name || 'Unknown'}
                </p>
                <p className="muted small-label">From {share.from}</p>
              </div>
              <div className="share-actions">
                {share.status === 'pending' ? (
                  <button type="button" onClick={() => handleAcceptShare(share.id)}>
                    Add to my bank
                  </button>
                ) : (
                  <span className="muted small-label">Added</span>
                )}
              </div>
            </div>
          ))}
        </article>

        <article className="info-card">
          <h4>Sent shares</h4>
          {shares.outgoing?.length === 0 && <p className="muted">Nothing sent yet.</p>}
          {shares.outgoing?.map((share) => (
            <div key={share.id} className="share-row">
              <div>
                <p className="small-label">{share.type === 'meal' ? 'Meal' : 'Household group'}</p>
                <p className="share-title">
                  {share.meal?.name || share.householdGroup?.name || 'Unknown'}
                </p>
                <p className="muted small-label">To {share.to}</p>
              </div>
              <div className="share-actions">
                <span className="muted small-label">{share.status}</span>
              </div>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
};

export default Friends;
