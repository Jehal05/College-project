// SMS fallback links. A browser can NOT send an SMS by itself: these links open the phone's messages app with the text
// ready, and the person must press send. The app can never know whether it was sent.
// The text holds no health data: no symptoms, no vitals, no history, no conditions. A map link is added only when
// location sharing is on and a position is known.
export const mapLink = (location) => 'https://maps.google.com/?q=' + Number(location.lat).toFixed(5) + ',' + Number(location.lng).toFixed(5);

export function buildMessage(text, location) {
  return location ? text + ' ' + mapLink(location) : text;
}

// iPhone and Android write the message body differently: sms:<number>&body=... on iOS, sms:<number>?body=... on Android.
export const platformOf = (userAgent) => (/iPhone|iPad|iPod/i.test(userAgent || '') ? 'ios' : 'android');

export function smsHref(phone, body, platform) {
  const number = String(phone).replace(/[^\d+]/g, ''); // "+91 00000 00001" -> "+910000000001"
  return 'sms:' + number + (platform === 'ios' ? '&' : '?') + 'body=' + encodeURIComponent(body);
}

// Primary contact first, then the others in their saved order.
export const primaryFirst = (contacts) => [...contacts].sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary));
