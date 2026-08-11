/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: pocketComputer.js /1.0/
 * last update: 16.05.2013.
 */

function oPocketComputer() {
	this.visible = false;		// pocket computer is invisible only during the "Another visitor..." speech
	this.state = 'map';			// pocket computer has three states: map, puzzles, phone
	this.revealMap = {};		// the revealed and unrevealed areas of elevator system
	this.pointerX = 248;		// finger horizontal coordinate
	this.pointerY = 160;		// finger vertical coordinate
	this.soundInLine = false;	// looping humming noise
	this.dial1 = false;			// we dial the first number
	this.dial2 = false;			// we dial the second number
	this.dial1Message = '';		// call response 
	this.dial2Message = '';		// call response 

	this.foundedPieces = 0;			// founded puzzle pieces for score calculation
	this.solvedPuzzles = 0;			// solved puzzle counter for score calculation
	this.memory = [];				// memory contains puzzles (array, 36 item)
	this.memoryIndex = 0;			// list position (0-34)
	this.desktop = [];				// puzzles on the desktop (array, 4 item)
	this.selectedDesktop = false;	// which desktop puzzle is selected? (0-3)
	this.grabbedPuzzle = false;		// selected and navigated puzzle
	this.grabbedPuzzlePlace = false;// which puzzle is navigated as a pointer? (m1, m2, d0, d1, d2, d3)

	this.undoPuzzle = false;		// puzzle object for undo function
	this.undoPlace = false;			// undo puzzle position (0-3)
	
	this.message = false;			// warning message
	this.messageFrame = 0;			// frame counter for fluid message writing

	this.init = function() {
		for (var i = 1; i <= 8; i++) this.revealMap[i] = [ 0, 0, 0, 0, 0, 0 ];	// the full map is unrevealed at start
		this.revealMap[1][0] = 1;	// the first elevator first level is an exception, it is instantly revealed

		this.resetPointer();

		for (var i = 0; i < 36; i++) this.memory[i] = false;
		for (var i = 0; i < 4; i++) this.desktop[i] = false;
	};

	this.refreshAllPuzzleImage = function() {
		for (var i = 0; i < 36; i++) if (this.memory[i]) this.memory[i].generateImage();

		for (var i = 0; i < 4; i++) {
			if (this.desktop[i]) {
				this.desktop[i].generateImage();
				if (this.desktop[i].overlapPuzzles.length) {
					for (var j = 0; j < this.desktop[i].overlapPuzzles.length; j++) {
						this.desktop[i].overlapPuzzles[j].generateImage();
					}
				}
			}
		}
	};

	this.puzzleSetIsSolvable = function(setId) {
		for (var i = 0, j = 0; i < 36; i++) if (this.memory[i] && this.memory[i].set == setId) j++;

		return j == 4 ? true : false;
	};

	this.resetPointer = function() {
		this.pointerX = 248;
		this.pointerY = 160;
	};

	this.animationRoutine = function() {
		if (game.timeHour == 6) this.visible = false;

		if (!this.visible) return;

		draw(0, 200, 320, 80, 0, 120);

		if (this.state == 'map') {
			// draw map border:
			draw(0, 280, 164, 59, 58, 131);

			// draw map:
			rect(64, 136, 152, 48, 5);
			for (var i = 1; i <= 8; i++) {
				for (var j = 0; j < 6; j++) {
					if (this.revealMap[i][j]) {
						rect(83 + (i-1) * 16, 136 + j*8, 2, 8, 0);
						// has left room?
						var roomId = game.map.rooms[i - 1][j];
						if (roomId) {
							// has right top corridor?
							if (hasRightDoor(roomId) == 2) rect(80 + (i-1) * 16, 137 + j*8, 3, 1, 0);
							// has right bottom corridor?
							else if (hasRightDoor(roomId) == 3) rect(80 + (i-1) * 16, 141 + j*8, 3, 1, 0);
							// room is revealed?
							if (hasRightDoor(roomId) && game.rooms[roomId].revealed) rect(72 + (i-1) * 16, 137 + j*8, 8, 5, 0);
						}
						// has right room?
						var roomId = game.map.rooms[i][j];
						if (roomId) {
							// has left top corridor?
							if (hasLeftDoor(roomId) == 1) rect(85 + (i-1) * 16, 137 + j*8, 3, 1, 0);
							// has left bottom corridor?
							else if (hasLeftDoor(roomId) == 4) rect(85 + (i-1) * 16, 141 + j*8, 3, 1, 0);
							// room is revealed?
							if (hasLeftDoor(roomId) && game.rooms[roomId].revealed) rect(88 + (i-1) * 16, 137 + j*8, 8, 5, 0);
						}
					}
				}
			}

			// draw actual point:
			rect(83 + (game.elevator.x-1) * 16, 136 + Math.floor(game.elevator.y / 53), 2, 3, [0, 11, 12, 15, 1, 15, 12, 11][Math.floor(getAFC() % 24 / 3)]);
		}

		if (this.state == 'puzzles') {
			// memory container:
			draw(320, 200, 5, 45, 49, 128);
			draw(325, 200, 5, 45, 106, 128);
			// memory:
			for (var i = this.memoryIndex, j = 0; i < this.memoryIndex + 2; i++, j++) {
				var puzzle = this.memory[i];
				if (!puzzle) continue;
				puzzle.draw(56, 128 + j * 24);
				if (puzzle.correctOrientation) rect(49, 132 + j * 20, 5, 16, 10);
			}
			// desktop:
			for (var i = 0; i < 4; i++) {
				var puzzle = this.desktop[i];
				if (!puzzle) continue;
				var x = i % 2 ? 176 : 120;
				var y = i < 2 ? 128 : 152;
				puzzle.draw(x, y);

				// draw selection:
				if (this.selectedDesktop === 0) { rect(124, 149, 48, 2, 8); rect(168, 130, 4, 19, 8); }
				if (this.selectedDesktop === 1) { rect(180, 149, 48, 2, 8); rect(224, 130, 4, 19, 8); }
				if (this.selectedDesktop === 2) { rect(124, 173, 48, 2, 8); rect(168, 154, 4, 19, 8); }
				if (this.selectedDesktop === 3) { rect(180, 173, 48, 2, 8); rect(224, 154, 4, 19, 8); }
			}

			// text info:
			if (this.message) {
				if (this.message == 'no image selected') text(this.message, 73, 183, 7);
				if (this.message == "can't undo") text(this.message, 97, 183, 7);
				if (this.message == "end of memory") text(this.message, 89, 183, 7);
				if (this.message == "colors must match") text(this.message, 73, 183, 7);
				if (this.message == "images can't overlap") text(this.message, 58, 183, 7);
				if (this.message == "time is suspended") text(this.message, 73, 183, 7);

				text('(push button)', 89, 191, 1);

				this.messageFrame += 15;
				var rectPos = Math.min(47 + this.messageFrame, 47 + 181);
				rect(rectPos, 175, 45 + 182 - rectPos, 18, 0);
			}
			else {
				text('snoozes:', 48, 183, 4);
				text(game.snoozes, 112, 183, 7);
				text('lift inits:', 128, 183, 4);
				text(game.liftInits, 216, 183, 7);
				text('psw:', 48, 191, 5);
				text(game.solvedPassword, 80, 191, 1);
				text(game.timeHour + ':' + game.timeMinuteString + ':' + game.timeSecondString, game.timeHour < 10 ? 168 : 160, 191, 3);
			}

			if (this.grabbedPuzzle) {
				// draw puzzle as pointer:
				this.grabbedPuzzle.draw(this.pointerX, this.pointerY);
			}
			else {
				// draw pointer as pointer:
				draw(300, 280, 24, 19, this.pointerX, this.pointerY);
			}
		}

		if (this.state == 'phone') {
			// phone buttons:
			draw(330, 200, 14, 64, 48, 128);
			// texts:
			text('correct orientations', 64, 135, 3);
			text('of leftmost pieces.', 64, 143, 3);
			text('we have enough', 64, 159, 4);
			text('pieces to solve the', 64, 167, 4);
			text('upper left puzzle?', 64, 175, 4);
			text('hang up.', 64, 191, 7);
			if (this.dial1 && this.dial1Message) {
				if (this.dial1Message == 'nothing in memory') text(this.dial1Message, 80, 183, 1);
				if (this.dial1Message == 'orientation corrected') text(this.dial1Message, 56, 183, 1);
			}
			if (this.dial2 && this.dial2Message) {
				if (this.dial2Message == 'nothing in memory') text(this.dial2Message, 80, 183, 1);
				if (this.dial2Message == 'need more pieces.') text(this.dial2Message, 80, 183, 1);
				if (this.dial2Message == 'a solution exists.') text(this.dial2Message, 80, 183, 1);
			}
			// draw pointer:
			draw(300, 280, 24, 19, this.pointerX, this.pointerY);
		}
	};

	this.scanRoutine = function() {
		var buttonLeft = pressedKeys[keys.LEFT] === true;
		var buttonRight = pressedKeys[keys.RIGHT] === true;
		var buttonUp = pressedKeys[keys.UP] === true;
		var buttonDown = pressedKeys[keys.DOWN] === true;
		var buttonFire = fire();

		if (this.message) {
			if (buttonFire && this.messageFrame > 200) {
				holdFire();
				this.message = false;
				game.timeIsSuspended = false;
			}

			return;
		}

		if (this.state == 'puzzles') {
			if (buttonFire) {
				holdFire();
				var x = this.pointerX;
				var y = this.pointerY;

				// if we navigate a puzzle:
				if (this.grabbedPuzzle) {
					// put back first puzzle to memory:
					if (this.grabbedPuzzlePlace == 'm1' && x >= 56 && x <= 69 && y >= 128 && y <= 136) {
						audio.request({name: 'beep4'});
						this.grabbedPuzzle = false;
						this.grabbedPuzzlePlace = false;
						this.pointerX = 82;
						this.pointerY = 139;
					}
					// put back second puzzle to memory:
					if (this.grabbedPuzzlePlace == 'm2' && x >= 56 && x <= 69 && y >= 146 && y <= 154) {
						audio.request({name: 'beep4'});
						this.grabbedPuzzle = false;
						this.grabbedPuzzlePlace = false;
						this.pointerX = 82;
						this.pointerY = 163;
					}

					// put to desktop places:
					for (var i = 0; i < 4; i++) {
						var x1 = i % 2 ? 170 : 114; var x2 = i % 2 ? 192 : 136;
						var y1 = i < 2 ? 126 : 147; var y2 = i < 2 ? 138 : 158;

						if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
							if (this.desktop[i] && this.grabbedPuzzlePlace != 'd' + i) {
								// this desktop place is reserved, try to overlapping...
								if (this.grabbedPuzzle.color != this.desktop[i].color) this.setMessage("colors must match");
								else {
									if (this.desktop[i].overlap(this.grabbedPuzzle, i)) {
										// overlap success:
										audio.request({name: 'beep4'});
										this.grabbedPuzzle = false;
										this.grabbedPuzzlePlace = false;
										this.selectedDesktop = i;
										this.pointerX = x2 + 10;
										this.pointerY = y2 + 2;

										// puzzle is solved?
										if (this.desktop[i].isSolved()) this.solve(i);
									}
									else this.setMessage("images can't overlap");
								}
							}
							else {
								// this desktop place is empty, we put the grabbed puzzle:
								this.eraseUndo();
								audio.request({name: 'beep4'});
								this.desktop[i] = this.grabbedPuzzle.clone();
								this.grabbedPuzzle = false;
								this.grabbedPuzzlePlace = false;
								this.selectedDesktop = i;
								this.pointerX = x2 + 10;
								this.pointerY = y2 + 2;
							}
						}
					}
				}
				// if we navigate the pointer:
				else {
					// vertical invert button:
					if (x >= 238 && x <= 259 && y >= 125 && y <= 147) {
						if (this.selectedDesktop === false) this.setMessage('no image selected');
						else {
							audio.request({name: 'beep5'});
							var p = this.desktop[this.selectedDesktop];
							p.flipV = !p.flipV;
							p.generateImage();
							// flip overlap puzzles too:
							for (var j = 0; j < this.desktop[this.selectedDesktop].overlapPuzzles.length; j++) {
								this.desktop[this.selectedDesktop].overlapPuzzles[j].flipV = !this.desktop[this.selectedDesktop].overlapPuzzles[j].flipV;
								this.desktop[this.selectedDesktop].overlapPuzzles[j].generateImage();
							}

							// puzzle is solved?
							if (this.desktop[this.selectedDesktop].isSolved()) this.solve(this.selectedDesktop);
						}
					}
					// horizontal invert button:
					if (x >= 262 && x <= 283 && y >= 125 && y <= 147) {
						if (this.selectedDesktop === false) this.setMessage('no image selected');
						else {
							audio.request({name: 'beep5'});
							var p = this.desktop[this.selectedDesktop];
							p.flipH = !p.flipH;
							p.generateImage();
							// flip overlap puzzles too:
							for (var j = 0; j < this.desktop[this.selectedDesktop].overlapPuzzles.length; j++) {
								this.desktop[this.selectedDesktop].overlapPuzzles[j].flipH = !this.desktop[this.selectedDesktop].overlapPuzzles[j].flipH;
								this.desktop[this.selectedDesktop].overlapPuzzles[j].generateImage();
							}

							// puzzle is solved?
							if (this.desktop[this.selectedDesktop].isSolved()) this.solve(this.selectedDesktop);
						}
					}
					// bin button:
					if (x >= 286 && x <= 307 && y >= 125 && y <= 147) {
						if (this.selectedDesktop === false) this.setMessage('no image selected');
						else {
							audio.request({name: 'beep5'});

							// set undo:
							this.setUndo(this.selectedDesktop);

							// erase puzzle:
							this.desktop[this.selectedDesktop] = false;

							// next focus:
							this.shiftDesktopSelection();
						}
					}

					// OFF button:
					if (x >= 238 && x <= 259 && y >= 149 && y <= 171) {
						this.eraseUndo();
						this.state = 'map';
						holdFire();
						audio.request({name: 'beep5'});
					}
					// undo button:
					if (x >= 262 && x <= 283 && y >= 149 && y <= 171) {
						if (this.undoPuzzle === false) {
							this.setMessage("can't undo");
						}
						else {
							audio.request({name: 'beep5'});
							this.desktop[this.undoPlace] = this.undoPuzzle.clone();
							this.selectedDesktop = this.undoPlace;
							this.eraseUndo();
						}
					}
					// pause button:
					if (x >= 286 && x <= 307 && y >= 149 && y <= 171) {
						game.timeIsSuspended = true;
						this.setMessage('time is suspended');
					}

					// color change buttons:
					for (var i = 0; i < 3; i++) {
						var color = [5, 7, 3][i];
						var x1 = [238, 262, 286][i];
						var x2 = [259, 283, 307][i];

						if (x >= x1 && x <= x2 && y >= 173 && y <= 195) {
							if (this.selectedDesktop === false) this.setMessage('no image selected');	
							else {
								audio.request({name: 'beep5'});
								var p = this.desktop[this.selectedDesktop];
								p.color = color;
								p.generateImage();
								// color overlap puzzles too:
								for (var j = 0; j < this.desktop[this.selectedDesktop].overlapPuzzles.length; j++) {
									this.desktop[this.selectedDesktop].overlapPuzzles[j].color = color;
									this.desktop[this.selectedDesktop].overlapPuzzles[j].generateImage();
								}
							}
						}
					}

					// up button:
					if (x >= 10 && x <= 35 && y >= 125 && y <= 144) {
						this.memoryIndex++;
						if (!this.memory[this.memoryIndex + 1]) {
							this.memoryIndex--;
							this.setMessage('end of memory');
						}
					}
					// down button:
					if (x >= 10 && x <= 35 && y >= 149 && y <= 169) {
						this.memoryIndex--;
						if (this.memoryIndex < 0) {
							this.memoryIndex = 0;
							this.setMessage('end of memory');
						}
					}
					// phone button:
					if (x >= 10 && x <= 35 && y >= 173 && y <= 191) {
						this.pointerX = 54;
						this.pointerY = 190;
						this.state = 'phone';
						holdFire();
						buttonFire = false;
						this.soundInLine = audio.request({name: 'inLine', loop: true});
					}

					// pick up first puzzle from memory:
					if (this.memory[this.memoryIndex] && x >= 56 && x <= 103 && y >= 128 && y <= 148) {
						audio.request({name: 'beep3'});
						this.grabbedPuzzle = this.memory[this.memoryIndex].clone();
						this.grabbedPuzzlePlace = 'm1';
						this.pointerX = 60;
						this.pointerY = 130;
					}
					// pick up second puzzle from memory:
					if (this.memory[this.memoryIndex + 1] && x >= 56 && x <= 103 && y >= 152 && y <= 172) {
						audio.request({name: 'beep3'});
						this.grabbedPuzzle = this.memory[this.memoryIndex + 1].clone();
						this.grabbedPuzzlePlace = 'm2';
						this.pointerX = 60;
						this.pointerY = 154;
					}

					// click on desktop, change puzzle selection or pick up puzzle
					for (var i = 0; i < 4; i++) {
						var x1 = i % 2 ? 176 : 120; var x2 = i % 2 ? 223 : 167;
						var y1 = i < 2 ? 128 : 152; var y2 = i < 2 ? 148 : 172;

						if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
							if (this.selectedDesktop === i) {
								// if this desktop slot it already selected, we try to pick up this puzzle
								this.eraseUndo();
								audio.request({name: 'beep3'});
								this.grabbedPuzzle = this.desktop[i].clone();
								this.grabbedPuzzlePlace = 'd' + i;
								this.pointerX = x1 + 4;
								this.pointerY = y1 + 2;
							}
							else {
								// if this desktop slot is empty, we do nothing
								if (!this.desktop[i]) audio.request({name: 'beep1'});
								else {
									// if not empty, we select this slot
									this.eraseUndo();
									audio.request({name: 'beep2'});
									this.selectedDesktop = i;
								}
							}
						}
					}
				}
			}

			// moving limits:
			if (this.grabbedPuzzle) {
				var limitXMin = 56;
				var limitXMax = 176;
				var limitYMin = 128;
				var limitYMax = 152;
			}
			else {
				var limitXMin = 2;
				var limitXMax = 300;
				var limitYMin = 126;
				var limitYMax = 181;
			}
		}

		if (this.state == 'phone') {
			if (this.soundInLine === 'needToStart') this.soundInLine = audio.request({name: 'inLine', loop: true});

			if (buttonFire && !this.dial1 && !this.dial2) {
				holdFire();
				var x = this.pointerX;
				var y = this.pointerY;

				this.eraseUndo();

				// dial1 button:
				if (x >= 48 && x <= 61 && y >= 128 && y <= 143) {
					if (this.soundInLine) {
						audio.stopAllSound();
						this.soundInLine = false;
					}
					this.dial1 = true;
					audio.request({name: 'dial1'});
					setTimeout(function() {
						// set the response message:
						if (!game.pocketComputer.memory[game.pocketComputer.memoryIndex]) game.pocketComputer.dial1Message = 'nothing in memory';
						else {
							// correct orientations:
							var p = game.pocketComputer.memory[game.pocketComputer.memoryIndex];
							if (p) p.fixOrientation();
							var p = game.pocketComputer.memory[game.pocketComputer.memoryIndex + 1];
							if (p) p.fixOrientation();

							game.pocketComputer.dial1Message = 'orientation corrected';
						}

						setTimeout(function() {
							game.pocketComputer.soundInLine = 'needToStart';
							game.pocketComputer.dial1Message = '';
							game.pocketComputer.dial1 = false;
							// add two minute "penalty":
							game.increaseTime('2m');
							// I need an event:
							analyticsEvent('gameEvent', 'puzzles', 'usePhone', 'dial1');
						}, 1700);
					}, 4600);
				}
				// dial2 button:
				if (x >= 48 && x <= 61 && y >= 152 && y <= 175) {
					if (this.soundInLine) {
						audio.stopAllSound();
						this.soundInLine = false;
					}
					this.dial2 = true;
					audio.request({name: 'dial2'});
					setTimeout(function() {
						// set the response message:
						var p = game.pocketComputer.memory[game.pocketComputer.memoryIndex];
						if (!p) game.pocketComputer.dial2Message = 'nothing in memory';
						else {
							if (game.pocketComputer.puzzleSetIsSolvable(p.set)) {
								game.pocketComputer.dial2Message = 'a solution exists.';
							}
							else {
								game.pocketComputer.dial2Message = 'need more pieces.';
							}
						}

						setTimeout(function() {
							game.pocketComputer.soundInLine = 'needToStart';
							game.pocketComputer.dial2Message = '';
							game.pocketComputer.dial2 = false;
							// add two minute "penalty":
							game.increaseTime('2m');
							// I need an event:
							analyticsEvent('gameEvent', 'puzzles', 'usePhone', 'dial2');
						}, 1700);
					}, 5300);
				}
				// hang up button:
				if (x >= 48 && x <= 61 && y >= 184 && y <= 191) {
					if (this.soundInLine) {
						audio.stopAllSound();
						this.soundInLine = false;
					}
					this.state = 'puzzles';
					holdFire();
					this.resetPointer();
				}

			}
			
			// moving limits:
			var limitXMin = 54;
			var limitXMax = 54;
			var limitYMin = 129;
			var limitYMax = 190;
		}

		if (!buttonFire) {
			if (this.state == 'phone' && (this.dial1 || this.dial2)) {
				// disable pointer moving
			}
			else {
				if (buttonLeft) {
					this.pointerX -= 3;
					if (this.pointerX < limitXMin) this.pointerX = limitXMin;
				}
				else if (buttonRight) {
					this.pointerX += 3;
					if (this.pointerX > limitXMax) this.pointerX = limitXMax;
				}
				if (buttonUp) {
					this.pointerY -= 2;
					if (this.pointerY < limitYMin) this.pointerY = limitYMin;
				}
				else if (buttonDown) {
					this.pointerY += 2;
					if (this.pointerY > limitYMax) this.pointerY = limitYMax;
				}
			}
		}
	};

	this.setMessage = function(msg) {
		holdFire();
		audio.request({name: 'beep1'});
		this.message = msg;
		this.messageFrame = 0;
	};

	this.solve = function(i) {
		this.solvedPuzzles++;
		var set = this.desktop[i].set;

		analyticsEvent('gameEvent', 'puzzleSolved', 'set' + set);

		// remove 4 puzzles of this set from memory
		var newMemory = [];
		for (var j = 0; j < 36; j++) newMemory[j] = false;
		for (var j = 0, k = 0; j < 36; j++) {
			if (this.memory[j].set !== set) newMemory[k++] = this.memory[j];
		}
		this.memory = newMemory;
		this.memoryIndex = 0;

		// more 4 beep
		audio.request({name: 'beep5', offset: 400});
		audio.request({name: 'beep5', offset: 400 * 2});
		audio.request({name: 'beep5', offset: 400 * 3});
		audio.request({name: 'beep5', offset: 400 * 4});

		// add a char to password
		game.solvedPassword = game.solvedPassword.replaceAt(set, passwords[game.mapId - 1][set]);
		
		// remove puzzle from desktop
		this.desktop[i] = false;
		this.selectedDesktop = false;
		this.shiftDesktopSelection();
	};

	this.shiftDesktopSelection = function() {
		for (var i = 1, found = false; i <= 4; i++) {
			var next = this.selectedDesktop + i;
			if (next > 3) next = next - 4;
			if (this.desktop[next]) {
				this.selectedDesktop = next;
				found = true;
				break;
			}
		}
		if (!found) this.selectedDesktop = false;
	};

	this.addPuzzle = function(puzzle) {
		this.foundedPieces++;
		for (var i = 0; i < 36; i++) {
			if (this.memory[i] === false) {
				this.memory[i] = puzzle;
				break;
			}
		}
	};

	this.eraseUndo = function() {
		this.undoPuzzle = false;
		this.undoPlace = false;
	};

	this.setUndo = function(place) {
		this.undoPuzzle = this.desktop[place].clone();
		this.undoPlace = place;
	};
}

/**
 * End of pocketComputer.js file
 */