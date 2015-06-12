(function(window, $, undefined) {
        'use strict';

        /**
        animate.css 支持
        */
        $.fn.animatecss = function(classname, callback) {
                return $(this).each(function() {
                        var $element = $(this);

                        // 浏览器兼容处理
                        $element.addClass('animated ' + classname).one('webkitAnimationEnd animationend', function() {
                                $element.removeClass('animated ' + classname + ' animationend webkitAnimationEnd');
                                callback();
                        });
                });
        };
})(window, jQuery);
