import "dotenv/config";
import { Effect } from "effect";
import { get_videos_not_sent } from "./main";
// import { clear_redis_db, create_redis_client } from "./redis";

const main = Effect.gen(function* () {
  console.log("STARTED");
  while (true) {
    console.log("SENDING...");
    // const redis_client = yield* create_redis_client;
    // yield* clear_redis_db(redis_client);
    yield* get_videos_not_sent;
    yield* Effect.promise(
      () => new Promise((resolve) => setTimeout(resolve, 600000))
    );
  }
});

Effect.runPromise(main).catch(console.error);
