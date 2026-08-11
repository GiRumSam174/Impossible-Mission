/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: game.js /1.0/
 * last update: 16.05.2013.
 */

function oGame() {

	this.generateNewGame = function() {
		this.scene = 'anotherVisitor';			// enum: [anotherVisitor, elevator, room, terminal, gameOver, scores, elvin ]
		this.pause = false;						// true, false
		this.timeIsSuspended = false;			// flag for paw pause button
		this.startTime = new Date().getTime();	// game start time (timestamp)
		this.eraseState = false;				// screen erasing, enum: [false, closing, opening]
		this.eraseHeight = 0;					// 0-100

		this.mapId = rnd(maps.length) - 1;		// there are 8 different layout (and passwords)
		this.map = maps[this.mapId];			// elevator system and rooms

		this.dork = new oDork();				// create Dork's object
		this.dork.init();

		this.elevator = new oElevator();		// create elevator system
		this.elevator.init();

		this.pocketComputer = new oPocketComputer();	// Dork's pocket computer
		this.pocketComputer.init();

		this.roomId = false;					// the actual room id
		this.room = false;						// the actual room object
		this.generateRooms();					// generate 32 room object
		this.hideThingsInFurnitures();			// put the 36 puzzles, 9 snoozes and 9 lift inits into furnitures randomly

		this.snoozes = 0;						// count of ZZZZzzzz....
		this.snoozeTime = 0;					// droid snoozing countdown, if this value greater than zero, droids are snoozing...
		this.liftInits = 0;						// count of lift inits
		this.passwordsFound = 0;				// founded passwords (snoozes and lift inits) for score calculation
		this.solvedPassword = '         ';		// the solved letters in the password (9 char)

		this.timeHour = 12;						// actual time
		this.timeMinute = 0;
		this.timeSecond = 0;
		this.timeMinuteString = '00';			// actual time in string format with leading zeros
		this.timeSecondString = '00';
		this.destroyHimNextHour = 1;

		this.timeoutAnotherVisitor = false;		// "Another visitor..." speech timeout
		this.skipScanFrames = 0;

		this.gameOverImageData = false;			// Image snapshot to the nuclear bomb animation
		this.gameOverFrames = 0;				// nuclear bomb animation frame counter
		this.scoreData = false;					// the calculated scores
		this.hallOfFameName = '';				// your actually typed name in hall of fame
		this.hallOfFameNameConfirmed = false;	// the final typed name (after enter, or overflow maxlength)
		this.missionComplete = false;			// after Dork solve all puzzles and enter in Elvin's door
		this.elvinFrames = 0;					// Frame counter for Elvin's "no, no, no!!" animation

		this.actualTerminal = false;			// in terminal scene, the terminal object
	};

	this.generateRooms = function() {
		this.rooms = {};

		for (var i = 1; i <= 32; i++) {
			this.rooms[i] = new oRoom(i);
			this.rooms[i].init();
		}
	};

	this.hideThingsInFurnitures = function() {
		// hide 36 puzzles:
		for (var i = 0; i < 36;) {
			var roomId = rnd(30);
			var furnitureCount = this.rooms[roomId].furnitures.length;
			if (!furnitureCount) continue;
			var furnitureIndex = rnd(furnitureCount) - 1;
			if (this.rooms[roomId].furnitures[furnitureIndex].type == 'exit') continue;
			if (this.rooms[roomId].furnitures[furnitureIndex].contentType == 'nothing') {
				this.rooms[roomId].furnitures[furnitureIndex].contentType = 'puzzle';
				this.rooms[roomId].furnitures[furnitureIndex].puzzle = new oPuzzle(i);
				this.rooms[roomId].furnitures[furnitureIndex].puzzle.setRandomProperties(roomColors[roomId].bg);
				i++;
			}
		}

		// hide 9 snoozes:
		for (var i = 0; i < 9;) {
			var roomId = rnd(30);
			var furnitureCount = this.rooms[roomId].furnitures.length;
			if (!furnitureCount) continue;
			var furnitureIndex = rnd(furnitureCount) - 1;
			if (this.rooms[roomId].furnitures[furnitureIndex].type == 'exit') continue;
			if (this.rooms[roomId].furnitures[furnitureIndex].contentType == 'nothing') {
				this.rooms[roomId].furnitures[furnitureIndex].contentType = 'snooze';
				i++;
			}
		}

		// hide 9 lift inits:
		for (var i = 0; i < 9;) {
			var roomId = rnd(30);
			var furnitureCount = this.rooms[roomId].furnitures.length;
			if (!furnitureCount) continue;
			var furnitureIndex = rnd(furnitureCount) - 1;
			if (this.rooms[roomId].furnitures[furnitureIndex].type == 'exit') continue;
			if (this.rooms[roomId].furnitures[furnitureIndex].contentType == 'nothing') {
				this.rooms[roomId].furnitures[furnitureIndex].contentType = 'liftInit';
				i++;
			}
		}
	};

	this.enterRoom = function(roomEnterDirection) {
		this.dork.roomEnterDirection = roomEnterDirection;

		var rooms = this.map.rooms[this.elevator.x - (roomEnterDirection == 'left' ? 1 : 0)];
		var level = Math.floor((this.elevator.y / 216) / 2);

		this.roomId = rooms[level];
		this.room = this.rooms[this.roomId];
		this.room.setSpriteColors();
		this.room.revealed = true;

		// set Dork position:
		this.dork.setStartPosition();

		// if there is a black ball in the room, we reset it
		if (this.room.blackBall !== false) this.room.blackBall.reset();

		// reset droid properties:
		for (var i = 0; i < this.room.droids.length; i++) this.room.droids[i].reset();

		this.scene = 'room';

		// set menu bar colors:
		engine.setMenuColors();

		// "destroy him" speech
		if (this.destroyHimNextHour == this.timeHour && this.room.droids.length) {
			this.destroyHimNextHour++;
			if (this.destroyHimNextHour < 6) {
				this.skipScanFrames = 100;
				audio.request({name: 'destroyHim', offset: 800});
			}
		}

		//analyticsEvent('gameEvent', 'room', 'enter', this.roomId);
	};

	this.leaveRoom = function(leaveDirection) {
		// reset snooze time:
		game.snoozeTime = 0;

		if (leaveDirection == 'left') {
			// set elevator:
			game.elevator.change(game.room.elevatorLeft);
			game.elevator.y = game.room.y * 432 + (hasLeftDoor(game.roomId) === 1 ? 0 : 216);

			// set Dork:
			game.dork.d = 'left';
			game.dork.x = 300;
			game.dork.y = 45;
		}
		if (leaveDirection == 'right') {
			// set elevator:
			game.elevator.change(game.room.elevatorRight);
			game.elevator.y = game.room.y * 432 + (hasRightDoor(game.roomId) === 2 ? 0 : 216);

			// set Dork:
			game.dork.d = 'right';
			game.dork.x = -16;
			game.dork.y = 45;
		}

		game.dork.stand();

		game.scene = 'elevator';
		game.roomId = false;

		// set menu bar colors:
		engine.setMenuColors();
	};

	this.increaseTime = function(time) {
		if (time == '1s') {
			// add one second to game time
			if (++this.timeSecond > 59) {
				this.timeSecond = 0;
				if (++this.timeMinute > 59) {
					this.timeMinute = 0;
					if (++this.timeHour > 12) this.timeHour = 1;
				}
			}
		}
		else if (time == '2m' || time == '10m') {
			this.timeMinute += parseInt(time);
			if (this.timeMinute > 59) {
				this.timeMinute = this.timeMinute - 60;
				if (++this.timeHour > 12) this.timeHour = 1;
			}
		}

		this.timeMinuteString = (this.timeMinute < 10 ? '0' : '') + this.timeMinute.toString();
		this.timeSecondString = (this.timeSecond < 10 ? '0' : '') + this.timeSecond.toString();
	};

	this.initGameOver = function() {
		if (this.timeHour == 6 && this.scene != 'gameOver') {
			// time is expired! Elvin win, the world is destroyed!

			// play "hahaha" sound
			audio.stopAllSound();
			audio.request({name: 'hahaha'});

			// creating a screenshot...
			var tmpCanvas = document.createElement('canvas');
			tmpCanvas.width = 960;
			tmpCanvas.height = 600;
			var tmpContext = tmpCanvas.getContext('2d');
			tmpContext.putImageData(engine.canvas.getImageData(0, 0, 960, 600), 0, 0);

			this.gameOverImageData = new Image();
			this.gameOverImageData.src = tmpCanvas.toDataURL("image/png");

			this.scene = 'gameOver';
		}
	};

	this.updateHighScores = function() {
		var s = [];
		for (var i = 0; i < 15; i++) s.push(options.highScores[i].score + ':' + options.highScores[i].name)
		localStorage.setItem('highScores', s.join(','));
	};

	this.startErase = function(cb) {
		this.eraseState = 'closed';
		this.eraseHeight = 0;
		this.eraseFunction = function() {
			cb();
		};
	};

	this.togglePause = function(newStatus) {
		if (newStatus === undefined) newStatus = game.pause ? false : true;

		game.pause = newStatus;
		if (game.pause) {
			audio.stopAllSound();
		}

		return newStatus;
	};

	this.animateElevator = function() {
		game.elevator.animationRoutine();
		game.pocketComputer.animationRoutine();
		game.dork.animationRoutine();
	};

	this.animateRoom = function() {
		game.room.animationRoutine();
		game.dork.animationRoutine();
	};

	this.animateTerminal = function() {
		game.actualTerminal.animationRoutine();
	};

	this.animateGameOver = function() {
		if (this.gameOverFrames < 170) {
			// image shaking and white explosion:
			engine.canvas.drawImage(this.gameOverImageData, 0, 0, 960, 600, rnd(20) - 15, rnd(20) - 15, 960, 600);
			var whiteBg = rnd(170 - this.gameOverFrames);
			if (whiteBg < 20 || rnd(5) == 4) rect(0, 0, 960, 600, 1);
		}
		else if (this.gameOverFrames == 170) {
			// fix white bg:
			rect(0, 0, 960, 600, 1);
		}
		else if (this.gameOverFrames > 170) {
			// black rectangles:
			for (var i = 0; i < 30; i++) {
				var x = rnd(40) - 1;
				var y = rnd(25) - 1;
				rect(x * 8, y * 8, 8, 8, 0);
			}
		}
	};

	this.animateElvin = function() {
		if (this.elvinFrames === 1) draw(0, 0, 320, 200, 0, 0);

		if (this.elvinFrames < 165 && this.elvinFrames % 48 > 24) draw(418, 200, 30, 28, 114, 136);
		else draw(418, 228, 30, 28, 114, 136);

		// flashing leds:
		if (this.elvinFrames % 2) return;

		for (var i = 0; i < 30; i++) {
			var x = rnd(40) - 1;
			var y = rnd(6) - 1;
			if (y == 5 && x >= 14 && x <= 22) continue;
			rect(2 + x * 8, 2 + y * 8, 4, 5, rnd(8) - 1);
		}
	};

	this.animateScores = function() {
		// black bg:
		rect(0, 0, 320, 200, 0);
		// score board:
		draw(492, 344, 308, 200, 6, 0);
		// texts:
		// first box:
		text('puzzle pieces found', 16, 15, 7);
		text('passwords found', 16, 23, 7);
		text('x100 =', 208, 15, 7, false, false);
		text('x100 =', 208, 23, 7, false, false);
		// second box:
		text('puzzles solved', 16, 47, 7);
		text('seconds remaining', 16, 55, 7);
		text('x500 =', 208, 47, 7, false, false);
		// third box (mission status):
		text('t o t a l   s c o r e', 16, 103, 7);

		if (this.scoreData) {
			var s = this.scoreData;
			text(rightAlignedText(s.puzzlePiecesFound, 2), 192, 15, 1);
			text(rightAlignedText(s.puzzlePiecesFoundScore, 5), 256, 15, 1);

			text(rightAlignedText(s.passwordsFound, 2), 192, 23, 1);
			text(rightAlignedText(s.passwordsFoundScore, 5), 256, 23, 1);

			text(rightAlignedText(s.puzzlesSolved, 2), 192, 47, 1);
			text(rightAlignedText(s.puzzlesSolvedScore, 5), 256, 47, 1);

			text(rightAlignedText(s.secondsRemaining, 5), 256, 55, 1);

			text(rightAlignedText(s.totalScore, 6), 248, 103, 1);

			if (this.missionComplete) {
				text('mission complete', 16, 79, 7);
				text('1000', 264, 79, 1);
			}
			else {
				text('m i s s i o n   t e r m i n a t e d', 16, 79, 7);
			}

			// if score is higher or equal than the actual HIGH SCORE:
			if (s.hallOfFamePosition === 0) {
				text('this surpasses the previous', 32, 111, 5);
				text('high score of      .', 32, 119, 5);
				text(rightAlignedText(options.highScores[1].score, 5), 144, 119, 1);
			}

			// hall of fame:
			text('hall of fame', 104, 151, 7);
			for (var i = 0; i < options.highScores.length; i++) {
				var hs = options.highScores[i];
				var x = 16 + Math.floor(i / 5) * 96;
				var y = 159 + (i % 5) * 8;

				text(rightAlignedText(hs.score, 5), x, y, 1);
				if (s.hallOfFamePosition !== i) text(hs.name, x + 48, y, 4);
			}

			// sign up:
			if (s.hallOfFamePosition !== false) {
				var x = 64 + Math.floor(s.hallOfFamePosition / 5) * 96;
				var y = 159 + (s.hallOfFamePosition % 5) * 8;
				text(this.hallOfFameName, x, y, 4);

				if (!this.hallOfFameNameConfirmed) {
					text('_', x + this.hallOfFameName.length * 8, y, 7);
					text('enter your i.d. code on the keyboard', 16, 143, 7);
				}
			}

			if (this.hallOfFameNameConfirmed) {
				text('hit    for new game', 80, 143, 5);
				text('f5', 112, 143, 7);
			}
		}
	};

	this.scanAnotherVisitor = function() {
		if (!game.timeoutAnotherVisitor) {
			audio.request({name: 'anotherVisitor'});
			game.timeoutAnotherVisitor = setTimeout(function() {
				game.pocketComputer.visible = true;
				game.scene = 'elevator';
			}, 6500);
		}
	};

	this.scanElevator = function() {
		game.elevator.scanRoutine();
		if (!game.elevator.d && game.pocketComputer.state == 'map') game.dork.scanRoutine();
		game.pocketComputer.scanRoutine();
	};

	this.scanRoom = function() {
		if (this.skipScanFrames > 0) {
			this.skipScanFrames--;
			return;
		}

		game.room.scanRoutine();
		game.dork.scanRoutine();
	};

	this.scanTerminal = function() {
		game.actualTerminal.scanRoutine();
	};

	this.scanGameOver = function() {
		this.gameOverFrames++;

		if (this.gameOverFrames > 250) {
			game.scene = 'scores';
		}
	};

	this.scanElvin = function() {
		this.elvinFrames++;

		if (this.elvinFrames == 1) {
			audio.stopAllSound();
			audio.request({name: 'nonono', offset: 500});
		}
		else if (this.elvinFrames > 210) {
			audio.request({name: 'missionAccomplished'});
			game.scene = 'scores';
		}
	};

	this.scanScores = function() {
		if (!this.scoreData) {
			var secondsRemaining = 0;
			if (game.missionComplete) {
				var hour = game.timeHour == 12 ? 0 : game.timeHour;
			 	secondsRemaining = (5 - hour) * 60 * 60 + (59 - game.timeMinute) * 60 + (60 - game.timeSecond);
			}

			this.scoreData = {
				'puzzlePiecesFound': game.pocketComputer.foundedPieces,
				'puzzlePiecesFoundScore': game.pocketComputer.foundedPieces * 100,
				'passwordsFound': game.passwordsFound,
				'passwordsFoundScore': game.passwordsFound * 100,
				'puzzlesSolved': game.pocketComputer.solvedPuzzles,
				'puzzlesSolvedScore': game.pocketComputer.solvedPuzzles * 500,
				'secondsRemaining': secondsRemaining,
				'hallOfFamePosition': false
			};
			this.scoreData.totalScore = this.scoreData.puzzlePiecesFoundScore + this.scoreData.passwordsFoundScore + this.scoreData.puzzlesSolvedScore + secondsRemaining;
			if (game.missionComplete) this.scoreData.totalScore += 1000;

			// calculating high scores:
			for (var i = options.highScores.length - 1; i >= -1; i--) {
				if (i == -1 || this.scoreData.totalScore < options.highScores[i].score) {
					options.highScores[i + 1] = {
						score: this.scoreData.totalScore,
						name: '-----'
					};
					if (i + 1 < 15) this.scoreData.hallOfFamePosition = i + 1;
					break;
				}
				else if (this.scoreData.totalScore >= options.highScores[i].score) {
					options.highScores[i + 1] = {
						name: options.highScores[i].name,
						score: options.highScores[i].score
					};
				}
			}
			// updating high scores:
			this.updateHighScores();

			// I have to know about it!
			analyticsEvent('gameEvent', 'gameOver', game.missionComplete ? 'mission accomplished' : 'mission terminated');
			analyticsEvent('gameEvent', 'totalScore', this.scoreData.totalScore);
			analyticsEvent('gameEvent', 'totalGameTimeInSecond', Math.round((new Date().getTime() - this.startTime) / 1000));
		}
		else {
			if (this.hallOfFameNameConfirmed === true) {

			}
			else if (this.scoreData.hallOfFamePosition !== false && this.scoreData.hallOfFamePosition < 14) {
				// confirm name to hall of frame
				if (pressedKeys[keys.ENTER] === true && this.hallOfFameName.length) {
					pressedKeys[keys.ENTER] = 'hold';
					this.hallOfFameNameConfirmed = true;
				}
				// delete character
				else if (pressedKeys[keys.BACKSPACE] === true && this.hallOfFameName.length) {
					pressedKeys[keys.BACKSPACE] = 'hold';
					this.hallOfFameName = this.hallOfFameName.slice(0, -1);
				}
				// insert character
				else {
					var press = false;

					for (var i = 65; i < 91; i++) {
						if (pressedKeys[i] === true) {
							pressedKeys[i] = 'hold';
							press = i;
						}
					}
					for (var i = 48; i < 58; i++) {
						if (pressedKeys[i] === true) {
							pressedKeys[i] = 'hold';
							press = i;
						}
					}

					if (press) {
						this.hallOfFameName += String.fromCharCode(press);
						if (this.hallOfFameName.length == 5) this.hallOfFameNameConfirmed = true;
					}
				}
				if (this.hallOfFameNameConfirmed) {
					// update jstorage:
					options.highScores[this.scoreData.hallOfFamePosition].name = this.hallOfFameName;
					this.updateHighScores();
				}
			}
			else this.hallOfFameNameConfirmed = true;
		}
	};
}

/**
 * End of game.js file
 */