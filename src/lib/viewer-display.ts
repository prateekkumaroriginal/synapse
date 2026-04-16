/** Two-letter initials for avatar fallback. */
export function initialsFromViewer(
  email: string | null,
  name: string | null,
): string {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]?.charAt(0) ?? "";
      const b = parts[1]?.charAt(0) ?? "";
      return (a + b).toUpperCase() || "?";
    }
    return n.slice(0, 2).toUpperCase() || "?";
  }
  if (email) {
    const local = email.split("@")[0] ?? email;
    return local.slice(0, 2).toUpperCase() || "?";
  }
  return "?";
}
