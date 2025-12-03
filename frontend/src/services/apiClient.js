const API_BASE = import.meta.env.VITE_API_URL;

const buildUrl = (path, params) => {
  let url = `${API_BASE}${path}`;
  if (params) {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  return url;
};

const request = async (path, { method = 'GET', body, params, headers } = {}, user) => {
  const url = buildUrl(path, params);
  const config = {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  if (user?.username) {
    config.headers['x-user'] = user.username;
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const apiClient = {
  login: (username) => request('/auth/login', { method: 'POST', body: { username } }),
  getMeals: (user, params) => request('/meals', { params }, user),
  createMeal: (user, body) => request('/meals', { method: 'POST', body }, user),
  updateMeal: (user, id, body) => request(`/meals/${id}`, { method: 'PUT', body }, user),
  deleteMeal: (user, id) => request(`/meals/${id}`, { method: 'DELETE' }, user),
  getHouseholdItems: (user, params) => request('/household-groups', { params }, user),
  createHouseholdItem: (user, body) =>
    request('/household-groups', { method: 'POST', body }, user),
  updateHouseholdItem: (user, id, body) =>
    request(`/household-groups/${id}`, { method: 'PUT', body }, user),
  deleteHouseholdItem: (user, id) =>
    request(`/household-groups/${id}`, { method: 'DELETE' }, user),
  getRotation: (user) => request('/rotation', {}, user),
  updateRotationConfig: (user, body) => request('/rotation/config', { method: 'PUT', body }, user),
  addRotationEntry: (user, body) => request('/rotation/entries', { method: 'POST', body }, user),
  deleteRotationEntry: (user, id) =>
    request(`/rotation/entries/${id}`, { method: 'DELETE' }, user),
  updateRotationEntryServings: (user, id, servings) =>
    request(
      `/rotation/entries/${id}/servings`,
      { method: 'PATCH', body: { servings } },
      user,
    ),
  getGroceryList: (user, params) => request('/grocery-list', { params }, user),
};
