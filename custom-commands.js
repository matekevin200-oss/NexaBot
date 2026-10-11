const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { dbQuery, moduleEnabled } = require('./config');
const { COLORS } = require('./constants');
const { recordUsage } = require('./telemetry');

const cache = new Map();

function normalizeCommandName(value) {
  const name = String(value || '').trim().toLowerCase().replace(/^!+/, '');
  return /^[a-z0-9_-]{1,32}$/.test(name) ? name : null;
}

async function guildCommands(guildId, refresh = false) {
  if (!refresh && cache.has(guildId)) return cache.get(guildId);
  const result = await dbQuery('SELECT id, name, response_type, response FROM nexabot_custom_commands WHERE guild_id = $1 ORDER BY name', [guildId]).catch(() => null);
  const rows = result?.rows || [];
  cache.set(guildId, rows);
  return rows;
}

async function saveCustomCommand(guildId, actorId, input) {
  const name = normalizeCommandName(input.name);
  if (!name) throw new Error('A parancs neve 1–32 karakteres, ékezet nélküli betű, szám, _ vagy - lehet.');
  const type = ['text', 'embed', 'button'].includes(input.type) ? input.type : 'text';
  const content = String(input.content || '').trim().slice(0, 1900);
  if (!content) throw new Error('A válasz nem lehet üres.');
  const buttonUrl = String(input.buttonUrl || '').trim().slice(0, 500);
  if (type === 'button' && !/^https:\/\//i.test(buttonUrl)) throw new Error('A gombhoz teljes HTTPS-hivatkozás szükséges.');
  const response = {
    content,
    title: String(input.title || '').trim().slice(0, 200),
    buttonLabel: String(input.buttonLabel || 'Megnyitás').trim().slice(0, 80),
    buttonUrl
  };
  const result = await dbQuery(
    `INSERT INTO nexabot_custom_commands (guild_id, name, response_type, response, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (guild_id, name) DO UPDATE SET response_type = EXCLUDED.response_type, response = EXCLUDED.response, created_by = EXCLUDED.created_by
     RETURNING id, name, response_type, response`,
    [guildId, name, type, JSON.stringify(response), actorId]
  );
  if (!result) throw new Error('A Custom Commands használatához működő PostgreSQL adatbázis szükséges.');
  await guildCommands(guildId, true);
  return result.rows[0];
}

async function deleteCustomCommand(guildId, name) {
  const normalized = normalizeCommandName(name);
  if (!normalized) return false;
  await dbQuery('DELETE FROM nexabot_custom_commands WHERE guild_id = $1 AND name = $2', [guildId, normalized]);
  await guildCommands(guildId, true);
  return true;
}

async function handleCustomCommand(message) {
  if (!message.guild || message.author.bot || !moduleEnabled(message.guild.id, 'customCommands')) return;
  if (!message.content.startsWith('!')) return;
  const name = normalizeCommandName(message.content.slice(1).split(/\s+/)[0]);
  if (!name) return;
  const commands = await guildCommands(message.guild.id);
  const command = commands.find((item) => item.name === name);
  if (!command) return;
  const response = command.response || {};
  if (command.response_type === 'embed') {
    await message.channel.send({
      embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle(response.title || `!${command.name}`).setDescription(String(response.content).slice(0, 4096))],
      allowedMentions: { parse: [] }
    });
  } else if (command.response_type === 'button') {
    await message.channel.send({
      content: String(response.content).slice(0, 2000),
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(response.buttonLabel || 'Megnyitás').setURL(response.buttonUrl).setStyle(ButtonStyle.Link))],
      allowedMentions: { parse: [] }
    });
  } else {
    await message.channel.send({ content: String(response.content).slice(0, 2000), allowedMentions: { parse: [] } });
  }
  await recordUsage('custom_command', { guildId: message.guild.id, userId: message.author.id, name });
}

module.exports = { normalizeCommandName, guildCommands, saveCustomCommand, deleteCustomCommand, handleCustomCommand };
