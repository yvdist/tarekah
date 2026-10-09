import { test as teardown } from "@playwright/test";
import { deleteUser } from "./db";
import { E2E_USER, SCREENSHOT_USER } from "./constants";

teardown("remove the test users", async () => {
  await deleteUser(E2E_USER.email);
  await deleteUser(SCREENSHOT_USER.email);
});
