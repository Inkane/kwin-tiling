
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
    print("TwoThirdLayout: addTile");
    if (this.tiles.length == 0) {
        // The first tile fills the whole screen
        var rect = Qt.rect(this.screenRectangle.x,
                           this.screenRectangle.y,
                           this.screenRectangle.width,
                           this.screenRectangle.height);
        this._createTile(rect);
    } else if (this.tiles.length == 1) {
        // The second tile causes the two-thirds/one-third split
        var lastRect = this.tiles[this.tiles.length - 1].rectangle;
        var newRect = Qt.rect(lastRect.x,
                              lastRect.y,
                              lastRect.width,
                              lastRect.height);
        var splitX = Math.floor(3 * lastRect.width / 2);
        lastRect.width = splitX;
        newRect.x = newRect.x + splitX;
        newRect.width = newRect.width - splitX;
        this._createTile(newRect);
    } else {
        //_updateStackingArea will take care of height and y
        var newRect  = Qt.rect(this.tiles[1].rect.x,
                               0,
                               this.tiles[1].rect.width,
                               0);
        this._createTile(newRect);
        this._updateStackingArea();
    }
    var lastRect = this.tiles[this.tiles.length - 1].rectangle;
}

TwoThirdLayout.prototype.removeTile = function(tileIndex) {
    if (tileIndex == 0) {
        if (this.tiles.length != 1) {
            // TODO: some tile has to become the new master tile
        }
        this.tiles.pop(); // remove last tile
    } else {
        this.tiles.pop(tileIndex); //remove tile at index
        this._updateStackingArea(); // takes care of the rest
    }
}

TwoThirdLayout.prototype.resizeTile = function(tileIndex, rectangle) {
    // TODO
}

TwoThirdLayout.prototype._createTile = function(rect) {
    // Create a new tile and add it to the list
    var tile = {};
    tile.rectangle = rect;
    tile.neighbours = [];
    tile.hasDirectNeighbour = [];
    this.tiles.push(tile);
}

TwoThirdLayout.prototype._updateStackingArea = function() {
    // @precondition: this.tiles.length > 0
    // Divide the stacking area into equal chunks
    // set the neighbours
    // FIXME this will overwrite existing neighbours which maybe is not so efficient, but it makes everything easier
    var stackedCount = this.tiles.length - 1;
    // clear master area's neighbours' arrays
    this.tiles[0].neighbours = [];
    this.tiles[0].hasDirectNeighbour = [];
    if (this.tiles.length < 2) {
        return ;
    }
    var stackingAreaX = this.screenRectangle.x - this.tiles[0].rectangle.x; // it's the same everywhere in the stacking area
    var stackingAreaHeight = Math.floor(this.tiles[0].rectangle.height / stackedCount) //FIXME if we always use floor, we ignore some space
    var currentY = 0; //stores the y coordinate of the current rect
    for (var i=1; i < this.tiles.length; i++) {
        this.tiles[i].rectangle.y = currentY;
        this.tiles[i].rectangle.height = stackingAreaHeight;
        this.tiles[i].neighbours[Direction.Left] = 0;
        this.tiles[0].neighbours[Direction.Right] = i;
        this.tiles[i].hasDirectNeighbour[Left] = true;
        this.tiles[i].hasDirectNeighbour[Right] = false;
        if (i > 1) {
            this.tiles[i].neighbour[Direction.Up] = i-1
            this.tiles[i].hasDirectNeighbour[Direction.Up] = true;
        } else {
            this.tiles[i].hasDirectNeighbour[Direction.Up] = false;
        }
        if (i < this.tiles.length - 1) {
            this.tiles[i].neighbour[Direction.Down] = i+1
            this.tiles[i].hasDirectNeighbour[Direction.Down] = true;
        } else {
            this.tiles[i].hasDirectNeighbour[Direction.Down] = false;
        }
        currentY += stackingAreaHeight;
    }
    this.tiles[0].hasDirectNeighbour[Direction.Right] = true;
    this.tiles[0].hasDirectNeighbour[Direction.Down] = false;
    this.tiles[0].hasDirectNeighbour[Direction.Left] = false;
    this.tiles[0].hasDirectNeighbour[Direction.Up] = false;
}