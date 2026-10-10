// Not a secret: it only signs cookies of the throwaway server the tests start.
export const E2E_AUTH_SECRET = "e2e-only-secret-e2e-only-secret-e2e-only";

// Not a secret either: 32 zero bytes, encrypting the made-up API keys the specs
// save on the throwaway database.
export const E2E_AI_KEY_ENCRYPTION_KEY =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export const E2E_USER = { email: "e2e@tarekah.test", name: "Penguji E2E" };

export const SCREENSHOT_USER = {
  email: "screenshots@tarekah.test",
  name: "Mamat Agustian",
};
