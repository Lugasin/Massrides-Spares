const key = Deno.env.get("VESICASH_PRIVATE_KEY") || Deno.env.get("VESICASH_SECRET_KEY");
if (!key) {
  console.error("VESICASH_PRIVATE_KEY or VESICASH_SECRET_KEY is not set in the environment.");
  Deno.exit(1);
}
console.log("VESICASH_KEY_FOUND:");
console.log(key);
