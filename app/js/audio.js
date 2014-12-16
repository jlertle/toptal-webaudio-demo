angular
    .module('WebAudio', [])
    .service('AMP', function() {
        var self;

        function Gain(ctx) {
            self = this;

            self.gain = ctx.createGain();

            return self;
        }

        Gain.prototype.setVolume = function(volume, time) {
            self.gain.gain.setTargetAtTime(volume, 0, time);
        }

        Gain.prototype.connect = function(i) {
            self.gain.connect(i);
        }

        Gain.prototype.cancel = function() {
            self.gain.gain.cancelScheduledValues(0);
        }

        Gain.prototype.disconnect = function() {
            self.gain.disconnect(0);
        }

        return Gain;
    })
    .service('OSC', function() {
        var self;

        function Oscillator(ctx) {
            self = this;
            self.osc = ctx.createOscillator();

            return self;
        }

        Oscillator.prototype.setOscType = function(type) {
            if(type) {
                self.osc.type = type
            }
        }

        Oscillator.prototype.setFrequency = function(freq, time) {
            self.osc.frequency.setTargetAtTime(freq, 0, time);
        };

        Oscillator.prototype.start = function(pos) {
            self.osc.start(pos);
        }

        Oscillator.prototype.stop = function(pos) {
            self.osc.stop(pos);
        }

        Oscillator.prototype.connect = function(i) {
            self.osc.connect(i);
        }

        Oscillator.prototype.cancel = function() {
            self.osc.frequency.cancelScheduledValues(0);
        }

        return Oscillator;
    })
    .service('FTR', function() {
        var self;

        function Filter(ctx) {
            self = this;

            self.filter = ctx.createBiquadFilter();
            // self.filter.gain.value = -40; // ???

            return self;
        }

        Filter.prototype.setFilterType = function(type) {
            if(type) {
                self.filter.type = type;
            }
        }

        Filter.prototype.setFilterFrequency = function(freq) {
            if(freq) {
                self.filter.frequency.value = freq;
            }
        }

        Filter.prototype.setFilterResonance = function(res) {
            if(res) {
                self.filter.Q.value = res;
            }
        }

        Filter.prototype.connect = function(i) {
            self.filter.connect(i);
        }

        Filter.prototype.disconnect = function() {
            self.filter.disconnect(0);
        }

        return Filter;
    })
    .factory('AudioEngine', ['OSC', 'AMP', 'FTR', '$window', function(Oscillator, Amp, Filter, $window) {
        var self = this;

        self.activeNotes = [];
        self.settings = {
            attack: 0.05,
            release: 0.05,
            portamento: 0.05
        };

        function _createContext() {
            self.ctx = new $window.AudioContext();
        }

        function _createAmp() {
            self.amp = new Amp(self.ctx);
        }

        function _createOscillators() {
            //osc types: sine, square, triangle, sawtooth
            // osc1
            self.osc1 = new Oscillator(self.ctx);
            self.osc1.setOscType('sine');
        }

        function _createFilters() {
            self.filter1 = new Filter(self.ctx);
            // self.filter1.setFilterType('highpass');
            self.filter1.setFilterFrequency(5000);
            self.filter1.setFilterResonance(25);
        }

        function _wire() {
            self.osc1.connect(self.amp.gain);
            self.amp.connect(self.ctx.destination);
            self.amp.setVolume(0.0, 0); //mute the sound

            self.osc1.start(0); // start osc1
        }

        function _connectFilter() {
            self.amp.disconnect();
            self.amp.connect(self.filter1.filter);
            self.filter1.connect(self.ctx.destination);
        }

        function _disconnectFilter() {
            self.filter1.disconnect();
            self.amp.disconnect();
            self.amp.connect(self.ctx.destination);
        }

        function _mtof(note) {
            return 440 * Math.pow(2, (note - 69) / 12);
        }

        function _noteOn(note, velocity) {
            self.activeNotes.push(note);

            self.osc1.cancel();
            self.osc1.setFrequency(_mtof(note), self.settings.portamento);

            self.amp.cancel();
            self.amp.setVolume(1.0, self.settings.attack);
        }

        function _noteOff(note) {
            var position = self.activeNotes.indexOf(note);
            if (position !== -1) {
                self.activeNotes.splice(position, 1);
            }

            if (self.activeNotes.length === 0) {
                // shut off the envelope
                self.amp.cancel();
                self.amp.setVolume(0.0, self.settings.release);
            } else {
                self.osc1.cancel();
                self.osc1.setFrequency(_mtof(self.activeNotes[self.activeNotes.length - 1]), self.settings.portamento);
            }
        }

        function _detune(d) {
            // range: 0 to 127
            console.log('detune called', d);
        }

        return {
            init: function() {
                _createContext();
                _createAmp();
                _createOscillators();
                _createFilters();
                _wire();
            },
            noteOn: _noteOn,
            noteOff: _noteOff,
            detune: _detune,
            osc: {
                setType: function(t) {
                    if(self.osc1) {
                        self.osc1.setOscType(t);
                    }
                }
            },
            filter: {
                setType: function(t) {
                    if(self.filter1) {
                        self.filter1.setFilterType(t);
                    }
                },
                setFrequency: function(f) {
                    if(self.filter1) {
                        self.filter1.setFilterFrequency(f);
                    }
                },
                setResonance: function(r) {
                    if(self.filter1) {
                        self.filter1.setFilterResonance(r);
                    }
                },
                connect: _connectFilter,
                disconnect: _disconnectFilter
            }
        };
    }]);
