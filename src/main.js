const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const DiscordRPC = require('discord-rpc');

const globals = require("./globals");
const utils = require("./utils");

utils.updateMenu();

// Create the main application window
async function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const zoomFactor = Math.min(width / 1280, height / 749);

    globals.mainWindow = new BrowserWindow({
        width: Math.round(1280 * zoomFactor),
        height: Math.round(749 * zoomFactor),
        autoHideMenuBar: true,
        menuBarVisible: false,
        icon: path.join(__dirname, 'icons', 'PR.png'), // Ensure the icon path is correct
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Consider setting this to true for security
            enableRemoteModule: true,
            preload: path.join(__dirname, 'preload.js'),
            persistSessionStorage: true,
            persistUserDataDirName: 'Pokerogue'
        }
    });

    globals.mainWindow.webContents.setZoomFactor(zoomFactor);

    // Register global shortcuts when the game window is focused
    globals.mainWindow.on('focus', utils.registerGlobalShortcuts);

    // Unregister global shortcuts when the game window loses focus
    globals.mainWindow.on('blur', utils.unregisterGlobalShortcuts);

    utils.loadSettings();
    utils.applyDarkMode();
    utils.applyCursorHide();
    if (globals.useModifiedHotkeys) {
        utils.loadKeymap();
        utils.registerGlobalShortcuts();
    }

    utils.updateMenu();

    globals.mainWindow.on('close', () => {
        utils.saveSettings();
    });

    globals.mainWindow.on('closed', async () => {
        globals.mainWindow = null;

        // Close the auxiliary windows if they are open
        ['wikiWindow', 'pokedexWindow', 'typeChartWindow', 'horizontalTypeChartWindow', 'typeCalculatorWindow', 'teamBuilderWindow', 'smogonWindow'].forEach(window => {
            if (globals[window]) {
                globals[window].close();
                globals[window] = null;
            }
        });

        utils.unregisterGlobalShortcuts();
        app.quit();
    });

    if (globals.discordEnabled) {
        const clientId = '1232165629046292551';
        DiscordRPC.register(clientId);
        const rpc = new DiscordRPC.Client({ transport: 'ipc' });

        let startTime = Date.now();
        let adjustedPlayTime = 0;
        let sessionStartTime = 0;

        rpc.connect(clientId)
            .then(() => {
                rpc.on('ready', () => {
                    console.log('Discord Rich Presence is ready!');
                    updateDiscordPresence();
                    setInterval(updateDiscordPresence, 1000);
                });
                rpc.login({ clientId }).catch(console.error);
            })
            .catch(error => {
                console.log('Discord Rich Presence is not available! %O', error);
                globals.discordEnabled = false;
            });

        async function updateDiscordPresence() {
            globals.mainWindow.webContents.executeJavaScript('window.gameInfo', true)
                .then((gameInfo) => {
                    let gameData = gameInfo;

                    if (gameData.gameMode === 'Title') {
                        adjustedPlayTime = -1;
                        rpc.setActivity({
                            details: 'On the menu',
                            startTimestamp: startTime,
                            largeImageKey: 'logo2',
                            largeImageText: 'PokéRogue',
                            instance: true,
                        });
                    } else {
                        const details = `${gameData.gameMode} | Wave: ${gameData.wave} | ${gameData.biome}`;
                        let state = `Party:\n${gameData.party.map((pokemon) => `Lv. ${pokemon.level} ${pokemon.name}`).join('\n')}`;

                        if (state.length > 128) state = state.substring(0, 125) + "...";

                        if (adjustedPlayTime === -1) {
                            sessionStartTime = Date.now();
                            adjustedPlayTime = gameData.playTime * 1000;
                        }

                        rpc.setActivity({
                            details: details,
                            state: state,
                            startTimestamp: sessionStartTime - adjustedPlayTime,
                            largeImageKey: gameData.biome ? gameData.biome.toLowerCase().replace(/\s/g, '_') + '_discord' : 'logo2',
                            largeImageText: gameData.biome,
                            smallImageKey: 'logo',
                            smallImageText: 'PokéRogue',
                            instance: true,
                        });
                    }
                })
                .catch((error) => {
                    rpc.setActivity({
                        startTimestamp: startTime,
                        largeImageKey: 'logo2',
                        largeImageText: 'PokéRogue',
                        instance: true,
                    });
                });
        }
    }

    if (globals.isOfflineMode) {
        globals.mainWindow.loadFile(path.join(globals.gameDir, 'index.html'));
    } else {
        globals.mainWindow.loadURL('https://pokerogue.net/');
    }

    // Adjust the resolution
    globals.mainWindow.webContents.on('did-finish-load', () => {
        setTimeout(() => {
            globals.mainWindow.show();
            utils.loadSettings();
            globals.mainWindow.center();
        }, 100);
    });
}

// Handle app events
app.whenReady().then(() => {
    if (process.platform === 'darwin') {
        globals.gameDir = path.join(app.getPath('documents'), 'PokeRogue', 'game');
    } else {
        globals.gameDir = path.join(__dirname, '../..', 'game');
    }
    globals.gameFilesDownloaded = fs.existsSync(globals.gameDir);
    globals.currentVersionPath = path.join(globals.gameDir, 'currentVersion.txt');

    if (process.argv.includes('--clear-cache')) {
        const userDataPath = app.getPath('userData');
        const settingsFilePath = path.join(userDataPath, 'settings.json');
        const localStorageDirPath = path.join(userDataPath, 'Local Storage');

        const files = fs.readdirSync(userDataPath);

        files.forEach(file => {
            const filePath = path.join(userDataPath, file);
            if (filePath !== settingsFilePath && filePath !== localStorageDirPath) {
                if (fs.lstatSync(filePath).isDirectory()) {
                    fs.rmdirSync(filePath, { recursive: true });
                } else {
                    fs.unlinkSync(filePath);
                }
            }
        });

        app.commandLine.removeSwitch('clear-cache');
    }

    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
