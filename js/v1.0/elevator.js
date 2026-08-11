/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: elevator.js /1.0/
 * last update: 16.05.2013.
 */

function oElevator() {
	this.x = 1;					// There are 8 elevator in the system, we always start in the first one
	this.y = 0;					// elevator vertical top position. Total height is 2472px, so the max top is 2472 - one screen(110px) = 2362 - pocket computer
	this.d = false;				// enum: [false, up, down]
	this.sound = false;			// actually play an elevator sound?

	this.init = function() {

	};

	this.animationRoutine = function() {
		// hole bg:
		rect(128, 0, 64, 200, 0);
		// cabin [always fix position :)]
		draw(708, 16, 48, 96, 136, 0);

		// borders:
		for (var i = 0; i < 10; i++) {
			var borderOffset = this.y % 24;
			// left:
			draw(756, 16, 8, 24, 128, (i * 24) - 16 - borderOffset);
			// right:
			draw(756, 16, 8, 24, 184, (i * 24) - 16 - borderOffset);
		}
		// walls:
		var wallOffset = this.y % 200;
		draw(320, 0, 128, 200, 0, 0 - wallOffset);
		draw(320, 0, 128, 200, 192, 0 - wallOffset);
		draw(320, 0, 128, 200, 0, 200 - wallOffset);
		draw(320, 0, 128, 200, 192, 200 - wallOffset);

		// top element (if needed):
		if (this.y < 10) draw(708, 0, 64, 8, 128, 0 - this.y);
		// bottom element (if needed):
		if (this.y > 2354) draw(708, 8, 64, 8, 128, 134 - (this.y - 2354));

		// draw corridors:
		var leftRooms = game.map.rooms[this.x - 1];
		var rightRooms = game.map.rooms[this.x];
		for (var i = 0; i < 6; i++) {
			if (leftRooms[i] > 0) {
				var roomId = leftRooms[i];

				var level = false;
				if (hasRightDoor(roomId) == 2) level = i * 2;
				else if (hasRightDoor(roomId) == 3) level = i * 2 + 1;

				// need to draw this corridor?
				if (level !== false && this.y > 216 * level - 168 && this.y < 216 * level + 96) {
					var offset = this.y - (216 * level - 168);
					// ceil:
					draw(164, 280, 136, 8, 0, 200 - offset);
					// floor:
					draw(164, 312, 136, 8, 0, 248 - offset);
					// bottom:
					draw(164, 288, 136, 8, 0, 256 - offset);
					// background color based on room color:
					var roomColor = roomColors[roomId].bg;
					rect(0, 208 - offset, 136, 40, roomColor);
					// lines:
					for (var j = 0; j < 4; j++) rect(j * 32 + 22, 208 - offset, 2, 40, 12);
				}
			}

			if (rightRooms[i] > 0) {
				var roomId = rightRooms[i];

				var level = false;
				if (hasLeftDoor(roomId) == 1) level = i * 2;
				else if (hasLeftDoor(roomId) == 4) level = i * 2 + 1;
				if (level === false) continue;

				// need to draw this corridor?
				if (this.y > 216 * level - 168 && this.y < 216 * level + 96) {
					var offset = this.y - (216 * level - 168);
					// ceil:
					draw(164, 296, 136, 8, 184, 200 - offset);
					// floor:
					draw(164, 320, 136, 8, 184, 248 - offset);
					// bottom:
					draw(164, 304, 136, 8, 184, 256 - offset);
					// background color based on room color:
					var roomColor = roomColors[roomId].bg;
					rect(184, 208 - offset, 136, 40, roomColor);
					// lines:
					for (var j = 0; j < 4; j++) rect(j * 32 + 200, 208 - offset, 2, 40, 12);
				}
			}
		}
	};

	this.scanRoutine = function() {
		if (game.pocketComputer.state != 'map') return;

		var dorkInTheElevator = false;
		if (game.dork.x >= 129 && game.dork.x <= 156) dorkInTheElevator = true;

		// dork enter the room
		if (game.dork.x <= -25 || game.dork.x >= 315) {
			game.startErase(function() {
				// enter room room:
				var d = game.dork.x <= -25 ? 'left' : 'right';
				game.enterRoom(d);
			});
		}

		var buttonUp = pressedKeys[keys.UP] === true;
		var buttonDown = pressedKeys[keys.DOWN] === true;

		// start moving elevator down
		if (dorkInTheElevator && game.dork.action == 'stand' &&  buttonDown && this.y < 2376) {
			this.d = 'down';
			if (!this.sound) this.sound = audio.request({name: 'elevatorStart'});
		}
		// start moving elevator up
		else if (dorkInTheElevator && game.dork.action == 'stand' && buttonUp && this.y > 0) {
			this.d = 'up';
			if (!this.sound) this.sound = audio.request({name: 'elevatorStart'});
		}

		// move elevator down
		if (this.d == 'down') {
			this.y += 8;

			// stop at the bottom
			if (this.y > 2376) {
				this.y = 2376;
				this.d = false;

				if (this.sound) {
					audio.stopAllSound();
					this.sound = false;
				}
				audio.request({name: 'elevatorStop'});
			}
		}
		// move elevator up
		else if (this.d == 'up') {
			this.y -= 8;

			// stop at the top
			if (this.y < 0) {
				this.y = 0;
				this.d = false;

				if (this.sound) {
					audio.stopAllSound();
					this.sound = false;
				}
				audio.request({name: 'elevatorStop'});
			}
		}

		// in corridor position, we decide to need to stop or not
		if (this.y % 216 === 0 && this.d && !buttonUp && !buttonDown) {
			if (hasLeftCorridor(this.x, this.y) || hasRightCorridor(this.x, this.y)) {
				this.d = false;

				if (this.sound) audio.stopAllSound();
				this.sound = false;
				audio.request({name: 'elevatorStop'});
			}
		}

		// reveal pocket computer map piece
		if (this.y % 216 === 0) {
			// reveal this level of elevator system:
			var level = Math.floor((this.y / 216) / 2);
			game.pocketComputer.revealMap[this.x][level] = 1;
		}
	};

	this.change = function(id) {
		if (id == this.x) return;

		// set elevator number:
		this.x = id;

		// replace areas:
		var area = [
			{ x: 708, y: 0, w: 64, h: 112 },
			{ x: 164, y: 280, w: 136, h: 32 }
		];
		// replace colors:
		var replace = {
			2: elevatorColors[id].bo,
			10: elevatorColors[id].bg
		};
		engine.replaceColorsInSprites(area, replace);
	};

}

/**
 * End of elevator.js file
 */