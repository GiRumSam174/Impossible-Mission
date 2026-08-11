/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: dork.js /1.0/
 * last update: 16.05.2013.
 */

function oDork() {
	this.x = 140;						// Dork horizontal position (in pixels)
	this.y = 45;						// Dork vertical position (in pixels)
	this.correctY = 0;					// vertical correction when Dork jam, or jump up
	this.w = 35;						// Dork width :)
	this.h = 41;						// Dork height
	this.d = 'left';					// Dork looking direction, enum: [left, right]
	this.action = 'stand';				// enum: [stand, run, jump, search, fall, lift, fallDown, organ]
	this.actionPhase = 0;				// sprite frame (jump:0-11, run:0-13, search:0, fall:0, stand:0)
	this.newLevelAfterJump = false;		// if Dork jumping up a platform
	this.jumpUnderTightPlatform = false;// vertical pixel correction under tight platforms while jumping
	this.fallingHeight = 0;				// how many pixels fall down in 'fall' action
	this.searchedFurniture = false;		// object of currently searched furniture
	this.dieByFallFrames = 0;			// AAAaaaa!!!! timeout
	this.dieByZapFrames = 0;			// Zapping death timeout
	this.dieByZapErase = [];			// erased pixels by zap death
	this.roomEnterDirection = false;	// enum: [left, right]

	this.init = function() {
		this.graphics = {
			left: {
				stand: [ { x: 35, y: 503 } ],
				search: [ { x: 70, y: 503 } ],
				fall: [ { x: 175, y: 380 } ],
				run: [ { x: 0, y: 380 }, { x: 35, y: 380 }, { x: 70, y: 380 }, { x: 105, y: 380 }, { x: 140, y: 380 }, { x: 175, y: 380 }, { x: 210, y: 380 },
						{ x: 245, y: 380 }, { x: 280, y: 380 }, { x: 315, y: 380 }, { x: 350, y: 380 }, { x: 385, y: 380 }, { x: 420, y: 380 }, { x: 455, y: 380 } ],
				jump: [ { x: 0, y: 462 }, { x: 35, y: 462 }, { x: 70, y: 462 }, { x: 105, y: 462 }, { x: 140, y: 462 }, { x: 175, y: 462 }, { x: 210, y: 462 },
						{ x: 245, y: 462 }, { x: 280, y: 462 }, { x: 315, y: 462 }, { x: 350, y: 462 }, { x: 385, y: 462 } ]
			},
			right: {
				stand: [ { x: 0, y: 503 } ],
				search: [ { x: 70, y: 503 } ],
				fall: [ { x: 175, y: 339 } ],
				run: [ { x: 0, y: 339 }, { x: 35, y: 339 }, { x: 70, y: 339 }, { x: 105, y: 339 }, { x: 140, y: 339 }, { x: 175, y: 339 }, { x: 210, y: 339 },
						{ x: 245, y: 339 }, { x: 280, y: 339 }, { x: 315, y: 339 }, { x: 350, y: 339 }, { x: 385, y: 339 }, { x: 420, y: 339 }, { x: 455, y: 339 } ],
				jump: [ { x: 0, y: 421 }, { x: 35, y: 421 }, { x: 70, y: 421 }, { x: 105, y: 421 }, { x: 140, y: 421 }, { x: 175, y: 421 }, { x: 210, y: 421 },
						{ x: 245, y: 421 }, { x: 280, y: 421 }, { x: 315, y: 421 }, { x: 350, y: 421 }, { x: 385, y: 421 } ]
			}
		};

		this.collisionMap = {
			left: {
				stand: [ this.getCollisionMap('left', 'stand', 0) ],
				search: [ this.getCollisionMap('left', 'search', 0) ],
				fall: [ this.getCollisionMap('left', 'fall', 0) ],
				run: [ ],
				jump: [ ]
			},
			right: {
				stand: [ this.getCollisionMap('right', 'stand', 0) ],
				search: [ this.getCollisionMap('right', 'search', 0) ],
				fall: [ this.getCollisionMap('right', 'fall', 0) ],
				run: [ ],
				jump: [ ]
			}
		};

		for (var i = 0; i < 14; i++) {
			this.collisionMap.left.run[i] = this.getCollisionMap('left', 'run', i);
			this.collisionMap.right.run[i] = this.getCollisionMap('right', 'run', i);
			if (i > 11) continue;
			this.collisionMap.left.jump[i] = this.getCollisionMap('left', 'jump', i);
			this.collisionMap.right.jump[i] = this.getCollisionMap('right', 'jump', i);
		}
	};

	this.setStartPosition = function() {
		// set starting position and status in room:
		if (this.roomEnterDirection == 'right') {
			this.x = 4;
			this.d = 'right';
			this.y = hasLeftDoor(game.roomId) == 1 ? 9 : 153;

			// if there is no platform at the entrance, we put back dork...
			if (this.y == 9 && [15, 17].indexOf(game.roomId) !== -1) this.x = -11;
			if (this.y == 153 && [9, 12, 14, 16, 19, 25].indexOf(game.roomId) !== -1) this.x = -11;
		}
		else {
			this.x = 283;
			this.d = 'left';
			this.y = hasRightDoor(game.roomId) == 2 ? 9 : 153;

			// if there is no platform at the entrance, we put back dork...
			if (this.y == 9 && [2, 20].indexOf(game.roomId) !== -1) this.x = 296;
			if (this.y == 153 && [11, 17, 29].indexOf(game.roomId) !== -1) this.x = 296;
		}
		this.stand();
	};

	this.animationRoutine = function() {
		if (this.action == 'fallDown') return;

		if (this.dieByZapFrames > 0) {
			// zapping death animation

			var dx = this.x;
			var dy = this.y + this.correctY;
			
			var a = this.action;
			var ph = this.actionPhase;
			if (a == 'lift') { a = 'stand'; ph = 0; }
			var collisionMap = this.collisionMap[this.d][a][ph].split(',');

			var c1 = [1, 11, 12, 15, 1, 11, 12, 15, 1, 11, 12, 15][getAFC() % 12];
			var c2 = [11, 12, 15, 1, 12, 15, 1, 11, 15, 1, 11, 12][getAFC() % 12];

			for (var row = 0; row < 41; row++) {
				for (var col = 0; col < 35; col++) {
					if (collisionMap[row][col] == 0) continue;

					if (this.dieByZapFrames > 25 && rnd(80 - this.dieByZapFrames) < 5) {
						for (var i = 0, hit = false; i < this.dieByZapErase.length; i++) {
							if (this.dieByZapErase[i].x == dx + col && this.dieByZapErase[i].y == dy + row) {
								hit = true;
								break;
							}
						}
						if (!hit) {
							this.dieByZapErase.push({
								x: dx + col,
								y: dy + row
							});
						}
					}

					for (var i = 0, dr = true; i < this.dieByZapErase.length; i++) {
						if (this.dieByZapErase[i].x == dx + col && this.dieByZapErase[i].y == dy + row) {
							dr = false;
							break;
						}
					}

					if (dr) {
						if (collisionMap[row][col] == 1) rect(dx + col, dy + row, 1, 1, c1);
						else if (collisionMap[row][col] == 2) rect(dx + col, dy + row, 1, 1, c2);
					}
				}
			}

			return;
		}

		else if (this.action == 'stand' || this.action == 'lift') {
			var g = this.graphics[this.d]['stand'][0];
			draw(g.x, g.y, 35, 41, this.x, this.y + this.correctY);
		}
		else {
			var a = this.action;
			var ph = this.actionPhase;
			if (a == 'organ') { a = 'search'; ph = 0; }
			var g = this.graphics[this.d][a][ph];
			draw(g.x, g.y, 35, 41, this.x, this.y + this.correctY);
		}

		if (game.scene == 'elevator') {
			// elevator border is ahead
			draw(708, 55, 6, 50, 136, 39);
			draw(750, 55, 6, 50, 178, 39);
		}

		if (game.scene == 'room') {
			// search box:
			if (this.action == 'search') {
				var boxX = this.x + 40;
				if (boxX > 250) boxX = this.x - 65;
				var boxY = this.y - 9;
				if (boxY < 0) boxY = 0;
				var roomBgColor = roomColors[game.roomId].bg;

				rect(boxX, boxY, 64, 32, 1);

				if (this.searchedFurniture.searchTime > 0) {
					text('Searching', boxX, boxY + 13, roomBgColor, 21, false);
					rect(boxX, boxY + 21, this.searchedFurniture.searchTime, 3, roomBgColor);
				}
				else {
					if (this.searchedFurniture.contentType == 'nothing') {
						text('Nothing', boxX + 5, boxY + 15, roomBgColor, 24, false);
						text('here.', boxX + 15, boxY + 26, roomBgColor, 24, false);
					}
					if (this.searchedFurniture.contentType == 'snooze') {
						var signY = 522;
						var signX = 110;
						if (roomBgColor == 3) signX = 158;
						if (roomBgColor == 7) signX = 206;
						draw(signX, signY, 48, 22, boxX + 8, boxY + 8);
					}
					if (this.searchedFurniture.contentType == 'liftInit') {
						var signY = 521;
						var signX = 254;
						if (roomBgColor == 3) signX = 282;
						if (roomBgColor == 7) signX = 310;
						draw(signX, signY, 28, 23, boxX + 18, boxY + 8);
					}
					if (this.searchedFurniture.contentType == 'puzzle') {
						this.searchedFurniture.puzzle.draw(boxX + 8, boxY + 8);
					}
				}
			}
		}
	};
	
	this.scanRoutine = function() {
		if (game.scene == 'elevator') {
			if (getSFC() % 2) return;

			if (game.pocketComputer.state != 'map') return;

			var buttonLeft = pressedKeys[keys.LEFT] === true;
			var buttonRight = pressedKeys[keys.RIGHT] === true;
			var buttonFire = fire();

			if (this.action == 'jump') {
				// Dork is jumping, he is helpless
				this.actionPhase++;
				if (this.actionPhase == 12) {
					// jumping finished:
					this.stand();
					if (this.d == 'left') audio.request({name: 'jumpLeft'});
					if (this.d == 'right') audio.request({name: 'jumpRight'});
				}

				if (this.d == 'left') {
					this.x -= this.actionPhase > 9 ? 6 : 7;
				}
				if (this.d == 'right') {
					this.x += this.actionPhase > 9 ? 6 : 7;
				}
			}
			else {
				// not jumping:
				if (buttonLeft && buttonRight) {
					this.stand();
				}
				if (buttonLeft && !buttonRight) {
					this.d = 'left';
					if (buttonFire) {
						holdFire();
						this.action = 'jump';
						this.actionPhase = 0;
					}
					else {
						if (this.action != 'run') {
							this.action = 'run';
							this.actionPhase = 0;
							this.x -= 10;
						}
						else {
							this.actionPhase++;
							if (this.actionPhase == 14) this.actionPhase = 0;
							if (this.actionPhase == 5 || this.actionPhase == 12) audio.request({name: 'stepLeft'});
							this.x -= 5;
						}
					}
				}
				if (buttonRight && !buttonLeft) {
					this.d = 'right';
					if (buttonFire) {
						holdFire();
						this.action = 'jump';
						this.actionPhase = 0;
					}
					else {
						if (this.action != 'run') {
							this.action = 'run';
							this.actionPhase = 0;
							this.x += 10;
						}
						else {
							this.actionPhase++;
							if (this.actionPhase == 14) this.actionPhase = 0;
							if (this.actionPhase == 5 || this.actionPhase == 12) audio.request({name: 'stepRight'});
							this.x += 5;
						}
					}
				}
				if (!buttonLeft && !buttonRight) {
					this.stand();

					if (buttonFire) {
						// switch to pocket computer:
						holdFire();
						game.pocketComputer.state = 'puzzles';
						game.pocketComputer.resetPointer();
						audio.request({name: 'beep2'});
					}
				}
			}
			
			// collision with elevator border:
			if (this.action == 'run') {
				var maxX = 142 + correctRun[this.actionPhase];
				var minX = 143 - correctRun[this.actionPhase];
			}
			if (this.action == 'jump') {
				var maxX = 142 + correctJump[this.actionPhase];
				var minX = 143 - correctJump[this.actionPhase];
			}
			if (this.x < minX) {
				if (hasLeftCorridor(game.elevator.x, game.elevator.y));
				else this.x = minX;
			}
			if (this.x > maxX) {
				if (hasRightCorridor(game.elevator.x, game.elevator.y));
				else this.x = maxX;
			}
		}

		if (game.scene == 'room') {
			if (getSFC() % 2) {
				var skip = true;

				if (this.action == 'fall') {
					skip = false;
					if (this.dieByZapFrames > 0) skip = true;
				}

				if (skip) return;
			}

			if (this.action == 'organ') return;

			if (this.action == 'fallDown') {
				this.dieByFallFrames++;
				if (this.dieByFallFrames == 1) audio.stopAllSound();
				else if (this.dieByFallFrames == 2) audio.request({name: 'falling'});
				else if (this.dieByFallFrames >= 70) {
					this.dieByFallFrames = 0;
					game.room.resetAfterDie();
					game.room.droidSound = 'needToStart';
					game.increaseTime('10m');
				}

				return;
			}

			if (this.dieByZapFrames > 0) {
				this.dieByZapFrames++;
				if (this.dieByZapFrames == 2) {
					audio.stopAllSound();
					if (this.searchedFurniture && this.searchedFurniture.searchTime <= 0 && this.searchedFurniture.type != 'exit') this.searchedFurniture.visible = false;
				}
				else if (this.dieByZapFrames == 3) audio.request({name: 'dieByZap'});
				else if (this.dieByZapFrames >= 60) {
					this.dieByZapFrames = 0;
					this.dieByZapErase = [];
					game.room.resetAfterDie();
					game.room.droidSound = 'needToStart';
					game.increaseTime('10m');
				}

				return;
			}

			var buttonLeft = pressedKeys[keys.LEFT] === true;
			var buttonRight = pressedKeys[keys.RIGHT] === true;
			var buttonUp = pressedKeys[keys.UP] === true;
			var buttonDown = pressedKeys[keys.DOWN] === true;
			var buttonFire = fire();

			if (this.action == 'jump') {
				// Dork is jumping, he is helpless
				this.actionPhase++;
				if (this.actionPhase == 12) {
					// jumping finished:
					this.stand();
					if (this.d == 'left') audio.request({name: 'jumpLeft'});
					if (this.d == 'right') audio.request({name: 'jumpRight'});
				}

				if (this.d == 'left') {
					this.x -= this.actionPhase > 9 ? 6 : 7;
				}
				if (this.d == 'right') {
					this.x += this.actionPhase > 9 ? 6 : 7;
				}
			}
			else if (this.action == 'lift') {

			}
			else if (this.action == 'stand' || this.action == 'run') {
				// not jumping, not lifting:
				if (buttonLeft && buttonRight) {
					this.stand();
				}
				if (buttonLeft && !buttonRight) {
					this.d = 'left';
					if (buttonFire) {
						this.action = 'jump';
						this.actionPhase = 0;
					}
					else {
						if (this.action != 'run') {
							this.action = 'run';
							this.actionPhase = 0;
							this.x -= 10;
						}
						else {
							this.actionPhase++;
							if (this.actionPhase == 14) this.actionPhase = 0;
							if (this.actionPhase == 5 || this.actionPhase == 12) audio.request({name: 'stepLeft'});
							this.x -= 5;
						}
					}
				}
				if (buttonRight && !buttonLeft) {
					this.d = 'right';
					if (buttonFire) {
						this.action = 'jump';
						this.actionPhase = 0;
					}
					else {
						if (this.action != 'run') {
							this.action = 'run';
							this.actionPhase = 0;
							this.x += 10;
						}
						else {
							this.actionPhase++;
							if (this.actionPhase == 14) this.actionPhase = 0;
							if (this.actionPhase == 5 || this.actionPhase == 12) audio.request({name: 'stepRight'});
							this.x += 5;
						}
					}
				}

				if (!buttonFire && (buttonUp || buttonDown) && !(buttonLeft || buttonRight)) {
					// start moving lift up/down
					var liftGroup = this.standingOnLift();
					if (liftGroup !== false) {
						this.action = 'lift';
						liftGroup.state = buttonUp ? 'up' : 'down';
					}
					else if (buttonUp) {
						if (game.room.type == 'organ') {
							// organ room:
							if (this.x >= 133 && this.x <= 150) {
								game.room.resetOrgan();
								this.action = 'organ';
								return;
							}
						}
						else {
							// searching in furniture...
							var f = this.standingOnFurniture();
							if (f !== false) {
								this.searchedFurniture = f;
								this.action = 'search';
								this.actionPhase = 0;
							}
							else {
								// use terminal...
								var t = this.standingOnTerminal();
								if (t !== false) {
									game.scene = 'terminal';
									game.actualTerminal = t;
									game.actualTerminal.menu = 3;
									pressedKeys[keys.UP] = 'hold';
								}
							}
						}
					}
				}
				
				if (this.action != 'lift' && this.action != 'search' && !buttonLeft && !buttonRight) {
					this.stand();

					if (buttonFire) {
						this.action = 'jump';
						this.actionPhase = 0;
					}
				}
			}
			else if (this.action == 'fall') {
				this.fallingHeight++;

				if (this.fallingHeight < 15) this.x += this.d == 'left' ? -1 : 1;
				else this.x += this.d == 'left' ? -2 : 2;

				if (this.isFalling()) {
					this.y += this.fallingHeight < 15 ? 4 : 8;
					if (this.y > 176) {
						this.action = 'fallDown';
						return;
					}
				}
				else {
					this.fallingHeight = 0;
					if (this.d == 'left') audio.request({name: 'jumpLeft'});
					if (this.d == 'right') audio.request({name: 'jumpRight'});
					this.stand();
				}
			}
			else if (this.action == 'search') {
				if (getSFC() % 3 === 0) return;
				if (this.searchedFurniture.type != 'exit') this.searchedFurniture.searchTime-=1;
				if (this.searchedFurniture.searchTime === 0) {
					// do search result:
					if (this.searchedFurniture.contentType == 'nothing') {
						if (this.searchedFurniture.type == 'exit' && game.solvedPassword === passwords[game.mapId - 1]) {
							game.missionComplete = true;
							game.scene = 'elvin';
							return;
						}
					}
					if (this.searchedFurniture.contentType == 'snooze') {
						game.passwordsFound++;
						game.snoozes++;
					}
					if (this.searchedFurniture.contentType == 'liftInit') {
						game.passwordsFound++;
						game.liftInits++;
					}
					if (this.searchedFurniture.contentType == 'puzzle') {
						var puzzleClone = this.searchedFurniture.puzzle.clone();
						game.pocketComputer.addPuzzle(puzzleClone);
					}
				}
				if (buttonUp === false) {
					// release search...
					if (this.searchedFurniture.searchTime <= 0 && this.searchedFurniture.type != 'exit') this.searchedFurniture.visible = false;
					this.stand();
					this.searchedFurniture = false;
				}
			}

			// collision with room borders:
			if (this.action == 'run') {
				var maxX = 277 + correctRun[this.actionPhase];
				var minX = 8 - correctRun[this.actionPhase];
			}
			else if (this.action == 'jump') {
				var maxX = 277 + correctJump[this.actionPhase];
				var minX = 8 - correctJump[this.actionPhase];
			}
			else if (this.action == 'fall') {
				var maxX = 284;
				var minX = 2;
			}

			// collision with platforms:
			var collMinX = -999;
			var collMaxX = 999;

			if (this.action == 'run' || this.action == 'stand') {
				for (var i = 1; i <= 4; i++) {
					// Is there a platform on this level before Dork?
					var dorkLevel = (this.y + 39) / 8;
					var level = dorkLevel - i;
					var px = this.getSafetyPixels(level);

					if (this.d == 'right') {
						for (var j = this.x + 18; j < this.x + 35; j++) {
							if (+px[j] > 0) {
								if (j < collMaxX) collMaxX = j;
							}
						}
					}
					else if (this.d == 'left') {
						for (var j = this.x + 17; j > this.x; j--) {
							if (+px[j] > 0) {
								if (j > collMinX) collMinX = j;
							}
						}
					}
				}
			}

			if (this.action == 'jump' && !this.newLevelAfterJump) {
				for (var i = 1; i <= 5; i++) {
					if (i == 5 && this.jumpUnderTightPlatform) continue;
					var ph = this.actionPhase;
					if (platformObstacleCheckForJump[i].indexOf(ph) === -1) continue;

					// Is there a platform on this level before Dork?
					var dorkLevel = (this.y + 39) / 8;
					var level = dorkLevel - i;
					var px = this.getSafetyPixels(level);

					if (this.d == 'right') {
						for (var j = this.x + 18; j < this.x + 35; j++) {
							if (+px[j] > 0) {
								if (j < collMaxX) collMaxX = j;
							}
						}
					}
					else if (this.d == 'left') {
						for (var j = this.x + 17; j > this.x; j--) {
							if (+px[j] > 0) {
								if (j > collMinX) collMinX = j;
							}
						}
					}
				}
			}

			if (collMinX > -999) {
				if (this.action == 'run') var mx = collMinX - correctRun[this.actionPhase] + 2;
				else if (this.action == 'stand') var mx = collMinX - 10;
				else if (this.action == 'jump') var mx = collMinX - correctJump[this.actionPhase];
				if (this.x < mx) this.x = mx;
			}
			if (collMaxX < 999) {
				if (this.action == 'run') var mx = collMaxX - 35 + correctRun[this.actionPhase] - 2;
				else if (this.action == 'stand') var mx = collMaxX - 35 + 10;
				else if (this.action == 'jump') var mx = collMaxX - 35 + correctJump[this.actionPhase];
				if (this.x > mx) this.x = mx;	
			}


			if (this.x < minX) {
				if ((hasLeftDoor(game.roomId) == 1 && this.y == 9) || (hasLeftDoor(game.roomId) == 4 && this.y == 153));
				else this.x = minX;
			}
			if (this.x > maxX) {
				if ((hasRightDoor(game.roomId) == 2 && this.y == 9) || (hasRightDoor(game.roomId) == 3 && this.y == 153));
				else this.x = maxX;
			}

			// jumping up to platform:
			if (this.action == 'jump' && this.actionPhase == 11 && this.newLevelAfterJump) {
				this.y = this.newLevelAfterJump * 8 - 39;
				this.correctY = 0;
				this.newLevelAfterJump = false;
			}
			// tight platform jumping end correction:
			if (this.action == 'jump' && this.actionPhase == 11 && this.jumpUnderTightPlatform) {
				this.correctY = 0;
				this.y = (this.jumpUnderTightPlatform + 5) * 8 - 39;
			}


			/*
				Falling detection:
				graphics:
				- after jump: jump[11]
				- after quick step: run[5]
				- after slide: run[6]
				- after run break (quick step break): stand[0]
			*/
			if (this.isFalling()) {
				if (this.action == 'jump') {
					this.graphics[this.d].fall[0] = this.graphics[this.d].jump[11];
					this.collisionMap[this.d].fall[0] = this.getCollisionMap(this.d, 'jump', 11);
				}
				else if (this.action == 'run') {
					if (this.actionPhase == 5) {
						this.graphics[this.d].fall[0] = this.graphics[this.d].run[5];
						this.collisionMap[this.d].fall[0] = this.getCollisionMap(this.d, 'run', 5);
					}
					else {
						this.graphics[this.d].fall[0] = this.graphics[this.d].run[6];
						this.collisionMap[this.d].fall[0] = this.getCollisionMap(this.d, 'run', 6);
					}
				}
				this.action = 'fall';
				this.actionPhase = 0;
			}

			// jumping up to platform detection:
			if (this.action == 'jump' && this.actionPhase > 7) {
				var hit = false;
				var dorkLevel = (this.y + 39) / 8;
				for (i = 1; i < 4; i++) {
					// is there a platform on this level under Dork?
					var level = dorkLevel - i;
					var px = this.getSafetyPixels(level);

					for (j = this.x + 11; j <= this.x + 24; j++) {
						if (+px[j] > 0) {
							this.newLevelAfterJump = level;
							hit = true;
							break;
						}
					}
				}

				if (!hit && this.newLevelAfterJump) {
					this.newLevelAfterJump = false;
					this.correctY = 0;
				}

				if (this.newLevelAfterJump) {
					this.jumpUnderTightPlatform = false;
					var correct = [23, 16, 4];
					if (correct[this.actionPhase - 8]) this.correctY = -(dorkLevel - this.newLevelAfterJump) * 8 + correct[this.actionPhase - 8];
				}
			}
			// jam under platform:
			if (this.action == 'jump' && !this.newLevelAfterJump && this.actionPhase > 3 && this.actionPhase < 10) {
				// is there a platform above Dork (only one case possible: dork level - 5 level)
				var dorkLevel = (this.y + 39) / 8;
				var level = dorkLevel - 5;
				var px = this.getSafetyPixels(level);

				for (j = this.x + 10; j <= this.x + 24; j++) {
					if (+px[j] > 0) {
						this.jumpUnderTightPlatform = level;
						break;
					}
				}

				if (this.jumpUnderTightPlatform) {
					var correct = [3, 7, 7, 4, 3, 3];
					if (correct[this.actionPhase - 4]) this.correctY = correct[this.actionPhase - 4];
				}
			}

			// leave room:
			if (hasLeftDoor(game.roomId) && this.x < -28) {
				// stop sounds:
				audio.stopAllSound();
				game.room.droidSound = false;

				game.startErase(function() {
					game.leaveRoom('left');
				});
			}
			if (hasRightDoor(game.roomId) && this.x > 314) {
				// stop sounds:
				audio.stopAllSound();
				game.room.droidSound = false;

				game.startErase(function() {
					game.leaveRoom('right');
				});
			}

			// collision detect with deadly things (black ball, droids, droid zaps)
			// black ball deadly under snooze time too!
			if (game.room.blackBall !== false && game.room.blackBall.status != 'eated' && this.collisionWithBlackBall()) {
				this.dieByZapFrames = 1;
				return;
			}
			// droids and its zaps deadly only if there is no snooze time
			if (game.room.droids.length && !game.snoozeTime && this.collisionWithDroids()) {
				this.dieByZapFrames = 1;
				return;
			}
		}
	};

	this.isFalling = function() {
		if (this.action != 'stand' && this.action != 'run' && this.action != 'jump' && this.action != 'fall') return false;

		// left and right borders:
		if (this.x >= 303 || this.x <= -20) return false;

		// Dork foot pixels in actual phase:
		var foot = this.collisionMap[this.d][this.action][this.actionPhase].split(',').slice(-2)[0];
		var footOnFloor = 0;
		for (var i = 0; i < 35; i++) if (foot[i] != '0') footOnFloor++;
		if (!footOnFloor) return false;

		// Dork is on the platform level exactly
		var full = !((this.y + 39) % 8);
		if (!full) return true;

		// which level?
		var level = (this.y + 39) / 8;

		// safety pixels
		var px = this.getSafetyPixels(level, true);

		var stableFoots = 0;
		for (var i = 0; i < 35; i++) if (foot[i] != '0' && px[this.x + i] != '0') stableFoots++;
		return stableFoots >= Math.ceil(footOnFloor / 2) ? false : true;
	};

	this.getSafetyPixels = function(level, needBorders) {
		var px = [];

		for (var i = 0; i < 320; i++) {
			// left and right borders:
			if (needBorders && (i < 8 || i > 311)) px[i] = '3';
			else px[i] = '0';
		}

		// add platforms on this level to safety pixels:
		var p = roomPlatforms[game.roomId];
		for (var i = 0; i < p.length; i++) {
			if (p[i].y != level) continue;
			for (var j = p[i].x * 8; j < p[i].x * 8 + p[i].l * 8; j++) px[j] = '1';
		}

		// add inner lifts on this level to safety pixels:
		for (var i = 0; i < game.room.liftGroups.length; i++) {
			var liftGroup = game.room.liftGroups[i];
			for (var j = 0; j < liftGroup.lifts.length; j++) {
				if (liftGroup.lifts[j] / 8 == level) {
					for (var k = liftGroup.l * 8; k < liftGroup.l * 8 + 24; k++) px[k] = '2';
				}
			}
		}

		return px;
	};

	this.fallingDetect = function() {
		if (this.x >= 303 || this.x <= -20) return false;

		var full = !((this.y + 39) % 8);
		if (!full) return true;

		var top = (this.y + 39) / 8;

		var p = roomPlatforms[game.roomId];
		for (var i = 0; i < p.length; i++) {
			if (p[i].y != top) continue;
			if (this.d == 'left' &&  this.x + 17 >= p[i].x * 8 && this.x + 17 <= p[i].x * 8 + p[i].l * 8) return false;
			if (this.d == 'right' && this.x + 14 >= p[i].x * 8 && this.x + 14 <= p[i].x * 8 + p[i].l * 8) return false;
		}

		if (this.standingOnLift()) return false;

		return true;
	};

	this.standingOnLift = function() {
		for (var i = 0; i < game.room.liftGroups.length; i++) {
			var liftGroup = game.room.liftGroups[i];
			for (var j = 0; j < liftGroup.lifts.length; j++) {
				var l = liftGroup.lifts[j];
				if (this.y + 39 !== l) continue;
				if (this.d == 'left' &&  this.x + 17 > liftGroup.l * 8 && this.x - 1 <= liftGroup.l * 8) return liftGroup;
				if (this.d == 'right' && this.x + 14 > liftGroup.l * 8 && this.x - 6 <= liftGroup.l * 8) return liftGroup;
			}
		}

		return false;
	};

	this.standingOnFurniture = function() {
		for (var i = 0; i < game.room.furnitures.length; i++) {
			var f = game.room.furnitures[i];
			if (!f.visible) continue;
			var top = (this.y + 39) / 8 - 1;
			if (f.b != top) continue;
			if (this.x + 19 > f.l * 8 && this.x + 15 <= f.l * 8 + furnitureProperties[f.type].w) return f;
		}

		return false;
	};

	this.standingOnTerminal = function() {
		for (var i = 0; i < game.room.terminals.length; i++) {
			var t = game.room.terminals[i];
			var top = (this.y + 39) / 8 - 1;
			if (t.b != top) continue;
			if (this.x + 17 > t.l * 8 && this.x + 17 <= t.l * 8 + 24) return t;
		}

		return false;
	};

	this.stand = function() {
		this.action = 'stand';
		this.actionPhase = 0;
		this.newLevelAfterJump = false;
		this.jumpUnderTightPlatform = false;
		this.fallingHeight = 0;
		this.correctY = 0;
	};

	this.getCollisionMap = function(direction, action, phase) {
		var canvas = document.createElement('canvas');
		canvas.width = 35;
		canvas.height = 41;
		var canvasContext = canvas.getContext('2d');
		canvasContext.drawImage(baseSprites, this.graphics[direction][action][phase].x, this.graphics[direction][action][phase].y, 35, 41, 0, 0, 35, 41);
		var baseSpriteData = canvasContext.getImageData(0, 0, 35, 41);
		var baseSpriteDataPix = baseSpriteData.data;

		for (var i = 0, n = baseSpriteDataPix.length, map = ""; i < n; i += 4) {
			var c = getColorIndex(baseSpriteDataPix[i], baseSpriteDataPix[i + 1], baseSpriteDataPix[i + 2]);
			var o = baseSpriteDataPix[i + 3];
			
			if (o == 0) map += '0';
			else if (c == 1) map += '1';
			else if (c == 11) map += '2';

			if ((i + 4) % 140 === 0) map += ",";
		}

		return map;
	};

	this.collisionWithBlackBall = function() {
		var bx = game.room.blackBall.x;
		var by = game.room.blackBall.y;
		var dx = this.x;
		var dy = this.y + this.correctY;

		if (!collisionDetect(bx, by, 24, 19, dx, dy, 35, 41)) return false;

		var a = this.action;
		if (a == 'lift') a = 'stand';

		var collisionMap = this.collisionMap[this.d][a][this.actionPhase].split(',');

		for (var row = 0; row < 41; row++) {
			for (var col = 0; col < 35; col++) {
				if (collisionMap[row][col] == 0) continue;

				if (dx + col >= bx + 2 && dx + col <= bx + 20 && dy + row >= by + 1 && dy + row <= by + 17) return true;
			}
		}

		return false;
	};

	this.collisionWithDroids = function() {
		var dx = this.x;
		var dy = this.y + this.correctY;

		var a = this.action;
		var ph = this.actionPhase;
		if (a == 'lift') {
			a = 'stand';
			ph = 0;
		}
		var collisionMap = this.collisionMap[this.d][a][ph].split(',');

		for (var d = 0; d < game.room.droids.length; d++) {
			var ex = game.room.droids[d].x;
			var ey = game.room.droids[d].y;
			var zx = game.room.droids[d].graphicsPhase == 1 ? ex - 48 : ex + 14;

			var cd = collisionDetect(ex, ey, 14, 21, dx, dy, 35, 41);
			var cz = true;
			if (game.room.droids[d].action == 'zapping') cz = collisionDetect(zx, ey, 48, 10, dx, dy, 35, 41);
			if (!cz && !cd) continue;

			for (var row = 0; row < 41; row++) {
				for (var col = 0; col < 35; col++) {
					if (collisionMap[row][col] == 0) continue;

					// collision with droid body:
					if (dx + col >= ex && dx + col <= ex + 14 && dy + row >= ey && dy + row <= ey + 21) return true;

					// collision with zap:
					if (game.room.droids[d].action == 'zapping') {
						if (dx + col >= zx && dx + col <= zx + 48 && dy + row >= ey && dy + row <= ey + 10) return true;
					}
				}
			}
		}

		return false;
	};
}

/**
 * End of dork.js file
 */