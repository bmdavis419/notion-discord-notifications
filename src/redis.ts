import { Config, Context, Data, Effect, Layer, Schema } from "effect";
import { createClient } from "redis";

export class RedisError extends Data.TaggedError("RedisError")<{
  cause?: unknown;
  message?: string;
}> {}

interface RedisImpl {
  use: <T>(
    fn: (client: ReturnType<typeof createClient>) => T
  ) => Effect.Effect<Awaited<T>, RedisError, never>;
}
export class Redis extends Context.Tag("Redis")<Redis, RedisImpl>() {}

export const make = (options?: Parameters<typeof createClient>[0]) =>
  Effect.gen(function* () {
    const client = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => createClient(options).connect(),
        catch: (e) => new RedisError({ cause: e, message: "Error connecting" }),
      }),
      (client) => Effect.promise(() => client.quit())
    );
    return Redis.of({
      use: (fn) =>
        Effect.gen(function* () {
          const result = yield* Effect.try({
            try: () => fn(client),
            catch: (e) =>
              new RedisError({
                cause: e,
                message: "Syncronous error in `Redis.use`",
              }),
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new RedisError({
                  cause: e,
                  message: "Asyncronous error in `Redis.use`",
                }),
            });
          } else {
            return result;
          }
        }),
    });
  });

export const layer = (options?: Parameters<typeof createClient>[0]) =>
  Layer.scoped(Redis, make(options));

export const fromEnv = Layer.scoped(
  Redis,
  Effect.gen(function* () {
    const url = yield* Config.string("REDIS_URL");
    return yield* make({ url });
  })
);

const VideoData = Schema.parseJson(
  Schema.Struct({
    title: Schema.String,
  })
);
type VideoData = Schema.Schema.Type<typeof VideoData>;

export const saveVideo = (id: string, data: VideoData) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const encodedData = yield* Schema.encode(VideoData)(data);
    yield* redis.use((client) => client.hSet("videos", id, encodedData));
    yield* Effect.logInfo(`Saved to redis: ${id}`);
  }).pipe(Effect.withLogSpan("saveVideo"), Effect.annotateLogs("foo", "bar"));

export const getPublishedSavedVideos = Effect.gen(function* () {
  const redis = yield* Redis;
  const rawVideos = yield* redis.use((client) => client.hGetAll("videos"));
  const parsedVideos = yield* Schema.decode(
    Schema.Record({
      key: Schema.String,
      value: VideoData,
    })
  )(rawVideos);

  for (const [id, data] of Object.entries(parsedVideos)) {
    yield* Effect.logInfo(`Recieved: Video ID: ${id}, Data: ${data.title}`);
  }

  return parsedVideos;
}).pipe(Effect.withLogSpan("getPublishedSavedVideos"));

export const clearRedisDb = Effect.gen(function* () {
  const redis = yield* Redis;
  yield* redis.use((client) => client.flushAll());
  yield* Effect.logInfo("Redis database cleared");
}).pipe(Effect.withLogSpan("clearRedisDb"));
