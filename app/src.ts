export type Loan = {
  id: string;
  friendName: string;
  amount: number;
  dueDate: string;
  createdAt: string;
  repaidAt: string | null;
  isOverdue: boolean;
  status: 'pending' | 'overdue' | 'repaid';
};
export type Summary = {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
  outstandingAmount: number;
  currency: 'INR';
};

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000').replace(/\/$/, '');
export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let result: any;
  try { result = await response.json(); } catch { result = {}; }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result as T;
}
export const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: value % 1 ? 2 : 0 })}`;
export const displayDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
