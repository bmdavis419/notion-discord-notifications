import type { Client } from "@notionhq/client";
import { Client as NotionClient } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { Effect } from "effect";
import { get_env_variable } from "./env";

export const create_notion_client = Effect.gen(function* () {
  const api_key = Effect.runSync(get_env_variable("NOTION_API_KEY"));

  return new NotionClient({
    auth: api_key,
  });
});

// TODO: error handling
export function get_notion_published(
  client: Client,
  db_id: string
): Effect.Effect<QueryDatabaseResponse> {
  const cut_off_date = Effect.runSync(get_env_variable("CUT_OFF_DATE"));

  return Effect.promise(async () => {
    return client.databases.query({
      database_id: db_id,
      filter: {
        and: [
          {
            property: "Status",
            status: {
              equals: "Published",
            },
          },
          {
            property: "Release Date",
            date: {
              on_or_after: cut_off_date,
            },
          },
        ],
      },
    });
  });
}
