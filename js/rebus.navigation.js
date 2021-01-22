var rebus = rebus || {};
/*
        Call getElementDetails to return the following object: { storeId: String, state: String }
        The store id is useful for generating unique ids for elements within an activity.

        Call setElementState to set the state or state flag of an element. Pass and index parameter to set a flag:
        
            setElementState($activity, '4'); // Mark the selected radio button as number 5.
            setElementState($activity, '1', 2); mark the 3rd button of a click-btns activity as clicked -or- mark the 3rd checkbox of a multiple-choice-quiz as checked.

            

*/
rebus.stateHelper = (function (undefined) {
    var _internal;
    var internal = function () {
        if (!_internal) {
            _internal = Track.activityData.get();
        }
        return _internal;
    };
    var replaceStringChar = function (str, idx, replacement) {
        return str.substr(0, idx) + replacement + str.substr(idx + replacement.length);
    };
    return {
        get: internal,
        save: function () {
            Track.activityData.save();
            return this;
        },
        resetModule: function (idx) {
            Track.activityData.resetModule(idx);
            return this;
        },
        isPageComplete: function (page) {
            return internal()['m' + page.module.idx + 't' + page.topic.idx][page.idxWithinTopic] === '1';
        },
        isTopicComplete: function (moduleIdx, topicIdx) {
            return internal()['m' + moduleIdx + 't' + topicIdx].indexOf('0') === -1;
        },
        isModuleComplete: function (idx) {
            return internal()['m' + idx].indexOf('0') === -1;
        },
        isCourseComplete: function () {
            return internal()['c'].indexOf('0') === -1;
        },
        areNoPagesCompleteYet: function () {
            var state = internal();
            for (var p in state) {
                if (p.indexOf('m') === 0 && p.indexOf('t') !== -1 && state[p].index('1') !== -1) {
                    return false;
                }
            }
            return true;
        },
        setPageAsComplete: function (page) {
            var id;
            // Only do for pages within a topic
            if (page.topic) {
                id = 'm' + page.module.idx + 't' + page.topic.idx;
                internal()[id] = replaceStringChar(internal()[id], page.idxWithinTopic, '1');
                if (this.isTopicComplete(page.module.idx, page.topic.idx)) {
                    id = 'm' + page.module.idx;
                    internal()[id] = replaceStringChar(internal()[id], page.topic.idx, '1');
                    if (this.isModuleComplete(page.module.idx)) {
                        internal()['c'] = replaceStringChar(internal()['c'], page.module.idx, '1');
                    }
                }
            }
            return this;
        },
        setElementState: function ($element, val, idx) {
            var id = $element.data('storeid'),
                state = idx === undefined || idx === null ? val : replaceStringChar(internal()[id], idx, val);
            internal()[id] = state;
            $element.attr('data-state', state);
            return this;
        },
        isElementStateAllSet: function ($element) {
            return internal()[$element.data('storeid')].indexOf('0') === -1;
        },
        isPanelComplete: function ($panel) {
            var completion = $panel.data('activity-completion');
            if ('any' === completion && internal()[$panel.data('storeid')].indexOf('1') !== -1) {
                return true;
            }
            return this.isElementStateAllSet($panel);
        },
        elementHasAtLeastOneStateSet: function ($element) {
            return internal()[$element.data('storeid')].indexOf('1') !== -1;
        },
        // { storeId: String, state: String }
        getElementDetails: function ($element) {
            var storeId = $element.data('storeid');
            return { storeId: storeId, state: internal()[storeId] };
        },
        getNoOfElementStateFlagsSet: function ($element) {
            var res = 0,
                state = this.getElementDetails($element).state;
            for (var i = 0; i < state.length; i++) {
                if (state[i] !== '0') {
                    res++;
                }
            }
            return res;
        }
    };
})();

/*
    [data-navation]
        String - a relative path; e.g. 'm1/t1/p1', '../m1/t1/p1' (go back), '/m1/t1/p1' (root)
        'next'
        'previous'
        'module-video'
        'current-module-menu'
        'module n' - replace n with the zero based index of the module
        'topic n' - replace n with the zero based index of the topic
*/
rebus.navigation = (function ($, undefined) {
    "use strict";

    var pages = rebus.config.pages,
        page,
        pagesFlat = [],
        pagesHash = { '404': { idx: -1, id: '404', url: '404', title: 'Page not found' }, 'log': { idx: -2, id: 'log', url: 'log', title: 'Log' } },
        // { startPageIdx: Number, videoPageIdx: Number, menuPageIdx: Number }
        modules = [],
        // { startPageIdx: Number, module: Object }
        topics = [],
        returningFromBookmark,
        pageAnchor;

    // relativeToPath: [String] eg. ['m1', 't1']
    // page: String eg. 'p1' or '../p1' (back one) or '/p1' (root)
    var generateIdAndUrl = function (relativeToPath, page, forDataNavigate) {
        var path = relativeToPath.slice(0),
            pageParts = page.split('/');
        $.each(pageParts, function (i, part) {
            if (part === '') {
                path = [];
            }
            else if (part === '..') {
                path = path.slice(0, path.length - 1);
            }
            else {
                path.push(part);
            }
        });
        return {
            id: forDataNavigate ? path.join('_') :
                relativeToPath.length ? relativeToPath.join('_') + '_' + pageParts[pageParts.length - 1] :
                    pageParts[pageParts.length - 1],
            url: path.join('/')
        };
    };

    (function () {
        var page_idx = 0,
            outOfModulePageIdx = 0;

        $.each(pages, function () {
            var flatPage,
                obj, path;
            if (this.type === 'modules') {
                $.each(this.modules, function (m_idx) {
                    var module = this;
                    module.idx = m_idx;
                    module.topics = [];
                    modules.push(module);
                    path = this.folder ? [this.folder] : [];
                    $.each(this.pages, function (m_p_idx) {
                        if (this.type === 'topics') {
                            // Mark the pages as type topic-page, we can then get rid of completable
                            // Also get rid of beyondMenu - i think this just handles hiding the title bar and menu item for menu.
                            $.each(this.topics, function (t_idx) {
                                var topic = this;
                                topic.idx = t_idx;
                                topic.module = module;
                                topics.push(topic);
                                module.topics.push(topic);
                                if (this.folder) {
                                    path.push(this.folder);
                                }
                                $.each(this.pages, function (t_p_idx) {
                                    obj = generateIdAndUrl(path, this.path);
                                    flatPage = $.extend({}, this);
                                    flatPage.id = obj.id;
                                    flatPage.url = obj.url;
                                    flatPage.idx = page_idx;
                                    flatPage.idxWithinModule = m_p_idx;
                                    flatPage.idxWithinTopic = t_p_idx;
                                    flatPage.module = module;
                                    flatPage.topic = topic;
                                    flatPage.storeId = 'm' + module.idx + 't' + topic.idx + 'p' + t_p_idx;
                                    flatPage.location = 'topic';
                                    flatPage.last = t_p_idx == topic.pages.length - 1;
                                    if (t_p_idx === 0) {
                                        topic.startPageIdx = page_idx;
                                    }
                                    pagesFlat.push(flatPage);
                                    pagesHash[flatPage.id] = flatPage;
                                    page_idx++;
                                });
                                if (this.folder) {
                                    path.pop();
                                }
                            });
                        }
                        else {
                            obj = generateIdAndUrl(path, this.path);
                            flatPage = $.extend({}, this);
                            flatPage.id = obj.id;
                            flatPage.url = obj.url;
                            flatPage.idx = page_idx;
                            flatPage.idxWithinModule = m_p_idx;
                            flatPage.module = module;
                            flatPage.storeId = 'm' + module.idx + 'p' + m_p_idx;
                            flatPage.location = 'module';
                            pagesFlat.push(flatPage);
                            pagesHash[flatPage.id] = flatPage;
                            if (m_p_idx === 0) {
                                module.startPageIdx = page_idx;
                            }
                            if (this.type === 'video') {
                                module.videoPageIdx = page_idx;
                            }
                            else if (this.type === 'menu') {
                                module.menuPageIdx = page_idx;
                            }
                            else if (this.type === 'completion') {
                                module.completionPageIdx = page_idx;
                            }
                            page_idx++;
                        }
                    });
                });
            }
            else {
                flatPage = $.extend({}, this);
                flatPage.id = flatPage.path;
                flatPage.url = flatPage.path;
                flatPage.idx = page_idx;
                flatPage.storeId = 'p' + outOfModulePageIdx;
                pagesFlat.push(flatPage);
                pagesHash[flatPage.id] = flatPage;
                page_idx++;
                outOfModulePageIdx++;
            }
        });
    })();
    console.log('pages', pagesFlat);
    var waitUntilImagesAreLoaded = function (data, callback) {
        var $images = $(data).find("img"),
            imageCount = $images.length,
            imageLoadedCount = 0,
            timeoutId;
        if (imageCount > 0) {
            $images.on("load", function () {
                imageLoadedCount++;
                if (imageLoadedCount === imageCount) {
                    if (timeoutId !== null) {
                        window.clearTimeout(timeoutId);
                    }
                    $images.off("load");
                    callback();
                }
            });
            timeoutId = window.setTimeout(function () {
                $images.off("load");
                timeoutId = null;
                callback();
            }, 5000);
        }
        else {
            callback();
        }
    };

    var postProcessPage = function (callback) {
        var $html = $('html'),
            pageId = page.id;

        $html.attr('id', 'page-' + pageId).attr('data-url', page.url);

        if (page.path === 'menu' && rebus.stateHelper.get().showmenu) {
            $('#welcome-page').attr('aria-hidden', true);
            $('#menu-page').removeAttr('aria-hidden');
            $('#slide-pages-container').addClass('menu-in');
            $('html').addClass('menu-in');
        }

        if (rebus.config.includeProgressModal) {
            $html.addClass('progress-modal-enabled');
        }

        if (rebus.config.videosMustBePlayedThrough) {
            $html.addClass('videos-must-be-played-through');
        }

        (function () {
            var moduleComplete,
                previousModuleComplete = true,
                courseComplete = true;
            for (var i = 0; i < modules.length; i++) {
                moduleComplete = rebus.stateHelper.isModuleComplete(i);
                if (moduleComplete) {
                    $html.addClass('module-' + i + '-complete');
                }
                else {
                    courseComplete = false;
                    if (rebus.config.takeModulesInOrder && 'menu' === page.type && !previousModuleComplete && !page.module) {
                        $('.module-mnu-item').eq(i).find('button').prop('disabled', true);
                    }
                }
                previousModuleComplete = moduleComplete;
            }
            // If the modules can be taken in any order, it's not possible to add "markCourseAsComplete: true", in rebus.config, for the last completion page
            if (!rebus.config.takeModulesInOrder && courseComplete) {
                Track.setLessonCompleted();
            }
        })();

        (function () {
            var topicComplete,
                previousTopicComplete = true;
            if (page.module) {
                $html.addClass('module-' + page.module.idx);
                $.each(page.module.topics, function (i) {
                    topicComplete = rebus.stateHelper.isTopicComplete(page.module.idx, i);
                    if (topicComplete) {
                        $html.addClass('topic-' + i + '-complete');
                    }
                    else if (rebus.config.takeTopicsInOrder && 'menu' === page.type && !previousTopicComplete) {
                        $('.topic-mnu-item').eq(i).find('button').prop('disabled', true);
                    }
                    previousTopicComplete = topicComplete;
                });
            }
        })();

        if (page.topic) {
            $html.addClass('in-topic-page topic-' + page.topic.idx);
            if (page.topic.pages.length > 1) {
                $html.addClass('show-topic-page-nav');
                $('.current-page').text(page.idxWithinTopic + 1);
                $('.total-pages').text(page.topic.pages.length);
            }
            var completedTopics = 0;
            $.each(page.module.topics, function (i) {
                //isTopicComplete: function (moduleIdx, topicIdx)
                if (rebus.stateHelper.isTopicComplete(page.module.idx, i)) {
                    completedTopics++;
                }
            });
            if (completedTopics >= page.module.topics.length - 1) {
                $html.addClass('final-topic');
            }
        }

        if (page.location === 'module' || page.location === 'topic') {
            $html.addClass('show-module-menu-item');
        }

        if (page.location === 'topic') {
            $html.addClass('show-topic-menu-item');
        }

        if (page.type) {
            $html.attr('data-type', page.type);
        }

        $('#page-title h1').text(page.topic ? page.topic.title : page.title);

        if (page.hideHeader) {
            $html.addClass('hide-header');
        }
        else if (!page.hideHeaderTitle) {
            $html.addClass('show-header-title');
        }

        if (page.classes) {
            $html.addClass(page.classes);
        }

        // Set location
        if (pageId !== 'log' && pageId !== '404') {
            Track.setData('cmi.core.lesson_location', pageId);
        }

        // Set course as as complete?
        if (page.markCourseAsComplete) {
            Track.setLessonCompleted();
        }

        $.fn.svgInjector.init(callback);
    };

    var loadPage = function (pageId, callback) {
        page = pagesHash[pageId];

        console.log('loadPage', page);

        if (!page) {
            pageId = '404';
            page = pagesHash[pageId];
        }

        $.get('content/pages/' + page.url + '.html', function (data) {
            if (data) {
                $('title').text(page.htmlTitle || page.title);
                $('article.content').append(data);
                if (rebus.config.waitUntilImagesAreLoaded) {
                    waitUntilImagesAreLoaded(data, function () {
                        postProcessPage(callback);
                    });
                }
                else {
                    postProcessPage(callback);
                }
            }
            else {
                // 404
            }
        }).fail(function () {
            rebus.logger.log('type=error', 'Ajax error', pageId);
            rebus.logger.log(arguments);
            if (arguments.length && arguments[0].status + '' === '404') {
                window.location = 'index.html?page=404&initialised=true';
                return;
            }
            else {
                rebus.admin.showEmergencyLog();
            }
        });
    };

    var loadCurrentPage = function (callback) {
        var pageId,
            anchor;
        if (rebus.utils.extractQueryStringArg('initialised') == 'true') {
            pageId = rebus.utils.extractQueryStringArg('page');
            returningFromBookmark = false;
            anchor = rebus.utils.extractQueryStringArg('pa');
        } else {
            pageId = Track.getData('cmi.core.lesson_location');
            returningFromBookmark = !!pageId;
        }
        loadPage(pageId || pagesFlat[0].id, function () {
            callback({ anchor: anchor });
        });
    };

    var showPageNotCompleteModal = function ($focusOnClosed) {
        var $continueBtn = $('[data-mark-page-as-complete-and-continue]'),
            continueBtnText = $continueBtn.length ? $continueBtn.text() : 'Continue';
        rebus.controls.modal.show({
            'class': 'page-not-complete-modal',
            body: [
                '<p tabindex="-1"><strong>Have you viewed all of this screen yet?</strong></p>',
                '<p>If so, scroll to the bottom and select</p>',
                '<p class="btn-red dummy-btn">' + continueBtnText + '</p>',
                '<p>to navigate to the next screen.</p>',
                '<button type="button" class="btn btn-red" data-dismiss="modal">Close</button>'
            ].join('\n'),

            focusOnClosed: $focusOnClosed
        });

    };

    var navigator = (function () {
        var getIdOfPagePath = function (relativeToPage, path) {
            return generateIdAndUrl(relativeToPage.url.split('/').slice(0, -1), path, true).id;
        };
        var gotoPageById = function (id) {
            var nextPage = pagesHash[id];
            if (nextPage.redirectIfTopicComplete && rebus.stateHelper.isTopicComplete(nextPage.module.idx, nextPage.topic.idx)) {
                id = getIdOfPagePath(nextPage, nextPage.redirectIfTopicComplete);
            }
            window.location = 'index.html?page=' + id + '&initialised=true' + (pageAnchor ? '&pa=' + pageAnchor : '');
        };
        var gotoPageByIdx = function (idx) {
            gotoPageById(pagesFlat[idx].id);
        };
        var getNextPageIdx = function () {
            if (page.topic && page.idxWithinTopic === page.topic.pages.length - 1) {
                if (rebus.stateHelper.isModuleComplete(page.module.idx)) {
                    return page.topic.module.completionPageIdx || page.topic.module.menuPageIdx;
                }
                return page.topic.module.menuPageIdx;
            }
            return page.idx + 1;
        };
        var getPageIdxFromUrl = function (url) {
            if (url === 'next') {
                return getNextPageIdx();
            }
            if (url === 'previous') {
                return page.topic && page.idxWithinTopic === 0 ? page.topic.module.menuPageIdx : page.idx - 1;
            }
            if (url === 'module-video') {
                return page.module.videoPageIdx;
            }
            if (url === 'current-module-menu') {
                return page.module.menuPageIdx;
            }
            if (url.indexOf('module') === 0) {
                return modules[parseInt(url.split(' ')[1], 10)].startPageIdx;
            }
            if (url.indexOf('topic') === 0) {
                return page.module.topics[parseInt(url.split(' ')[1], 10)].startPageIdx;
            }
            return null;
        };
        var getPageIdFromUrl = function (url) {
            var idx = getPageIdxFromUrl(url);
            if (idx !== null) {
                return pagesFlat[idx].id;
            }
            var parts = url.split(' ');
            url = parts[0];
            if (parts.length > 1) {
                pageAnchor = parts[1];
            }
            return getIdOfPagePath(page, url);
        };
        return {
            addHandlers: function () {
                $('body').on('click', '[data-navigate]', function () {
                    var url = $(this).data('navigate'),
                        id;
                    if (url === 'next') {
                        if (page.topic && rebus.config.takePagesInOrder && !rebus.stateHelper.isPageComplete(page)) {
                            showPageNotCompleteModal($(this));
                            return false;
                        }
                    }
                    gotoPageById(getPageIdFromUrl(url));
                    return false;
                });
            },
            gotoPage: function (url) {
                gotoPageById(getPageIdFromUrl(url));
            },
            gotoNextPage: function () {
                gotoPageByIdx(getNextPageIdx());
            },
            gotoCurrentModuleMenu: function () {
                gotoPageByIdx(page.module.menuPageIdx);
            }
        };
    })();

    return {
        addHandlers: function () {
            navigator.addHandlers();
            return this;
        },
        loadCurrentPage: loadCurrentPage,
        isReturningFromBookmark: function () {
            return returningFromBookmark;
        },
        gotoPage: function (url) {
            navigator.gotoPage(url);
        },
        gotoNextPage: function () {
            navigator.gotoNextPage();
        },
        gotoCurrentModuleMenu: function () {
            navigator.gotoCurrentModuleMenu();
        },
        getPage: function () {
            return page;
        },
        getPageById: function (id) {
            return pagesHash[id];
        },
        getPages: function () {
            return pagesFlat;
        },
        getModules: function () {
            return modules;
        }
    };
})(jQuery);