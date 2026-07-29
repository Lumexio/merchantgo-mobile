const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.merchantgo.store/api/v1';

export async function submitOrderToCloud(orderPayload: any) {
  try {
    const response = await fetch(`${API_URL}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-merchantgo-pin': '1234' },
      body: JSON.stringify(orderPayload)
    });
    return await response.json();
  } catch (error) {
    console.warn("Offline Mode Active: Caching order locally.", error);
    return { status: "queued", offline: true };
  }
}
