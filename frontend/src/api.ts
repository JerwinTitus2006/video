// Minimal REST helpers (real-time communication uses Socket.IO)
const API = '';

export async function createRoom(): Promise<{ roomId: string }> {
  const res = await fetch(`${API}/api/rooms`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json();
}

export async function checkHealth(): Promise<{ status: string; rooms: number }> {
  const res = await fetch(`${API}/api/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

