/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: rooms.js /1.0/
 * last update: 16.05.2013.
 */

function oRoom(num) {
	this.num = num;								// id number (1-32)
	this.type = num < 31 ? 'normal' : 'organ';	// enum: [normal, organ]

	this.elevatorLeft = 0;						// left side elevator number (1-8 or 0 if not)
	this.elevatorRight = 0;						// right side elevator number (1-8 or 0 if not)
	this.y = 1;									// elevator level (1-6)
	this.revealed = false;						// room is revealed when Dork enter to it (a flag for the pocket computer map).

	this.platforms = [];		// platforms (?)
	this.furnitures = [];		// array of oFurniture objects
	this.terminals = [];		// array of oTerminal objects
	this.liftGroups = [];		// array of oInnerLift objects
	this.blackBall = false;		// false or one oBlackBall object if exists
	this.droids = [];			// array of oDroid objects

	this.droidSound = false;	// background noise of droids

	if (this.type == 'organ') {
		// organ room properties:
		this.organ = {
			checkerboardStartColor: 0,			// the first, upper left rectangle background
			nextStep: 3,						// how many tones on the next round
			tones: [],							// the array of tone objects: { x, y: position on checkerboard, color, tone: organTone{x}.ogg }
			pointerX: 134,						// horizontal position of the pointer in pixels
			pointerY: 60,						// vertical position of the pointer in pixels
			status: 'playTones',				// enum: [playTones, pointer, clickTone, win]
			playTonesFrames: 0,					// all tones playing animation frame counter
			clickToneFrames: 0,					// one tone playing animation frame counter
			clickedToneIndex: false,			// which tone has been clicked
			clickedTones: [],					// clicked tone queue for validating solution (array of tone indexes)
			winFrameCounter: 0,					// for the flashing checkerboard
		};
	}
	else this.organ = false;

	this.init = function() {
		// set level and elevator connections:
		for (var i = 0; i < 9; i++) {
			var r = game.map.rooms[i];
			var level = r.indexOf(this.num);
			if (level !== -1) {
				this.y = level;
				if (hasLeftDoor(this.num)) this.elevatorLeft = i;
				if (hasRightDoor(this.num)) this.elevatorRight = i + 1;
				break;
			}
		}

		// set furnitures:
		for (var j = 0; j < roomFurnitures[this.num].length; j++) {
			var f = roomFurnitures[this.num][j];
			this.furnitures[j] = new oFurniture(this.num, f.type, f.l, f.b);
			this.furnitures[j].init();
		}

		// set terminals:
		for (var j = 0; j < roomTerminals[this.num].length; j++) {
			var t = roomTerminals[this.num][j];
			this.terminals[j] = new oTerminal(this.num, t.l, t.b);
			this.terminals[j].init();
		}

		// set inner lifts:
		for (var j = 0; j < innerLifts[this.num].length; j++) {
			var l = innerLifts[this.num][j];
			this.liftGroups[j] = new oInnerLift(this.num, l.l);
			this.liftGroups[j].init(l.s);
		}

		// set blackball:
		if (blackBalls[this.num]) {
			this.blackBall = new oBlackBall(this.num);
			this.blackBall.init();
		}

		// set droids:
		for (var j = 0; j < droidProperties[this.num].length; j++) {
			var d = droidProperties[this.num][j];
			this.droids[j] = new oDroid(this.num, d.l, d.b);
			this.droids[j].init();
		}
	};

	this.setSpriteColors = function() {
		var rc = roomColors[this.num];

		var area = [
			{ x: 344, y: 200, w: 24, h: 24 },
			{ x: 24, y: 579, w: 196, h: 21 }
		];
		var replace = {
			// platform colors:
			10: rc.pg,
			2: rc.pb,
			12: rc.ps,
			1: rc.ls,
			// droids:
			14: rc.db,
			6: rc.dt,
			3: rc.dl1,
			5: rc.dl2
		};

		engine.replaceColorsInSprites(area, replace);
	};

	this.refreshRoomImages = function() {
		for (var j = 0; j < this.furnitures.length; j++) this.furnitures[j].generateImage();
		for (var j = 0; j < this.terminals.length; j++) this.terminals[j].generateImage();
	};

	this.resetLifts = function() {
		for (var j = 0; j < this.liftGroups.length; j++) this.liftGroups[j].reset();
	};

	this.resetAfterDie = function() {
		game.snoozeTime = 0;
		this.resetLifts();
		if (this.blackBall !== false) this.blackBall.reset();
		for (var i = 0; i < this.droids.length; i++) this.droids[i].reset();
		game.dork.setStartPosition();
	};

	this.resetOrgan = function() {
		if (this.type != 'organ') return;

		this.organ.checkerboardStartColor = 0;
		this.organ.tones = [];
		this.organ.pointerX = 134;
		this.organ.pointerY = 60;
		this.organ.status = 'playTones';
		this.organ.playTonesFrames = 0;
		this.organ.clickToneFrames = 0;
		this.organ.clickedTones = [];
	};

	this.animationRoutine = function() {
		var bg = roomColors[this.num].bg;
		var p = roomPlatforms[this.num];

		// room background (and total clearing):
		rect(0, 0, 320, 200, bg);
		// draw borders:
		for (var i = 0; i < 25; i++) {
			draw(344, 200, 8, 8, 0, 0 + i * 8);
			draw(352, 200, 8, 8, 312, 0 + i * 8);
		}
		// cut doors from borders:
		if (hasLeftDoor(this.num) === 1) rect(0, 8, 8, 40, bg);
		if (hasLeftDoor(this.num) === 4) rect(0, 152, 8, 48, bg);
		if (hasRightDoor(this.num) === 2) rect(312, 8, 8, 40, bg);
		if (hasRightDoor(this.num) === 3) rect(312, 152, 8, 48, bg);

		// platforms:
		for (var i = 0; i < p.length; i++) {
			var ap = p[i];
			for (var l = 0; l < ap.l; l++) {
				var px = 344;
				if (ap.p && l % 2) px = 352;
				if (!ap.p && !(l % 2)) px = 352;
				
				draw(px, 208, 8, 8, ap.x*8 + l*8, ap.y * 8);
			}
		}

		if (this.type == 'organ') {
			// organ room:
			// controller wire:
			draw(368, 200, 48, 34, 136, 142);
			// controller numpad:
			draw(368, getAFC() % 20 < 10 ? 234 : 243, 48, 9, 136, 176);
			// play field:
			draw(528, 228, 272, 116, 24, 26);
			// draw checkboard:
			var bg = this.organ.checkerboardStartColor;
			for (var i = 0; i < 4; i++) {
				for (var j = 0; j < 8; j++) {
					rect(32 + j * 32, 32 + i * 24, 32, 24, bg);
					if (j < 7) bg = 1 - bg;
				}
			}
			var actualToneIndex = false;
			if (this.organ.status !== 'win' && this.organ.tones.length) {
				actualToneIndex = Math.min(Math.floor(this.organ.playTonesFrames / 25), this.organ.nextStep - 1);
				for (var i = 0; i <= actualToneIndex; i++) {
					var t = this.organ.tones[i];
					rect(32 + t.x * 32, 32 + t.y * 24, 32, 24, 5);
				}
			}
			if (this.organ.status == 'pointer' || this.organ.status == 'clickTone') {
				draw(324, 280, 24, 19, this.organ.pointerX, this.organ.pointerY);
			}

			var t = false;
			if (this.organ.status == 'playTones' && actualToneIndex !== false) t = this.organ.tones[actualToneIndex];
			if (this.organ.status == 'clickTone' && this.organ.clickedToneIndex !== false) t = this.organ.tones[this.organ.clickedToneIndex];
			if (t) {
				var sx = 32 + t.x * 32;
				var sy = 32 + t.y * 24;

				line(sx + 5, sy + 2, sx + 14, sy + 10, 10, t.color);
				line(sx + 5, sy + 22, sx + 14, sy + 14, 10, t.color);
				line(sx + 27, sy + 2, sx + 18, sy + 10, 10, t.color);
				line(sx + 27, sy + 22, sx + 18, sy + 14, 10, t.color);
			}
		}
		else {
			// traditional room:
			// furnitures:
			for (var j = 0; j < this.furnitures.length; j++) this.furnitures[j].draw();

			// terminals:
			for (var j = 0; j < this.terminals.length; j++) this.terminals[j].draw();

			// inner lifts:
			for (var j = 0; j < this.liftGroups.length; j++) this.liftGroups[j].animationRoutine();

			// black ball:
			if (this.blackBall !== false) this.blackBall.animationRoutine();

			// droids:
			for (var j = 0; j < this.droids.length; j++) this.droids[j].animationRoutine();
		}
	};

	this.scanRoutine = function() {
		if (this.type == 'organ') {
			// organ room:
			if (game.dork.action == 'organ') {
				var buttonLeft = pressedKeys[keys.LEFT] === true;
				var buttonRight = pressedKeys[keys.RIGHT] === true;
				var buttonUp = pressedKeys[keys.UP] === true;
				var buttonDown = pressedKeys[keys.DOWN] === true;
				var buttonFire = fire();

				if (this.organ.status == 'playTones') {
					if (!this.organ.tones.length) {
						// generate tones:
						for (var i = 0; i < this.organ.nextStep; i++) {
							do {
								var valid = true;
								var tone = rnd(14);
								var x = rnd(8) - 1;
								var y = rnd(4) - 1;
								
								do {
									var color = rnd(13) + 1;
								} while (color == 5 || color == 11 || color == 12);

								for (var j = 0; j < i; j++) {
									if (this.organ.tones[j].tone == tone) valid = false;
									if (this.organ.tones[j].x == x && this.organ.tones[j].y == y) valid = false;
								}

							} while (!valid);

							// add tone:
							this.organ.tones.push({
								x: x,
								y: y,
								color: color,
								tone: tone
							});
						}
					}

					if (this.organ.playTonesFrames % 25 === 0) {
						var actualTone = this.organ.playTonesFrames / 25;
						if (actualTone == this.organ.nextStep) this.organ.status = 'pointer';
						else audio.request({name: 'organTone' + this.organ.tones[actualTone].tone});
					}
					this.organ.playTonesFrames++;
				}

				if (this.organ.status == 'pointer') {
					if (buttonLeft) this.organ.pointerX -= 3;
					if (buttonRight) this.organ.pointerX += 3;
					if (buttonUp) this.organ.pointerY -= 2;
					if (buttonDown) this.organ.pointerY += 2;

					// pointer limits:
					if (this.organ.pointerX < 32) this.organ.pointerX = 32;
					if (this.organ.pointerX > 284) this.organ.pointerX = 284;
					if (this.organ.pointerY < 33) this.organ.pointerY = 33;
					if (this.organ.pointerY > 133) this.organ.pointerY = 133;

					if (buttonFire) {
						holdFire();
						// click to exit?
						if (this.organ.pointerY >= 128) {
							this.resetOrgan();
							game.dork.stand();
							return;
						}
						else {
							// which check clicked?
							var x = Math.floor((this.organ.pointerX - 32) / 32);
							var y = Math.floor((this.organ.pointerY - 32) / 24);
							
							for (var i = 0; i < this.organ.tones.length; i++) {
								var t = this.organ.tones[i];
								if (t.x == x && t.y == y) {
									this.organ.status = 'clickTone';
									this.organ.clickToneFrames = 0;
									this.organ.clickedToneIndex = i;
									audio.request({name: 'organTone' + t.tone});
									break;
								}
							}
						}
					}
				}

				if (this.organ.status == 'clickTone') {
					this.organ.clickToneFrames++;
					if (this.organ.clickToneFrames % 25 == 0) {
						var fail = false;
						for (var i = 0; i < this.organ.clickedTones.length; i++) {
							var t = this.organ.tones[this.organ.clickedTones[i]];
							if (t.tone >= this.organ.tones[this.organ.clickedToneIndex].tone) {
								this.organ.clickedTones = [ ];
								fail = true;
								break;
							}
						}

						this.organ.clickedTones.push(this.organ.clickedToneIndex);

						this.organ.clickedToneIndex = false;
						this.organ.clickToneFrames = 0;

						if (!fail && this.organ.clickedTones.length == this.organ.nextStep) {
							this.winFrameCounter = 0;
							this.organ.status = 'win';
						}
						else {
							this.organ.status = 'pointer';
						}
					}
				}

				if (this.organ.status == 'win') {
					this.winFrameCounter++;

					this.organ.checkerboardStartColor = this.winFrameCounter % 4 < 2 ? 0 : 1;

					if (this.winFrameCounter == 50) {
						// earn a bonus! lift init or snooze
						if (this.organ.nextStep % 2 === 0) game.snoozes++;
						else game.liftInits++;

						analyticsEvent('gameEvent', 'organ', 'successLevel' + this.organ.nextStep);

						this.organ.nextStep++;
						this.resetOrgan();
						game.dork.stand();
						return;
					}
				}
			}
		}
		else {
			// traditional room:
			if (game.skipScanFrames > 0) return;

			if (game.snoozeTime > 0) {
				if (this.droidSound !== false) {
					audio.stopAllSound('droid');
					this.droidSound = false;
				}
				game.snoozeTime--;
			}

			if ((!this.droidSound || this.droidSound == 'needToStart') && game.room.droids.length && !game.snoozeTime) {
				this.droidSound = audio.request({name: 'droid', loop: true});
			}

			// inner lifts:
			for (var j = 0; j < this.liftGroups.length; j++) this.liftGroups[j].scanRoutine();

			// black ball:
			if (this.blackBall !== false) this.blackBall.scanRoutine();

			// droids:
			for (var j = 0; j < this.droids.length; j++) this.droids[j].scanRoutine();
		}
	};
}

/**
 * End of rooms.js file
 */