(function(window) {
        'use strict';

        /**
        历史管理
        Events:
        onurlchange: function(pathname, search, hash, url, preUrl, window) {},
        onhashchange: function(pathname, search, hash, url, preHash, window) {}
        */
        var History = function(options, app, window) {
                this.options = _.extend({}, options);
                this.app = app;
                this.window = window;

                // 缓存初始地址
                this.location = window.location.href;

                this.back = _.bind(window.history.back, window.history);
                this.forward = _.bind(window.history.forward, window.history);
                this.go = _.bind(window.history.go, window.history);
                this.length = function() {
                        return window.history.length;
                };
                this.state = function() {
                        return window.history.state;
                };
        };

        MicroEvent.mixin(History);

        /**
        获取/设置data
        */
        History.prototype.get = function(name) {
                return (this.datas = this.datas || {})[name];
        };

        History.prototype.set = function(name, value) {
                (this.datas = this.datas || {})[name] = value;
        };

        /**
        根据初始地址(this.location)构造URL地址
        login.html to xx://xxx/login.html
        /login.html to xx://login.html
        */
        History.prototype.buildUrl = function(url) {
                // 判断协议 xxx://
                if (!url || url.search(/[a-zA-Z]+:[\/]{2}/ig) == 0) {
                        return url;
                }
                // 处理绝对路径
                if (url.indexOf('/') == 0) {
                        return decodeURIComponent(new URI(this.location).search('').hash('').pathname(url).toString());
                } else { //处理相对路径 
                        return decodeURIComponent(new URI(this.location).search('').hash('').filename(url).toString());
                }
        };

        /**
        解析URL
        @param {string} href: 全路径
        @returns {[url,dialog url]
        */
        History.parseUrl = function(href) {
                var url = new URI(href);
                var parameters = url.search(true);

                var urls = {};
                var mainUrl = url.clone();
                _.each(parameters, function(suburl, key) {
                        if (key.indexOf('!') != 0) {
                                return;
                        }

                        urls[key.substr(1)] = decodeURIComponent(suburl);
                        mainUrl.removeSearch(key); // set empty
                });
                urls['P'] = mainUrl.toString();
                return urls;
        };

        History.prototype._check_url = function(scopeName, url, callback) {
                var preurl = this.get(scopeName + '-cached-url');
                if (preurl == url) {
                        callback();
                        return;
                }

                var self = this;
                this.set(scopeName + '-cached-url', url);
                this.triggerback('urlchange', function() {
                        callback();
                }, scopeName, url, preurl, this.window);
        };

        /**
        内部函数，监听URL变化
        */
        History.prototype.check_url = function(href) {
                var href = href || this.window.location.href;
                var urls = History.parseUrl(this.buildUrl(href));

                var self = this;
                var idx = 0,
                        len = _.size(this.app.scopes);
                var check_next_scope_url = function() {
                        if (idx >= len) {
                                return;
                        }

                        var _i = 0;
                        var scopeName = _.find(self.app.scopes, function(scope, scopeName) {
                                var r = _i == idx;
                                _i += 1;
                                return r;
                        }).name;
                        self._check_url(scopeName, urls[scopeName], function() {
                                idx += 1;
                                check_next_scope_url();
                        });
                };
                check_next_scope_url();
        };

        History.prototype.redirect = function(scopeName, url, silence) {
                if (scopeName == 'P') {
                        this.window.history.pushState({}, '', url);
                        this.check_url();
                        return;
                }

                var mainUrl = new URI(this.window.location.href);
                var parameters = mainUrl.search(true) || {};
                var d = parameters['!' + scopeName];
                var newd;

                if (url && url.indexOf('#') == 0) {
                        newd = new URI(d).hash(url).toString();
                } else {
                        newd = url;
                }

                parameters['!' + scopeName] = newd;
                mainUrl.search(parameters);

                if (!silence) {
                        this.window.history.pushState({}, '', mainUrl.toString());
                        this.check_url();
                        return;
                }

                this.check_url(mainUrl.toString());
        };

        History.constructor = History;

        /**
        资源
        */
        var Resource = function(options, app) {
                this.options = _.extend({
                        enter_animate: 'fadeInRight',
                        out_animate: 'fadeOutLeft',
                        path: undefined
                }, options);
                this.app = app;
                this.bind_event();
        };

        MicroEvent.mixin(Resource);

        Resource.prototype.bind_event = function() {
                this.on('attach', _.bind(this._onattach, this));
                this.on('detach', _.bind(this._ondetach, this));
        };

        Resource.prototype._onattach = function(scopeName, url, triggerback) {
                var scope = this.app.scope(scopeName);
                var $container = this.$container = $(scope.buildContainer());
                var self = this;
                $.get(this.options.path, function(html) {
                        $container.html(html);
                        $container.animatecss(self.options.enter_animate, function() {
                                triggerback();
                        });
                });
        };

        Resource.prototype._ondetach = function(scopeName, url, triggerback) {
                var scope = this.app.scope(scopeName);
                var self = this;
                this.$container.animatecss(self.options.out_animate, function() {
                        scope.removeContainer(self.$container);
                        triggerback();
                });
        };

        Resource.constructor = Resource;

        /**
        作用域
        */
        var Scope = function(name) {
                this.name = name;
        };
        Scope.prototype.buildContainer = function() {};
        Scope.prototype.removeContainer = function() {};
        Scope.constructor = Scope;

        /**
        应用对象
        */
        var Mapp = function(options, window) {
                this.options = _.extend({
                        /**
                        路由规则
                        [
                                {route:'/xxxxxx/:p1',resource:object or function(){}}
                        ]
                        */
                        routers: undefined,
                        /**
                        构造page container
                        */
                        make_page_container: undefined,
                        /**
                        构造 dialog container
                        */
                        make_dialog_container: undefined
                }, options);
                this.window = window;
                this.scopes = {};
        };

        MicroEvent.mixin(Mapp);

        Mapp.prototype.startup = function() {
                this.history = new History({}, this, window);
                this.history.on('urlchange', _.bind(this.on_url_change, this));

                this.history.check_url();

                var self = this;
                (this.window.onpopstate = function() {
                        self.history.check_url();
                })();
                (this.window.onhashchange = function() {
                        self.history.check_url();
                })();

                this.proxyLinks();
        };

        Mapp.prototype.proxyLinks = function() {
                var self = this;
                $(this.window.document.body).on('click', 'a', function(e) {
                        return self.on_link_click(this);
                });
        };

        /**
        获取、设置作用域
        */
        Mapp.prototype.scope = function(scopeName, scope) {
                if (scope) {
                        this.scopes[scopeName] = scope;
                        return;
                }
                return this.scopes[scopeName];
        };

        Mapp.prototype.on_link_click = function(a) {
                var $a = $(a);
                var href = $a.attr('href');
                if (!href || href.indexOf('javascript:') == 0) {
                        return true;
                }
                var target = $a.attr('target');
                if (!target) {
                        return true;
                }
                var silence = target.indexOf('!') == 0;
                target = silence ? target.substring(1) : target;
                if (this.scope(target)) {
                        this.history.redirect(target, href, silence);
                        return false;
                }
                return true;
        };

        Mapp.prototype._match_router = function(url) {
                var self = this;
                var router = _.find(this.options.routers, function(router) {
                        return routeMatcher(self.history.buildUrl(router.route)).parse(url) != undefined;
                });
                if (router) {
                        return router;
                }
                url = new URI(url).search('').fragment('').toString();
                return _.find(this.options.routers, function(router) {
                        return routeMatcher(self.history.buildUrl(router.route)).parse(url) != undefined;
                });
        };

        Mapp.prototype.matchRouter = function(url) {
                if (!url) {
                        return undefined;
                }

                url = new URI(url).fragment('').toString();

                var self = this;
                var router = this._match_router(url);

                if (router) {
                        return router;
                }

                return this._match_router(new URI(url).search('').toString());
        };

        Mapp.prototype._switch_state = function(scopeName, resource, from, to, callback) {
                var self = this;
                var mocker = new MicroEvent.Mocker(resource);
                self.triggerback('stateswitch', function() {
                        mocker.triggerback('stateswitch', function() {
                                mocker.triggerback('stateswitched', function() {
                                        self.triggerback('stateswitched', function() {
                                                callback();
                                        }, scopeName, resource, from, to);
                                }, scopeName, from, to);
                        }, scopeName, from, to);
                }, scopeName, resource, from, to);
        };

        Mapp.prototype._switch = function(scopeName, resource, url, preresource, preurl, callback) {
                var self = this;
                self.triggerback('switch', function() {
                        var premocker = new MicroEvent.Mocker(preresource);
                        var mocker = new MicroEvent.Mocker(resource);
                        premocker.triggerback('detach', function() {
                                premocker.triggerback('detached', function() {
                                        mocker.triggerback('attach', function() {
                                                mocker.triggerback('attached', function() {
                                                        self.triggerback('switched', callback, scopeName, resource, url, preresource, preurl)
                                                }, scopeName, url);
                                        }, scopeName, url);
                                }, scopeName, preurl);
                        }, scopeName, preurl);
                }, scopeName, resource, url, preresource, preurl);
        };

        Mapp.prototype.on_url_change = function(scopeName, url, preurl, window, callback) {
                var scope = this.scopes[scopeName];
                url = this.history.buildUrl(url);

                var router = this.matchRouter(url);
                var self = this;

                if (scope.resource && (new URI(scope.resource.url).fragment('').toString() == url ? new URI(url).fragment('').toString() : '')) {
                        // 切换状态
                        this._switch_state(scopeName, scope.resource, scope.resource ? new URI(scope.resource.url).fragment() : undefined, url ? new URI(url).fragment() : undefined, callback);
                        return;
                }

                // 切换页面
                var resource = router ? _.isFunction(router.resource) ? router.resource(this, scopeName) : router.resource : undefined;
                if (resource) {
                        resource.url = url;
                }
                this._switch(scopeName, resource, url, scope.resource, preurl, function() {
                        scope.resource = resource;
                        self._switch_state(scopeName, resource, undefined, url ? new URI(url).fragment() : undefined, callback);
                });
        };

        window.Mapp = Mapp.constructor = Mapp;
        Mapp.History = History;
        Mapp.Resource = Resource;
        Mapp.Scope = Scope;
})(window);
