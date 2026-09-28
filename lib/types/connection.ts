// Mirrors the backend's ProjectOption — one row on Settings' project pickers.
export interface ConnectionProject {
  ref: string;
  name: string;
  status: string;
  userCount: number | null;
}
