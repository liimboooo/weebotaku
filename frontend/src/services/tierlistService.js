import api from './api';

export async function saveTierList(data) {
  const res = await api.post('/tierlists', data);
  return res.data;
}

export async function updateTierList(id, data) {
  const res = await api.put(`/tierlists/${id}`, data);
  return res.data;
}

export async function getUserTierLists(userId) {
  const res = await api.get(`/tierlists/user/${userId}`);
  return res.data;
}

export async function getUserTierListsByUsername(username) {
  const res = await api.get(`/tierlists/by-username/${username}`, { auth: false });
  return res.data;
}

export async function getCommunityTierLists(page = 1) {
  const res = await api.get(`/tierlists/community?page=${page}`, { auth: false });
  return res.data;
}

export async function getTierListById(id) {
  const res = await api.get(`/tierlists/${id}`, { auth: false });
  return res.data;
}

export async function deleteTierList(id) {
  const res = await api.delete(`/tierlists/${id}`);
  return res.data;
}
