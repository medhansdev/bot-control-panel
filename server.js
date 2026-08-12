const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ActivityType, EmbedBuilder } = require('discord.js');
const express = require('express');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

let discordClient = null;
const serverSettings = {};

// In-memory storage for warnings: { guildId: { userId: [ { reason, moderator, date } ] } }
const serverWarnings = {};

// ==========================================
// 1. WEB DASHBOARD & MODERN UI ROUTES
// ==========================================

app.get('/', (req, res) => {
    const accessToken = req.cookies.discord_token;

    if (!accessToken) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>VOID.GG - Premium Authentication</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                    :root {
                      --bg-image: url('https://files.catbox.moe/y08zjc.png');
                      --accent-purple: #b388ff;
                      --accent-glow: rgba(179, 136, 255, 0.4);
                      --purple-border: rgba(179, 136, 255, 0.2);
                      --dark-glass: rgba(18, 19, 30, 0.75);
                    }
                    * { font-family: 'Plus Jakarta Sans', sans-serif !important; box-sizing: border-box; }
                    body, html {
                      margin: 0; padding: 0; height: 100%;
                      background: var(--bg-image) center/cover no-repeat fixed !important;
                      color: #fff; display: flex; align-items: center; justify-content: center;
                    }
                    .login-card {
                      background: var(--dark-glass); backdrop-filter: blur(24px);
                      -webkit-backdrop-filter: blur(24px); border: 1px solid var(--purple-border);
                      padding: 60px 40px; border-radius: 24px; text-align: center; max-width: 480px; width: 100%;
                      box-shadow: 0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);
                    }
                    .badge {
                      background: rgba(179, 136, 255, 0.1); color: var(--accent-purple);
                      padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
                      text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 20px;
                      border: 1px solid var(--purple-border);
                    }
                    h1 { font-weight: 800; font-size: 32px; color: #fff; margin-bottom: 12px; letter-spacing: -0.5px; }
                    p { color: #9492a2; font-size: 14px; line-height: 1.6; margin-bottom: 35px; }
                    .login-btn {
                      background: linear-gradient(135deg, #5865F2, #4752C4); color: #fff; text-decoration: none;
                      padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 15px;
                      box-shadow: 0 8px 25px rgba(88, 101, 242, 0.4); display: flex; align-items: center; justify-content: center; gap: 10px;
                      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .login-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 35px rgba(88, 101, 242, 0.6); }
                </style>
            </head>
            <body>
                <div class="login-card">
                    <div class="badge">Next-Gen Control Panel</div>
                    <h1>VOID.GG SUITE</h1>
                    <p>Authorize with Discord to unlock absolute control over server moderation, security protection suites, automated greetings, and logs.</p>
                    <a href="https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify%20guilds" class="login-btn">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.011c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        Login with Discord
                    </a>
                </div>
            </body>
            </html>
        `);
    }

    let guildsListHtml = '';
    if (discordClient && discordClient.guilds.cache.size > 0) {
        discordClient.guilds.cache.forEach(guild => {
            const iconUrl = guild.iconURL({ dynamic: true, size: 256 }) || 'https://files.catbox.moe/y08zjc.png';
            guildsListHtml += `
                <a href="/dashboard/${guild.id}" class="server-card">
                    <div class="server-icon-wrapper">
                        <img src="${iconUrl}" class="server-icon" alt="${guild.name}">
                    </div>
                    <div class="server-info">
                        <div class="server-name">${guild.name}</div>
                        <div class="server-role">Configure Bot &rarr; (${guild.memberCount} members)</div>
                    </div>
                </a>
            `;
        });
    } else {
        guildsListHtml = `<div class="empty-notice">Bot is not connected to any servers yet!</div>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>VOID.GG - Server Picker</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                :root {
                  --bg-image: url('https://files.catbox.moe/y08zjc.png');
                  --accent-purple: #b388ff;
                  --accent-glow: rgba(179, 136, 255, 0.4);
                  --purple-border: rgba(179, 136, 255, 0.2);
                  --dark-glass: rgba(16, 17, 26, 0.85);
                }
                * { font-family: 'Plus Jakarta Sans', sans-serif !important; box-sizing: border-box; }
                body, html {
                  margin: 0; padding: 0; min-height: 100vh;
                  background: var(--bg-image) center/cover no-repeat fixed !important;
                  color: #fff;
                }
                .navbar {
                  display: flex; align-items: center; justify-content: space-between;
                  padding: 18px 40px; background: rgba(10, 11, 18, 0.8);
                  backdrop-filter: blur(16px); border-bottom: 1px solid var(--purple-border);
                }
                .nav-brand { font-weight: 800; font-size: 20px; color: var(--accent-purple); display: flex; align-items: center; gap: 10px; }
                .logout-btn { color: #ff6b6b; text-decoration: none; font-weight: 600; font-size: 13px; background: rgba(255, 107, 107, 0.1); padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255, 107, 107, 0.2); transition: 0.2s; }
                .logout-btn:hover { background: rgba(255, 107, 107, 0.2); }
                .main-container { max-width: 1100px; margin: 60px auto; padding: 0 20px; }
                .picker-panel {
                  background: var(--dark-glass); backdrop-filter: blur(24px);
                  border: 1px solid var(--purple-border); border-radius: 20px; padding: 40px;
                  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                .picker-header-title { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
                .picker-header-desc { color: #9492a2; font-size: 14px; margin-bottom: 35px; }
                .servers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
                .server-card {
                  background: rgba(25, 26, 40, 0.6); border: 1px solid var(--purple-border);
                  border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px;
                  text-decoration: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .server-card:hover { transform: translateY(-4px); border-color: var(--accent-purple); box-shadow: 0 10px 25px rgba(179, 136, 255, 0.15); background: rgba(30, 31, 48, 0.8); }
                .server-icon-wrapper { width: 64px; height: 64px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, var(--accent-purple), transparent); flex-shrink: 0; }
                .server-icon { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
                .server-info { overflow: hidden; }
                .server-name { color: #fff; font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
                .server-role { color: var(--accent-purple); font-size: 12px; font-weight: 600; }
                .empty-notice { color: #9492a2; text-align: center; padding: 40px; font-size: 15px; }
            </style>
        </head>
        <body>
            <div class="navbar">
                <div class="nav-brand">🛡️ VOID.GG DASHBOARD — Connected Servers: ${discordClient ? discordClient.guilds.cache.size : 0}</div>
                <a href="/logout" class="logout-btn">Log out</a>
            </div>
            <div class="main-container">
                <div class="picker-panel">
                    <div class="picker-header-title">Select a Server</div>
                    <div class="picker-header-desc">Choose a server below to configure separate welcome text, custom embed builder, standalone embed dispatching, and monitoring options.</div>
                    <div class="servers-grid">${guildsListHtml}</div>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.get('/dashboard/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) return res.send("Server not found or bot is not inside this guild!");

    const config = serverSettings[guildId] || {
        quickSetupConfig: 'Default setup profile active',
        botSettingsPrefix: '!',
        welcomeChannel: '',
        welcomeMessage: 'Hello {mention} and welcome to {server}!',
        embedChannel: '',
        embedTitle: 'Welcome Aboard!',
        embedDesc: 'Glad you arrived, {user(proper)}. Total members: {server(members)}.'
    };

    let customEmojisHtml = '';
    guild.emojis.cache.forEach(emoji => {
        const emojiTag = `<:${emoji.name}:${emoji.id}>`;
        customEmojisHtml += `
            <div class="emoji-item" onclick="insertEmoji('${emojiTag}', 'welcomeMsgInput')" title=":${emoji.name}:">
                <img src="https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}" alt="${emoji.name}">
            </div>
        `;
    });

    if (!customEmojisHtml) {
        customEmojisHtml = `<div class="empty-emojis" style="grid-column: 1/-1; text-align:center; color:#9492a2; font-size:12px; padding:10px;">No custom emojis found.</div>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>VOID.GG - ${guild.name} Management</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                :root {
                  --bg-image: url('https://files.catbox.moe/y08zjc.png');
                  --accent-purple: #b388ff;
                  --accent-glow: rgba(179, 136, 255, 0.4);
                  --purple-border: rgba(179, 136, 255, 0.2);
                  --dark-glass: rgba(16, 17, 26, 0.95);
                  --sidebar-width: 280px;
                }
                * { font-family: 'Plus Jakarta Sans', sans-serif !important; box-sizing: border-box; }
                body, html {
                  margin: 0; padding: 0; height: 100vh; overflow: hidden;
                  background: var(--bg-image) center/cover no-repeat fixed !important;
                  color: #fff;
                }
                .app-layout { display: flex; height: 100vh; width: 100vw; }
                .sidebar {
                  width: var(--sidebar-width); background: rgba(10, 11, 18, 0.92);
                  backdrop-filter: blur(20px); border-right: 1px solid var(--purple-border);
                  display: flex; flex-direction: column; padding: 20px; z-index: 10;
                  overflow-y: auto; flex-shrink: 0;
                }
                .sidebar::-webkit-scrollbar { width: 4px; }
                .sidebar::-webkit-scrollbar-thumb { background: var(--purple-border); border-radius: 4px; }
                .sidebar-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--purple-border); }
                .guild-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-purple); }
                .guild-title-box { overflow: hidden; }
                .guild-title { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .guild-sub { font-size: 11px; color: var(--accent-purple); font-weight: 600; }
                .nav-category { font-size: 11px; font-weight: 800; color: #727083; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px 10px; }
                .nav-links { display: flex; flex-direction: column; gap: 4px; }
                .nav-item {
                  display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px;
                  color: #9492a2; text-decoration: none; font-size: 13px; font-weight: 600; cursor: pointer;
                  transition: all 0.2s ease; border: 1px solid transparent;
                }
                .nav-item:hover, .nav-item.active {
                  background: rgba(179, 136, 255, 0.1); color: var(--accent-purple);
                  border-color: var(--purple-border); box-shadow: 0 0 15px rgba(179, 136, 255, 0.1);
                }
                .back-picker {
                  margin-top: 25px; padding: 12px; border-top: 1px solid var(--purple-border);
                  color: #ff6b6b; text-decoration: none; font-weight: 600; font-size: 13px;
                  display: flex; align-items: center; gap: 8px; transition: 0.2s; text-align: center; justify-content: center;
                }
                .back-picker:hover { opacity: 0.8; }
                .workspace { flex-grow: 1; height: 100vh; overflow-y: auto; padding: 30px; display: flex; justify-content: center; }
                .content-container { width: 100%; max-width: 1150px; }
                .panel-card { display: none; }
                .panel-card.active { display: block; animation: fadeIn 0.3s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
                @media (max-width: 950px) { .dual-grid { grid-template-columns: 1fr; } }
                .sub-box {
                  background: rgba(22, 23, 35, 0.85); backdrop-filter: blur(20px);
                  border: 1px solid var(--purple-border); border-radius: 18px; padding: 28px;
                  box-shadow: 0 15px 35px rgba(0,0,0,0.4); margin-bottom: 24px;
                }
                .sub-box-header { font-size: 11px; font-weight: 800; color: var(--accent-purple); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 14px; }
                .box-title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 8px; }
                .box-desc { font-size: 13px; color: #9492a2; line-height: 1.5; margin-bottom: 20px; }
                .form-group { margin-bottom: 20px; }
                label { display: block; font-size: 12px; font-weight: 700; color: #b0a8c0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                input, textarea, select {
                  width: 100%; padding: 13px 16px; background: rgba(12, 13, 20, 0.7);
                  border: 1px solid var(--purple-border); border-radius: 12px; color: #fff; font-size: 14px;
                  transition: all 0.2s;
                }
                input:focus, textarea:focus, select:focus { border-color: var(--accent-purple); outline: none; box-shadow: 0 0 15px var(--accent-glow); background: rgba(18, 19, 30, 0.9); }
                .save-btn {
                  background: #00b0f4; color: #fff; font-weight: 700; border: none;
                  padding: 12px 26px; border-radius: 10px; cursor: pointer; font-size: 14px;
                  box-shadow: 0 4px 15px rgba(0, 176, 244, 0.3); transition: all 0.2s;
                }
                .save-btn:hover { background: #0095d1; transform: translateY(-1px); }
                .secondary-action-btn {
                  background: rgba(179, 136, 255, 0.1); border: 1px solid var(--purple-border); color: #fff;
                  width: 100%; padding: 12px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer;
                  transition: 0.2s; text-align: center; margin-top: 5px;
                }
                .secondary-action-btn:hover { background: rgba(179, 136, 255, 0.2); }
                .emoji-picker-container {
                  background: rgba(12, 13, 20, 0.9); border: 1px solid var(--purple-border);
                  border-radius: 12px; padding: 14px; margin-top: 10px; margin-bottom: 15px;
                }
                .emoji-picker-tabs { display: flex; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid var(--purple-border); padding-bottom: 8px; }
                .emoji-tab-btn { background: none; border: none; color: #9492a2; font-weight: 700; font-size: 12px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
                .emoji-tab-btn.active { background: rgba(179, 136, 255, 0.2); color: var(--accent-purple); }
                .emoji-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); gap: 6px; max-height: 130px; overflow-y: auto; padding: 4px; }
                .emoji-grid::-webkit-scrollbar { width: 3px; }
                .emoji-grid::-webkit-scrollbar-thumb { background: var(--purple-border); border-radius: 3px; }
                .emoji-item {
                  background: rgba(25, 26, 40, 0.6); border: 1px solid rgba(255,255,255,0.05);
                  border-radius: 8px; height: 38px; display: flex; align-items: center; justify-content: center;
                  cursor: pointer; transition: 0.2s; font-size: 18px; overflow: hidden;
                }
                .emoji-item:hover { background: rgba(179, 136, 255, 0.25); border-color: var(--accent-purple); transform: scale(1.08); }
                .emoji-item img { width: 22px; height: 22px; object-fit: contain; }
                .save-alert {
                  background: rgba(46, 213, 115, 0.15); border: 1px solid rgba(46, 213, 115, 0.3);
                  color: #2ed573; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600;
                  margin-bottom: 25px; display: none; align-items: center; gap: 10px;
                }
                .embed-builder-section { display: none; margin-top: 15px; border-top: 1px solid var(--purple-border); padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="app-layout">
                <div class="sidebar">
                    <div class="sidebar-brand">
                        <img src="${guild.iconURL({ dynamic: true, size: 128 }) || 'https://files.catbox.moe/y08zjc.png'}" class="guild-avatar">
                        <div class="guild-title-box">
                            <div class="guild-title">${guild.name}</div>
                            <div class="guild-sub">Active Node</div>
                        </div>
                    </div>
                    <div class="nav-category">Settings</div>
                    <div class="nav-links">
                        <div class="nav-item" onclick="switchTab('quick-setup', this)">Quick Setup</div>
                        <div class="nav-item" onclick="switchTab('bot-settings', this)">Bot Settings</div>
                    </div>
                    <div class="nav-category">Interactive & Welcomes</div>
                    <div class="nav-links">
                        <div class="nav-item active" onclick="switchTab('greetings', this)">Greetings & Embeds</div>
                        <div class="nav-item" onclick="switchTab('standalone-embeds', this)">Embed Dispatcher</div>
                    </div>
                    <a href="/" class="back-picker">&larr; Switch Server</a>
                </div>
                <div class="workspace">
                    <div class="content-container">
                        <div id="saveAlert" class="save-alert">✅ Configurations successfully saved!</div>
                        
                        <!-- Quick Setup Panel -->
                        <div id="quick-setup" class="panel-card">
                            <form action="/dashboard/${guildId}/save" method="POST">
                                <div class="sub-box">
                                    <div class="sub-box-header">Quick Setup</div>
                                    <div class="box-title">Preset Profiles</div>
                                    <div class="form-group">
                                        <label>Preset Config</label>
                                        <input type="text" name="quickSetupConfig" value="${config.quickSetupConfig}">
                                    </div>
                                    <button type="submit" class="save-btn">Save</button>
                                </div>
                            </form>
                        </div>

                        <!-- Bot Settings Panel -->
                        <div id="bot-settings" class="panel-card">
                            <form action="/dashboard/${guildId}/save" method="POST">
                                <div class="sub-box">
                                    <div class="sub-box-header">Bot Settings</div>
                                    <div class="box-title">Core Execution</div>
                                    <div class="form-group">
                                        <label>Command Prefix</label>
                                        <input type="text" name="botSettingsPrefix" value="${config.botSettingsPrefix}">
                                    </div>
                                    <button type="submit" class="save-btn">Save</button>
                                </div>
                            </form>
                        </div>

                        <!-- Greetings & Embeds Panel -->
                        <div id="greetings" class="panel-card active">
                            <form action="/dashboard/${guildId}/save" method="POST">
                                <div class="dual-grid">
                                    <!-- Standard Welcome Text Box -->
                                    <div class="sub-box">
                                        <div class="sub-box-header">Standard Welcome Text</div>
                                        <div class="box-title">Plain Message Option</div>
                                        <div class="box-desc">Sends a regular text message on user join, separate from the rich embed builder.</div>
                                        <div class="form-group">
                                            <label>Welcome Channel ID</label>
                                            <input type="text" name="welcomeChannel" value="${config.welcomeChannel}" placeholder="e.g., 104928394857621094">
                                        </div>
                                        <div class="form-group">
                                            <label>Welcome Text Message</label>
                                            <textarea id="welcomeMsgInput" name="welcomeMessage" rows="3">${config.welcomeMessage}</textarea>
                                        </div>
                                        <div class="emoji-picker-container">
                                            <div class="emoji-picker-tabs">
                                                <button type="button" class="emoji-tab-btn active" onclick="switchEmojiTab(event, 'customEmojis')">Server Emojis</button>
                                                <button type="button" class="emoji-tab-btn" onclick="switchEmojiTab(event, 'standardEmojis')">Standard Emojis</button>
                                            </div>
                                            <div id="customEmojis" class="emoji-tab-content">
                                                <div class="emoji-grid">${customEmojisHtml}</div>
                                            </div>
                                            <div id="standardEmojis" class="emoji-tab-content" style="display:none;">
                                                <div class="emoji-grid">
                                                    <div class="emoji-item" onclick="insertEmoji('👋', 'welcomeMsgInput')">👋</div>
                                                    <div class="emoji-item" onclick="insertEmoji('🎉', 'welcomeMsgInput')">🎉</div>
                                                    <div class="emoji-item" onclick="insertEmoji('❤️', 'welcomeMsgInput')">❤️</div>
                                                    <div class="emoji-item" onclick="insertEmoji('🚀', 'welcomeMsgInput')">🚀</div>
                                                    <div class="emoji-item" onclick="insertEmoji('🔥', 'welcomeMsgInput')">🔥</div>
                                                    <div class="emoji-item" onclick="insertEmoji('⭐', 'welcomeMsgInput')">⭐</div>
                                                </div>
                                            </div>
                                        </div>
                                        <button type="submit" class="save-btn">Save Text Settings</button>
                                    </div>

                                    <!-- Standalone Welcome Embed Box -->
                                    <div class="sub-box">
                                        <div class="sub-box-header">Advanced Builder</div>
                                        <div class="box-title">Welcome Embed Option</div>
                                        <div class="box-desc">Configure a completely separate gorgeous embedded card sent upon member joins.</div>
                                        <button type="button" class="secondary-action-btn" onclick="toggleEmbedBuilder()" style="margin-bottom: 15px;">Show embed builder options</button>
                                        
                                        <div id="embedBuilderSection" class="embed-builder-section">
                                            <div class="form-group">
                                                <label>Embed Channel ID</label>
                                                <input type="text" name="embedChannel" value="${config.embedChannel || ''}" placeholder="e.g. 104928394857621094">
                                            </div>
                                            <div class="form-group">
                                                <label>Embed Title</label>
                                                <input id="embedTitleInput" type="text" name="embedTitle" value="${config.embedTitle}">
                                            </div>
                                            <div class="form-group">
                                                <label>Embed Description</label>
                                                <textarea id="embedDescInput" name="embedDesc" rows="3">${config.embedDesc}</textarea>
                                            </div>
                                            <div class="emoji-picker-container">
                                                <div class="emoji-picker-tabs">
                                                    <button type="button" class="emoji-tab-btn active" onclick="switchEmojiTab(event, 'customEmbedEmojis')">Server Emojis</button>
                                                    <button type="button" class="emoji-tab-btn" onclick="switchEmojiTab(event, 'standardEmbedEmojis')">Standard Emojis</button>
                                                </div>
                                                <div id="customEmbedEmojis" class="emoji-tab-content">
                                                    <div class="emoji-grid">${customEmojisHtml.replace(/welcomeMsgInput/g, 'embedDescInput')}</div>
                                                </div>
                                                <div id="standardEmbedEmojis" class="emoji-tab-content" style="display:none;">
                                                    <div class="emoji-grid">
                                                        <div class="emoji-item" onclick="insertEmoji('👋', 'embedDescInput')">👋</div>
                                                        <div class="emoji-item" onclick="insertEmoji('🎉', 'embedDescInput')">🎉</div>
                                                        <div class="emoji-item" onclick="insertEmoji('❤️', 'embedDescInput')">❤️</div>
                                                        <div class="emoji-item" onclick="insertEmoji('🚀', 'embedDescInput')">🚀</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style="margin-top: 15px;">
                                            <button type="submit" class="save-btn">Save Embed Settings</button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <!-- Standalone Embed Dispatcher Panel -->
                        <div id="standalone-embeds" class="panel-card">
                            <div class="sub-box" style="max-width: 600px; margin: 0 auto;">
                                <div class="sub-box-header">Standalone Embed Generator</div>
                                <div class="box-title">Send Custom Embeds</div>
                                <div class="box-desc">Create and dispatch an independent custom embed message to any specific channel instantly.</div>
                                <form action="/dashboard/${guildId}/send-embed" method="POST">
                                    <div class="form-group">
                                        <label>Target Channel ID</label>
                                        <input type="text" name="targetChannel" placeholder="e.g. 104928394857621094" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Embed Title</label>
                                        <input type="text" name="customTitle" placeholder="Announcement Title">
                                    </div>
                                    <div class="form-group">
                                        <label>Embed Description</label>
                                        <textarea id="standaloneDescInput" name="customDesc" rows="3" placeholder="Embed body content..."></textarea>
                                    </div>
                                    <div class="emoji-picker-container">
                                        <div class="emoji-picker-tabs">
                                            <button type="button" class="emoji-tab-btn active" onclick="switchEmojiTab(event, 'customStandaloneEmojis')">Server Emojis</button>
                                            <button type="button" class="emoji-tab-btn" onclick="switchEmojiTab(event, 'standardStandaloneEmojis')">Standard Emojis</button>
                                        </div>
                                        <div id="customStandaloneEmojis" class="emoji-tab-content">
                                            <div class="emoji-grid">${customEmojisHtml.replace(/welcomeMsgInput/g, 'standaloneDescInput')}</div>
                                        </div>
                                        <div id="standardStandaloneEmojis" class="emoji-tab-content" style="display:none;">
                                            <div class="emoji-grid">
                                                <div class="emoji-item" onclick="insertEmoji('👋', 'standaloneDescInput')">👋</div>
                                                <div class="emoji-item" onclick="insertEmoji('🎉', 'standaloneDescInput')">🎉</div>
                                                <div class="emoji-item" onclick="insertEmoji('❤️', 'standaloneDescInput')">❤️</div>
                                                <div class="emoji-item" onclick="insertEmoji('🚀', 'standaloneDescInput')">🚀</div>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" class="save-btn" style="background: #7289da; width: 100%; margin-top: 10px;">Send Embed Now</button>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <script>
                function switchTab(tabId, element) {
                    document.querySelectorAll('.panel-card').forEach(card => card.classList.remove('active'));
                    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                    document.getElementById(tabId).classList.add('active');
                    element.classList.add('active');
                }
                function insertEmoji(emojiText, targetId) {
                    const textarea = document.getElementById(targetId);
                    if (!textarea) return;
                    const startPos = textarea.selectionStart;
                    const endPos = textarea.selectionEnd;
                    const textVal = textarea.value;
                    textarea.value = textVal.substring(0, startPos) + emojiText + textVal.substring(endPos, textVal.length);
                    textarea.focus();
                    textarea.selectionStart = startPos + emojiText.length;
                    textarea.selectionEnd = startPos + emojiText.length;
                }
                function switchEmojiTab(evt, tabName) {
                    const container = evt.target.closest('.emoji-picker-container');
                    container.querySelectorAll('.emoji-tab-content').forEach(el => el.style.display = 'none');
                    container.querySelectorAll('.emoji-tab-btn').forEach(btn => btn.classList.remove('active'));
                    container.querySelector('#' + tabName).style.display = 'block';
                    evt.currentTarget.classList.add('active');
                }
                function toggleEmbedBuilder() {
                    const section = document.getElementById('embedBuilderSection');
                    section.style.display = section.style.display === 'block' ? 'none' : 'block';
                }
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('saved')) {
                    const alertBox = document.getElementById('saveAlert');
                    alertBox.style.display = 'flex';
                    setTimeout(() => { alertBox.style.display = 'none'; }, 4000);
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/dashboard/:guildId/save', (req, res) => {
    const guildId = req.params.guildId;
    serverSettings[guildId] = { ...serverSettings[guildId], ...req.body };
    res.redirect(`/dashboard/${guildId}?saved=true`);
});

app.post('/dashboard/:guildId/send-embed', async (req, res) => {
    const guildId = req.params.guildId;
    const { targetChannel, customTitle, customDesc } = req.body;
    
    const guild = discordClient.guilds.cache.get(guildId);
    if (guild && targetChannel) {
        const channel = guild.channels.cache.get(targetChannel);
        if (channel) {
            await channel.send({
                embeds: [{
                    title: customTitle || 'Notification',
                    description: customDesc || '',
                    color: 0xb388ff,
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => {});
        }
    }
    res.redirect(`/dashboard/${guildId}?saved=true`);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');
    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.REDIRECT_URI,
            }),
        });
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
            res.cookie('discord_token', tokenData.access_token, { httpOnly: true });
        }
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('discord_token');
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`🌐 Next-Gen Web Panel online at http://localhost:${PORT}`);
});

// ==========================================
// 2. DISCORD BOT RUNTIME & COMMAND REGISTRATION
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

discordClient = client;

// Member Greeting Listener with distinct text vs embed settings & specific Channel IDs
client.on('guildMemberAdd', async member => {
    const config = serverSettings[member.guild.id];
    if (!config) return;

    const galactusProperName = `${member.user.username}#${member.user.discriminator === '0' ? '0000' : member.user.discriminator}`;

    // Plain message channel
    if (config.welcomeChannel) {
        const channel = member.guild.channels.cache.get(config.welcomeChannel);
        if (channel) {
            let text = (config.welcomeMessage || 'Hello {mention}!')
                .replace(/{mention}/g, `<@${member.id}>`)
                .replace(/{server}/g, member.guild.name)
                .replace(/{user\(proper\)}/g, galactusProperName)
                .replace(/{server\(members\)}/g, member.guild.memberCount);
            await channel.send({ content: text }).catch(() => {});
        }
    }

    // Embed Message Channel ID support
    if (config.embedChannel) {
        const embedChan = member.guild.channels.cache.get(config.embedChannel);
        if (embedChan) {
            let title = (config.embedTitle || '')
                .replace(/{mention}/g, `<@${member.id}>`)
                .replace(/{server}/g, member.guild.name)
                .replace(/{user\(proper\)}/g, galactusProperName)
                .replace(/{server\(members\)}/g, member.guild.memberCount);

            let desc = (config.embedDesc || '')
                .replace(/{mention}/g, `<@${member.id}>`)
                .replace(/{server}/g, member.guild.name)
                .replace(/{user\(proper\)}/g, galactusProperName)
                .replace(/{server\(members\)}/g, member.guild.memberCount);

            await embedChan.send({
                embeds: [{
                    title: title,
                    description: desc,
                    color: 0xb388ff,
                    footer: { text: `Member Count: ${member.guild.memberCount}` }
                }]
            }).catch(() => {});
        }
    }
});

// Complete Slash Commands Collection Array with Full Working Logic Support
const commandsList = [
    new SlashCommandBuilder().setName('ban').setDescription('Ban a user from the server')
        .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for ban'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    new SlashCommandBuilder().setName('unban').setDescription('Unban a user by ID')
        .addStringOption(o => o.setName('userid').setDescription('Discord User ID').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    new SlashCommandBuilder().setName('kick').setDescription('Kick a user from the server')
        .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for kick'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    new SlashCommandBuilder().setName('timeout').setDescription('Timeout a user')
        .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
        .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for timeout'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a user')
        .addUserOption(o => o.setName('user').setDescription('User to remove timeout from').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    new SlashCommandBuilder().setName('warn').setDescription('Issue a warning to a user')
        .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    new SlashCommandBuilder().setName('warnings').setDescription('Check active warnings for a user')
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)),
    
    new SlashCommandBuilder().setName('clear').setDescription('Purge messages from a channel')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    new SlashCommandBuilder().setName('slowmode').setDescription('Set channel slowmode')
        .addIntegerOption(o => o.setName('seconds').setDescription('Slowmode delay in seconds (0 to disable)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    new SlashCommandBuilder().setName('lock').setDescription('Lock the current text channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    new SlashCommandBuilder().setName('unlock').setDescription('Unlock the current text channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder().setName('nuke').setDescription('Delete and recreate the current channel to wipe all messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    new SlashCommandBuilder().setName('help').setDescription('List all available bot commands and info'),
    
    new SlashCommandBuilder().setName('ping').setDescription('Check bot network latency and response time'),
    
    new SlashCommandBuilder().setName('uptime').setDescription('Check how long the bot has been continuously running'),
    
    new SlashCommandBuilder().setName('botinfo').setDescription('Display detailed system statistics and information about VOID.GG'),
    
    new SlashCommandBuilder().setName('stats').setDescription('Display current server cluster performance metrics'),
    
    new SlashCommandBuilder().setName('invite').setDescription('https://discord.com/oauth2/authorize?client_id=1537088326287364156&permissions=8&integration_type=0&scope=bot'),
    
    new SlashCommandBuilder().setName('support').setDescription('https://dsc.gg/voidlol')
].map(command => command.toJSON());

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, channel, user } = interaction;

    try {
        if (commandName === 'ban') {
            const targetUser = options.getUser('user');
            const reason = options.getString('reason') || 'No reason provided';
            const member = await guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
            if (!member.bannable) return interaction.reply({ content: '❌ I cannot ban this user (Missing permissions or role hierarchy issue).', ephemeral: true });

            await guild.members.ban(targetUser, { reason });
            return interaction.reply({ content: `✅ Successfully banned **${targetUser.tag}**. Reason: ${reason}` });
        }

        if (commandName === 'unban') {
            const userId = options.getString('userid');
            await guild.members.unban(userId).catch(() => null);
            return interaction.reply({ content: `✅ Successfully unbanned user ID: \`${userId}\`.` });
        }

        if (commandName === 'kick') {
            const targetUser = options.getUser('user');
            const reason = options.getString('reason') || 'No reason provided';
            const member = await guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
            if (!member.kickable) return interaction.reply({ content: '❌ I cannot kick this user.', ephemeral: true });

            await member.kick(reason);
            return interaction.reply({ content: `✅ Successfully kicked **${targetUser.tag}**. Reason: ${reason}` });
        }

        if (commandName === 'timeout') {
            const targetUser = options.getUser('user');
            const minutes = options.getInteger('minutes');
            const reason = options.getString('reason') || 'No reason provided';
            const member = await guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
            
            const durationMs = minutes * 60 * 1000;
            await member.timeout(durationMs, reason);
            return interaction.reply({ content: `✅ Successfully timed out **${targetUser.tag}** for **${minutes} minute(s)**. Reason: ${reason}` });
        }

        if (commandName === 'untimeout') {
            const targetUser = options.getUser('user');
            const member = await guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
            await member.timeout(null);
            return interaction.reply({ content: `✅ Successfully removed timeout from **${targetUser.tag}**.` });
        }

        if (commandName === 'warn') {
            const targetUser = options.getUser('user');
            const reason = options.getString('reason');

            if (!serverWarnings[guild.id]) serverWarnings[guild.id] = {};
            if (!serverWarnings[guild.id][targetUser.id]) serverWarnings[guild.id][targetUser.id] = [];

            serverWarnings[guild.id][targetUser.id].push({
                reason,
                moderator: user.tag,
                date: new Date().toLocaleDateString()
            });

            const totalWarns = serverWarnings[guild.id][targetUser.id].length;
            return interaction.reply({ content: `⚠️ Warned **${targetUser.tag}**. Total Warnings: **${totalWarns}**. Reason: ${reason}` });
        }

        if (commandName === 'warnings') {
            const targetUser = options.getUser('user');
            const warns = serverWarnings[guild.id]?.[targetUser.id] || [];

            if (warns.length === 0) {
                return interaction.reply({ content: `✅ **${targetUser.tag}** has no active warnings.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Warnings for ${targetUser.tag}`)
                .setColor(0xb388ff)
                .setDescription(warns.map((w, idx) => `**${idx + 1}.** Reason: *${w.reason}* (Moderator: ${w.moderator})`).join('\n'));

            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'clear') {
            const amount = options.getInteger('amount');
            if (amount < 1 || amount > 100) {
                return interaction.reply({ content: '❌ Please specify an amount between 1 and 100.', ephemeral: true });
            }

            const deleted = await channel.bulkDelete(amount, true).catch(() => null);
            if (!deleted) return interaction.reply({ content: '❌ Failed to delete messages. They might be older than 14 days.', ephemeral: true });
            
            return interaction.reply({ content: `🧹 Successfully deleted **${deleted.size}** message(s).`, ephemeral: true });
        }

        if (commandName === 'slowmode') {
            const seconds = options.getInteger('seconds');
            await channel.setRateLimitPerUser(seconds);
            return interaction.reply({ content: `⏳ Channel slowmode set to **${seconds} second(s)**.` });
        }

        if (commandName === 'lock') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            return interaction.reply({ content: `🔒 Channel has been locked.` });
        }

        if (commandName === 'unlock') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            return interaction.reply({ content: `🔓 Channel has been unlocked.` });
        }

        if (commandName === 'nuke') {
            if (!channel.manageable) {
                return interaction.reply({ content: '❌ I do not have permission to manage this channel.', ephemeral: true });
            }

            const position = channel.position;
            const parent = channel.parentId;
            const topic = channel.topic;
            const rateLimit = channel.rateLimitPerUser;

            const cloned = await channel.clone({
                reason: `Channel nuked by ${user.tag}`
            });

            await cloned.setPosition(position);
            await cloned.setParent(parent);
            await cloned.setTopic(topic);
            await cloned.setRateLimitPerUser(rateLimit);

            await channel.delete().catch(() => {});

            return cloned.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('💥 Channel Nuked')
                        .setDescription(`This channel has been wiped and reset by **${user.tag}**`)
                        .setColor(0xff6b6b)
                        .setTimestamp()
                ]
            }).catch(() => {});
        }

        if (commandName === 'ping') {
            const ping = client.ws.ping;
            return interaction.reply({ content: `🏓 Pong! Latency is **${ping}ms**.` });
        }

        if (commandName === 'uptime') {
            const totalSeconds = Math.floor(client.uptime / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return interaction.reply({ content: `⏱️ Uptime: **${hours}h ${minutes}m ${seconds}s**.` });
        }

        if (commandName === 'botinfo') {
            const embed = new EmbedBuilder()
                .setTitle('VOID.GG Suite Information')
                .setColor(0xb388ff)
                .setDescription('Next-generation automated server protection, moderation, and embed management suite.')
                .addFields(
                    { name: 'Developer Cluster', value: 'VOID.GG Core Team', inline: true },
                    { name: 'Library', value: 'Discord.js v14', inline: true },
                    { name: 'Active Servers', value: `${client.guilds.cache.size}`, inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'stats') {
            const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            return interaction.reply({ content: `📊 Cluster Memory Usage: **${memoryUsage} MB** | Guilds Connected: **${client.guilds.cache.size}**` });
        }

        if (commandName === 'invite') {
            return interaction.reply({ content: `🔗 Invite VOID.GG to your server using our secure oauth dashboard link.` });
        }

        if (commandName === 'support') {
            return interaction.reply({ content: `💬 Join our official support network anytime through our web panel dashboard.` });
        }

        if (commandName === 'help') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ VOID.GG Command Directory')
                .setColor(0xb388ff)
                .setDescription('Here are all the fully operational live commands available across your cluster:')
                .addFields(
                    { name: '🛡️ Moderation', value: '`/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clear`, `/slowmode`, `/lock`, `/unlock`, `/nuke`', inline: false },
                    { name: 'ℹ️ Utility & Info', value: '`/help`, `/ping`, `/uptime`, `/botinfo`, `/stats`, `/invite`, `/support`', inline: false }
                );
            return interaction.reply({ embeds: [embed] });
        }

    } catch (err) {
        console.error(err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An error occurred while processing this command.', ephemeral: true }).catch(() => {});
        }
    }
});

client.once('ready', async () => {
    console.log(`✅ Logged in as real bot: ${client.user.tag}! Registering commands...`);
    
    const updatePresence = () => {
        const guildCount = client.guilds.cache.size;
        client.user.setActivity(`over ${guildCount} servers`, { type: ActivityType.Watching });
    };
    updatePresence();
    setInterval(updatePresence, 30000);

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsList });
        console.log(`Successfully registered all real slash commands globally!`);
    } catch (e) {
        console.error(e);
    }
});

client.login(process.env.BOT_TOKEN);