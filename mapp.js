;
(function(window, $, History, MicroEvent, undefined) {
        'use strict';

        /**
        异步等待 */
        var Waiter = function(length, ready) {
                var args = Array.prototype.slice.call(arguments);
                var count = 0;
                return function() {
                        count++;
                        if (count == length) {
                                ready();
                        }
                };
        };

        /**
        移动APP */
        var Mapp = function(dom, options) {
                this.$dom = $(dom);
                this.options = $.extend({
                        scope: Mapp.default_page_scope,
                        routers: {
                                // '/mobileweb/wall/control/:flag.html': function(app, route, hash, params) {}f
                        }
                }, options);
                this._bind_events();
        };

        MicroEvent.mixin(Mapp);

        /**
        默认页面域 */
        Mapp.default_page_scope = {
                // 构造 container function(dom){}
                build_container: undefined,
                // 切换 container
                switch_by_container: function(initiative,app, preresource, resource, hash, triggerback) {
                        new MicroEvent.Mocker(preresource).triggerback(Resource.EVENT_DETACH,initiative, app, hash, function() {
                                resource.triggerback(Resource.EVENT_ATTACH, initiative,app, hash, !!preresource, function() {
                                        new MicroEvent.Mocker(preresource).triggerback(Resource.EVENT_DETACHED,initiative, app, hash, function() {
                                                resource.triggerback(Resource.EVENT_ATTACHED, initiative,app, hash, !!preresource, triggerback);
                                        })
                                });
                        });
                },
                // 删除 container
                remove_container: function(container, dom) {
                        $(container).hide().remove();
                }
        };

        var toquerystring = $.param.bind($);

        Mapp.prototype._bind_events = function(dom, options) {
                var self = this;
                History.Adapter.bind(window, 'statechange', function() {
                        var initiative = self.__is_initiative_redirect;
                        self.__is_initiative_redirect = false;
                        self._push(History.getState().hash,initiative);
                });
                this.on(Mapp.EVENT_SWITCH, this._on_switch.bind(this));
        };

        Mapp.prototype._on_switch = function(initiative,preresource, resource, hash, triggerback) {
                resource.container = this.options.scope.build_container(this.$dom);
                this.options.scope.switch_by_container(initiative,this,preresource, resource, hash, triggerback);
        };

        Mapp.prototype._proxy_link = function(link) {
                var $link = $(link);
                var link = $link.attr('href');
                if (!link || link.indexOf('javascript:') == 0) {
                        return false;
                }
                return this.redirect(link,false);
        };

        Mapp.prototype.redirect = function(link, isforward) {
                if (link.indexOf('http://') != 0 && link.indexOf('https://') != 0 && link.indexOf('/') != 0) {
                        link = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + link;
                }
                var r = this.match(link);
                if(!r){
                        return true;
                }
                this.__is_initiative_redirect = true;
                History[isforward ? 'replaceState' : 'pushState'](undefined, r && r.resource ? r.resource.title : undefined, link);
                return false;
        };

        Mapp.prototype.match = function(link) {
                var newlink = link.indexOf('?') != -1 ? link.substring(0,link.indexOf('?')) : link;
                var r = {};
                for (var route in this.options.routers || {}) {
                        r.params = routeMatcher(route).parse(newlink);
                        if (typeof r.params == 'undefined' || r.params === null) {
                                continue;
                        }
                        var generator = this.options.routers[route];
                        r.resource = generator(this, route, link, r.params);
                }
                return r.resource ? r : undefined;
        };

        Mapp.prototype._push = function(hash,initiative, callback) {
                var r = this.match(hash);
                if (!r || !r.resource) {
                        throw new Error('invalid-link:' + hash);
                }
                r.resource.hash = hash;
                var preresource = this.resource;
                this.resource = r.resource;
                var self = this;
                this.triggerback(Mapp.EVENT_SWITCH,initiative, preresource, r.resource, hash, function() {
                        self.triggerback(Mapp.EVENT_SWITCHED,initiative, preresource, r.resource, hash, (callback || function() {}));
                });
        };

        Mapp.prototype.startup = function(callback) {
                var self = this;
                this.$dom.on('click', 'a', function(e){
                        return self._proxy_link(this);
                });
                (callback || function() {})();
        };

        Mapp = $.extend(Mapp, {
                EVENT_SWITCH: 'switch', // 开始切换
                EVENT_SWITCHED: 'switched' // 切换完成
        });

        var Resource = function(title, app, route, hash, params) {
                this.app = app;
                this.route = route;
                this.hash = hash;
                this.params = params || {};
                this.title = title;

                this._bind_events();
        };

        MicroEvent.mixin(Resource);

        Resource.prototype._bind_events = function() {
                this.on(Resource.EVENT_ATTACH,this['on_' + Resource.EVENT_ATTACH].bind(this));
                this.on(Resource.EVENT_ATTACHED,this['on_' + Resource.EVENT_ATTACHED].bind(this));
                this.on(Resource.EVENT_DETACH,this['on_' + Resource.EVENT_DETACH].bind(this));
                this.on(Resource.EVENT_DETACHED,this['on_' + Resource.EVENT_DETACHED].bind(this));
        };

        Resource = $.extend(Resource, {
                EVENT_ATTACH: 'attach',
                EVENT_ATTACHED: 'attached',
                EVENT_DETACH: 'detach',
                EVENT_DETACHED: 'detached'
        });

        // 初始化事件接收
        var emptyhandle = function() {
                arguments[arguments.length - 1]();
        };
        [Resource.EVENT_ATTACH,Resource.EVENT_ATTACHED,Resource.EVENT_DETACH,Resource.EVENT_DETACHED].forEach(function(name){
                Resource.prototype['on_' + name] = emptyhandle;
        });

        Mapp.Resource = Resource;
        window.Mapp = Mapp;
})(window, window.jQuery || window.Zepto, window.History, window.MicroEvent);
