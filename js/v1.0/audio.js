/**
 * Impossible Mission. Commodore 64 remake in javaScript.
 * by Krisztian Toth (http://krissz.hu/)
 *
 * file: audio.js /1.0/
 * last update: 19.05.2013.
 */

function oAudio() {
	this.init = function() {
		this.audioContext = window.AudioContext || window.webkitAudioContext || false;
		this.context = this.audioContext ? new (this.audioContext)() : false;

		this.neededResources = [
			'elevatorStart.ogg', 'anotherVisitor.ogg', 'elevatorStop.ogg', 'stepLeft.ogg', 'stepRight.ogg', 'jumpLeft.ogg', 'jumpRight.ogg',
			'beep1.ogg', 'beep2.ogg', 'beep3.ogg', 'beep4.ogg', 'beep5.ogg',
			'inLine.ogg', 'dial1.ogg', 'dial2.ogg',
			'droid.ogg', 'droidTurn.ogg', 'zap1.ogg', 'zap2.ogg', 'zap3.ogg', 'zap4.ogg', 'zap5.ogg',
			'falling.ogg', 'dieByZap.ogg', 'destroyHim.ogg', 'hahaha.ogg', 'nonono.ogg', 'missionAccomplished.ogg'
		];
		for (var i = 1; i <= 14; i++) this.neededResources.push('organTone' + i + '.ogg');

		if (this.context) engine.neededResources += this.neededResources.length;

		this.sounds = {};			// buffers
		this.queue = [];			// requested sound effects in actual scan frame. Empty before every frame.
		this.activeSounds = [];		// Buffer source objects of actually played sounds. Need to stop.
	};

	// collect sound requests in actually scan frame
	this.request = function(req) {
		if (!this.context) return;

		// sound is already in the queue?
		for (var i = 0; i < this.queue.length; i++) if (this.queue[i].name == req.name && !req.offset) return;

		// if not, we push it:
		this.queue.push(req);

		return true;
	};

	// play all sounds from queue
	this.playQueue = function() {
		if (options.sound == 'off' || !this.context) return false;

		for (var i = 0; i < this.queue.length; i++) {
			var req = this.queue[i];
			if (!req.name) continue;
			if (req.loop === undefined) req.loop = false;
			if (req.offset === undefined) req.offset = 0;

			this.activeSounds.push({
				name: req.name,
				bufferSource: this.play(req.name, req.loop, req.offset)
			});
		}
	};

	this.stopAllSound = function() {
		if (!this.context) return;

		for (var i = 0; i < this.activeSounds.length; i++) this.activeSounds[i].bufferSource.stop(0);
		this.queue = [];

		// garbage collection:
		this.activeSounds = [];
	};

	this.stopOneZapSound = function() {
		if (!this.context) return;

		for (var i = 0; i < this.activeSounds.length; i++) {
			if (this.activeSounds[i].name.indexOf('zap') === 0) {
				this.activeSounds[i].bufferSource.stop(0);
				this.activeSounds[i].name = 'deleted';
				break;
			}
		}
	};

	this.loadAudioResource = function(index) {
		if (!this.context) return;

		var fileName = audio.neededResources[index];
		var name = fileName.split('.')[0];

		var request = new XMLHttpRequest();
		request.open('GET', 'audio/v1.0/' + fileName, true);
		request.responseType = 'arraybuffer';

		request.onload = function() {
			audio.context.decodeAudioData(request.response, function(buffer) {
				audio.sounds[name] = buffer;
				if (index + 1 < audio.neededResources.length) audio.loadAudioResource(index + 1);
				engine.loadedResources++;
			}, function(err) {
				log(err);
			});
		}

		request.send();
	};

	this.play = function(name, loop, offset) {
		if (options.sound == 'off' || !this.context) return false;
		loop = loop ? true : false;

		var source = audio.context.createBufferSource();
		source.buffer = audio.sounds[name];
		source.loop = loop;
		source.connect(audio.context.destination);

		if (!offset) source.start(0);
		else {
			setTimeout(function() {
				if (options.sound == 'off') return false;
				source.start(0);
			}, offset);
		}
	
		return source;
	};
}

/**
 * End of audio.js file
 */