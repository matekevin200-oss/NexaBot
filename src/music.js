const {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus
} = require('@discordjs/voice');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
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
const selectedChannels = new Map();
const defaultVolumes = new Map();
const MUSIC_COMPONENT = 'nexa_music:';
const YOUTUBE_COOKIE_FILE = (() => {
  const value = process.env.YOUTUBE_COOKIES_BASE64;
  if (!value) return null;
  try {
    const contents = Buffer.from(value, 'base64');
    if (!contents.length || contents.length > 1024 * 1024) throw new Error('Cookie file must be 1 byte–1 MiB.');
    const filename = path.join(os.tmpdir(), `nexa-youtube-cookies-${process.pid}.txt`);
    fs.writeFileSync(filename, contents, { mode: 0o600 });
    return filename;
  } catch (error) {
    console.error('Nexa YouTube cookies could not be loaded:', error.message);
    return null;
  }
})();

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
  root.addSubcommand((item) => item.setName('panel')
    .setDescription(en ? 'Post the interactive music panel in this or another text channel.' : 'Interaktív zenei panel küldése ebbe vagy egy másik szöveges csatornába.')
    .addChannelOption((option) => option.setName(en ? 'channel' : 'csatorna')
      .setDescription(en ? 'Text channel for the panel; defaults to this channel.' : 'A panel szöveges csatornája; alapból ez a csatorna.')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)));
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
    ? { panel: 'panel', lejatszas: 'play', szunet: 'pause', folytatas: 'resume', kihagy: 'skip', lista: 'queue', kilepes: 'leave', hangeroszint: 'volume' }
    : { panel: 'panel', play: 'play', pause: 'pause', resume: 'resume', skip: 'skip', queue: 'queue', leave: 'leave', volume: 'volume' };
  return map[action];
}

function musicPanel(guild, language = 'hu') {
  const hu = language === 'hu';
  const voiceChannels = [...guild.channels.cache.values()]
    .filter((channel) => channel.type === ChannelType.GuildVoice)
    .sort((a, b) => a.position - b.position)
    .slice(0, 25);
  const rows = [];
  if (voiceChannels.length) {
    const channelMenu = new StringSelectMenuBuilder()
      .setCustomId(`${MUSIC_COMPONENT}channel:${language}`)
      .setPlaceholder(hu ? 'Válassz voice-csatornát' : 'Choose a voice channel')
      .addOptions(voiceChannels.map((channel) => ({ label: channel.name.slice(0, 100), value: channel.id, description: hu ? 'Ide csatlakozzon a Nexa' : 'Nexa will join this channel' })));
    rows.push(new ActionRowBuilder().addComponents(channelMenu));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}search:${language}`).setLabel(hu ? 'YouTube-keresés' : 'Search YouTube').setEmoji('🔎').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}url:${language}`).setLabel(hu ? 'Link megadása' : 'Enter link').setEmoji('🔗').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}pause:${language}`).setLabel(hu ? 'Szünet' : 'Pause').setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}resume:${language}`).setLabel(hu ? 'Folytatás' : 'Resume').setEmoji('▶️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}skip:${language}`).setLabel(hu ? 'Kihagyás' : 'Skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary)
  ));
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}volume_down:${language}`).setLabel('−').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}volume_up:${language}`).setLabel('+').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}queue:${language}`).setLabel(hu ? 'Várólista' : 'Queue').setEmoji('📜').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${MUSIC_COMPONENT}leave:${language}`).setLabel(hu ? 'Kilépés' : 'Leave').setEmoji('⏹️').setStyle(ButtonStyle.Danger)
  ));
  const embed = new EmbedBuilder()
    .setColor(0x7554e8)
    .setTitle(hu ? '🎵 NEXA zenevezérlő' : '🎵 NEXA Music Control')
    .setDescription(hu
      ? 'Keress zenét YouTube-on, illessz be egy YouTube-linket, válaszd ki a voice-csatornát, és kezeld innen a lejátszást.'
      : 'Search YouTube, paste a YouTube link, choose a voice channel, and control playback here.')
    .addFields(
      { name: hu ? 'Lejátszás' : 'Playback', value: hu ? 'YouTube-keresés vagy link megadása' : 'Search YouTube or paste a link', inline: true },
      { name: hu ? 'Vezérlés' : 'Controls', value: hu ? 'Szünet · folytatás · kihagyás · várólista' : 'Pause · resume · skip · queue', inline: true },
      { name: hu ? 'Hangerő' : 'Volume', value: hu ? '− / + gombokkal állítható' : 'Adjust with − / + buttons', inline: true }
    )
    .setFooter({ text: hu ? 'A lejátszáshoz a Nexának csatlakozási és beszédjog kell.' : 'Nexa needs Connect and Speak permissions to play audio.' });
  return { embeds: [embed], components: rows };
}

async function ensureMusicPanel(client) {
  const matches = [];
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.type === ChannelType.GuildText && channel.name === 'zene-parancs') matches.push(channel);
    }
  }
  if (matches.length !== 1) {
    console.log(matches.length
      ? `Zenei panel nem került ki: ${matches.length} #zene-parancs nevű csatorna található.`
      : 'Zenei panel nem került ki: nem található #zene-parancs nevű csatorna.');
    return false;
  }
  const channel = matches[0];
  const permissions = channel.permissionsFor(client.user);
  if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    console.warn(`Zenei panel nem került ki: hiányzó csatornajogosultság (${channel.guild.name}/#${channel.name}).`);
    return false;
  }
  const recent = await channel.messages.fetch({ limit: 30 }).catch((error) => {
    console.error(`Zenei panel üzenetei nem olvashatók (${channel.guild.name}/#${channel.name}):`, error.message);
    return null;
  });
  if (!recent) return false;
  const existing = recent.find((message) => message.author.id === client.user.id
    && message.embeds.some((embed) => embed.title === '🎵 NEXA zenevezérlő'));
  if (existing) {
    await existing.edit(musicPanel(channel.guild, 'hu'));
    console.log(`Zenei panel frissítve: ${channel.guild.name}/#${channel.name}`);
  } else {
    await channel.send(musicPanel(channel.guild, 'hu'));
    console.log(`Zenei panel közzétéve: ${channel.guild.name}/#${channel.name}`);
  }
  return true;
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
  const session = { channelId: channel.id, player, connection, queue: [], current: null, volume: defaultVolumes.get(interaction.guildId) ?? 0.5, advancing: false };
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
  const args = [
    '--no-playlist',
    '--no-progress',
    '--no-warnings',
    '--no-update',
    '--format', 'bestaudio/best',
    '--output', '-',
    '--js-runtimes', 'node'
  ];
  if (YOUTUBE_COOKIE_FILE) args.push('--cookies', YOUTUBE_COOKIE_FILE);
  args.push('--', item.url.href);
  const process = spawn(YOUTUBE_DL_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  item.process = process;
  let stderr = '';
  process.stderr.setEncoding('utf8');
  process.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-2500); });
  process.once('error', (error) => {
    console.error('Nexa YouTube extractor failed to start:', error.message);
    if (session.current === item) {
      void item.notifyFailure?.('A YouTube-lejátszó nem tudott elindulni a Renderen.');
      session.player.stop(true);
    }
  });
  process.once('close', (code, signal) => {
    if (code !== 0 && session.current === item) {
      const details = (stderr.trim() || `exit=${code} signal=${signal}`).slice(-2500);
      console.error('Nexa YouTube extraction failed:', details);
      const blocked = /sign in to confirm|not a bot|confirm you.re not a bot/i.test(details);
      const message = blocked
        ? 'A YouTube letiltotta a Render kérését, ezért a hangot nem lehetett elindítani. A tulajdonos a Render környezeti változói között állíthat be YouTube-cookie-t YOUTUBE_COOKIES_BASE64 néven.'
        : 'A YouTube nem adott lejátszható hangfolyamot. Próbálj meg egy másik YouTube-linket.';
      void item.notifyFailure?.(message);
      session.player.stop(true);
    }
  });
  return process.stdout;
}

function runYouTubeDl(args, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(YOUTUBE_DL_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout = (stdout + chunk).slice(0, 1024 * 1024); });
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-6000); });
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) return resolve(stdout.trim());
      const error = new Error(stderr.trim().slice(-1200) || `yt-dlp exited with ${code || signal || 'unknown error'}`);
      error.youtubeBlocked = /sign in to confirm|not a bot|confirm you.re not a bot/i.test(error.message);
      reject(error);
    });
  });
}

async function searchYouTube(query) {
  const args = ['--no-playlist', '--no-warnings', '--no-update', '--flat-playlist', '--dump-single-json', '--skip-download'];
  if (YOUTUBE_COOKIE_FILE) args.push('--cookies', YOUTUBE_COOKIE_FILE);
  args.push('--', `ytsearch1:${query}`);
  const output = await runYouTubeDl(args);
  const result = JSON.parse(output);
  const item = result.entries?.find((entry) => entry?.id);
  if (!item) throw new Error('Nem található lejátszható YouTube-találat.');
  return { url: new URL(`https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`), title: String(item.title || 'YouTube-találat').slice(0, 180) };
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
    void session.current?.notifyFailure?.('Nem sikerült létrehozni a hangfolyamot. Ellenőrizd a YouTube-linket és próbáld újra.');
    stopSource(session.current);
    session.current = null;
    if (session.queue.length) setImmediate(() => { void playNext(guildId, session); });
  } finally {
    session.advancing = false;
  }
}

async function startPlayback(interaction, rawUrl, { language, selectedChannel, alreadyDeferred = false, title = null } = {}) {
  const hu = (language || (interaction.commandName === 'zene' ? 'hu' : 'en')) === 'hu';
  const reply = (text) => alreadyDeferred ? interaction.editReply({ content: text }) : interaction.reply({ content: text, flags: EPHEMERAL });
  const checked = validateStreamUrl(rawUrl);
  if (checked.error) return reply(checked.error);
  if (checked.unconfigured) return reply(hu
    ? 'A közvetlen hangfolyam domainje nincs engedélyezve a NEXA_MUSIC_ALLOWED_HOSTS beállításban.'
    : 'This direct audio stream host is not allowed by NEXA_MUSIC_ALLOWED_HOSTS.');
  if (!alreadyDeferred) await interaction.deferReply({ flags: EPHEMERAL });
  let session = sessions.get(interaction.guildId);
  try {
    const requestedChannel = selectedChannel || selectedChannels.get(interaction.guildId) || interaction.member?.voice?.channel;
    if (!session) {
      session = await createSession(interaction, requestedChannel);
      sessions.set(interaction.guildId, session);
    } else if (requestedChannel && requestedChannel.id !== session.channelId) {
      return interaction.editReply(hu ? 'A Nexa már egy másik voice-csatornában van. Előbb állítsd le a `/zene kilepes` paranccsal.' : 'Nexa is already in another voice channel. Use `/music leave` first.');
    } else if (!sameVoiceChannel(interaction, session)) {
      return interaction.editReply(hu ? 'A Nexa már egy másik voice-csatornában zenél.' : 'Nexa is already playing in another voice channel.');
    }
    session.queue.push({
      url: checked.url,
      host: checked.url.hostname,
      youtube: Boolean(checked.youtube),
      title,
      requestedBy: interaction.user.username,
      notifyFailure: (content) => interaction.followUp({ content, flags: EPHEMERAL }).catch(() => null)
    });
    if (session.player.state.status === AudioPlayerStatus.Idle && !session.current) await playNext(interaction.guildId, session);
    return interaction.editReply(hu
      ? `🔊 Hozzáadva a várólistához: **${title || (checked.youtube ? 'YouTube-link' : checked.url.hostname)}**\nCsatorna: <#${session.channelId}>`
      : `🔊 Added to the queue: **${title || (checked.youtube ? 'YouTube link' : checked.url.hostname)}**\nChannel: <#${session.channelId}>`);
  } catch (error) {
    if (session && !session.current && !session.queue.length) {
      session.connection.destroy();
      sessions.delete(interaction.guildId);
    }
    console.error('Nexa music join/play failed:', error.message);
    return interaction.editReply(error.userSafe ? error.message : (hu
      ? 'Nem sikerült csatlakozni vagy elindítani a hangfolyamot. Ellenőrizd a voice-jogokat és a linket.'
      : 'Could not join or start the stream. Check voice permissions and the URL.'));
  }
}

async function postMusicPanel(interaction, hu) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: hu ? 'A panel létrehozásához Szerver kezelése jogosultság kell.' : 'Manage Server permission is required to post the panel.', flags: EPHEMERAL });
  }
  const target = interaction.options.getChannel(hu ? 'csatorna' : 'channel') || interaction.channel;
  if (!target?.isTextBased?.() || target.guildId !== interaction.guildId) {
    return interaction.reply({ content: hu ? 'Válassz egy szöveges csatornát ezen a szerveren.' : 'Choose a text channel in this server.', flags: EPHEMERAL });
  }
  await interaction.deferReply({ flags: EPHEMERAL });
  await interaction.guild.channels.fetch().catch(() => null);
  await target.send(musicPanel(interaction.guild, hu ? 'hu' : 'en'));
  return interaction.editReply(hu ? `A zenei panel kikerült ide: ${target}` : `Music panel posted in ${target}`);
}

async function handleMusicCommand(interaction) {
  const hu = interaction.commandName === 'zene';
  const reply = (text) => interaction.reply({ content: text, flags: EPHEMERAL });
  if (!interaction.guild || !interaction.guildId) return reply(hu ? 'A zeneparancs csak szerveren használható.' : 'Music commands are only available in a server.');
  const action = actionFor(interaction);
  let session = sessions.get(interaction.guildId);

  if (action === 'panel') return postMusicPanel(interaction, hu);
  if (action === 'play') {
    return startPlayback(interaction, interaction.options.getString('url', true), {
      language: hu ? 'hu' : 'en',
      selectedChannel: interaction.options.getChannel(hu ? 'csatorna' : 'channel')
    });
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
    defaultVolumes.set(interaction.guildId, session.volume);
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

function showMusicModal(interaction, action, language) {
  const hu = language === 'hu';
  const searching = action === 'search';
  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(searching ? (hu ? 'Mit keressek YouTube-on?' : 'Search YouTube for') : (hu ? 'YouTube-link' : 'YouTube URL'))
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(searching ? 160 : 500)
    .setPlaceholder(searching ? (hu ? 'Előadó – szám címe' : 'Artist – song title') : 'https://youtu.be/...');
  return interaction.showModal(new ModalBuilder()
    .setCustomId(`${MUSIC_COMPONENT}${searching ? 'submit_search' : 'submit_url'}:${language}`)
    .setTitle(searching ? (hu ? 'YouTube-keresés' : 'Search YouTube') : (hu ? 'YouTube-link lejátszása' : 'Play a YouTube link'))
    .addComponents(new ActionRowBuilder().addComponents(input)));
}

async function handleMusicComponent(interaction) {
  if (!String(interaction.customId || '').startsWith(MUSIC_COMPONENT)) return false;
  const [action, language = 'hu'] = interaction.customId.slice(MUSIC_COMPONENT.length).split(':');
  const hu = language === 'hu';
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: hu ? 'Ez a panel csak szerveren használható.' : 'This panel only works in a server.', flags: EPHEMERAL });
    return true;
  }
  if (interaction.isStringSelectMenu() && action === 'channel') {
    const channel = await interaction.guild.channels.fetch(interaction.values[0]).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: hu ? 'A kiválasztott voice-csatorna már nem érhető el.' : 'That voice channel is no longer available.', flags: EPHEMERAL });
      return true;
    }
    selectedChannels.set(interaction.guildId, channel);
    await interaction.reply({ content: hu ? `A Nexa ehhez a csatornához csatlakozik: ${channel}` : `Nexa will join ${channel}.`, flags: EPHEMERAL });
    return true;
  }
  if (interaction.isModalSubmit() && (action === 'submit_search' || action === 'submit_url')) {
    await interaction.deferReply({ flags: EPHEMERAL });
    try {
      let item;
      if (action === 'submit_search') {
        const query = interaction.fields.getTextInputValue('value').trim();
        item = await searchYouTube(query);
      } else {
        item = { url: interaction.fields.getTextInputValue('value').trim(), title: null };
      }
      await startPlayback(interaction, item.url.href || item.url, { language, alreadyDeferred: true, title: item.title });
    } catch (error) {
      console.error('Nexa YouTube search failed:', error.message);
      const text = error.youtubeBlocked
        ? (hu ? 'A YouTube letiltotta a Render keresését. A tulajdonos állítson be YouTube-cookie-t a Render YOUTUBE_COOKIES_BASE64 változójában.' : 'YouTube blocked the Render search. The owner must set YOUTUBE_COOKIES_BASE64 in Render.')
        : (hu ? 'Nem sikerült YouTube-találatot keresni. Próbálj másik keresést vagy illessz be egy linket.' : 'YouTube search failed. Try another query or paste a link.');
      await interaction.editReply({ content: text });
    }
    return true;
  }
  if (!interaction.isButton()) return true;
  if (action === 'search' || action === 'url') {
    await showMusicModal(interaction, action, language);
    return true;
  }
  if (action === 'volume_down' || action === 'volume_up') {
    const session = sessions.get(interaction.guildId);
    const previous = session?.volume ?? defaultVolumes.get(interaction.guildId) ?? 0.5;
    const volume = Math.max(0.1, Math.min(1, previous + (action === 'volume_up' ? 0.1 : -0.1)));
    defaultVolumes.set(interaction.guildId, volume);
    if (session) {
      session.volume = volume;
      session.player.state.resource?.volume?.setVolume(volume);
    }
    await interaction.reply({ content: `${hu ? 'Hangerő' : 'Volume'}: ${Math.round(volume * 100)}%.`, flags: EPHEMERAL });
    return true;
  }
  const session = sessions.get(interaction.guildId);
  if (!session) {
    await interaction.reply({ content: hu ? 'Még nincs aktív zenelejátszás. Használd előbb a YouTube-keresést vagy a link gombot.' : 'No active session. Start music with Search YouTube or Enter link first.', flags: EPHEMERAL });
    return true;
  }
  if (!sameVoiceChannel(interaction, session)) {
    await interaction.reply({ content: hu ? 'A vezérléshez lépj be ugyanabba a voice-csatornába, mint a Nexa.' : 'Join the same voice channel as Nexa to control playback.', flags: EPHEMERAL });
    return true;
  }
  if (action === 'pause') {
    const ok = session.player.pause();
    await interaction.reply({ content: ok ? (hu ? '⏸️ Szüneteltetve.' : '⏸️ Paused.') : (hu ? 'Most nem szüneteltethető.' : 'Playback cannot be paused right now.'), flags: EPHEMERAL });
  } else if (action === 'resume') {
    const ok = session.player.unpause();
    await interaction.reply({ content: ok ? (hu ? '▶️ Folytatva.' : '▶️ Resumed.') : (hu ? 'A lejátszás nincs szüneteltetve.' : 'Playback is not paused.'), flags: EPHEMERAL });
  } else if (action === 'skip') {
    if (!session.current) await interaction.reply({ content: hu ? 'Nincs kihagyható szám.' : 'There is nothing to skip.', flags: EPHEMERAL });
    else { session.player.stop(true); await interaction.reply({ content: hu ? '⏭️ Kihagytam.' : '⏭️ Skipped.', flags: EPHEMERAL }); }
  } else if (action === 'queue') {
    const lines = [session.current && `▶️ **${session.current.title || (session.current.youtube ? 'YouTube' : session.current.host)}**`, ...session.queue.slice(0, 10).map((item, index) => `${index + 1}. ${item.title || (item.youtube ? 'YouTube' : item.host)}`)].filter(Boolean);
    await interaction.reply({ content: lines.length ? lines.join('\n') : (hu ? 'A várólista üres.' : 'The queue is empty.'), flags: EPHEMERAL });
  } else if (action === 'leave') {
    session.queue.length = 0;
    stopSource(session.current);
    session.player.stop(true);
    session.connection.destroy();
    sessions.delete(interaction.guildId);
    await interaction.reply({ content: hu ? '👋 Leállítottam a zenét és kiléptem.' : '👋 Stopped playback and left.', flags: EPHEMERAL });
  } else {
    await interaction.reply({ content: hu ? 'Ismeretlen zenevezérlő.' : 'Unknown music control.', flags: EPHEMERAL });
  }
  return true;
}

module.exports = { buildMusicCommands, handleMusicCommand, handleMusicComponent, musicPanel, ensureMusicPanel };
