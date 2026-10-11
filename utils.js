const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { NAMES, COLORS } = require('./constants');
const { getGuildConfig, configuredChannel, moduleEnabled } = require('./config');
const { STAFF_KEYS: CROWN_STAFF_KEYS } = require('./crown-city-content');

function byName(cache, name) {
  return cache.find((item) => item.name === name);
}

function safeChannelName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'uj-csatorna';
}

function isStaff(member) {
  const configuredRoleId = member?.guild?.id ? getGuildConfig(member.guild.id).roles.staff : null;
  const crown = member?.guild?.id ? getGuildConfig(member.guild.id).installations?.crownCity : null;
  return Boolean(
    member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
    (configuredRoleId && member?.roles?.cache?.has(configuredRoleId)) ||
    (crown?.completed && CROWN_STAFF_KEYS.some((key) => crown.roles[key] && member?.roles?.cache?.has(crown.roles[key]))) ||
    member?.roles?.cache?.some((role) => role.name === NAMES.staffRole || role.name.toLowerCase() === 'staff')
  );
}

function baseEmbed(title, description, color = COLORS.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'NexaBot • NexaDev' })
    .setTimestamp();
}

function getText(interaction, customId) {
  return interaction.fields.getTextInputValue(customId).trim();
}

async function sendLog(guild, embed) {
  if (!moduleEnabled(guild.id, 'moderation') && !moduleEnabled(guild.id, 'logging')) return;
  const channel = configuredChannel(guild, 'logs', NAMES.logsChannel);
  if (channel?.isTextBased()) {
    await channel.send({ embeds: [embed] }).catch(() => null);
  }
}

async function ephemeralError(interaction, message) {
  const payload = { content: `❌ ${message}`, flags: 64 };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload);
  return interaction.reply(payload);
}

module.exports = {
  byName,
  safeChannelName,
  isStaff,
  baseEmbed,
  getText,
  sendLog,
  ephemeralError
};
