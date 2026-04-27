import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";

const ROOMS_FILE = process.env.ROOMS_FILE || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "rooms.json");

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
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), { mode: 0o600 });
}

function roomIdExists(roomId: string, rooms: Room[]): boolean {
  return rooms.some((r) => r.roomId === roomId);
}

export function createRoom(createdBy: string): string {
  const rooms = loadRooms();
  let roomId: string;
  let attempts = 0;
  do {
    roomId = nanoid(10);
    attempts++;
  } while (roomIdExists(roomId, rooms) && attempts < 10);

  if (roomIdExists(roomId, rooms)) {
    throw new Error("Failed to generate unique room ID");
  }

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
