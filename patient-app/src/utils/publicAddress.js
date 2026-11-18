// A phone cannot open localhost, so a QR that points there will not scan on another device.
export const isLocalAddress = (url) => {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || h.endsWith('.localhost');
  } catch { return true; }
};
