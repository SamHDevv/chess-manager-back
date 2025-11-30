import { User } from "../entities/User";
import { Match } from "../entities/Match";

export type SanitizeUserOptions = {
  includeEmail?: boolean;
  includeRole?: boolean;
  includeOriginalName?: boolean; // for admin/audit
};

export function sanitizeUser(user: Partial<User>, opts: SanitizeUserOptions = {}) {
  if (!user) return null;

  // Build display name: if deleted, frontend can show `Usuario #id (Eliminado)`.
  const displayName = user.isDeleted
    ? `Usuario #${user.id} (Eliminado)`
    : user.name;

  const base: any = {
    id: user.id,
    name: displayName,
    isDeleted: !!user.isDeleted,
    deletedAt: user.deletedAt || null
  };

  if (opts.includeOriginalName) {
    base.originalName = user.originalName || null;
  }

  if (opts.includeEmail) {
    base.email = user.email || null;
  }

  if (opts.includeRole) {
    base.role = user.role || null;
  }

  return base;
}

export function sanitizeMatch(match: Match) {
  if (!match) return null;

  const sanitized: any = { ...match } as any;

  // Replace player objects with sanitized versions if present
  if ((match as any).whitePlayer) {
    sanitized.whitePlayer = sanitizeUser((match as any).whitePlayer as Partial<User>);
  }

  if ((match as any).blackPlayer) {
    sanitized.blackPlayer = sanitizeUser((match as any).blackPlayer as Partial<User>);
  }

  // Remove nested tournament heavy data if needed (keep id)
  if ((match as any).tournament) {
    sanitized.tournament = {
      id: (match as any).tournament.id,
      name: (match as any).tournament.name
    };
  }

  // Avoid returning raw password/email from user relations — already removed by sanitizeUser
  return sanitized;
}

export function sanitizeMatches(matches: Match[]) {
  return matches.map(sanitizeMatch);
}
