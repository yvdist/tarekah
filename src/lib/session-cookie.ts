// Auth.js uses the __Secure- prefix when served over HTTPS.
export const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

// Its CSRF cookie takes the __Host- prefix instead.
export const CSRF_COOKIES = ["authjs.csrf-token", "__Host-authjs.csrf-token"];
