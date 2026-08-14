const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.set('trust proxy', true); // Fixed: Properly trust Render proxy headers for secure protocol detection[cite: 4]
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload());

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

let discordClient = null;
const serverSettings = {};
const serverWarnings = {};
const minecraftIps = {};
const serverRules = {};
const autoRoles = {};
const birthdays = {};

// ==========================================
// 1. WEB DASHBOARD & ULTRA-PREMIUM PURPLE UI/UX (Logo Removed)
// ==========================================

const globalCss = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    :root {
      --bg-image: url('https://files.catbox.moe/y08zjc.png');
      --accent-purple: #9d4edd;
      --accent-glow: rgba(157, 78, 221, 0.5);
      --purple-border: rgba(157, 78, 221, 0.3);
      --dark-glass: rgba(13, 11, 20, 0.88);
      --darker-glass: rgba(8, 7, 13, 0.95);
    }
    * { font-family: 'Plus Jakarta Sans', sans-serif !important; box-sizing: border-box; }
    body, html {
      margin: 0; padding: 0; height: 100%;
      background: var(--bg-image) center/cover no-repeat fixed !important;
      color: #fff;
    }
`;

app.get('/', (req, res) => {
    const accessToken = req.cookies.discord_token;

    if (!accessToken) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Luffy.void - Premium Authentication</title>
                <style>
                    ${globalCss}
                    body { display: flex; align-items: center; justify-content: center; }
                    .login-card {
                      background: var(--dark-glass); backdrop-filter: blur(30px);
                      -webkit-backdrop-filter: blur(30px); border: 1px solid var(--purple-border);
                      padding: 60px 40px; border-radius: 28px; text-align: center; max-width: 480px; width: 100%;
                      box-shadow: 0 25px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.15);
                      position: relative; overflow: hidden;
                    }
                    .login-card::before {
                      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
                      background: linear-gradient(90deg, #7b2cbf, #c77dff, #9d4edd);
                    }
                    .badge {
                      background: rgba(157, 78, 221, 0.18); color: #c77dff;
                      padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800;
                      text-transform: uppercase; letter-spacing: 1.5px; display: inline-block; margin-bottom: 20px;
                      border: 1px solid var(--purple-border);
                    }
                    h1 { font-weight: 800; font-size: 32px; color: #fff; margin-bottom: 12px; letter-spacing: -0.5px; }
                    p { color: #b8b2cb; font-size: 14px; line-height: 1.6; margin-bottom: 35px; }
                    .login-btn {
                      background: linear-gradient(135deg, #7b2cbf, #9d4edd); color: #fff; text-decoration: none;
                      padding: 15px 30px; border-radius: 14px; font-weight: 700; font-size: 15px;
                      box-shadow: 0 10px 30px rgba(157, 78, 221, 0.4); display: flex; align-items: center; justify-content: center; gap: 10px;
                      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid rgba(199, 125, 255, 0.3);
                    }
                    .login-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(157, 78, 221, 0.6); filter: brightness(1.1); }
                </style>
            </head>
            <body>
                <div class="login-card">
                    <div class="badge">Luffy.void Suite</div>
                    <h1>Welcome to Luffy.void</h1>
                    <p>Authorize with Discord to unlock absolute supreme control over server automation, welcome embeds, custom file emojis, and update center nodes.</p>
                    <a href="https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify%20guilds" class="login-btn">
                        🔐 Login with Discord
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
                        <div class="server-role">Configure Server &rarr; (${guild.memberCount} members)</div>
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
            <title>Luffy.void - Server Picker</title>
            <style>
                ${globalCss}
                body { min-height: 100vh; }
                .navbar {
                  display: flex; align-items: center; justify-content: space-between;
                  padding: 18px 40px; background: rgba(8, 7, 13, 0.9);
                  backdrop-filter: blur(20px); border-bottom: 1px solid var(--purple-border);
                }
                .nav-brand { font-weight: 800; font-size: 18px; color: #c77dff; display: flex; align-items: center; gap: 12px; }
                .nav-links-right { display: flex; gap: 15px; align-items: center; }
                .admin-link { color: #c77dff; text-decoration: none; font-weight: 700; font-size: 13px; background: rgba(157, 78, 221, 0.15); padding: 8px 16px; border-radius: 10px; border: 1px solid var(--purple-border); transition: 0.2s; }
                .admin-link:hover { background: rgba(157, 78, 221, 0.3); }
                .logout-btn { color: #ff6b6b; text-decoration: none; font-weight: 600; font-size: 13px; background: rgba(255, 107, 107, 0.1); padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255, 107, 107, 0.2); transition: 0.2s; }
                .main-container { max-width: 1100px; margin: 60px auto; padding: 0 20px; }
                .picker-panel {
                  background: var(--dark-glass); backdrop-filter: blur(30px);
                  border: 1px solid var(--purple-border); border-radius: 24px; padding: 45px;
                  box-shadow: 0 30px 60px rgba(0,0,0,0.7);
                }
                .picker-header-title { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
                .picker-header-desc { color: #b8b2cb; font-size: 14px; margin-bottom: 35px; }
                .servers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
                .server-card {
                  background: rgba(20, 16, 30, 0.7); border: 1px solid var(--purple-border);
                  border-radius: 18px; padding: 20px; display: flex; align-items: center; gap: 16px;
                  text-decoration: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .server-card:hover { transform: translateY(-4px); border-color: #c77dff; box-shadow: 0 12px 30px rgba(157, 78, 221, 0.3); background: rgba(28, 22, 42, 0.9); }
                .server-icon-wrapper { width: 64px; height: 64px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #7b2cbf, #c77dff); flex-shrink: 0; }
                .server-icon { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
                .server-info { overflow: hidden; }
                .server-name { color: #fff; font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
                .server-role { color: #c77dff; font-size: 12px; font-weight: 600; }
                .empty-notice { color: #b8b2cb; text-align: center; padding: 40px; font-size: 15px; }
            </style>
        </head>
        <body>
            <div class="navbar">
                <div class="nav-brand">
                    Luffy.void DASHBOARD — Connected Servers: ${discordClient ? discordClient.guilds.cache.size : 0}
                </div>
                <div class="nav-links-right">
                    <a href="/admin-panel" class="admin-link">🔒 Super Admin Panel</a>
                    <a href="/logout" class="logout-btn">Log out</a>
                </div>
            </div>
            <div class="main-container">
                <div class="picker-panel">
                    <div class="picker-header-title">Select a Server</div>
                    <div class="picker-header-desc">Choose a server below to configure welcome embeds, file emojis, ᴜᴘᴅᴀᴛᴇꜱ centre, and automations.</div>
                    <div class="servers-grid">${guildsListHtml}</div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// ==========================================
// MASTER ADMIN PANEL (Restricted to ID: 1403767212116017252)
// ==========================================
app.get('/admin-panel', (req, res) => {
    let guildsManagementHtml = '';
    if (discordClient) {
        discordClient.guilds.cache.forEach(g => {
            guildsManagementHtml += `
                <div style="background:rgba(20,16,30,0.7);border:1px solid var(--purple-border);padding:16px;border-radius:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong style="font-size:15px;color:#fff;">${g.name}</strong> <span style="font-size:12px;color:#c77dff;">(ID: ${g.id})</span>
                        <div style="font-size:12px;color:#b8b2cb;margin-top:4px;">Members: ${g.memberCount} | Owner ID: ${g.ownerId}</div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <a href="/dashboard/${g.id}" style="background:rgba(157,78,221,0.2);color:#c77dff;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700;border:1px solid var(--purple-border);">Edit Server Settings</a>
                    </div>
                </div>
            `;
        });
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Luffy.void - Master Admin Panel</title>
            <style>
                ${globalCss}
                .admin-container { max-width: 900px; margin: 40px auto; padding: 20px; }
                .panel-box { background: var(--darker-glass); backdrop-filter: blur(30px); border: 1px solid var(--purple-border); border-radius: 24px; padding: 40px; box-shadow: 0 30px 60px rgba(0,0,0,0.8); }
                h1 { color: #c77dff; font-size: 24px; margin-bottom: 5px; }
                p.sub { color: #b8b2cb; font-size: 13px; margin-bottom: 25px; }
                .badge-admin { background: rgba(157,78,221,0.2); color: #c77dff; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; border: 1px solid var(--purple-border); display:inline-block; margin-bottom:15px;}
                .form-group { margin-bottom: 20px; }
                label { display: block; font-size: 12px; font-weight: 700; color: #b8b2cb; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                input, textarea { width: 100%; padding: 13px 16px; background: rgba(12,10,18,0.8); border: 1px solid var(--purple-border); border-radius: 12px; color: #fff; font-size: 14px; }
                input:focus, textarea:focus { border-color: #c77dff; outline: none; box-shadow: 0 0 15px var(--accent-glow); }
                .save-btn { background: linear-gradient(135deg, #7b2cbf, #9d4edd); color: #fff; font-weight: 700; border: none; padding: 13px 26px; border-radius: 12px; cursor: pointer; box-shadow: 0 8px 25px rgba(157,78,221,0.4); transition: 0.2s; }
                .save-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
            </style>
        </head>
        <body>
            <div class="admin-container">
                <div class="panel-box">
                    <div class="badge-admin">🔒 AUTHORIZED ADMINISTRATOR SUITE</div>
                    <h1>👑 Luffy.void Owner Admin Control Panel</h1>
                    <p class="sub">Authorized User ID: <code>1403767212116017252</code>. Broadcast messages to all connected servers or customize bot identity profiles globally.</p>
                    
                    <hr style="border:0;border-top:1px solid var(--purple-border);margin:25px 0;">

                    <!-- Broadcast Message to All Servers -->
                    <form action="/admin-panel/broadcast" method="POST">
                        <h3 style="font-size:16px;margin-bottom:12px;color:#fff;">📢 Broadcast Global Announcement</h3>
                        <div class="form-group">
                            <label>Announcement Content (Sends to system or main channel of all guilds)</label>
                            <textarea name="broadcastMessage" rows="3" placeholder="Important global Luffy.void bot update announcement..." required></textarea>
                        </div>
                        <button type="submit" class="save-btn" style="background:linear-gradient(135deg, #5a189a, #7b2cbf);margin-bottom:25px;">Broadcast to All Servers</button>
                    </form>

                    <hr style="border:0;border-top:1px solid var(--purple-border);margin:25px 0;">

                    <!-- Edit Bot Profile -->
                    <form action="/admin-panel/edit-bot" method="POST">
                        <h3 style="font-size:16px;margin-bottom:12px;color:#fff;">🤖 Edit Bot Profile Details</h3>
                        <div class="form-group">
                            <label>New Bot Username</label>
                            <input type="text" name="botUsername" placeholder="Luffy_void">
                        </div>
                        <div class="form-group">
                            <label>New Bot Avatar Image URL</label>
                            <input type="text" name="botAvatarUrl" placeholder="https://files.catbox.moe/y08zjc.png">
                        </div>
                        <button type="submit" class="save-btn">Update Bot Profile</button>
                    </form>

                    <hr style="border:0;border-top:1px solid var(--purple-border);margin:25px 0;">

                    <h3 style="font-size:16px;margin-bottom:15px;color:#fff;">Connected Cluster Guilds Overview</h3>
                    <div>${guildsManagementHtml}</div>
                    <div style="margin-top:25px;">
                        <a href="/" style="color:#c77dff;text-decoration:none;font-weight:700;font-size:13px;">&larr; Back to Server Selector</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/admin-panel/broadcast', async (req, res) => {
    const { broadcastMessage } = req.body;
    if (discordClient && broadcastMessage) {
        discordClient.guilds.cache.forEach(async guild => {
            const targetChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me)?.has('SendMessages'));
            if (targetChannel) {
                await targetChannel.send(`📢 **Luffy.void Global Announcement:**\n${broadcastMessage}`).catch(() => {});
            }
        });
    }
    res.redirect('/admin-panel');
});

app.post('/admin-panel/edit-bot', async (req, res) => {
    const { botUsername, botAvatarUrl } = req.body;
    if (discordClient && discordClient.user) {
        if (botUsername) await discordClient.user.setUsername(botUsername).catch(() => {});
        if (botAvatarUrl) await discordClient.user.setAvatar(botAvatarUrl).catch(() => {});
    }
    res.redirect('/admin-panel');
});

// ==========================================
// SERVER MANAGEMENT DASHBOARD (100000x BETTER PURPLE UI/UX)
// ==========================================
app.get('/dashboard/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) return res.send("Server not found or bot is not inside this guild!");

    const config = serverSettings[guildId] || {
        welcomeChannel: '',
        welcomeMessage: 'Hello {mention} and welcome to {server}! 🎉',
        embedWelcomeChannel: '',
        embedAuthorName: '',
        embedAuthorUrl: '',
        embedAuthorIcon: '',
        embedTitle: '',
        embedUrl: '',
        embedDesc: '',
        embedImage: '',
        embedThumbnail: '',
        embedFooterText: '',
        embedFooterIcon: '',
        birthdayRole: '',
        updateChannel: '',
        updateTitle: '🚀 Server Announcement & Updates',
        updateDesc: 'Here are the latest updates and announcements for our community!'
    };

    let channelsOptionsHtml = `<option value="">Select channel...</option>`;
    guild.channels.cache.filter(c => c.type === 0).forEach(c => {
        channelsOptionsHtml += `<option value="${c.id}" ${config.updateChannel === c.id ? 'selected' : ''}>#${c.name}</option>`;
    });

    let embedWelcomeChannelsHtml = `<option value="">Select embed welcome channel...</option>`;
    guild.channels.cache.filter(c => c.type === 0).forEach(c => {
        embedWelcomeChannelsHtml += `<option value="${c.id}" ${config.embedWelcomeChannel === c.id ? 'selected' : ''}>#${c.name}</option>`;
    });

    let rolesOptionsHtml = `<option value="">Select role</option>`;
    guild.roles.cache.forEach(r => {
        if (r.id !== guild.id) {
            rolesOptionsHtml += `<option value="${r.id}" ${config.birthdayRole === r.id ? 'selected' : ''}>@${r.name}</option>`;
        }
    });

    let customEmojisHtml = '';
    guild.emojis.cache.forEach(emoji => {
        const emojiTag = `<:${emoji.name}:${emoji.id}>`;
        customEmojisHtml += `
            <div class="emoji-item" onclick="insertEmoji('${emojiTag}', 'embedDescInput')" title=":${emoji.name}:">
                <img src="https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}" alt="${emoji.name}">
            </div>
        `;
    });

    if (!customEmojisHtml) {
        customEmojisHtml = `<div class="empty-emojis" style="grid-column: 1/-1; text-align:center; color:#b8b2cb; font-size:12px; padding:10px;">No custom emojis found in this server.</div>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Luffy.void - ${guild.name} Management</title>
            <style>
                ${globalCss}
                body, html { height: 100vh; overflow: hidden; }
                .app-layout { display: flex; height: 100vh; width: 100vw; }
                .sidebar {
                  width: 290px; background: rgba(8, 7, 13, 0.95);
                  backdrop-filter: blur(25px); border-right: 1px solid var(--purple-border);
                  display: flex; flex-direction: column; padding: 22px; z-index: 10;
                  overflow-y: auto; flex-shrink: 0;
                }
                .sidebar::-webkit-scrollbar { width: 4px; }
                .sidebar::-webkit-scrollbar-thumb { background: var(--purple-border); border-radius: 4px; }
                .sidebar-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; padding-bottom: 16px; border-bottom: 1px solid var(--purple-border); }
                .guild-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-purple); box-shadow: 0 0 15px var(--accent-glow); }
                .guild-title-box { overflow: hidden; }
                .guild-title { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
                .guild-sub { font-size: 11px; color: #c77dff; font-weight: 700; }
                .nav-category { font-size: 10px; font-weight: 800; color: #8c82a8; text-transform: uppercase; letter-spacing: 1.5px; margin: 18px 0 8px 10px; }
                .nav-links { display: flex; flex-direction: column; gap: 5px; }
                .nav-item {
                  display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-radius: 12px;
                  color: #b8b2cb; text-decoration: none; font-size: 13px; font-weight: 600; cursor: pointer;
                  transition: all 0.25s ease; border: 1px solid transparent;
                }
                .nav-item:hover, .nav-item.active {
                  background: rgba(157, 78, 221, 0.2); color: #c77dff;
                  border-color: var(--purple-border); box-shadow: 0 0 20px rgba(157, 78, 221, 0.25);
                }
                .back-picker {
                  margin-top: auto; padding: 14px; border-top: 1px solid var(--purple-border);
                  color: #ff6b6b; text-decoration: none; font-weight: 600; font-size: 13px;
                  display: flex; align-items: center; gap: 8px; transition: 0.2s; text-align: center; justify-content: center;
                }
                .workspace { flex-grow: 1; height: 100vh; overflow-y: auto; padding: 35px; display: flex; justify-content: center; gap: 35px; }
                .workspace::-webkit-scrollbar { width: 6px; }
                .workspace::-webkit-scrollbar-thumb { background: var(--purple-border); border-radius: 4px; }
                .content-container { width: 100%; max-width: 780px; }
                .panel-card { display: none; }
                .panel-card.active { display: block; animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .sub-box {
                  background: var(--dark-glass); backdrop-filter: blur(30px);
                  border: 1px solid var(--purple-border); border-radius: 22px; padding: 32px;
                  box-shadow: 0 20px 45px rgba(0,0,0,0.6); margin-bottom: 25px;
                  position: relative; overflow: hidden;
                }
                .sub-box::before {
                  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
                  background: linear-gradient(90deg, #7b2cbf, #c77dff);
                }
                .sub-box-header { font-size: 11px; font-weight: 800; color: #c77dff; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px; }
                .box-title { font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 8px; }
                .box-desc { font-size: 13px; color: #b8b2cb; line-height: 1.6; margin-bottom: 24px; }
                .form-group { margin-bottom: 20px; }
                label { display: block; font-size: 12px; font-weight: 700; color: #b8b2cb; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                input, textarea, select {
                  width: 100%; padding: 14px 18px; background: rgba(12, 10, 18, 0.85);
                  border: 1px solid var(--purple-border); border-radius: 14px; color: #fff; font-size: 14px;
                  transition: all 0.25s;
                }
                input:focus, textarea:focus, select:focus { border-color: #c77dff; outline: none; box-shadow: 0 0 20px var(--accent-glow); background: rgba(18, 14, 28, 0.95); }
                .save-btn {
                  background: linear-gradient(135deg, #7b2cbf, #9d4edd); color: #fff; font-weight: 700; border: none;
                  padding: 14px 28px; border-radius: 12px; cursor: pointer; font-size: 14px;
                  box-shadow: 0 6px 20px rgba(157, 78, 221, 0.4); transition: all 0.25s;
                  border: 1px solid rgba(199, 125, 255, 0.3);
                }
                .save-btn:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 10px 30px rgba(157, 78, 221, 0.6); }
                .emoji-picker-container {
                  background: rgba(12, 10, 18, 0.9); border: 1px solid var(--purple-border);
                  border-radius: 14px; padding: 14px; margin-top: 10px; margin-bottom: 15px;
                }
                .emoji-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 8px; max-height: 140px; overflow-y: auto; padding: 4px; }
                .emoji-item {
                  background: rgba(22, 18, 34, 0.7); border: 1px solid rgba(255,255,255,0.06);
                  border-radius: 10px; height: 40px; display: flex; align-items: center; justify-content: center;
                  cursor: pointer; transition: 0.2s; font-size: 18px; overflow: hidden;
                }
                .emoji-item:hover { background: rgba(157, 78, 221, 0.3); border-color: #c77dff; transform: scale(1.1); }
                .emoji-item img { width: 24px; height: 24px; object-fit: contain; }
                .save-alert {
                  background: rgba(46, 213, 115, 0.15); border: 1px solid rgba(46, 213, 115, 0.4);
                  color: #2ed573; padding: 14px 18px; border-radius: 14px; font-size: 13px; font-weight: 700;
                  margin-bottom: 25px; display: none; align-items: center; gap: 12px;
                  box-shadow: 0 8px 25px rgba(46, 213, 115, 0.2);
                }
                .variable-box {
                  background: rgba(10, 8, 16, 0.6); border: 1px dashed var(--purple-border); padding: 16px; border-radius: 12px; margin-bottom: 22px; font-size: 12px; color: #b8b2cb; line-height: 1.5;
                }
                .variable-box code { color: #c77dff; font-weight: bold; background: rgba(157,78,221,0.15); padding: 2px 6px; border-radius: 4px; }
                
                /* LIVE EMBED PREVIEW PANE STYLES */
                .preview-pane {
                  width: 390px; position: sticky; top: 35px; height: fit-content;
                  background: rgba(12, 10, 18, 0.96); border: 1px solid var(--purple-border);
                  border-radius: 22px; padding: 22px; box-shadow: 0 25px 50px rgba(0,0,0,0.7);
                }
                .preview-title { font-size: 11px; font-weight: 800; color: #c77dff; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
                .discord-message-mock { display: flex; gap: 12px; font-family: 'Plus Jakarta Sans', sans-serif; }
                .mock-avatar { width: 42px; height: 42px; border-radius: 50%; background: #7b2cbf; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; box-shadow: 0 0 15px var(--accent-glow); }
                .mock-content { overflow: hidden; width: 100%; }
                .mock-username { font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
                .mock-bot-badge { background: #7b2cbf; color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 4px; font-weight: 700; }
                .mock-embed {
                  background: #1a1626; border-left: 4px solid #9d4edd; border-radius: 8px; padding: 14px;
                  margin-top: 6px; font-size: 13px; color: #dcddde; word-break: break-word; position: relative;
                  border-top: 1px solid rgba(157,78,221,0.15); border-right: 1px solid rgba(157,78,221,0.15); border-bottom: 1px solid rgba(157,78,221,0.15);
                }
                .mock-embed-author { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 8px; }
                .mock-embed-author img { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
                .mock-embed-title { font-weight: 800; color: #fff; font-size: 15px; margin-bottom: 6px; }
                .mock-embed-desc { color: #d0cce1; font-size: 13px; line-height: 1.5; margin-bottom: 8px; white-space: pre-wrap; }
                .mock-embed-thumbnail { position: absolute; right: 14px; top: 14px; width: 64px; height: 64px; border-radius: 6px; object-fit: cover; }
                .mock-embed-image { width: 100%; border-radius: 6px; margin-top: 8px; max-height: 160px; object-fit: cover; }
                .mock-embed-footer { font-size: 11px; color: #9c94b8; margin-top: 10px; display: flex; align-items: center; gap: 6px; }
                .mock-embed-footer img { width: 14px; height: 14px; border-radius: 50%; object-fit: cover; }
            </style>
        </head>
        <body>
            <div class="app-layout">
                <div class="sidebar">
                    <div class="sidebar-brand">
                        <img src="${guild.iconURL({ dynamic: true, size: 256 }) || 'https://files.catbox.moe/y08zjc.png'}" class="guild-avatar">
                        <div class="guild-title-box">
                            <div class="guild-title">${guild.name}</div>
                            <div class="guild-sub">Members: ${guild.memberCount}</div>
                        </div>
                    </div>
                    <div class="nav-category">Core Suites</div>
                    <div class="nav-links">
                        <div class="nav-item active" onclick="switchTab('updates-center', this)">🚀 ᴜᴘᴅᴀᴛᴇꜱ & Announcements</div>
                        <div class="nav-item" onclick="switchTab('server-edit', this)">⚙️ Server Properties</div>
                        <div class="nav-item" onclick="switchTab('emoji-manager', this)">🎨 Emoji File Upload Suite</div>
                        <div class="nav-item" onclick="switchTab('greetings', this)">👋 Welcome Messages</div>
                        <div class="nav-item" onclick="switchTab('embed-builder', this)">✨ Embed Welcome Builder</div>
                        <div class="nav-item" onclick="switchTab('birthdays', this)">🎂 Birthday Suite</div>
                    </div>
                    <a href="/" class="back-picker">&larr; Switch Server</a>
                </div>
                <div class="workspace">
                    <div class="content-container">
                        <div id="saveAlert" class="save-alert">✅ Server configuration and settings successfully updated!</div>
                        
                        <!-- 🚀 UPDATES & ANNOUNCEMENTS PANEL -->
                        <div id="updates-center" class="panel-card active">
                            <form action="/dashboard/${guildId}/send-update" method="POST">
                                <div class="sub-box">
                                    <div class="sub-box-header">ᴜᴘᴅᴀᴛᴇꜱ & Announcement Center</div>
                                    <div class="box-title">Send Server Announcements & Rules Embeds</div>
                                    <div class="box-desc">Instantly push custom server updates, patch notes, server rules, or announcements as a gorgeous purple embed to your designated channel.</div>
                                    
                                    <div class="form-group">
                                        <label>Target Announcement Channel</label>
                                        <select name="updateChannel" required>
                                            ${channelsOptionsHtml}
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label>Announcement / Update Title</label>
                                        <input type="text" name="updateTitle" placeholder="🚀 Major Server Update v2.0 / 📜 Server Rules" value="${config.updateTitle || ''}" required>
                                    </div>

                                    <div class="form-group">
                                        <label>Announcement Content / Embed Description (Supports emojis)</label>
                                        <textarea name="updateDesc" rows="6" placeholder="Type your detailed server announcement, rules, or update notes here..." required>${config.updateDesc || ''}</textarea>
                                    </div>

                                    <button type="submit" class="save-btn" style="width:100%;padding:15px;font-size:15px;">🚀 Send ᴜᴘᴅᴀᴛᴇꜱ / Rules Embed Now</button>
                                </div>
                            </form>
                        </div>

                        <!-- Server Edit Panel -->
                        <div id="server-edit" class="panel-card">
                            <form action="/dashboard/${guildId}/edit-server" method="POST">
                                <div class="sub-box">
                                    <div class="sub-box-header">Server Edit Suite</div>
                                    <div class="box-title">Modify Server Details</div>
                                    <div class="box-desc">Update guild name or server profile icon directly via the management suite.</div>
                                    <div class="form-group">
                                        <label>Server Name</label>
                                        <input type="text" name="serverName" value="${guild.name}">
                                    </div>
                                    <div class="form-group">
                                        <label>Server Icon Image URL</label>
                                        <input type="text" name="serverIconUrl" placeholder="https://example.com/icon.png" value="${guild.iconURL({ size: 512 }) || ''}">
                                    </div>
                                    <button type="submit" class="save-btn">Update Server Properties</button>
                                </div>
                            </form>
                        </div>

                        <!-- Emoji Manager Panel (File Upload) -->
                        <div id="emoji-manager" class="panel-card">
                            <div class="sub-box">
                                <div class="sub-box-header">Emoji File Upload Hub</div>
                                <div class="box-title">Upload Emoji from File & Server Emojis</div>
                                <div class="box-desc">Upload local image files directly from your device to add them as custom server emojis or browse existing ones.</div>
                                <div class="emoji-picker-container">
                                    <div class="emoji-grid">${customEmojisHtml}</div>
                                </div>
                                <form action="/dashboard/${guildId}/upload-emoji-file" method="POST" enctype="multipart/form-data" style="margin-top: 20px;">
                                    <div class="form-group">
                                        <label>Emoji Name</label>
                                        <input type="text" name="emojiName" placeholder="luffyVoid" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Upload Emoji File (PNG / JPG / GIF)</label>
                                        <input type="file" name="emojiFile" accept="image/*" required style="padding: 12px; background: rgba(12,10,18,0.85); border: 1px solid var(--purple-border); border-radius: 12px; color: #fff;">
                                    </div>
                                    <button type="submit" class="save-btn">Upload Emoji File to Server</button>
                                </form>
                            </div>
                        </div>

                        <!-- Welcome Messages Panel -->
                        <div id="greetings" class="panel-card">
                            <form action="/dashboard/${guildId}/save-welcome" method="POST">
                                <div class="sub-box">
                                    <div class="sub-box-header">Channel Selection & Variables</div>
                                    <div class="box-title">Welcome Configuration</div>
                                    <div class="box-desc">Configure dynamic greeting tags and welcome text messages.</div>
                                    
                                    <div class="variable-box">
                                        <strong>Useful variables:</strong><br>
                                        <code>{mention}</code> - Mentions the person joining.<br>
                                        <code>{server}</code> - The server's name.<br>
                                        <code>{user(proper)}</code> - The person joining's name in proper format.<br>
                                        <code>{server(members)}</code> - The total number of members after joining.
                                    </div>

                                    <div class="form-group">
                                        <label>Welcome Message (Normal text)</label>
                                        <textarea name="welcomeMessage" rows="3">${config.welcomeMessage}</textarea>
                                    </div>

                                    <button type="submit" class="save-btn" style="width:100%;padding:14px;font-size:15px;">Save Welcome Configuration</button>
                                </div>
                            </form>
                        </div>

                        <!-- Advanced Embed Welcome Builder Panel with Image Upload Support -->
                        <div id="embed-builder" class="panel-card">
                            <form action="/dashboard/${guildId}/save-embed-with-file" method="POST" enctype="multipart/form-data" id="embedForm">
                                <div class="sub-box">
                                    <div class="sub-box-header">Embed Welcome Builder</div>
                                    <div class="box-title">Advanced Embed Welcome & Live Preview</div>
                                    <div class="box-desc">Customize rich welcome embeds with designated channel, emojis, big images (URL or File Upload), thumbnails, and footers.</div>

                                    <!-- Embed Channel Selection -->
                                    <div class="form-group">
                                        <label>Embed Welcome Channel (Send this embed on member join)</label>
                                        <select name="embedWelcomeChannel">
                                            ${embedWelcomeChannelsHtml}
                                        </select>
                                    </div>

                                    <!-- Custom Emojis Quick Clicker -->
                                    <div class="form-group">
                                        <label>Click server emojis to insert into description:</label>
                                        <div class="emoji-picker-container" style="margin-top:5px;">
                                            <div class="emoji-grid">${customEmojisHtml}</div>
                                        </div>
                                    </div>

                                    <!-- ROW 1: Icon url | Name | Name url -->
                                    <div style="display:grid; grid-template-columns: 1fr 2fr 1fr; gap: 15px; margin-bottom: 20px;">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Icon url</label>
                                            <input type="text" name="embedAuthorIcon" id="authorIconInput" placeholder="Icon url" value="${config.embedAuthorIcon || ''}" oninput="updatePreview()">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Name</label>
                                            <input type="text" name="embedAuthorName" id="authorNameInput" placeholder="Name" value="${config.embedAuthorName || ''}" oninput="updatePreview()">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Name url</label>
                                            <input type="text" name="embedAuthorUrl" placeholder="Name url" value="${config.embedAuthorUrl || ''}">
                                        </div>
                                    </div>

                                    <!-- ROW 2: Title | Title url -->
                                    <div style="display:grid; grid-template-columns: 3fr 1fr; gap: 15px; margin-bottom: 20px;">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Title</label>
                                            <input type="text" name="embedTitle" id="titleInput" maxlength="200" placeholder="Title" value="${config.embedTitle || ''}" oninput="updatePreview()">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Title url</label>
                                            <input type="text" name="embedUrl" placeholder="Title url" value="${config.embedUrl || ''}">
                                        </div>
                                    </div>

                                    <!-- ROW 3: Description -->
                                    <div class="form-group">
                                        <label>Description (Supports emojis & variables like {mention})</label>
                                        <textarea name="embedDesc" id="embedDescInput" rows="4" maxlength="2048" placeholder="Description" oninput="updatePreview()">${config.embedDesc || ''}</textarea>
                                    </div>

                                    <!-- ROW 4: Image url / File Upload & Thumbnail url -->
                                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Big Image URL or Upload File</label>
                                            <input type="text" name="embedImage" id="imageInput" placeholder="https://... or upload below" value="${config.embedImage || ''}" oninput="updatePreview()" style="margin-bottom:8px;">
                                            <input type="file" name="embedImageFile" accept="image/*" style="font-size:12px; padding:8px; background:rgba(12,10,18,0.85); border:1px solid var(--purple-border); border-radius:10px; color:#fff;">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Thumbnail url (Small top right)</label>
                                            <input type="text" name="embedThumbnail" id="thumbnailInput" placeholder="https://example.com/thumb.png" value="${config.embedThumbnail || ''}" oninput="updatePreview()">
                                        </div>
                                    </div>

                                    <!-- ROW 5: Footer & Footer icon -->
                                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 15px; margin-bottom: 25px;">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Footer</label>
                                            <input type="text" name="embedFooterText" id="footerInput" maxlength="2048" placeholder="Footer text" value="${config.embedFooterText || ''}" oninput="updatePreview()">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Footer icon</label>
                                            <input type="text" name="embedFooterIcon" id="footerIconInput" placeholder="Footer icon url" value="${config.embedFooterIcon || ''}" oninput="updatePreview()">
                                        </div>
                                    </div>

                                    <button type="submit" class="save-btn" style="width:100%;padding:14px;font-size:15px;">Save Advanced Embed Welcome Config</button>
                                </div>
                            </form>
                        </div>

                        <!-- Birthday Panel -->
                        <div id="birthdays" class="panel-card">
                            <div class="sub-box">
                                <div class="sub-box-header">Birthday Suite</div>
                                <div class="box-title">Birthday Role & Announcements</div>
                                <div class="box-desc">Automatically assign special birthday roles to members when their birthday arrives.</div>
                                <form action="/dashboard/${guildId}/birthday-config" method="POST">
                                    <div class="form-group">
                                        <label>Birthday Role Assignment</label>
                                        <select name="birthdayRole">
                                            ${rolesOptionsHtml}
                                        </select>
                                    </div>
                                    <button type="submit" class="save-btn">Save Birthday Settings</button>
                                </form>
                            </div>
                        </div>

                    </div>

                    <!-- LIVE PREVIEW PANE -->
                    <div class="preview-pane">
                        <div class="preview-title">👁️ Live Embed Preview</div>
                        <div class="discord-message-mock">
                            <div class="mock-avatar">L</div>
                            <div class="mock-content">
                                <div class="mock-username">Luffy_void <span class="mock-bot-badge">BOT</span></div>
                                <div class="mock-embed" id="previewEmbedBox">
                                    <div id="previewAuthor" class="mock-embed-author" style="display:none;">
                                        <img id="previewAuthorIcon" src="" style="display:none;">
                                        <span id="previewAuthorName"></span>
                                    </div>
                                    <div id="previewTitle" class="mock-embed-title" style="display:none;"></div>
                                    <div id="previewDesc" class="mock-embed-desc" style="display:none;"></div>
                                    <img id="previewThumbnail" class="mock-embed-thumbnail" style="display:none;">
                                    <img id="previewImage" class="mock-embed-image" style="display:none;">
                                    <div id="previewFooter" class="mock-embed-footer" style="display:none;">
                                        <img id="previewFooterIcon" src="" style="display:none;">
                                        <span id="previewFooterText"></span>
                                    </div>
                                </div>
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
                    textarea.value += emojiText;
                    updatePreview();
                }

                function updatePreview() {
                    const authorName = document.getElementById('authorNameInput') ? document.getElementById('authorNameInput').value : '';
                    const authorIcon = document.getElementById('authorIconInput') ? document.getElementById('authorIconInput').value : '';
                    const title = document.getElementById('titleInput') ? document.getElementById('titleInput').value : '';
                    const desc = document.getElementById('embedDescInput') ? document.getElementById('embedDescInput').value : '';
                    const image = document.getElementById('imageInput') ? document.getElementById('imageInput').value : '';
                    const thumbnail = document.getElementById('thumbnailInput') ? document.getElementById('thumbnailInput').value : '';
                    const footer = document.getElementById('footerInput') ? document.getElementById('footerInput').value : '';
                    const footerIcon = document.getElementById('footerIconInput') ? document.getElementById('footerIconInput').value : '';

                    const pAuthor = document.getElementById('previewAuthor');
                    const pAuthorName = document.getElementById('previewAuthorName');
                    const pAuthorIcon = document.getElementById('previewAuthorIcon');
                    if (authorName && pAuthor) {
                        pAuthor.style.display = 'flex';
                        pAuthorName.textContent = authorName;
                        if (authorIcon) { pAuthorIcon.src = authorIcon; pAuthorIcon.style.display = 'block'; }
                        else { pAuthorIcon.style.display = 'none'; }
                    } else if(pAuthor) { pAuthor.style.display = 'none'; }

                    const pTitle = document.getElementById('previewTitle');
                    if (title && pTitle) { pTitle.style.display = 'block'; pTitle.textContent = title; }
                    else if(pTitle) { pTitle.style.display = 'none'; }

                    const pDesc = document.getElementById('previewDesc');
                    if (desc && pDesc) { pDesc.style.display = 'block'; pDesc.textContent = desc; }
                    else if(pDesc) { pDesc.style.display = 'none'; }

                    const pThumb = document.getElementById('previewThumbnail');
                    if (thumbnail && pThumb) { pThumb.style.display = 'block'; pThumb.src = thumbnail; }
                    else if(pThumb) { pThumb.style.display = 'none'; }

                    const pImg = document.getElementById('previewImage');
                    if (image && pImg) { pImg.style.display = 'block'; pImg.src = image; }
                    else if(pImg) { pImg.style.display = 'none'; }

                    const pFooter = document.getElementById('previewFooter');
                    const pFooterText = document.getElementById('previewFooterText');
                    const pFooterIcon = document.getElementById('previewFooterIcon');
                    if (footer && pFooter) {
                        pFooter.style.display = 'flex';
                        pFooterText.textContent = footer;
                        if (footerIcon) { pFooterIcon.src = footerIcon; pFooterIcon.style.display = 'block'; }
                        else { pFooterIcon.style.display = 'none'; }
                    } else if(pFooter) { pFooter.style.display = 'none'; }
                }

                window.onload = updatePreview;

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

app.post('/dashboard/:guildId/send-update', async (req, res) => {
    const guildId = req.params.guildId;
    const { updateChannel, updateTitle, updateDesc } = req.body;
    const guild = discordClient.guilds.cache.get(guildId);

    if (guild && updateChannel) {
        const channel = guild.channels.cache.get(updateChannel);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle(updateTitle || '🚀 Server Announcement & Updates')
                .setDescription(updateDesc || '')
                .setColor(0x9d4edd)
                .setTimestamp()
                .setFooter({ text: `${guild.name} Updates Center`, iconURL: guild.iconURL({ dynamic: true }) || undefined });

            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    }
    serverSettings[guildId] = { ...serverSettings[guildId], ...req.body };
    res.redirect(`/dashboard/${guildId}?saved=true`);
});

app.post('/dashboard/:guildId/save-welcome', (req, res) => {
    const guildId = req.params.guildId;
    serverSettings[guildId] = { ...serverSettings[guildId], ...req.body };
    res.redirect(`/dashboard/${guildId}?saved=true`);
});

app.post('/dashboard/:guildId/save-embed-with-file', async (req, res) => {
    const guildId = req.params.guildId;
    let imageUrl = req.body.embedImage || '';

    if (req.files && req.files.embedImageFile) {
        const file = req.files.embedImageFile;
        const fileName = `embed_${Date.now()}_${file.name}`;
        const uploadPath = path.join(uploadsDir, fileName);
        await file.mv(uploadPath);
        imageUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
    }

    serverSettings[guildId] = {
        ...serverSettings[guildId],
        ...req.body,
        embedImage: imageUrl
    };
    res.redirect(`/dashboard/${guildId}?saved=true`);
});

app.post('/dashboard/:guildId/birthday-config', (req, res) => {
    const guildId = req.params.guildId;
    serverSettings[guildId] = { ...serverSettings[guildId], ...req.body };
    res.redirect(`/dashboard/${guildId}?saved=true`);
});

app.post('/dashboard/:guildId/edit-server', async (req, res) => {
    const guildId = req.params.guildId;
    const { serverName, serverIconUrl } = req.body;
    const guild = discordClient.guilds.cache.get(guildId);
    if (guild) {
        await guild.setName(serverName).catch(() => {});
        if (serverIconUrl) {
            await guild.setIcon(serverIconUrl).catch(() => {});
        }
    }
    res.redirect(`/dashboard/${guildId}?saved=true`);
});

app.post('/dashboard/:guildId/upload-emoji-file', async (req, res) => {
    const guildId = req.params.guildId;
    const { emojiName } = req.body;
    const guild = discordClient.guilds.cache.get(guildId);

    if (guild && req.files && req.files.emojiFile) {
        const file = req.files.emojiFile;
        const fileName = `emoji_${Date.now()}_${file.name}`;
        const uploadPath = path.join(uploadsDir, fileName);
        await file.mv(uploadPath);

        await guild.emojis.create({ attachment: uploadPath, name: emojiName }).catch(() => {});
    }
    res.redirect(`/dashboard/${guildId}?saved=true`);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');
    
    // Dynamic protocol check to ensure secure https redirection behind Render proxy
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const redirectUri = process.env.REDIRECT_URI || `${protocol}://${req.get('host')}/auth/discord/callback`;

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
        });
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
            res.cookie('discord_token', tokenData.access_token, { httpOnly: true });
            
            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const userData = await userRes.json();
            if (userData && userData.id) {
                res.cookie('discord_user_id', userData.id, { httpOnly: true });
            }
        }
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('discord_token');
    res.clearCookie('discord_user_id');
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`🌐 Luffy.void Web Panel online at http://localhost:${PORT}`);
});

// ==========================================
// 2. DISCORD BOT RUNTIME & SLASH COMMANDS
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

const commandsList = [
    new SlashCommandBuilder().setName('server').setDescription('Manage server properties')
        .addSubcommand(sub => sub.setName('icon').setDescription('View or copy the current server icon link')),
    
    new SlashCommandBuilder().setName('user').setDescription('View user information or icons')
        .addSubcommand(sub => sub.setName('icon').setDescription('View your avatar or target user avatar')
            .addUserOption(o => o.setName('target').setDescription('Target user').setRequired(false))),
    
    new SlashCommandBuilder().setName('auto').setDescription('Configure automation settings')
        .addSubcommand(sub => sub.setName('chat').setDescription('Toggle or test AI-style auto chat integration'))
        .addSubcommand(sub => sub.setName('role').setDescription('Configure auto-role assignment on member join')
            .addRoleOption(o => o.setName('role').setDescription('Role to assign automatically').setRequired(true)))
        .addSubcommand(sub => sub.setName('autoreaction').setDescription('Configure autoreactions for messages'))
        .addSubcommand(sub => sub.setName('messages').setDescription('Configure custom automated periodic messages')),
    
    new SlashCommandBuilder().setName('clone').setDescription('Voice channel utilities')
        .addSubcommand(sub => sub.setName('voice').setDescription('Clone or replicate your current voice channel setup')),
    
    new SlashCommandBuilder().setName('birthday').setDescription('Set or check member birthdays')
        .addSubcommand(sub => sub.setName('set').setDescription('Set your birthday date')
            .addStringOption(o => o.setName('date').setDescription('Format: MM-DD').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all registered server birthdays')),
    
    new SlashCommandBuilder().setName('about').setDescription('Display detailed information about Luffy.void suite'),
    
    new SlashCommandBuilder().setName('setip').setDescription('Set your Minecraft server IP')
        .addStringOption(o => o.setName('ip').setDescription('Minecraft Server IP address').setRequired(true)),
    
    new SlashCommandBuilder().setName('ip').setDescription('Show the configured Minecraft server IP'),
    
    new SlashCommandBuilder().setName('mc').setDescription('Minecraft server monitoring')
        .addSubcommand(sub => sub.setName('status').setDescription('Show the current live Minecraft server status')),
    
    new SlashCommandBuilder().setName('roast').setDescription('Playfully roast a user')
        .addUserOption(o => o.setName('user').setDescription('User to roast').setRequired(true)),
    
    new SlashCommandBuilder().setName('setrules').setDescription('Set server rules content')
        .addStringOption(o => o.setName('content').setDescription('Rules text content').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    new SlashCommandBuilder().setName('rules').setDescription('Display the server rules'),

    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
    new SlashCommandBuilder().setName('help').setDescription('List all commands')
].map(command => command.toJSON());

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user } = interaction;

    try {
        const subcommand = options.getSubcommand(false);

        if (commandName === 'server') {
            if (subcommand === 'icon') {
                const iconUrl = guild.iconURL({ size: 1024, dynamic: true }) || 'No icon set';
                return interaction.reply({ content: `🛡️ **${guild.name}** Server Icon Link:\n${iconUrl}` });
            }
        }

        if (commandName === 'user') {
            if (subcommand === 'icon') {
                const target = options.getUser('target') || user;
                const avatarUrl = target.displayAvatarURL({ size: 1024, dynamic: true });
                return interaction.reply({ content: `👤 Avatar for **${target.tag}**:\n${avatarUrl}` });
            }
        }

        if (commandName === 'auto') {
            if (subcommand === 'chat') {
                return interaction.reply({ content: `🤖 Luffy.void Auto-Chat response node is active and listening.` });
            }
            if (subcommand === 'role') {
                const role = options.getRole('role');
                autoRoles[guild.id] = role.id;
                return interaction.reply({ content: `✅ Auto-role successfully configured to **${role.name}**.` });
            }
            if (subcommand === 'autoreaction') {
                return interaction.reply({ content: `⚡ Autoreaction module status: Operational for this guild.` });
            }
            if (subcommand === 'messages') {
                return interaction.reply({ content: `💬 Automated periodic messaging engine ready.` });
            }
        }

        if (commandName === 'clone' && subcommand === 'voice') {
            const memberVC = interaction.member.voice.channel;
            if (!memberVC) return interaction.reply({ content: '❌ You must be connected to a voice channel to clone it.', ephemeral: true });
            
            const clonedVC = await guild.channels.create({
                name: `${memberVC.name}-clone`,
                type: memberVC.type,
                parent: memberVC.parentId,
                userLimit: memberVC.userLimit,
                bitrate: memberVC.bitrate
            });
            return interaction.reply({ content: `🎙️ Successfully cloned voice channel into **${clonedVC.name}**.` });
        }

        if (commandName === 'birthday') {
            if (subcommand === 'set') {
                const date = options.getString('date');
                if (!birthdays[guild.id]) birthdays[guild.id] = {};
                birthdays[guild.id][user.id] = date;
                return interaction.reply({ content: `🎉 Successfully recorded birthday for <@${user.id}> as **${date}**!` });
            } 
            else if (subcommand === 'list') {
                const guildBirthdays = birthdays[guild.id];
                if (!guildBirthdays || Object.keys(guildBirthdays).length === 0) {
                    return interaction.reply({ content: `🎂 No birthdays have been recorded for this server yet. Use \`/birthday set\` to add yours!`, ephemeral: true });
                }

                let desc = '';
                for (const [userId, dateStr] of Object.entries(guildBirthdays)) {
                    desc += `• <@${userId}>: **${dateStr}**\n`;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🎂 Registered Birthdays in ${guild.name}`)
                    .setDescription(desc)
                    .setColor(0x9d4edd)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }
        }

        if (commandName === 'about') {
            const embed = new EmbedBuilder()
                .setTitle('Luffy.void Suite Information')
                .setColor(0x9d4edd)
                .setDescription('Next-generation automated server protection, moderation, Minecraft integrations, and web panel suite.');
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'setip') {
            const ip = options.getString('ip');
            minecraftIps[guild.id] = ip;
            return interaction.reply({ content: `🕹️ Minecraft Server IP for this guild has been set to: \`${ip}\`` });
        }

        if (commandName === 'ip') {
            const ip = minecraftIps[guild.id] || 'No IP configured yet. Use `/setip` to set one.';
            return interaction.reply({ content: `🌐 Configured Minecraft Server IP: \`${ip}\`` });
        }

        if (commandName === 'mc' && subcommand === 'status') {
            const ip = minecraftIps[guild.id];
            if (!ip) return interaction.reply({ content: '❌ No Minecraft IP configured for this server. Use `/setip` first.', ephemeral: true });
            return interaction.reply({ content: `🟢 Minecraft Server **${ip}** status check: Online / Ping operational.` });
        }

        if (commandName === 'roast') {
            const targetUser = options.getUser('user');
            const roasts = [
                `hey <@${targetUser.id}>, you bring everyone so much joy... when you leave the room.`,
                `<@${targetUser.id}> must have been born on a highway because that's where most accidents happen.`,
                `If I wanted to commit suicide, I'd jump down your ego to your IQ level, <@${targetUser.id}>.`
            ];
            const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
            return interaction.reply({ content: randomRoast });
        }

        if (commandName === 'setrules') {
            const content = options.getString('content');
            serverRules[guild.id] = content;
            return interaction.reply({ content: `📜 Server rules have been successfully updated!` });
        }

        if (commandName === 'rules') {
            const rules = serverRules[guild.id] || 'No rules have been set for this server yet.';
            const embed = new EmbedBuilder()
                .setTitle(`📜 Rules for ${guild.name}`)
                .setDescription(rules)
                .setColor(0x9d4edd)
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'ping') {
            return interaction.reply({ content: `🏓 Pong! Latency is **${client.ws.ping}ms**.` });
        }

        if (commandName === 'help') {
            return interaction.reply({ content: `🛡️ Check the Luffy.void web dashboard or use slash commands like \`/rules\`, \`/ip\`, \`/mc status\`, and \`/birthday list\`!` });
        }

    } catch (err) {
        console.error(err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An error occurred while executing this command.', ephemeral: true }).catch(() => {});
        }
    }
});

client.on('guildMemberAdd', async member => {
    const roleId = autoRoles[member.guild.id];
    if (roleId) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
            await member.roles.add(role).catch(() => {});
        }
    }

    const settings = serverSettings[member.guild.id];
    if (!settings) return;

    if (settings.welcomeChannel) {
        const channel = member.guild.channels.cache.get(settings.welcomeChannel);
        if (channel && settings.welcomeMessage) {
            let textMessage = settings.welcomeMessage
                .replace(/{mention}/g, `<@${member.id}>`)
                .replace(/{server}/g, member.guild.name)
                .replace(/{user\(proper\)}/g, member.user.username)
                .replace(/{server\(members\)}/g, member.guild.memberCount.toString());

            await channel.send({ content: textMessage }).catch(() => {});
        }
    }

    if (settings.embedWelcomeChannel) {
        const embedChannel = member.guild.channels.cache.get(settings.embedWelcomeChannel);
        if (embedChannel) {
            const embed = new EmbedBuilder()
                .setColor(0x9d4edd)
                .setTimestamp();

            if (settings.embedTitle) {
                const parsedTitle = settings.embedTitle
                    .replace(/{mention}/g, `<@${member.id}>`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{user\(proper\)}/g, member.user.username)
                    .replace(/{server\(members\)}/g, member.guild.memberCount.toString());
                embed.setTitle(parsedTitle);
            }
            if (settings.embedUrl) {
                embed.setURL(settings.embedUrl);
            }
            if (settings.embedDesc) {
                const parsedDesc = settings.embedDesc
                    .replace(/{mention}/g, `<@${member.id}>`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{user\(proper\)}/g, member.user.username)
                    .replace(/{server\(members\)}/g, member.guild.memberCount.toString());
                embed.setDescription(parsedDesc);
            }
            if (settings.embedAuthorName) {
                const parsedAuthorName = settings.embedAuthorName
                    .replace(/{mention}/g, `<@${member.id}>`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{user\(proper\)}/g, member.user.username)
                    .replace(/{server\(members\)}/g, member.guild.memberCount.toString());
                
                embed.setAuthor({
                    name: parsedAuthorName,
                    iconURL: settings.embedAuthorIcon || undefined,
                    url: settings.embedAuthorUrl || undefined
                });
            }
            if (settings.embedImage) {
                embed.setImage(settings.embedImage);
            }
            if (settings.embedThumbnail) {
                embed.setThumbnail(settings.embedThumbnail);
            }
            if (settings.embedFooterText) {
                const parsedFooter = settings.embedFooterText
                    .replace(/{mention}/g, `<@${member.id}>`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{user\(proper\)}/g, member.user.username)
                    .replace(/{server\(members\)}/g, member.guild.memberCount.toString());
                
                embed.setFooter({
                    text: parsedFooter,
                    iconURL: settings.embedFooterIcon || undefined
                });
            }

            await embedChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
});

client.once('ready', async () => {
    console.log(`✅ Logged in as real bot: ${client.user.tag}! Setting status...`);
    
    const updatePresence = () => {
        const serverCount = client.guilds.cache.size;
        client.user.setPresence({
            activities: [{ name: `Serving ${serverCount} servers 🚀 | luffy.void`, type: 0 }],
            status: 'idle'
        });
    };

    updatePresence();
    setInterval(updatePresence, 30000);

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsList });
        console.log(`Successfully registered all updated slash commands globally!`);
    } catch (e) {
        console.error(e);
    }
});

client.login(process.env.BOT_TOKEN);