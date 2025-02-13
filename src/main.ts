import { Config, Effect, Predicate } from "effect";
import * as Notion from "./notion.js";
import * as Redis from "./redis.js";
import * as Discord from "./discord.js";

export const main = Effect.gen(function* () {
  const notionDbId = yield* Config.string("NOTION_DATABASE_ID");
  const discordChannelId = yield* Config.string("DISCORD_CHANNEL_ID");

  const notionVideos = yield* Notion.getPublished(notionDbId);
  const redisVideos = yield* Redis.getPublishedSavedVideos;

  for (const video of notionVideos.results) {
    const id = video.id;
    const title = video.properties.Title.title[0].plain_text;

    if (Predicate.hasProperty(redisVideos, id)) {
      yield* Effect.logInfo(`Video ${id} already in DB`);
    } else {
      yield* Effect.logInfo(`Video ${id} not in DB`);
      yield* Redis.saveVideo(id, { title });
      yield* Discord.sendMessage(
        discordChannelId,
        `VIDEO WAS JUST PUBLISHED: ${title}`
      );
    }
  }
}).pipe(Effect.withLogSpan("main"));
