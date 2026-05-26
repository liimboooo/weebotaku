import api from './api';

export async function createRoom(data) {
  return api.post('/rooms', data);
}

export async function getRooms() {
  return api.get('/rooms', { auth: false });
}

export async function getRoomById(id) {
  return api.get(`/rooms/${id}`, { auth: false });
}

export async function getRoomToken(id) {
  return api.post(`/rooms/${id}/token`);
}

export async function joinRoom(id) {
  return api.post(`/rooms/${id}/join`);
}

export async function leaveRoom(id) {
  return api.post(`/rooms/${id}/leave`);
}

export async function endRoom(id) {
  return api.put(`/rooms/${id}/end`);
}

export async function getFriendsActivity() {
  return api.get('/rooms/friends-activity');
}

export async function sendMessage(id, text) {
  return api.post(`/rooms/${id}/chat`, { text });
}

export async function getMessages(id, after) {
  const q = after ? `?after=${encodeURIComponent(after)}` : '';
  return api.get(`/rooms/${id}/chat${q}`);
}

export async function updateEpisode(id, episode, sourceUrl) {
  return api.put(`/rooms/${id}/episode`, { episode, sourceUrl });
}

