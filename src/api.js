async function handle(res) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  getTopics: () => fetch("/api/topics").then(handle),

  createTopic: (name, description) =>
    fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    }).then(handle),

  getTopic: (id) => fetch(`/api/topics/${id}`).then(handle),

  getItems: (topicId, { q = "", type = "all", tag = "" } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type && type !== "all") params.set("type", type);
    if (tag) params.set("tag", tag);
    return fetch(`/api/topics/${topicId}/items?${params}`).then(handle);
  },

  getItem: (id) => fetch(`/api/items/${id}`).then(handle),

  addItem: (topicId, formData) =>
    fetch(`/api/topics/${topicId}/items`, { method: "POST", body: formData }).then(handle),

  deleteItem: (id) => fetch(`/api/items/${id}`, { method: "DELETE" }).then(handle),
};
