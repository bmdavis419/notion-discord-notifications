import { Config, Context, Data, Effect, Layer, Schema } from "effect";
import { Client as NotionClient } from "@notionhq/client";

export class NotionError extends Data.TaggedError("NotionError")<{
  cause?: unknown;
  message?: string;
}> {}

interface NotionImpl {
  use: <T>(
    fn: (client: NotionClient) => T
  ) => Effect.Effect<Awaited<T>, NotionError, never>;
}
export class Notion extends Context.Tag("Notion")<Notion, NotionImpl>() {}

type ConstructorArgs<T extends new (...args: any) => any> = T extends new (
  ...args: infer A
) => infer _R
  ? A
  : never;

export const make = (options?: ConstructorArgs<typeof NotionClient>[0]) =>
  Effect.gen(function* () {
    const client = yield* Effect.try({
      try: () => new NotionClient(options),
      catch: (e) => new NotionError({ cause: e }),
    });
    return Notion.of({
      use: (fn) =>
        Effect.gen(function* () {
          const result = yield* Effect.try({
            try: () => fn(client),
            catch: (e) =>
              new NotionError({
                cause: e,
                message: "Syncronous error in `Notion.use`",
              }),
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new NotionError({
                  cause: e,
                  message: "Asyncronous error in `Notion.use`",
                }),
            });
          } else {
            return result;
          }
        }),
    });
  });

export const layer = (options?: ConstructorArgs<typeof NotionClient>[0]) =>
  Layer.scoped(Notion, make(options));

export const fromEnv = Layer.scoped(
  Notion,
  Effect.gen(function* () {
    const auth = yield* Config.string("NOTION_API_KEY");
    return yield* make({ auth });
  })
);

const NotionVideoDatabaseResponse = Schema.Struct({
  results: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      properties: Schema.Struct({
        Title: Schema.Struct({
          title: Schema.Array(
            Schema.Struct({
              plain_text: Schema.String,
            })
          ),
        }),
      }),
    })
  ),
});

export const getPublished = (dbId: string) =>
  Effect.gen(function* () {
    const notion = yield* Notion;
    const cutOffDate = yield* Config.string("CUT_OFF_DATE");
    const rawResponse = yield* notion.use((client) =>
      client.databases.query({
        database_id: dbId,
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
                on_or_after: cutOffDate,
              },
            },
          ],
        },
      })
    );
    const parsedResponse = yield* Schema.decodeUnknown(
      NotionVideoDatabaseResponse
    )(rawResponse);
    return parsedResponse;
  }).pipe(Effect.withLogSpan("getPublished"));
