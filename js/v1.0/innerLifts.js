/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: innerLifts.js /1.0/
 * last update: 16.05.2013.
 */

function oInnerLift(roomId, l) {
	this.roomId = roomId;		// which room
	this.l = l;					// left coordinate (0-39)
	this.stops = [];			// vertical lift position coordinates (stations)
	this.lifts = [];			// actual lift positions in pixel (top)
	this.state = 'stationary';	// enum: [stationary, up, down]
	this.originalData = false;	// for reset

	this.init = function(data) {
		this.originalData = data;

		this.stops = [];
		this.lifts = [];
		for (var i = 0; i < data.length; i++) {
			this.stops.push(Math.abs(data[i]));
			if (data[i] > 0) this.lifts.push(data[i] * 8);
		}
	};

	// reset inner lift positions to default (by using terminal password or after death)
	this.reset = function() {
		this.state = 'stationary'
		this.init(this.originalData);
	};

	this.liftsInStation = function() {
		for (var i = 0; i < this.stops.length; i++) if (this.stops[i] * 8 == this.lifts[0]) return true;

		return false;
	};

	this.stop = function() {
		if (pressedKeys[keys.UP] === true) pressedKeys[keys.UP] = 'hold';
		if (pressedKeys[keys.DOWN] === true) pressedKeys[keys.DOWN] = 'hold';
		this.state = 'stationary';
		game.dork.stand();
	};

	this.animationRoutine = function() {
		for (var i = 0; i < this.lifts.length; i++) draw(344, 216, 24, 8, this.l * 8, this.lifts[i]);
	};

	this.scanRoutine = function() {
		if (this.state == 'stationary') return;

		// if Dork is zapped while lifting, the lifts stopped
		if (game.dork.dieByZapFrames > 0) return;

		if (this.state == 'up') {
			if (this.stops[0] * 8 >= this.lifts[0]) this.stop();
			else {
				for (var i = 0; i < this.lifts.length; i++) {
					// pull up black ball if exists:
					if (game.room.blackBall !== false) {
						if (collisionDetect(game.room.blackBall.x + 5, game.room.blackBall.y + 7, 14, 13, this.l * 8, this.lifts[i], 24, 8)) {
							game.room.blackBall.y -= 4;
						}
					}

					this.lifts[i] -= 4;
				}
				game.dork.y -= 4;
				if (this.liftsInStation()) this.stop();
			}
		}

		if (this.state == 'down') {
			if (this.stops[this.stops.length - 1] * 8 <= this.lifts[this.lifts.length - 1]) this.stop();
			else {
				for (var i = 0; i < this.lifts.length; i++) {
					// push down black ball if exists:
					if (game.room.blackBall !== false) {
						if (collisionDetect(game.room.blackBall.x + 5, game.room.blackBall.y - 1, 14, 13, this.l * 8, this.lifts[i], 24, 8)) {
							game.room.blackBall.y += 4;
						}
					}

					this.lifts[i] += 4;
				}
				game.dork.y += 4;
				if (this.liftsInStation()) this.stop();
			}
		}
	};
}

/**
 * End of innerLifts.js file
 */