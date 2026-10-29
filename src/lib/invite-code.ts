import { randomInt } from "node:crypto";

// Sin símbolos ambiguos: no hay 0/O ni 1/I/L.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUP_LENGTH = 4;

// Código legible de 8 caracteres en dos grupos, p. ej. "ZP4M-8QDX".
export function generateInviteCode(): string {
  const chars = Array.from({ length: GROUP_LENGTH * 2 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return formatInviteCode(chars.join(""));
}

function formatInviteCode(compact: string): string {
  return `${compact.slice(0, GROUP_LENGTH)}-${compact.slice(GROUP_LENGTH)}`;
}

// Quita espacios y guiones y pasa a mayúsculas. Devuelve la forma guardada en la base,
// o null si no puede ser un código (largo distinto de 8).
export function normalizeInviteCode(input: string): string | null {
  const compact = input.replace(/[\s-]/g, "").toUpperCase();
  return compact.length === GROUP_LENGTH * 2 ? formatInviteCode(compact) : null;
}
