/**
 * Created by anton_gorshenin on 27.05.2015.
 */
!function (e) {
    if ("object" == typeof exports && "undefined" != typeof module)module.exports = e(); else if ("function" == typeof define && define.amd)define([], e); else {
        var f;
        "undefined" != typeof window ? f = window : "undefined" != typeof global ? f = global : "undefined" != typeof self && (f = self), f.io = e()
    }
}(function () {
    var define, module, exports;
    return function e(t, n, r) {
        function s(o, u) {
            if (!n[o]) {
                if (!t[o]) {
                    var a = typeof require == "function" && require;
                    if (!u && a)return a(o, !0);
                    if (i)return i(o, !0);
                    throw new Error("Cannot find module '" + o + "'")
                }
                var f = n[o] = {exports: {}};
                t[o][0].call(f.exports, function (e) {
                    var n = t[o][1][e];
                    return s(n ? n : e)
                }, f, f.exports, e, t, n, r)
            }
            return n[o].exports
        }

        var i = typeof require == "function" && require;
        for (var o = 0; o < r.length; o++)s(r[o]);
        return s
    }({
        1: [function (_dereq_, module, exports) {
            module.exports = _dereq_("./lib/")
        }, {"./lib/": 2}],
        2: [function (_dereq_, module, exports) {
            var url = _dereq_("./url");
            var parser = _dereq_("socket.io-parser");
            var Manager = _dereq_("./manager");
            var debug = _dereq_("debug")("socket.io-client");
            module.exports = exports = lookup;
            var cache = exports.managers = {};

            function lookup(uri, opts) {
                if (typeof uri == "object") {
                    opts = uri;
                    uri = undefined
                }
                opts = opts || {};
                var parsed = url(uri);
                var source = parsed.source;
                var id = parsed.id;
                var io;
                if (opts.forceNew || opts["force new connection"] || false === opts.multiplex) {
                    debug("ignoring socket cache for %s", source);
                    io = Manager(source, opts)
                } else {
                    if (!cache[id]) {
                        debug("new io instance for %s", source);
                        cache[id] = Manager(source, opts)
                    }
                    io = cache[id]
                }
                return io.socket(parsed.path)
            }

            exports.protocol = parser.protocol;
            exports.connect = lookup;
            exports.Manager = _dereq_("./manager");
            exports.Socket = _dereq_("./socket")
        }, {"./manager": 3, "./socket": 5, "./url": 6, debug: 10, "socket.io-parser": 46}],
        3: [function (_dereq_, module, exports) {
            var url = _dereq_("./url");
            var eio = _dereq_("engine.io-client");
            var Socket = _dereq_("./socket");
            var Emitter = _dereq_("component-emitter");
            var parser = _dereq_("socket.io-parser");
            var on = _dereq_("./on");
            var bind = _dereq_("component-bind");
            var object = _dereq_("object-component");
            var debug = _dereq_("debug")("socket.io-client:manager");
            var indexOf = _dereq_("indexof");
            var Backoff = _dereq_("backo2");
            module.exports = Manager;
            function Manager(uri, opts) {
                if (!(this instanceof Manager))return new Manager(uri, opts);
                if (uri && "object" == typeof uri) {
                    opts = uri;
                    uri = undefined
                }
                opts = opts || {};
                opts.path = opts.path || "/socket.io";
                this.nsps = {};
                this.subs = [];
                this.opts = opts;
                this.reconnection(opts.reconnection !== false);
                this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
                this.reconnectionDelay(opts.reconnectionDelay || 1e3);
                this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
                this.randomizationFactor(opts.randomizationFactor || .5);
                this.backoff = new Backoff({
                    min: this.reconnectionDelay(),
                    max: this.reconnectionDelayMax(),
                    jitter: this.randomizationFactor()
                });
                this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
                this.readyState = "closed";
                this.uri = uri;
                this.connected = [];
                this.encoding = false;
                this.packetBuffer = [];
                this.encoder = new parser.Encoder;
                this.decoder = new parser.Decoder;
                this.autoConnect = opts.autoConnect !== false;
                if (this.autoConnect)this.open()
            }

            Manager.prototype.emitAll = function () {
                this.emit.apply(this, arguments);
                for (var nsp in this.nsps) {
                    this.nsps[nsp].emit.apply(this.nsps[nsp], arguments)
                }
            };
            Manager.prototype.updateSocketIds = function () {
                for (var nsp in this.nsps) {
                    this.nsps[nsp].id = this.engine.id
                }
            };
            Emitter(Manager.prototype);
            Manager.prototype.reconnection = function (v) {
                if (!arguments.length)return this._reconnection;
                this._reconnection = !!v;
                return this
            };
            Manager.prototype.reconnectionAttempts = function (v) {
                if (!arguments.length)return this._reconnectionAttempts;
                this._reconnectionAttempts = v;
                return this
            };
            Manager.prototype.reconnectionDelay = function (v) {
                if (!arguments.length)return this._reconnectionDelay;
                this._reconnectionDelay = v;
                this.backoff && this.backoff.setMin(v);
                return this
            };
            Manager.prototype.randomizationFactor = function (v) {
                if (!arguments.length)return this._randomizationFactor;
                this._randomizationFactor = v;
                this.backoff && this.backoff.setJitter(v);
                return this
            };
            Manager.prototype.reconnectionDelayMax = function (v) {
                if (!arguments.length)return this._reconnectionDelayMax;
                this._reconnectionDelayMax = v;
                this.backoff && this.backoff.setMax(v);
                return this
            };
            Manager.prototype.timeout = function (v) {
                if (!arguments.length)return this._timeout;
                this._timeout = v;
                return this
            };
            Manager.prototype.maybeReconnectOnOpen = function () {
                if (!this.reconnecting && this._reconnection && this.backoff.attempts === 0) {
                    this.reconnect()
                }
            };
            Manager.prototype.open = Manager.prototype.connect = function (fn) {
                debug("readyState %s", this.readyState);
                if (~this.readyState.indexOf("open"))return this;
                debug("opening %s", this.uri);
                this.engine = eio(this.uri, this.opts);
                var socket = this.engine;
                var self = this;
                this.readyState = "opening";
                this.skipReconnect = false;
                var openSub = on(socket, "open", function () {
                    self.onopen();
                    fn && fn()
                });
                var errorSub = on(socket, "error", function (data) {
                    debug("connect_error");
                    self.cleanup();
                    self.readyState = "closed";
                    self.emitAll("connect_error", data);
                    if (fn) {
                        var err = new Error("Connection error");
                        err.data = data;
                        fn(err)
                    } else {
                        self.maybeReconnectOnOpen()
                    }
                });
                if (false !== this._timeout) {
                    var timeout = this._timeout;
                    debug("connect attempt will timeout after %d", timeout);
                    var timer = setTimeout(function () {
                        debug("connect attempt timed out after %d", timeout);
                        openSub.destroy();
                        socket.close();
                        socket.emit("error", "timeout");
                        self.emitAll("connect_timeout", timeout)
                    }, timeout);
                    this.subs.push({
                        destroy: function () {
                            clearTimeout(timer)
                        }
                    })
                }
                this.subs.push(openSub);
                this.subs.push(errorSub);
                return this
            };
            Manager.prototype.onopen = function () {
                debug("open");
                this.cleanup();
                this.readyState = "open";
                this.emit("open");
                var socket = this.engine;
                this.subs.push(on(socket, "data", bind(this, "ondata")));
                this.subs.push(on(this.decoder, "decoded", bind(this, "ondecoded")));
                this.subs.push(on(socket, "error", bind(this, "onerror")));
                this.subs.push(on(socket, "close", bind(this, "onclose")))
            };
            Manager.prototype.ondata = function (data) {
                this.decoder.add(data)
            };
            Manager.prototype.ondecoded = function (packet) {
                this.emit("packet", packet)
            };
            Manager.prototype.onerror = function (err) {
                debug("error", err);
                this.emitAll("error", err)
            };
            Manager.prototype.socket = function (nsp) {
                var socket = this.nsps[nsp];
                if (!socket) {
                    socket = new Socket(this, nsp);
                    this.nsps[nsp] = socket;
                    var self = this;
                    socket.on("connect", function () {
                        socket.id = self.engine.id;
                        if (!~indexOf(self.connected, socket)) {
                            self.connected.push(socket)
                        }
                    })
                }
                return socket
            };
            Manager.prototype.destroy = function (socket) {
                var index = indexOf(this.connected, socket);
                if (~index)this.connected.splice(index, 1);
                if (this.connected.length)return;
                this.close()
            };
            Manager.prototype.packet = function (packet) {
                debug("writing packet %j", packet);
                var self = this;
                if (!self.encoding) {
                    self.encoding = true;
                    this.encoder.encode(packet, function (encodedPackets) {
                        for (var i = 0; i < encodedPackets.length; i++) {
                            self.engine.write(encodedPackets[i])
                        }
                        self.encoding = false;
                        self.processPacketQueue()
                    })
                } else {
                    self.packetBuffer.push(packet)
                }
            };
            Manager.prototype.processPacketQueue = function () {
                if (this.packetBuffer.length > 0 && !this.encoding) {
                    var pack = this.packetBuffer.shift();
                    this.packet(pack)
                }
            };
            Manager.prototype.cleanup = function () {
                var sub;
                while (sub = this.subs.shift())sub.destroy();
                this.packetBuffer = [];
                this.encoding = false;
                this.decoder.destroy()
            };
            Manager.prototype.close = Manager.prototype.disconnect = function () {
                this.skipReconnect = true;
                this.backoff.reset();
                this.readyState = "closed";
                this.engine && this.engine.close()
            };
            Manager.prototype.onclose = function (reason) {
                debug("close");
                this.cleanup();
                this.backoff.reset();
                this.readyState = "closed";
                this.emit("close", reason);
                if (this._reconnection && !this.skipReconnect) {
                    this.reconnect()
                }
            };
            Manager.prototype.reconnect = function () {
                if (this.reconnecting || this.skipReconnect)return this;
                var self = this;
                if (this.backoff.attempts >= this._reconnectionAttempts) {
                    debug("reconnect failed");
                    this.backoff.reset();
                    this.emitAll("reconnect_failed");
                    this.reconnecting = false
                } else {
                    var delay = this.backoff.duration();
                    debug("will wait %dms before reconnect attempt", delay);
                    this.reconnecting = true;
                    var timer = setTimeout(function () {
                        if (self.skipReconnect)return;
                        debug("attempting reconnect");
                        self.emitAll("reconnect_attempt", self.backoff.attempts);
                        self.emitAll("reconnecting", self.backoff.attempts);
                        if (self.skipReconnect)return;
                        self.open(function (err) {
                            if (err) {
                                debug("reconnect attempt error");
                                self.reconnecting = false;
                                self.reconnect();
                                self.emitAll("reconnect_error", err.data)
                            } else {
                                debug("reconnect success");
                                self.onreconnect()
                            }
                        })
                    }, delay);
                    this.subs.push({
                        destroy: function () {
                            clearTimeout(timer)
                        }
                    })
                }
            };
            Manager.prototype.onreconnect = function () {
                var attempt = this.backoff.attempts;
                this.reconnecting = false;
                this.backoff.reset();
                this.updateSocketIds();
                this.emitAll("reconnect", attempt)
            }
        }, {
            "./on": 4,
            "./socket": 5,
            "./url": 6,
            backo2: 7,
            "component-bind": 8,
            "component-emitter": 9,
            debug: 10,
            "engine.io-client": 11,
            indexof: 42,
            "object-component": 43,
            "socket.io-parser": 46
        }],
        4: [function (_dereq_, module, exports) {
            module.exports = on;
            function on(obj, ev, fn) {
                obj.on(ev, fn);
                return {
                    destroy: function () {
                        obj.removeListener(ev, fn)
                    }
                }
            }
        }, {}],
        5: [function (_dereq_, module, exports) {
            var parser = _dereq_("socket.io-parser");
            var Emitter = _dereq_("component-emitter");
            var toArray = _dereq_("to-array");
            var on = _dereq_("./on");
            var bind = _dereq_("component-bind");
            var debug = _dereq_("debug")("socket.io-client:socket");
            var hasBin = _dereq_("has-binary");
            module.exports = exports = Socket;
            var events = {
                connect: 1,
                connect_error: 1,
                connect_timeout: 1,
                disconnect: 1,
                error: 1,
                reconnect: 1,
                reconnect_attempt: 1,
                reconnect_failed: 1,
                reconnect_error: 1,
                reconnecting: 1
            };
            var emit = Emitter.prototype.emit;

            function Socket(io, nsp) {
                this.io = io;
                this.nsp = nsp;
                this.json = this;
                this.ids = 0;
                this.acks = {};
                if (this.io.autoConnect)this.open();
                this.receiveBuffer = [];
                this.sendBuffer = [];
                this.connected = false;
                this.disconnected = true
            }

            Emitter(Socket.prototype);
            Socket.prototype.subEvents = function () {
                if (this.subs)return;
                var io = this.io;
                this.subs = [on(io, "open", bind(this, "onopen")), on(io, "packet", bind(this, "onpacket")), on(io, "close", bind(this, "onclose"))]
            };
            Socket.prototype.open = Socket.prototype.connect = function () {
                if (this.connected)return this;
                this.subEvents();
                this.io.open();
                if ("open" == this.io.readyState)this.onopen();
                return this
            };
            Socket.prototype.send = function () {
                var args = toArray(arguments);
                args.unshift("message");
                this.emit.apply(this, args);
                return this
            };
            Socket.prototype.emit = function (ev) {
                if (events.hasOwnProperty(ev)) {
                    emit.apply(this, arguments);
                    return this
                }
                var args = toArray(arguments);
                var parserType = parser.EVENT;
                if (hasBin(args)) {
                    parserType = parser.BINARY_EVENT
                }
                var packet = {type: parserType, data: args};
                if ("function" == typeof args[args.length - 1]) {
                    debug("emitting packet with ack id %d", this.ids);
                    this.acks[this.ids] = args.pop();
                    packet.id = this.ids++
                }
                if (this.connected) {
                    this.packet(packet)
                } else {
                    this.sendBuffer.push(packet)
                }
                return this
            };
            Socket.prototype.packet = function (packet) {
                packet.nsp = this.nsp;
                this.io.packet(packet)
            };
            Socket.prototype.onopen = function () {
                debug("transport is open - connecting");
                if ("/" != this.nsp) {
                    this.packet({type: parser.CONNECT})
                }
            };
            Socket.prototype.onclose = function (reason) {
                debug("close (%s)", reason);
                this.connected = false;
                this.disconnected = true;
                delete this.id;
                this.emit("disconnect", reason)
            };
            Socket.prototype.onpacket = function (packet) {
                if (packet.nsp != this.nsp)return;
                switch (packet.type) {
                    case parser.CONNECT:
                        this.onconnect();
                        break;
                    case parser.EVENT:
                        this.onevent(packet);
                        break;
                    case parser.BINARY_EVENT:
                        this.onevent(packet);
                        break;
                    case parser.ACK:
                        this.onack(packet);
                        break;
                    case parser.BINARY_ACK:
                        this.onack(packet);
                        break;
                    case parser.DISCONNECT:
                        this.ondisconnect();
                        break;
                    case parser.ERROR:
                        this.emit("error", packet.data);
                        break
                }
            };
            Socket.prototype.onevent = function (packet) {
                var args = packet.data || [];
                debug("emitting event %j", args);
                if (null != packet.id) {
                    debug("attaching ack callback to event");
                    args.push(this.ack(packet.id))
                }
                if (this.connected) {
                    emit.apply(this, args)
                } else {
                    this.receiveBuffer.push(args)
                }
            };
            Socket.prototype.ack = function (id) {
                var self = this;
                var sent = false;
                return function () {
                    if (sent)return;
                    sent = true;
                    var args = toArray(arguments);
                    debug("sending ack %j", args);
                    var type = hasBin(args) ? parser.BINARY_ACK : parser.ACK;
                    self.packet({type: type, id: id, data: args})
                }
            };
            Socket.prototype.onack = function (packet) {
                debug("calling ack %s with %j", packet.id, packet.data);
                var fn = this.acks[packet.id];
                fn.apply(this, packet.data);
                delete this.acks[packet.id]
            };
            Socket.prototype.onconnect = function () {
                this.connected = true;
                this.disconnected = false;
                this.emit("connect");
                this.emitBuffered()
            };
            Socket.prototype.emitBuffered = function () {
                var i;
                for (i = 0; i < this.receiveBuffer.length; i++) {
                    emit.apply(this, this.receiveBuffer[i])
                }
                this.receiveBuffer = [];
                for (i = 0; i < this.sendBuffer.length; i++) {
                    this.packet(this.sendBuffer[i])
                }
                this.sendBuffer = []
            };
            Socket.prototype.ondisconnect = function () {
                debug("server disconnect (%s)", this.nsp);
                this.destroy();
                this.onclose("io server disconnect")
            };
            Socket.prototype.destroy = function () {
                if (this.subs) {
                    for (var i = 0; i < this.subs.length; i++) {
                        this.subs[i].destroy()
                    }
                    this.subs = null
                }
                this.io.destroy(this)
            };
            Socket.prototype.close = Socket.prototype.disconnect = function () {
                if (this.connected) {
                    debug("performing disconnect (%s)", this.nsp);
                    this.packet({type: parser.DISCONNECT})
                }
                this.destroy();
                if (this.connected) {
                    this.onclose("io client disconnect")
                }
                return this
            }
        }, {
            "./on": 4,
            "component-bind": 8,
            "component-emitter": 9,
            debug: 10,
            "has-binary": 38,
            "socket.io-parser": 46,
            "to-array": 50
        }],
        6: [function (_dereq_, module, exports) {
            (function (global) {
                var parseuri = _dereq_("parseuri");
                var debug = _dereq_("debug")("socket.io-client:url");
                module.exports = url;
                function url(uri, loc) {
                    var obj = uri;
                    var loc = loc || global.location;
                    if (null == uri)uri = loc.protocol + "//" + loc.host;
                    if ("string" == typeof uri) {
                        if ("/" == uri.charAt(0)) {
                            if ("/" == uri.charAt(1)) {
                                uri = loc.protocol + uri
                            } else {
                                uri = loc.hostname + uri
                            }
                        }
                        if (!/^(https?|wss?):\/\//.test(uri)) {
                            debug("protocol-less url %s", uri);
                            if ("undefined" != typeof loc) {
                                uri = loc.protocol + "//" + uri
                            } else {
                                uri = "https://" + uri
                            }
                        }
                        debug("parse %s", uri);
                        obj = parseuri(uri)
                    }
                    if (!obj.port) {
                        if (/^(http|ws)$/.test(obj.protocol)) {
                            obj.port = "80"
                        } else if (/^(http|ws)s$/.test(obj.protocol)) {
                            obj.port = "443"
                        }
                    }
                    obj.path = obj.path || "/";
                    obj.id = obj.protocol + "://" + obj.host + ":" + obj.port;
                    obj.href = obj.protocol + "://" + obj.host + (loc && loc.port == obj.port ? "" : ":" + obj.port);
                    return obj
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {debug: 10, parseuri: 44}],
        7: [function (_dereq_, module, exports) {
            module.exports = Backoff;
            function Backoff(opts) {
                opts = opts || {};
                this.ms = opts.min || 100;
                this.max = opts.max || 1e4;
                this.factor = opts.factor || 2;
                this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
                this.attempts = 0
            }

            Backoff.prototype.duration = function () {
                var ms = this.ms * Math.pow(this.factor, this.attempts++);
                if (this.jitter) {
                    var rand = Math.random();
                    var deviation = Math.floor(rand * this.jitter * ms);
                    ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation
                }
                return Math.min(ms, this.max) | 0
            };
            Backoff.prototype.reset = function () {
                this.attempts = 0
            };
            Backoff.prototype.setMin = function (min) {
                this.ms = min
            };
            Backoff.prototype.setMax = function (max) {
                this.max = max
            };
            Backoff.prototype.setJitter = function (jitter) {
                this.jitter = jitter
            }
        }, {}],
        8: [function (_dereq_, module, exports) {
            var slice = [].slice;
            module.exports = function (obj, fn) {
                if ("string" == typeof fn)fn = obj[fn];
                if ("function" != typeof fn)throw new Error("bind() requires a function");
                var args = slice.call(arguments, 2);
                return function () {
                    return fn.apply(obj, args.concat(slice.call(arguments)))
                }
            }
        }, {}],
        9: [function (_dereq_, module, exports) {
            module.exports = Emitter;
            function Emitter(obj) {
                if (obj)return mixin(obj)
            }

            function mixin(obj) {
                for (var key in Emitter.prototype) {
                    obj[key] = Emitter.prototype[key]
                }
                return obj
            }

            Emitter.prototype.on = Emitter.prototype.addEventListener = function (event, fn) {
                this._callbacks = this._callbacks || {};
                (this._callbacks[event] = this._callbacks[event] || []).push(fn);
                return this
            };
            Emitter.prototype.once = function (event, fn) {
                var self = this;
                this._callbacks = this._callbacks || {};
                function on() {
                    self.off(event, on);
                    fn.apply(this, arguments)
                }

                on.fn = fn;
                this.on(event, on);
                return this
            };
            Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function (event, fn) {
                this._callbacks = this._callbacks || {};
                if (0 == arguments.length) {
                    this._callbacks = {};
                    return this
                }
                var callbacks = this._callbacks[event];
                if (!callbacks)return this;
                if (1 == arguments.length) {
                    delete this._callbacks[event];
                    return this
                }
                var cb;
                for (var i = 0; i < callbacks.length; i++) {
                    cb = callbacks[i];
                    if (cb === fn || cb.fn === fn) {
                        callbacks.splice(i, 1);
                        break
                    }
                }
                return this
            };
            Emitter.prototype.emit = function (event) {
                this._callbacks = this._callbacks || {};
                var args = [].slice.call(arguments, 1), callbacks = this._callbacks[event];
                if (callbacks) {
                    callbacks = callbacks.slice(0);
                    for (var i = 0, len = callbacks.length; i < len; ++i) {
                        callbacks[i].apply(this, args)
                    }
                }
                return this
            };
            Emitter.prototype.listeners = function (event) {
                this._callbacks = this._callbacks || {};
                return this._callbacks[event] || []
            };
            Emitter.prototype.hasListeners = function (event) {
                return !!this.listeners(event).length
            }
        }, {}],
        10: [function (_dereq_, module, exports) {
            module.exports = debug;
            function debug(name) {
                if (!debug.enabled(name))return function () {
                };
                return function (fmt) {
                    fmt = coerce(fmt);
                    var curr = new Date;
                    var ms = curr - (debug[name] || curr);
                    debug[name] = curr;
                    fmt = name + " " + fmt + " +" + debug.humanize(ms);
                    window.console && console.log && Function.prototype.apply.call(console.log, console, arguments)
                }
            }

            debug.names = [];
            debug.skips = [];
            debug.enable = function (name) {
                try {
                    localStorage.debug = name
                } catch (e) {
                }
                var split = (name || "").split(/[\s,]+/), len = split.length;
                for (var i = 0; i < len; i++) {
                    name = split[i].replace("*", ".*?");
                    if (name[0] === "-") {
                        debug.skips.push(new RegExp("^" + name.substr(1) + "$"))
                    } else {
                        debug.names.push(new RegExp("^" + name + "$"))
                    }
                }
            };
            debug.disable = function () {
                debug.enable("")
            };
            debug.humanize = function (ms) {
                var sec = 1e3, min = 60 * 1e3, hour = 60 * min;
                if (ms >= hour)return (ms / hour).toFixed(1) + "h";
                if (ms >= min)return (ms / min).toFixed(1) + "m";
                if (ms >= sec)return (ms / sec | 0) + "s";
                return ms + "ms"
            };
            debug.enabled = function (name) {
                for (var i = 0, len = debug.skips.length; i < len; i++) {
                    if (debug.skips[i].test(name)) {
                        return false
                    }
                }
                for (var i = 0, len = debug.names.length; i < len; i++) {
                    if (debug.names[i].test(name)) {
                        return true
                    }
                }
                return false
            };
            function coerce(val) {
                if (val instanceof Error)return val.stack || val.message;
                return val
            }

            try {
                if (window.localStorage)debug.enable(localStorage.debug)
            } catch (e) {
            }
        }, {}],
        11: [function (_dereq_, module, exports) {
            module.exports = _dereq_("./lib/")
        }, {"./lib/": 12}],
        12: [function (_dereq_, module, exports) {
            module.exports = _dereq_("./socket");
            module.exports.parser = _dereq_("engine.io-parser")
        }, {"./socket": 13, "engine.io-parser": 25}],
        13: [function (_dereq_, module, exports) {
            (function (global) {
                var transports = _dereq_("./transports");
                var Emitter = _dereq_("component-emitter");
                var debug = _dereq_("debug")("engine.io-client:socket");
                var index = _dereq_("indexof");
                var parser = _dereq_("engine.io-parser");
                var parseuri = _dereq_("parseuri");
                var parsejson = _dereq_("parsejson");
                var parseqs = _dereq_("parseqs");
                module.exports = Socket;
                function noop() {
                }

                function Socket(uri, opts) {
                    if (!(this instanceof Socket))return new Socket(uri, opts);
                    opts = opts || {};
                    if (uri && "object" == typeof uri) {
                        opts = uri;
                        uri = null
                    }
                    if (uri) {
                        uri = parseuri(uri);
                        opts.host = uri.host;
                        opts.secure = uri.protocol == "https" || uri.protocol == "wss";
                        opts.port = uri.port;
                        if (uri.query)opts.query = uri.query
                    }
                    this.secure = null != opts.secure ? opts.secure : global.location && "https:" == location.protocol;
                    if (opts.host) {
                        var pieces = opts.host.split(":");
                        opts.hostname = pieces.shift();
                        if (pieces.length) {
                            opts.port = pieces.pop()
                        } else if (!opts.port) {
                            opts.port = this.secure ? "443" : "80"
                        }
                    }
                    this.agent = opts.agent || false;
                    this.hostname = opts.hostname || (global.location ? location.hostname : "localhost");
                    this.port = opts.port || (global.location && location.port ? location.port : this.secure ? 443 : 80);
                    this.query = opts.query || {};
                    if ("string" == typeof this.query)this.query = parseqs.decode(this.query);
                    this.upgrade = false !== opts.upgrade;
                    this.path = (opts.path || "/engine.io").replace(/\/$/, "") + "/";
                    this.forceJSONP = !!opts.forceJSONP;
                    this.jsonp = false !== opts.jsonp;
                    this.forceBase64 = !!opts.forceBase64;
                    this.enablesXDR = !!opts.enablesXDR;
                    this.timestampParam = opts.timestampParam || "t";
                    this.timestampRequests = opts.timestampRequests;
                    this.transports = opts.transports || ["polling", "websocket"];
                    this.readyState = "";
                    this.writeBuffer = [];
                    this.callbackBuffer = [];
                    this.policyPort = opts.policyPort || 843;
                    this.rememberUpgrade = opts.rememberUpgrade || false;
                    this.binaryType = null;
                    this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
                    this.pfx = opts.pfx || null;
                    this.key = opts.key || null;
                    this.passphrase = opts.passphrase || null;
                    this.cert = opts.cert || null;
                    this.ca = opts.ca || null;
                    this.ciphers = opts.ciphers || null;
                    this.rejectUnauthorized = opts.rejectUnauthorized || null;
                    this.open()
                }

                Socket.priorWebsocketSuccess = false;
                Emitter(Socket.prototype);
                Socket.protocol = parser.protocol;
                Socket.Socket = Socket;
                Socket.Transport = _dereq_("./transport");
                Socket.transports = _dereq_("./transports");
                Socket.parser = _dereq_("engine.io-parser");
                Socket.prototype.createTransport = function (name) {
                    debug('creating transport "%s"', name);
                    var query = clone(this.query);
                    query.EIO = parser.protocol;
                    query.transport = name;
                    if (this.id)query.sid = this.id;
                    var transport = new transports[name]({
                        agent: this.agent,
                        hostname: this.hostname,
                        port: this.port,
                        secure: this.secure,
                        path: this.path,
                        query: query,
                        forceJSONP: this.forceJSONP,
                        jsonp: this.jsonp,
                        forceBase64: this.forceBase64,
                        enablesXDR: this.enablesXDR,
                        timestampRequests: this.timestampRequests,
                        timestampParam: this.timestampParam,
                        policyPort: this.policyPort,
                        socket: this,
                        pfx: this.pfx,
                        key: this.key,
                        passphrase: this.passphrase,
                        cert: this.cert,
                        ca: this.ca,
                        ciphers: this.ciphers,
                        rejectUnauthorized: this.rejectUnauthorized
                    });
                    return transport
                };
                function clone(obj) {
                    var o = {};
                    for (var i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            o[i] = obj[i]
                        }
                    }
                    return o
                }

                Socket.prototype.open = function () {
                    var transport;
                    if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf("websocket") != -1) {
                        transport = "websocket"
                    } else if (0 == this.transports.length) {
                        var self = this;
                        setTimeout(function () {
                            self.emit("error", "No transports available")
                        }, 0);
                        return
                    } else {
                        transport = this.transports[0]
                    }
                    this.readyState = "opening";
                    var transport;
                    try {
                        transport = this.createTransport(transport)
                    } catch (e) {
                        this.transports.shift();
                        this.open();
                        return
                    }
                    transport.open();
                    this.setTransport(transport)
                };
                Socket.prototype.setTransport = function (transport) {
                    debug("setting transport %s", transport.name);
                    var self = this;
                    if (this.transport) {
                        debug("clearing existing transport %s", this.transport.name);
                        this.transport.removeAllListeners()
                    }
                    this.transport = transport;
                    transport.on("drain", function () {
                        self.onDrain()
                    }).on("packet", function (packet) {
                        self.onPacket(packet)
                    }).on("error", function (e) {
                        self.onError(e)
                    }).on("close", function () {
                        self.onClose("transport close")
                    })
                };
                Socket.prototype.probe = function (name) {
                    debug('probing transport "%s"', name);
                    var transport = this.createTransport(name, {probe: 1}), failed = false, self = this;
                    Socket.priorWebsocketSuccess = false;
                    function onTransportOpen() {
                        if (self.onlyBinaryUpgrades) {
                            var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
                            failed = failed || upgradeLosesBinary
                        }
                        if (failed)return;
                        debug('probe transport "%s" opened', name);
                        transport.send([{type: "ping", data: "probe"}]);
                        transport.once("packet", function (msg) {
                            if (failed)return;
                            if ("pong" == msg.type && "probe" == msg.data) {
                                debug('probe transport "%s" pong', name);
                                self.upgrading = true;
                                self.emit("upgrading", transport);
                                if (!transport)return;
                                Socket.priorWebsocketSuccess = "websocket" == transport.name;
                                debug('pausing current transport "%s"', self.transport.name);
                                self.transport.pause(function () {
                                    if (failed)return;
                                    if ("closed" == self.readyState)return;
                                    debug("changing transport and sending upgrade packet");
                                    cleanup();
                                    self.setTransport(transport);
                                    transport.send([{type: "upgrade"}]);
                                    self.emit("upgrade", transport);
                                    transport = null;
                                    self.upgrading = false;
                                    self.flush()
                                })
                            } else {
                                debug('probe transport "%s" failed', name);
                                var err = new Error("probe error");
                                err.transport = transport.name;
                                self.emit("upgradeError", err)
                            }
                        })
                    }

                    function freezeTransport() {
                        if (failed)return;
                        failed = true;
                        cleanup();
                        transport.close();
                        transport = null
                    }

                    function onerror(err) {
                        var error = new Error("probe error: " + err);
                        error.transport = transport.name;
                        freezeTransport();
                        debug('probe transport "%s" failed because of error: %s', name, err);
                        self.emit("upgradeError", error)
                    }

                    function onTransportClose() {
                        onerror("transport closed")
                    }

                    function onclose() {
                        onerror("socket closed")
                    }

                    function onupgrade(to) {
                        if (transport && to.name != transport.name) {
                            debug('"%s" works - aborting "%s"', to.name, transport.name);
                            freezeTransport()
                        }
                    }

                    function cleanup() {
                        transport.removeListener("open", onTransportOpen);
                        transport.removeListener("error", onerror);
                        transport.removeListener("close", onTransportClose);
                        self.removeListener("close", onclose);
                        self.removeListener("upgrading", onupgrade)
                    }

                    transport.once("open", onTransportOpen);
                    transport.once("error", onerror);
                    transport.once("close", onTransportClose);
                    this.once("close", onclose);
                    this.once("upgrading", onupgrade);
                    transport.open()
                };
                Socket.prototype.onOpen = function () {
                    debug("socket open");
                    this.readyState = "open";
                    Socket.priorWebsocketSuccess = "websocket" == this.transport.name;
                    this.emit("open");
                    this.flush();
                    if ("open" == this.readyState && this.upgrade && this.transport.pause) {
                        debug("starting upgrade probes");
                        for (var i = 0, l = this.upgrades.length; i < l; i++) {
                            this.probe(this.upgrades[i])
                        }
                    }
                };
                Socket.prototype.onPacket = function (packet) {
                    if ("opening" == this.readyState || "open" == this.readyState) {
                        debug('socket receive: type "%s", data "%s"', packet.type, packet.data);
                        this.emit("packet", packet);
                        this.emit("heartbeat");
                        switch (packet.type) {
                            case"open":
                                this.onHandshake(parsejson(packet.data));
                                break;
                            case"pong":
                                this.setPing();
                                break;
                            case"error":
                                var err = new Error("server error");
                                err.code = packet.data;
                                this.emit("error", err);
                                break;
                            case"message":
                                this.emit("data", packet.data);
                                this.emit("message", packet.data);
                                break
                        }
                    } else {
                        debug('packet received with socket readyState "%s"', this.readyState)
                    }
                };
                Socket.prototype.onHandshake = function (data) {
                    this.emit("handshake", data);
                    this.id = data.sid;
                    this.transport.query.sid = data.sid;
                    this.upgrades = this.filterUpgrades(data.upgrades);
                    this.pingInterval = data.pingInterval;
                    this.pingTimeout = data.pingTimeout;
                    this.onOpen();
                    if ("closed" == this.readyState)return;
                    this.setPing();
                    this.removeListener("heartbeat", this.onHeartbeat);
                    this.on("heartbeat", this.onHeartbeat)
                };
                Socket.prototype.onHeartbeat = function (timeout) {
                    clearTimeout(this.pingTimeoutTimer);
                    var self = this;
                    self.pingTimeoutTimer = setTimeout(function () {
                        if ("closed" == self.readyState)return;
                        self.onClose("ping timeout")
                    }, timeout || self.pingInterval + self.pingTimeout)
                };
                Socket.prototype.setPing = function () {
                    var self = this;
                    clearTimeout(self.pingIntervalTimer);
                    self.pingIntervalTimer = setTimeout(function () {
                        debug("writing ping packet - expecting pong within %sms", self.pingTimeout);
                        self.ping();
                        self.onHeartbeat(self.pingTimeout)
                    }, self.pingInterval)
                };
                Socket.prototype.ping = function () {
                    this.sendPacket("ping")
                };
                Socket.prototype.onDrain = function () {
                    for (var i = 0; i < this.prevBufferLen; i++) {
                        if (this.callbackBuffer[i]) {
                            this.callbackBuffer[i]()
                        }
                    }
                    this.writeBuffer.splice(0, this.prevBufferLen);
                    this.callbackBuffer.splice(0, this.prevBufferLen);
                    this.prevBufferLen = 0;
                    if (this.writeBuffer.length == 0) {
                        this.emit("drain")
                    } else {
                        this.flush()
                    }
                };
                Socket.prototype.flush = function () {
                    if ("closed" != this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
                        debug("flushing %d packets in socket", this.writeBuffer.length);
                        this.transport.send(this.writeBuffer);
                        this.prevBufferLen = this.writeBuffer.length;
                        this.emit("flush")
                    }
                };
                Socket.prototype.write = Socket.prototype.send = function (msg, fn) {
                    this.sendPacket("message", msg, fn);
                    return this
                };
                Socket.prototype.sendPacket = function (type, data, fn) {
                    if ("closing" == this.readyState || "closed" == this.readyState) {
                        return
                    }
                    var packet = {type: type, data: data};
                    this.emit("packetCreate", packet);
                    this.writeBuffer.push(packet);
                    this.callbackBuffer.push(fn);
                    this.flush()
                };
                Socket.prototype.close = function () {
                    if ("opening" == this.readyState || "open" == this.readyState) {
                        this.readyState = "closing";
                        var self = this;

                        function close() {
                            self.onClose("forced close");
                            debug("socket closing - telling transport to close");
                            self.transport.close()
                        }

                        function cleanupAndClose() {
                            self.removeListener("upgrade", cleanupAndClose);
                            self.removeListener("upgradeError", cleanupAndClose);
                            close()
                        }

                        function waitForUpgrade() {
                            self.once("upgrade", cleanupAndClose);
                            self.once("upgradeError", cleanupAndClose)
                        }

                        if (this.writeBuffer.length) {
                            this.once("drain", function () {
                                if (this.upgrading) {
                                    waitForUpgrade()
                                } else {
                                    close()
                                }
                            })
                        } else if (this.upgrading) {
                            waitForUpgrade()
                        } else {
                            close()
                        }
                    }
                    return this
                };
                Socket.prototype.onError = function (err) {
                    debug("socket error %j", err);
                    Socket.priorWebsocketSuccess = false;
                    this.emit("error", err);
                    this.onClose("transport error", err)
                };
                Socket.prototype.onClose = function (reason, desc) {
                    if ("opening" == this.readyState || "open" == this.readyState || "closing" == this.readyState) {
                        debug('socket close with reason: "%s"', reason);
                        var self = this;
                        clearTimeout(this.pingIntervalTimer);
                        clearTimeout(this.pingTimeoutTimer);
                        setTimeout(function () {
                            self.writeBuffer = [];
                            self.callbackBuffer = [];
                            self.prevBufferLen = 0
                        }, 0);
                        this.transport.removeAllListeners("close");
                        this.transport.close();
                        this.transport.removeAllListeners();
                        this.readyState = "closed";
                        this.id = null;
                        this.emit("close", reason, desc)
                    }
                };
                Socket.prototype.filterUpgrades = function (upgrades) {
                    var filteredUpgrades = [];
                    for (var i = 0, j = upgrades.length; i < j; i++) {
                        if (~index(this.transports, upgrades[i]))filteredUpgrades.push(upgrades[i])
                    }
                    return filteredUpgrades
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "./transport": 14,
            "./transports": 15,
            "component-emitter": 9,
            debug: 22,
            "engine.io-parser": 25,
            indexof: 42,
            parsejson: 34,
            parseqs: 35,
            parseuri: 36
        }],
        14: [function (_dereq_, module, exports) {
            var parser = _dereq_("engine.io-parser");
            var Emitter = _dereq_("component-emitter");
            module.exports = Transport;
            function Transport(opts) {
                this.path = opts.path;
                this.hostname = opts.hostname;
                this.port = opts.port;
                this.secure = opts.secure;
                this.query = opts.query;
                this.timestampParam = opts.timestampParam;
                this.timestampRequests = opts.timestampRequests;
                this.readyState = "";
                this.agent = opts.agent || false;
                this.socket = opts.socket;
                this.enablesXDR = opts.enablesXDR;
                this.pfx = opts.pfx;
                this.key = opts.key;
                this.passphrase = opts.passphrase;
                this.cert = opts.cert;
                this.ca = opts.ca;
                this.ciphers = opts.ciphers;
                this.rejectUnauthorized = opts.rejectUnauthorized
            }

            Emitter(Transport.prototype);
            Transport.timestamps = 0;
            Transport.prototype.onError = function (msg, desc) {
                var err = new Error(msg);
                err.type = "TransportError";
                err.description = desc;
                this.emit("error", err);
                return this
            };
            Transport.prototype.open = function () {
                if ("closed" == this.readyState || "" == this.readyState) {
                    this.readyState = "opening";
                    this.doOpen()
                }
                return this
            };
            Transport.prototype.close = function () {
                if ("opening" == this.readyState || "open" == this.readyState) {
                    this.doClose();
                    this.onClose()
                }
                return this
            };
            Transport.prototype.send = function (packets) {
                if ("open" == this.readyState) {
                    this.write(packets)
                } else {
                    throw new Error("Transport not open")
                }
            };
            Transport.prototype.onOpen = function () {
                this.readyState = "open";
                this.writable = true;
                this.emit("open")
            };
            Transport.prototype.onData = function (data) {
                var packet = parser.decodePacket(data, this.socket.binaryType);
                this.onPacket(packet)
            };
            Transport.prototype.onPacket = function (packet) {
                this.emit("packet", packet)
            };
            Transport.prototype.onClose = function () {
                this.readyState = "closed";
                this.emit("close")
            }
        }, {"component-emitter": 9, "engine.io-parser": 25}],
        15: [function (_dereq_, module, exports) {
            (function (global) {
                var XMLHttpRequest = _dereq_("xmlhttprequest");
                var XHR = _dereq_("./polling-xhr");
                var JSONP = _dereq_("./polling-jsonp");
                var websocket = _dereq_("./websocket");
                exports.polling = polling;
                exports.websocket = websocket;
                function polling(opts) {
                    var xhr;
                    var xd = false;
                    var xs = false;
                    var jsonp = false !== opts.jsonp;
                    if (global.location) {
                        var isSSL = "https:" == location.protocol;
                        var port = location.port;
                        if (!port) {
                            port = isSSL ? 443 : 80
                        }
                        xd = opts.hostname != location.hostname || port != opts.port;
                        xs = opts.secure != isSSL
                    }
                    opts.xdomain = xd;
                    opts.xscheme = xs;
                    xhr = new XMLHttpRequest(opts);
                    if ("open"in xhr && !opts.forceJSONP) {
                        return new XHR(opts)
                    } else {
                        if (!jsonp)throw new Error("JSONP disabled");
                        return new JSONP(opts)
                    }
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {"./polling-jsonp": 16, "./polling-xhr": 17, "./websocket": 19, xmlhttprequest: 20}],
        16: [function (_dereq_, module, exports) {
            (function (global) {
                var Polling = _dereq_("./polling");
                var inherit = _dereq_("component-inherit");
                module.exports = JSONPPolling;
                var rNewline = /\n/g;
                var rEscapedNewline = /\\n/g;
                var callbacks;
                var index = 0;

                function empty() {
                }

                function JSONPPolling(opts) {
                    Polling.call(this, opts);
                    this.query = this.query || {};
                    if (!callbacks) {
                        if (!global.___eio)global.___eio = [];
                        callbacks = global.___eio
                    }
                    this.index = callbacks.length;
                    var self = this;
                    callbacks.push(function (msg) {
                        self.onData(msg)
                    });
                    this.query.j = this.index;
                    if (global.document && global.addEventListener) {
                        global.addEventListener("beforeunload", function () {
                            if (self.script)self.script.onerror = empty
                        }, false)
                    }
                }

                inherit(JSONPPolling, Polling);
                JSONPPolling.prototype.supportsBinary = false;
                JSONPPolling.prototype.doClose = function () {
                    if (this.script) {
                        this.script.parentNode.removeChild(this.script);
                        this.script = null
                    }
                    if (this.form) {
                        this.form.parentNode.removeChild(this.form);
                        this.form = null;
                        this.iframe = null
                    }
                    Polling.prototype.doClose.call(this)
                };
                JSONPPolling.prototype.doPoll = function () {
                    var self = this;
                    var script = document.createElement("script");
                    if (this.script) {
                        this.script.parentNode.removeChild(this.script);
                        this.script = null
                    }
                    script.async = true;
                    script.src = this.uri();
                    script.onerror = function (e) {
                        self.onError("jsonp poll error", e)
                    };
                    var insertAt = document.getElementsByTagName("script")[0];
                    insertAt.parentNode.insertBefore(script, insertAt);
                    this.script = script;
                    var isUAgecko = "undefined" != typeof navigator && /gecko/i.test(navigator.userAgent);
                    if (isUAgecko) {
                        setTimeout(function () {
                            var iframe = document.createElement("iframe");
                            document.body.appendChild(iframe);
                            document.body.removeChild(iframe)
                        }, 100)
                    }
                };
                JSONPPolling.prototype.doWrite = function (data, fn) {
                    var self = this;
                    if (!this.form) {
                        var form = document.createElement("form");
                        var area = document.createElement("textarea");
                        var id = this.iframeId = "eio_iframe_" + this.index;
                        var iframe;
                        form.className = "socketio";
                        form.style.position = "absolute";
                        form.style.top = "-1000px";
                        form.style.left = "-1000px";
                        form.target = id;
                        form.method = "POST";
                        form.setAttribute("accept-charset", "utf-8");
                        area.name = "d";
                        form.appendChild(area);
                        document.body.appendChild(form);
                        this.form = form;
                        this.area = area
                    }
                    this.form.action = this.uri();
                    function complete() {
                        initIframe();
                        fn()
                    }

                    function initIframe() {
                        if (self.iframe) {
                            try {
                                self.form.removeChild(self.iframe)
                            } catch (e) {
                                self.onError("jsonp polling iframe removal error", e)
                            }
                        }
                        try {
                            var html = '<iframe src="javascript:0" name="' + self.iframeId + '">';
                            iframe = document.createElement(html)
                        } catch (e) {
                            iframe = document.createElement("iframe");
                            iframe.name = self.iframeId;
                            iframe.src = "javascript:0"
                        }
                        iframe.id = self.iframeId;
                        self.form.appendChild(iframe);
                        self.iframe = iframe
                    }

                    initIframe();
                    data = data.replace(rEscapedNewline, "\\\n");
                    this.area.value = data.replace(rNewline, "\\n");
                    try {
                        this.form.submit()
                    } catch (e) {
                    }
                    if (this.iframe.attachEvent) {
                        this.iframe.onreadystatechange = function () {
                            if (self.iframe.readyState == "complete") {
                                complete()
                            }
                        }
                    } else {
                        this.iframe.onload = complete
                    }
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {"./polling": 18, "component-inherit": 21}],
        17: [function (_dereq_, module, exports) {
            (function (global) {
                var XMLHttpRequest = _dereq_("xmlhttprequest");
                var Polling = _dereq_("./polling");
                var Emitter = _dereq_("component-emitter");
                var inherit = _dereq_("component-inherit");
                var debug = _dereq_("debug")("engine.io-client:polling-xhr");
                module.exports = XHR;
                module.exports.Request = Request;
                function empty() {
                }

                function XHR(opts) {
                    Polling.call(this, opts);
                    if (global.location) {
                        var isSSL = "https:" == location.protocol;
                        var port = location.port;
                        if (!port) {
                            port = isSSL ? 443 : 80
                        }
                        this.xd = opts.hostname != global.location.hostname || port != opts.port;
                        this.xs = opts.secure != isSSL
                    }
                }

                inherit(XHR, Polling);
                XHR.prototype.supportsBinary = true;
                XHR.prototype.request = function (opts) {
                    opts = opts || {};
                    opts.uri = this.uri();
                    opts.xd = this.xd;
                    opts.xs = this.xs;
                    opts.agent = this.agent || false;
                    opts.supportsBinary = this.supportsBinary;
                    opts.enablesXDR = this.enablesXDR;
                    opts.pfx = this.pfx;
                    opts.key = this.key;
                    opts.passphrase = this.passphrase;
                    opts.cert = this.cert;
                    opts.ca = this.ca;
                    opts.ciphers = this.ciphers;
                    opts.rejectUnauthorized = this.rejectUnauthorized;
                    return new Request(opts)
                };
                XHR.prototype.doWrite = function (data, fn) {
                    var isBinary = typeof data !== "string" && data !== undefined;
                    var req = this.request({method: "POST", data: data, isBinary: isBinary});
                    var self = this;
                    req.on("success", fn);
                    req.on("error", function (err) {
                        self.onError("xhr post error", err)
                    });
                    this.sendXhr = req
                };
                XHR.prototype.doPoll = function () {
                    debug("xhr poll");
                    var req = this.request();
                    var self = this;
                    req.on("data", function (data) {
                        self.onData(data)
                    });
                    req.on("error", function (err) {
                        self.onError("xhr poll error", err)
                    });
                    this.pollXhr = req
                };
                function Request(opts) {
                    this.method = opts.method || "GET";
                    this.uri = opts.uri;
                    this.xd = !!opts.xd;
                    this.xs = !!opts.xs;
                    this.async = false !== opts.async;
                    this.data = undefined != opts.data ? opts.data : null;
                    this.agent = opts.agent;
                    this.isBinary = opts.isBinary;
                    this.supportsBinary = opts.supportsBinary;
                    this.enablesXDR = opts.enablesXDR;
                    this.pfx = opts.pfx;
                    this.key = opts.key;
                    this.passphrase = opts.passphrase;
                    this.cert = opts.cert;
                    this.ca = opts.ca;
                    this.ciphers = opts.ciphers;
                    this.rejectUnauthorized = opts.rejectUnauthorized;
                    this.create()
                }

                Emitter(Request.prototype);
                Request.prototype.create = function () {
                    var opts = {agent: this.agent, xdomain: this.xd, xscheme: this.xs, enablesXDR: this.enablesXDR};
                    opts.pfx = this.pfx;
                    opts.key = this.key;
                    opts.passphrase = this.passphrase;
                    opts.cert = this.cert;
                    opts.ca = this.ca;
                    opts.ciphers = this.ciphers;
                    opts.rejectUnauthorized = this.rejectUnauthorized;
                    var xhr = this.xhr = new XMLHttpRequest(opts);
                    var self = this;
                    try {
                        debug("xhr open %s: %s", this.method, this.uri);
                        xhr.open(this.method, this.uri, this.async);
                        if (this.supportsBinary) {
                            xhr.responseType = "arraybuffer"
                        }
                        if ("POST" == this.method) {
                            try {
                                if (this.isBinary) {
                                    xhr.setRequestHeader("Content-type", "application/octet-stream")
                                } else {
                                    xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8")
                                }
                            } catch (e) {
                            }
                        }
                        if ("withCredentials"in xhr) {
                            xhr.withCredentials = true
                        }
                        if (this.hasXDR()) {
                            xhr.onload = function () {
                                self.onLoad()
                            };
                            xhr.onerror = function () {
                                self.onError(xhr.responseText)
                            }
                        } else {
                            xhr.onreadystatechange = function () {
                                if (4 != xhr.readyState)return;
                                if (200 == xhr.status || 1223 == xhr.status) {
                                    self.onLoad()
                                } else {
                                    setTimeout(function () {
                                        self.onError(xhr.status)
                                    }, 0)
                                }
                            }
                        }
                        debug("xhr data %s", this.data);
                        xhr.send(this.data)
                    } catch (e) {
                        setTimeout(function () {
                            self.onError(e)
                        }, 0);
                        return
                    }
                    if (global.document) {
                        this.index = Request.requestsCount++;
                        Request.requests[this.index] = this
                    }
                };
                Request.prototype.onSuccess = function () {
                    this.emit("success");
                    this.cleanup()
                };
                Request.prototype.onData = function (data) {
                    this.emit("data", data);
                    this.onSuccess()
                };
                Request.prototype.onError = function (err) {
                    this.emit("error", err);
                    this.cleanup(true)
                };
                Request.prototype.cleanup = function (fromError) {
                    if ("undefined" == typeof this.xhr || null === this.xhr) {
                        return
                    }
                    if (this.hasXDR()) {
                        this.xhr.onload = this.xhr.onerror = empty
                    } else {
                        this.xhr.onreadystatechange = empty
                    }
                    if (fromError) {
                        try {
                            this.xhr.abort()
                        } catch (e) {
                        }
                    }
                    if (global.document) {
                        delete Request.requests[this.index]
                    }
                    this.xhr = null
                };
                Request.prototype.onLoad = function () {
                    var data;
                    try {
                        var contentType;
                        try {
                            contentType = this.xhr.getResponseHeader("Content-Type").split(";")[0]
                        } catch (e) {
                        }
                        if (contentType === "application/octet-stream") {
                            data = this.xhr.response
                        } else {
                            if (!this.supportsBinary) {
                                data = this.xhr.responseText
                            } else {
                                data = "ok"
                            }
                        }
                    } catch (e) {
                        this.onError(e)
                    }
                    if (null != data) {
                        this.onData(data)
                    }
                };
                Request.prototype.hasXDR = function () {
                    return "undefined" !== typeof global.XDomainRequest && !this.xs && this.enablesXDR
                };
                Request.prototype.abort = function () {
                    this.cleanup()
                };
                if (global.document) {
                    Request.requestsCount = 0;
                    Request.requests = {};
                    if (global.attachEvent) {
                        global.attachEvent("onunload", unloadHandler)
                    } else if (global.addEventListener) {
                        global.addEventListener("beforeunload", unloadHandler, false)
                    }
                }
                function unloadHandler() {
                    for (var i in Request.requests) {
                        if (Request.requests.hasOwnProperty(i)) {
                            Request.requests[i].abort()
                        }
                    }
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {"./polling": 18, "component-emitter": 9, "component-inherit": 21, debug: 22, xmlhttprequest: 20}],
        18: [function (_dereq_, module, exports) {
            var Transport = _dereq_("../transport");
            var parseqs = _dereq_("parseqs");
            var parser = _dereq_("engine.io-parser");
            var inherit = _dereq_("component-inherit");
            var debug = _dereq_("debug")("engine.io-client:polling");
            module.exports = Polling;
            var hasXHR2 = function () {
                var XMLHttpRequest = _dereq_("xmlhttprequest");
                var xhr = new XMLHttpRequest({xdomain: false});
                return null != xhr.responseType
            }();

            function Polling(opts) {
                var forceBase64 = opts && opts.forceBase64;
                if (!hasXHR2 || forceBase64) {
                    this.supportsBinary = false
                }
                Transport.call(this, opts)
            }

            inherit(Polling, Transport);
            Polling.prototype.name = "polling";
            Polling.prototype.doOpen = function () {
                this.poll()
            };
            Polling.prototype.pause = function (onPause) {
                var pending = 0;
                var self = this;
                this.readyState = "pausing";
                function pause() {
                    debug("paused");
                    self.readyState = "paused";
                    onPause()
                }

                if (this.polling || !this.writable) {
                    var total = 0;
                    if (this.polling) {
                        debug("we are currently polling - waiting to pause");
                        total++;
                        this.once("pollComplete", function () {
                            debug("pre-pause polling complete");
                            --total || pause()
                        })
                    }
                    if (!this.writable) {
                        debug("we are currently writing - waiting to pause");
                        total++;
                        this.once("drain", function () {
                            debug("pre-pause writing complete");
                            --total || pause()
                        })
                    }
                } else {
                    pause()
                }
            };
            Polling.prototype.poll = function () {
                debug("polling");
                this.polling = true;
                this.doPoll();
                this.emit("poll")
            };
            Polling.prototype.onData = function (data) {
                var self = this;
                debug("polling got data %s", data);
                var callback = function (packet, index, total) {
                    if ("opening" == self.readyState) {
                        self.onOpen()
                    }
                    if ("close" == packet.type) {
                        self.onClose();
                        return false
                    }
                    self.onPacket(packet)
                };
                parser.decodePayload(data, this.socket.binaryType, callback);
                if ("closed" != this.readyState) {
                    this.polling = false;
                    this.emit("pollComplete");
                    if ("open" == this.readyState) {
                        this.poll()
                    } else {
                        debug('ignoring poll - transport state "%s"', this.readyState)
                    }
                }
            };
            Polling.prototype.doClose = function () {
                var self = this;

                function close() {
                    debug("writing close packet");
                    self.write([{type: "close"}])
                }

                if ("open" == this.readyState) {
                    debug("transport open - closing");
                    close()
                } else {
                    debug("transport not open - deferring close");
                    this.once("open", close)
                }
            };
            Polling.prototype.write = function (packets) {
                var self = this;
                this.writable = false;
                var callbackfn = function () {
                    self.writable = true;
                    self.emit("drain")
                };
                var self = this;
                parser.encodePayload(packets, this.supportsBinary, function (data) {
                    self.doWrite(data, callbackfn)
                })
            };
            Polling.prototype.uri = function () {
                var query = this.query || {};
                var schema = this.secure ? "https" : "http";
                var port = "";
                if (false !== this.timestampRequests) {
                    query[this.timestampParam] = +new Date + "-" + Transport.timestamps++
                }
                if (!this.supportsBinary && !query.sid) {
                    query.b64 = 1
                }
                query = parseqs.encode(query);
                if (this.port && ("https" == schema && this.port != 443 || "http" == schema && this.port != 80)) {
                    port = ":" + this.port
                }
                if (query.length) {
                    query = "?" + query
                }
                return schema + "://" + this.hostname + port + this.path + query
            }
        }, {
            "../transport": 14,
            "component-inherit": 21,
            debug: 22,
            "engine.io-parser": 25,
            parseqs: 35,
            xmlhttprequest: 20
        }],
        19: [function (_dereq_, module, exports) {
            var Transport = _dereq_("../transport");
            var parser = _dereq_("engine.io-parser");
            var parseqs = _dereq_("parseqs");
            var inherit = _dereq_("component-inherit");
            var debug = _dereq_("debug")("engine.io-client:websocket");
            var WebSocket = _dereq_("ws");
            module.exports = WS;
            function WS(opts) {
                var forceBase64 = opts && opts.forceBase64;
                if (forceBase64) {
                    this.supportsBinary = false
                }
                Transport.call(this, opts)
            }

            inherit(WS, Transport);
            WS.prototype.name = "websocket";
            WS.prototype.supportsBinary = true;
            WS.prototype.doOpen = function () {
                if (!this.check()) {
                    return
                }
                var self = this;
                var uri = this.uri();
                var protocols = void 0;
                var opts = {agent: this.agent};
                opts.pfx = this.pfx;
                opts.key = this.key;
                opts.passphrase = this.passphrase;
                opts.cert = this.cert;
                opts.ca = this.ca;
                opts.ciphers = this.ciphers;
                opts.rejectUnauthorized = this.rejectUnauthorized;
                this.ws = new WebSocket(uri, protocols, opts);
                if (this.ws.binaryType === undefined) {
                    this.supportsBinary = false
                }
                this.ws.binaryType = "arraybuffer";
                this.addEventListeners()
            };
            WS.prototype.addEventListeners = function () {
                var self = this;
                this.ws.onopen = function () {
                    self.onOpen()
                };
                this.ws.onclose = function () {
                    self.onClose()
                };
                this.ws.onmessage = function (ev) {
                    self.onData(ev.data)
                };
                this.ws.onerror = function (e) {
                    self.onError("websocket error", e)
                }
            };
            if ("undefined" != typeof navigator && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
                WS.prototype.onData = function (data) {
                    var self = this;
                    setTimeout(function () {
                        Transport.prototype.onData.call(self, data)
                    }, 0)
                }
            }
            WS.prototype.write = function (packets) {
                var self = this;
                this.writable = false;
                for (var i = 0, l = packets.length; i < l; i++) {
                    parser.encodePacket(packets[i], this.supportsBinary, function (data) {
                        try {
                            self.ws.send(data)
                        } catch (e) {
                            debug("websocket closed before onclose event")
                        }
                    })
                }
                function ondrain() {
                    self.writable = true;
                    self.emit("drain")
                }

                setTimeout(ondrain, 0)
            };
            WS.prototype.onClose = function () {
                Transport.prototype.onClose.call(this)
            };
            WS.prototype.doClose = function () {
                if (typeof this.ws !== "undefined") {
                    this.ws.close()
                }
            };
            WS.prototype.uri = function () {
                var query = this.query || {};
                var schema = this.secure ? "wss" : "ws";
                var port = "";
                if (this.port && ("wss" == schema && this.port != 443 || "ws" == schema && this.port != 80)) {
                    port = ":" + this.port
                }
                if (this.timestampRequests) {
                    query[this.timestampParam] = +new Date
                }
                if (!this.supportsBinary) {
                    query.b64 = 1
                }
                query = parseqs.encode(query);
                if (query.length) {
                    query = "?" + query
                }
                return schema + "://" + this.hostname + port + this.path + query
            };
            WS.prototype.check = function () {
                return !!WebSocket && !("__initialize"in WebSocket && this.name === WS.prototype.name)
            }
        }, {"../transport": 14, "component-inherit": 21, debug: 22, "engine.io-parser": 25, parseqs: 35, ws: 37}],
        20: [function (_dereq_, module, exports) {
            var hasCORS = _dereq_("has-cors");
            module.exports = function (opts) {
                var xdomain = opts.xdomain;
                var xscheme = opts.xscheme;
                var enablesXDR = opts.enablesXDR;
                try {
                    if ("undefined" != typeof XMLHttpRequest && (!xdomain || hasCORS)) {
                        return new XMLHttpRequest
                    }
                } catch (e) {
                }
                try {
                    if ("undefined" != typeof XDomainRequest && !xscheme && enablesXDR) {
                        return new XDomainRequest
                    }
                } catch (e) {
                }
                if (!xdomain) {
                    try {
                        return new ActiveXObject("Microsoft.XMLHTTP")
                    } catch (e) {
                    }
                }
            }
        }, {"has-cors": 40}],
        21: [function (_dereq_, module, exports) {
            module.exports = function (a, b) {
                var fn = function () {
                };
                fn.prototype = b.prototype;
                a.prototype = new fn;
                a.prototype.constructor = a
            }
        }, {}],
        22: [function (_dereq_, module, exports) {
            exports = module.exports = _dereq_("./debug");
            exports.log = log;
            exports.formatArgs = formatArgs;
            exports.save = save;
            exports.load = load;
            exports.useColors = useColors;
            exports.colors = ["lightseagreen", "forestgreen", "goldenrod", "dodgerblue", "darkorchid", "crimson"];
            function useColors() {
                return "WebkitAppearance"in document.documentElement.style || window.console && (console.firebug || console.exception && console.table) || navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31
            }

            exports.formatters.j = function (v) {
                return JSON.stringify(v)
            };
            function formatArgs() {
                var args = arguments;
                var useColors = this.useColors;
                args[0] = (useColors ? "%c" : "") + this.namespace + (useColors ? " %c" : " ") + args[0] + (useColors ? "%c " : " ") + "+" + exports.humanize(this.diff);
                if (!useColors)return args;
                var c = "color: " + this.color;
                args = [args[0], c, "color: inherit"].concat(Array.prototype.slice.call(args, 1));
                var index = 0;
                var lastC = 0;
                args[0].replace(/%[a-z%]/g, function (match) {
                    if ("%" === match)return;
                    index++;
                    if ("%c" === match) {
                        lastC = index
                    }
                });
                args.splice(lastC, 0, c);
                return args
            }

            function log() {
                return "object" == typeof console && "function" == typeof console.log && Function.prototype.apply.call(console.log, console, arguments)
            }

            function save(namespaces) {
                try {
                    if (null == namespaces) {
                        localStorage.removeItem("debug")
                    } else {
                        localStorage.debug = namespaces
                    }
                } catch (e) {
                }
            }

            function load() {
                var r;
                try {
                    r = localStorage.debug
                } catch (e) {
                }
                return r
            }

            exports.enable(load())
        }, {"./debug": 23}],
        23: [function (_dereq_, module, exports) {
            exports = module.exports = debug;
            exports.coerce = coerce;
            exports.disable = disable;
            exports.enable = enable;
            exports.enabled = enabled;
            exports.humanize = _dereq_("ms");
            exports.names = [];
            exports.skips = [];
            exports.formatters = {};
            var prevColor = 0;
            var prevTime;

            function selectColor() {
                return exports.colors[prevColor++ % exports.colors.length]
            }

            function debug(namespace) {
                function disabled() {
                }

                disabled.enabled = false;
                function enabled() {
                    var self = enabled;
                    var curr = +new Date;
                    var ms = curr - (prevTime || curr);
                    self.diff = ms;
                    self.prev = prevTime;
                    self.curr = curr;
                    prevTime = curr;
                    if (null == self.useColors)self.useColors = exports.useColors();
                    if (null == self.color && self.useColors)self.color = selectColor();
                    var args = Array.prototype.slice.call(arguments);
                    args[0] = exports.coerce(args[0]);
                    if ("string" !== typeof args[0]) {
                        args = ["%o"].concat(args)
                    }
                    var index = 0;
                    args[0] = args[0].replace(/%([a-z%])/g, function (match, format) {
                        if (match === "%")return match;
                        index++;
                        var formatter = exports.formatters[format];
                        if ("function" === typeof formatter) {
                            var val = args[index];
                            match = formatter.call(self, val);
                            args.splice(index, 1);
                            index--
                        }
                        return match
                    });
                    if ("function" === typeof exports.formatArgs) {
                        args = exports.formatArgs.apply(self, args)
                    }
                    var logFn = enabled.log || exports.log || console.log.bind(console);
                    logFn.apply(self, args)
                }

                enabled.enabled = true;
                var fn = exports.enabled(namespace) ? enabled : disabled;
                fn.namespace = namespace;
                return fn
            }

            function enable(namespaces) {
                exports.save(namespaces);
                var split = (namespaces || "").split(/[\s,]+/);
                var len = split.length;
                for (var i = 0; i < len; i++) {
                    if (!split[i])continue;
                    namespaces = split[i].replace(/\*/g, ".*?");
                    if (namespaces[0] === "-") {
                        exports.skips.push(new RegExp("^" + namespaces.substr(1) + "$"))
                    } else {
                        exports.names.push(new RegExp("^" + namespaces + "$"))
                    }
                }
            }

            function disable() {
                exports.enable("")
            }

            function enabled(name) {
                var i, len;
                for (i = 0, len = exports.skips.length; i < len; i++) {
                    if (exports.skips[i].test(name)) {
                        return false
                    }
                }
                for (i = 0, len = exports.names.length; i < len; i++) {
                    if (exports.names[i].test(name)) {
                        return true
                    }
                }
                return false
            }

            function coerce(val) {
                if (val instanceof Error)return val.stack || val.message;
                return val
            }
        }, {ms: 24}],
        24: [function (_dereq_, module, exports) {
            var s = 1e3;
            var m = s * 60;
            var h = m * 60;
            var d = h * 24;
            var y = d * 365.25;
            module.exports = function (val, options) {
                options = options || {};
                if ("string" == typeof val)return parse(val);
                return options.long ? long(val) : short(val)
            };
            function parse(str) {
                var match = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
                if (!match)return;
                var n = parseFloat(match[1]);
                var type = (match[2] || "ms").toLowerCase();
                switch (type) {
                    case"years":
                    case"year":
                    case"y":
                        return n * y;
                    case"days":
                    case"day":
                    case"d":
                        return n * d;
                    case"hours":
                    case"hour":
                    case"h":
                        return n * h;
                    case"minutes":
                    case"minute":
                    case"m":
                        return n * m;
                    case"seconds":
                    case"second":
                    case"s":
                        return n * s;
                    case"ms":
                        return n
                }
            }

            function short(ms) {
                if (ms >= d)return Math.round(ms / d) + "d";
                if (ms >= h)return Math.round(ms / h) + "h";
                if (ms >= m)return Math.round(ms / m) + "m";
                if (ms >= s)return Math.round(ms / s) + "s";
                return ms + "ms"
            }

            function long(ms) {
                return plural(ms, d, "day") || plural(ms, h, "hour") || plural(ms, m, "minute") || plural(ms, s, "second") || ms + " ms"
            }

            function plural(ms, n, name) {
                if (ms < n)return;
                if (ms < n * 1.5)return Math.floor(ms / n) + " " + name;
                return Math.ceil(ms / n) + " " + name + "s"
            }
        }, {}],
        25: [function (_dereq_, module, exports) {
            (function (global) {
                var keys = _dereq_("./keys");
                var hasBinary = _dereq_("has-binary");
                var sliceBuffer = _dereq_("arraybuffer.slice");
                var base64encoder = _dereq_("base64-arraybuffer");
                var after = _dereq_("after");
                var utf8 = _dereq_("utf8");
                var isAndroid = navigator.userAgent.match(/Android/i);
                var isPhantomJS = /PhantomJS/i.test(navigator.userAgent);
                var dontSendBlobs = isAndroid || isPhantomJS;
                exports.protocol = 3;
                var packets = exports.packets = {open: 0, close: 1, ping: 2, pong: 3, message: 4, upgrade: 5, noop: 6};
                var packetslist = keys(packets);
                var err = {type: "error", data: "parser error"};
                var Blob = _dereq_("blob");
                exports.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
                    if ("function" == typeof supportsBinary) {
                        callback = supportsBinary;
                        supportsBinary = false
                    }
                    if ("function" == typeof utf8encode) {
                        callback = utf8encode;
                        utf8encode = null
                    }
                    var data = packet.data === undefined ? undefined : packet.data.buffer || packet.data;
                    if (global.ArrayBuffer && data instanceof ArrayBuffer) {
                        return encodeArrayBuffer(packet, supportsBinary, callback)
                    } else if (Blob && data instanceof global.Blob) {
                        return encodeBlob(packet, supportsBinary, callback)
                    }
                    if (data && data.base64) {
                        return encodeBase64Object(packet, callback)
                    }
                    var encoded = packets[packet.type];
                    if (undefined !== packet.data) {
                        encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data)
                    }
                    return callback("" + encoded)
                };
                function encodeBase64Object(packet, callback) {
                    var message = "b" + exports.packets[packet.type] + packet.data.data;
                    return callback(message)
                }

                function encodeArrayBuffer(packet, supportsBinary, callback) {
                    if (!supportsBinary) {
                        return exports.encodeBase64Packet(packet, callback)
                    }
                    var data = packet.data;
                    var contentArray = new Uint8Array(data);
                    var resultBuffer = new Uint8Array(1 + data.byteLength);
                    resultBuffer[0] = packets[packet.type];
                    for (var i = 0; i < contentArray.length; i++) {
                        resultBuffer[i + 1] = contentArray[i]
                    }
                    return callback(resultBuffer.buffer)
                }

                function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
                    if (!supportsBinary) {
                        return exports.encodeBase64Packet(packet, callback)
                    }
                    var fr = new FileReader;
                    fr.onload = function () {
                        packet.data = fr.result;
                        exports.encodePacket(packet, supportsBinary, true, callback)
                    };
                    return fr.readAsArrayBuffer(packet.data)
                }

                function encodeBlob(packet, supportsBinary, callback) {
                    if (!supportsBinary) {
                        return exports.encodeBase64Packet(packet, callback)
                    }
                    if (dontSendBlobs) {
                        return encodeBlobAsArrayBuffer(packet, supportsBinary, callback)
                    }
                    var length = new Uint8Array(1);
                    length[0] = packets[packet.type];
                    var blob = new Blob([length.buffer, packet.data]);
                    return callback(blob)
                }

                exports.encodeBase64Packet = function (packet, callback) {
                    var message = "b" + exports.packets[packet.type];
                    if (Blob && packet.data instanceof Blob) {
                        var fr = new FileReader;
                        fr.onload = function () {
                            var b64 = fr.result.split(",")[1];
                            callback(message + b64)
                        };
                        return fr.readAsDataURL(packet.data)
                    }
                    var b64data;
                    try {
                        b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data))
                    } catch (e) {
                        var typed = new Uint8Array(packet.data);
                        var basic = new Array(typed.length);
                        for (var i = 0; i < typed.length; i++) {
                            basic[i] = typed[i]
                        }
                        b64data = String.fromCharCode.apply(null, basic)
                    }
                    message += global.btoa(b64data);
                    return callback(message)
                };
                exports.decodePacket = function (data, binaryType, utf8decode) {
                    if (typeof data == "string" || data === undefined) {
                        if (data.charAt(0) == "b") {
                            return exports.decodeBase64Packet(data.substr(1), binaryType)
                        }
                        if (utf8decode) {
                            try {
                                data = utf8.decode(data)
                            } catch (e) {
                                return err
                            }
                        }
                        var type = data.charAt(0);
                        if (Number(type) != type || !packetslist[type]) {
                            return err
                        }
                        if (data.length > 1) {
                            return {type: packetslist[type], data: data.substring(1)}
                        } else {
                            return {type: packetslist[type]}
                        }
                    }
                    var asArray = new Uint8Array(data);
                    var type = asArray[0];
                    var rest = sliceBuffer(data, 1);
                    if (Blob && binaryType === "blob") {
                        rest = new Blob([rest])
                    }
                    return {type: packetslist[type], data: rest}
                };
                exports.decodeBase64Packet = function (msg, binaryType) {
                    var type = packetslist[msg.charAt(0)];
                    if (!global.ArrayBuffer) {
                        return {type: type, data: {base64: true, data: msg.substr(1)}}
                    }
                    var data = base64encoder.decode(msg.substr(1));
                    if (binaryType === "blob" && Blob) {
                        data = new Blob([data])
                    }
                    return {type: type, data: data}
                };
                exports.encodePayload = function (packets, supportsBinary, callback) {
                    if (typeof supportsBinary == "function") {
                        callback = supportsBinary;
                        supportsBinary = null
                    }
                    var isBinary = hasBinary(packets);
                    if (supportsBinary && isBinary) {
                        if (Blob && !dontSendBlobs) {
                            return exports.encodePayloadAsBlob(packets, callback)
                        }
                        return exports.encodePayloadAsArrayBuffer(packets, callback)
                    }
                    if (!packets.length) {
                        return callback("0:")
                    }
                    function setLengthHeader(message) {
                        return message.length + ":" + message
                    }

                    function encodeOne(packet, doneCallback) {
                        exports.encodePacket(packet, !isBinary ? false : supportsBinary, true, function (message) {
                            doneCallback(null, setLengthHeader(message))
                        })
                    }

                    map(packets, encodeOne, function (err, results) {
                        return callback(results.join(""))
                    })
                };
                function map(ary, each, done) {
                    var result = new Array(ary.length);
                    var next = after(ary.length, done);
                    var eachWithIndex = function (i, el, cb) {
                        each(el, function (error, msg) {
                            result[i] = msg;
                            cb(error, result)
                        })
                    };
                    for (var i = 0; i < ary.length; i++) {
                        eachWithIndex(i, ary[i], next)
                    }
                }

                exports.decodePayload = function (data, binaryType, callback) {
                    if (typeof data != "string") {
                        return exports.decodePayloadAsBinary(data, binaryType, callback)
                    }
                    if (typeof binaryType === "function") {
                        callback = binaryType;
                        binaryType = null
                    }
                    var packet;
                    if (data == "") {
                        return callback(err, 0, 1)
                    }
                    var length = "", n, msg;
                    for (var i = 0, l = data.length; i < l; i++) {
                        var chr = data.charAt(i);
                        if (":" != chr) {
                            length += chr
                        } else {
                            if ("" == length || length != (n = Number(length))) {
                                return callback(err, 0, 1)
                            }
                            msg = data.substr(i + 1, n);
                            if (length != msg.length) {
                                return callback(err, 0, 1)
                            }
                            if (msg.length) {
                                packet = exports.decodePacket(msg, binaryType, true);
                                if (err.type == packet.type && err.data == packet.data) {
                                    return callback(err, 0, 1)
                                }
                                var ret = callback(packet, i + n, l);
                                if (false === ret)return
                            }
                            i += n;
                            length = ""
                        }
                    }
                    if (length != "") {
                        return callback(err, 0, 1)
                    }
                };
                exports.encodePayloadAsArrayBuffer = function (packets, callback) {
                    if (!packets.length) {
                        return callback(new ArrayBuffer(0))
                    }
                    function encodeOne(packet, doneCallback) {
                        exports.encodePacket(packet, true, true, function (data) {
                            return doneCallback(null, data)
                        })
                    }

                    map(packets, encodeOne, function (err, encodedPackets) {
                        var totalLength = encodedPackets.reduce(function (acc, p) {
                            var len;
                            if (typeof p === "string") {
                                len = p.length
                            } else {
                                len = p.byteLength
                            }
                            return acc + len.toString().length + len + 2
                        }, 0);
                        var resultArray = new Uint8Array(totalLength);
                        var bufferIndex = 0;
                        encodedPackets.forEach(function (p) {
                            var isString = typeof p === "string";
                            var ab = p;
                            if (isString) {
                                var view = new Uint8Array(p.length);
                                for (var i = 0; i < p.length; i++) {
                                    view[i] = p.charCodeAt(i)
                                }
                                ab = view.buffer
                            }
                            if (isString) {
                                resultArray[bufferIndex++] = 0
                            } else {
                                resultArray[bufferIndex++] = 1
                            }
                            var lenStr = ab.byteLength.toString();
                            for (var i = 0; i < lenStr.length; i++) {
                                resultArray[bufferIndex++] = parseInt(lenStr[i])
                            }
                            resultArray[bufferIndex++] = 255;
                            var view = new Uint8Array(ab);
                            for (var i = 0; i < view.length; i++) {
                                resultArray[bufferIndex++] = view[i]
                            }
                        });
                        return callback(resultArray.buffer)
                    })
                };
                exports.encodePayloadAsBlob = function (packets, callback) {
                    function encodeOne(packet, doneCallback) {
                        exports.encodePacket(packet, true, true, function (encoded) {
                            var binaryIdentifier = new Uint8Array(1);
                            binaryIdentifier[0] = 1;
                            if (typeof encoded === "string") {
                                var view = new Uint8Array(encoded.length);
                                for (var i = 0; i < encoded.length; i++) {
                                    view[i] = encoded.charCodeAt(i)
                                }
                                encoded = view.buffer;
                                binaryIdentifier[0] = 0
                            }
                            var len = encoded instanceof ArrayBuffer ? encoded.byteLength : encoded.size;
                            var lenStr = len.toString();
                            var lengthAry = new Uint8Array(lenStr.length + 1);
                            for (var i = 0; i < lenStr.length; i++) {
                                lengthAry[i] = parseInt(lenStr[i])
                            }
                            lengthAry[lenStr.length] = 255;
                            if (Blob) {
                                var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
                                doneCallback(null, blob)
                            }
                        })
                    }

                    map(packets, encodeOne, function (err, results) {
                        return callback(new Blob(results))
                    })
                };
                exports.decodePayloadAsBinary = function (data, binaryType, callback) {
                    if (typeof binaryType === "function") {
                        callback = binaryType;
                        binaryType = null
                    }
                    var bufferTail = data;
                    var buffers = [];
                    var numberTooLong = false;
                    while (bufferTail.byteLength > 0) {
                        var tailArray = new Uint8Array(bufferTail);
                        var isString = tailArray[0] === 0;
                        var msgLength = "";
                        for (var i = 1; ; i++) {
                            if (tailArray[i] == 255)break;
                            if (msgLength.length > 310) {
                                numberTooLong = true;
                                break
                            }
                            msgLength += tailArray[i]
                        }
                        if (numberTooLong)return callback(err, 0, 1);
                        bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
                        msgLength = parseInt(msgLength);
                        var msg = sliceBuffer(bufferTail, 0, msgLength);
                        if (isString) {
                            try {
                                msg = String.fromCharCode.apply(null, new Uint8Array(msg))
                            } catch (e) {
                                var typed = new Uint8Array(msg);
                                msg = "";
                                for (var i = 0; i < typed.length; i++) {
                                    msg += String.fromCharCode(typed[i])
                                }
                            }
                        }
                        buffers.push(msg);
                        bufferTail = sliceBuffer(bufferTail, msgLength)
                    }
                    var total = buffers.length;
                    buffers.forEach(function (buffer, i) {
                        callback(exports.decodePacket(buffer, binaryType, true), i, total)
                    })
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "./keys": 26,
            after: 27,
            "arraybuffer.slice": 28,
            "base64-arraybuffer": 29,
            blob: 30,
            "has-binary": 31,
            utf8: 33
        }],
        26: [function (_dereq_, module, exports) {
            module.exports = Object.keys || function keys(obj) {
                    var arr = [];
                    var has = Object.prototype.hasOwnProperty;
                    for (var i in obj) {
                        if (has.call(obj, i)) {
                            arr.push(i)
                        }
                    }
                    return arr
                }
        }, {}],
        27: [function (_dereq_, module, exports) {
            module.exports = after;
            function after(count, callback, err_cb) {
                var bail = false;
                err_cb = err_cb || noop;
                proxy.count = count;
                return count === 0 ? callback() : proxy;
                function proxy(err, result) {
                    if (proxy.count <= 0) {
                        throw new Error("after called too many times")
                    }
                    --proxy.count;
                    if (err) {
                        bail = true;
                        callback(err);
                        callback = err_cb
                    } else if (proxy.count === 0 && !bail) {
                        callback(null, result)
                    }
                }
            }

            function noop() {
            }
        }, {}],
        28: [function (_dereq_, module, exports) {
            module.exports = function (arraybuffer, start, end) {
                var bytes = arraybuffer.byteLength;
                start = start || 0;
                end = end || bytes;
                if (arraybuffer.slice) {
                    return arraybuffer.slice(start, end)
                }
                if (start < 0) {
                    start += bytes
                }
                if (end < 0) {
                    end += bytes
                }
                if (end > bytes) {
                    end = bytes
                }
                if (start >= bytes || start >= end || bytes === 0) {
                    return new ArrayBuffer(0)
                }
                var abv = new Uint8Array(arraybuffer);
                var result = new Uint8Array(end - start);
                for (var i = start, ii = 0; i < end; i++, ii++) {
                    result[ii] = abv[i]
                }
                return result.buffer
            }
        }, {}],
        29: [function (_dereq_, module, exports) {
            (function (chars) {
                "use strict";
                exports.encode = function (arraybuffer) {
                    var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = "";
                    for (i = 0; i < len; i += 3) {
                        base64 += chars[bytes[i] >> 2];
                        base64 += chars[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
                        base64 += chars[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
                        base64 += chars[bytes[i + 2] & 63]
                    }
                    if (len % 3 === 2) {
                        base64 = base64.substring(0, base64.length - 1) + "="
                    } else if (len % 3 === 1) {
                        base64 = base64.substring(0, base64.length - 2) + "=="
                    }
                    return base64
                };
                exports.decode = function (base64) {
                    var bufferLength = base64.length * .75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
                    if (base64[base64.length - 1] === "=") {
                        bufferLength--;
                        if (base64[base64.length - 2] === "=") {
                            bufferLength--
                        }
                    }
                    var arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
                    for (i = 0; i < len; i += 4) {
                        encoded1 = chars.indexOf(base64[i]);
                        encoded2 = chars.indexOf(base64[i + 1]);
                        encoded3 = chars.indexOf(base64[i + 2]);
                        encoded4 = chars.indexOf(base64[i + 3]);
                        bytes[p++] = encoded1 << 2 | encoded2 >> 4;
                        bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
                        bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63
                    }
                    return arraybuffer
                }
            })("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/")
        }, {}],
        30: [function (_dereq_, module, exports) {
            (function (global) {
                var BlobBuilder = global.BlobBuilder || global.WebKitBlobBuilder || global.MSBlobBuilder || global.MozBlobBuilder;
                var blobSupported = function () {
                    try {
                        var b = new Blob(["hi"]);
                        return b.size == 2
                    } catch (e) {
                        return false
                    }
                }();
                var blobBuilderSupported = BlobBuilder && BlobBuilder.prototype.append && BlobBuilder.prototype.getBlob;

                function BlobBuilderConstructor(ary, options) {
                    options = options || {};
                    var bb = new BlobBuilder;
                    for (var i = 0; i < ary.length; i++) {
                        bb.append(ary[i])
                    }
                    return options.type ? bb.getBlob(options.type) : bb.getBlob()
                }

                module.exports = function () {
                    if (blobSupported) {
                        return global.Blob
                    } else if (blobBuilderSupported) {
                        return BlobBuilderConstructor
                    } else {
                        return undefined
                    }
                }()
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {}],
        31: [function (_dereq_, module, exports) {
            (function (global) {
                var isArray = _dereq_("isarray");
                module.exports = hasBinary;
                function hasBinary(data) {
                    function _hasBinary(obj) {
                        if (!obj)return false;
                        if (global.Buffer && global.Buffer.isBuffer(obj) || global.ArrayBuffer && obj instanceof ArrayBuffer || global.Blob && obj instanceof Blob || global.File && obj instanceof File) {
                            return true
                        }
                        if (isArray(obj)) {
                            for (var i = 0; i < obj.length; i++) {
                                if (_hasBinary(obj[i])) {
                                    return true
                                }
                            }
                        } else if (obj && "object" == typeof obj) {
                            if (obj.toJSON) {
                                obj = obj.toJSON()
                            }
                            for (var key in obj) {
                                if (obj.hasOwnProperty(key) && _hasBinary(obj[key])) {
                                    return true
                                }
                            }
                        }
                        return false
                    }

                    return _hasBinary(data)
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {isarray: 32}],
        32: [function (_dereq_, module, exports) {
            module.exports = Array.isArray || function (arr) {
                    return Object.prototype.toString.call(arr) == "[object Array]"
                }
        }, {}],
        33: [function (_dereq_, module, exports) {
            (function (global) {
                (function (root) {
                    var freeExports = typeof exports == "object" && exports;
                    var freeModule = typeof module == "object" && module && module.exports == freeExports && module;
                    var freeGlobal = typeof global == "object" && global;
                    if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
                        root = freeGlobal
                    }
                    var stringFromCharCode = String.fromCharCode;

                    function ucs2decode(string) {
                        var output = [];
                        var counter = 0;
                        var length = string.length;
                        var value;
                        var extra;
                        while (counter < length) {
                            value = string.charCodeAt(counter++);
                            if (value >= 55296 && value <= 56319 && counter < length) {
                                extra = string.charCodeAt(counter++);
                                if ((extra & 64512) == 56320) {
                                    output.push(((value & 1023) << 10) + (extra & 1023) + 65536)
                                } else {
                                    output.push(value);
                                    counter--
                                }
                            } else {
                                output.push(value)
                            }
                        }
                        return output
                    }

                    function ucs2encode(array) {
                        var length = array.length;
                        var index = -1;
                        var value;
                        var output = "";
                        while (++index < length) {
                            value = array[index];
                            if (value > 65535) {
                                value -= 65536;
                                output += stringFromCharCode(value >>> 10 & 1023 | 55296);
                                value = 56320 | value & 1023
                            }
                            output += stringFromCharCode(value)
                        }
                        return output
                    }

                    function createByte(codePoint, shift) {
                        return stringFromCharCode(codePoint >> shift & 63 | 128)
                    }

                    function encodeCodePoint(codePoint) {
                        if ((codePoint & 4294967168) == 0) {
                            return stringFromCharCode(codePoint)
                        }
                        var symbol = "";
                        if ((codePoint & 4294965248) == 0) {
                            symbol = stringFromCharCode(codePoint >> 6 & 31 | 192)
                        } else if ((codePoint & 4294901760) == 0) {
                            symbol = stringFromCharCode(codePoint >> 12 & 15 | 224);
                            symbol += createByte(codePoint, 6)
                        } else if ((codePoint & 4292870144) == 0) {
                            symbol = stringFromCharCode(codePoint >> 18 & 7 | 240);
                            symbol += createByte(codePoint, 12);
                            symbol += createByte(codePoint, 6)
                        }
                        symbol += stringFromCharCode(codePoint & 63 | 128);
                        return symbol
                    }

                    function utf8encode(string) {
                        var codePoints = ucs2decode(string);
                        var length = codePoints.length;
                        var index = -1;
                        var codePoint;
                        var byteString = "";
                        while (++index < length) {
                            codePoint = codePoints[index];
                            byteString += encodeCodePoint(codePoint)
                        }
                        return byteString
                    }

                    function readContinuationByte() {
                        if (byteIndex >= byteCount) {
                            throw Error("Invalid byte index")
                        }
                        var continuationByte = byteArray[byteIndex] & 255;
                        byteIndex++;
                        if ((continuationByte & 192) == 128) {
                            return continuationByte & 63
                        }
                        throw Error("Invalid continuation byte")
                    }

                    function decodeSymbol() {
                        var byte1;
                        var byte2;
                        var byte3;
                        var byte4;
                        var codePoint;
                        if (byteIndex > byteCount) {
                            throw Error("Invalid byte index")
                        }
                        if (byteIndex == byteCount) {
                            return false
                        }
                        byte1 = byteArray[byteIndex] & 255;
                        byteIndex++;
                        if ((byte1 & 128) == 0) {
                            return byte1
                        }
                        if ((byte1 & 224) == 192) {
                            var byte2 = readContinuationByte();
                            codePoint = (byte1 & 31) << 6 | byte2;
                            if (codePoint >= 128) {
                                return codePoint
                            } else {
                                throw Error("Invalid continuation byte")
                            }
                        }
                        if ((byte1 & 240) == 224) {
                            byte2 = readContinuationByte();
                            byte3 = readContinuationByte();
                            codePoint = (byte1 & 15) << 12 | byte2 << 6 | byte3;
                            if (codePoint >= 2048) {
                                return codePoint
                            } else {
                                throw Error("Invalid continuation byte")
                            }
                        }
                        if ((byte1 & 248) == 240) {
                            byte2 = readContinuationByte();
                            byte3 = readContinuationByte();
                            byte4 = readContinuationByte();
                            codePoint = (byte1 & 15) << 18 | byte2 << 12 | byte3 << 6 | byte4;
                            if (codePoint >= 65536 && codePoint <= 1114111) {
                                return codePoint
                            }
                        }
                        throw Error("Invalid UTF-8 detected")
                    }

                    var byteArray;
                    var byteCount;
                    var byteIndex;

                    function utf8decode(byteString) {
                        byteArray = ucs2decode(byteString);
                        byteCount = byteArray.length;
                        byteIndex = 0;
                        var codePoints = [];
                        var tmp;
                        while ((tmp = decodeSymbol()) !== false) {
                            codePoints.push(tmp)
                        }
                        return ucs2encode(codePoints)
                    }

                    var utf8 = {version: "2.0.0", encode: utf8encode, decode: utf8decode};
                    if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
                        define(function () {
                            return utf8
                        })
                    } else if (freeExports && !freeExports.nodeType) {
                        if (freeModule) {
                            freeModule.exports = utf8
                        } else {
                            var object = {};
                            var hasOwnProperty = object.hasOwnProperty;
                            for (var key in utf8) {
                                hasOwnProperty.call(utf8, key) && (freeExports[key] = utf8[key])
                            }
                        }
                    } else {
                        root.utf8 = utf8
                    }
                })(this)
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {}],
        34: [function (_dereq_, module, exports) {
            (function (global) {
                var rvalidchars = /^[\],:{}\s]*$/;
                var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
                var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
                var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
                var rtrimLeft = /^\s+/;
                var rtrimRight = /\s+$/;
                module.exports = function parsejson(data) {
                    if ("string" != typeof data || !data) {
                        return null
                    }
                    data = data.replace(rtrimLeft, "").replace(rtrimRight, "");
                    if (global.JSON && JSON.parse) {
                        return JSON.parse(data)
                    }
                    if (rvalidchars.test(data.replace(rvalidescape, "@").replace(rvalidtokens, "]").replace(rvalidbraces, ""))) {
                        return new Function("return " + data)()
                    }
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {}],
        35: [function (_dereq_, module, exports) {
            exports.encode = function (obj) {
                var str = "";
                for (var i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        if (str.length)str += "&";
                        str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i])
                    }
                }
                return str
            };
            exports.decode = function (qs) {
                var qry = {};
                var pairs = qs.split("&");
                for (var i = 0, l = pairs.length; i < l; i++) {
                    var pair = pairs[i].split("=");
                    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1])
                }
                return qry
            }
        }, {}],
        36: [function (_dereq_, module, exports) {
            var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
            var parts = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
            module.exports = function parseuri(str) {
                var src = str, b = str.indexOf("["), e = str.indexOf("]");
                if (b != -1 && e != -1) {
                    str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length)
                }
                var m = re.exec(str || ""), uri = {}, i = 14;
                while (i--) {
                    uri[parts[i]] = m[i] || ""
                }
                if (b != -1 && e != -1) {
                    uri.source = src;
                    uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
                    uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
                    uri.ipv6uri = true
                }
                return uri
            }
        }, {}],
        37: [function (_dereq_, module, exports) {
            var global = function () {
                return this
            }();
            var WebSocket = global.WebSocket || global.MozWebSocket;
            module.exports = WebSocket ? ws : null;
            function ws(uri, protocols, opts) {
                var instance;
                if (protocols) {
                    instance = new WebSocket(uri, protocols)
                } else {
                    instance = new WebSocket(uri)
                }
                return instance
            }

            if (WebSocket)ws.prototype = WebSocket.prototype
        }, {}],
        38: [function (_dereq_, module, exports) {
            (function (global) {
                var isArray = _dereq_("isarray");
                module.exports = hasBinary;
                function hasBinary(data) {
                    function _hasBinary(obj) {
                        if (!obj)return false;
                        if (global.Buffer && global.Buffer.isBuffer(obj) || global.ArrayBuffer && obj instanceof ArrayBuffer || global.Blob && obj instanceof Blob || global.File && obj instanceof File) {
                            return true
                        }
                        if (isArray(obj)) {
                            for (var i = 0; i < obj.length; i++) {
                                if (_hasBinary(obj[i])) {
                                    return true
                                }
                            }
                        } else if (obj && "object" == typeof obj) {
                            if (obj.toJSON) {
                                obj = obj.toJSON()
                            }
                            for (var key in obj) {
                                if (Object.prototype.hasOwnProperty.call(obj, key) && _hasBinary(obj[key])) {
                                    return true
                                }
                            }
                        }
                        return false
                    }

                    return _hasBinary(data)
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {isarray: 39}],
        39: [function (_dereq_, module, exports) {
            module.exports = _dereq_(32)
        }, {}],
        40: [function (_dereq_, module, exports) {
            var global = _dereq_("global");
            try {
                module.exports = "XMLHttpRequest"in global && "withCredentials"in new global.XMLHttpRequest
            } catch (err) {
                module.exports = false
            }
        }, {global: 41}],
        41: [function (_dereq_, module, exports) {
            module.exports = function () {
                return this
            }()
        }, {}],
        42: [function (_dereq_, module, exports) {
            var indexOf = [].indexOf;
            module.exports = function (arr, obj) {
                if (indexOf)return arr.indexOf(obj);
                for (var i = 0; i < arr.length; ++i) {
                    if (arr[i] === obj)return i
                }
                return -1
            }
        }, {}],
        43: [function (_dereq_, module, exports) {
            var has = Object.prototype.hasOwnProperty;
            exports.keys = Object.keys || function (obj) {
                    var keys = [];
                    for (var key in obj) {
                        if (has.call(obj, key)) {
                            keys.push(key)
                        }
                    }
                    return keys
                };
            exports.values = function (obj) {
                var vals = [];
                for (var key in obj) {
                    if (has.call(obj, key)) {
                        vals.push(obj[key])
                    }
                }
                return vals
            };
            exports.merge = function (a, b) {
                for (var key in b) {
                    if (has.call(b, key)) {
                        a[key] = b[key]
                    }
                }
                return a
            };
            exports.length = function (obj) {
                return exports.keys(obj).length
            };
            exports.isEmpty = function (obj) {
                return 0 == exports.length(obj)
            }
        }, {}],
        44: [function (_dereq_, module, exports) {
            var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
            var parts = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
            module.exports = function parseuri(str) {
                var m = re.exec(str || ""), uri = {}, i = 14;
                while (i--) {
                    uri[parts[i]] = m[i] || ""
                }
                return uri
            }
        }, {}],
        45: [function (_dereq_, module, exports) {
            (function (global) {
                var isArray = _dereq_("isarray");
                var isBuf = _dereq_("./is-buffer");
                exports.deconstructPacket = function (packet) {
                    var buffers = [];
                    var packetData = packet.data;

                    function _deconstructPacket(data) {
                        if (!data)return data;
                        if (isBuf(data)) {
                            var placeholder = {_placeholder: true, num: buffers.length};
                            buffers.push(data);
                            return placeholder
                        } else if (isArray(data)) {
                            var newData = new Array(data.length);
                            for (var i = 0; i < data.length; i++) {
                                newData[i] = _deconstructPacket(data[i])
                            }
                            return newData
                        } else if ("object" == typeof data && !(data instanceof Date)) {
                            var newData = {};
                            for (var key in data) {
                                newData[key] = _deconstructPacket(data[key])
                            }
                            return newData
                        }
                        return data
                    }

                    var pack = packet;
                    pack.data = _deconstructPacket(packetData);
                    pack.attachments = buffers.length;
                    return {packet: pack, buffers: buffers}
                };
                exports.reconstructPacket = function (packet, buffers) {
                    var curPlaceHolder = 0;

                    function _reconstructPacket(data) {
                        if (data && data._placeholder) {
                            var buf = buffers[data.num];
                            return buf
                        } else if (isArray(data)) {
                            for (var i = 0; i < data.length; i++) {
                                data[i] = _reconstructPacket(data[i])
                            }
                            return data
                        } else if (data && "object" == typeof data) {
                            for (var key in data) {
                                data[key] = _reconstructPacket(data[key])
                            }
                            return data
                        }
                        return data
                    }

                    packet.data = _reconstructPacket(packet.data);
                    packet.attachments = undefined;
                    return packet
                };
                exports.removeBlobs = function (data, callback) {
                    function _removeBlobs(obj, curKey, containingObject) {
                        if (!obj)return obj;
                        if (global.Blob && obj instanceof Blob || global.File && obj instanceof File) {
                            pendingBlobs++;
                            var fileReader = new FileReader;
                            fileReader.onload = function () {
                                if (containingObject) {
                                    containingObject[curKey] = this.result
                                } else {
                                    bloblessData = this.result
                                }
                                if (!--pendingBlobs) {
                                    callback(bloblessData)
                                }
                            };
                            fileReader.readAsArrayBuffer(obj)
                        } else if (isArray(obj)) {
                            for (var i = 0; i < obj.length; i++) {
                                _removeBlobs(obj[i], i, obj)
                            }
                        } else if (obj && "object" == typeof obj && !isBuf(obj)) {
                            for (var key in obj) {
                                _removeBlobs(obj[key], key, obj)
                            }
                        }
                    }

                    var pendingBlobs = 0;
                    var bloblessData = data;
                    _removeBlobs(bloblessData);
                    if (!pendingBlobs) {
                        callback(bloblessData)
                    }
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {"./is-buffer": 47, isarray: 48}],
        46: [function (_dereq_, module, exports) {
            var debug = _dereq_("debug")("socket.io-parser");
            var json = _dereq_("json3");
            var isArray = _dereq_("isarray");
            var Emitter = _dereq_("component-emitter");
            var binary = _dereq_("./binary");
            var isBuf = _dereq_("./is-buffer");
            exports.protocol = 4;
            exports.types = ["CONNECT", "DISCONNECT", "EVENT", "BINARY_EVENT", "ACK", "BINARY_ACK", "ERROR"];
            exports.CONNECT = 0;
            exports.DISCONNECT = 1;
            exports.EVENT = 2;
            exports.ACK = 3;
            exports.ERROR = 4;
            exports.BINARY_EVENT = 5;
            exports.BINARY_ACK = 6;
            exports.Encoder = Encoder;
            exports.Decoder = Decoder;
            function Encoder() {
            }

            Encoder.prototype.encode = function (obj, callback) {
                debug("encoding packet %j", obj);
                if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
                    encodeAsBinary(obj, callback)
                } else {
                    var encoding = encodeAsString(obj);
                    callback([encoding])
                }
            };
            function encodeAsString(obj) {
                var str = "";
                var nsp = false;
                str += obj.type;
                if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
                    str += obj.attachments;
                    str += "-"
                }
                if (obj.nsp && "/" != obj.nsp) {
                    nsp = true;
                    str += obj.nsp
                }
                if (null != obj.id) {
                    if (nsp) {
                        str += ",";
                        nsp = false
                    }
                    str += obj.id
                }
                if (null != obj.data) {
                    if (nsp)str += ",";
                    str += json.stringify(obj.data)
                }
                debug("encoded %j as %s", obj, str);
                return str
            }

            function encodeAsBinary(obj, callback) {
                function writeEncoding(bloblessData) {
                    var deconstruction = binary.deconstructPacket(bloblessData);
                    var pack = encodeAsString(deconstruction.packet);
                    var buffers = deconstruction.buffers;
                    buffers.unshift(pack);
                    callback(buffers)
                }

                binary.removeBlobs(obj, writeEncoding)
            }

            function Decoder() {
                this.reconstructor = null
            }

            Emitter(Decoder.prototype);
            Decoder.prototype.add = function (obj) {
                var packet;
                if ("string" == typeof obj) {
                    packet = decodeString(obj);
                    if (exports.BINARY_EVENT == packet.type || exports.BINARY_ACK == packet.type) {
                        this.reconstructor = new BinaryReconstructor(packet);
                        if (this.reconstructor.reconPack.attachments === 0) {
                            this.emit("decoded", packet)
                        }
                    } else {
                        this.emit("decoded", packet)
                    }
                } else if (isBuf(obj) || obj.base64) {
                    if (!this.reconstructor) {
                        throw new Error("got binary data when not reconstructing a packet")
                    } else {
                        packet = this.reconstructor.takeBinaryData(obj);
                        if (packet) {
                            this.reconstructor = null;
                            this.emit("decoded", packet)
                        }
                    }
                } else {
                    throw new Error("Unknown type: " + obj)
                }
            };
            function decodeString(str) {
                var p = {};
                var i = 0;
                p.type = Number(str.charAt(0));
                if (null == exports.types[p.type])return error();
                if (exports.BINARY_EVENT == p.type || exports.BINARY_ACK == p.type) {
                    var buf = "";
                    while (str.charAt(++i) != "-") {
                        buf += str.charAt(i);
                        if (i == str.length)break
                    }
                    if (buf != Number(buf) || str.charAt(i) != "-") {
                        throw new Error("Illegal attachments")
                    }
                    p.attachments = Number(buf)
                }
                if ("/" == str.charAt(i + 1)) {
                    p.nsp = "";
                    while (++i) {
                        var c = str.charAt(i);
                        if ("," == c)break;
                        p.nsp += c;
                        if (i == str.length)break
                    }
                } else {
                    p.nsp = "/"
                }
                var next = str.charAt(i + 1);
                if ("" !== next && Number(next) == next) {
                    p.id = "";
                    while (++i) {
                        var c = str.charAt(i);
                        if (null == c || Number(c) != c) {
                            --i;
                            break
                        }
                        p.id += str.charAt(i);
                        if (i == str.length)break
                    }
                    p.id = Number(p.id)
                }
                if (str.charAt(++i)) {
                    try {
                        p.data = json.parse(str.substr(i))
                    } catch (e) {
                        return error()
                    }
                }
                debug("decoded %s as %j", str, p);
                return p
            }

            Decoder.prototype.destroy = function () {
                if (this.reconstructor) {
                    this.reconstructor.finishedReconstruction()
                }
            };
            function BinaryReconstructor(packet) {
                this.reconPack = packet;
                this.buffers = []
            }

            BinaryReconstructor.prototype.takeBinaryData = function (binData) {
                this.buffers.push(binData);
                if (this.buffers.length == this.reconPack.attachments) {
                    var packet = binary.reconstructPacket(this.reconPack, this.buffers);
                    this.finishedReconstruction();
                    return packet
                }
                return null
            };
            BinaryReconstructor.prototype.finishedReconstruction = function () {
                this.reconPack = null;
                this.buffers = []
            };
            function error(data) {
                return {type: exports.ERROR, data: "parser error"}
            }
        }, {"./binary": 45, "./is-buffer": 47, "component-emitter": 9, debug: 10, isarray: 48, json3: 49}],
        47: [function (_dereq_, module, exports) {
            (function (global) {
                module.exports = isBuf;
                function isBuf(obj) {
                    return global.Buffer && global.Buffer.isBuffer(obj) || global.ArrayBuffer && obj instanceof ArrayBuffer
                }
            }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {}],
        48: [function (_dereq_, module, exports) {
            module.exports = _dereq_(32)
        }, {}],
        49: [function (_dereq_, module, exports) {
            (function (window) {
                var getClass = {}.toString, isProperty, forEach, undef;
                var isLoader = typeof define === "function" && define.amd;
                var nativeJSON = typeof JSON == "object" && JSON;
                var JSON3 = typeof exports == "object" && exports && !exports.nodeType && exports;
                if (JSON3 && nativeJSON) {
                    JSON3.stringify = nativeJSON.stringify;
                    JSON3.parse = nativeJSON.parse
                } else {
                    JSON3 = window.JSON = nativeJSON || {}
                }
                var isExtended = new Date(-0xc782b5b800cec);
                try {
                    isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 && isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708
                } catch (exception) {
                }
                function has(name) {
                    if (has[name] !== undef) {
                        return has[name]
                    }
                    var isSupported;
                    if (name == "bug-string-char-index") {
                        isSupported = "a"[0] != "a"
                    } else if (name == "json") {
                        isSupported = has("json-stringify") && has("json-parse")
                    } else {
                        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
                        if (name == "json-stringify") {
                            var stringify = JSON3.stringify, stringifySupported = typeof stringify == "function" && isExtended;
                            if (stringifySupported) {
                                (value = function () {
                                    return 1
                                }).toJSON = value;
                                try {
                                    stringifySupported = stringify(0) === "0" && stringify(new Number) === "0" && stringify(new String) == '""' && stringify(getClass) === undef && stringify(undef) === undef && stringify() === undef && stringify(value) === "1" && stringify([value]) == "[1]" && stringify([undef]) == "[null]" && stringify(null) == "null" && stringify([undef, getClass, null]) == "[null,null,null]" && stringify({a: [value, true, false, null, "\x00\b\n\f\r	"]}) == serialized && stringify(null, value) === "1" && stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" && stringify(new Date(-864e13)) == '"-271821-04-20T00:00:00.000Z"' && stringify(new Date(864e13)) == '"+275760-09-13T00:00:00.000Z"' && stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' && stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"'
                                } catch (exception) {
                                    stringifySupported = false
                                }
                            }
                            isSupported = stringifySupported
                        }
                        if (name == "json-parse") {
                            var parse = JSON3.parse;
                            if (typeof parse == "function") {
                                try {
                                    if (parse("0") === 0 && !parse(false)) {
                                        value = parse(serialized);
                                        var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                                        if (parseSupported) {
                                            try {
                                                parseSupported = !parse('"	"')
                                            } catch (exception) {
                                            }
                                            if (parseSupported) {
                                                try {
                                                    parseSupported = parse("01") !== 1
                                                } catch (exception) {
                                                }
                                            }
                                            if (parseSupported) {
                                                try {
                                                    parseSupported = parse("1.") !== 1
                                                } catch (exception) {
                                                }
                                            }
                                        }
                                    }
                                } catch (exception) {
                                    parseSupported = false
                                }
                            }
                            isSupported = parseSupported
                        }
                    }
                    return has[name] = !!isSupported
                }

                if (!has("json")) {
                    var functionClass = "[object Function]";
                    var dateClass = "[object Date]";
                    var numberClass = "[object Number]";
                    var stringClass = "[object String]";
                    var arrayClass = "[object Array]";
                    var booleanClass = "[object Boolean]";
                    var charIndexBuggy = has("bug-string-char-index");
                    if (!isExtended) {
                        var floor = Math.floor;
                        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
                        var getDay = function (year, month) {
                            return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400)
                        }
                    }
                    if (!(isProperty = {}.hasOwnProperty)) {
                        isProperty = function (property) {
                            var members = {}, constructor;
                            if ((members.__proto__ = null, members.__proto__ = {toString: 1}, members).toString != getClass) {
                                isProperty = function (property) {
                                    var original = this.__proto__, result = property in(this.__proto__ = null, this);
                                    this.__proto__ = original;
                                    return result
                                }
                            } else {
                                constructor = members.constructor;
                                isProperty = function (property) {
                                    var parent = (this.constructor || constructor).prototype;
                                    return property in this && !(property in parent && this[property] === parent[property])
                                }
                            }
                            members = null;
                            return isProperty.call(this, property)
                        }
                    }
                    var PrimitiveTypes = {"boolean": 1, number: 1, string: 1, undefined: 1};
                    var isHostType = function (object, property) {
                        var type = typeof object[property];
                        return type == "object" ? !!object[property] : !PrimitiveTypes[type]
                    };
                    forEach = function (object, callback) {
                        var size = 0, Properties, members, property;
                        (Properties = function () {
                            this.valueOf = 0
                        }).prototype.valueOf = 0;
                        members = new Properties;
                        for (property in members) {
                            if (isProperty.call(members, property)) {
                                size++
                            }
                        }
                        Properties = members = null;
                        if (!size) {
                            members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
                            forEach = function (object, callback) {
                                var isFunction = getClass.call(object) == functionClass, property, length;
                                var hasProperty = !isFunction && typeof object.constructor != "function" && isHostType(object, "hasOwnProperty") ? object.hasOwnProperty : isProperty;
                                for (property in object) {
                                    if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                                        callback(property)
                                    }
                                }
                                for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
                            }
                        } else if (size == 2) {
                            forEach = function (object, callback) {
                                var members = {}, isFunction = getClass.call(object) == functionClass, property;
                                for (property in object) {
                                    if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                                        callback(property)
                                    }
                                }
                            }
                        } else {
                            forEach = function (object, callback) {
                                var isFunction = getClass.call(object) == functionClass, property, isConstructor;
                                for (property in object) {
                                    if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                                        callback(property)
                                    }
                                }
                                if (isConstructor || isProperty.call(object, property = "constructor")) {
                                    callback(property)
                                }
                            }
                        }
                        return forEach(object, callback)
                    };
                    if (!has("json-stringify")) {
                        var Escapes = {92: "\\\\", 34: '\\"', 8: "\\b", 12: "\\f", 10: "\\n", 13: "\\r", 9: "\\t"};
                        var leadingZeroes = "000000";
                        var toPaddedString = function (width, value) {
                            return (leadingZeroes + (value || 0)).slice(-width)
                        };
                        var unicodePrefix = "\\u00";
                        var quote = function (value) {
                            var result = '"', index = 0, length = value.length, isLarge = length > 10 && charIndexBuggy, symbols;
                            if (isLarge) {
                                symbols = value.split("")
                            }
                            for (; index < length; index++) {
                                var charCode = value.charCodeAt(index);
                                switch (charCode) {
                                    case 8:
                                    case 9:
                                    case 10:
                                    case 12:
                                    case 13:
                                    case 34:
                                    case 92:
                                        result += Escapes[charCode];
                                        break;
                                    default:
                                        if (charCode < 32) {
                                            result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                                            break
                                        }
                                        result += isLarge ? symbols[index] : charIndexBuggy ? value.charAt(index) : value[index]
                                }
                            }
                            return result + '"'
                        };
                        var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
                            var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;
                            try {
                                value = object[property]
                            } catch (exception) {
                            }
                            if (typeof value == "object" && value) {
                                className = getClass.call(value);
                                if (className == dateClass && !isProperty.call(value, "toJSON")) {
                                    if (value > -1 / 0 && value < 1 / 0) {
                                        if (getDay) {
                                            date = floor(value / 864e5);
                                            for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                                            for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                                            date = 1 + date - getDay(year, month);
                                            time = (value % 864e5 + 864e5) % 864e5;
                                            hours = floor(time / 36e5) % 24;
                                            minutes = floor(time / 6e4) % 60;
                                            seconds = floor(time / 1e3) % 60;
                                            milliseconds = time % 1e3
                                        } else {
                                            year = value.getUTCFullYear();
                                            month = value.getUTCMonth();
                                            date = value.getUTCDate();
                                            hours = value.getUTCHours();
                                            minutes = value.getUTCMinutes();
                                            seconds = value.getUTCSeconds();
                                            milliseconds = value.getUTCMilliseconds()
                                        }
                                        value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) + "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) + "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) + "." + toPaddedString(3, milliseconds) + "Z"
                                    } else {
                                        value = null
                                    }
                                } else if (typeof value.toJSON == "function" && (className != numberClass && className != stringClass && className != arrayClass || isProperty.call(value, "toJSON"))) {
                                    value = value.toJSON(property)
                                }
                            }
                            if (callback) {
                                value = callback.call(object, property, value)
                            }
                            if (value === null) {
                                return "null"
                            }
                            className = getClass.call(value);
                            if (className == booleanClass) {
                                return "" + value
                            } else if (className == numberClass) {
                                return value > -1 / 0 && value < 1 / 0 ? "" + value : "null"
                            } else if (className == stringClass) {
                                return quote("" + value)
                            }
                            if (typeof value == "object") {
                                for (length = stack.length; length--;) {
                                    if (stack[length] === value) {
                                        throw TypeError()
                                    }
                                }
                                stack.push(value);
                                results = [];
                                prefix = indentation;
                                indentation += whitespace;
                                if (className == arrayClass) {
                                    for (index = 0, length = value.length; index < length; index++) {
                                        element = serialize(index, value, callback, properties, whitespace, indentation, stack);
                                        results.push(element === undef ? "null" : element)
                                    }
                                    result = results.length ? whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : "[" + results.join(",") + "]" : "[]"
                                } else {
                                    forEach(properties || value, function (property) {
                                        var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
                                        if (element !== undef) {
                                            results.push(quote(property) + ":" + (whitespace ? " " : "") + element)
                                        }
                                    });
                                    result = results.length ? whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : "{" + results.join(",") + "}" : "{}"
                                }
                                stack.pop();
                                return result
                            }
                        };
                        JSON3.stringify = function (source, filter, width) {
                            var whitespace, callback, properties, className;
                            if (typeof filter == "function" || typeof filter == "object" && filter) {
                                if ((className = getClass.call(filter)) == functionClass) {
                                    callback = filter
                                } else if (className == arrayClass) {
                                    properties = {};
                                    for (var index = 0, length = filter.length, value; index < length; value = filter[index++], (className = getClass.call(value), className == stringClass || className == numberClass) && (properties[value] = 1));
                                }
                            }
                            if (width) {
                                if ((className = getClass.call(width)) == numberClass) {
                                    if ((width -= width % 1) > 0) {
                                        for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
                                    }
                                } else if (className == stringClass) {
                                    whitespace = width.length <= 10 ? width : width.slice(0, 10)
                                }
                            }
                            return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [])
                        }
                    }
                    if (!has("json-parse")) {
                        var fromCharCode = String.fromCharCode;
                        var Unescapes = {
                            92: "\\",
                            34: '"',
                            47: "/",
                            98: "\b",
                            116: "	",
                            110: "\n",
                            102: "\f",
                            114: "\r"
                        };
                        var Index, Source;
                        var abort = function () {
                            Index = Source = null;
                            throw SyntaxError()
                        };
                        var lex = function () {
                            var source = Source, length = source.length, value, begin, position, isSigned, charCode;
                            while (Index < length) {
                                charCode = source.charCodeAt(Index);
                                switch (charCode) {
                                    case 9:
                                    case 10:
                                    case 13:
                                    case 32:
                                        Index++;
                                        break;
                                    case 123:
                                    case 125:
                                    case 91:
                                    case 93:
                                    case 58:
                                    case 44:
                                        value = charIndexBuggy ? source.charAt(Index) : source[Index];
                                        Index++;
                                        return value;
                                    case 34:
                                        for (value = "@", Index++; Index < length;) {
                                            charCode = source.charCodeAt(Index);
                                            if (charCode < 32) {
                                                abort()
                                            } else if (charCode == 92) {
                                                charCode = source.charCodeAt(++Index);
                                                switch (charCode) {
                                                    case 92:
                                                    case 34:
                                                    case 47:
                                                    case 98:
                                                    case 116:
                                                    case 110:
                                                    case 102:
                                                    case 114:
                                                        value += Unescapes[charCode];
                                                        Index++;
                                                        break;
                                                    case 117:
                                                        begin = ++Index;
                                                        for (position = Index + 4; Index < position; Index++) {
                                                            charCode = source.charCodeAt(Index);
                                                            if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                                                                abort()
                                                            }
                                                        }
                                                        value += fromCharCode("0x" + source.slice(begin, Index));
                                                        break;
                                                    default:
                                                        abort()
                                                }
                                            } else {
                                                if (charCode == 34) {
                                                    break
                                                }
                                                charCode = source.charCodeAt(Index);
                                                begin = Index;
                                                while (charCode >= 32 && charCode != 92 && charCode != 34) {
                                                    charCode = source.charCodeAt(++Index)
                                                }
                                                value += source.slice(begin, Index)
                                            }
                                        }
                                        if (source.charCodeAt(Index) == 34) {
                                            Index++;
                                            return value
                                        }
                                        abort();
                                    default:
                                        begin = Index;
                                        if (charCode == 45) {
                                            isSigned = true;
                                            charCode = source.charCodeAt(++Index)
                                        }
                                        if (charCode >= 48 && charCode <= 57) {
                                            if (charCode == 48 && (charCode = source.charCodeAt(Index + 1), charCode >= 48 && charCode <= 57)) {
                                                abort()
                                            }
                                            isSigned = false;
                                            for (; Index < length && (charCode = source.charCodeAt(Index), charCode >= 48 && charCode <= 57); Index++);
                                            if (source.charCodeAt(Index) == 46) {
                                                position = ++Index;
                                                for (; position < length && (charCode = source.charCodeAt(position), charCode >= 48 && charCode <= 57); position++);
                                                if (position == Index) {
                                                    abort()
                                                }
                                                Index = position
                                            }
                                            charCode = source.charCodeAt(Index);
                                            if (charCode == 101 || charCode == 69) {
                                                charCode = source.charCodeAt(++Index);
                                                if (charCode == 43 || charCode == 45) {
                                                    Index++
                                                }
                                                for (position = Index; position < length && (charCode = source.charCodeAt(position), charCode >= 48 && charCode <= 57); position++);
                                                if (position == Index) {
                                                    abort()
                                                }
                                                Index = position
                                            }
                                            return +source.slice(begin, Index)
                                        }
                                        if (isSigned) {
                                            abort()
                                        }
                                        if (source.slice(Index, Index + 4) == "true") {
                                            Index += 4;
                                            return true
                                        } else if (source.slice(Index, Index + 5) == "false") {
                                            Index += 5;
                                            return false
                                        } else if (source.slice(Index, Index + 4) == "null") {
                                            Index += 4;
                                            return null
                                        }
                                        abort()
                                }
                            }
                            return "$"
                        };
                        var get = function (value) {
                            var results, hasMembers;
                            if (value == "$") {
                                abort()
                            }
                            if (typeof value == "string") {
                                if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
                                    return value.slice(1)
                                }
                                if (value == "[") {
                                    results = [];
                                    for (; ; hasMembers || (hasMembers = true)) {
                                        value = lex();
                                        if (value == "]") {
                                            break
                                        }
                                        if (hasMembers) {
                                            if (value == ",") {
                                                value = lex();
                                                if (value == "]") {
                                                    abort()
                                                }
                                            } else {
                                                abort()
                                            }
                                        }
                                        if (value == ",") {
                                            abort()
                                        }
                                        results.push(get(value))
                                    }
                                    return results
                                } else if (value == "{") {
                                    results = {};
                                    for (; ; hasMembers || (hasMembers = true)) {
                                        value = lex();
                                        if (value == "}") {
                                            break
                                        }
                                        if (hasMembers) {
                                            if (value == ",") {
                                                value = lex();
                                                if (value == "}") {
                                                    abort()
                                                }
                                            } else {
                                                abort()
                                            }
                                        }
                                        if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                                            abort()
                                        }
                                        results[value.slice(1)] = get(lex())
                                    }
                                    return results
                                }
                                abort()
                            }
                            return value
                        };
                        var update = function (source, property, callback) {
                            var element = walk(source, property, callback);
                            if (element === undef) {
                                delete source[property]
                            } else {
                                source[property] = element
                            }
                        };
                        var walk = function (source, property, callback) {
                            var value = source[property], length;
                            if (typeof value == "object" && value) {
                                if (getClass.call(value) == arrayClass) {
                                    for (length = value.length; length--;) {
                                        update(value, length, callback)
                                    }
                                } else {
                                    forEach(value, function (property) {
                                        update(value, property, callback)
                                    })
                                }
                            }
                            return callback.call(source, property, value)
                        };
                        JSON3.parse = function (source, callback) {
                            var result, value;
                            Index = 0;
                            Source = "" + source;
                            result = get(lex());
                            if (lex() != "$") {
                                abort()
                            }
                            Index = Source = null;
                            return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result
                        }
                    }
                }
                if (isLoader) {
                    define(function () {
                        return JSON3
                    })
                }
            })(this)
        }, {}],
        50: [function (_dereq_, module, exports) {
            module.exports = toArray;
            function toArray(list, index) {
                var array = [];
                index = index || 0;
                for (var i = index || 0; i < list.length; i++) {
                    array[i - index] = list[i]
                }
                return array
            }
        }, {}]
    }, {}, [1])(1)
});
//! moment.js
//! version : 2.8.3
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com
(function(a){function b(a,b,c){switch(arguments.length){case 2:return null!=a?a:b;case 3:return null!=a?a:null!=b?b:c;default:throw new Error("Implement me")}}function c(a,b){return zb.call(a,b)}function d(){return{empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1}}function e(a){tb.suppressDeprecationWarnings===!1&&"undefined"!=typeof console&&console.warn&&console.warn("Deprecation warning: "+a)}function f(a,b){var c=!0;return m(function(){return c&&(e(a),c=!1),b.apply(this,arguments)},b)}function g(a,b){qc[a]||(e(b),qc[a]=!0)}function h(a,b){return function(c){return p(a.call(this,c),b)}}function i(a,b){return function(c){return this.localeData().ordinal(a.call(this,c),b)}}function j(){}function k(a,b){b!==!1&&F(a),n(this,a),this._d=new Date(+a._d)}function l(a){var b=y(a),c=b.year||0,d=b.quarter||0,e=b.month||0,f=b.week||0,g=b.day||0,h=b.hour||0,i=b.minute||0,j=b.second||0,k=b.millisecond||0;this._milliseconds=+k+1e3*j+6e4*i+36e5*h,this._days=+g+7*f,this._months=+e+3*d+12*c,this._data={},this._locale=tb.localeData(),this._bubble()}function m(a,b){for(var d in b)c(b,d)&&(a[d]=b[d]);return c(b,"toString")&&(a.toString=b.toString),c(b,"valueOf")&&(a.valueOf=b.valueOf),a}function n(a,b){var c,d,e;if("undefined"!=typeof b._isAMomentObject&&(a._isAMomentObject=b._isAMomentObject),"undefined"!=typeof b._i&&(a._i=b._i),"undefined"!=typeof b._f&&(a._f=b._f),"undefined"!=typeof b._l&&(a._l=b._l),"undefined"!=typeof b._strict&&(a._strict=b._strict),"undefined"!=typeof b._tzm&&(a._tzm=b._tzm),"undefined"!=typeof b._isUTC&&(a._isUTC=b._isUTC),"undefined"!=typeof b._offset&&(a._offset=b._offset),"undefined"!=typeof b._pf&&(a._pf=b._pf),"undefined"!=typeof b._locale&&(a._locale=b._locale),Ib.length>0)for(c in Ib)d=Ib[c],e=b[d],"undefined"!=typeof e&&(a[d]=e);return a}function o(a){return 0>a?Math.ceil(a):Math.floor(a)}function p(a,b,c){for(var d=""+Math.abs(a),e=a>=0;d.length<b;)d="0"+d;return(e?c?"+":"":"-")+d}function q(a,b){var c={milliseconds:0,months:0};return c.months=b.month()-a.month()+12*(b.year()-a.year()),a.clone().add(c.months,"M").isAfter(b)&&--c.months,c.milliseconds=+b-+a.clone().add(c.months,"M"),c}function r(a,b){var c;return b=K(b,a),a.isBefore(b)?c=q(a,b):(c=q(b,a),c.milliseconds=-c.milliseconds,c.months=-c.months),c}function s(a,b){return function(c,d){var e,f;return null===d||isNaN(+d)||(g(b,"moment()."+b+"(period, number) is deprecated. Please use moment()."+b+"(number, period)."),f=c,c=d,d=f),c="string"==typeof c?+c:c,e=tb.duration(c,d),t(this,e,a),this}}function t(a,b,c,d){var e=b._milliseconds,f=b._days,g=b._months;d=null==d?!0:d,e&&a._d.setTime(+a._d+e*c),f&&nb(a,"Date",mb(a,"Date")+f*c),g&&lb(a,mb(a,"Month")+g*c),d&&tb.updateOffset(a,f||g)}function u(a){return"[object Array]"===Object.prototype.toString.call(a)}function v(a){return"[object Date]"===Object.prototype.toString.call(a)||a instanceof Date}function w(a,b,c){var d,e=Math.min(a.length,b.length),f=Math.abs(a.length-b.length),g=0;for(d=0;e>d;d++)(c&&a[d]!==b[d]||!c&&A(a[d])!==A(b[d]))&&g++;return g+f}function x(a){if(a){var b=a.toLowerCase().replace(/(.)s$/,"$1");a=jc[a]||kc[b]||b}return a}function y(a){var b,d,e={};for(d in a)c(a,d)&&(b=x(d),b&&(e[b]=a[d]));return e}function z(b){var c,d;if(0===b.indexOf("week"))c=7,d="day";else{if(0!==b.indexOf("month"))return;c=12,d="month"}tb[b]=function(e,f){var g,h,i=tb._locale[b],j=[];if("number"==typeof e&&(f=e,e=a),h=function(a){var b=tb().utc().set(d,a);return i.call(tb._locale,b,e||"")},null!=f)return h(f);for(g=0;c>g;g++)j.push(h(g));return j}}function A(a){var b=+a,c=0;return 0!==b&&isFinite(b)&&(c=b>=0?Math.floor(b):Math.ceil(b)),c}function B(a,b){return new Date(Date.UTC(a,b+1,0)).getUTCDate()}function C(a,b,c){return hb(tb([a,11,31+b-c]),b,c).week}function D(a){return E(a)?366:365}function E(a){return a%4===0&&a%100!==0||a%400===0}function F(a){var b;a._a&&-2===a._pf.overflow&&(b=a._a[Bb]<0||a._a[Bb]>11?Bb:a._a[Cb]<1||a._a[Cb]>B(a._a[Ab],a._a[Bb])?Cb:a._a[Db]<0||a._a[Db]>23?Db:a._a[Eb]<0||a._a[Eb]>59?Eb:a._a[Fb]<0||a._a[Fb]>59?Fb:a._a[Gb]<0||a._a[Gb]>999?Gb:-1,a._pf._overflowDayOfYear&&(Ab>b||b>Cb)&&(b=Cb),a._pf.overflow=b)}function G(a){return null==a._isValid&&(a._isValid=!isNaN(a._d.getTime())&&a._pf.overflow<0&&!a._pf.empty&&!a._pf.invalidMonth&&!a._pf.nullInput&&!a._pf.invalidFormat&&!a._pf.userInvalidated,a._strict&&(a._isValid=a._isValid&&0===a._pf.charsLeftOver&&0===a._pf.unusedTokens.length)),a._isValid}function H(a){return a?a.toLowerCase().replace("_","-"):a}function I(a){for(var b,c,d,e,f=0;f<a.length;){for(e=H(a[f]).split("-"),b=e.length,c=H(a[f+1]),c=c?c.split("-"):null;b>0;){if(d=J(e.slice(0,b).join("-")))return d;if(c&&c.length>=b&&w(e,c,!0)>=b-1)break;b--}f++}return null}function J(a){var b=null;if(!Hb[a]&&Jb)try{b=tb.locale(),require("./locale/"+a),tb.locale(b)}catch(c){}return Hb[a]}function K(a,b){return b._isUTC?tb(a).zone(b._offset||0):tb(a).local()}function L(a){return a.match(/\[[\s\S]/)?a.replace(/^\[|\]$/g,""):a.replace(/\\/g,"")}function M(a){var b,c,d=a.match(Nb);for(b=0,c=d.length;c>b;b++)d[b]=pc[d[b]]?pc[d[b]]:L(d[b]);return function(e){var f="";for(b=0;c>b;b++)f+=d[b]instanceof Function?d[b].call(e,a):d[b];return f}}function N(a,b){return a.isValid()?(b=O(b,a.localeData()),lc[b]||(lc[b]=M(b)),lc[b](a)):a.localeData().invalidDate()}function O(a,b){function c(a){return b.longDateFormat(a)||a}var d=5;for(Ob.lastIndex=0;d>=0&&Ob.test(a);)a=a.replace(Ob,c),Ob.lastIndex=0,d-=1;return a}function P(a,b){var c,d=b._strict;switch(a){case"Q":return Zb;case"DDDD":return _b;case"YYYY":case"GGGG":case"gggg":return d?ac:Rb;case"Y":case"G":case"g":return cc;case"YYYYYY":case"YYYYY":case"GGGGG":case"ggggg":return d?bc:Sb;case"S":if(d)return Zb;case"SS":if(d)return $b;case"SSS":if(d)return _b;case"DDD":return Qb;case"MMM":case"MMMM":case"dd":case"ddd":case"dddd":return Ub;case"a":case"A":return b._locale._meridiemParse;case"X":return Xb;case"Z":case"ZZ":return Vb;case"T":return Wb;case"SSSS":return Tb;case"MM":case"DD":case"YY":case"GG":case"gg":case"HH":case"hh":case"mm":case"ss":case"ww":case"WW":return d?$b:Pb;case"M":case"D":case"d":case"H":case"h":case"m":case"s":case"w":case"W":case"e":case"E":return Pb;case"Do":return Yb;default:return c=new RegExp(Y(X(a.replace("\\","")),"i"))}}function Q(a){a=a||"";var b=a.match(Vb)||[],c=b[b.length-1]||[],d=(c+"").match(hc)||["-",0,0],e=+(60*d[1])+A(d[2]);return"+"===d[0]?-e:e}function R(a,b,c){var d,e=c._a;switch(a){case"Q":null!=b&&(e[Bb]=3*(A(b)-1));break;case"M":case"MM":null!=b&&(e[Bb]=A(b)-1);break;case"MMM":case"MMMM":d=c._locale.monthsParse(b),null!=d?e[Bb]=d:c._pf.invalidMonth=b;break;case"D":case"DD":null!=b&&(e[Cb]=A(b));break;case"Do":null!=b&&(e[Cb]=A(parseInt(b,10)));break;case"DDD":case"DDDD":null!=b&&(c._dayOfYear=A(b));break;case"YY":e[Ab]=tb.parseTwoDigitYear(b);break;case"YYYY":case"YYYYY":case"YYYYYY":e[Ab]=A(b);break;case"a":case"A":c._isPm=c._locale.isPM(b);break;case"H":case"HH":case"h":case"hh":e[Db]=A(b);break;case"m":case"mm":e[Eb]=A(b);break;case"s":case"ss":e[Fb]=A(b);break;case"S":case"SS":case"SSS":case"SSSS":e[Gb]=A(1e3*("0."+b));break;case"X":c._d=new Date(1e3*parseFloat(b));break;case"Z":case"ZZ":c._useUTC=!0,c._tzm=Q(b);break;case"dd":case"ddd":case"dddd":d=c._locale.weekdaysParse(b),null!=d?(c._w=c._w||{},c._w.d=d):c._pf.invalidWeekday=b;break;case"w":case"ww":case"W":case"WW":case"d":case"e":case"E":a=a.substr(0,1);case"gggg":case"GGGG":case"GGGGG":a=a.substr(0,2),b&&(c._w=c._w||{},c._w[a]=A(b));break;case"gg":case"GG":c._w=c._w||{},c._w[a]=tb.parseTwoDigitYear(b)}}function S(a){var c,d,e,f,g,h,i;c=a._w,null!=c.GG||null!=c.W||null!=c.E?(g=1,h=4,d=b(c.GG,a._a[Ab],hb(tb(),1,4).year),e=b(c.W,1),f=b(c.E,1)):(g=a._locale._week.dow,h=a._locale._week.doy,d=b(c.gg,a._a[Ab],hb(tb(),g,h).year),e=b(c.w,1),null!=c.d?(f=c.d,g>f&&++e):f=null!=c.e?c.e+g:g),i=ib(d,e,f,h,g),a._a[Ab]=i.year,a._dayOfYear=i.dayOfYear}function T(a){var c,d,e,f,g=[];if(!a._d){for(e=V(a),a._w&&null==a._a[Cb]&&null==a._a[Bb]&&S(a),a._dayOfYear&&(f=b(a._a[Ab],e[Ab]),a._dayOfYear>D(f)&&(a._pf._overflowDayOfYear=!0),d=db(f,0,a._dayOfYear),a._a[Bb]=d.getUTCMonth(),a._a[Cb]=d.getUTCDate()),c=0;3>c&&null==a._a[c];++c)a._a[c]=g[c]=e[c];for(;7>c;c++)a._a[c]=g[c]=null==a._a[c]?2===c?1:0:a._a[c];a._d=(a._useUTC?db:cb).apply(null,g),null!=a._tzm&&a._d.setUTCMinutes(a._d.getUTCMinutes()+a._tzm)}}function U(a){var b;a._d||(b=y(a._i),a._a=[b.year,b.month,b.day,b.hour,b.minute,b.second,b.millisecond],T(a))}function V(a){var b=new Date;return a._useUTC?[b.getUTCFullYear(),b.getUTCMonth(),b.getUTCDate()]:[b.getFullYear(),b.getMonth(),b.getDate()]}function W(a){if(a._f===tb.ISO_8601)return void $(a);a._a=[],a._pf.empty=!0;var b,c,d,e,f,g=""+a._i,h=g.length,i=0;for(d=O(a._f,a._locale).match(Nb)||[],b=0;b<d.length;b++)e=d[b],c=(g.match(P(e,a))||[])[0],c&&(f=g.substr(0,g.indexOf(c)),f.length>0&&a._pf.unusedInput.push(f),g=g.slice(g.indexOf(c)+c.length),i+=c.length),pc[e]?(c?a._pf.empty=!1:a._pf.unusedTokens.push(e),R(e,c,a)):a._strict&&!c&&a._pf.unusedTokens.push(e);a._pf.charsLeftOver=h-i,g.length>0&&a._pf.unusedInput.push(g),a._isPm&&a._a[Db]<12&&(a._a[Db]+=12),a._isPm===!1&&12===a._a[Db]&&(a._a[Db]=0),T(a),F(a)}function X(a){return a.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(a,b,c,d,e){return b||c||d||e})}function Y(a){return a.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}function Z(a){var b,c,e,f,g;if(0===a._f.length)return a._pf.invalidFormat=!0,void(a._d=new Date(0/0));for(f=0;f<a._f.length;f++)g=0,b=n({},a),null!=a._useUTC&&(b._useUTC=a._useUTC),b._pf=d(),b._f=a._f[f],W(b),G(b)&&(g+=b._pf.charsLeftOver,g+=10*b._pf.unusedTokens.length,b._pf.score=g,(null==e||e>g)&&(e=g,c=b));m(a,c||b)}function $(a){var b,c,d=a._i,e=dc.exec(d);if(e){for(a._pf.iso=!0,b=0,c=fc.length;c>b;b++)if(fc[b][1].exec(d)){a._f=fc[b][0]+(e[6]||" ");break}for(b=0,c=gc.length;c>b;b++)if(gc[b][1].exec(d)){a._f+=gc[b][0];break}d.match(Vb)&&(a._f+="Z"),W(a)}else a._isValid=!1}function _(a){$(a),a._isValid===!1&&(delete a._isValid,tb.createFromInputFallback(a))}function ab(a,b){var c,d=[];for(c=0;c<a.length;++c)d.push(b(a[c],c));return d}function bb(b){var c,d=b._i;d===a?b._d=new Date:v(d)?b._d=new Date(+d):null!==(c=Kb.exec(d))?b._d=new Date(+c[1]):"string"==typeof d?_(b):u(d)?(b._a=ab(d.slice(0),function(a){return parseInt(a,10)}),T(b)):"object"==typeof d?U(b):"number"==typeof d?b._d=new Date(d):tb.createFromInputFallback(b)}function cb(a,b,c,d,e,f,g){var h=new Date(a,b,c,d,e,f,g);return 1970>a&&h.setFullYear(a),h}function db(a){var b=new Date(Date.UTC.apply(null,arguments));return 1970>a&&b.setUTCFullYear(a),b}function eb(a,b){if("string"==typeof a)if(isNaN(a)){if(a=b.weekdaysParse(a),"number"!=typeof a)return null}else a=parseInt(a,10);return a}function fb(a,b,c,d,e){return e.relativeTime(b||1,!!c,a,d)}function gb(a,b,c){var d=tb.duration(a).abs(),e=yb(d.as("s")),f=yb(d.as("m")),g=yb(d.as("h")),h=yb(d.as("d")),i=yb(d.as("M")),j=yb(d.as("y")),k=e<mc.s&&["s",e]||1===f&&["m"]||f<mc.m&&["mm",f]||1===g&&["h"]||g<mc.h&&["hh",g]||1===h&&["d"]||h<mc.d&&["dd",h]||1===i&&["M"]||i<mc.M&&["MM",i]||1===j&&["y"]||["yy",j];return k[2]=b,k[3]=+a>0,k[4]=c,fb.apply({},k)}function hb(a,b,c){var d,e=c-b,f=c-a.day();return f>e&&(f-=7),e-7>f&&(f+=7),d=tb(a).add(f,"d"),{week:Math.ceil(d.dayOfYear()/7),year:d.year()}}function ib(a,b,c,d,e){var f,g,h=db(a,0,1).getUTCDay();return h=0===h?7:h,c=null!=c?c:e,f=e-h+(h>d?7:0)-(e>h?7:0),g=7*(b-1)+(c-e)+f+1,{year:g>0?a:a-1,dayOfYear:g>0?g:D(a-1)+g}}function jb(b){var c=b._i,d=b._f;return b._locale=b._locale||tb.localeData(b._l),null===c||d===a&&""===c?tb.invalid({nullInput:!0}):("string"==typeof c&&(b._i=c=b._locale.preparse(c)),tb.isMoment(c)?new k(c,!0):(d?u(d)?Z(b):W(b):bb(b),new k(b)))}function kb(a,b){var c,d;if(1===b.length&&u(b[0])&&(b=b[0]),!b.length)return tb();for(c=b[0],d=1;d<b.length;++d)b[d][a](c)&&(c=b[d]);return c}function lb(a,b){var c;return"string"==typeof b&&(b=a.localeData().monthsParse(b),"number"!=typeof b)?a:(c=Math.min(a.date(),B(a.year(),b)),a._d["set"+(a._isUTC?"UTC":"")+"Month"](b,c),a)}function mb(a,b){return a._d["get"+(a._isUTC?"UTC":"")+b]()}function nb(a,b,c){return"Month"===b?lb(a,c):a._d["set"+(a._isUTC?"UTC":"")+b](c)}function ob(a,b){return function(c){return null!=c?(nb(this,a,c),tb.updateOffset(this,b),this):mb(this,a)}}function pb(a){return 400*a/146097}function qb(a){return 146097*a/400}function rb(a){tb.duration.fn[a]=function(){return this._data[a]}}function sb(a){"undefined"==typeof ender&&(ub=xb.moment,xb.moment=a?f("Accessing Moment through the global scope is deprecated, and will be removed in an upcoming release.",tb):tb)}for(var tb,ub,vb,wb="2.8.3",xb="undefined"!=typeof global?global:this,yb=Math.round,zb=Object.prototype.hasOwnProperty,Ab=0,Bb=1,Cb=2,Db=3,Eb=4,Fb=5,Gb=6,Hb={},Ib=[],Jb="undefined"!=typeof module&&module.exports,Kb=/^\/?Date\((\-?\d+)/i,Lb=/(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,Mb=/^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,Nb=/(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,Ob=/(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,Pb=/\d\d?/,Qb=/\d{1,3}/,Rb=/\d{1,4}/,Sb=/[+\-]?\d{1,6}/,Tb=/\d+/,Ub=/[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,Vb=/Z|[\+\-]\d\d:?\d\d/gi,Wb=/T/i,Xb=/[\+\-]?\d+(\.\d{1,3})?/,Yb=/\d{1,2}/,Zb=/\d/,$b=/\d\d/,_b=/\d{3}/,ac=/\d{4}/,bc=/[+-]?\d{6}/,cc=/[+-]?\d+/,dc=/^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,ec="YYYY-MM-DDTHH:mm:ssZ",fc=[["YYYYYY-MM-DD",/[+-]\d{6}-\d{2}-\d{2}/],["YYYY-MM-DD",/\d{4}-\d{2}-\d{2}/],["GGGG-[W]WW-E",/\d{4}-W\d{2}-\d/],["GGGG-[W]WW",/\d{4}-W\d{2}/],["YYYY-DDD",/\d{4}-\d{3}/]],gc=[["HH:mm:ss.SSSS",/(T| )\d\d:\d\d:\d\d\.\d+/],["HH:mm:ss",/(T| )\d\d:\d\d:\d\d/],["HH:mm",/(T| )\d\d:\d\d/],["HH",/(T| )\d\d/]],hc=/([\+\-]|\d\d)/gi,ic=("Date|Hours|Minutes|Seconds|Milliseconds".split("|"),{Milliseconds:1,Seconds:1e3,Minutes:6e4,Hours:36e5,Days:864e5,Months:2592e6,Years:31536e6}),jc={ms:"millisecond",s:"second",m:"minute",h:"hour",d:"day",D:"date",w:"week",W:"isoWeek",M:"month",Q:"quarter",y:"year",DDD:"dayOfYear",e:"weekday",E:"isoWeekday",gg:"weekYear",GG:"isoWeekYear"},kc={dayofyear:"dayOfYear",isoweekday:"isoWeekday",isoweek:"isoWeek",weekyear:"weekYear",isoweekyear:"isoWeekYear"},lc={},mc={s:45,m:45,h:22,d:26,M:11},nc="DDD w W M D d".split(" "),oc="M D H h m s w W".split(" "),pc={M:function(){return this.month()+1},MMM:function(a){return this.localeData().monthsShort(this,a)},MMMM:function(a){return this.localeData().months(this,a)},D:function(){return this.date()},DDD:function(){return this.dayOfYear()},d:function(){return this.day()},dd:function(a){return this.localeData().weekdaysMin(this,a)},ddd:function(a){return this.localeData().weekdaysShort(this,a)},dddd:function(a){return this.localeData().weekdays(this,a)},w:function(){return this.week()},W:function(){return this.isoWeek()},YY:function(){return p(this.year()%100,2)},YYYY:function(){return p(this.year(),4)},YYYYY:function(){return p(this.year(),5)},YYYYYY:function(){var a=this.year(),b=a>=0?"+":"-";return b+p(Math.abs(a),6)},gg:function(){return p(this.weekYear()%100,2)},gggg:function(){return p(this.weekYear(),4)},ggggg:function(){return p(this.weekYear(),5)},GG:function(){return p(this.isoWeekYear()%100,2)},GGGG:function(){return p(this.isoWeekYear(),4)},GGGGG:function(){return p(this.isoWeekYear(),5)},e:function(){return this.weekday()},E:function(){return this.isoWeekday()},a:function(){return this.localeData().meridiem(this.hours(),this.minutes(),!0)},A:function(){return this.localeData().meridiem(this.hours(),this.minutes(),!1)},H:function(){return this.hours()},h:function(){return this.hours()%12||12},m:function(){return this.minutes()},s:function(){return this.seconds()},S:function(){return A(this.milliseconds()/100)},SS:function(){return p(A(this.milliseconds()/10),2)},SSS:function(){return p(this.milliseconds(),3)},SSSS:function(){return p(this.milliseconds(),3)},Z:function(){var a=-this.zone(),b="+";return 0>a&&(a=-a,b="-"),b+p(A(a/60),2)+":"+p(A(a)%60,2)},ZZ:function(){var a=-this.zone(),b="+";return 0>a&&(a=-a,b="-"),b+p(A(a/60),2)+p(A(a)%60,2)},z:function(){return this.zoneAbbr()},zz:function(){return this.zoneName()},X:function(){return this.unix()},Q:function(){return this.quarter()}},qc={},rc=["months","monthsShort","weekdays","weekdaysShort","weekdaysMin"];nc.length;)vb=nc.pop(),pc[vb+"o"]=i(pc[vb],vb);for(;oc.length;)vb=oc.pop(),pc[vb+vb]=h(pc[vb],2);pc.DDDD=h(pc.DDD,3),m(j.prototype,{set:function(a){var b,c;for(c in a)b=a[c],"function"==typeof b?this[c]=b:this["_"+c]=b},_months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),months:function(a){return this._months[a.month()]},_monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),monthsShort:function(a){return this._monthsShort[a.month()]},monthsParse:function(a){var b,c,d;for(this._monthsParse||(this._monthsParse=[]),b=0;12>b;b++)if(this._monthsParse[b]||(c=tb.utc([2e3,b]),d="^"+this.months(c,"")+"|^"+this.monthsShort(c,""),this._monthsParse[b]=new RegExp(d.replace(".",""),"i")),this._monthsParse[b].test(a))return b},_weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdays:function(a){return this._weekdays[a.day()]},_weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysShort:function(a){return this._weekdaysShort[a.day()]},_weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),weekdaysMin:function(a){return this._weekdaysMin[a.day()]},weekdaysParse:function(a){var b,c,d;for(this._weekdaysParse||(this._weekdaysParse=[]),b=0;7>b;b++)if(this._weekdaysParse[b]||(c=tb([2e3,1]).day(b),d="^"+this.weekdays(c,"")+"|^"+this.weekdaysShort(c,"")+"|^"+this.weekdaysMin(c,""),this._weekdaysParse[b]=new RegExp(d.replace(".",""),"i")),this._weekdaysParse[b].test(a))return b},_longDateFormat:{LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY LT",LLLL:"dddd, MMMM D, YYYY LT"},longDateFormat:function(a){var b=this._longDateFormat[a];return!b&&this._longDateFormat[a.toUpperCase()]&&(b=this._longDateFormat[a.toUpperCase()].replace(/MMMM|MM|DD|dddd/g,function(a){return a.slice(1)}),this._longDateFormat[a]=b),b},isPM:function(a){return"p"===(a+"").toLowerCase().charAt(0)},_meridiemParse:/[ap]\.?m?\.?/i,meridiem:function(a,b,c){return a>11?c?"pm":"PM":c?"am":"AM"},_calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},calendar:function(a,b){var c=this._calendar[a];return"function"==typeof c?c.apply(b):c},_relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},relativeTime:function(a,b,c,d){var e=this._relativeTime[c];return"function"==typeof e?e(a,b,c,d):e.replace(/%d/i,a)},pastFuture:function(a,b){var c=this._relativeTime[a>0?"future":"past"];return"function"==typeof c?c(b):c.replace(/%s/i,b)},ordinal:function(a){return this._ordinal.replace("%d",a)},_ordinal:"%d",preparse:function(a){return a},postformat:function(a){return a},week:function(a){return hb(a,this._week.dow,this._week.doy).week},_week:{dow:0,doy:6},_invalidDate:"Invalid date",invalidDate:function(){return this._invalidDate}}),tb=function(b,c,e,f){var g;return"boolean"==typeof e&&(f=e,e=a),g={},g._isAMomentObject=!0,g._i=b,g._f=c,g._l=e,g._strict=f,g._isUTC=!1,g._pf=d(),jb(g)},tb.suppressDeprecationWarnings=!1,tb.createFromInputFallback=f("moment construction falls back to js Date. This is discouraged and will be removed in upcoming major release. Please refer to https://github.com/moment/moment/issues/1407 for more info.",function(a){a._d=new Date(a._i)}),tb.min=function(){var a=[].slice.call(arguments,0);return kb("isBefore",a)},tb.max=function(){var a=[].slice.call(arguments,0);return kb("isAfter",a)},tb.utc=function(b,c,e,f){var g;return"boolean"==typeof e&&(f=e,e=a),g={},g._isAMomentObject=!0,g._useUTC=!0,g._isUTC=!0,g._l=e,g._i=b,g._f=c,g._strict=f,g._pf=d(),jb(g).utc()},tb.unix=function(a){return tb(1e3*a)},tb.duration=function(a,b){var d,e,f,g,h=a,i=null;return tb.isDuration(a)?h={ms:a._milliseconds,d:a._days,M:a._months}:"number"==typeof a?(h={},b?h[b]=a:h.milliseconds=a):(i=Lb.exec(a))?(d="-"===i[1]?-1:1,h={y:0,d:A(i[Cb])*d,h:A(i[Db])*d,m:A(i[Eb])*d,s:A(i[Fb])*d,ms:A(i[Gb])*d}):(i=Mb.exec(a))?(d="-"===i[1]?-1:1,f=function(a){var b=a&&parseFloat(a.replace(",","."));return(isNaN(b)?0:b)*d},h={y:f(i[2]),M:f(i[3]),d:f(i[4]),h:f(i[5]),m:f(i[6]),s:f(i[7]),w:f(i[8])}):"object"==typeof h&&("from"in h||"to"in h)&&(g=r(tb(h.from),tb(h.to)),h={},h.ms=g.milliseconds,h.M=g.months),e=new l(h),tb.isDuration(a)&&c(a,"_locale")&&(e._locale=a._locale),e},tb.version=wb,tb.defaultFormat=ec,tb.ISO_8601=function(){},tb.momentProperties=Ib,tb.updateOffset=function(){},tb.relativeTimeThreshold=function(b,c){return mc[b]===a?!1:c===a?mc[b]:(mc[b]=c,!0)},tb.lang=f("moment.lang is deprecated. Use moment.locale instead.",function(a,b){return tb.locale(a,b)}),tb.locale=function(a,b){var c;return a&&(c="undefined"!=typeof b?tb.defineLocale(a,b):tb.localeData(a),c&&(tb.duration._locale=tb._locale=c)),tb._locale._abbr},tb.defineLocale=function(a,b){return null!==b?(b.abbr=a,Hb[a]||(Hb[a]=new j),Hb[a].set(b),tb.locale(a),Hb[a]):(delete Hb[a],null)},tb.langData=f("moment.langData is deprecated. Use moment.localeData instead.",function(a){return tb.localeData(a)}),tb.localeData=function(a){var b;if(a&&a._locale&&a._locale._abbr&&(a=a._locale._abbr),!a)return tb._locale;if(!u(a)){if(b=J(a))return b;a=[a]}return I(a)},tb.isMoment=function(a){return a instanceof k||null!=a&&c(a,"_isAMomentObject")},tb.isDuration=function(a){return a instanceof l};for(vb=rc.length-1;vb>=0;--vb)z(rc[vb]);tb.normalizeUnits=function(a){return x(a)},tb.invalid=function(a){var b=tb.utc(0/0);return null!=a?m(b._pf,a):b._pf.userInvalidated=!0,b},tb.parseZone=function(){return tb.apply(null,arguments).parseZone()},tb.parseTwoDigitYear=function(a){return A(a)+(A(a)>68?1900:2e3)},m(tb.fn=k.prototype,{clone:function(){return tb(this)},valueOf:function(){return+this._d+6e4*(this._offset||0)},unix:function(){return Math.floor(+this/1e3)},toString:function(){return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},toDate:function(){return this._offset?new Date(+this):this._d},toISOString:function(){var a=tb(this).utc();return 0<a.year()&&a.year()<=9999?N(a,"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"):N(a,"YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]")},toArray:function(){var a=this;return[a.year(),a.month(),a.date(),a.hours(),a.minutes(),a.seconds(),a.milliseconds()]},isValid:function(){return G(this)},isDSTShifted:function(){return this._a?this.isValid()&&w(this._a,(this._isUTC?tb.utc(this._a):tb(this._a)).toArray())>0:!1},parsingFlags:function(){return m({},this._pf)},invalidAt:function(){return this._pf.overflow},utc:function(a){return this.zone(0,a)},local:function(a){return this._isUTC&&(this.zone(0,a),this._isUTC=!1,a&&this.add(this._dateTzOffset(),"m")),this},format:function(a){var b=N(this,a||tb.defaultFormat);return this.localeData().postformat(b)},add:s(1,"add"),subtract:s(-1,"subtract"),diff:function(a,b,c){var d,e,f,g=K(a,this),h=6e4*(this.zone()-g.zone());return b=x(b),"year"===b||"month"===b?(d=432e5*(this.daysInMonth()+g.daysInMonth()),e=12*(this.year()-g.year())+(this.month()-g.month()),f=this-tb(this).startOf("month")-(g-tb(g).startOf("month")),f-=6e4*(this.zone()-tb(this).startOf("month").zone()-(g.zone()-tb(g).startOf("month").zone())),e+=f/d,"year"===b&&(e/=12)):(d=this-g,e="second"===b?d/1e3:"minute"===b?d/6e4:"hour"===b?d/36e5:"day"===b?(d-h)/864e5:"week"===b?(d-h)/6048e5:d),c?e:o(e)},from:function(a,b){return tb.duration({to:this,from:a}).locale(this.locale()).humanize(!b)},fromNow:function(a){return this.from(tb(),a)},calendar:function(a){var b=a||tb(),c=K(b,this).startOf("day"),d=this.diff(c,"days",!0),e=-6>d?"sameElse":-1>d?"lastWeek":0>d?"lastDay":1>d?"sameDay":2>d?"nextDay":7>d?"nextWeek":"sameElse";return this.format(this.localeData().calendar(e,this))},isLeapYear:function(){return E(this.year())},isDST:function(){return this.zone()<this.clone().month(0).zone()||this.zone()<this.clone().month(5).zone()},day:function(a){var b=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=a?(a=eb(a,this.localeData()),this.add(a-b,"d")):b},month:ob("Month",!0),startOf:function(a){switch(a=x(a)){case"year":this.month(0);case"quarter":case"month":this.date(1);case"week":case"isoWeek":case"day":this.hours(0);case"hour":this.minutes(0);case"minute":this.seconds(0);case"second":this.milliseconds(0)}return"week"===a?this.weekday(0):"isoWeek"===a&&this.isoWeekday(1),"quarter"===a&&this.month(3*Math.floor(this.month()/3)),this},endOf:function(a){return a=x(a),this.startOf(a).add(1,"isoWeek"===a?"week":a).subtract(1,"ms")},isAfter:function(a,b){return b=x("undefined"!=typeof b?b:"millisecond"),"millisecond"===b?(a=tb.isMoment(a)?a:tb(a),+this>+a):+this.clone().startOf(b)>+tb(a).startOf(b)},isBefore:function(a,b){return b=x("undefined"!=typeof b?b:"millisecond"),"millisecond"===b?(a=tb.isMoment(a)?a:tb(a),+a>+this):+this.clone().startOf(b)<+tb(a).startOf(b)},isSame:function(a,b){return b=x(b||"millisecond"),"millisecond"===b?(a=tb.isMoment(a)?a:tb(a),+this===+a):+this.clone().startOf(b)===+K(a,this).startOf(b)},min:f("moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548",function(a){return a=tb.apply(null,arguments),this>a?this:a}),max:f("moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548",function(a){return a=tb.apply(null,arguments),a>this?this:a}),zone:function(a,b){var c,d=this._offset||0;return null==a?this._isUTC?d:this._dateTzOffset():("string"==typeof a&&(a=Q(a)),Math.abs(a)<16&&(a=60*a),!this._isUTC&&b&&(c=this._dateTzOffset()),this._offset=a,this._isUTC=!0,null!=c&&this.subtract(c,"m"),d!==a&&(!b||this._changeInProgress?t(this,tb.duration(d-a,"m"),1,!1):this._changeInProgress||(this._changeInProgress=!0,tb.updateOffset(this,!0),this._changeInProgress=null)),this)},zoneAbbr:function(){return this._isUTC?"UTC":""},zoneName:function(){return this._isUTC?"Coordinated Universal Time":""},parseZone:function(){return this._tzm?this.zone(this._tzm):"string"==typeof this._i&&this.zone(this._i),this},hasAlignedHourOffset:function(a){return a=a?tb(a).zone():0,(this.zone()-a)%60===0},daysInMonth:function(){return B(this.year(),this.month())},dayOfYear:function(a){var b=yb((tb(this).startOf("day")-tb(this).startOf("year"))/864e5)+1;return null==a?b:this.add(a-b,"d")},quarter:function(a){return null==a?Math.ceil((this.month()+1)/3):this.month(3*(a-1)+this.month()%3)},weekYear:function(a){var b=hb(this,this.localeData()._week.dow,this.localeData()._week.doy).year;return null==a?b:this.add(a-b,"y")},isoWeekYear:function(a){var b=hb(this,1,4).year;return null==a?b:this.add(a-b,"y")},week:function(a){var b=this.localeData().week(this);return null==a?b:this.add(7*(a-b),"d")},isoWeek:function(a){var b=hb(this,1,4).week;return null==a?b:this.add(7*(a-b),"d")},weekday:function(a){var b=(this.day()+7-this.localeData()._week.dow)%7;return null==a?b:this.add(a-b,"d")},isoWeekday:function(a){return null==a?this.day()||7:this.day(this.day()%7?a:a-7)},isoWeeksInYear:function(){return C(this.year(),1,4)},weeksInYear:function(){var a=this.localeData()._week;return C(this.year(),a.dow,a.doy)},get:function(a){return a=x(a),this[a]()},set:function(a,b){return a=x(a),"function"==typeof this[a]&&this[a](b),this},locale:function(b){var c;return b===a?this._locale._abbr:(c=tb.localeData(b),null!=c&&(this._locale=c),this)},lang:f("moment().lang() is deprecated. Use moment().localeData() instead.",function(b){return b===a?this.localeData():this.locale(b)}),localeData:function(){return this._locale},_dateTzOffset:function(){return 15*Math.round(this._d.getTimezoneOffset()/15)}}),tb.fn.millisecond=tb.fn.milliseconds=ob("Milliseconds",!1),tb.fn.second=tb.fn.seconds=ob("Seconds",!1),tb.fn.minute=tb.fn.minutes=ob("Minutes",!1),tb.fn.hour=tb.fn.hours=ob("Hours",!0),tb.fn.date=ob("Date",!0),tb.fn.dates=f("dates accessor is deprecated. Use date instead.",ob("Date",!0)),tb.fn.year=ob("FullYear",!0),tb.fn.years=f("years accessor is deprecated. Use year instead.",ob("FullYear",!0)),tb.fn.days=tb.fn.day,tb.fn.months=tb.fn.month,tb.fn.weeks=tb.fn.week,tb.fn.isoWeeks=tb.fn.isoWeek,tb.fn.quarters=tb.fn.quarter,tb.fn.toJSON=tb.fn.toISOString,m(tb.duration.fn=l.prototype,{_bubble:function(){var a,b,c,d=this._milliseconds,e=this._days,f=this._months,g=this._data,h=0;g.milliseconds=d%1e3,a=o(d/1e3),g.seconds=a%60,b=o(a/60),g.minutes=b%60,c=o(b/60),g.hours=c%24,e+=o(c/24),h=o(pb(e)),e-=o(qb(h)),f+=o(e/30),e%=30,h+=o(f/12),f%=12,g.days=e,g.months=f,g.years=h},abs:function(){return this._milliseconds=Math.abs(this._milliseconds),this._days=Math.abs(this._days),this._months=Math.abs(this._months),this._data.milliseconds=Math.abs(this._data.milliseconds),this._data.seconds=Math.abs(this._data.seconds),this._data.minutes=Math.abs(this._data.minutes),this._data.hours=Math.abs(this._data.hours),this._data.months=Math.abs(this._data.months),this._data.years=Math.abs(this._data.years),this},weeks:function(){return o(this.days()/7)},valueOf:function(){return this._milliseconds+864e5*this._days+this._months%12*2592e6+31536e6*A(this._months/12)},humanize:function(a){var b=gb(this,!a,this.localeData());return a&&(b=this.localeData().pastFuture(+this,b)),this.localeData().postformat(b)},add:function(a,b){var c=tb.duration(a,b);return this._milliseconds+=c._milliseconds,this._days+=c._days,this._months+=c._months,this._bubble(),this},subtract:function(a,b){var c=tb.duration(a,b);return this._milliseconds-=c._milliseconds,this._days-=c._days,this._months-=c._months,this._bubble(),this},get:function(a){return a=x(a),this[a.toLowerCase()+"s"]()},as:function(a){var b,c;if(a=x(a),"month"===a||"year"===a)return b=this._days+this._milliseconds/864e5,c=this._months+12*pb(b),"month"===a?c:c/12;switch(b=this._days+qb(this._months/12),a){case"week":return b/7+this._milliseconds/6048e5;case"day":return b+this._milliseconds/864e5;case"hour":return 24*b+this._milliseconds/36e5;case"minute":return 24*b*60+this._milliseconds/6e4;case"second":return 24*b*60*60+this._milliseconds/1e3;case"millisecond":return Math.floor(24*b*60*60*1e3)+this._milliseconds;default:throw new Error("Unknown unit "+a)}},lang:tb.fn.lang,locale:tb.fn.locale,toIsoString:f("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)",function(){return this.toISOString()}),toISOString:function(){var a=Math.abs(this.years()),b=Math.abs(this.months()),c=Math.abs(this.days()),d=Math.abs(this.hours()),e=Math.abs(this.minutes()),f=Math.abs(this.seconds()+this.milliseconds()/1e3);return this.asSeconds()?(this.asSeconds()<0?"-":"")+"P"+(a?a+"Y":"")+(b?b+"M":"")+(c?c+"D":"")+(d||e||f?"T":"")+(d?d+"H":"")+(e?e+"M":"")+(f?f+"S":""):"P0D"},localeData:function(){return this._locale}}),tb.duration.fn.toString=tb.duration.fn.toISOString;for(vb in ic)c(ic,vb)&&rb(vb.toLowerCase());tb.duration.fn.asMilliseconds=function(){return this.as("ms")},tb.duration.fn.asSeconds=function(){return this.as("s")},tb.duration.fn.asMinutes=function(){return this.as("m")},tb.duration.fn.asHours=function(){return this.as("h")},tb.duration.fn.asDays=function(){return this.as("d")},tb.duration.fn.asWeeks=function(){return this.as("weeks")},tb.duration.fn.asMonths=function(){return this.as("M")},tb.duration.fn.asYears=function(){return this.as("y")},tb.locale("en",{ordinal:function(a){var b=a%10,c=1===A(a%100/10)?"th":1===b?"st":2===b?"nd":3===b?"rd":"th";
return a+c}}),function(a){a(tb)}(function(a){return a.defineLocale("af",{months:"Januarie_Februarie_Maart_April_Mei_Junie_Julie_Augustus_September_Oktober_November_Desember".split("_"),monthsShort:"Jan_Feb_Mar_Apr_Mei_Jun_Jul_Aug_Sep_Okt_Nov_Des".split("_"),weekdays:"Sondag_Maandag_Dinsdag_Woensdag_Donderdag_Vrydag_Saterdag".split("_"),weekdaysShort:"Son_Maa_Din_Woe_Don_Vry_Sat".split("_"),weekdaysMin:"So_Ma_Di_Wo_Do_Vr_Sa".split("_"),meridiem:function(a,b,c){return 12>a?c?"vm":"VM":c?"nm":"NM"},longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Vandag om] LT",nextDay:"[Môre om] LT",nextWeek:"dddd [om] LT",lastDay:"[Gister om] LT",lastWeek:"[Laas] dddd [om] LT",sameElse:"L"},relativeTime:{future:"oor %s",past:"%s gelede",s:"'n paar sekondes",m:"'n minuut",mm:"%d minute",h:"'n uur",hh:"%d ure",d:"'n dag",dd:"%d dae",M:"'n maand",MM:"%d maande",y:"'n jaar",yy:"%d jaar"},ordinal:function(a){return a+(1===a||8===a||a>=20?"ste":"de")},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("ar-ma",{months:"يناير_فبراير_مارس_أبريل_ماي_يونيو_يوليوز_غشت_شتنبر_أكتوبر_نونبر_دجنبر".split("_"),monthsShort:"يناير_فبراير_مارس_أبريل_ماي_يونيو_يوليوز_غشت_شتنبر_أكتوبر_نونبر_دجنبر".split("_"),weekdays:"الأحد_الإتنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"احد_اتنين_ثلاثاء_اربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[اليوم على الساعة] LT",nextDay:"[غدا على الساعة] LT",nextWeek:"dddd [على الساعة] LT",lastDay:"[أمس على الساعة] LT",lastWeek:"dddd [على الساعة] LT",sameElse:"L"},relativeTime:{future:"في %s",past:"منذ %s",s:"ثوان",m:"دقيقة",mm:"%d دقائق",h:"ساعة",hh:"%d ساعات",d:"يوم",dd:"%d أيام",M:"شهر",MM:"%d أشهر",y:"سنة",yy:"%d سنوات"},week:{dow:6,doy:12}})}),function(a){a(tb)}(function(a){var b={1:"١",2:"٢",3:"٣",4:"٤",5:"٥",6:"٦",7:"٧",8:"٨",9:"٩",0:"٠"},c={"١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٠":"0"};return a.defineLocale("ar-sa",{months:"يناير_فبراير_مارس_أبريل_مايو_يونيو_يوليو_أغسطس_سبتمبر_أكتوبر_نوفمبر_ديسمبر".split("_"),monthsShort:"يناير_فبراير_مارس_أبريل_مايو_يونيو_يوليو_أغسطس_سبتمبر_أكتوبر_نوفمبر_ديسمبر".split("_"),weekdays:"الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"أحد_إثنين_ثلاثاء_أربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},meridiem:function(a){return 12>a?"ص":"م"},calendar:{sameDay:"[اليوم على الساعة] LT",nextDay:"[غدا على الساعة] LT",nextWeek:"dddd [على الساعة] LT",lastDay:"[أمس على الساعة] LT",lastWeek:"dddd [على الساعة] LT",sameElse:"L"},relativeTime:{future:"في %s",past:"منذ %s",s:"ثوان",m:"دقيقة",mm:"%d دقائق",h:"ساعة",hh:"%d ساعات",d:"يوم",dd:"%d أيام",M:"شهر",MM:"%d أشهر",y:"سنة",yy:"%d سنوات"},preparse:function(a){return a.replace(/[۰-۹]/g,function(a){return c[a]}).replace(/،/g,",")},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]}).replace(/,/g,"،")},week:{dow:6,doy:12}})}),function(a){a(tb)}(function(a){var b={1:"١",2:"٢",3:"٣",4:"٤",5:"٥",6:"٦",7:"٧",8:"٨",9:"٩",0:"٠"},c={"١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٠":"0"},d=function(a){return 0===a?0:1===a?1:2===a?2:a%100>=3&&10>=a%100?3:a%100>=11?4:5},e={s:["أقل من ثانية","ثانية واحدة",["ثانيتان","ثانيتين"],"%d ثوان","%d ثانية","%d ثانية"],m:["أقل من دقيقة","دقيقة واحدة",["دقيقتان","دقيقتين"],"%d دقائق","%d دقيقة","%d دقيقة"],h:["أقل من ساعة","ساعة واحدة",["ساعتان","ساعتين"],"%d ساعات","%d ساعة","%d ساعة"],d:["أقل من يوم","يوم واحد",["يومان","يومين"],"%d أيام","%d يومًا","%d يوم"],M:["أقل من شهر","شهر واحد",["شهران","شهرين"],"%d أشهر","%d شهرا","%d شهر"],y:["أقل من عام","عام واحد",["عامان","عامين"],"%d أعوام","%d عامًا","%d عام"]},f=function(a){return function(b,c){var f=d(b),g=e[a][d(b)];return 2===f&&(g=g[c?0:1]),g.replace(/%d/i,b)}},g=["كانون الثاني يناير","شباط فبراير","آذار مارس","نيسان أبريل","أيار مايو","حزيران يونيو","تموز يوليو","آب أغسطس","أيلول سبتمبر","تشرين الأول أكتوبر","تشرين الثاني نوفمبر","كانون الأول ديسمبر"];return a.defineLocale("ar",{months:g,monthsShort:g,weekdays:"الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"أحد_إثنين_ثلاثاء_أربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},meridiem:function(a){return 12>a?"ص":"م"},calendar:{sameDay:"[اليوم عند الساعة] LT",nextDay:"[غدًا عند الساعة] LT",nextWeek:"dddd [عند الساعة] LT",lastDay:"[أمس عند الساعة] LT",lastWeek:"dddd [عند الساعة] LT",sameElse:"L"},relativeTime:{future:"بعد %s",past:"منذ %s",s:f("s"),m:f("m"),mm:f("m"),h:f("h"),hh:f("h"),d:f("d"),dd:f("d"),M:f("M"),MM:f("M"),y:f("y"),yy:f("y")},preparse:function(a){return a.replace(/[۰-۹]/g,function(a){return c[a]}).replace(/،/g,",")},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]}).replace(/,/g,"،")},week:{dow:6,doy:12}})}),function(a){a(tb)}(function(a){var b={1:"-inci",5:"-inci",8:"-inci",70:"-inci",80:"-inci",2:"-nci",7:"-nci",20:"-nci",50:"-nci",3:"-üncü",4:"-üncü",100:"-üncü",6:"-ncı",9:"-uncu",10:"-uncu",30:"-uncu",60:"-ıncı",90:"-ıncı"};return a.defineLocale("az",{months:"yanvar_fevral_mart_aprel_may_iyun_iyul_avqust_sentyabr_oktyabr_noyabr_dekabr".split("_"),monthsShort:"yan_fev_mar_apr_may_iyn_iyl_avq_sen_okt_noy_dek".split("_"),weekdays:"Bazar_Bazar ertəsi_Çərşənbə axşamı_Çərşənbə_Cümə axşamı_Cümə_Şənbə".split("_"),weekdaysShort:"Baz_BzE_ÇAx_Çər_CAx_Cüm_Şən".split("_"),weekdaysMin:"Bz_BE_ÇA_Çə_CA_Cü_Şə".split("_"),longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[bugün saat] LT",nextDay:"[sabah saat] LT",nextWeek:"[gələn həftə] dddd [saat] LT",lastDay:"[dünən] LT",lastWeek:"[keçən həftə] dddd [saat] LT",sameElse:"L"},relativeTime:{future:"%s sonra",past:"%s əvvəl",s:"birneçə saniyyə",m:"bir dəqiqə",mm:"%d dəqiqə",h:"bir saat",hh:"%d saat",d:"bir gün",dd:"%d gün",M:"bir ay",MM:"%d ay",y:"bir il",yy:"%d il"},meridiem:function(a){return 4>a?"gecə":12>a?"səhər":17>a?"gündüz":"axşam"},ordinal:function(a){if(0===a)return a+"-ıncı";var c=a%10,d=a%100-c,e=a>=100?100:null;return a+(b[c]||b[d]||b[e])},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){function b(a,b){var c=a.split("_");return b%10===1&&b%100!==11?c[0]:b%10>=2&&4>=b%10&&(10>b%100||b%100>=20)?c[1]:c[2]}function c(a,c,d){var e={mm:c?"хвіліна_хвіліны_хвілін":"хвіліну_хвіліны_хвілін",hh:c?"гадзіна_гадзіны_гадзін":"гадзіну_гадзіны_гадзін",dd:"дзень_дні_дзён",MM:"месяц_месяцы_месяцаў",yy:"год_гады_гадоў"};return"m"===d?c?"хвіліна":"хвіліну":"h"===d?c?"гадзіна":"гадзіну":a+" "+b(e[d],+a)}function d(a,b){var c={nominative:"студзень_люты_сакавік_красавік_травень_чэрвень_ліпень_жнівень_верасень_кастрычнік_лістапад_снежань".split("_"),accusative:"студзеня_лютага_сакавіка_красавіка_траўня_чэрвеня_ліпеня_жніўня_верасня_кастрычніка_лістапада_снежня".split("_")},d=/D[oD]?(\[[^\[\]]*\]|\s+)+MMMM?/.test(b)?"accusative":"nominative";return c[d][a.month()]}function e(a,b){var c={nominative:"нядзеля_панядзелак_аўторак_серада_чацвер_пятніца_субота".split("_"),accusative:"нядзелю_панядзелак_аўторак_сераду_чацвер_пятніцу_суботу".split("_")},d=/\[ ?[Вв] ?(?:мінулую|наступную)? ?\] ?dddd/.test(b)?"accusative":"nominative";return c[d][a.day()]}return a.defineLocale("be",{months:d,monthsShort:"студ_лют_сак_крас_трав_чэрв_ліп_жнів_вер_каст_ліст_снеж".split("_"),weekdays:e,weekdaysShort:"нд_пн_ат_ср_чц_пт_сб".split("_"),weekdaysMin:"нд_пн_ат_ср_чц_пт_сб".split("_"),longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY г.",LLL:"D MMMM YYYY г., LT",LLLL:"dddd, D MMMM YYYY г., LT"},calendar:{sameDay:"[Сёння ў] LT",nextDay:"[Заўтра ў] LT",lastDay:"[Учора ў] LT",nextWeek:function(){return"[У] dddd [ў] LT"},lastWeek:function(){switch(this.day()){case 0:case 3:case 5:case 6:return"[У мінулую] dddd [ў] LT";case 1:case 2:case 4:return"[У мінулы] dddd [ў] LT"}},sameElse:"L"},relativeTime:{future:"праз %s",past:"%s таму",s:"некалькі секунд",m:c,mm:c,h:c,hh:c,d:"дзень",dd:c,M:"месяц",MM:c,y:"год",yy:c},meridiem:function(a){return 4>a?"ночы":12>a?"раніцы":17>a?"дня":"вечара"},ordinal:function(a,b){switch(b){case"M":case"d":case"DDD":case"w":case"W":return a%10!==2&&a%10!==3||a%100===12||a%100===13?a+"-ы":a+"-і";case"D":return a+"-га";default:return a}},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("bg",{months:"януари_февруари_март_април_май_юни_юли_август_септември_октомври_ноември_декември".split("_"),monthsShort:"янр_фев_мар_апр_май_юни_юли_авг_сеп_окт_ное_дек".split("_"),weekdays:"неделя_понеделник_вторник_сряда_четвъртък_петък_събота".split("_"),weekdaysShort:"нед_пон_вто_сря_чет_пет_съб".split("_"),weekdaysMin:"нд_пн_вт_ср_чт_пт_сб".split("_"),longDateFormat:{LT:"H:mm",L:"D.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Днес в] LT",nextDay:"[Утре в] LT",nextWeek:"dddd [в] LT",lastDay:"[Вчера в] LT",lastWeek:function(){switch(this.day()){case 0:case 3:case 6:return"[В изминалата] dddd [в] LT";case 1:case 2:case 4:case 5:return"[В изминалия] dddd [в] LT"}},sameElse:"L"},relativeTime:{future:"след %s",past:"преди %s",s:"няколко секунди",m:"минута",mm:"%d минути",h:"час",hh:"%d часа",d:"ден",dd:"%d дни",M:"месец",MM:"%d месеца",y:"година",yy:"%d години"},ordinal:function(a){var b=a%10,c=a%100;return 0===a?a+"-ев":0===c?a+"-ен":c>10&&20>c?a+"-ти":1===b?a+"-ви":2===b?a+"-ри":7===b||8===b?a+"-ми":a+"-ти"},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){var b={1:"১",2:"২",3:"৩",4:"৪",5:"৫",6:"৬",7:"৭",8:"৮",9:"৯",0:"০"},c={"১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9","০":"0"};return a.defineLocale("bn",{months:"জানুয়ারী_ফেবুয়ারী_মার্চ_এপ্রিল_মে_জুন_জুলাই_অগাস্ট_সেপ্টেম্বর_অক্টোবর_নভেম্বর_ডিসেম্বর".split("_"),monthsShort:"জানু_ফেব_মার্চ_এপর_মে_জুন_জুল_অগ_সেপ্ট_অক্টো_নভ_ডিসেম্".split("_"),weekdays:"রবিবার_সোমবার_মঙ্গলবার_বুধবার_বৃহস্পত্তিবার_শুক্রুবার_শনিবার".split("_"),weekdaysShort:"রবি_সোম_মঙ্গল_বুধ_বৃহস্পত্তি_শুক্রু_শনি".split("_"),weekdaysMin:"রব_সম_মঙ্গ_বু_ব্রিহ_শু_শনি".split("_"),longDateFormat:{LT:"A h:mm সময়",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, LT",LLLL:"dddd, D MMMM YYYY, LT"},calendar:{sameDay:"[আজ] LT",nextDay:"[আগামীকাল] LT",nextWeek:"dddd, LT",lastDay:"[গতকাল] LT",lastWeek:"[গত] dddd, LT",sameElse:"L"},relativeTime:{future:"%s পরে",past:"%s আগে",s:"কএক সেকেন্ড",m:"এক মিনিট",mm:"%d মিনিট",h:"এক ঘন্টা",hh:"%d ঘন্টা",d:"এক দিন",dd:"%d দিন",M:"এক মাস",MM:"%d মাস",y:"এক বছর",yy:"%d বছর"},preparse:function(a){return a.replace(/[১২৩৪৫৬৭৮৯০]/g,function(a){return c[a]})},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]})},meridiem:function(a){return 4>a?"রাত":10>a?"শকাল":17>a?"দুপুর":20>a?"বিকেল":"রাত"},week:{dow:0,doy:6}})}),function(a){a(tb)}(function(a){var b={1:"༡",2:"༢",3:"༣",4:"༤",5:"༥",6:"༦",7:"༧",8:"༨",9:"༩",0:"༠"},c={"༡":"1","༢":"2","༣":"3","༤":"4","༥":"5","༦":"6","༧":"7","༨":"8","༩":"9","༠":"0"};return a.defineLocale("bo",{months:"ཟླ་བ་དང་པོ_ཟླ་བ་གཉིས་པ_ཟླ་བ་གསུམ་པ_ཟླ་བ་བཞི་པ_ཟླ་བ་ལྔ་པ_ཟླ་བ་དྲུག་པ_ཟླ་བ་བདུན་པ_ཟླ་བ་བརྒྱད་པ_ཟླ་བ་དགུ་པ_ཟླ་བ་བཅུ་པ_ཟླ་བ་བཅུ་གཅིག་པ_ཟླ་བ་བཅུ་གཉིས་པ".split("_"),monthsShort:"ཟླ་བ་དང་པོ_ཟླ་བ་གཉིས་པ_ཟླ་བ་གསུམ་པ_ཟླ་བ་བཞི་པ_ཟླ་བ་ལྔ་པ_ཟླ་བ་དྲུག་པ_ཟླ་བ་བདུན་པ_ཟླ་བ་བརྒྱད་པ_ཟླ་བ་དགུ་པ_ཟླ་བ་བཅུ་པ_ཟླ་བ་བཅུ་གཅིག་པ_ཟླ་བ་བཅུ་གཉིས་པ".split("_"),weekdays:"གཟའ་ཉི་མ་_གཟའ་ཟླ་བ་_གཟའ་མིག་དམར་_གཟའ་ལྷག་པ་_གཟའ་ཕུར་བུ_གཟའ་པ་སངས་_གཟའ་སྤེན་པ་".split("_"),weekdaysShort:"ཉི་མ་_ཟླ་བ་_མིག་དམར་_ལྷག་པ་_ཕུར་བུ_པ་སངས་_སྤེན་པ་".split("_"),weekdaysMin:"ཉི་མ་_ཟླ་བ་_མིག་དམར་_ལྷག་པ་_ཕུར་བུ_པ་སངས་_སྤེན་པ་".split("_"),longDateFormat:{LT:"A h:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, LT",LLLL:"dddd, D MMMM YYYY, LT"},calendar:{sameDay:"[དི་རིང] LT",nextDay:"[སང་ཉིན] LT",nextWeek:"[བདུན་ཕྲག་རྗེས་མ], LT",lastDay:"[ཁ་སང] LT",lastWeek:"[བདུན་ཕྲག་མཐའ་མ] dddd, LT",sameElse:"L"},relativeTime:{future:"%s ལ་",past:"%s སྔན་ལ",s:"ལམ་སང",m:"སྐར་མ་གཅིག",mm:"%d སྐར་མ",h:"ཆུ་ཚོད་གཅིག",hh:"%d ཆུ་ཚོད",d:"ཉིན་གཅིག",dd:"%d ཉིན་",M:"ཟླ་བ་གཅིག",MM:"%d ཟླ་བ",y:"ལོ་གཅིག",yy:"%d ལོ"},preparse:function(a){return a.replace(/[༡༢༣༤༥༦༧༨༩༠]/g,function(a){return c[a]})},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]})},meridiem:function(a){return 4>a?"མཚན་མོ":10>a?"ཞོགས་ཀས":17>a?"ཉིན་གུང":20>a?"དགོང་དག":"མཚན་མོ"},week:{dow:0,doy:6}})}),function(a){a(tb)}(function(b){function c(a,b,c){var d={mm:"munutenn",MM:"miz",dd:"devezh"};return a+" "+f(d[c],a)}function d(a){switch(e(a)){case 1:case 3:case 4:case 5:case 9:return a+" bloaz";default:return a+" vloaz"}}function e(a){return a>9?e(a%10):a}function f(a,b){return 2===b?g(a):a}function g(b){var c={m:"v",b:"v",d:"z"};return c[b.charAt(0)]===a?b:c[b.charAt(0)]+b.substring(1)}return b.defineLocale("br",{months:"Genver_C'hwevrer_Meurzh_Ebrel_Mae_Mezheven_Gouere_Eost_Gwengolo_Here_Du_Kerzu".split("_"),monthsShort:"Gen_C'hwe_Meu_Ebr_Mae_Eve_Gou_Eos_Gwe_Her_Du_Ker".split("_"),weekdays:"Sul_Lun_Meurzh_Merc'her_Yaou_Gwener_Sadorn".split("_"),weekdaysShort:"Sul_Lun_Meu_Mer_Yao_Gwe_Sad".split("_"),weekdaysMin:"Su_Lu_Me_Mer_Ya_Gw_Sa".split("_"),longDateFormat:{LT:"h[e]mm A",L:"DD/MM/YYYY",LL:"D [a viz] MMMM YYYY",LLL:"D [a viz] MMMM YYYY LT",LLLL:"dddd, D [a viz] MMMM YYYY LT"},calendar:{sameDay:"[Hiziv da] LT",nextDay:"[Warc'hoazh da] LT",nextWeek:"dddd [da] LT",lastDay:"[Dec'h da] LT",lastWeek:"dddd [paset da] LT",sameElse:"L"},relativeTime:{future:"a-benn %s",past:"%s 'zo",s:"un nebeud segondennoù",m:"ur vunutenn",mm:c,h:"un eur",hh:"%d eur",d:"un devezh",dd:c,M:"ur miz",MM:c,y:"ur bloaz",yy:d},ordinal:function(a){var b=1===a?"añ":"vet";return a+b},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a,b,c){var d=a+" ";switch(c){case"m":return b?"jedna minuta":"jedne minute";case"mm":return d+=1===a?"minuta":2===a||3===a||4===a?"minute":"minuta";case"h":return b?"jedan sat":"jednog sata";case"hh":return d+=1===a?"sat":2===a||3===a||4===a?"sata":"sati";case"dd":return d+=1===a?"dan":"dana";case"MM":return d+=1===a?"mjesec":2===a||3===a||4===a?"mjeseca":"mjeseci";case"yy":return d+=1===a?"godina":2===a||3===a||4===a?"godine":"godina"}}return a.defineLocale("bs",{months:"januar_februar_mart_april_maj_juni_juli_avgust_septembar_oktobar_novembar_decembar".split("_"),monthsShort:"jan._feb._mar._apr._maj._jun._jul._avg._sep._okt._nov._dec.".split("_"),weekdays:"nedjelja_ponedjeljak_utorak_srijeda_četvrtak_petak_subota".split("_"),weekdaysShort:"ned._pon._uto._sri._čet._pet._sub.".split("_"),weekdaysMin:"ne_po_ut_sr_če_pe_su".split("_"),longDateFormat:{LT:"H:mm",L:"DD. MM. YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[danas u] LT",nextDay:"[sutra u] LT",nextWeek:function(){switch(this.day()){case 0:return"[u] [nedjelju] [u] LT";case 3:return"[u] [srijedu] [u] LT";case 6:return"[u] [subotu] [u] LT";case 1:case 2:case 4:case 5:return"[u] dddd [u] LT"}},lastDay:"[jučer u] LT",lastWeek:function(){switch(this.day()){case 0:case 3:return"[prošlu] dddd [u] LT";case 6:return"[prošle] [subote] [u] LT";case 1:case 2:case 4:case 5:return"[prošli] dddd [u] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"prije %s",s:"par sekundi",m:b,mm:b,h:b,hh:b,d:"dan",dd:b,M:"mjesec",MM:b,y:"godinu",yy:b},ordinal:"%d.",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("ca",{months:"gener_febrer_març_abril_maig_juny_juliol_agost_setembre_octubre_novembre_desembre".split("_"),monthsShort:"gen._febr._mar._abr._mai._jun._jul._ag._set._oct._nov._des.".split("_"),weekdays:"diumenge_dilluns_dimarts_dimecres_dijous_divendres_dissabte".split("_"),weekdaysShort:"dg._dl._dt._dc._dj._dv._ds.".split("_"),weekdaysMin:"Dg_Dl_Dt_Dc_Dj_Dv_Ds".split("_"),longDateFormat:{LT:"H:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:function(){return"[avui a "+(1!==this.hours()?"les":"la")+"] LT"},nextDay:function(){return"[demà a "+(1!==this.hours()?"les":"la")+"] LT"},nextWeek:function(){return"dddd [a "+(1!==this.hours()?"les":"la")+"] LT"},lastDay:function(){return"[ahir a "+(1!==this.hours()?"les":"la")+"] LT"},lastWeek:function(){return"[el] dddd [passat a "+(1!==this.hours()?"les":"la")+"] LT"},sameElse:"L"},relativeTime:{future:"en %s",past:"fa %s",s:"uns segons",m:"un minut",mm:"%d minuts",h:"una hora",hh:"%d hores",d:"un dia",dd:"%d dies",M:"un mes",MM:"%d mesos",y:"un any",yy:"%d anys"},ordinal:"%dº",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a){return a>1&&5>a&&1!==~~(a/10)}function c(a,c,d,e){var f=a+" ";switch(d){case"s":return c||e?"pár sekund":"pár sekundami";case"m":return c?"minuta":e?"minutu":"minutou";case"mm":return c||e?f+(b(a)?"minuty":"minut"):f+"minutami";break;case"h":return c?"hodina":e?"hodinu":"hodinou";case"hh":return c||e?f+(b(a)?"hodiny":"hodin"):f+"hodinami";break;case"d":return c||e?"den":"dnem";case"dd":return c||e?f+(b(a)?"dny":"dní"):f+"dny";break;case"M":return c||e?"měsíc":"měsícem";case"MM":return c||e?f+(b(a)?"měsíce":"měsíců"):f+"měsíci";break;case"y":return c||e?"rok":"rokem";case"yy":return c||e?f+(b(a)?"roky":"let"):f+"lety"}}var d="leden_únor_březen_duben_květen_červen_červenec_srpen_září_říjen_listopad_prosinec".split("_"),e="led_úno_bře_dub_kvě_čvn_čvc_srp_zář_říj_lis_pro".split("_");return a.defineLocale("cs",{months:d,monthsShort:e,monthsParse:function(a,b){var c,d=[];for(c=0;12>c;c++)d[c]=new RegExp("^"+a[c]+"$|^"+b[c]+"$","i");return d}(d,e),weekdays:"neděle_pondělí_úterý_středa_čtvrtek_pátek_sobota".split("_"),weekdaysShort:"ne_po_út_st_čt_pá_so".split("_"),weekdaysMin:"ne_po_út_st_čt_pá_so".split("_"),longDateFormat:{LT:"H:mm",L:"DD. MM. YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd D. MMMM YYYY LT"},calendar:{sameDay:"[dnes v] LT",nextDay:"[zítra v] LT",nextWeek:function(){switch(this.day()){case 0:return"[v neděli v] LT";case 1:case 2:return"[v] dddd [v] LT";case 3:return"[ve středu v] LT";case 4:return"[ve čtvrtek v] LT";case 5:return"[v pátek v] LT";case 6:return"[v sobotu v] LT"}},lastDay:"[včera v] LT",lastWeek:function(){switch(this.day()){case 0:return"[minulou neděli v] LT";case 1:case 2:return"[minulé] dddd [v] LT";case 3:return"[minulou středu v] LT";case 4:case 5:return"[minulý] dddd [v] LT";case 6:return"[minulou sobotu v] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"před %s",s:c,m:c,mm:c,h:c,hh:c,d:c,dd:c,M:c,MM:c,y:c,yy:c},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("cv",{months:"кăрлач_нарăс_пуш_ака_май_çĕртме_утă_çурла_авăн_юпа_чӳк_раштав".split("_"),monthsShort:"кăр_нар_пуш_ака_май_çĕр_утă_çур_ав_юпа_чӳк_раш".split("_"),weekdays:"вырсарникун_тунтикун_ытларикун_юнкун_кĕçнерникун_эрнекун_шăматкун".split("_"),weekdaysShort:"выр_тун_ытл_юн_кĕç_эрн_шăм".split("_"),weekdaysMin:"вр_тн_ыт_юн_кç_эр_шм".split("_"),longDateFormat:{LT:"HH:mm",L:"DD-MM-YYYY",LL:"YYYY [çулхи] MMMM [уйăхĕн] D[-мĕшĕ]",LLL:"YYYY [çулхи] MMMM [уйăхĕн] D[-мĕшĕ], LT",LLLL:"dddd, YYYY [çулхи] MMMM [уйăхĕн] D[-мĕшĕ], LT"},calendar:{sameDay:"[Паян] LT [сехетре]",nextDay:"[Ыран] LT [сехетре]",lastDay:"[Ĕнер] LT [сехетре]",nextWeek:"[Çитес] dddd LT [сехетре]",lastWeek:"[Иртнĕ] dddd LT [сехетре]",sameElse:"L"},relativeTime:{future:function(a){var b=/сехет$/i.exec(a)?"рен":/çул$/i.exec(a)?"тан":"ран";return a+b},past:"%s каялла",s:"пĕр-ик çеккунт",m:"пĕр минут",mm:"%d минут",h:"пĕр сехет",hh:"%d сехет",d:"пĕр кун",dd:"%d кун",M:"пĕр уйăх",MM:"%d уйăх",y:"пĕр çул",yy:"%d çул"},ordinal:"%d-мĕш",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("cy",{months:"Ionawr_Chwefror_Mawrth_Ebrill_Mai_Mehefin_Gorffennaf_Awst_Medi_Hydref_Tachwedd_Rhagfyr".split("_"),monthsShort:"Ion_Chwe_Maw_Ebr_Mai_Meh_Gor_Aws_Med_Hyd_Tach_Rhag".split("_"),weekdays:"Dydd Sul_Dydd Llun_Dydd Mawrth_Dydd Mercher_Dydd Iau_Dydd Gwener_Dydd Sadwrn".split("_"),weekdaysShort:"Sul_Llun_Maw_Mer_Iau_Gwe_Sad".split("_"),weekdaysMin:"Su_Ll_Ma_Me_Ia_Gw_Sa".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Heddiw am] LT",nextDay:"[Yfory am] LT",nextWeek:"dddd [am] LT",lastDay:"[Ddoe am] LT",lastWeek:"dddd [diwethaf am] LT",sameElse:"L"},relativeTime:{future:"mewn %s",past:"%s yn ôl",s:"ychydig eiliadau",m:"munud",mm:"%d munud",h:"awr",hh:"%d awr",d:"diwrnod",dd:"%d diwrnod",M:"mis",MM:"%d mis",y:"blwyddyn",yy:"%d flynedd"},ordinal:function(a){var b=a,c="",d=["","af","il","ydd","ydd","ed","ed","ed","fed","fed","fed","eg","fed","eg","eg","fed","eg","eg","fed","eg","fed"];return b>20?c=40===b||50===b||60===b||80===b||100===b?"fed":"ain":b>0&&(c=d[b]),a+c},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("da",{months:"januar_februar_marts_april_maj_juni_juli_august_september_oktober_november_december".split("_"),monthsShort:"jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec".split("_"),weekdays:"søndag_mandag_tirsdag_onsdag_torsdag_fredag_lørdag".split("_"),weekdaysShort:"søn_man_tir_ons_tor_fre_lør".split("_"),weekdaysMin:"sø_ma_ti_on_to_fr_lø".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd [d.] D. MMMM YYYY LT"},calendar:{sameDay:"[I dag kl.] LT",nextDay:"[I morgen kl.] LT",nextWeek:"dddd [kl.] LT",lastDay:"[I går kl.] LT",lastWeek:"[sidste] dddd [kl] LT",sameElse:"L"},relativeTime:{future:"om %s",past:"%s siden",s:"få sekunder",m:"et minut",mm:"%d minutter",h:"en time",hh:"%d timer",d:"en dag",dd:"%d dage",M:"en måned",MM:"%d måneder",y:"et år",yy:"%d år"},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a,b,c){var d={m:["eine Minute","einer Minute"],h:["eine Stunde","einer Stunde"],d:["ein Tag","einem Tag"],dd:[a+" Tage",a+" Tagen"],M:["ein Monat","einem Monat"],MM:[a+" Monate",a+" Monaten"],y:["ein Jahr","einem Jahr"],yy:[a+" Jahre",a+" Jahren"]};return b?d[c][0]:d[c][1]}return a.defineLocale("de-at",{months:"Jänner_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember".split("_"),monthsShort:"Jän._Febr._Mrz._Apr._Mai_Jun._Jul._Aug._Sept._Okt._Nov._Dez.".split("_"),weekdays:"Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag".split("_"),weekdaysShort:"So._Mo._Di._Mi._Do._Fr._Sa.".split("_"),weekdaysMin:"So_Mo_Di_Mi_Do_Fr_Sa".split("_"),longDateFormat:{LT:"HH:mm [Uhr]",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[Heute um] LT",sameElse:"L",nextDay:"[Morgen um] LT",nextWeek:"dddd [um] LT",lastDay:"[Gestern um] LT",lastWeek:"[letzten] dddd [um] LT"},relativeTime:{future:"in %s",past:"vor %s",s:"ein paar Sekunden",m:b,mm:"%d Minuten",h:b,hh:"%d Stunden",d:b,dd:b,M:b,MM:b,y:b,yy:b},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a,b,c){var d={m:["eine Minute","einer Minute"],h:["eine Stunde","einer Stunde"],d:["ein Tag","einem Tag"],dd:[a+" Tage",a+" Tagen"],M:["ein Monat","einem Monat"],MM:[a+" Monate",a+" Monaten"],y:["ein Jahr","einem Jahr"],yy:[a+" Jahre",a+" Jahren"]};return b?d[c][0]:d[c][1]}return a.defineLocale("de",{months:"Januar_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember".split("_"),monthsShort:"Jan._Febr._Mrz._Apr._Mai_Jun._Jul._Aug._Sept._Okt._Nov._Dez.".split("_"),weekdays:"Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag".split("_"),weekdaysShort:"So._Mo._Di._Mi._Do._Fr._Sa.".split("_"),weekdaysMin:"So_Mo_Di_Mi_Do_Fr_Sa".split("_"),longDateFormat:{LT:"HH:mm [Uhr]",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[Heute um] LT",sameElse:"L",nextDay:"[Morgen um] LT",nextWeek:"dddd [um] LT",lastDay:"[Gestern um] LT",lastWeek:"[letzten] dddd [um] LT"},relativeTime:{future:"in %s",past:"vor %s",s:"ein paar Sekunden",m:b,mm:"%d Minuten",h:b,hh:"%d Stunden",d:b,dd:b,M:b,MM:b,y:b,yy:b},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("el",{monthsNominativeEl:"Ιανουάριος_Φεβρουάριος_Μάρτιος_Απρίλιος_Μάιος_Ιούνιος_Ιούλιος_Αύγουστος_Σεπτέμβριος_Οκτώβριος_Νοέμβριος_Δεκέμβριος".split("_"),monthsGenitiveEl:"Ιανουαρίου_Φεβρουαρίου_Μαρτίου_Απριλίου_Μαΐου_Ιουνίου_Ιουλίου_Αυγούστου_Σεπτεμβρίου_Οκτωβρίου_Νοεμβρίου_Δεκεμβρίου".split("_"),months:function(a,b){return/D/.test(b.substring(0,b.indexOf("MMMM")))?this._monthsGenitiveEl[a.month()]:this._monthsNominativeEl[a.month()]},monthsShort:"Ιαν_Φεβ_Μαρ_Απρ_Μαϊ_Ιουν_Ιουλ_Αυγ_Σεπ_Οκτ_Νοε_Δεκ".split("_"),weekdays:"Κυριακή_Δευτέρα_Τρίτη_Τετάρτη_Πέμπτη_Παρασκευή_Σάββατο".split("_"),weekdaysShort:"Κυρ_Δευ_Τρι_Τετ_Πεμ_Παρ_Σαβ".split("_"),weekdaysMin:"Κυ_Δε_Τρ_Τε_Πε_Πα_Σα".split("_"),meridiem:function(a,b,c){return a>11?c?"μμ":"ΜΜ":c?"πμ":"ΠΜ"},isPM:function(a){return"μ"===(a+"").toLowerCase()[0]},meridiemParse:/[ΠΜ]\.?Μ?\.?/i,longDateFormat:{LT:"h:mm A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendarEl:{sameDay:"[Σήμερα {}] LT",nextDay:"[Αύριο {}] LT",nextWeek:"dddd [{}] LT",lastDay:"[Χθες {}] LT",lastWeek:function(){switch(this.day()){case 6:return"[το προηγούμενο] dddd [{}] LT";default:return"[την προηγούμενη] dddd [{}] LT"}},sameElse:"L"},calendar:function(a,b){var c=this._calendarEl[a],d=b&&b.hours();return"function"==typeof c&&(c=c.apply(b)),c.replace("{}",d%12===1?"στη":"στις")},relativeTime:{future:"σε %s",past:"%s πριν",s:"δευτερόλεπτα",m:"ένα λεπτό",mm:"%d λεπτά",h:"μία ώρα",hh:"%d ώρες",d:"μία μέρα",dd:"%d μέρες",M:"ένας μήνας",MM:"%d μήνες",y:"ένας χρόνος",yy:"%d χρόνια"},ordinal:function(a){return a+"η"},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("en-au",{months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),longDateFormat:{LT:"h:mm A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},ordinal:function(a){var b=a%10,c=1===~~(a%100/10)?"th":1===b?"st":2===b?"nd":3===b?"rd":"th";return a+c},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("en-ca",{months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),longDateFormat:{LT:"h:mm A",L:"YYYY-MM-DD",LL:"D MMMM, YYYY",LLL:"D MMMM, YYYY LT",LLLL:"dddd, D MMMM, YYYY LT"},calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},ordinal:function(a){var b=a%10,c=1===~~(a%100/10)?"th":1===b?"st":2===b?"nd":3===b?"rd":"th";return a+c}})}),function(a){a(tb)}(function(a){return a.defineLocale("en-gb",{months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},ordinal:function(a){var b=a%10,c=1===~~(a%100/10)?"th":1===b?"st":2===b?"nd":3===b?"rd":"th";return a+c},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("eo",{months:"januaro_februaro_marto_aprilo_majo_junio_julio_aŭgusto_septembro_oktobro_novembro_decembro".split("_"),monthsShort:"jan_feb_mar_apr_maj_jun_jul_aŭg_sep_okt_nov_dec".split("_"),weekdays:"Dimanĉo_Lundo_Mardo_Merkredo_Ĵaŭdo_Vendredo_Sabato".split("_"),weekdaysShort:"Dim_Lun_Mard_Merk_Ĵaŭ_Ven_Sab".split("_"),weekdaysMin:"Di_Lu_Ma_Me_Ĵa_Ve_Sa".split("_"),longDateFormat:{LT:"HH:mm",L:"YYYY-MM-DD",LL:"D[-an de] MMMM, YYYY",LLL:"D[-an de] MMMM, YYYY LT",LLLL:"dddd, [la] D[-an de] MMMM, YYYY LT"},meridiem:function(a,b,c){return a>11?c?"p.t.m.":"P.T.M.":c?"a.t.m.":"A.T.M."},calendar:{sameDay:"[Hodiaŭ je] LT",nextDay:"[Morgaŭ je] LT",nextWeek:"dddd [je] LT",lastDay:"[Hieraŭ je] LT",lastWeek:"[pasinta] dddd [je] LT",sameElse:"L"},relativeTime:{future:"je %s",past:"antaŭ %s",s:"sekundoj",m:"minuto",mm:"%d minutoj",h:"horo",hh:"%d horoj",d:"tago",dd:"%d tagoj",M:"monato",MM:"%d monatoj",y:"jaro",yy:"%d jaroj"},ordinal:"%da",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){var b="ene._feb._mar._abr._may._jun._jul._ago._sep._oct._nov._dic.".split("_"),c="ene_feb_mar_abr_may_jun_jul_ago_sep_oct_nov_dic".split("_");return a.defineLocale("es",{months:"enero_febrero_marzo_abril_mayo_junio_julio_agosto_septiembre_octubre_noviembre_diciembre".split("_"),monthsShort:function(a,d){return/-MMM-/.test(d)?c[a.month()]:b[a.month()]},weekdays:"domingo_lunes_martes_miércoles_jueves_viernes_sábado".split("_"),weekdaysShort:"dom._lun._mar._mié._jue._vie._sáb.".split("_"),weekdaysMin:"Do_Lu_Ma_Mi_Ju_Vi_Sá".split("_"),longDateFormat:{LT:"H:mm",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY LT",LLLL:"dddd, D [de] MMMM [de] YYYY LT"},calendar:{sameDay:function(){return"[hoy a la"+(1!==this.hours()?"s":"")+"] LT"},nextDay:function(){return"[mañana a la"+(1!==this.hours()?"s":"")+"] LT"},nextWeek:function(){return"dddd [a la"+(1!==this.hours()?"s":"")+"] LT"},lastDay:function(){return"[ayer a la"+(1!==this.hours()?"s":"")+"] LT"},lastWeek:function(){return"[el] dddd [pasado a la"+(1!==this.hours()?"s":"")+"] LT"},sameElse:"L"},relativeTime:{future:"en %s",past:"hace %s",s:"unos segundos",m:"un minuto",mm:"%d minutos",h:"una hora",hh:"%d horas",d:"un día",dd:"%d días",M:"un mes",MM:"%d meses",y:"un año",yy:"%d años"},ordinal:"%dº",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a,b,c,d){var e={s:["mõne sekundi","mõni sekund","paar sekundit"],m:["ühe minuti","üks minut"],mm:[a+" minuti",a+" minutit"],h:["ühe tunni","tund aega","üks tund"],hh:[a+" tunni",a+" tundi"],d:["ühe päeva","üks päev"],M:["kuu aja","kuu aega","üks kuu"],MM:[a+" kuu",a+" kuud"],y:["ühe aasta","aasta","üks aasta"],yy:[a+" aasta",a+" aastat"]};return b?e[c][2]?e[c][2]:e[c][1]:d?e[c][0]:e[c][1]}return a.defineLocale("et",{months:"jaanuar_veebruar_märts_aprill_mai_juuni_juuli_august_september_oktoober_november_detsember".split("_"),monthsShort:"jaan_veebr_märts_apr_mai_juuni_juuli_aug_sept_okt_nov_dets".split("_"),weekdays:"pühapäev_esmaspäev_teisipäev_kolmapäev_neljapäev_reede_laupäev".split("_"),weekdaysShort:"P_E_T_K_N_R_L".split("_"),weekdaysMin:"P_E_T_K_N_R_L".split("_"),longDateFormat:{LT:"H:mm",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[Täna,] LT",nextDay:"[Homme,] LT",nextWeek:"[Järgmine] dddd LT",lastDay:"[Eile,] LT",lastWeek:"[Eelmine] dddd LT",sameElse:"L"},relativeTime:{future:"%s pärast",past:"%s tagasi",s:b,m:b,mm:b,h:b,hh:b,d:b,dd:"%d päeva",M:b,MM:b,y:b,yy:b},ordinal:"%d.",week:{dow:1,doy:4}})
}),function(a){a(tb)}(function(a){return a.defineLocale("eu",{months:"urtarrila_otsaila_martxoa_apirila_maiatza_ekaina_uztaila_abuztua_iraila_urria_azaroa_abendua".split("_"),monthsShort:"urt._ots._mar._api._mai._eka._uzt._abu._ira._urr._aza._abe.".split("_"),weekdays:"igandea_astelehena_asteartea_asteazkena_osteguna_ostirala_larunbata".split("_"),weekdaysShort:"ig._al._ar._az._og._ol._lr.".split("_"),weekdaysMin:"ig_al_ar_az_og_ol_lr".split("_"),longDateFormat:{LT:"HH:mm",L:"YYYY-MM-DD",LL:"YYYY[ko] MMMM[ren] D[a]",LLL:"YYYY[ko] MMMM[ren] D[a] LT",LLLL:"dddd, YYYY[ko] MMMM[ren] D[a] LT",l:"YYYY-M-D",ll:"YYYY[ko] MMM D[a]",lll:"YYYY[ko] MMM D[a] LT",llll:"ddd, YYYY[ko] MMM D[a] LT"},calendar:{sameDay:"[gaur] LT[etan]",nextDay:"[bihar] LT[etan]",nextWeek:"dddd LT[etan]",lastDay:"[atzo] LT[etan]",lastWeek:"[aurreko] dddd LT[etan]",sameElse:"L"},relativeTime:{future:"%s barru",past:"duela %s",s:"segundo batzuk",m:"minutu bat",mm:"%d minutu",h:"ordu bat",hh:"%d ordu",d:"egun bat",dd:"%d egun",M:"hilabete bat",MM:"%d hilabete",y:"urte bat",yy:"%d urte"},ordinal:"%d.",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){var b={1:"۱",2:"۲",3:"۳",4:"۴",5:"۵",6:"۶",7:"۷",8:"۸",9:"۹",0:"۰"},c={"۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","۰":"0"};return a.defineLocale("fa",{months:"ژانویه_فوریه_مارس_آوریل_مه_ژوئن_ژوئیه_اوت_سپتامبر_اکتبر_نوامبر_دسامبر".split("_"),monthsShort:"ژانویه_فوریه_مارس_آوریل_مه_ژوئن_ژوئیه_اوت_سپتامبر_اکتبر_نوامبر_دسامبر".split("_"),weekdays:"یک‌شنبه_دوشنبه_سه‌شنبه_چهارشنبه_پنج‌شنبه_جمعه_شنبه".split("_"),weekdaysShort:"یک‌شنبه_دوشنبه_سه‌شنبه_چهارشنبه_پنج‌شنبه_جمعه_شنبه".split("_"),weekdaysMin:"ی_د_س_چ_پ_ج_ش".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},meridiem:function(a){return 12>a?"قبل از ظهر":"بعد از ظهر"},calendar:{sameDay:"[امروز ساعت] LT",nextDay:"[فردا ساعت] LT",nextWeek:"dddd [ساعت] LT",lastDay:"[دیروز ساعت] LT",lastWeek:"dddd [پیش] [ساعت] LT",sameElse:"L"},relativeTime:{future:"در %s",past:"%s پیش",s:"چندین ثانیه",m:"یک دقیقه",mm:"%d دقیقه",h:"یک ساعت",hh:"%d ساعت",d:"یک روز",dd:"%d روز",M:"یک ماه",MM:"%d ماه",y:"یک سال",yy:"%d سال"},preparse:function(a){return a.replace(/[۰-۹]/g,function(a){return c[a]}).replace(/،/g,",")},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]}).replace(/,/g,"،")},ordinal:"%dم",week:{dow:6,doy:12}})}),function(a){a(tb)}(function(a){function b(a,b,d,e){var f="";switch(d){case"s":return e?"muutaman sekunnin":"muutama sekunti";case"m":return e?"minuutin":"minuutti";case"mm":f=e?"minuutin":"minuuttia";break;case"h":return e?"tunnin":"tunti";case"hh":f=e?"tunnin":"tuntia";break;case"d":return e?"päivän":"päivä";case"dd":f=e?"päivän":"päivää";break;case"M":return e?"kuukauden":"kuukausi";case"MM":f=e?"kuukauden":"kuukautta";break;case"y":return e?"vuoden":"vuosi";case"yy":f=e?"vuoden":"vuotta"}return f=c(a,e)+" "+f}function c(a,b){return 10>a?b?e[a]:d[a]:a}var d="nolla yksi kaksi kolme neljä viisi kuusi seitsemän kahdeksan yhdeksän".split(" "),e=["nolla","yhden","kahden","kolmen","neljän","viiden","kuuden",d[7],d[8],d[9]];return a.defineLocale("fi",{months:"tammikuu_helmikuu_maaliskuu_huhtikuu_toukokuu_kesäkuu_heinäkuu_elokuu_syyskuu_lokakuu_marraskuu_joulukuu".split("_"),monthsShort:"tammi_helmi_maalis_huhti_touko_kesä_heinä_elo_syys_loka_marras_joulu".split("_"),weekdays:"sunnuntai_maanantai_tiistai_keskiviikko_torstai_perjantai_lauantai".split("_"),weekdaysShort:"su_ma_ti_ke_to_pe_la".split("_"),weekdaysMin:"su_ma_ti_ke_to_pe_la".split("_"),longDateFormat:{LT:"HH.mm",L:"DD.MM.YYYY",LL:"Do MMMM[ta] YYYY",LLL:"Do MMMM[ta] YYYY, [klo] LT",LLLL:"dddd, Do MMMM[ta] YYYY, [klo] LT",l:"D.M.YYYY",ll:"Do MMM YYYY",lll:"Do MMM YYYY, [klo] LT",llll:"ddd, Do MMM YYYY, [klo] LT"},calendar:{sameDay:"[tänään] [klo] LT",nextDay:"[huomenna] [klo] LT",nextWeek:"dddd [klo] LT",lastDay:"[eilen] [klo] LT",lastWeek:"[viime] dddd[na] [klo] LT",sameElse:"L"},relativeTime:{future:"%s päästä",past:"%s sitten",s:b,m:b,mm:b,h:b,hh:b,d:b,dd:b,M:b,MM:b,y:b,yy:b},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("fo",{months:"januar_februar_mars_apríl_mai_juni_juli_august_september_oktober_november_desember".split("_"),monthsShort:"jan_feb_mar_apr_mai_jun_jul_aug_sep_okt_nov_des".split("_"),weekdays:"sunnudagur_mánadagur_týsdagur_mikudagur_hósdagur_fríggjadagur_leygardagur".split("_"),weekdaysShort:"sun_mán_týs_mik_hós_frí_ley".split("_"),weekdaysMin:"su_má_tý_mi_hó_fr_le".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D. MMMM, YYYY LT"},calendar:{sameDay:"[Í dag kl.] LT",nextDay:"[Í morgin kl.] LT",nextWeek:"dddd [kl.] LT",lastDay:"[Í gjár kl.] LT",lastWeek:"[síðstu] dddd [kl] LT",sameElse:"L"},relativeTime:{future:"um %s",past:"%s síðani",s:"fá sekund",m:"ein minutt",mm:"%d minuttir",h:"ein tími",hh:"%d tímar",d:"ein dagur",dd:"%d dagar",M:"ein mánaði",MM:"%d mánaðir",y:"eitt ár",yy:"%d ár"},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("fr-ca",{months:"janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_"),monthsShort:"janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_"),weekdays:"dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),weekdaysShort:"dim._lun._mar._mer._jeu._ven._sam.".split("_"),weekdaysMin:"Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),longDateFormat:{LT:"HH:mm",L:"YYYY-MM-DD",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[Aujourd'hui à] LT",nextDay:"[Demain à] LT",nextWeek:"dddd [à] LT",lastDay:"[Hier à] LT",lastWeek:"dddd [dernier à] LT",sameElse:"L"},relativeTime:{future:"dans %s",past:"il y a %s",s:"quelques secondes",m:"une minute",mm:"%d minutes",h:"une heure",hh:"%d heures",d:"un jour",dd:"%d jours",M:"un mois",MM:"%d mois",y:"un an",yy:"%d ans"},ordinal:function(a){return a+(1===a?"er":"")}})}),function(a){a(tb)}(function(a){return a.defineLocale("fr",{months:"janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_"),monthsShort:"janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_"),weekdays:"dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),weekdaysShort:"dim._lun._mar._mer._jeu._ven._sam.".split("_"),weekdaysMin:"Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[Aujourd'hui à] LT",nextDay:"[Demain à] LT",nextWeek:"dddd [à] LT",lastDay:"[Hier à] LT",lastWeek:"dddd [dernier à] LT",sameElse:"L"},relativeTime:{future:"dans %s",past:"il y a %s",s:"quelques secondes",m:"une minute",mm:"%d minutes",h:"une heure",hh:"%d heures",d:"un jour",dd:"%d jours",M:"un mois",MM:"%d mois",y:"un an",yy:"%d ans"},ordinal:function(a){return a+(1===a?"er":"")},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("gl",{months:"Xaneiro_Febreiro_Marzo_Abril_Maio_Xuño_Xullo_Agosto_Setembro_Outubro_Novembro_Decembro".split("_"),monthsShort:"Xan._Feb._Mar._Abr._Mai._Xuñ._Xul._Ago._Set._Out._Nov._Dec.".split("_"),weekdays:"Domingo_Luns_Martes_Mércores_Xoves_Venres_Sábado".split("_"),weekdaysShort:"Dom._Lun._Mar._Mér._Xov._Ven._Sáb.".split("_"),weekdaysMin:"Do_Lu_Ma_Mé_Xo_Ve_Sá".split("_"),longDateFormat:{LT:"H:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:function(){return"[hoxe "+(1!==this.hours()?"ás":"á")+"] LT"},nextDay:function(){return"[mañá "+(1!==this.hours()?"ás":"á")+"] LT"},nextWeek:function(){return"dddd ["+(1!==this.hours()?"ás":"a")+"] LT"},lastDay:function(){return"[onte "+(1!==this.hours()?"á":"a")+"] LT"},lastWeek:function(){return"[o] dddd [pasado "+(1!==this.hours()?"ás":"a")+"] LT"},sameElse:"L"},relativeTime:{future:function(a){return"uns segundos"===a?"nuns segundos":"en "+a},past:"hai %s",s:"uns segundos",m:"un minuto",mm:"%d minutos",h:"unha hora",hh:"%d horas",d:"un día",dd:"%d días",M:"un mes",MM:"%d meses",y:"un ano",yy:"%d anos"},ordinal:"%dº",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("he",{months:"ינואר_פברואר_מרץ_אפריל_מאי_יוני_יולי_אוגוסט_ספטמבר_אוקטובר_נובמבר_דצמבר".split("_"),monthsShort:"ינו׳_פבר׳_מרץ_אפר׳_מאי_יוני_יולי_אוג׳_ספט׳_אוק׳_נוב׳_דצמ׳".split("_"),weekdays:"ראשון_שני_שלישי_רביעי_חמישי_שישי_שבת".split("_"),weekdaysShort:"א׳_ב׳_ג׳_ד׳_ה׳_ו׳_ש׳".split("_"),weekdaysMin:"א_ב_ג_ד_ה_ו_ש".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D [ב]MMMM YYYY",LLL:"D [ב]MMMM YYYY LT",LLLL:"dddd, D [ב]MMMM YYYY LT",l:"D/M/YYYY",ll:"D MMM YYYY",lll:"D MMM YYYY LT",llll:"ddd, D MMM YYYY LT"},calendar:{sameDay:"[היום ב־]LT",nextDay:"[מחר ב־]LT",nextWeek:"dddd [בשעה] LT",lastDay:"[אתמול ב־]LT",lastWeek:"[ביום] dddd [האחרון בשעה] LT",sameElse:"L"},relativeTime:{future:"בעוד %s",past:"לפני %s",s:"מספר שניות",m:"דקה",mm:"%d דקות",h:"שעה",hh:function(a){return 2===a?"שעתיים":a+" שעות"},d:"יום",dd:function(a){return 2===a?"יומיים":a+" ימים"},M:"חודש",MM:function(a){return 2===a?"חודשיים":a+" חודשים"},y:"שנה",yy:function(a){return 2===a?"שנתיים":a+" שנים"}}})}),function(a){a(tb)}(function(a){var b={1:"१",2:"२",3:"३",4:"४",5:"५",6:"६",7:"७",8:"८",9:"९",0:"०"},c={"१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9","०":"0"};return a.defineLocale("hi",{months:"जनवरी_फ़रवरी_मार्च_अप्रैल_मई_जून_जुलाई_अगस्त_सितम्बर_अक्टूबर_नवम्बर_दिसम्बर".split("_"),monthsShort:"जन._फ़र._मार्च_अप्रै._मई_जून_जुल._अग._सित._अक्टू._नव._दिस.".split("_"),weekdays:"रविवार_सोमवार_मंगलवार_बुधवार_गुरूवार_शुक्रवार_शनिवार".split("_"),weekdaysShort:"रवि_सोम_मंगल_बुध_गुरू_शुक्र_शनि".split("_"),weekdaysMin:"र_सो_मं_बु_गु_शु_श".split("_"),longDateFormat:{LT:"A h:mm बजे",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, LT",LLLL:"dddd, D MMMM YYYY, LT"},calendar:{sameDay:"[आज] LT",nextDay:"[कल] LT",nextWeek:"dddd, LT",lastDay:"[कल] LT",lastWeek:"[पिछले] dddd, LT",sameElse:"L"},relativeTime:{future:"%s में",past:"%s पहले",s:"कुछ ही क्षण",m:"एक मिनट",mm:"%d मिनट",h:"एक घंटा",hh:"%d घंटे",d:"एक दिन",dd:"%d दिन",M:"एक महीने",MM:"%d महीने",y:"एक वर्ष",yy:"%d वर्ष"},preparse:function(a){return a.replace(/[१२३४५६७८९०]/g,function(a){return c[a]})},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]})},meridiem:function(a){return 4>a?"रात":10>a?"सुबह":17>a?"दोपहर":20>a?"शाम":"रात"},week:{dow:0,doy:6}})}),function(a){a(tb)}(function(a){function b(a,b,c){var d=a+" ";switch(c){case"m":return b?"jedna minuta":"jedne minute";case"mm":return d+=1===a?"minuta":2===a||3===a||4===a?"minute":"minuta";case"h":return b?"jedan sat":"jednog sata";case"hh":return d+=1===a?"sat":2===a||3===a||4===a?"sata":"sati";case"dd":return d+=1===a?"dan":"dana";case"MM":return d+=1===a?"mjesec":2===a||3===a||4===a?"mjeseca":"mjeseci";case"yy":return d+=1===a?"godina":2===a||3===a||4===a?"godine":"godina"}}return a.defineLocale("hr",{months:"sječanj_veljača_ožujak_travanj_svibanj_lipanj_srpanj_kolovoz_rujan_listopad_studeni_prosinac".split("_"),monthsShort:"sje._vel._ožu._tra._svi._lip._srp._kol._ruj._lis._stu._pro.".split("_"),weekdays:"nedjelja_ponedjeljak_utorak_srijeda_četvrtak_petak_subota".split("_"),weekdaysShort:"ned._pon._uto._sri._čet._pet._sub.".split("_"),weekdaysMin:"ne_po_ut_sr_če_pe_su".split("_"),longDateFormat:{LT:"H:mm",L:"DD. MM. YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[danas u] LT",nextDay:"[sutra u] LT",nextWeek:function(){switch(this.day()){case 0:return"[u] [nedjelju] [u] LT";case 3:return"[u] [srijedu] [u] LT";case 6:return"[u] [subotu] [u] LT";case 1:case 2:case 4:case 5:return"[u] dddd [u] LT"}},lastDay:"[jučer u] LT",lastWeek:function(){switch(this.day()){case 0:case 3:return"[prošlu] dddd [u] LT";case 6:return"[prošle] [subote] [u] LT";case 1:case 2:case 4:case 5:return"[prošli] dddd [u] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"prije %s",s:"par sekundi",m:b,mm:b,h:b,hh:b,d:"dan",dd:b,M:"mjesec",MM:b,y:"godinu",yy:b},ordinal:"%d.",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){function b(a,b,c,d){var e=a;switch(c){case"s":return d||b?"néhány másodperc":"néhány másodperce";case"m":return"egy"+(d||b?" perc":" perce");case"mm":return e+(d||b?" perc":" perce");case"h":return"egy"+(d||b?" óra":" órája");case"hh":return e+(d||b?" óra":" órája");case"d":return"egy"+(d||b?" nap":" napja");case"dd":return e+(d||b?" nap":" napja");case"M":return"egy"+(d||b?" hónap":" hónapja");case"MM":return e+(d||b?" hónap":" hónapja");case"y":return"egy"+(d||b?" év":" éve");case"yy":return e+(d||b?" év":" éve")}return""}function c(a){return(a?"":"[múlt] ")+"["+d[this.day()]+"] LT[-kor]"}var d="vasárnap hétfőn kedden szerdán csütörtökön pénteken szombaton".split(" ");return a.defineLocale("hu",{months:"január_február_március_április_május_június_július_augusztus_szeptember_október_november_december".split("_"),monthsShort:"jan_feb_márc_ápr_máj_jún_júl_aug_szept_okt_nov_dec".split("_"),weekdays:"vasárnap_hétfő_kedd_szerda_csütörtök_péntek_szombat".split("_"),weekdaysShort:"vas_hét_kedd_sze_csüt_pén_szo".split("_"),weekdaysMin:"v_h_k_sze_cs_p_szo".split("_"),longDateFormat:{LT:"H:mm",L:"YYYY.MM.DD.",LL:"YYYY. MMMM D.",LLL:"YYYY. MMMM D., LT",LLLL:"YYYY. MMMM D., dddd LT"},meridiem:function(a,b,c){return 12>a?c===!0?"de":"DE":c===!0?"du":"DU"},calendar:{sameDay:"[ma] LT[-kor]",nextDay:"[holnap] LT[-kor]",nextWeek:function(){return c.call(this,!0)},lastDay:"[tegnap] LT[-kor]",lastWeek:function(){return c.call(this,!1)},sameElse:"L"},relativeTime:{future:"%s múlva",past:"%s",s:b,m:b,mm:b,h:b,hh:b,d:b,dd:b,M:b,MM:b,y:b,yy:b},ordinal:"%d.",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){function b(a,b){var c={nominative:"հունվար_փետրվար_մարտ_ապրիլ_մայիս_հունիս_հուլիս_օգոստոս_սեպտեմբեր_հոկտեմբեր_նոյեմբեր_դեկտեմբեր".split("_"),accusative:"հունվարի_փետրվարի_մարտի_ապրիլի_մայիսի_հունիսի_հուլիսի_օգոստոսի_սեպտեմբերի_հոկտեմբերի_նոյեմբերի_դեկտեմբերի".split("_")},d=/D[oD]?(\[[^\[\]]*\]|\s+)+MMMM?/.test(b)?"accusative":"nominative";return c[d][a.month()]}function c(a){var b="հնվ_փտր_մրտ_ապր_մյս_հնս_հլս_օգս_սպտ_հկտ_նմբ_դկտ".split("_");return b[a.month()]}function d(a){var b="կիրակի_երկուշաբթի_երեքշաբթի_չորեքշաբթի_հինգշաբթի_ուրբաթ_շաբաթ".split("_");return b[a.day()]}return a.defineLocale("hy-am",{months:b,monthsShort:c,weekdays:d,weekdaysShort:"կրկ_երկ_երք_չրք_հնգ_ուրբ_շբթ".split("_"),weekdaysMin:"կրկ_երկ_երք_չրք_հնգ_ուրբ_շբթ".split("_"),longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY թ.",LLL:"D MMMM YYYY թ., LT",LLLL:"dddd, D MMMM YYYY թ., LT"},calendar:{sameDay:"[այսօր] LT",nextDay:"[վաղը] LT",lastDay:"[երեկ] LT",nextWeek:function(){return"dddd [օրը ժամը] LT"},lastWeek:function(){return"[անցած] dddd [օրը ժամը] LT"},sameElse:"L"},relativeTime:{future:"%s հետո",past:"%s առաջ",s:"մի քանի վայրկյան",m:"րոպե",mm:"%d րոպե",h:"ժամ",hh:"%d ժամ",d:"օր",dd:"%d օր",M:"ամիս",MM:"%d ամիս",y:"տարի",yy:"%d տարի"},meridiem:function(a){return 4>a?"գիշերվա":12>a?"առավոտվա":17>a?"ցերեկվա":"երեկոյան"},ordinal:function(a,b){switch(b){case"DDD":case"w":case"W":case"DDDo":return 1===a?a+"-ին":a+"-րդ";default:return a}},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("id",{months:"Januari_Februari_Maret_April_Mei_Juni_Juli_Agustus_September_Oktober_November_Desember".split("_"),monthsShort:"Jan_Feb_Mar_Apr_Mei_Jun_Jul_Ags_Sep_Okt_Nov_Des".split("_"),weekdays:"Minggu_Senin_Selasa_Rabu_Kamis_Jumat_Sabtu".split("_"),weekdaysShort:"Min_Sen_Sel_Rab_Kam_Jum_Sab".split("_"),weekdaysMin:"Mg_Sn_Sl_Rb_Km_Jm_Sb".split("_"),longDateFormat:{LT:"HH.mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY [pukul] LT",LLLL:"dddd, D MMMM YYYY [pukul] LT"},meridiem:function(a){return 11>a?"pagi":15>a?"siang":19>a?"sore":"malam"},calendar:{sameDay:"[Hari ini pukul] LT",nextDay:"[Besok pukul] LT",nextWeek:"dddd [pukul] LT",lastDay:"[Kemarin pukul] LT",lastWeek:"dddd [lalu pukul] LT",sameElse:"L"},relativeTime:{future:"dalam %s",past:"%s yang lalu",s:"beberapa detik",m:"semenit",mm:"%d menit",h:"sejam",hh:"%d jam",d:"sehari",dd:"%d hari",M:"sebulan",MM:"%d bulan",y:"setahun",yy:"%d tahun"},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){function b(a){return a%100===11?!0:a%10===1?!1:!0}function c(a,c,d,e){var f=a+" ";switch(d){case"s":return c||e?"nokkrar sekúndur":"nokkrum sekúndum";case"m":return c?"mínúta":"mínútu";case"mm":return b(a)?f+(c||e?"mínútur":"mínútum"):c?f+"mínúta":f+"mínútu";case"hh":return b(a)?f+(c||e?"klukkustundir":"klukkustundum"):f+"klukkustund";case"d":return c?"dagur":e?"dag":"degi";case"dd":return b(a)?c?f+"dagar":f+(e?"daga":"dögum"):c?f+"dagur":f+(e?"dag":"degi");case"M":return c?"mánuður":e?"mánuð":"mánuði";case"MM":return b(a)?c?f+"mánuðir":f+(e?"mánuði":"mánuðum"):c?f+"mánuður":f+(e?"mánuð":"mánuði");case"y":return c||e?"ár":"ári";case"yy":return b(a)?f+(c||e?"ár":"árum"):f+(c||e?"ár":"ári")}}return a.defineLocale("is",{months:"janúar_febrúar_mars_apríl_maí_júní_júlí_ágúst_september_október_nóvember_desember".split("_"),monthsShort:"jan_feb_mar_apr_maí_jún_júl_ágú_sep_okt_nóv_des".split("_"),weekdays:"sunnudagur_mánudagur_þriðjudagur_miðvikudagur_fimmtudagur_föstudagur_laugardagur".split("_"),weekdaysShort:"sun_mán_þri_mið_fim_fös_lau".split("_"),weekdaysMin:"Su_Má_Þr_Mi_Fi_Fö_La".split("_"),longDateFormat:{LT:"H:mm",L:"DD/MM/YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY [kl.] LT",LLLL:"dddd, D. MMMM YYYY [kl.] LT"},calendar:{sameDay:"[í dag kl.] LT",nextDay:"[á morgun kl.] LT",nextWeek:"dddd [kl.] LT",lastDay:"[í gær kl.] LT",lastWeek:"[síðasta] dddd [kl.] LT",sameElse:"L"},relativeTime:{future:"eftir %s",past:"fyrir %s síðan",s:c,m:c,mm:c,h:"klukkustund",hh:c,d:c,dd:c,M:c,MM:c,y:c,yy:c},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("it",{months:"gennaio_febbraio_marzo_aprile_maggio_giugno_luglio_agosto_settembre_ottobre_novembre_dicembre".split("_"),monthsShort:"gen_feb_mar_apr_mag_giu_lug_ago_set_ott_nov_dic".split("_"),weekdays:"Domenica_Lunedì_Martedì_Mercoledì_Giovedì_Venerdì_Sabato".split("_"),weekdaysShort:"Dom_Lun_Mar_Mer_Gio_Ven_Sab".split("_"),weekdaysMin:"D_L_Ma_Me_G_V_S".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Oggi alle] LT",nextDay:"[Domani alle] LT",nextWeek:"dddd [alle] LT",lastDay:"[Ieri alle] LT",lastWeek:"[lo scorso] dddd [alle] LT",sameElse:"L"},relativeTime:{future:function(a){return(/^[0-9].+$/.test(a)?"tra":"in")+" "+a},past:"%s fa",s:"alcuni secondi",m:"un minuto",mm:"%d minuti",h:"un'ora",hh:"%d ore",d:"un giorno",dd:"%d giorni",M:"un mese",MM:"%d mesi",y:"un anno",yy:"%d anni"},ordinal:"%dº",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("ja",{months:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),monthsShort:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),weekdays:"日曜日_月曜日_火曜日_水曜日_木曜日_金曜日_土曜日".split("_"),weekdaysShort:"日_月_火_水_木_金_土".split("_"),weekdaysMin:"日_月_火_水_木_金_土".split("_"),longDateFormat:{LT:"Ah時m分",L:"YYYY/MM/DD",LL:"YYYY年M月D日",LLL:"YYYY年M月D日LT",LLLL:"YYYY年M月D日LT dddd"},meridiem:function(a){return 12>a?"午前":"午後"},calendar:{sameDay:"[今日] LT",nextDay:"[明日] LT",nextWeek:"[来週]dddd LT",lastDay:"[昨日] LT",lastWeek:"[前週]dddd LT",sameElse:"L"},relativeTime:{future:"%s後",past:"%s前",s:"数秒",m:"1分",mm:"%d分",h:"1時間",hh:"%d時間",d:"1日",dd:"%d日",M:"1ヶ月",MM:"%dヶ月",y:"1年",yy:"%d年"}})}),function(a){a(tb)}(function(a){function b(a,b){var c={nominative:"იანვარი_თებერვალი_მარტი_აპრილი_მაისი_ივნისი_ივლისი_აგვისტო_სექტემბერი_ოქტომბერი_ნოემბერი_დეკემბერი".split("_"),accusative:"იანვარს_თებერვალს_მარტს_აპრილის_მაისს_ივნისს_ივლისს_აგვისტს_სექტემბერს_ოქტომბერს_ნოემბერს_დეკემბერს".split("_")},d=/D[oD] *MMMM?/.test(b)?"accusative":"nominative";return c[d][a.month()]}function c(a,b){var c={nominative:"კვირა_ორშაბათი_სამშაბათი_ოთხშაბათი_ხუთშაბათი_პარასკევი_შაბათი".split("_"),accusative:"კვირას_ორშაბათს_სამშაბათს_ოთხშაბათს_ხუთშაბათს_პარასკევს_შაბათს".split("_")},d=/(წინა|შემდეგ)/.test(b)?"accusative":"nominative";return c[d][a.day()]}return a.defineLocale("ka",{months:b,monthsShort:"იან_თებ_მარ_აპრ_მაი_ივნ_ივლ_აგვ_სექ_ოქტ_ნოე_დეკ".split("_"),weekdays:c,weekdaysShort:"კვი_ორშ_სამ_ოთხ_ხუთ_პარ_შაბ".split("_"),weekdaysMin:"კვ_ორ_სა_ოთ_ხუ_პა_შა".split("_"),longDateFormat:{LT:"h:mm A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[დღეს] LT[-ზე]",nextDay:"[ხვალ] LT[-ზე]",lastDay:"[გუშინ] LT[-ზე]",nextWeek:"[შემდეგ] dddd LT[-ზე]",lastWeek:"[წინა] dddd LT-ზე",sameElse:"L"},relativeTime:{future:function(a){return/(წამი|წუთი|საათი|წელი)/.test(a)?a.replace(/ი$/,"ში"):a+"ში"},past:function(a){return/(წამი|წუთი|საათი|დღე|თვე)/.test(a)?a.replace(/(ი|ე)$/,"ის წინ"):/წელი/.test(a)?a.replace(/წელი$/,"წლის წინ"):void 0},s:"რამდენიმე წამი",m:"წუთი",mm:"%d წუთი",h:"საათი",hh:"%d საათი",d:"დღე",dd:"%d დღე",M:"თვე",MM:"%d თვე",y:"წელი",yy:"%d წელი"},ordinal:function(a){return 0===a?a:1===a?a+"-ლი":20>a||100>=a&&a%20===0||a%100===0?"მე-"+a:a+"-ე"},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("km",{months:"មករា_កុម្ភៈ_មិនា_មេសា_ឧសភា_មិថុនា_កក្កដា_សីហា_កញ្ញា_តុលា_វិច្ឆិកា_ធ្នូ".split("_"),monthsShort:"មករា_កុម្ភៈ_មិនា_មេសា_ឧសភា_មិថុនា_កក្កដា_សីហា_កញ្ញា_តុលា_វិច្ឆិកា_ធ្នូ".split("_"),weekdays:"អាទិត្យ_ច័ន្ទ_អង្គារ_ពុធ_ព្រហស្បតិ៍_សុក្រ_សៅរ៍".split("_"),weekdaysShort:"អាទិត្យ_ច័ន្ទ_អង្គារ_ពុធ_ព្រហស្បតិ៍_សុក្រ_សៅរ៍".split("_"),weekdaysMin:"អាទិត្យ_ច័ន្ទ_អង្គារ_ពុធ_ព្រហស្បតិ៍_សុក្រ_សៅរ៍".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[ថ្ងៃនៈ ម៉ោង] LT",nextDay:"[ស្អែក ម៉ោង] LT",nextWeek:"dddd [ម៉ោង] LT",lastDay:"[ម្សិលមិញ ម៉ោង] LT",lastWeek:"dddd [សប្តាហ៍មុន] [ម៉ោង] LT",sameElse:"L"},relativeTime:{future:"%sទៀត",past:"%sមុន",s:"ប៉ុន្មានវិនាទី",m:"មួយនាទី",mm:"%d នាទី",h:"មួយម៉ោង",hh:"%d ម៉ោង",d:"មួយថ្ងៃ",dd:"%d ថ្ងៃ",M:"មួយខែ",MM:"%d ខែ",y:"មួយឆ្នាំ",yy:"%d ឆ្នាំ"},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("ko",{months:"1월_2월_3월_4월_5월_6월_7월_8월_9월_10월_11월_12월".split("_"),monthsShort:"1월_2월_3월_4월_5월_6월_7월_8월_9월_10월_11월_12월".split("_"),weekdays:"일요일_월요일_화요일_수요일_목요일_금요일_토요일".split("_"),weekdaysShort:"일_월_화_수_목_금_토".split("_"),weekdaysMin:"일_월_화_수_목_금_토".split("_"),longDateFormat:{LT:"A h시 m분",L:"YYYY.MM.DD",LL:"YYYY년 MMMM D일",LLL:"YYYY년 MMMM D일 LT",LLLL:"YYYY년 MMMM D일 dddd LT"},meridiem:function(a){return 12>a?"오전":"오후"},calendar:{sameDay:"오늘 LT",nextDay:"내일 LT",nextWeek:"dddd LT",lastDay:"어제 LT",lastWeek:"지난주 dddd LT",sameElse:"L"},relativeTime:{future:"%s 후",past:"%s 전",s:"몇초",ss:"%d초",m:"일분",mm:"%d분",h:"한시간",hh:"%d시간",d:"하루",dd:"%d일",M:"한달",MM:"%d달",y:"일년",yy:"%d년"},ordinal:"%d일",meridiemParse:/(오전|오후)/,isPM:function(a){return"오후"===a}})}),function(a){a(tb)}(function(a){function b(a,b,c){var d={m:["eng Minutt","enger Minutt"],h:["eng Stonn","enger Stonn"],d:["een Dag","engem Dag"],M:["ee Mount","engem Mount"],y:["ee Joer","engem Joer"]};return b?d[c][0]:d[c][1]}function c(a){var b=a.substr(0,a.indexOf(" "));return e(b)?"a "+a:"an "+a}function d(a){var b=a.substr(0,a.indexOf(" "));return e(b)?"viru "+a:"virun "+a}function e(a){if(a=parseInt(a,10),isNaN(a))return!1;if(0>a)return!0;if(10>a)return a>=4&&7>=a?!0:!1;if(100>a){var b=a%10,c=a/10;return e(0===b?c:b)}if(1e4>a){for(;a>=10;)a/=10;return e(a)}return a/=1e3,e(a)}return a.defineLocale("lb",{months:"Januar_Februar_Mäerz_Abrëll_Mee_Juni_Juli_August_September_Oktober_November_Dezember".split("_"),monthsShort:"Jan._Febr._Mrz._Abr._Mee_Jun._Jul._Aug._Sept._Okt._Nov._Dez.".split("_"),weekdays:"Sonndeg_Méindeg_Dënschdeg_Mëttwoch_Donneschdeg_Freideg_Samschdeg".split("_"),weekdaysShort:"So._Mé._Dë._Më._Do._Fr._Sa.".split("_"),weekdaysMin:"So_Mé_Dë_Më_Do_Fr_Sa".split("_"),longDateFormat:{LT:"H:mm [Auer]",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[Haut um] LT",sameElse:"L",nextDay:"[Muer um] LT",nextWeek:"dddd [um] LT",lastDay:"[Gëschter um] LT",lastWeek:function(){switch(this.day()){case 2:case 4:return"[Leschten] dddd [um] LT";default:return"[Leschte] dddd [um] LT"}}},relativeTime:{future:c,past:d,s:"e puer Sekonnen",m:b,mm:"%d Minutten",h:b,hh:"%d Stonnen",d:b,dd:"%d Deeg",M:b,MM:"%d Méint",y:b,yy:"%d Joer"},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a,b,c,d){return b?"kelios sekundės":d?"kelių sekundžių":"kelias sekundes"}function c(a,b,c,d){return b?e(c)[0]:d?e(c)[1]:e(c)[2]}function d(a){return a%10===0||a>10&&20>a}function e(a){return h[a].split("_")}function f(a,b,f,g){var h=a+" ";return 1===a?h+c(a,b,f[0],g):b?h+(d(a)?e(f)[1]:e(f)[0]):g?h+e(f)[1]:h+(d(a)?e(f)[1]:e(f)[2])}function g(a,b){var c=-1===b.indexOf("dddd HH:mm"),d=i[a.day()];return c?d:d.substring(0,d.length-2)+"į"}var h={m:"minutė_minutės_minutę",mm:"minutės_minučių_minutes",h:"valanda_valandos_valandą",hh:"valandos_valandų_valandas",d:"diena_dienos_dieną",dd:"dienos_dienų_dienas",M:"mėnuo_mėnesio_mėnesį",MM:"mėnesiai_mėnesių_mėnesius",y:"metai_metų_metus",yy:"metai_metų_metus"},i="sekmadienis_pirmadienis_antradienis_trečiadienis_ketvirtadienis_penktadienis_šeštadienis".split("_");return a.defineLocale("lt",{months:"sausio_vasario_kovo_balandžio_gegužės_birželio_liepos_rugpjūčio_rugsėjo_spalio_lapkričio_gruodžio".split("_"),monthsShort:"sau_vas_kov_bal_geg_bir_lie_rgp_rgs_spa_lap_grd".split("_"),weekdays:g,weekdaysShort:"Sek_Pir_Ant_Tre_Ket_Pen_Šeš".split("_"),weekdaysMin:"S_P_A_T_K_Pn_Š".split("_"),longDateFormat:{LT:"HH:mm",L:"YYYY-MM-DD",LL:"YYYY [m.] MMMM D [d.]",LLL:"YYYY [m.] MMMM D [d.], LT [val.]",LLLL:"YYYY [m.] MMMM D [d.], dddd, LT [val.]",l:"YYYY-MM-DD",ll:"YYYY [m.] MMMM D [d.]",lll:"YYYY [m.] MMMM D [d.], LT [val.]",llll:"YYYY [m.] MMMM D [d.], ddd, LT [val.]"},calendar:{sameDay:"[Šiandien] LT",nextDay:"[Rytoj] LT",nextWeek:"dddd LT",lastDay:"[Vakar] LT",lastWeek:"[Praėjusį] dddd LT",sameElse:"L"},relativeTime:{future:"po %s",past:"prieš %s",s:b,m:c,mm:f,h:c,hh:f,d:c,dd:f,M:c,MM:f,y:c,yy:f},ordinal:function(a){return a+"-oji"},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a,b,c){var d=a.split("_");return c?b%10===1&&11!==b?d[2]:d[3]:b%10===1&&11!==b?d[0]:d[1]}function c(a,c,e){return a+" "+b(d[e],a,c)}var d={mm:"minūti_minūtes_minūte_minūtes",hh:"stundu_stundas_stunda_stundas",dd:"dienu_dienas_diena_dienas",MM:"mēnesi_mēnešus_mēnesis_mēneši",yy:"gadu_gadus_gads_gadi"};return a.defineLocale("lv",{months:"janvāris_februāris_marts_aprīlis_maijs_jūnijs_jūlijs_augusts_septembris_oktobris_novembris_decembris".split("_"),monthsShort:"jan_feb_mar_apr_mai_jūn_jūl_aug_sep_okt_nov_dec".split("_"),weekdays:"svētdiena_pirmdiena_otrdiena_trešdiena_ceturtdiena_piektdiena_sestdiena".split("_"),weekdaysShort:"Sv_P_O_T_C_Pk_S".split("_"),weekdaysMin:"Sv_P_O_T_C_Pk_S".split("_"),longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"YYYY. [gada] D. MMMM",LLL:"YYYY. [gada] D. MMMM, LT",LLLL:"YYYY. [gada] D. MMMM, dddd, LT"},calendar:{sameDay:"[Šodien pulksten] LT",nextDay:"[Rīt pulksten] LT",nextWeek:"dddd [pulksten] LT",lastDay:"[Vakar pulksten] LT",lastWeek:"[Pagājušā] dddd [pulksten] LT",sameElse:"L"},relativeTime:{future:"%s vēlāk",past:"%s agrāk",s:"dažas sekundes",m:"minūti",mm:c,h:"stundu",hh:c,d:"dienu",dd:c,M:"mēnesi",MM:c,y:"gadu",yy:c},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("mk",{months:"јануари_февруари_март_април_мај_јуни_јули_август_септември_октомври_ноември_декември".split("_"),monthsShort:"јан_фев_мар_апр_мај_јун_јул_авг_сеп_окт_ное_дек".split("_"),weekdays:"недела_понеделник_вторник_среда_четврток_петок_сабота".split("_"),weekdaysShort:"нед_пон_вто_сре_чет_пет_саб".split("_"),weekdaysMin:"нe_пo_вт_ср_че_пе_сa".split("_"),longDateFormat:{LT:"H:mm",L:"D.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Денес во] LT",nextDay:"[Утре во] LT",nextWeek:"dddd [во] LT",lastDay:"[Вчера во] LT",lastWeek:function(){switch(this.day()){case 0:case 3:case 6:return"[Во изминатата] dddd [во] LT";case 1:case 2:case 4:case 5:return"[Во изминатиот] dddd [во] LT"}},sameElse:"L"},relativeTime:{future:"после %s",past:"пред %s",s:"неколку секунди",m:"минута",mm:"%d минути",h:"час",hh:"%d часа",d:"ден",dd:"%d дена",M:"месец",MM:"%d месеци",y:"година",yy:"%d години"},ordinal:function(a){var b=a%10,c=a%100;return 0===a?a+"-ев":0===c?a+"-ен":c>10&&20>c?a+"-ти":1===b?a+"-ви":2===b?a+"-ри":7===b||8===b?a+"-ми":a+"-ти"},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("ml",{months:"ജനുവരി_ഫെബ്രുവരി_മാർച്ച്_ഏപ്രിൽ_മേയ്_ജൂൺ_ജൂലൈ_ഓഗസ്റ്റ്_സെപ്റ്റംബർ_ഒക്ടോബർ_നവംബർ_ഡിസംബർ".split("_"),monthsShort:"ജനു._ഫെബ്രു._മാർ._ഏപ്രി._മേയ്_ജൂൺ_ജൂലൈ._ഓഗ._സെപ്റ്റ._ഒക്ടോ._നവം._ഡിസം.".split("_"),weekdays:"ഞായറാഴ്ച_തിങ്കളാഴ്ച_ചൊവ്വാഴ്ച_ബുധനാഴ്ച_വ്യാഴാഴ്ച_വെള്ളിയാഴ്ച_ശനിയാഴ്ച".split("_"),weekdaysShort:"ഞായർ_തിങ്കൾ_ചൊവ്വ_ബുധൻ_വ്യാഴം_വെള്ളി_ശനി".split("_"),weekdaysMin:"ഞാ_തി_ചൊ_ബു_വ്യാ_വെ_ശ".split("_"),longDateFormat:{LT:"A h:mm -നു",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, LT",LLLL:"dddd, D MMMM YYYY, LT"},calendar:{sameDay:"[ഇന്ന്] LT",nextDay:"[നാളെ] LT",nextWeek:"dddd, LT",lastDay:"[ഇന്നലെ] LT",lastWeek:"[കഴിഞ്ഞ] dddd, LT",sameElse:"L"},relativeTime:{future:"%s കഴിഞ്ഞ്",past:"%s മുൻപ്",s:"അൽപ നിമിഷങ്ങൾ",m:"ഒരു മിനിറ്റ്",mm:"%d മിനിറ്റ്",h:"ഒരു മണിക്കൂർ",hh:"%d മണിക്കൂർ",d:"ഒരു ദിവസം",dd:"%d ദിവസം",M:"ഒരു മാസം",MM:"%d മാസം",y:"ഒരു വർഷം",yy:"%d വർഷം"},meridiem:function(a){return 4>a?"രാത്രി":12>a?"രാവിലെ":17>a?"ഉച്ച കഴിഞ്ഞ്":20>a?"വൈകുന്നേരം":"രാത്രി"}})}),function(a){a(tb)}(function(a){var b={1:"१",2:"२",3:"३",4:"४",5:"५",6:"६",7:"७",8:"८",9:"९",0:"०"},c={"१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9","०":"0"};return a.defineLocale("mr",{months:"जानेवारी_फेब्रुवारी_मार्च_एप्रिल_मे_जून_जुलै_ऑगस्ट_सप्टेंबर_ऑक्टोबर_नोव्हेंबर_डिसेंबर".split("_"),monthsShort:"जाने._फेब्रु._मार्च._एप्रि._मे._जून._जुलै._ऑग._सप्टें._ऑक्टो._नोव्हें._डिसें.".split("_"),weekdays:"रविवार_सोमवार_मंगळवार_बुधवार_गुरूवार_शुक्रवार_शनिवार".split("_"),weekdaysShort:"रवि_सोम_मंगळ_बुध_गुरू_शुक्र_शनि".split("_"),weekdaysMin:"र_सो_मं_बु_गु_शु_श".split("_"),longDateFormat:{LT:"A h:mm वाजता",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, LT",LLLL:"dddd, D MMMM YYYY, LT"},calendar:{sameDay:"[आज] LT",nextDay:"[उद्या] LT",nextWeek:"dddd, LT",lastDay:"[काल] LT",lastWeek:"[मागील] dddd, LT",sameElse:"L"},relativeTime:{future:"%s नंतर",past:"%s पूर्वी",s:"सेकंद",m:"एक मिनिट",mm:"%d मिनिटे",h:"एक तास",hh:"%d तास",d:"एक दिवस",dd:"%d दिवस",M:"एक महिना",MM:"%d महिने",y:"एक वर्ष",yy:"%d वर्षे"},preparse:function(a){return a.replace(/[१२३४५६७८९०]/g,function(a){return c[a]})},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]})},meridiem:function(a){return 4>a?"रात्री":10>a?"सकाळी":17>a?"दुपारी":20>a?"सायंकाळी":"रात्री"},week:{dow:0,doy:6}})}),function(a){a(tb)}(function(a){return a.defineLocale("ms-my",{months:"Januari_Februari_Mac_April_Mei_Jun_Julai_Ogos_September_Oktober_November_Disember".split("_"),monthsShort:"Jan_Feb_Mac_Apr_Mei_Jun_Jul_Ogs_Sep_Okt_Nov_Dis".split("_"),weekdays:"Ahad_Isnin_Selasa_Rabu_Khamis_Jumaat_Sabtu".split("_"),weekdaysShort:"Ahd_Isn_Sel_Rab_Kha_Jum_Sab".split("_"),weekdaysMin:"Ah_Is_Sl_Rb_Km_Jm_Sb".split("_"),longDateFormat:{LT:"HH.mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY [pukul] LT",LLLL:"dddd, D MMMM YYYY [pukul] LT"},meridiem:function(a){return 11>a?"pagi":15>a?"tengahari":19>a?"petang":"malam"},calendar:{sameDay:"[Hari ini pukul] LT",nextDay:"[Esok pukul] LT",nextWeek:"dddd [pukul] LT",lastDay:"[Kelmarin pukul] LT",lastWeek:"dddd [lepas pukul] LT",sameElse:"L"},relativeTime:{future:"dalam %s",past:"%s yang lepas",s:"beberapa saat",m:"seminit",mm:"%d minit",h:"sejam",hh:"%d jam",d:"sehari",dd:"%d hari",M:"sebulan",MM:"%d bulan",y:"setahun",yy:"%d tahun"},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){var b={1:"၁",2:"၂",3:"၃",4:"၄",5:"၅",6:"၆",7:"၇",8:"၈",9:"၉",0:"၀"},c={"၁":"1","၂":"2","၃":"3","၄":"4","၅":"5","၆":"6","၇":"7","၈":"8","၉":"9","၀":"0"};
return a.defineLocale("my",{months:"ဇန်နဝါရီ_ဖေဖော်ဝါရီ_မတ်_ဧပြီ_မေ_ဇွန်_ဇူလိုင်_သြဂုတ်_စက်တင်ဘာ_အောက်တိုဘာ_နိုဝင်ဘာ_ဒီဇင်ဘာ".split("_"),monthsShort:"ဇန်_ဖေ_မတ်_ပြီ_မေ_ဇွန်_လိုင်_သြ_စက်_အောက်_နို_ဒီ".split("_"),weekdays:"တနင်္ဂနွေ_တနင်္လာ_အင်္ဂါ_ဗုဒ္ဓဟူး_ကြာသပတေး_သောကြာ_စနေ".split("_"),weekdaysShort:"နွေ_လာ_င်္ဂါ_ဟူး_ကြာ_သော_နေ".split("_"),weekdaysMin:"နွေ_လာ_င်္ဂါ_ဟူး_ကြာ_သော_နေ".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[ယနေ.] LT [မှာ]",nextDay:"[မနက်ဖြန်] LT [မှာ]",nextWeek:"dddd LT [မှာ]",lastDay:"[မနေ.က] LT [မှာ]",lastWeek:"[ပြီးခဲ့သော] dddd LT [မှာ]",sameElse:"L"},relativeTime:{future:"လာမည့် %s မှာ",past:"လွန်ခဲ့သော %s က",s:"စက္ကန်.အနည်းငယ်",m:"တစ်မိနစ်",mm:"%d မိနစ်",h:"တစ်နာရီ",hh:"%d နာရီ",d:"တစ်ရက်",dd:"%d ရက်",M:"တစ်လ",MM:"%d လ",y:"တစ်နှစ်",yy:"%d နှစ်"},preparse:function(a){return a.replace(/[၁၂၃၄၅၆၇၈၉၀]/g,function(a){return c[a]})},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]})},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("nb",{months:"januar_februar_mars_april_mai_juni_juli_august_september_oktober_november_desember".split("_"),monthsShort:"jan_feb_mar_apr_mai_jun_jul_aug_sep_okt_nov_des".split("_"),weekdays:"søndag_mandag_tirsdag_onsdag_torsdag_fredag_lørdag".split("_"),weekdaysShort:"søn_man_tirs_ons_tors_fre_lør".split("_"),weekdaysMin:"sø_ma_ti_on_to_fr_lø".split("_"),longDateFormat:{LT:"H.mm",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY [kl.] LT",LLLL:"dddd D. MMMM YYYY [kl.] LT"},calendar:{sameDay:"[i dag kl.] LT",nextDay:"[i morgen kl.] LT",nextWeek:"dddd [kl.] LT",lastDay:"[i går kl.] LT",lastWeek:"[forrige] dddd [kl.] LT",sameElse:"L"},relativeTime:{future:"om %s",past:"for %s siden",s:"noen sekunder",m:"ett minutt",mm:"%d minutter",h:"en time",hh:"%d timer",d:"en dag",dd:"%d dager",M:"en måned",MM:"%d måneder",y:"ett år",yy:"%d år"},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){var b={1:"१",2:"२",3:"३",4:"४",5:"५",6:"६",7:"७",8:"८",9:"९",0:"०"},c={"१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9","०":"0"};return a.defineLocale("ne",{months:"जनवरी_फेब्रुवरी_मार्च_अप्रिल_मई_जुन_जुलाई_अगष्ट_सेप्टेम्बर_अक्टोबर_नोभेम्बर_डिसेम्बर".split("_"),monthsShort:"जन._फेब्रु._मार्च_अप्रि._मई_जुन_जुलाई._अग._सेप्ट._अक्टो._नोभे._डिसे.".split("_"),weekdays:"आइतबार_सोमबार_मङ्गलबार_बुधबार_बिहिबार_शुक्रबार_शनिबार".split("_"),weekdaysShort:"आइत._सोम._मङ्गल._बुध._बिहि._शुक्र._शनि.".split("_"),weekdaysMin:"आइ._सो._मङ्_बु._बि._शु._श.".split("_"),longDateFormat:{LT:"Aको h:mm बजे",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, LT",LLLL:"dddd, D MMMM YYYY, LT"},preparse:function(a){return a.replace(/[१२३४५६७८९०]/g,function(a){return c[a]})},postformat:function(a){return a.replace(/\d/g,function(a){return b[a]})},meridiem:function(a){return 3>a?"राती":10>a?"बिहान":15>a?"दिउँसो":18>a?"बेलुका":20>a?"साँझ":"राती"},calendar:{sameDay:"[आज] LT",nextDay:"[भोली] LT",nextWeek:"[आउँदो] dddd[,] LT",lastDay:"[हिजो] LT",lastWeek:"[गएको] dddd[,] LT",sameElse:"L"},relativeTime:{future:"%sमा",past:"%s अगाडी",s:"केही समय",m:"एक मिनेट",mm:"%d मिनेट",h:"एक घण्टा",hh:"%d घण्टा",d:"एक दिन",dd:"%d दिन",M:"एक महिना",MM:"%d महिना",y:"एक बर्ष",yy:"%d बर्ष"},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){var b="jan._feb._mrt._apr._mei_jun._jul._aug._sep._okt._nov._dec.".split("_"),c="jan_feb_mrt_apr_mei_jun_jul_aug_sep_okt_nov_dec".split("_");return a.defineLocale("nl",{months:"januari_februari_maart_april_mei_juni_juli_augustus_september_oktober_november_december".split("_"),monthsShort:function(a,d){return/-MMM-/.test(d)?c[a.month()]:b[a.month()]},weekdays:"zondag_maandag_dinsdag_woensdag_donderdag_vrijdag_zaterdag".split("_"),weekdaysShort:"zo._ma._di._wo._do._vr._za.".split("_"),weekdaysMin:"Zo_Ma_Di_Wo_Do_Vr_Za".split("_"),longDateFormat:{LT:"HH:mm",L:"DD-MM-YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[vandaag om] LT",nextDay:"[morgen om] LT",nextWeek:"dddd [om] LT",lastDay:"[gisteren om] LT",lastWeek:"[afgelopen] dddd [om] LT",sameElse:"L"},relativeTime:{future:"over %s",past:"%s geleden",s:"een paar seconden",m:"één minuut",mm:"%d minuten",h:"één uur",hh:"%d uur",d:"één dag",dd:"%d dagen",M:"één maand",MM:"%d maanden",y:"één jaar",yy:"%d jaar"},ordinal:function(a){return a+(1===a||8===a||a>=20?"ste":"de")},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("nn",{months:"januar_februar_mars_april_mai_juni_juli_august_september_oktober_november_desember".split("_"),monthsShort:"jan_feb_mar_apr_mai_jun_jul_aug_sep_okt_nov_des".split("_"),weekdays:"sundag_måndag_tysdag_onsdag_torsdag_fredag_laurdag".split("_"),weekdaysShort:"sun_mån_tys_ons_tor_fre_lau".split("_"),weekdaysMin:"su_må_ty_on_to_fr_lø".split("_"),longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[I dag klokka] LT",nextDay:"[I morgon klokka] LT",nextWeek:"dddd [klokka] LT",lastDay:"[I går klokka] LT",lastWeek:"[Føregåande] dddd [klokka] LT",sameElse:"L"},relativeTime:{future:"om %s",past:"for %s sidan",s:"nokre sekund",m:"eit minutt",mm:"%d minutt",h:"ein time",hh:"%d timar",d:"ein dag",dd:"%d dagar",M:"ein månad",MM:"%d månader",y:"eit år",yy:"%d år"},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a){return 5>a%10&&a%10>1&&~~(a/10)%10!==1}function c(a,c,d){var e=a+" ";switch(d){case"m":return c?"minuta":"minutę";case"mm":return e+(b(a)?"minuty":"minut");case"h":return c?"godzina":"godzinę";case"hh":return e+(b(a)?"godziny":"godzin");case"MM":return e+(b(a)?"miesiące":"miesięcy");case"yy":return e+(b(a)?"lata":"lat")}}var d="styczeń_luty_marzec_kwiecień_maj_czerwiec_lipiec_sierpień_wrzesień_październik_listopad_grudzień".split("_"),e="stycznia_lutego_marca_kwietnia_maja_czerwca_lipca_sierpnia_września_października_listopada_grudnia".split("_");return a.defineLocale("pl",{months:function(a,b){return/D MMMM/.test(b)?e[a.month()]:d[a.month()]},monthsShort:"sty_lut_mar_kwi_maj_cze_lip_sie_wrz_paź_lis_gru".split("_"),weekdays:"niedziela_poniedziałek_wtorek_środa_czwartek_piątek_sobota".split("_"),weekdaysShort:"nie_pon_wt_śr_czw_pt_sb".split("_"),weekdaysMin:"N_Pn_Wt_Śr_Cz_Pt_So".split("_"),longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Dziś o] LT",nextDay:"[Jutro o] LT",nextWeek:"[W] dddd [o] LT",lastDay:"[Wczoraj o] LT",lastWeek:function(){switch(this.day()){case 0:return"[W zeszłą niedzielę o] LT";case 3:return"[W zeszłą środę o] LT";case 6:return"[W zeszłą sobotę o] LT";default:return"[W zeszły] dddd [o] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"%s temu",s:"kilka sekund",m:c,mm:c,h:c,hh:c,d:"1 dzień",dd:"%d dni",M:"miesiąc",MM:c,y:"rok",yy:c},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("pt-br",{months:"janeiro_fevereiro_março_abril_maio_junho_julho_agosto_setembro_outubro_novembro_dezembro".split("_"),monthsShort:"jan_fev_mar_abr_mai_jun_jul_ago_set_out_nov_dez".split("_"),weekdays:"domingo_segunda-feira_terça-feira_quarta-feira_quinta-feira_sexta-feira_sábado".split("_"),weekdaysShort:"dom_seg_ter_qua_qui_sex_sáb".split("_"),weekdaysMin:"dom_2ª_3ª_4ª_5ª_6ª_sáb".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY [às] LT",LLLL:"dddd, D [de] MMMM [de] YYYY [às] LT"},calendar:{sameDay:"[Hoje às] LT",nextDay:"[Amanhã às] LT",nextWeek:"dddd [às] LT",lastDay:"[Ontem às] LT",lastWeek:function(){return 0===this.day()||6===this.day()?"[Último] dddd [às] LT":"[Última] dddd [às] LT"},sameElse:"L"},relativeTime:{future:"em %s",past:"%s atrás",s:"segundos",m:"um minuto",mm:"%d minutos",h:"uma hora",hh:"%d horas",d:"um dia",dd:"%d dias",M:"um mês",MM:"%d meses",y:"um ano",yy:"%d anos"},ordinal:"%dº"})}),function(a){a(tb)}(function(a){return a.defineLocale("pt",{months:"janeiro_fevereiro_março_abril_maio_junho_julho_agosto_setembro_outubro_novembro_dezembro".split("_"),monthsShort:"jan_fev_mar_abr_mai_jun_jul_ago_set_out_nov_dez".split("_"),weekdays:"domingo_segunda-feira_terça-feira_quarta-feira_quinta-feira_sexta-feira_sábado".split("_"),weekdaysShort:"dom_seg_ter_qua_qui_sex_sáb".split("_"),weekdaysMin:"dom_2ª_3ª_4ª_5ª_6ª_sáb".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY LT",LLLL:"dddd, D [de] MMMM [de] YYYY LT"},calendar:{sameDay:"[Hoje às] LT",nextDay:"[Amanhã às] LT",nextWeek:"dddd [às] LT",lastDay:"[Ontem às] LT",lastWeek:function(){return 0===this.day()||6===this.day()?"[Último] dddd [às] LT":"[Última] dddd [às] LT"},sameElse:"L"},relativeTime:{future:"em %s",past:"há %s",s:"segundos",m:"um minuto",mm:"%d minutos",h:"uma hora",hh:"%d horas",d:"um dia",dd:"%d dias",M:"um mês",MM:"%d meses",y:"um ano",yy:"%d anos"},ordinal:"%dº",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a,b,c){var d={mm:"minute",hh:"ore",dd:"zile",MM:"luni",yy:"ani"},e=" ";return(a%100>=20||a>=100&&a%100===0)&&(e=" de "),a+e+d[c]}return a.defineLocale("ro",{months:"ianuarie_februarie_martie_aprilie_mai_iunie_iulie_august_septembrie_octombrie_noiembrie_decembrie".split("_"),monthsShort:"ian._febr._mart._apr._mai_iun._iul._aug._sept._oct._nov._dec.".split("_"),weekdays:"duminică_luni_marți_miercuri_joi_vineri_sâmbătă".split("_"),weekdaysShort:"Dum_Lun_Mar_Mie_Joi_Vin_Sâm".split("_"),weekdaysMin:"Du_Lu_Ma_Mi_Jo_Vi_Sâ".split("_"),longDateFormat:{LT:"H:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY H:mm",LLLL:"dddd, D MMMM YYYY H:mm"},calendar:{sameDay:"[azi la] LT",nextDay:"[mâine la] LT",nextWeek:"dddd [la] LT",lastDay:"[ieri la] LT",lastWeek:"[fosta] dddd [la] LT",sameElse:"L"},relativeTime:{future:"peste %s",past:"%s în urmă",s:"câteva secunde",m:"un minut",mm:b,h:"o oră",hh:b,d:"o zi",dd:b,M:"o lună",MM:b,y:"un an",yy:b},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){function b(a,b){var c=a.split("_");return b%10===1&&b%100!==11?c[0]:b%10>=2&&4>=b%10&&(10>b%100||b%100>=20)?c[1]:c[2]}function c(a,c,d){var e={mm:c?"минута_минуты_минут":"минуту_минуты_минут",hh:"час_часа_часов",dd:"день_дня_дней",MM:"месяц_месяца_месяцев",yy:"год_года_лет"};return"m"===d?c?"минута":"минуту":a+" "+b(e[d],+a)}function d(a,b){var c={nominative:"январь_февраль_март_апрель_май_июнь_июль_август_сентябрь_октябрь_ноябрь_декабрь".split("_"),accusative:"января_февраля_марта_апреля_мая_июня_июля_августа_сентября_октября_ноября_декабря".split("_")},d=/D[oD]?(\[[^\[\]]*\]|\s+)+MMMM?/.test(b)?"accusative":"nominative";return c[d][a.month()]}function e(a,b){var c={nominative:"янв_фев_мар_апр_май_июнь_июль_авг_сен_окт_ноя_дек".split("_"),accusative:"янв_фев_мар_апр_мая_июня_июля_авг_сен_окт_ноя_дек".split("_")},d=/D[oD]?(\[[^\[\]]*\]|\s+)+MMMM?/.test(b)?"accusative":"nominative";return c[d][a.month()]}function f(a,b){var c={nominative:"воскресенье_понедельник_вторник_среда_четверг_пятница_суббота".split("_"),accusative:"воскресенье_понедельник_вторник_среду_четверг_пятницу_субботу".split("_")},d=/\[ ?[Вв] ?(?:прошлую|следующую)? ?\] ?dddd/.test(b)?"accusative":"nominative";return c[d][a.day()]}return a.defineLocale("ru",{months:d,monthsShort:e,weekdays:f,weekdaysShort:"вс_пн_вт_ср_чт_пт_сб".split("_"),weekdaysMin:"вс_пн_вт_ср_чт_пт_сб".split("_"),monthsParse:[/^янв/i,/^фев/i,/^мар/i,/^апр/i,/^ма[й|я]/i,/^июн/i,/^июл/i,/^авг/i,/^сен/i,/^окт/i,/^ноя/i,/^дек/i],longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY г.",LLL:"D MMMM YYYY г., LT",LLLL:"dddd, D MMMM YYYY г., LT"},calendar:{sameDay:"[Сегодня в] LT",nextDay:"[Завтра в] LT",lastDay:"[Вчера в] LT",nextWeek:function(){return 2===this.day()?"[Во] dddd [в] LT":"[В] dddd [в] LT"},lastWeek:function(){switch(this.day()){case 0:return"[В прошлое] dddd [в] LT";case 1:case 2:case 4:return"[В прошлый] dddd [в] LT";case 3:case 5:case 6:return"[В прошлую] dddd [в] LT"}},sameElse:"L"},relativeTime:{future:"через %s",past:"%s назад",s:"несколько секунд",m:c,mm:c,h:"час",hh:c,d:"день",dd:c,M:"месяц",MM:c,y:"год",yy:c},meridiemParse:/ночи|утра|дня|вечера/i,isPM:function(a){return/^(дня|вечера)$/.test(a)},meridiem:function(a){return 4>a?"ночи":12>a?"утра":17>a?"дня":"вечера"},ordinal:function(a,b){switch(b){case"M":case"d":case"DDD":return a+"-й";case"D":return a+"-го";case"w":case"W":return a+"-я";default:return a}},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){function b(a){return a>1&&5>a}function c(a,c,d,e){var f=a+" ";switch(d){case"s":return c||e?"pár sekúnd":"pár sekundami";case"m":return c?"minúta":e?"minútu":"minútou";case"mm":return c||e?f+(b(a)?"minúty":"minút"):f+"minútami";break;case"h":return c?"hodina":e?"hodinu":"hodinou";case"hh":return c||e?f+(b(a)?"hodiny":"hodín"):f+"hodinami";break;case"d":return c||e?"deň":"dňom";case"dd":return c||e?f+(b(a)?"dni":"dní"):f+"dňami";break;case"M":return c||e?"mesiac":"mesiacom";case"MM":return c||e?f+(b(a)?"mesiace":"mesiacov"):f+"mesiacmi";break;case"y":return c||e?"rok":"rokom";case"yy":return c||e?f+(b(a)?"roky":"rokov"):f+"rokmi"}}var d="január_február_marec_apríl_máj_jún_júl_august_september_október_november_december".split("_"),e="jan_feb_mar_apr_máj_jún_júl_aug_sep_okt_nov_dec".split("_");return a.defineLocale("sk",{months:d,monthsShort:e,monthsParse:function(a,b){var c,d=[];for(c=0;12>c;c++)d[c]=new RegExp("^"+a[c]+"$|^"+b[c]+"$","i");return d}(d,e),weekdays:"nedeľa_pondelok_utorok_streda_štvrtok_piatok_sobota".split("_"),weekdaysShort:"ne_po_ut_st_št_pi_so".split("_"),weekdaysMin:"ne_po_ut_st_št_pi_so".split("_"),longDateFormat:{LT:"H:mm",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd D. MMMM YYYY LT"},calendar:{sameDay:"[dnes o] LT",nextDay:"[zajtra o] LT",nextWeek:function(){switch(this.day()){case 0:return"[v nedeľu o] LT";case 1:case 2:return"[v] dddd [o] LT";case 3:return"[v stredu o] LT";case 4:return"[vo štvrtok o] LT";case 5:return"[v piatok o] LT";case 6:return"[v sobotu o] LT"}},lastDay:"[včera o] LT",lastWeek:function(){switch(this.day()){case 0:return"[minulú nedeľu o] LT";case 1:case 2:return"[minulý] dddd [o] LT";case 3:return"[minulú stredu o] LT";case 4:case 5:return"[minulý] dddd [o] LT";case 6:return"[minulú sobotu o] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"pred %s",s:c,m:c,mm:c,h:c,hh:c,d:c,dd:c,M:c,MM:c,y:c,yy:c},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){function b(a,b,c){var d=a+" ";switch(c){case"m":return b?"ena minuta":"eno minuto";case"mm":return d+=1===a?"minuta":2===a?"minuti":3===a||4===a?"minute":"minut";case"h":return b?"ena ura":"eno uro";case"hh":return d+=1===a?"ura":2===a?"uri":3===a||4===a?"ure":"ur";case"dd":return d+=1===a?"dan":"dni";case"MM":return d+=1===a?"mesec":2===a?"meseca":3===a||4===a?"mesece":"mesecev";case"yy":return d+=1===a?"leto":2===a?"leti":3===a||4===a?"leta":"let"}}return a.defineLocale("sl",{months:"januar_februar_marec_april_maj_junij_julij_avgust_september_oktober_november_december".split("_"),monthsShort:"jan._feb._mar._apr._maj._jun._jul._avg._sep._okt._nov._dec.".split("_"),weekdays:"nedelja_ponedeljek_torek_sreda_četrtek_petek_sobota".split("_"),weekdaysShort:"ned._pon._tor._sre._čet._pet._sob.".split("_"),weekdaysMin:"ne_po_to_sr_če_pe_so".split("_"),longDateFormat:{LT:"H:mm",L:"DD. MM. YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[danes ob] LT",nextDay:"[jutri ob] LT",nextWeek:function(){switch(this.day()){case 0:return"[v] [nedeljo] [ob] LT";case 3:return"[v] [sredo] [ob] LT";case 6:return"[v] [soboto] [ob] LT";case 1:case 2:case 4:case 5:return"[v] dddd [ob] LT"}},lastDay:"[včeraj ob] LT",lastWeek:function(){switch(this.day()){case 0:case 3:case 6:return"[prejšnja] dddd [ob] LT";case 1:case 2:case 4:case 5:return"[prejšnji] dddd [ob] LT"}},sameElse:"L"},relativeTime:{future:"čez %s",past:"%s nazaj",s:"nekaj sekund",m:b,mm:b,h:b,hh:b,d:"en dan",dd:b,M:"en mesec",MM:b,y:"eno leto",yy:b},ordinal:"%d.",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("sq",{months:"Janar_Shkurt_Mars_Prill_Maj_Qershor_Korrik_Gusht_Shtator_Tetor_Nëntor_Dhjetor".split("_"),monthsShort:"Jan_Shk_Mar_Pri_Maj_Qer_Kor_Gus_Sht_Tet_Nën_Dhj".split("_"),weekdays:"E Diel_E Hënë_E Martë_E Mërkurë_E Enjte_E Premte_E Shtunë".split("_"),weekdaysShort:"Die_Hën_Mar_Mër_Enj_Pre_Sht".split("_"),weekdaysMin:"D_H_Ma_Më_E_P_Sh".split("_"),meridiem:function(a){return 12>a?"PD":"MD"},longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[Sot në] LT",nextDay:"[Nesër në] LT",nextWeek:"dddd [në] LT",lastDay:"[Dje në] LT",lastWeek:"dddd [e kaluar në] LT",sameElse:"L"},relativeTime:{future:"në %s",past:"%s më parë",s:"disa sekonda",m:"një minutë",mm:"%d minuta",h:"një orë",hh:"%d orë",d:"një ditë",dd:"%d ditë",M:"një muaj",MM:"%d muaj",y:"një vit",yy:"%d vite"},ordinal:"%d.",week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){var b={words:{m:["један минут","једне минуте"],mm:["минут","минуте","минута"],h:["један сат","једног сата"],hh:["сат","сата","сати"],dd:["дан","дана","дана"],MM:["месец","месеца","месеци"],yy:["година","године","година"]},correctGrammaticalCase:function(a,b){return 1===a?b[0]:a>=2&&4>=a?b[1]:b[2]},translate:function(a,c,d){var e=b.words[d];return 1===d.length?c?e[0]:e[1]:a+" "+b.correctGrammaticalCase(a,e)}};return a.defineLocale("sr-cyrl",{months:["јануар","фебруар","март","април","мај","јун","јул","август","септембар","октобар","новембар","децембар"],monthsShort:["јан.","феб.","мар.","апр.","мај","јун","јул","авг.","сеп.","окт.","нов.","дец."],weekdays:["недеља","понедељак","уторак","среда","четвртак","петак","субота"],weekdaysShort:["нед.","пон.","уто.","сре.","чет.","пет.","суб."],weekdaysMin:["не","по","ут","ср","че","пе","су"],longDateFormat:{LT:"H:mm",L:"DD. MM. YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[данас у] LT",nextDay:"[сутра у] LT",nextWeek:function(){switch(this.day()){case 0:return"[у] [недељу] [у] LT";case 3:return"[у] [среду] [у] LT";case 6:return"[у] [суботу] [у] LT";case 1:case 2:case 4:case 5:return"[у] dddd [у] LT"}},lastDay:"[јуче у] LT",lastWeek:function(){var a=["[прошле] [недеље] [у] LT","[прошлог] [понедељка] [у] LT","[прошлог] [уторка] [у] LT","[прошле] [среде] [у] LT","[прошлог] [четвртка] [у] LT","[прошлог] [петка] [у] LT","[прошле] [суботе] [у] LT"];return a[this.day()]},sameElse:"L"},relativeTime:{future:"за %s",past:"пре %s",s:"неколико секунди",m:b.translate,mm:b.translate,h:b.translate,hh:b.translate,d:"дан",dd:b.translate,M:"месец",MM:b.translate,y:"годину",yy:b.translate},ordinal:"%d.",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){var b={words:{m:["jedan minut","jedne minute"],mm:["minut","minute","minuta"],h:["jedan sat","jednog sata"],hh:["sat","sata","sati"],dd:["dan","dana","dana"],MM:["mesec","meseca","meseci"],yy:["godina","godine","godina"]},correctGrammaticalCase:function(a,b){return 1===a?b[0]:a>=2&&4>=a?b[1]:b[2]},translate:function(a,c,d){var e=b.words[d];return 1===d.length?c?e[0]:e[1]:a+" "+b.correctGrammaticalCase(a,e)}};return a.defineLocale("sr",{months:["januar","februar","mart","april","maj","jun","jul","avgust","septembar","oktobar","novembar","decembar"],monthsShort:["jan.","feb.","mar.","apr.","maj","jun","jul","avg.","sep.","okt.","nov.","dec."],weekdays:["nedelja","ponedeljak","utorak","sreda","četvrtak","petak","subota"],weekdaysShort:["ned.","pon.","uto.","sre.","čet.","pet.","sub."],weekdaysMin:["ne","po","ut","sr","če","pe","su"],longDateFormat:{LT:"H:mm",L:"DD. MM. YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY LT",LLLL:"dddd, D. MMMM YYYY LT"},calendar:{sameDay:"[danas u] LT",nextDay:"[sutra u] LT",nextWeek:function(){switch(this.day()){case 0:return"[u] [nedelju] [u] LT";case 3:return"[u] [sredu] [u] LT";case 6:return"[u] [subotu] [u] LT";case 1:case 2:case 4:case 5:return"[u] dddd [u] LT"}},lastDay:"[juče u] LT",lastWeek:function(){var a=["[prošle] [nedelje] [u] LT","[prošlog] [ponedeljka] [u] LT","[prošlog] [utorka] [u] LT","[prošle] [srede] [u] LT","[prošlog] [četvrtka] [u] LT","[prošlog] [petka] [u] LT","[prošle] [subote] [u] LT"];return a[this.day()]},sameElse:"L"},relativeTime:{future:"za %s",past:"pre %s",s:"nekoliko sekundi",m:b.translate,mm:b.translate,h:b.translate,hh:b.translate,d:"dan",dd:b.translate,M:"mesec",MM:b.translate,y:"godinu",yy:b.translate},ordinal:"%d.",week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("sv",{months:"januari_februari_mars_april_maj_juni_juli_augusti_september_oktober_november_december".split("_"),monthsShort:"jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec".split("_"),weekdays:"söndag_måndag_tisdag_onsdag_torsdag_fredag_lördag".split("_"),weekdaysShort:"sön_mån_tis_ons_tor_fre_lör".split("_"),weekdaysMin:"sö_må_ti_on_to_fr_lö".split("_"),longDateFormat:{LT:"HH:mm",L:"YYYY-MM-DD",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[Idag] LT",nextDay:"[Imorgon] LT",lastDay:"[Igår] LT",nextWeek:"dddd LT",lastWeek:"[Förra] dddd[en] LT",sameElse:"L"},relativeTime:{future:"om %s",past:"för %s sedan",s:"några sekunder",m:"en minut",mm:"%d minuter",h:"en timme",hh:"%d timmar",d:"en dag",dd:"%d dagar",M:"en månad",MM:"%d månader",y:"ett år",yy:"%d år"},ordinal:function(a){var b=a%10,c=1===~~(a%100/10)?"e":1===b?"a":2===b?"a":3===b?"e":"e";return a+c},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("ta",{months:"ஜனவரி_பிப்ரவரி_மார்ச்_ஏப்ரல்_மே_ஜூன்_ஜூலை_ஆகஸ்ட்_செப்டெம்பர்_அக்டோபர்_நவம்பர்_டிசம்பர்".split("_"),monthsShort:"ஜனவரி_பிப்ரவரி_மார்ச்_ஏப்ரல்_மே_ஜூன்_ஜூலை_ஆகஸ்ட்_செப்டெம்பர்_அக்டோபர்_நவம்பர்_டிசம்பர்".split("_"),weekdays:"ஞாயிற்றுக்கிழமை_திங்கட்கிழமை_செவ்வாய்கிழமை_புதன்கிழமை_வியாழக்கிழமை_வெள்ளிக்கிழமை_சனிக்கிழமை".split("_"),weekdaysShort:"ஞாயிறு_திங்கள்_செவ்வாய்_புதன்_வியாழன்_வெள்ளி_சனி".split("_"),weekdaysMin:"ஞா_தி_செ_பு_வி_வெ_ச".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, LT",LLLL:"dddd, D MMMM YYYY, LT"},calendar:{sameDay:"[இன்று] LT",nextDay:"[நாளை] LT",nextWeek:"dddd, LT",lastDay:"[நேற்று] LT",lastWeek:"[கடந்த வாரம்] dddd, LT",sameElse:"L"},relativeTime:{future:"%s இல்",past:"%s முன்",s:"ஒரு சில விநாடிகள்",m:"ஒரு நிமிடம்",mm:"%d நிமிடங்கள்",h:"ஒரு மணி நேரம்",hh:"%d மணி நேரம்",d:"ஒரு நாள்",dd:"%d நாட்கள்",M:"ஒரு மாதம்",MM:"%d மாதங்கள்",y:"ஒரு வருடம்",yy:"%d ஆண்டுகள்"},ordinal:function(a){return a+"வது"},meridiem:function(a){return a>=6&&10>=a?" காலை":a>=10&&14>=a?" நண்பகல்":a>=14&&18>=a?" எற்பாடு":a>=18&&20>=a?" மாலை":a>=20&&24>=a?" இரவு":a>=0&&6>=a?" வைகறை":void 0},week:{dow:0,doy:6}})}),function(a){a(tb)}(function(a){return a.defineLocale("th",{months:"มกราคม_กุมภาพันธ์_มีนาคม_เมษายน_พฤษภาคม_มิถุนายน_กรกฎาคม_สิงหาคม_กันยายน_ตุลาคม_พฤศจิกายน_ธันวาคม".split("_"),monthsShort:"มกรา_กุมภา_มีนา_เมษา_พฤษภา_มิถุนา_กรกฎา_สิงหา_กันยา_ตุลา_พฤศจิกา_ธันวา".split("_"),weekdays:"อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัสบดี_ศุกร์_เสาร์".split("_"),weekdaysShort:"อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัส_ศุกร์_เสาร์".split("_"),weekdaysMin:"อา._จ._อ._พ._พฤ._ศ._ส.".split("_"),longDateFormat:{LT:"H นาฬิกา m นาที",L:"YYYY/MM/DD",LL:"D MMMM YYYY",LLL:"D MMMM YYYY เวลา LT",LLLL:"วันddddที่ D MMMM YYYY เวลา LT"},meridiem:function(a){return 12>a?"ก่อนเที่ยง":"หลังเที่ยง"},calendar:{sameDay:"[วันนี้ เวลา] LT",nextDay:"[พรุ่งนี้ เวลา] LT",nextWeek:"dddd[หน้า เวลา] LT",lastDay:"[เมื่อวานนี้ เวลา] LT",lastWeek:"[วัน]dddd[ที่แล้ว เวลา] LT",sameElse:"L"},relativeTime:{future:"อีก %s",past:"%sที่แล้ว",s:"ไม่กี่วินาที",m:"1 นาที",mm:"%d นาที",h:"1 ชั่วโมง",hh:"%d ชั่วโมง",d:"1 วัน",dd:"%d วัน",M:"1 เดือน",MM:"%d เดือน",y:"1 ปี",yy:"%d ปี"}})}),function(a){a(tb)}(function(a){return a.defineLocale("tl-ph",{months:"Enero_Pebrero_Marso_Abril_Mayo_Hunyo_Hulyo_Agosto_Setyembre_Oktubre_Nobyembre_Disyembre".split("_"),monthsShort:"Ene_Peb_Mar_Abr_May_Hun_Hul_Ago_Set_Okt_Nob_Dis".split("_"),weekdays:"Linggo_Lunes_Martes_Miyerkules_Huwebes_Biyernes_Sabado".split("_"),weekdaysShort:"Lin_Lun_Mar_Miy_Huw_Biy_Sab".split("_"),weekdaysMin:"Li_Lu_Ma_Mi_Hu_Bi_Sab".split("_"),longDateFormat:{LT:"HH:mm",L:"MM/D/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY LT",LLLL:"dddd, MMMM DD, YYYY LT"},calendar:{sameDay:"[Ngayon sa] LT",nextDay:"[Bukas sa] LT",nextWeek:"dddd [sa] LT",lastDay:"[Kahapon sa] LT",lastWeek:"dddd [huling linggo] LT",sameElse:"L"},relativeTime:{future:"sa loob ng %s",past:"%s ang nakalipas",s:"ilang segundo",m:"isang minuto",mm:"%d minuto",h:"isang oras",hh:"%d oras",d:"isang araw",dd:"%d araw",M:"isang buwan",MM:"%d buwan",y:"isang taon",yy:"%d taon"},ordinal:function(a){return a},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){var b={1:"'inci",5:"'inci",8:"'inci",70:"'inci",80:"'inci",2:"'nci",7:"'nci",20:"'nci",50:"'nci",3:"'üncü",4:"'üncü",100:"'üncü",6:"'ncı",9:"'uncu",10:"'uncu",30:"'uncu",60:"'ıncı",90:"'ıncı"};return a.defineLocale("tr",{months:"Ocak_Şubat_Mart_Nisan_Mayıs_Haziran_Temmuz_Ağustos_Eylül_Ekim_Kasım_Aralık".split("_"),monthsShort:"Oca_Şub_Mar_Nis_May_Haz_Tem_Ağu_Eyl_Eki_Kas_Ara".split("_"),weekdays:"Pazar_Pazartesi_Salı_Çarşamba_Perşembe_Cuma_Cumartesi".split("_"),weekdaysShort:"Paz_Pts_Sal_Çar_Per_Cum_Cts".split("_"),weekdaysMin:"Pz_Pt_Sa_Ça_Pe_Cu_Ct".split("_"),longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd, D MMMM YYYY LT"},calendar:{sameDay:"[bugün saat] LT",nextDay:"[yarın saat] LT",nextWeek:"[haftaya] dddd [saat] LT",lastDay:"[dün] LT",lastWeek:"[geçen hafta] dddd [saat] LT",sameElse:"L"},relativeTime:{future:"%s sonra",past:"%s önce",s:"birkaç saniye",m:"bir dakika",mm:"%d dakika",h:"bir saat",hh:"%d saat",d:"bir gün",dd:"%d gün",M:"bir ay",MM:"%d ay",y:"bir yıl",yy:"%d yıl"},ordinal:function(a){if(0===a)return a+"'ıncı";var c=a%10,d=a%100-c,e=a>=100?100:null;return a+(b[c]||b[d]||b[e])},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("tzm-latn",{months:"innayr_brˤayrˤ_marˤsˤ_ibrir_mayyw_ywnyw_ywlywz_ɣwšt_šwtanbir_ktˤwbrˤ_nwwanbir_dwjnbir".split("_"),monthsShort:"innayr_brˤayrˤ_marˤsˤ_ibrir_mayyw_ywnyw_ywlywz_ɣwšt_šwtanbir_ktˤwbrˤ_nwwanbir_dwjnbir".split("_"),weekdays:"asamas_aynas_asinas_akras_akwas_asimwas_asiḍyas".split("_"),weekdaysShort:"asamas_aynas_asinas_akras_akwas_asimwas_asiḍyas".split("_"),weekdaysMin:"asamas_aynas_asinas_akras_akwas_asimwas_asiḍyas".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[asdkh g] LT",nextDay:"[aska g] LT",nextWeek:"dddd [g] LT",lastDay:"[assant g] LT",lastWeek:"dddd [g] LT",sameElse:"L"},relativeTime:{future:"dadkh s yan %s",past:"yan %s",s:"imik",m:"minuḍ",mm:"%d minuḍ",h:"saɛa",hh:"%d tassaɛin",d:"ass",dd:"%d ossan",M:"ayowr",MM:"%d iyyirn",y:"asgas",yy:"%d isgasn"},week:{dow:6,doy:12}})}),function(a){a(tb)}(function(a){return a.defineLocale("tzm",{months:"ⵉⵏⵏⴰⵢⵔ_ⴱⵕⴰⵢⵕ_ⵎⴰⵕⵚ_ⵉⴱⵔⵉⵔ_ⵎⴰⵢⵢⵓ_ⵢⵓⵏⵢⵓ_ⵢⵓⵍⵢⵓⵣ_ⵖⵓⵛⵜ_ⵛⵓⵜⴰⵏⴱⵉⵔ_ⴽⵟⵓⴱⵕ_ⵏⵓⵡⴰⵏⴱⵉⵔ_ⴷⵓⵊⵏⴱⵉⵔ".split("_"),monthsShort:"ⵉⵏⵏⴰⵢⵔ_ⴱⵕⴰⵢⵕ_ⵎⴰⵕⵚ_ⵉⴱⵔⵉⵔ_ⵎⴰⵢⵢⵓ_ⵢⵓⵏⵢⵓ_ⵢⵓⵍⵢⵓⵣ_ⵖⵓⵛⵜ_ⵛⵓⵜⴰⵏⴱⵉⵔ_ⴽⵟⵓⴱⵕ_ⵏⵓⵡⴰⵏⴱⵉⵔ_ⴷⵓⵊⵏⴱⵉⵔ".split("_"),weekdays:"ⴰⵙⴰⵎⴰⵙ_ⴰⵢⵏⴰⵙ_ⴰⵙⵉⵏⴰⵙ_ⴰⴽⵔⴰⵙ_ⴰⴽⵡⴰⵙ_ⴰⵙⵉⵎⵡⴰⵙ_ⴰⵙⵉⴹⵢⴰⵙ".split("_"),weekdaysShort:"ⴰⵙⴰⵎⴰⵙ_ⴰⵢⵏⴰⵙ_ⴰⵙⵉⵏⴰⵙ_ⴰⴽⵔⴰⵙ_ⴰⴽⵡⴰⵙ_ⴰⵙⵉⵎⵡⴰⵙ_ⴰⵙⵉⴹⵢⴰⵙ".split("_"),weekdaysMin:"ⴰⵙⴰⵎⴰⵙ_ⴰⵢⵏⴰⵙ_ⴰⵙⵉⵏⴰⵙ_ⴰⴽⵔⴰⵙ_ⴰⴽⵡⴰⵙ_ⴰⵙⵉⵎⵡⴰⵙ_ⴰⵙⵉⴹⵢⴰⵙ".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[ⴰⵙⴷⵅ ⴴ] LT",nextDay:"[ⴰⵙⴽⴰ ⴴ] LT",nextWeek:"dddd [ⴴ] LT",lastDay:"[ⴰⵚⴰⵏⵜ ⴴ] LT",lastWeek:"dddd [ⴴ] LT",sameElse:"L"},relativeTime:{future:"ⴷⴰⴷⵅ ⵙ ⵢⴰⵏ %s",past:"ⵢⴰⵏ %s",s:"ⵉⵎⵉⴽ",m:"ⵎⵉⵏⵓⴺ",mm:"%d ⵎⵉⵏⵓⴺ",h:"ⵙⴰⵄⴰ",hh:"%d ⵜⴰⵙⵙⴰⵄⵉⵏ",d:"ⴰⵙⵙ",dd:"%d oⵙⵙⴰⵏ",M:"ⴰⵢoⵓⵔ",MM:"%d ⵉⵢⵢⵉⵔⵏ",y:"ⴰⵙⴳⴰⵙ",yy:"%d ⵉⵙⴳⴰⵙⵏ"},week:{dow:6,doy:12}})}),function(a){a(tb)}(function(a){function b(a,b){var c=a.split("_");return b%10===1&&b%100!==11?c[0]:b%10>=2&&4>=b%10&&(10>b%100||b%100>=20)?c[1]:c[2]}function c(a,c,d){var e={mm:"хвилина_хвилини_хвилин",hh:"година_години_годин",dd:"день_дні_днів",MM:"місяць_місяці_місяців",yy:"рік_роки_років"};return"m"===d?c?"хвилина":"хвилину":"h"===d?c?"година":"годину":a+" "+b(e[d],+a)}function d(a,b){var c={nominative:"січень_лютий_березень_квітень_травень_червень_липень_серпень_вересень_жовтень_листопад_грудень".split("_"),accusative:"січня_лютого_березня_квітня_травня_червня_липня_серпня_вересня_жовтня_листопада_грудня".split("_")},d=/D[oD]? *MMMM?/.test(b)?"accusative":"nominative";return c[d][a.month()]}function e(a,b){var c={nominative:"неділя_понеділок_вівторок_середа_четвер_п’ятниця_субота".split("_"),accusative:"неділю_понеділок_вівторок_середу_четвер_п’ятницю_суботу".split("_"),genitive:"неділі_понеділка_вівторка_середи_четверга_п’ятниці_суботи".split("_")},d=/(\[[ВвУу]\]) ?dddd/.test(b)?"accusative":/\[?(?:минулої|наступної)? ?\] ?dddd/.test(b)?"genitive":"nominative";return c[d][a.day()]}function f(a){return function(){return a+"о"+(11===this.hours()?"б":"")+"] LT"}}return a.defineLocale("uk",{months:d,monthsShort:"січ_лют_бер_квіт_трав_черв_лип_серп_вер_жовт_лист_груд".split("_"),weekdays:e,weekdaysShort:"нд_пн_вт_ср_чт_пт_сб".split("_"),weekdaysMin:"нд_пн_вт_ср_чт_пт_сб".split("_"),longDateFormat:{LT:"HH:mm",L:"DD.MM.YYYY",LL:"D MMMM YYYY р.",LLL:"D MMMM YYYY р., LT",LLLL:"dddd, D MMMM YYYY р., LT"},calendar:{sameDay:f("[Сьогодні "),nextDay:f("[Завтра "),lastDay:f("[Вчора "),nextWeek:f("[У] dddd ["),lastWeek:function(){switch(this.day()){case 0:case 3:case 5:case 6:return f("[Минулої] dddd [").call(this);case 1:case 2:case 4:return f("[Минулого] dddd [").call(this)}},sameElse:"L"},relativeTime:{future:"за %s",past:"%s тому",s:"декілька секунд",m:c,mm:c,h:"годину",hh:c,d:"день",dd:c,M:"місяць",MM:c,y:"рік",yy:c},meridiem:function(a){return 4>a?"ночі":12>a?"ранку":17>a?"дня":"вечора"},ordinal:function(a,b){switch(b){case"M":case"d":case"DDD":case"w":case"W":return a+"-й";case"D":return a+"-го";default:return a}},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("uz",{months:"январь_февраль_март_апрель_май_июнь_июль_август_сентябрь_октябрь_ноябрь_декабрь".split("_"),monthsShort:"янв_фев_мар_апр_май_июн_июл_авг_сен_окт_ноя_дек".split("_"),weekdays:"Якшанба_Душанба_Сешанба_Чоршанба_Пайшанба_Жума_Шанба".split("_"),weekdaysShort:"Якш_Душ_Сеш_Чор_Пай_Жум_Шан".split("_"),weekdaysMin:"Як_Ду_Се_Чо_Па_Жу_Ша".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"D MMMM YYYY, dddd LT"},calendar:{sameDay:"[Бугун соат] LT [да]",nextDay:"[Эртага] LT [да]",nextWeek:"dddd [куни соат] LT [да]",lastDay:"[Кеча соат] LT [да]",lastWeek:"[Утган] dddd [куни соат] LT [да]",sameElse:"L"},relativeTime:{future:"Якин %s ичида",past:"Бир неча %s олдин",s:"фурсат",m:"бир дакика",mm:"%d дакика",h:"бир соат",hh:"%d соат",d:"бир кун",dd:"%d кун",M:"бир ой",MM:"%d ой",y:"бир йил",yy:"%d йил"},week:{dow:1,doy:7}})}),function(a){a(tb)}(function(a){return a.defineLocale("vi",{months:"tháng 1_tháng 2_tháng 3_tháng 4_tháng 5_tháng 6_tháng 7_tháng 8_tháng 9_tháng 10_tháng 11_tháng 12".split("_"),monthsShort:"Th01_Th02_Th03_Th04_Th05_Th06_Th07_Th08_Th09_Th10_Th11_Th12".split("_"),weekdays:"chủ nhật_thứ hai_thứ ba_thứ tư_thứ năm_thứ sáu_thứ bảy".split("_"),weekdaysShort:"CN_T2_T3_T4_T5_T6_T7".split("_"),weekdaysMin:"CN_T2_T3_T4_T5_T6_T7".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM [năm] YYYY",LLL:"D MMMM [năm] YYYY LT",LLLL:"dddd, D MMMM [năm] YYYY LT",l:"DD/M/YYYY",ll:"D MMM YYYY",lll:"D MMM YYYY LT",llll:"ddd, D MMM YYYY LT"},calendar:{sameDay:"[Hôm nay lúc] LT",nextDay:"[Ngày mai lúc] LT",nextWeek:"dddd [tuần tới lúc] LT",lastDay:"[Hôm qua lúc] LT",lastWeek:"dddd [tuần rồi lúc] LT",sameElse:"L"},relativeTime:{future:"%s tới",past:"%s trước",s:"vài giây",m:"một phút",mm:"%d phút",h:"một giờ",hh:"%d giờ",d:"một ngày",dd:"%d ngày",M:"một tháng",MM:"%d tháng",y:"một năm",yy:"%d năm"},ordinal:function(a){return a},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("zh-cn",{months:"一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月".split("_"),monthsShort:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),weekdays:"星期日_星期一_星期二_星期三_星期四_星期五_星期六".split("_"),weekdaysShort:"周日_周一_周二_周三_周四_周五_周六".split("_"),weekdaysMin:"日_一_二_三_四_五_六".split("_"),longDateFormat:{LT:"Ah点mm",L:"YYYY-MM-DD",LL:"YYYY年MMMD日",LLL:"YYYY年MMMD日LT",LLLL:"YYYY年MMMD日ddddLT",l:"YYYY-MM-DD",ll:"YYYY年MMMD日",lll:"YYYY年MMMD日LT",llll:"YYYY年MMMD日ddddLT"},meridiem:function(a,b){var c=100*a+b;
return 600>c?"凌晨":900>c?"早上":1130>c?"上午":1230>c?"中午":1800>c?"下午":"晚上"},calendar:{sameDay:function(){return 0===this.minutes()?"[今天]Ah[点整]":"[今天]LT"},nextDay:function(){return 0===this.minutes()?"[明天]Ah[点整]":"[明天]LT"},lastDay:function(){return 0===this.minutes()?"[昨天]Ah[点整]":"[昨天]LT"},nextWeek:function(){var b,c;return b=a().startOf("week"),c=this.unix()-b.unix()>=604800?"[下]":"[本]",0===this.minutes()?c+"dddAh点整":c+"dddAh点mm"},lastWeek:function(){var b,c;return b=a().startOf("week"),c=this.unix()<b.unix()?"[上]":"[本]",0===this.minutes()?c+"dddAh点整":c+"dddAh点mm"},sameElse:"LL"},ordinal:function(a,b){switch(b){case"d":case"D":case"DDD":return a+"日";case"M":return a+"月";case"w":case"W":return a+"周";default:return a}},relativeTime:{future:"%s内",past:"%s前",s:"几秒",m:"1分钟",mm:"%d分钟",h:"1小时",hh:"%d小时",d:"1天",dd:"%d天",M:"1个月",MM:"%d个月",y:"1年",yy:"%d年"},week:{dow:1,doy:4}})}),function(a){a(tb)}(function(a){return a.defineLocale("zh-tw",{months:"一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月".split("_"),monthsShort:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),weekdays:"星期日_星期一_星期二_星期三_星期四_星期五_星期六".split("_"),weekdaysShort:"週日_週一_週二_週三_週四_週五_週六".split("_"),weekdaysMin:"日_一_二_三_四_五_六".split("_"),longDateFormat:{LT:"Ah點mm",L:"YYYY年MMMD日",LL:"YYYY年MMMD日",LLL:"YYYY年MMMD日LT",LLLL:"YYYY年MMMD日ddddLT",l:"YYYY年MMMD日",ll:"YYYY年MMMD日",lll:"YYYY年MMMD日LT",llll:"YYYY年MMMD日ddddLT"},meridiem:function(a,b){var c=100*a+b;return 900>c?"早上":1130>c?"上午":1230>c?"中午":1800>c?"下午":"晚上"},calendar:{sameDay:"[今天]LT",nextDay:"[明天]LT",nextWeek:"[下]ddddLT",lastDay:"[昨天]LT",lastWeek:"[上]ddddLT",sameElse:"L"},ordinal:function(a,b){switch(b){case"d":case"D":case"DDD":return a+"日";case"M":return a+"月";case"w":case"W":return a+"週";default:return a}},relativeTime:{future:"%s內",past:"%s前",s:"幾秒",m:"一分鐘",mm:"%d分鐘",h:"一小時",hh:"%d小時",d:"一天",dd:"%d天",M:"一個月",MM:"%d個月",y:"一年",yy:"%d年"}})}),tb.locale("en"),Jb?module.exports=tb:"function"==typeof define&&define.amd?(define("moment",function(a,b,c){return c.config&&c.config()&&c.config().noGlobal===!0&&(xb.moment=ub),tb}),sb(!0)):sb()}).call(this);
/*!
 * Bootstrap v3.3.4 (http://getbootstrap.com)
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */

if (typeof jQuery === 'undefined') {
    throw new Error('Bootstrap\'s JavaScript requires jQuery')
}

+function ($) {
    'use strict';
    var version = $.fn.jquery.split(' ')[0].split('.')
    if ((version[0] < 2 && version[1] < 9) || (version[0] == 1 && version[1] == 9 && version[2] < 1)) {
        throw new Error('Bootstrap\'s JavaScript requires jQuery version 1.9.1 or higher')
    }
}(jQuery);

/* ========================================================================
 * Bootstrap: transition.js v3.3.4
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // CSS TRANSITION SUPPORT (Shoutout: http://www.js.modernizr.com/)
    // ============================================================

    function transitionEnd() {
        var el = document.createElement('bootstrap')

        var transEndEventNames = {
            WebkitTransition : 'webkitTransitionEnd',
            MozTransition    : 'transitionend',
            OTransition      : 'oTransitionEnd otransitionend',
            transition       : 'transitionend'
        }

        for (var name in transEndEventNames) {
            if (el.style[name] !== undefined) {
                return { end: transEndEventNames[name] }
            }
        }

        return false // explicit for ie8 (  ._.)
    }

    // http://blog.alexmaccaw.com/css-transitions
    $.fn.emulateTransitionEnd = function (duration) {
        var called = false
        var $el = this
        $(this).one('bsTransitionEnd', function () { called = true })
        var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
        setTimeout(callback, duration)
        return this
    }

    $(function () {
        $.support.transition = transitionEnd()

        if (!$.support.transition) return

        $.event.special.bsTransitionEnd = {
            bindType: $.support.transition.end,
            delegateType: $.support.transition.end,
            handle: function (e) {
                if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
            }
        }
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: alert.js v3.3.4
 * http://getbootstrap.com/javascript/#alerts
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // ALERT CLASS DEFINITION
    // ======================

    var dismiss = '[data-dismiss="alert"]'
    var Alert   = function (el) {
        $(el).on('click', dismiss, this.close)
    }

    Alert.VERSION = '3.3.4'

    Alert.TRANSITION_DURATION = 150

    Alert.prototype.close = function (e) {
        var $this    = $(this)
        var selector = $this.attr('data-target')

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
        }

        var $parent = $(selector)

        if (e) e.preventDefault()

        if (!$parent.length) {
            $parent = $this.closest('.alert')
        }

        $parent.trigger(e = $.Event('close.bs.alert'))

        if (e.isDefaultPrevented()) return

        $parent.removeClass('in')

        function removeElement() {
            // detach from parent, fire event then clean up data
            $parent.detach().trigger('closed.bs.alert').remove()
        }

        $.support.transition && $parent.hasClass('fade') ?
            $parent
                .one('bsTransitionEnd', removeElement)
                .emulateTransitionEnd(Alert.TRANSITION_DURATION) :
            removeElement()
    }


    // ALERT PLUGIN DEFINITION
    // =======================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data  = $this.data('bs.alert')

            if (!data) $this.data('bs.alert', (data = new Alert(this)))
            if (typeof option == 'string') data[option].call($this)
        })
    }

    var old = $.fn.alert

    $.fn.alert             = Plugin
    $.fn.alert.Constructor = Alert


    // ALERT NO CONFLICT
    // =================

    $.fn.alert.noConflict = function () {
        $.fn.alert = old
        return this
    }


    // ALERT DATA-API
    // ==============

    $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close)

}(jQuery);

/* ========================================================================
 * Bootstrap: button.js v3.3.4
 * http://getbootstrap.com/javascript/#buttons
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // BUTTON PUBLIC CLASS DEFINITION
    // ==============================

    var Button = function (element, options) {
        this.$element  = $(element)
        this.options   = $.extend({}, Button.DEFAULTS, options)
        this.isLoading = false
    }

    Button.VERSION  = '3.3.4'

    Button.DEFAULTS = {
        loadingText: 'loading...'
    }

    Button.prototype.setState = function (state) {
        var d    = 'disabled'
        var $el  = this.$element
        var val  = $el.is('input') ? 'val' : 'html'
        var data = $el.data()

        state = state + 'Text'

        if (data.resetText == null) $el.data('resetText', $el[val]())

        // push to event loop to allow forms to submit
        setTimeout($.proxy(function () {
            $el[val](data[state] == null ? this.options[state] : data[state])

            if (state == 'loadingText') {
                this.isLoading = true
                $el.addClass(d).attr(d, d)
            } else if (this.isLoading) {
                this.isLoading = false
                $el.removeClass(d).removeAttr(d)
            }
        }, this), 0)
    }

    Button.prototype.toggle = function () {
        var changed = true
        var $parent = this.$element.closest('[data-toggle="buttons"]')

        if ($parent.length) {
            var $input = this.$element.find('input')
            if ($input.prop('type') == 'radio') {
                if ($input.prop('checked') && this.$element.hasClass('active')) changed = false
                else $parent.find('.active').removeClass('active')
            }
            if (changed) $input.prop('checked', !this.$element.hasClass('active')).trigger('change')
        } else {
            this.$element.attr('aria-pressed', !this.$element.hasClass('active'))
        }

        if (changed) this.$element.toggleClass('active')
    }


    // BUTTON PLUGIN DEFINITION
    // ========================

    function Plugin(option) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.button')
            var options = typeof option == 'object' && option

            if (!data) $this.data('bs.button', (data = new Button(this, options)))

            if (option == 'toggle') data.toggle()
            else if (option) data.setState(option)
        })
    }

    var old = $.fn.button

    $.fn.button             = Plugin
    $.fn.button.Constructor = Button


    // BUTTON NO CONFLICT
    // ==================

    $.fn.button.noConflict = function () {
        $.fn.button = old
        return this
    }


    // BUTTON DATA-API
    // ===============

    $(document)
        .on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
            var $btn = $(e.target)
            if (!$btn.hasClass('btn')) $btn = $btn.closest('.btn')
            Plugin.call($btn, 'toggle')
            e.preventDefault()
        })
        .on('focus.bs.button.data-api blur.bs.button.data-api', '[data-toggle^="button"]', function (e) {
            $(e.target).closest('.btn').toggleClass('focus', /^focus(in)?$/.test(e.type))
        })

}(jQuery);

/* ========================================================================
 * Bootstrap: carousel.js v3.3.4
 * http://getbootstrap.com/javascript/#carousel
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // CAROUSEL CLASS DEFINITION
    // =========================

    var Carousel = function (element, options) {
        this.$element    = $(element)
        this.$indicators = this.$element.find('.carousel-indicators')
        this.options     = options
        this.paused      = null
        this.sliding     = null
        this.interval    = null
        this.$active     = null
        this.$items      = null

        this.options.keyboard && this.$element.on('keydown.bs.carousel', $.proxy(this.keydown, this))

        this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element
            .on('mouseenter.bs.carousel', $.proxy(this.pause, this))
            .on('mouseleave.bs.carousel', $.proxy(this.cycle, this))
    }

    Carousel.VERSION  = '3.3.4'

    Carousel.TRANSITION_DURATION = 600

    Carousel.DEFAULTS = {
        interval: 5000,
        pause: 'hover',
        wrap: true,
        keyboard: true
    }

    Carousel.prototype.keydown = function (e) {
        if (/input|textarea/i.test(e.target.tagName)) return
        switch (e.which) {
            case 37: this.prev(); break
            case 39: this.next(); break
            default: return
        }

        e.preventDefault()
    }

    Carousel.prototype.cycle = function (e) {
        e || (this.paused = false)

        this.interval && clearInterval(this.interval)

        this.options.interval
        && !this.paused
        && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

        return this
    }

    Carousel.prototype.getItemIndex = function (item) {
        this.$items = item.parent().children('.item')
        return this.$items.index(item || this.$active)
    }

    Carousel.prototype.getItemForDirection = function (direction, active) {
        var activeIndex = this.getItemIndex(active)
        var willWrap = (direction == 'prev' && activeIndex === 0)
            || (direction == 'next' && activeIndex == (this.$items.length - 1))
        if (willWrap && !this.options.wrap) return active
        var delta = direction == 'prev' ? -1 : 1
        var itemIndex = (activeIndex + delta) % this.$items.length
        return this.$items.eq(itemIndex)
    }

    Carousel.prototype.to = function (pos) {
        var that        = this
        var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'))

        if (pos > (this.$items.length - 1) || pos < 0) return

        if (this.sliding)       return this.$element.one('slid.bs.carousel', function () { that.to(pos) }) // yes, "slid"
        if (activeIndex == pos) return this.pause().cycle()

        return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items.eq(pos))
    }

    Carousel.prototype.pause = function (e) {
        e || (this.paused = true)

        if (this.$element.find('.next, .prev').length && $.support.transition) {
            this.$element.trigger($.support.transition.end)
            this.cycle(true)
        }

        this.interval = clearInterval(this.interval)

        return this
    }

    Carousel.prototype.next = function () {
        if (this.sliding) return
        return this.slide('next')
    }

    Carousel.prototype.prev = function () {
        if (this.sliding) return
        return this.slide('prev')
    }

    Carousel.prototype.slide = function (type, next) {
        var $active   = this.$element.find('.item.active')
        var $next     = next || this.getItemForDirection(type, $active)
        var isCycling = this.interval
        var direction = type == 'next' ? 'left' : 'right'
        var that      = this

        if ($next.hasClass('active')) return (this.sliding = false)

        var relatedTarget = $next[0]
        var slideEvent = $.Event('slide.bs.carousel', {
            relatedTarget: relatedTarget,
            direction: direction
        })
        this.$element.trigger(slideEvent)
        if (slideEvent.isDefaultPrevented()) return

        this.sliding = true

        isCycling && this.pause()

        if (this.$indicators.length) {
            this.$indicators.find('.active').removeClass('active')
            var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)])
            $nextIndicator && $nextIndicator.addClass('active')
        }

        var slidEvent = $.Event('slid.bs.carousel', { relatedTarget: relatedTarget, direction: direction }) // yes, "slid"
        if ($.support.transition && this.$element.hasClass('slide')) {
            $next.addClass(type)
            $next[0].offsetWidth // force reflow
            $active.addClass(direction)
            $next.addClass(direction)
            $active
                .one('bsTransitionEnd', function () {
                    $next.removeClass([type, direction].join(' ')).addClass('active')
                    $active.removeClass(['active', direction].join(' '))
                    that.sliding = false
                    setTimeout(function () {
                        that.$element.trigger(slidEvent)
                    }, 0)
                })
                .emulateTransitionEnd(Carousel.TRANSITION_DURATION)
        } else {
            $active.removeClass('active')
            $next.addClass('active')
            this.sliding = false
            this.$element.trigger(slidEvent)
        }

        isCycling && this.cycle()

        return this
    }


    // CAROUSEL PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.carousel')
            var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
            var action  = typeof option == 'string' ? option : options.slide

            if (!data) $this.data('bs.carousel', (data = new Carousel(this, options)))
            if (typeof option == 'number') data.to(option)
            else if (action) data[action]()
            else if (options.interval) data.pause().cycle()
        })
    }

    var old = $.fn.carousel

    $.fn.carousel             = Plugin
    $.fn.carousel.Constructor = Carousel


    // CAROUSEL NO CONFLICT
    // ====================

    $.fn.carousel.noConflict = function () {
        $.fn.carousel = old
        return this
    }


    // CAROUSEL DATA-API
    // =================

    var clickHandler = function (e) {
        var href
        var $this   = $(this)
        var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7
        if (!$target.hasClass('carousel')) return
        var options = $.extend({}, $target.data(), $this.data())
        var slideIndex = $this.attr('data-slide-to')
        if (slideIndex) options.interval = false

        Plugin.call($target, options)

        if (slideIndex) {
            $target.data('bs.carousel').to(slideIndex)
        }

        e.preventDefault()
    }

    $(document)
        .on('click.bs.carousel.data-api', '[data-slide]', clickHandler)
        .on('click.bs.carousel.data-api', '[data-slide-to]', clickHandler)

    $(window).on('load', function () {
        $('[data-ride="carousel"]').each(function () {
            var $carousel = $(this)
            Plugin.call($carousel, $carousel.data())
        })
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: collapse.js v3.3.4
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // COLLAPSE PUBLIC CLASS DEFINITION
    // ================================

    var Collapse = function (element, options) {
        this.$element      = $(element)
        this.options       = $.extend({}, Collapse.DEFAULTS, options)
        this.$trigger      = $('[data-toggle="collapse"][href="#' + element.id + '"],' +
            '[data-toggle="collapse"][data-target="#' + element.id + '"]')
        this.transitioning = null

        if (this.options.parent) {
            this.$parent = this.getParent()
        } else {
            this.addAriaAndCollapsedClass(this.$element, this.$trigger)
        }

        if (this.options.toggle) this.toggle()
    }

    Collapse.VERSION  = '3.3.4'

    Collapse.TRANSITION_DURATION = 350

    Collapse.DEFAULTS = {
        toggle: true
    }

    Collapse.prototype.dimension = function () {
        var hasWidth = this.$element.hasClass('width')
        return hasWidth ? 'width' : 'height'
    }

    Collapse.prototype.show = function () {
        if (this.transitioning || this.$element.hasClass('in')) return

        var activesData
        var actives = this.$parent && this.$parent.children('.panel').children('.in, .collapsing')

        if (actives && actives.length) {
            activesData = actives.data('bs.collapse')
            if (activesData && activesData.transitioning) return
        }

        var startEvent = $.Event('show.bs.collapse')
        this.$element.trigger(startEvent)
        if (startEvent.isDefaultPrevented()) return

        if (actives && actives.length) {
            Plugin.call(actives, 'hide')
            activesData || actives.data('bs.collapse', null)
        }

        var dimension = this.dimension()

        this.$element
            .removeClass('collapse')
            .addClass('collapsing')[dimension](0)
            .attr('aria-expanded', true)

        this.$trigger
            .removeClass('collapsed')
            .attr('aria-expanded', true)

        this.transitioning = 1

        var complete = function () {
            this.$element
                .removeClass('collapsing')
                .addClass('collapse in')[dimension]('')
            this.transitioning = 0
            this.$element
                .trigger('shown.bs.collapse')
        }

        if (!$.support.transition) return complete.call(this)

        var scrollSize = $.camelCase(['scroll', dimension].join('-'))

        this.$element
            .one('bsTransitionEnd', $.proxy(complete, this))
            .emulateTransitionEnd(Collapse.TRANSITION_DURATION)[dimension](this.$element[0][scrollSize])
    }

    Collapse.prototype.hide = function () {
        if (this.transitioning || !this.$element.hasClass('in')) return

        var startEvent = $.Event('hide.bs.collapse')
        this.$element.trigger(startEvent)
        if (startEvent.isDefaultPrevented()) return

        var dimension = this.dimension()

        this.$element[dimension](this.$element[dimension]())[0].offsetHeight

        this.$element
            .addClass('collapsing')
            .removeClass('collapse in')
            .attr('aria-expanded', false)

        this.$trigger
            .addClass('collapsed')
            .attr('aria-expanded', false)

        this.transitioning = 1

        var complete = function () {
            this.transitioning = 0
            this.$element
                .removeClass('collapsing')
                .addClass('collapse')
                .trigger('hidden.bs.collapse')
        }

        if (!$.support.transition) return complete.call(this)

        this.$element
            [dimension](0)
            .one('bsTransitionEnd', $.proxy(complete, this))
            .emulateTransitionEnd(Collapse.TRANSITION_DURATION)
    }

    Collapse.prototype.toggle = function () {
        this[this.$element.hasClass('in') ? 'hide' : 'show']()
    }

    Collapse.prototype.getParent = function () {
        return $(this.options.parent)
            .find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]')
            .each($.proxy(function (i, element) {
                var $element = $(element)
                this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element)
            }, this))
            .end()
    }

    Collapse.prototype.addAriaAndCollapsedClass = function ($element, $trigger) {
        var isOpen = $element.hasClass('in')

        $element.attr('aria-expanded', isOpen)
        $trigger
            .toggleClass('collapsed', !isOpen)
            .attr('aria-expanded', isOpen)
    }

    function getTargetFromTrigger($trigger) {
        var href
        var target = $trigger.attr('data-target')
            || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7

        return $(target)
    }


    // COLLAPSE PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.collapse')
            var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) $this.data('bs.collapse', (data = new Collapse(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    var old = $.fn.collapse

    $.fn.collapse             = Plugin
    $.fn.collapse.Constructor = Collapse


    // COLLAPSE NO CONFLICT
    // ====================

    $.fn.collapse.noConflict = function () {
        $.fn.collapse = old
        return this
    }


    // COLLAPSE DATA-API
    // =================

    $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
        var $this   = $(this)

        if (!$this.attr('data-target')) e.preventDefault()

        var $target = getTargetFromTrigger($this)
        var data    = $target.data('bs.collapse')
        var option  = data ? 'toggle' : $this.data()

        Plugin.call($target, option)
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: dropdown.js v3.3.4
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // DROPDOWN CLASS DEFINITION
    // =========================

    var backdrop = '.dropdown-backdrop'
    var toggle   = '[data-toggle="dropdown"]'
    var Dropdown = function (element) {
        $(element).on('click.bs.dropdown', this.toggle)
    }

    Dropdown.VERSION = '3.3.4'

    Dropdown.prototype.toggle = function (e) {
        var $this = $(this)

        if ($this.is('.disabled, :disabled')) return

        var $parent  = getParent($this)
        var isActive = $parent.hasClass('open')

        clearMenus()

        if (!isActive) {
            if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
                // if mobile we use a backdrop because click events don't delegate
                $('<div class="dropdown-backdrop"/>').insertAfter($(this)).on('click', clearMenus)
            }

            var relatedTarget = { relatedTarget: this }
            $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))

            if (e.isDefaultPrevented()) return

            $this
                .trigger('focus')
                .attr('aria-expanded', 'true')

            $parent
                .toggleClass('open')
                .trigger('shown.bs.dropdown', relatedTarget)
        }

        return false
    }

    Dropdown.prototype.keydown = function (e) {
        if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return

        var $this = $(this)

        e.preventDefault()
        e.stopPropagation()

        if ($this.is('.disabled, :disabled')) return

        var $parent  = getParent($this)
        var isActive = $parent.hasClass('open')

        if ((!isActive && e.which != 27) || (isActive && e.which == 27)) {
            if (e.which == 27) $parent.find(toggle).trigger('focus')
            return $this.trigger('click')
        }

        var desc = ' li:not(.disabled):visible a'
        var $items = $parent.find('[role="menu"]' + desc + ', [role="listbox"]' + desc)

        if (!$items.length) return

        var index = $items.index(e.target)

        if (e.which == 38 && index > 0)                 index--                        // up
        if (e.which == 40 && index < $items.length - 1) index++                        // down
        if (!~index)                                      index = 0

        $items.eq(index).trigger('focus')
    }

    function clearMenus(e) {
        if (e && e.which === 3) return
        $(backdrop).remove()
        $(toggle).each(function () {
            var $this         = $(this)
            var $parent       = getParent($this)
            var relatedTarget = { relatedTarget: this }

            if (!$parent.hasClass('open')) return

            $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))

            if (e.isDefaultPrevented()) return

            $this.attr('aria-expanded', 'false')
            $parent.removeClass('open').trigger('hidden.bs.dropdown', relatedTarget)
        })
    }

    function getParent($this) {
        var selector = $this.attr('data-target')

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
        }

        var $parent = selector && $(selector)

        return $parent && $parent.length ? $parent : $this.parent()
    }


    // DROPDOWN PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data  = $this.data('bs.dropdown')

            if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
            if (typeof option == 'string') data[option].call($this)
        })
    }

    var old = $.fn.dropdown

    $.fn.dropdown             = Plugin
    $.fn.dropdown.Constructor = Dropdown


    // DROPDOWN NO CONFLICT
    // ====================

    $.fn.dropdown.noConflict = function () {
        $.fn.dropdown = old
        return this
    }


    // APPLY TO STANDARD DROPDOWN ELEMENTS
    // ===================================

    $(document)
        .on('click.bs.dropdown.data-api', clearMenus)
        .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
        .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
        .on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown)
        .on('keydown.bs.dropdown.data-api', '[role="menu"]', Dropdown.prototype.keydown)
        .on('keydown.bs.dropdown.data-api', '[role="listbox"]', Dropdown.prototype.keydown)

}(jQuery);

/* ========================================================================
 * Bootstrap: modal.js v3.3.4
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // MODAL CLASS DEFINITION
    // ======================

    var Modal = function (element, options) {
        this.options             = options
        this.$body               = $(document.body)
        this.$element            = $(element)
        this.$dialog             = this.$element.find('.modal-dialog')
        this.$backdrop           = null
        this.isShown             = null
        this.originalBodyPad     = null
        this.scrollbarWidth      = 0
        this.ignoreBackdropClick = false

        if (this.options.remote) {
            this.$element
                .find('.modal-content')
                .load(this.options.remote, $.proxy(function () {
                    this.$element.trigger('loaded.bs.modal')
                }, this))
        }
    }

    Modal.VERSION  = '3.3.4'

    Modal.TRANSITION_DURATION = 300
    Modal.BACKDROP_TRANSITION_DURATION = 150

    Modal.DEFAULTS = {
        backdrop: true,
        keyboard: true,
        show: true
    }

    Modal.prototype.toggle = function (_relatedTarget) {
        return this.isShown ? this.hide() : this.show(_relatedTarget)
    }

    Modal.prototype.show = function (_relatedTarget) {
        var that = this
        var e    = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

        this.$element.trigger(e)

        if (this.isShown || e.isDefaultPrevented()) return

        this.isShown = true

        this.checkScrollbar()
        this.setScrollbar()
        this.$body.addClass('modal-open')

        this.escape()
        this.resize()

        this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

        this.$dialog.on('mousedown.dismiss.bs.modal', function () {
            that.$element.one('mouseup.dismiss.bs.modal', function (e) {
                if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
            })
        })

        this.backdrop(function () {
            var transition = $.support.transition && that.$element.hasClass('fade')

            if (!that.$element.parent().length) {
                that.$element.appendTo(that.$body) // don't move modals dom position
            }

            that.$element
                .show()
                .scrollTop(0)

            that.adjustDialog()

            if (transition) {
                that.$element[0].offsetWidth // force reflow
            }

            that.$element
                .addClass('in')
                .attr('aria-hidden', false)
                .css('z-index','1050')
                .css('opacity','1')

            that.enforceFocus()

            var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

            transition ?
                that.$dialog // wait for modal to slide in
                    .one('bsTransitionEnd', function () {
                        that.$element.trigger('focus').trigger(e)
                    })
                    .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
                that.$element.trigger('focus').trigger(e)
        })
    }

    Modal.prototype.hide = function (e) {
        if (e) e.preventDefault()

        e = $.Event('hide.bs.modal')

        this.$element.trigger(e)

        if (!this.isShown || e.isDefaultPrevented()) return

        this.isShown = false

        this.escape()
        this.resize()

        $(document).off('focusin.bs.modal')

        this.$element
            .removeClass('in')
            .attr('aria-hidden', true)
            .off('click.dismiss.bs.modal')
            .off('mouseup.dismiss.bs.modal')
            .css('z-index','-1')
            .css('opacity','0')

        this.$dialog.off('mousedown.dismiss.bs.modal')

        $.support.transition && this.$element.hasClass('fade') ?
            this.$element
                .one('bsTransitionEnd', $.proxy(this.hideModal, this))
                .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
            this.hideModal()
    }

    Modal.prototype.enforceFocus = function () {
        $(document)
            .off('focusin.bs.modal') // guard against infinite focus loop
            .on('focusin.bs.modal', $.proxy(function (e) {
                if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
                    this.$element.trigger('focus')
                }
            }, this))
    }

    Modal.prototype.escape = function () {
        if (this.isShown && this.options.keyboard) {
            this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
                e.which == 27 && this.hide()
            }, this))
        } else if (!this.isShown) {
            this.$element.off('keydown.dismiss.bs.modal')
        }
    }

    Modal.prototype.resize = function () {
        if (this.isShown) {
            $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
        } else {
            $(window).off('resize.bs.modal')
        }
    }

    Modal.prototype.hideModal = function () {
        var that = this
        this.$element.hide()
        this.backdrop(function () {
            that.$body.removeClass('modal-open')
            that.resetAdjustments()
            that.resetScrollbar()
            that.$element.trigger('hidden.bs.modal')
        })
    }

    Modal.prototype.removeBackdrop = function () {
        this.$backdrop && this.$backdrop.remove()
        this.$backdrop = null
    }

    Modal.prototype.backdrop = function (callback) {
        var that = this
        var animate = this.$element.hasClass('fade') ? 'fade' : ''

        if (this.isShown && this.options.backdrop) {
            var doAnimate = $.support.transition && animate

            this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
                .appendTo(this.$body)

            this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
                if (this.ignoreBackdropClick) {
                    this.ignoreBackdropClick = false
                    return
                }
                if (e.target !== e.currentTarget) return
                this.options.backdrop == 'static'
                    ? this.$element[0].focus()
                    : this.hide()
            }, this))

            if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

            this.$backdrop.addClass('in')

            if (!callback) return

            doAnimate ?
                this.$backdrop
                    .one('bsTransitionEnd', callback)
                    .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
                callback()

        } else if (!this.isShown && this.$backdrop) {
            this.$backdrop.removeClass('in')

            var callbackRemove = function () {
                that.removeBackdrop()
                callback && callback()
            }
            $.support.transition && this.$element.hasClass('fade') ?
                this.$backdrop
                    .one('bsTransitionEnd', callbackRemove)
                    .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
                callbackRemove()

        } else if (callback) {
            callback()
        }
    }

    // these following methods are used to handle overflowing modals

    Modal.prototype.handleUpdate = function () {
        this.adjustDialog()
    }

    Modal.prototype.adjustDialog = function () {
        var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

        this.$element.css({
            paddingLeft:  !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
            paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
        })
    }

    Modal.prototype.resetAdjustments = function () {
        this.$element.css({
            paddingLeft: '',
            paddingRight: ''
        })
    }

    Modal.prototype.checkScrollbar = function () {
        var fullWindowWidth = window.innerWidth
        if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
            var documentElementRect = document.documentElement.getBoundingClientRect()
            fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
        }
        this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
        this.scrollbarWidth = this.measureScrollbar()
    }

    Modal.prototype.setScrollbar = function () {
        var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
        this.originalBodyPad = document.body.style.paddingRight || ''
        if (this.bodyIsOverflowing) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
    }

    Modal.prototype.resetScrollbar = function () {
        this.$body.css('padding-right', this.originalBodyPad)
    }

    Modal.prototype.measureScrollbar = function () { // thx walsh
        var scrollDiv = document.createElement('div')
        scrollDiv.className = 'modal-scrollbar-measure'
        this.$body.append(scrollDiv)
        var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
        this.$body[0].removeChild(scrollDiv)
        return scrollbarWidth
    }


    // MODAL PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.modal')
            var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
            if (typeof option == 'string') data[option](_relatedTarget)
            else if (options.show) data.show(_relatedTarget)
        })
    }

    var old = $.fn.modal

    $.fn.modal             = Plugin
    $.fn.modal.Constructor = Modal


    // MODAL NO CONFLICT
    // =================

    $.fn.modal.noConflict = function () {
        $.fn.modal = old
        return this
    }


    // MODAL DATA-API
    // ==============

    $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
        var $this   = $(this)
        var href    = $this.attr('href')
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
        var option  = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

        if ($this.is('a')) e.preventDefault()

        $target.one('show.bs.modal', function (showEvent) {
            if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
            $target.one('hidden.bs.modal', function () {
                $this.is(':visible') && $this.trigger('focus')
            })
        })
        Plugin.call($target, option, this)
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: tooltip.js v3.3.4
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // TOOLTIP PUBLIC CLASS DEFINITION
    // ===============================

    var Tooltip = function (element, options) {
        this.type       = null
        this.options    = null
        this.enabled    = null
        this.timeout    = null
        this.hoverState = null
        this.$element   = null

        this.init('tooltip', element, options)
    }

    Tooltip.VERSION  = '3.3.4'

    Tooltip.TRANSITION_DURATION = 150

    Tooltip.DEFAULTS = {
        animation: true,
        placement: 'top',
        selector: false,
        template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        trigger: 'hover focus',
        title: '',
        delay: 0,
        html: false,
        container: false,
        viewport: {
            selector: 'body',
            padding: 0
        }
    }

    Tooltip.prototype.init = function (type, element, options) {
        this.enabled   = true
        this.type      = type
        this.$element  = $(element)
        this.options   = this.getOptions(options)
        this.$viewport = this.options.viewport && $(this.options.viewport.selector || this.options.viewport)

        if (this.$element[0] instanceof document.constructor && !this.options.selector) {
            throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!')
        }

        var triggers = this.options.trigger.split(' ')

        for (var i = triggers.length; i--;) {
            var trigger = triggers[i]

            if (trigger == 'click') {
                this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
            } else if (trigger != 'manual') {
                var eventIn  = trigger == 'hover' ? 'mouseenter' : 'focusin'
                var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

                this.$element.on(eventIn  + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
                this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
            }
        }

        this.options.selector ?
            (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
            this.fixTitle()
    }

    Tooltip.prototype.getDefaults = function () {
        return Tooltip.DEFAULTS
    }

    Tooltip.prototype.getOptions = function (options) {
        options = $.extend({}, this.getDefaults(), this.$element.data(), options)

        if (options.delay && typeof options.delay == 'number') {
            options.delay = {
                show: options.delay,
                hide: options.delay
            }
        }

        return options
    }

    Tooltip.prototype.getDelegateOptions = function () {
        var options  = {}
        var defaults = this.getDefaults()

        this._options && $.each(this._options, function (key, value) {
            if (defaults[key] != value) options[key] = value
        })

        return options
    }

    Tooltip.prototype.enter = function (obj) {
        var self = obj instanceof this.constructor ?
            obj : $(obj.currentTarget).data('bs.' + this.type)

        if (self && self.$tip && self.$tip.is(':visible')) {
            self.hoverState = 'in'
            return
        }

        if (!self) {
            self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
            $(obj.currentTarget).data('bs.' + this.type, self)
        }

        clearTimeout(self.timeout)

        self.hoverState = 'in'

        if (!self.options.delay || !self.options.delay.show) return self.show()

        self.timeout = setTimeout(function () {
            if (self.hoverState == 'in') self.show()
        }, self.options.delay.show)
    }

    Tooltip.prototype.leave = function (obj) {
        var self = obj instanceof this.constructor ?
            obj : $(obj.currentTarget).data('bs.' + this.type)

        if (!self) {
            self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
            $(obj.currentTarget).data('bs.' + this.type, self)
        }

        clearTimeout(self.timeout)

        self.hoverState = 'out'

        if (!self.options.delay || !self.options.delay.hide) return self.hide()

        self.timeout = setTimeout(function () {
            if (self.hoverState == 'out') self.hide()
        }, self.options.delay.hide)
    }

    Tooltip.prototype.show = function () {
        var e = $.Event('show.bs.' + this.type)

        if (this.hasContent() && this.enabled) {
            this.$element.trigger(e)

            var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0])
            if (e.isDefaultPrevented() || !inDom) return
            var that = this

            var $tip = this.tip()

            var tipId = this.getUID(this.type)

            this.setContent()
            $tip.attr('id', tipId)
            this.$element.attr('aria-describedby', tipId)

            if (this.options.animation) $tip.addClass('fade')

            var placement = typeof this.options.placement == 'function' ?
                this.options.placement.call(this, $tip[0], this.$element[0]) :
                this.options.placement

            var autoToken = /\s?auto?\s?/i
            var autoPlace = autoToken.test(placement)
            if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

            $tip
                .detach()
                .css({ top: 0, left: 0, display: 'block' })
                .addClass(placement)
                .data('bs.' + this.type, this)

            this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)

            var pos          = this.getPosition()
            var actualWidth  = $tip[0].offsetWidth
            var actualHeight = $tip[0].offsetHeight

            if (autoPlace) {
                var orgPlacement = placement
                var $container   = this.options.container ? $(this.options.container) : this.$element.parent()
                var containerDim = this.getPosition($container)

                placement = placement == 'bottom' && pos.bottom + actualHeight > containerDim.bottom ? 'top'    :
                    placement == 'top'    && pos.top    - actualHeight < containerDim.top    ? 'bottom' :
                        placement == 'right'  && pos.right  + actualWidth  > containerDim.width  ? 'left'   :
                            placement == 'left'   && pos.left   - actualWidth  < containerDim.left   ? 'right'  :
                                placement

                $tip
                    .removeClass(orgPlacement)
                    .addClass(placement)
            }

            var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

            this.applyPlacement(calculatedOffset, placement)

            var complete = function () {
                var prevHoverState = that.hoverState
                that.$element.trigger('shown.bs.' + that.type)
                that.hoverState = null

                if (prevHoverState == 'out') that.leave(that)
            }

            $.support.transition && this.$tip.hasClass('fade') ?
                $tip
                    .one('bsTransitionEnd', complete)
                    .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
                complete()
        }
    }

    Tooltip.prototype.applyPlacement = function (offset, placement) {
        var $tip   = this.tip()
        var width  = $tip[0].offsetWidth
        var height = $tip[0].offsetHeight

        // manually read margins because getBoundingClientRect includes difference
        var marginTop = parseInt($tip.css('margin-top'), 10)
        var marginLeft = parseInt($tip.css('margin-left'), 10)

        // we must check for NaN for ie 8/9
        if (isNaN(marginTop))  marginTop  = 0
        if (isNaN(marginLeft)) marginLeft = 0

        offset.top  = offset.top  + marginTop
        offset.left = offset.left + marginLeft

        // $.fn.offset doesn't round pixel values
        // so we use setOffset directly with our own function B-0
        $.offset.setOffset($tip[0], $.extend({
            using: function (props) {
                $tip.css({
                    top: Math.round(props.top),
                    left: Math.round(props.left)
                })
            }
        }, offset), 0)

        $tip.addClass('in')

        // check to see if placing tip in new offset caused the tip to resize itself
        var actualWidth  = $tip[0].offsetWidth
        var actualHeight = $tip[0].offsetHeight

        if (placement == 'top' && actualHeight != height) {
            offset.top = offset.top + height - actualHeight
        }

        var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)

        if (delta.left) offset.left += delta.left
        else offset.top += delta.top

        var isVertical          = /top|bottom/.test(placement)
        var arrowDelta          = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
        var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight'

        $tip.offset(offset)
        this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical)
    }

    Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
        this.arrow()
            .css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
            .css(isVertical ? 'top' : 'left', '')
    }

    Tooltip.prototype.setContent = function () {
        var $tip  = this.tip()
        var title = this.getTitle()

        $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
        $tip.removeClass('fade in top bottom left right')
    }

    Tooltip.prototype.hide = function (callback) {
        var that = this
        var $tip = $(this.$tip)
        var e    = $.Event('hide.bs.' + this.type)

        function complete() {
            if (that.hoverState != 'in') $tip.detach()
            that.$element
                .removeAttr('aria-describedby')
                .trigger('hidden.bs.' + that.type)
            callback && callback()
        }

        this.$element.trigger(e)

        if (e.isDefaultPrevented()) return

        $tip.removeClass('in')

        $.support.transition && $tip.hasClass('fade') ?
            $tip
                .one('bsTransitionEnd', complete)
                .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
            complete()

        this.hoverState = null

        return this
    }

    Tooltip.prototype.fixTitle = function () {
        var $e = this.$element
        if ($e.attr('title') || typeof ($e.attr('data-original-title')) != 'string') {
            $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
        }
    }

    Tooltip.prototype.hasContent = function () {
        return this.getTitle()
    }

    Tooltip.prototype.getPosition = function ($element) {
        $element   = $element || this.$element

        var el     = $element[0]
        var isBody = el.tagName == 'BODY'

        var elRect    = el.getBoundingClientRect()
        if (elRect.width == null) {
            // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
            elRect = $.extend({}, elRect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top })
        }
        var elOffset  = isBody ? { top: 0, left: 0 } : $element.offset()
        var scroll    = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop() }
        var outerDims = isBody ? { width: $(window).width(), height: $(window).height() } : null

        return $.extend({}, elRect, scroll, outerDims, elOffset)
    }

    Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
        return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2 } :
            placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 } :
                placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
                    /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width }

    }

    Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
        var delta = { top: 0, left: 0 }
        if (!this.$viewport) return delta

        var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
        var viewportDimensions = this.getPosition(this.$viewport)

        if (/right|left/.test(placement)) {
            var topEdgeOffset    = pos.top - viewportPadding - viewportDimensions.scroll
            var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
            if (topEdgeOffset < viewportDimensions.top) { // top overflow
                delta.top = viewportDimensions.top - topEdgeOffset
            } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
                delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
            }
        } else {
            var leftEdgeOffset  = pos.left - viewportPadding
            var rightEdgeOffset = pos.left + viewportPadding + actualWidth
            if (leftEdgeOffset < viewportDimensions.left) { // left overflow
                delta.left = viewportDimensions.left - leftEdgeOffset
            } else if (rightEdgeOffset > viewportDimensions.width) { // right overflow
                delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
            }
        }

        return delta
    }

    Tooltip.prototype.getTitle = function () {
        var title
        var $e = this.$element
        var o  = this.options

        title = $e.attr('data-original-title')
            || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

        return title
    }

    Tooltip.prototype.getUID = function (prefix) {
        do prefix += ~~(Math.random() * 1000000)
        while (document.getElementById(prefix))
        return prefix
    }

    Tooltip.prototype.tip = function () {
        return (this.$tip = this.$tip || $(this.options.template))
    }

    Tooltip.prototype.arrow = function () {
        return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
    }

    Tooltip.prototype.enable = function () {
        this.enabled = true
    }

    Tooltip.prototype.disable = function () {
        this.enabled = false
    }

    Tooltip.prototype.toggleEnabled = function () {
        this.enabled = !this.enabled
    }

    Tooltip.prototype.toggle = function (e) {
        var self = this
        if (e) {
            self = $(e.currentTarget).data('bs.' + this.type)
            if (!self) {
                self = new this.constructor(e.currentTarget, this.getDelegateOptions())
                $(e.currentTarget).data('bs.' + this.type, self)
            }
        }

        self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
    }

    Tooltip.prototype.destroy = function () {
        var that = this
        clearTimeout(this.timeout)
        this.hide(function () {
            that.$element.off('.' + that.type).removeData('bs.' + that.type)
        })
    }


    // TOOLTIP PLUGIN DEFINITION
    // =========================

    function Plugin(option) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.tooltip')
            var options = typeof option == 'object' && option

            if (!data && /destroy|hide/.test(option)) return
            if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    var old = $.fn.tooltip

    $.fn.tooltip             = Plugin
    $.fn.tooltip.Constructor = Tooltip


    // TOOLTIP NO CONFLICT
    // ===================

    $.fn.tooltip.noConflict = function () {
        $.fn.tooltip = old
        return this
    }

}(jQuery);

/* ========================================================================
 * Bootstrap: popover.js v3.3.4
 * http://getbootstrap.com/javascript/#popovers
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // POPOVER PUBLIC CLASS DEFINITION
    // ===============================

    var Popover = function (element, options) {
        this.init('popover', element, options)
    }

    if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js')

    Popover.VERSION  = '3.3.4'

    Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
        placement: 'right',
        trigger: 'click',
        content: '',
        template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
    })


    // NOTE: POPOVER EXTENDS tooltip.js
    // ================================

    Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype)

    Popover.prototype.constructor = Popover

    Popover.prototype.getDefaults = function () {
        return Popover.DEFAULTS
    }

    Popover.prototype.setContent = function () {
        var $tip    = this.tip()
        var title   = this.getTitle()
        var content = this.getContent()

        $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
        $tip.find('.popover-content').children().detach().end()[ // we use append for html objects to maintain js events
            this.options.html ? (typeof content == 'string' ? 'html' : 'append') : 'text'
            ](content)

        $tip.removeClass('fade top bottom left right in')

        // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
        // this manually by checking the contents.
        if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
    }

    Popover.prototype.hasContent = function () {
        return this.getTitle() || this.getContent()
    }

    Popover.prototype.getContent = function () {
        var $e = this.$element
        var o  = this.options

        return $e.attr('data-content')
            || (typeof o.content == 'function' ?
                o.content.call($e[0]) :
                o.content)
    }

    Popover.prototype.arrow = function () {
        return (this.$arrow = this.$arrow || this.tip().find('.arrow'))
    }


    // POPOVER PLUGIN DEFINITION
    // =========================

    function Plugin(option) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.popover')
            var options = typeof option == 'object' && option

            if (!data && /destroy|hide/.test(option)) return
            if (!data) $this.data('bs.popover', (data = new Popover(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    var old = $.fn.popover

    $.fn.popover             = Plugin
    $.fn.popover.Constructor = Popover


    // POPOVER NO CONFLICT
    // ===================

    $.fn.popover.noConflict = function () {
        $.fn.popover = old
        return this
    }

}(jQuery);

/* ========================================================================
 * Bootstrap: scrollspy.js v3.3.4
 * http://getbootstrap.com/javascript/#scrollspy
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // SCROLLSPY CLASS DEFINITION
    // ==========================

    function ScrollSpy(element, options) {
        this.$body          = $(document.body)
        this.$scrollElement = $(element).is(document.body) ? $(window) : $(element)
        this.options        = $.extend({}, ScrollSpy.DEFAULTS, options)
        this.selector       = (this.options.target || '') + ' .nav li > a'
        this.offsets        = []
        this.targets        = []
        this.activeTarget   = null
        this.scrollHeight   = 0

        this.$scrollElement.on('scroll.bs.scrollspy', $.proxy(this.process, this))
        this.refresh()
        this.process()
    }

    ScrollSpy.VERSION  = '3.3.4'

    ScrollSpy.DEFAULTS = {
        offset: 10
    }

    ScrollSpy.prototype.getScrollHeight = function () {
        return this.$scrollElement[0].scrollHeight || Math.max(this.$body[0].scrollHeight, document.documentElement.scrollHeight)
    }

    ScrollSpy.prototype.refresh = function () {
        var that          = this
        var offsetMethod  = 'offset'
        var offsetBase    = 0

        this.offsets      = []
        this.targets      = []
        this.scrollHeight = this.getScrollHeight()

        if (!$.isWindow(this.$scrollElement[0])) {
            offsetMethod = 'position'
            offsetBase   = this.$scrollElement.scrollTop()
        }

        this.$body
            .find(this.selector)
            .map(function () {
                var $el   = $(this)
                var href  = $el.data('target') || $el.attr('href')
                var $href = /^#./.test(href) && $(href)

                return ($href
                    && $href.length
                    && $href.is(':visible')
                    && [[$href[offsetMethod]().top + offsetBase, href]]) || null
            })
            .sort(function (a, b) { return a[0] - b[0] })
            .each(function () {
                that.offsets.push(this[0])
                that.targets.push(this[1])
            })
    }

    ScrollSpy.prototype.process = function () {
        var scrollTop    = this.$scrollElement.scrollTop() + this.options.offset
        var scrollHeight = this.getScrollHeight()
        var maxScroll    = this.options.offset + scrollHeight - this.$scrollElement.height()
        var offsets      = this.offsets
        var targets      = this.targets
        var activeTarget = this.activeTarget
        var i

        if (this.scrollHeight != scrollHeight) {
            this.refresh()
        }

        if (scrollTop >= maxScroll) {
            return activeTarget != (i = targets[targets.length - 1]) && this.activate(i)
        }

        if (activeTarget && scrollTop < offsets[0]) {
            this.activeTarget = null
            return this.clear()
        }

        for (i = offsets.length; i--;) {
            activeTarget != targets[i]
            && scrollTop >= offsets[i]
            && (offsets[i + 1] === undefined || scrollTop < offsets[i + 1])
            && this.activate(targets[i])
        }
    }

    ScrollSpy.prototype.activate = function (target) {
        this.activeTarget = target

        this.clear()

        var selector = this.selector +
            '[data-target="' + target + '"],' +
            this.selector + '[href="' + target + '"]'

        var active = $(selector)
            .parents('li')
            .addClass('active')

        if (active.parent('.dropdown-menu').length) {
            active = active
                .closest('li.dropdown')
                .addClass('active')
        }

        active.trigger('activate.bs.scrollspy')
    }

    ScrollSpy.prototype.clear = function () {
        $(this.selector)
            .parentsUntil(this.options.target, '.active')
            .removeClass('active')
    }


    // SCROLLSPY PLUGIN DEFINITION
    // ===========================

    function Plugin(option) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.scrollspy')
            var options = typeof option == 'object' && option

            if (!data) $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    var old = $.fn.scrollspy

    $.fn.scrollspy             = Plugin
    $.fn.scrollspy.Constructor = ScrollSpy


    // SCROLLSPY NO CONFLICT
    // =====================

    $.fn.scrollspy.noConflict = function () {
        $.fn.scrollspy = old
        return this
    }


    // SCROLLSPY DATA-API
    // ==================

    $(window).on('load.bs.scrollspy.data-api', function () {
        $('[data-spy="scroll"]').each(function () {
            var $spy = $(this)
            Plugin.call($spy, $spy.data())
        })
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: tab.js v3.3.4
 * http://getbootstrap.com/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // TAB CLASS DEFINITION
    // ====================

    var Tab = function (element) {
        this.element = $(element)
    }

    Tab.VERSION = '3.3.4'

    Tab.TRANSITION_DURATION = 150

    Tab.prototype.show = function () {
        var $this    = this.element
        var $ul      = $this.closest('ul:not(.dropdown-menu)')
        var selector = $this.data('target')

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
        }

        if ($this.parent('li').hasClass('active')) return

        var $previous = $ul.find('.active:last a')
        var hideEvent = $.Event('hide.bs.tab', {
            relatedTarget: $this[0]
        })
        var showEvent = $.Event('show.bs.tab', {
            relatedTarget: $previous[0]
        })

        $previous.trigger(hideEvent)
        $this.trigger(showEvent)

        if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) return

        var $target = $(selector)

        this.activate($this.closest('li'), $ul)
        this.activate($target, $target.parent(), function () {
            $previous.trigger({
                type: 'hidden.bs.tab',
                relatedTarget: $this[0]
            })
            $this.trigger({
                type: 'shown.bs.tab',
                relatedTarget: $previous[0]
            })
        })
    }

    Tab.prototype.activate = function (element, container, callback) {
        var $active    = container.find('> .active')
        var transition = callback
            && $.support.transition
            && (($active.length && $active.hasClass('fade')) || !!container.find('> .fade').length)

        function next() {
            $active
                .removeClass('active')
                .find('> .dropdown-menu > .active')
                .removeClass('active')
                .end()
                .find('[data-toggle="tab"]')
                .attr('aria-expanded', false)

            element
                .addClass('active')
                .find('[data-toggle="tab"]')
                .attr('aria-expanded', true)

            if (transition) {
                element[0].offsetWidth // reflow for transition
                element.addClass('in')
            } else {
                element.removeClass('fade')
            }

            if (element.parent('.dropdown-menu').length) {
                element
                    .closest('li.dropdown')
                    .addClass('active')
                    .end()
                    .find('[data-toggle="tab"]')
                    .attr('aria-expanded', true)
            }

            callback && callback()
        }

        $active.length && transition ?
            $active
                .one('bsTransitionEnd', next)
                .emulateTransitionEnd(Tab.TRANSITION_DURATION) :
            next()

        $active.removeClass('in')
    }


    // TAB PLUGIN DEFINITION
    // =====================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data  = $this.data('bs.tab')

            if (!data) $this.data('bs.tab', (data = new Tab(this)))
            if (typeof option == 'string') data[option]()
        })
    }

    var old = $.fn.tab

    $.fn.tab             = Plugin
    $.fn.tab.Constructor = Tab


    // TAB NO CONFLICT
    // ===============

    $.fn.tab.noConflict = function () {
        $.fn.tab = old
        return this
    }


    // TAB DATA-API
    // ============

    var clickHandler = function (e) {
        e.preventDefault()
        Plugin.call($(this), 'show')
    }

    $(document)
        .on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler)
        .on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler)

}(jQuery);

/* ========================================================================
 * Bootstrap: affix.js v3.3.4
 * http://getbootstrap.com/javascript/#affix
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // AFFIX CLASS DEFINITION
    // ======================

    var Affix = function (element, options) {
        this.options = $.extend({}, Affix.DEFAULTS, options)

        this.$target = $(this.options.target)
            .on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this))
            .on('click.bs.affix.data-api',  $.proxy(this.checkPositionWithEventLoop, this))

        this.$element     = $(element)
        this.affixed      = null
        this.unpin        = null
        this.pinnedOffset = null

        this.checkPosition()
    }

    Affix.VERSION  = '3.3.4'

    Affix.RESET    = 'affix affix-top affix-bottom'

    Affix.DEFAULTS = {
        offset: 0,
        target: window
    }

    Affix.prototype.getState = function (scrollHeight, height, offsetTop, offsetBottom) {
        var scrollTop    = this.$target.scrollTop()
        var position     = this.$element.offset()
        var targetHeight = this.$target.height()

        if (offsetTop != null && this.affixed == 'top') return scrollTop < offsetTop ? 'top' : false

        if (this.affixed == 'bottom') {
            if (offsetTop != null) return (scrollTop + this.unpin <= position.top) ? false : 'bottom'
            return (scrollTop + targetHeight <= scrollHeight - offsetBottom) ? false : 'bottom'
        }

        var initializing   = this.affixed == null
        var colliderTop    = initializing ? scrollTop : position.top
        var colliderHeight = initializing ? targetHeight : height

        if (offsetTop != null && scrollTop <= offsetTop) return 'top'
        if (offsetBottom != null && (colliderTop + colliderHeight >= scrollHeight - offsetBottom)) return 'bottom'

        return false
    }

    Affix.prototype.getPinnedOffset = function () {
        if (this.pinnedOffset) return this.pinnedOffset
        this.$element.removeClass(Affix.RESET).addClass('affix')
        var scrollTop = this.$target.scrollTop()
        var position  = this.$element.offset()
        return (this.pinnedOffset = position.top - scrollTop)
    }

    Affix.prototype.checkPositionWithEventLoop = function () {
        setTimeout($.proxy(this.checkPosition, this), 1)
    }

    Affix.prototype.checkPosition = function () {
        if (!this.$element.is(':visible')) return

        var height       = this.$element.height()
        var offset       = this.options.offset
        var offsetTop    = offset.top
        var offsetBottom = offset.bottom
        var scrollHeight = $(document.body).height()

        if (typeof offset != 'object')         offsetBottom = offsetTop = offset
        if (typeof offsetTop == 'function')    offsetTop    = offset.top(this.$element)
        if (typeof offsetBottom == 'function') offsetBottom = offset.bottom(this.$element)

        var affix = this.getState(scrollHeight, height, offsetTop, offsetBottom)

        if (this.affixed != affix) {
            if (this.unpin != null) this.$element.css('top', '')

            var affixType = 'affix' + (affix ? '-' + affix : '')
            var e         = $.Event(affixType + '.bs.affix')

            this.$element.trigger(e)

            if (e.isDefaultPrevented()) return

            this.affixed = affix
            this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null

            this.$element
                .removeClass(Affix.RESET)
                .addClass(affixType)
                .trigger(affixType.replace('affix', 'affixed') + '.bs.affix')
        }

        if (affix == 'bottom') {
            this.$element.offset({
                top: scrollHeight - height - offsetBottom
            })
        }
    }


    // AFFIX PLUGIN DEFINITION
    // =======================

    function Plugin(option) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.affix')
            var options = typeof option == 'object' && option

            if (!data) $this.data('bs.affix', (data = new Affix(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    var old = $.fn.affix

    $.fn.affix             = Plugin
    $.fn.affix.Constructor = Affix


    // AFFIX NO CONFLICT
    // =================

    $.fn.affix.noConflict = function () {
        $.fn.affix = old
        return this
    }


    // AFFIX DATA-API
    // ==============

    $(window).on('load', function () {
        $('[data-spy="affix"]').each(function () {
            var $spy = $(this)
            var data = $spy.data()

            data.offset = data.offset || {}

            if (data.offsetBottom != null) data.offset.bottom = data.offsetBottom
            if (data.offsetTop    != null) data.offset.top    = data.offsetTop

            Plugin.call($spy, data)
        })
    })

}(jQuery);

/*
 *               ~ CLNDR v1.2.10 ~
 * ==============================================
 *       https://github.com/kylestetz/CLNDR
 * ==============================================
 *  created by kyle stetz (github.com/kylestetz)
 *        &available under the MIT license
 * http://opensource.org/licenses/mit-license.php
 * ==============================================
 *
 * This is the fully-commented development version of CLNDR.
 * For the production version, check out clndr.min.js
 * at https://github.com/kylestetz/CLNDR
 *
 * This work is based on the
 * jQuery lightweight plugin boilerplate
 * Original author: @ajpiano
 * Further changes, comments: @addyosmani
 * Licensed under the MIT license
 */

(function (factory) {

  if (typeof define === 'function' && define.amd) {

    // AMD. Register as an anonymous module.
    define(['jquery', 'moment'], factory);
  } else if (typeof exports === 'object') {

    // Node/CommonJS
    factory(require('jquery'), require('moment'));
  } else {

    // Browser globals
    factory(jQuery, moment);
  }

}(function ($, moment) {

  // This is the default calendar template. This can be overridden.
  var clndrTemplate = "<div class='clndr-controls'>" +
    "<div class='clndr-control-button'><span class='clndr-previous-button'>previous</span></div><div class='month'><%= month %> <%= year %></div><div class='clndr-control-button rightalign'><span class='clndr-next-button'>next</span></div>" +
    "</div>" +
  "<table class='clndr-table' border='0' cellspacing='0' cellpadding='0'>" +
    "<thead>" +
    "<tr class='header-days'>" +
    "<% for(var i = 0; i < daysOfTheWeek.length; i++) { %>" +
      "<td class='header-day'><%= daysOfTheWeek[i] %></td>" +
    "<% } %>" +
    "</tr>" +
    "</thead>" +
    "<tbody>" +
    "<% for(var i = 0; i < numberOfRows; i++){ %>" +
      "<tr>" +
      "<% for(var j = 0; j < 7; j++){ %>" +
      "<% var d = j + i * 7; %>" +
      "<td class='<%= days[d].classes %>'><div class='day-contents'><%= days[d].day %>" +
      "</div></td>" +
      "<% } %>" +
      "</tr>" +
    "<% } %>" +
    "</tbody>" +
  "</table>";

  var pluginName = 'clndr';

  var defaults = {
    template: clndrTemplate,
    weekOffset: 0,
    startWithMonth: null,
    clickEvents: {
      click: null,
      nextMonth: null,
      previousMonth: null,
      nextYear: null,
      previousYear: null,
      today: null,
      onMonthChange: null,
      onYearChange: null
    },
    targets: {
      nextButton: 'clndr-next-button',
      previousButton: 'clndr-previous-button',
      nextYearButton: 'clndr-next-year-button',
      previousYearButton: 'clndr-previous-year-button',
      todayButton: 'clndr-today-button',
      day: 'day',
      empty: 'empty'
    },
    classes: {
      today: "today",
      event: "event",
      past: "past",
      lastMonth: "last-month",
      nextMonth: "next-month",
      adjacentMonth: "adjacent-month",
      inactive: "inactive"
    },
    events: [],
    extras: null,
    dateParameter: 'date',
    multiDayEvents: null,
    doneRendering: null,
    render: null,
    daysOfTheWeek: null,
    showAdjacentMonths: true,
    adjacentDaysChangeMonth: false,
    ready: null,
    constraints: null,
    forceSixRows: null
  };

  // The actual plugin constructor
  function Clndr( element, options ) {
    this.element = element;

    // merge the default options with user-provided options
    this.options = $.extend(true, {}, defaults, options);

    // if there are events, we should run them through our addMomentObjectToEvents function
    // which will add a date object that we can use to make life easier. This is only necessary
    // when events are provided on instantiation, since our setEvents function uses addMomentObjectToEvents.
    if(this.options.events.length) {
      if(this.options.multiDayEvents) {
        this.options.events = this.addMultiDayMomentObjectsToEvents(this.options.events);
      } else {
        this.options.events = this.addMomentObjectToEvents(this.options.events);
      }
    }

    // this object will store a reference to the current month.
    // it's a moment object, which allows us to poke at it a little if we need to.
    // this will serve as the basis for switching between months & is the go-to
    // internally if we want to know which month we're currently at.
    if(this.options.startWithMonth) {
      this.month = moment(this.options.startWithMonth).startOf('month');
    } else {
      this.month = moment().startOf('month');
    }

    // if we've got constraints set, make sure the month is within them.
    if(this.options.constraints) {
      // first check if the start date exists & is later than now.
      if(this.options.constraints.startDate) {
        var startMoment = moment(this.options.constraints.startDate);
        if(this.month.isBefore(startMoment, 'month')) {
          this.month.set('month', startMoment.month());
          this.month.set('year', startMoment.year());
        }
      }
      // make sure the month (whether modified or not) is before the endDate
      if(this.options.constraints.endDate) {
        var endMoment = moment(this.options.constraints.endDate);
        if(this.month.isAfter(endMoment, 'month')) {
          this.month.set('month', endMoment.month()).set('year', endMoment.year());
        }
      }
    }

    this._defaults = defaults;
    this._name = pluginName;

    // Some first-time initialization -> day of the week offset,
    // template compiling, making and storing some elements we'll need later,
    // & event handling for the controller.
    this.init();
  }

  Clndr.prototype.init = function () {
    // create the days of the week using moment's current language setting
    this.daysOfTheWeek = this.options.daysOfTheWeek || [];
    if(!this.options.daysOfTheWeek) {
      this.daysOfTheWeek = [];
      for(var i = 0; i < 7; i++) {
        this.daysOfTheWeek.push( moment().weekday(i).format('dd').charAt(0) );
      }
    }
    // shuffle the week if there's an offset
    if(this.options.weekOffset) {
      this.daysOfTheWeek = this.shiftWeekdayLabels(this.options.weekOffset);
    }

    // quick & dirty test to make sure rendering is possible.
    if( !$.isFunction(this.options.render) ) {
      this.options.render = null;
      if (typeof _ === 'undefined') {
        throw new Error("Underscore was not found. Please include underscore.js OR provide a custom render function.");
      }
      else {
        // we're just going ahead and using underscore here if no render method has been supplied.
        this.compiledClndrTemplate = _.template(this.options.template);
      }
    }

    // create the parent element that will hold the plugin & save it for later
    $(this.element).html("<div class='clndr'></div>");
    this.calendarContainer = $('.clndr', this.element);

    // attach event handlers for clicks on buttons/cells
    this.bindEvents();

    // do a normal render of the calendar template
    this.render();

    // if a ready callback has been provided, call it.
    if(this.options.ready) {
      this.options.ready.apply(this, []);
    }
  };

  Clndr.prototype.shiftWeekdayLabels = function(offset) {
    var days = this.daysOfTheWeek;
    for(var i = 0; i < offset; i++) {
      days.push( days.shift() );
    }
    return days;
  };

  // This is where the magic happens. Given a moment object representing the current month,
  // an array of calendarDay objects is constructed that contains appropriate events and
  // classes depending on the circumstance.
  Clndr.prototype.createDaysObject = function(currentMonth) {
    // this array will hold numbers for the entire grid (even the blank spaces)
    var daysArray = [];
    var date = currentMonth.startOf('month');

    // filter the events list (if it exists) to events that are happening last month, this month and next month (within the current grid view)
    this.eventsLastMonth = [];
    this.eventsThisMonth = [];
    this.eventsNextMonth = [];

    if(this.options.events.length) {

      // MULTI-DAY EVENT PARSING
      // if we're using multi-day events, the start or end must be in the current month
      if(this.options.multiDayEvents) {
        this.eventsThisMonth = $(this.options.events).filter( function() {
//          return this._clndrStartDateObject.format("YYYY-MM") <= currentMonth.format("YYYY-MM")
//          || currentMonth.format("YYYY-MM") <= this._clndrEndDateObject.format("YYYY-MM");
            if ( this._clndrStartDateObject.format("YYYY-MM") === currentMonth.format("YYYY-MM")
                    || this._clndrEndDateObject.format("YYYY-MM") === currentMonth.format("YYYY-MM") ) {
                return true;
            }
            if ( this._clndrStartDateObject.format("YYYY-MM") <= currentMonth.format("YYYY-MM")
                    && this._clndrEndDateObject.format("YYYY-MM") >= currentMonth.format("YYYY-MM") ) {
                return true;
            }

            return false;
        }).toArray();

        if(this.options.showAdjacentMonths) {
          var lastMonth = currentMonth.clone().subtract(1, 'months');
          var nextMonth = currentMonth.clone().add(1, 'months');
          this.eventsLastMonth = $(this.options.events).filter( function() {
//            return this._clndrStartDateObject.format("YYYY-MM") <= lastMonth.format("YYYY-MM")
//          || lastMonth.format("YYYY-MM") <= this._clndrEndDateObject.format("YYYY-MM");
            if ( this._clndrStartDateObject.format("YYYY-MM") === lastMonth.format("YYYY-MM")
                    || this._clndrEndDateObject.format("YYYY-MM") === lastMonth.format("YYYY-MM") ) {
                return true;
            }
            if ( this._clndrStartDateObject.format("YYYY-MM") <= lastMonth.format("YYYY-MM")
                    && this._clndrEndDateObject.format("YYYY-MM") >= lastMonth.format("YYYY-MM") ) {
                return true;
            }

            return false;
          }).toArray();

          this.eventsNextMonth = $(this.options.events).filter( function() {
//            return this._clndrStartDateObject.format("YYYY-MM") <= nextMonth.format("YYYY-MM")
//          || nextMonth.format("YYYY-MM") <= this._clndrEndDateObject.format("YYYY-MM");
            if ( this._clndrStartDateObject.format("YYYY-MM") === nextMonth.format("YYYY-MM")
                    || this._clndrEndDateObject.format("YYYY-MM") === nextMonth.format("YYYY-MM") ) {
                return true;
            }
            if ( this._clndrStartDateObject.format("YYYY-MM") <= nextMonth.format("YYYY-MM")
                    && this._clndrEndDateObject.format("YYYY-MM") >= nextMonth.format("YYYY-MM") ) {
                return true;
            }

            return false;
          }).toArray();
        }
      }

      // SINGLE-DAY EVENT PARSING
      // if we're using single-day events, use _clndrDateObject
      else {
        this.eventsThisMonth = $(this.options.events).filter( function() {
          return this._clndrDateObject.format("YYYY-MM") == currentMonth.format("YYYY-MM");
        }).toArray();

        // filter the adjacent months as well, if the option is true
        if(this.options.showAdjacentMonths) {
          var lastMonth = currentMonth.clone().subtract(1, 'months');
          var nextMonth = currentMonth.clone().add(1, 'months');
          this.eventsLastMonth = $(this.options.events).filter( function() {
            return this._clndrDateObject.format("YYYY-MM") == lastMonth.format("YYYY-MM");
          }).toArray();

          this.eventsNextMonth = $(this.options.events).filter( function() {
            return this._clndrDateObject.format("YYYY-MM") == nextMonth.format("YYYY-MM");
          }).toArray();
        }
      }
    }

    // if diff is greater than 0, we'll have to fill in last days of the previous month
    // to account for the empty boxes in the grid.
    // we also need to take into account the weekOffset parameter
    var diff = date.weekday() - this.options.weekOffset;
    if(diff < 0) diff += 7;

    if(this.options.showAdjacentMonths) {
      for(var i = 0; i < diff; i++) {
        var day = moment([currentMonth.year(), currentMonth.month(), i - diff + 1]);
        daysArray.push( this.createDayObject(day, this.eventsLastMonth) );
      }
    } else {
      for(var i = 0; i < diff; i++) {
        daysArray.push( this.calendarDay({
          classes: this.options.targets.empty + " " + this.options.classes.lastMonth
        }) );
      }
    }

    // now we push all of the days in a month
    var numOfDays = date.daysInMonth();
    for(var i = 1; i <= numOfDays; i++) {
      var day = moment([currentMonth.year(), currentMonth.month(), i]);
      daysArray.push(this.createDayObject(day, this.eventsThisMonth) );
    }

    // ...and if there are any trailing blank boxes, fill those in
    // with the next month first days
    var i = 1;
    while(daysArray.length % 7 !== 0) {
      if(this.options.showAdjacentMonths) {
        var day = moment([currentMonth.year(), currentMonth.month(), numOfDays + i]);
        daysArray.push( this.createDayObject(day, this.eventsNextMonth) );
      } else {
        daysArray.push( this.calendarDay({
          classes: this.options.targets.empty + " " + this.options.classes.nextMonth
        }) );
      }
      i++;
    }

    // if we want to force six rows of calendar, now's our Last Chance to add another row.
    // if the 42 seems explicit it's because we're creating a 7-row grid and 6 rows of 7 is always 42!
    if(this.options.forceSixRows && daysArray.length !== 42 ) {
      var start = moment(daysArray[daysArray.length - 1].date).add(1, 'days');
      while(daysArray.length < 42) {
        if(this.options.showAdjacentMonths) {
          daysArray.push( this.createDayObject(moment(start), this.eventsNextMonth) );
          start.add(1, 'days');
        } else {
          daysArray.push( this.calendarDay({
            classes: this.options.targets.empty + " " + this.options.classes.nextMonth
          }) );
        }
      }
    }

    return daysArray;
  };

  Clndr.prototype.createDayObject = function(day, monthEvents) {
    var eventsToday = [];
    var now = moment();
    var self = this;

    var j = 0, l = monthEvents.length;
    for(j; j < l; j++) {
      // keep in mind that the events here already passed the month/year test.
      // now all we have to compare is the moment.date(), which returns the day of the month.
      var e = monthEvents[j];
      var start, end;
      if(self.options.multiDayEvents) {
        start = e._clndrStartDateObject;
        end = e._clndrEndDateObject;
      } else {
        start = e._clndrDateObject;
      }

      // Check if multiday events are enabled and if the current event is
      // longer than a day
      if (self.options.multiDayEvents && end.diff(start, 'day' > 0)) {
        // Same rules as before to check if the event is on the current day.
        // Could be replaced if moment.js dependency upgraded to 2.9 with
        // if (day.isSame(start, 'day') || day.isBetween(start,end) || day.isSame(end, 'day'))
        if((day.isSame(start, 'day') || day.isAfter(start, 'day'))
        && (day.isSame(end, 'day') || day.isBefore(end, 'day'))) {
          eventsToday.push(e);
        }
      }
      else if (day.isSame(start, 'day')){
        eventsToday.push(e);
      }
    }

    var extraClasses = "";

    if(now.format("YYYY-MM-DD") == day.format("YYYY-MM-DD")) {
       extraClasses += (" " + this.options.classes.today);
    }
    if(day.isBefore(now, 'day')) {
      extraClasses += (" " + this.options.classes.past);
    }
    if(eventsToday.length) {
      extraClasses += (" " + this.options.classes.event);
    }
    if(this.month.month() > day.month()) {
      extraClasses += (" " + this.options.classes.adjacentMonth);
      extraClasses += (this.month.year() === day.year()) ?
        (" " + this.options.classes.lastMonth) : (" " + this.options.classes.nextMonth);

    } else if(this.month.month() < day.month()) {
      extraClasses += (" " + this.options.classes.adjacentMonth);
      extraClasses += (this.month.year() === day.year()) ?
        (" " + this.options.classes.nextMonth) : (" " + this.options.classes.lastMonth);
    }

    // if there are constraints, we need to add the inactive class to the days outside of them
    if(this.options.constraints) {
      if(this.options.constraints.startDate && day.isBefore(moment( this.options.constraints.startDate ))) {
        extraClasses += (" " + this.options.classes.inactive);
      }
      if(this.options.constraints.endDate && day.isAfter(moment( this.options.constraints.endDate ))) {
        extraClasses += (" " + this.options.classes.inactive);
      }
    }

    // validate moment date
    if (!day.isValid() && day.hasOwnProperty('_d') && day._d != undefined) {
        day = moment(day._d);
    }

    // we're moving away from using IDs in favor of classes, since when
    // using multiple calendars on a page we are technically violating the
    // uniqueness of IDs.
    extraClasses += " calendar-day-" + day.format("YYYY-MM-DD");

    // day of week
    extraClasses += " calendar-dow-" + day.weekday();

    return this.calendarDay({
      day: day.date(),
      classes: this.options.targets.day + extraClasses,
      events: eventsToday,
      date: day
    });
  };

  Clndr.prototype.render = function() {
    // get rid of the previous set of calendar parts.
    // TODO: figure out if this is the right way to ensure proper garbage collection?
    this.calendarContainer.children().remove();
    // get an array of days and blank spaces
    var days = this.createDaysObject(this.month);
    // this is to prevent a scope/naming issue between this.month and data.month
    var currentMonth = this.month;

    var data = {
      daysOfTheWeek: this.daysOfTheWeek,
      numberOfRows: Math.ceil(days.length / 7),
      days: days,
      previousMonth: this.month.clone().subtract(1, 'month').format('MMMM'),
      month: this.month.format('MMMM'),
      nextMonth: this.month.clone().add(1, 'month').format('MMMM'),
      year: this.month.year(),
      eventsThisMonth: this.eventsThisMonth,
      eventsLastMonth: this.eventsLastMonth,
      eventsNextMonth: this.eventsNextMonth,
      extras: this.options.extras
    };

    // render the calendar with the data above & bind events to its elements
    if(!this.options.render) {
      this.calendarContainer.html(this.compiledClndrTemplate(data));
    } else {
      this.calendarContainer.html(this.options.render.apply(this, [data]));
    }

    // if there are constraints, we need to add the 'inactive' class to the controls
    if(this.options.constraints) {
      // in the interest of clarity we're just going to remove all inactive classes and re-apply them each render.
      for(var target in this.options.targets) {
        if(target != this.options.targets.day) {
          this.element.find('.' + this.options.targets[target]).toggleClass(this.options.classes.inactive, false);
        }
      }

      var start = null;
      var end = null;

      if(this.options.constraints.startDate) {
        start = moment(this.options.constraints.startDate);
      }
      if(this.options.constraints.endDate) {
        end = moment(this.options.constraints.endDate);
      }
      // deal with the month controls first.
      // are we at the start month?
      if(start && this.month.isSame( start, 'month' )) {
        this.element.find('.' + this.options.targets.previousButton).toggleClass(this.options.classes.inactive, true);
      }
      // are we at the end month?
      if(end && this.month.isSame( end, 'month' )) {
        this.element.find('.' + this.options.targets.nextButton).toggleClass(this.options.classes.inactive, true);
      }
      // what's last year looking like?
      if(start && moment(start).subtract(1, 'years').isBefore(moment(this.month).subtract(1, 'years')) ) {
        this.element.find('.' + this.options.targets.previousYearButton).toggleClass(this.options.classes.inactive, true);
      }
      // how about next year?
      if(end && moment(end).add(1, 'years').isAfter(moment(this.month).add(1, 'years')) ) {
        this.element.find('.' + this.options.targets.nextYearButton).toggleClass(this.options.classes.inactive, true);
      }
      // today? we could put this in init(), but we want to support the user changing the constraints on a living instance.
      if(( start && start.isAfter( moment(), 'month' ) ) || ( end && end.isBefore( moment(), 'month' ) )) {
        this.element.find('.' + this.options.targets.today).toggleClass(this.options.classes.inactive, true);
      }
    }


    if(this.options.doneRendering) {
      this.options.doneRendering.apply(this, []);
    }
  };

  Clndr.prototype.bindEvents = function() {
    var $container = $(this.element);
    var self = this;

    // target the day elements and give them click events
    $container.on('click', '.'+this.options.targets.day, function(event) {
      if(self.options.clickEvents.click) {
        var target = self.buildTargetObject(event.currentTarget, true);
        self.options.clickEvents.click.apply(self, [target]);
      }
      // if adjacentDaysChangeMonth is on, we need to change the month here.
      if(self.options.adjacentDaysChangeMonth) {
        if($(event.currentTarget).is( '.' + self.options.classes.lastMonth )) {
          self.backActionWithContext(self);
        } else if($(event.currentTarget).is( '.' + self.options.classes.nextMonth )) {
          self.forwardActionWithContext(self);
        }
      }
    });
    // target the empty calendar boxes as well
    $container.on('click', '.'+this.options.targets.empty, function(event) {
      if(self.options.clickEvents.click) {
        var target = self.buildTargetObject(event.currentTarget, false);
        self.options.clickEvents.click.apply(self, [target]);
      }
      if(self.options.adjacentDaysChangeMonth) {
        if($(event.currentTarget).is( '.' + self.options.classes.lastMonth )) {
          self.backActionWithContext(self);
        } else if($(event.currentTarget).is( '.' + self.options.classes.nextMonth )) {
          self.forwardActionWithContext(self);
        }
      }
    });

    // bind the previous, next and today buttons
    $container
      .on('click', '.'+this.options.targets.previousButton, { context: this }, this.backAction)
      .on('click', '.'+this.options.targets.nextButton, { context: this }, this.forwardAction)
      .on('click', '.'+this.options.targets.todayButton, { context: this }, this.todayAction)
      .on('click', '.'+this.options.targets.nextYearButton, { context: this }, this.nextYearAction)
      .on('click', '.'+this.options.targets.previousYearButton, { context: this }, this.previousYearAction);
  }

  // If the user provided a click callback we'd like to give them something nice to work with.
  // buildTargetObject takes the DOM element that was clicked and returns an object with
  // the DOM element, events, and the date (if the latter two exist). Currently it is based on the id,
  // however it'd be nice to use a data- attribute in the future.
  Clndr.prototype.buildTargetObject = function(currentTarget, targetWasDay) {
    // This is our default target object, assuming we hit an empty day with no events.
    var target = {
      element: currentTarget,
      events: [],
      date: null
    };
    // did we click on a day or just an empty box?
    if(targetWasDay) {
      var dateString;

      // Our identifier is in the list of classNames. Find it!
      var classNameIndex = currentTarget.className.indexOf('calendar-day-');
      if(classNameIndex !== 0) {
        // our unique identifier is always 23 characters long.
        // If this feels a little wonky, that's probably because it is.
        // Open to suggestions on how to improve this guy.
        dateString = currentTarget.className.substring(classNameIndex + 13, classNameIndex + 23);
        target.date = moment(dateString);
      } else {
        target.date = null;
      }

      // do we have events?
      if(this.options.events) {
        // are any of the events happening today?
        if(this.options.multiDayEvents) {
          target.events = $.makeArray( $(this.options.events).filter( function() {
            // filter the dates down to the ones that match.
            return ( ( target.date.isSame(this._clndrStartDateObject, 'day') || target.date.isAfter(this._clndrStartDateObject, 'day') ) &&
              ( target.date.isSame(this._clndrEndDateObject, 'day') || target.date.isBefore(this._clndrEndDateObject, 'day') ) );
          }) );
        } else {
          target.events = $.makeArray( $(this.options.events).filter( function() {
            // filter the dates down to the ones that match.
            return this._clndrDateObject.format('YYYY-MM-DD') == dateString;
          }) );
        }
      }
    }

    return target;
  }

  // the click handlers in bindEvents need a context, so these are wrappers
  // to the actual functions. Todo: better way to handle this?
  Clndr.prototype.forwardAction = function(event) {
    var self = event.data.context;
    self.forwardActionWithContext(self);
  };

  Clndr.prototype.backAction = function(event) {
    var self = event.data.context;
    self.backActionWithContext(self);
  };

  // These are called directly, except for in the bindEvent click handlers,
  // where forwardAction and backAction proxy to these guys.
  Clndr.prototype.backActionWithContext = function(self) {
    // before we do anything, check if there is an inactive class on the month control.
    // if it does, we want to return and take no action.
    if(self.element.find('.' + self.options.targets.previousButton).hasClass('inactive')) {
      return;
    }

    // is subtracting one month going to switch the year?
    var yearChanged = !self.month.isSame( moment(self.month).subtract(1, 'months'), 'year');
    self.month.subtract(1, 'months');

    self.render();

    if(self.options.clickEvents.previousMonth) {
      self.options.clickEvents.previousMonth.apply( self, [moment(self.month)] );
    }
    if(self.options.clickEvents.onMonthChange) {
      self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
    }
    if(yearChanged) {
      if(self.options.clickEvents.onYearChange) {
        self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
      }
    }
  };

  Clndr.prototype.forwardActionWithContext = function(self) {
    // before we do anything, check if there is an inactive class on the month control.
    // if it does, we want to return and take no action.
    if(self.element.find('.' + self.options.targets.nextButton).hasClass('inactive')) {
      return;
    }

    // is adding one month going to switch the year?
    var yearChanged = !self.month.isSame( moment(self.month).add(1, 'months'), 'year');
    self.month.add(1, 'months');

    self.render();

    if(self.options.clickEvents.nextMonth) {
      self.options.clickEvents.nextMonth.apply(self, [moment(self.month)]);
    }
    if(self.options.clickEvents.onMonthChange) {
      self.options.clickEvents.onMonthChange.apply(self, [moment(self.month)]);
    }
    if(yearChanged) {
      if(self.options.clickEvents.onYearChange) {
        self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
      }
    }
  };

  Clndr.prototype.todayAction = function(event) {
    var self = event.data.context;

    // did we switch months when the today button was hit?
    var monthChanged = !self.month.isSame(moment(), 'month');
    var yearChanged = !self.month.isSame(moment(), 'year');

    self.month = moment().startOf('month');

    // fire the today event handler regardless of whether the month changed.
    if(self.options.clickEvents.today) {
      self.options.clickEvents.today.apply( self, [moment(self.month)] );
    }

    if(monthChanged) {
      // no need to re-render if we didn't change months.
      self.render();

      self.month = moment();
      // fire the onMonthChange callback
      if(self.options.clickEvents.onMonthChange) {
        self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
      }
      // maybe fire the onYearChange callback?
      if(yearChanged) {
        if(self.options.clickEvents.onYearChange) {
          self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
        }
      }
    }
  };

  Clndr.prototype.nextYearAction = function(event) {
    var self = event.data.context;
    // before we do anything, check if there is an inactive class on the month control.
    // if it does, we want to return and take no action.
    if(self.element.find('.' + self.options.targets.nextYearButton).hasClass('inactive')) {
      return;
    }

    self.month.add(1, 'years');
    self.render();

    if(self.options.clickEvents.nextYear) {
      self.options.clickEvents.nextYear.apply( self, [moment(self.month)] );
    }
    if(self.options.clickEvents.onMonthChange) {
      self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
    }
    if(self.options.clickEvents.onYearChange) {
      self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
    }
  };

  Clndr.prototype.previousYearAction = function(event) {
    var self = event.data.context;
    // before we do anything, check if there is an inactive class on the month control.
    // if it does, we want to return and take no action.
    if(self.element.find('.' + self.options.targets.previousYear).hasClass('inactive')) {
      return;
    }

    self.month.subtract(1, 'years');
    self.render();

    if(self.options.clickEvents.previousYear) {
      self.options.clickEvents.previousYear.apply( self, [moment(self.month)] );
    }
    if(self.options.clickEvents.onMonthChange) {
      self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
    }
    if(self.options.clickEvents.onYearChange) {
      self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
    }
  };

  Clndr.prototype.forward = function(options) {
    this.month.add(1, 'months');
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onMonthChange) {
        this.options.clickEvents.onMonthChange.apply( this, [moment(this.month)] );
      }

      // We entered a new year
      if (this.month.month() === 0 && this.options.clickEvents.onYearChange) {
        this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
      }
    }

    return this;
  }

  Clndr.prototype.back = function(options) {
    this.month.subtract(1, 'months');
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onMonthChange) {
        this.options.clickEvents.onMonthChange.apply( this, [moment(this.month)] );
      }

      // We went all the way back to previous year
      if (this.month.month() === 11 && this.options.clickEvents.onYearChange) {
        this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
      }
    }

    return this;
  }

  // alternate names for convenience
  Clndr.prototype.next = function(options) {
    this.forward(options);
    return this;
  }

  Clndr.prototype.previous = function(options) {
    this.back(options);
    return this;
  }

  Clndr.prototype.setMonth = function(newMonth, options) {
    // accepts 0 - 11 or a full/partial month name e.g. "Jan", "February", "Mar"
    this.month.month(newMonth);
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onMonthChange) {
        this.options.clickEvents.onMonthChange.apply( this, [moment(this.month)] );
      }
    }
    return this;
  }

  Clndr.prototype.nextYear = function(options) {
    this.month.add(1, 'year');
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onYearChange) {
        this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
      }
    }
    return this;
  }

  Clndr.prototype.previousYear = function(options) {
    this.month.subtract(1, 'year');
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onYearChange) {
        this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
      }
    }
    return this;
  }

  Clndr.prototype.setYear = function(newYear, options) {
    this.month.year(newYear);
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onYearChange) {
        this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
      }
    }
    return this;
  }

  Clndr.prototype.setEvents = function(events) {
    // go through each event and add a moment object
    if(this.options.multiDayEvents) {
      this.options.events = this.addMultiDayMomentObjectsToEvents(events);
    } else {
      this.options.events = this.addMomentObjectToEvents(events);
    }

    this.render();
    return this;
  };

  Clndr.prototype.addEvents = function(events) {
    // go through each event and add a moment object
    if(this.options.multiDayEvents) {
      this.options.events = $.merge(this.options.events, this.addMultiDayMomentObjectsToEvents(events));
    } else {
      this.options.events = $.merge(this.options.events, this.addMomentObjectToEvents(events));
    }

    this.render();
    return this;
  };

  Clndr.prototype.removeEvents = function(matchingFunction) {
    for (var i = this.options.events.length-1; i >= 0; i--) {
      if(matchingFunction(this.options.events[i]) == true) {
        this.options.events.splice(i, 1);
      }
    }

    this.render();
    return this;
  };

  Clndr.prototype.addMomentObjectToEvents = function(events) {
    var self = this;
    var i = 0, l = events.length;
    for(i; i < l; i++) {
      // stuff a _clndrDateObject in each event, which really, REALLY should not be
      // overriding any existing object... Man that would be weird.
      events[i]._clndrDateObject = moment( events[i][self.options.dateParameter] );
    }
    return events;
  }

  Clndr.prototype.addMultiDayMomentObjectsToEvents = function(events) {
    var self = this;
    var i = 0, l = events.length;
    for(i; i < l; i++) {
      // if we don't find the startDate OR endDate fields, look for singleDay
      if(!events[i][self.options.multiDayEvents.endDate] && !events[i][self.options.multiDayEvents.startDate]) {
        events[i]._clndrEndDateObject = moment( events[i][self.options.multiDayEvents.singleDay] );
        events[i]._clndrStartDateObject = moment( events[i][self.options.multiDayEvents.singleDay] );
      } else {
        // otherwise use startDate and endDate, or whichever one is present.
        events[i]._clndrEndDateObject = moment( events[i][self.options.multiDayEvents.endDate] || events[i][self.options.multiDayEvents.startDate] );
        events[i]._clndrStartDateObject = moment( events[i][self.options.multiDayEvents.startDate] || events[i][self.options.multiDayEvents.endDate] );
      }
    }
    return events;
  }

  Clndr.prototype.calendarDay = function(options) {
    var defaults = { day: "", classes: this.options.targets.empty, events: [], date: null };
    return $.extend({}, defaults, options);
  }

  $.fn.clndr = function(options) {
    if(this.length === 1) {
      if(!this.data('plugin_clndr')) {
        var clndr_instance = new Clndr(this, options);
        this.data('plugin_clndr', clndr_instance);
        return clndr_instance;
      }
    } else if(this.length > 1) {
      throw new Error("CLNDR does not support multiple elements yet. Make sure your clndr selector returns only one element.");
    }
  }

}));

/**
 * @license
 * lodash 3.9.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern -o ./lodash.js`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
;(function() {

    /** Used as a safe reference for `undefined` in pre-ES5 environments. */
    var undefined;

    /** Used as the semantic version number. */
    var VERSION = '3.9.3';

    /** Used to compose bitmasks for wrapper metadata. */
    var BIND_FLAG = 1,
        BIND_KEY_FLAG = 2,
        CURRY_BOUND_FLAG = 4,
        CURRY_FLAG = 8,
        CURRY_RIGHT_FLAG = 16,
        PARTIAL_FLAG = 32,
        PARTIAL_RIGHT_FLAG = 64,
        ARY_FLAG = 128,
        REARG_FLAG = 256;

    /** Used as default options for `_.trunc`. */
    var DEFAULT_TRUNC_LENGTH = 30,
        DEFAULT_TRUNC_OMISSION = '...';

    /** Used to detect when a function becomes hot. */
    var HOT_COUNT = 150,
        HOT_SPAN = 16;

    /** Used to indicate the type of lazy iteratees. */
    var LAZY_DROP_WHILE_FLAG = 0,
        LAZY_FILTER_FLAG = 1,
        LAZY_MAP_FLAG = 2;

    /** Used as the `TypeError` message for "Functions" methods. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /** Used as the internal argument placeholder. */
    var PLACEHOLDER = '__lodash_placeholder__';

    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]',
        arrayTag = '[object Array]',
        boolTag = '[object Boolean]',
        dateTag = '[object Date]',
        errorTag = '[object Error]',
        funcTag = '[object Function]',
        mapTag = '[object Map]',
        numberTag = '[object Number]',
        objectTag = '[object Object]',
        regexpTag = '[object RegExp]',
        setTag = '[object Set]',
        stringTag = '[object String]',
        weakMapTag = '[object WeakMap]';

    var arrayBufferTag = '[object ArrayBuffer]',
        float32Tag = '[object Float32Array]',
        float64Tag = '[object Float64Array]',
        int8Tag = '[object Int8Array]',
        int16Tag = '[object Int16Array]',
        int32Tag = '[object Int32Array]',
        uint8Tag = '[object Uint8Array]',
        uint8ClampedTag = '[object Uint8ClampedArray]',
        uint16Tag = '[object Uint16Array]',
        uint32Tag = '[object Uint32Array]';

    /** Used to match empty string literals in compiled template source. */
    var reEmptyStringLeading = /\b__p \+= '';/g,
        reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
        reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

    /** Used to match HTML entities and HTML characters. */
    var reEscapedHtml = /&(?:amp|lt|gt|quot|#39|#96);/g,
        reUnescapedHtml = /[&<>"'`]/g,
        reHasEscapedHtml = RegExp(reEscapedHtml.source),
        reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

    /** Used to match template delimiters. */
    var reEscape = /<%-([\s\S]+?)%>/g,
        reEvaluate = /<%([\s\S]+?)%>/g,
        reInterpolate = /<%=([\s\S]+?)%>/g;

    /** Used to match property names within property paths. */
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
        reIsPlainProp = /^\w*$/,
        rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;

    /**
     * Used to match `RegExp` [special characters](http://www.js.regular-expressions.info/characters.html#special).
     * In addition to special characters the forward slash is escaped to allow for
     * easier `eval` use and `Function` compilation.
     */
    var reRegExpChars = /[.*+?^${}()|[\]\/\\]/g,
        reHasRegExpChars = RegExp(reRegExpChars.source);

    /** Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks). */
    var reComboMark = /[\u0300-\u036f\ufe20-\ufe23]/g;

    /** Used to match backslashes in property paths. */
    var reEscapeChar = /\\(\\)?/g;

    /** Used to match [ES template delimiters](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-template-literal-lexical-components). */
    var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

    /** Used to match `RegExp` flags from their coerced string values. */
    var reFlags = /\w*$/;

    /** Used to detect hexadecimal string values. */
    var reHasHexPrefix = /^0[xX]/;

    /** Used to detect host constructors (Safari > 5). */
    var reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Used to detect unsigned integer values. */
    var reIsUint = /^\d+$/;

    /** Used to match latin-1 supplementary letters (excluding mathematical operators). */
    var reLatin1 = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g;

    /** Used to ensure capturing order of template delimiters. */
    var reNoMatch = /($^)/;

    /** Used to match unescaped characters in compiled string literals. */
    var reUnescapedString = /['\n\r\u2028\u2029\\]/g;

    /** Used to match words to create compound words. */
    var reWords = (function() {
        var upper = '[A-Z\\xc0-\\xd6\\xd8-\\xde]',
            lower = '[a-z\\xdf-\\xf6\\xf8-\\xff]+';

        return RegExp(upper + '+(?=' + upper + lower + ')|' + upper + '?' + lower + '|' + upper + '+|[0-9]+', 'g');
    }());

    /** Used to detect and test for whitespace. */
    var whitespace = (
        // Basic whitespace characters.
    ' \t\x0b\f\xa0\ufeff' +

        // Line terminators.
    '\n\r\u2028\u2029' +

        // Unicode category "Zs" space separators.
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
    );

    /** Used to assign default `context` object properties. */
    var contextProps = [
        'Array', 'ArrayBuffer', 'Date', 'Error', 'Float32Array', 'Float64Array',
        'Function', 'Int8Array', 'Int16Array', 'Int32Array', 'Math', 'Number',
        'Object', 'RegExp', 'Set', 'String', '_', 'clearTimeout', 'document',
        'isFinite', 'parseFloat', 'parseInt', 'setTimeout', 'TypeError', 'Uint8Array',
        'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'WeakMap', 'window'
    ];

    /** Used to make template sourceURLs easier to identify. */
    var templateCounter = -1;

    /** Used to identify `toStringTag` values of typed arrays. */
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
        typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
            typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
                typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
                    typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
        typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
            typedArrayTags[dateTag] = typedArrayTags[errorTag] =
                typedArrayTags[funcTag] = typedArrayTags[mapTag] =
                    typedArrayTags[numberTag] = typedArrayTags[objectTag] =
                        typedArrayTags[regexpTag] = typedArrayTags[setTag] =
                            typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

    /** Used to identify `toStringTag` values supported by `_.clone`. */
    var cloneableTags = {};
    cloneableTags[argsTag] = cloneableTags[arrayTag] =
        cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
            cloneableTags[dateTag] = cloneableTags[float32Tag] =
                cloneableTags[float64Tag] = cloneableTags[int8Tag] =
                    cloneableTags[int16Tag] = cloneableTags[int32Tag] =
                        cloneableTags[numberTag] = cloneableTags[objectTag] =
                            cloneableTags[regexpTag] = cloneableTags[stringTag] =
                                cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
                                    cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
    cloneableTags[errorTag] = cloneableTags[funcTag] =
        cloneableTags[mapTag] = cloneableTags[setTag] =
            cloneableTags[weakMapTag] = false;

    /** Used as an internal `_.debounce` options object by `_.throttle`. */
    var debounceOptions = {
        'leading': false,
        'maxWait': 0,
        'trailing': false
    };

    /** Used to map latin-1 supplementary letters to basic latin letters. */
    var deburredLetters = {
        '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
        '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
        '\xc7': 'C',  '\xe7': 'c',
        '\xd0': 'D',  '\xf0': 'd',
        '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
        '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
        '\xcC': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
        '\xeC': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
        '\xd1': 'N',  '\xf1': 'n',
        '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
        '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
        '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
        '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
        '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
        '\xc6': 'Ae', '\xe6': 'ae',
        '\xde': 'Th', '\xfe': 'th',
        '\xdf': 'ss'
    };

    /** Used to map characters to HTML entities. */
    var htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;'
    };

    /** Used to map HTML entities to characters. */
    var htmlUnescapes = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#96;': '`'
    };

    /** Used to determine if values are of the language type `Object`. */
    var objectTypes = {
        'function': true,
        'object': true
    };

    /** Used to escape characters for inclusion in compiled string literals. */
    var stringEscapes = {
        '\\': '\\',
        "'": "'",
        '\n': 'n',
        '\r': 'r',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };

    /** Detect free variable `exports`. */
    var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;

    /** Detect free variable `self`. */
    var freeSelf = objectTypes[typeof self] && self && self.Object && self;

    /** Detect free variable `window`. */
    var freeWindow = objectTypes[typeof window] && window && window.Object && window;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

    /**
     * Used as a reference to the global object.
     *
     * The `this` value is used if it's the global object to avoid Greasemonkey's
     * restricted `window` object, otherwise the `window` object is used.
     */
    var root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;

    /*--------------------------------------------------------------------------*/

    /**
     * The base implementation of `compareAscending` which compares values and
     * sorts them in ascending order without guaranteeing a stable sort.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {number} Returns the sort order indicator for `value`.
     */
    function baseCompareAscending(value, other) {
        if (value !== other) {
            var valIsNull = value === null,
                valIsUndef = value === undefined,
                valIsReflexive = value === value;

            var othIsNull = other === null,
                othIsUndef = other === undefined,
                othIsReflexive = other === other;

            if ((value > other && !othIsNull) || !valIsReflexive ||
                (valIsNull && !othIsUndef && othIsReflexive) ||
                (valIsUndef && othIsReflexive)) {
                return 1;
            }
            if ((value < other && !valIsNull) || !othIsReflexive ||
                (othIsNull && !valIsUndef && valIsReflexive) ||
                (othIsUndef && valIsReflexive)) {
                return -1;
            }
        }
        return 0;
    }

    /**
     * The base implementation of `_.findIndex` and `_.findLastIndex` without
     * support for callback shorthands and `this` binding.
     *
     * @private
     * @param {Array} array The array to search.
     * @param {Function} predicate The function invoked per iteration.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseFindIndex(array, predicate, fromRight) {
        var length = array.length,
            index = fromRight ? length : -1;

        while ((fromRight ? index-- : ++index < length)) {
            if (predicate(array[index], index, array)) {
                return index;
            }
        }
        return -1;
    }

    /**
     * The base implementation of `_.indexOf` without support for binary searches.
     *
     * @private
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} fromIndex The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseIndexOf(array, value, fromIndex) {
        if (value !== value) {
            return indexOfNaN(array, fromIndex);
        }
        var index = fromIndex - 1,
            length = array.length;

        while (++index < length) {
            if (array[index] === value) {
                return index;
            }
        }
        return -1;
    }

    /**
     * The base implementation of `_.isFunction` without support for environments
     * with incorrect `typeof` results.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
     */
    function baseIsFunction(value) {
        // Avoid a Chakra JIT bug in compatibility modes of IE 11.
        // See https://github.com/jashkenas/underscore/issues/1621 for more details.
        return typeof value == 'function' || false;
    }

    /**
     * Converts `value` to a string if it's not one. An empty string is returned
     * for `null` or `undefined` values.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
        if (typeof value == 'string') {
            return value;
        }
        return value == null ? '' : (value + '');
    }

    /**
     * Used by `_.trim` and `_.trimLeft` to get the index of the first character
     * of `string` that is not found in `chars`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @param {string} chars The characters to find.
     * @returns {number} Returns the index of the first character not found in `chars`.
     */
    function charsLeftIndex(string, chars) {
        var index = -1,
            length = string.length;

        while (++index < length && chars.indexOf(string.charAt(index)) > -1) {}
        return index;
    }

    /**
     * Used by `_.trim` and `_.trimRight` to get the index of the last character
     * of `string` that is not found in `chars`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @param {string} chars The characters to find.
     * @returns {number} Returns the index of the last character not found in `chars`.
     */
    function charsRightIndex(string, chars) {
        var index = string.length;

        while (index-- && chars.indexOf(string.charAt(index)) > -1) {}
        return index;
    }

    /**
     * Used by `_.sortBy` to compare transformed elements of a collection and stable
     * sort them in ascending order.
     *
     * @private
     * @param {Object} object The object to compare to `other`.
     * @param {Object} other The object to compare to `object`.
     * @returns {number} Returns the sort order indicator for `object`.
     */
    function compareAscending(object, other) {
        return baseCompareAscending(object.criteria, other.criteria) || (object.index - other.index);
    }

    /**
     * Used by `_.sortByOrder` to compare multiple properties of each element
     * in a collection and stable sort them in the following order:
     *
     * If `orders` is unspecified, sort in ascending order for all properties.
     * Otherwise, for each property, sort in ascending order if its corresponding value in
     * orders is true, and descending order if false.
     *
     * @private
     * @param {Object} object The object to compare to `other`.
     * @param {Object} other The object to compare to `object`.
     * @param {boolean[]} orders The order to sort by for each property.
     * @returns {number} Returns the sort order indicator for `object`.
     */
    function compareMultiple(object, other, orders) {
        var index = -1,
            objCriteria = object.criteria,
            othCriteria = other.criteria,
            length = objCriteria.length,
            ordersLength = orders.length;

        while (++index < length) {
            var result = baseCompareAscending(objCriteria[index], othCriteria[index]);
            if (result) {
                if (index >= ordersLength) {
                    return result;
                }
                return result * (orders[index] ? 1 : -1);
            }
        }
        // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
        // that causes it, under certain circumstances, to provide the same value for
        // `object` and `other`. See https://github.com/jashkenas/underscore/pull/1247
        // for more details.
        //
        // This also ensures a stable sort in V8 and other engines.
        // See https://code.google.com/p/v8/issues/detail?id=90 for more details.
        return object.index - other.index;
    }

    /**
     * Used by `_.deburr` to convert latin-1 supplementary letters to basic latin letters.
     *
     * @private
     * @param {string} letter The matched letter to deburr.
     * @returns {string} Returns the deburred letter.
     */
    function deburrLetter(letter) {
        return deburredLetters[letter];
    }

    /**
     * Used by `_.escape` to convert characters to HTML entities.
     *
     * @private
     * @param {string} chr The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeHtmlChar(chr) {
        return htmlEscapes[chr];
    }

    /**
     * Used by `_.template` to escape characters for inclusion in compiled
     * string literals.
     *
     * @private
     * @param {string} chr The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeStringChar(chr) {
        return '\\' + stringEscapes[chr];
    }

    /**
     * Gets the index at which the first occurrence of `NaN` is found in `array`.
     *
     * @private
     * @param {Array} array The array to search.
     * @param {number} fromIndex The index to search from.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {number} Returns the index of the matched `NaN`, else `-1`.
     */
    function indexOfNaN(array, fromIndex, fromRight) {
        var length = array.length,
            index = fromIndex + (fromRight ? 0 : -1);

        while ((fromRight ? index-- : ++index < length)) {
            var other = array[index];
            if (other !== other) {
                return index;
            }
        }
        return -1;
    }

    /**
     * Checks if `value` is object-like.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     */
    function isObjectLike(value) {
        return !!value && typeof value == 'object';
    }

    /**
     * Used by `trimmedLeftIndex` and `trimmedRightIndex` to determine if a
     * character code is whitespace.
     *
     * @private
     * @param {number} charCode The character code to inspect.
     * @returns {boolean} Returns `true` if `charCode` is whitespace, else `false`.
     */
    function isSpace(charCode) {
        return ((charCode <= 160 && (charCode >= 9 && charCode <= 13) || charCode == 32 || charCode == 160) || charCode == 5760 || charCode == 6158 ||
        (charCode >= 8192 && (charCode <= 8202 || charCode == 8232 || charCode == 8233 || charCode == 8239 || charCode == 8287 || charCode == 12288 || charCode == 65279)));
    }

    /**
     * Replaces all `placeholder` elements in `array` with an internal placeholder
     * and returns an array of their indexes.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {*} placeholder The placeholder to replace.
     * @returns {Array} Returns the new array of placeholder indexes.
     */
    function replaceHolders(array, placeholder) {
        var index = -1,
            length = array.length,
            resIndex = -1,
            result = [];

        while (++index < length) {
            if (array[index] === placeholder) {
                array[index] = PLACEHOLDER;
                result[++resIndex] = index;
            }
        }
        return result;
    }

    /**
     * An implementation of `_.uniq` optimized for sorted arrays without support
     * for callback shorthands and `this` binding.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee] The function invoked per iteration.
     * @returns {Array} Returns the new duplicate-value-free array.
     */
    function sortedUniq(array, iteratee) {
        var seen,
            index = -1,
            length = array.length,
            resIndex = -1,
            result = [];

        while (++index < length) {
            var value = array[index],
                computed = iteratee ? iteratee(value, index, array) : value;

            if (!index || seen !== computed) {
                seen = computed;
                result[++resIndex] = value;
            }
        }
        return result;
    }

    /**
     * Used by `_.trim` and `_.trimLeft` to get the index of the first non-whitespace
     * character of `string`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the index of the first non-whitespace character.
     */
    function trimmedLeftIndex(string) {
        var index = -1,
            length = string.length;

        while (++index < length && isSpace(string.charCodeAt(index))) {}
        return index;
    }

    /**
     * Used by `_.trim` and `_.trimRight` to get the index of the last non-whitespace
     * character of `string`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the index of the last non-whitespace character.
     */
    function trimmedRightIndex(string) {
        var index = string.length;

        while (index-- && isSpace(string.charCodeAt(index))) {}
        return index;
    }

    /**
     * Used by `_.unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {string} chr The matched character to unescape.
     * @returns {string} Returns the unescaped character.
     */
    function unescapeHtmlChar(chr) {
        return htmlUnescapes[chr];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Create a new pristine `lodash` function using the given `context` object.
     *
     * @static
     * @memberOf _
     * @category Utility
     * @param {Object} [context=root] The context object.
     * @returns {Function} Returns a new `lodash` function.
     * @example
     *
     * _.mixin({ 'foo': _.constant('foo') });
     *
     * var lodash = _.runInContext();
     * lodash.mixin({ 'bar': lodash.constant('bar') });
     *
     * _.isFunction(_.foo);
     * // => true
     * _.isFunction(_.bar);
     * // => false
     *
     * lodash.isFunction(lodash.foo);
     * // => false
     * lodash.isFunction(lodash.bar);
     * // => true
     *
     * // using `context` to mock `Date#getTime` use in `_.now`
     * var mock = _.runInContext({
   *   'Date': function() {
   *     return { 'getTime': getTimeMock };
   *   }
   * });
     *
     * // or creating a suped-up `defer` in Node.js
     * var defer = _.runInContext({ 'setTimeout': setImmediate }).defer;
     */
    function runInContext(context) {
        // Avoid issues with some ES3 environments that attempt to use values, named
        // after built-in constructors like `Object`, for the creation of literals.
        // ES5 clears this up by stating that literals must use built-in constructors.
        // See https://es5.github.io/#x11.1.5 for more details.
        context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;

        /** Native constructor references. */
        var Array = context.Array,
            Date = context.Date,
            Error = context.Error,
            Function = context.Function,
            Math = context.Math,
            Number = context.Number,
            Object = context.Object,
            RegExp = context.RegExp,
            String = context.String,
            TypeError = context.TypeError;

        /** Used for native method references. */
        var arrayProto = Array.prototype,
            objectProto = Object.prototype,
            stringProto = String.prototype;

        /** Used to detect DOM support. */
        var document = (document = context.window) ? document.document : null;

        /** Used to resolve the decompiled source of functions. */
        var fnToString = Function.prototype.toString;

        /** Used to check objects for own properties. */
        var hasOwnProperty = objectProto.hasOwnProperty;

        /** Used to generate unique IDs. */
        var idCounter = 0;

        /**
         * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
         * of values.
         */
        var objToString = objectProto.toString;

        /** Used to restore the original `_` reference in `_.noConflict`. */
        var oldDash = context._;

        /** Used to detect if a method is native. */
        var reIsNative = RegExp('^' +
            escapeRegExp(fnToString.call(hasOwnProperty))
                .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
        );

        /** Native method references. */
        var ArrayBuffer = getNative(context, 'ArrayBuffer'),
            bufferSlice = getNative(ArrayBuffer && new ArrayBuffer(0), 'slice'),
            ceil = Math.ceil,
            clearTimeout = context.clearTimeout,
            floor = Math.floor,
            getPrototypeOf = getNative(Object, 'getPrototypeOf'),
            parseFloat = context.parseFloat,
            push = arrayProto.push,
            Set = getNative(context, 'Set'),
            setTimeout = context.setTimeout,
            splice = arrayProto.splice,
            Uint8Array = getNative(context, 'Uint8Array'),
            WeakMap = getNative(context, 'WeakMap');

        /** Used to clone array buffers. */
        var Float64Array = (function() {
            // Safari 5 errors when using an array buffer to initialize a typed array
            // where the array buffer's `byteLength` is not a multiple of the typed
            // array's `BYTES_PER_ELEMENT`.
            try {
                var func = getNative(context, 'Float64Array'),
                    result = new func(new ArrayBuffer(10), 0, 1) && func;
            } catch(e) {}
            return result || null;
        }());

        /* Native method references for those with the same name as other `lodash` methods. */
        var nativeCreate = getNative(Object, 'create'),
            nativeIsArray = getNative(Array, 'isArray'),
            nativeIsFinite = context.isFinite,
            nativeKeys = getNative(Object, 'keys'),
            nativeMax = Math.max,
            nativeMin = Math.min,
            nativeNow = getNative(Date, 'now'),
            nativeNumIsFinite = getNative(Number, 'isFinite'),
            nativeParseInt = context.parseInt,
            nativeRandom = Math.random;

        /** Used as references for `-Infinity` and `Infinity`. */
        var NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
            POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

        /** Used as references for the maximum length and index of an array. */
        var MAX_ARRAY_LENGTH = 4294967295,
            MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1,
            HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;

        /** Used as the size, in bytes, of each `Float64Array` element. */
        var FLOAT64_BYTES_PER_ELEMENT = Float64Array ? Float64Array.BYTES_PER_ELEMENT : 0;

        /**
         * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
         * of an array-like value.
         */
        var MAX_SAFE_INTEGER = 9007199254740991;

        /** Used to store function metadata. */
        var metaMap = WeakMap && new WeakMap;

        /** Used to lookup unminified function names. */
        var realNames = {};

        /*------------------------------------------------------------------------*/

        /**
         * Creates a `lodash` object which wraps `value` to enable implicit chaining.
         * Methods that operate on and return arrays, collections, and functions can
         * be chained together. Methods that return a boolean or single value will
         * automatically end the chain returning the unwrapped value. Explicit chaining
         * may be enabled using `_.chain`. The execution of chained methods is lazy,
         * that is, execution is deferred until `_#value` is implicitly or explicitly
         * called.
         *
         * Lazy evaluation allows several methods to support shortcut fusion. Shortcut
         * fusion is an optimization that merges iteratees to avoid creating intermediate
         * arrays and reduce the number of iteratee executions.
         *
         * Chaining is supported in custom builds as long as the `_#value` method is
         * directly or indirectly included in the build.
         *
         * In addition to lodash methods, wrappers have `Array` and `String` methods.
         *
         * The wrapper `Array` methods are:
         * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`,
         * `splice`, and `unshift`
         *
         * The wrapper `String` methods are:
         * `replace` and `split`
         *
         * The wrapper methods that support shortcut fusion are:
         * `compact`, `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `filter`,
         * `first`, `initial`, `last`, `map`, `pluck`, `reject`, `rest`, `reverse`,
         * `slice`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, `toArray`,
         * and `where`
         *
         * The chainable wrapper methods are:
         * `after`, `ary`, `assign`, `at`, `before`, `bind`, `bindAll`, `bindKey`,
         * `callback`, `chain`, `chunk`, `commit`, `compact`, `concat`, `constant`,
         * `countBy`, `create`, `curry`, `debounce`, `defaults`, `defer`, `delay`,
         * `difference`, `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `fill`,
         * `filter`, `flatten`, `flattenDeep`, `flow`, `flowRight`, `forEach`,
         * `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`, `functions`,
         * `groupBy`, `indexBy`, `initial`, `intersection`, `invert`, `invoke`, `keys`,
         * `keysIn`, `map`, `mapKeys`, `mapValues`, `matches`, `matchesProperty`,
         * `memoize`, `merge`, `method`, `methodOf`, `mixin`, `negate`, `omit`, `once`,
         * `pairs`, `partial`, `partialRight`, `partition`, `pick`, `plant`, `pluck`,
         * `property`, `propertyOf`, `pull`, `pullAt`, `push`, `range`, `rearg`,
         * `reject`, `remove`, `rest`, `restParam`, `reverse`, `set`, `shuffle`,
         * `slice`, `sort`, `sortBy`, `sortByAll`, `sortByOrder`, `splice`, `spread`,
         * `take`, `takeRight`, `takeRightWhile`, `takeWhile`, `tap`, `throttle`,
         * `thru`, `times`, `toArray`, `toPlainObject`, `transform`, `union`, `uniq`,
         * `unshift`, `unzip`, `unzipWith`, `values`, `valuesIn`, `where`, `without`,
         * `wrap`, `xor`, `zip`, `zipObject`, `zipWith`
         *
         * The wrapper methods that are **not** chainable by default are:
         * `add`, `attempt`, `camelCase`, `capitalize`, `clone`, `cloneDeep`, `deburr`,
         * `endsWith`, `escape`, `escapeRegExp`, `every`, `find`, `findIndex`, `findKey`,
         * `findLast`, `findLastIndex`, `findLastKey`, `findWhere`, `first`, `get`,
         * `gt`, `gte`, `has`, `identity`, `includes`, `indexOf`, `inRange`, `isArguments`,
         * `isArray`, `isBoolean`, `isDate`, `isElement`, `isEmpty`, `isEqual`, `isError`,
         * `isFinite` `isFunction`, `isMatch`, `isNative`, `isNaN`, `isNull`, `isNumber`,
         * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`,
         * `isTypedArray`, `join`, `kebabCase`, `last`, `lastIndexOf`, `lt`, `lte`,
         * `max`, `min`, `noConflict`, `noop`, `now`, `pad`, `padLeft`, `padRight`,
         * `parseInt`, `pop`, `random`, `reduce`, `reduceRight`, `repeat`, `result`,
         * `runInContext`, `shift`, `size`, `snakeCase`, `some`, `sortedIndex`,
         * `sortedLastIndex`, `startCase`, `startsWith`, `sum`, `template`, `trim`,
         * `trimLeft`, `trimRight`, `trunc`, `unescape`, `uniqueId`, `value`, and `words`
         *
         * The wrapper method `sample` will return a wrapped value when `n` is provided,
         * otherwise an unwrapped value is returned.
         *
         * @name _
         * @constructor
         * @category Chain
         * @param {*} value The value to wrap in a `lodash` instance.
         * @returns {Object} Returns the new `lodash` wrapper instance.
         * @example
         *
         * var wrapped = _([1, 2, 3]);
         *
         * // returns an unwrapped value
         * wrapped.reduce(function(total, n) {
     *   return total + n;
     * });
         * // => 6
         *
         * // returns a wrapped value
         * var squares = wrapped.map(function(n) {
     *   return n * n;
     * });
         *
         * _.isArray(squares);
         * // => false
         *
         * _.isArray(squares.value());
         * // => true
         */
        function lodash(value) {
            if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
                if (value instanceof LodashWrapper) {
                    return value;
                }
                if (hasOwnProperty.call(value, '__chain__') && hasOwnProperty.call(value, '__wrapped__')) {
                    return wrapperClone(value);
                }
            }
            return new LodashWrapper(value);
        }

        /**
         * The function whose prototype all chaining wrappers inherit from.
         *
         * @private
         */
        function baseLodash() {
            // No operation performed.
        }

        /**
         * The base constructor for creating `lodash` wrapper objects.
         *
         * @private
         * @param {*} value The value to wrap.
         * @param {boolean} [chainAll] Enable chaining for all wrapper methods.
         * @param {Array} [actions=[]] Actions to peform to resolve the unwrapped value.
         */
        function LodashWrapper(value, chainAll, actions) {
            this.__wrapped__ = value;
            this.__actions__ = actions || [];
            this.__chain__ = !!chainAll;
        }

        /**
         * An object environment feature flags.
         *
         * @static
         * @memberOf _
         * @type Object
         */
        var support = lodash.support = {};

        (function(x) {
            var Ctor = function() { this.x = x; },
                object = { '0': x, 'length': x },
                props = [];

            Ctor.prototype = { 'valueOf': x, 'y': x };
            for (var key in new Ctor) { props.push(key); }

            /**
             * Detect if the DOM is supported.
             *
             * @memberOf _.support
             * @type boolean
             */
            try {
                support.dom = document.createDocumentFragment().nodeType === 11;
            } catch(e) {
                support.dom = false;
            }
        }(1, 0));

        /**
         * By default, the template delimiters used by lodash are like those in
         * embedded Ruby (ERB). Change the following template settings to use
         * alternative delimiters.
         *
         * @static
         * @memberOf _
         * @type Object
         */
        lodash.templateSettings = {

            /**
             * Used to detect `data` property values to be HTML-escaped.
             *
             * @memberOf _.templateSettings
             * @type RegExp
             */
            'escape': reEscape,

            /**
             * Used to detect code to be evaluated.
             *
             * @memberOf _.templateSettings
             * @type RegExp
             */
            'evaluate': reEvaluate,

            /**
             * Used to detect `data` property values to inject.
             *
             * @memberOf _.templateSettings
             * @type RegExp
             */
            'interpolate': reInterpolate,

            /**
             * Used to reference the data object in the template text.
             *
             * @memberOf _.templateSettings
             * @type string
             */
            'variable': '',

            /**
             * Used to import variables into the compiled template.
             *
             * @memberOf _.templateSettings
             * @type Object
             */
            'imports': {

                /**
                 * A reference to the `lodash` function.
                 *
                 * @memberOf _.templateSettings.imports
                 * @type Function
                 */
                '_': lodash
            }
        };

        /*------------------------------------------------------------------------*/

        /**
         * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
         *
         * @private
         * @param {*} value The value to wrap.
         */
        function LazyWrapper(value) {
            this.__wrapped__ = value;
            this.__actions__ = null;
            this.__dir__ = 1;
            this.__dropCount__ = 0;
            this.__filtered__ = false;
            this.__iteratees__ = null;
            this.__takeCount__ = POSITIVE_INFINITY;
            this.__views__ = null;
        }

        /**
         * Creates a clone of the lazy wrapper object.
         *
         * @private
         * @name clone
         * @memberOf LazyWrapper
         * @returns {Object} Returns the cloned `LazyWrapper` object.
         */
        function lazyClone() {
            var actions = this.__actions__,
                iteratees = this.__iteratees__,
                views = this.__views__,
                result = new LazyWrapper(this.__wrapped__);

            result.__actions__ = actions ? arrayCopy(actions) : null;
            result.__dir__ = this.__dir__;
            result.__filtered__ = this.__filtered__;
            result.__iteratees__ = iteratees ? arrayCopy(iteratees) : null;
            result.__takeCount__ = this.__takeCount__;
            result.__views__ = views ? arrayCopy(views) : null;
            return result;
        }

        /**
         * Reverses the direction of lazy iteration.
         *
         * @private
         * @name reverse
         * @memberOf LazyWrapper
         * @returns {Object} Returns the new reversed `LazyWrapper` object.
         */
        function lazyReverse() {
            if (this.__filtered__) {
                var result = new LazyWrapper(this);
                result.__dir__ = -1;
                result.__filtered__ = true;
            } else {
                result = this.clone();
                result.__dir__ *= -1;
            }
            return result;
        }

        /**
         * Extracts the unwrapped value from its lazy wrapper.
         *
         * @private
         * @name value
         * @memberOf LazyWrapper
         * @returns {*} Returns the unwrapped value.
         */
        function lazyValue() {
            var array = this.__wrapped__.value();
            if (!isArray(array)) {
                return baseWrapperValue(array, this.__actions__);
            }
            var dir = this.__dir__,
                isRight = dir < 0,
                view = getView(0, array.length, this.__views__),
                start = view.start,
                end = view.end,
                length = end - start,
                index = isRight ? end : (start - 1),
                takeCount = nativeMin(length, this.__takeCount__),
                iteratees = this.__iteratees__,
                iterLength = iteratees ? iteratees.length : 0,
                resIndex = 0,
                result = [];

            outer:
                while (length-- && resIndex < takeCount) {
                    index += dir;

                    var iterIndex = -1,
                        value = array[index];

                    while (++iterIndex < iterLength) {
                        var data = iteratees[iterIndex],
                            iteratee = data.iteratee,
                            type = data.type;

                        if (type == LAZY_DROP_WHILE_FLAG) {
                            if (data.done && (isRight ? (index > data.index) : (index < data.index))) {
                                data.count = 0;
                                data.done = false;
                            }
                            data.index = index;
                            if (!data.done) {
                                var limit = data.limit;
                                if (!(data.done = limit > -1 ? (data.count++ >= limit) : !iteratee(value))) {
                                    continue outer;
                                }
                            }
                        } else {
                            var computed = iteratee(value);
                            if (type == LAZY_MAP_FLAG) {
                                value = computed;
                            } else if (!computed) {
                                if (type == LAZY_FILTER_FLAG) {
                                    continue outer;
                                } else {
                                    break outer;
                                }
                            }
                        }
                    }
                    result[resIndex++] = value;
                }
            return result;
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates a cache object to store key/value pairs.
         *
         * @private
         * @static
         * @name Cache
         * @memberOf _.memoize
         */
        function MapCache() {
            this.__data__ = {};
        }

        /**
         * Removes `key` and its value from the cache.
         *
         * @private
         * @name delete
         * @memberOf _.memoize.Cache
         * @param {string} key The key of the value to remove.
         * @returns {boolean} Returns `true` if the entry was removed successfully, else `false`.
         */
        function mapDelete(key) {
            return this.has(key) && delete this.__data__[key];
        }

        /**
         * Gets the cached value for `key`.
         *
         * @private
         * @name get
         * @memberOf _.memoize.Cache
         * @param {string} key The key of the value to get.
         * @returns {*} Returns the cached value.
         */
        function mapGet(key) {
            return key == '__proto__' ? undefined : this.__data__[key];
        }

        /**
         * Checks if a cached value for `key` exists.
         *
         * @private
         * @name has
         * @memberOf _.memoize.Cache
         * @param {string} key The key of the entry to check.
         * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
         */
        function mapHas(key) {
            return key != '__proto__' && hasOwnProperty.call(this.__data__, key);
        }

        /**
         * Sets `value` to `key` of the cache.
         *
         * @private
         * @name set
         * @memberOf _.memoize.Cache
         * @param {string} key The key of the value to cache.
         * @param {*} value The value to cache.
         * @returns {Object} Returns the cache object.
         */
        function mapSet(key, value) {
            if (key != '__proto__') {
                this.__data__[key] = value;
            }
            return this;
        }

        /*------------------------------------------------------------------------*/

        /**
         *
         * Creates a cache object to store unique values.
         *
         * @private
         * @param {Array} [values] The values to cache.
         */
        function SetCache(values) {
            var length = values ? values.length : 0;

            this.data = { 'hash': nativeCreate(null), 'set': new Set };
            while (length--) {
                this.push(values[length]);
            }
        }

        /**
         * Checks if `value` is in `cache` mimicking the return signature of
         * `_.indexOf` by returning `0` if the value is found, else `-1`.
         *
         * @private
         * @param {Object} cache The cache to search.
         * @param {*} value The value to search for.
         * @returns {number} Returns `0` if `value` is found, else `-1`.
         */
        function cacheIndexOf(cache, value) {
            var data = cache.data,
                result = (typeof value == 'string' || isObject(value)) ? data.set.has(value) : data.hash[value];

            return result ? 0 : -1;
        }

        /**
         * Adds `value` to the cache.
         *
         * @private
         * @name push
         * @memberOf SetCache
         * @param {*} value The value to cache.
         */
        function cachePush(value) {
            var data = this.data;
            if (typeof value == 'string' || isObject(value)) {
                data.set.add(value);
            } else {
                data.hash[value] = true;
            }
        }

        /*------------------------------------------------------------------------*/

        /**
         * Copies the values of `source` to `array`.
         *
         * @private
         * @param {Array} source The array to copy values from.
         * @param {Array} [array=[]] The array to copy values to.
         * @returns {Array} Returns `array`.
         */
        function arrayCopy(source, array) {
            var index = -1,
                length = source.length;

            array || (array = Array(length));
            while (++index < length) {
                array[index] = source[index];
            }
            return array;
        }

        /**
         * A specialized version of `_.forEach` for arrays without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array} Returns `array`.
         */
        function arrayEach(array, iteratee) {
            var index = -1,
                length = array.length;

            while (++index < length) {
                if (iteratee(array[index], index, array) === false) {
                    break;
                }
            }
            return array;
        }

        /**
         * A specialized version of `_.forEachRight` for arrays without support for
         * callback shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array} Returns `array`.
         */
        function arrayEachRight(array, iteratee) {
            var length = array.length;

            while (length--) {
                if (iteratee(array[length], length, array) === false) {
                    break;
                }
            }
            return array;
        }

        /**
         * A specialized version of `_.every` for arrays without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {boolean} Returns `true` if all elements pass the predicate check,
         *  else `false`.
         */
        function arrayEvery(array, predicate) {
            var index = -1,
                length = array.length;

            while (++index < length) {
                if (!predicate(array[index], index, array)) {
                    return false;
                }
            }
            return true;
        }

        /**
         * A specialized version of `baseExtremum` for arrays which invokes `iteratee`
         * with one argument: (value).
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {Function} comparator The function used to compare values.
         * @param {*} exValue The initial extremum value.
         * @returns {*} Returns the extremum value.
         */
        function arrayExtremum(array, iteratee, comparator, exValue) {
            var index = -1,
                length = array.length,
                computed = exValue,
                result = computed;

            while (++index < length) {
                var value = array[index],
                    current = +iteratee(value);

                if (comparator(current, computed)) {
                    computed = current;
                    result = value;
                }
            }
            return result;
        }

        /**
         * A specialized version of `_.filter` for arrays without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {Array} Returns the new filtered array.
         */
        function arrayFilter(array, predicate) {
            var index = -1,
                length = array.length,
                resIndex = -1,
                result = [];

            while (++index < length) {
                var value = array[index];
                if (predicate(value, index, array)) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }

        /**
         * A specialized version of `_.map` for arrays without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array} Returns the new mapped array.
         */
        function arrayMap(array, iteratee) {
            var index = -1,
                length = array.length,
                result = Array(length);

            while (++index < length) {
                result[index] = iteratee(array[index], index, array);
            }
            return result;
        }

        /**
         * A specialized version of `_.reduce` for arrays without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {*} [accumulator] The initial value.
         * @param {boolean} [initFromArray] Specify using the first element of `array`
         *  as the initial value.
         * @returns {*} Returns the accumulated value.
         */
        function arrayReduce(array, iteratee, accumulator, initFromArray) {
            var index = -1,
                length = array.length;

            if (initFromArray && length) {
                accumulator = array[++index];
            }
            while (++index < length) {
                accumulator = iteratee(accumulator, array[index], index, array);
            }
            return accumulator;
        }

        /**
         * A specialized version of `_.reduceRight` for arrays without support for
         * callback shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {*} [accumulator] The initial value.
         * @param {boolean} [initFromArray] Specify using the last element of `array`
         *  as the initial value.
         * @returns {*} Returns the accumulated value.
         */
        function arrayReduceRight(array, iteratee, accumulator, initFromArray) {
            var length = array.length;
            if (initFromArray && length) {
                accumulator = array[--length];
            }
            while (length--) {
                accumulator = iteratee(accumulator, array[length], length, array);
            }
            return accumulator;
        }

        /**
         * A specialized version of `_.some` for arrays without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {boolean} Returns `true` if any element passes the predicate check,
         *  else `false`.
         */
        function arraySome(array, predicate) {
            var index = -1,
                length = array.length;

            while (++index < length) {
                if (predicate(array[index], index, array)) {
                    return true;
                }
            }
            return false;
        }

        /**
         * A specialized version of `_.sum` for arrays without support for iteratees.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @returns {number} Returns the sum.
         */
        function arraySum(array) {
            var length = array.length,
                result = 0;

            while (length--) {
                result += +array[length] || 0;
            }
            return result;
        }

        /**
         * Used by `_.defaults` to customize its `_.assign` use.
         *
         * @private
         * @param {*} objectValue The destination object property value.
         * @param {*} sourceValue The source object property value.
         * @returns {*} Returns the value to assign to the destination object.
         */
        function assignDefaults(objectValue, sourceValue) {
            return objectValue === undefined ? sourceValue : objectValue;
        }

        /**
         * Used by `_.template` to customize its `_.assign` use.
         *
         * **Note:** This function is like `assignDefaults` except that it ignores
         * inherited property values when checking if a property is `undefined`.
         *
         * @private
         * @param {*} objectValue The destination object property value.
         * @param {*} sourceValue The source object property value.
         * @param {string} key The key associated with the object and source values.
         * @param {Object} object The destination object.
         * @returns {*} Returns the value to assign to the destination object.
         */
        function assignOwnDefaults(objectValue, sourceValue, key, object) {
            return (objectValue === undefined || !hasOwnProperty.call(object, key))
                ? sourceValue
                : objectValue;
        }

        /**
         * A specialized version of `_.assign` for customizing assigned values without
         * support for argument juggling, multiple sources, and `this` binding `customizer`
         * functions.
         *
         * @private
         * @param {Object} object The destination object.
         * @param {Object} source The source object.
         * @param {Function} customizer The function to customize assigned values.
         * @returns {Object} Returns `object`.
         */
        function assignWith(object, source, customizer) {
            var index = -1,
                props = keys(source),
                length = props.length;

            while (++index < length) {
                var key = props[index],
                    value = object[key],
                    result = customizer(value, source[key], key, object, source);

                if ((result === result ? (result !== value) : (value === value)) ||
                    (value === undefined && !(key in object))) {
                    object[key] = result;
                }
            }
            return object;
        }

        /**
         * The base implementation of `_.assign` without support for argument juggling,
         * multiple sources, and `customizer` functions.
         *
         * @private
         * @param {Object} object The destination object.
         * @param {Object} source The source object.
         * @returns {Object} Returns `object`.
         */
        function baseAssign(object, source) {
            return source == null
                ? object
                : baseCopy(source, keys(source), object);
        }

        /**
         * The base implementation of `_.at` without support for string collections
         * and individual key arguments.
         *
         * @private
         * @param {Array|Object} collection The collection to iterate over.
         * @param {number[]|string[]} props The property names or indexes of elements to pick.
         * @returns {Array} Returns the new array of picked elements.
         */
        function baseAt(collection, props) {
            var index = -1,
                isNil = collection == null,
                isArr = !isNil && isArrayLike(collection),
                length = isArr ? collection.length : 0,
                propsLength = props.length,
                result = Array(propsLength);

            while(++index < propsLength) {
                var key = props[index];
                if (isArr) {
                    result[index] = isIndex(key, length) ? collection[key] : undefined;
                } else {
                    result[index] = isNil ? undefined : collection[key];
                }
            }
            return result;
        }

        /**
         * Copies properties of `source` to `object`.
         *
         * @private
         * @param {Object} source The object to copy properties from.
         * @param {Array} props The property names to copy.
         * @param {Object} [object={}] The object to copy properties to.
         * @returns {Object} Returns `object`.
         */
        function baseCopy(source, props, object) {
            object || (object = {});

            var index = -1,
                length = props.length;

            while (++index < length) {
                var key = props[index];
                object[key] = source[key];
            }
            return object;
        }

        /**
         * The base implementation of `_.callback` which supports specifying the
         * number of arguments to provide to `func`.
         *
         * @private
         * @param {*} [func=_.identity] The value to convert to a callback.
         * @param {*} [thisArg] The `this` binding of `func`.
         * @param {number} [argCount] The number of arguments to provide to `func`.
         * @returns {Function} Returns the callback.
         */
        function baseCallback(func, thisArg, argCount) {
            var type = typeof func;
            if (type == 'function') {
                return thisArg === undefined
                    ? func
                    : bindCallback(func, thisArg, argCount);
            }
            if (func == null) {
                return identity;
            }
            if (type == 'object') {
                return baseMatches(func);
            }
            return thisArg === undefined
                ? property(func)
                : baseMatchesProperty(func, thisArg);
        }

        /**
         * The base implementation of `_.clone` without support for argument juggling
         * and `this` binding `customizer` functions.
         *
         * @private
         * @param {*} value The value to clone.
         * @param {boolean} [isDeep] Specify a deep clone.
         * @param {Function} [customizer] The function to customize cloning values.
         * @param {string} [key] The key of `value`.
         * @param {Object} [object] The object `value` belongs to.
         * @param {Array} [stackA=[]] Tracks traversed source objects.
         * @param {Array} [stackB=[]] Associates clones with source counterparts.
         * @returns {*} Returns the cloned value.
         */
        function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
            var result;
            if (customizer) {
                result = object ? customizer(value, key, object) : customizer(value);
            }
            if (result !== undefined) {
                return result;
            }
            if (!isObject(value)) {
                return value;
            }
            var isArr = isArray(value);
            if (isArr) {
                result = initCloneArray(value);
                if (!isDeep) {
                    return arrayCopy(value, result);
                }
            } else {
                var tag = objToString.call(value),
                    isFunc = tag == funcTag;

                if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
                    result = initCloneObject(isFunc ? {} : value);
                    if (!isDeep) {
                        return baseAssign(result, value);
                    }
                } else {
                    return cloneableTags[tag]
                        ? initCloneByTag(value, tag, isDeep)
                        : (object ? value : {});
                }
            }
            // Check for circular references and return corresponding clone.
            stackA || (stackA = []);
            stackB || (stackB = []);

            var length = stackA.length;
            while (length--) {
                if (stackA[length] == value) {
                    return stackB[length];
                }
            }
            // Add the source value to the stack of traversed objects and associate it with its clone.
            stackA.push(value);
            stackB.push(result);

            // Recursively populate clone (susceptible to call stack limits).
            (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
                result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
            });
            return result;
        }

        /**
         * The base implementation of `_.create` without support for assigning
         * properties to the created object.
         *
         * @private
         * @param {Object} prototype The object to inherit from.
         * @returns {Object} Returns the new object.
         */
        var baseCreate = (function() {
            function object() {}
            return function(prototype) {
                if (isObject(prototype)) {
                    object.prototype = prototype;
                    var result = new object;
                    object.prototype = null;
                }
                return result || {};
            };
        }());

        /**
         * The base implementation of `_.delay` and `_.defer` which accepts an index
         * of where to slice the arguments to provide to `func`.
         *
         * @private
         * @param {Function} func The function to delay.
         * @param {number} wait The number of milliseconds to delay invocation.
         * @param {Object} args The arguments provide to `func`.
         * @returns {number} Returns the timer id.
         */
        function baseDelay(func, wait, args) {
            if (typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return setTimeout(function() { func.apply(undefined, args); }, wait);
        }

        /**
         * The base implementation of `_.difference` which accepts a single array
         * of values to exclude.
         *
         * @private
         * @param {Array} array The array to inspect.
         * @param {Array} values The values to exclude.
         * @returns {Array} Returns the new array of filtered values.
         */
        function baseDifference(array, values) {
            var length = array ? array.length : 0,
                result = [];

            if (!length) {
                return result;
            }
            var index = -1,
                indexOf = getIndexOf(),
                isCommon = indexOf == baseIndexOf,
                cache = (isCommon && values.length >= 200) ? createCache(values) : null,
                valuesLength = values.length;

            if (cache) {
                indexOf = cacheIndexOf;
                isCommon = false;
                values = cache;
            }
            outer:
                while (++index < length) {
                    var value = array[index];

                    if (isCommon && value === value) {
                        var valuesIndex = valuesLength;
                        while (valuesIndex--) {
                            if (values[valuesIndex] === value) {
                                continue outer;
                            }
                        }
                        result.push(value);
                    }
                    else if (indexOf(values, value, 0) < 0) {
                        result.push(value);
                    }
                }
            return result;
        }

        /**
         * The base implementation of `_.forEach` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array|Object|string} Returns `collection`.
         */
        var baseEach = createBaseEach(baseForOwn);

        /**
         * The base implementation of `_.forEachRight` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array|Object|string} Returns `collection`.
         */
        var baseEachRight = createBaseEach(baseForOwnRight, true);

        /**
         * The base implementation of `_.every` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {boolean} Returns `true` if all elements pass the predicate check,
         *  else `false`
         */
        function baseEvery(collection, predicate) {
            var result = true;
            baseEach(collection, function(value, index, collection) {
                result = !!predicate(value, index, collection);
                return result;
            });
            return result;
        }

        /**
         * Gets the extremum value of `collection` invoking `iteratee` for each value
         * in `collection` to generate the criterion by which the value is ranked.
         * The `iteratee` is invoked with three arguments: (value, index|key, collection).
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {Function} comparator The function used to compare values.
         * @param {*} exValue The initial extremum value.
         * @returns {*} Returns the extremum value.
         */
        function baseExtremum(collection, iteratee, comparator, exValue) {
            var computed = exValue,
                result = computed;

            baseEach(collection, function(value, index, collection) {
                var current = +iteratee(value, index, collection);
                if (comparator(current, computed) || (current === exValue && current === result)) {
                    computed = current;
                    result = value;
                }
            });
            return result;
        }

        /**
         * The base implementation of `_.fill` without an iteratee call guard.
         *
         * @private
         * @param {Array} array The array to fill.
         * @param {*} value The value to fill `array` with.
         * @param {number} [start=0] The start position.
         * @param {number} [end=array.length] The end position.
         * @returns {Array} Returns `array`.
         */
        function baseFill(array, value, start, end) {
            var length = array.length;

            start = start == null ? 0 : (+start || 0);
            if (start < 0) {
                start = -start > length ? 0 : (length + start);
            }
            end = (end === undefined || end > length) ? length : (+end || 0);
            if (end < 0) {
                end += length;
            }
            length = start > end ? 0 : (end >>> 0);
            start >>>= 0;

            while (start < length) {
                array[start++] = value;
            }
            return array;
        }

        /**
         * The base implementation of `_.filter` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {Array} Returns the new filtered array.
         */
        function baseFilter(collection, predicate) {
            var result = [];
            baseEach(collection, function(value, index, collection) {
                if (predicate(value, index, collection)) {
                    result.push(value);
                }
            });
            return result;
        }

        /**
         * The base implementation of `_.find`, `_.findLast`, `_.findKey`, and `_.findLastKey`,
         * without support for callback shorthands and `this` binding, which iterates
         * over `collection` using the provided `eachFunc`.
         *
         * @private
         * @param {Array|Object|string} collection The collection to search.
         * @param {Function} predicate The function invoked per iteration.
         * @param {Function} eachFunc The function to iterate over `collection`.
         * @param {boolean} [retKey] Specify returning the key of the found element
         *  instead of the element itself.
         * @returns {*} Returns the found element or its key, else `undefined`.
         */
        function baseFind(collection, predicate, eachFunc, retKey) {
            var result;
            eachFunc(collection, function(value, key, collection) {
                if (predicate(value, key, collection)) {
                    result = retKey ? key : value;
                    return false;
                }
            });
            return result;
        }

        /**
         * The base implementation of `_.flatten` with added support for restricting
         * flattening and specifying the start index.
         *
         * @private
         * @param {Array} array The array to flatten.
         * @param {boolean} [isDeep] Specify a deep flatten.
         * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
         * @returns {Array} Returns the new flattened array.
         */
        function baseFlatten(array, isDeep, isStrict) {
            var index = -1,
                length = array.length,
                resIndex = -1,
                result = [];

            while (++index < length) {
                var value = array[index];
                if (isObjectLike(value) && isArrayLike(value) &&
                    (isStrict || isArray(value) || isArguments(value))) {
                    if (isDeep) {
                        // Recursively flatten arrays (susceptible to call stack limits).
                        value = baseFlatten(value, isDeep, isStrict);
                    }
                    var valIndex = -1,
                        valLength = value.length;

                    while (++valIndex < valLength) {
                        result[++resIndex] = value[valIndex];
                    }
                } else if (!isStrict) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }

        /**
         * The base implementation of `baseForIn` and `baseForOwn` which iterates
         * over `object` properties returned by `keysFunc` invoking `iteratee` for
         * each property. Iteratee functions may exit iteration early by explicitly
         * returning `false`.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {Function} keysFunc The function to get the keys of `object`.
         * @returns {Object} Returns `object`.
         */
        var baseFor = createBaseFor();

        /**
         * This function is like `baseFor` except that it iterates over properties
         * in the opposite order.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {Function} keysFunc The function to get the keys of `object`.
         * @returns {Object} Returns `object`.
         */
        var baseForRight = createBaseFor(true);

        /**
         * The base implementation of `_.forIn` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Object} Returns `object`.
         */
        function baseForIn(object, iteratee) {
            return baseFor(object, iteratee, keysIn);
        }

        /**
         * The base implementation of `_.forOwn` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Object} Returns `object`.
         */
        function baseForOwn(object, iteratee) {
            return baseFor(object, iteratee, keys);
        }

        /**
         * The base implementation of `_.forOwnRight` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Object} Returns `object`.
         */
        function baseForOwnRight(object, iteratee) {
            return baseForRight(object, iteratee, keys);
        }

        /**
         * The base implementation of `_.functions` which creates an array of
         * `object` function property names filtered from those provided.
         *
         * @private
         * @param {Object} object The object to inspect.
         * @param {Array} props The property names to filter.
         * @returns {Array} Returns the new array of filtered property names.
         */
        function baseFunctions(object, props) {
            var index = -1,
                length = props.length,
                resIndex = -1,
                result = [];

            while (++index < length) {
                var key = props[index];
                if (isFunction(object[key])) {
                    result[++resIndex] = key;
                }
            }
            return result;
        }

        /**
         * The base implementation of `get` without support for string paths
         * and default values.
         *
         * @private
         * @param {Object} object The object to query.
         * @param {Array} path The path of the property to get.
         * @param {string} [pathKey] The key representation of path.
         * @returns {*} Returns the resolved value.
         */
        function baseGet(object, path, pathKey) {
            if (object == null) {
                return;
            }
            if (pathKey !== undefined && pathKey in toObject(object)) {
                path = [pathKey];
            }
            var index = 0,
                length = path.length;

            while (object != null && index < length) {
                object = object[path[index++]];
            }
            return (index && index == length) ? object : undefined;
        }

        /**
         * The base implementation of `_.isEqual` without support for `this` binding
         * `customizer` functions.
         *
         * @private
         * @param {*} value The value to compare.
         * @param {*} other The other value to compare.
         * @param {Function} [customizer] The function to customize comparing values.
         * @param {boolean} [isLoose] Specify performing partial comparisons.
         * @param {Array} [stackA] Tracks traversed `value` objects.
         * @param {Array} [stackB] Tracks traversed `other` objects.
         * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
         */
        function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
            if (value === other) {
                return true;
            }
            if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
                return value !== value && other !== other;
            }
            return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
        }

        /**
         * A specialized version of `baseIsEqual` for arrays and objects which performs
         * deep comparisons and tracks traversed objects enabling objects with circular
         * references to be compared.
         *
         * @private
         * @param {Object} object The object to compare.
         * @param {Object} other The other object to compare.
         * @param {Function} equalFunc The function to determine equivalents of values.
         * @param {Function} [customizer] The function to customize comparing objects.
         * @param {boolean} [isLoose] Specify performing partial comparisons.
         * @param {Array} [stackA=[]] Tracks traversed `value` objects.
         * @param {Array} [stackB=[]] Tracks traversed `other` objects.
         * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
         */
        function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
            var objIsArr = isArray(object),
                othIsArr = isArray(other),
                objTag = arrayTag,
                othTag = arrayTag;

            if (!objIsArr) {
                objTag = objToString.call(object);
                if (objTag == argsTag) {
                    objTag = objectTag;
                } else if (objTag != objectTag) {
                    objIsArr = isTypedArray(object);
                }
            }
            if (!othIsArr) {
                othTag = objToString.call(other);
                if (othTag == argsTag) {
                    othTag = objectTag;
                } else if (othTag != objectTag) {
                    othIsArr = isTypedArray(other);
                }
            }
            var objIsObj = objTag == objectTag,
                othIsObj = othTag == objectTag,
                isSameTag = objTag == othTag;

            if (isSameTag && !(objIsArr || objIsObj)) {
                return equalByTag(object, other, objTag);
            }
            if (!isLoose) {
                var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
                    othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

                if (objIsWrapped || othIsWrapped) {
                    return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
                }
            }
            if (!isSameTag) {
                return false;
            }
            // Assume cyclic values are equal.
            // For more information on detecting circular references see https://es5.github.io/#JO.
            stackA || (stackA = []);
            stackB || (stackB = []);

            var length = stackA.length;
            while (length--) {
                if (stackA[length] == object) {
                    return stackB[length] == other;
                }
            }
            // Add `object` and `other` to the stack of traversed objects.
            stackA.push(object);
            stackB.push(other);

            var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);

            stackA.pop();
            stackB.pop();

            return result;
        }

        /**
         * The base implementation of `_.isMatch` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Object} object The object to inspect.
         * @param {Array} matchData The propery names, values, and compare flags to match.
         * @param {Function} [customizer] The function to customize comparing objects.
         * @returns {boolean} Returns `true` if `object` is a match, else `false`.
         */
        function baseIsMatch(object, matchData, customizer) {
            var index = matchData.length,
                length = index,
                noCustomizer = !customizer;

            if (object == null) {
                return !length;
            }
            object = toObject(object);
            while (index--) {
                var data = matchData[index];
                if ((noCustomizer && data[2])
                        ? data[1] !== object[data[0]]
                        : !(data[0] in object)
                ) {
                    return false;
                }
            }
            while (++index < length) {
                data = matchData[index];
                var key = data[0],
                    objValue = object[key],
                    srcValue = data[1];

                if (noCustomizer && data[2]) {
                    if (objValue === undefined && !(key in object)) {
                        return false;
                    }
                } else {
                    var result = customizer ? customizer(objValue, srcValue, key) : undefined;
                    if (!(result === undefined ? baseIsEqual(srcValue, objValue, customizer, true) : result)) {
                        return false;
                    }
                }
            }
            return true;
        }

        /**
         * The base implementation of `_.map` without support for callback shorthands
         * and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array} Returns the new mapped array.
         */
        function baseMap(collection, iteratee) {
            var index = -1,
                result = isArrayLike(collection) ? Array(collection.length) : [];

            baseEach(collection, function(value, key, collection) {
                result[++index] = iteratee(value, key, collection);
            });
            return result;
        }

        /**
         * The base implementation of `_.matches` which does not clone `source`.
         *
         * @private
         * @param {Object} source The object of property values to match.
         * @returns {Function} Returns the new function.
         */
        function baseMatches(source) {
            var matchData = getMatchData(source);
            if (matchData.length == 1 && matchData[0][2]) {
                var key = matchData[0][0],
                    value = matchData[0][1];

                return function(object) {
                    if (object == null) {
                        return false;
                    }
                    return object[key] === value && (value !== undefined || (key in toObject(object)));
                };
            }
            return function(object) {
                return baseIsMatch(object, matchData);
            };
        }

        /**
         * The base implementation of `_.matchesProperty` which does not clone `srcValue`.
         *
         * @private
         * @param {string} path The path of the property to get.
         * @param {*} srcValue The value to compare.
         * @returns {Function} Returns the new function.
         */
        function baseMatchesProperty(path, srcValue) {
            var isArr = isArray(path),
                isCommon = isKey(path) && isStrictComparable(srcValue),
                pathKey = (path + '');

            path = toPath(path);
            return function(object) {
                if (object == null) {
                    return false;
                }
                var key = pathKey;
                object = toObject(object);
                if ((isArr || !isCommon) && !(key in object)) {
                    object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
                    if (object == null) {
                        return false;
                    }
                    key = last(path);
                    object = toObject(object);
                }
                return object[key] === srcValue
                    ? (srcValue !== undefined || (key in object))
                    : baseIsEqual(srcValue, object[key], undefined, true);
            };
        }

        /**
         * The base implementation of `_.merge` without support for argument juggling,
         * multiple sources, and `this` binding `customizer` functions.
         *
         * @private
         * @param {Object} object The destination object.
         * @param {Object} source The source object.
         * @param {Function} [customizer] The function to customize merging properties.
         * @param {Array} [stackA=[]] Tracks traversed source objects.
         * @param {Array} [stackB=[]] Associates values with source counterparts.
         * @returns {Object} Returns `object`.
         */
        function baseMerge(object, source, customizer, stackA, stackB) {
            if (!isObject(object)) {
                return object;
            }
            var isSrcArr = isArrayLike(source) && (isArray(source) || isTypedArray(source)),
                props = isSrcArr ? null : keys(source);

            arrayEach(props || source, function(srcValue, key) {
                if (props) {
                    key = srcValue;
                    srcValue = source[key];
                }
                if (isObjectLike(srcValue)) {
                    stackA || (stackA = []);
                    stackB || (stackB = []);
                    baseMergeDeep(object, source, key, baseMerge, customizer, stackA, stackB);
                }
                else {
                    var value = object[key],
                        result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
                        isCommon = result === undefined;

                    if (isCommon) {
                        result = srcValue;
                    }
                    if ((result !== undefined || (isSrcArr && !(key in object))) &&
                        (isCommon || (result === result ? (result !== value) : (value === value)))) {
                        object[key] = result;
                    }
                }
            });
            return object;
        }

        /**
         * A specialized version of `baseMerge` for arrays and objects which performs
         * deep merges and tracks traversed objects enabling objects with circular
         * references to be merged.
         *
         * @private
         * @param {Object} object The destination object.
         * @param {Object} source The source object.
         * @param {string} key The key of the value to merge.
         * @param {Function} mergeFunc The function to merge values.
         * @param {Function} [customizer] The function to customize merging properties.
         * @param {Array} [stackA=[]] Tracks traversed source objects.
         * @param {Array} [stackB=[]] Associates values with source counterparts.
         * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
         */
        function baseMergeDeep(object, source, key, mergeFunc, customizer, stackA, stackB) {
            var length = stackA.length,
                srcValue = source[key];

            while (length--) {
                if (stackA[length] == srcValue) {
                    object[key] = stackB[length];
                    return;
                }
            }
            var value = object[key],
                result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
                isCommon = result === undefined;

            if (isCommon) {
                result = srcValue;
                if (isArrayLike(srcValue) && (isArray(srcValue) || isTypedArray(srcValue))) {
                    result = isArray(value)
                        ? value
                        : (isArrayLike(value) ? arrayCopy(value) : []);
                }
                else if (isPlainObject(srcValue) || isArguments(srcValue)) {
                    result = isArguments(value)
                        ? toPlainObject(value)
                        : (isPlainObject(value) ? value : {});
                }
                else {
                    isCommon = false;
                }
            }
            // Add the source value to the stack of traversed objects and associate
            // it with its merged value.
            stackA.push(srcValue);
            stackB.push(result);

            if (isCommon) {
                // Recursively merge objects and arrays (susceptible to call stack limits).
                object[key] = mergeFunc(result, srcValue, customizer, stackA, stackB);
            } else if (result === result ? (result !== value) : (value === value)) {
                object[key] = result;
            }
        }

        /**
         * The base implementation of `_.property` without support for deep paths.
         *
         * @private
         * @param {string} key The key of the property to get.
         * @returns {Function} Returns the new function.
         */
        function baseProperty(key) {
            return function(object) {
                return object == null ? undefined : object[key];
            };
        }

        /**
         * A specialized version of `baseProperty` which supports deep paths.
         *
         * @private
         * @param {Array|string} path The path of the property to get.
         * @returns {Function} Returns the new function.
         */
        function basePropertyDeep(path) {
            var pathKey = (path + '');
            path = toPath(path);
            return function(object) {
                return baseGet(object, path, pathKey);
            };
        }

        /**
         * The base implementation of `_.pullAt` without support for individual
         * index arguments and capturing the removed elements.
         *
         * @private
         * @param {Array} array The array to modify.
         * @param {number[]} indexes The indexes of elements to remove.
         * @returns {Array} Returns `array`.
         */
        function basePullAt(array, indexes) {
            var length = array ? indexes.length : 0;
            while (length--) {
                var index = indexes[length];
                if (index != previous && isIndex(index)) {
                    var previous = index;
                    splice.call(array, index, 1);
                }
            }
            return array;
        }

        /**
         * The base implementation of `_.random` without support for argument juggling
         * and returning floating-point numbers.
         *
         * @private
         * @param {number} min The minimum possible value.
         * @param {number} max The maximum possible value.
         * @returns {number} Returns the random number.
         */
        function baseRandom(min, max) {
            return min + floor(nativeRandom() * (max - min + 1));
        }

        /**
         * The base implementation of `_.reduce` and `_.reduceRight` without support
         * for callback shorthands and `this` binding, which iterates over `collection`
         * using the provided `eachFunc`.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {*} accumulator The initial value.
         * @param {boolean} initFromCollection Specify using the first or last element
         *  of `collection` as the initial value.
         * @param {Function} eachFunc The function to iterate over `collection`.
         * @returns {*} Returns the accumulated value.
         */
        function baseReduce(collection, iteratee, accumulator, initFromCollection, eachFunc) {
            eachFunc(collection, function(value, index, collection) {
                accumulator = initFromCollection
                    ? (initFromCollection = false, value)
                    : iteratee(accumulator, value, index, collection);
            });
            return accumulator;
        }

        /**
         * The base implementation of `setData` without support for hot loop detection.
         *
         * @private
         * @param {Function} func The function to associate metadata with.
         * @param {*} data The metadata.
         * @returns {Function} Returns `func`.
         */
        var baseSetData = !metaMap ? identity : function(func, data) {
            metaMap.set(func, data);
            return func;
        };

        /**
         * The base implementation of `_.slice` without an iteratee call guard.
         *
         * @private
         * @param {Array} array The array to slice.
         * @param {number} [start=0] The start position.
         * @param {number} [end=array.length] The end position.
         * @returns {Array} Returns the slice of `array`.
         */
        function baseSlice(array, start, end) {
            var index = -1,
                length = array.length;

            start = start == null ? 0 : (+start || 0);
            if (start < 0) {
                start = -start > length ? 0 : (length + start);
            }
            end = (end === undefined || end > length) ? length : (+end || 0);
            if (end < 0) {
                end += length;
            }
            length = start > end ? 0 : ((end - start) >>> 0);
            start >>>= 0;

            var result = Array(length);
            while (++index < length) {
                result[index] = array[index + start];
            }
            return result;
        }

        /**
         * The base implementation of `_.some` without support for callback shorthands
         * and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {boolean} Returns `true` if any element passes the predicate check,
         *  else `false`.
         */
        function baseSome(collection, predicate) {
            var result;

            baseEach(collection, function(value, index, collection) {
                result = predicate(value, index, collection);
                return !result;
            });
            return !!result;
        }

        /**
         * The base implementation of `_.sortBy` which uses `comparer` to define
         * the sort order of `array` and replaces criteria objects with their
         * corresponding values.
         *
         * @private
         * @param {Array} array The array to sort.
         * @param {Function} comparer The function to define sort order.
         * @returns {Array} Returns `array`.
         */
        function baseSortBy(array, comparer) {
            var length = array.length;

            array.sort(comparer);
            while (length--) {
                array[length] = array[length].value;
            }
            return array;
        }

        /**
         * The base implementation of `_.sortByOrder` without param guards.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
         * @param {boolean[]} orders The sort orders of `iteratees`.
         * @returns {Array} Returns the new sorted array.
         */
        function baseSortByOrder(collection, iteratees, orders) {
            var callback = getCallback(),
                index = -1;

            iteratees = arrayMap(iteratees, function(iteratee) { return callback(iteratee); });

            var result = baseMap(collection, function(value) {
                var criteria = arrayMap(iteratees, function(iteratee) { return iteratee(value); });
                return { 'criteria': criteria, 'index': ++index, 'value': value };
            });

            return baseSortBy(result, function(object, other) {
                return compareMultiple(object, other, orders);
            });
        }

        /**
         * The base implementation of `_.sum` without support for callback shorthands
         * and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {number} Returns the sum.
         */
        function baseSum(collection, iteratee) {
            var result = 0;
            baseEach(collection, function(value, index, collection) {
                result += +iteratee(value, index, collection) || 0;
            });
            return result;
        }

        /**
         * The base implementation of `_.uniq` without support for callback shorthands
         * and `this` binding.
         *
         * @private
         * @param {Array} array The array to inspect.
         * @param {Function} [iteratee] The function invoked per iteration.
         * @returns {Array} Returns the new duplicate-value-free array.
         */
        function baseUniq(array, iteratee) {
            var index = -1,
                indexOf = getIndexOf(),
                length = array.length,
                isCommon = indexOf == baseIndexOf,
                isLarge = isCommon && length >= 200,
                seen = isLarge ? createCache() : null,
                result = [];

            if (seen) {
                indexOf = cacheIndexOf;
                isCommon = false;
            } else {
                isLarge = false;
                seen = iteratee ? [] : result;
            }
            outer:
                while (++index < length) {
                    var value = array[index],
                        computed = iteratee ? iteratee(value, index, array) : value;

                    if (isCommon && value === value) {
                        var seenIndex = seen.length;
                        while (seenIndex--) {
                            if (seen[seenIndex] === computed) {
                                continue outer;
                            }
                        }
                        if (iteratee) {
                            seen.push(computed);
                        }
                        result.push(value);
                    }
                    else if (indexOf(seen, computed, 0) < 0) {
                        if (iteratee || isLarge) {
                            seen.push(computed);
                        }
                        result.push(value);
                    }
                }
            return result;
        }

        /**
         * The base implementation of `_.values` and `_.valuesIn` which creates an
         * array of `object` property values corresponding to the property names
         * of `props`.
         *
         * @private
         * @param {Object} object The object to query.
         * @param {Array} props The property names to get values for.
         * @returns {Object} Returns the array of property values.
         */
        function baseValues(object, props) {
            var index = -1,
                length = props.length,
                result = Array(length);

            while (++index < length) {
                result[index] = object[props[index]];
            }
            return result;
        }

        /**
         * The base implementation of `_.dropRightWhile`, `_.dropWhile`, `_.takeRightWhile`,
         * and `_.takeWhile` without support for callback shorthands and `this` binding.
         *
         * @private
         * @param {Array} array The array to query.
         * @param {Function} predicate The function invoked per iteration.
         * @param {boolean} [isDrop] Specify dropping elements instead of taking them.
         * @param {boolean} [fromRight] Specify iterating from right to left.
         * @returns {Array} Returns the slice of `array`.
         */
        function baseWhile(array, predicate, isDrop, fromRight) {
            var length = array.length,
                index = fromRight ? length : -1;

            while ((fromRight ? index-- : ++index < length) && predicate(array[index], index, array)) {}
            return isDrop
                ? baseSlice(array, (fromRight ? 0 : index), (fromRight ? index + 1 : length))
                : baseSlice(array, (fromRight ? index + 1 : 0), (fromRight ? length : index));
        }

        /**
         * The base implementation of `wrapperValue` which returns the result of
         * performing a sequence of actions on the unwrapped `value`, where each
         * successive action is supplied the return value of the previous.
         *
         * @private
         * @param {*} value The unwrapped value.
         * @param {Array} actions Actions to peform to resolve the unwrapped value.
         * @returns {*} Returns the resolved value.
         */
        function baseWrapperValue(value, actions) {
            var result = value;
            if (result instanceof LazyWrapper) {
                result = result.value();
            }
            var index = -1,
                length = actions.length;

            while (++index < length) {
                var args = [result],
                    action = actions[index];

                push.apply(args, action.args);
                result = action.func.apply(action.thisArg, args);
            }
            return result;
        }

        /**
         * Performs a binary search of `array` to determine the index at which `value`
         * should be inserted into `array` in order to maintain its sort order.
         *
         * @private
         * @param {Array} array The sorted array to inspect.
         * @param {*} value The value to evaluate.
         * @param {boolean} [retHighest] Specify returning the highest qualified index.
         * @returns {number} Returns the index at which `value` should be inserted
         *  into `array`.
         */
        function binaryIndex(array, value, retHighest) {
            var low = 0,
                high = array ? array.length : low;

            if (typeof value == 'number' && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
                while (low < high) {
                    var mid = (low + high) >>> 1,
                        computed = array[mid];

                    if ((retHighest ? (computed <= value) : (computed < value)) && computed !== null) {
                        low = mid + 1;
                    } else {
                        high = mid;
                    }
                }
                return high;
            }
            return binaryIndexBy(array, value, identity, retHighest);
        }

        /**
         * This function is like `binaryIndex` except that it invokes `iteratee` for
         * `value` and each element of `array` to compute their sort ranking. The
         * iteratee is invoked with one argument; (value).
         *
         * @private
         * @param {Array} array The sorted array to inspect.
         * @param {*} value The value to evaluate.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {boolean} [retHighest] Specify returning the highest qualified index.
         * @returns {number} Returns the index at which `value` should be inserted
         *  into `array`.
         */
        function binaryIndexBy(array, value, iteratee, retHighest) {
            value = iteratee(value);

            var low = 0,
                high = array ? array.length : 0,
                valIsNaN = value !== value,
                valIsNull = value === null,
                valIsUndef = value === undefined;

            while (low < high) {
                var mid = floor((low + high) / 2),
                    computed = iteratee(array[mid]),
                    isDef = computed !== undefined,
                    isReflexive = computed === computed;

                if (valIsNaN) {
                    var setLow = isReflexive || retHighest;
                } else if (valIsNull) {
                    setLow = isReflexive && isDef && (retHighest || computed != null);
                } else if (valIsUndef) {
                    setLow = isReflexive && (retHighest || isDef);
                } else if (computed == null) {
                    setLow = false;
                } else {
                    setLow = retHighest ? (computed <= value) : (computed < value);
                }
                if (setLow) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            return nativeMin(high, MAX_ARRAY_INDEX);
        }

        /**
         * A specialized version of `baseCallback` which only supports `this` binding
         * and specifying the number of arguments to provide to `func`.
         *
         * @private
         * @param {Function} func The function to bind.
         * @param {*} thisArg The `this` binding of `func`.
         * @param {number} [argCount] The number of arguments to provide to `func`.
         * @returns {Function} Returns the callback.
         */
        function bindCallback(func, thisArg, argCount) {
            if (typeof func != 'function') {
                return identity;
            }
            if (thisArg === undefined) {
                return func;
            }
            switch (argCount) {
                case 1: return function(value) {
                    return func.call(thisArg, value);
                };
                case 3: return function(value, index, collection) {
                    return func.call(thisArg, value, index, collection);
                };
                case 4: return function(accumulator, value, index, collection) {
                    return func.call(thisArg, accumulator, value, index, collection);
                };
                case 5: return function(value, other, key, object, source) {
                    return func.call(thisArg, value, other, key, object, source);
                };
            }
            return function() {
                return func.apply(thisArg, arguments);
            };
        }

        /**
         * Creates a clone of the given array buffer.
         *
         * @private
         * @param {ArrayBuffer} buffer The array buffer to clone.
         * @returns {ArrayBuffer} Returns the cloned array buffer.
         */
        function bufferClone(buffer) {
            return bufferSlice.call(buffer, 0);
        }
        if (!bufferSlice) {
            // PhantomJS has `ArrayBuffer` and `Uint8Array` but not `Float64Array`.
            bufferClone = !(ArrayBuffer && Uint8Array) ? constant(null) : function(buffer) {
                var byteLength = buffer.byteLength,
                    floatLength = Float64Array ? floor(byteLength / FLOAT64_BYTES_PER_ELEMENT) : 0,
                    offset = floatLength * FLOAT64_BYTES_PER_ELEMENT,
                    result = new ArrayBuffer(byteLength);

                if (floatLength) {
                    var view = new Float64Array(result, 0, floatLength);
                    view.set(new Float64Array(buffer, 0, floatLength));
                }
                if (byteLength != offset) {
                    view = new Uint8Array(result, offset);
                    view.set(new Uint8Array(buffer, offset));
                }
                return result;
            };
        }

        /**
         * Creates an array that is the composition of partially applied arguments,
         * placeholders, and provided arguments into a single array of arguments.
         *
         * @private
         * @param {Array|Object} args The provided arguments.
         * @param {Array} partials The arguments to prepend to those provided.
         * @param {Array} holders The `partials` placeholder indexes.
         * @returns {Array} Returns the new array of composed arguments.
         */
        function composeArgs(args, partials, holders) {
            var holdersLength = holders.length,
                argsIndex = -1,
                argsLength = nativeMax(args.length - holdersLength, 0),
                leftIndex = -1,
                leftLength = partials.length,
                result = Array(argsLength + leftLength);

            while (++leftIndex < leftLength) {
                result[leftIndex] = partials[leftIndex];
            }
            while (++argsIndex < holdersLength) {
                result[holders[argsIndex]] = args[argsIndex];
            }
            while (argsLength--) {
                result[leftIndex++] = args[argsIndex++];
            }
            return result;
        }

        /**
         * This function is like `composeArgs` except that the arguments composition
         * is tailored for `_.partialRight`.
         *
         * @private
         * @param {Array|Object} args The provided arguments.
         * @param {Array} partials The arguments to append to those provided.
         * @param {Array} holders The `partials` placeholder indexes.
         * @returns {Array} Returns the new array of composed arguments.
         */
        function composeArgsRight(args, partials, holders) {
            var holdersIndex = -1,
                holdersLength = holders.length,
                argsIndex = -1,
                argsLength = nativeMax(args.length - holdersLength, 0),
                rightIndex = -1,
                rightLength = partials.length,
                result = Array(argsLength + rightLength);

            while (++argsIndex < argsLength) {
                result[argsIndex] = args[argsIndex];
            }
            var offset = argsIndex;
            while (++rightIndex < rightLength) {
                result[offset + rightIndex] = partials[rightIndex];
            }
            while (++holdersIndex < holdersLength) {
                result[offset + holders[holdersIndex]] = args[argsIndex++];
            }
            return result;
        }

        /**
         * Creates a function that aggregates a collection, creating an accumulator
         * object composed from the results of running each element in the collection
         * through an iteratee.
         *
         * **Note:** This function is used to create `_.countBy`, `_.groupBy`, `_.indexBy`,
         * and `_.partition`.
         *
         * @private
         * @param {Function} setter The function to set keys and values of the accumulator object.
         * @param {Function} [initializer] The function to initialize the accumulator object.
         * @returns {Function} Returns the new aggregator function.
         */
        function createAggregator(setter, initializer) {
            return function(collection, iteratee, thisArg) {
                var result = initializer ? initializer() : {};
                iteratee = getCallback(iteratee, thisArg, 3);

                if (isArray(collection)) {
                    var index = -1,
                        length = collection.length;

                    while (++index < length) {
                        var value = collection[index];
                        setter(result, value, iteratee(value, index, collection), collection);
                    }
                } else {
                    baseEach(collection, function(value, key, collection) {
                        setter(result, value, iteratee(value, key, collection), collection);
                    });
                }
                return result;
            };
        }

        /**
         * Creates a function that assigns properties of source object(s) to a given
         * destination object.
         *
         * **Note:** This function is used to create `_.assign`, `_.defaults`, and `_.merge`.
         *
         * @private
         * @param {Function} assigner The function to assign values.
         * @returns {Function} Returns the new assigner function.
         */
        function createAssigner(assigner) {
            return restParam(function(object, sources) {
                var index = -1,
                    length = object == null ? 0 : sources.length,
                    customizer = length > 2 ? sources[length - 2] : undefined,
                    guard = length > 2 ? sources[2] : undefined,
                    thisArg = length > 1 ? sources[length - 1] : undefined;

                if (typeof customizer == 'function') {
                    customizer = bindCallback(customizer, thisArg, 5);
                    length -= 2;
                } else {
                    customizer = typeof thisArg == 'function' ? thisArg : undefined;
                    length -= (customizer ? 1 : 0);
                }
                if (guard && isIterateeCall(sources[0], sources[1], guard)) {
                    customizer = length < 3 ? undefined : customizer;
                    length = 1;
                }
                while (++index < length) {
                    var source = sources[index];
                    if (source) {
                        assigner(object, source, customizer);
                    }
                }
                return object;
            });
        }

        /**
         * Creates a `baseEach` or `baseEachRight` function.
         *
         * @private
         * @param {Function} eachFunc The function to iterate over a collection.
         * @param {boolean} [fromRight] Specify iterating from right to left.
         * @returns {Function} Returns the new base function.
         */
        function createBaseEach(eachFunc, fromRight) {
            return function(collection, iteratee) {
                var length = collection ? getLength(collection) : 0;
                if (!isLength(length)) {
                    return eachFunc(collection, iteratee);
                }
                var index = fromRight ? length : -1,
                    iterable = toObject(collection);

                while ((fromRight ? index-- : ++index < length)) {
                    if (iteratee(iterable[index], index, iterable) === false) {
                        break;
                    }
                }
                return collection;
            };
        }

        /**
         * Creates a base function for `_.forIn` or `_.forInRight`.
         *
         * @private
         * @param {boolean} [fromRight] Specify iterating from right to left.
         * @returns {Function} Returns the new base function.
         */
        function createBaseFor(fromRight) {
            return function(object, iteratee, keysFunc) {
                var iterable = toObject(object),
                    props = keysFunc(object),
                    length = props.length,
                    index = fromRight ? length : -1;

                while ((fromRight ? index-- : ++index < length)) {
                    var key = props[index];
                    if (iteratee(iterable[key], key, iterable) === false) {
                        break;
                    }
                }
                return object;
            };
        }

        /**
         * Creates a function that wraps `func` and invokes it with the `this`
         * binding of `thisArg`.
         *
         * @private
         * @param {Function} func The function to bind.
         * @param {*} [thisArg] The `this` binding of `func`.
         * @returns {Function} Returns the new bound function.
         */
        function createBindWrapper(func, thisArg) {
            var Ctor = createCtorWrapper(func);

            function wrapper() {
                var fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
                return fn.apply(thisArg, arguments);
            }
            return wrapper;
        }

        /**
         * Creates a `Set` cache object to optimize linear searches of large arrays.
         *
         * @private
         * @param {Array} [values] The values to cache.
         * @returns {null|Object} Returns the new cache object if `Set` is supported, else `null`.
         */
        var createCache = !(nativeCreate && Set) ? constant(null) : function(values) {
            return new SetCache(values);
        };

        /**
         * Creates a function that produces compound words out of the words in a
         * given string.
         *
         * @private
         * @param {Function} callback The function to combine each word.
         * @returns {Function} Returns the new compounder function.
         */
        function createCompounder(callback) {
            return function(string) {
                var index = -1,
                    array = words(deburr(string)),
                    length = array.length,
                    result = '';

                while (++index < length) {
                    result = callback(result, array[index], index);
                }
                return result;
            };
        }

        /**
         * Creates a function that produces an instance of `Ctor` regardless of
         * whether it was invoked as part of a `new` expression or by `call` or `apply`.
         *
         * @private
         * @param {Function} Ctor The constructor to wrap.
         * @returns {Function} Returns the new wrapped function.
         */
        function createCtorWrapper(Ctor) {
            return function() {
                // Use a `switch` statement to work with class constructors.
                // See https://people.mozilla.org/~jorendorff/es6-draft.html#sec-ecmascript-function-objects-call-thisargument-argumentslist
                // for more details.
                var args = arguments;
                switch (args.length) {
                    case 0: return new Ctor;
                    case 1: return new Ctor(args[0]);
                    case 2: return new Ctor(args[0], args[1]);
                    case 3: return new Ctor(args[0], args[1], args[2]);
                    case 4: return new Ctor(args[0], args[1], args[2], args[3]);
                    case 5: return new Ctor(args[0], args[1], args[2], args[3], args[4]);
                }
                var thisBinding = baseCreate(Ctor.prototype),
                    result = Ctor.apply(thisBinding, args);

                // Mimic the constructor's `return` behavior.
                // See https://es5.github.io/#x13.2.2 for more details.
                return isObject(result) ? result : thisBinding;
            };
        }

        /**
         * Creates a `_.curry` or `_.curryRight` function.
         *
         * @private
         * @param {boolean} flag The curry bit flag.
         * @returns {Function} Returns the new curry function.
         */
        function createCurry(flag) {
            function curryFunc(func, arity, guard) {
                if (guard && isIterateeCall(func, arity, guard)) {
                    arity = null;
                }
                var result = createWrapper(func, flag, null, null, null, null, null, arity);
                result.placeholder = curryFunc.placeholder;
                return result;
            }
            return curryFunc;
        }

        /**
         * Creates a `_.max` or `_.min` function.
         *
         * @private
         * @param {Function} comparator The function used to compare values.
         * @param {*} exValue The initial extremum value.
         * @returns {Function} Returns the new extremum function.
         */
        function createExtremum(comparator, exValue) {
            return function(collection, iteratee, thisArg) {
                if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
                    iteratee = null;
                }
                iteratee = getCallback(iteratee, thisArg, 3);
                if (iteratee.length == 1) {
                    collection = toIterable(collection);
                    var result = arrayExtremum(collection, iteratee, comparator, exValue);
                    if (!(collection.length && result === exValue)) {
                        return result;
                    }
                }
                return baseExtremum(collection, iteratee, comparator, exValue);
            };
        }

        /**
         * Creates a `_.find` or `_.findLast` function.
         *
         * @private
         * @param {Function} eachFunc The function to iterate over a collection.
         * @param {boolean} [fromRight] Specify iterating from right to left.
         * @returns {Function} Returns the new find function.
         */
        function createFind(eachFunc, fromRight) {
            return function(collection, predicate, thisArg) {
                predicate = getCallback(predicate, thisArg, 3);
                if (isArray(collection)) {
                    var index = baseFindIndex(collection, predicate, fromRight);
                    return index > -1 ? collection[index] : undefined;
                }
                return baseFind(collection, predicate, eachFunc);
            };
        }

        /**
         * Creates a `_.findIndex` or `_.findLastIndex` function.
         *
         * @private
         * @param {boolean} [fromRight] Specify iterating from right to left.
         * @returns {Function} Returns the new find function.
         */
        function createFindIndex(fromRight) {
            return function(array, predicate, thisArg) {
                if (!(array && array.length)) {
                    return -1;
                }
                predicate = getCallback(predicate, thisArg, 3);
                return baseFindIndex(array, predicate, fromRight);
            };
        }

        /**
         * Creates a `_.findKey` or `_.findLastKey` function.
         *
         * @private
         * @param {Function} objectFunc The function to iterate over an object.
         * @returns {Function} Returns the new find function.
         */
        function createFindKey(objectFunc) {
            return function(object, predicate, thisArg) {
                predicate = getCallback(predicate, thisArg, 3);
                return baseFind(object, predicate, objectFunc, true);
            };
        }

        /**
         * Creates a `_.flow` or `_.flowRight` function.
         *
         * @private
         * @param {boolean} [fromRight] Specify iterating from right to left.
         * @returns {Function} Returns the new flow function.
         */
        function createFlow(fromRight) {
            return function() {
                var wrapper,
                    length = arguments.length,
                    index = fromRight ? length : -1,
                    leftIndex = 0,
                    funcs = Array(length);

                while ((fromRight ? index-- : ++index < length)) {
                    var func = funcs[leftIndex++] = arguments[index];
                    if (typeof func != 'function') {
                        throw new TypeError(FUNC_ERROR_TEXT);
                    }
                    if (!wrapper && LodashWrapper.prototype.thru && getFuncName(func) == 'wrapper') {
                        wrapper = new LodashWrapper([]);
                    }
                }
                index = wrapper ? -1 : length;
                while (++index < length) {
                    func = funcs[index];

                    var funcName = getFuncName(func),
                        data = funcName == 'wrapper' ? getData(func) : null;

                    if (data && isLaziable(data[0]) && data[1] == (ARY_FLAG | CURRY_FLAG | PARTIAL_FLAG | REARG_FLAG) && !data[4].length && data[9] == 1) {
                        wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
                    } else {
                        wrapper = (func.length == 1 && isLaziable(func)) ? wrapper[funcName]() : wrapper.thru(func);
                    }
                }
                return function() {
                    var args = arguments;
                    if (wrapper && args.length == 1 && isArray(args[0])) {
                        return wrapper.plant(args[0]).value();
                    }
                    var index = 0,
                        result = length ? funcs[index].apply(this, args) : args[0];

                    while (++index < length) {
                        result = funcs[index].call(this, result);
                    }
                    return result;
                };
            };
        }

        /**
         * Creates a function for `_.forEach` or `_.forEachRight`.
         *
         * @private
         * @param {Function} arrayFunc The function to iterate over an array.
         * @param {Function} eachFunc The function to iterate over a collection.
         * @returns {Function} Returns the new each function.
         */
        function createForEach(arrayFunc, eachFunc) {
            return function(collection, iteratee, thisArg) {
                return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection))
                    ? arrayFunc(collection, iteratee)
                    : eachFunc(collection, bindCallback(iteratee, thisArg, 3));
            };
        }

        /**
         * Creates a function for `_.forIn` or `_.forInRight`.
         *
         * @private
         * @param {Function} objectFunc The function to iterate over an object.
         * @returns {Function} Returns the new each function.
         */
        function createForIn(objectFunc) {
            return function(object, iteratee, thisArg) {
                if (typeof iteratee != 'function' || thisArg !== undefined) {
                    iteratee = bindCallback(iteratee, thisArg, 3);
                }
                return objectFunc(object, iteratee, keysIn);
            };
        }

        /**
         * Creates a function for `_.forOwn` or `_.forOwnRight`.
         *
         * @private
         * @param {Function} objectFunc The function to iterate over an object.
         * @returns {Function} Returns the new each function.
         */
        function createForOwn(objectFunc) {
            return function(object, iteratee, thisArg) {
                if (typeof iteratee != 'function' || thisArg !== undefined) {
                    iteratee = bindCallback(iteratee, thisArg, 3);
                }
                return objectFunc(object, iteratee);
            };
        }

        /**
         * Creates a function for `_.mapKeys` or `_.mapValues`.
         *
         * @private
         * @param {boolean} [isMapKeys] Specify mapping keys instead of values.
         * @returns {Function} Returns the new map function.
         */
        function createObjectMapper(isMapKeys) {
            return function(object, iteratee, thisArg) {
                var result = {};
                iteratee = getCallback(iteratee, thisArg, 3);

                baseForOwn(object, function(value, key, object) {
                    var mapped = iteratee(value, key, object);
                    key = isMapKeys ? mapped : key;
                    value = isMapKeys ? value : mapped;
                    result[key] = value;
                });
                return result;
            };
        }

        /**
         * Creates a function for `_.padLeft` or `_.padRight`.
         *
         * @private
         * @param {boolean} [fromRight] Specify padding from the right.
         * @returns {Function} Returns the new pad function.
         */
        function createPadDir(fromRight) {
            return function(string, length, chars) {
                string = baseToString(string);
                return (fromRight ? string : '') + createPadding(string, length, chars) + (fromRight ? '' : string);
            };
        }

        /**
         * Creates a `_.partial` or `_.partialRight` function.
         *
         * @private
         * @param {boolean} flag The partial bit flag.
         * @returns {Function} Returns the new partial function.
         */
        function createPartial(flag) {
            var partialFunc = restParam(function(func, partials) {
                var holders = replaceHolders(partials, partialFunc.placeholder);
                return createWrapper(func, flag, null, partials, holders);
            });
            return partialFunc;
        }

        /**
         * Creates a function for `_.reduce` or `_.reduceRight`.
         *
         * @private
         * @param {Function} arrayFunc The function to iterate over an array.
         * @param {Function} eachFunc The function to iterate over a collection.
         * @returns {Function} Returns the new each function.
         */
        function createReduce(arrayFunc, eachFunc) {
            return function(collection, iteratee, accumulator, thisArg) {
                var initFromArray = arguments.length < 3;
                return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection))
                    ? arrayFunc(collection, iteratee, accumulator, initFromArray)
                    : baseReduce(collection, getCallback(iteratee, thisArg, 4), accumulator, initFromArray, eachFunc);
            };
        }

        /**
         * Creates a function that wraps `func` and invokes it with optional `this`
         * binding of, partial application, and currying.
         *
         * @private
         * @param {Function|string} func The function or method name to reference.
         * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
         * @param {*} [thisArg] The `this` binding of `func`.
         * @param {Array} [partials] The arguments to prepend to those provided to the new function.
         * @param {Array} [holders] The `partials` placeholder indexes.
         * @param {Array} [partialsRight] The arguments to append to those provided to the new function.
         * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
         * @param {Array} [argPos] The argument positions of the new function.
         * @param {number} [ary] The arity cap of `func`.
         * @param {number} [arity] The arity of `func`.
         * @returns {Function} Returns the new wrapped function.
         */
        function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
            var isAry = bitmask & ARY_FLAG,
                isBind = bitmask & BIND_FLAG,
                isBindKey = bitmask & BIND_KEY_FLAG,
                isCurry = bitmask & CURRY_FLAG,
                isCurryBound = bitmask & CURRY_BOUND_FLAG,
                isCurryRight = bitmask & CURRY_RIGHT_FLAG,
                Ctor = isBindKey ? null : createCtorWrapper(func);

            function wrapper() {
                // Avoid `arguments` object use disqualifying optimizations by
                // converting it to an array before providing it to other functions.
                var length = arguments.length,
                    index = length,
                    args = Array(length);

                while (index--) {
                    args[index] = arguments[index];
                }
                if (partials) {
                    args = composeArgs(args, partials, holders);
                }
                if (partialsRight) {
                    args = composeArgsRight(args, partialsRight, holdersRight);
                }
                if (isCurry || isCurryRight) {
                    var placeholder = wrapper.placeholder,
                        argsHolders = replaceHolders(args, placeholder);

                    length -= argsHolders.length;
                    if (length < arity) {
                        var newArgPos = argPos ? arrayCopy(argPos) : null,
                            newArity = nativeMax(arity - length, 0),
                            newsHolders = isCurry ? argsHolders : null,
                            newHoldersRight = isCurry ? null : argsHolders,
                            newPartials = isCurry ? args : null,
                            newPartialsRight = isCurry ? null : args;

                        bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
                        bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);

                        if (!isCurryBound) {
                            bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
                        }
                        var newData = [func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, newArity],
                            result = createHybridWrapper.apply(undefined, newData);

                        if (isLaziable(func)) {
                            setData(result, newData);
                        }
                        result.placeholder = placeholder;
                        return result;
                    }
                }
                var thisBinding = isBind ? thisArg : this,
                    fn = isBindKey ? thisBinding[func] : func;

                if (argPos) {
                    args = reorder(args, argPos);
                }
                if (isAry && ary < args.length) {
                    args.length = ary;
                }
                if (this && this !== root && this instanceof wrapper) {
                    fn = Ctor || createCtorWrapper(func);
                }
                return fn.apply(thisBinding, args);
            }
            return wrapper;
        }

        /**
         * Creates the padding required for `string` based on the given `length`.
         * The `chars` string is truncated if the number of characters exceeds `length`.
         *
         * @private
         * @param {string} string The string to create padding for.
         * @param {number} [length=0] The padding length.
         * @param {string} [chars=' '] The string used as padding.
         * @returns {string} Returns the pad for `string`.
         */
        function createPadding(string, length, chars) {
            var strLength = string.length;
            length = +length;

            if (strLength >= length || !nativeIsFinite(length)) {
                return '';
            }
            var padLength = length - strLength;
            chars = chars == null ? ' ' : (chars + '');
            return repeat(chars, ceil(padLength / chars.length)).slice(0, padLength);
        }

        /**
         * Creates a function that wraps `func` and invokes it with the optional `this`
         * binding of `thisArg` and the `partials` prepended to those provided to
         * the wrapper.
         *
         * @private
         * @param {Function} func The function to partially apply arguments to.
         * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
         * @param {*} thisArg The `this` binding of `func`.
         * @param {Array} partials The arguments to prepend to those provided to the new function.
         * @returns {Function} Returns the new bound function.
         */
        function createPartialWrapper(func, bitmask, thisArg, partials) {
            var isBind = bitmask & BIND_FLAG,
                Ctor = createCtorWrapper(func);

            function wrapper() {
                // Avoid `arguments` object use disqualifying optimizations by
                // converting it to an array before providing it `func`.
                var argsIndex = -1,
                    argsLength = arguments.length,
                    leftIndex = -1,
                    leftLength = partials.length,
                    args = Array(argsLength + leftLength);

                while (++leftIndex < leftLength) {
                    args[leftIndex] = partials[leftIndex];
                }
                while (argsLength--) {
                    args[leftIndex++] = arguments[++argsIndex];
                }
                var fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
                return fn.apply(isBind ? thisArg : this, args);
            }
            return wrapper;
        }

        /**
         * Creates a `_.sortedIndex` or `_.sortedLastIndex` function.
         *
         * @private
         * @param {boolean} [retHighest] Specify returning the highest qualified index.
         * @returns {Function} Returns the new index function.
         */
        function createSortedIndex(retHighest) {
            return function(array, value, iteratee, thisArg) {
                var callback = getCallback(iteratee);
                return (iteratee == null && callback === baseCallback)
                    ? binaryIndex(array, value, retHighest)
                    : binaryIndexBy(array, value, callback(iteratee, thisArg, 1), retHighest);
            };
        }

        /**
         * Creates a function that either curries or invokes `func` with optional
         * `this` binding and partially applied arguments.
         *
         * @private
         * @param {Function|string} func The function or method name to reference.
         * @param {number} bitmask The bitmask of flags.
         *  The bitmask may be composed of the following flags:
         *     1 - `_.bind`
         *     2 - `_.bindKey`
         *     4 - `_.curry` or `_.curryRight` of a bound function
         *     8 - `_.curry`
         *    16 - `_.curryRight`
         *    32 - `_.partial`
         *    64 - `_.partialRight`
         *   128 - `_.rearg`
         *   256 - `_.ary`
         * @param {*} [thisArg] The `this` binding of `func`.
         * @param {Array} [partials] The arguments to be partially applied.
         * @param {Array} [holders] The `partials` placeholder indexes.
         * @param {Array} [argPos] The argument positions of the new function.
         * @param {number} [ary] The arity cap of `func`.
         * @param {number} [arity] The arity of `func`.
         * @returns {Function} Returns the new wrapped function.
         */
        function createWrapper(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
            var isBindKey = bitmask & BIND_KEY_FLAG;
            if (!isBindKey && typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            var length = partials ? partials.length : 0;
            if (!length) {
                bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
                partials = holders = null;
            }
            length -= (holders ? holders.length : 0);
            if (bitmask & PARTIAL_RIGHT_FLAG) {
                var partialsRight = partials,
                    holdersRight = holders;

                partials = holders = null;
            }
            var data = isBindKey ? null : getData(func),
                newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];

            if (data) {
                mergeData(newData, data);
                bitmask = newData[1];
                arity = newData[9];
            }
            newData[9] = arity == null
                ? (isBindKey ? 0 : func.length)
                : (nativeMax(arity - length, 0) || 0);

            if (bitmask == BIND_FLAG) {
                var result = createBindWrapper(newData[0], newData[2]);
            } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !newData[4].length) {
                result = createPartialWrapper.apply(undefined, newData);
            } else {
                result = createHybridWrapper.apply(undefined, newData);
            }
            var setter = data ? baseSetData : setData;
            return setter(result, newData);
        }

        /**
         * A specialized version of `baseIsEqualDeep` for arrays with support for
         * partial deep comparisons.
         *
         * @private
         * @param {Array} array The array to compare.
         * @param {Array} other The other array to compare.
         * @param {Function} equalFunc The function to determine equivalents of values.
         * @param {Function} [customizer] The function to customize comparing arrays.
         * @param {boolean} [isLoose] Specify performing partial comparisons.
         * @param {Array} [stackA] Tracks traversed `value` objects.
         * @param {Array} [stackB] Tracks traversed `other` objects.
         * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
         */
        function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
            var index = -1,
                arrLength = array.length,
                othLength = other.length;

            if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
                return false;
            }
            // Ignore non-index properties.
            while (++index < arrLength) {
                var arrValue = array[index],
                    othValue = other[index],
                    result = customizer ? customizer(isLoose ? othValue : arrValue, isLoose ? arrValue : othValue, index) : undefined;

                if (result !== undefined) {
                    if (result) {
                        continue;
                    }
                    return false;
                }
                // Recursively compare arrays (susceptible to call stack limits).
                if (isLoose) {
                    if (!arraySome(other, function(othValue) {
                            return arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
                        })) {
                        return false;
                    }
                } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB))) {
                    return false;
                }
            }
            return true;
        }

        /**
         * A specialized version of `baseIsEqualDeep` for comparing objects of
         * the same `toStringTag`.
         *
         * **Note:** This function only supports comparing values with tags of
         * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
         *
         * @private
         * @param {Object} value The object to compare.
         * @param {Object} other The other object to compare.
         * @param {string} tag The `toStringTag` of the objects to compare.
         * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
         */
        function equalByTag(object, other, tag) {
            switch (tag) {
                case boolTag:
                case dateTag:
                    // Coerce dates and booleans to numbers, dates to milliseconds and booleans
                    // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
                    return +object == +other;

                case errorTag:
                    return object.name == other.name && object.message == other.message;

                case numberTag:
                    // Treat `NaN` vs. `NaN` as equal.
                    return (object != +object)
                        ? other != +other
                        : object == +other;

                case regexpTag:
                case stringTag:
                    // Coerce regexes to strings and treat strings primitives and string
                    // objects as equal. See https://es5.github.io/#x15.10.6.4 for more details.
                    return object == (other + '');
            }
            return false;
        }

        /**
         * A specialized version of `baseIsEqualDeep` for objects with support for
         * partial deep comparisons.
         *
         * @private
         * @param {Object} object The object to compare.
         * @param {Object} other The other object to compare.
         * @param {Function} equalFunc The function to determine equivalents of values.
         * @param {Function} [customizer] The function to customize comparing values.
         * @param {boolean} [isLoose] Specify performing partial comparisons.
         * @param {Array} [stackA] Tracks traversed `value` objects.
         * @param {Array} [stackB] Tracks traversed `other` objects.
         * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
         */
        function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
            var objProps = keys(object),
                objLength = objProps.length,
                othProps = keys(other),
                othLength = othProps.length;

            if (objLength != othLength && !isLoose) {
                return false;
            }
            var index = objLength;
            while (index--) {
                var key = objProps[index];
                if (!(isLoose ? key in other : hasOwnProperty.call(other, key))) {
                    return false;
                }
            }
            var skipCtor = isLoose;
            while (++index < objLength) {
                key = objProps[index];
                var objValue = object[key],
                    othValue = other[key],
                    result = customizer ? customizer(isLoose ? othValue : objValue, isLoose? objValue : othValue, key) : undefined;

                // Recursively compare objects (susceptible to call stack limits).
                if (!(result === undefined ? equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB) : result)) {
                    return false;
                }
                skipCtor || (skipCtor = key == 'constructor');
            }
            if (!skipCtor) {
                var objCtor = object.constructor,
                    othCtor = other.constructor;

                // Non `Object` object instances with different constructors are not equal.
                if (objCtor != othCtor &&
                    ('constructor' in object && 'constructor' in other) &&
                    !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
                    typeof othCtor == 'function' && othCtor instanceof othCtor)) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Gets the appropriate "callback" function. If the `_.callback` method is
         * customized this function returns the custom method, otherwise it returns
         * the `baseCallback` function. If arguments are provided the chosen function
         * is invoked with them and its result is returned.
         *
         * @private
         * @returns {Function} Returns the chosen function or its result.
         */
        function getCallback(func, thisArg, argCount) {
            var result = lodash.callback || callback;
            result = result === callback ? baseCallback : result;
            return argCount ? result(func, thisArg, argCount) : result;
        }

        /**
         * Gets metadata for `func`.
         *
         * @private
         * @param {Function} func The function to query.
         * @returns {*} Returns the metadata for `func`.
         */
        var getData = !metaMap ? noop : function(func) {
            return metaMap.get(func);
        };

        /**
         * Gets the name of `func`.
         *
         * @private
         * @param {Function} func The function to query.
         * @returns {string} Returns the function name.
         */
        function getFuncName(func) {
            var result = func.name,
                array = realNames[result],
                length = array ? array.length : 0;

            while (length--) {
                var data = array[length],
                    otherFunc = data.func;
                if (otherFunc == null || otherFunc == func) {
                    return data.name;
                }
            }
            return result;
        }

        /**
         * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
         * customized this function returns the custom method, otherwise it returns
         * the `baseIndexOf` function. If arguments are provided the chosen function
         * is invoked with them and its result is returned.
         *
         * @private
         * @returns {Function|number} Returns the chosen function or its result.
         */
        function getIndexOf(collection, target, fromIndex) {
            var result = lodash.indexOf || indexOf;
            result = result === indexOf ? baseIndexOf : result;
            return collection ? result(collection, target, fromIndex) : result;
        }

        /**
         * Gets the "length" property value of `object`.
         *
         * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
         * that affects Safari on at least iOS 8.1-8.3 ARM64.
         *
         * @private
         * @param {Object} object The object to query.
         * @returns {*} Returns the "length" value.
         */
        var getLength = baseProperty('length');

        /**
         * Gets the propery names, values, and compare flags of `object`.
         *
         * @private
         * @param {Object} object The object to query.
         * @returns {Array} Returns the match data of `object`.
         */
        function getMatchData(object) {
            var result = pairs(object),
                length = result.length;

            while (length--) {
                result[length][2] = isStrictComparable(result[length][1]);
            }
            return result;
        }

        /**
         * Gets the native function at `key` of `object`.
         *
         * @private
         * @param {Object} object The object to query.
         * @param {string} key The key of the method to get.
         * @returns {*} Returns the function if it's native, else `undefined`.
         */
        function getNative(object, key) {
            var value = object == null ? undefined : object[key];
            return isNative(value) ? value : undefined;
        }

        /**
         * Gets the view, applying any `transforms` to the `start` and `end` positions.
         *
         * @private
         * @param {number} start The start of the view.
         * @param {number} end The end of the view.
         * @param {Array} [transforms] The transformations to apply to the view.
         * @returns {Object} Returns an object containing the `start` and `end`
         *  positions of the view.
         */
        function getView(start, end, transforms) {
            var index = -1,
                length = transforms ? transforms.length : 0;

            while (++index < length) {
                var data = transforms[index],
                    size = data.size;

                switch (data.type) {
                    case 'drop':      start += size; break;
                    case 'dropRight': end -= size; break;
                    case 'take':      end = nativeMin(end, start + size); break;
                    case 'takeRight': start = nativeMax(start, end - size); break;
                }
            }
            return { 'start': start, 'end': end };
        }

        /**
         * Initializes an array clone.
         *
         * @private
         * @param {Array} array The array to clone.
         * @returns {Array} Returns the initialized clone.
         */
        function initCloneArray(array) {
            var length = array.length,
                result = new array.constructor(length);

            // Add array properties assigned by `RegExp#exec`.
            if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
                result.index = array.index;
                result.input = array.input;
            }
            return result;
        }

        /**
         * Initializes an object clone.
         *
         * @private
         * @param {Object} object The object to clone.
         * @returns {Object} Returns the initialized clone.
         */
        function initCloneObject(object) {
            var Ctor = object.constructor;
            if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
                Ctor = Object;
            }
            return new Ctor;
        }

        /**
         * Initializes an object clone based on its `toStringTag`.
         *
         * **Note:** This function only supports cloning values with tags of
         * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
         *
         * @private
         * @param {Object} object The object to clone.
         * @param {string} tag The `toStringTag` of the object to clone.
         * @param {boolean} [isDeep] Specify a deep clone.
         * @returns {Object} Returns the initialized clone.
         */
        function initCloneByTag(object, tag, isDeep) {
            var Ctor = object.constructor;
            switch (tag) {
                case arrayBufferTag:
                    return bufferClone(object);

                case boolTag:
                case dateTag:
                    return new Ctor(+object);

                case float32Tag: case float64Tag:
                case int8Tag: case int16Tag: case int32Tag:
                case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
                var buffer = object.buffer;
                return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

                case numberTag:
                case stringTag:
                    return new Ctor(object);

                case regexpTag:
                    var result = new Ctor(object.source, reFlags.exec(object));
                    result.lastIndex = object.lastIndex;
            }
            return result;
        }

        /**
         * Invokes the method at `path` on `object`.
         *
         * @private
         * @param {Object} object The object to query.
         * @param {Array|string} path The path of the method to invoke.
         * @param {Array} args The arguments to invoke the method with.
         * @returns {*} Returns the result of the invoked method.
         */
        function invokePath(object, path, args) {
            if (object != null && !isKey(path, object)) {
                path = toPath(path);
                object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
                path = last(path);
            }
            var func = object == null ? object : object[path];
            return func == null ? undefined : func.apply(object, args);
        }

        /**
         * Checks if `value` is array-like.
         *
         * @private
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
         */
        function isArrayLike(value) {
            return value != null && isLength(getLength(value));
        }

        /**
         * Checks if `value` is a valid array-like index.
         *
         * @private
         * @param {*} value The value to check.
         * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
         * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
         */
        function isIndex(value, length) {
            value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
            length = length == null ? MAX_SAFE_INTEGER : length;
            return value > -1 && value % 1 == 0 && value < length;
        }

        /**
         * Checks if the provided arguments are from an iteratee call.
         *
         * @private
         * @param {*} value The potential iteratee value argument.
         * @param {*} index The potential iteratee index or key argument.
         * @param {*} object The potential iteratee object argument.
         * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
         */
        function isIterateeCall(value, index, object) {
            if (!isObject(object)) {
                return false;
            }
            var type = typeof index;
            if (type == 'number'
                    ? (isArrayLike(object) && isIndex(index, object.length))
                    : (type == 'string' && index in object)) {
                var other = object[index];
                return value === value ? (value === other) : (other !== other);
            }
            return false;
        }

        /**
         * Checks if `value` is a property name and not a property path.
         *
         * @private
         * @param {*} value The value to check.
         * @param {Object} [object] The object to query keys on.
         * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
         */
        function isKey(value, object) {
            var type = typeof value;
            if ((type == 'string' && reIsPlainProp.test(value)) || type == 'number') {
                return true;
            }
            if (isArray(value)) {
                return false;
            }
            var result = !reIsDeepProp.test(value);
            return result || (object != null && value in toObject(object));
        }

        /**
         * Checks if `func` has a lazy counterpart.
         *
         * @private
         * @param {Function} func The function to check.
         * @returns {boolean} Returns `true` if `func` has a lazy counterpart, else `false`.
         */
        function isLaziable(func) {
            var funcName = getFuncName(func);
            if (!(funcName in LazyWrapper.prototype)) {
                return false;
            }
            var other = lodash[funcName];
            if (func === other) {
                return true;
            }
            var data = getData(other);
            return !!data && func === data[0];
        }

        /**
         * Checks if `value` is a valid array-like length.
         *
         * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
         *
         * @private
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
         */
        function isLength(value) {
            return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }

        /**
         * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
         *
         * @private
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` if suitable for strict
         *  equality comparisons, else `false`.
         */
        function isStrictComparable(value) {
            return value === value && !isObject(value);
        }

        /**
         * Merges the function metadata of `source` into `data`.
         *
         * Merging metadata reduces the number of wrappers required to invoke a function.
         * This is possible because methods like `_.bind`, `_.curry`, and `_.partial`
         * may be applied regardless of execution order. Methods like `_.ary` and `_.rearg`
         * augment function arguments, making the order in which they are executed important,
         * preventing the merging of metadata. However, we make an exception for a safe
         * common case where curried functions have `_.ary` and or `_.rearg` applied.
         *
         * @private
         * @param {Array} data The destination metadata.
         * @param {Array} source The source metadata.
         * @returns {Array} Returns `data`.
         */
        function mergeData(data, source) {
            var bitmask = data[1],
                srcBitmask = source[1],
                newBitmask = bitmask | srcBitmask,
                isCommon = newBitmask < ARY_FLAG;

            var isCombo =
                (srcBitmask == ARY_FLAG && bitmask == CURRY_FLAG) ||
                (srcBitmask == ARY_FLAG && bitmask == REARG_FLAG && data[7].length <= source[8]) ||
                (srcBitmask == (ARY_FLAG | REARG_FLAG) && bitmask == CURRY_FLAG);

            // Exit early if metadata can't be merged.
            if (!(isCommon || isCombo)) {
                return data;
            }
            // Use source `thisArg` if available.
            if (srcBitmask & BIND_FLAG) {
                data[2] = source[2];
                // Set when currying a bound function.
                newBitmask |= (bitmask & BIND_FLAG) ? 0 : CURRY_BOUND_FLAG;
            }
            // Compose partial arguments.
            var value = source[3];
            if (value) {
                var partials = data[3];
                data[3] = partials ? composeArgs(partials, value, source[4]) : arrayCopy(value);
                data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : arrayCopy(source[4]);
            }
            // Compose partial right arguments.
            value = source[5];
            if (value) {
                partials = data[5];
                data[5] = partials ? composeArgsRight(partials, value, source[6]) : arrayCopy(value);
                data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : arrayCopy(source[6]);
            }
            // Use source `argPos` if available.
            value = source[7];
            if (value) {
                data[7] = arrayCopy(value);
            }
            // Use source `ary` if it's smaller.
            if (srcBitmask & ARY_FLAG) {
                data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
            }
            // Use source `arity` if one is not provided.
            if (data[9] == null) {
                data[9] = source[9];
            }
            // Use source `func` and merge bitmasks.
            data[0] = source[0];
            data[1] = newBitmask;

            return data;
        }

        /**
         * A specialized version of `_.pick` which picks `object` properties specified
         * by `props`.
         *
         * @private
         * @param {Object} object The source object.
         * @param {string[]} props The property names to pick.
         * @returns {Object} Returns the new object.
         */
        function pickByArray(object, props) {
            object = toObject(object);

            var index = -1,
                length = props.length,
                result = {};

            while (++index < length) {
                var key = props[index];
                if (key in object) {
                    result[key] = object[key];
                }
            }
            return result;
        }

        /**
         * A specialized version of `_.pick` which picks `object` properties `predicate`
         * returns truthy for.
         *
         * @private
         * @param {Object} object The source object.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {Object} Returns the new object.
         */
        function pickByCallback(object, predicate) {
            var result = {};
            baseForIn(object, function(value, key, object) {
                if (predicate(value, key, object)) {
                    result[key] = value;
                }
            });
            return result;
        }

        /**
         * Reorder `array` according to the specified indexes where the element at
         * the first index is assigned as the first element, the element at
         * the second index is assigned as the second element, and so on.
         *
         * @private
         * @param {Array} array The array to reorder.
         * @param {Array} indexes The arranged array indexes.
         * @returns {Array} Returns `array`.
         */
        function reorder(array, indexes) {
            var arrLength = array.length,
                length = nativeMin(indexes.length, arrLength),
                oldArray = arrayCopy(array);

            while (length--) {
                var index = indexes[length];
                array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
            }
            return array;
        }

        /**
         * Sets metadata for `func`.
         *
         * **Note:** If this function becomes hot, i.e. is invoked a lot in a short
         * period of time, it will trip its breaker and transition to an identity function
         * to avoid garbage collection pauses in V8. See [V8 issue 2070](https://code.google.com/p/v8/issues/detail?id=2070)
         * for more details.
         *
         * @private
         * @param {Function} func The function to associate metadata with.
         * @param {*} data The metadata.
         * @returns {Function} Returns `func`.
         */
        var setData = (function() {
            var count = 0,
                lastCalled = 0;

            return function(key, value) {
                var stamp = now(),
                    remaining = HOT_SPAN - (stamp - lastCalled);

                lastCalled = stamp;
                if (remaining > 0) {
                    if (++count >= HOT_COUNT) {
                        return key;
                    }
                } else {
                    count = 0;
                }
                return baseSetData(key, value);
            };
        }());

        /**
         * A fallback implementation of `_.isPlainObject` which checks if `value`
         * is an object created by the `Object` constructor or has a `[[Prototype]]`
         * of `null`.
         *
         * @private
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
         */
        function shimIsPlainObject(value) {
            var Ctor,
                support = lodash.support;

            // Exit early for non `Object` objects.
            if (!(isObjectLike(value) && objToString.call(value) == objectTag) ||
                (!hasOwnProperty.call(value, 'constructor') &&
                (Ctor = value.constructor, typeof Ctor == 'function' && !(Ctor instanceof Ctor)))) {
                return false;
            }
            // IE < 9 iterates inherited properties before own properties. If the first
            // iterated property is an object's own property then there are no inherited
            // enumerable properties.
            var result;
            // In most environments an object's own properties are iterated before
            // its inherited properties. If the last iterated property is an object's
            // own property then there are no inherited enumerable properties.
            baseForIn(value, function(subValue, key) {
                result = key;
            });
            return result === undefined || hasOwnProperty.call(value, result);
        }

        /**
         * A fallback implementation of `Object.keys` which creates an array of the
         * own enumerable property names of `object`.
         *
         * @private
         * @param {Object} object The object to query.
         * @returns {Array} Returns the array of property names.
         */
        function shimKeys(object) {
            var props = keysIn(object),
                propsLength = props.length,
                length = propsLength && object.length;

            var allowIndexes = !!length && isLength(length) &&
                (isArray(object) || isArguments(object));

            var index = -1,
                result = [];

            while (++index < propsLength) {
                var key = props[index];
                if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
                    result.push(key);
                }
            }
            return result;
        }

        /**
         * Converts `value` to an array-like object if it's not one.
         *
         * @private
         * @param {*} value The value to process.
         * @returns {Array|Object} Returns the array-like object.
         */
        function toIterable(value) {
            if (value == null) {
                return [];
            }
            if (!isArrayLike(value)) {
                return values(value);
            }
            return isObject(value) ? value : Object(value);
        }

        /**
         * Converts `value` to an object if it's not one.
         *
         * @private
         * @param {*} value The value to process.
         * @returns {Object} Returns the object.
         */
        function toObject(value) {
            return isObject(value) ? value : Object(value);
        }

        /**
         * Converts `value` to property path array if it's not one.
         *
         * @private
         * @param {*} value The value to process.
         * @returns {Array} Returns the property path array.
         */
        function toPath(value) {
            if (isArray(value)) {
                return value;
            }
            var result = [];
            baseToString(value).replace(rePropName, function(match, number, quote, string) {
                result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
            });
            return result;
        }

        /**
         * Creates a clone of `wrapper`.
         *
         * @private
         * @param {Object} wrapper The wrapper to clone.
         * @returns {Object} Returns the cloned wrapper.
         */
        function wrapperClone(wrapper) {
            return wrapper instanceof LazyWrapper
                ? wrapper.clone()
                : new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__, arrayCopy(wrapper.__actions__));
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates an array of elements split into groups the length of `size`.
         * If `collection` can't be split evenly, the final chunk will be the remaining
         * elements.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to process.
         * @param {number} [size=1] The length of each chunk.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the new array containing chunks.
         * @example
         *
         * _.chunk(['a', 'b', 'c', 'd'], 2);
         * // => [['a', 'b'], ['c', 'd']]
         *
         * _.chunk(['a', 'b', 'c', 'd'], 3);
         * // => [['a', 'b', 'c'], ['d']]
         */
        function chunk(array, size, guard) {
            if (guard ? isIterateeCall(array, size, guard) : size == null) {
                size = 1;
            } else {
                size = nativeMax(+size || 1, 1);
            }
            var index = 0,
                length = array ? array.length : 0,
                resIndex = -1,
                result = Array(ceil(length / size));

            while (index < length) {
                result[++resIndex] = baseSlice(array, index, (index += size));
            }
            return result;
        }

        /**
         * Creates an array with all falsey values removed. The values `false`, `null`,
         * `0`, `""`, `undefined`, and `NaN` are falsey.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to compact.
         * @returns {Array} Returns the new array of filtered values.
         * @example
         *
         * _.compact([0, 1, false, 2, '', 3]);
         * // => [1, 2, 3]
         */
        function compact(array) {
            var index = -1,
                length = array ? array.length : 0,
                resIndex = -1,
                result = [];

            while (++index < length) {
                var value = array[index];
                if (value) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }

        /**
         * Creates an array of unique `array` values not included in the other
         * provided arrays using [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for equality comparisons.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to inspect.
         * @param {...Array} [values] The arrays of values to exclude.
         * @returns {Array} Returns the new array of filtered values.
         * @example
         *
         * _.difference([1, 2, 3], [4, 2]);
         * // => [1, 3]
         */
        var difference = restParam(function(array, values) {
            return isArrayLike(array)
                ? baseDifference(array, baseFlatten(values, false, true))
                : [];
        });

        /**
         * Creates a slice of `array` with `n` elements dropped from the beginning.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @param {number} [n=1] The number of elements to drop.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.drop([1, 2, 3]);
         * // => [2, 3]
         *
         * _.drop([1, 2, 3], 2);
         * // => [3]
         *
         * _.drop([1, 2, 3], 5);
         * // => []
         *
         * _.drop([1, 2, 3], 0);
         * // => [1, 2, 3]
         */
        function drop(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            return baseSlice(array, n < 0 ? 0 : n);
        }

        /**
         * Creates a slice of `array` with `n` elements dropped from the end.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @param {number} [n=1] The number of elements to drop.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.dropRight([1, 2, 3]);
         * // => [1, 2]
         *
         * _.dropRight([1, 2, 3], 2);
         * // => [1]
         *
         * _.dropRight([1, 2, 3], 5);
         * // => []
         *
         * _.dropRight([1, 2, 3], 0);
         * // => [1, 2, 3]
         */
        function dropRight(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            n = length - (+n || 0);
            return baseSlice(array, 0, n < 0 ? 0 : n);
        }

        /**
         * Creates a slice of `array` excluding elements dropped from the end.
         * Elements are dropped until `predicate` returns falsey. The predicate is
         * bound to `thisArg` and invoked with three arguments: (value, index, array).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that match the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.dropRightWhile([1, 2, 3], function(n) {
     *   return n > 1;
     * });
         * // => [1]
         *
         * var users = [
         *   { 'user': 'barney',  'active': true },
         *   { 'user': 'fred',    'active': false },
         *   { 'user': 'pebbles', 'active': false }
         * ];
         *
         * // using the `_.matches` callback shorthand
         * _.pluck(_.dropRightWhile(users, { 'user': 'pebbles', 'active': false }), 'user');
         * // => ['barney', 'fred']
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.pluck(_.dropRightWhile(users, 'active', false), 'user');
         * // => ['barney']
         *
         * // using the `_.property` callback shorthand
         * _.pluck(_.dropRightWhile(users, 'active'), 'user');
         * // => ['barney', 'fred', 'pebbles']
         */
        function dropRightWhile(array, predicate, thisArg) {
            return (array && array.length)
                ? baseWhile(array, getCallback(predicate, thisArg, 3), true, true)
                : [];
        }

        /**
         * Creates a slice of `array` excluding elements dropped from the beginning.
         * Elements are dropped until `predicate` returns falsey. The predicate is
         * bound to `thisArg` and invoked with three arguments: (value, index, array).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.dropWhile([1, 2, 3], function(n) {
     *   return n < 3;
     * });
         * // => [3]
         *
         * var users = [
         *   { 'user': 'barney',  'active': false },
         *   { 'user': 'fred',    'active': false },
         *   { 'user': 'pebbles', 'active': true }
         * ];
         *
         * // using the `_.matches` callback shorthand
         * _.pluck(_.dropWhile(users, { 'user': 'barney', 'active': false }), 'user');
         * // => ['fred', 'pebbles']
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.pluck(_.dropWhile(users, 'active', false), 'user');
         * // => ['pebbles']
         *
         * // using the `_.property` callback shorthand
         * _.pluck(_.dropWhile(users, 'active'), 'user');
         * // => ['barney', 'fred', 'pebbles']
         */
        function dropWhile(array, predicate, thisArg) {
            return (array && array.length)
                ? baseWhile(array, getCallback(predicate, thisArg, 3), true)
                : [];
        }

        /**
         * Fills elements of `array` with `value` from `start` up to, but not
         * including, `end`.
         *
         * **Note:** This method mutates `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to fill.
         * @param {*} value The value to fill `array` with.
         * @param {number} [start=0] The start position.
         * @param {number} [end=array.length] The end position.
         * @returns {Array} Returns `array`.
         * @example
         *
         * var array = [1, 2, 3];
         *
         * _.fill(array, 'a');
         * console.log(array);
         * // => ['a', 'a', 'a']
         *
         * _.fill(Array(3), 2);
         * // => [2, 2, 2]
         *
         * _.fill([4, 6, 8], '*', 1, 2);
         * // => [4, '*', 8]
         */
        function fill(array, value, start, end) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (start && typeof start != 'number' && isIterateeCall(array, value, start)) {
                start = 0;
                end = length;
            }
            return baseFill(array, value, start, end);
        }

        /**
         * This method is like `_.find` except that it returns the index of the first
         * element `predicate` returns truthy for instead of the element itself.
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {number} Returns the index of the found element, else `-1`.
         * @example
         *
         * var users = [
         *   { 'user': 'barney',  'active': false },
         *   { 'user': 'fred',    'active': false },
         *   { 'user': 'pebbles', 'active': true }
         * ];
         *
         * _.findIndex(users, function(chr) {
     *   return chr.user == 'barney';
     * });
         * // => 0
         *
         * // using the `_.matches` callback shorthand
         * _.findIndex(users, { 'user': 'fred', 'active': false });
         * // => 1
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.findIndex(users, 'active', false);
         * // => 0
         *
         * // using the `_.property` callback shorthand
         * _.findIndex(users, 'active');
         * // => 2
         */
        var findIndex = createFindIndex();

        /**
         * This method is like `_.findIndex` except that it iterates over elements
         * of `collection` from right to left.
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {number} Returns the index of the found element, else `-1`.
         * @example
         *
         * var users = [
         *   { 'user': 'barney',  'active': true },
         *   { 'user': 'fred',    'active': false },
         *   { 'user': 'pebbles', 'active': false }
         * ];
         *
         * _.findLastIndex(users, function(chr) {
     *   return chr.user == 'pebbles';
     * });
         * // => 2
         *
         * // using the `_.matches` callback shorthand
         * _.findLastIndex(users, { 'user': 'barney', 'active': true });
         * // => 0
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.findLastIndex(users, 'active', false);
         * // => 2
         *
         * // using the `_.property` callback shorthand
         * _.findLastIndex(users, 'active');
         * // => 0
         */
        var findLastIndex = createFindIndex(true);

        /**
         * Gets the first element of `array`.
         *
         * @static
         * @memberOf _
         * @alias head
         * @category Array
         * @param {Array} array The array to query.
         * @returns {*} Returns the first element of `array`.
         * @example
         *
         * _.first([1, 2, 3]);
         * // => 1
         *
         * _.first([]);
         * // => undefined
         */
        function first(array) {
            return array ? array[0] : undefined;
        }

        /**
         * Flattens a nested array. If `isDeep` is `true` the array is recursively
         * flattened, otherwise it is only flattened a single level.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to flatten.
         * @param {boolean} [isDeep] Specify a deep flatten.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the new flattened array.
         * @example
         *
         * _.flatten([1, [2, 3, [4]]]);
         * // => [1, 2, 3, [4]]
         *
         * // using `isDeep`
         * _.flatten([1, [2, 3, [4]]], true);
         * // => [1, 2, 3, 4]
         */
        function flatten(array, isDeep, guard) {
            var length = array ? array.length : 0;
            if (guard && isIterateeCall(array, isDeep, guard)) {
                isDeep = false;
            }
            return length ? baseFlatten(array, isDeep) : [];
        }

        /**
         * Recursively flattens a nested array.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to recursively flatten.
         * @returns {Array} Returns the new flattened array.
         * @example
         *
         * _.flattenDeep([1, [2, 3, [4]]]);
         * // => [1, 2, 3, 4]
         */
        function flattenDeep(array) {
            var length = array ? array.length : 0;
            return length ? baseFlatten(array, true) : [];
        }

        /**
         * Gets the index at which the first occurrence of `value` is found in `array`
         * using [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for equality comparisons. If `fromIndex` is negative, it is used as the offset
         * from the end of `array`. If `array` is sorted providing `true` for `fromIndex`
         * performs a faster binary search.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to search.
         * @param {*} value The value to search for.
         * @param {boolean|number} [fromIndex=0] The index to search from or `true`
         *  to perform a binary search on a sorted array.
         * @returns {number} Returns the index of the matched value, else `-1`.
         * @example
         *
         * _.indexOf([1, 2, 1, 2], 2);
         * // => 1
         *
         * // using `fromIndex`
         * _.indexOf([1, 2, 1, 2], 2, 2);
         * // => 3
         *
         * // performing a binary search
         * _.indexOf([1, 1, 2, 2], 2, true);
         * // => 2
         */
        function indexOf(array, value, fromIndex) {
            var length = array ? array.length : 0;
            if (!length) {
                return -1;
            }
            if (typeof fromIndex == 'number') {
                fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : fromIndex;
            } else if (fromIndex) {
                var index = binaryIndex(array, value),
                    other = array[index];

                if (value === value ? (value === other) : (other !== other)) {
                    return index;
                }
                return -1;
            }
            return baseIndexOf(array, value, fromIndex || 0);
        }

        /**
         * Gets all but the last element of `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.initial([1, 2, 3]);
         * // => [1, 2]
         */
        function initial(array) {
            return dropRight(array, 1);
        }

        /**
         * Creates an array of unique values that are included in all of the provided
         * arrays using [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for equality comparisons.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to inspect.
         * @returns {Array} Returns the new array of shared values.
         * @example
         * _.intersection([1, 2], [4, 2], [2, 1]);
         * // => [2]
         */
        var intersection = restParam(function(arrays) {
            var othLength = arrays.length,
                othIndex = othLength,
                caches = Array(length),
                indexOf = getIndexOf(),
                isCommon = indexOf == baseIndexOf,
                result = [];

            while (othIndex--) {
                var value = arrays[othIndex] = isArrayLike(value = arrays[othIndex]) ? value : [];
                caches[othIndex] = (isCommon && value.length >= 120) ? createCache(othIndex && value) : null;
            }
            var array = arrays[0],
                index = -1,
                length = array ? array.length : 0,
                seen = caches[0];

            outer:
                while (++index < length) {
                    value = array[index];
                    if ((seen ? cacheIndexOf(seen, value) : indexOf(result, value, 0)) < 0) {
                        var othIndex = othLength;
                        while (--othIndex) {
                            var cache = caches[othIndex];
                            if ((cache ? cacheIndexOf(cache, value) : indexOf(arrays[othIndex], value, 0)) < 0) {
                                continue outer;
                            }
                        }
                        if (seen) {
                            seen.push(value);
                        }
                        result.push(value);
                    }
                }
            return result;
        });

        /**
         * Gets the last element of `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @returns {*} Returns the last element of `array`.
         * @example
         *
         * _.last([1, 2, 3]);
         * // => 3
         */
        function last(array) {
            var length = array ? array.length : 0;
            return length ? array[length - 1] : undefined;
        }

        /**
         * This method is like `_.indexOf` except that it iterates over elements of
         * `array` from right to left.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to search.
         * @param {*} value The value to search for.
         * @param {boolean|number} [fromIndex=array.length-1] The index to search from
         *  or `true` to perform a binary search on a sorted array.
         * @returns {number} Returns the index of the matched value, else `-1`.
         * @example
         *
         * _.lastIndexOf([1, 2, 1, 2], 2);
         * // => 3
         *
         * // using `fromIndex`
         * _.lastIndexOf([1, 2, 1, 2], 2, 2);
         * // => 1
         *
         * // performing a binary search
         * _.lastIndexOf([1, 1, 2, 2], 2, true);
         * // => 3
         */
        function lastIndexOf(array, value, fromIndex) {
            var length = array ? array.length : 0;
            if (!length) {
                return -1;
            }
            var index = length;
            if (typeof fromIndex == 'number') {
                index = (fromIndex < 0 ? nativeMax(length + fromIndex, 0) : nativeMin(fromIndex || 0, length - 1)) + 1;
            } else if (fromIndex) {
                index = binaryIndex(array, value, true) - 1;
                var other = array[index];
                if (value === value ? (value === other) : (other !== other)) {
                    return index;
                }
                return -1;
            }
            if (value !== value) {
                return indexOfNaN(array, index, true);
            }
            while (index--) {
                if (array[index] === value) {
                    return index;
                }
            }
            return -1;
        }

        /**
         * Removes all provided values from `array` using
         * [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for equality comparisons.
         *
         * **Note:** Unlike `_.without`, this method mutates `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to modify.
         * @param {...*} [values] The values to remove.
         * @returns {Array} Returns `array`.
         * @example
         *
         * var array = [1, 2, 3, 1, 2, 3];
         *
         * _.pull(array, 2, 3);
         * console.log(array);
         * // => [1, 1]
         */
        function pull() {
            var args = arguments,
                array = args[0];

            if (!(array && array.length)) {
                return array;
            }
            var index = 0,
                indexOf = getIndexOf(),
                length = args.length;

            while (++index < length) {
                var fromIndex = 0,
                    value = args[index];

                while ((fromIndex = indexOf(array, value, fromIndex)) > -1) {
                    splice.call(array, fromIndex, 1);
                }
            }
            return array;
        }

        /**
         * Removes elements from `array` corresponding to the given indexes and returns
         * an array of the removed elements. Indexes may be specified as an array of
         * indexes or as individual arguments.
         *
         * **Note:** Unlike `_.at`, this method mutates `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to modify.
         * @param {...(number|number[])} [indexes] The indexes of elements to remove,
         *  specified as individual indexes or arrays of indexes.
         * @returns {Array} Returns the new array of removed elements.
         * @example
         *
         * var array = [5, 10, 15, 20];
         * var evens = _.pullAt(array, 1, 3);
         *
         * console.log(array);
         * // => [5, 15]
         *
         * console.log(evens);
         * // => [10, 20]
         */
        var pullAt = restParam(function(array, indexes) {
            indexes = baseFlatten(indexes);

            var result = baseAt(array, indexes);
            basePullAt(array, indexes.sort(baseCompareAscending));
            return result;
        });

        /**
         * Removes all elements from `array` that `predicate` returns truthy for
         * and returns an array of the removed elements. The predicate is bound to
         * `thisArg` and invoked with three arguments: (value, index, array).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * **Note:** Unlike `_.filter`, this method mutates `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to modify.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the new array of removed elements.
         * @example
         *
         * var array = [1, 2, 3, 4];
         * var evens = _.remove(array, function(n) {
     *   return n % 2 == 0;
     * });
         *
         * console.log(array);
         * // => [1, 3]
         *
         * console.log(evens);
         * // => [2, 4]
         */
        function remove(array, predicate, thisArg) {
            var result = [];
            if (!(array && array.length)) {
                return result;
            }
            var index = -1,
                indexes = [],
                length = array.length;

            predicate = getCallback(predicate, thisArg, 3);
            while (++index < length) {
                var value = array[index];
                if (predicate(value, index, array)) {
                    result.push(value);
                    indexes.push(index);
                }
            }
            basePullAt(array, indexes);
            return result;
        }

        /**
         * Gets all but the first element of `array`.
         *
         * @static
         * @memberOf _
         * @alias tail
         * @category Array
         * @param {Array} array The array to query.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.rest([1, 2, 3]);
         * // => [2, 3]
         */
        function rest(array) {
            return drop(array, 1);
        }

        /**
         * Creates a slice of `array` from `start` up to, but not including, `end`.
         *
         * **Note:** This method is used instead of `Array#slice` to support node
         * lists in IE < 9 and to ensure dense arrays are returned.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to slice.
         * @param {number} [start=0] The start position.
         * @param {number} [end=array.length] The end position.
         * @returns {Array} Returns the slice of `array`.
         */
        function slice(array, start, end) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (end && typeof end != 'number' && isIterateeCall(array, start, end)) {
                start = 0;
                end = length;
            }
            return baseSlice(array, start, end);
        }

        /**
         * Uses a binary search to determine the lowest index at which `value` should
         * be inserted into `array` in order to maintain its sort order. If an iteratee
         * function is provided it is invoked for `value` and each element of `array`
         * to compute their sort ranking. The iteratee is bound to `thisArg` and
         * invoked with one argument; (value).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The sorted array to inspect.
         * @param {*} value The value to evaluate.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {number} Returns the index at which `value` should be inserted
         *  into `array`.
         * @example
         *
         * _.sortedIndex([30, 50], 40);
         * // => 1
         *
         * _.sortedIndex([4, 4, 5, 5], 5);
         * // => 2
         *
         * var dict = { 'data': { 'thirty': 30, 'forty': 40, 'fifty': 50 } };
         *
         * // using an iteratee function
         * _.sortedIndex(['thirty', 'fifty'], 'forty', function(word) {
     *   return this.data[word];
     * }, dict);
         * // => 1
         *
         * // using the `_.property` callback shorthand
         * _.sortedIndex([{ 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
         * // => 1
         */
        var sortedIndex = createSortedIndex();

        /**
         * This method is like `_.sortedIndex` except that it returns the highest
         * index at which `value` should be inserted into `array` in order to
         * maintain its sort order.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The sorted array to inspect.
         * @param {*} value The value to evaluate.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {number} Returns the index at which `value` should be inserted
         *  into `array`.
         * @example
         *
         * _.sortedLastIndex([4, 4, 5, 5], 5);
         * // => 4
         */
        var sortedLastIndex = createSortedIndex(true);

        /**
         * Creates a slice of `array` with `n` elements taken from the beginning.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @param {number} [n=1] The number of elements to take.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.take([1, 2, 3]);
         * // => [1]
         *
         * _.take([1, 2, 3], 2);
         * // => [1, 2]
         *
         * _.take([1, 2, 3], 5);
         * // => [1, 2, 3]
         *
         * _.take([1, 2, 3], 0);
         * // => []
         */
        function take(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            return baseSlice(array, 0, n < 0 ? 0 : n);
        }

        /**
         * Creates a slice of `array` with `n` elements taken from the end.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @param {number} [n=1] The number of elements to take.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.takeRight([1, 2, 3]);
         * // => [3]
         *
         * _.takeRight([1, 2, 3], 2);
         * // => [2, 3]
         *
         * _.takeRight([1, 2, 3], 5);
         * // => [1, 2, 3]
         *
         * _.takeRight([1, 2, 3], 0);
         * // => []
         */
        function takeRight(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            n = length - (+n || 0);
            return baseSlice(array, n < 0 ? 0 : n);
        }

        /**
         * Creates a slice of `array` with elements taken from the end. Elements are
         * taken until `predicate` returns falsey. The predicate is bound to `thisArg`
         * and invoked with three arguments: (value, index, array).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.takeRightWhile([1, 2, 3], function(n) {
     *   return n > 1;
     * });
         * // => [2, 3]
         *
         * var users = [
         *   { 'user': 'barney',  'active': true },
         *   { 'user': 'fred',    'active': false },
         *   { 'user': 'pebbles', 'active': false }
         * ];
         *
         * // using the `_.matches` callback shorthand
         * _.pluck(_.takeRightWhile(users, { 'user': 'pebbles', 'active': false }), 'user');
         * // => ['pebbles']
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.pluck(_.takeRightWhile(users, 'active', false), 'user');
         * // => ['fred', 'pebbles']
         *
         * // using the `_.property` callback shorthand
         * _.pluck(_.takeRightWhile(users, 'active'), 'user');
         * // => []
         */
        function takeRightWhile(array, predicate, thisArg) {
            return (array && array.length)
                ? baseWhile(array, getCallback(predicate, thisArg, 3), false, true)
                : [];
        }

        /**
         * Creates a slice of `array` with elements taken from the beginning. Elements
         * are taken until `predicate` returns falsey. The predicate is bound to
         * `thisArg` and invoked with three arguments: (value, index, array).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.takeWhile([1, 2, 3], function(n) {
     *   return n < 3;
     * });
         * // => [1, 2]
         *
         * var users = [
         *   { 'user': 'barney',  'active': false },
         *   { 'user': 'fred',    'active': false},
         *   { 'user': 'pebbles', 'active': true }
         * ];
         *
         * // using the `_.matches` callback shorthand
         * _.pluck(_.takeWhile(users, { 'user': 'barney', 'active': false }), 'user');
         * // => ['barney']
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.pluck(_.takeWhile(users, 'active', false), 'user');
         * // => ['barney', 'fred']
         *
         * // using the `_.property` callback shorthand
         * _.pluck(_.takeWhile(users, 'active'), 'user');
         * // => []
         */
        function takeWhile(array, predicate, thisArg) {
            return (array && array.length)
                ? baseWhile(array, getCallback(predicate, thisArg, 3))
                : [];
        }

        /**
         * Creates an array of unique values, in order, from all of the provided arrays
         * using [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for equality comparisons.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to inspect.
         * @returns {Array} Returns the new array of combined values.
         * @example
         *
         * _.union([1, 2], [4, 2], [2, 1]);
         * // => [1, 2, 4]
         */
        var union = restParam(function(arrays) {
            return baseUniq(baseFlatten(arrays, false, true));
        });

        /**
         * Creates a duplicate-free version of an array, using
         * [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for equality comparisons, in which only the first occurence of each element
         * is kept. Providing `true` for `isSorted` performs a faster search algorithm
         * for sorted arrays. If an iteratee function is provided it is invoked for
         * each element in the array to generate the criterion by which uniqueness
         * is computed. The `iteratee` is bound to `thisArg` and invoked with three
         * arguments: (value, index, array).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias unique
         * @category Array
         * @param {Array} array The array to inspect.
         * @param {boolean} [isSorted] Specify the array is sorted.
         * @param {Function|Object|string} [iteratee] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the new duplicate-value-free array.
         * @example
         *
         * _.uniq([2, 1, 2]);
         * // => [2, 1]
         *
         * // using `isSorted`
         * _.uniq([1, 1, 2], true);
         * // => [1, 2]
         *
         * // using an iteratee function
         * _.uniq([1, 2.5, 1.5, 2], function(n) {
     *   return this.floor(n);
     * }, Math);
         * // => [1, 2.5]
         *
         * // using the `_.property` callback shorthand
         * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
         * // => [{ 'x': 1 }, { 'x': 2 }]
         */
        function uniq(array, isSorted, iteratee, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (isSorted != null && typeof isSorted != 'boolean') {
                thisArg = iteratee;
                iteratee = isIterateeCall(array, isSorted, thisArg) ? null : isSorted;
                isSorted = false;
            }
            var callback = getCallback();
            if (!(iteratee == null && callback === baseCallback)) {
                iteratee = callback(iteratee, thisArg, 3);
            }
            return (isSorted && getIndexOf() == baseIndexOf)
                ? sortedUniq(array, iteratee)
                : baseUniq(array, iteratee);
        }

        /**
         * This method is like `_.zip` except that it accepts an array of grouped
         * elements and creates an array regrouping the elements to their pre-zip
         * configuration.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array of grouped elements to process.
         * @returns {Array} Returns the new array of regrouped elements.
         * @example
         *
         * var zipped = _.zip(['fred', 'barney'], [30, 40], [true, false]);
         * // => [['fred', 30, true], ['barney', 40, false]]
         *
         * _.unzip(zipped);
         * // => [['fred', 'barney'], [30, 40], [true, false]]
         */
        function unzip(array) {
            if (!(array && array.length)) {
                return [];
            }
            var index = -1,
                length = 0;

            array = arrayFilter(array, function(group) {
                if (isArrayLike(group)) {
                    length = nativeMax(group.length, length);
                    return true;
                }
            });
            var result = Array(length);
            while (++index < length) {
                result[index] = arrayMap(array, baseProperty(index));
            }
            return result;
        }

        /**
         * This method is like `_.unzip` except that it accepts an iteratee to specify
         * how regrouped values should be combined. The `iteratee` is bound to `thisArg`
         * and invoked with four arguments: (accumulator, value, index, group).
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array of grouped elements to process.
         * @param {Function} [iteratee] The function to combine regrouped values.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the new array of regrouped elements.
         * @example
         *
         * var zipped = _.zip([1, 2], [10, 20], [100, 200]);
         * // => [[1, 10, 100], [2, 20, 200]]
         *
         * _.unzipWith(zipped, _.add);
         * // => [3, 30, 300]
         */
        function unzipWith(array, iteratee, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            var result = unzip(array);
            if (iteratee == null) {
                return result;
            }
            iteratee = bindCallback(iteratee, thisArg, 4);
            return arrayMap(result, function(group) {
                return arrayReduce(group, iteratee, undefined, true);
            });
        }

        /**
         * Creates an array excluding all provided values using
         * [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for equality comparisons.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to filter.
         * @param {...*} [values] The values to exclude.
         * @returns {Array} Returns the new array of filtered values.
         * @example
         *
         * _.without([1, 2, 1, 3], 1, 2);
         * // => [3]
         */
        var without = restParam(function(array, values) {
            return isArrayLike(array)
                ? baseDifference(array, values)
                : [];
        });

        /**
         * Creates an array of unique values that is the [symmetric difference](https://en.wikipedia.org/wiki/Symmetric_difference)
         * of the provided arrays.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to inspect.
         * @returns {Array} Returns the new array of values.
         * @example
         *
         * _.xor([1, 2], [4, 2]);
         * // => [1, 4]
         */
        function xor() {
            var index = -1,
                length = arguments.length;

            while (++index < length) {
                var array = arguments[index];
                if (isArrayLike(array)) {
                    var result = result
                        ? baseDifference(result, array).concat(baseDifference(array, result))
                        : array;
                }
            }
            return result ? baseUniq(result) : [];
        }

        /**
         * Creates an array of grouped elements, the first of which contains the first
         * elements of the given arrays, the second of which contains the second elements
         * of the given arrays, and so on.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to process.
         * @returns {Array} Returns the new array of grouped elements.
         * @example
         *
         * _.zip(['fred', 'barney'], [30, 40], [true, false]);
         * // => [['fred', 30, true], ['barney', 40, false]]
         */
        var zip = restParam(unzip);

        /**
         * The inverse of `_.pairs`; this method returns an object composed from arrays
         * of property names and values. Provide either a single two dimensional array,
         * e.g. `[[key1, value1], [key2, value2]]` or two arrays, one of property names
         * and one of corresponding values.
         *
         * @static
         * @memberOf _
         * @alias object
         * @category Array
         * @param {Array} props The property names.
         * @param {Array} [values=[]] The property values.
         * @returns {Object} Returns the new object.
         * @example
         *
         * _.zipObject([['fred', 30], ['barney', 40]]);
         * // => { 'fred': 30, 'barney': 40 }
         *
         * _.zipObject(['fred', 'barney'], [30, 40]);
         * // => { 'fred': 30, 'barney': 40 }
         */
        function zipObject(props, values) {
            var index = -1,
                length = props ? props.length : 0,
                result = {};

            if (length && !values && !isArray(props[0])) {
                values = [];
            }
            while (++index < length) {
                var key = props[index];
                if (values) {
                    result[key] = values[index];
                } else if (key) {
                    result[key[0]] = key[1];
                }
            }
            return result;
        }

        /**
         * This method is like `_.zip` except that it accepts an iteratee to specify
         * how grouped values should be combined. The `iteratee` is bound to `thisArg`
         * and invoked with four arguments: (accumulator, value, index, group).
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to process.
         * @param {Function} [iteratee] The function to combine grouped values.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the new array of grouped elements.
         * @example
         *
         * _.zipWith([1, 2], [10, 20], [100, 200], _.add);
         * // => [111, 222]
         */
        var zipWith = restParam(function(arrays) {
            var length = arrays.length,
                iteratee = length > 2 ? arrays[length - 2] : undefined,
                thisArg = length > 1 ? arrays[length - 1] : undefined;

            if (length > 2 && typeof iteratee == 'function') {
                length -= 2;
            } else {
                iteratee = (length > 1 && typeof thisArg == 'function') ? (--length, thisArg) : undefined;
                thisArg = undefined;
            }
            arrays.length = length;
            return unzipWith(arrays, iteratee, thisArg);
        });

        /*------------------------------------------------------------------------*/

        /**
         * Creates a `lodash` object that wraps `value` with explicit method
         * chaining enabled.
         *
         * @static
         * @memberOf _
         * @category Chain
         * @param {*} value The value to wrap.
         * @returns {Object} Returns the new `lodash` wrapper instance.
         * @example
         *
         * var users = [
         *   { 'user': 'barney',  'age': 36 },
         *   { 'user': 'fred',    'age': 40 },
         *   { 'user': 'pebbles', 'age': 1 }
         * ];
         *
         * var youngest = _.chain(users)
         *   .sortBy('age')
         *   .map(function(chr) {
     *     return chr.user + ' is ' + chr.age;
     *   })
         *   .first()
         *   .value();
         * // => 'pebbles is 1'
         */
        function chain(value) {
            var result = lodash(value);
            result.__chain__ = true;
            return result;
        }

        /**
         * This method invokes `interceptor` and returns `value`. The interceptor is
         * bound to `thisArg` and invoked with one argument; (value). The purpose of
         * this method is to "tap into" a method chain in order to perform operations
         * on intermediate results within the chain.
         *
         * @static
         * @memberOf _
         * @category Chain
         * @param {*} value The value to provide to `interceptor`.
         * @param {Function} interceptor The function to invoke.
         * @param {*} [thisArg] The `this` binding of `interceptor`.
         * @returns {*} Returns `value`.
         * @example
         *
         * _([1, 2, 3])
         *  .tap(function(array) {
     *    array.pop();
     *  })
         *  .reverse()
         *  .value();
         * // => [2, 1]
         */
        function tap(value, interceptor, thisArg) {
            interceptor.call(thisArg, value);
            return value;
        }

        /**
         * This method is like `_.tap` except that it returns the result of `interceptor`.
         *
         * @static
         * @memberOf _
         * @category Chain
         * @param {*} value The value to provide to `interceptor`.
         * @param {Function} interceptor The function to invoke.
         * @param {*} [thisArg] The `this` binding of `interceptor`.
         * @returns {*} Returns the result of `interceptor`.
         * @example
         *
         * _('  abc  ')
         *  .chain()
         *  .trim()
         *  .thru(function(value) {
     *    return [value];
     *  })
         *  .value();
         * // => ['abc']
         */
        function thru(value, interceptor, thisArg) {
            return interceptor.call(thisArg, value);
        }

        /**
         * Enables explicit method chaining on the wrapper object.
         *
         * @name chain
         * @memberOf _
         * @category Chain
         * @returns {Object} Returns the new `lodash` wrapper instance.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * // without explicit chaining
         * _(users).first();
         * // => { 'user': 'barney', 'age': 36 }
         *
         * // with explicit chaining
         * _(users).chain()
         *   .first()
         *   .pick('user')
         *   .value();
         * // => { 'user': 'barney' }
         */
        function wrapperChain() {
            return chain(this);
        }

        /**
         * Executes the chained sequence and returns the wrapped result.
         *
         * @name commit
         * @memberOf _
         * @category Chain
         * @returns {Object} Returns the new `lodash` wrapper instance.
         * @example
         *
         * var array = [1, 2];
         * var wrapper = _(array).push(3);
         *
         * console.log(array);
         * // => [1, 2]
         *
         * wrapper = wrapper.commit();
         * console.log(array);
         * // => [1, 2, 3]
         *
         * wrapper.last();
         * // => 3
         *
         * console.log(array);
         * // => [1, 2, 3]
         */
        function wrapperCommit() {
            return new LodashWrapper(this.value(), this.__chain__);
        }

        /**
         * Creates a clone of the chained sequence planting `value` as the wrapped value.
         *
         * @name plant
         * @memberOf _
         * @category Chain
         * @returns {Object} Returns the new `lodash` wrapper instance.
         * @example
         *
         * var array = [1, 2];
         * var wrapper = _(array).map(function(value) {
     *   return Math.pow(value, 2);
     * });
         *
         * var other = [3, 4];
         * var otherWrapper = wrapper.plant(other);
         *
         * otherWrapper.value();
         * // => [9, 16]
         *
         * wrapper.value();
         * // => [1, 4]
         */
        function wrapperPlant(value) {
            var result,
                parent = this;

            while (parent instanceof baseLodash) {
                var clone = wrapperClone(parent);
                if (result) {
                    previous.__wrapped__ = clone;
                } else {
                    result = clone;
                }
                var previous = clone;
                parent = parent.__wrapped__;
            }
            previous.__wrapped__ = value;
            return result;
        }

        /**
         * Reverses the wrapped array so the first element becomes the last, the
         * second element becomes the second to last, and so on.
         *
         * **Note:** This method mutates the wrapped array.
         *
         * @name reverse
         * @memberOf _
         * @category Chain
         * @returns {Object} Returns the new reversed `lodash` wrapper instance.
         * @example
         *
         * var array = [1, 2, 3];
         *
         * _(array).reverse().value()
         * // => [3, 2, 1]
         *
         * console.log(array);
         * // => [3, 2, 1]
         */
        function wrapperReverse() {
            var value = this.__wrapped__;
            if (value instanceof LazyWrapper) {
                if (this.__actions__.length) {
                    value = new LazyWrapper(this);
                }
                return new LodashWrapper(value.reverse(), this.__chain__);
            }
            return this.thru(function(value) {
                return value.reverse();
            });
        }

        /**
         * Produces the result of coercing the unwrapped value to a string.
         *
         * @name toString
         * @memberOf _
         * @category Chain
         * @returns {string} Returns the coerced string value.
         * @example
         *
         * _([1, 2, 3]).toString();
         * // => '1,2,3'
         */
        function wrapperToString() {
            return (this.value() + '');
        }

        /**
         * Executes the chained sequence to extract the unwrapped value.
         *
         * @name value
         * @memberOf _
         * @alias run, toJSON, valueOf
         * @category Chain
         * @returns {*} Returns the resolved unwrapped value.
         * @example
         *
         * _([1, 2, 3]).value();
         * // => [1, 2, 3]
         */
        function wrapperValue() {
            return baseWrapperValue(this.__wrapped__, this.__actions__);
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates an array of elements corresponding to the given keys, or indexes,
         * of `collection`. Keys may be specified as individual arguments or as arrays
         * of keys.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {...(number|number[]|string|string[])} [props] The property names
         *  or indexes of elements to pick, specified individually or in arrays.
         * @returns {Array} Returns the new array of picked elements.
         * @example
         *
         * _.at(['a', 'b', 'c'], [0, 2]);
         * // => ['a', 'c']
         *
         * _.at(['barney', 'fred', 'pebbles'], 0, 2);
         * // => ['barney', 'pebbles']
         */
        var at = restParam(function(collection, props) {
            return baseAt(collection, baseFlatten(props));
        });

        /**
         * Creates an object composed of keys generated from the results of running
         * each element of `collection` through `iteratee`. The corresponding value
         * of each key is the number of times the key was returned by `iteratee`.
         * The `iteratee` is bound to `thisArg` and invoked with three arguments:
         * (value, index|key, collection).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the composed aggregate object.
         * @example
         *
         * _.countBy([4.3, 6.1, 6.4], function(n) {
     *   return Math.floor(n);
     * });
         * // => { '4': 1, '6': 2 }
         *
         * _.countBy([4.3, 6.1, 6.4], function(n) {
     *   return this.floor(n);
     * }, Math);
         * // => { '4': 1, '6': 2 }
         *
         * _.countBy(['one', 'two', 'three'], 'length');
         * // => { '3': 2, '5': 1 }
         */
        var countBy = createAggregator(function(result, value, key) {
            hasOwnProperty.call(result, key) ? ++result[key] : (result[key] = 1);
        });

        /**
         * Checks if `predicate` returns truthy for **all** elements of `collection`.
         * The predicate is bound to `thisArg` and invoked with three arguments:
         * (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias all
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {boolean} Returns `true` if all elements pass the predicate check,
         *  else `false`.
         * @example
         *
         * _.every([true, 1, null, 'yes'], Boolean);
         * // => false
         *
         * var users = [
         *   { 'user': 'barney', 'active': false },
         *   { 'user': 'fred',   'active': false }
         * ];
         *
         * // using the `_.matches` callback shorthand
         * _.every(users, { 'user': 'barney', 'active': false });
         * // => false
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.every(users, 'active', false);
         * // => true
         *
         * // using the `_.property` callback shorthand
         * _.every(users, 'active');
         * // => false
         */
        function every(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayEvery : baseEvery;
            if (thisArg && isIterateeCall(collection, predicate, thisArg)) {
                predicate = null;
            }
            if (typeof predicate != 'function' || thisArg !== undefined) {
                predicate = getCallback(predicate, thisArg, 3);
            }
            return func(collection, predicate);
        }

        /**
         * Iterates over elements of `collection`, returning an array of all elements
         * `predicate` returns truthy for. The predicate is bound to `thisArg` and
         * invoked with three arguments: (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias select
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the new filtered array.
         * @example
         *
         * _.filter([4, 5, 6], function(n) {
     *   return n % 2 == 0;
     * });
         * // => [4, 6]
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'active': true },
         *   { 'user': 'fred',   'age': 40, 'active': false }
         * ];
         *
         * // using the `_.matches` callback shorthand
         * _.pluck(_.filter(users, { 'age': 36, 'active': true }), 'user');
         * // => ['barney']
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.pluck(_.filter(users, 'active', false), 'user');
         * // => ['fred']
         *
         * // using the `_.property` callback shorthand
         * _.pluck(_.filter(users, 'active'), 'user');
         * // => ['barney']
         */
        function filter(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayFilter : baseFilter;
            predicate = getCallback(predicate, thisArg, 3);
            return func(collection, predicate);
        }

        /**
         * Iterates over elements of `collection`, returning the first element
         * `predicate` returns truthy for. The predicate is bound to `thisArg` and
         * invoked with three arguments: (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias detect
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {*} Returns the matched element, else `undefined`.
         * @example
         *
         * var users = [
         *   { 'user': 'barney',  'age': 36, 'active': true },
         *   { 'user': 'fred',    'age': 40, 'active': false },
         *   { 'user': 'pebbles', 'age': 1,  'active': true }
         * ];
         *
         * _.result(_.find(users, function(chr) {
     *   return chr.age < 40;
     * }), 'user');
         * // => 'barney'
         *
         * // using the `_.matches` callback shorthand
         * _.result(_.find(users, { 'age': 1, 'active': true }), 'user');
         * // => 'pebbles'
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.result(_.find(users, 'active', false), 'user');
         * // => 'fred'
         *
         * // using the `_.property` callback shorthand
         * _.result(_.find(users, 'active'), 'user');
         * // => 'barney'
         */
        var find = createFind(baseEach);

        /**
         * This method is like `_.find` except that it iterates over elements of
         * `collection` from right to left.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {*} Returns the matched element, else `undefined`.
         * @example
         *
         * _.findLast([1, 2, 3, 4], function(n) {
     *   return n % 2 == 1;
     * });
         * // => 3
         */
        var findLast = createFind(baseEachRight, true);

        /**
         * Performs a deep comparison between each element in `collection` and the
         * source object, returning the first element that has equivalent property
         * values.
         *
         * **Note:** This method supports comparing arrays, booleans, `Date` objects,
         * numbers, `Object` objects, regexes, and strings. Objects are compared by
         * their own, not inherited, enumerable properties. For comparing a single
         * own or inherited property value see `_.matchesProperty`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {Object} source The object of property values to match.
         * @returns {*} Returns the matched element, else `undefined`.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'active': true },
         *   { 'user': 'fred',   'age': 40, 'active': false }
         * ];
         *
         * _.result(_.findWhere(users, { 'age': 36, 'active': true }), 'user');
         * // => 'barney'
         *
         * _.result(_.findWhere(users, { 'age': 40, 'active': false }), 'user');
         * // => 'fred'
         */
        function findWhere(collection, source) {
            return find(collection, baseMatches(source));
        }

        /**
         * Iterates over elements of `collection` invoking `iteratee` for each element.
         * The `iteratee` is bound to `thisArg` and invoked with three arguments:
         * (value, index|key, collection). Iteratee functions may exit iteration early
         * by explicitly returning `false`.
         *
         * **Note:** As with other "Collections" methods, objects with a "length" property
         * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
         * may be used for object iteration.
         *
         * @static
         * @memberOf _
         * @alias each
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array|Object|string} Returns `collection`.
         * @example
         *
         * _([1, 2]).forEach(function(n) {
     *   console.log(n);
     * }).value();
         * // => logs.json each value from left to right and returns the array
         *
         * _.forEach({ 'a': 1, 'b': 2 }, function(n, key) {
     *   console.log(n, key);
     * });
         * // => logs.json each value-key pair and returns the object (iteration order is not guaranteed)
         */
        var forEach = createForEach(arrayEach, baseEach);

        /**
         * This method is like `_.forEach` except that it iterates over elements of
         * `collection` from right to left.
         *
         * @static
         * @memberOf _
         * @alias eachRight
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array|Object|string} Returns `collection`.
         * @example
         *
         * _([1, 2]).forEachRight(function(n) {
     *   console.log(n);
     * }).value();
         * // => logs.json each value from right to left and returns the array
         */
        var forEachRight = createForEach(arrayEachRight, baseEachRight);

        /**
         * Creates an object composed of keys generated from the results of running
         * each element of `collection` through `iteratee`. The corresponding value
         * of each key is an array of the elements responsible for generating the key.
         * The `iteratee` is bound to `thisArg` and invoked with three arguments:
         * (value, index|key, collection).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the composed aggregate object.
         * @example
         *
         * _.groupBy([4.2, 6.1, 6.4], function(n) {
     *   return Math.floor(n);
     * });
         * // => { '4': [4.2], '6': [6.1, 6.4] }
         *
         * _.groupBy([4.2, 6.1, 6.4], function(n) {
     *   return this.floor(n);
     * }, Math);
         * // => { '4': [4.2], '6': [6.1, 6.4] }
         *
         * // using the `_.property` callback shorthand
         * _.groupBy(['one', 'two', 'three'], 'length');
         * // => { '3': ['one', 'two'], '5': ['three'] }
         */
        var groupBy = createAggregator(function(result, value, key) {
            if (hasOwnProperty.call(result, key)) {
                result[key].push(value);
            } else {
                result[key] = [value];
            }
        });

        /**
         * Checks if `value` is in `collection` using
         * [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for equality comparisons. If `fromIndex` is negative, it is used as the offset
         * from the end of `collection`.
         *
         * @static
         * @memberOf _
         * @alias contains, include
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {*} target The value to search for.
         * @param {number} [fromIndex=0] The index to search from.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.reduce`.
         * @returns {boolean} Returns `true` if a matching element is found, else `false`.
         * @example
         *
         * _.includes([1, 2, 3], 1);
         * // => true
         *
         * _.includes([1, 2, 3], 1, 2);
         * // => false
         *
         * _.includes({ 'user': 'fred', 'age': 40 }, 'fred');
         * // => true
         *
         * _.includes('pebbles', 'eb');
         * // => true
         */
        function includes(collection, target, fromIndex, guard) {
            var length = collection ? getLength(collection) : 0;
            if (!isLength(length)) {
                collection = values(collection);
                length = collection.length;
            }
            if (!length) {
                return false;
            }
            if (typeof fromIndex != 'number' || (guard && isIterateeCall(target, fromIndex, guard))) {
                fromIndex = 0;
            } else {
                fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : (fromIndex || 0);
            }
            return (typeof collection == 'string' || !isArray(collection) && isString(collection))
                ? (fromIndex < length && collection.indexOf(target, fromIndex) > -1)
                : (getIndexOf(collection, target, fromIndex) > -1);
        }

        /**
         * Creates an object composed of keys generated from the results of running
         * each element of `collection` through `iteratee`. The corresponding value
         * of each key is the last element responsible for generating the key. The
         * iteratee function is bound to `thisArg` and invoked with three arguments:
         * (value, index|key, collection).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the composed aggregate object.
         * @example
         *
         * var keyData = [
         *   { 'dir': 'left', 'code': 97 },
         *   { 'dir': 'right', 'code': 100 }
         * ];
         *
         * _.indexBy(keyData, 'dir');
         * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
         *
         * _.indexBy(keyData, function(object) {
     *   return String.fromCharCode(object.code);
     * });
         * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
         *
         * _.indexBy(keyData, function(object) {
     *   return this.fromCharCode(object.code);
     * }, String);
         * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
         */
        var indexBy = createAggregator(function(result, value, key) {
            result[key] = value;
        });

        /**
         * Invokes the method at `path` of each element in `collection`, returning
         * an array of the results of each invoked method. Any additional arguments
         * are provided to each invoked method. If `methodName` is a function it is
         * invoked for, and `this` bound to, each element in `collection`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Array|Function|string} path The path of the method to invoke or
         *  the function invoked per iteration.
         * @param {...*} [args] The arguments to invoke the method with.
         * @returns {Array} Returns the array of results.
         * @example
         *
         * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
         * // => [[1, 5, 7], [1, 2, 3]]
         *
         * _.invoke([123, 456], String.prototype.split, '');
         * // => [['1', '2', '3'], ['4', '5', '6']]
         */
        var invoke = restParam(function(collection, path, args) {
            var index = -1,
                isFunc = typeof path == 'function',
                isProp = isKey(path),
                result = isArrayLike(collection) ? Array(collection.length) : [];

            baseEach(collection, function(value) {
                var func = isFunc ? path : ((isProp && value != null) ? value[path] : null);
                result[++index] = func ? func.apply(value, args) : invokePath(value, path, args);
            });
            return result;
        });

        /**
         * Creates an array of values by running each element in `collection` through
         * `iteratee`. The `iteratee` is bound to `thisArg` and invoked with three
         * arguments: (value, index|key, collection).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * Many lodash methods are guarded to work as iteratees for methods like
         * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
         *
         * The guarded methods are:
         * `ary`, `callback`, `chunk`, `clone`, `create`, `curry`, `curryRight`,
         * `drop`, `dropRight`, `every`, `fill`, `flatten`, `invert`, `max`, `min`,
         * `parseInt`, `slice`, `sortBy`, `take`, `takeRight`, `template`, `trim`,
         * `trimLeft`, `trimRight`, `trunc`, `random`, `range`, `sample`, `some`,
         * `sum`, `uniq`, and `words`
         *
         * @static
         * @memberOf _
         * @alias collect
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the new mapped array.
         * @example
         *
         * function timesThree(n) {
     *   return n * 3;
     * }
         *
         * _.map([1, 2], timesThree);
         * // => [3, 6]
         *
         * _.map({ 'a': 1, 'b': 2 }, timesThree);
         * // => [3, 6] (iteration order is not guaranteed)
         *
         * var users = [
         *   { 'user': 'barney' },
         *   { 'user': 'fred' }
         * ];
         *
         * // using the `_.property` callback shorthand
         * _.map(users, 'user');
         * // => ['barney', 'fred']
         */
        function map(collection, iteratee, thisArg) {
            var func = isArray(collection) ? arrayMap : baseMap;
            iteratee = getCallback(iteratee, thisArg, 3);
            return func(collection, iteratee);
        }

        /**
         * Creates an array of elements split into two groups, the first of which
         * contains elements `predicate` returns truthy for, while the second of which
         * contains elements `predicate` returns falsey for. The predicate is bound
         * to `thisArg` and invoked with three arguments: (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the array of grouped elements.
         * @example
         *
         * _.partition([1, 2, 3], function(n) {
     *   return n % 2;
     * });
         * // => [[1, 3], [2]]
         *
         * _.partition([1.2, 2.3, 3.4], function(n) {
     *   return this.floor(n) % 2;
     * }, Math);
         * // => [[1.2, 3.4], [2.3]]
         *
         * var users = [
         *   { 'user': 'barney',  'age': 36, 'active': false },
         *   { 'user': 'fred',    'age': 40, 'active': true },
         *   { 'user': 'pebbles', 'age': 1,  'active': false }
         * ];
         *
         * var mapper = function(array) {
     *   return _.pluck(array, 'user');
     * };
         *
         * // using the `_.matches` callback shorthand
         * _.map(_.partition(users, { 'age': 1, 'active': false }), mapper);
         * // => [['pebbles'], ['barney', 'fred']]
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.map(_.partition(users, 'active', false), mapper);
         * // => [['barney', 'pebbles'], ['fred']]
         *
         * // using the `_.property` callback shorthand
         * _.map(_.partition(users, 'active'), mapper);
         * // => [['fred'], ['barney', 'pebbles']]
         */
        var partition = createAggregator(function(result, value, key) {
            result[key ? 0 : 1].push(value);
        }, function() { return [[], []]; });

        /**
         * Gets the property value of `path` from all elements in `collection`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Array|string} path The path of the property to pluck.
         * @returns {Array} Returns the property values.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * _.pluck(users, 'user');
         * // => ['barney', 'fred']
         *
         * var userIndex = _.indexBy(users, 'user');
         * _.pluck(userIndex, 'age');
         * // => [36, 40] (iteration order is not guaranteed)
         */
        function pluck(collection, path) {
            return map(collection, property(path));
        }

        /**
         * Reduces `collection` to a value which is the accumulated result of running
         * each element in `collection` through `iteratee`, where each successive
         * invocation is supplied the return value of the previous. If `accumulator`
         * is not provided the first element of `collection` is used as the initial
         * value. The `iteratee` is bound to `thisArg` and invoked with four arguments:
         * (accumulator, value, index|key, collection).
         *
         * Many lodash methods are guarded to work as iteratees for methods like
         * `_.reduce`, `_.reduceRight`, and `_.transform`.
         *
         * The guarded methods are:
         * `assign`, `defaults`, `includes`, `merge`, `sortByAll`, and `sortByOrder`
         *
         * @static
         * @memberOf _
         * @alias foldl, inject
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [accumulator] The initial value.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the accumulated value.
         * @example
         *
         * _.reduce([1, 2], function(total, n) {
     *   return total + n;
     * });
         * // => 3
         *
         * _.reduce({ 'a': 1, 'b': 2 }, function(result, n, key) {
     *   result[key] = n * 3;
     *   return result;
     * }, {});
         * // => { 'a': 3, 'b': 6 } (iteration order is not guaranteed)
         */
        var reduce = createReduce(arrayReduce, baseEach);

        /**
         * This method is like `_.reduce` except that it iterates over elements of
         * `collection` from right to left.
         *
         * @static
         * @memberOf _
         * @alias foldr
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [accumulator] The initial value.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the accumulated value.
         * @example
         *
         * var array = [[0, 1], [2, 3], [4, 5]];
         *
         * _.reduceRight(array, function(flattened, other) {
     *   return flattened.concat(other);
     * }, []);
         * // => [4, 5, 2, 3, 0, 1]
         */
        var reduceRight = createReduce(arrayReduceRight, baseEachRight);

        /**
         * The opposite of `_.filter`; this method returns the elements of `collection`
         * that `predicate` does **not** return truthy for.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the new filtered array.
         * @example
         *
         * _.reject([1, 2, 3, 4], function(n) {
     *   return n % 2 == 0;
     * });
         * // => [1, 3]
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'active': false },
         *   { 'user': 'fred',   'age': 40, 'active': true }
         * ];
         *
         * // using the `_.matches` callback shorthand
         * _.pluck(_.reject(users, { 'age': 40, 'active': true }), 'user');
         * // => ['barney']
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.pluck(_.reject(users, 'active', false), 'user');
         * // => ['fred']
         *
         * // using the `_.property` callback shorthand
         * _.pluck(_.reject(users, 'active'), 'user');
         * // => ['barney']
         */
        function reject(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayFilter : baseFilter;
            predicate = getCallback(predicate, thisArg, 3);
            return func(collection, function(value, index, collection) {
                return !predicate(value, index, collection);
            });
        }

        /**
         * Gets a random element or `n` random elements from a collection.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to sample.
         * @param {number} [n] The number of elements to sample.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {*} Returns the random sample(s).
         * @example
         *
         * _.sample([1, 2, 3, 4]);
         * // => 2
         *
         * _.sample([1, 2, 3, 4], 2);
         * // => [3, 1]
         */
        function sample(collection, n, guard) {
            if (guard ? isIterateeCall(collection, n, guard) : n == null) {
                collection = toIterable(collection);
                var length = collection.length;
                return length > 0 ? collection[baseRandom(0, length - 1)] : undefined;
            }
            var index = -1,
                result = toArray(collection),
                length = result.length,
                lastIndex = length - 1;

            n = nativeMin(n < 0 ? 0 : (+n || 0), length);
            while (++index < n) {
                var rand = baseRandom(index, lastIndex),
                    value = result[rand];

                result[rand] = result[index];
                result[index] = value;
            }
            result.length = n;
            return result;
        }

        /**
         * Creates an array of shuffled values, using a version of the
         * [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher-Yates_shuffle).
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to shuffle.
         * @returns {Array} Returns the new shuffled array.
         * @example
         *
         * _.shuffle([1, 2, 3, 4]);
         * // => [4, 1, 3, 2]
         */
        function shuffle(collection) {
            return sample(collection, POSITIVE_INFINITY);
        }

        /**
         * Gets the size of `collection` by returning its length for array-like
         * values or the number of own enumerable properties for objects.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to inspect.
         * @returns {number} Returns the size of `collection`.
         * @example
         *
         * _.size([1, 2, 3]);
         * // => 3
         *
         * _.size({ 'a': 1, 'b': 2 });
         * // => 2
         *
         * _.size('pebbles');
         * // => 7
         */
        function size(collection) {
            var length = collection ? getLength(collection) : 0;
            return isLength(length) ? length : keys(collection).length;
        }

        /**
         * Checks if `predicate` returns truthy for **any** element of `collection`.
         * The function returns as soon as it finds a passing value and does not iterate
         * over the entire collection. The predicate is bound to `thisArg` and invoked
         * with three arguments: (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias any
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {boolean} Returns `true` if any element passes the predicate check,
         *  else `false`.
         * @example
         *
         * _.some([null, 0, 'yes', false], Boolean);
         * // => true
         *
         * var users = [
         *   { 'user': 'barney', 'active': true },
         *   { 'user': 'fred',   'active': false }
         * ];
         *
         * // using the `_.matches` callback shorthand
         * _.some(users, { 'user': 'barney', 'active': false });
         * // => false
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.some(users, 'active', false);
         * // => true
         *
         * // using the `_.property` callback shorthand
         * _.some(users, 'active');
         * // => true
         */
        function some(collection, predicate, thisArg) {
            var func = isArray(collection) ? arraySome : baseSome;
            if (thisArg && isIterateeCall(collection, predicate, thisArg)) {
                predicate = null;
            }
            if (typeof predicate != 'function' || thisArg !== undefined) {
                predicate = getCallback(predicate, thisArg, 3);
            }
            return func(collection, predicate);
        }

        /**
         * Creates an array of elements, sorted in ascending order by the results of
         * running each element in a collection through `iteratee`. This method performs
         * a stable sort, that is, it preserves the original sort order of equal elements.
         * The `iteratee` is bound to `thisArg` and invoked with three arguments:
         * (value, index|key, collection).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the new sorted array.
         * @example
         *
         * _.sortBy([1, 2, 3], function(n) {
     *   return Math.sin(n);
     * });
         * // => [3, 1, 2]
         *
         * _.sortBy([1, 2, 3], function(n) {
     *   return this.sin(n);
     * }, Math);
         * // => [3, 1, 2]
         *
         * var users = [
         *   { 'user': 'fred' },
         *   { 'user': 'pebbles' },
         *   { 'user': 'barney' }
         * ];
         *
         * // using the `_.property` callback shorthand
         * _.pluck(_.sortBy(users, 'user'), 'user');
         * // => ['barney', 'fred', 'pebbles']
         */
        function sortBy(collection, iteratee, thisArg) {
            if (collection == null) {
                return [];
            }
            if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
                iteratee = null;
            }
            var index = -1;
            iteratee = getCallback(iteratee, thisArg, 3);

            var result = baseMap(collection, function(value, key, collection) {
                return { 'criteria': iteratee(value, key, collection), 'index': ++index, 'value': value };
            });
            return baseSortBy(result, compareAscending);
        }

        /**
         * This method is like `_.sortBy` except that it can sort by multiple iteratees
         * or property names.
         *
         * If a property name is provided for an iteratee the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If an object is provided for an iteratee the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {...(Function|Function[]|Object|Object[]|string|string[])} iteratees
         *  The iteratees to sort by, specified as individual values or arrays of values.
         * @returns {Array} Returns the new sorted array.
         * @example
         *
         * var users = [
         *   { 'user': 'fred',   'age': 48 },
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 42 },
         *   { 'user': 'barney', 'age': 34 }
         * ];
         *
         * _.map(_.sortByAll(users, ['user', 'age']), _.values);
         * // => [['barney', 34], ['barney', 36], ['fred', 42], ['fred', 48]]
         *
         * _.map(_.sortByAll(users, 'user', function(chr) {
     *   return Math.floor(chr.age / 10);
     * }), _.values);
         * // => [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 42]]
         */
        var sortByAll = restParam(function(collection, iteratees) {
            if (collection == null) {
                return [];
            }
            var guard = iteratees[2];
            if (guard && isIterateeCall(iteratees[0], iteratees[1], guard)) {
                iteratees.length = 1;
            }
            return baseSortByOrder(collection, baseFlatten(iteratees), []);
        });

        /**
         * This method is like `_.sortByAll` except that it allows specifying the
         * sort orders of the iteratees to sort by. A truthy value in `orders` will
         * sort the corresponding property name in ascending order while a falsey
         * value will sort it in descending order.
         *
         * If a property name is provided for an iteratee the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If an object is provided for an iteratee the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
         * @param {boolean[]} orders The sort orders of `iteratees`.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.reduce`.
         * @returns {Array} Returns the new sorted array.
         * @example
         *
         * var users = [
         *   { 'user': 'fred',   'age': 48 },
         *   { 'user': 'barney', 'age': 34 },
         *   { 'user': 'fred',   'age': 42 },
         *   { 'user': 'barney', 'age': 36 }
         * ];
         *
         * // sort by `user` in ascending order and by `age` in descending order
         * _.map(_.sortByOrder(users, ['user', 'age'], [true, false]), _.values);
         * // => [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 42]]
         */
        function sortByOrder(collection, iteratees, orders, guard) {
            if (collection == null) {
                return [];
            }
            if (guard && isIterateeCall(iteratees, orders, guard)) {
                orders = null;
            }
            if (!isArray(iteratees)) {
                iteratees = iteratees == null ? [] : [iteratees];
            }
            if (!isArray(orders)) {
                orders = orders == null ? [] : [orders];
            }
            return baseSortByOrder(collection, iteratees, orders);
        }

        /**
         * Performs a deep comparison between each element in `collection` and the
         * source object, returning an array of all elements that have equivalent
         * property values.
         *
         * **Note:** This method supports comparing arrays, booleans, `Date` objects,
         * numbers, `Object` objects, regexes, and strings. Objects are compared by
         * their own, not inherited, enumerable properties. For comparing a single
         * own or inherited property value see `_.matchesProperty`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {Object} source The object of property values to match.
         * @returns {Array} Returns the new filtered array.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'active': false, 'pets': ['hoppy'] },
         *   { 'user': 'fred',   'age': 40, 'active': true, 'pets': ['baby puss', 'dino'] }
         * ];
         *
         * _.pluck(_.where(users, { 'age': 36, 'active': false }), 'user');
         * // => ['barney']
         *
         * _.pluck(_.where(users, { 'pets': ['dino'] }), 'user');
         * // => ['fred']
         */
        function where(collection, source) {
            return filter(collection, baseMatches(source));
        }

        /*------------------------------------------------------------------------*/

        /**
         * Gets the number of milliseconds that have elapsed since the Unix epoch
         * (1 January 1970 00:00:00 UTC).
         *
         * @static
         * @memberOf _
         * @category Date
         * @example
         *
         * _.defer(function(stamp) {
     *   console.log(_.now() - stamp);
     * }, _.now());
         * // => logs.json the number of milliseconds it took for the deferred function to be invoked
         */
        var now = nativeNow || function() {
                return new Date().getTime();
            };

        /*------------------------------------------------------------------------*/

        /**
         * The opposite of `_.before`; this method creates a function that invokes
         * `func` once it is called `n` or more times.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {number} n The number of calls before `func` is invoked.
         * @param {Function} func The function to restrict.
         * @returns {Function} Returns the new restricted function.
         * @example
         *
         * var saves = ['profile', 'settings'];
         *
         * var done = _.after(saves.length, function() {
     *   console.log('done saving!');
     * });
         *
         * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
         * // => logs.json 'done saving!' after the two async saves have completed
         */
        function after(n, func) {
            if (typeof func != 'function') {
                if (typeof n == 'function') {
                    var temp = n;
                    n = func;
                    func = temp;
                } else {
                    throw new TypeError(FUNC_ERROR_TEXT);
                }
            }
            n = nativeIsFinite(n = +n) ? n : 0;
            return function() {
                if (--n < 1) {
                    return func.apply(this, arguments);
                }
            };
        }

        /**
         * Creates a function that accepts up to `n` arguments ignoring any
         * additional arguments.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to cap arguments for.
         * @param {number} [n=func.length] The arity cap.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Function} Returns the new function.
         * @example
         *
         * _.map(['6', '8', '10'], _.ary(parseInt, 1));
         * // => [6, 8, 10]
         */
        function ary(func, n, guard) {
            if (guard && isIterateeCall(func, n, guard)) {
                n = null;
            }
            n = (func && n == null) ? func.length : nativeMax(+n || 0, 0);
            return createWrapper(func, ARY_FLAG, null, null, null, null, n);
        }

        /**
         * Creates a function that invokes `func`, with the `this` binding and arguments
         * of the created function, while it is called less than `n` times. Subsequent
         * calls to the created function return the result of the last `func` invocation.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {number} n The number of calls at which `func` is no longer invoked.
         * @param {Function} func The function to restrict.
         * @returns {Function} Returns the new restricted function.
         * @example
         *
         * jQuery('#add').on('click', _.before(5, addContactToList));
         * // => allows adding up to 4 contacts to the list
         */
        function before(n, func) {
            var result;
            if (typeof func != 'function') {
                if (typeof n == 'function') {
                    var temp = n;
                    n = func;
                    func = temp;
                } else {
                    throw new TypeError(FUNC_ERROR_TEXT);
                }
            }
            return function() {
                if (--n > 0) {
                    result = func.apply(this, arguments);
                }
                if (n <= 1) {
                    func = null;
                }
                return result;
            };
        }

        /**
         * Creates a function that invokes `func` with the `this` binding of `thisArg`
         * and prepends any additional `_.bind` arguments to those provided to the
         * bound function.
         *
         * The `_.bind.placeholder` value, which defaults to `_` in monolithic builds,
         * may be used as a placeholder for partially applied arguments.
         *
         * **Note:** Unlike native `Function#bind` this method does not set the "length"
         * property of bound functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to bind.
         * @param {*} thisArg The `this` binding of `func`.
         * @param {...*} [partials] The arguments to be partially applied.
         * @returns {Function} Returns the new bound function.
         * @example
         *
         * var greet = function(greeting, punctuation) {
     *   return greeting + ' ' + this.user + punctuation;
     * };
         *
         * var object = { 'user': 'fred' };
         *
         * var bound = _.bind(greet, object, 'hi');
         * bound('!');
         * // => 'hi fred!'
         *
         * // using placeholders
         * var bound = _.bind(greet, object, _, '!');
         * bound('hi');
         * // => 'hi fred!'
         */
        var bind = restParam(function(func, thisArg, partials) {
            var bitmask = BIND_FLAG;
            if (partials.length) {
                var holders = replaceHolders(partials, bind.placeholder);
                bitmask |= PARTIAL_FLAG;
            }
            return createWrapper(func, bitmask, thisArg, partials, holders);
        });

        /**
         * Binds methods of an object to the object itself, overwriting the existing
         * method. Method names may be specified as individual arguments or as arrays
         * of method names. If no method names are provided all enumerable function
         * properties, own and inherited, of `object` are bound.
         *
         * **Note:** This method does not set the "length" property of bound functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Object} object The object to bind and assign the bound methods to.
         * @param {...(string|string[])} [methodNames] The object method names to bind,
         *  specified as individual method names or arrays of method names.
         * @returns {Object} Returns `object`.
         * @example
         *
         * var view = {
     *   'label': 'docs',
     *   'onClick': function() {
     *     console.log('clicked ' + this.label);
     *   }
     * };
         *
         * _.bindAll(view);
         * jQuery('#docs').on('click', view.onClick);
         * // => logs.json 'clicked docs' when the element is clicked
         */
        var bindAll = restParam(function(object, methodNames) {
            methodNames = methodNames.length ? baseFlatten(methodNames) : functions(object);

            var index = -1,
                length = methodNames.length;

            while (++index < length) {
                var key = methodNames[index];
                object[key] = createWrapper(object[key], BIND_FLAG, object);
            }
            return object;
        });

        /**
         * Creates a function that invokes the method at `object[key]` and prepends
         * any additional `_.bindKey` arguments to those provided to the bound function.
         *
         * This method differs from `_.bind` by allowing bound functions to reference
         * methods that may be redefined or don't yet exist.
         * See [Peter Michaux's article](http://peter.michaux.ca/articles/lazy-function-definition-pattern)
         * for more details.
         *
         * The `_.bindKey.placeholder` value, which defaults to `_` in monolithic
         * builds, may be used as a placeholder for partially applied arguments.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Object} object The object the method belongs to.
         * @param {string} key The key of the method.
         * @param {...*} [partials] The arguments to be partially applied.
         * @returns {Function} Returns the new bound function.
         * @example
         *
         * var object = {
     *   'user': 'fred',
     *   'greet': function(greeting, punctuation) {
     *     return greeting + ' ' + this.user + punctuation;
     *   }
     * };
         *
         * var bound = _.bindKey(object, 'greet', 'hi');
         * bound('!');
         * // => 'hi fred!'
         *
         * object.greet = function(greeting, punctuation) {
     *   return greeting + 'ya ' + this.user + punctuation;
     * };
         *
         * bound('!');
         * // => 'hiya fred!'
         *
         * // using placeholders
         * var bound = _.bindKey(object, 'greet', _, '!');
         * bound('hi');
         * // => 'hiya fred!'
         */
        var bindKey = restParam(function(object, key, partials) {
            var bitmask = BIND_FLAG | BIND_KEY_FLAG;
            if (partials.length) {
                var holders = replaceHolders(partials, bindKey.placeholder);
                bitmask |= PARTIAL_FLAG;
            }
            return createWrapper(key, bitmask, object, partials, holders);
        });

        /**
         * Creates a function that accepts one or more arguments of `func` that when
         * called either invokes `func` returning its result, if all `func` arguments
         * have been provided, or returns a function that accepts one or more of the
         * remaining `func` arguments, and so on. The arity of `func` may be specified
         * if `func.length` is not sufficient.
         *
         * The `_.curry.placeholder` value, which defaults to `_` in monolithic builds,
         * may be used as a placeholder for provided arguments.
         *
         * **Note:** This method does not set the "length" property of curried functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to curry.
         * @param {number} [arity=func.length] The arity of `func`.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Function} Returns the new curried function.
         * @example
         *
         * var abc = function(a, b, c) {
     *   return [a, b, c];
     * };
         *
         * var curried = _.curry(abc);
         *
         * curried(1)(2)(3);
         * // => [1, 2, 3]
         *
         * curried(1, 2)(3);
         * // => [1, 2, 3]
         *
         * curried(1, 2, 3);
         * // => [1, 2, 3]
         *
         * // using placeholders
         * curried(1)(_, 3)(2);
         * // => [1, 2, 3]
         */
        var curry = createCurry(CURRY_FLAG);

        /**
         * This method is like `_.curry` except that arguments are applied to `func`
         * in the manner of `_.partialRight` instead of `_.partial`.
         *
         * The `_.curryRight.placeholder` value, which defaults to `_` in monolithic
         * builds, may be used as a placeholder for provided arguments.
         *
         * **Note:** This method does not set the "length" property of curried functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to curry.
         * @param {number} [arity=func.length] The arity of `func`.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Function} Returns the new curried function.
         * @example
         *
         * var abc = function(a, b, c) {
     *   return [a, b, c];
     * };
         *
         * var curried = _.curryRight(abc);
         *
         * curried(3)(2)(1);
         * // => [1, 2, 3]
         *
         * curried(2, 3)(1);
         * // => [1, 2, 3]
         *
         * curried(1, 2, 3);
         * // => [1, 2, 3]
         *
         * // using placeholders
         * curried(3)(1, _)(2);
         * // => [1, 2, 3]
         */
        var curryRight = createCurry(CURRY_RIGHT_FLAG);

        /**
         * Creates a debounced function that delays invoking `func` until after `wait`
         * milliseconds have elapsed since the last time the debounced function was
         * invoked. The debounced function comes with a `cancel` method to cancel
         * delayed invocations. Provide an options object to indicate that `func`
         * should be invoked on the leading and/or trailing edge of the `wait` timeout.
         * Subsequent calls to the debounced function return the result of the last
         * `func` invocation.
         *
         * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
         * on the trailing edge of the timeout only if the the debounced function is
         * invoked more than once during the `wait` timeout.
         *
         * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
         * for details over the differences between `_.debounce` and `_.throttle`.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to debounce.
         * @param {number} [wait=0] The number of milliseconds to delay.
         * @param {Object} [options] The options object.
         * @param {boolean} [options.leading=false] Specify invoking on the leading
         *  edge of the timeout.
         * @param {number} [options.maxWait] The maximum time `func` is allowed to be
         *  delayed before it is invoked.
         * @param {boolean} [options.trailing=true] Specify invoking on the trailing
         *  edge of the timeout.
         * @returns {Function} Returns the new debounced function.
         * @example
         *
         * // avoid costly calculations while the window size is in flux
         * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
         *
         * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
         * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * }));
         *
         * // ensure `batchLog` is invoked once after 1 second of debounced calls
         * var source = new EventSource('/stream');
         * jQuery(source).on('message', _.debounce(batchLog, 250, {
     *   'maxWait': 1000
     * }));
         *
         * // cancel a debounced call
         * var todoChanges = _.debounce(batchLog, 1000);
         * Object.observe(models.todo, todoChanges);
         *
         * Object.observe(models, function(changes) {
     *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
     *     todoChanges.cancel();
     *   }
     * }, ['delete']);
         *
         * // ...at some point `models.todo` is changed
         * models.todo.completed = true;
         *
         * // ...before 1 second has passed `models.todo` is deleted
         * // which cancels the debounced `todoChanges` call
         * delete models.todo;
         */
        function debounce(func, wait, options) {
            var args,
                maxTimeoutId,
                result,
                stamp,
                thisArg,
                timeoutId,
                trailingCall,
                lastCalled = 0,
                maxWait = false,
                trailing = true;

            if (typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            wait = wait < 0 ? 0 : (+wait || 0);
            if (options === true) {
                var leading = true;
                trailing = false;
            } else if (isObject(options)) {
                leading = options.leading;
                maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
                trailing = 'trailing' in options ? options.trailing : trailing;
            }

            function cancel() {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                if (maxTimeoutId) {
                    clearTimeout(maxTimeoutId);
                }
                maxTimeoutId = timeoutId = trailingCall = undefined;
            }

            function delayed() {
                var remaining = wait - (now() - stamp);
                if (remaining <= 0 || remaining > wait) {
                    if (maxTimeoutId) {
                        clearTimeout(maxTimeoutId);
                    }
                    var isCalled = trailingCall;
                    maxTimeoutId = timeoutId = trailingCall = undefined;
                    if (isCalled) {
                        lastCalled = now();
                        result = func.apply(thisArg, args);
                        if (!timeoutId && !maxTimeoutId) {
                            args = thisArg = null;
                        }
                    }
                } else {
                    timeoutId = setTimeout(delayed, remaining);
                }
            }

            function maxDelayed() {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                maxTimeoutId = timeoutId = trailingCall = undefined;
                if (trailing || (maxWait !== wait)) {
                    lastCalled = now();
                    result = func.apply(thisArg, args);
                    if (!timeoutId && !maxTimeoutId) {
                        args = thisArg = null;
                    }
                }
            }

            function debounced() {
                args = arguments;
                stamp = now();
                thisArg = this;
                trailingCall = trailing && (timeoutId || !leading);

                if (maxWait === false) {
                    var leadingCall = leading && !timeoutId;
                } else {
                    if (!maxTimeoutId && !leading) {
                        lastCalled = stamp;
                    }
                    var remaining = maxWait - (stamp - lastCalled),
                        isCalled = remaining <= 0 || remaining > maxWait;

                    if (isCalled) {
                        if (maxTimeoutId) {
                            maxTimeoutId = clearTimeout(maxTimeoutId);
                        }
                        lastCalled = stamp;
                        result = func.apply(thisArg, args);
                    }
                    else if (!maxTimeoutId) {
                        maxTimeoutId = setTimeout(maxDelayed, remaining);
                    }
                }
                if (isCalled && timeoutId) {
                    timeoutId = clearTimeout(timeoutId);
                }
                else if (!timeoutId && wait !== maxWait) {
                    timeoutId = setTimeout(delayed, wait);
                }
                if (leadingCall) {
                    isCalled = true;
                    result = func.apply(thisArg, args);
                }
                if (isCalled && !timeoutId && !maxTimeoutId) {
                    args = thisArg = null;
                }
                return result;
            }
            debounced.cancel = cancel;
            return debounced;
        }

        /**
         * Defers invoking the `func` until the current call stack has cleared. Any
         * additional arguments are provided to `func` when it is invoked.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to defer.
         * @param {...*} [args] The arguments to invoke the function with.
         * @returns {number} Returns the timer id.
         * @example
         *
         * _.defer(function(text) {
     *   console.log(text);
     * }, 'deferred');
         * // logs.json 'deferred' after one or more milliseconds
         */
        var defer = restParam(function(func, args) {
            return baseDelay(func, 1, args);
        });

        /**
         * Invokes `func` after `wait` milliseconds. Any additional arguments are
         * provided to `func` when it is invoked.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to delay.
         * @param {number} wait The number of milliseconds to delay invocation.
         * @param {...*} [args] The arguments to invoke the function with.
         * @returns {number} Returns the timer id.
         * @example
         *
         * _.delay(function(text) {
     *   console.log(text);
     * }, 1000, 'later');
         * // => logs.json 'later' after one second
         */
        var delay = restParam(function(func, wait, args) {
            return baseDelay(func, wait, args);
        });

        /**
         * Creates a function that returns the result of invoking the provided
         * functions with the `this` binding of the created function, where each
         * successive invocation is supplied the return value of the previous.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {...Function} [funcs] Functions to invoke.
         * @returns {Function} Returns the new function.
         * @example
         *
         * function square(n) {
     *   return n * n;
     * }
         *
         * var addSquare = _.flow(_.add, square);
         * addSquare(1, 2);
         * // => 9
         */
        var flow = createFlow();

        /**
         * This method is like `_.flow` except that it creates a function that
         * invokes the provided functions from right to left.
         *
         * @static
         * @memberOf _
         * @alias backflow, compose
         * @category Function
         * @param {...Function} [funcs] Functions to invoke.
         * @returns {Function} Returns the new function.
         * @example
         *
         * function square(n) {
     *   return n * n;
     * }
         *
         * var addSquare = _.flowRight(square, _.add);
         * addSquare(1, 2);
         * // => 9
         */
        var flowRight = createFlow(true);

        /**
         * Creates a function that memoizes the result of `func`. If `resolver` is
         * provided it determines the cache key for storing the result based on the
         * arguments provided to the memoized function. By default, the first argument
         * provided to the memoized function is coerced to a string and used as the
         * cache key. The `func` is invoked with the `this` binding of the memoized
         * function.
         *
         * **Note:** The cache is exposed as the `cache` property on the memoized
         * function. Its creation may be customized by replacing the `_.memoize.Cache`
         * constructor with one whose instances implement the [`Map`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-properties-of-the-map-prototype-object)
         * method interface of `get`, `has`, and `set`.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to have its output memoized.
         * @param {Function} [resolver] The function to resolve the cache key.
         * @returns {Function} Returns the new memoizing function.
         * @example
         *
         * var upperCase = _.memoize(function(string) {
     *   return string.toUpperCase();
     * });
         *
         * upperCase('fred');
         * // => 'FRED'
         *
         * // modifying the result cache
         * upperCase.cache.set('fred', 'BARNEY');
         * upperCase('fred');
         * // => 'BARNEY'
         *
         * // replacing `_.memoize.Cache`
         * var object = { 'user': 'fred' };
         * var other = { 'user': 'barney' };
         * var identity = _.memoize(_.identity);
         *
         * identity(object);
         * // => { 'user': 'fred' }
         * identity(other);
         * // => { 'user': 'fred' }
         *
         * _.memoize.Cache = WeakMap;
         * var identity = _.memoize(_.identity);
         *
         * identity(object);
         * // => { 'user': 'fred' }
         * identity(other);
         * // => { 'user': 'barney' }
         */
        function memoize(func, resolver) {
            if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            var memoized = function() {
                var args = arguments,
                    key = resolver ? resolver.apply(this, args) : args[0],
                    cache = memoized.cache;

                if (cache.has(key)) {
                    return cache.get(key);
                }
                var result = func.apply(this, args);
                memoized.cache = cache.set(key, result);
                return result;
            };
            memoized.cache = new memoize.Cache;
            return memoized;
        }

        /**
         * Creates a function that negates the result of the predicate `func`. The
         * `func` predicate is invoked with the `this` binding and arguments of the
         * created function.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} predicate The predicate to negate.
         * @returns {Function} Returns the new function.
         * @example
         *
         * function isEven(n) {
     *   return n % 2 == 0;
     * }
         *
         * _.filter([1, 2, 3, 4, 5, 6], _.negate(isEven));
         * // => [1, 3, 5]
         */
        function negate(predicate) {
            if (typeof predicate != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return function() {
                return !predicate.apply(this, arguments);
            };
        }

        /**
         * Creates a function that is restricted to invoking `func` once. Repeat calls
         * to the function return the value of the first call. The `func` is invoked
         * with the `this` binding and arguments of the created function.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to restrict.
         * @returns {Function} Returns the new restricted function.
         * @example
         *
         * var initialize = _.once(createApplication);
         * initialize();
         * initialize();
         * // `initialize` invokes `createApplication` once
         */
        function once(func) {
            return before(2, func);
        }

        /**
         * Creates a function that invokes `func` with `partial` arguments prepended
         * to those provided to the new function. This method is like `_.bind` except
         * it does **not** alter the `this` binding.
         *
         * The `_.partial.placeholder` value, which defaults to `_` in monolithic
         * builds, may be used as a placeholder for partially applied arguments.
         *
         * **Note:** This method does not set the "length" property of partially
         * applied functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to partially apply arguments to.
         * @param {...*} [partials] The arguments to be partially applied.
         * @returns {Function} Returns the new partially applied function.
         * @example
         *
         * var greet = function(greeting, name) {
     *   return greeting + ' ' + name;
     * };
         *
         * var sayHelloTo = _.partial(greet, 'hello');
         * sayHelloTo('fred');
         * // => 'hello fred'
         *
         * // using placeholders
         * var greetFred = _.partial(greet, _, 'fred');
         * greetFred('hi');
         * // => 'hi fred'
         */
        var partial = createPartial(PARTIAL_FLAG);

        /**
         * This method is like `_.partial` except that partially applied arguments
         * are appended to those provided to the new function.
         *
         * The `_.partialRight.placeholder` value, which defaults to `_` in monolithic
         * builds, may be used as a placeholder for partially applied arguments.
         *
         * **Note:** This method does not set the "length" property of partially
         * applied functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to partially apply arguments to.
         * @param {...*} [partials] The arguments to be partially applied.
         * @returns {Function} Returns the new partially applied function.
         * @example
         *
         * var greet = function(greeting, name) {
     *   return greeting + ' ' + name;
     * };
         *
         * var greetFred = _.partialRight(greet, 'fred');
         * greetFred('hi');
         * // => 'hi fred'
         *
         * // using placeholders
         * var sayHelloTo = _.partialRight(greet, 'hello', _);
         * sayHelloTo('fred');
         * // => 'hello fred'
         */
        var partialRight = createPartial(PARTIAL_RIGHT_FLAG);

        /**
         * Creates a function that invokes `func` with arguments arranged according
         * to the specified indexes where the argument value at the first index is
         * provided as the first argument, the argument value at the second index is
         * provided as the second argument, and so on.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to rearrange arguments for.
         * @param {...(number|number[])} indexes The arranged argument indexes,
         *  specified as individual indexes or arrays of indexes.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var rearged = _.rearg(function(a, b, c) {
     *   return [a, b, c];
     * }, 2, 0, 1);
         *
         * rearged('b', 'c', 'a')
         * // => ['a', 'b', 'c']
         *
         * var map = _.rearg(_.map, [1, 0]);
         * map(function(n) {
     *   return n * 3;
     * }, [1, 2, 3]);
         * // => [3, 6, 9]
         */
        var rearg = restParam(function(func, indexes) {
            return createWrapper(func, REARG_FLAG, null, null, null, baseFlatten(indexes));
        });

        /**
         * Creates a function that invokes `func` with the `this` binding of the
         * created function and arguments from `start` and beyond provided as an array.
         *
         * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to apply a rest parameter to.
         * @param {number} [start=func.length-1] The start position of the rest parameter.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var say = _.restParam(function(what, names) {
     *   return what + ' ' + _.initial(names).join(', ') +
     *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
     * });
         *
         * say('hello', 'fred', 'barney', 'pebbles');
         * // => 'hello fred, barney, & pebbles'
         */
        function restParam(func, start) {
            if (typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
            return function() {
                var args = arguments,
                    index = -1,
                    length = nativeMax(args.length - start, 0),
                    rest = Array(length);

                while (++index < length) {
                    rest[index] = args[start + index];
                }
                switch (start) {
                    case 0: return func.call(this, rest);
                    case 1: return func.call(this, args[0], rest);
                    case 2: return func.call(this, args[0], args[1], rest);
                }
                var otherArgs = Array(start + 1);
                index = -1;
                while (++index < start) {
                    otherArgs[index] = args[index];
                }
                otherArgs[start] = rest;
                return func.apply(this, otherArgs);
            };
        }

        /**
         * Creates a function that invokes `func` with the `this` binding of the created
         * function and an array of arguments much like [`Function#apply`](https://es5.github.io/#x15.3.4.3).
         *
         * **Note:** This method is based on the [spread operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator).
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to spread arguments over.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var say = _.spread(function(who, what) {
     *   return who + ' says ' + what;
     * });
         *
         * say(['fred', 'hello']);
         * // => 'fred says hello'
         *
         * // with a Promise
         * var numbers = Promise.all([
         *   Promise.resolve(40),
         *   Promise.resolve(36)
         * ]);
         *
         * numbers.then(_.spread(function(x, y) {
     *   return x + y;
     * }));
         * // => a Promise of 76
         */
        function spread(func) {
            if (typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return function(array) {
                return func.apply(this, array);
            };
        }

        /**
         * Creates a throttled function that only invokes `func` at most once per
         * every `wait` milliseconds. The throttled function comes with a `cancel`
         * method to cancel delayed invocations. Provide an options object to indicate
         * that `func` should be invoked on the leading and/or trailing edge of the
         * `wait` timeout. Subsequent calls to the throttled function return the
         * result of the last `func` call.
         *
         * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
         * on the trailing edge of the timeout only if the the throttled function is
         * invoked more than once during the `wait` timeout.
         *
         * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
         * for details over the differences between `_.throttle` and `_.debounce`.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to throttle.
         * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
         * @param {Object} [options] The options object.
         * @param {boolean} [options.leading=true] Specify invoking on the leading
         *  edge of the timeout.
         * @param {boolean} [options.trailing=true] Specify invoking on the trailing
         *  edge of the timeout.
         * @returns {Function} Returns the new throttled function.
         * @example
         *
         * // avoid excessively updating the position while scrolling
         * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
         *
         * // invoke `renewToken` when the click event is fired, but not more than once every 5 minutes
         * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
         *
         * // cancel a trailing throttled call
         * jQuery(window).on('popstate', throttled.cancel);
         */
        function throttle(func, wait, options) {
            var leading = true,
                trailing = true;

            if (typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            if (options === false) {
                leading = false;
            } else if (isObject(options)) {
                leading = 'leading' in options ? !!options.leading : leading;
                trailing = 'trailing' in options ? !!options.trailing : trailing;
            }
            debounceOptions.leading = leading;
            debounceOptions.maxWait = +wait;
            debounceOptions.trailing = trailing;
            return debounce(func, wait, debounceOptions);
        }

        /**
         * Creates a function that provides `value` to the wrapper function as its
         * first argument. Any additional arguments provided to the function are
         * appended to those provided to the wrapper function. The wrapper is invoked
         * with the `this` binding of the created function.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {*} value The value to wrap.
         * @param {Function} wrapper The wrapper function.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
         *
         * p('fred, barney, & pebbles');
         * // => '<p>fred, barney, &amp; pebbles</p>'
         */
        function wrap(value, wrapper) {
            wrapper = wrapper == null ? identity : wrapper;
            return createWrapper(wrapper, PARTIAL_FLAG, null, [value], []);
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates a clone of `value`. If `isDeep` is `true` nested objects are cloned,
         * otherwise they are assigned by reference. If `customizer` is provided it is
         * invoked to produce the cloned values. If `customizer` returns `undefined`
         * cloning is handled by the method instead. The `customizer` is bound to
         * `thisArg` and invoked with two argument; (value [, index|key, object]).
         *
         * **Note:** This method is loosely based on the
         * [structured clone algorithm](http://www.js.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm).
         * The enumerable properties of `arguments` objects and objects created by
         * constructors other than `Object` are cloned to plain `Object` objects. An
         * empty object is returned for uncloneable values such as functions, DOM nodes,
         * Maps, Sets, and WeakMaps.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to clone.
         * @param {boolean} [isDeep] Specify a deep clone.
         * @param {Function} [customizer] The function to customize cloning values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {*} Returns the cloned value.
         * @example
         *
         * var users = [
         *   { 'user': 'barney' },
         *   { 'user': 'fred' }
         * ];
         *
         * var shallow = _.clone(users);
         * shallow[0] === users[0];
         * // => true
         *
         * var deep = _.clone(users, true);
         * deep[0] === users[0];
         * // => false
         *
         * // using a customizer callback
         * var el = _.clone(document.body, function(value) {
     *   if (_.isElement(value)) {
     *     return value.cloneNode(false);
     *   }
     * });
         *
         * el === document.body
         * // => false
         * el.nodeName
         * // => BODY
         * el.childNodes.length;
         * // => 0
         */
        function clone(value, isDeep, customizer, thisArg) {
            if (isDeep && typeof isDeep != 'boolean' && isIterateeCall(value, isDeep, customizer)) {
                isDeep = false;
            }
            else if (typeof isDeep == 'function') {
                thisArg = customizer;
                customizer = isDeep;
                isDeep = false;
            }
            return typeof customizer == 'function'
                ? baseClone(value, isDeep, bindCallback(customizer, thisArg, 1))
                : baseClone(value, isDeep);
        }

        /**
         * Creates a deep clone of `value`. If `customizer` is provided it is invoked
         * to produce the cloned values. If `customizer` returns `undefined` cloning
         * is handled by the method instead. The `customizer` is bound to `thisArg`
         * and invoked with two argument; (value [, index|key, object]).
         *
         * **Note:** This method is loosely based on the
         * [structured clone algorithm](http://www.js.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm).
         * The enumerable properties of `arguments` objects and objects created by
         * constructors other than `Object` are cloned to plain `Object` objects. An
         * empty object is returned for uncloneable values such as functions, DOM nodes,
         * Maps, Sets, and WeakMaps.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to deep clone.
         * @param {Function} [customizer] The function to customize cloning values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {*} Returns the deep cloned value.
         * @example
         *
         * var users = [
         *   { 'user': 'barney' },
         *   { 'user': 'fred' }
         * ];
         *
         * var deep = _.cloneDeep(users);
         * deep[0] === users[0];
         * // => false
         *
         * // using a customizer callback
         * var el = _.cloneDeep(document.body, function(value) {
     *   if (_.isElement(value)) {
     *     return value.cloneNode(true);
     *   }
     * });
         *
         * el === document.body
         * // => false
         * el.nodeName
         * // => BODY
         * el.childNodes.length;
         * // => 20
         */
        function cloneDeep(value, customizer, thisArg) {
            return typeof customizer == 'function'
                ? baseClone(value, true, bindCallback(customizer, thisArg, 1))
                : baseClone(value, true);
        }

        /**
         * Checks if `value` is greater than `other`.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to compare.
         * @param {*} other The other value to compare.
         * @returns {boolean} Returns `true` if `value` is greater than `other`, else `false`.
         * @example
         *
         * _.gt(3, 1);
         * // => true
         *
         * _.gt(3, 3);
         * // => false
         *
         * _.gt(1, 3);
         * // => false
         */
        function gt(value, other) {
            return value > other;
        }

        /**
         * Checks if `value` is greater than or equal to `other`.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to compare.
         * @param {*} other The other value to compare.
         * @returns {boolean} Returns `true` if `value` is greater than or equal to `other`, else `false`.
         * @example
         *
         * _.gte(3, 1);
         * // => true
         *
         * _.gte(3, 3);
         * // => true
         *
         * _.gte(1, 3);
         * // => false
         */
        function gte(value, other) {
            return value >= other;
        }

        /**
         * Checks if `value` is classified as an `arguments` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isArguments(function() { return arguments; }());
         * // => true
         *
         * _.isArguments([1, 2, 3]);
         * // => false
         */
        function isArguments(value) {
            return isObjectLike(value) && isArrayLike(value) && objToString.call(value) == argsTag;
        }

        /**
         * Checks if `value` is classified as an `Array` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isArray([1, 2, 3]);
         * // => true
         *
         * _.isArray(function() { return arguments; }());
         * // => false
         */
        var isArray = nativeIsArray || function(value) {
                return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
            };

        /**
         * Checks if `value` is classified as a boolean primitive or object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isBoolean(false);
         * // => true
         *
         * _.isBoolean(null);
         * // => false
         */
        function isBoolean(value) {
            return value === true || value === false || (isObjectLike(value) && objToString.call(value) == boolTag);
        }

        /**
         * Checks if `value` is classified as a `Date` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isDate(new Date);
         * // => true
         *
         * _.isDate('Mon April 23 2012');
         * // => false
         */
        function isDate(value) {
            return isObjectLike(value) && objToString.call(value) == dateTag;
        }

        /**
         * Checks if `value` is a DOM element.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a DOM element, else `false`.
         * @example
         *
         * _.isElement(document.body);
         * // => true
         *
         * _.isElement('<body>');
         * // => false
         */
        function isElement(value) {
            return !!value && value.nodeType === 1 && isObjectLike(value) &&
                (objToString.call(value).indexOf('Element') > -1);
        }
        // Fallback for environments without DOM support.
        if (!support.dom) {
            isElement = function(value) {
                return !!value && value.nodeType === 1 && isObjectLike(value) && !isPlainObject(value);
            };
        }

        /**
         * Checks if `value` is empty. A value is considered empty unless it is an
         * `arguments` object, array, string, or jQuery-like collection with a length
         * greater than `0` or an object with own enumerable properties.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {Array|Object|string} value The value to inspect.
         * @returns {boolean} Returns `true` if `value` is empty, else `false`.
         * @example
         *
         * _.isEmpty(null);
         * // => true
         *
         * _.isEmpty(true);
         * // => true
         *
         * _.isEmpty(1);
         * // => true
         *
         * _.isEmpty([1, 2, 3]);
         * // => false
         *
         * _.isEmpty({ 'a': 1 });
         * // => false
         */
        function isEmpty(value) {
            if (value == null) {
                return true;
            }
            if (isArrayLike(value) && (isArray(value) || isString(value) || isArguments(value) ||
                (isObjectLike(value) && isFunction(value.splice)))) {
                return !value.length;
            }
            return !keys(value).length;
        }

        /**
         * Performs a deep comparison between two values to determine if they are
         * equivalent. If `customizer` is provided it is invoked to compare values.
         * If `customizer` returns `undefined` comparisons are handled by the method
         * instead. The `customizer` is bound to `thisArg` and invoked with three
         * arguments: (value, other [, index|key]).
         *
         * **Note:** This method supports comparing arrays, booleans, `Date` objects,
         * numbers, `Object` objects, regexes, and strings. Objects are compared by
         * their own, not inherited, enumerable properties. Functions and DOM nodes
         * are **not** supported. Provide a customizer function to extend support
         * for comparing other values.
         *
         * @static
         * @memberOf _
         * @alias eq
         * @category Lang
         * @param {*} value The value to compare.
         * @param {*} other The other value to compare.
         * @param {Function} [customizer] The function to customize value comparisons.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
         * @example
         *
         * var object = { 'user': 'fred' };
         * var other = { 'user': 'fred' };
         *
         * object == other;
         * // => false
         *
         * _.isEqual(object, other);
         * // => true
         *
         * // using a customizer callback
         * var array = ['hello', 'goodbye'];
         * var other = ['hi', 'goodbye'];
         *
         * _.isEqual(array, other, function(value, other) {
     *   if (_.every([value, other], RegExp.prototype.test, /^h(?:i|ello)$/)) {
     *     return true;
     *   }
     * });
         * // => true
         */
        function isEqual(value, other, customizer, thisArg) {
            customizer = typeof customizer == 'function' ? bindCallback(customizer, thisArg, 3) : undefined;
            var result = customizer ? customizer(value, other) : undefined;
            return  result === undefined ? baseIsEqual(value, other, customizer) : !!result;
        }

        /**
         * Checks if `value` is an `Error`, `EvalError`, `RangeError`, `ReferenceError`,
         * `SyntaxError`, `TypeError`, or `URIError` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is an error object, else `false`.
         * @example
         *
         * _.isError(new Error);
         * // => true
         *
         * _.isError(Error);
         * // => false
         */
        function isError(value) {
            return isObjectLike(value) && typeof value.message == 'string' && objToString.call(value) == errorTag;
        }

        /**
         * Checks if `value` is a finite primitive number.
         *
         * **Note:** This method is based on [`Number.isFinite`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.isfinite).
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a finite number, else `false`.
         * @example
         *
         * _.isFinite(10);
         * // => true
         *
         * _.isFinite('10');
         * // => false
         *
         * _.isFinite(true);
         * // => false
         *
         * _.isFinite(Object(10));
         * // => false
         *
         * _.isFinite(Infinity);
         * // => false
         */
        var isFinite = nativeNumIsFinite || function(value) {
                return typeof value == 'number' && nativeIsFinite(value);
            };

        /**
         * Checks if `value` is classified as a `Function` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isFunction(_);
         * // => true
         *
         * _.isFunction(/abc/);
         * // => false
         */
        var isFunction = !(baseIsFunction(/x/) || (Uint8Array && !baseIsFunction(Uint8Array))) ? baseIsFunction : function(value) {
            // The use of `Object#toString` avoids issues with the `typeof` operator
            // in older versions of Chrome and Safari which return 'function' for regexes
            // and Safari 8 equivalents which return 'object' for typed array constructors.
            return objToString.call(value) == funcTag;
        };

        /**
         * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
         * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is an object, else `false`.
         * @example
         *
         * _.isObject({});
         * // => true
         *
         * _.isObject([1, 2, 3]);
         * // => true
         *
         * _.isObject(1);
         * // => false
         */
        function isObject(value) {
            // Avoid a V8 JIT bug in Chrome 19-20.
            // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
            var type = typeof value;
            return !!value && (type == 'object' || type == 'function');
        }

        /**
         * Performs a deep comparison between `object` and `source` to determine if
         * `object` contains equivalent property values. If `customizer` is provided
         * it is invoked to compare values. If `customizer` returns `undefined`
         * comparisons are handled by the method instead. The `customizer` is bound
         * to `thisArg` and invoked with three arguments: (value, other, index|key).
         *
         * **Note:** This method supports comparing properties of arrays, booleans,
         * `Date` objects, numbers, `Object` objects, regexes, and strings. Functions
         * and DOM nodes are **not** supported. Provide a customizer function to extend
         * support for comparing other values.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {Object} object The object to inspect.
         * @param {Object} source The object of property values to match.
         * @param {Function} [customizer] The function to customize value comparisons.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {boolean} Returns `true` if `object` is a match, else `false`.
         * @example
         *
         * var object = { 'user': 'fred', 'age': 40 };
         *
         * _.isMatch(object, { 'age': 40 });
         * // => true
         *
         * _.isMatch(object, { 'age': 36 });
         * // => false
         *
         * // using a customizer callback
         * var object = { 'greeting': 'hello' };
         * var source = { 'greeting': 'hi' };
         *
         * _.isMatch(object, source, function(value, other) {
     *   return _.every([value, other], RegExp.prototype.test, /^h(?:i|ello)$/) || undefined;
     * });
         * // => true
         */
        function isMatch(object, source, customizer, thisArg) {
            customizer = typeof customizer == 'function' ? bindCallback(customizer, thisArg, 3) : undefined;
            return baseIsMatch(object, getMatchData(source), customizer);
        }

        /**
         * Checks if `value` is `NaN`.
         *
         * **Note:** This method is not the same as [`isNaN`](https://es5.github.io/#x15.1.2.4)
         * which returns `true` for `undefined` and other non-numeric values.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
         * @example
         *
         * _.isNaN(NaN);
         * // => true
         *
         * _.isNaN(new Number(NaN));
         * // => true
         *
         * isNaN(undefined);
         * // => true
         *
         * _.isNaN(undefined);
         * // => false
         */
        function isNaN(value) {
            // An `NaN` primitive is the only value that is not equal to itself.
            // Perform the `toStringTag` check first to avoid errors with some host objects in IE.
            return isNumber(value) && value != +value;
        }

        /**
         * Checks if `value` is a native function.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
         * @example
         *
         * _.isNative(Array.prototype.push);
         * // => true
         *
         * _.isNative(_);
         * // => false
         */
        function isNative(value) {
            if (value == null) {
                return false;
            }
            if (objToString.call(value) == funcTag) {
                return reIsNative.test(fnToString.call(value));
            }
            return isObjectLike(value) && reIsHostCtor.test(value);
        }

        /**
         * Checks if `value` is `null`.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is `null`, else `false`.
         * @example
         *
         * _.isNull(null);
         * // => true
         *
         * _.isNull(void 0);
         * // => false
         */
        function isNull(value) {
            return value === null;
        }

        /**
         * Checks if `value` is classified as a `Number` primitive or object.
         *
         * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are classified
         * as numbers, use the `_.isFinite` method.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isNumber(8.4);
         * // => true
         *
         * _.isNumber(NaN);
         * // => true
         *
         * _.isNumber('8.4');
         * // => false
         */
        function isNumber(value) {
            return typeof value == 'number' || (isObjectLike(value) && objToString.call(value) == numberTag);
        }

        /**
         * Checks if `value` is a plain object, that is, an object created by the
         * `Object` constructor or one with a `[[Prototype]]` of `null`.
         *
         * **Note:** This method assumes objects created by the `Object` constructor
         * have no inherited enumerable properties.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     * }
         *
         * _.isPlainObject(new Foo);
         * // => false
         *
         * _.isPlainObject([1, 2, 3]);
         * // => false
         *
         * _.isPlainObject({ 'x': 0, 'y': 0 });
         * // => true
         *
         * _.isPlainObject(Object.create(null));
         * // => true
         */
        var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
            if (!(value && objToString.call(value) == objectTag)) {
                return false;
            }
            var valueOf = getNative(value, 'valueOf'),
                objProto = valueOf && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

            return objProto
                ? (value == objProto || getPrototypeOf(value) == objProto)
                : shimIsPlainObject(value);
        };

        /**
         * Checks if `value` is classified as a `RegExp` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isRegExp(/abc/);
         * // => true
         *
         * _.isRegExp('/abc/');
         * // => false
         */
        function isRegExp(value) {
            return isObjectLike(value) && objToString.call(value) == regexpTag;
        }

        /**
         * Checks if `value` is classified as a `String` primitive or object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isString('abc');
         * // => true
         *
         * _.isString(1);
         * // => false
         */
        function isString(value) {
            return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
        }

        /**
         * Checks if `value` is classified as a typed array.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isTypedArray(new Uint8Array);
         * // => true
         *
         * _.isTypedArray([]);
         * // => false
         */
        function isTypedArray(value) {
            return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
        }

        /**
         * Checks if `value` is `undefined`.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
         * @example
         *
         * _.isUndefined(void 0);
         * // => true
         *
         * _.isUndefined(null);
         * // => false
         */
        function isUndefined(value) {
            return value === undefined;
        }

        /**
         * Checks if `value` is less than `other`.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to compare.
         * @param {*} other The other value to compare.
         * @returns {boolean} Returns `true` if `value` is less than `other`, else `false`.
         * @example
         *
         * _.lt(1, 3);
         * // => true
         *
         * _.lt(3, 3);
         * // => false
         *
         * _.lt(3, 1);
         * // => false
         */
        function lt(value, other) {
            return value < other;
        }

        /**
         * Checks if `value` is less than or equal to `other`.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to compare.
         * @param {*} other The other value to compare.
         * @returns {boolean} Returns `true` if `value` is less than or equal to `other`, else `false`.
         * @example
         *
         * _.lte(1, 3);
         * // => true
         *
         * _.lte(3, 3);
         * // => true
         *
         * _.lte(3, 1);
         * // => false
         */
        function lte(value, other) {
            return value <= other;
        }

        /**
         * Converts `value` to an array.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to convert.
         * @returns {Array} Returns the converted array.
         * @example
         *
         * (function() {
     *   return _.toArray(arguments).slice(1);
     * }(1, 2, 3));
         * // => [2, 3]
         */
        function toArray(value) {
            var length = value ? getLength(value) : 0;
            if (!isLength(length)) {
                return values(value);
            }
            if (!length) {
                return [];
            }
            return arrayCopy(value);
        }

        /**
         * Converts `value` to a plain object flattening inherited enumerable
         * properties of `value` to own properties of the plain object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to convert.
         * @returns {Object} Returns the converted plain object.
         * @example
         *
         * function Foo() {
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.assign({ 'a': 1 }, new Foo);
         * // => { 'a': 1, 'b': 2 }
         *
         * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
         * // => { 'a': 1, 'b': 2, 'c': 3 }
         */
        function toPlainObject(value) {
            return baseCopy(value, keysIn(value));
        }

        /*------------------------------------------------------------------------*/

        /**
         * Assigns own enumerable properties of source object(s) to the destination
         * object. Subsequent sources overwrite property assignments of previous sources.
         * If `customizer` is provided it is invoked to produce the assigned values.
         * The `customizer` is bound to `thisArg` and invoked with five arguments:
         * (objectValue, sourceValue, key, object, source).
         *
         * **Note:** This method mutates `object` and is based on
         * [`Object.assign`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign).
         *
         * @static
         * @memberOf _
         * @alias extend
         * @category Object
         * @param {Object} object The destination object.
         * @param {...Object} [sources] The source objects.
         * @param {Function} [customizer] The function to customize assigned values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
         * // => { 'user': 'fred', 'age': 40 }
         *
         * // using a customizer callback
         * var defaults = _.partialRight(_.assign, function(value, other) {
     *   return _.isUndefined(value) ? other : value;
     * });
         *
         * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
         * // => { 'user': 'barney', 'age': 36 }
         */
        var assign = createAssigner(function(object, source, customizer) {
            return customizer
                ? assignWith(object, source, customizer)
                : baseAssign(object, source);
        });

        /**
         * Creates an object that inherits from the given `prototype` object. If a
         * `properties` object is provided its own enumerable properties are assigned
         * to the created object.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} prototype The object to inherit from.
         * @param {Object} [properties] The properties to assign to the object.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Object} Returns the new object.
         * @example
         *
         * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
         *
         * function Circle() {
     *   Shape.call(this);
     * }
         *
         * Circle.prototype = _.create(Shape.prototype, {
     *   'constructor': Circle
     * });
         *
         * var circle = new Circle;
         * circle instanceof Circle;
         * // => true
         *
         * circle instanceof Shape;
         * // => true
         */
        function create(prototype, properties, guard) {
            var result = baseCreate(prototype);
            if (guard && isIterateeCall(prototype, properties, guard)) {
                properties = null;
            }
            return properties ? baseAssign(result, properties) : result;
        }

        /**
         * Assigns own enumerable properties of source object(s) to the destination
         * object for all destination properties that resolve to `undefined`. Once a
         * property is set, additional values of the same property are ignored.
         *
         * **Note:** This method mutates `object`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The destination object.
         * @param {...Object} [sources] The source objects.
         * @returns {Object} Returns `object`.
         * @example
         *
         * _.defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
         * // => { 'user': 'barney', 'age': 36 }
         */
        var defaults = restParam(function(args) {
            var object = args[0];
            if (object == null) {
                return object;
            }
            args.push(assignDefaults);
            return assign.apply(undefined, args);
        });

        /**
         * This method is like `_.find` except that it returns the key of the first
         * element `predicate` returns truthy for instead of the element itself.
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {string|undefined} Returns the key of the matched element, else `undefined`.
         * @example
         *
         * var users = {
     *   'barney':  { 'age': 36, 'active': true },
     *   'fred':    { 'age': 40, 'active': false },
     *   'pebbles': { 'age': 1,  'active': true }
     * };
         *
         * _.findKey(users, function(chr) {
     *   return chr.age < 40;
     * });
         * // => 'barney' (iteration order is not guaranteed)
         *
         * // using the `_.matches` callback shorthand
         * _.findKey(users, { 'age': 1, 'active': true });
         * // => 'pebbles'
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.findKey(users, 'active', false);
         * // => 'fred'
         *
         * // using the `_.property` callback shorthand
         * _.findKey(users, 'active');
         * // => 'barney'
         */
        var findKey = createFindKey(baseForOwn);

        /**
         * This method is like `_.findKey` except that it iterates over elements of
         * a collection in the opposite order.
         *
         * If a property name is provided for `predicate` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `predicate` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {string|undefined} Returns the key of the matched element, else `undefined`.
         * @example
         *
         * var users = {
     *   'barney':  { 'age': 36, 'active': true },
     *   'fred':    { 'age': 40, 'active': false },
     *   'pebbles': { 'age': 1,  'active': true }
     * };
         *
         * _.findLastKey(users, function(chr) {
     *   return chr.age < 40;
     * });
         * // => returns `pebbles` assuming `_.findKey` returns `barney`
         *
         * // using the `_.matches` callback shorthand
         * _.findLastKey(users, { 'age': 36, 'active': true });
         * // => 'barney'
         *
         * // using the `_.matchesProperty` callback shorthand
         * _.findLastKey(users, 'active', false);
         * // => 'fred'
         *
         * // using the `_.property` callback shorthand
         * _.findLastKey(users, 'active');
         * // => 'pebbles'
         */
        var findLastKey = createFindKey(baseForOwnRight);

        /**
         * Iterates over own and inherited enumerable properties of an object invoking
         * `iteratee` for each property. The `iteratee` is bound to `thisArg` and invoked
         * with three arguments: (value, key, object). Iteratee functions may exit
         * iteration early by explicitly returning `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.forIn(new Foo, function(value, key) {
     *   console.log(key);
     * });
         * // => logs.json 'a', 'b', and 'c' (iteration order is not guaranteed)
         */
        var forIn = createForIn(baseFor);

        /**
         * This method is like `_.forIn` except that it iterates over properties of
         * `object` in the opposite order.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.forInRight(new Foo, function(value, key) {
     *   console.log(key);
     * });
         * // => logs.json 'c', 'b', and 'a' assuming `_.forIn ` logs.json 'a', 'b', and 'c'
         */
        var forInRight = createForIn(baseForRight);

        /**
         * Iterates over own enumerable properties of an object invoking `iteratee`
         * for each property. The `iteratee` is bound to `thisArg` and invoked with
         * three arguments: (value, key, object). Iteratee functions may exit iteration
         * early by explicitly returning `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.forOwn(new Foo, function(value, key) {
     *   console.log(key);
     * });
         * // => logs.json 'a' and 'b' (iteration order is not guaranteed)
         */
        var forOwn = createForOwn(baseForOwn);

        /**
         * This method is like `_.forOwn` except that it iterates over properties of
         * `object` in the opposite order.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.forOwnRight(new Foo, function(value, key) {
     *   console.log(key);
     * });
         * // => logs.json 'b' and 'a' assuming `_.forOwn` logs.json 'a' and 'b'
         */
        var forOwnRight = createForOwn(baseForOwnRight);

        /**
         * Creates an array of function property names from all enumerable properties,
         * own and inherited, of `object`.
         *
         * @static
         * @memberOf _
         * @alias methods
         * @category Object
         * @param {Object} object The object to inspect.
         * @returns {Array} Returns the new array of property names.
         * @example
         *
         * _.functions(_);
         * // => ['after', 'ary', 'assign', ...]
         */
        function functions(object) {
            return baseFunctions(object, keysIn(object));
        }

        /**
         * Gets the property value at `path` of `object`. If the resolved value is
         * `undefined` the `defaultValue` is used in its place.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @param {Array|string} path The path of the property to get.
         * @param {*} [defaultValue] The value returned if the resolved value is `undefined`.
         * @returns {*} Returns the resolved value.
         * @example
         *
         * var object = { 'a': [{ 'b': { 'c': 3 } }] };
         *
         * _.get(object, 'a[0].b.c');
         * // => 3
         *
         * _.get(object, ['a', '0', 'b', 'c']);
         * // => 3
         *
         * _.get(object, 'a.b.c', 'default');
         * // => 'default'
         */
        function get(object, path, defaultValue) {
            var result = object == null ? undefined : baseGet(object, toPath(path), path + '');
            return result === undefined ? defaultValue : result;
        }

        /**
         * Checks if `path` is a direct property.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @param {Array|string} path The path to check.
         * @returns {boolean} Returns `true` if `path` is a direct property, else `false`.
         * @example
         *
         * var object = { 'a': { 'b': { 'c': 3 } } };
         *
         * _.has(object, 'a');
         * // => true
         *
         * _.has(object, 'a.b.c');
         * // => true
         *
         * _.has(object, ['a', 'b', 'c']);
         * // => true
         */
        function has(object, path) {
            if (object == null) {
                return false;
            }
            var result = hasOwnProperty.call(object, path);
            if (!result && !isKey(path)) {
                path = toPath(path);
                object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
                if (object == null) {
                    return false;
                }
                path = last(path);
                result = hasOwnProperty.call(object, path);
            }
            return result || (isLength(object.length) && isIndex(path, object.length) &&
                (isArray(object) || isArguments(object)));
        }

        /**
         * Creates an object composed of the inverted keys and values of `object`.
         * If `object` contains duplicate values, subsequent values overwrite property
         * assignments of previous values unless `multiValue` is `true`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to invert.
         * @param {boolean} [multiValue] Allow multiple values per key.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Object} Returns the new inverted object.
         * @example
         *
         * var object = { 'a': 1, 'b': 2, 'c': 1 };
         *
         * _.invert(object);
         * // => { '1': 'c', '2': 'b' }
         *
         * // with `multiValue`
         * _.invert(object, true);
         * // => { '1': ['a', 'c'], '2': ['b'] }
         */
        function invert(object, multiValue, guard) {
            if (guard && isIterateeCall(object, multiValue, guard)) {
                multiValue = null;
            }
            var index = -1,
                props = keys(object),
                length = props.length,
                result = {};

            while (++index < length) {
                var key = props[index],
                    value = object[key];

                if (multiValue) {
                    if (hasOwnProperty.call(result, value)) {
                        result[value].push(key);
                    } else {
                        result[value] = [key];
                    }
                }
                else {
                    result[value] = key;
                }
            }
            return result;
        }

        /**
         * Creates an array of the own enumerable property names of `object`.
         *
         * **Note:** Non-object values are coerced to objects. See the
         * [ES spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.keys)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @returns {Array} Returns the array of property names.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.keys(new Foo);
         * // => ['a', 'b'] (iteration order is not guaranteed)
         *
         * _.keys('hi');
         * // => ['0', '1']
         */
        var keys = !nativeKeys ? shimKeys : function(object) {
            var Ctor = object == null ? null : object.constructor;
            if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
                (typeof object != 'function' && isArrayLike(object))) {
                return shimKeys(object);
            }
            return isObject(object) ? nativeKeys(object) : [];
        };

        /**
         * Creates an array of the own and inherited enumerable property names of `object`.
         *
         * **Note:** Non-object values are coerced to objects.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @returns {Array} Returns the array of property names.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.keysIn(new Foo);
         * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
         */
        function keysIn(object) {
            if (object == null) {
                return [];
            }
            if (!isObject(object)) {
                object = Object(object);
            }
            var length = object.length;
            length = (length && isLength(length) &&
                (isArray(object) || isArguments(object)) && length) || 0;

            var Ctor = object.constructor,
                index = -1,
                isProto = typeof Ctor == 'function' && Ctor.prototype === object,
                result = Array(length),
                skipIndexes = length > 0;

            while (++index < length) {
                result[index] = (index + '');
            }
            for (var key in object) {
                if (!(skipIndexes && isIndex(key, length)) &&
                    !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
                    result.push(key);
                }
            }
            return result;
        }

        /**
         * The opposite of `_.mapValues`; this method creates an object with the
         * same values as `object` and keys generated by running each own enumerable
         * property of `object` through `iteratee`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the new mapped object.
         * @example
         *
         * _.mapKeys({ 'a': 1, 'b': 2 }, function(value, key) {
     *   return key + value;
     * });
         * // => { 'a1': 1, 'b2': 2 }
         */
        var mapKeys = createObjectMapper(true);

        /**
         * Creates an object with the same keys as `object` and values generated by
         * running each own enumerable property of `object` through `iteratee`. The
         * iteratee function is bound to `thisArg` and invoked with three arguments:
         * (value, key, object).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the new mapped object.
         * @example
         *
         * _.mapValues({ 'a': 1, 'b': 2 }, function(n) {
     *   return n * 3;
     * });
         * // => { 'a': 3, 'b': 6 }
         *
         * var users = {
     *   'fred':    { 'user': 'fred',    'age': 40 },
     *   'pebbles': { 'user': 'pebbles', 'age': 1 }
     * };
         *
         * // using the `_.property` callback shorthand
         * _.mapValues(users, 'age');
         * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
         */
        var mapValues = createObjectMapper();

        /**
         * Recursively merges own enumerable properties of the source object(s), that
         * don't resolve to `undefined` into the destination object. Subsequent sources
         * overwrite property assignments of previous sources. If `customizer` is
         * provided it is invoked to produce the merged values of the destination and
         * source properties. If `customizer` returns `undefined` merging is handled
         * by the method instead. The `customizer` is bound to `thisArg` and invoked
         * with five arguments: (objectValue, sourceValue, key, object, source).
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The destination object.
         * @param {...Object} [sources] The source objects.
         * @param {Function} [customizer] The function to customize assigned values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * var users = {
     *   'data': [{ 'user': 'barney' }, { 'user': 'fred' }]
     * };
         *
         * var ages = {
     *   'data': [{ 'age': 36 }, { 'age': 40 }]
     * };
         *
         * _.merge(users, ages);
         * // => { 'data': [{ 'user': 'barney', 'age': 36 }, { 'user': 'fred', 'age': 40 }] }
         *
         * // using a customizer callback
         * var object = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
         *
         * var other = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
         *
         * _.merge(object, other, function(a, b) {
     *   if (_.isArray(a)) {
     *     return a.concat(b);
     *   }
     * });
         * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot'] }
         */
        var merge = createAssigner(baseMerge);

        /**
         * The opposite of `_.pick`; this method creates an object composed of the
         * own and inherited enumerable properties of `object` that are not omitted.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The source object.
         * @param {Function|...(string|string[])} [predicate] The function invoked per
         *  iteration or property names to omit, specified as individual property
         *  names or arrays of property names.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Object} Returns the new object.
         * @example
         *
         * var object = { 'user': 'fred', 'age': 40 };
         *
         * _.omit(object, 'age');
         * // => { 'user': 'fred' }
         *
         * _.omit(object, _.isNumber);
         * // => { 'user': 'fred' }
         */
        var omit = restParam(function(object, props) {
            if (object == null) {
                return {};
            }
            if (typeof props[0] != 'function') {
                var props = arrayMap(baseFlatten(props), String);
                return pickByArray(object, baseDifference(keysIn(object), props));
            }
            var predicate = bindCallback(props[0], props[1], 3);
            return pickByCallback(object, function(value, key, object) {
                return !predicate(value, key, object);
            });
        });

        /**
         * Creates a two dimensional array of the key-value pairs for `object`,
         * e.g. `[[key1, value1], [key2, value2]]`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @returns {Array} Returns the new array of key-value pairs.
         * @example
         *
         * _.pairs({ 'barney': 36, 'fred': 40 });
         * // => [['barney', 36], ['fred', 40]] (iteration order is not guaranteed)
         */
        function pairs(object) {
            object = toObject(object);

            var index = -1,
                props = keys(object),
                length = props.length,
                result = Array(length);

            while (++index < length) {
                var key = props[index];
                result[index] = [key, object[key]];
            }
            return result;
        }

        /**
         * Creates an object composed of the picked `object` properties. Property
         * names may be specified as individual arguments or as arrays of property
         * names. If `predicate` is provided it is invoked for each property of `object`
         * picking the properties `predicate` returns truthy for. The predicate is
         * bound to `thisArg` and invoked with three arguments: (value, key, object).
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The source object.
         * @param {Function|...(string|string[])} [predicate] The function invoked per
         *  iteration or property names to pick, specified as individual property
         *  names or arrays of property names.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Object} Returns the new object.
         * @example
         *
         * var object = { 'user': 'fred', 'age': 40 };
         *
         * _.pick(object, 'user');
         * // => { 'user': 'fred' }
         *
         * _.pick(object, _.isString);
         * // => { 'user': 'fred' }
         */
        var pick = restParam(function(object, props) {
            if (object == null) {
                return {};
            }
            return typeof props[0] == 'function'
                ? pickByCallback(object, bindCallback(props[0], props[1], 3))
                : pickByArray(object, baseFlatten(props));
        });

        /**
         * This method is like `_.get` except that if the resolved value is a function
         * it is invoked with the `this` binding of its parent object and its result
         * is returned.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @param {Array|string} path The path of the property to resolve.
         * @param {*} [defaultValue] The value returned if the resolved value is `undefined`.
         * @returns {*} Returns the resolved value.
         * @example
         *
         * var object = { 'a': [{ 'b': { 'c1': 3, 'c2': _.constant(4) } }] };
         *
         * _.result(object, 'a[0].b.c1');
         * // => 3
         *
         * _.result(object, 'a[0].b.c2');
         * // => 4
         *
         * _.result(object, 'a.b.c', 'default');
         * // => 'default'
         *
         * _.result(object, 'a.b.c', _.constant('default'));
         * // => 'default'
         */
        function result(object, path, defaultValue) {
            var result = object == null ? undefined : object[path];
            if (result === undefined) {
                if (object != null && !isKey(path, object)) {
                    path = toPath(path);
                    object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
                    result = object == null ? undefined : object[last(path)];
                }
                result = result === undefined ? defaultValue : result;
            }
            return isFunction(result) ? result.call(object) : result;
        }

        /**
         * Sets the property value of `path` on `object`. If a portion of `path`
         * does not exist it is created.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to augment.
         * @param {Array|string} path The path of the property to set.
         * @param {*} value The value to set.
         * @returns {Object} Returns `object`.
         * @example
         *
         * var object = { 'a': [{ 'b': { 'c': 3 } }] };
         *
         * _.set(object, 'a[0].b.c', 4);
         * console.log(object.a[0].b.c);
         * // => 4
         *
         * _.set(object, 'x[0].y.z', 5);
         * console.log(object.x[0].y.z);
         * // => 5
         */
        function set(object, path, value) {
            if (object == null) {
                return object;
            }
            var pathKey = (path + '');
            path = (object[pathKey] != null || isKey(path, object)) ? [pathKey] : toPath(path);

            var index = -1,
                length = path.length,
                lastIndex = length - 1,
                nested = object;

            while (nested != null && ++index < length) {
                var key = path[index];
                if (isObject(nested)) {
                    if (index == lastIndex) {
                        nested[key] = value;
                    } else if (nested[key] == null) {
                        nested[key] = isIndex(path[index + 1]) ? [] : {};
                    }
                }
                nested = nested[key];
            }
            return object;
        }

        /**
         * An alternative to `_.reduce`; this method transforms `object` to a new
         * `accumulator` object which is the result of running each of its own enumerable
         * properties through `iteratee`, with each invocation potentially mutating
         * the `accumulator` object. The `iteratee` is bound to `thisArg` and invoked
         * with four arguments: (accumulator, value, key, object). Iteratee functions
         * may exit iteration early by explicitly returning `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Array|Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [accumulator] The custom accumulator value.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the accumulated value.
         * @example
         *
         * _.transform([2, 3, 4], function(result, n) {
     *   result.push(n *= n);
     *   return n % 2 == 0;
     * });
         * // => [4, 9]
         *
         * _.transform({ 'a': 1, 'b': 2 }, function(result, n, key) {
     *   result[key] = n * 3;
     * });
         * // => { 'a': 3, 'b': 6 }
         */
        function transform(object, iteratee, accumulator, thisArg) {
            var isArr = isArray(object) || isTypedArray(object);
            iteratee = getCallback(iteratee, thisArg, 4);

            if (accumulator == null) {
                if (isArr || isObject(object)) {
                    var Ctor = object.constructor;
                    if (isArr) {
                        accumulator = isArray(object) ? new Ctor : [];
                    } else {
                        accumulator = baseCreate(isFunction(Ctor) ? Ctor.prototype : null);
                    }
                } else {
                    accumulator = {};
                }
            }
            (isArr ? arrayEach : baseForOwn)(object, function(value, index, object) {
                return iteratee(accumulator, value, index, object);
            });
            return accumulator;
        }

        /**
         * Creates an array of the own enumerable property values of `object`.
         *
         * **Note:** Non-object values are coerced to objects.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @returns {Array} Returns the array of property values.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.values(new Foo);
         * // => [1, 2] (iteration order is not guaranteed)
         *
         * _.values('hi');
         * // => ['h', 'i']
         */
        function values(object) {
            return baseValues(object, keys(object));
        }

        /**
         * Creates an array of the own and inherited enumerable property values
         * of `object`.
         *
         * **Note:** Non-object values are coerced to objects.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @returns {Array} Returns the array of property values.
         * @example
         *
         * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
         *
         * Foo.prototype.c = 3;
         *
         * _.valuesIn(new Foo);
         * // => [1, 2, 3] (iteration order is not guaranteed)
         */
        function valuesIn(object) {
            return baseValues(object, keysIn(object));
        }

        /*------------------------------------------------------------------------*/

        /**
         * Checks if `n` is between `start` and up to but not including, `end`. If
         * `end` is not specified it is set to `start` with `start` then set to `0`.
         *
         * @static
         * @memberOf _
         * @category Number
         * @param {number} n The number to check.
         * @param {number} [start=0] The start of the range.
         * @param {number} end The end of the range.
         * @returns {boolean} Returns `true` if `n` is in the range, else `false`.
         * @example
         *
         * _.inRange(3, 2, 4);
         * // => true
         *
         * _.inRange(4, 8);
         * // => true
         *
         * _.inRange(4, 2);
         * // => false
         *
         * _.inRange(2, 2);
         * // => false
         *
         * _.inRange(1.2, 2);
         * // => true
         *
         * _.inRange(5.2, 4);
         * // => false
         */
        function inRange(value, start, end) {
            start = +start || 0;
            if (typeof end === 'undefined') {
                end = start;
                start = 0;
            } else {
                end = +end || 0;
            }
            return value >= nativeMin(start, end) && value < nativeMax(start, end);
        }

        /**
         * Produces a random number between `min` and `max` (inclusive). If only one
         * argument is provided a number between `0` and the given number is returned.
         * If `floating` is `true`, or either `min` or `max` are floats, a floating-point
         * number is returned instead of an integer.
         *
         * @static
         * @memberOf _
         * @category Number
         * @param {number} [min=0] The minimum possible value.
         * @param {number} [max=1] The maximum possible value.
         * @param {boolean} [floating] Specify returning a floating-point number.
         * @returns {number} Returns the random number.
         * @example
         *
         * _.random(0, 5);
         * // => an integer between 0 and 5
         *
         * _.random(5);
         * // => also an integer between 0 and 5
         *
         * _.random(5, true);
         * // => a floating-point number between 0 and 5
         *
         * _.random(1.2, 5.2);
         * // => a floating-point number between 1.2 and 5.2
         */
        function random(min, max, floating) {
            if (floating && isIterateeCall(min, max, floating)) {
                max = floating = null;
            }
            var noMin = min == null,
                noMax = max == null;

            if (floating == null) {
                if (noMax && typeof min == 'boolean') {
                    floating = min;
                    min = 1;
                }
                else if (typeof max == 'boolean') {
                    floating = max;
                    noMax = true;
                }
            }
            if (noMin && noMax) {
                max = 1;
                noMax = false;
            }
            min = +min || 0;
            if (noMax) {
                max = min;
                min = 0;
            } else {
                max = +max || 0;
            }
            if (floating || min % 1 || max % 1) {
                var rand = nativeRandom();
                return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand + '').length - 1)))), max);
            }
            return baseRandom(min, max);
        }

        /*------------------------------------------------------------------------*/

        /**
         * Converts `string` to [camel case](https://en.wikipedia.org/wiki/CamelCase).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to convert.
         * @returns {string} Returns the camel cased string.
         * @example
         *
         * _.camelCase('Foo Bar');
         * // => 'fooBar'
         *
         * _.camelCase('--foo-bar');
         * // => 'fooBar'
         *
         * _.camelCase('__foo_bar__');
         * // => 'fooBar'
         */
        var camelCase = createCompounder(function(result, word, index) {
            word = word.toLowerCase();
            return result + (index ? (word.charAt(0).toUpperCase() + word.slice(1)) : word);
        });

        /**
         * Capitalizes the first character of `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to capitalize.
         * @returns {string} Returns the capitalized string.
         * @example
         *
         * _.capitalize('fred');
         * // => 'Fred'
         */
        function capitalize(string) {
            string = baseToString(string);
            return string && (string.charAt(0).toUpperCase() + string.slice(1));
        }

        /**
         * Deburrs `string` by converting [latin-1 supplementary letters](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
         * to basic latin letters and removing [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to deburr.
         * @returns {string} Returns the deburred string.
         * @example
         *
         * _.deburr('d?j? vu');
         * // => 'deja vu'
         */
        function deburr(string) {
            string = baseToString(string);
            return string && string.replace(reLatin1, deburrLetter).replace(reComboMark, '');
        }

        /**
         * Checks if `string` ends with the given target string.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to search.
         * @param {string} [target] The string to search for.
         * @param {number} [position=string.length] The position to search from.
         * @returns {boolean} Returns `true` if `string` ends with `target`, else `false`.
         * @example
         *
         * _.endsWith('abc', 'c');
         * // => true
         *
         * _.endsWith('abc', 'b');
         * // => false
         *
         * _.endsWith('abc', 'b', 2);
         * // => true
         */
        function endsWith(string, target, position) {
            string = baseToString(string);
            target = (target + '');

            var length = string.length;
            position = position === undefined
                ? length
                : nativeMin(position < 0 ? 0 : (+position || 0), length);

            position -= target.length;
            return position >= 0 && string.indexOf(target, position) == position;
        }

        /**
         * Converts the characters "&", "<", ">", '"', "'", and "\`", in `string` to
         * their corresponding HTML entities.
         *
         * **Note:** No other characters are escaped. To escape additional characters
         * use a third-party library like [_he_](https://mths.be/he).
         *
         * Though the ">" character is escaped for symmetry, characters like
         * ">" and "/" don't need escaping in HTML and have no special meaning
         * unless they're part of a tag or unquoted attribute value.
         * See [Mathias Bynens's article](https://mathiasbynens.be/notes/ambiguous-ampersands)
         * (under "semi-related fun fact") for more details.
         *
         * Backticks are escaped because in Internet Explorer < 9, they can break out
         * of attribute values or HTML comments. See [#59](https://html5sec.org/#59),
         * [#102](https://html5sec.org/#102), [#108](https://html5sec.org/#108), and
         * [#133](https://html5sec.org/#133) of the [HTML5 Security Cheatsheet](https://html5sec.org/)
         * for more details.
         *
         * When working with HTML you should always [quote attribute values](http://wonko.com/post/html-escaping)
         * to reduce XSS vectors.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to escape.
         * @returns {string} Returns the escaped string.
         * @example
         *
         * _.escape('fred, barney, & pebbles');
         * // => 'fred, barney, &amp; pebbles'
         */
        function escape(string) {
            // Reset `lastIndex` because in IE < 9 `String#replace` does not.
            string = baseToString(string);
            return (string && reHasUnescapedHtml.test(string))
                ? string.replace(reUnescapedHtml, escapeHtmlChar)
                : string;
        }

        /**
         * Escapes the `RegExp` special characters "\", "/", "^", "$", ".", "|", "?",
         * "*", "+", "(", ")", "[", "]", "{" and "}" in `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to escape.
         * @returns {string} Returns the escaped string.
         * @example
         *
         * _.escapeRegExp('[lodash](https://lodash.com/)');
         * // => '\[lodash\]\(https:\/\/lodash\.com\/\)'
         */
        function escapeRegExp(string) {
            string = baseToString(string);
            return (string && reHasRegExpChars.test(string))
                ? string.replace(reRegExpChars, '\\$&')
                : string;
        }

        /**
         * Converts `string` to [kebab case](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to convert.
         * @returns {string} Returns the kebab cased string.
         * @example
         *
         * _.kebabCase('Foo Bar');
         * // => 'foo-bar'
         *
         * _.kebabCase('fooBar');
         * // => 'foo-bar'
         *
         * _.kebabCase('__foo_bar__');
         * // => 'foo-bar'
         */
        var kebabCase = createCompounder(function(result, word, index) {
            return result + (index ? '-' : '') + word.toLowerCase();
        });

        /**
         * Pads `string` on the left and right sides if it's shorter than `length`.
         * Padding characters are truncated if they can't be evenly divided by `length`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to pad.
         * @param {number} [length=0] The padding length.
         * @param {string} [chars=' '] The string used as padding.
         * @returns {string} Returns the padded string.
         * @example
         *
         * _.pad('abc', 8);
         * // => '  abc   '
         *
         * _.pad('abc', 8, '_-');
         * // => '_-abc_-_'
         *
         * _.pad('abc', 3);
         * // => 'abc'
         */
        function pad(string, length, chars) {
            string = baseToString(string);
            length = +length;

            var strLength = string.length;
            if (strLength >= length || !nativeIsFinite(length)) {
                return string;
            }
            var mid = (length - strLength) / 2,
                leftLength = floor(mid),
                rightLength = ceil(mid);

            chars = createPadding('', rightLength, chars);
            return chars.slice(0, leftLength) + string + chars;
        }

        /**
         * Pads `string` on the left side if it's shorter than `length`. Padding
         * characters are truncated if they exceed `length`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to pad.
         * @param {number} [length=0] The padding length.
         * @param {string} [chars=' '] The string used as padding.
         * @returns {string} Returns the padded string.
         * @example
         *
         * _.padLeft('abc', 6);
         * // => '   abc'
         *
         * _.padLeft('abc', 6, '_-');
         * // => '_-_abc'
         *
         * _.padLeft('abc', 3);
         * // => 'abc'
         */
        var padLeft = createPadDir();

        /**
         * Pads `string` on the right side if it's shorter than `length`. Padding
         * characters are truncated if they exceed `length`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to pad.
         * @param {number} [length=0] The padding length.
         * @param {string} [chars=' '] The string used as padding.
         * @returns {string} Returns the padded string.
         * @example
         *
         * _.padRight('abc', 6);
         * // => 'abc   '
         *
         * _.padRight('abc', 6, '_-');
         * // => 'abc_-_'
         *
         * _.padRight('abc', 3);
         * // => 'abc'
         */
        var padRight = createPadDir(true);

        /**
         * Converts `string` to an integer of the specified radix. If `radix` is
         * `undefined` or `0`, a `radix` of `10` is used unless `value` is a hexadecimal,
         * in which case a `radix` of `16` is used.
         *
         * **Note:** This method aligns with the [ES5 implementation](https://es5.github.io/#E)
         * of `parseInt`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} string The string to convert.
         * @param {number} [radix] The radix to interpret `value` by.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {number} Returns the converted integer.
         * @example
         *
         * _.parseInt('08');
         * // => 8
         *
         * _.map(['6', '08', '10'], _.parseInt);
         * // => [6, 8, 10]
         */
        function parseInt(string, radix, guard) {
            if (guard && isIterateeCall(string, radix, guard)) {
                radix = 0;
            }
            return nativeParseInt(string, radix);
        }
        // Fallback for environments with pre-ES5 implementations.
        if (nativeParseInt(whitespace + '08') != 8) {
            parseInt = function(string, radix, guard) {
                // Firefox < 21 and Opera < 15 follow ES3 for `parseInt`.
                // Chrome fails to trim leading <BOM> whitespace characters.
                // See https://code.google.com/p/v8/issues/detail?id=3109 for more details.
                if (guard ? isIterateeCall(string, radix, guard) : radix == null) {
                    radix = 0;
                } else if (radix) {
                    radix = +radix;
                }
                string = trim(string);
                return nativeParseInt(string, radix || (reHasHexPrefix.test(string) ? 16 : 10));
            };
        }

        /**
         * Repeats the given string `n` times.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to repeat.
         * @param {number} [n=0] The number of times to repeat the string.
         * @returns {string} Returns the repeated string.
         * @example
         *
         * _.repeat('*', 3);
         * // => '***'
         *
         * _.repeat('abc', 2);
         * // => 'abcabc'
         *
         * _.repeat('abc', 0);
         * // => ''
         */
        function repeat(string, n) {
            var result = '';
            string = baseToString(string);
            n = +n;
            if (n < 1 || !string || !nativeIsFinite(n)) {
                return result;
            }
            // Leverage the exponentiation by squaring algorithm for a faster repeat.
            // See https://en.wikipedia.org/wiki/Exponentiation_by_squaring for more details.
            do {
                if (n % 2) {
                    result += string;
                }
                n = floor(n / 2);
                string += string;
            } while (n);

            return result;
        }

        /**
         * Converts `string` to [snake case](https://en.wikipedia.org/wiki/Snake_case).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to convert.
         * @returns {string} Returns the snake cased string.
         * @example
         *
         * _.snakeCase('Foo Bar');
         * // => 'foo_bar'
         *
         * _.snakeCase('fooBar');
         * // => 'foo_bar'
         *
         * _.snakeCase('--foo-bar');
         * // => 'foo_bar'
         */
        var snakeCase = createCompounder(function(result, word, index) {
            return result + (index ? '_' : '') + word.toLowerCase();
        });

        /**
         * Converts `string` to [start case](https://en.wikipedia.org/wiki/Letter_case#Stylistic_or_specialised_usage).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to convert.
         * @returns {string} Returns the start cased string.
         * @example
         *
         * _.startCase('--foo-bar');
         * // => 'Foo Bar'
         *
         * _.startCase('fooBar');
         * // => 'Foo Bar'
         *
         * _.startCase('__foo_bar__');
         * // => 'Foo Bar'
         */
        var startCase = createCompounder(function(result, word, index) {
            return result + (index ? ' ' : '') + (word.charAt(0).toUpperCase() + word.slice(1));
        });

        /**
         * Checks if `string` starts with the given target string.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to search.
         * @param {string} [target] The string to search for.
         * @param {number} [position=0] The position to search from.
         * @returns {boolean} Returns `true` if `string` starts with `target`, else `false`.
         * @example
         *
         * _.startsWith('abc', 'a');
         * // => true
         *
         * _.startsWith('abc', 'b');
         * // => false
         *
         * _.startsWith('abc', 'b', 1);
         * // => true
         */
        function startsWith(string, target, position) {
            string = baseToString(string);
            position = position == null
                ? 0
                : nativeMin(position < 0 ? 0 : (+position || 0), string.length);

            return string.lastIndexOf(target, position) == position;
        }

        /**
         * Creates a compiled template function that can interpolate data properties
         * in "interpolate" delimiters, HTML-escape interpolated data properties in
         * "escape" delimiters, and execute JavaScript in "evaluate" delimiters. Data
         * properties may be accessed as free variables in the template. If a setting
         * object is provided it takes precedence over `_.templateSettings` values.
         *
         * **Note:** In the development build `_.template` utilizes
         * [sourceURLs](http://www.js.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl)
         * for easier debugging.
         *
         * For more information on precompiling templates see
         * [lodash's custom builds documentation](https://lodash.com/custom-builds).
         *
         * For more information on Chrome extension sandboxes see
         * [Chrome's extensions documentation](https://developer.chrome.com/extensions/sandboxingEval).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The template string.
         * @param {Object} [options] The options object.
         * @param {RegExp} [options.escape] The HTML "escape" delimiter.
         * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
         * @param {Object} [options.imports] An object to import into the template as free variables.
         * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
         * @param {string} [options.sourceURL] The sourceURL of the template's compiled source.
         * @param {string} [options.variable] The data object variable name.
         * @param- {Object} [otherOptions] Enables the legacy `options` param signature.
         * @returns {Function} Returns the compiled template function.
         * @example
         *
         * // using the "interpolate" delimiter to create a compiled template
         * var compiled = _.template('hello <%= user %>!');
         * compiled({ 'user': 'fred' });
         * // => 'hello fred!'
         *
         * // using the HTML "escape" delimiter to escape data property values
         * var compiled = _.template('<b><%- value %></b>');
         * compiled({ 'value': '<script>' });
         * // => '<b>&lt;script&gt;</b>'
         *
         * // using the "evaluate" delimiter to execute JavaScript and generate HTML
         * var compiled = _.template('<% _.forEach(users, function(user) { %><li><%- user %></li><% }); %>');
         * compiled({ 'users': ['fred', 'barney'] });
         * // => '<li>fred</li><li>barney</li>'
         *
         * // using the internal `print` function in "evaluate" delimiters
         * var compiled = _.template('<% print("hello " + user); %>!');
         * compiled({ 'user': 'barney' });
         * // => 'hello barney!'
         *
         * // using the ES delimiter as an alternative to the default "interpolate" delimiter
         * var compiled = _.template('hello ${ user }!');
         * compiled({ 'user': 'pebbles' });
         * // => 'hello pebbles!'
         *
         * // using custom template delimiters
         * _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
         * var compiled = _.template('hello {{ user }}!');
         * compiled({ 'user': 'mustache' });
         * // => 'hello mustache!'
         *
         * // using backslashes to treat delimiters as plain text
         * var compiled = _.template('<%= "\\<%- value %\\>" %>');
         * compiled({ 'value': 'ignored' });
         * // => '<%- value %>'
         *
         * // using the `imports` option to import `jQuery` as `jq`
         * var text = '<% jq.each(users, function(user) { %><li><%- user %></li><% }); %>';
         * var compiled = _.template(text, { 'imports': { 'jq': jQuery } });
         * compiled({ 'users': ['fred', 'barney'] });
         * // => '<li>fred</li><li>barney</li>'
         *
         * // using the `sourceURL` option to specify a custom sourceURL for the template
         * var compiled = _.template('hello <%= user %>!', { 'sourceURL': '/basic/greeting.jst' });
         * compiled(data);
         * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
         *
         * // using the `variable` option to ensure a with-statement isn't used in the compiled template
         * var compiled = _.template('hi <%= data.user %>!', { 'variable': 'data' });
         * compiled.source;
         * // => function(data) {
     * //   var __t, __p = '';
     * //   __p += 'hi ' + ((__t = ( data.user )) == null ? '' : __t) + '!';
     * //   return __p;
     * // }
         *
         * // using the `source` property to inline compiled templates for meaningful
         * // line numbers in error messages and a stack trace
         * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
         *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
         * ');
         */
        function template(string, options, otherOptions) {
            // Based on John Resig's `tmpl` implementation (http://ejohn.org/blog/javascript-micro-templating/)
            // and Laura Doktorova's doT.js (https://github.com/olado/doT).
            var settings = lodash.templateSettings;

            if (otherOptions && isIterateeCall(string, options, otherOptions)) {
                options = otherOptions = null;
            }
            string = baseToString(string);
            options = assignWith(baseAssign({}, otherOptions || options), settings, assignOwnDefaults);

            var imports = assignWith(baseAssign({}, options.imports), settings.imports, assignOwnDefaults),
                importsKeys = keys(imports),
                importsValues = baseValues(imports, importsKeys);

            var isEscaping,
                isEvaluating,
                index = 0,
                interpolate = options.interpolate || reNoMatch,
                source = "__p += '";

            // Compile the regexp to match each delimiter.
            var reDelimiters = RegExp(
                (options.escape || reNoMatch).source + '|' +
                interpolate.source + '|' +
                (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
                (options.evaluate || reNoMatch).source + '|$'
                , 'g');

            // Use a sourceURL for easier debugging.
            var sourceURL = '//# sourceURL=' +
                ('sourceURL' in options
                    ? options.sourceURL
                    : ('lodash.templateSources[' + (++templateCounter) + ']')
                ) + '\n';

            string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
                interpolateValue || (interpolateValue = esTemplateValue);

                // Escape characters that can't be included in string literals.
                source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);

                // Replace delimiters with snippets.
                if (escapeValue) {
                    isEscaping = true;
                    source += "' +\n__e(" + escapeValue + ") +\n'";
                }
                if (evaluateValue) {
                    isEvaluating = true;
                    source += "';\n" + evaluateValue + ";\n__p += '";
                }
                if (interpolateValue) {
                    source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
                }
                index = offset + match.length;

                // The JS engine embedded in Adobe products requires returning the `match`
                // string in order to produce the correct `offset` value.
                return match;
            });

            source += "';\n";

            // If `variable` is not specified wrap a with-statement around the generated
            // code to add the data object to the top of the scope chain.
            var variable = options.variable;
            if (!variable) {
                source = 'with (obj) {\n' + source + '\n}\n';
            }
            // Cleanup code by stripping empty strings.
            source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
                .replace(reEmptyStringMiddle, '$1')
                .replace(reEmptyStringTrailing, '$1;');

            // Frame code as the function body.
            source = 'function(' + (variable || 'obj') + ') {\n' +
                (variable
                    ? ''
                    : 'obj || (obj = {});\n'
                ) +
                "var __t, __p = ''" +
                (isEscaping
                    ? ', __e = _.escape'
                    : ''
                ) +
                (isEvaluating
                    ? ', __j = Array.prototype.join;\n' +
                "function print() { __p += __j.call(arguments, '') }\n"
                    : ';\n'
                ) +
                source +
                'return __p\n}';

            var result = attempt(function() {
                return Function(importsKeys, sourceURL + 'return ' + source).apply(undefined, importsValues);
            });

            // Provide the compiled function's source by its `toString` method or
            // the `source` property as a convenience for inlining compiled templates.
            result.source = source;
            if (isError(result)) {
                throw result;
            }
            return result;
        }

        /**
         * Removes leading and trailing whitespace or specified characters from `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to trim.
         * @param {string} [chars=whitespace] The characters to trim.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {string} Returns the trimmed string.
         * @example
         *
         * _.trim('  abc  ');
         * // => 'abc'
         *
         * _.trim('-_-abc-_-', '_-');
         * // => 'abc'
         *
         * _.map(['  foo  ', '  bar  '], _.trim);
         * // => ['foo', 'bar']
         */
        function trim(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(trimmedLeftIndex(string), trimmedRightIndex(string) + 1);
            }
            chars = (chars + '');
            return string.slice(charsLeftIndex(string, chars), charsRightIndex(string, chars) + 1);
        }

        /**
         * Removes leading whitespace or specified characters from `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to trim.
         * @param {string} [chars=whitespace] The characters to trim.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {string} Returns the trimmed string.
         * @example
         *
         * _.trimLeft('  abc  ');
         * // => 'abc  '
         *
         * _.trimLeft('-_-abc-_-', '_-');
         * // => 'abc-_-'
         */
        function trimLeft(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(trimmedLeftIndex(string));
            }
            return string.slice(charsLeftIndex(string, (chars + '')));
        }

        /**
         * Removes trailing whitespace or specified characters from `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to trim.
         * @param {string} [chars=whitespace] The characters to trim.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {string} Returns the trimmed string.
         * @example
         *
         * _.trimRight('  abc  ');
         * // => '  abc'
         *
         * _.trimRight('-_-abc-_-', '_-');
         * // => '-_-abc'
         */
        function trimRight(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(0, trimmedRightIndex(string) + 1);
            }
            return string.slice(0, charsRightIndex(string, (chars + '')) + 1);
        }

        /**
         * Truncates `string` if it's longer than the given maximum string length.
         * The last characters of the truncated string are replaced with the omission
         * string which defaults to "...".
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to truncate.
         * @param {Object|number} [options] The options object or maximum string length.
         * @param {number} [options.length=30] The maximum string length.
         * @param {string} [options.omission='...'] The string to indicate text is omitted.
         * @param {RegExp|string} [options.separator] The separator pattern to truncate to.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {string} Returns the truncated string.
         * @example
         *
         * _.trunc('hi-diddly-ho there, neighborino');
         * // => 'hi-diddly-ho there, neighbo...'
         *
         * _.trunc('hi-diddly-ho there, neighborino', 24);
         * // => 'hi-diddly-ho there, n...'
         *
         * _.trunc('hi-diddly-ho there, neighborino', {
     *   'length': 24,
     *   'separator': ' '
     * });
         * // => 'hi-diddly-ho there,...'
         *
         * _.trunc('hi-diddly-ho there, neighborino', {
     *   'length': 24,
     *   'separator': /,? +/
     * });
         * // => 'hi-diddly-ho there...'
         *
         * _.trunc('hi-diddly-ho there, neighborino', {
     *   'omission': ' [...]'
     * });
         * // => 'hi-diddly-ho there, neig [...]'
         */
        function trunc(string, options, guard) {
            if (guard && isIterateeCall(string, options, guard)) {
                options = null;
            }
            var length = DEFAULT_TRUNC_LENGTH,
                omission = DEFAULT_TRUNC_OMISSION;

            if (options != null) {
                if (isObject(options)) {
                    var separator = 'separator' in options ? options.separator : separator;
                    length = 'length' in options ? (+options.length || 0) : length;
                    omission = 'omission' in options ? baseToString(options.omission) : omission;
                } else {
                    length = +options || 0;
                }
            }
            string = baseToString(string);
            if (length >= string.length) {
                return string;
            }
            var end = length - omission.length;
            if (end < 1) {
                return omission;
            }
            var result = string.slice(0, end);
            if (separator == null) {
                return result + omission;
            }
            if (isRegExp(separator)) {
                if (string.slice(end).search(separator)) {
                    var match,
                        newEnd,
                        substring = string.slice(0, end);

                    if (!separator.global) {
                        separator = RegExp(separator.source, (reFlags.exec(separator) || '') + 'g');
                    }
                    separator.lastIndex = 0;
                    while ((match = separator.exec(substring))) {
                        newEnd = match.index;
                    }
                    result = result.slice(0, newEnd == null ? end : newEnd);
                }
            } else if (string.indexOf(separator, end) != end) {
                var index = result.lastIndexOf(separator);
                if (index > -1) {
                    result = result.slice(0, index);
                }
            }
            return result + omission;
        }

        /**
         * The inverse of `_.escape`; this method converts the HTML entities
         * `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, and `&#96;` in `string` to their
         * corresponding characters.
         *
         * **Note:** No other HTML entities are unescaped. To unescape additional HTML
         * entities use a third-party library like [_he_](https://mths.be/he).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to unescape.
         * @returns {string} Returns the unescaped string.
         * @example
         *
         * _.unescape('fred, barney, &amp; pebbles');
         * // => 'fred, barney, & pebbles'
         */
        function unescape(string) {
            string = baseToString(string);
            return (string && reHasEscapedHtml.test(string))
                ? string.replace(reEscapedHtml, unescapeHtmlChar)
                : string;
        }

        /**
         * Splits `string` into an array of its words.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to inspect.
         * @param {RegExp|string} [pattern] The pattern to match words.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the words of `string`.
         * @example
         *
         * _.words('fred, barney, & pebbles');
         * // => ['fred', 'barney', 'pebbles']
         *
         * _.words('fred, barney, & pebbles', /[^, ]+/g);
         * // => ['fred', 'barney', '&', 'pebbles']
         */
        function words(string, pattern, guard) {
            if (guard && isIterateeCall(string, pattern, guard)) {
                pattern = null;
            }
            string = baseToString(string);
            return string.match(pattern || reWords) || [];
        }

        /*------------------------------------------------------------------------*/

        /**
         * Attempts to invoke `func`, returning either the result or the caught error
         * object. Any additional arguments are provided to `func` when it is invoked.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Function} func The function to attempt.
         * @returns {*} Returns the `func` result or error object.
         * @example
         *
         * // avoid throwing errors for invalid selectors
         * var elements = _.attempt(function(selector) {
     *   return document.querySelectorAll(selector);
     * }, '>_>');
         *
         * if (_.isError(elements)) {
     *   elements = [];
     * }
         */
        var attempt = restParam(function(func, args) {
            try {
                return func.apply(undefined, args);
            } catch(e) {
                return isError(e) ? e : new Error(e);
            }
        });

        /**
         * Creates a function that invokes `func` with the `this` binding of `thisArg`
         * and arguments of the created function. If `func` is a property name the
         * created callback returns the property value for a given element. If `func`
         * is an object the created callback returns `true` for elements that contain
         * the equivalent object properties, otherwise it returns `false`.
         *
         * @static
         * @memberOf _
         * @alias iteratee
         * @category Utility
         * @param {*} [func=_.identity] The value to convert to a callback.
         * @param {*} [thisArg] The `this` binding of `func`.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Function} Returns the callback.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * // wrap to create custom callback shorthands
         * _.callback = _.wrap(_.callback, function(callback, func, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(func);
     *   if (!match) {
     *     return callback(func, thisArg);
     *   }
     *   return function(object) {
     *     return match[2] == 'gt'
     *       ? object[match[1]] > match[3]
     *       : object[match[1]] < match[3];
     *   };
     * });
         *
         * _.filter(users, 'age__gt36');
         * // => [{ 'user': 'fred', 'age': 40 }]
         */
        function callback(func, thisArg, guard) {
            if (guard && isIterateeCall(func, thisArg, guard)) {
                thisArg = null;
            }
            return isObjectLike(func)
                ? matches(func)
                : baseCallback(func, thisArg);
        }

        /**
         * Creates a function that returns `value`.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {*} value The value to return from the new function.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var object = { 'user': 'fred' };
         * var getter = _.constant(object);
         *
         * getter() === object;
         * // => true
         */
        function constant(value) {
            return function() {
                return value;
            };
        }

        /**
         * This method returns the first argument provided to it.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {*} value Any value.
         * @returns {*} Returns `value`.
         * @example
         *
         * var object = { 'user': 'fred' };
         *
         * _.identity(object) === object;
         * // => true
         */
        function identity(value) {
            return value;
        }

        /**
         * Creates a function that performs a deep comparison between a given object
         * and `source`, returning `true` if the given object has equivalent property
         * values, else `false`.
         *
         * **Note:** This method supports comparing arrays, booleans, `Date` objects,
         * numbers, `Object` objects, regexes, and strings. Objects are compared by
         * their own, not inherited, enumerable properties. For comparing a single
         * own or inherited property value see `_.matchesProperty`.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Object} source The object of property values to match.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'active': true },
         *   { 'user': 'fred',   'age': 40, 'active': false }
         * ];
         *
         * _.filter(users, _.matches({ 'age': 40, 'active': false }));
         * // => [{ 'user': 'fred', 'age': 40, 'active': false }]
         */
        function matches(source) {
            return baseMatches(baseClone(source, true));
        }

        /**
         * Creates a function that compares the property value of `path` on a given
         * object to `value`.
         *
         * **Note:** This method supports comparing arrays, booleans, `Date` objects,
         * numbers, `Object` objects, regexes, and strings. Objects are compared by
         * their own, not inherited, enumerable properties.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Array|string} path The path of the property to get.
         * @param {*} srcValue The value to match.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var users = [
         *   { 'user': 'barney' },
         *   { 'user': 'fred' }
         * ];
         *
         * _.find(users, _.matchesProperty('user', 'fred'));
         * // => { 'user': 'fred' }
         */
        function matchesProperty(path, srcValue) {
            return baseMatchesProperty(path, baseClone(srcValue, true));
        }

        /**
         * Creates a function that invokes the method at `path` on a given object.
         * Any additional arguments are provided to the invoked method.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Array|string} path The path of the method to invoke.
         * @param {...*} [args] The arguments to invoke the method with.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var objects = [
         *   { 'a': { 'b': { 'c': _.constant(2) } } },
         *   { 'a': { 'b': { 'c': _.constant(1) } } }
         * ];
         *
         * _.map(objects, _.method('a.b.c'));
         * // => [2, 1]
         *
         * _.invoke(_.sortBy(objects, _.method(['a', 'b', 'c'])), 'a.b.c');
         * // => [1, 2]
         */
        var method = restParam(function(path, args) {
            return function(object) {
                return invokePath(object, path, args);
            };
        });

        /**
         * The opposite of `_.method`; this method creates a function that invokes
         * the method at a given path on `object`. Any additional arguments are
         * provided to the invoked method.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Object} object The object to query.
         * @param {...*} [args] The arguments to invoke the method with.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var array = _.times(3, _.constant),
         *     object = { 'a': array, 'b': array, 'c': array };
         *
         * _.map(['a[2]', 'c[0]'], _.methodOf(object));
         * // => [2, 0]
         *
         * _.map([['a', '2'], ['c', '0']], _.methodOf(object));
         * // => [2, 0]
         */
        var methodOf = restParam(function(object, args) {
            return function(path) {
                return invokePath(object, path, args);
            };
        });

        /**
         * Adds all own enumerable function properties of a source object to the
         * destination object. If `object` is a function then methods are added to
         * its prototype as well.
         *
         * **Note:** Use `_.runInContext` to create a pristine `lodash` function to
         * avoid conflicts caused by modifying the original.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Function|Object} [object=lodash] The destination object.
         * @param {Object} source The object of functions to add.
         * @param {Object} [options] The options object.
         * @param {boolean} [options.chain=true] Specify whether the functions added
         *  are chainable.
         * @returns {Function|Object} Returns `object`.
         * @example
         *
         * function vowels(string) {
     *   return _.filter(string, function(v) {
     *     return /[aeiou]/i.test(v);
     *   });
     * }
         *
         * _.mixin({ 'vowels': vowels });
         * _.vowels('fred');
         * // => ['e']
         *
         * _('fred').vowels().value();
         * // => ['e']
         *
         * _.mixin({ 'vowels': vowels }, { 'chain': false });
         * _('fred').vowels();
         * // => ['e']
         */
        function mixin(object, source, options) {
            if (options == null) {
                var isObj = isObject(source),
                    props = isObj ? keys(source) : null,
                    methodNames = (props && props.length) ? baseFunctions(source, props) : null;

                if (!(methodNames ? methodNames.length : isObj)) {
                    methodNames = false;
                    options = source;
                    source = object;
                    object = this;
                }
            }
            if (!methodNames) {
                methodNames = baseFunctions(source, keys(source));
            }
            var chain = true,
                index = -1,
                isFunc = isFunction(object),
                length = methodNames.length;

            if (options === false) {
                chain = false;
            } else if (isObject(options) && 'chain' in options) {
                chain = options.chain;
            }
            while (++index < length) {
                var methodName = methodNames[index],
                    func = source[methodName];

                object[methodName] = func;
                if (isFunc) {
                    object.prototype[methodName] = (function(func) {
                        return function() {
                            var chainAll = this.__chain__;
                            if (chain || chainAll) {
                                var result = object(this.__wrapped__),
                                    actions = result.__actions__ = arrayCopy(this.__actions__);

                                actions.push({ 'func': func, 'args': arguments, 'thisArg': object });
                                result.__chain__ = chainAll;
                                return result;
                            }
                            var args = [this.value()];
                            push.apply(args, arguments);
                            return func.apply(object, args);
                        };
                    }(func));
                }
            }
            return object;
        }

        /**
         * Reverts the `_` variable to its previous value and returns a reference to
         * the `lodash` function.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @returns {Function} Returns the `lodash` function.
         * @example
         *
         * var lodash = _.noConflict();
         */
        function noConflict() {
            context._ = oldDash;
            return this;
        }

        /**
         * A no-operation function that returns `undefined` regardless of the
         * arguments it receives.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @example
         *
         * var object = { 'user': 'fred' };
         *
         * _.noop(object) === undefined;
         * // => true
         */
        function noop() {
            // No operation performed.
        }

        /**
         * Creates a function that returns the property value at `path` on a
         * given object.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Array|string} path The path of the property to get.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var objects = [
         *   { 'a': { 'b': { 'c': 2 } } },
         *   { 'a': { 'b': { 'c': 1 } } }
         * ];
         *
         * _.map(objects, _.property('a.b.c'));
         * // => [2, 1]
         *
         * _.pluck(_.sortBy(objects, _.property(['a', 'b', 'c'])), 'a.b.c');
         * // => [1, 2]
         */
        function property(path) {
            return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
        }

        /**
         * The opposite of `_.property`; this method creates a function that returns
         * the property value at a given path on `object`.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Object} object The object to query.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var array = [0, 1, 2],
         *     object = { 'a': array, 'b': array, 'c': array };
         *
         * _.map(['a[2]', 'c[0]'], _.propertyOf(object));
         * // => [2, 0]
         *
         * _.map([['a', '2'], ['c', '0']], _.propertyOf(object));
         * // => [2, 0]
         */
        function propertyOf(object) {
            return function(path) {
                return baseGet(object, toPath(path), path + '');
            };
        }

        /**
         * Creates an array of numbers (positive and/or negative) progressing from
         * `start` up to, but not including, `end`. If `end` is not specified it is
         * set to `start` with `start` then set to `0`. If `end` is less than `start`
         * a zero-length range is created unless a negative `step` is specified.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {number} [start=0] The start of the range.
         * @param {number} end The end of the range.
         * @param {number} [step=1] The value to increment or decrement by.
         * @returns {Array} Returns the new array of numbers.
         * @example
         *
         * _.range(4);
         * // => [0, 1, 2, 3]
         *
         * _.range(1, 5);
         * // => [1, 2, 3, 4]
         *
         * _.range(0, 20, 5);
         * // => [0, 5, 10, 15]
         *
         * _.range(0, -4, -1);
         * // => [0, -1, -2, -3]
         *
         * _.range(1, 4, 0);
         * // => [1, 1, 1]
         *
         * _.range(0);
         * // => []
         */
        function range(start, end, step) {
            if (step && isIterateeCall(start, end, step)) {
                end = step = null;
            }
            start = +start || 0;
            step = step == null ? 1 : (+step || 0);

            if (end == null) {
                end = start;
                start = 0;
            } else {
                end = +end || 0;
            }
            // Use `Array(length)` so engines like Chakra and V8 avoid slower modes.
            // See https://youtu.be/XAqIpGU8ZZk#t=17m25s for more details.
            var index = -1,
                length = nativeMax(ceil((end - start) / (step || 1)), 0),
                result = Array(length);

            while (++index < length) {
                result[index] = start;
                start += step;
            }
            return result;
        }

        /**
         * Invokes the iteratee function `n` times, returning an array of the results
         * of each invocation. The `iteratee` is bound to `thisArg` and invoked with
         * one argument; (index).
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {number} n The number of times to invoke `iteratee`.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the array of results.
         * @example
         *
         * var diceRolls = _.times(3, _.partial(_.random, 1, 6, false));
         * // => [3, 6, 4]
         *
         * _.times(3, function(n) {
     *   mage.castSpell(n);
     * });
         * // => invokes `mage.castSpell(n)` three times with `n` of `0`, `1`, and `2`
         *
         * _.times(3, function(n) {
     *   this.cast(n);
     * }, mage);
         * // => also invokes `mage.castSpell(n)` three times
         */
        function times(n, iteratee, thisArg) {
            n = floor(n);

            // Exit early to avoid a JSC JIT bug in Safari 8
            // where `Array(0)` is treated as `Array(1)`.
            if (n < 1 || !nativeIsFinite(n)) {
                return [];
            }
            var index = -1,
                result = Array(nativeMin(n, MAX_ARRAY_LENGTH));

            iteratee = bindCallback(iteratee, thisArg, 1);
            while (++index < n) {
                if (index < MAX_ARRAY_LENGTH) {
                    result[index] = iteratee(index);
                } else {
                    iteratee(index);
                }
            }
            return result;
        }

        /**
         * Generates a unique ID. If `prefix` is provided the ID is appended to it.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {string} [prefix] The value to prefix the ID with.
         * @returns {string} Returns the unique ID.
         * @example
         *
         * _.uniqueId('contact_');
         * // => 'contact_104'
         *
         * _.uniqueId();
         * // => '105'
         */
        function uniqueId(prefix) {
            var id = ++idCounter;
            return baseToString(prefix) + id;
        }

        /*------------------------------------------------------------------------*/

        /**
         * Adds two numbers.
         *
         * @static
         * @memberOf _
         * @category Math
         * @param {number} augend The first number to add.
         * @param {number} addend The second number to add.
         * @returns {number} Returns the sum.
         * @example
         *
         * _.add(6, 4);
         * // => 10
         */
        function add(augend, addend) {
            return (+augend || 0) + (+addend || 0);
        }

        /**
         * Gets the maximum value of `collection`. If `collection` is empty or falsey
         * `-Infinity` is returned. If an iteratee function is provided it is invoked
         * for each value in `collection` to generate the criterion by which the value
         * is ranked. The `iteratee` is bound to `thisArg` and invoked with three
         * arguments: (value, index, collection).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Math
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the maximum value.
         * @example
         *
         * _.max([4, 2, 8, 6]);
         * // => 8
         *
         * _.max([]);
         * // => -Infinity
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * _.max(users, function(chr) {
     *   return chr.age;
     * });
         * // => { 'user': 'fred', 'age': 40 }
         *
         * // using the `_.property` callback shorthand
         * _.max(users, 'age');
         * // => { 'user': 'fred', 'age': 40 }
         */
        var max = createExtremum(gt, NEGATIVE_INFINITY);

        /**
         * Gets the minimum value of `collection`. If `collection` is empty or falsey
         * `Infinity` is returned. If an iteratee function is provided it is invoked
         * for each value in `collection` to generate the criterion by which the value
         * is ranked. The `iteratee` is bound to `thisArg` and invoked with three
         * arguments: (value, index, collection).
         *
         * If a property name is provided for `iteratee` the created `_.property`
         * style callback returns the property value of the given element.
         *
         * If a value is also provided for `thisArg` the created `_.matchesProperty`
         * style callback returns `true` for elements that have a matching property
         * value, else `false`.
         *
         * If an object is provided for `iteratee` the created `_.matches` style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Math
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the minimum value.
         * @example
         *
         * _.min([4, 2, 8, 6]);
         * // => 2
         *
         * _.min([]);
         * // => Infinity
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * _.min(users, function(chr) {
     *   return chr.age;
     * });
         * // => { 'user': 'barney', 'age': 36 }
         *
         * // using the `_.property` callback shorthand
         * _.min(users, 'age');
         * // => { 'user': 'barney', 'age': 36 }
         */
        var min = createExtremum(lt, POSITIVE_INFINITY);

        /**
         * Gets the sum of the values in `collection`.
         *
         * @static
         * @memberOf _
         * @category Math
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {number} Returns the sum.
         * @example
         *
         * _.sum([4, 6]);
         * // => 10
         *
         * _.sum({ 'a': 4, 'b': 6 });
         * // => 10
         *
         * var objects = [
         *   { 'n': 4 },
         *   { 'n': 6 }
         * ];
         *
         * _.sum(objects, function(object) {
     *   return object.n;
     * });
         * // => 10
         *
         * // using the `_.property` callback shorthand
         * _.sum(objects, 'n');
         * // => 10
         */
        function sum(collection, iteratee, thisArg) {
            if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
                iteratee = null;
            }
            var callback = getCallback(),
                noIteratee = iteratee == null;

            if (!(noIteratee && callback === baseCallback)) {
                noIteratee = false;
                iteratee = callback(iteratee, thisArg, 3);
            }
            return noIteratee
                ? arraySum(isArray(collection) ? collection : toIterable(collection))
                : baseSum(collection, iteratee);
        }

        /*------------------------------------------------------------------------*/

        // Ensure wrappers are instances of `baseLodash`.
        lodash.prototype = baseLodash.prototype;

        LodashWrapper.prototype = baseCreate(baseLodash.prototype);
        LodashWrapper.prototype.constructor = LodashWrapper;

        LazyWrapper.prototype = baseCreate(baseLodash.prototype);
        LazyWrapper.prototype.constructor = LazyWrapper;

        // Add functions to the `Map` cache.
        MapCache.prototype['delete'] = mapDelete;
        MapCache.prototype.get = mapGet;
        MapCache.prototype.has = mapHas;
        MapCache.prototype.set = mapSet;

        // Add functions to the `Set` cache.
        SetCache.prototype.push = cachePush;

        // Assign cache to `_.memoize`.
        memoize.Cache = MapCache;

        // Add functions that return wrapped values when chaining.
        lodash.after = after;
        lodash.ary = ary;
        lodash.assign = assign;
        lodash.at = at;
        lodash.before = before;
        lodash.bind = bind;
        lodash.bindAll = bindAll;
        lodash.bindKey = bindKey;
        lodash.callback = callback;
        lodash.chain = chain;
        lodash.chunk = chunk;
        lodash.compact = compact;
        lodash.constant = constant;
        lodash.countBy = countBy;
        lodash.create = create;
        lodash.curry = curry;
        lodash.curryRight = curryRight;
        lodash.debounce = debounce;
        lodash.defaults = defaults;
        lodash.defer = defer;
        lodash.delay = delay;
        lodash.difference = difference;
        lodash.drop = drop;
        lodash.dropRight = dropRight;
        lodash.dropRightWhile = dropRightWhile;
        lodash.dropWhile = dropWhile;
        lodash.fill = fill;
        lodash.filter = filter;
        lodash.flatten = flatten;
        lodash.flattenDeep = flattenDeep;
        lodash.flow = flow;
        lodash.flowRight = flowRight;
        lodash.forEach = forEach;
        lodash.forEachRight = forEachRight;
        lodash.forIn = forIn;
        lodash.forInRight = forInRight;
        lodash.forOwn = forOwn;
        lodash.forOwnRight = forOwnRight;
        lodash.functions = functions;
        lodash.groupBy = groupBy;
        lodash.indexBy = indexBy;
        lodash.initial = initial;
        lodash.intersection = intersection;
        lodash.invert = invert;
        lodash.invoke = invoke;
        lodash.keys = keys;
        lodash.keysIn = keysIn;
        lodash.map = map;
        lodash.mapKeys = mapKeys;
        lodash.mapValues = mapValues;
        lodash.matches = matches;
        lodash.matchesProperty = matchesProperty;
        lodash.memoize = memoize;
        lodash.merge = merge;
        lodash.method = method;
        lodash.methodOf = methodOf;
        lodash.mixin = mixin;
        lodash.negate = negate;
        lodash.omit = omit;
        lodash.once = once;
        lodash.pairs = pairs;
        lodash.partial = partial;
        lodash.partialRight = partialRight;
        lodash.partition = partition;
        lodash.pick = pick;
        lodash.pluck = pluck;
        lodash.property = property;
        lodash.propertyOf = propertyOf;
        lodash.pull = pull;
        lodash.pullAt = pullAt;
        lodash.range = range;
        lodash.rearg = rearg;
        lodash.reject = reject;
        lodash.remove = remove;
        lodash.rest = rest;
        lodash.restParam = restParam;
        lodash.set = set;
        lodash.shuffle = shuffle;
        lodash.slice = slice;
        lodash.sortBy = sortBy;
        lodash.sortByAll = sortByAll;
        lodash.sortByOrder = sortByOrder;
        lodash.spread = spread;
        lodash.take = take;
        lodash.takeRight = takeRight;
        lodash.takeRightWhile = takeRightWhile;
        lodash.takeWhile = takeWhile;
        lodash.tap = tap;
        lodash.throttle = throttle;
        lodash.thru = thru;
        lodash.times = times;
        lodash.toArray = toArray;
        lodash.toPlainObject = toPlainObject;
        lodash.transform = transform;
        lodash.union = union;
        lodash.uniq = uniq;
        lodash.unzip = unzip;
        lodash.unzipWith = unzipWith;
        lodash.values = values;
        lodash.valuesIn = valuesIn;
        lodash.where = where;
        lodash.without = without;
        lodash.wrap = wrap;
        lodash.xor = xor;
        lodash.zip = zip;
        lodash.zipObject = zipObject;
        lodash.zipWith = zipWith;

        // Add aliases.
        lodash.backflow = flowRight;
        lodash.collect = map;
        lodash.compose = flowRight;
        lodash.each = forEach;
        lodash.eachRight = forEachRight;
        lodash.extend = assign;
        lodash.iteratee = callback;
        lodash.methods = functions;
        lodash.object = zipObject;
        lodash.select = filter;
        lodash.tail = rest;
        lodash.unique = uniq;

        // Add functions to `lodash.prototype`.
        mixin(lodash, lodash);

        /*------------------------------------------------------------------------*/

        // Add functions that return unwrapped values when chaining.
        lodash.add = add;
        lodash.attempt = attempt;
        lodash.camelCase = camelCase;
        lodash.capitalize = capitalize;
        lodash.clone = clone;
        lodash.cloneDeep = cloneDeep;
        lodash.deburr = deburr;
        lodash.endsWith = endsWith;
        lodash.escape = escape;
        lodash.escapeRegExp = escapeRegExp;
        lodash.every = every;
        lodash.find = find;
        lodash.findIndex = findIndex;
        lodash.findKey = findKey;
        lodash.findLast = findLast;
        lodash.findLastIndex = findLastIndex;
        lodash.findLastKey = findLastKey;
        lodash.findWhere = findWhere;
        lodash.first = first;
        lodash.get = get;
        lodash.gt = gt;
        lodash.gte = gte;
        lodash.has = has;
        lodash.identity = identity;
        lodash.includes = includes;
        lodash.indexOf = indexOf;
        lodash.inRange = inRange;
        lodash.isArguments = isArguments;
        lodash.isArray = isArray;
        lodash.isBoolean = isBoolean;
        lodash.isDate = isDate;
        lodash.isElement = isElement;
        lodash.isEmpty = isEmpty;
        lodash.isEqual = isEqual;
        lodash.isError = isError;
        lodash.isFinite = isFinite;
        lodash.isFunction = isFunction;
        lodash.isMatch = isMatch;
        lodash.isNaN = isNaN;
        lodash.isNative = isNative;
        lodash.isNull = isNull;
        lodash.isNumber = isNumber;
        lodash.isObject = isObject;
        lodash.isPlainObject = isPlainObject;
        lodash.isRegExp = isRegExp;
        lodash.isString = isString;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
        lodash.kebabCase = kebabCase;
        lodash.last = last;
        lodash.lastIndexOf = lastIndexOf;
        lodash.lt = lt;
        lodash.lte = lte;
        lodash.max = max;
        lodash.min = min;
        lodash.noConflict = noConflict;
        lodash.noop = noop;
        lodash.now = now;
        lodash.pad = pad;
        lodash.padLeft = padLeft;
        lodash.padRight = padRight;
        lodash.parseInt = parseInt;
        lodash.random = random;
        lodash.reduce = reduce;
        lodash.reduceRight = reduceRight;
        lodash.repeat = repeat;
        lodash.result = result;
        lodash.runInContext = runInContext;
        lodash.size = size;
        lodash.snakeCase = snakeCase;
        lodash.some = some;
        lodash.sortedIndex = sortedIndex;
        lodash.sortedLastIndex = sortedLastIndex;
        lodash.startCase = startCase;
        lodash.startsWith = startsWith;
        lodash.sum = sum;
        lodash.template = template;
        lodash.trim = trim;
        lodash.trimLeft = trimLeft;
        lodash.trimRight = trimRight;
        lodash.trunc = trunc;
        lodash.unescape = unescape;
        lodash.uniqueId = uniqueId;
        lodash.words = words;

        // Add aliases.
        lodash.all = every;
        lodash.any = some;
        lodash.contains = includes;
        lodash.eq = isEqual;
        lodash.detect = find;
        lodash.foldl = reduce;
        lodash.foldr = reduceRight;
        lodash.head = first;
        lodash.include = includes;
        lodash.inject = reduce;

        mixin(lodash, (function() {
            var source = {};
            baseForOwn(lodash, function(func, methodName) {
                if (!lodash.prototype[methodName]) {
                    source[methodName] = func;
                }
            });
            return source;
        }()), false);

        /*------------------------------------------------------------------------*/

        // Add functions capable of returning wrapped and unwrapped values when chaining.
        lodash.sample = sample;

        lodash.prototype.sample = function(n) {
            if (!this.__chain__ && n == null) {
                return sample(this.value());
            }
            return this.thru(function(value) {
                return sample(value, n);
            });
        };

        /*------------------------------------------------------------------------*/

        /**
         * The semantic version number.
         *
         * @static
         * @memberOf _
         * @type string
         */
        lodash.VERSION = VERSION;

        // Assign default placeholders.
        arrayEach(['bind', 'bindKey', 'curry', 'curryRight', 'partial', 'partialRight'], function(methodName) {
            lodash[methodName].placeholder = lodash;
        });

        // Add `LazyWrapper` methods that accept an `iteratee` value.
        arrayEach(['dropWhile', 'filter', 'map', 'takeWhile'], function(methodName, type) {
            var isFilter = type != LAZY_MAP_FLAG,
                isDropWhile = type == LAZY_DROP_WHILE_FLAG;

            LazyWrapper.prototype[methodName] = function(iteratee, thisArg) {
                var filtered = this.__filtered__,
                    result = (filtered && isDropWhile) ? new LazyWrapper(this) : this.clone(),
                    iteratees = result.__iteratees__ || (result.__iteratees__ = []);

                iteratees.push({
                    'done': false,
                    'count': 0,
                    'index': 0,
                    'iteratee': getCallback(iteratee, thisArg, 1),
                    'limit': -1,
                    'type': type
                });

                result.__filtered__ = filtered || isFilter;
                return result;
            };
        });

        // Add `LazyWrapper` methods for `_.drop` and `_.take` variants.
        arrayEach(['drop', 'take'], function(methodName, index) {
            var whileName = methodName + 'While';

            LazyWrapper.prototype[methodName] = function(n) {
                var filtered = this.__filtered__,
                    result = (filtered && !index) ? this.dropWhile() : this.clone();

                n = n == null ? 1 : nativeMax(floor(n) || 0, 0);
                if (filtered) {
                    if (index) {
                        result.__takeCount__ = nativeMin(result.__takeCount__, n);
                    } else {
                        last(result.__iteratees__).limit = n;
                    }
                } else {
                    var views = result.__views__ || (result.__views__ = []);
                    views.push({ 'size': n, 'type': methodName + (result.__dir__ < 0 ? 'Right' : '') });
                }
                return result;
            };

            LazyWrapper.prototype[methodName + 'Right'] = function(n) {
                return this.reverse()[methodName](n).reverse();
            };

            LazyWrapper.prototype[methodName + 'RightWhile'] = function(predicate, thisArg) {
                return this.reverse()[whileName](predicate, thisArg).reverse();
            };
        });

        // Add `LazyWrapper` methods for `_.first` and `_.last`.
        arrayEach(['first', 'last'], function(methodName, index) {
            var takeName = 'take' + (index ? 'Right' : '');

            LazyWrapper.prototype[methodName] = function() {
                return this[takeName](1).value()[0];
            };
        });

        // Add `LazyWrapper` methods for `_.initial` and `_.rest`.
        arrayEach(['initial', 'rest'], function(methodName, index) {
            var dropName = 'drop' + (index ? '' : 'Right');

            LazyWrapper.prototype[methodName] = function() {
                return this[dropName](1);
            };
        });

        // Add `LazyWrapper` methods for `_.pluck` and `_.where`.
        arrayEach(['pluck', 'where'], function(methodName, index) {
            var operationName = index ? 'filter' : 'map',
                createCallback = index ? baseMatches : property;

            LazyWrapper.prototype[methodName] = function(value) {
                return this[operationName](createCallback(value));
            };
        });

        LazyWrapper.prototype.compact = function() {
            return this.filter(identity);
        };

        LazyWrapper.prototype.reject = function(predicate, thisArg) {
            predicate = getCallback(predicate, thisArg, 1);
            return this.filter(function(value) {
                return !predicate(value);
            });
        };

        LazyWrapper.prototype.slice = function(start, end) {
            start = start == null ? 0 : (+start || 0);

            var result = this;
            if (start < 0) {
                result = this.takeRight(-start);
            } else if (start) {
                result = this.drop(start);
            }
            if (end !== undefined) {
                end = (+end || 0);
                result = end < 0 ? result.dropRight(-end) : result.take(end - start);
            }
            return result;
        };

        LazyWrapper.prototype.toArray = function() {
            return this.drop(0);
        };

        // Add `LazyWrapper` methods to `lodash.prototype`.
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
            var lodashFunc = lodash[methodName];
            if (!lodashFunc) {
                return;
            }
            var checkIteratee = /^(?:filter|map|reject)|While$/.test(methodName),
                retUnwrapped = /^(?:first|last)$/.test(methodName);

            lodash.prototype[methodName] = function() {
                var args = arguments,
                    chainAll = this.__chain__,
                    value = this.__wrapped__,
                    isHybrid = !!this.__actions__.length,
                    isLazy = value instanceof LazyWrapper,
                    iteratee = args[0],
                    useLazy = isLazy || isArray(value);

                if (useLazy && checkIteratee && typeof iteratee == 'function' && iteratee.length != 1) {
                    // avoid lazy use if the iteratee has a "length" value other than `1`
                    isLazy = useLazy = false;
                }
                var onlyLazy = isLazy && !isHybrid;
                if (retUnwrapped && !chainAll) {
                    return onlyLazy
                        ? func.call(value)
                        : lodashFunc.call(lodash, this.value());
                }
                var interceptor = function(value) {
                    var otherArgs = [value];
                    push.apply(otherArgs, args);
                    return lodashFunc.apply(lodash, otherArgs);
                };
                if (useLazy) {
                    var wrapper = onlyLazy ? value : new LazyWrapper(this),
                        result = func.apply(wrapper, args);

                    if (!retUnwrapped && (isHybrid || result.__actions__)) {
                        var actions = result.__actions__ || (result.__actions__ = []);
                        actions.push({ 'func': thru, 'args': [interceptor], 'thisArg': lodash });
                    }
                    return new LodashWrapper(result, chainAll);
                }
                return this.thru(interceptor);
            };
        });

        // Add `Array` and `String` methods to `lodash.prototype`.
        arrayEach(['concat', 'join', 'pop', 'push', 'replace', 'shift', 'sort', 'splice', 'split', 'unshift'], function(methodName) {
            var func = (/^(?:replace|split)$/.test(methodName) ? stringProto : arrayProto)[methodName],
                chainName = /^(?:push|sort|unshift)$/.test(methodName) ? 'tap' : 'thru',
                retUnwrapped = /^(?:join|pop|replace|shift)$/.test(methodName);

            lodash.prototype[methodName] = function() {
                var args = arguments;
                if (retUnwrapped && !this.__chain__) {
                    return func.apply(this.value(), args);
                }
                return this[chainName](function(value) {
                    return func.apply(value, args);
                });
            };
        });

        // Map minified function names to their real names.
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
            var lodashFunc = lodash[methodName];
            if (lodashFunc) {
                var key = lodashFunc.name,
                    names = realNames[key] || (realNames[key] = []);

                names.push({ 'name': methodName, 'func': lodashFunc });
            }
        });

        realNames[createHybridWrapper(null, BIND_KEY_FLAG).name] = [{ 'name': 'wrapper', 'func': null }];

        // Add functions to the lazy wrapper.
        LazyWrapper.prototype.clone = lazyClone;
        LazyWrapper.prototype.reverse = lazyReverse;
        LazyWrapper.prototype.value = lazyValue;

        // Add chaining functions to the `lodash` wrapper.
        lodash.prototype.chain = wrapperChain;
        lodash.prototype.commit = wrapperCommit;
        lodash.prototype.plant = wrapperPlant;
        lodash.prototype.reverse = wrapperReverse;
        lodash.prototype.toString = wrapperToString;
        lodash.prototype.run = lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;

        // Add function aliases to the `lodash` wrapper.
        lodash.prototype.collect = lodash.prototype.map;
        lodash.prototype.head = lodash.prototype.first;
        lodash.prototype.select = lodash.prototype.filter;
        lodash.prototype.tail = lodash.prototype.rest;

        return lodash;
    }

    /*--------------------------------------------------------------------------*/

    // Export lodash.
    var _ = runInContext();

    // Some AMD build optimizers like r.js check for condition patterns like the following:
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        // Expose lodash to the global object when an AMD loader is present to avoid
        // errors in cases where lodash is loaded by a script tag and not intended
        // as an AMD module. See http://requirejs.org/docs/errors.html#mismatch for
        // more details.
        root._ = _;

        // Define as an anonymous module so, through path mapping, it can be
        // referenced as the "underscore" module.
        define(function() {
            return _;
        });
    }
    // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
    else if (freeExports && freeModule) {
        // Export for Node.js or RingoJS.
        if (moduleExports) {
            (freeModule.exports = _)._ = _;
        }
        // Export for Rhino with CommonJS support.
        else {
            freeExports._ = _;
        }
    }
    else {
        // Export for a browser or Rhino.
        root._ = _;
    }
}.call(this));/**
 * Created by anton_gorshenin on 23.06.2015.
 */

/**
 * Created by nikolay_ivanisenko on 25.05.2015.
 */



$(document).ready(function () {
    if(location.hash) {
        $('ul.tabsMy li').removeClass('active');
        $('.tab-content').removeClass('current');
        $('a[href=' + location.hash + ']').tab('show');
        $(location.hash).addClass('current');
    }

    $(document.body).on("click", "a[data-toggle]", function(event) {
        location.hash = this.getAttribute("href");
    });

    $(window).on('popstate', function() {
        var anchor = location.hash || $("a[data-toggle=tab]").first().attr("href");
        $('a[href=' + anchor + ']').tab('show');
    });

    $('ul.tabsMy li').click(function () {
        var tab_id = $(this).attr('data-tab');

        $('ul.tabsMy li').removeClass('active');
        $('.tab-content').removeClass('current');

        $(this).addClass('active');
        $("#" + tab_id).addClass('current');
    })


    $('ul.nav-tabs li').click(function () {
        var tab_id = $(this).attr('data-tab');

        $('ul.nav-tabs li').removeClass('active');
        $('.nav-tab-content').removeClass('current');

        $(this).addClass('active');
        $("#" + tab_id).addClass('current');
    })

});
function createNewCategory() {
    var nameCategory = $("#newCategory").val();
    if(nameCategory !=0){
        //console.log('yes');
        socket.emit('createFilter', {"name":"School","params": nameCategory });
        $('#errorCreateSchool').css('display','none');
        $('#completeCreateSchool').css('display','block');
        $('#completeCreateSchool').html('The category '+nameCategory+  ' has been added successful');
        setTimeout(function(){$('#completeCreateSchool').fadeOut('fast')},3000);
    }else{
        //console.log('no');
        $('#errorCreateSchool').css('display','block');
        $('#completeCreateSchool').css('display','none');
    }

    //console.log(nameCategory);
};

function createNewFilter() {
    var nameFilter = $("#paramFilter").val();
    if(nameFilter !=0){
        socket.emit('createFilter', {"name":"Filter2","params": nameFilter });
        $('#errorCreateFilter').css('display','none');
        $('#completeCreateFilter').css('display','block');
        $('#completeCreateFilter').html('The filter '+nameFilter+  ' has been added successful');
        setTimeout(function(){$('#completeCreateFilter').fadeOut('fast')},3000);
    }else{
        console.log('no');
        $('#errorCreateFilter').css('display','block');
        $('#completeCreateFilter').css('display','none');
    };
};
//TODO =====================
var idDevice;
var tokenDevice;
var newUsersId;
var oldNameUser;

function editFilters(context) {
    //$("#newNameCategory").val(context.parentNode.parentNode.childNodes[1].innerText).attr("data-name",context.parentNode.parentNode.childNodes[1].innerText);
    $("#newNameCategory").attr("data-name",context).attr("value",context).attr("placeholder",context);
    //console.log(context);
};
function editUsers(x) {
    newUsersId= x.split(' ')[0];
    $('#newNameUsers').attr("value",x.split(' ')[2]);
    oldNameUser=x.split(' ')[2]
    $('.form-horizontal').trigger( 'reset' )
};

function inputNewNameCategory() {
    var device = {};
    device.oldName = $("#newNameCategory").attr("data-name");
    device.newName = $("#newNameCategory").val();
    if(device.newName != 0 && device.newName!=device.oldName) {
        //console.log('yes');
        $('#errorEditFilters').css('display','none');
        $('#completeEditFilters').css('display','block');
        socket.emit('editCategory', device);
        $("#completeEditFilters").html('The category '+device.newName+ ' has been saved successfully')
        setTimeout(function(){$('#completeEditFilters').fadeOut('fast')},3000);
    }else if(device.newName==device.oldName){
        $('#errorEditFilters').css('display','block');
        $('#completeEditFilters').css('display','none');
        $("#errorEditFilters").html('not a change of name')
        setTimeout(function(){$('#errorEditFilters').fadeOut('fast')},3000);
    }
    else{
        //console.log('no');
        $('#errorEditFilters').css('display','block');
        $('#completeEditFilters').css('display','none');
        $("#errorEditFilters").html('All fields must be filled out')
        setTimeout(function(){$('#errorEditFilters').fadeOut('fast')},3000);
    }
    //console.log(device);
};
function inputNewNameUser() {
    var device = {};
    device.id = newUsersId;
    device.newName = $("#newNameUsers").val();
    device.newPassword = $("#newNamepassword").val();
    var newPassword2 = $("#newNamepassword2").val();
    if(device.newPassword == newPassword2 && device.newName!=0){
        console.log(oldNameUser);
        $('#errorUsersPassword').css('display','none');
        $('#errorUsersName').css('display','none');
        $('#completeUsersEdit').css('display','block');
        if(oldNameUser!=device.newName && newPassword2==0){
            $('#completeUsersEdit').html('name changed');
            oldNameUser=device.newName;
            setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
        }
        else if(oldNameUser!=device.newName && newPassword2!=0){
            $('#completeUsersEdit').html('name and password changed');
            oldNameUser=device.newName;
            setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
        }
        else if((oldNameUser==device.newName && newPassword2==0)){
            $('#completeUsersEdit').html('field is not changed');
            setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
        }else
        {
            $('#completeUsersEdit').html('password changed');
            setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
        }
        //$('.close').click();
        return socket.emit('updateUser', device);
        setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
    }if(device.newPassword != newPassword2 ){
        $('#errorUsersPassword').css('display','block');
        $('#errorUsersName').css('display','none');
        $('#completeUsersEdit').css('display','none');
        setTimeout(function(){$('#errorUsersPassword').fadeOut('fast')},3000);
        return newPassword2;

    }else{
        $('#errorUsersName').css('display','block');
        $('#errorUsersPassword').css('display','none');
        $('#completeUsersEdit').css('display','none');
        setTimeout(function(){$('#errorUsersName').fadeOut('fast')},3000);
    }
};
function validPassword(data){
    if($("#addPasswordUsers").val()!=$("#addPassword2Users").val()){
        $('#errorAddUsersPassword').css('display','block');
        return false;}
}
function editDeviceWriteIdToken(x){
    idDevice=x.split(',')[0];
    tokenDevice=x.split(',')[1];
    $("#idDevise").attr('value',idDevice);
    $("#tokenDevise").attr('value',tokenDevice);
    $("#nameDevise").attr('value',x.split(',')[2]);
    if(tokenDevice=='undefined'){
        $(".tokenDevise").addClass("no-show")
    }else{
        $(".tokenDevise").removeClass("no-show")
    }
    console.log(tokenDevice);
}
function editDevice(){
    var device = {};
    device.id = idDevice;
    device.school = $("#editDeviceCategory").val();
    device.filter2 = $("#editDeviceFilter2").val();
    device.comments = $("#newComment").val();
    if(device.school !=0) {
        $('#editDevice .close').click();
        socket.emit('updateDevice', device);
        $('#errorEditDevice').css('display','none');
        $('#completeEditDevice').css('display','block');
    }else{
        $('#errorEditDevice').css('display','block');
        $('#completeEditDevice').css('display','none');
    }
    //console.log(device);
}
var params = {};
function sort(place) {
    var elem = document.getElementById('paged').getElementsByTagName('th');
    if (place) {
        switch (+place.dataset.id) {
            case 1:
                (+elem[1].dataset.sort == 1) ? elem[1].dataset.sort = -1 : elem[1].dataset.sort = 1;
                params = {
                    "_id": +elem[1].dataset.sort
                };
                break;
            case 2:
                (+elem[2].dataset.sort == 1) ? elem[2].dataset.sort = -1 : elem[2].dataset.sort = 1;
                params = {
                    "name": +elem[2].dataset.sort
                };
                break;
            case 3:
                (+elem[3].dataset.sort == 1) ? elem[3].dataset.sort = -1 : elem[3].dataset.sort = 1;
                params = {
                    "apk.build": +elem[3].dataset.sort
                };
                break;
            case 4:
                (+elem[4].dataset.sort == 1) ? elem[4].dataset.sort = -1 : elem[4].dataset.sort = 1;
                params = {
                    "loader": +elem[4].dataset.sort
                };
                break;
            case 5:
                (+elem[5].dataset.sort == 1) ? elem[5].dataset.sort = -1 : elem[5].dataset.sort = 1;
                params = {
                    "status": +elem[5].dataset.sort
                };
                break;
            default:
                return params
        }
        return params
    }

    return params
}
function uploadChangeApk(){
    $('#uploadApk').click();
}
function uploadChangeKidroid(){
    $('#uploadKidroid').click();
}
function deployAPK(){
    var apk = {};
    apk.version = $("#selectVersionApkToDeploy").val().split(' ')[0];
    console.log(apk.version);
    apk.build = $("#selectVersionApkToDeploy").val().split(' ')[1];
    apk.school = $("#selectCategory").val();
    apk.filter = $("#customFilter").val();
    apk.devices = $('input:checkbox.checkboxWarning:checked').map(function() {return this.value;}).get();
    if(apk.version==0){
        $("#errorDeployApk").css('display','block').css('display', 'block');
        $("#errorDeployApk").html("select version APK");
        setTimeout(function () {
            $('#errorDeployApk').fadeOut('fast')
        }, 3000);
    }else {
        //socket.emit("deployApk", apk);
        $("#completeDeployApk").css('display','block').css('display', 'block');
        $("#completeDeployApk").html("The deploy process has been initialized successfully (Type: Kidroid Loader, Version: v" + apk.version + " build " + apk.build + ")");
        setTimeout(function () {
            $('#completeDeployApk').fadeOut('fast')
        }, 3000);
    }
}
function deployKidroid(){
    var kidroid = {};
    kidroid.version = $("#kidroidVersionDeploy").val().split(' ')[0];
    kidroid.school = $("#selectCategory").val();
    kidroid.filter = $("#customFilter").val();
    kidroid.devices = $('input:checkbox.checkboxWarning:checked').map(function() {return this.value;}).get();
    if(kidroid.version==0){
        $("#errorDeployKidroid").css('display','block').css('display', 'block');
        $("#errorDeployKidroid").html("select version Kidroid");
        setTimeout(function(){$('#errorDeployKidroid').fadeOut('fast')},3000);
    }else {
        socket.emit("deployKidroid", kidroid);
        $("#completeDeployKidroid").css('display','block').css('display', 'block');
        $("#completeDeployKidroid").html("The deploy process has been initialized successfully (Type: Kidroid Loader, Version: v" + kidroid.version + ")");
        setTimeout(function () {
            $('#completeDeployKidroid').fadeOut('fast')
        }, 3000);
    }
}
function find(sort) {
    console.log(sort);
    var device = {};
    device.sort = (!sort)?{}:sort;
    device.search = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.school = $("#selectCategory").val();
    device.filter2 = $("#customFilter").val();
    device.build = $("#marionetteVersion").val();
    device.loader = $("#kidroidVersion").val();
    device.limit = itemsPerPage = $("#ItemsPerPage").val();
    socket.emit('getDevicesByParams', device);
    socket.emit('getDeviceIdByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
};
var acrivePage;
function page(i) {
    acrivePage=i;
    var device = {};
    var data = {};
    data.limit = itemsPerPage = $("#ItemsPerPage").val();
    device.sort = sort();
    device.search = data.search = $("#DeviceNameIDSerial").val();
    device.status = data.status = $("#selectStatus").val();
    device.school = data.school = $("#selectCategory").val();
    device.filter2 =data.filter2 =  $("#customFilter").val();
    device.build = data.build = $("#marionetteVersion").val();
    device.loader = $("#kidroidVersion").val();
    if(data.limit==10 || i==1) {
        device.page = data.page = i * 10 - 10;
    }else if(data.limit==20 && i!=1){
        device.page = data.page = i * 20 -20;
    }else if(data.limit==50 && i!=1){
        device.page = data.page = i * 50 -50;
    }
    socket.emit('getDevicesByParams', data);
    socket.emit('getDevicesQuantityByParams', device);
    //console.log(device);
};
function addDevice( ) {
    var device = {};
    device.category = $("#addSelectCategory").val();
    device.build = $("#addSelectVersion").val();
    device.numberDevice = number = $("#amountDevice").val();
    device.filter = $("#filter2").val();
    if (device.category != 0 && device.build !=0)  {
        socket.emit('createDevice', device);
        console.log(device);
        $('#errorAddDevice').css('display','none');
        $('#completeAddDevice').css('display','block');
        $('#idDeviceCreate').attr('rows',''+ number + '');
        setTimeout(function(){$('#completeAddDevice').fadeOut('fast')},3000);
        //$('#idDevice').css('display','block');
        //$('#addDevice').css('display','none');

        //console.log('yes');
    } else{
        $('#errorAddDevice').css('display','block');
        $('#completeAddDevice').css('display','none');
        setTimeout(function(){$('#errorAddDevice').fadeOut('fast')},3000);
    }
};

function finsDeviceSchedule(){
    var device ={
        id:{
            start: $('#idStart').val(),
            end: $('#idEnd').val()
        }
    };
    device.school = $('#scheduleDeviceCategory').val();
    device.version = $('#scheduleDeviceVersionFilter').val();
    socket.emit('getDeviceForSchedule', device);
    //console.log(device);
}
$(document).ready( function() {
    itemsPerPage = $("#ItemsPerPage").val();
    $("#checkAllSchedule").click( function() {
        if($('#checkAllSchedule').prop('checked')){
            $('.checkSchedule:enabled').prop('checked', true);
            //console.log('true');
        } else {
            $('.checkSchedule:enabled').prop('checked', false);
            //console.log('false');
        }
    });
    $("#checkboxWarning").click( function() {
        if($('#checkboxWarning').prop('checked')){
            $('.checkboxWarning:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkboxWarning:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllUsers").click( function() {
        if($('#checkAllUsers').prop('checked')){
            $('.checkAllUsers:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllUsers:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllFilters").click( function() {
        if($('#checkAllFilters').prop('checked')){
            $('.checkAllFilters:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllFilters:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllCategory").click( function() {
        if($('#checkAllCategory').prop('checked')){
            $('.checkAllCategory:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllCategory:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllMarionetteAPK").click( function() {
        if($('#checkAllMarionetteAPK').prop('checked')){
            $('.checkAllMarionetteAPK:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllMarionetteAPK:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllKidroidVersion").click( function() {
        if($('#checkAllKidroidVersion').prop('checked')){
            $('.checkAllKidroidVersion:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllKidroidVersion:enabled').prop('checked', false);
            console.log('false');
        }
    });
});


function createSchedule(){
    //var checked = [];
    start = $('#idStart').val();
    end = $('#idEnd').val();
    length = end-start;
    var i = 0;
    //while(++i <= length) {
    //    if (document.getElementsByName(i).checked) {
    //        checked.push(i);
    //    }
    //}

    var device ={};
    //for (var i = 0; i < length; i++){
    //    if($('#checkSchedule').attr('checked')){
    //        device.id = $('#checkSchedule').val();
    //    }
    //}
    da = $('#dateScheduleId').val();
    t = $('#timeSchedule').val();
    var neDate = Date.parse(da+'T'+t);
    device.date = neDate;
    device.devices = $('input:checkbox:checked').map(function() {return this.value;}).get();
    device.version =$('#scheduleDeviceVersion').val().split(' ')[1];
    //console.log(device.devices);

    if (device.devices ==0 || device.date == ''){
        $('#errorAddSchedule').css('display','block');

    }
    else {
        socket.emit('createSchedule', device)
        $('#editSchedule').removeClass('.in')
            .attr('aria-hidden', true)
            .css('z-index','-1')
            .css('opacity','0')
            .css('display','none');
        $('#errorAddSchedule').css('display','none');
        //console.log(device.devices);
    }
    //console.log(device);
}

function dellUsers(){
    var device ={};
    device.devices = $('input:checkbox.checkAllUsers:checked').map(function() {return this.value;}).get();
    socket.emit('removeUsers', device.devices);
    //console.log(device.devices);
}

//TODO ���������� �� ����������� ������� ��������
function dellFilter(){
    console.log("dellFilter");
    var filter ={};
    filter.filters = $('input:checkbox.checkAllFilters:checked').map(function() {return this.value;}).get();
    filter.name = "Filter2";
    if(filter.filters.length >=1){
        socket.emit('removeFilters', filter);
    }
    //console.log(device.devices);
}
function dellCategory(){
    console.log("dellCategory");
    var category ={};
    category.filters = $('input:checkbox.checkAllCategory:checked').map(function() {return this.value;}).get();
    category.name = "School";
    if(category.filters.length >=1){
        socket.emit('removeFilters', category);
    }
}
function delMarionetteAPK(){
    var device ={};
    device.devices = $('input:checkbox.checkAllMarionetteAPK:checked').map(function() {return this.value;}).get();
    socket.emit('removeMarionetteAPK', device.devices);
    //console.log(device.devices);
}
function delKidroidVersion(){
    var device ={};
    device.devices = $('input:checkbox.checkAllKidroidVersion:checked').map(function() {return this.value;}).get();
    socket.emit('removeKidroidVersion', device.devices)
    //console.log(device.devices);
}
function setDefaultApk(){
    var device = {}
    device.id = $('#selectDefaultApkVersion option:selected').attr('data-id');
    device.version = $('#selectDefaultApkVersion').val();
    device.type = 'APK';
    if(device.version.split(' ')[2]== 'current'){
        console.log('no');
    }else{
        console.log(device);
        socket.emit('makeDefaultVersion', device);
    }

}
function setDefault(){
    var device = {}
    device.id = $('#selectDefaultKidroidVersion option:selected').attr('data-id');
    device.version = $('#selectDefaultKidroidVersion').val();
    device.type = 'Kidroid';
    if(device.version.split(' ')[1]== 'current'){
        console.log('no');
    }else{
        //console.log('yes');
        socket.emit('makeDefaultVersion', device);
    }
}
$(document).ready(function () {
    $('#closeScheduleModal, #closeScheduleModal1').click(function(){
        $('#editSchedule').removeClass('.in')
            .attr('aria-hidden', true)
            .css('z-index','-1')
            .css('opacity','0')
            .css('display','none');
    });
})
$(document).ready(function () {
    $('#closeIdTextarea1, #closeIdTextarea').click(function () {
        $('#addDevice').css('display', 'block');
        $('#idDevice').removeClass('.in')
            .attr('aria-hidden', true)
            .css('z-index', '-1')
            .css('opacity', '0')
            .css('display', 'none');

    });
})

$(window).scroll(function(){
//box one
    var $win = $(window);
    $('#tab').css('left', -$win.scrollLeft());
});
//============reset forms==========
function resetForm(){
    jQuery('form')[0].reset();
    console.log('reset')
}
//===================
//$(document).ready(function () {
//    <div class="clndr-controls">
//    <div class="clndr-previous-button">&lsaquo;</div>
//    <div class="month"><%= month %></div>
//    <div class="clndr-next-button">&rsaquo;</div>
//    </div>
//}
// call this from the developer console and you can control both instances
var calendars = {};

$(document).ready( function() {

  // assuming you've got the appropriate language files,
  // clndr will respect whatever moment's language is set to.
  // moment.locale('ru');

  // here's some magic to make sure the dates are happening this month.
  var thisDate = moment().format('YYYY-MM');

  socket.on('allSchedule', function (data) {
    var eventArray=[];
    for (var i in data){
      eventArray.push({date:data[i].timeStart, title: data[i].status});
    }
    calendars.clndr1.setEvents(eventArray);
    //console.log(eventArray);
  });
  //var eventArray = [
  //  { date: thisDate + '-27', title: 'Single Day Event' }
  //];
  //var eventArray2= [
  //  { date: thisDate + '-20', title: 'Single Day Event' }
  //];


  // the order of the click handlers is predictable.
  // direct click action callbacks come first: click, nextMonth, previousMonth, nextYear, previousYear, or today.
  // then onMonthChange (if the month changed).
  // finally onYearChange (if the year changed).

  calendars.clndr1 = $('.calendar').clndr({
    // constraints: {
    //   startDate: '2013-11-01',
    //   endDate: '2013-11-15'
    // },
    clickEvents: {
      click: function(target) {
        //.link('#editSchedule');

        //console.log(target.date._i);
        $('#editSchedule').addClass('in')
            .attr('aria-hidden', false)
            .css('z-index','1050')
            .css('opacity','1')
            .css('display','block');
        document.getElementById('dateSchedule').innerHTML= '<input id="dateScheduleId" class="form-control" type="date" value="' + target.date._i + '">';
        // if you turn the `constraints` option on, try this out:
        // if($(target.element).hasClass('inactive')) {
        //   console.log('not a valid datepicker date.');
        // } else {
        //   console.log('VALID datepicker date.');
        // }
      },
      nextMonth: function() {
        console.log('next month.');
      },
      previousMonth: function() {
        console.log('previous month.');
      },
      onMonthChange: function() {
        console.log('month changed.');
      },
      nextYear: function() {
        console.log('next year.');
      },
      previousYear: function() {
        console.log('previous year.');
      },
      onYearChange: function() {
        console.log('year changed.');
      }
    },
    multiDayEvents: {
      startDate: 'startDate',
      endDate: 'endDate',
      singleDay: 'date'
    },
    showAdjacentMonths: true,
    adjacentDaysChangeMonth: false
  });

  // bind both clndrs to the left and right arrow keys
  $(document).keydown( function(e) {
    if(e.keyCode == 37) {
      // left arrow
      calendars.clndr1.back();
    }
    if(e.keyCode == 39) {
      // right arrow
      calendars.clndr1.forward();
    }
  });

});