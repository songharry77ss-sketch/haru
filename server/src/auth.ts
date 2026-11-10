import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { one } from "./db.js";

export interface User {
  id: string;
  nickname: string;
  age_group: string;
  character: string;
  pet_name: string;
  coins: number;
  gems: number;
  daily_limit_min: number;
  recovery_code: string;
  guardian_code: string;
  created_at: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const newToken = () => crypto.randomBytes(32).toString("base64url");

// Unambiguous alphabet (no 0/O/1/I) so kids can read codes aloud to a parent.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function code(groups: number, size = 4): string {
  const bytes = crypto.randomBytes(groups * size);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  const out: string[] = [];
  for (let g = 0; g < groups; g++) out.push(chars.slice(g * size, g * size + size).join(""));
  return out.join("-");
}

const USER_COLUMNS = `id, nickname, age_group, character, pet_name, coins, gems, daily_limit_min,
          recovery_code, guardian_code, created_at`;

export const userById = (id: string) => one<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const user = await one<User>(`SELECT ${USER_COLUMNS} FROM users WHERE token_hash = ?`, [sha256(token)]);
    if (!user) return res.status(401).json({ error: "unauthorized" });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
