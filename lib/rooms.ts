import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";

const ROOMS_FILE = "/tmp/rooms.json";

export type Room = {
  roomId: string;
  createdBy: string;
  createdAt: number;
};

function loadRooms(): Room[] {
  try {
    const data = fs.readFileSync(ROOMS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveRooms(rooms: Room[]) {
  fs.mkdirSync(path.dirname(ROOMS_FILE), { recursive: true });
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2));
}

export function createRoom(createdBy: string): string {
  const roomId = nanoid(10);
  const rooms = loadRooms();
  rooms.push({ roomId, createdBy, createdAt: Date.now() });
  saveRooms(rooms);
  return roomId;
}

export function getRoom(roomId: string): Room | undefined {
  const rooms = loadRooms();
  return rooms.find((r) => r.roomId === roomId);
}

export function ensureRoom(roomId: string, createdBy: string): Room {
  const existing = getRoom(roomId);
  if (existing) return existing;

  const rooms = loadRooms();
  const room = { roomId, createdBy, createdAt: Date.now() };
  rooms.push(room);
  saveRooms(rooms);
  return room;
}
