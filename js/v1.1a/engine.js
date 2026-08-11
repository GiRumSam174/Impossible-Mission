/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: engine.js /1.1a/
 * last update: 02.06.2013.
 */

function oEngine() {
	this.neededResources = 1;
	this.loadedResources = 0;
	this.spriteWidth = 800;
	this.spriteHeight = 600;

	// for gamepad
	this.gamepadEnabled = false;

	// memory canvas for quick color replace
	this.baseSpriteCanvas = false;
	this.baseSpriteContext;
	this.baseSpriteData;
	this.baseSpriteDataPix;
	this.baseSpriteImageDataCreated;

	this.init = function() {
		if (document.location.search != "") window.history.pushState(false, false, '/');
		// browser and features check...
		engine.checkSystemRequirements(function() {
			// init menu buttons:
			engine.initMenu();
			// init audio system:
			audio = new oAudio();
			audio.init();
			// loading options from local storage:
			engine.setOptions();
			// loading resources...
			engine.loadResources(function() {
				// generate new game:
				engine.generateNewGame(function() {
					// focus for keyhandling:
					$(document).focus();
					// init keyhandling:
					engine.initKeyHandling();
					// set initial menubar colors:
					engine.setMenuColors();
					// init engine (canvas, animation and scan routine):
					engine.initEngine();
				});
			});
		}, function() {
			document.location = 'unsupported-browser.html';
		});
	};

	this.checkSystemRequirements = function(success, fail) {
		var ok = true;

		// IE is disabled:
		if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) ok = false;

		// local storage:
		if (typeof(Storage) === "undefined") ok = false;

		// canvas:
		var c = document.createElement('canvas');
  		if (!(c.getContext && c.getContext('2d'))) ok = false;

		// request animation frame:
		if (!(window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame)) ok = false;

		// Web Audio API:
		// if (!(window.AudioContext || window.webkitAudioContext)) ok = false;

		// Gamepad API:
		//if (!(!!navigator.webkitGetGamepads || !!navigator.webkitGamepads)) ok = false;

		if (ok) success();
		else fail();
	};

	this.setOptions = function() {
		// color palette:
		if (localStorage.getItem('palette') === null) localStorage.setItem('palette', 'vice');
		options.palette = localStorage.getItem('palette');
		$('.button-palette[data-palette="' + options.palette + '"]').trigger('click');

		// sound:
		if (!audio.context) localStorage.setItem('sound', 'off');
		if (localStorage.getItem('sound') === null) localStorage.setItem('sound', 'on');
		options.sound = localStorage.getItem('sound');
		$('.button-sound-' + options.sound).trigger('click');

		// high scores: (in string format) Deprecated due to browser incompatibility
	};

	this.loadResources = function(cb) {
		// loading loop:
		this.loadResourcesInterval = setInterval(function() {
			$('#loaded-resources').text(engine.loadedResources);
			if (engine.loadedResources == engine.neededResources) {
				clearInterval(engine.loadResourcesInterval);
				$('#loading').addClass('hide');
				$('#gameScreen, #menu').removeClass('hide');
				cb();
			}
		}, 100);

		// create sprites by four color palette:
		baseSprites.src = 'images/v1.0/sprites.png';
		baseSprites.onload = function() {
			engine.baseSpriteCanvas = document.createElement('canvas');
			engine.baseSpriteCanvas.width = engine.spriteWidth;
			engine.baseSpriteCanvas.height = engine.spriteHeight;

			engine.baseSpriteContext = engine.baseSpriteCanvas.getContext('2d');
			engine.baseSpriteContext.drawImage(baseSprites, 0, 0);
			engine.baseSpriteData = engine.baseSpriteContext.getImageData(0, 0, engine.spriteWidth, engine.spriteHeight);
			engine.baseSpriteDataPix = engine.baseSpriteData.data;
			engine.baseSpriteImageDataCreated = engine.baseSpriteContext.createImageData(engine.spriteWidth, engine.spriteHeight);

			engine.cloneImageByPalette('vice', palette.vice);
			engine.cloneImageByPalette('c64s', palette.c64s);
			engine.cloneImageByPalette('c64hq', palette.c64hq);
			engine.cloneImageByPalette('ccs64', palette.ccs64);
			//engine.cloneImageByPalette(, 'pc64', palette.pc64);
			engine.loadedResources++;
		}

		// load sounds:
		audio.loadAudioResource(0);
	};

	this.cloneImageByPalette = function(name, pal) {
		var newImageData = engine.baseSpriteImageDataCreated;

		for (var i = 0, n = engine.baseSpriteDataPix.length; i < n; i += 4) {
			var pr = engine.baseSpriteDataPix[i];
			var pg = engine.baseSpriteDataPix[i + 1];
			var pb = engine.baseSpriteDataPix[i + 2];

			for (var j = 0; j < 16; j++) {
				var c = palette.sprite[j];
				var sr = parseInt(c[0] + c[1], 16);
				var sg = parseInt(c[2] + c[3], 16);
				var sb = parseInt(c[4] + c[5], 16);

				if (pr == sr && pg == sg && pb == sb) {
					var rc = pal[j];
					newImageData.data[i] = parseInt(rc[0] + rc[1], 16);
					newImageData.data[i + 1] = parseInt(rc[2] + rc[3], 16);
					newImageData.data[i + 2] = parseInt(rc[4] + rc[5], 16);
					newImageData.data[i + 3] = engine.baseSpriteDataPix[i + 3];
					break;
				}
			}
		}

		var tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = engine.spriteWidth;
		tmpCanvas.height = engine.spriteHeight;
		var tmpContext = tmpCanvas.getContext('2d');
		tmpContext.putImageData(newImageData, 0, 0);

		sprites[name] = new Image();
		sprites[name].src = tmpCanvas.toDataURL("image/png");
	};

	this.replaceColorsInSprites = function(area, replace) {
		$.each(sprites, function(key, sprite) {
			var tmpCanvas = document.createElement('canvas');
			tmpCanvas.width = engine.spriteWidth;
			tmpCanvas.height = engine.spriteHeight;
			var tmpContext = tmpCanvas.getContext('2d');
			tmpContext.drawImage(sprite, 0, 0);
			var tmpData = tmpContext.getImageData(0, 0, engine.spriteWidth, engine.spriteHeight);

			var newImageData = tmpContext.createImageData(engine.spriteWidth, engine.spriteHeight);
		
			var pix = tmpData.data;
			var rcp = palette[key];

			for (var i = 0, n = pix.length; i < n; i += 4) {
				var pixelNumber = Math.floor(i / 4);
				var px = pixelNumber % engine.spriteWidth;
				var py = Math.floor(pixelNumber / engine.spriteWidth);
				var pixelIsReplaced = false;

				for (var j = 0, inArea = false; j < area.length; j++) {
					var a = area[j];
					if (px >= a.x && px < a.x + a.w && py >= a.y && py < a.y + a.h) {
						inArea = true;
						break;
					}
				}

				if (inArea) {
					// we are in a box, find changes:
					var pi = getColorIndex(engine.baseSpriteDataPix[i], engine.baseSpriteDataPix[i + 1], engine.baseSpriteDataPix[i + 2]);
					if (pi in replace) {
						var rc = rcp[replace[pi]];

						newImageData.data[i] = parseInt(rc[0] + rc[1], 16);
						newImageData.data[i + 1] = parseInt(rc[2] + rc[3], 16);
						newImageData.data[i + 2] = parseInt(rc[4] + rc[5], 16);
						newImageData.data[i + 3] = pix[i + 3];
						pixelIsReplaced = true;
					}
				}

				if (!pixelIsReplaced) {
					// nothing change:
					newImageData.data[i] = pix[i];
					newImageData.data[i + 1] = pix[i + 1];
					newImageData.data[i + 2] = pix[i + 2];
					newImageData.data[i + 3] = pix[i + 3];
				}
			}

			tmpContext.putImageData(newImageData, 0, 0);
			sprites[key].src = tmpCanvas.toDataURL("image/png");
		});
	};

	this.generateNewGame = function(cb) {
		game = new oGame();
		game.generateNewGame();

		cb();
	};

	this.initEngine = function() {
		// canvas config:
		this.screen = $('#screen').first();
		this.canvas = document.getElementById('screen').getContext('2d');
		this.canvas.imageSmoothingEnabled = false;
		this.canvas.webkitImageSmoothingEnabled = false;
		this.canvas.mozImageSmoothingEnabled = false;

		$(window).resize(function() {
			var w = $(window).prop('innerWidth');
			var h = $(window).prop('innerHeight');
			if (w / h > 16 / 10) {
				var newHeight = h;
				var newWidth = Math.round((h / 10) * 16);
			}
			else {
				var newWidth = w;
				var newHeight = Math.round((w * 10) / 16);
			}

			newWidth *= .9;
			newHeight *= .9;

			engine.screen.css({
				'width': newWidth,
				'height': newHeight,
				'margin-left': -Math.round(newWidth / 2),
				'margin-top': -Math.round(newHeight / 2)
			});
			$('#manual').css({
				'height': newHeight - 40,
				'margin-top': -Math.round((newHeight - 20) / 2)
			});
		});
		$(window).trigger('resize');

		// start animation and scan routine:
		this.animationFrameTime = 0;
		this.animationFrameCounter = 0;
		this.scanFrameCounter = 0;
		this.scanInterval = false;
		
		window.animFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;

		this.animation();
		this.startScan();
	};

	this.animation = function() {
		window.animFrame(function(actualTime) {
			if (game.pause) {
				engine.animation();
				return;
			}

			if (actualTime - engine.animationFrameTime > 30) {
				engine.animationFrameTime = actualTime;
				engine.animationRoutine();
			}
			engine.animation();
		});
	};

	this.startScan = function() {
		this.scanInterval = setInterval(function() {
			if (game.pause) return;
			engine.scanRoutine();
		}, 27);
	};

	this.animationRoutine = function() {
		this.animationFrameCounter++;

		if (game.scene == 'anotherVisitor') {
			game.animateElevator();
		}
		else if (game.scene == 'elevator') {
			game.animateElevator();
		}
		else if (game.scene == 'room') {
			game.animateRoom();
		}
		else if (game.scene == 'terminal') {
			game.animateTerminal();
		}
		else if (game.scene == 'gameOver') {
			game.animateGameOver();
		}
		else if (game.scene == 'elvin') {
			game.animateElvin();
		}
		else if (game.scene == 'scores') {
			game.animateScores();
		}

		if (game.eraseState) {
			rect(0, 100, 320, - game.eraseHeight, 0);
			rect(0, 100, 320, + game.eraseHeight, 0);
		}
	};

	this.scanRoutine = function() {
		this.scanFrameCounter++;

		// check gamepad
		if (navigator.webkitGetGamepads) {
			var gamepad = navigator.webkitGetGamepads()[0];
			if (this.gamepadEnabled || gamepad !== undefined) {
				this.gamepadEnabled = true;

				var b = gamepad.buttons;
				var a = gamepad.axes;

				var fire = b && (b[0] || b[1] || b[2] || b[3]);
				if (fire && pressedKeys[keys.SHIFT] !== 'hold') pressedKeys[keys.SHIFT] = true;
				else if (!fire) pressedKeys[keys.SHIFT] = false;

				var up = (b && b[12]) || (a && a[1] < -.5);
				if (up && pressedKeys[keys.UP] !== 'hold') pressedKeys[keys.UP] = true;
				else if (!up) pressedKeys[keys.UP] = false;

				var down = (b && b[13]) || (a && a[1] > .5);
				if (down && pressedKeys[keys.DOWN] !== 'hold') pressedKeys[keys.DOWN] = true;
				else if (!down) pressedKeys[keys.DOWN] = false;

				var left = (b && b[14]) || (a && a[0] < -.5);
				if (left && pressedKeys[keys.LEFT] !== 'hold') pressedKeys[keys.LEFT] = true;
				else if (!left) pressedKeys[keys.LEFT] = false;

				var right = (b && b[15]) || (a && a[0] > .5);
				if (right && pressedKeys[keys.RIGHT] !== 'hold') pressedKeys[keys.RIGHT] = true;
				else if (!right) pressedKeys[keys.RIGHT] = false;
			}
		}

		// empty audio request queue
		audio.queue = [];

		// increase time:
		if (
			this.scanFrameCounter % 37 === 0 &&
			!game.pause &&
			!game.eraseState &&
			(game.scene == 'elevator' || game.scene == 'room') &&
			!game.pocketComputer.dial1 &&
			!game.pocketComputer.dial2 &&
			!game.timeIsSuspended
		) game.increaseTime('1s');

		if (game.eraseState) {
			if (game.eraseState == 'closed') {
				game.eraseHeight += 7;
				if (game.eraseHeight >= 120) {
					game.eraseState = 'opened';
					game.eraseFunction();
				}
			}
			else if (game.eraseState == 'opened') {
				game.eraseHeight -= 7;
				if (game.eraseHeight <= 0) game.eraseState = false;
			}
		}
		else {
			if (game.scene == 'anotherVisitor') {
				game.scanAnotherVisitor();
			}
			else if (game.scene == 'elevator') {
				game.scanElevator();
			}
			else if (game.scene == 'room') {
				game.scanRoom();
			}
			else if (game.scene == 'terminal') {
				game.scanTerminal();
			}
			else if (game.scene == 'gameOver') {
				game.scanGameOver();
			}
			else if (game.scene == 'elvin') {
				game.scanElvin();
			}
			else if (game.scene == 'scores') {
				game.scanScores();
			}
		}

		if (game.timeHour == 6 && (game.scene == 'room' || game.scene == 'elevator')) {
			game.initGameOver();
		}

		// play collected sound effects
		audio.playQueue();
	};

	this.initKeyHandling = function() {
		$(document).keydown(function(e) {
			// F12 console
			if (DEV && e.which == 123) return;

			e.preventDefault();
			e.stopPropagation();

			var which = e.which;

			// F5 reload
			if (which == 116) {
				document.location = document.location;
				return;
			}

			// ESC: (close dialogs)
			if (which == keys.ESC && !$('#overlay').hasClass('hide')) $('#overlay').trigger('click');

			// Toggle pause status with pause and P buttons:
			if ((which == 80 || which == 19) && $('#overlay').hasClass('hide')) game.togglePause();

			if (which == keys.CTRL || which == keys.SPACE) which = keys.SHIFT;

			if (pressedKeys[which] === false || pressedKeys[which] === undefined) pressedKeys[which] = true;
		});

		$(document).keyup(function(e) {
			e.preventDefault();
			e.stopPropagation();

			var which = e.which;
			if (which == keys.CTRL || which == keys.SPACE) which = keys.SHIFT;

			pressedKeys[which] = false;
		});
	};

	this.initMenu = function() {
		function setActive(button) {
			$(button).parent('.panel').find('.button').removeClass('active');
			$(button).addClass('active');
		};

		// toggle manual:
		$('.button-manual').click(function() {
			game.togglePause(true);
			$('#overlay, #manual').removeClass('hide');
		});
		$('#overlay').click(function() {
			$('#overlay, #manual, #upgradeBrowser').addClass('hide');
			game.togglePause(false);
		});

		// set color palette:
		$('.button-palette').click(function() {
			var pal = $(this).attr('data-palette');
			options.palette = pal;
			localStorage.setItem('palette', pal);
			gameColors = palette[pal];
			$('#body').css('background', '#' + gameColors[0]);
			setActive(this);
			engine.changeGameSpriteColors();
		});

		// toggle sound:
		$('.button-sound-on').click(function() {
			if (!audio.context) {
				game.togglePause(true);
				$('#overlay, #upgradeBrowser').removeClass('hide');
			}
			else {
				options.sound = 'on';
				localStorage.setItem('sound', 'on');
				setActive(this);
				if (game && game.roomId && game.room.droids.length) game.room.droidSound = 'needToStart';
			}
		});
		$('.button-sound-off').click(function() {
			if (audio) audio.stopAllSound();
			options.sound = 'off';
			localStorage.setItem('sound', 'off');
			setActive(this);
		});
	};

	this.changeGameSpriteColors = function() {
		if (game) {
			// puzzles in furnitures:
			for (var i = 1; i <= 32; i++) {
				for (var j = 0; j < game.rooms[i].furnitures.length; j++) {
					if (game.rooms[i].furnitures[j].puzzle) game.rooms[i].furnitures[j].puzzle.generateImage();
				}
			}
			// puzzles in pocket computer memory:
			game.pocketComputer.refreshAllPuzzleImage();
			// room furnitures and terminals:
			for (var i = 1; i <= 32; i++) game.rooms[i].refreshRoomImages();
			// black balls:
			if (game.roomId && game.room.blackBall) game.room.blackBall.generateImage();
			// menu bar:
			this.setMenuColors();
		}
	};

	this.setMenuColors = function() {
		// this function is dropped from the final 1.0 version
		return;

		if (game.scene == 'elevator') {
			$('#menu').css('background', '#' + gameColors[15]);
			$('#menu .panel').css('border-color', '#' + gameColors[12]);
		}
		else if (game.roomId) {
			$('#menu').css('background', '#' + gameColors[roomColors[game.roomId].bg]);
			$('#menu .panel').css('border-color', '#' + gameColors[roomColors[game.roomId].pg]);
		}
	};

	this.setFullscreen = function() {
		var e = document.getElementById("gameScreen");
		if (e.requestFullScreen) e.requestFullScreen();
		else if(e.mozRequestFullScreen) e.mozRequestFullScreen();
		else if(e.webkitRequestFullScreen) e.webkitRequestFullScreen();
	};

	this.cancelFullscreen = function() {
		if (document.cancelFullScreen) document.cancelFullScreen();
		else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
		else if(document.webkitCancelFullScreen) document.webkitCancelFullScreen();
	};
}

// create engine instance:
engine = new oEngine();
// start engine when document is ready:
$(document).ready(function() {
	engine.init();
});

/**
 * End of engine.js file
 */