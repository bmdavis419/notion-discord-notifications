import { Config, Context, Data, Effect, Layer } from "effect";
import {
  Client as DiscordClient,
  Events,
  IntentsBitField,
  Message,
} from "discord.js";

export class DiscordError extends Data.TaggedError("DiscordError")<{
  cause?: unknown;
  message?: string;
}> {}

interface DiscordImpl {
  use: <T>(
    fn: (client: DiscordClient) => T
  ) => Effect.Effect<Awaited<T>, DiscordError, never>;
}
export class Discord extends Context.Tag("Discord")<Discord, DiscordImpl>() {}

type ConstructorArgs<T extends new (...args: any) => any> = T extends new (
  ...args: infer A
) => infer _R
  ? A
  : never;

export const make = (options: ConstructorArgs<typeof DiscordClient>[0]) =>
  Effect.gen(function* () {
    const client = yield* Effect.try({
      try: () => new DiscordClient(options),
      catch: (e) => new DiscordError({ cause: e }),
    });
    return Discord.of({
      use: (fn) =>
        Effect.gen(function* () {
          const result = yield* Effect.try({
            try: () => fn(client),
            catch: (e) =>
              new DiscordError({
                cause: e,
                message: "Syncronous error in `Discord.use`",
              }),
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new DiscordError({
                  cause: e,
                  message: "Asyncronous error in `Discord.use`",
                }),
            });
          } else {
            return result;
          }
        }),
    });
  });

export const layer = (options: ConstructorArgs<typeof DiscordClient>[0]) =>
  Layer.scoped(Discord, make(options));

export const fromEnv = Layer.scoped(
  Discord,
  Effect.gen(function* () {
    const token = yield* Config.string("DISCORD_TOKEN");
    const client = yield* make({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
      ],
    });
    yield* client.use(
      (client) =>
        new Promise((resolve) => client.once(Events.ClientReady, resolve))
    );
    yield* client.use((client) => client.login(token));
    return client;
  })
);

export const sendMessage = (channelId: string, message: string) =>
  Effect.gen(function* () {
    const discord = yield* Discord;
    const channel = yield* discord.use((client) =>
      client.channels.fetch(channelId)
    );
    if (!channel) {
      return yield* new DiscordError({
        message: "Channel not found",
      });
    }

    if (!channel.isTextBased()) {
      return yield* new DiscordError({
        message: "Channel is not text based",
      });
    }
    if (!channel.isSendable()) {
      return yield* new DiscordError({
        message: "Channel is not sendable",
      });
    }
    yield* Effect.tryPromise({
      try: () => channel.send(message) as Promise<Message<true | false>>, // idk why this is needed tbh asked in effect discord
      catch: (e) =>
        new DiscordError({ cause: e, message: "Error sending message" }),
    });

    yield* Effect.logInfo(`Sent message to: ${channelId}`);
  }).pipe(Effect.withLogSpan("sendMessage"));
