export async function searchChannels(query: string) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      console.error('Failed to fetch search results:', res.statusText);
      return [];
    }
    const data = await res.json();
    // If data is an object with channels array, return that
    if (data && data.channels && Array.isArray(data.channels)) {
      return data.channels;
    }
    // If data is already an array, return it
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err) {
    console.error('Error in searchChannels:', err);
    return [];
  }
}

export async function getChannelDetails(query: string) {
  try {
    const res = await fetch(`/api/channel?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      console.error('Failed to fetch channel details:', res.statusText);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('Error in getChannelDetails:', err);
    return null;
  }
}
