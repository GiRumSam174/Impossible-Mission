/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: puzzles.js /1.0/
 * last update: 16.05.2013.
 */

function oPuzzle(num) {
	this.num = num;							// puzzle id (0-35)
	this.set = Math.floor(num / 4);			// puzzle set (0-8)
	this.numOfSet = num % 4;				// in set number (0-3)
	this.color = 5;							// 5=green, 7=yellow, 3=cyan
	this.flipV = false;						// is vertical transformed?
	this.flipH = false;						// is horizontal transformed?
	this.correctOrientation = false;		// is in correct orientation? (set only after phone call)
	this.imageData = false;					// rotated, colored imageData
	this.graphics = { x: 449 + this.numOfSet * 50, y: 1 + this.set * 25 };		// graphics coordinates
	this.overlapPuzzles = [];				// puzzles combined to the original puzzle

	this.setRandomProperties = function(color) {
		if (!color) this.color = [5, 7, 3][rnd(3) - 1];
		else this.color = color;

		this.flipV = rnd(2) == 1 ? true : false;
		this.flipH = rnd(2) == 1 ? true : false;
		this.generateImage();
	};

	this.clone = function() {
		var clone = new oPuzzle(this.num);
		clone.color = this.color;
		clone.flipV = this.flipV;
		clone.flipH = this.flipH;

		clone.generateImage();

		for (var i = 0; i < this.overlapPuzzles.length; i++) clone.overlapPuzzles[i] = this.overlapPuzzles[i].clone();

		return clone;
	};

	this.generateImage = function() {
		this.canvas = document.createElement('canvas');
		this.canvas.width = 48;
		this.canvas.height = 21;
		this.canvasContext = this.canvas.getContext('2d');

		if (this.flipH) {
			this.canvasContext.translate(48, 0);
			this.canvasContext.scale(-1, 1);
		}

		if (this.flipV) {
			this.canvasContext.translate(0, 21);
			this.canvasContext.scale(1, -1);
		}

		this.canvasContext.drawImage(baseSprites, this.graphics.x, this.graphics.y, 48, 21, 0, 0, 48, 21);
		this.baseSpriteData = this.canvasContext.getImageData(0, 0, 48, 21);
		this.baseSpriteDataPix = this.baseSpriteData.data;

		var newImageData = this.canvasContext.createImageData(48, 21);

		var color = gameColors[this.color];
		var colorBlack = palette.sprite[0];

		for (var i = 0, n = this.baseSpriteDataPix.length; i < n; i += 4) {
			var c = this.baseSpriteDataPix[i];
			if (c == 0) {
				newImageData.data[i] = parseInt(color[0] + color[1], 16);
				newImageData.data[i + 1] = parseInt(color[2] + color[3], 16);
				newImageData.data[i + 2] = parseInt(color[4] + color[5], 16);
				newImageData.data[i + 3] = this.baseSpriteDataPix[i + 3];
			}
			else {
				newImageData.data[i] = parseInt(colorBlack[0] + colorBlack[1], 16);
				newImageData.data[i + 1] = parseInt(colorBlack[2] + colorBlack[3], 16);
				newImageData.data[i + 2] = parseInt(colorBlack[4] + colorBlack[5], 16);
				newImageData.data[i + 3] = this.baseSpriteDataPix[i + 3];
			}
		}

		var tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = 48;
		tmpCanvas.height = 21;
		var tmpContext = tmpCanvas.getContext('2d');
		tmpContext.putImageData(newImageData, 0, 0);

		this.imageData = new Image();
		this.imageData.src = tmpCanvas.toDataURL("image/png");
	};

	this.draw = function(x, y) {
		if (!this.imageData) return;

		engine.canvas.drawImage(this.imageData, 0, 0, 48, 21, x * 3, y * 3, 48 * 3, 21 * 3);

		if (this.overlapPuzzles.length) {
			for (var i = 0; i < this.overlapPuzzles.length; i++) {
				engine.canvas.drawImage(this.overlapPuzzles[i].imageData, 0, 0, 48, 21, x * 3, y * 3, 48 * 3, 21 * 3);
			}
		}
	};

	this.fixOrientation = function() {
		this.flipV = false;
		this.flipH = false;
		this.correctOrientation = true;
		this.generateImage();
	};

	this.overlap = function(puzzle, undoPlace) {
		/* the cummulated "original" puzzle */

		var origCanvas = document.createElement('canvas');
		origCanvas.width = 48;
		origCanvas.height = 21;
		var origCanvasContext = origCanvas.getContext('2d');
		origCanvasContext.drawImage(this.imageData, 0, 0);

		for (var i = 0; i < this.overlapPuzzles.length; i++) {
			origCanvasContext.drawImage(this.overlapPuzzles[i].imageData, 0, 0);
		}

		var origData = origCanvasContext.getImageData(0, 0, 48, 21);
		var origDataPix = origData.data;

		/* the overlapped puzzle */

		var newCanvas = document.createElement('canvas');
		newCanvas.width = 48;
		newCanvas.height = 21;
		var newCanvasContext = newCanvas.getContext('2d');
		newCanvasContext.drawImage(puzzle.imageData, 0, 0);

		for (var i = 0; i < puzzle.overlapPuzzles.length; i++) {
			newCanvasContext.drawImage(puzzle.overlapPuzzles[i].imageData, 0, 0);
		}

		var newData = newCanvasContext.getImageData(0, 0, 48, 21);
		var newDataPix = newData.data;

		/* compare */
		for (var i = 0, fadeCount = 0, n = origDataPix.length; i < n; i += 4) {
			var o1 = origDataPix[i];
			var o2 = origDataPix[i + 1];
			var o3 = origDataPix[i + 2];
			var o4 = origDataPix[i + 3];

			var n1 = newDataPix[i];
			var n2 = newDataPix[i + 1];
			var n3 = newDataPix[i + 2];
			var n4 = newDataPix[i + 3];

			if (o4 == 255 && n4 == 255) fadeCount++;
		}

		if (fadeCount === 172) {
			// set pocket computer undo:
			game.pocketComputer.setUndo(undoPlace);

			this.overlapPuzzles.push(puzzle.clone());
			for (var i = 0; i < puzzle.overlapPuzzles.length; i++) this.overlapPuzzles.push(puzzle.overlapPuzzles[i].clone());
			
			return true;
		}
		else {
			return false;
		}

	};

	this.isSolved = function() {
		if (this.flipV || this.flipH) return false;
		if (this.overlapPuzzles.length !== 3) return false;

		return true;
	};
}

/**
 * End of puzzles.js file
 */