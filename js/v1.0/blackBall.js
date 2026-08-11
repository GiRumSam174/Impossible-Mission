/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: blackBall.js /1.0/
 * last update: 16.05.2013.
 */

function oBlackBall(roomId) {
	this.roomId = roomId;		// The room, where the black ball live in.
	this.x;						// horizontal position (in pixels)
	this.y;						// vertical position (in pixels)
	this.status = 'moving';		// enum: [moving, eated]
	this.imageData = false;		// colored imageData for drawing

	this.init = function() {
		this.x = blackBalls[this.roomId].x;
		this.y = blackBalls[this.roomId].y;
		this.generateImage();

		// special black ball:
		if (this.roomId == 28) this.resetBB28();
	};

	this.reset = function() {
		this.x = blackBalls[this.roomId].x;
		this.y = blackBalls[this.roomId].y;
		this.status = 'moving';
		this.resetBB28();
	};

	this.resetBB28 = function() {
		// reset the special black ball in Room #28:
		if (this.roomId == 28) {
			this.xd = 1;		// horizontal moving direction
			this.yd = -1;		// vertical moving direction
			this.step = 0;
		}
	};

	this.generateImage = function() {
		this.canvas = document.createElement('canvas');
		this.canvas.width = 24;
		this.canvas.height = 19;
		this.canvasContext = this.canvas.getContext('2d');
		this.canvasContext.drawImage(baseSprites, 0, 581, 24, 19, 0, 0, 24, 19);
		this.baseSpriteData = this.canvasContext.getImageData(0, 0, 24, 19);
		this.baseSpriteDataPix = this.baseSpriteData.data;

		var newImageData = this.canvasContext.createImageData(24, 19);

		var rcp = getActualPalette();

		for (var i = 0, n = this.baseSpriteDataPix.length; i < n; i += 4) {
			var colorIndex = getColorIndex(this.baseSpriteDataPix[i], this.baseSpriteDataPix[i + 1], this.baseSpriteDataPix[i + 2]);
			var rc = colorIndex == 1 ? rcp[roomColors[this.roomId].db] : rcp[colorIndex];

			newImageData.data[i] = parseInt(rc[0] + rc[1], 16);
			newImageData.data[i + 1] = parseInt(rc[2] + rc[3], 16);
			newImageData.data[i + 2] = parseInt(rc[4] + rc[5], 16);
			newImageData.data[i + 3] = this.baseSpriteDataPix[i + 3];
		}

		var tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = 24;
		tmpCanvas.height = 19;
		var tmpContext = tmpCanvas.getContext('2d');
		tmpContext.putImageData(newImageData, 0, 0);

		this.imageData = new Image();
		this.imageData.src = tmpCanvas.toDataURL("image/png");
	};

	this.animationRoutine = function() {
		if (this.status == 'eated') return;

		// drawing:
		engine.canvas.drawImage(this.imageData, 0, 0, 24, 19, this.x * 3, this.y * 3, 24 * 3, 19 * 3);
	};

	this.scanRoutine = function() {
		// if black ball has eaten, do nothing:
		if (this.status == 'eated') return;

		// if there is snooze time, the black ball do nothing:
		if (game.snoozeTime > 0) return;

		// if Dork is falling down, the black ball do nothing:
		if (game.dork.action == 'fallDown') return;

		// if Dork is zapped, the black ball do nothing:
		if (game.dork.dieByZapFrames > 0) return;

		if (this.roomId == 28) {
			// In Room #28, there is a special black ball. Moves like an infinity sign.
			var offsetX = Math.sin(this.step * (Math.PI/180));
			var offsetY = -Math.sin(this.step * 2 * (Math.PI/180));

			this.x = 148 + offsetX * 105;
			this.y = 67 + offsetY * 20;

			this.step += 5;

			if (this.step > 359) this.step = this.step - 360;
			return;
		}

		// collision detect with droids:
		for (var i = 0; i < game.room.droids.length; i++) {
			var d = game.room.droids[i];
			if (collisionDetect(this.x + 2, this.y + 2, 20, 15, d.x, d.y, 14, 21)) {
				this.status = 'eated';
				return;
			}
		}

		var bbArea = { x: this.x + 5, y: this.y + 2, w: 14, h: 14 };

		// calculate position, moving, collision detection
		var collision = { top: false, bottom: false, left: false, right: false };
		function collisionDirections(x1, y1, w1, h1, x2, y2, w2, h2) {
			return {
				top: collisionDetect(x1, y1 - 1, w1, h1, x2, y2, w2, h2),
				bottom: collisionDetect(x1, y1 + 1, w1, h1, x2, y2, w2, h2),
				left: collisionDetect(x1 - 1, y1, w1, h1, x2, y2, w2, h2),
				right: collisionDetect(x1 + 1, y1, w1, h1, x2, y2, w2, h2)
			};
		}

		// collision detect with platforms:
		for (var i = 0; i < roomPlatforms[this.roomId].length; i++) {
			var p = roomPlatforms[this.roomId][i];
			var platformArea = { x: p.x * 8, y: p.y * 8, w: p.l * 8, h: 8 };
			var c = collisionDirections(bbArea.x, bbArea.y, bbArea.w, bbArea.h, platformArea.x, platformArea.y, platformArea.w, platformArea.h);
			if (c.top) collision.top = true;
			if (c.bottom) collision.bottom = true;
			if (c.left) collision.left = true;
			if (c.right) collision.right = true;
		}

		// collision detect with lifts:
		for (var i = 0; i < game.room.liftGroups.length; i++) {
			var g = game.room.liftGroups[i];
			for (var k = 0; k < g.lifts.length; k++) {
				var l = g.lifts[k];
				var liftArea = { x: g.l * 8, y: l, w: 24, h: 8 };
				var c = collisionDirections(bbArea.x, bbArea.y, bbArea.w, bbArea.h, liftArea.x, liftArea.y, liftArea.w, liftArea.h);
				if (c.top) collision.top = true;
				if (c.bottom) collision.bottom = true;
				if (c.left) collision.left = true;
				if (c.right) collision.right = true;
			}
		}
		
		// collision detect with borders:
		if (this.x - 1 < 8) collision.left = true;
		if (this.x + 1 > 288) collision.right = true;

		// if pushed down, appear on the top! :D
		if (this.y >= 198) this.y = -50;

		if (getSFC() % 3 === 0) return;
		// moving direction calculating:
		var dorkXCenter = game.dork.x + 17;
		var dorkYCenter = game.dork.y + 20;
		var bbXCenter = this.x + 12;
		var bbYCenter = this.y + 10;

		if (dorkXCenter < bbXCenter && !collision.left) this.x -= 1;
		else if (dorkXCenter > bbXCenter && !collision.right) this.x += 1;

		if (dorkYCenter < bbYCenter && !collision.top) this.y -= 1;
		else if (dorkYCenter > bbYCenter && !collision.bottom) this.y += 1;
	};
}

/**
 * End of blackBall.js file
 */