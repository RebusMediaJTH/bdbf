var rebus = rebus || {};

rebus.features = (function ($) {
    var os, osVersion,
        browser, browserVersion,
        iOS, android, wp, isApp;

    var createVersionParts = function (version) {
        var parts = version.split('.');
        return { major: parseInt(parts[0], 10), minor: parts.length > 1 ? parseInt(parts[1], 10) : 0, build: parts.length > 2 ? parseInt(parts[2], 10) : 0 };
    };

    var getIsSupportedEnvironment = function () {
        // 7, 8.1, 10
        var isValidWindows = function () {
            if (os.indexOf('windows') !== -1) {
                rebus.logger.log('type=sniffer', 'WINDOWS, major, minor, is it valid?', osVersion.major, osVersion.minor, osVersion.major === 7 || osVersion.major >= 10 || (osVersion.major === 8 && osVersion.minor >= 1));
                return osVersion.major === 7 || osVersion.major >= 10 || (osVersion.major === 8 && osVersion.minor >= 1);
            }
            return false;
        };
        // >= El Capitan (10.11.6)
        var isValidMac = function () {
            if (os.indexOf('mac') !== -1) {
                rebus.logger.log('type=sniffer', 'MAC, major, minor, is it valid?', osVersion.major, osVersion.minor, osVersion.major > 10 || (osVersion.major === 10 && (osVersion.minor > 11 || (osVersion.minor === 11 && osVersion.build >= 6))));
                if (osVersion.major > 10) {
                    return true;
                }
                return osVersion.major === 10 && (osVersion.minor > 11 || (osVersion.minor === 11 && osVersion.build >= 6));
            }
            return false;
        };
        // Chrome, Edge, >= IE10
        var isValidBrowser = function () {
            rebus.logger.log('type=sniffer', 'BROWSER, major, minor, is it valid?', browser, osVersion.major, osVersion.minor, (browser.indexOf('chrome') !== -1 || browser.indexOf('edge') !== -1 || (browser.indexOf('ie') !== -1 && browserVersion.major >= 10) || (browser.indexOf('safari') !== -1 && browserVersion.major >= 9)));
            return browser.indexOf('chrome') !== -1 ||
                browser.indexOf('edge') !== -1 ||
                (browser.indexOf('ie') !== -1 && browserVersion.major >= 10) ||
                (browser.indexOf('safari') !== -1 && browserVersion.major >= 9);
        };
        if (wp) {
            rebus.logger.log('type=sniffer', 'Invalid device - windows phone');
            return false;
        }
        if (android) {
            rebus.logger.log('type=sniffer', 'ANDROID, major, minor, is it valid?', osVersion.major, osVersion.minor, osVersion.major > 4 || (osVersion.major === 4 && osVersion.minor >= 4));
            return osVersion.major > 4 || (osVersion.major === 4 && osVersion.minor >= 4);
        }
        if (iOS) {
            rebus.logger.log('type=sniffer', 'IOS, major, is it valid?', osVersion.major, osVersion.major >= 9);
            return osVersion.major >= 9;
        }
        return (isValidWindows() || isValidMac()) && isValidBrowser();
    };

    return {
        init: function () {
            var parser = new UAParser(),
                res = parser.getResult(),
                classes = [];
            os = res.os.name.toLowerCase();
            osVersion = createVersionParts(res.os.version);
            browser = res.browser.name.toLowerCase();
            browserVersion = createVersionParts(res.browser.version);
            iOS = os.indexOf('ios') !== -1;
            android = os.indexOf('android') !== -1;
            wp = os.indexOf('windows phone') !== -1;
            isApp = top !== self;
            //isApp = true; iOS = true;
            //android = true;
            if (browser) {
                classes.push('browser-' + browser.split(' ').join('-'));
                if (browserVersion && browserVersion.major); {
                    classes.push('browser-version-' + browserVersion.major);
                }
            }
            if (iOS) {
                classes.push('iOS');
            }
            else {
                if (isApp) {
                    classes.push('not-iOS');
                }
                if (android) {
                    classes.push('android');
                }
                else if (wp) {
                    classes.push('windows-phone');
                }
            }
            if (isApp) {
                classes.push('isApp');
            }
            else {
                classes.push('isNotApp');
            }
            if (classes.length) {
                $('html').addClass(classes.join(' '));
            }
        },
        iOS: function () { return iOS; },
        android: function () { return android; },
        isApp: function () { return isApp; },
        isSupportedEnvironment: function () { return getIsSupportedEnvironment(); }
    };
})(jQuery);

rebus.progressModal = (function () {

    var ALLOW_EXPAND = false,
        // If true, the course and module progress is based on the number of pages complete; otherwise module progress is based on the number of
        // topics complete and course progress on the number of modules complete.
        BASE_ON_PAGES_COMPLETE = false;

    var appendTitleAndProgress = function (html, level, title, progress, target) {
        html.push('<div class="progress-item ' + level + '">');
        html.push('<div class="row">');
        html.push('<div class="col-sm-6">');
        if (target && ALLOW_EXPAND) {
            html.push('<div class="location-indicator"><img src="images/location-indicator.png" alt="Current location"/></div><div class="title-container"><a class="title" data-toggle="collapse" aria-expanded="false" href="#' + target + '">' + title + '</a></div>');
        }
        else {
            html.push('<div class="location-indicator"><img src="images/location-indicator.png" alt="Current location"/></div><div class="title-container"><span class="title">' + title + '</span></div>');
        }
        html.push('</div>');
        html.push('<div class="col-sm-6">');
        html.push('<div class="progress-modal-bar"><div data-percentage="' + progress + '"><div style="width:' + progress + '%"></div></div></div>');
        html.push('</div>');
        html.push('</div>');
        if (level === 'course') {
            html.push('<div class="progress-item-divider"><div></div></div>');
        }
        html.push('</div>');
    };

    var drawHTML = function (page, modules, returningFromBookmark) {

        var html = [],
            state = rebus.stateHelper.get(),
            courseState = state['c'],
            singleModule = modules.length === 1,
            course = { modules: [], completeModules: 0, totalPages: 0, completePages: 0 },
            progress;

        html.push('<h1 tabindex="-1">My Progress</h1>');

        // First calculate the number of pages completed for topic, module and course levels
        $.each(modules, function (m_idx) {
            var moduleState = state['m' + m_idx],
                topics = this.topics,
                module = { topics: [], title: this.title, idx: m_idx, completeTopics: 0, totalPages: 0, completePages: 0 };
            course.modules.push(module);
            if (courseState[m_idx] === '1') {
                course.completeModules++;
            }
            $.each(topics, function (t_idx) {
                var topicState = state['m' + m_idx + 't' + t_idx],
                    topic = { pages: [], title: this.title, idx: t_idx, completePages: 0 };
                module.topics.push(topic);
                if (moduleState[t_idx] === '1') {
                    module.completeTopics++;
                }
                $.each(topics[t_idx].pages, function (p_idx) {
                    topic.pages.push({ title: this.title, idx: p_idx });
                    module.totalPages++;
                    course.totalPages++;
                    if (topicState[p_idx] === '1') {
                        topic.completePages++;
                        module.completePages++;
                        course.completePages++;
                    }
                });
            });
        });

        // Now we have the calculations, add the HTML

        progress = BASE_ON_PAGES_COMPLETE ?
            Math.round(course.completePages / course.totalPages * 100) :
            singleModule ?
                Math.round(course.modules[0].completeTopics / course.modules[0].topics.length * 100) :
                Math.round(course.completeModules / course.modules.length * 100);
        html.push('<div class="course-container' + (!page.module || singleModule ? ' current-location' : '') + '">');
        appendTitleAndProgress(html, 'course', rebus.config.title, progress);

        $.each(course.modules, function () {
            var m_idx = this.idx,
                expandModuleId = 'progress-m' + m_idx;
            progress = BASE_ON_PAGES_COMPLETE ?
                Math.round(this.completePages / this.totalPages * 100) :
                Math.round(this.completeTopics / this.topics.length * 100);
            html.push('<div class="module-container' + (page.module && page.module.idx === this.idx && !page.topic ? ' current-location' : '') + '">');
            appendTitleAndProgress(html, 'module', this.title, progress, expandModuleId);
            if (singleModule) {
                html.push('<div id="' + expandModuleId + '">');
            }
            else {
                html.push('<div class="collapse" id="' + expandModuleId + '">');
            }
            $.each(this.topics, function () {
                var expandTopicId = expandModuleId + 't' + this.idx;
                html.push('<div class="topic-container' + (page.topic && page.topic.idx === this.idx && page.module.idx === m_idx ? ' current-location' : '') + '">');
                progress = Math.round(this.completePages / this.pages.length * 100);
                appendTitleAndProgress(html, 'topic', this.title, progress);
                html.push('</div>');
            });
            html.push('</div></div>');
        });

        html.push('</div>');
        html.push([
            '<div id="progress-modal-close-btn-container" class="clearfix">',
            '<div>',
            '<span>',
            '<strong>Select</strong> \'Close\' to return to ' + (returningFromBookmark ? 'your last saved location' : 'return to the course'),
            '</span>',
            '<button class="btn btn-red" data-dismiss="modal">Close</button>',
            '</div>',
            '</div>'
        ].join('\n'));
        return html.join('\n');
    };

    return {
        // options: { page: Object, onShown: Function, onClosed: Function, returningFromBookmark: Boolean, $focusOnClosed: jQuery }
        show: function (options) {
            var modules = rebus.navigation.getModules();
            rebus.controls.modal.show({
                'class': 'progress-modal full-width max-width-content' + (modules.length === 1 ? ' single-module' : ''),
                body: drawHTML(options.page, modules, options.returningFromBookmark),
                onShown: function () {
                    if (modules.length > 1 && options.page.module) {
                        $('.module-container').eq(options.page.module.idx).addClass('expanded');
                        $('#progress-m' + options.page.module.idx).collapse('show');
                    }
                    if (options.onShown) {
                        options.onShown();
                    }
                },
                onClosed: options.onClosed,
                focusOnClosed: options.$focusOnClosed
            });
        }
    };
})();

// $.fn.svgInjector
(function () {
    var svg = {};
    $.fn.svgInjector = function () {
        return this.each(function () {
            var $this = $(this),
                id = $this.data('svg');
            $this.replaceWith([
                '<svg class="' + id + '" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="' + svg[id].viewbox + '">',
                    svg[id].html,
                '</svg>'
            ].join('\n'));
        });
    };
    $.fn.svgInjector.init = function (callback) {
        $.get('content/images/icons.svg', function (data) {
            var $svg = $('svg', data),
                nodes = $svg[0].childNodes,
                $node = $('<div />'),
                id, html;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].nodeName === 'g') {
                    id = nodes[i].id;
                    $node.html(nodes[i]);
                    html = $node.html().replace(' xmlns="http://www.w3.org/2000/svg"', '').replace(' id="', ' data-id="');
                    svg[id] = { html: html, viewbox: $(html).data('viewbox') };
                }
            }
            callback();
        });
    };
})();

/*
    <div id="live-feedback" class="sr-only" aria-live="assertive" aria-atomic="true" data-clearafter="5000"></div>

    var $fb = $('#live-feedback').liveFeedback({ clearafter: 5000 });
    $fb.liveFeedback('value', '.....');
    $fb.liveFeedback('value', '.....', { silent: true }); // aria-live is temporarily removed during the update
 */
(function (undefined) {
    'use strict';

    var defaults = {
        clearafter: null
    };

    var setHTML = function ($fb, html, options) {
        var old = $fb.html(),
            data = $fb.data('rebus-live-feedback'),
            sameContent = html === old,
            ariaLive;
        options = options || {};
        window.clearTimeout(data.timeoutId);
        if (options.silent) {
            ariaLive = $fb.attr('aria-live');
            $fb.removeAttr('aria-live');
        }
        if (sameContent) {
            $fb.html('');
        }
        var setContent = function () {
            $fb.html(html);
            if (options.silent) {
                data.timeoutId = window.setTimeout(function () {
                    $fb.attr('aria-live', ariaLive);
                }, 100);
            }
            if (data.settings.clearafter && html !== '') {
                data.timeoutId = window.setTimeout(function () {
                    $fb.empty();
                }, data.settings.clearafter);
            }
        };
        if (sameContent) {
            data.timeoutId = window.setTimeout(setContent, 100);
        }
        else {
            setContent();
        }
    };

    $.fn.liveFeedback = function (options) {
        var collectionSettings;

        if (options === 'value') {
            var value, opts;
            if (arguments.length === 1) {
                return $(this).html();
            }
            value = arguments[1];
            opts = arguments.length > 2 ? arguments[2] : null;
            return this.each(function () {
                setHTML($(this), value, opts);
            });
        } else if (options === 'clearafter') {
            var clearafter;
            if (arguments.length === 1) {
                return $(this).data('rebus-live-feedback').settings.clearafter;
            }
            clearafter = arguments[1];
            return this.each(function () {
                $(this).data('rebus-live-feedback').settings.clearafter = clearafter;
            });
        }

        collectionSettings = $.extend({}, defaults, options);

        return this.each(function () {
            var settings = {},
                $this = $(this);
            $.each(collectionSettings, function (key, val) {
                var value = $this.data(key);
                settings[key] = value !== undefined ? value : val;
            });
            $this.data({
                'rebus-live-feedback': {
                    settings: settings,
                    timeoutId: null
                }
            });
        });
    };
}());

$.fn.accessibleCarousel = function () {
    return this.each(function () {
      var $carousel = $(this),
        $fb = $('<div class="sr-only" aria-live="assertive" aria-atomic="true" data-clearafter="5000"></div>'),
        slideCount = $('.item', $carousel).length;
      $('.item', $carousel).each(function (i) {
        $(this).prepend('<p class="sr-only">Slide ' + (i + 1) + '</p>')
      });
      $carousel.append($fb);
      $fb.liveFeedback();
      $carousel.on('slid.bs.carousel', function (e) {
        $fb.liveFeedback('value', 'Slide ' + ($(e.relatedTarget).index() + 1) + ' of ' + slideCount + '. See content above.');
      });
    });
};

rebus.pageInit = (function ($, undefined) {
    var $body,
        page, state;

    var resourcesModal = (function () {
        var html, onShown, modal;
        var showCore = function () {
            modal = rebus.controls.modal.show({
                'class': 'full-width max-width-content',
                body: html,
                onShown: onShown,
                focusOnClosed: $('#dropdown-mnu-main > a')
            });
        };
        return {
            show: function (callback) {
                onShown = callback;
                if (html) {
                    showCore();
                }
                else {
                    $.get("content/ajax/resources.html", function (data) {
                        html = data;
                        showCore();
                    });
                }
            },
            hide: function (callback) {
                modal.hide(callback);
            },
            reshow: function (callback) {
                modal.show(callback);
            }
        };
    })();

    var PDFLauncher = (function () {
        var onPDFViewerClosed,
            scrollPosition;

        var appPDFViewer = (function () {
            var ZOOM_STEP = 25,
                CSS_UNITS = 96.0 / 72.0,
                PAGE_MARGIN = 5,
                TOOLBAR_HEIGHT = 42,
                ignoreScroll,
                scale, scaleClamped, zoom = 0, windowWidth, windowWidthWithoutRotation,
                pageNumber, pdf, pages,
                $top, $container, $inner, $btnPrev, $btnNext, $pageNumber, $totalPages,
                $btnZoomOut, $btnZoomIn, $lblZoom;

            var asyncTask = (function () {
                var intervalId;
                return {
                    start: function () {
                        $body.addClass('loading-pdf');
                        if (rebus.features.iOS()) {
                            intervalId = window.setInterval(function () {
                                $top.scrollTop(0);
                            }, 1000);
                        }
                    },
                    ended: function () {
                        window.clearInterval(intervalId);
                        $body.removeClass('loading-pdf');
                        if (rebus.features.iOS()) {
                            $top.scrollTop(0);
                        }
                        $body.offset();
                    }
                };
            })();

            var calculateNormalizedScale = function () {
                var normalizedScale = Math.floor(scale * 100),
                    closestStep;
                if (zoom === 0) {
                    return normalizedScale;
                }
                closestStep = Math.floor(normalizedScale / ZOOM_STEP) * ZOOM_STEP;
                if (closestStep === normalizedScale) {
                    return normalizedScale + (zoom * ZOOM_STEP);
                }
                return closestStep + (zoom < 0 ? zoom + 1 : zoom) * ZOOM_STEP;
            };

            var updateZoomLabel = function () {
                $lblZoom.text(zoom === 0 && !scaleClamped && windowWidth === windowWidthWithoutRotation ? 'Fit' : calculateNormalizedScale() + '%');
                $btnZoomOut.prop('disabled', calculateNormalizedScale() <= ZOOM_STEP);
            };

            var onPageChanged = function (number) {
                pageNumber = number;
                //$pageNumber.val(pageNumber);
                $pageNumber.text(pageNumber);
                $btnPrev.prop('disabled', pageNumber === 1);
                $btnNext.prop('disabled', pageNumber === pdf.numPages);
            };

            var scrollToPage = function (number, callback) {
                var $scrollable = rebus.features.iOS() ? $inner : $('body'),
                    resultingScrollTop;
                ignoreScroll = true;
                $scrollable.animate({ scrollTop: pages[number - 1].top }, 400, function () {
                    if (number !== pdf.numPages) {
                        resultingScrollTop = $scrollable.scrollTop();
                        // If the page is less than the height of the device, we need to shift it down a little so that it's possible to scroll and 
                        // load the next page
                        if (resultingScrollTop !== pages[number - 1].top) {
                            $scrollable.scrollTop(resultingScrollTop - 10);
                        }
                    }
                    onPageChanged(number);
                    ignoreScroll = false;
                    if (callback) {
                        callback();
                    }
                });
            };

            var calculatePageNumber = function () {
                var n = 1,
                    containerMid, pos;
                if (rebus.features.iOS()) {
                    var containerHeight = $inner[0].clientHeight;
                    containerMid = containerHeight / 2;
                    for (var i = 0; i < pages.length; i++) {
                        pos = pages[i].$canvas.position().top;
                        if (pos > containerHeight) {
                            break;
                        }
                        else if (pos <= containerMid) {
                            n = i + 1;
                        }
                    }
                }
                else {
                    var scrollPos = $body.scrollTop();
                    containerMid = ($body[0].clientHeight - TOOLBAR_HEIGHT) / 2;
                    for (var i = 0; i < pages.length; i++) {
                        pos = pages[i].$canvas.position().top - TOOLBAR_HEIGHT;
                        if (pos - scrollPos <= containerMid) {
                            n = (i + 1);
                        }
                    }
                }
                if (pageNumber !== n) {
                    onPageChanged(n);
                }
            };

            // CSS using vh units didn't work for some reason; iPhone portrait was perfect but iPhone/iPad landscape was off.
            var setInnerHeight = function () {
                if (rebus.features.iOS()) {
                    $inner.height($(window.top).height() - 46);
                }
            };

            var renderPage = function (number, zooming, callback) {
                var $canvas = $('#app-pdf-canvas-' + number),
                    canvas, context;
                if ($canvas.length) {
                    if (!zooming) {
                        if (callback) {
                            callback(false);
                        }
                        return;
                    }
                }
                else {
                    $canvas = $('<canvas />', { id: 'app-pdf-canvas-' + number, 'class': number === pdf.numPages ? 'last-page' : undefined });
                    $inner.append($canvas);
                }
                canvas = $canvas[0];
                context = canvas.getContext('2d');
                pdf.getPage(number).then(function (page) {
                    var desiredWidth, viewport;
                    if (!scale) {
                        desiredWidth = $(window).width() - 4; // -4 = padding
                        viewport = page.getViewport(1);
                        scale = desiredWidth / viewport.width;
                        if (scale > 1) {
                            scale = 1;
                            scaleClamped = true;
                        }
                        updateZoomLabel();
                    }
                    viewport = page.getViewport(calculateNormalizedScale() / 100);
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    pages[number - 1] = { $canvas: $canvas, height: canvas.height, top: number === 1 ? 0 : pages[number - 2].top + pages[number - 2].height + PAGE_MARGIN };
                    page.render({ canvasContext: context, viewport: viewport }).then(function () {
                        callback(true);
                    });
                });
            };

            var gotoNextPage = function () {
                asyncTask.start();
                renderPage(pageNumber + 1, false, function () {
                    scrollToPage(pageNumber + 1, function () {
                        asyncTask.ended();
                    });
                });
            };

            var load = function (file) {
                var finalize = function () {
                    onPageChanged(1);
                    asyncTask.ended();
                    ignoreScroll = false;
                    setInnerHeight();
                    if (rebus.features.iOS()) {
                        $top.on('scroll.pdf-top-scroll-timer', function () {
                            clearTimeout($.data(this, 'pdf-top-scroll-timer'));
                            $.data(this, 'pdf-top-scroll-timer', setTimeout(function () {
                                $top.scrollTop(0);
                            }, 1000));
                        });
                    }
                    else {
                        $(window).on('scroll.pdf-window-scroll', function () {
                            var body = $('body')[0];
                            if (!ignoreScroll) {
                                if (pageNumber < pdf.numPages && body.clientHeight === body.scrollHeight - body.scrollTop) {
                                    asyncTask.start();
                                    renderPage(pageNumber + 1, false, function () {
                                        asyncTask.ended();
                                    });
                                }
                                else {
                                    calculatePageNumber();
                                }
                            }
                        });
                    }
                    $top.on('resize.app-pdf', function () {
                        clearTimeout($top.data('app-pdf-resize-timer'));
                        $top.data('app-pdf-resize-timer', setTimeout(function () {
                            setInnerHeight();
                            windowWidth = $top.width();
                            updateZoomLabel();
                            calculatePageNumber();
                        }, 250));
                    });
                };
                ignoreScroll = true;
                asyncTask.start();
                pageNumber = 1;
                // 0 = fit to window, CSS_UNITS = full size
                scale = 0;
                scaleClamped = false;
                zoom = 0;
                pages = [];
                $btnPrev.prop('disabled', true);
                $btnNext.prop('disabled', true);
                //$pageNumber.val('');
                $pageNumber.text('');
                $lblZoom.text('');
                PDFJS.getDocument(file).then(function (data) {
                    pdf = data;
                    $totalPages.text('of ' + pdf.numPages);
                    //$pageNumber.attr('max', pdf.numPages);
                    windowWidth = windowWidthWithoutRotation = $top.width();
                    // We start of by loading 2 pages, if available, to ensure that scrolling down to the next page is possible
                    renderPage(1, false, function () {
                        if (pdf.numPages > 1) {
                            renderPage(2, false, finalize);
                        }
                        else {
                            finalize();
                        }
                    });
                });
            };

            return {
                init: function () {
                    $top = $(top);
                    $container = $('#app-pdf');
                    $inner = $('#app-pdf-body-inner');
                    $btnPrev = $('#app-pdf-prev');
                    $btnNext = $('#app-pdf-next');
                    //$pageNumber = $('#app-pdf-pageNumber');
                    $pageNumber = $('#app-pdf-page-number');
                    $totalPages = $('#app-pdf-totalPages');
                    $btnZoomOut = $('.btn-pdf-zoom.out');
                    $btnZoomIn = $('.btn-pdf-zoom.in');
                    $lblZoom = $('#app-pdf-zoom-level');
                    $btnPrev.on('click', function () {
                        scrollToPage(pageNumber - 1);
                    });
                    $btnNext.on('click', function () {
                        gotoNextPage();
                    });
                    //$pageNumber.on('keyup', function (e) {
                    //    var num, i = 1;
                    //    if (e.which === 13) {
                    //        num = parseInt($pageNumber.val());
                    //        if (num > 0 && num <= pdf.numPages) {
                    //            asyncTask.start();
                    //            var renderAsync = function () {
                    //                renderPage(i, false, function () {
                    //                    if (i === num) {
                    //                        scrollToPage(num, function () {
                    //                            asyncTask.ended();
                    //                        });
                    //                    }
                    //                    else {
                    //                        i++;
                    //                        renderAsync();
                    //                    }
                    //                });
                    //            };
                    //            renderAsync();
                    //        }
                    //        else {
                    //            $pageNumber.val(pageNumber);
                    //        }
                    //        return false;
                    //    }
                    //});
                    $('.btn-pdf-zoom').on('click', function () {
                        var i = 1;
                        asyncTask.start();
                        zoom += $(this).hasClass('in') ? 1 : -1;
                        updateZoomLabel();
                        var renderAsync = function () {
                            renderPage(i, true, function () {
                                if (i < pages.length) {
                                    i++;
                                    renderAsync();
                                }
                                else {
                                    calculatePageNumber();
                                    asyncTask.ended();
                                }
                            });
                        };
                        renderAsync();
                    });
                    if (rebus.features.iOS()) {
                        $('#app-pdf-body-inner').on('scroll', function () {
                            if (!ignoreScroll) {
                                if (pageNumber < pdf.numPages && this.clientHeight === this.scrollHeight - this.scrollTop) {
                                    asyncTask.start();
                                    renderPage(pageNumber + 1, false, function () {
                                        asyncTask.ended();
                                    });
                                }
                                else {
                                    calculatePageNumber();
                                }
                            }
                            clearTimeout($.data(this, 'scrollTimer'));
                            $.data(this, 'scrollTimer', setTimeout(function () {
                                $(top).scrollTop(0);
                            }, 1000));
                        });
                    }
                },
                load: load,
                clear: function () {
                    $top.off('scroll.pdf-top-scroll-timer');
                    clearTimeout($top.data('pdf-top-scroll-timer'));
                    $top.off('resize.app-pdf');
                    clearTimeout($top.data('app-pdf-resize-timer'));
                    $(window).off('scroll.pdf-window-scroll');
                    ignoreScroll = true;
                    $inner.empty();
                }
            };
        })();

        var showPDF = function ($a, onClosed) {
            var fileName = $a.attr('href');
            scrollPosition = $(top).scrollTop();
            onPDFViewerClosed = onClosed;
            $('html').removeClass('use-default-pdf-viewer-for-browser use-mozilla-pdf-viewer-for-browser');
            if (rebus.features.isApp()) {
                appPDFViewer.load(fileName);
            }
            else if (rebus.config.useDefaultPDFViewerForBrowser) {
                $('html').addClass('use-default-pdf-viewer-for-browser');
                // IE doesn't allow the dynamic update of the data attribute so we have to add the object element each time
                $('#pdf-viewer-body').append([
                    '<object type="application/pdf" data="' + fileName + '">',
                    'If you are unable to view the file, you can download from <a href="' + fileName + '">here</a> or download <a target="_blank" href="http://get.adobe.com/reader/">Adobe PDF Reader</a> to view the file.',
                    '</object>'
                ].join('\n'));
            }
            else {
                $('html').addClass('use-mozilla-pdf-viewer-for-browser');
                $('#web-pdf iframe').attr('src', 'mozillaPDF/web/viewer.html?file=' + encodeURIComponent("../../" + fileName));
            }
            $('html').addClass('pdf-viewer-in');
            $(top).scrollTop(0);
        };

        return {
            init: function () {
                $body.on('click', '[data-launch-pdf]', function () {
                    var $a = $(this);
                    // If we're coming from the resources modal, we need to close it, show the PDF and reopen when the PDF is closed
                    if ($('#resources-page').length) {
                        resourcesModal.hide(function () {
                            showPDF($a, function () {
                                resourcesModal.reshow(function () {
                                    $a[0].focus();
                                });
                            });
                        });
                    }
                    else {
                        showPDF($a, function () {
                            $a[0].focus();
                        });
                    }
                    return false;
                }).on('click', '[data-dismiss="pdf-viewer"]', function () {
                    $('html').removeClass('pdf-viewer-in');
                    $('#pdf-viewer-body object').remove();
                    if (rebus.features.isApp()) {
                        appPDFViewer.clear();
                    }
                    $(top).scrollTop(scrollPosition);
                    if (onPDFViewerClosed) {
                        onPDFViewerClosed();
                    }
                });
                if (rebus.features.isApp()) {
                    appPDFViewer.init();
                }
            }
        };
    })();

    var scroller = (function () {
        var isElementInView = function ($element, fullyInView) {
            var pageTop = $(window).scrollTop(),
                pageBottom = pageTop + $(window).height(),
                elementTop = $element.offset().top,
                elementBottom = elementTop + $element.height();
                if (fullyInView) {
                    return ((pageTop < elementTop) && (pageBottom > elementBottom));
                }
                return ((elementTop <= pageBottom) && (elementBottom >= pageTop));
        };
        return {
            start: function (markPageAsComplete) {
                var $footer = $('footer'),
                    monitorLockedPanels,
                    $monitorElements = $('[data-detect-when-in-view]');
                if (markPageAsComplete) {
                    monitorLockedPanels = !!$('.locked-panel').length;
                }
                if ($monitorElements.length || markPageAsComplete) {
                    $(window).on('scroll.rebus.monitor', function () {
                        if ($monitorElements.length) {
                            $.each($monitorElements, function () {
                                var $element = $(this);
                                if (!$element.closest('.locked-panel').length && isElementInView($element, true)) {
                                    $element.closest('.row').addClass($element.data('detect-when-in-view') + '-in-view');
                                    $element.removeAttr('data-detect-when-in-view');
                                    $monitorElements = $('[data-detect-when-in-view]');
                                }
                            });
                        }
                        if (monitorLockedPanels) {
                            if ($('.locked-panel').length) {
                                return;
                            }
                            monitorLockedPanels = false;
                        }
                        if (isElementInView($footer)) {
                            $(window).off('scroll.rebus.monitor');
                            rebus.stateHelper.setPageAsComplete(page).save();
                            $('html').addClass('topic-' + page.topic.idx + '-complete');
                        }
                    });    
                }
            }
        };
    })();

    var pageIntro = (function () {
        var $modal;
        return {
            init: function () {
                var $introModal = $('.modal.intro-page'),
                    ignoreIntroModal, readClicked;

                if (!$introModal.length) {
                    return;
                }

                ignoreIntroModal = !$introModal.html().trim().length;

                $body.addClass('read-or-listen-modal-in');

                $modal = $([
                    '<div class="modal read-or-listen" tabindex="-1" role="dialog" data-keyboard="false" data-backdrop="static">',
                    '<div class="modal-dialog" role="document">',
                    '<div class="modal-content">',
                    '<div class="modal-body">',
                    '<p>The next screen includes a <br />brief audio introduction.</p>',
                    '<p class="listen"><strong>Select</strong>',
                    '<button class="btn-select-listen audio-control-simple" data-audio-file="' + $introModal.data('audio-file') + '" data-dismiss="modal" aria-label="Listen">',
                    '<img src="images/btn-read-or-listen.png" alt="" />',
                    '</button>',
                    'to play',
                    '</p>',
                    '<p class="read">',
                    '&nbsp;&nbsp;... or select',
                    '<button class="btn-select-read" data-dismiss="modal" aria-label="Read">',
                    '<img src="images/btn-read-or-listen.png" alt="" />',
                    '</button>',
                    'to read instead',
                    '</p>',
                    '</div>',
                    '</div>',
                    '</div>',
                    '</div>'
                ].join('\n'));

                $body.append($modal);
                $introModal.removeAttr('data-audio-file').attr({ 'data-header': page.title + '|true', 'data-buttons': "OK. Let's go" })
                    .addClass('modal-template').detach().appendTo($body);

                $modal.one('hidden.bs.modal', function () {
                    $body.removeClass('read-or-listen-modal-in');
                    if (readClicked && !ignoreIntroModal) {
                        $introModal.modal();
                    }
                }).one('click', '.btn-select-read', function () {
                    readClicked = true;
                });
            },
            show: function () {
                if ($modal) {
                    $modal.modal();
                }
                var $bannerMessage = $('.banner-message').eq(0);
                if ($bannerMessage.length) {
                    window.setTimeout(function() {
                        $bannerMessage.addClass('flipped');
                    }, 500);
                }
                if (page.topic) {
                    scroller.start(!rebus.stateHelper.isPageComplete(page));
                }
            }
        };
    })();

    /*
        All activities must be decorated with [data-activity="click-btns|multiple-choice-quiz|choose-hotspots|..."]
        If they are mandatory, decorate with [data-mandatory="true"]

        The panels function sorts out the locking of panels at page load time but it's up to each activity to inform the panels function, via
        setActivityAsComplete, when it is complete. The panels function then determines whether the row, containing the activity, is complete and also
        whether the page is complete.
        When an activity is complete, the helper class 'activity-complete' is added to the activity; the same goes for a panel with 'panel-complete'.

        Also inform the panels function when an activity is started by calling: markActivityAsStarted. This simply adds the helper class
        'activity-started' to the activity and 'panel-started' to the row.
    
    */
    var panels = (function (undefined) {
        var $rows;

        return {
            init: function () {
                var lockPanel,
                    lockIsPrimary;

                $rows = $('.horizontal-panels > .row');

                $rows.each(function (i) {
                    var $panel = $(this),
                        storeId = page.storeId + 'r' + i,
                        panelState = state[storeId],
                        panelDefaultState = '',
                        panelRequiresCompletion,
                        panelIsComplete,
                        mandatoryIdx = 0,
                        inner;
                    $panel.find('[data-activity]').each(function (i) {
                        var $activity = $(this);
                        $activity.attr({ 'data-idx': i, 'data-storeid': storeId + 'a' + i });
                        if ($activity.data('mandatory')) {
                            $activity.attr({ 'data-mandatory-idx': mandatoryIdx });
                            if (!panelState) {
                                panelDefaultState += '0';
                            }
                            else if (panelState.charAt(mandatoryIdx) === '1') {
                                $activity.addClass('activity-started activity-done');
                            }
                            panelRequiresCompletion = true;
                            mandatoryIdx++;
                        }
                    });
                    if (panelRequiresCompletion) {
                        if (!panelState) {
                            panelState = panelDefaultState;
                        }
                        else {
                            $panel.addClass('panel-started');
                        }
                        $panel.attr('data-storeid', storeId);
                        rebus.stateHelper.setElementState($panel, panelState);
                        if (rebus.stateHelper.isPanelComplete($panel)) {
                            panelIsComplete = true;
                            $panel.addClass('panel-done');
                        }
                    }
                    $panel.attr({ 'data-idx': i });
                    if (lockPanel) {
                        inner = lockIsPrimary ? '<p>PLEASE complete<br />the above activity<br />before continuing.</p><div aria-hidden="true"></div>' : '';
                        $panel.addClass('locked-panel' + (lockIsPrimary ? ' primary-lock' : '')).append([
                            '<div class="lock-overlay">',
                            inner,
                            '</div>'
                        ].join('\n'));
                        lockIsPrimary = false;
                    }
                    if (panelRequiresCompletion && !panelIsComplete) {
                        lockPanel = true;
                        lockIsPrimary = true;
                    }
                });
            },
            disableFocusInLockedPanels: function () {
                $('.locked-panel').each(function () {
                    rebus.utils.focusHandler.disableFocus($(this));
                });
            },
            setActivityAsComplete: function ($activity, save) {
                var $panel,
                    panelIdx;
                // Update the store and add completion classes
                $activity.addClass('activity-started activity-done');
                if (!$activity.data('mandatory')) {
                    return;
                }
                $panel = $activity.closest('.row[data-storeid]');
                rebus.stateHelper.setElementState($panel, '1', $activity.data('mandatory-idx'));
                if (rebus.stateHelper.isPanelComplete($panel)) {
                    $panel.addClass('panel-started panel-done');
                    // Unlock panels
                    panelIdx = $panel.data('idx');
                    if (panelIdx < $rows.length - 1) {
                        rebus.utils.focusHandler.enableFocus($rows.eq(panelIdx + 1)).removeClass('locked-panel primary-lock');
                        if (panelIdx < $rows.length - 2) {
                            for (var i = panelIdx + 2; i < $rows.length; i++) {
                                var $next = $rows.eq(i);
                                if ($next.hasClass('primary-lock')) {
                                    break;
                                }
                                else {
                                    rebus.utils.focusHandler.enableFocus($next).removeClass('locked-panel primary-lock');
                                }
                            }
                        }
                    }
                }
                if (save) {
                    rebus.stateHelper.save();
                }
            },
            markActivityAsStarted: function ($activity) {
                $activity.addClass('activity-started').closest('.row[data-storeid]').addClass('panel-started');
            }
        };
    })();

    var initHamburgerMenu = function () {
        var closeMenu = function ($btn) {
            var $menu = $btn ? $btn.closest('.dropdown-mnu') : $('.dropdown-mnu [aria-expanded="true"]').closest('.dropdown-mnu');
            $body.off('click.close-dropdown-mnu');
            $menu.find('a.toggle').attr('aria-expanded', 'false').find('.sr-only').text('Open menu');
            $menu.find('.dropdown-mnu-items').removeClass('in');
        };

        $body.on('click', '.dropdown-mnu a.toggle', function (e) {
            var $this = $(this);
            if ($this.attr('aria-expanded') === 'false') {
                $this.attr('aria-expanded', 'true').find('.sr-only').text('Close menu');
                $this.closest('.dropdown-mnu').find('.dropdown-mnu-items').addClass('in');
                $body.on('click.close-dropdown-mnu', function (e) {
                    if (!$(e.target).closest('.dropdown-mnu-items').length) {
                        closeMenu();
                    }
                });
            }
            e.preventDefault();
        }).on('click', '[data-action]', function () {
            var $btn = $(this),
                action = $btn.data('action');
            closeMenu($btn);
            if (action === 'show-resources') {
                resourcesModal.show();
            }
            else if (action === 'show-progress') {
                rebus.progressModal.show({ page: page, $focusOnClosed: $btn.closest('.dropdown-mnu').find('a') });
            }
            else if (action === 'show-help') {
                $.get("content/ajax/help.html", function (data) {
                    rebus.controls.modal.show({
                        'class': 'full-width max-width-content',
                        body: data,
                        focusOnClosed: $('#dropdown-mnu-main > a')
                    });
                });
            }
            else if (action === 'exit') {
                Track.commit(true);
            }
            return false;
        });
    };

    var initVideos = function () {

        var buildTranscriptCarousel = function (carouselId, html) {
            var $html = $(html),
                indicators = [], panels = [];

            if (!$html.hasClass('carousel')) {
                return html;
            }

            $.each($html.find('div'), function (i) {
                if (rebus.config.videosMustBePlayedThrough) {
                    // Non clickable indicators
                    indicators.push('<li ' + (i === 0 ? ' class="active"' : '') + '><div></div></li>');
                }
                else {
                    indicators.push('<li data-target="#' + carouselId + '" data-slide-to="' + i + '"' + (i === 0 ? ' class="active"' : '') + '><div></div></li>');
                }
                panels.push('<div class="item' + (i === 0 ? ' active' : '') + '">\n' + this.outerHTML + '\n</div>');
            });

            return [
                '<div id="' + carouselId + '" class="transcript-carousel carousel slide" data-interval="false">',
                    // '<ol class="carousel-indicators">',
                    //     indicators.join('\n'),
                    // '</ol>',
                    '<div class="carousel-inner" role="listbox">',
                        panels.join('\n'),
                    '</div>',
                    // '<a class="left carousel-control" href="#' + carouselId + '" role="button" data-slide="prev" hidden>',
                    //     '<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>',
                    //     '<span class="sr-only">Previous</span>',
                    // '</a>',
                    // '<a class="right carousel-control" href="#' + carouselId + '" role="button" data-slide="next">',
                    //     '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>',
                    //     '<span class="sr-only">Next</span>',
                    // '</a>',
                    '<div class="carousel-indicators-container" aria-hidden="true">',
                    '<ol class="carousel-indicators">',
                        indicators.join('\n'),
                    '</ol>',
                    '</div>',
                    '<div class="carousel-nav">',
                        '<div>',
                            '<a href="#' + carouselId + '" role="button" data-slide="prev"><div data-svg="icon-arrownav-left"></div><span class="sr-only">Previous</span></a>',
                            '<a href="#' + carouselId + '" role="button" data-slide="next"><div data-svg="icon-arrownav-right"></div><span class="sr-only">Next</span></a>',
                        '</div>',
                    '</div>',
                '</div>'
            ].join('\n');
        };

        $('.video').each(function (videoIdx) {
            var $container = $(this),
                html = $container.html(),
                continueTo = $container.data('continue'),
                btnContinue = '';

            if (continueTo) {
                if (continueTo === 'next') {
                    btnContinue = '<button type="button" role="navigation" data-navigate="next" class="btn btn-red continue">Continue</button>';
                }
                else {
                    btnContinue = '<a class="btn btn-red continue" href="index.html?page=' + continueTo + '&initialised=true">Continue</a>';
                }
            }

            $container.attr('data-video-idx', videoIdx).empty().append([
                // '<div class="video-options" class="clearfix">',
                //     '<span>Check out this short video</span>',
                //     '<div class="break-point">',
                //         '<button class="btn btn-play-video"><span class="sr-only">Toggle video play</span><img src="images/video-player.png" alt="" /></button>',
                //         '<span>Or</span>',
                //         '<button class="btn btn-read-transcript"><span class="sr-only">Read video transcript</span><img src="images/video-player.png" alt="" /></button>',
                //     '</div>',
                //     btnContinue,
                // '</div>',
                '<div class="video-wrapper"></div>'
            ].join('\n')).find('.video-wrapper').append(html).append('<div class="margin-top-sm text-right"><button type="button" class="button button-default btn-read-transcript">Read the transcript</button></div>');
        });

        $('video').on('play', function () {
            rebus.audio.pause();
            rebus.video.pauseAll(this);
        });

        $body.on('click', '.btn-play-video', function () {
            var $container = $(this).closest('.video'),
                video = $container.find('video')[0];
            $container.removeClass('show-video-transcript');
            if (video.paused) {
                rebus.video.play(video);
            } else {
                rebus.video.pause(video);
            }
        }).on('click', '.btn-read-transcript', function () {
            var $btn = $(this),
                $container = $(this).closest('.video'),
                video;
            if ($container.hasClass('show-video-transcript')) {
                $container.removeClass('show-video-transcript');
                return;
            }
            $btn.data('scrollPosition', $(top).scrollTop());
            video = $container.find('video')[0];
            if (!video.paused) {
                rebus.video.pause(video);
            }
            if (!$container.find('.video-transcript').length) {
                $.get("content/transcripts/" + $container.data('transcript') + ".html", function (data) {
                    var carouselId = 'transcript-carousel-' + $container.attr('data-video-idx'),
                        $transcript = $([
                            '<div class="video-transcript">',
                                '<div class="video-transcript-header">',
                                    '<button type="button" class="close" data-dismiss="transcript" aria-label="Close"><span aria-hidden="true">&times;</span></button>',
                                    '<p class="video-transcript-title">Video transcript</p>',
                                '</div>',
                                '<div class="video-transcript-body"></div>',
                                '<div class="video-transcript-footer">',
                                    '<div class="video-transcript-btns">',
                                        // '<a class="mobile-carousel-nav left" href="#' + carouselId + '" role="button" data-slide="prev" hidden>',
                                        //     '<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>',
                                        //     '<span class="sr-only">Previous</span>',
                                        // '</a>',
                                        // '<a class="mobile-carousel-nav right" href="#' + carouselId + '" role="button" data-slide="next">',
                                        //     '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>',
                                        //     '<span class="sr-only">Next</span>',
                                        // '</a>',
                                        '<button type="button" class="non-stacked button button-default" data-dismiss="transcript">Close</button>',
                                        '<button type="button" class="stacked button button-default" ' + (rebus.config.videosMustBePlayedThrough ? 'data-set-activity-complete ' : '') + 'data-dismiss="transcript">Close</button>',
                                    '</div>',
                                '</div>',
                            '</div>'
                        ].join('\n'));
                    $transcript.find('.video-transcript-body').append(buildTranscriptCarousel(carouselId, data));
                    $container.append($transcript).addClass('show-video-transcript');
                    $('[data-svg]', $transcript).svgInjector();
                });
            }
            else {
                $container.addClass('show-video-transcript');
            }
        }).on('click', '[data-dismiss="transcript"]', function () {
            var $container = $(this).closest('.video'),
                $btnRead = $container.find('.btn-read-transcript');
            $container.removeClass('show-video-transcript');
            console.log("SCROLL POS", $(top).scrollTop(), $btnRead.data('scrollPosition'));
            $(top).scrollTop($btnRead.data('scrollPosition'));
            $btnRead[0].focus();
        }).on('slid.bs.carousel', '.video-transcript .carousel', function () {
            if ($('.item:last', this).hasClass('active')) {
                $('a.right', this).attr('hidden', true);
            }
            else {
                $('a.right', this).removeAttr('hidden');
            }
            if ($('.item:first', this).hasClass('active')) {
                $('a.left', this).attr('hidden', true);
            }
            else {
                $('a.left', this).removeAttr('hidden');
            }
        });
    };

    var initRewatchVideoLinks = function () {
        $('.rewatch-video-link').each(function () {
            var $this = $(this),
                $image = $this.find('img').detach().addClass('bg-img');
            $this.append([
                '<button class="rewatch-video-link" type="button" aria-label="Click to rewatch the introductory video" role="navigation" data-navigate="' + $this.data('navigate') + '">',
                '<img class="rewatch-video-link-hover-overlay" src="images/media_btn_up_play.png" alt="" />',
                '</button>',
                '<p aria-hidden="true"><strong>Select</strong> above to rewatch the introductory video</p>'
            ].join('\n')).removeAttr('data-navigate').find('button').prepend($image);
        });
    };

    var initKeyboardNav = function () {
        var keyboardNav,
            $body = $('body');

        $body.on('keydown', function (e) {
            var key = e.keyCode || e.which;
            if (key === 9 && !keyboardNav) {
                $body.addClass('keyboard-nav');
                keyboardNav = true;
            }
        }).on('mousedown touchstart', function (e) {
            if (keyboardNav) {
                $body.removeClass('keyboard-nav');
                keyboardNav = false;
            }
        });
    };

    var initAutoSizeElements = function () {
        var $elements = $('[data-same-size]'),
            breakpoints = { smr: 576, sm: 768, md: 992, lg: 1200 };
        var resize = function () {
            $elements.each(function () {
                var $el1 = $(this),
                    data = $el1.data('same-size').split('|'),
                    breakPoint = data.length > 1 ? breakpoints[data[1].trim()] : null,
                    $el2 = $(data[0].trim()),
                    height1, height2, bottom1, bottom2;
                if (breakPoint && window.innerWidth < breakPoint) {
                    $el1.add($el2).css('height', '');
                }
                else {
                    height1 = $el1.height();
                    height2 = $el2.height();
                    bottom1 = $el1.offset().top + height1;
                    bottom2 = $el2.offset().top + height2;
                    if (bottom1 > bottom2) {
                        $el2.addClass('rebus-auto-sized').height(height2 + (bottom1 - bottom2));
                    }
                    else if (bottom1 < bottom2) {
                        $el1.addClass('rebus-auto-sized').height(height1 + (bottom2 - bottom1));
                    }
                }
            });
        };
        if ($elements.length) {
            $(window).on('resizeStart', function () {
                $('.rebus-auto-sized').removeClass('rebus-auto-sized').css('height', '');
            }).on('resizeEnd', function () {
                resize();
            });
            resize();
        }
    };

    /*
        Builds a full modal, from a bare-bones template, detaches it and appends it to the body

        <div class="modal modal-template">
            Modal contents
        </div>

        data-header="Title:String|Include close button:Boolean"
        data-buttons="Button1~Button2" | "Button1|Class1~Button2|Class2" | "none"
        data-audio-file="String"
        data-focus-on-closed="Selector"

        <div class="modal modal-template" data-audio-file="file.mp3" data-header="Modal header|true" data-buttons="Try Again|btn-try-again~Continue">
            Modal contents
        </div>

        The following attributes are automatically added:

            data-stop-audio-onopened="true" - Stops any audio when the modal is opened
            data-stop-audio-onclosed="true" - Stops any audio when the modal is closed
            data-auto-focus="true" - Focuses on the modal when opened and places focus back on the button, that opened it, when closed.
    */
    var modalTemplates = (function () {
        var $focusOnClosed;

        /*
            options: {
                header: String | { html: String, includeCloseBtn: Boolean },
                buttons: String | [String] | { label: String, classes: String } | [{ label: String, classes: String }]
            }

            data-header="String|Boolean"
            data-buttons="Button1~Button2" | "Button1|Class1~Button2|Class2" | 'none'
        
            If no options are passed, the modal is built with one 'Continue' button.
        */
        var buildFullModal = function ($modal, options) {
            var html = $modal.html(),
                audioId = $modal.data('audio-file'),
                headerHTML,
                buttons, buttonsHTML = [],
                footer = '';

            options = options || {};

            if ($modal.data('buttons')) {
                options.buttons = $modal.data('buttons').split('~');
                if (options.buttons[0] !== 'none') {
                    $.each(options.buttons, function (i, val) {
                        var parts = val.split('|');
                        if (parts.length > 1) {
                            options.buttons[i] = { label: parts[0].trim(), classes: parts[1].trim() };
                        }
                    });
                }
            }

            if ($modal.data('header')) {
                options.header = $modal.data('header').split('|');
                if (options.header.length === 1) {
                    options.header = options.header[0];
                }
                else {
                    options.header = { html: options.header[0], includeCloseBtn: options.header[1].trim() === 'true' };
                }
            }

            buttons = options.buttons || ['Continue'];

            if (!$.isArray(buttons)) {
                buttons = [buttons];
            }

            if (buttons[0] !== 'none') {
                $.each(buttons, function () {
                    var classes = 'btn btn-red',
                        label;
                    if ($.isPlainObject(this)) {
                        label = this.label || 'Continue';
                        if (this.classes) {
                            classes += ' ' + this.classes;
                        }
                    }
                    else {
                        label = this;
                    }
                    buttonsHTML.push('<button type="button" class="' + classes + '" data-dismiss="modal">' + label + '</button>');
                });
            }

            if (options.header) {
                var header,
                    closeBtnHTML;
                if ($.isPlainObject(options.header)) {
                    header = options.header.html;
                    if (options.header.includeCloseBtn) {
                        closeBtnHTML = '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
                    }
                }
                else {
                    header = options.header;
                }
                header = header.trim();
                if (header.indexOf('<') !== '0') {
                    header = '<h1 class="modal-title">' + header + '</h1>';
                }
                headerHTML = [
                    '<div class="modal-header">',
                    closeBtnHTML,
                    header,
                    '</div>'
                ].join('\n');
            }

            if (buttonsHTML.length) {
                footer = '<div class="modal-footer">\n' + buttonsHTML.join('\n') + '\n</div>';
            }

            $modal.addClass('fade')
                .attr({ tabindex: '-1', role: 'dialog', 'data-autofocus': true, 'data-stop-audio-onclosed': true, 'data-stop-audio-onopened': true })
                .removeAttr('data-audio-file').empty().append([
                    '<div class="modal-dialog" role="document">',
                    '<div class="modal-content">',
                    headerHTML,
                    '<div class="modal-body">',
                    (audioId ? '<div class="audio-control" data-audio-file="' + audioId + '"></div>' : null),
                    html,
                    '</div>',
                    footer,
                    '</div>',
                    '</div>'
                ].join('\n'));
        };

        return {
            init: function () {
                $('.modal-template').each(function () {
                    buildFullModal($(this));
                });

                if ($('.modal[data-autofocus="true"]').length) {
                    $('[data-toggle="modal"]').on('click', function () {
                        $focusOnClosed = $(this);
                    });
                    $('.modal').on('shown.bs.modal', function () {
                        var $modal = $(this),
                            $focus;
                        if ($modal.data('stop-audio-onopened')) {
                            rebus.audio.pause();
                        }
                        if ($modal.data('autofocus')) {
                            $focus = $modal.find('[tabindex="-1"]');
                            if (!$focus.length) {
                                $focus = $modal;
                            }
                            $focus[0].focus();
                        }
                    }).on('hidden.bs.modal', function () {
                        var $modal = $(this),
                            focusOnClosed;
                        if ($focusOnClosed && $modal.data('autofocus')) {
                            $focusOnClosed[0].focus();
                        }
                        else {
                            focusOnClosed = $modal.data('focus-on-closed');
                            if (focusOnClosed) {
                                $(focusOnClosed)[0].focus();
                            }
                        }
                        $focusOnClosed = null;
                        if ($modal.data('stop-audio-onclosed')) {
                            rebus.audio.pause();
                        }
                    });
                }
            },
            setFocusOnClosed: function ($element) {
                $focusOnClosed = $element;
            }
        };
    })();

    var audioButtons = (function () {
        var buildAudioControlBtn = function (fileid, transcriptId) {
            var html = [
                '<button type="button" class="audio-btn" aria-label="Toggle audio" data-audio-file="' + fileid + '">',
                    '<img src="images/btn_listen.png" alt="" />',
                '</button>'
            ];
            // if (transcriptId) {
            //     html.push('<div class="margin-top-sm"><button type="button" class="button button-default btn-read-audio-transcript">Read the transcript</button></div>');
            // }
            return html.join('\n');
        };
        return {
            init: function () {
                // Do these first because the intro modal uses a simple control
                $('.audio-control-simple').each(function () {
                    rebus.audio.add($(this).data('audio-file'));
                });
                $('.audio-control').each(function () {
                    var $this = $(this),
                        id = $this.data('audio-file'),
                        transcript = $this.data('transcript');
                    rebus.audio.add(id);
                    $this.removeAttr('data-audio-file').append(buildAudioControlBtn(id, transcript));
                    if (transcript) {
                        $this.after('<div class="margin-top-sm"><button type="button" data-transcript="' + transcript + '" class="button button-default btn-read-audio-transcript">Read the transcript</button></div>');
                    }
                });
                $body.on('click', '[data-audio-file]', function () {
                    rebus.audio.toggle($(this).data('audio-file'));
                }).on('click', '.btn-read-audio-transcript', function () {
                    var $btn = $(this),
                        id = $btn.data('transcript');
                    rebus.audio.pause();
                    $.get("content/transcripts/" + id + ".html", function (data) {
                        rebus.controls.modal.show({
                            class: 'audio-transcript-modal',
                            header: 'Audio transcript', 
                            body: data,
                            footer: '<button type="button" class="button button-default" data-dismiss="modal">Close</button>',
                            focusOnOpened: 'modal',
                            focusOnClosed: $btn
                        });
                    });
                });
            }
        };
    })();

    var initCourseTips = function () {
        $('.course-tip').each(function (i) {
            var $this = $(this),
                classes = (($this.attr('class') || '').replace('course-tip', '') + ' btn-tip').trim();
            $body.append('<div id="course-tip-modal-' + i + '" class="modal modal-template course-tip-modal" data-audio-file="' + $this.data('audio-file') + '">' + $this.html() + '</div>');
            $this.after([
                '<button type="button" class="' + classes + '" aria-label="Helpful Tip" data-toggle="modal" data-target="#course-tip-modal-' + i + '">',
                '<div class="icon"><img src="images/btn-tip.png" alt="" /> /></div>',
                '<img class="icon-select-here" src="images/icon-select-here.png" alt="" /> />',
                '</button>'
            ].join('\n')).remove();
        });
    };

    var initDidYouKnowButtons = function () {
        $('.did-you-know').each(function (i) {
            var $this = $(this),
                classes = (($this.attr('class') || '').replace('did-you-know', '') + ' btn-did-you-know').trim();
            $body.append('<div id="did-you-know-modal-' + i + '" class="modal modal-template did-you-know-modal" data-audio-file="' + $this.data('audio-file') + '">' + $this.html() + '</div>');
            $this.after([
                '<button type="button" class="' + classes + '" aria-label="Did you know?" data-toggle="modal" data-target="#did-you-know-modal-' + i + '">',
                '<div class="icon"><img src="images/btn-did-you-know.png" alt="" /></div>',
                '<img class="icon-select-here" src="images/icon-select-here.png" alt="" />',
                '</button>'
            ].join('\n')).remove();
        });
    };

    var initInfoPanels = function () {
        $('.info-panel').each(function (i) {
            var $panel = $(this),
                $divs = $panel.find('> div'),
                text = $($divs[0]).html();
            $body.append('<div id="info-panel-modal-' + i + '" class="modal modal-template info-panel-modal" data-audio-file="' + $panel.data('audio-file') + '">' + $($divs[1]).html() + '</div>');
            $panel.after([
                '<button type="button" class="clearfix ' + $panel.attr('class') + '" data-toggle="modal" data-target="#info-panel-modal-' + i + '">',
                '<div class="info-panel-icon" aria-hidden="true">',
                '<img src="images/btn-info-panel.png" alt="" />',
                '</div>',
                '<div class="info-panel-text">',
                text,
                '</div>',
                '</button>'
            ].join('\n')).remove();
        });
    };

    var interactiveControls = (function () {

        // All this does at the moment is complete an activity when a button is clicked.
        // Future: Save & Load state
        // Search for .generic-item and set state if clicked and add '.item-done'.
        // If a toggle option is set, toggle the state.
        var initGenericActivities = function () {
            // This logic is doubled up; we already handle [data-set-activity-complete]
            //$body.on('click', '[data-set-activity-complete="true"]', function () {
            //    panels.setActivityAsComplete($(this).closest('[data-activity]'));
            //    rebus.stateHelper.save();
            //});
        };

        /*
            data-mandatory = true | Number

            <ul class="click-btns" data-activity="click-btns" data-mandatory="true">
                <li>
                    <button class="click-btn" type="button"></button>
                    <div class="modal" data-audio-file="...">...</div>
                </li>
            </ul>
        */
        var initClickButtons = function () {
            $('[data-activity="click-btns"]').each(function () {
                var $activity = $(this),
                    details = rebus.stateHelper.getElementDetails($activity),
                    activityId = details.storeId,
                    btnsState = details.state,
                    btnsDefaultState = '',
                    activityStarted;
                $activity.find('.click-btn').each(function (li_idx) {
                    var $btn = $(this),
                        $li = $btn.closest('li').length ? $btn.closest('li') : $btn,
                        $modal = $li.find('.modal'),
                        $popovers,
                        modalId = activityId + '-modal-' + li_idx,
                        feedback = $btn.data('feedback');
                    $li.attr({ 'data-idx': li_idx });
                    if ($modal.length) {
                        $btn.attr({ 'data-toggle': 'modal', 'data-target': '#' + modalId });
                    }
                    $btn.append('<span class="done-indicator sr-only">Visited</span>');
                    if (btnsState) {
                        if (btnsState.charAt(li_idx) === '1') {
                            $li.addClass('item-done');
                            if (feedback) {
                                $(feedback).addClass('done');
                            }
                            activityStarted = true;
                        }
                    }
                    else {
                        btnsDefaultState += '0';
                    }
                    if ($modal.length) {
                        $li.find('.modal').addClass('modal-template click-btns-modal' + ($activity.hasClass('standard') ? ' standard' : ''))
                            .attr('id', modalId).detach().appendTo($body);
                    }
                    else {
                        $popovers = $activity.find('[data-toggle="popover"]');
                        if ($popovers.length) {
                            $activity.find('[data-toggle="popover"]').popover({
                                template: '<div class="popover ' + activityId + '-popover' + ($(this).data('popover-class') ? ' ' + $(this).data('popover-class') : '') + '" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
                            }).on('show.bs.popover', function () {
                                $('.' + activityId + '-popover.in').popover('hide');
                            });
                        }
                    }
                });
                if (activityStarted) {
                    panels.markActivityAsStarted($activity);
                }
                rebus.stateHelper.setElementState($activity, btnsState || btnsDefaultState);
            });

            $body.on('click', '.click-btn', function () {
                var $btn = $(this),
                    $li = $btn.closest('li').length ? $btn.closest('li') : $btn,
                    $activity = $li.closest('[data-activity]'),
                    mandatory = $activity.data('mandatory'),
                    required = mandatory === true ? $activity.find('.click-btn').length : mandatory,
                    feedback = $btn.data('feedback');
                $li.addClass('item-done');
                rebus.stateHelper.setElementState($activity, '1', $li.data('idx'));
                if ($activity.find('.item-done').length >= required) {
                    panels.setActivityAsComplete($activity);
                    if (feedback) {
                        $(feedback).addClass('done');
                    }
                }
                else {
                    panels.markActivityAsStarted($activity);
                }
                rebus.stateHelper.save();
            });
        };

        /*
            Note: This can probably replace chooseHotspots (below) though it's not set up, yet, to show incorrect feedback if anywhere but a hotspot
                  is clicked.
            
            The following example has the activity split over 2 images:

            HTML
            ----

            <div data-activity="click-areas" data-mandatory="true" data-done-indicator="images/icon_tick_green.png" class="show-click-areas animate-click-areas">
                <div id="cac-1" class="click-areas-container">
                    <img class="click-areas-img" src="content/images/..." alt="..." usemap="#box-1-map" />
                    <map name="box-1-map" id="box-1-map">
                        <area alt="Area 1" href="#" shape="poly" coords="..." />
                        <area alt="Area 2" href="#" shape="rect" coords="..." />
                    </map>
                </div>
                <div id="cac-2" class="click-areas-container">
                    <img class="click-areas-img" src="content/images/..." alt="..." usemap="#box-1-map" />
                    <map name="box-1-map" id="box-1-map">
                        <area alt="Area 2.1" href="#" shape="poly" coords="..." />
                    </map>
                </div>
                <div class="modal">...</div>
                <div class="modal">...</div>
                <div class="modal">...</div>
            </div>
        
            CSS (the width and height must be specified for each .click-areas-container)
            ---
            
            #cac-1 { width: 415px; height: 270px; } 
            #cac-2 { width: 416px; height: 272px; }

            Notes
            -----

            > Include a modal for each click area.
              If it's a choose hotspot task where only a final modal is shown, when the task is complete, include just one modal with the class: .complete
            > If it's a click and reveal task, include the classes: .show-click-areas & .animate-click-areas; omit it for a find hotspots task.
            > If [data-done-indicator] is included, done indicator images are automatically added with the class: .done-indicator.item-n
              -n is one based and is relative to the .click-areas-container:
                #cac-1 .done-indicator.item-1
                #cac-1 .done-indicator.item-2
                #cac-2 .done-indicator.item-1 (starts at 1 again)

            > SVG polygons are added for red focus highlights and blue blinking (item not clicked yet) highlights.
              To test & adjust the click areas without them blinking:
                > Remove the class .animate-click-areas
                > Inspect and look for <polygon class="click-area-highlight" />
                > Once happy, copy the data, add commas where there are spaces between the pairs, and copy into the map

            > Add the class: .click-area-once to the activity to prevent multiple clicks
        */
        var initClickAreas = function () {
            var markAreaAsDone = function ($activity, idx) {
                $activity.addClass('item-' + idx + '-done');
                $activity.find('img.done-indicator').eq(idx).removeAttr('hidden');
                $activity.find('.click-area-highlight').eq(idx).attr('hidden', true);
            };
            $('[data-activity="click-areas"]').each(function () {
                var $activity = $(this),
                    doneIndicatorImage = $activity.data('done-indicator'),
                    $doneIndicators = $activity.find('img.done-indicator'),
                    details = rebus.stateHelper.getElementDetails($activity),
                    activityId = details.storeId,
                    areasState = details.state,
                    areasDefaultState = '';

                // Add the highlight & focus polygons and done indicator images
                $activity.find('.click-areas-container').each(function () {
                    var $container = $(this),
                        highlights = [], focuses = [],
                        doneIndicators = [];
                    $container.css('background-image', 'url(' + $container.find('.click-areas-img').attr('src') + ')');
                    $container.find('area').each(function (area_idx) {
                        var $area = $(this),
                            shape = $area.attr('shape'),
                            coords = $area.attr('coords').split(','),
                            points = '', rect;
                        if (shape === 'rect') {
                            rect = 'x="' + coords[0] + '" y="' + coords[1] + '" width="' + (coords[2] - coords[0]) + '" height="' + (coords[3] - coords[1]) + '"';
                            // Rounded corners
                            rect += ' rx="5" ry="5"';
                            highlights.push('<rect class="click-area-highlight" ' + rect + ' />');
                            focuses.push('<rect class="click-area-focus" ' + rect + ' />');
                        }
                        else if (shape === 'poly') {
                            for (var i = 0; i < coords.length - 1; i += 2) {
                                if (i > 0) {
                                    points += ' ';
                                }
                                points += coords[i] + ',' + coords[i + 1];
                            }
                            highlights.push('<polygon class="click-area-highlight" points="' + points + '" />');
                            focuses.push('<polygon class="click-area-focus" points="' + points + '" />');
                        }
                        if (doneIndicatorImage) {
                            doneIndicators.push('<img class="done-indicator item-' + (area_idx + 1) + '" src="' + doneIndicatorImage + '"  alt="" hidden />');
                        }
                    });
                    $container.prepend('<svg xmlns="http://www.w3.org/2000/svg">' + highlights.join('\n') + '\n' + focuses.join('\n') + '</svg>');
                    if (doneIndicators.length) {
                        $container.append(doneIndicators.join('\n'));
                    }
                });

                $doneIndicators.attr('hidden', true);
                $activity.find('.modal').each(function (i) {
                    var $modal = $(this),
                        idSuffix = $modal.hasClass('complete') ? 'complete' : i;
                    $modal.detach().addClass('modal-template click-areas-modal').attr('id', activityId + '-modal-' + idSuffix).appendTo($body);
                });
                $activity.find('area').each(function (i) {
                    var $area = $(this);
                    $area.data('original-alt', $area.attr('alt')).attr('data-idx', i);
                    if (areasState) {
                        if (areasState.charAt(i) === '1') {
                            markAreaAsDone($activity, i);
                        }
                    }
                    else {
                        areasDefaultState += '0';
                    }
                });
                if (areasState && areasState.indexOf('1') !== -1) {
                    panels.markActivityAsStarted($activity);
                }
                rebus.stateHelper.setElementState($activity, areasState || areasDefaultState);
            });

            $body.on('click', '[data-activity="click-areas"] area', function () {
                var $area = $(this),
                    $activity = $area.closest('[data-activity]'),
                    mandatory = $activity.data('mandatory'),
                    required = mandatory === true ? $activity.find('area').length : mandatory,
                    idx = $area.data('idx'),
                    $completeModal;
                if ($activity.hasClass('click-area-once') && $activity.hasClass('item-' + idx + '-done')) {
                    return false;
                }
                $area.attr('alt', $area.data('original-alt') + ' (Visited)');
                markAreaAsDone($activity, idx);
                rebus.stateHelper.setElementState($activity, '1', idx);
                modalTemplates.setFocusOnClosed($area);
                if (rebus.stateHelper.getNoOfElementStateFlagsSet($activity) >= required) {
                    panels.setActivityAsComplete($activity);
                    $completeModal = $('#' + $activity.data('storeid') + '-modal-complete');
                    if ($completeModal.length) {
                        $completeModal.modal('show');
                    }
                }
                else {
                    panels.markActivityAsStarted($activity);
                }
                if (!$completeModal || !$completeModal.length) {
                    $('#' + $activity.data('storeid') + '-modal-' + idx).modal('show');
                }
                rebus.stateHelper.save();
                return false;
            }).on('focus', '[data-activity="click-areas"] area', function () {
                var $area = $(this);
                $area.closest('[data-activity]').find('.click-area-focus').eq($area.data('idx')).addClass('active');
            }).on('blur', '[data-activity="click-areas"] area', function () {
                var $area = $(this);
                $area.closest('[data-activity]').find('.click-area-focus').eq($area.data('idx')).removeClass('active');
            });
        };

        /*
                <div data-activity="match-btns" data-mandatory="true">
                    <ul class="primary-match-btns">
                        <li role="button" class="match-btn"><span class="sr-only">...</span><span class="txt-answer">...</span><img class="done-indicator" src="images/icon_tick_green.png" aria-hidden="true" /></li>
                        <li role="button" class="match-btn"><span class="sr-only">...</span><span class="txt-answer">...</span><img class="done-indicator" src="images/icon_tick_green.png" aria-hidden="true" /></li>
                    </ul>
                    <ul class="secondary-match-btns">
                        <li class="match-btn" role="button" data-required="1">...</li>
                        <li class="match-btn" role="button" data-required="0">...</li>
                    </ul>
                    <div class="modal incorrect">...</div>
                    <div class="modal complete">...</div>
                </div>

                > When a match is made, the class .item-done is added to the primary & secondary button.
        */
        var initMatchBtns = function () {
            $('[data-activity="match-btns"]').each(function () {
                var $activity = $(this),
                    $secondaryBtns = $activity.find('.secondary-match-btns .match-btn'),
                    details = rebus.stateHelper.getElementDetails($activity),
                    activityId = details.storeId,
                    activityState = details.state,
                    defaultState = '';
                $activity.find('.modal').each(function () {
                    var $modal = $(this),
                        id = activityId + '-modal-' + ($modal.hasClass('incorrect') ? 'incorrect' : 'complete');
                    $modal.detach().addClass('modal-template match-btns-modal').attr('id', id).appendTo($body);
                });
                $activity.find('.primary-match-btns .match-btn').each(function (idx) {
                    if (activityState && activityState[idx] === '1') {
                        $(this).addClass('item-done').attr({ 'aria-selected': 'false', tabindex: -1, 'data-idx': idx });
                        $secondaryBtns.filter('[data-required="' + idx + '"]').addClass('item-done').attr({ 'aria-selected': 'false', tabindex: -1 });
                    }
                    else {
                        $(this).attr({ 'aria-selected': 'false', tabindex: 0, 'data-idx': idx });
                        $secondaryBtns.filter('[data-required="' + idx + '"]').attr({ 'aria-selected': 'false', tabindex: -1 });
                    }
                    if (!activityState) {
                        defaultState += '0';
                    }
                });
                rebus.stateHelper.setElementState($activity, activityState || defaultState);
            });

            $body.on('click', '.primary-match-btns .match-btn', function () {
                var $btn = $(this),
                    $activity = $btn.closest('[data-activity]'),
                    $primary = $btn.closest('.primary-match-btns'),
                    selected = $btn.attr('aria-selected') === 'true';
                if (selected) {
                    $primary.find('.match-btn:not(.item-done)').attr('tabindex', 0);
                    $activity.find('.seconday-match-btns .match-btn').attr('tabindex', -1);
                    $btn.attr('aria-selected', 'false');
                }
                else {
                    $primary.find('[aria-selected="true"]').attr('aria-selected', 'false');
                    $btn.attr('aria-selected', 'true');
                    $primary.find('[aria-selected="false"]').attr('tabindex', -1);
                    $activity.find('.secondary-match-btns .match-btn:not(.item-done)').attr('tabindex', 0);
                }
                return false;
            }).on('click', '.secondary-match-btns .match-btn', function () {
                var $btn = $(this),
                    $activity = $btn.closest('[data-activity]'),
                    $primary = $activity.find('.primary-match-btns'),
                    $required = $primary.find('.match-btn').eq($btn.data('required')),
                    $remaining,
                    activityId = rebus.stateHelper.getElementDetails($activity).storeId;
                if ($required.attr('aria-selected') === 'true') {
                    $btn.addClass('item-done');
                    $required.addClass('item-done').attr({ 'aria-selected': 'false', tabindex: -1 });
                    $remaining = $primary.find('.match-btn:not(.item-done)');
                    rebus.stateHelper.setElementState($activity, '1', $required.data('idx'));
                    if ($remaining.length) {
                        $remaining.attr('tabindex', 0)[0].focus();
                    }
                    else {
                        $('#' + activityId + '-modal-complete').modal();
                        panels.setActivityAsComplete($activity);
                    }
                    rebus.stateHelper.save();
                }
                else {
                    modalTemplates.setFocusOnClosed($btn);
                    $('#' + activityId + '-modal-incorrect').modal();
                }
                return false;
            }).on('keydown', '.match-btn[role="button"]', function (e) {
                if (e.which === 13 || e.which === 32) {
                    $(this).trigger('click');
                    return false;
                }
            });
        };

        var initVideos = function () {
            var setActivityAsComplete = function () {
                var $activity = $(this).closest('[data-activity="video"]');
                if ($activity.length) {
                    panels.setActivityAsComplete($activity, true);
                }
            };
            if (rebus.config.videosMustBePlayedThrough) {
                $('video').on('ended', setActivityAsComplete);
                $body.on('slid.bs.carousel', '.video-transcript .carousel', function () {
                    if ($('.item:last', this).hasClass('active')) {
                        setActivityAsComplete.call(this);
                    }
                });
            }
            else {
                $('video').on('play', setActivityAsComplete);
                $body.on('click', '.btn-read-transcript', setActivityAsComplete);
            }
        };

        var initAudios = function () {
            var setActivityAsComplete = function ($activity, id) {
                var $panel;
                $activity = $activity || $('[data-audio-file="' + id + '"]').closest('[data-activity="audio"]');
                if ($activity.length && $activity.data('mandatory')) {
                    $panel = $activity.closest('.row[data-storeid]');
                    if (rebus.stateHelper.getElementDetails($panel).state[$activity.data('mandatory-idx')] !== '1') {
                        panels.setActivityAsComplete($activity, true);
                    }
                }
            };
            if (rebus.config.audioMustBePlayedThrough) {
                $('body').on('audioend', function () {
                    setActivityAsComplete(null, arguments[1].id);
                }).on('click', '.btn-read-audio-transcript', function () {
                    setActivityAsComplete($(this).closest('[data-activity="audio"]'));
                });
            }
            else {
                $('body').on('audioplay', function () {
                    setActivityAsComplete(arguments[1].id);
                }).on('click', '.btn-read-audio-transcript', function () {
                    setActivityAsComplete($(this).closest('[data-activity="audio"]'));
                });
            }
        };

        var initChooseHotspots = function () {

            var reveal = function ($activity) {
                var hotspotState = '';
                $activity.find('.hotspot').each(function () {
                    $(this).addClass('item-done');
                    hotspotState += '1';
                });
                rebus.stateHelper.setElementState($activity, hotspotState);
                panels.setActivityAsComplete($activity);
                rebus.stateHelper.save();
            };

            $('.choose-hotspots').each(function () {
                var $activity = $(this),
                    details = rebus.stateHelper.getElementDetails($activity),
                    activityId = details.storeId,
                    hotspotsState = details.state,
                    hotspotsDefaultState = '',
                    activityStarted;

                $activity.find('.hotspot').each(function (li_idx) {
                    var $li = $(this);
                    $li.attr({ 'data-idx': li_idx }).find('.click-btn').append('<span class="done-indicator sr-only">Visited</span>');
                    if (hotspotsState) {
                        if (hotspotsState.charAt(li_idx) === '1') {
                            $li.addClass('item-done');
                            activityStarted = true;
                        }
                    }
                    else {
                        hotspotsDefaultState += '0';
                    }
                });

                if (activityStarted) {
                    panels.markActivityAsStarted($activity);
                }

                rebus.stateHelper.setElementState($activity, hotspotsState || hotspotsDefaultState);

                $activity.find('.modal').each(function () {
                    var $modal = $(this),
                        modalId = activityId + '-modal-',
                        buttons;
                    if ($modal.hasClass('incorrect')) {
                        modalId += 'incorrect';
                        buttons = "Show me|btn-show-me~I'll try again";
                    }
                    else {
                        modalId += 'correct';
                    }
                    $modal.data('container', $activity).addClass('modal-template choose-hotspots-modal')
                        .attr({ id: modalId, 'data-buttons': buttons }).detach().appendTo($body);
                });
            });

            $body.on('click', '.hotspots', function (e) {
                var $target = $(e.target),
                    $activity = $target.closest('.choose-hotspots'),
                    $btn = $target.closest('.btn-hotspot');
                if ($btn.length) {
                    var $li = $btn.closest('li'),
                        required = $activity.find('.btn-hotspot').length;
                    $li.addClass('item-done');
                    rebus.stateHelper.setElementState($activity, '1', $li.data('idx'));
                    panels.markActivityAsStarted($activity);
                    if ($activity.find('.hotspot.item-done').length === required) {
                        modalTemplates.setFocusOnClosed($btn);
                        $('#' + $activity.data('storeid') + '-modal-correct').modal();
                        panels.setActivityAsComplete($activity);
                    }
                    rebus.stateHelper.save();
                }
                else {
                    $('#' + $activity.data('storeid') + '-modal-incorrect').modal();
                }
                return false;
            }).on('click', '.choose-hotspots .btn-show-me', function () {
                reveal($(this).closest('.choose-hotspots'));
                return false;
            }).on('click', '.choose-hotspots-modal .btn-show-me', function () {
                reveal($(this).closest('.modal').data('container'));
            });
        };

        /*
            <div data-activity="accordion" data-mandatory="true" class="default-accordion-style">
                <div class="accordion-item" role="tablist" aria-multiselectable="true">
	                <a class="accordion-tab">
                        <h3>...</h3>
	                    <span class="plus"></span>
                        <img class="done-indicator" src="images/icon-tick-grey.png" alt="" />
                    </a>
	                <div class="accordion-panel">
	                    ...
	                </div>
                </div>
            </div>
        */
       var initAccordians = function () {
            $('[data-activity="accordion"]').each(function (actIdx) {
                var $activity = $(this),
                    details = rebus.stateHelper.getElementDetails($activity),
                    activityId = details.storeId,
                    btnsState = details.state,
                    btnsDefaultState = '',
                    activityStarted;

                $activity.find('.accordion-item').each(function (aIdx) {
                    var cardid = 'act' + actIdx + '_c' + aIdx,
                        tabid = cardid + '_tab' + aIdx,
                        tabpanelid = cardid + '_tabpanel' + aIdx,
                        $aCard = $(this),
                        $aTab = $('.accordion-tab', $aCard),
                        $aTabPanel = $('.accordion-panel', $aCard);

                    $aCard.attr({
                        id: cardid
                    });

                    $aTab.attr({
                        'id': tabid,
                        'role': 'tab',
                        'data-idx': aIdx,
                        'data-toggle': 'collapse',
                        'data-parent': '#' + cardid,
                        'href': '#' + tabpanelid,
                        'aria-expanded': "false",
                        'aria-controls': tabpanelid
                    }).append('<span class="done-indicator sr-only">Visited</span>').addClass('collapsed');

                    $aTabPanel.attr({
                        'id': tabpanelid,
                        'role': 'tabpanel',
                        'aria-labelledby': tabid
                    }).addClass('collapse');

                    $aTab.append('<span class="done-indicator sr-only">Visited</span>');

                    if (btnsState) {
                        if (btnsState.charAt(aIdx) === '1') {
                            $aTab.addClass('item-done');
                            activityStarted = true;
                        }
                    }
                    else {
                        btnsDefaultState += '0';
                    }
                });

                if (activityStarted) {
                    panels.markActivityAsStarted($activity);
                }

                rebus.stateHelper.setElementState($activity, btnsState || btnsDefaultState);
            });

            $body.on('click', '.accordion-tab', function () {
                var $btn = $(this),
                    $activity = $btn.closest('[data-activity]'),
                    mandatory = $activity.data('mandatory'),
                    required = mandatory === true ? $activity.find('.accordion-tab').length : mandatory,
                    feedback = $btn.data('accordion-panel');
                $btn.addClass('item-done');
                rebus.stateHelper.setElementState($activity, '1', $btn.data('idx'));
                if ($activity.find('.item-done').length >= required) {
                    panels.setActivityAsComplete($activity);
                    if (feedback) {
                        $(feedback).addClass('done');
                    }
                }
                else {
                    panels.markActivityAsStarted($activity);
                }
                rebus.stateHelper.save();
            });
        };

        /*
            [data-show-answer]: Boolean
            [data-type]: 'checkbox' | 'radio'
            [data-answer]: 'any' | 'anyOrNone' - Use instead of individual [data-required] attributes on the items. Can be, used in the future, for more complex requirements
            [data-required-selections]: Number | 'min:Number'. If omitted, at least one selection must be made
            [data-feedback] - used if there is more than 1 incorrect modal
            [data-instant-feedback-mouse] - If present, the submit button is only shown if keyboard input is detected
            [data-submit]: Submit button text; if not present, defaults to 'Check my answer' // override by edit request to change all to submit.

            <form onsubmit="return false;" class="multiple-choice-quiz" data-activity="multiple-choice-quiz" data-type="radio" data-mandatory="true" data-show-answer="true">
                <ul class="multiple-choice-quiz-options">
                    <li>Yes</li>
                    <li data-required="true">No</li>
                </ul>
                <div class="modal correct" data-audio-file="...">...</div>
                <div class="modal incorrect" data-audio-file="...">...</div>
                <div class="modal no-answer" data-audio-file="...">...</div>
            </form>

            If there's more than one incorrect feedback, specify as follows:

                <li data-feedback="incorrect.other">...</li>
                ...
                <div class="modal incorrect other">...</div>

            Inline feedback
            ---------------
            Replace the modal feedbacks with:
                <div class="inline-feedback">...</div>
                <div class="inline-feedback">...</div>
                ...

            > List them in order of the options; one for each.
            > For incorrect feedback, make sure each is unique so that it'll be announced to screen-readers

            Complex content in the label
            ----------------------------

            It's not valid to put something like an image into a Label element and IE will fail to trigger a click if an image is clicked.
            To fix this:
            <li>MyText<img class="append-after triggers-input" src="..." /></li>

            The image will be appended after the label and, since .triggers-input is included, a click will be triggered on the input when the element is clicked.
        */
       var multiChoiceQuiz = (function () {

        var setCheckAnswerBtnState = function ($activity) {
            var requiredSelections = $activity.attr('data-required-selections'),
                selected = $activity.find('input[type="' + $activity.data('type') + '"]:checked').length,
                enable;
            if (requiredSelections === undefined) {
                enable = selected > 0;
            }
            else {
                requiredSelections = requiredSelections.split(':');
                if (requiredSelections.length > 1) {
                    enable = selected >= parseInt(requiredSelections[1], 10);
                }
                else {
                    enable = selected === parseInt(requiredSelections[0], 10);
                }
            }
            $activity.find('.btn-check-multi-choice-answer, .btn-submit-assessment-answer').prop('disabled', !enable);
        };

        var showAnswer = function ($activity) {
            if ($activity.data('show-answer')) {
                $activity.addClass('show-answer');
            }
        };

        var setAsComplete = function ($activity) {
            showAnswer($activity);
            panels.setActivityAsComplete($activity, true);
        };

        var isCorrect = function ($activity) {
            var correct = true,
                globalAnswer = $activity.data('answer');
            if (globalAnswer) {
                if (globalAnswer === 'anyOrNone') {
                    return true;
                }
                if (globalAnswer === 'any') {
                    return !!$activity.find('input[type="' + $activity.data('type') + '"]:checked').length;
                }
            }
            if ($activity.data('type') === 'radio') {
                return !!$('input:checked', $activity).closest('li').data('required');
            }
            $activity.find('.multiple-choice-quiz-options li').each(function () {
                var $this = $(this),
                    checked = $this.find('input').prop('checked'),
                    required = $this.attr('data-required') === 'true';
                if (checked !== required) {
                    correct = false;
                    return false;
                }
            });
            return correct;
        };

        return {
            init: function () {
                var keyboard = true;

                var performSubmit = function ($submit, $activity, announce) {
                    var $checkedOption, correct, //, modalSelector;
                        responses;
                    $activity = $activity || $submit.closest('[data-activity="multiple-choice-quiz"]');
                    responses = $activity.data('responses');
                    $checkedOption = $activity.find('input:checked').closest('li');
                    correct = isCorrect($activity);
                    $activity.attr('data-correct', correct ? 'true' : 'false');
                    // if ($checkedOption.find('.inline-feedback').length) {
                    //     $activity.addClass('show-inline-feedback');
                    // }
                    // else {
                    //     modalSelector = $checkedOption.data('feedback');
                    //     modalTemplates.setFocusOnClosed($submit);
                    //     if (!modalSelector) {
                    //         modalSelector = '#' + $activity.attr('data-storeid') + '-modal-' + (correct ? 'correct' : 'incorrect');
                    //     }
                    //     $(modalSelector).modal();
                    // }
                    //$activity.find('.btn-tried').prop('disabled', correct);
                    $activity.data('$fb').liveFeedback('value', responses[$checkedOption.attr('data-response')], { silent: !announce });
                    if (correct || !$activity.data('mandatory') || $activity.data('mandatory') === 'partial') {
                        setAsComplete($activity);
                    }
                };

                $('[data-activity="multiple-choice-quiz"]').each(function () {
                    var $activity = $(this),
                        $ul = $activity.find('ul.multiple-choice-quiz-options'),
                        //$inlineFeedback,
                        details = rebus.stateHelper.getElementDetails($activity),
                        activityId = details.storeId,
                        optionsState = details.state,
                        optionsDefaultState = '',
                        type = $activity.data('type'),
                        activityStarted;

                    $ul.addClass(type === 'radio' ? 'radio-list' : 'checkbox-list');

                    // $activity.find('.modal').each(function () {
                    //     var $modal = $(this),
                    //         btnText = $modal.hasClass('correct') ? 'Continue' : $modal.hasClass('incorrect') ? 'Continue' : 'OK, thank you. I understand.',
                    //         modalId = activityId + '-' + $modal.attr('class').split(' ').join('-');
                    //     hasFeedback = true;
                    //     if ($modal.hasClass('no-answer')) {
                    //         hasGiveUpModal = true;
                    //     }
                    //     $modal.detach().addClass('modal-template multiple-choice-quiz-modal').attr({ 'id': modalId, 'data-buttons': btnText }).appendTo($body);
                    // });

                    var responses = {};
                    $activity.data('responses', responses);
                    $('.multiple-choice-quiz > [data-response]', $activity).each(function () {
                        var $response = $(this);
                        responses[$response.attr('data-response')] = $response.html();
                        $response.remove();
                    });
                    // if (!hasFeedback) {
                    //     $inlineFeedback = $activity.find('.inline-feedback');
                    //     hasFeedback = !!$inlineFeedback.length;
                    // }

                    //if (hasFeedback) {
                        if (!$('.btn-check-multi-choice-answer', $activity).length) {
                            $ul.after('<div class="text-right"><button type="button" class="button button-default btn-check-multi-choice-answer btn-block-lte-xs" disabled>' + ($activity.data('submit') || 'Check my answer') + '</button></div>');
                        }
                        if ($activity.attr('data-instant-feedback-mouse') !== undefined) {
                            $activity.find('.btn-check-multi-choice-answer').attr('hidden', true);
                        }
                    //}

                    var $response = $([
                        '<div class="response">',
                            '<div>',
                                '<div data-svg="icon-thumb-up"></div>',
                                '<div data-svg="icon-thumb-down"></div>',
                                '<div class="response-text" aria-live="assertive" aria-atomic="false"></div>',
                            '</div>',
                        '</div>'
                    ].join('\n'));
                    if ($activity.data('append-response-to')) {
                        $($activity.data('append-response-to')).append($response);
                    }
                    else {
                        $('.question', $activity).after($response);
                        //////////////////$activity.addClass('contains-response');
                    }
                    $activity.data('$fb', $('.response-text', $response).liveFeedback());

                    $ul.find('li').each(function (optionIdx) {
                        var $li = $(this),
                            $appendAfter = $li.find('.append-after').removeClass('append-after').detach(),
                            appendAfter = $appendAfter.length ? $appendAfter[0].outerHTML : '',
                            label = $li.html(),
                            optionId = activityId + '_o' + optionIdx,
                            response = $li.attr('data-response') || $li.attr('data-required') === 'true' ? 'correct' : 'incorrect',
                            inputHTML;
                        if (type === 'radio') {
                            inputHTML = '<input type="radio" data-idx="' + optionIdx + '" id="' + optionId + '" name="rg_' + activityId + '" />';
                        }
                        else {
                            inputHTML = '<input type="checkbox" data-idx="' + optionIdx + '" id="' + optionId + '" />';
                        }
                        $li.attr({ role: 'presentation', 'data-response': response }).empty().append([
                            inputHTML,
                            '<label for="' + optionId + '">',
                            '<span class="indicator" aria-hidden="true"><div data-svg="icon-' + type + '"></div></span>',
                            '<span class="correct-indicator" aria-hidden="true"><img src="images/icon_tick_green.png" alt="" /></span>',
                            label,
                            '</label>',
                            appendAfter
                        ].join('\n'));
                        // if ($inlineFeedback && $inlineFeedback.length) {
                        //     $inlineFeedback.eq(optionIdx).detach().appendTo($li);
                        // }
                        if (optionsState) {
                            if ((type === 'checkbox' && optionsState.charAt(optionIdx) === '1') || (type === 'radio' && optionIdx + '' === optionsState)) {
                                $li.addClass('checked');
                                $li.find('input').prop('checked', true);
                                setCheckAnswerBtnState($activity);
                                activityStarted = true;
                            }
                        }
                        else if (type === 'checkbox') {
                            optionsDefaultState += '0';
                        }
                        else {
                            optionsDefaultState = '-1';
                        }
                    });
                    if (activityStarted) {
                        panels.markActivityAsStarted($activity);
                        if ($activity.hasClass('activity-done')) {
                            performSubmit(null, $activity);
                            showAnswer($activity);
                        }
                        // if ($inlineFeedback && $inlineFeedback.length) {
                        //     $activity.addClass('show-inline-feedback');
                        // }
                    }
                    rebus.stateHelper.setElementState($activity, optionsState || optionsDefaultState);
                    setCheckAnswerBtnState($activity);
                });

                $('body').on('mousedown touchstart', '.radio-list li', function () {
                    keyboard = false;
                }).on('keydown', '.radio-list li', function () {
                    keyboard = true;
                }).on('focus', '.radio-list input, .checkbox-list input', function () {
                    $(this).closest('li').addClass('focussed-pseudo');
                }).on('blur', '.radio-list input, .checkbox-list input', function () {
                    $(this).closest('li').removeClass('focussed-pseudo');
                }).on('change', '.radio-list input', function (e) {
                    var $input = $(this),
                        $activity = $input.closest('[data-activity="multiple-choice-quiz"]'),
                        $submit = $activity.find('.btn-check-multi-choice-answer'),
                        instantFeedback = !keyboard && $activity.attr('data-instant-feedback-mouse') !== undefined;
                    $activity.removeAttr('data-correct').data('$fb').liveFeedback('value', '');
                    //$activity.removeClass('show-inline-feedback');
                    $input.closest('.radio-list').find('.checked').removeClass('checked');
                    $input.closest('li').addClass('checked');
                    rebus.stateHelper.setElementState($activity, $input.data('idx') + '');
                    panels.markActivityAsStarted($activity);
                    rebus.stateHelper.save();
                    if (instantFeedback) {
                        $submit.attr('hidden', true);
                        $activity.removeClass('submit-visible');
                        performSubmit($submit, $activity, true);
                    }
                    else {
                        $submit.removeAttr('hidden');
                        $activity.addClass('submit-visible');
                    }
                    setTimeout(function () {
                        setCheckAnswerBtnState($activity);
                    }, 100);
                }).on('click', '.checkbox-list input', function () {
                    var $input = $(this),
                        $activity = $input.closest('[data-activity="multiple-choice-quiz"]'),
                        $option = $input.closest('li');
                    $activity.removeAttr('data-correct').data('$fb').liveFeedback('value', '');
                    if ($option.hasClass('checked')) {
                        $option.removeClass('checked');
                    }
                    else {
                        $option.addClass('checked');
                    }
                    rebus.stateHelper.setElementState($activity, $input.is(":checked") ? '1' : '0', $input.data('idx'));
                    panels.markActivityAsStarted($activity);
                    rebus.stateHelper.save();
                    setTimeout(function () {
                        setCheckAnswerBtnState($input.closest('[data-activity="multiple-choice-quiz"]'));
                    }, 100);
                }).on('click', '.btn-check-multi-choice-answer', function () {
                    performSubmit($(this), null, true);
                    return false;
                }).on('click', '.btn-tried', function () {
                    var $btn = $(this),
                        $activity = $btn.closest('[data-activity="multiple-choice-quiz"]');
                    //$btn.prop('disabled', true); We can't disable it because we focus on it after the modal is closed
                    modalTemplates.setFocusOnClosed($btn);
                    $('#' + $activity.attr('data-storeid') + '-modal-no-answer').modal();
                    setAsComplete($activity);
                }).on('click', '.triggers-input', function () {
                    $(this).closest('li').find('input').trigger('click');
                });
            },
            isCorrect: isCorrect,
            //reset: function ($quiz) {
            //    $quiz.find('input:checked').prop('checked', false);
            //    $quiz.find('.checked').removeClass('checked');
            //    return this;
            //},
            rebuildOptions: function ($activity) {
                var details = rebus.stateHelper.getElementDetails($activity),
                    activityId = details.storeId,
                    type = $activity.data('type');

                state[$activity.data('storeid')] = '-1';
                $activity.find('input:checked').prop('checked', false);
                $activity.find('.checked').removeClass('checked');

                $activity.find('ul.multiple-choice-quiz-options li').each(function (optionIdx) {
                    var $li = $(this),
                        label = $li.html(),
                        optionId = activityId + '_o' + optionIdx,
                        inputHTML;
                    if (type === 'radio') {
                        inputHTML = '<input type="radio" data-idx="' + optionIdx + '" id="' + optionId + '" name="rg_' + activityId + '" />';
                    }
                    else {
                        inputHTML = '<input type="checkbox" data-idx="' + optionIdx + '" id="' + optionId + '" />';
                    }
                    $li.addClass('clearfix').attr({ 'role': 'presentation' }).empty().append([
                        inputHTML,
                        '<label for="' + optionId + '">',
                        '<span class="indicator" aria-hidden="true"><img src="images/multichoice.png" alt="" /></span>',
                        '<span class="correct-indicator" aria-hidden="true"><img src="images/icon_tick_red.png" alt="" /></span>',
                        label,
                        '</label>'
                    ].join('\n'));
                });
                return this;
            }
        };
    })();

        return {
            init: function () {
                initGenericActivities();
                initClickButtons();
                initClickAreas();
                initMatchBtns();
                initVideos();
                initAudios();
                initChooseHotspots();
                initAccordians();
                multiChoiceQuiz.init();
                //initSortable();
            },
            multiChoiceQuiz: multiChoiceQuiz
        };
    })();

    var assessment = (function () {
        var $activity, $questionPanels, $activePanel,
            noOfQuestions, details, activityId;

        var activityState = {
            rowAttempt: [],
            started: false,
            init: function (state) {
                this.started = !!state;
                for (var i = 0; i < noOfQuestions; i++) {
                    this.rowAttempt.push(state && state.length > i ? parseInt(state[i], 10) : 1);
                }
            },
            getAttempt: function () {
                var res = 1;
                $.each(this.rowAttempt, function (i, attempt) {
                    res = Math.max(res, attempt);
                });
                return res;
            },
            toString: function () {
                return this.rowAttempt.join('');
            },
            save: function () {
                rebus.stateHelper.setElementState($activity, this.toString());
                rebus.stateHelper.save();
            }
        };

        var getNextQuestionPanel = function () {
            var $panel = $activity.find('.assessment-question-panel:not(.panel-done)');
            return $panel.length ? $panel.eq(0) : null;
        };

        var activatePanel = function ($panel) {
            if ($activePanel) {
                $activePanel.removeClass('active');
            }
            $activePanel = $panel;
            $activePanel.addClass('active');
            // iOS doesn't scroll to the top for each panel
            window.setTimeout(function () {
                $(top).scrollTop(0);
            }, 0);
        };

        var showFinalPanel = function () {
            var correctAmount = 0;
            $('.assessement-total-amount').text(noOfQuestions);
            $questionPanels.each(function () {
                if (interactiveControls.multiChoiceQuiz.isCorrect($(this).find('[data-activity="multiple-choice-quiz"]'))) {
                    correctAmount++;
                }
            });
            if (correctAmount === noOfQuestions) {
                activatePanel($('.assessment-over-correct'));
            }
            else {
                $('.assessement-correct-amount').text(correctAmount);
                activatePanel($('.assessment-over-incorrect.attempt-' + activityState.getAttempt()));
            }
        };

        var questionPanels = (function () {
            var buildQuestionText = function (q) {
                var html = [],
                    paras = $.isArray(q.question) ? q.question : [q.question];
                $.each(paras, function () {
                    html.push('<p>' + this + '</p>');
                });
                return html.join('\n');
            };
            var buildOptions = function (q) {
                var html = [];
                $.each(q.options, function () {
                    html.push('<li' + (this.required ? ' data-required="true"' : '') + '>' + this.text + '</li>');
                });
                return html.join('\n');
            };
            return {
                buildTemplates: function () {
                    var html = [];
                    $.each(window.assessmentQuestions, function (i, questionPool) {
                        html.push(
                            '<div class="row assessment-question-panel">',
                            '<div class="col-sm-12">',
                            '<div class="panel-wrap">',
                            '<h2>Module ' + (page.module.idx + 1) + ' Assessment Questions</h2>',
                            '<div class="clearfix">',
                            '<h3>Q' + (i + 1) + '</h3>',
                            '<div class="assessment-question"></div>',
                            '</div>',
                            '<div class="assessment-ancillary"></div>',
                            '<form onsubmit="return false;" class="multiple-choice-quiz" data-activity="multiple-choice-quiz" data-type="radio" data-mandatory="true">',
                            '<ul class="multiple-choice-quiz-options"></ul>',
                            '<button type="button" class="btn btn-red btn-submit-assessment-answer" disabled>Submit</button>',
                            '</form>',
                            '</div>',
                            '</div>',
                            '</div>'
                        );
                    });
                    $('.assessment-intro').after(html.join('\n'));
                    $questionPanels = $('.assessment-question-panel');
                },
                updateQuestion: function (questionIdx) {
                    var $panel = $questionPanels.eq(questionIdx).removeClass('has-ancillary'),
                        $ancillary = $panel.find('.assessment-ancillary'),
                        q = window.assessmentQuestions[questionIdx][activityState.rowAttempt[questionIdx] - 1];
                    $panel.find('.assessment-question').empty().append(buildQuestionText(q));
                    $panel.find('[data-activity="multiple-choice-quiz"] ul').empty().append(buildOptions(q));
                    $ancillary.empty();
                    if (q.ancillary) {
                        $ancillary.append(q.ancillary);
                        $panel.addClass('has-ancillary');
                    }
                },
                addQuestions: function () {
                    for (var i = 0; i < window.assessmentQuestions.length; i++) {
                        this.updateQuestion(i);
                    }
                }
            };
        })();

        return {
            buildTemplates: function () {
                // The row templates must be added before panels.init() is called so that it can generate ids and lock panels
                $activity = $('[data-activity="assessment"]');
                if ($activity.length) {
                    noOfQuestions = window.assessmentQuestions.length;
                    questionPanels.buildTemplates();
                }
            },
            addQuestions: function () {
                // The questions must be added after panels.init(), so that we have access to the generated ids, and before the multiple choice
                // activity is initialized, so that the list items can be converted to options
                if ($activity.length) {
                    $activity.data('storeid', page.storeId + 'assessment');
                    details = rebus.stateHelper.getElementDetails($activity);
                    activityId = details.storeId;
                    activityState.init(details.state);
                    questionPanels.addQuestions();
                }
            },
            init: function () {
                // Finally, now that the questions are built, we can start
                if (!$activity.length) {
                    return;
                }

                $body.on('click', '.btn-submit-assessment-answer', function () {
                    var $activity = $(this).closest('[data-activity="multiple-choice-quiz"]'),
                        $panel;
                    panels.setActivityAsComplete($activity, true);
                    $panel = getNextQuestionPanel();
                    if ($panel) {
                        activatePanel(getNextQuestionPanel());
                    }
                    else {
                        showFinalPanel();
                    }
                });

                $('#btn-start-assessment').on('click', function () {
                    $('.assessment-intro').removeClass('active');
                    activatePanel(getNextQuestionPanel());
                    activityState.started = true;
                    activityState.save();
                });

                $('.btn-assessment-try-again').on('click', function () {
                    if (activityState.getAttempt() === 3) {
                        rebus.stateHelper.resetModule(page.module.idx);
                        rebus.navigation.gotoCurrentModuleMenu();
                    }
                    else {
                        $questionPanels.each(function (i) {
                            var $panel = $(this),
                                $quiz = $panel.find('[data-activity="multiple-choice-quiz"]');
                            if (!interactiveControls.multiChoiceQuiz.isCorrect($quiz)) {
                                activityState.rowAttempt[i]++;
                                state[$panel.data('storeid')] = '0';
                                $panel.removeClass('panel-done panel-started');
                                questionPanels.updateQuestion(i, true);
                                interactiveControls.multiChoiceQuiz.rebuildOptions($quiz);
                                $quiz.find('.btn-submit-assessment-answer').prop('disabled', true);
                            }
                        });
                        activityState.save();
                        activatePanel(getNextQuestionPanel());
                    }
                    return false;
                });

                if (activityState.started) {
                    var $tmp = getNextQuestionPanel();
                    if ($tmp) {
                        activatePanel($tmp);
                    }
                    else {
                        showFinalPanel();
                    }
                }
                else {
                    $('.assessment-intro').addClass('active');
                }
            }
        };
    })();

    /*
        Unlocks the course with: ctrl + alt + shift + 'U'
        1. Adds the class 'course-unlocked' to the body
        2. Stores 'course-unlocked' = true in sessionStorage
    */
    var courseUnLocker = (function () {
        var unlockCourse = function () {
            $body.addClass('course-unlocked');
        };
        return {
            init: function () {
                if (sessionStorage.getItem('course-unlocked')) {
                    unlockCourse();
                }
                // ctrl + alt + shift + 'U' to unlock the course
                $(document).on('keydown', function (e) {
                    if (e.altKey && e.ctrlKey && e.shiftKey && e.which === 85) {
                        sessionStorage.setItem('course-unlocked', true);
                        unlockCourse();
                    }
                });
            }
        };
    })();

    return {
        init: function () {
            $body = $('body');
            page = rebus.navigation.getPage();
            state = rebus.stateHelper.get();
            console.log('state', state);
            courseUnLocker.init();
            initHamburgerMenu();
            initVideos();
            initRewatchVideoLinks();
            initKeyboardNav();
            initAutoSizeElements();
            initCourseTips();
            initDidYouKnowButtons();
            initInfoPanels();
            assessment.buildTemplates();
            panels.init();
            assessment.addQuestions();
            interactiveControls.init();
            assessment.init();
            pageIntro.init();
            modalTemplates.init();
            audioButtons.init();
            PDFLauncher.init();

            if (rebus.features.isApp()) {
                rebus.appFixes.apply(page);
            }

            $body.on('click', '[data-hide]', function () {
                $($(this).data('hide')).attr('hidden', true);
            }).on('click', '[data-show]', function () {
                $($(this).data('show')).removeAttr('hidden');
            }).on('click', '[data-set-activity-complete]', function () {
                var $this = $(this),
                    activity = $this.data('set-activity-complete'),
                    $activity;
                if (!activity || activity === true) {
                    if (false !== activity) {
                        $activity = $this.closest('[data-activity]');
                    }
                }
                else {
                    $activity = $(activity);
                }
                if ($activity) {
                    panels.setActivityAsComplete($activity, true);
                }
            }).on('click', '[data-mark-page-as-complete]', function () {
                rebus.stateHelper.setPageAsComplete(page).save();
            }).on('click', '[data-mark-course-as-complete]', function () {
                Track.setLessonCompleted();
            }).on('click', '[data-mark-page-as-complete-and-continue]', function () {
                var url = $(this).data('mark-page-as-complete-and-continue');
                rebus.stateHelper.setPageAsComplete(page).save();
                if (url) {
                    rebus.navigation.gotoPage(url);
                }
                else {
                    rebus.navigation.gotoNextPage();
                }
            }).on('click', '[data-exit-course]', function () {
                // Handle this last to make sure any of the above are handled before exiting
                Track.commit(true);
            });

            // Reposition popovers after resize & fixes a bug that causes the trigger button to be clicked twice to reshow a manually hidden popover
            $(window).on('resizeStart', function () {
                $('.popover.in').each(function () {
                    $(this).popover('hide').data('bs.popover').$element.addClass('reshow-after-resize');
                });
            }).on('resizeEnd', function () {
                var $reshow = $('.reshow-after-resize');
                if ($reshow.length) {
                    $reshow.removeClass('reshow-after-resize').popover('show').data("bs.popover").inState.click = true;
                }
            }).on('hidden.bs.popover', function (e) {
                // http://stackoverflow.com/a/34320956/120399
                $(e.target).data("bs.popover").inState.click = false;
            });

            if (window.pageLoaded) {
                window.pageLoaded();
            }

            $('.carousel').accessibleCarousel();
            
            $('[data-svg]').svgInjector();

            if (rebus.screenReaderTest) {
                rebus.screenReaderTest();
            }

            panels.disableFocusInLockedPanels();

            rebus.utils.scrollTop();
            window.setTimeout(function () {
                $body.removeClass('page-loading-mask-in');
                if (rebus.config.includeProgressModal && rebus.navigation.isReturningFromBookmark()) {
                    rebus.progressModal.show({
                        page: page,
                        returningFromBookmark: true,
                        onClosed: function () {
                            $(top).scrollTop(0);
                            window.setTimeout(function () {
                                pageIntro.show();
                            }, 0);
                        }
                    });
                }
                else {
                    pageIntro.show();
                }
            }, 100);
        }
    };
})(jQuery);

rebus.video = (function ($, undefined) {
    return {
        play: function (video) {
            video.play();
        },
        pause: function (video) {
            video.pause();
        },
        // except: Video
        pauseAll: function (except) {
            $('video').each(function () {
                if ((!except || this !== except) && !this.paused) {
                    this.pause();
                }
            });
        }
    };
})(jQuery);

rebus.audio = (function ($) {
    "use strict";
    var audioFiles = {},
        activeAudio;
    var pauseActiveAudio = function (resetTime) {
        if (activeAudio) {
            activeAudio.off('load').off('end');
            $('html').removeClass('audio-buffering');
            if (resetTime) {
                activeAudio.stop();
            }
            else {
                activeAudio.pause();
            }
            activeAudio = null;
        }
    };
    Howler.mobileAutoEnable = true;
    return {
        add: function (id) {
            if (!audioFiles[id]) {
                audioFiles[id] = new Howl({ src: 'content/audio/' + id + '.mp3', html5: rebus.features.iOS() });
            }
        },
        toggle: function (id) {
            var audio = audioFiles[id];
            if (audio.playing()) {
                pauseActiveAudio();
            }
            else if (audio !== activeAudio) {
                // audio !== activeAudio is tested because it may have been clicked but still loading so audio.playing() is false
                rebus.video.pauseAll();
                pauseActiveAudio(true);
                if (audio.state() !== 'loaded') {
                    $('html').addClass('audio-buffering');
                    audio.off('load').on('load', function () {
                        $('html').removeClass('audio-buffering');
                        audio.off('end').on('end', function () {
                            activeAudio = null;
                            $('body').trigger('audioend', { id: id });
                        }).play();
                        $('body').trigger('audioplay', { id: id });
                    });
                }
                else {
                    audio.off('end').on('end', function () {
                        activeAudio = null;
                        $('body').trigger('audioend', { id: id });
                    }).play();
                    $('body').trigger('audioplay', { id: id });
                }
                activeAudio = audio;
            }
        },
        pause: pauseActiveAudio
    };
})(jQuery);

rebus.gui = (function (undefined) {
    var disableable = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTGROUP', 'OPTION', 'FIELDSET'];

    var canBeDisabled = function ($element) {
        return disableable.indexOf($element.prop('nodeName')) >= 0;
    };

    return {
        hide: function ($element) {
            $element.removeAttr('hidden');
        },
        fadeIn: function ($element, options) {
            options = options || {};
            if ($element.length && $element.attr('hidden')) {
                $element.fadeIn(options.speed || 400, function () {
                    $element.removeAttr('hidden');
                    if (options.callback) {
                        options.callback();
                    }
                });
            }
            else if (options.callback) {
                options.callback();
            }
        },
        fadeOut: function ($element, options) {
            options = options || {};
            if ($element.length && !$element.attr('hidden')) {
                $element.fadeOut(options.speed || 400, function () {
                    $element.attr('hidden', 'true');
                    if (options.callback) {
                        options.callback();
                    }
                });
            }
            else if (options.callback) {
                options.callback();
            }
        },
        enable: function ($element) {
            if ($element.length) {
                $element.removeAttr('disabled').removeAttr('aria-disabled');
            }
            return $element;
        },
        disable: function ($element) {
            if ($element.length) {
                if (canBeDisabled($element)) {
                    $element.prop('disabled', true);
                }
                else {
                    $element.attr('aria-disabled', true);
                }
            }
            return $element;
        },
        setEnabledState: function ($element, enabled) {
            if (enabled) {
                return this.enable($element);
            }
            else {
                return this.disable($element);
            }
        }
    };
})();

rebus.controls = (function ($) {
    "use strict";

    var modal = (function () {
        return {
            /*
                options: { 
                    header: String, body: String, footer: String,
                    focusOnOpened: jQuery,
                    focusOnClosed: jQuery,
                    onShown: Function,
                    onClosing: Function ($button),
                    onClosed: Function ($button),
                    appendTo: String
                    class: String
                } 
             */
            show: function (options) {
                var $modal, $closeButton,
                    $focusOnClosed = options.focusOnClosed, $saveFocusOnClosed,
                    onShown = options.onShown,
                    onClosed = options.onClosed,
                    removeOnClosed = true,
                    content = '',
                    //css = rebus.features.isApp ? 'no-fade ' : 'fade ' + (options['class'] || '');
                    css = 'fade ' + (options['class'] || '');
                if (options.header) {
                    content += '<div class="modal-header">\n' + options.header + '</div>\n';
                }
                if (options.body) {
                    content += '<div class="modal-body">\n' + options.body + '</div>\n';
                }
                if (options.footer) {
                    content += '<div class="modal-footer">\n' + options.footer + '</div>\n';
                }
                if (options.bodyClass) {
                    $('body').addClass(options.bodyClass);
                }
                $modal = $([
                    '<div class="modal ' + css.trim() + '" tabindex="-1" role="dialog">',
                    '<div class="modal-dialog" role="document">',
                    '<div class="modal-content">',
                    content,
                    '</div>',
                    '</div>',
                    '</div>'
                ].join('\n'));
                if (options.appendTo) {
                    $(options.appendTo).append($modal);
                }
                else {
                    //$('body > .container').append($modal);
                    $('#main-content').append($modal);
                }
                $modal.on('show.bs.modal', function () {
                    rebus.appFixes.disableExternalLinksIfApp($modal);
                }).on('shown.bs.modal', function () {
                    if (options.focusOnOpened) {
                        if (options.focusOnOpened === 'modal') {
                            $modal[0].focus();
                        }
                        else {
                            options.focusOnOpened[0].focus();
                        }
                    }
                    if (onShown) {
                        onShown();
                    }
                }).on('hide.bs.modal', function () {
                    if (options.onClosing) {
                        options.onClosing($closeButton);
                    }
                }).on('hidden.bs.modal', function () {
                    if (options.bodyClass) {
                        $('body').removeClass(options.bodyClass);
                    }
                    if ($focusOnClosed) {
                        $focusOnClosed[0].focus();
                    }
                    if (onClosed) {
                        onClosed($closeButton);
                    }
                    if (removeOnClosed) {
                        // Ensure the iOS modal fix hidden handler is called before we remove
                        window.setTimeout(function () {
                            $modal.remove();
                        }, 0);
                    }
                }).on('click', '[data-dismiss]', function () {
                    $closeButton = $(this);
                });
                $modal.modal();
                return {
                    hide: function (callback) {
                        removeOnClosed = false;
                        onClosed = callback;
                        $saveFocusOnClosed = $focusOnClosed;
                        $focusOnClosed = null;
                        $modal.modal('hide');
                    },
                    show: function (callback) {
                        removeOnClosed = true;
                        $focusOnClosed = $saveFocusOnClosed;
                        onShown = callback;
                        onClosed = null;
                        $modal.modal('show');
                    }
                };
            }
        };
    })();

    return {
        modal: modal
    };
})(jQuery);

rebus.utils = (function ($, undefined) {

    // resizeStart event
    (function ($) {
        var INTERVAL = 250;
        var poll = function () {
            var $this = $(this),
                data = $this.data('resizeStart');
            if (data.raise) {
                $this.trigger('resizeStart');
                data.raise = false;
            }
            clearTimeout(data.timeoutId);
            data.timeoutId = setTimeout(function () {
                data.raise = true;
            }, INTERVAL);
        };
        $.event.special['resizeStart'] = {
            setup: function () {
                $(this).data('resizeStart', { raise: true }).on("resize", poll);
            },
            teardown: function () {
                var $this = $(this),
                    data = $this.data('resizeStart');
                if (data.timeoutId) {
                    window.clearTimeout(data.timeoutId);
                }
                $this.removeData('resizeStart').off("resize", poll);
            }
        };
        $.fn['resizeStart'] = function (a, b) {
            return arguments.length > 0 ? this.on('resizeStart', null, a, b) : this.trigger('resizeStart');
        };
    })(jQuery);

    var OnSafeActionEnd = function (event, $element, expectedDuration, callback) {
        var target = $element[0],
            complete,
            timeoutId;

        $element.on(event, function (e) {
            if (e.originalEvent.target === target) {
                $element.off(event);
                if (!complete) {
                    complete = true;
                    if (timeoutId) {
                        window.clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    callback();
                }
            }
        });

        timeoutId = window.setTimeout(function () {
            if (!complete) {
                complete = true;
                timeoutId = null;
                $element.off(event);
                callback();
            }
        }, expectedDuration + 500);

        return {
            cancel: function () {
                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                    timeoutId = null;
                }
                $element.off(event);
                complete = true;
            }
        };
    };
    return {
        onTransitionEnd: function ($element, expectedDuration, callback) {
            return OnSafeActionEnd("transitionend webkitTransitionEnd oTransitionEnd", $element, expectedDuration, callback);
        },
        onAnimationEnd: function ($element, expectedDuration, callback) {
            return OnSafeActionEnd("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd", $element, expectedDuration, callback);
        },
        scrollTop: function () {
            // Overkill but who gives a shit?
            if (top !== self) {
                $(top).scrollTop(0).find('html, body, iframe').scrollTop(0);
            }
            $('body, html').scrollTop(0);
        },
        // string.format(s, args). http://stackoverflow.com/a/4896643/120399
        stringf: function (tokenised) {
            var args = arguments;
            return tokenised.replace(/{[0-9]}/g, function (matched) {
                matched = matched.replace(/[{}]/g, "");
                return args[parseInt(matched, 10) + 1];
            });
        },
        extractQueryStringArg: function (name, url) {
            if (!url) url = window.location.href;
            url = url.toLowerCase(); // This is just to avoid case sensitiveness
            name = name.replace(/[\[\]]/g, "\\$&").toLowerCase(); // This is just to avoid case sensitiveness for query parameter name
            var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                results = regex.exec(url);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        },
        /*
            For speed, assumes that focus is always prevented with tabindex="-1", not "-2" or anything similar; otherwise [tabindex^="-"]
            would have to be used.
        */
        focusHandler: (function () {
            var focussable = [
                'a[href]:not([tabindex="-1"])',
                'area[href]:not([tabindex="-1"])',
                'input:not([disabled]):not([tabindex="-1"])',
                'select:not([disabled]):not([tabindex="-1"])',
                'textarea:not([disabled]):not([tabindex="-1"])',
                'button:not([disabled]):not([tabindex="-1"])',
                'iframe:not([tabindex="-1"])',
                '[tabindex]:not([tabindex="-1"])',
                '[contentEditable="true"]:not([tabindex="-1"])'
            ].join(',');
            return {
                disableFocus: function ($container) {
                    var $focussable = $container.find(focussable);
                    $focussable.each(function () {
                        var $this = $(this),
                            tabindex = $this.attr('tabindex');
                        $this.attr('tabindex', '-1').attr('data-saved-tabindex', !tabindex && 0 !== tabindex ? 'none' : tabindex);
                    });
                    return $container;
                },
                enableFocus: function ($container) {
                    $container.find('[data-saved-tabindex]').each(function () {
                        var $this = $(this),
                            tabindex = $this.data('saved-tabindex');
                        if (tabindex === 'none') {
                            $this.removeAttr('tabindex data-saved-tabindex');
                        }
                        else {
                            $this.attr('tabindex', tabindex).removeAttr('data-saved-tabindex');
                        }
                    });
                    return $container;
                }
            };
        })()
    };
})(jQuery);


rebus.admin = (function ($, undefined) {

    /*
        Unlocks the course with: ctrl + alt + shift + 'U'
        1. Adds the class 'course-unlocked' to the body
        2. Stores 'course-unlocked' = true in sessionStorage
    */
    var courseUnLocker = (function () {
        var unlock = function () {
            $('body').addClass('course-unlocked');
        };
        return {
            init: function () {
                if ('1' === sessionStorage.getItem('course-unlocked')) {
                    unlock();
                }
                // ctrl + alt + shift + 'U' to unlock the course
                $(document).on('keydown', function (e) {
                    if (e.altKey && e.ctrlKey && e.shiftKey && e.which === 85) {
                        unlock();
                        sessionStorage.setItem('course-unlocked', '1');
                    }
                });
            },
            unlock: function () {
                unlock();
                sessionStorage.setItem('course-unlocked', '1');
            }
        };
    })();

    var adminPanel = (function () {
        var cookieId = rebus.config.id + '.adminEnabled',
            firstClick = null,
            clickCount = 0;
        var toggleEnabled = function () {
            if ('1' === sessionStorage.getItem(cookieId)) {
                sessionStorage.setItem(cookieId, '0');
                $('body').removeClass('admin-enabled');
            }
            else {
                sessionStorage.setItem(cookieId, '1');
                $('body').addClass('admin-enabled');
            }
        };
        var headerClicked = function (e) {
            var now = new Date(),
                interval;
            if (e.clientY < 60) {
                if (firstClick !== null) {
                    interval = now - firstClick;
                }
                if (interval > 2000) {
                    clickCount = 0;
                }
                clickCount += 1;
                if (clickCount === 1) {
                    firstClick = now;
                }
                else if (clickCount === 10) {
                    toggleEnabled();
                    clickCount = 0;
                }
            }
        };
        return {
            init: function () {
                $('body').on('click', headerClicked);
                if ('1' === sessionStorage.getItem(cookieId)) {
                    $('body').addClass('admin-enabled');
                }
                // ctrl + alt + shift + 'A' to enable the admin menu items
                $(document).on('keydown', function (e) {
                    if (e.altKey && e.ctrlKey && e.shiftKey && e.which === 65) {
                        toggleEnabled();
                    }
                });
            }
        };
    })();

    return {
        init: function () {
            courseUnLocker.init();
            adminPanel.init();
            if ('1' === sessionStorage.getItem(rebus.config.id + '.loggingEnabled')) {
                rebus.logger.init({ namespace: rebus.config.id, types: '*', prefixType: true });
            }
            else {
                rebus.logger.init({ namespace: rebus.config.id, types: rebus.config.debugTypes, prefixType: true });
            }
            rebus.console.init();
            $('body').on('click', '.log a', function () {
                var $expandable = $(this).find('+div');
                if ($expandable.attr('hidden')) {
                    $expandable.removeAttr('hidden')
                }
                else {
                    $expandable.attr('hidden', true);
                }
                return false;
            });
            if (rebus.config.debug) {
                $('body').addClass('debug-enabled');
                $('#btn-reset-course').on('click', function () {
                    Track.activityData.reset();
                    window.location = 'index.html?initialised=true';
                    return false;
                });
            }
        },
        unlockCourse: function () {
            courseUnLocker.unlock();
        },
        showEmergencyLog: function () {
            $('#emergency-log').append(rebus.logger.serializeLog()).addClass('show-log');
            $('article.content').css('min-height', 0);
            $('#page-loading-mask').remove();
        }
    };
})(jQuery);

rebus.appFixes = (function ($, undefined) {
    var $top,
        $body;

    var disableExternalLinks = function ($context) {
        var cleanHref = function (href) {
            return href.replace('https://', '').replace('http://', '').replace('mailto:', '');
        };
        $('[target="_blank"], [href^="mailto:"]', $context).each(function () {
            var $this = $(this),
                text = $this.html().trim(),
                href = $this.attr('href').trim();
            if (!$this.hasClass('disable-link')) {
                if (href === text || cleanHref(href) === cleanHref(text)) {
                    $this.replaceWith('<span class="dummy-link split-overflowed-text">' + text + '</span>');
                }
                else {
                    $this.replaceWith('<span class="dummy-link">' + text + '<br /><span class="split-overflowed-text">' + href + '</span>' + '</span>');
                }
            }
        });
    };

    var fixHeader = function () {
        var $header = $('.navbar-fixed-top'),
            captureScrollStart = true,
            timeoutId;
        $top.on('scroll', function () {
            window.clearTimeout(timeoutId);
            if (captureScrollStart) {
                captureScrollStart = false;
                $header.hide().removeClass('in');
            }
            timeoutId = window.setTimeout(function () {
                $header.css('top', $top.scrollTop() + 'px').show().offset();
                $header.addClass('in');
                captureScrollStart = true;
            }, 200);
        });
    };

    // We need to ensure that the modal doesn't extend further than the end of the body so that the parent's scroll is always
    // Without the fix, depending on where the modal is and how long it is, the modal will sometimes scroll and then get stuck which requires
    // the user to move their finger over to scroll the container
    var fixModals = function () {
        var BUFFER = 200;
        $body.on('show.bs.modal', '.modal', function () {
            var log = rebus.logger.log,
                pos = $top.scrollTop();
            log('type=modal', 'Modal pre-show; scroll position: ', pos);
            $(this).data('scrollposition', pos);
        }).on('shown.bs.modal', '.modal', function (e) {
            var log = rebus.logger.log,
                $this = $(this),
                bodyheight = $body.outerHeight(),
                modalheight = $this.find('.modal-dialog').height(),
                pos = $this.data('scrollposition') || 0,
                requiredBodyHeight = pos + modalheight + BUFFER;
            log('type=modal', 'Pre shown scroll position versus now: ', $this.data('scrollposition'), $top.scrollTop());
            $top.scrollTop(pos);
            window.setTimeout(function () {
                log('type=modal', 'Original body height, Modal height + BUFFER (200) & Scroll position: ', bodyheight, modalheight + BUFFER, pos);
                if (requiredBodyHeight > bodyheight) {
                    log('type=modal', 'Body height too small');
                    $body.height(requiredBodyHeight);
                    log('type=modal', 'Revised body height & (calculated)', requiredBodyHeight, $body.outerHeight());
                }
                $this.css('top', pos + 'px');
            }, 0);
        }).on('hidden.bs.modal', '.modal', function () {
            var log = rebus.logger.log,
                $this = $(this);
            $body.css('height', '');
            log('type=modal', 'Reset body height & return to scoll position', $body.outerHeight());
            $top.scrollTop($this.data('scrollposition'));
            $this.data('scrollposition', '');
        });
    };

    return {
        apply: function (page) {
            disableExternalLinks();
            if (rebus.features.iOS()) {
                $top = $(top);
                $body = $('body');
                fixModals();
                if (!page.hideHeader) {
                    window.setTimeout(function () {
                        fixHeader();
                    }, 0);
                }
            }
        },
        disableExternalLinksIfApp: function ($context) {
            if (rebus.features.isApp()) {
                disableExternalLinks($context);
            }
        }
    };
})(jQuery);
