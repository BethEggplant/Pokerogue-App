const path = require('path');

let mainWindow;
let wikiWindow;
let pokedexWindow;
let typeChartWindow;
let typeCalculatorWindow;
let teamBuilderWindow;
let smogonWindow;
let isOfflineMode = false;
let gameFilesDownloaded = false;
let closeUtilityWindows = false;
let darkMode = false;
let keymap = {};
let useModifiedHotkeys = false;
let autoHideMenu = false;
let hideCursor = false;
let gameDir = (function() {
    if (process.platform === 'darwin') {
        // For macOS, use the user's Documents directory
        return path.join(app.getPath('documents'), 'PokeRogue', 'game');
    } else {
        // For other platforms, use the app's directory
        return path.join(__dirname, '..', 'app', 'game');
    }
})();
let currentVersionPath = path.join(gameDir, 'currentVersion.txt')
let latestReleaseUrl = 'https://api.github.com/repos/Admiral-Billy/pokerogue/releases/latest';
let httpOptions = {
    headers: {
        'User-Agent': 'Pokerogue-App',
    }
};

module.exports = {
    mainWindow,
    wikiWindow,
    pokedexWindow,
    typeChartWindow,
    typeCalculatorWindow,
    teamBuilderWindow,
    smogonWindow,
    isOfflineMode,
    gameFilesDownloaded,
    closeUtilityWindows,
    darkMode,
    keymap,
    useModifiedHotkeys,
    autoHideMenu,
    hideCursor,
    gameDir,
    currentVersionPath,
    latestReleaseUrl,
    httpOptions
}