const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { NAMES, COLORS } = require('./constants');
const { getGuildConfig, configuredChannel, moduleEnabled } = require('./config');

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
  return Boolean(
    (member && member.id===member.guild?.ownerId) || member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
    (configuredRoleId && member?.roles?.cache?.has(configuredRoleId))
  );
}

function baseEmbed(title, description, color = COLORS.primary) {
  return require('./next-design').embed(title,description,color);
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
  const payload = { ...require('./next-design').feedback('❌ '+message,interaction.guildId), flags: 64 };
  if (interaction.deferred && !interaction.replied) return interaction.editReply(payload);
  if (interaction.replied) return interaction.followUp(payload);
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
