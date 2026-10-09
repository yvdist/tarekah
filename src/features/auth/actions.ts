"use server";

import { signIn, signOut } from "@/auth";
import { providerSchema } from "./schemas";

export async function signInWithProvider(provider: unknown) {
  const parsed = providerSchema.safeParse(provider);

  if (!parsed.success) {
    throw new Error("Unknown sign-in provider");
  }

  await signIn(parsed.data, { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
