Qt.include("helper.js");

/**
 * Class which arranges the windows in a spiral with the largest window filling
 * the left half of the screen.
 */
function TwoThirdLayout(screenRectangle) {
    Layout.call(this, screenRectangle);
    // TODO
}

TwoThirdLayout.name = "twothird";
// TODO: Add an image for the layout switcher
TwoThirdLayout.image = null;

TwoThirdLayout.prototype = new Layout();
TwoThirdLayout.prototype.constructor = TwoThirdLayout;

TwoThirdLayout.prototype.onLayoutAreaChange = function(oldArea, newArea) {
    // TODO: Scale all tiles
}

TwoThirdLayout.prototype.resetTileSizes = function() {
    // Simply erase all tiles and recreate them to recompute the initial sizes
    var tileCount = this.tiles.length;
    this.tiles.length = 0;
    for (var i = 0; i < tileCount; i++) {
        addTile();
    }
}

TwoThirdLayout.prototype.addTile = function() {
    // @postcondition: before(this.tiles.length) + 1 == after(this.tiles.length)
    var length_before = this.tiles.length
    debugmsg("TwoThirdLayout: addTile");
    if (this.tiles.length == 0) {
        debugmsg("first tile added");
        // The first tile fills the whole screen
        var rect = Qt.rect(this.screenRectangle.x,
                           this.screenRectangle.y,
                           this.screenRectangle.width,
                           this.screenRectangle.height);
        this._createTile(rect);
    } else if (this.tiles.length == 1) {
        debugmsg("second tile added");
        // The second tile causes the two-thirds/one-third split
        var lastRect = this.tiles[this.tiles.length - 1].rectangle;
        var newRect = Qt.rect(lastRect.x,
                              lastRect.y,
                              lastRect.width,
                              lastRect.height);
        var splitX = Math.floor(2 * lastRect.width / 3);
        lastRect.width = splitX;
        newRect.x = newRect.x + splitX;
        newRect.width = newRect.width - splitX;
        this._createTile(newRect);
    } else {
        debugmsg("tile number " + (this.tiles.length + 1) + " gets added");
        //_updateStackingArea will take care of height and y
        var newRect  = Qt.rect(this.tiles[1].rectangle.x,
                               1,
                               this.tiles[1].rectangle.width,
                               1);
        this._createTile(newRect);
        debugmsg("createTile finished");
        this._updateStackingArea();
        debugmsg("updateStackingArea finished");
    }
    debugmsg("addTile finished");
    var lastRect = this.tiles[this.tiles.length - 1].rectangle;
    assert(this.tiles.length === length_before + 1,"Number of tiles is wrong: " + this.tiles.length + " ,should be " + length_before + 1);
}

TwoThirdLayout.prototype.removeTile = function(tileIndex) {
    //FIXME: doesn't work when there are less than 3 tiles
    // @precondition this.tiles.length > 0
    // @postcondition before(this.tiles.length) === after(this.tiles.length) - 1
    assert(this.tiles.length > 0 ,"Can't remove tile, because there is none!");
    var length_before = this.tiles.length;
    if (tileIndex == 0) {
        if (this.tiles.length != 1) {
            // TODO: some tile has to become the new master tile
        }
        this.tiles.pop(); // remove last tile
    } else {
        this.tiles.pop(tileIndex); //remove tile at index
        this._updateStackingArea(); // takes care of the rest
    }
    assert(this.tiles.length === length_before - 1,"Number of tiles is wrong: " + this.tiles.length + " ,should be " + length_before + 1);
}

TwoThirdLayout.prototype.resizeTile = function(tileIndex, rectangle) {
    // TODO
}

TwoThirdLayout.prototype._createTile = function(rect) {
    debugmsg("twothird: _createTile");
    // Create a new tile and add it to the list
    var tile = {};
    tile.rectangle = rect;
    tile.neighbours = [];
    tile.hasDirectNeighbour = [];
    this.tiles.push(tile);
}

TwoThirdLayout.prototype._updateStackingArea = function() {
    // @precondition: this.tiles.length > 1
    // Divide the stacking area into equal chunks
    // set the neighbours
    // FIXME this will overwrite existing neighbours which maybe is not so efficient, but it makes everything easier
    assert(this.tiles.length > 1, "There's no stacking area to update!");
    // clear master area's neighbours arrays
    this.tiles[0].neighbours = [];
    this.tiles[0].hasDirectNeighbour = [];
    var stackedCount = this.tiles.length - 1;
    if (stackedCount === 0) {
        //TODO
        debugmsg("stackedCount is zero, not implemented yet!");
    } else {
        //stackingAreaX and stackingAreaX are the same for every tile in the stacking area
        var stackingAreaX = this.screenRectangle.x + this.tiles[0].rectangle.width;
        var stackingAreaWidth = this.screenRectangle.width - stackingAreaX;
        var stackingAreaHeight = Math.floor(this.tiles[0].rectangle.height / stackedCount) //FIXME if we always use floor, we ignore some space
        var currentY = 0; //stores the y coordinate of the current rect
        debugmsg("_updateStackingArea: variables are initialized");
        for (var i=1; i < this.tiles.length; i++) {
            this.tiles[i].rectangle.x = stackingAreaX;
            this.tiles[i].rectangle.width = stackingAreaWidth;
            this.tiles[i].rectangle.y = currentY;
            this.tiles[i].rectangle.height = stackingAreaHeight;
            this.tiles[i].neighbours[Direction.Left] = 0;
            this.tiles[0].neighbours[Direction.Right] = i;
            this.tiles[i].hasDirectNeighbour[Direction.Left] = true;
            this.tiles[i].hasDirectNeighbour[Direction.Right] = false;
            debugmsg("in middle of for loop, iteration " + i);
            if (i > 1) {
                this.tiles[i].neighbours[Direction.Up] = i-1
                this.tiles[i].hasDirectNeighbour[Direction.Up] = true;
            } else {
                this.tiles[i].hasDirectNeighbour[Direction.Up] = false;
            }
            if (i < this.tiles.length - 1) {
                this.tiles[i].neighbours[Direction.Down] = i+1
                this.tiles[i].hasDirectNeighbour[Direction.Down] = true;
            } else {
                this.tiles[i].hasDirectNeighbour[Direction.Down] = false;
            }
            currentY += stackingAreaHeight;
        }
        debugmsg("updateStackingArea after for loop");
    }
    this.tiles[0].hasDirectNeighbour[Direction.Right] = true;
    this.tiles[0].hasDirectNeighbour[Direction.Down] = false;
    this.tiles[0].hasDirectNeighbour[Direction.Left] = false;
    this.tiles[0].hasDirectNeighbour[Direction.Up] = false;
}