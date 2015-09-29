# mapp.js
mobile app 


---------------------------
依赖

* [jquery.js](http://jquery.com/) or [zepto.js](http://zeptojs.com/)
* [history.js](https://github.com/browserstate/history.js/)
* [routeMatcher](https://github.com/GENGSHUANGs/javascript-route-matcher/)
* [microevent.js](https://github.com/GENGSHUANGs/microevent.js '定制版')`

USAGE:

```css
/* 设置页面的宽高 */
html,body{
	margin:0px;
	padding:0px;
	width:100%;
	height:100%;
	display:block;
}

/* 欢迎页面设置(浮层) */
.welcome{width:100%;
	height:100%;
	display:block;
	position:absolute;
	left:0px;
	top:0px;
	text-align:center;
	z-index:2;
}

/* 页面样式 */
ul.app{list-style:none;
	padding:0px;
	margin:0px;
	display:block;
	width:100%;
	height:100%;
	position:relative;
}

ul.app li.app-page-container{margin:0px;
	padding:0px;
	width:100%;
	height:100%;
	display:block;
	left:0px;
	top:0px;
}
```

```html
<ul class="app">
</ul>
<script type="text/template" id="page-container-template">
	<li class="app-page-container" />
</script>

<div class="welcome" >
欢迎使用Xxxxx (ver 1.0)
</div>

<script src="jquery.js or zepto.js" ></script>
<script src="history.js" ></script>
<script src="javascript-route-matcher.js" ></script>
<script src="microevent.js" ></script>
<script src="mapp.js" ></script>
```

```javascript
(function(window,$,Mapp,undefined){
	'use strict' ;

	/**
	主页资源 */
	var HomeResource = function(){
		Mapp.Resource.prototype.constructor.apply(this,arguments);
		// do something else
	};

	$.extend(HomeResource.prototype,Mapp.Resource.prototype);

	/**
	开始附加资源 
	@param initiative {boolean} : 是否主动(如果使用前进或者后退激活的情况，该值为false) 
	@param app {Mapp} : 
	@param hash {string} : URL(不包含域名部分，以根 "/" 开始) 
	@param haspreresource {boolean} : 是否存在上一个资源(第一页 false ，其它true ) 
	@param triggerback {function} : 回调函数(此函数必须被调用，否则，mapp.js 将无法知道本次 on_attach 是否完成，会一致等待！) */
	HomeResource.prototype.on_attach = function(initiative,app,hash,haspreresource,triggerback){
		var self = this;
		$.get(hash,function(html){
			$(self.container).append(html);
			triggerback();
		});
	};

	/**
	资源附加完成(参数说明，参考on_attach) */
	HomeResource.prototype.on_attached = function(initiative,app,hash,haspreresource,triggerback){
		this._request_config_data(this.updateUi.bind(this));
	};

	/**
	资源开始卸载 */
	HomeResource.prototype.on_detach = function(initiative,app,hash,triggerback){
		// do something
		triggerback();
	};

	/**
	资源卸载完成 */
	HomeResource.prototype.on_detached = function(initiative,app,hash,triggerback){
		// do something
		triggerback();
	};

	HomeResource.prototype._request_config_data = function(callback){
		$.getJSON('/app/' + this.params.id + '/home/conf.json',callback);
	};

	HomeResource.prototype.updateUi = function(conf){
		// update ui by config data
	};

	/**
	初始化app */
	var app = new Mapp('.app',{
		// 配置域管理器
		scope:$.extend({
			build_container:function(dom){
				return $($('#page-container-template').html()).appendTo(dom);
			}
		},Mapp.default_page_scope),
		// 配置路由
		routers:{
			'/app/:id/home.html':function(app,route,hash,params){
				return new HomeResource(app,route,hash,params);
			}
		}
	});

	/**
	启动app(startup函数接收一个回调函数) */
	app.startup(function(){ // startup done
		// 代理链接
		$(document.body).on('click','a',function(){
			return app.redirect($(this).attr('href'));
		});
		// 隐藏欢迎页 
		$('.welcome').hide(); 
		// 跳转到首页
		app.redirect('/app/00001/home.html'); 
	});
})(window,window.jQuery || window.Zepto,window.Mapp);
```