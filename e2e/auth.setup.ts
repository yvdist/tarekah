import { test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";
import { createSession, createUser, migrateDatabase, authCookies } from "./db";
import { E2E_USER } from "./constants";

setup("prepare the database and sign in", async ({ browser, baseURL }) => {
  if (!baseURL) {
    throw new Error("baseURL is not configured");
  }

  await migrateDatabase();
  await createUser(E2E_USER.email, E2E_USER.name);

  const context = await browser.newContext();

  await context.addCookies(
    authCookies(await createSession(E2E_USER.email), baseURL),
  );
  await context.storageState({ path: STORAGE_STATE });
  await context.close();
});
