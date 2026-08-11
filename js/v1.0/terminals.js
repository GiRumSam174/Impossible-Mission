/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: terminals.js /1.0/
 * last update: 16.05.2013.
 */

function oTerminal(roomId, l, b) {
	this.roomId = roomId;		// which room
	this.l = l;					// left position
	this.b = b;					// bottom position
	this.menu = 3;				// menu position (1 - lift init request, 2 - snooze request, 3 - log off)
	this.message = false;		// 1-4: lift init success, lift init fail, snooze success, snooze fail


	this.init = function() {
		this.generateImage();
	};

	this.generateImage = function() {
		this.canvas = document.createElement('canvas');
		this.canvas.width = 24;
		this.canvas.height = 22;
		this.canvasContext = this.canvas.getContext('2d');

		this.canvasContext.drawImage(baseSprites, 589, 544, 24, 22, 0, 0, 24, 22);
		this.baseSpriteData = this.canvasContext.getImageData(0, 0, 24, 22);
		this.baseSpriteDataPix = this.baseSpriteData.data;

		var newImageData = this.canvasContext.createImageData(24, 22);

		var rcp = getActualPalette();

		for (var i = 0, n = this.baseSpriteDataPix.length; i < n; i += 4) {
			var colorIndex = getColorIndex(this.baseSpriteDataPix[i], this.baseSpriteDataPix[i + 1], this.baseSpriteDataPix[i + 2]);

			if (colorIndex == 14) var rc = rcp[roomColors[this.roomId].pg];
			else if (colorIndex == 1) var rc = rcp[roomColors[this.roomId].ps];
			else var rc = rcp[colorIndex];

			newImageData.data[i] = parseInt(rc[0] + rc[1], 16);
			newImageData.data[i + 1] = parseInt(rc[2] + rc[3], 16);
			newImageData.data[i + 2] = parseInt(rc[4] + rc[5], 16);
			newImageData.data[i + 3] = this.baseSpriteDataPix[i + 3];
		}

		var tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = 24;
		tmpCanvas.height = 22;
		var tmpContext = tmpCanvas.getContext('2d');
		tmpContext.putImageData(newImageData, 0, 0);

		this.imageData = new Image();
		this.imageData.src = tmpCanvas.toDataURL("image/png");
	};

	this.draw = function() {
		engine.canvas.drawImage(this.imageData, 0, 0, 24, 22, (this.l * 8) * 3, ((this.b + 1) * 8 - 22) * 3, 24 * 3, 22 * 3);
	};

	// animation and scan routine for terminal scene:
	this.animationRoutine = function() {
		var rc = roomColors[this.roomId];
		var mc = rc.ps == 12 ? 11 : 12;
		// bg:
		rect(0, 0, 320, 200, rc.bg);
		// desk shape:
		rect(0, 196, 320, 4, rc.ps);
		// desk surface:
		poly(mc, [ [22, 177], [298, 177], [340, 196], [-20, 196] ]);
		// monitor stand:
		rect(64, 168, 192, 24, 0);
		// monitor border:
		rect(16, 0, 288, 168, rc.ps);
		// monitor border corners:
		strokeStyle(rc.bg);
		engine.canvas.lineWidth = 10;
		engine.canvas.beginPath();arc(20, 4, 6, 180, 270);engine.canvas.stroke();
		engine.canvas.beginPath();arc(300, 4, 6, 270, 0);engine.canvas.stroke();
		engine.canvas.beginPath();arc(20, 164, 6, 90, 180);engine.canvas.stroke();
		engine.canvas.beginPath();arc(300, 164, 6, 0, 90);engine.canvas.stroke();
		// monitor inner corners:
		rect(32, 8, 256, 152, 15);
		// monitor inner walls:
		poly(0, [ [32, 9], [44, 20], [44, 148], [32, 160] ]);
		poly(0, [ [32, 8], [287, 8], [275, 20], [45, 20] ]);
		poly(mc, [ [288, 8], [288, 160], [276, 148], [276, 20] ]);
		poly(mc, [ [45, 148], [275, 148], [287, 160], [33, 160] ]);
		// monitor image:
		rect(44, 20, 232, 128, 9);
		// asterisks:
		draw(300, 299, 23, 7, 48, 24);
		draw(300, 299, 23, 7, 248, 24);
		// monitor texts:
		var id = this.roomId;
		if (id < 10) id = '0' + id;
		text('security terminal ' + id, 80, 31, 7);
		text('select function', 96, 47, 7);

		if (this.message == 1 || this.message == 2) {
			draw(300, 306, 168, 23, 80, 56);
			if (this.message == 1) text('password accepted', 96, 71, 7);
			if (this.message == 2) text('password required', 96, 71, 7);
		}
		else {
			text('reset lifting platforms', 80, 63, 7);
			text('in this room.', 96, 71, 7);
		}

		if (this.message == 3 || this.message == 4) {
			draw(300, 306, 168, 23, 80, 80);
			if (this.message == 3) text('password accepted', 96, 95, 7);
			if (this.message == 4) text('password required', 96, 95, 7);
		}
		else {
			text('temporarily disable', 80, 87, 7);
			text('robots in this room.', 96, 95, 7);
		}

		text('log off.', 80, 143, 7);

		// draw arrow:
		var y = 143;
		if (this.menu == 1) y = 63;
		if (this.menu == 2) y = 87;
		text('==>', 48, y, 7);
	};

	this.scanRoutine = function() {
		if (this.message) return;

		// stop sounds:
		audio.stopAllSound();

		var buttonUp = pressedKeys[keys.UP] === true;
		var buttonDown = pressedKeys[keys.DOWN] === true;
		var buttonFire = fire();

		if (buttonUp && !buttonDown) {
			pressedKeys[keys.UP] = 'hold';
			this.menu--;
			if (this.menu < 1) this.menu = 1;
		}
		if (buttonDown && !buttonUp) {
			pressedKeys[keys.DOWN] = 'hold';
			this.menu++;
			if (this.menu > 3) this.menu = 3;
		}
		if (!buttonUp && !buttonDown && buttonFire) {
			holdFire();
			if (this.menu == 1) {
				if (game.liftInits > 0) {
					game.liftInits--;
					game.room.resetLifts();
					this.message = 1;
					var _this = this; setTimeout(function() { _this.message = false }, 1800);
				}
				else {
					this.message = 2;
					var _this = this; setTimeout(function() { _this.message = false }, 1800);
				}
			}
			else if (this.menu == 2) {
				if (game.snoozes > 0) {
					game.snoozes--;
					game.snoozeTime = 600; // ~ 16 second
					this.message = 3;
					var _this = this; setTimeout(function() { _this.message = false }, 1800);
				}
				else {
					this.message = 4;
					var _this = this; setTimeout(function() { _this.message = false }, 1800);
				}
			}
			else if (this.menu == 3) {
				if (game.room.droids.length) game.room.droidSound = 'needToStart';
				game.scene = 'room';
				game.actualTerminal = false;
				this.message = false;
			}
		}
	};
}

/**
 * End of terminals.js file
 */