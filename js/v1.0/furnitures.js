/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: furnitures.js /1.0/
 * last update: 16.05.2013.
 */

function oFurniture(roomId, type, l, b) {
	this.roomId = roomId;			// which room
	this.type = type;				// furniture type (e.g. bookcase, toilet, fireplace)
	this.l = l;						// left coordinate (0-39)
	this.b = b;						// bottom coordinate (0-24)
	this.visible = true;			// furniture disappear after Dork scan it
	this.contentType = 'nothing';	// What contains this furniture, enum: [nothing, snooze, liftInit, puzzle]
	this.puzzle = false;			// which puzzle is in this furniture? (only with puzzle contentType)
	this.imageData = false;			// colored imageData for drawing

	this.init = function() {
		var fp = furnitureProperties[this.type];
		this.searchTime = fp.s;		// search time in pixels
		this.generateImage();
	};

	this.generateImage = function() {
		var fp = furnitureProperties[this.type];

		this.canvas = document.createElement('canvas');
		this.canvas.width = fp.w;
		this.canvas.height = fp.h;
		this.canvasContext = this.canvas.getContext('2d');

		this.canvasContext.drawImage(baseSprites, fp.x, fp.y, fp.w, fp.h, 0, 0, fp.w, fp.h);
		this.baseSpriteData = this.canvasContext.getImageData(0, 0, fp.w, fp.h);
		this.baseSpriteDataPix = this.baseSpriteData.data;

		var newImageData = this.canvasContext.createImageData(fp.w, fp.h);

		var rcp = getActualPalette();

		for (var i = 0, n = this.baseSpriteDataPix.length; i < n; i += 4) {
			var colorIndex = getColorIndex(this.baseSpriteDataPix[i], this.baseSpriteDataPix[i + 1], this.baseSpriteDataPix[i + 2]);
			var rc = fp.r[this.roomId] && colorIndex in fp.r[this.roomId] ? rcp[fp.r[this.roomId][colorIndex]] : rcp[colorIndex];

			newImageData.data[i] = parseInt(rc[0] + rc[1], 16);
			newImageData.data[i + 1] = parseInt(rc[2] + rc[3], 16);
			newImageData.data[i + 2] = parseInt(rc[4] + rc[5], 16);
			newImageData.data[i + 3] = this.baseSpriteDataPix[i + 3];
		}

		var tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = fp.w;
		tmpCanvas.height = fp.h;
		var tmpContext = tmpCanvas.getContext('2d');
		tmpContext.putImageData(newImageData, 0, 0);

		this.imageData = new Image();
		this.imageData.src = tmpCanvas.toDataURL("image/png");
	};

	this.draw = function() {
		if (!this.visible) return;
		var fp = furnitureProperties[this.type];
		engine.canvas.drawImage(this.imageData, 0, 0, fp.w, fp.h, (this.l * 8) * 3, ((this.b + 1) * 8 - fp.h) * 3, fp.w * 3, fp.h * 3);
	};
}

/**
 * End of furnitures.js file
 */