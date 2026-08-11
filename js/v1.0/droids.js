/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: droids.js /1.0/
 * last update: 16.05.2013.
 */

function oDroid(roomId, l, b) {
	this.originalL = l;			// original position (for reset)
	this.roomId = roomId;		// The room, where this droid live in.
	this.l = l;					// left coordinate (0-39)
	this.b = b;					// bottom coordinate (0-24)
	this.x = l * 8;				// horizontal position (in pixels)
	this.y = b * 8 - 19;		// vertical position (in pixels)
	this.platform = false;		// The platform which this droid is moving
	this.minX = 0;				// horizontal position minimum (based on the platform length and position)
	this.maxX = 0;				// horizontal position maximum (based on the platform length and position)
	this.originalD = ['left', 'right'][rnd(2) -1];	// original direction (for reset)
	this.d = this.originalD;	// moving direction, enum: [left, right]
	this.action = 'moving';		// enum: [stand, moving, turnLeft, turnRight, lookingBack, zapping]
	this.speed = {
		left: 1,				// moving and turning speed to left direction (1-3)
		right: 1				// moving and turning speed to right direction (1-3)
	};
	this.graphicsPhase = 1;		// displayable graphics state (1-3: left, 4: front, 5-7: right)
	this.type = false;			// enum: [Observation only, Simple meandering, Meandering, Patrolling, Patrolling zap, Smart patrolling, Smart patrolling zap, Askance patrolling, Left-to-right zapping, Platform-edge zapping, Berserker zapping, Continuous zapping]
	this.movingDistance = 0;	// travelled distance in current moving action
	this.zappingFrames = 0;		// frame counter from start zapping
	this.skippedScanFrames = 0;	// delay (for wait something)
	this.zapSound = false;		// zapping sound object

	this.init = function() {
		this.graphics = { 1: 24, 2: 54, 3: 80, 4: 108, 5: 94, 6: 66, 7: 38 };

		// find its platform:
		for (var i = 0; i < roomPlatforms[this.roomId].length; i++) {
			var r = roomPlatforms[this.roomId][i];
			if (r.y == this.b && (r.x <= this.l && r.x + r.l >= this.l)) {
				this.platform = r;
				break;
			}
		}

		// set moving limits:
		this.minX = this.platform.x * 8;
		this.maxX = this.minX + (this.platform.l - 2) * 8;

		// generate a random droid type:
		this.type = droidTypes[rnd(12) - 1];
	};

	this.reset = function() {
		this.l = this.originalL;
		this.x = this.l * 8;
		this.d = this.originalD;

		this.action = 'moving';
		this.graphicsPhase = this.d == 'left' ? 1 : 7;

		this.movingDistance = 0;
		this.zappingFrames = 0;
		this.skippedScanFrames = 0;
		this.zapSound = false;

		// set default options by type:
		if (IN(this.type, ['Observation only', 'Simple meandering', 'Smart patrolling', 'Smart patrolling zap', 'Askance patrolling', 'Left-to-right zapping'])) this.speed.left = this.speed.right = 1;
		else if (this.type == 'Meandering') {
			this.speed.left = rnd(3);
			this.speed.right = rnd(3);
		}
		else this.speed.left = this.speed.right = rnd(3);

		if (this.type == 'Left-to-right zapping') this.action = 'zapping';
		if (this.type == 'Platform-edge zapping') this.movingDistance = 1;
	};

	this.animationRoutine = function() {
		// draw droid:
		var offset = getAFC() % 10 < 5 ? 98 : 0;
		if (game.snoozeTime > 0 || game.dork.action == 'fallDown' || game.dork.dieByZapFrames > 0 || game.skipScanFrames > 0) offset = 0;
		draw(this.graphics[this.graphicsPhase] + offset, 579, 14, 21, this.x, this.y);

		// draw zapping:
		if (this.action == 'zapping' && !game.snoozeTime && game.dork.action != 'fallDown' && !game.skipScanFrames) {
			if (game.dork.dieByZapFrames) var zx = 412;
			else var zx = [220, 268, 316, 364][rnd(4) - 1] + (rnd(2) == 1 ? 192 : 0)

			if (getAFC() % 3 || game.dork.dieByZapFrames) draw(zx, 586, 48, 10, this.graphicsPhase == 1 ? this.x - 48 : this.x + 14, this.y);
		}
	};

	this.scanRoutine = function() {
		// if there is snooze time, the droids do nothing:
		if (game.snoozeTime > 0) return;

		// if Dork is falling down, the droids do nothing:
		if (game.dork.action == 'fallDown') return;

		// if Dork is zapped, the droids do nothing:
		if (game.dork.dieByZapFrames > 0) return;

		// zapping sound effect handling:
		if (this.zapSound === false && this.action == 'zapping') {
			this.zapSound = audio.request({name: 'zap' + rnd(5), loop: true});
		}
		else if (this.zapSound !== false && this.action != 'zapping') {
			audio.stopOneZapSound();
			this.zapSound = false;
		}

		// if there is a delay, we do nothing:
		if (this.skippedScanFrames > 0) {
			this.skippedScanFrames--;
			return;
		}

		// turning deceleration:
		if (this.action == 'turnLeft' || this.action == 'turnRight' && this.speed[this.d] < 3) {
			if (getSFC() % (4 - this.speed[this.d])) return;
		}

		// turning left action:
		if (this.action == 'turnLeft') {
			if (this.graphicsPhase == 7) audio.request({name: 'droidTurn'});
			this.graphicsPhase--;
			if (this.graphicsPhase == 1) {
				this.d = 'left';
				this.action = 'moving';
				this.movingDistance = 0;
			}
		}
		// turning right action:
		else if (this.action == 'turnRight') {
			if (this.graphicsPhase == 1) audio.request({name: 'droidTurn'});
			this.graphicsPhase++;
			if (this.graphicsPhase == 7) {
				this.d = 'right';
				this.action = 'moving';
				this.movingDistance = 0;
			}
		}

		// behaviors
		if (this.type == 'Observation only') {
			// The robot just waits and looks at you. Very easy.

			if (this.action == 'stand' || this.action == 'moving') {
				if (this.x + 7 >= game.dork.x + 17 && this.d != 'left') this.action = 'turnLeft';
				else if (this.x + 7 < game.dork.x + 17 && this.d != 'right') this.action = 'turnRight';
			}
		}
		else if (this.type == 'Simple meandering') {
			// The robot just moves left and right, without going to the boundaries of the platform. Very easy.

			if (this.movingDistance >= 32 && this.graphicsPhase == 1) {
				this.movingDistance = 0;
				this.action = 'turnRight';
			}
			else if (this.movingDistance >= 32 && this.graphicsPhase == 7) {
				this.movingDistance = 0;
				this.action = 'turnLeft';
			}
			else if (this.action == 'moving') this.meandering();
		}
		else if (this.type == 'Meandering') {
			// The robot just moves left and right, going to the boundaries of the platform. Easy or medium, depending on the speed. The robot can move at three possible speeds, and may even have different speeds when traveling in different directions.

			this.meandering();
		}
		else if (this.type == 'Induced meandering') {
			// The robot just waits until it sees you, then meanders. The speed that the robot decides to pick once it sees you can change every time you enter the room.

			// not implemented
		}
		else if (this.type == 'Patrolling') {
			// The robot moves like it is meandering, but it in fact is waiting for a target. If it sees you, it may do one of two things: charge you or stop and try to zap you. Easy if you can avoid its field of vision, medium if avoiding it is not very feasible. Some robots will act like they are meandering until they see you, at which point they activate their patrol modes. Easy to medium difficulty.
			this.speed.right = this.speed.left = this.iSeeYou() ? 3 : 1;

			if (this.d == 'left') {
				this.x -= this.speed.left;
				if (this.x <= this.minX) {
					this.x = this.minX;
					if (!this.iSeeYou()) this.action = 'turnRight';
				}
			}
			else if (this.d == 'right') {
				this.x += this.speed.right;
				if (this.x >= this.maxX) {
					this.x = this.maxX;
					if (!this.iSeeYou()) this.action = 'turnLeft';
				}
			}
		}
		else if (this.type == 'Patrolling zap') {
			if (this.action == 'stand') {
				if (!this.iSeeYou()) this.action = 'moving';
				this.movingDistance++;
				if (this.movingDistance >= 40) {
					this.movingDistance = 0;
					this.action = 'zapping';
				}
			}
			else if (this.action != 'zapping') this.action = this.iSeeYou() ? 'zapping' : 'moving';

			if (this.action == 'moving') {
				if (this.d == 'left') {
					this.x -= this.speed.left;
					if (this.x <= this.minX) {
						this.x = this.minX;
						this.action = 'turnRight';
					}
				}
				else if (this.d == 'right') {
					this.x += this.speed.right;
					if (this.x >= this.maxX) {
						this.x = this.maxX;
						this.action = 'turnLeft';
					}
				}
			}
			else if (this.action == 'zapping') {
				this.zappingFrames++;
				if (this.zappingFrames >= 40) {
					this.zappingFrames = 0;
					this.action = 'stand';
				}
			}
		}
		else if (this.type.indexOf('Smart patrolling') === 0) {
			// The robot approaches you even if it doesn't see you. Although these robots tend to move slowly, they never give up the hunt. Some of them try to zap you if they come to the edge of a platform. Medium to hard difficulty.
			if (this.x + 7 - 4 >= game.dork.x + 17 && this.d != 'left') this.action = 'turnLeft';
			else if (this.x + 7 + 4 < game.dork.x + 17 && this.d != 'right') this.action = 'turnRight';

			if (this.action == 'zapping') {
				this.zappingFrames++;
				if (this.zappingFrames >= 40) {
					this.zappingFrames = 0;
					this.movingDistance = 0;
					this.action = 'moving';
				}
			}
			else if (this.action == 'moving') {
				if (this.d == 'left') {
					this.x -= this.speed.left;
					this.movingDistance += this.speed.left;
					if (this.x <= this.minX) {
						this.x = this.minX;
						if (this.type == 'Smart patrolling zap' && this.iSeeYou()) {
							if (this.movingDistance > 40) this.action = 'zapping';
						}
						else {
							if (game.dork.x > this.x) this.action = 'turnRight';
						}
					}
				}
				if (this.d == 'right') {
					this.x += this.speed.right;
					this.movingDistance += this.speed.right;
					if (this.x >= this.maxX) {
						this.x = this.maxX;
						if (this.type == 'Smart patrolling zap' && this.iSeeYou()) {
							if (this.movingDistance > 40) this.action = 'zapping';
						}
						else {
							if (game.dork.x < this.x) this.action = 'turnLeft';
						}
					}
				}
			}
		}
		else if (this.type == 'Askance patrolling') {
			// The robot moves very slowly. Unfortunately, it is also constantly looking over its shoulder. It is very difficult to avoid this robot's field of vision. When it sees you, the robot can either charge you or zap you. If you can duck or jump out of the way whenever it turns toward you, you may be able to trick it, but not easily. Medium difficulty.
			if (this.movingDistance >= 16 && this.action == 'moving') {
				this.movingDistance = 0;
				if (this.iSeeYou()) {
					this.action = 'zapping';
				}
				else {
					this.action = 'lookingBack';
				}
			}
			else if (this.action == 'lookingBackRight') {
				if (this.iSeeYou('right')) {
					this.graphicsPhase = 7;
					this.action = 'zapping';
				}
				else this.action = 'turnLeft';
			}
			else if (this.action == 'lookingBackLeft') {
				if (this.iSeeYou('left')) {
					this.graphicsPhase = 1;
					this.action = 'zapping';
				}
				else this.action = 'turnRight';
			}
			else if (this.action == 'lookingBack') {
				if (getSFC() % 3) return;

				if (this.d == 'left') {
					this.graphicsPhase++;
					if (this.graphicsPhase == 5) {
						this.skippedScanFrames = 18;
						this.action = 'lookingBackRight';
					}
				}
				else if (this.d == 'right') {
					this.graphicsPhase--;
					if (this.graphicsPhase == 3) {
						this.skippedScanFrames = 18;
						this.action = 'lookingBackLeft';
					}
				}
			}
			else if (this.action == 'moving') this.meandering();
			else if (this.action == 'zapping') {
				this.zappingFrames++;
				if (this.zappingFrames >= 40) {
					this.zappingFrames = 0;
					if (this.d == 'left') {
						if (this.graphicsPhase == 1) this.action = 'turnRight';
						if (this.graphicsPhase == 7) this.action = 'turnLeft';
					}
					else {
						if (this.graphicsPhase == 1) this.action = 'turnRight';
						if (this.graphicsPhase == 7) this.action = 'turnLeft';
					}
				}
			}
		}
		else if (this.type == 'Slingshot patrolling') {
			// This type of robot appears very rarely. The robot waits on the right side of the platform for you to come into view on the left. Once you do, it charges all the way to the other side of the platform, whereupon it returns to its original position. As it returns, it will not chase you if you manage to get behind it. Medium difficulty (it never zaps you).

			// not implemented
		}
		else if (this.type == 'Left-to-right zapping') {
			// The robot zaps left for a while, right for a while, left for a while, etc. The robot can be a tough obstacle, but as it doesn't chase you, getting past it is often feasible. Medium to hard difficulty.

			if (this.action == 'moving') this.action = 'zapping';
			if (this.action == 'zapping') {
				this.zappingFrames++;
				if (this.zappingFrames >= 40) {
					this.zappingFrames = 0;
					this.action = this.d == 'left' ? 'turnRight' : 'turnLeft';
				}
			}
		}
		else if (IN(this.type, ['Platform-edge zapping', 'Berserker zapping', 'Continuous zapping'])) {
			/*
				Platform-edge zapping:
					The robot travels from one end of the platform to the other at slow, medium or fast speeds. Once the robot reaches one end of the platform, it zaps, turns around, zaps again, and proceeds to the other end of the platform. If it is on a long platform, the best time to jump the robot is while it is moving. Medium to hard difficulty.

				Berserker zapping:
					The robot moves like a platform-edge zapper, but it also zaps several times as it moves across the platform, making jumping over it a very dangerous and ill-advised task. Hard difficulty.

				Continuous zapping:
					This robot stays put and zaps its heart out. Sometimes it turns around unexpectedly, but its zapping never stops for more than an instant. If such a robot is positioned directly in front of an important room detail, a snooze could be mandatory. Hard difficulty.
			*/
			if (this.action == 'moving') {
				if (this.movingDistance == 0) {
					this.movingDistance = 1;
					this.action = 'zapping';
				}
				else {
					if (this.type == 'Berserker zapping' && this.movingDistance > 48) this.movingDistance = 0;
					else if (this.type == 'Continuous zapping' && this.movingDistance > 16) this.movingDistance = 0;
					else {
						if (this.d == 'left') {
							this.x -= this.speed.left;
							this.movingDistance += this.speed.left;
							if (this.x <= this.minX) {
								this.x = this.minX;
								this.action = 'zapping';
							}
						}
						else if (this.d == 'right') {
							this.x += this.speed.right;
							this.movingDistance += this.speed.right;
							if (this.x >= this.maxX) {
								this.x = this.maxX;
								this.action = 'zapping';
							}
						}
					}
				}
			}
			else if (this.action == 'zapping') {
				this.zappingFrames++;
				if (this.zappingFrames >= 40) {
					this.zappingFrames = 0;
					if (this.x == this.minX && this.d == 'left') this.action = 'turnRight';
					else if (this.x == this.maxX && this.d == 'right') this.action = 'turnLeft';
					else this.action = 'moving';
				}
			}
		}
	};

	this.meandering = function() {
		if (this.d == 'left') {
			this.x -= this.speed.left;
			this.movingDistance += this.speed.left;
			if (this.x <= this.minX) {
				this.x = this.minX;
				this.action = 'turnRight';
			}
		}
		else if (this.d == 'right') {
			this.x += this.speed.right;
			this.movingDistance += this.speed.right;
			if (this.x >= this.maxX) {
				this.x = this.maxX;
				this.action = 'turnLeft';
			}
		}
	};

	// Function which decide to Dork is in the field of vision of this droid. (Function name from Predator :D)
	this.iSeeYou = function(dir) {
		if (!IN(game.dork.action, ['run', 'stand', 'search'])) return false;
		if (game.dork.y + 20 != this.y) return false;
		if (this.x <= game.dork.x && (this.graphicsPhase == 7 || dir == 'right')) return true;
		if (this.x >= game.dork.x && (this.graphicsPhase == 1 || dir == 'left')) return true;
		return false;
	};
}

/**
 * End of droids.js file
 */