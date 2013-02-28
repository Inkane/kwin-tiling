/********************************************************************
 KWin - the KDE window manager
 This file is part of the KDE project.

Copyright (C) 2012 Mathias Gottschlag <mgottschlag@gmail.com>

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*********************************************************************/

"use strict";

Qt.include("signal.js");
Qt.include("tile.js");
Qt.include("tilelist.js");
Qt.include("layout.js");
Qt.include("spirallayout.js");
Qt.include("twothird.js");
Qt.include("tiling.js");
Qt.include("tests.js");
Qt.include("helper.js")
Qt.include("json.js");

/**
 * Class which manages all layouts, connects the various signals and handlers
 * and implements all keyboard shortcuts.
 * @class
 */
function TilingManager() {
    /**
     * Default layout type which is selected for new layouts.
     */
    this.defaultLayout = SpiralLayout;//TwoThirdLayout;
    /**
     * List of all available layout types.
     */
    this.availableLayouts = [
        SpiralLayout,
        TwoThirdLayout/*,
        ZigZagLayout,
        ColumnLayout,
        RowLayout,
        GridLayout,
        MaximizedLayout,
        FloatingLayout*/
    ];
    for (var i = 0; i < this.availableLayouts.length; i++) {
        this.availableLayouts[i].index = i;
    }
    /**
     * Number of desktops in the system.
     */
    this.desktopCount = workspace.desktopGridWidth
                      * workspace.desktopGridHeight;
    /**
     * Number of screens in the system.
     */
    this.screenCount = workspace.numScreens;
    /**
     * Array containing a list of layouts for every desktop. Each of the lists
     * has one element per screen.
     */
    this.layouts = [];
    /**
     * List of all tiles in the system.
     */
    this.tiles = new TileList();
    /**
     * Current screen, needed to be able to track screen changes.
     */
    this._currentScreen = workspace.activeScreen;
    /**
     * Current desktop, needed to be able to track screen changes.
     */
    this._currentDesktop = workspace.currentDesktop - 1;
    /**
     * True if a user moving operation is in progress.
     */
    this._moving = false;
    /**
     * The screen where the current window move operation started.
     */
    this._movingStartScreen = 0;

    var self = this;
    // Read the script settings
    // TODO (this is currently not supported by kwin)
    // Create the various layouts, one for every desktop
    for (var i = 0; i < this.desktopCount; i++) {
        this._createDefaultLayouts(i);
    }
    this.layouts[this._currentDesktop][this._currentScreen].activate();
    // Connect the tile list signals so that new tiles are added to the layouts
    this.tiles.tileAdded.connect(function(tile) {
        debugmsg("tiles.tileAdded");
        self._onTileAdded(tile);
    });
    this.tiles.tileRemoved.connect(function(tile) {
        debugmsg("tiles.tileRemoved");
        self._onTileRemoved(tile);
    });
    // We need to reset custom client properties first because this might not be
    // the first execution of the script
    var existingClients = workspace.clientList();
    existingClients.forEach(function(client) {
        client.tiling_tileIndex = null;
        client.tiling_floating = null;
    });
    // Create the initial list of tiles
    existingClients.forEach(function(client) {
        self.tiles.addClient(client);
    });
    // Activate the visible layouts
    this.layouts[workspace.currentDesktop - 1].forEach(function(layout) {
        layout.activate();
    });
    // Register global callbacks
    workspace.numberDesktopsChanged.connect(function() {
        self._onNumberDesktopsChanged();
    });
    workspace.numberScreensChanged.connect(function() {
        self._onNumberScreensChanged();
    });
    workspace.currentDesktopChanged.connect(function() {
        self._onCurrentDesktopChanged();
    });
    // Register keyboard shortcuts
    wrapRegShortcut("Next Tiling Layout",
                     "Next Tiling Layout",
                     "Meta+PgDown",
                     function() {
        debugmsg("pressed Meta+PgDown");
        var currentLayout = self._getCurrentLayoutType();
        var nextIndex = (currentLayout.index + 1) % self.availableLayouts.length;
        self._switchLayout(workspace.currentDesktop - 1,
                     workspace.activeScreen,
                     nextIndex);
    });
    wrapRegShortcut("Previous Tiling Layout",
                     "Previous Tiling Layout",
                     "Meta+PgUp",
                     function() {
        debugmsg("pressed Meta+PgUp");
        var currentLayout = self._getCurrentLayoutType();
        var nextIndex = currentLayout.index - 1;
        if (nextIndex < 0) {
            nextIndex += self.availableLayouts.length;
        }
        self._switchLayout(workspace.currentDesktop - 1,
                           workspace.activeScreen,
                           nextIndex);
    });
    wrapRegShortcut("Toggle Floating",
                     "Toggle Floating",
                     "Meta+F",
                    function() {
        debugmsg("toggle floating state (shortcut)");
        if (!workspace.activeClient) {
            warn("no active client!")
            return;
        }
        var tile = self.tiles.getTile(workspace.activeClient);
        debugmsg("after var tile");
        if (tile == null) {
            warn("Couldn't get a tile");
            return;
        }
        debugmsg("before call to _toggleFloating");
        self._toggleFloating(tile);
        debugmsg("after call to _toggleFloating");
    });
    wrapRegShortcut("Switch Focus Left",
                     "Switch Focus Left",
                     "Meta+H",
                     function() {
        self._switchFocus(Direction.Left);
    });
    wrapRegShortcut("Switch Focus Right",
                     "Switch Focus Right",
                     "Meta+L",
                     function() {
        self._switchFocus(Direction.Right);
    });
    wrapRegShortcut("Switch Focus Up",
                     "Switch Focus Up",
                     "Meta+K",
                     function() {
        self._switchFocus(Direction.Up);
    });
    wrapRegShortcut("Switch Focus Down",
                     "Switch Focus Down",
                     "Meta+J",
                     function() {
        self._switchFocus(Direction.Down);
    });
    wrapRegShortcut("Move Window Left",
                     "Move Window Left",
                     "Meta+Shift+H",
                     function() {
        self._moveTile(Direction.Left);
    });
    wrapRegShortcut("Move Window Right",
                     "Move Window Right",
                     "Meta+Shift+L",
                     function() {
        self._moveTile(Direction.Right);
    });
    wrapRegShortcut("Move Window Up",
                     "Move Window Up",
                     "Meta+Shift+K",
                     function() {
        self._moveTile(Direction.Up);
    });
    wrapRegShortcut("Move Window Down",
                     "Move Window Down",
                     "Meta+Shift+J",
                     function() {
        self._moveTile(Direction.Down);
    });
}

/**
 * Utility function which returns the area on the selected screen/desktop which
 * is filled by the layout for that screen.
 *
 * @param desktop Desktop for which the area shall be returned.
 * @param screen Screen for which the area shall be returned.
 * @return Rectangle which contains the area which shall be used by layouts.
 */
TilingManager.getTilingArea = function(desktop, screen) {
    // TODO: Should this function be moved to Layout?
    return workspace.clientArea(KWin.MaximizeArea, screen, desktop);
};

TilingManager.prototype._createDefaultLayouts = function(desktop) {
    var screenLayouts = [];
    for (var j = 0; j < this.screenCount; j++) {
        var area = TilingManager.getTilingArea(desktop, j);
        screenLayouts[j] = new Tiling(area, this.defaultLayout);
    }
    this.layouts[desktop] = screenLayouts;
};

TilingManager.prototype._getCurrentLayoutType = function() {
    var currentLayout = this.layouts[this._currentDesktop][this._currentScreen];
    return currentLayout.layoutType;
};

TilingManager.prototype._onTileAdded = function(tile) {
    // Add tile callbacks which are needed to move the tile between different
    // screens/desktops
    var self = this;
    tile.screenChanged.connect(function(oldScreen, newScreen) {
        debugmsg("_onTileScreenChanged called from tile");
        self._onTileScreenChanged(tile, oldScreen, newScreen);
    });
    tile.desktopChanged.connect(function(oldDesktop, newDesktop) {
        debugmsg("_onTileDesktopChanged called from tile");
        self._onTileDesktopChanged(tile, oldDesktop, newDesktop);
    });
    tile.movingStarted.connect(function() {
        debugmsg("_onTileMovingChanged called from tile");
        self._onTileMovingStarted(tile);
    });
    tile.movingEnded.connect(function() {
        debugmsg("_onTileMovingEnded called from tile");
        self._onTileMovingEnded(tile);
    });
    tile.movingStep.connect(function() {
        debugmsg("_onTileMovingStep called from tile");
        self._onTileMovingStep(tile);
    });
    // connect to forcedFloatingChanged to handle it FIXME: this should probably be in tilelist.js
    if (tile.isConnectedToForcedFloating) {
        tile.forcedFloatingChanged.connect(function(old_state, new_state){
            if ((old_state === new_state) || (tile.floating)) {
                return; // nothing to do
            }
            if (new_state) { // floating is forced
                debugmsg("floating is forced, we're removing the tile");
                self._onTileRemoved(tile);
                tile.no_remove = true; // FIXME ugly hack which prevents removing a tile twice (happens when a tile in floating mode is closed)
            } else  {//floating has been forced, now it's back to tiled (if it wasn't floating before)
                debugmsg("tile which was previously in floating mode is readded again");
                self._onTileAdded(tile); // TODO is this really needed or do we need not all actions there?
                tile.no_remove = false; // FIXME ugly hack which prevents removing a tile twice (happens when a tile in floating mode is closed)
            }
        });
    } else {
        tile.isConnectedToForcedFloating = true; //FIXME ugly workaround preventing duplicate assignment
    }
    // Add the tile to the layouts
    var client = tile.clients[0];
    var tileLayouts = this._getLayouts(client.desktop, client.screen);
    tileLayouts.forEach(function(layout) {
	debugmsg("adding tile to layout");
        layout.addTile(tile);
    });
    debugmsg(JSON.stringify(tile, 'null', "  "));
    tile.updateEmitSignals();
};

TilingManager.prototype._onTileRemoved = function(tile) {
    //FIXME: this is a workaround, needs to be fixed at a different place
    if (tile.no_remove) {
        debugmsg("tile is floating, no need to remove it");
        return;  
    } else {
        debugmsg("no_remove is false");
    }
    var client = tile.clients[0];
    var tileLayouts = this._getLayouts(client.desktop, client.screen);
    tileLayouts.forEach(function(layout) {
	debugmsg("removing tile from layout");
        layout.removeTile(tile);
    });
    //silence all signals FIXME: this doesn't really work as intended, especially when moving windows to different virtual desktops
    tile.updateEmitSignals();
};

TilingManager.prototype._onNumberDesktopsChanged = function() {
    var newDesktopCount =
            workspace.desktopGridWidth * workspace.desktopGridHeight;
    var onAllDesktops = tiles.tiles.filter(function(tile) {
        return tile.desktop == -1;
    });
    // Remove tiles from desktops which do not exist any more (we only have to
    // care about tiles shown on all desktops as all others have been moved away
    // from the desktops by kwin before)
    for (var i = newDesktopCount; i < this.desktopCount; i++) {
        onAllDesktops.forEach(function(tile) {
           this.layouts[i][tile.screen].removeTile(tile);
        });
    }
    // Add new desktops
    for (var i = this.desktopCount; i < newDesktopCount; i++) {
        this._createDefaultLayouts(i);
        onAllDesktops.forEach(function(tile) {
           this.layouts[i][tile.screen].addTile(tile);
        });
    }
    // Remove deleted desktops
    if (this.desktopCount > newDesktopCount) {
        layouts.length = newDesktopCount;
    }
    this.desktopCount = newDesktopCount;
};

TilingManager.prototype._onNumberScreensChanged = function() {
    // Add new screens
    if (this.screenCount < workspace.numScreens) {
        for (var i = 0; i < this.desktopCount; i++) {
            for (var j = this.screenCount; j < workspace.numScreens; j++) {
                var area = TilingManager.getTilingArea(i, j);
                this.layouts[i][j] = new Tiling(area, this.defaultLayout);
                // Activate the new layout if necessary
                if (i == workspace.currentDesktop - 1) {
                    this.layouts[i][j].activate();
                }
            }
        }
    }
    // Remove deleted screens
    if (this.screenCount > workspace.numScreens) {
        for (var i = 0; i < this.desktopCount; i++) {
            this.layouts[i].length = workspace.numScreens;
        }
    }
    this.screenCount = workspace.numScreens;
};

TilingManager.prototype._onTileScreenChanged =
        function(tile, oldScreen, newScreen) {
    // If a tile is moved by the user, screen changes are handled in the move
    // callbacks below
    if (this._moving) {
        return;
    }
    var client = tile.clients[0];
    var oldLayouts = this._getLayouts(client.desktop, oldScreen);
    var newLayouts = this._getLayouts(client.desktop, newScreen);
    this._changeTileLayouts(tile, oldLayouts, newLayouts);
};

TilingManager.prototype._onTileDesktopChanged =
        function(tile, oldDesktop, newDesktop) {
    var client = tile.clients[0];
    debugmsg("after var client");
    var oldLayouts = this._getLayouts(oldDesktop, client.screen);
    debugmsg("oldLayouts: " + oldLayouts.toString());
    var newLayouts = this._getLayouts(newDesktop, client.screen);
    this._changeTileLayouts(tile, oldLayouts, newLayouts);
};

TilingManager.prototype._onTileMovingStarted = function(tile) {
    // NOTE: This supports only one moving window, breaks with multitouch input
    this._moving = true;
    this._movingStartScreen = tile.clients[0].screen;
}

TilingManager.prototype._onTileMovingEnded = function(tile) {
    var client = tile.clients[0];
    this._moving = false;
    var movingEndScreen = client.screen;
    var windowRect = client.geometry;
    if (this._movingStartScreen != movingEndScreen) {
        // Transfer the tile from one layout to another layout
        var startLayout =
                this.layouts[this._currentDesktop][this._movingStartScreen];
        var endLayout = this.layouts[this._currentDesktop][client.screen];
        startLayout.removeTile(tile);
        endLayout.addTile(tile, windowRect.x + windowRect.width / 2,
                windowRect.y + windowRect.height / 2);
    } else {
        // Transfer the tile to a different location in the same layout
        var layout = this.layouts[this._currentDesktop][client.screen];
        var targetTile = layout.getTile(windowRect.x + windowRect.width / 2,
                windowRect.y + windowRect.height / 2);
        // swapTiles() works correctly even if tile == targetTile
        layout.swapTiles(tile, targetTile);
    }
    workspace.hideOutline();
}

TilingManager.prototype._onTileMovingStep = function(tile) {
    var client = tile.clients[0];
    // Calculate the rectangle in which the window is placed if it is dropped
    var layout = this.layouts[this._currentDesktop][client.screen];
    var windowRect = client.geometry;
    var target = layout.getTileGeometry(windowRect.x + windowRect.width / 2,
            windowRect.y + windowRect.height / 2);
    var targetArea = null;
    if (target != null) {
        targetArea = target.rectangle;
    } else {
        targetArea = layout.layout.screenRectangle;
    }
    // Show an outline where the window would be placed
    // TODO: This is not working yet, the window movement code already disables
    // any active outline
    //workspace.showOutline(targetArea);
}

TilingManager.prototype._changeTileLayouts =
        function(tile, oldLayouts, newLayouts) {
    oldLayouts.forEach(function(layout) {
        if (newLayouts.indexOf(layout) == -1) {
            debugmsg("changeTileLayout: removing tile");
            layout.removeTile(tile);
        }
    });
    newLayouts.forEach(function(layout) {
        if (oldLayouts.indexOf(layout) == -1) {
            debugmsg("changeTileLayout: adding tile");
            layout.addTile(tile);
        }
    });
    this._refresh();
};

TilingManager.prototype._onCurrentDesktopChanged = function() {
    // TODO: This is wrong, we need to activate *all* visible layouts
    this._refresh();
};

TilingManager.prototype._switchLayout = function(desktop, screen, layoutIndex) {
    // TODO: Show the layout switcher dialog
    debugmsg("switching the layout on desktop " + desktop + " on screen " + screen + " to layout with index " + layoutIndex);
    var layoutType = this.availableLayouts[layoutIndex];
    this.layouts[desktop][screen].setLayoutType(layoutType);
};

TilingManager.prototype._toggleFloating = function(tile) {
    // TODO make this a bit more sophisticated
    // TODO
    var self = this;
    tile.floating = !tile.floating;
    debugmsg("before comparision");
    if (tile.floating === tile.forcedFloating && tile.floating === true) {
        debugmsg("tiling state doesn't require a change");
        return;// we have nothing to do
    }
    debugmsg("toggled floating mode, floating is " + tile.floating.toString());
    if (tile.floating) {
        debugmsg("untile the tile");
        this._onTileRemoved(tile);
        tile.no_remove = true; // FIXME ugly hack which prevents removing a tile twice (happens when a tile in floating mode is closed)
        // TODO change the properties to keep the tile above everything else
    } else {
        debugmsg("tile the tile");
        this._onTileAdded(tile);
        tile.no_remove = false; // FIXME ugly hack which prevents removing a tile twice (happens when a tile in floating mode is closed)
        //TODO remove keep-above state
    }
};

TilingManager.prototype._switchFocus = function(direction) {
    var client = workspace.activeClient;
    if (client == null) {
        return;
    }
    var activeTile = this.tiles.getTile(client);
    if (activeTile == null) {
        return;
    }
    var layout = this.layouts[client.desktop - 1][this._currentScreen];
    var nextTile = layout.getAdjacentTile(activeTile, direction, false);
    if (nextTile != null && nextTile != activeTile) {
        workspace.activeClient = nextTile.getActiveClient();
    }
};

TilingManager.prototype._moveTile = function(direction) {
    var client = workspace.activeClient;
    if (client == null) {
        return;
    }
    var activeTile = this.tiles.getTile(client);
    if (activeTile == null || activeTile.floating
            || activeTile.forcedFloating) {
        return;
    }
    var layout = this.layouts[client.desktop - 1][this._currentScreen];
    var nextTile = layout.getAdjacentTile(activeTile, direction, true);
    if (nextTile != null && nextTile != activeTile) {
        layout.swapTiles(activeTile, nextTile);
    }
};

TilingManager.prototype._getLayouts = function(desktop, screen) {
    if (desktop > 0) {
        return [this.layouts[desktop - 1][screen]];
    } else if (desktop == 0) {
        return [];
    } else if (desktop == -1) {
        var result = [];
        for (var i = 0; i < this.desktopCount; i++) {
            result.push(this.layouts[i][screen]);
        }
        return result;
    }
}

TilingManager.prototype._refresh = function() {
    this.layouts[this._currentDesktop][this._currentScreen].deactivate();
    this._currentDesktop = workspace.currentDesktop - 1;
    this.layouts[this._currentDesktop][this._currentScreen].activate();
}
