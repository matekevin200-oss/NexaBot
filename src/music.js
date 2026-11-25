const {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus
} = require('@discordjs/voice');
const { ChannelType, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { spawn } = require('node:child_process');
const path = require('node:path');
const youtubeDl = require('youtube-dl-exec');

const ffmpegPath = require('ffmpeg-static');
if (ffmpegPath) process.env.PATH = `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH || ''}`;

// The host allowlist prevents this bot from becoming an unrestricted network
// proxy. Add only trusted, licensed stream hosts to NEXA_MUSIC_ALLOWED_HOSTS.
const allowedHosts = new Set(String(process.env.NEXA_MUSIC_ALLOWED_HOSTS || '')
  .split(',').map((host) => host.trim().toLowerCase()).filter(Boolean));
const sessions = new Map();
const EPHEMERAL = MessageFlags.Ephemeral;
const YOUTUBE_DL_PATH = youtubeDl.constants.YOUTUBE_DL_PATH;

function isYouTubeUrl(url) {
  const host = url.hostname.toLowerCase();
  return ['youtube.com', 'youtu.be', 'youtube-nocookie.com'].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function validateStreamUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return { error: 'Adj meg egy érvényes HTTPS hangfolyam-linket.' }; }
  if (url.protocol !== 'https:' || url.username || url.password) {
    return { error: 'Csak hitelesítés nélküli HTTPS hangfolyam-link használható.' };
  }
  if (isYouTubeUrl(url)) {
    return { youtube: true, url };
  }
  if (!allowedHosts.size) return { unconfigured: true, url };
  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    return { error: 'Ez a hangforrás nincs engedélyezve. A Nexa csak a beállított, megbízható hangfolyam-domainről játszik le.' };
  }
  return { url };
}

function command(name, language) {
  const en = language === 'en';
  const root = new SlashCommandBuilder()
    .setName(name)
    .setDescription(en ? 'Play YouTube links and approved audio streams in a voice channel.' : 'YouTube-linkek és engedélyezett hangfolyamok lejátszása voice-csatornán.');
  const sub = (key, label, description) => root.addSubcommand((item) => item.setName(key).setDescription(description));
  root.addSubcommand((item) => item.setName(en ? 'play' : 'lejatszas')
    .setDescription(en ? 'Play a YouTube link or an approved direct audio stream.' : 'YouTube-link vagy engedélyezett közvetlen hangfolyam lejátszása.')
    .addStringOption((option) => option.setName('url').setDescription(en ? 'YouTube link or HTTPS audio stream URL' : 'YouTube-link vagy HTTPS hangfolyam URL').setRequired(true).setMaxLength(500))
    .addChannelOption((option) => option.setName(en ? 'channel' : 'csatorna')
      .setDescription(en ? 'Choose the voice channel Nexa should join; defaults to your current channel.' : 'Válaszd ki, melyik voice-csatornába lépjen be a Nexa.')
      .addChannelTypes(ChannelType.GuildVoice)
      .setRequired(false)));
  sub(en ? 'pause' : 'szunet', '', en ? 'Pause playback.' : 'Lejátszás szüneteltetése.');
  sub(en ? 'resume' : 'folytatas', '', en ? 'Resume playback.' : 'Lejátszás folytatása.');
  sub(en ? 'skip' : 'kihagy', '', en ? 'Skip the current stream.' : 'Aktuális szám kihagyása.');
  sub(en ? 'queue' : 'lista', '', en ? 'Show the current queue.' : 'Várólista megjelenítése.');
  sub(en ? 'leave' : 'kilepes', '', en ? 'Stop and leave the voice channel.' : 'Leállítás és kilépés a voice-csatornából.');
  root.addSubcommand((item) => item.setName(en ? 'volume' : 'hangeroszint')
    .setDescription(en ? 'Set playback volume from 1 to 100.' : 'Hangerő beállítása 1 és 100 között.')
    .addIntegerOption((option) => option.setName(en ? 'percent' : 'szazalek').setDescription(en ? 'Volume percentage' : 'Hangerő százalékban').setRequired(true).setMinValue(1).setMaxValue(100)));
  return root;
}

function buildMusicCommands() {
  return [command('zene', 'hu'), command('music', 'en')];
}

function actionFor(interaction) {
  const action = interaction.options.getSubcommand();
  const hu = interaction.commandName === 'zene';
  const map = hu
    ? { lejatszas: 'play', szunet: 'pause', folytatas: 'resume', kihagy: 'skip', lista: 'queue', kilepes: 'leave', hangeroszint: 'volume' }
    : { play: 'play', pause: 'pause', resume: 'resume', skip: 'skip', queue: 'queue', leave: 'leave', volume: 'volume' };
  return map[action];
}

function sameVoiceChannel(interaction, session) {
  return interaction.member?.voice?.channelId && interaction.member.voice.channelId === session.channelId;
}

async function createSession(interaction, selectedChannel) {
  const channel = selectedChannel || interaction.member?.voice?.channel;
  if (!channel || !channel.isVoiceBased?.()) {
    const error = new Error('Előbb csatlakozz egy voice-csatornához, vagy válassz csatornát a parancsnál.');
    error.userSafe = true;
    throw error;
  }
  if (channel.guildId !== interaction.guildId) {
    const error = new Error('Csak ezen a szerveren lévő voice-csatornát választhatsz.');
    error.userSafe = true;
    throw error;
  }
  const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
  const channelPermissions = channel.permissionsFor(botMember);
  const missing = [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
    .some((permission) => !channelPermissions?.has(permission));
  if (missing) {
    const error = new Error('A Nexának nincs csatlakozási vagy beszédjogosultsága a kiválasztott csatornában.');
    error.userSafe = true;
    throw error;
  }
  const player = createAudioPlayer();
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: true
  });
  const session = { channelId: channel.id, player, connection, queue: [], current: null, volume: 0.5, advancing: false };
  connection.subscribe(player);
  player.on(AudioPlayerStatus.Idle, () => {
    stopSource(session.current);
    session.current = null;
    void playNext(interaction.guildId, session);
  });
  player.on('error', (error) => {
    console.error('Nexa music player error:', error.message);
    stopSource(session.current);
    session.current = null;
    session.player.stop(true);
    void playNext(interaction.guildId, session);
  });
  connection.on('error', (error) => console.error('Nexa voice connection error:', error.message));
  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  return session;
}

function stopSource(item) {
  const process = item?.process;
  if (process && process.exitCode === null && process.signalCode === null && !process.killed) {
    process.kill('SIGTERM');
  }
}

function createYouTubeStream(item, session) {
  const process = spawn(YOUTUBE_DL_PATH, [
    '--no-playlist',
    '--no-progress',
    '--no-warnings',
    '--no-update',
    '--format', 'bestaudio/best',
    '--output', '-',
    '--js-runtimes', 'node',
    '--', item.url.href
  ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  item.process = process;
  let stderr = '';
  process.stderr.setEncoding('utf8');
  process.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-2500); });
  process.once('error', (error) => {
    console.error('Nexa YouTube extractor failed to start:', error.message);
    if (session.current === item) session.player.stop(true);
  });
  process.once('close', (code, signal) => {
    if (code !== 0 && session.current === item) {
      console.error('Nexa YouTube extraction failed:', (stderr.trim() || `exit=${code} signal=${signal}`).slice(-2500));
      session.player.stop(true);
    }
  });
  return process.stdout;
}

async function playNext(guildId, session) {
  if (session.advancing || session.player.state.status !== AudioPlayerStatus.Idle) return;
  session.advancing = true;
  try {
    const item = session.queue.shift();
    if (!item) { session.current = null; return; }
    session.current = item;
    const stream = item.youtube ? createYouTubeStream(item, session) : item.url.href;
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
    resource.volume?.setVolume(session.volume);
    session.player.play(resource);
  } catch (error) {
    console.error('Nexa music stream error:', error.message);
    stopSource(session.current);
    session.current = null;
    if (session.queue.length) setImmediate(() => { void playNext(guildId, session); });
  } finally {
    session.advancing = false;
  }
}

async function handleMusicCommand(interaction) {
  const hu = interaction.commandName === 'zene';
  const reply = (text) => interaction.reply({ content: text, flags: EPHEMERAL });
  if (!interaction.guild || !interaction.guildId) return reply(hu ? 'A zeneparancs csak szerveren használható.' : 'Music commands are only available in a server.');
  const action = actionFor(interaction);
  let session = sessions.get(interaction.guildId);

  if (action === 'play') {
    const checked = validateStreamUrl(interaction.options.getString('url', true));
    if (checked.error) return reply(checked.error);
    if (checked.unconfigured) return reply(hu
      ? 'A zenelejátszás még nincs beállítva: a Renderen add meg a NEXA_MUSIC_ALLOWED_HOSTS változóban az engedélyezett hangfolyam-domain nevét.'
      : 'Music is not configured yet: set the approved stream domain in the NEXA_MUSIC_ALLOWED_HOSTS Render variable.');
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      const selectedChannel = interaction.options.getChannel(hu ? 'csatorna' : 'channel');
      if (!session) {
        session = await createSession(interaction, selectedChannel);
        sessions.set(interaction.guildId, session);
      } else if (selectedChannel && selectedChannel.id !== session.channelId) {
        return interaction.editReply(hu ? 'A Nexa már egy másik voice-csatornában van. Előbb állítsd le a `/zene kilepes` paranccsal.' : 'Nexa is already in another voice channel. Use `/music leave` first.');
      } else if (!sameVoiceChannel(interaction, session)) {
        return interaction.editReply(hu ? 'A Nexa már egy másik voice-csatornában zenél.' : 'Nexa is already playing in another voice channel.');
      }
      session.queue.push({ url: checked.url, host: checked.url.hostname, youtube: Boolean(checked.youtube), requestedBy: interaction.user.username });
      if (session.player.state.status === AudioPlayerStatus.Idle && !session.current) await playNext(interaction.guildId, session);
      return interaction.editReply(hu
        ? `🔊 Hozzáadva a várólistához: **${checked.youtube ? 'YouTube-link' : checked.url.hostname}**\nCsatorna: <#${session.channelId}>`
        : `🔊 Added to the queue: **${checked.youtube ? 'YouTube link' : checked.url.hostname}**\nChannel: <#${session.channelId}>`);
    } catch (error) {
      if (session && !session.current && !session.queue.length) {
        session.connection.destroy();
        sessions.delete(interaction.guildId);
      }
      console.error('Nexa music join/play failed:', error.message);
      return interaction.editReply(error.userSafe ? error.message : (hu ? 'Nem sikerült csatlakozni vagy elindítani a hangfolyamot. Ellenőrizd a voice-jogokat és a linket.' : 'Could not join or start the stream. Check voice permissions and the URL.'));
    }
  }

  if (!session) return reply(hu ? 'Most nincs aktív zenelejátszás.' : 'There is no active music session.');
  if (!sameVoiceChannel(interaction, session)) return reply(hu ? 'Ehhez ugyanabban a voice-csatornában kell lenned, mint a Nexának.' : 'You must be in the same voice channel as Nexa to control playback.');
  if (action === 'pause') {
    const ok = session.player.pause();
    return reply(ok ? (hu ? '⏸️ Szüneteltetve.' : '⏸️ Paused.') : (hu ? 'Most nem szüneteltethető.' : 'Playback cannot be paused right now.'));
  }
  if (action === 'resume') {
    const ok = session.player.unpause();
    return reply(ok ? (hu ? '▶️ Folytatva.' : '▶️ Resumed.') : (hu ? 'A lejátszás nincs szüneteltetve.' : 'Playback is not paused.'));
  }
  if (action === 'skip') {
    if (!session.current) return reply(hu ? 'Nincs kihagyható szám.' : 'There is nothing to skip.');
    session.player.stop(true);
    return reply(hu ? '⏭️ Kihagytam.' : '⏭️ Skipped.');
  }
  if (action === 'queue') {
    const sourceName = (item) => item.youtube ? 'YouTube' : item.host;
    const lines = [session.current && `▶️ **Most szól:** ${sourceName(session.current)}`, ...session.queue.slice(0, 10).map((item, index) => `${index + 1}. ${sourceName(item)}`)].filter(Boolean);
    return reply(lines.length ? lines.join('\n') : (hu ? 'A várólista üres.' : 'The queue is empty.'));
  }
  if (action === 'volume') {
    const volume = interaction.options.getInteger(hu ? 'szazalek' : 'percent', true);
    session.volume = volume / 100;
    session.player.state.resource?.volume?.setVolume(session.volume);
    return reply(hu ? `🔉 Hangerő: ${volume}%.` : `🔉 Volume: ${volume}%.`);
  }
  if (action === 'leave') {
    session.queue.length = 0;
    stopSource(session.current);
    session.player.stop(true);
    session.connection.destroy();
    sessions.delete(interaction.guildId);
    return reply(hu ? '👋 Leállítottam a zenét és kiléptem a voice-csatornából.' : '👋 Stopped playback and left the voice channel.');
  }
  return reply(hu ? 'Ismeretlen zeneparancs.' : 'Unknown music command.');
}

module.exports = { buildMusicCommands, handleMusicCommand };
