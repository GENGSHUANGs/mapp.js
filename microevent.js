(function(root) {
        'use strict';
        /**
         * MicroEvent - to make any js object an event emitter (server or browser)
         * 
         * - pure javascript - server compatible, browser compatible
         * - dont rely on the browser doms
         * - super simple - you get it immediatly, no mistery, no magic involved
         *
         * - create a MicroEventDebug with goodies to debug
         *   - make it safer to use
         */

        var MicroEvent = function() {};
        MicroEvent.prototype = {
                on: function(event, fct) {
                        this._events = this._events || {};
                        this._events[event] = this._events[event] || [];
                        this._events[event].push(fct);
                },
                off: function(event, fct) {
                        this._events = this._events || {};
                        if (event in this._events === false) return;
                        this._events[event].splice(this._events[event].indexOf(fct), 1);
                },
                trigger: function(event /* , args... */ ) {
                        this._events = this._events || {};
                        if (event in this._events === false) return;
                        for (var i = 0; i < this._events[event].length; i++) {
                                this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
                        }
                },
                triggerback: function(event, callback) {
                        this._events = this._events || {};
                        var args = Array.prototype.slice.call(arguments, 2);
                        if (event in this._events === false) {
                                callback.apply(callback, args);
                                return;
                        };
                        var i = 0;
                        var self = this;
                        var _callback = function() {
                                if (i == self._events[event].length) {
                                        callback.apply(callback, args);
                                        return;
                                }
                                var _i = i;
                                i += 1;
                                self._events[event][_i].apply(undefined, args);
                        };
                        args.push(_callback);
                        _callback();
                }
        };

        /**
         * mixin will delegate all MicroEvent.js function in the destination object
         *
         * - require('MicroEvent').mixin(Foobar) will make Foobar able to use MicroEvent
         *
         * @param {Object} the object which will support MicroEvent
         */
        MicroEvent.mixin = function(destObject) {
                var props = ['on', 'off', 'trigger', 'triggerback'];
                for (var i = 0; i < props.length; i++) {
                        if (typeof destObject === 'function') {
                                destObject.prototype[props[i]] = MicroEvent.prototype[props[i]];
                        } else {
                                destObject[props[i]] = MicroEvent.prototype[props[i]];
                        }
                }
                return destObject;
        }

        MicroEvent.Mocker = function(obj) {
                return obj || this;
        };
        MicroEvent.mixin(MicroEvent.Mocker);
        MicroEvent.Mocker.prototype.triggerback = function(event, callback) {
                callback();
        };

        root.MicroEvent = MicroEvent;
})(this);
