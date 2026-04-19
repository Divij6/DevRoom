import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'devroom_token';

const apiClient = axios.create({
  baseURL: 'http://localhost:5002/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const roomsClient = axios.create({
  baseURL: 'http://localhost:5002',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);
export const setStoredToken = (token) => localStorage.setItem(TOKEN_STORAGE_KEY, token);
export const clearStoredToken = () => localStorage.removeItem(TOKEN_STORAGE_KEY);

[apiClient, roomsClient].forEach((client) => {
  client.interceptors.request.use((config) => {
    const token = getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });
});

export const register = (data) => apiClient.post('/register', data);
export const login = (data) => apiClient.post('/login', data);
export const getMe = () => apiClient.get('/me');
export const logout = () => apiClient.post('/logout');

export const createRoom = (data) => roomsClient.post('/rooms', data);
export const getRooms = () => roomsClient.get('/rooms');
export const getRoom = (roomId) => roomsClient.get(`/rooms/${roomId}`);
export const updateRoom = (roomId, data) => roomsClient.put(`/rooms/${roomId}`, data);
export const deleteRoom = (roomId) => roomsClient.delete(`/rooms/${roomId}`);
export const validateRoom = (roomId) => roomsClient.get(`/rooms/${roomId}/validate`);

export const inviteMember = (roomId, data) => roomsClient.post(`/rooms/${roomId}/members`, data);
export const getMembers = (roomId) => roomsClient.get(`/rooms/${roomId}/members`);
export const updateMemberRole = (roomId, memberId, data) =>
  roomsClient.patch(`/rooms/${roomId}/members/${memberId}`, data);
export const removeMember = (roomId, memberId) =>
  roomsClient.delete(`/rooms/${roomId}/members/${memberId}`);

export const getCanvas = (roomId) => apiClient.get(`/canvas/${roomId}`);
export const saveCanvas = (data) => apiClient.post('/canvas/save', data);
export const loadCanvas = (data) => apiClient.post('/canvas/load', data);

export const createNode = (data) => apiClient.post('/nodes', data);
export const getNodes = (roomId) => apiClient.get(`/nodes/${roomId}`);
export const updateNode = (nodeId, data) => apiClient.put(`/nodes/${nodeId}`, data);
export const deleteNode = (nodeId) => apiClient.delete(`/nodes/${nodeId}`);

export const createEdge = (data) => apiClient.post('/edges', data);
export const deleteEdge = (edgeId) => apiClient.delete(`/edges/${edgeId}`);

export const createNote = (data) => apiClient.post('/notes', data);
export const updateNote = (noteId, data) => apiClient.put(`/notes/${noteId}`, data);
export const deleteNote = (noteId) => apiClient.delete(`/notes/${noteId}`);

export const uploadFile = (data) => apiClient.post('/files/upload', data);
export const getFiles = (roomId, search = '') =>
  apiClient
    .get(`/files/room/${roomId}${search ? `?search=${search}` : ''}`)
    .then((res) => ({ ...res, data: res.data?.files || [] }));
export const createFileVersion = (fileId, data) => apiClient.post(`/files/${fileId}/version`, data);
export const getFileVersions = (fileId) =>
  apiClient.get(`/files/${fileId}/versions`).then((res) => ({ ...res, data: res.data?.versions || [] }));
export const getFileLink = (fileId) => apiClient.get(`/files/link/${fileId}`);
export const getFileContent = (fileId) => apiClient.get(`/files/${fileId}`);
export const downloadFile = (fileId) => apiClient.get(`/files/download/${fileId}`);
export const deleteFile = (fileId) => apiClient.delete(`/files/${fileId}`);
export const updateFileContent = (fileId, data) => apiClient.post(`/files/${fileId}/version`, data);

export const linkFileToNode = (data) => apiClient.post('/files/link', data);
export const getNodeFiles = (nodeId) => apiClient.get(`/files/node/${nodeId}`);
export const unlinkFile = (data) => apiClient.delete('/files/unlink', { data });

export const getHistory = (roomId) => apiClient.get(`/history/${roomId}`);
