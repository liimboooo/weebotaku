import api from './api';

export async function createRoom(data) {
  const res = await api.post('/rooms', data);
  return res.data;
}

export async function getRooms() {
  const res = await api.get('/rooms', { auth: false });
  return res.data;
}

export async function getRoomById(id) {
  const res = await api.get(`/rooms/${id}`, { auth: false });
  return res.data;
}

export async function getRoomToken(id) {
  const res = await api.post(`/rooms/${id}/token`);
  return res.data;
}

export async function endRoom(id) {
  const res = await api.put(`/rooms/${id}/end`);
  return res.data;
}

export async function updateParticipantCount(id, count) {
  const res = await api.put(`/rooms/${id}/participants`, { count }, { auth: false });
  return res.data;
}
