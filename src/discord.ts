import type { Client } from "discord.js";
import { Client as DiscordClient, Events, IntentsBitField } from "discord.js";
import { Effect } from "effect";
import { get_env_variable } from "./env";

export const create_discord_client = Effect.promise<Client<true>>(() => {
  const client = new DiscordClient({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
    ],
  });

  const discord_token = Effect.runSync(get_env_variable("DISCORD_TOKEN"));

  return new Promise((resolve) => {
    client.once(Events.ClientReady, () => resolve(client as Client<true>));
    client.login(discord_token);
  });
});

// TODO: error handling is just wrong here lol
export const send_discord_message = (
  client: Client<true>,
  channel_id: string,
  message: string
): Effect.Effect<string, Error, never> => {
  return Effect.promise(async () => {
    const channel = await client.channels.fetch(channel_id);
    if (!channel?.isTextBased()) throw new Error("channel is not text based");

    if (channel.isSendable()) {
      await channel.send(message);
    } else {
      throw new Error("channel is not sendable");
    }

    return `Sent message to: ${channel_id}`;
  });
};
