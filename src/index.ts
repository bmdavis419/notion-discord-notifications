import "dotenv/config";
import { Effect } from "effect";
import { get_videos_not_sent } from "./main";

const main = Effect.gen(function* () {
  console.log("STARTED");
  while (true) {
    console.log("SENDING...");
    yield* get_videos_not_sent;
    yield* Effect.promise(
      () => new Promise((resolve) => setTimeout(resolve, 600000))
    );
  }
});

Effect.runPromise(main).catch(console.error);
