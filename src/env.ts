import { Effect } from "effect";

type ALLOWED_ENV_NAMES =
  | "DISCORD_TOKEN"
  | "DISCORD_CHANNEL_ID"
  | "NOTION_API_KEY"
  | "NOTION_DATABASE_ID"
  | "CUT_OFF_DATE"
  | "REDIS_URL";

export function get_env_variable(
  key: ALLOWED_ENV_NAMES
): Effect.Effect<string, Error> {
  const val = process.env[key];

  if (!val) {
    return Effect.fail(new Error(`${key} env var is not set :/`));
  }

  return Effect.succeed(val);
}
