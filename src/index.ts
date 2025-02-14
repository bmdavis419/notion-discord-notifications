import { NodeRuntime } from "@effect/platform-node";
import { main } from "./main.js";
import { Effect, Layer } from "effect";
import * as Redis from "./redis.js";
import * as Discord from "./discord.js";
import * as Notion from "./notion.js";

const AllServices = Layer.mergeAll(
  Redis.fromEnv,
  Discord.fromEnv,
  Notion.fromEnv
);

main.pipe(Effect.provide(AllServices), NodeRuntime.runMain);
