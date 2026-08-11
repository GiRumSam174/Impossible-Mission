/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: constants.js /1.0/
 * last update: 20.05.2013.
 */

// main variables:
var DEV = false;		// developer mode flag
var engine;				// global engine object
var game;				// global game object
var audio;				// global audio object
var keys = { BACKSPACE: 8, CTRL: 17, SHIFT: 16, ENTER: 13, ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };
var pressedKeys = [];	// array of pressed key codes
var options = {};		// options from local storage
var baseSprites = new Image();
var sprites = {};		// generated sprites by all palette

// utils:

function log(variable) {
	if (DEV) console.log(variable);
}
function rnd(rndLimit) {
	return Math.floor(Math.random() * rndLimit) + 1;
}
function fillStyle(colorIndex) {
	engine.canvas.fillStyle = '#' + gameColors[colorIndex];
}
function strokeStyle(colorIndex) {
	engine.canvas.strokeStyle = '#' + gameColors[colorIndex];
}
function arc(x, y, radius, startAngle, endAngle) {
	engine.canvas.arc(x * 3, y * 3, radius * 3, startAngle * (Math.PI / 180), endAngle * (Math.PI / 180));
}
function rect(x, y, w, h, colorIndex) {
	fillStyle(colorIndex);
	engine.canvas.fillRect(x * 3, y * 3, w * 3, h * 3);
}
function draw(sx, sy, sw, sh, dx, dy) {
	engine.canvas.drawImage(sprites[options.palette], sx, sy, sw, sh, dx * 3, dy * 3, sw * 3, sh * 3);
}
function poly(color, coord) {
	fillStyle(color);
	engine.canvas.beginPath();
	for (var i = 0; i < coord.length; i++) {
		var c = coord[i];
		if (i == 0) engine.canvas.moveTo(c[0] * 3, c[1] * 3);
		else engine.canvas.lineTo(c[0] * 3, c[1] * 3);
	}
	engine.canvas.closePath();
	engine.canvas.fill();
}
function line(sx, sy, ex, ey, lineWidth, colorIndex) {
	if (!lineWidth) lineWidth = 1;
	engine.canvas.lineWidth = lineWidth;
	engine.canvas.strokeStyle = '#' + gameColors[colorIndex];

	engine.canvas.beginPath();
	engine.canvas.moveTo(sx * 3, sy * 3);
	engine.canvas.lineTo(ex * 3, ey * 3);
	engine.canvas.stroke();
}
function text(text, x, y, colorIndex, size, upper) {
	if (!size) size = 24;
	if (upper === undefined) upper = true;
	var text = text.toString();
	if (upper === true) text = text.toUpperCase();

	engine.canvas.font = size + 'px C64ProMonoRegular';
	fillStyle(colorIndex);
	engine.canvas.fillText(text, x * 3, y * 3);
}
function rightAlignedText(text, length) {
	text = text.toString();
	var diff = length - text.length;
	if (diff <= 0) return text.split('').slice(0, length).join('');
	do {
		text = ' ' + text;
	} while(length > text.length);

	return text;
}
function hasLeftDoor(roomId) {
	if (roomDoors[roomId].indexOf(1) !== -1) return 1;
	else if (roomDoors[roomId].indexOf(4) !== -1) return 4;
	return false;
}
function hasRightDoor(roomId) {
	if (roomDoors[roomId].indexOf(2) !== -1) return 2;
	else if (roomDoors[roomId].indexOf(3) !== -1) return 3;
	return false;
}
function hasLeftCorridor(elevatorNumber, elevatorPosition) {
	if (elevatorPosition % 216 !== 0) return false;

	var level = Math.floor((elevatorPosition / 216) / 2);
	var doorLevel = (elevatorPosition / 216) % 2 ? 'bottom' : 'top';

	var leftRooms = game.map.rooms[elevatorNumber - 1];

	var has = false;
	if (leftRooms[level] > 0 && doorLevel == 'top' && hasRightDoor(leftRooms[level]) == 2) has = true;
	if (leftRooms[level] > 0 && doorLevel == 'bottom' && hasRightDoor(leftRooms[level]) == 3) has = true;
	return has;
}
function hasRightCorridor(elevatorNumber, elevatorPosition) {
	if (elevatorPosition % 216 !== 0) return false;

	var level = Math.floor((elevatorPosition / 216) / 2);
	var doorLevel = (elevatorPosition / 216) % 2 ? 'bottom' : 'top';

	var rightRooms = game.map.rooms[elevatorNumber];

	var has = false;
	if (rightRooms[level] > 0 && doorLevel == 'top' && hasLeftDoor(rightRooms[level]) == 1) has = true;
	if (rightRooms[level] > 0 && doorLevel == 'bottom' && hasLeftDoor(rightRooms[level]) == 4) has = true;
	return has;
}
function getAFC() {
	return engine.animationFrameCounter;
}
function getSFC() {
	return engine.scanFrameCounter;
}
function getColorIndex(r, g, b) {
	for (var j = 0; palette.sprite[j]; j++) {
		var c = palette.sprite[j];
		var sr = parseInt(c[0] + c[1], 16);
		var sg = parseInt(c[2] + c[3], 16);
		var sb = parseInt(c[4] + c[5], 16);

		if (r == sr && g == sg && b == sb) return j;
	}

	return false;
}
function fire() {
	return pressedKeys[keys.SHIFT] === true ? true : false;
}
function holdFire() {
	pressedKeys[keys.SHIFT] = 'hold';
}
function collisionDetect(x1, y1, w1, h1, x2, y2, w2, h2) {
	var minX1 = x1;
	var maxX1 = x1 + w1;
	var minX2 = x2;
	var maxX2 = x2 + w2;

	var minY1 = y1;
	var maxY1 = y1 + h1;
	var minY2 = y2;
	var maxY2 = y2 + h2;

	if (maxX1 < minX2) return false;
	if (minX1 > maxX2) return false;
	if (maxY1 < minY2) return false;
	if (minY1 > maxY2) return false;

	return true;
}
function IN(v, a) {
	return a.indexOf(v) === -1 ? false : true;
}
function analyticsEvent(category, action, label, value) {
	var params = [];
	params.push('_trackEvent');

	if (category !== undefined) {
		params.push(category);
		if (action !== undefined) {
			params.push(action);
			if (label !== undefined) {
				params.push(label);
				if (value !== undefined) {
					params.push(value);
				}
			}
		}
	}

	if (!DEV && _gaq && params.length > 2) _gaq.push(params);
	if (DEV) log('_gaq.push([' + params.join(', ') + '])');
}
function runStop() {
	if (DEV) {
		clearInterval(engine.scanInterval);
		engine.animation = function() {};
		log("STOP!");
	}
}
function getActualPalette() {
	switch (options.palette) {
		case 'ccs64': return palette.ccs64;
		case 'c64hq': return palette.c64hq;
		case 'pc64': return palette.pc64;
		case 'c64s': return palette.c64s;
		default: return palette.vice;
	}
}
String.prototype.replaceAt = function(index, character) {
	return this.substr(0, index) + character + this.substr(index + character.length);
}

function unittestMap(mapId) {
	if (!DEV) return;

	var m = maps[mapId].rooms;
	var rooms = [];
	for (var i = 0; i <= 8; i++) {
		if (m[i].length != 6) log("ERROR 1");
		for (var j = 0; j < 6; j++) {
			var roomId = m[i][j];
			if (roomId == 0);
			else if (roomId < 0) log("ERROR 2");
			else if (roomId > 32) log("ERROR 3");
			else if (rooms.indexOf(roomId) !== -1) log("ERROR 4");
			else rooms.push(roomId);
		}
	}

	if (rooms.length != 32) log("ERROR 5");
	for (var i = 1; i <= 32; i++) if (rooms.indexOf(i) === -1) log("ERROR 6 ("+i+")");

	return;
}

/* Colors */

var palette = {
	'vice': ['000000','ffffff','68372B','70A4B2','6F3D86','588D43','352879','B8C76F','6F4F25','433900','9A6759','444444','6C6C6C','9AD284','6C5EB5','959595'],
	'ccs64': ['191D19','FCF9FC','933A4C','B6FAFA','D27DED','6ACF6F','4F44D8','FBFB8B','D89C5B','7F5307','EF839F','575753','A3A7A7','B7FBBF','A397FF','EFE9E7'],
	'c64hq': ['0a0a0a','fff8ff','851f02','65cda8','a73b9f','4dab19','1a0c92','ebe353','a94b02','441e00','d28074','464646','8b8b8b','8ef68e','4d91d1','bababa'],
	'pc64': ['212121','ffffff','b52121','73ffff','b521b5','21b521','2121b5','ffff21','b57321','944221','ff7373','737373','949494','73ff73','7373ff','b5b5b5'],
	'c64s': ['000000','fcfcfc','a80000','54fcfc','a800a8','00a800','0000a8','fcfc00','a85400','802c00','fc5454','545454','808080','54fc54','5454fc','a8a8a8'],
	'sprite': ['000000','FFFFFF','AA0000','00AAAA','AA00AA','00AA00','0000AA','DDDD00','DDAA00','AA6600','DDAAAA','444444','666666','AADDAA','AAAADD','DDDDDD']
};
var gameColors = palette.vice;

var roomColors = {
	/*
		bg: background,
		pb: platform border,
		pg: platform background (and lift pattern, terminal desk),
		ps: platform surface,
		ls: lift surface
		db: droid background,
		dt: droid tools,
		dl: droid lights 1/2
	*/

	1 : { bg: 5,	pb: 7,	pg: 14,	ps: 1,	ls: 7,	db: 7,	dt: 0,	dl1: 1,	dl2: 11 },
	2 : { bg: 7,	pb: 2,	pg: 8,	ps: 1,	ls: 1,	db: 10,	dt: 1,	dl1: 0,	dl2: 7 },
	3 : { bg: 5,	pb: 1,	pg: 12,	ps: 7,	ls: 7,	db: 14,	dt: 6,	dl1: 3,	dl2: 0 },
	4 : { bg: 7,	pb: 3,	pg: 14,	ps: 1,	ls: 7,	db: 11,	dt: 0,	dl1: 7,	dl2: 2 },
	5 : { bg: 3,	pb: 4,	pg: 14,	ps: 1,	ls: 7,	db: 5,	dt: 7,	dl1: 10,dl2: 2 },
	6 : { bg: 7,	pb: 2,	pg: 10,	ps: 8,	ls: 1,	db: 9,	dt: 1,	dl1: 0,	dl2: 1 },
	7 : { bg: 5,	pb: 6,	pg: 14,	ps: 15,	ls: 7,	db: 8,	dt: 7,	dl1: 2,	dl2: 4 },
	8 : { bg: 7,	pb: 6,	pg: 14,	ps: 1,	ls: 1,	db: 5,	dt: 3,	dl1: 13,dl2: 10 },
	9 : { bg: 5,	pb: 7,	pg: 9,	ps: 15,	ls: 7,	db: 1,	dt: 14,	dl1: 4,	dl2: 14 },
	10 : { bg: 5,	pb: 6,	pg: 14,	ps: 1,	ls: 7,	db: 6,	dt: 3,	dl1: 13,dl2: 0 },
	11 : { bg: 7,	pb: 3,	pg: 12,	ps: 1,	ls: 1,	db: 8,	dt: 0,	dl1: 2,	dl2: 1 },
	12 : { bg: 3,	pb: 4,	pg: 10,	ps: 1,	ls: 7,	db: 1,	dt: 6,	dl1: 10,dl2: 2 },
	13 : { bg: 3,	pb: 7,	pg: 9,	ps: 1,	ls: 7,	db: 6,	dt: 14,	dl1: 1,	dl2: 14 },
	14 : { bg: 5,	pb: 3,	pg: 14,	ps: 1,	ls: 7,	db: 0,	dt: 3,	dl1: 7,	dl2: 1 },
	15 : { bg: 3,	pb: 7,	pg: 14,	ps: 1,	ls: 7,	db: 14,	dt: 1,	dl1: 6,	dl2: 4 },
	16 : { bg: 7,	pb: 4,	pg: 2,	ps: 15,	ls: 1,	db: 9,	dt: 1,	dl1: 7,	dl2: 10 },
	17 : { bg: 3,	pb: 7,	pg: 9,	ps: 14,	ls: 7,	db: 1,	dt: 0,	dl1: 4,	dl2: 6 },
	18 : { bg: 3,	pb: 0,	pg: 12,	ps: 14,	ls: 7,	db: 6,	dt: 1,	dl1: 14,dl2: 7 },
	19 : { bg: 3,	pb: 2,	pg: 8,	ps: 1,	ls: 7,	db: 1,	dt: 4,	dl1: 7,	dl2: 8 },
	20 : { bg: 3,	pb: 7,	pg: 9,	ps: 1,	ls: 7,	db: 6,	dt: 14,	dl1: 10,dl2: 9 },
	21 : { bg: 5,	pb: 6,	pg: 15,	ps: 1,	ls: 7,	db: 6,	dt: 1,	dl1: 6,	dl2: 13 },
	22 : { bg: 3,	pb: 7,	pg: 8,	ps: 1,	ls: 7,	db: 14,	dt: 1,	dl1: 13,dl2: 5 },
	23 : { bg: 5,	pb: 7,	pg: 2,	ps: 12,	ls: 7,	db: 3,	dt: 10,	dl1: 0,	dl2: 1 },
	24 : { bg: 7,	pb: 0,	pg: 2,	ps: 12,	ls: 1,	db: 10,	dt: 9,	dl1: 1,	dl2: 2 },
	25 : { bg: 3,	pb: 4,	pg: 14,	ps: 1,	ls: 7,	db: 1,	dt: 10,	dl1: 6,	dl2: 3 },
	26 : { bg: 3,	pb: 1,	pg: 5,	ps: 13,	ls: 7,	db: 7,	dt: 8,	dl1: 14,dl2: 6 },
	27 : { bg: 3,	pb: 1,	pg: 9,	ps: 15,	ls: 7,	db: 0,	dt: 8,	dl1: 1,	dl2: 7 },
	28 : { bg: 5,	pb: 3,	pg: 14,	ps: 1,	ls: 7,	db: 7,	dt: 8,	dl1: 6,	dl2: 3 },
	29 : { bg: 7,	pb: 2,	pg: 10,	ps: 1,	ls: 1,	db: 2,	dt: 10,	dl1: 4,	dl2: 1 },
	30 : { bg: 5,	pb: 6,	pg: 14,	ps: 13,	ls: 7,	db: 0,	dt: 11,	dl1: 1,	dl2: 3 },
	31 : { bg: 3,	pb: 6,	pg: 12,	ps: 14,	ls: 1,	db: 0,	dt: 0,	dl1: 0,	dl2: 0 },
	32 : { bg: 7,	pb: 6,	pg: 12,	ps: 14,	ls: 1,	db: 0,	dt: 0,	dl1: 0,	dl2: 0 }
}

/* Rooms */

var roomDoors = [ [ 0 ],
	[ 3 ], [ 2, 4 ], [ 1, 3 ], [ 1, 2 ], [ 2, 4 ], [ 1 ], [ 2, 4 ], [ 1, 2 ], [ 2, 4 ], [ 2 ],
	[ 3 ], [ 4 ], [ 1, 3 ], [ 3, 4 ], [ 1, 2 ], [ 3, 4 ], [ 1, 3 ], [ 2 ], [ 4 ], [ 1, 2 ],
	[ 1 ], [ 1, 3 ], [ 1 ], [ 3, 4 ], [ 4 ], [ 1 ], [ 3 ], [ 2 ], [ 3, 4 ], [ 2 ],
	[ 4 ], [ 3 ]
];

var roomPlatforms = {
	1 : [
		{ x: 4,		y: 6,	l: 15,	p: 1 },
		{ x: 22,	y: 9,	l: 14,	p: 0 },
		{ x: 4,		y: 12,	l: 15,	p: 1 },
		{ x: 22,	y: 15,	l: 14,	p: 0 },
		{ x: 4,		y: 18,	l: 15,	p: 1 },
		{ x: 4,		y: 24,	l: 15,	p: 1 },
		{ x: 22,	y: 24,	l: 18,	p: 1 }
	],
	2 : [
		{ x: 18,	y: 6,	l: 18,	p: 0 },
		{ x: 1,		y: 12,	l: 6,	p: 0 },
		{ x: 18,	y: 12,	l: 3,	p: 1 },
		{ x: 33,	y: 12,	l: 3,	p: 1 },
		{ x: 1,		y: 18,	l: 3,	p: 1 },
		{ x: 7,		y: 18,	l: 8,	p: 0 },
		{ x: 18,	y: 18,	l: 3,	p: 1 },
		{ x: 0,		y: 24,	l: 4,	p: 0 },
		{ x: 18,	y: 24,	l: 3,	p: 1 },
		{ x: 33,	y: 24,	l: 6,	p: 0 }
	],
	3: [
		{ x: 0,		y: 6,	l: 4,	p: 0 },
		{ x: 7,		y: 6,	l: 3,	p: 1 },
		{ x: 13,	y: 6,	l: 3,	p: 1 },
		{ x: 19,	y: 6,	l: 3,	p: 1 },
		{ x: 25,	y: 6,	l: 4,	p: 0 },
		{ x: 32,	y: 6,	l: 7,	p: 1 },
		{ x: 1,		y: 12,	l: 3,	p: 1 },
		{ x: 7,		y: 12,	l: 3,	p: 1 },
		{ x: 13,	y: 12,	l: 3,	p: 1 },
		{ x: 19,	y: 12,	l: 3,	p: 1 },
		{ x: 25,	y: 12,	l: 4,	p: 0 },
		{ x: 32,	y: 12,	l: 7,	p: 1 },
		{ x: 1,		y: 18,	l: 3,	p: 1 },
		{ x: 7,		y: 18,	l: 3,	p: 1 },
		{ x: 13,	y: 18,	l: 3,	p: 1 },
		{ x: 19,	y: 18,	l: 3,	p: 1 },
		{ x: 25,	y: 18,	l: 4,	p: 0 },
		{ x: 32,	y: 18,	l: 7,	p: 1 },
		{ x: 1,		y: 24,	l: 3,	p: 1 },
		{ x: 7,		y: 24,	l: 3,	p: 1 },
		{ x: 13,	y: 24,	l: 3,	p: 1 },
		{ x: 19,	y: 24,	l: 3,	p: 1 },
		{ x: 25,	y: 24,	l: 4,	p: 0 },
		{ x: 32,	y: 24,	l: 8,	p: 1 }
	],
	4: [
		{ x: 0,		y: 6,	l: 5,	p: 1 },
		{ x: 19,	y: 6,	l: 4,	p: 0 },
		{ x: 31,	y: 6,	l: 9,	p: 0 },
		{ x: 10,	y: 9,	l: 6,	p: 0 },
		{ x: 27,	y: 9,	l: 3,	p: 1 },
		{ x: 1,		y: 12,	l: 5,	p: 1 },
		{ x: 19,	y: 12,	l: 4,	p: 0 },
		{ x: 36,	y: 12,	l: 3,	p: 1 },
		{ x: 11,	y: 15,	l: 4,	p: 0 },
		{ x: 27,	y: 15,	l: 3,	p: 1 },
		{ x: 1,		y: 18,	l: 6,	p: 0 },
		{ x: 19,	y: 18,	l: 4,	p: 0 },
		{ x: 33,	y: 20,	l: 3,	p: 1 },
		{ x: 12,	y: 21,	l: 3,	p: 1 },
		{ x: 1,		y: 24,	l: 7,	p: 1 },
		{ x: 19,	y: 24,	l: 4,	p: 0 },
		{ x: 30,	y: 24,	l: 3,	p: 1 }
	],
	5: [
		{ x: 1,		y: 6,	l: 9,	p: 1 },
		{ x: 13,	y: 6,	l: 14,	p: 0 },
		{ x: 30,	y: 6,	l: 10,	p: 1 },
		{ x: 4,		y: 12,	l: 6,	p: 0 },
		{ x: 13,	y: 12,	l: 14,	p: 0 },
		{ x: 30,	y: 12,	l: 6,	p: 0 },
		{ x: 4,		y: 18,	l: 14,	p: 0 },
		{ x: 21,	y: 18,	l: 15,	p: 1 },
		{ x: 0,		y: 24,	l: 18,	p: 0 },
		{ x: 21,	y: 24,	l: 18,	p: 0 }
	],
	6: [
		{ x: 0,		y: 6,	l: 18,	p: 0 },
		{ x: 21,	y: 6,	l: 18,	p: 0 },
		{ x: 1,		y: 12,	l: 17,	p: 1 },
		{ x: 21,	y: 12,	l: 18,	p: 0 },
		{ x: 1,		y: 18,	l: 17,	p: 1 },
		{ x: 21,	y: 18,	l: 18,	p: 0 },
		{ x: 1,		y: 24,	l: 17,	p: 1 },
		{ x: 21,	y: 24,	l: 18,	p: 0 }
	],
	7: [
		{ x: 7,		y: 6,	l: 9,	p: 1 },
		{ x: 28,	y: 6,	l: 5,	p: 1 },
		{ x: 36,	y: 6,	l: 4,	p: 1 },
		{ x: 19,	y: 12,	l: 14,	p: 0 },
		{ x: 36,	y: 12,	l: 3,	p: 1 },
		{ x: 7,		y: 18,	l: 9,	p: 1 },
		{ x: 28,	y: 18,	l: 5,	p: 1 },
		{ x: 0,		y: 24,	l: 4,	p: 0 },
		{ x: 7,		y: 24,	l: 26,	p: 0 },
		{ x: 36,	y: 24,	l: 3,	p: 1 }
	],
	8: [
		{ x: 0,		y: 6,	l: 20,	p: 0 },
		{ x: 23,	y: 6,	l: 8,	p: 0 },
		{ x: 34,	y: 6,	l: 6,	p: 1 },
		{ x: 1,		y: 12,	l: 19,	p: 1 },
		{ x: 23,	y: 12,	l: 8,	p: 0 },
		{ x: 34,	y: 12,	l: 5,	p: 1 },
		{ x: 1,		y: 18,	l: 4,	p: 0 },
		{ x: 8,		y: 18,	l: 2,	p: 0 },
		{ x: 13,	y: 18,	l: 2,	p: 0 },
		{ x: 18,	y: 18,	l: 2,	p: 0 },
		{ x: 23,	y: 18,	l: 8,	p: 0 },
		{ x: 34,	y: 18,	l: 5,	p: 1 },
		{ x: 1,		y: 24,	l: 4,	p: 0 },
		{ x: 8,		y: 24,	l: 2,	p: 0 },
		{ x: 13,	y: 24,	l: 2,	p: 0 },
		{ x: 18,	y: 24,	l: 21,	p: 1 }
	],
	9: [
		{ x: 1,		y: 6,	l: 20,	p: 0 },
		{ x: 24,	y: 6,	l: 7,	p: 1 },
		{ x: 34,	y: 6,	l: 6,	p: 1 },
		{ x: 4,		y: 12,	l: 7,	p: 1 },
		{ x: 14,	y: 12,	l: 7,	p: 1 },
		{ x: 24,	y: 12,	l: 7,	p: 1 },
		{ x: 34,	y: 12,	l: 5,	p: 1 },
		{ x: 4,		y: 18,	l: 7,	p: 1 },
		{ x: 14,	y: 18,	l: 7,	p: 1 },
		{ x: 24,	y: 18,	l: 7,	p: 1 },
		{ x: 34,	y: 18,	l: 5,	p: 1 },
		{ x: 14,	y: 24,	l: 25,	p: 1 },
		{ x: 4,		y: 24,	l: 7,	p: 1 },
		{ x: 0,		y: 24,	l: 1,	p: 0 }
	],
	10 : [
		{ x: 4,		y: 6,	l: 17,	p: 1 },
		{ x: 30,	y: 6,	l: 10,	p: 1 },
		{ x: 4,		y: 12,	l: 19,	p: 1 },
		{ x: 29,	y: 12,	l: 7,	p: 1 },
		{ x: 4,		y: 18,	l: 21,	p: 1 },
		{ x: 29,	y: 18,	l: 7,	p: 1 },
		{ x: 4,		y: 24,	l: 23,	p: 1 },
		{ x: 29,	y: 24, 	l: 7,	p: 1 }
	],
	11 : [
		{ x: 4,		y: 6,	l: 14,	p: 0 },
		{ x: 21,	y: 6,	l: 15,	p: 1 },
		{ x: 4,		y: 12,	l: 14,	p: 0 },
		{ x: 21,	y: 12,	l: 15,	p: 1 },
		{ x: 4,		y: 18,	l: 14,	p: 0 },
		{ x: 21,	y: 18,	l: 15,	p: 1 },
		{ x: 4,		y: 24,	l: 14,	p: 0 },
		{ x: 21,	y: 24,	l: 15,	p: 1 },
		{ x: 39,	y: 24,	l: 1,	p: 0 }
	],
	12 : [
		{ x: 4,		y: 6,	l: 32,	p: 0 },
		{ x: 4,		y: 12,	l: 32,	p: 0 },
		{ x: 4,		y: 18,	l: 32,	p: 0 },
		{ x: 0,		y: 24,	l: 1,	p: 1 },
		{ x: 4,		y: 24,	l: 32,	p: 0 }
	],
	13 : [
		{ x: 0,		y: 6,	l: 10,	p: 0 },
		{ x: 13,	y: 6,	l: 2,	p: 0 },
		{ x: 18,	y: 6,	l: 2,	p: 0 },
		{ x: 23,	y: 6,	l: 10,	p: 0 },
		{ x: 5,		y: 12,	l: 5,	p: 1 },
		{ x: 13,	y: 12,	l: 2,	p: 0 },
		{ x: 18,	y: 12,	l: 2,	p: 0 },
		{ x: 23,	y: 12,	l: 13,	p: 1 },
		{ x: 1,		y: 18,	l: 9,	p: 1 },
		{ x: 13,	y: 18,	l: 2,	p: 0 },
		{ x: 18,	y: 18,	l: 2,	p: 0 },
		{ x: 23,	y: 18,	l: 2,	p: 0 },
		{ x: 28,	y: 18,	l: 11,	p: 1 },
		{ x: 1,		y: 24,	l: 24,	p: 0 },
		{ x: 33,	y: 24,	l: 7,	p: 0 }
	],
	14 : [
		{ x: 1,		y: 6,	l: 4,	p: 0 },
		{ x: 29,	y: 6,	l: 10,	p: 0 },
		{ x: 8,		y: 9,	l: 18,	p: 0 },
		{ x: 29,	y: 12,	l: 10,	p: 0 },
		{ x: 17,	y: 15,	l: 9,	p: 1 },
		{ x: 4,		y: 18,	l: 10,	p: 0 },
		{ x: 29,	y: 18,	l: 10,	p: 0 },
		{ x: 0,		y: 24,	l: 1,	p: 1 },
		{ x: 4,		y: 24,	l: 22,	p: 0 },
		{ x: 29,	y: 24,	l: 11,	p: 0 }
	],
	15 : [
		{ x: 0,		y: 6,	l: 3,	p: 1 },
		{ x: 6,		y: 6,	l: 1,	p: 1 },
		{ x: 10,	y: 6,	l: 1,	p: 1 },
		{ x: 14,	y: 6,	l: 26,	p: 1 },
		{ x: 14,	y: 12,	l: 22,	p: 0 },
		{ x: 14,	y: 18,	l: 11,	p: 1 },
		{ x: 29,	y: 18,	l: 7,	p: 1 },
		{ x: 25,	y: 21,	l: 4,	p: 0 },
		{ x: 1,		y: 24,	l: 2,	p: 0 },
		{ x: 6,		y: 24,	l: 1,	p: 1 },
		{ x: 10,	y: 24,	l: 1,	p: 1 },
		{ x: 14,	y: 24,	l: 11,	p: 1 },
		{ x: 29,	y: 24,	l: 10,	p: 0 }
	],
	16 : [
		{ x: 25,	y: 4,	l: 11,	p: 1 },
		{ x: 4,		y: 6,	l: 11,	p: 1 },
		{ x: 24,	y: 9,	l: 12,	p: 0 },
		{ x: 24,	y: 14,	l: 12,	p: 0 },
		{ x: 4,		y: 16,	l: 10,	p: 0 },
		{ x: 20,	y: 19,	l: 14,	p: 0 },
		{ x: 0,		y: 24,	l: 1,	p: 0 },
		{ x: 4,		y: 24,	l: 11,	p: 1 },
		{ x: 18,	y: 24,	l: 22,	p: 1 }
	],
	17 : [
		{ x: 0,		y: 6,	l: 1,	p: 0 },
		{ x: 4,		y: 6,	l: 32,	p: 0 },
		{ x: 4,		y: 12,	l: 32,	p: 0 },
		{ x: 4,		y: 18,	l: 32,	p: 0 },
		{ x: 4,		y: 24,	l: 32,	p: 0 },
		{ x: 39,	y: 24,	l: 1,	p: 0 }
	],
	18 : [
		{ x: 1,		y: 6,	l: 17,	p: 1 },
		{ x: 21,	y: 6,	l: 19,	p: 0 },
		{ x: 1,		y: 12,	l: 8,	p: 0 },
		{ x: 12,	y: 12,	l: 6,	p: 0 },
		{ x: 21,	y: 12,	l: 8,	p: 0 },
		{ x: 32,	y: 12,	l: 7,	p: 1 },
		{ x: 1,		y: 18,	l: 8,	p: 0 },
		{ x: 12,	y: 18,	l: 17,	p: 1 },
		{ x: 32,	y: 18,	l: 7,	p: 1 },
		{ x: 1,		y: 24,	l: 8,	p: 0 },
		{ x: 12,	y: 24,	l: 17,	p: 1 },
		{ x: 32,	y: 24,	l: 7,	p: 1 }
	],
	19 : [
		{ x: 4,		y: 4,	l: 4,	p: 0 },
		{ x: 14,	y: 6,	l: 3,	p: 1 },
		{ x: 29,	y: 6,	l: 10,	p: 0 },
		{ x: 11,	y: 9,	l: 3,	p: 1 },
		{ x: 26,	y: 9,	l: 3,	p: 1 },
		{ x: 8,		y: 12,	l: 3,	p: 1 },
		{ x: 23,	y: 12,	l: 3,	p: 1 },
		{ x: 29,	y: 12,	l: 7,	p: 1 },
		{ x: 4,		y: 14,	l: 4,	p: 0 },
		{ x: 23,	y: 18,	l: 13,	p: 1 },
		{ x: 0,		y: 24,	l: 3,	p: 1 },
		{ x: 6,		y: 24,	l: 11,	p: 1 },
		{ x: 23,	y: 24,	l: 13,	p: 1 }
	],
	20 : [
		{ x: 0,		y: 6,	l: 5,	p: 1 },
		{ x: 8,		y: 6,	l: 26,	p: 0 },
		{ x: 37,	y: 6,	l: 3,	p: 0 },
		{ x: 8,		y: 12,	l: 9,	p: 1 },
		{ x: 30,	y: 12,	l: 4,	p: 0 },
		{ x: 37,	y: 12,	l: 2,	p: 0 },
		{ x: 26,	y: 15,	l: 4,	p: 0 },
		{ x: 1,		y: 18,	l: 1,	p: 1 },
		{ x: 8,		y: 18,	l: 9,	p: 1 },
		{ x: 30,	y: 18,	l: 4,	p: 0 },
		{ x: 37,	y: 18,	l: 2,	p: 0 },
		{ x: 26,	y: 21,	l: 4,	p: 0 },
		{ x: 1,		y: 24,	l: 1,	p: 1 },
		{ x: 5,		y: 24,	l: 12,	p: 0 },
		{ x: 30,	y: 24,	l: 4,	p: 0 },
		{ x: 37,	y: 24,	l: 2,	p: 0 }
	],
	21 : [
		{ x: 0,		y: 6,	l: 21,	p: 1 },
		{ x: 24,	y: 6,	l: 2,	p: 0 },
		{ x: 29,	y: 6,	l: 10,	p: 0 },
		{ x: 1,		y: 12,	l: 10,	p: 0 },
		{ x: 14,	y: 12,	l: 2,	p: 0 },
		{ x: 19,	y: 12,	l: 2,	p: 0 },
		{ x: 24,	y: 12,	l: 2,	p: 0 },
		{ x: 29,	y: 12,	l: 10,	p: 0 },
		{ x: 4,		y: 18,	l: 2,	p: 0 },
		{ x: 9,		y: 18,	l: 2,	p: 0 },
		{ x: 14,	y: 18,	l: 2,	p: 0 },
		{ x: 19,	y: 18,	l: 20,	p: 0 },
		{ x: 4,		y: 24,	l: 2,	p: 0 },
		{ x: 9,		y: 24,	l: 30,	p: 0 }
	],
	22 : [
		{ x: 0,		y: 6,	l: 16,	p: 0 },
		{ x: 19,	y: 6,	l: 1,	p: 1 },
		{ x: 23,	y: 6,	l: 16,	p: 0 },
		{ x: 19,	y: 12,	l: 1,	p: 1 },
		{ x: 23,	y: 12,	l: 16,	p: 0 },
		{ x: 5,		y: 13,	l: 5,	p: 1 },
		{ x: 29,	y: 17,	l: 5,	p: 1 },
		{ x: 1,		y: 18,	l: 15,	p: 1 },
		{ x: 19,	y: 18,	l: 1,	p: 1 },
		{ x: 1,		y: 24,	l: 15,	p: 1 },
		{ x: 19,	y: 24,	l: 1,	p: 1 },
		{ x: 23,	y: 24,	l: 17,	p: 0 }
	],
	23 : [
		{ x: 0,		y: 6,	l: 36,	p: 0 },
		{ x: 1,		y: 12,	l: 7,	p: 1 },
		{ x: 11,	y: 12,	l: 8,	p: 0 },
		{ x: 22,	y: 12,	l: 7,	p: 1 },
		{ x: 32,	y: 12,	l: 4,	p: 0 },
		{ x: 11,	y: 18,	l: 8,	p: 0 },
		{ x: 22,	y: 18,	l: 7,	p: 1 },
		{ x: 32,	y: 18,	l: 7,	p: 1 },
		{ x: 1,		y: 21,	l: 4,	p: 0 },
		{ x: 4,		y: 24,	l: 35,	p: 1 }
	],
	24 : [
		{ x: 4,		y: 6,	l: 32,	p: 0 },
		{ x: 7,		y: 12,	l: 4,	p: 0 },
		{ x: 15,	y: 12,	l: 10,	p: 0 },
		{ x: 29,	y: 12,	l: 4,	p: 0 },
		{ x: 4,		y: 18,	l: 9,	p: 1 },
		{ x: 18,	y: 18,	l: 1,	p: 1 },
		{ x: 22,	y: 18,	l: 1,	p: 1 },
		{ x: 28,	y: 18,	l: 8,	p: 0 },
		{ x: 0,		y: 24,	l: 19,	p: 1 },
		{ x: 22,	y: 24,	l: 18,	p: 1 }
	],
	25 : [
		{ x: 4,		y: 6,	l: 3,	p: 1 },
		{ x: 9,		y: 6,	l: 2,	p: 0 },
		{ x: 13,	y: 6,	l: 2,	p: 0 },
		{ x: 17,	y: 6,	l: 2,	p: 0 },
		{ x: 21,	y: 6,	l: 2,	p: 0 },
		{ x: 25,	y: 6,	l: 2,	p: 0 },
		{ x: 29,	y: 6,	l: 10,	p: 0 },
		{ x: 4,		y: 12,	l: 32,	p: 0 },
		{ x: 4,		y: 18,	l: 10,	p: 0 },
		{ x: 19,	y: 18,	l: 3,	p: 1 },
		{ x: 27,	y: 18,	l: 9,	p: 1 },
		{ x: 0,		y: 24,	l: 1,	p: 1 },
		{ x: 4,		y: 24,	l: 35,	p: 1 }
	],
	26 : [
		{ x: 0,		y: 6,	l: 4,	p: 0 },
		{ x: 7,		y: 6,	l: 3,	p: 1 },
		{ x: 13,	y: 6,	l: 3,	p: 1 },
		{ x: 19,	y: 6,	l: 3,	p: 1 },
		{ x: 25,	y: 6,	l: 3,	p: 1 },
		{ x: 31,	y: 6,	l: 3,	p: 1 },
		{ x: 36,	y: 9,	l: 3,	p: 1 },
		{ x: 1,		y: 12,	l: 3,	p: 1 },
		{ x: 7,		y: 12,	l: 3,	p: 1 },
		{ x: 13,	y: 12,	l: 3,	p: 1 },
		{ x: 19,	y: 12,	l: 3,	p: 1 },
		{ x: 25,	y: 12,	l: 3,	p: 1 },
		{ x: 31,	y: 12,	l: 3,	p: 1 },
		{ x: 36,	y: 15,	l: 3,	p: 1 },
		{ x: 1,		y: 18,	l: 3,	p: 1 },
		{ x: 7,		y: 18,	l: 3,	p: 1 },
		{ x: 13,	y: 18,	l: 3,	p: 1 },
		{ x: 19,	y: 18,	l: 3,	p: 1 },
		{ x: 25,	y: 18,	l: 3,	p: 1 },
		{ x: 31,	y: 18,	l: 3,	p: 1 },
		{ x: 36,	y: 21,	l: 3,	p: 1 },
		{ x: 1,		y: 24,	l: 3,	p: 1 },
		{ x: 7,		y: 24,	l: 3,	p: 1 },
		{ x: 13,	y: 24,	l: 3,	p: 1 },
		{ x: 19,	y: 24,	l: 3,	p: 1 },
		{ x: 25,	y: 24,	l: 3,	p: 1 },
		{ x: 31,	y: 24,	l: 3,	p: 1 }
	],
	27 : [
		{ x: 29,	y: 4,	l: 10,	p: 0 },
		{ x: 1,		y: 5,	l: 12,	p: 0 },
		{ x: 15,	y: 7,	l: 10,	p: 0 },
		{ x: 27,	y: 9,	l: 12,	p: 0 },
		{ x: 4,		y: 10,	l: 9,	p: 1 },
		{ x: 15,	y: 12,	l: 10,	p: 0 },
		{ x: 4,		y: 15,	l: 9,	p: 1 },
		{ x: 27,	y: 15,	l: 12,	p: 0 },
		{ x: 15,	y: 18,	l: 10,	p: 0 },
		{ x: 4,		y: 21,	l: 9,	p: 1 },
		{ x: 14,	y: 24,	l: 26,	p: 1 }
	],
	28 : [
		{ x: 4,		y: 6,	l: 3,	p: 1 },
		{ x: 35,	y: 6,	l: 5,	p: 0 },
		{ x: 9,		y: 9,	l: 6,	p: 0 },
		{ x: 25,	y: 9,	l: 6,	p: 0 },
		{ x: 4,		y: 12,	l: 3,	p: 1 },
		{ x: 17,	y: 12,	l: 6,	p: 0 },
		{ x: 33,	y: 12,	l: 6,	p: 0 },
		{ x: 9,		y: 15,	l: 6,	p: 0 },
		{ x: 25,	y: 15,	l: 6,	p: 0 },
		{ x: 4,		y: 18,	l: 3,	p: 1 },
		{ x: 17,	y: 18,	l: 6,	p: 0 },
		{ x: 9,		y: 21,	l: 6,	p: 0 },
		{ x: 25,	y: 21,	l: 14,	p: 0 },
		{ x: 4,		y: 24,	l: 3,	p: 1 },
		{ x: 15,	y: 24,	l: 8,	p: 0 }
	],
	29 : [
		{ x: 24,	y: 3,	l: 3,	p: 1 },
		{ x: 1,		y: 5,	l: 5,	p: 1 },
		{ x: 13,	y: 6,	l: 3,	p: 1 },
		{ x: 30,	y: 6,	l: 9,	p: 1 },
		{ x: 10,	y: 9,	l: 3,	p: 1 },
		{ x: 20,	y: 9,	l: 3,	p: 1 },
		{ x: 7,		y: 12,	l: 3,	p: 1 },
		{ x: 26,	y: 12,	l: 13,	p: 1 },
		{ x: 4,		y: 15,	l: 3,	p: 1 },
		{ x: 16,	y: 15,	l: 3,	p: 1 },
		{ x: 1,		y: 18,	l: 3,	p: 1 },
		{ x: 22,	y: 18,	l: 17,	p: 1 },
		{ x: 0,		y: 24,	l: 4,	p: 0 },
		{ x: 7,		y: 24,	l: 3,	p: 1 },
		{ x: 13,	y: 24,	l: 3,	p: 1 },
		{ x: 25,	y: 24,	l: 3,	p: 1 },
		{ x: 31,	y: 24,	l: 3,	p: 1 },
		{ x: 37,	y: 24,	l: 3,	p: 1 }
	],
	30 : [
		{ x: 35,	y: 6,	l: 5,	p: 0 },
		{ x: 14,	y: 8,	l: 14,	p: 0 },
		{ x: 1,		y: 10,	l: 2,	p: 0 },
		{ x: 1,		y: 13,	l: 2,	p: 0 },
		{ x: 9,		y: 13,	l: 22,	p: 0 },
		{ x: 34,	y: 13,	l: 5,	p: 1 },
		{ x: 1,		y: 19,	l: 5,	p: 1 },
		{ x: 9,		y: 19,	l: 22,	p: 0 },
		{ x: 34,	y: 19,	l: 5,	p: 1 },
		{ x: 1,		y: 24,	l: 5,	p: 1 },
		{ x: 9,		y: 24,	l: 22,	p: 0 },
		{ x: 34,	y: 24,	l: 5,	p: 1 }
	],
	31 : [
		{ x: 0,		y: 24,	l: 39,	p: 1 }
	],
	32 : [
		{ x: 1,		y: 24,	l: 39,	p: 0 }
	]
};

var roomFurnitures = {
	1: [
		{ type: 'tapeDrive',	l: 23,	b: 8 },
		{ type: 'tapeDrive',	l: 26,	b: 8 },
		{ type: 'tapeDrive',	l: 29,	b: 8 },
		{ type: 'computer',		l: 32,	b: 8 },
		{ type: 'desk',			l: 23,	b: 14 },
		{ type: 'typewriter',	l: 31,	b: 14 }
	],
	2: [
		{ type: 'typewriter',	l: 2,	b: 11 },
		{ type: 'typewriter',	l: 34,	b: 23 }
	],
	3: [
		{ type: 'cupboard',		l: 32,	b: 5 },
		{ type: 'fridge',		l: 34,	b: 11 },
		{ type: 'desk',			l: 32,	b: 17 }
	],
	4: [ ],
	5: [
		{ type: 'desk',			l: 14,	b: 11 },
		{ type: 'candy',		l: 22,	b: 11 }
	],
	6: [
		{ type: 'chest',		l: 4,	b: 17 },
		{ type: 'bin',			l: 30,	b: 17 },
		{ type: 'basin',		l: 31,	b: 17 },
		{ type: 'bath',			l: 1,	b: 23 },
		{ type: 'bin',			l: 35,	b: 23 },
		{ type: 'toilet',		l: 36,	b: 23 }
	],
	7: [
		{ type: 'loudspeaker',	l: 8,	b: 5 },
		{ type: 'stereoSystem',	l: 13,	b: 5 },
		{ type: 'sofa',			l: 19,	b: 11 },
		{ type: 'lamp',			l: 25,	b: 11 },
		{ type: 'loudspeaker',	l: 37,	b: 11 }
	],
	8: [
		{ type: 'desk',			l: 5,	b: 11 },
		{ type: 'typewriter',	l: 13,	b: 11 },
		{ type: 'tapeDrive',	l: 35,	b: 17 },
		{ type: 'jukebox',		l: 2,	b: 23 },
		{ type: 'piano',		l: 26,	b: 23 }
	],
	9: [
		{ type: 'loudspeaker',	l: 2,	b: 5 },
		{ type: 'stereoSystem',	l: 9,	b: 5 },
		{ type: 'loudspeaker',	l: 17,	b: 5 },
		{ type: 'bookcase',		l: 35,	b: 11 },
		{ type: 'bookcase',		l: 6,	b: 17 },
		{ type: 'desk',			l: 30,	b: 23 },
	],
	10: [
		{ type: 'tapeDrive',	l: 7,	b: 11 },
		{ type: 'typewriter',	l: 31,	b: 11 },
		{ type: 'piano',		l: 7,	b: 17 },
		{ type: 'desk',			l: 9,	b: 23 }
	],
	11: [
		{ type: 'cupboard',		l: 6,	b: 5 },
		{ type: 'fridge',		l: 13,	b: 5 },
		{ type: 'candy',		l: 24,	b: 5 }
	],
	12: [
		{ type: 'desk',			l: 17,	b: 5 },
		{ type: 'computer',		l: 25,	b: 5 },
		{ type: 'piano',		l: 5,	b: 11 },
		{ type: 'jukebox',		l: 30,	b: 11 },
		{ type: 'tapeDrive',	l: 14,	b: 17 },
		{ type: 'tapeDrive',	l: 17,	b: 17 },
		{ type: 'candy',		l: 19,	b: 23 }
	],
	13: [
		{ type: 'bed',			l: 28,	b: 11 },
		{ type: 'chest',		l: 6,	b: 17 },
		{ type: 'candy',		l: 2,	b: 23 }
	],
	14: [
		{ type: 'typewriter',	l: 2,	b: 5 },
		{ type: 'tapeDrive',	l: 30,	b: 5 },
		{ type: 'piano',		l: 15,	b: 8 }
	],
	15: [
		{ type: 'piano',		l: 19,	b: 11 },
		{ type: 'computer',		l: 25,	b: 11 },
		{ type: 'typewriter',	l: 16,	b: 17 },
		{ type: 'jukebox',		l: 30,	b: 17 },
		{ type: 'jukebox',		l: 33,	b: 17 }
	],
	16: [
		{ type: 'bed',			l: 27,	b: 3 },
		{ type: 'chest',		l: 30,	b: 13 },
		{ type: 'fireplace',	l: 21,	b: 18 }
	],
	17: [
		{ type: 'bookcase',		l: 26,	b: 11 },
		{ type: 'bookcase',		l: 17,	b: 17 },
		{ type: 'chairWithLamp',l: 22,	b: 17 },
		{ type: 'bookcase',		l: 11,	b: 23 }
	],
	18: [
		{ type: 'bath',			l: 1,	b: 23 },
		{ type: 'basin',		l: 17,	b: 23 },
		{ type: 'bin',			l: 21,  b: 23 },
		{ type: 'toilet',		l: 36,	b: 23 }
	],
	19: [
		{ type: 'jukebox',		l: 5,	b: 3 },
		{ type: 'tapeDrive',	l: 36,	b: 5 },
		{ type: 'piano',		l: 30,	b: 11 },
		{ type: 'desk',			l: 26,	b: 23 }
	],
	20: [
		{ type: 'bed',			l: 8,	b: 11 },
		{ type: 'chest',		l: 10,	b: 17 },
		{ type: 'exit',			l: 9,	b: 23 }
	],
	21: [
		{ type: 'desk',			l: 25,	b: 17 },
		{ type: 'computer',		l: 33,	b: 17 },
		{ type: 'piano',		l: 14,	b: 23 },
		{ type: 'typewriter',	l: 20,	b: 23 },
		{ type: 'typewriter',	l: 24,	b: 23 },
		{ type: 'typewriter',	l: 28,	b: 23 }
	],
	22: [
		{ type: 'tapeDrive',	l: 30,	b: 5 },
		{ type: 'tapeDrive',	l: 30,	b: 11 },
		{ type: 'tapeDrive',	l: 6,	b: 12 },
		{ type: 'tapeDrive',	l: 30,	b: 16 },
		{ type: 'tapeDrive',	l: 6,	b: 17 }
	],
	23: [
		{ type: 'sofa',			l: 11,	b: 23 },
		{ type: 'fireplace',	l: 18,	b: 23 },
		{ type: 'chairWithLamp',l: 28,	b: 23 }
	],
	24: [
		{ type: 'fireplace',	l: 15,	b: 5 },
		{ type: 'chairWithLamp',l: 25,	b: 5 }
	],
	25: [
		{ type: 'chairWithLamp',l: 32,	b: 5 },
		{ type: 'desk',			l: 12,	b: 11 },
		{ type: 'bookcase',		l: 25,	b: 11 }
	],
	26: [
		{ type: 'jukebox',		l: 2,	b: 11 },
		{ type: 'jukebox',		l: 2,	b: 17 },
		{ type: 'jukebox',		l: 2,	b: 23 },
		{ type: 'jukebox',		l: 13,	b: 11 },
		{ type: 'jukebox',		l: 13,	b: 17 },
		{ type: 'jukebox',		l: 13,	b: 23 },
		{ type: 'jukebox',		l: 25,	b: 11 },
		{ type: 'jukebox',		l: 25,	b: 17 },
		{ type: 'jukebox',		l: 25,	b: 23 }
	],
	27: [
		{ type: 'bookcase',		l: 3,	b: 4 },
		{ type: 'chest',		l: 19,	b: 6 },
		{ type: 'bed',			l: 30,	b: 8 },
		{ type: 'lamp',			l: 36,	b: 8 },
		{ type: 'bookcase',		l: 29,	b: 14 }
	],
	28: [
		{ type: 'tapeDrive',	l: 29,	b: 20 },
		{ type: 'tapeDrive',	l: 32,	b: 20 },
		{ type: 'tapeDrive',	l: 35,	b: 20 },
		{ type: 'typewriter',	l: 4,	b: 23 }
	],
	29: [
		{ type: 'candy',		l: 2,	b: 4 },
		{ type: 'piano',		l: 31,	b: 5 },
		{ type: 'tapeDrive',	l: 28,	b: 11 },
		{ type: 'tapeDrive',	l: 31,	b: 11 },
		{ type: 'jukebox',		l: 34,	b: 11 },
		{ type: 'desk',			l: 25,	b: 17 },
		{ type: 'computer',		l: 32,	b: 17 }
	],
	30: [
		{ type: 'desk',			l: 10,	b: 12 },
		{ type: 'bookcase',		l: 11,	b: 18 },
		{ type: 'bookcase',		l: 24,	b: 18 },
		{ type: 'sofa',			l: 12,	b: 23 },
		{ type: 'chairWithLamp',l: 23,	b: 23 }
	],
	31: [ ],
	32: [ ]
};

var roomTerminals = {
	1: [ { l: 10, b: 11 }, { l: 32, b: 23 } ],
	2: [ { l: 32, b: 5 }, { l: 1, b: 23 } ],
	3: [ { l: 34, b: 23 } ],
	4: [ { l: 2, b: 5 } ],
	5: [ { l: 33, b: 5 }, { l: 7, b: 23 } ],
	6: [ { l: 3, b: 5 } ],
	7: [ { l: 8, b: 23 } ],
	8: [ { l: 25, b: 5 }, { l: 22, b: 23 } ],
	9: [ { l: 5, b: 23} ],
	10: [ { l: 34, b: 5 }, { l: 18, b: 23 }, { l: 29, b: 23 } ],
	11: [ { l: 32, b: 23} ],
	12: [ { l: 10, b: 11 }, { l: 5, b: 23 } ],
	13: [ { l: 1, b: 5 }, { l: 35, b: 23 } ],
	14: [ { l: 5, b: 23 } ],
	15: [ { l: 14, b: 5 }, { l: 31, b: 23 } ],
	16: [ { l: 6, b: 23 } ],
	17: [ { l: 5, b: 5 }, { l: 32, b: 23 } ],
	18: [ { l: 1, b: 5 } ],
	19: [ { l: 7, b: 23 } ],
	20: [ { l: 11, b: 5 } ],
	21: [ { l: 5, b: 5 }, { l: 10, b: 23 } ],
	22: [ { l: 2, b: 5 }, { l: 35, b: 23 } ],
	23: [ { l: 3, b: 5 }, { l: 7, b: 23 } ],
	24: [ { l: 25, b: 23 } ],
	25: [ { l: 6, b: 23 } ],
	26: [ { l: 7, b: 5} ],
	27: [ { l: 32, b: 23 } ],
	28: [ { l: 35, b: 5 } ],
	29: [ { l: 13, b: 23 } ],
	30: [ { l: 2, b: 23 }, { l: 35, b: 23 } ],
	31: [ ],
	32: [ ]
};

var innerLifts = {
	1: [
		{ l: 1, s: [ 6, 12, -18, -24 ] },
		{ l: 19, s: [ -6, -9, -12, -15, 18, -21, 24 ] },
		{ l: 36, s: [ -9, 15 ] }
	],
	2: [
		{ l: 4, s: [ -18, 24 ] },
		{ l: 15, s: [ 6, 12, 18, -24 ] },
		{ l: 21, s: [ -12, 18, 24 ] },
		{ l: 36, s: [ -6, 12 ] }
	],
	3: [
		{ l: 4, s: [ 6, 12, -18, -24 ] },
		{ l: 10, s: [ -6, 12, 18, -24 ] },
		{ l: 16, s: [ -6, -12, 18, 24 ] },
		{ l: 22, s: [ -6, -12, 18, 24 ] },
		{ l: 29, s: [ -6, 12, 18, -24 ] }
	],
	4: [ ],
	5: [
		{ l: 1, s: [ -12, 18 ] },
		{ l: 10, s: [ -6, 12 ] },
		{ l: 18, s: [ -18, 24 ] },
		{ l: 27, s: [ -6, 12 ] },
		{ l: 36, s: [ -12, 18 ] }
	],
	6: [
		{ l: 18, s: [ 6, -12, -18, -24 ] }
	],
	7: [
		{ l: 4, s: [ -6, -18, 24 ] },
		{ l: 16, s: [ 6, -18 ] },
		{ l: 33, s: [ -6, -12, -18, 24 ] }
	],
	8: [
		{ l: 5, s: [ 18, -24 ] },
		{ l: 10, s: [ 18, -24 ] },
		{ l: 15, s: [ 18, -24 ] },
		{ l: 20, s: [ 6, 12, -18 ] },
		{ l: 31, s: [ 6, 12, -18 ] }
	],
	9: [
		{ l: 1, s: [ -12, 18, 24 ] },
		{ l: 11, s: [ -12, 18, 24 ] },
		{ l: 21, s: [ -6, 12, 18 ] },
		{ l: 31, s: [ -6, 12, 18 ] }
	],
	10: [
		{ l: 1, s: [ -6, -12, -18, 24 ] },
		{ l: 36, s: [ -12, -18, 24 ] }
	],
	11: [
		{ l: 1, s: [ -6, 12, 18, 24 ] },
		{ l: 18, s: [ -6, 12, 18, 24 ] },
		{ l: 36, s: [ -6, 12, 18, 24 ] }
	],
	12: [
		{ l: 1, s: [ -6, -12, 18, 24 ] },
		{ l: 36, s: [ -6, 12, 18, 24 ] }
	],
	13: [
		{ l: 10, s: [ 6, 12, -18 ] },
		{ l: 15, s: [ -6, 12, 18 ] },
		{ l: 20, s: [ 6, 12, -18 ] },
		{ l: 25, s: [ -18, 24 ] }
	],
	14: [
		{ l: 1, s: [ -18, 24 ] },
		{ l: 14, s: [ -15, 18 ] },
		{ l: 26, s: [ -6, -9, -12, 15, -18, -24 ] }
	],
	15: [
		{ l: 3, s: [ -6, 24 ] },
		{ l: 7, s: [ -6, 24 ] },
		{ l: 11, s: [ -6, 24 ] },
		{ l: 36, s: [ -12, 18 ] }
	],
	16: [
		{ l: 1, s: [ -6, -16, 24 ] },
		{ l: 15, s: [ 6, -24 ] }
	],
	17: [
		{ l: 1, s: [ 6, 12, -18, -24 ] },
		{ l: 36, s: [ -6, 12, 18, 24 ] }
	],
	18: [
		{ l: 9, s: [ 12, 18, -24 ] },
		{ l: 18, s: [ 6, -12 ] },
		{ l: 29, s: [ 12, 18, -24 ] }
	],
	19: [
		{ l: 1, s: [ -4, 14 ] },
		{ l: 3, s: [ -19, 24 ] },
		{ l: 17, s: [ -6, -12, 18, 24 ] },
		{ l: 20, s: [ -12, 18, 24 ] },
		{ l: 36, s: [ 12, 18, -24 ] }
	],
	20: [
		{ l: 2, s: [ 18, -24 ] },
		{ l: 5, s: [ 6, -12, -18 ] },
		{ l: 23, s: [ 15, -21 ] },
		{ l: 34, s: [ 6, -12, -18, -24 ] }
	],
	21: [
		{ l: 1, s: [ -18, 24 ] },
		{ l: 6, s: [ -18, 24 ] },
		{ l: 11, s: [ -12, 18 ] },
		{ l: 16, s: [ -12, 18 ] },
		{ l: 21, s: [ -6, 12 ] },
		{ l: 26, s: [ -6, 12 ] }
	],
	22: [
		{ l: 16, s: [ 6, -12, -18, -24 ] },
		{ l: 20, s: [ -6, -12, -18, 24 ] }
	],
	23: [
		{ l: 8, s: [ 12, -18 ] },
		{ l: 19, s: [ 12, -18 ] },
		{ l: 29, s: [ 12, -18 ] },
		{ l: 36, s: [ 6, -12 ] }
	],
	24: [
		{ l: 1, s: [ -6, 12, 18 ] },
		{ l: 19, s: [ -18, 24 ] },
		{ l: 36, s: [ -6, 12, 18 ] }
	],
	25: [
		{ l: 1, s: [ -6, 12 ] },
		{ l: 1, s: [ -18, 24 ] },
		{ l: 36, s: [ -12, 18 ] }
	],
	26: [
		{ l: 4, s: [ 6, 12, -18, -24 ] },
		{ l: 10, s: [ -6, 12, 18, -24 ] },
		{ l: 16, s: [ -6, -12, 18, 24 ] },
		{ l: 22, s: [ 6, 12, -18, -24 ] },
		{ l: 28, s: [ 6, 12, 18, -24 ] }
	],
	27: [
		{ l: 1, s: [ -10, -15, 21 ] }
	],
	28: [
		{ l: 1, s: [ 6, -12, -18, -24 ] }
	],
	29: [
		{ l: 19, s: [ -15, -18, 24 ] }
	],
	30: [
		{ l: 3, s: [ 10, -13 ] },
		{ l: 6, s: [ -13, -19, 24 ] },
		{ l: 31, s: [ -13, -19, 24 ] }
	],
	31: [ ],
	32: [ ]
};

/*
	Furniture properties:
	x, y: coordinates;
	w, h: dimensions;
	s: search time (in pixels)
	r: colors need to replace by room
*/

var furnitureProperties = {
	tapeDrive:		{ x:	0,	y:	544,	w:	22,	h:	28,	s:	22,	r:	{ 12: { 14: 10 }, 19: { 14: 8 }, 22: { 14: 8 }, 29: { 14: 10 } } },
	desk:			{ x:	22,	y:	544,	w:	56,	h:	24,	s:	64,	r:	{ 3: { 1: 7, 14: 12 }, 9: { 1: 15, 14: 9 }, 12: { 14: 10 }, 19: { 14: 8 }, 21: { 14: 15 }, 29: { 14: 10 }, 30: { 1: 13 } } },
	computer:		{ x:	78,	y:	544,	w:	16,	h:	22,	s:	20,	r:	{} },
	typewriter:		{ x:	94,	y:	544,	w:	24,	h:	20,	s:	22,	r:	{ 2: { 14: 8 }, 21: { 14: 15 } } },
	bin:			{ x:	94,	y:	564,	w:	6,	h:	7,	s:	15,	r:	{ 18: { 8: 14 } } },
	cupboard:		{ x:	118,y:	544,	w:	46,	h:	24,	s:	62,	r:	{ 11: { 7: 1 } } },
	bed:			{ x:	116,y:	568,	w:	48,	h:	11,	s:	36,	r:	{ 16: { 9: 2 } } },
	fridge:			{ x:	164,y:	544,	w:	24,	h:	32,	s:	50,	r:	{ 11: { 7: 1 } } },
	candy:			{ x:	188,y:	544,	w:	32,	h:	31,	s:	26,	r:	{ 5: { 10: 14 }, 11: { 10: 12 }, 13: { 10: 9 } } },
	chest:			{ x:	220,y:	544,	w:	20,	h:	21,	s:	47,	r:	{ 6: { 9: 10, 1: 8 }, 16: { 1: 15, 9: 2 }, 27: { 1: 15 } } },
	basin:			{ x:	240,y:	544,	w:	30,	h:	32,	s:	36,	r:	{ 18: { 8: 14, 10: 12 } } },
	bath:			{ x:	270,y:	544,	w:	48,	h:	32,	s:	8,	r:	{ 18: { 8: 14, 10: 12 } } },
	toilet:			{ x:	318,y:	544,	w:	24,	h:	16,	s:	15,	r:	{ 18: { 8: 14, 10: 12 } } },
	loudspeaker:	{ x:	318,y:	560,	w:	14,	h:	16,	s:	8,	r:	{} },
	stereoSystem:	{ x:	342,y:	544,	w:	15,	h:	20,	s:	15,	r:	{} },
	sofa:			{ x:	332,y:	565,	w:	42,	h:	16,	s:	40,	r:	{ 7: { 12: 15 }, 23: { 14: 2 }, 30: { 12: 13 } } },
	jukebox:		{ x:	357,y:	544,	w:	16,	h:	21,	s:	15,	r:	{ 12: { 14: 10 }, 19: { 14: 8 }, 26: { 14: 5, 1: 13 }, 29: { 14: 10 } } },
	lamp:			{ x:	373,y:	544,	w:	15,	h:	21,	s:	8,	r:	{} },
	piano:			{ x:	388,y:	544,	w:	40,	h:	30,	s:	8,	r:	{ 12: { 14: 10 }, 19: { 14: 8 }, 21: { 14: 15 }, 29: { 14: 10 } } },
	bookcase:		{ x:	428,y:	544,	w:	24,	h:	37,	s:	64,	r:	{ 17: { 15: 14 }, 25: { 9: 14, 12: 1 }, 30: { 9: 14, 15: 13 } } },
	exit:			{ x:	452,y:	544,	w:	44,	h:	39,	s:	0,	r:	{} },
	fireplace:		{ x:	496,y:	544,	w:	70,	h:	28,	s:	55,	r:	{ 16: { 12: 15 } } },
	chairWithLamp:	{ x:	566,y:	544,	w:	22,	h:	32,	s:	26,	r:	{ 17: { 12: 14 }, 25: { 12: 1 }, 30: { 12: 13 } } }
};

/* black ball start positions */

var blackBalls = {
	1: { x: 10, y: 180 },
	3: { x: 15, y: 112 },
	4: { x: 202, y: 171 },
	6: { x: 100, y: -60 },
	13: { x: 288, y: 10 },
	28: { x: 96, y: 90 }
};

var droidTypes = [
	"Observation only",
	"Simple meandering",
	"Meandering",
	// "Induced meandering",
	"Patrolling",
	"Patrolling zap",
	"Smart patrolling",
	"Smart patrolling zap",
	"Askance patrolling",
	// "Slingshot patrolling",
	"Left-to-right zapping",
	"Platform-edge zapping",
	"Berserker zapping",
	"Continuous zapping"
];

/* start positions of droids */

var droidProperties = {
	1:	[ { l: 10, b: 12 } ],
	2:	[ { l: 19, b: 12 } ],
	3:	[ { l: 20, b: 12 }, { l: 14, b: 18 } ],
	4:	[ { l: 4, b: 24 } ],
	5:	[ { l: 20, b: 6 }, { l: 18, b: 12 }, { l: 28, b: 18 }, { l: 27, b: 24 } ],
	6:	[ ],
	7:	[ { l: 14, b: 6 }, { l: 30, b: 12 }, { l: 30, b: 18 } ],
	8:	[ { l: 28, b: 12 }, { l: 8, b: 18 }, { l: 28, b: 18 }, { l: 8, b: 24 } ],
	9:	[ { l: 8, b: 6 }, { l: 28, b: 12 }, { l: 17, b: 18 }, { l: 26, b: 24 } ],
	10:	[ { l: 12, b: 12 }, { l: 32, b: 18 }, { l: 12, b: 24 } ],
	11:	[ { l: 16, b: 6 }, { l: 10, b: 12 }, { l: 26, b: 18 }, { l: 14, b: 24 } ],
	12:	[ { l: 10, b: 6 }, { l: 9, b: 12 }, { l: 6, b: 18 }, { l: 18, b: 24 } ],
	13:	[ { l: 28, b: 12 }, { l: 4, b: 18 }, { l: 10, b: 24 } ],
	14:	[ { l: 10, b: 9 }, { l: 31, b: 12 }, { l: 18, b: 15 }, { l: 6, b: 18 } ],
	15:	[ { l: 20, b: 12 }, { l: 20, b: 18 }, { l: 16, b: 24 } ],
	16:	[ { l: 10, b: 6 }, { l: 31, b: 9 }, { l: 24, b: 19 } ],
	17:	[ { l: 18, b: 6 }, { l: 28, b: 12 }, { l: 8, b: 18 }, { l: 20, b: 24 } ],
	18:	[ { l: 2, b: 12 }, { l: 34, b: 12 }, { l: 20, b: 18 }, { l: 16, b: 24 } ],
	19:	[ { l: 35, b: 6 }, { l: 28, b: 18 }, { l: 32, b: 24 } ],
	20:	[ { l: 15, b: 12 }, { l: 15, b: 18 } ],
	21:	[ { l: 32, b: 6 }, { l: 7, b: 12 }, { l: 24, b: 18 }, { l: 16, b: 24 } ],
	22:	[ { l: 26, b: 6 }, { l: 30, b: 12 }, { l: 6, b: 18 }, { l: 6, b: 24 } ],
	23:	[ { l: 34, b: 6 }, { l: 26, b: 12 }, { l: 15, b: 18 }, { l: 20, b: 24 } ],
	24:	[ { l: 12, b: 6 }, { l: 22, b: 12 }, { l: 6, b: 18 }, { l: 30, b: 18 } ],
	25:	[ { l: 7, b: 12 }, { l: 8, b: 18 }, { l: 30, b: 18 } ],
	26:	[ { l: 8, b: 12 }, { l: 20, b: 18 }, { l: 8, b: 24 }, { l: 20, b: 24 } ],
	27:	[ { l: 10, b: 5 }, { l: 20, b: 12 }, { l: 34, b: 15 }, { l: 18, b: 18 } ],
	28:	[ { l: 28, b: 21 }, { l: 20, b: 24 } ],
	29:	[ { l: 33, b: 6 }, { l: 32, b: 12 }, { l: 30, b: 18 } ],
	30:	[ { l: 18, b: 8 }, { l: 18, b: 13 }, { l: 18, b: 19 }, { l: 18, b: 24 } ],
	31:	[ ],
	32:	[ ]
};

/* Elevartor and room layouts */
var elevatorColors = {
	1: { bg: 10,	bo: 2 },
	2: { bg: 7,		bo: 4 },
	3: { bg: 15,	bo: 12 },
	4: { bg: 1,		bo: 13 },
	5: { bg: 13,	bo: 5 },
	6: { bg: 3,		bo: 6 },
	7: { bg: 9,		bo: 8 },
	8: { bg: 7,		bo: 14 }
};

var maps = [
	// 0
	{
		rooms: {
			0: [ 27, 0, 28, 10, 0, 11 ],
			1: [ 25, 18, 13, 29, 30, 0 ],
			2: [ 20, 2, 0, 0, 0, 0 ],
			3: [ 0, 0, 5, 14, 0, 0 ],
			4: [ 3, 4, 26, 21, 12, 6 ],
			5: [ 16, 19, 32, 0, 22, 7 ],
			6: [ 8, 0, 1, 23, 0, 24 ],
			7: [ 9, 0, 15, 0, 0, 17 ],
			8: [ 0, 0, 0, 0, 0, 31 ]
		},
		elevators: {
			1: { top: 0,	bottom: 6 }, 2: { top: 0,	bottom: 5 }, 3: { top: 0,	bottom: 4 }, 4: { top: 0,	bottom: 6 },
			5: { top: 0,	bottom: 6 }, 6: { top: 0,	bottom: 6 }, 7: { top: 0,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 1
	{
		rooms: {
			0: [ 28, 0, 11, 0, 0, 0 ],
			1: [ 3, 26, 9, 0, 15, 32 ],
			2: [ 2, 0, 0, 5, 22, 4 ],
			3: [ 6, 0, 0, 24, 27, 25 ],
			4: [ 21, 23, 14, 7, 13, 30 ],
			5: [ 10, 18, 0, 0, 17, 20 ],
			6: [ 0, 0, 8, 0, 0, 0 ],
			7: [ 1, 16, 29, 19, 31, 0 ],
			8: [ 0, 0, 0, 0, 0, 12 ]
		},
		elevators: {
			1: { top: 0,	bottom: 5 }, 2: { top: 0,	bottom: 6 }, 3: { top: 0,	bottom: 6 }, 4: { top: 0,	bottom: 5 },
			5: { top: 2,	bottom: 6 }, 6: { top: 0,	bottom: 6 }, 7: { top: 1,	bottom: 5 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 2
	{
		rooms: {
			0: [ 11, 0, 0, 0, 0, 1 ],
			1: [ 3, 32, 17, 0, 0, 15 ],
			2: [ 9, 0, 0, 27, 0, 20 ],
			3: [ 19, 25, 30, 14, 0, 0 ],
			4: [ 0, 0, 29, 18, 0, 0 ],
			5: [ 13, 5, 6, 16, 8, 22 ],
			6: [ 12, 26, 24, 23, 31, 2 ],
			7: [ 4, 7, 10, 28, 0, 0 ],
			8: [ 0, 0, 0, 0, 0, 21 ]
		},
		elevators: {
			1: { top: 0,	bottom: 6 }, 2: { top: 0,	bottom: 6 }, 3: { top: 0,	bottom: 6 }, 4: { top: 2,	bottom: 4 },
			5: { top: 0,	bottom: 6 }, 6: { top: 0,	bottom: 6 }, 7: { top: 0,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 3
	{
		rooms: {
			0: [ 1, 0, 0, 0, 0, 0 ],
			1: [ 8, 5, 11, 0, 0, 0 ],
			2: [ 17, 20, 7, 27, 0, 0 ],
			3: [ 6, 24, 9, 0, 0, 0 ],
			4: [ 23, 10, 14, 3, 18, 16],
			5: [ 13, 30, 29, 28, 19, 0 ],
			6: [ 25, 32, 0, 15, 26, 22 ],
			7: [ 0, 4, 31, 0, 0, 2 ],
			8: [ 12, 21, 0, 0, 0, 0 ]
		},
		elevators: {
			1: { top: 0,	bottom: 2 }, 2: { top: 0,	bottom: 3 }, 3: { top: 0,	bottom: 4 }, 4: { top: 0,	bottom: 6 },
			5: { top: 0,	bottom: 6 }, 6: { top: 0,	bottom: 6 }, 7: { top: 1,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 4
	{
		rooms: {
			0: [ 10, 18, 32, 0, 0, 0 ],
			1: [ 17, 0, 15, 0, 0, 0 ],
			2: [ 30, 0, 0, 5, 14, 28 ],
			3: [ 0, 12, 27, 16, 2, 7 ],
			4: [ 0, 20, 0, 0, 0, 0 ],
			5: [ 21, 4, 9, 8, 11, 13 ],
			6: [ 24, 0, 0, 0, 3, 1 ],
			7: [ 23, 0, 22, 29, 19, 31 ],
			8: [ 0, 0, 0, 25, 6, 26 ]
		},
		elevators: {
			1: { top: 0,	bottom: 3 }, 2: { top: 0,	bottom: 5 }, 3: { top: 0,	bottom: 6 }, 4: { top: 1,	bottom: 6 },
			5: { top: 0,	bottom: 6 }, 6: { top: 0,	bottom: 6 }, 7: { top: 0,	bottom: 6 }, 8: { top: 2,	bottom: 6 }
		}
	},
	// 5
	{
		rooms: {
			0: [ 1, 0, 0, 0, 0, 0 ],
			1: [ 13, 23, 0, 15, 11, 30 ],
			2: [ 9, 18, 27, 32, 0, 8 ],
			3: [ 0, 0, 17, 14, 16, 19 ],
			4: [ 31, 2, 6, 0, 5, 4 ],
			5: [ 0, 22, 0, 24, 0, 28 ],
			6: [ 10, 0, 20, 7, 0, 3 ],
			7: [ 0, 0, 0, 29, 26, 0 ],
			8: [ 21, 0, 12, 0, 0, 25 ]
		},
		elevators: {
			1: { top: 0,	bottom: 4 }, 2: { top: 0,	bottom: 6 }, 3: { top: 0,	bottom: 6 }, 4: { top: 0,	bottom: 6 },
			5: { top: 1,	bottom: 6 }, 6: { top: 1,	bottom: 6 }, 7: { top: 0,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 6
	{
		rooms: {
			0: [ 27, 0, 0, 10, 0, 0 ],
			1: [ 0, 0, 8, 11, 23, 25 ],
			2: [ 9, 0, 0, 20, 0, 18 ],
			3: [ 28, 32, 3, 16, 13, 5 ],
			4: [ 14, 1, 26, 30, 0, 0 ],
			5: [ 7, 17, 19, 6, 2, 15 ],
			6: [ 31, 21, 4, 29, 0, 0 ],
			7: [ 0, 0, 0, 0, 24, 22 ],
			8: [ 12, 0, 0, 0, 0, 0 ]
		},
		elevators: {
			1: { top: 0,	bottom: 6 }, 2: { top: 0,	bottom: 4 }, 3: { top: 0,	bottom: 6 }, 4: { top: 0,	bottom: 6 },
			5: { top: 0,	bottom: 6 }, 6: { top: 0,	bottom: 6 }, 7: { top: 2,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 7
	{
		rooms: {
			0: [ 11, 0, 10, 0, 0, 0 ],
			1: [ 0, 18, 29, 0, 5, 0 ],
			2: [ 8, 21, 0, 2, 3, 30 ],
			3: [ 0, 13, 7, 14, 22, 19 ],
			4: [ 12, 31, 0, 0, 16, 28 ],
			5: [ 0, 9, 20, 1, 0, 0 ],
			6: [ 15, 0, 17, 4, 6, 0 ],
			7: [ 0, 24, 27, 23, 0, 32 ],
			8: [ 25, 0, 0, 0, 0, 26 ]
		},
		elevators: {
			1: { top: 0,	bottom: 5 }, 2: { top: 0,	bottom: 5 }, 3: { top: 0,	bottom: 6 }, 4: { top: 0,	bottom: 5 },
			5: { top: 1,	bottom: 6 }, 6: { top: 0,	bottom: 5 }, 7: { top: 0,	bottom: 4 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 8
	{
		rooms: {
			0: [ 10, 0, 0, 0, 0, 0 ],
			1: [ 29, 0, 13, 0, 25, 0 ],
			2: [ 23, 17, 30, 24, 1, 31 ],
			3: [ 28, 5, 7, 18, 8, 22 ],
			4: [ 15, 11, 0, 6, 32, 0 ],
			5: [ 0, 0, 19, 20, 14, 0 ],
			6: [ 26, 27, 0, 0, 4, 3 ],
			7: [ 16, 12, 0, 9, 0, 2 ],
			8: [ 0, 0, 0, 0, 0, 21 ]
		},
		elevators: {
			1: { top: 0,	bottom: 5 }, 2: { top: 0,	bottom: 6 }, 3: { top: 1,	bottom: 6 }, 4: { top: 0,	bottom: 6 },
			5: { top: 0,	bottom: 5 }, 6: { top: 0,	bottom: 6 }, 7: { top: 0,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 9
	{
		rooms: {
			0: [ 18, 0, 30, 0, 28, 0 ],
			1: [ 4, 7, 31, 0, 9, 0 ],
			2: [ 14, 32, 26, 0, 0, 0 ],
			3: [ 1, 0, 0, 0, 29, 22 ],
			4: [ 27, 12, 17, 15, 2, 19 ],
			5: [ 23, 0, 0, 5, 24, 6 ],
			6: [ 0, 0, 20, 0, 8, 13 ],
			7: [ 3, 21, 10, 0, 16, 11 ],
			8: [ 0, 25, 0, 0, 0, 0 ]
		},
		elevators: {
			1: { top: 0,	bottom: 5 }, 2: { top: 0,	bottom: 5 }, 3: { top: 0,	bottom: 6 }, 4: { top: 0,	bottom: 6 },
			5: { top: 0,	bottom: 6 }, 6: { top: 2,	bottom: 6 }, 7: { top: 0,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	},
	// 10
	{
		rooms: {
			0: [ 32, 0, 0, 0, 0, 0 ],
			1: [ 25, 22, 9, 0, 14, 11 ],
			2: [ 4, 17, 23, 18, 28, 1 ],
			3: [ 29, 0, 0, 0, 12, 31 ],
			4: [ 24, 30, 0, 0, 0, 0 ],
			5: [ 16, 5, 0, 27, 0, 0 ],
			6: [ 0, 2, 20, 10, 26, 0 ],
			7: [ 13, 3, 8, 15, 0, 7 ],
			8: [ 6, 0, 0, 0, 19, 21 ]
		},
		elevators: {
			1: { top: 0,	bottom: 5 }, 2: { top: 0,	bottom: 6 }, 3: { top: 0,	bottom: 6 }, 4: { top: 0,	bottom: 1 },
			5: { top: 0,	bottom: 2 }, 6: { top: 0,	bottom: 5 }, 7: { top: 0,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	}
	/*
	{
		rooms: {
			0: [ 0, 0, 0, 0, 0, 0 ],
			1: [ 0, 0, 0, 0, 0, 0 ],
			2: [ 0, 0, 0, 0, 0, 0 ],
			3: [ 0, 0, 0, 0, 0, 0 ],
			4: [ 0, 0, 0, 0, 0, 0 ],
			5: [ 0, 0, 0, 0, 0, 0 ],
			6: [ 0, 0, 0, 0, 0, 0 ],
			7: [ 0, 0, 0, 0, 0, 0 ],
			8: [ 0, 0, 0, 0, 0, 0 ]
		},
		elevators: {
			1: { top: 0,	bottom: 6 }, 2: { top: 0,	bottom: 6 }, 3: { top: 0,	bottom: 6 }, 4: { top: 0,	bottom: 6 },
			5: { top: 0,	bottom: 6 }, 6: { top: 0,	bottom: 6 }, 7: { top: 0,	bottom: 6 }, 8: { top: 0,	bottom: 6 }
		}
	}
	*/
];

/* passwords */
var passwords = ['ARTICHOKE', 'CROCODILE', 'CORMORANT', 'SWORDFISH', 'ASPARAGUS', 'ALLIGATOR', 'ALBATROSS', 'BUTTERFLY', 'ARTICHOKE', 'CROCODILE', 'CORMORANT'];

/* Dork */
var correctRun = [11, 12, 9, 7, 9, 17, 14, 12, 12, 9, 7, 9, 17, 12];
var correctJump = [8, 8, 10, 11, 12, 12, 12, 7, 0, 2, 8, 5];
var platformObstacleCheckForJump = {
	1: [0, 1, 10],
	2: [0, 1, 2, 10],
	3: [0, 1, 2, 3, 4, 9, 10],
	4: [2, 3, 4, 5, 6, 7, 8, 9, 10],
	5: [4, 5, 6, 7, 8, 9]
};

/**
 * End of constants.js file
 */