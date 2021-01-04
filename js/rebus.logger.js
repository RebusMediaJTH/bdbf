var rebus = rebus || {};

rebus.entitySerializer = (function ($, undefined) {
    var FLAT_TYPES = 'string number boolean date'.split(' ');

    var htmlEncode = function (value) {
        return $('<div/>').text(value).html();
    };

    var isSmallPlainArray = function (arr) {
        var res = true;
        if (arr.length > 30) {
            return false;
        }
        $.each(arr, function () {
            if (FLAT_TYPES.indexOf($.type(this)) === -1) {
                res = false;
                return false;
            }
        });
        return res;
    };

    // Serializes an object, array or simple value and does so recursively for object & arrays
    var serialize = function (entity, isObjectValue, type) {
        var res = '';
        try {
            if (undefined === entity) {
                return isObjectValue ? ' <span class="value">undefined</span>' : ' undefined';
            }
            else if (entity === null) {
                return isObjectValue ? ' <span class="value">null</span>' : ' null';
            }
            else if ($.isArray(entity)) {
                if (isSmallPlainArray(entity)) {
                    return htmlEncode(' [' + entity.join(', ') + ']');
                }
                res += ' <a href="#">Array</a><div class="expandable" hidden>';
                $.each(entity, function (i) {
                    res += '<span class="key">' + i + ':' + '</span>' + serialize(this, true) + '<br />';
                });
                res += '</div>';
                return res;
            }
            else if ($.isFunction(entity)) {
                res += ' <a href="#">Function</a><div class="expandable" hidden><div>' + entity.toString() + '</div></div>';
                return res;
            }
            else if (FLAT_TYPES.indexOf($.type(entity)) === -1) {
                res += ' <a href="#">Object</a><div class="expandable" hidden>';
                Object.getOwnPropertyNames(entity).forEach(function (key) {
                    res += '<span class="key">' + key + ':' + '</span>' + serialize(entity[key], true) + '<br />';
                });
                res += '</div>';
                return res;
            }
            if (isObjectValue) {
                return isObjectValue ? ' <span class="value">' + htmlEncode(entity) + '</span>' : ' ' + htmlEncode(entity);
            }
            else if (type) {
                return ' <span class="log-entry-type-' + type + '">' + htmlEncode(entity) + '</span>';
            }
            else {
                return ' <span>' + htmlEncode(entity) + '</span>';
            }
        } catch (e) {
            try {
                return JSON.serialize(entity);
            } catch (e2) {
                return '<span class="serialization-error">[Serialization Error] ' + e.message + '</span>';
            }
        }
    };

    return {
        serialize: function (entity, type) {
            return serialize(entity, false, type);
        },
        htmlEncode: htmlEncode
    };
})(jQuery);

rebus.logger = (function ($, undefined) {
	"use strict";

    var types, prefixType,
		localStorageLogKey,
        logs;

    var logSerializer = (function () {
		
		return {
			serialize: function (items) {
                var res = [];
                if (!items) {
                    return 'Empty';
                }
                for (var i = 0; i < items.length; i++) {
                    var line = '',
                        item = items[i];
                    for (var j = 0; j < item.args.length; j++) {
                        line += rebus.entitySerializer.serialize(item.args[j], item.type);
                    }
                    res.push('<div class="line">' + line.trim() + '</div>');
                }
                return res.join('\n');
            }
		};
	})();

    var logCore = function (type, args) {
        if (!$.isArray(args)) {
            args = [args];
        }
        if (type && prefixType) {
            args.unshift('[' + type + '] ');
        }
        //console.log.apply(console, args);
        if (!logs) {
            logs = localStorage.getItem(localStorageLogKey);
            if (logs) {
                logs = JSON.parse(logs);
            }
            else {
                logs = [];
            }
        }
        logs.push({ type: type, args: args });
        localStorage.setItem(localStorageLogKey, JSON.stringify(logs));
    };

    /*
        Use just like console.log:
            log('log label', 10, true);
        Specify a type:
			log('type=lms', 'log label', 10, true);
        Supply an object:
            log('type=error', e);
        Supply a mix:
            log('type=lms', 'arg 1', true, [], { });

		If the logging is costly, defer it by supplying one argument with a function that returns one of the above formats.
        If more than one value is returned, use an Array:
            log(function () { return ['type="lms"', 'log label', 10, true, { }, []]; });
    */
    var log = function () {
        var type, consoleArguments;
        if (types) {
            if ($.isFunction(arguments[0])) {
                consoleArguments = arguments[0]();
            }
            else {
                consoleArguments = Array.prototype.slice.call(arguments);
            }
            if (consoleArguments[0] + '' === consoleArguments[0] && ('' + consoleArguments[0]).indexOf('type=') === 0) {
                type = consoleArguments[0].split('=')[1];
                consoleArguments = consoleArguments.slice(1);
            }
            if (!type || types === '*' || types[type]) {
                logCore(type, consoleArguments);
            }
        }
    };

	return {
		/*
            options: { 
				namespace: String,
                types: { 'type1': Boolean, 'type2': Boolean, ... } | '*' | undefined [undefined],
                prefixType: Boolean [false]
            }

            If types is not supplied, nothing is logged.

            Usage:
                rebus.logger.init({ namespace: 'cyber', types: '*', prefixType: true });
         */
		init: function (options) {
			options = options || { };
			localStorageLogKey = options.namespace ? options.namespace + '.log' : 'log';
            types = options.types;
            prefixType = options.prefixType;

            if (types) {
                window.onerror = function (msg, url, line, col, error) {
                    var e = { msg: msg, url: url, line: line, col: col, error: error };
                    log('type=error', e.msg, e);
                    throw e;
                };
            }
		},
		/*
            Use just like console.log:
                log('log label', 10, true);
            Specify a type:
			    log('type=lms', 'log label', 10, true);
            Supply an object: 
                log('type=error', e);
            Supply a mix:
                log('type=lms', 'arg 1', true, [], { });

			If the logging is costly, defer it by supplying one argument with a function that returns one of the above formats.
            If more than one value is returned, use an Array:
                log(function () { return ['type="lms"', 'log label', 10, true, { }, []]; });
         */
		log: log,
		clearLog: function () {
            localStorage.removeItem(localStorageLogKey);
            logs = null;
		},
        serializeLog: function () {
			return logSerializer.serialize(JSON.parse(localStorage.getItem(localStorageLogKey)));
        }
	};
})(jQuery);

rebus.console = (function ($, undefined) {
    var storeKey = 'console.log',
        data,
        $output = $('#console-output');

    // https://developer.mozilla.org/en/docs/Web/API/Window/getComputedStyle
    var getCss = function (el) {
        var styles = window.getComputedStyle(el),
            style,
            res = {};
        for (var i = 0; i < styles.length; i++) {
            style = styles[i];
            res[style] = styles.getPropertyValue(style);
        }
        return res;
    };

    var evaluateAndSerialize = function (command) {
        try {
            return rebus.entitySerializer.serialize(eval(command));
        } catch (e) {
            return '<span class="console-error">' + e.message + '</span>';
        }
    };

    var addCommandToOutput = function (command) {
        $output.append([
            '<div class="console-line">',
                '<div class="console-command">&gt; ' + rebus.entitySerializer.htmlEncode(command) + '</div>',
                '<div class="console-command-eval">' + evaluateAndSerialize(command) + '</div>',
            '</div>'
        ].join('\n'));
    };

    var addStyleToOutput = function (selector) {
        var parts = selector.split('|'),
            $selector, styles, prop;
        try {
            if (parts.length > 1) {
                selector = parts[0].trim();
                prop = parts[1].trim();
            }
            $selector = $(selector);
            if ($selector.length) {
                if (prop) {
                    $output.append([
                        '<div class="console-line">',
                        '<div class="console-command">&gt; ' + rebus.entitySerializer.htmlEncode(selector + ' | ' + prop) + '</div>',
                        '<div class="console-selector-styles">',
                        '<span class="key">' + prop + ':<span>',
                        '<span class="value">' + rebus.entitySerializer.htmlEncode(window.getComputedStyle($selector[0]).getPropertyValue(prop)) + '<span>',
                        '</div>',
                        '</div>'
                    ].join('\n'));
                }
                else {
                    styles = getCss($selector[0]);
                    $output.append([
                        '<div class="console-line">',
                        '<div class="console-command">&gt; ' + rebus.entitySerializer.htmlEncode(selector) + '</div>',
                        '<div class="console-selector-styles">' + rebus.entitySerializer.serialize(styles) + '</div>',
                        '</div>'
                    ].join('\n'));
                }
            }
            else {
                $output.append([
                    '<div class="console-line">',
                    '<div class="console-command">&gt; ' + rebus.entitySerializer.htmlEncode(selector) + '</div>',
                    '<div class="console-selector-styles"><span class="console-error">Not found</span></div>',
                    '</div>'
                ].join('\n'));
            }
        } catch (e) {
            $output.append('<div class="console-error">' + e.message + '</div>');
        }
    };

    var load = function () {
        $.each(data, function (i, item) {
            if (item.command) {
                addCommandToOutput(item.command);
            }
            else if (item.selector) {
                addStyleToOutput(item.selector);
            }
        });
    };

    return {
        init: function () {
            $output = $('#console-output');
            data = sessionStorage.getItem(storeKey);
            data = data ? JSON.parse(data) : [];
            load();
            $('#btn-eval').on('click', function () {
                var command = $('#txt-eval').val();
                if (command) {
                    command = command.trim();
                    if (command.length) {
                        data.push({ command: command });
                        sessionStorage.setItem(storeKey, JSON.stringify(data));
                        addCommandToOutput(command);
                    }
                }
            });
            $('#btn-get-styles').on('click', function () {
                var selector = $('#txt-eval').val();
                if (selector) {
                    selector = selector.trim();
                    if (selector.length) {
                        data.push({ selector: selector });
                        sessionStorage.setItem(storeKey, JSON.stringify(data));
                        addStyleToOutput(selector);
                    }
                }
            });
            //$('#txt-eval').on('keydown', function (e) {
            //    if (e.which === 13 && !e.shiftKey) {
            //        $('#btn-eval').trigger('click');
            //        return false;
            //    }
            //});
            $('.btn-clear-console').on('click', function () {
                $output.empty();
                data = [];
                sessionStorage.setItem(storeKey, JSON.stringify(data));
            });
        }
    };
})(jQuery);
