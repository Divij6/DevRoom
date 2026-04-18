import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createRoom as apiCreateRoom, getRooms as apiGetRooms } from '../services/api';
import { useAuth } from './AuthContext';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('canvas');

  const normalizeRooms = useCallback((payload) => {
    if (Array.isArray(payload?.rooms)) {
      return payload.rooms;
    }

    return [];
  }, []);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);

    try {
      const res = await apiGetRooms();
      const nextRooms = normalizeRooms(res.data);

      setRooms(nextRooms);
      setActiveRoom((currentRoom) => {
        if (nextRooms.length === 0) {
          return null;
        }

        // Do not auto-select the first room on load. Keep the current
        // active room if present, otherwise leave null so the landing
        // screen is shown after login.
        if (!currentRoom) {
          return null;
        }

        const matchedRoom = nextRooms.find((room) => room._id === currentRoom._id);
        return matchedRoom || currentRoom;
      });
    } catch (error) {
      setRooms([]);
      setActiveRoom(null);
      throw error;
    } finally {
      setRoomsLoading(false);
    }
  }, [normalizeRooms]);

  const { user } = useAuth();

  useEffect(() => {
    // Only load rooms after a user is authenticated. Prevents
    // automatic room selection when the app starts and no user
    // has explicitly signed in.
    if (!user) {
      setRooms([]);
      setActiveRoom(null);
      return;
    }

    loadRooms().catch(() => {});
  }, [loadRooms, user]);

  const openRoom = useCallback((room) => {
    setActiveRoom(room || null);
    setActiveTab('canvas');
  }, []);

  const createRoom = useCallback(async (roomData) => {
    const res = await apiCreateRoom(roomData);
    const room = res.data?.room ?? null;

    await loadRooms();

    if (room) {
      setActiveRoom(room);
      setActiveTab('canvas');
    }

    return room;
  }, [loadRooms]);

  const closeRoom = useCallback(() => setActiveRoom(null), []);

  return (
    <RoomContext.Provider
      value={{
        rooms,
        roomsLoading,
        activeRoom,
        activeTab,
        setActiveTab,
        openRoom,
        closeRoom,
        loadRooms,
        createRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export const useRoom = () => useContext(RoomContext);
