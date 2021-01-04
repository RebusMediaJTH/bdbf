var rebus = rebus || {};
rebus._private = rebus._private || {};

/*
    activityData example:
    {
        student:    'Jules',
        c:          '10000'     1st module, of 5, in the course complete
        m0:         '1010'      1st and 3rd topic, of 4 topics, of the 1st module complete
        m0t0:       '1000'      1st page, of 4 pages, of the 1st topic in the 1st module complete
        m0t0p0r0:   '10',       Row 0, Activity 0 is complete & Activity 1 is incomplete. (Note, at present, rows only contain 1 activity)
        m0t0p0r0a0: '1100',     Row 0, Activity 0 is a checkbox activity; the first 2 checkboxes are checked
        m0t0p0r1:   '0'         Row 1, Activity 0 is incomplete
        m0t0p0r1a0: '11110'     Row 1, Activity 0 is a click button activity; 4 of the 5 buttons have been clicked
        m0t0p0r2:   '1'         Row 2, Activity 0 is complete
        m0t0p0r2a0: '3'         Row 2, Activity 0 is a radio button activity; the selected index is 3
    }
*/
var Track = (function () {
    "use strict";

    var COMPLETE_VERB = 'completed',
        log = rebus.logger.log,
        api,
        completed,
        courseCommitted;

    var courseTimer = (function () {
        var getLaunchTime = function () {
            var time = sessionStorage.getItem(rebus.config.id + '.launchtime');
            if (time) {
                return JSON.parse(time);
            }
            time = (new Date()).getTime();
            sessionStorage.setItem(rebus.config.id + '.launchtime', JSON.stringify(time));
            return time;
        };
        return {
            setLaunchTimeIfNotSet: function () {
                getLaunchTime();
            },
            getElapsedTime: function () {
                var curr = new Date().getTime();
                var elapse = curr - getLaunchTime();
                var hms = '';
                var dtm = new Date();
                dtm.setTime(elapse);
                var h = '000' + Math.floor(elapse / 3600000);
                var m = '0' + dtm.getMinutes();
                var s = '0' + dtm.getSeconds();
                var cs = '0' + Math.round(dtm.getMilliseconds() / 10);
                hms += h.substr(h.length - 4) + ':' + m.substr(m.length - 2) + ':';
                hms += s.substr(s.length - 2) + '.' + cs.substr(cs.length - 2);
                return hms;
            }
        };
    })();

    var handleUnexpectedClose = function () {
        var attachTo = window;
        var handler = function () {
            if (!courseCommitted) {
                rebus.logger.log('type=lms', 'EXIT; COMMIT REQUIRED');
                Track.commit();
            }
            else {
                rebus.logger.log('type=lms', 'EXIT; no action required');
            }
        };
        if (window === window.parent) {
            // When testing, where there is no parent window, a commit will be performed on every page change
            $(window).on('unload', handler);
        }
        else {
            do {
                attachTo = attachTo.parent;
                $(attachTo).on('unload', handler);
            } while (attachTo !== attachTo.parent);
        }
    };

    return {
        // 1. Find the SCORM API
        // 2. Initialise the SCORM API
        // 3. Update the lesson_status from "not attempted" to "incomplete"
        init: function () {
            var status;
            api = rebus.config.useLMS ? rebus._private.lms : rebus._private.local;
            if (!api.init()) {
                return false;
            }
            courseTimer.setLaunchTimeIfNotSet();
            status = '' + this.getData('cmi.core.lesson_status');
            // if the status is not attempted, update to incomplete
            if (status === 'not attempted') {
                if (!this.setData('cmi.core.lesson_status', 'incomplete')) {
                    return false;
                }
            }
            else {
                completed = status === this.COMPLETED_VERB;
            }

            // Guard against the user pressing the app back button before saving
            handleUnexpectedClose();

            // all good
            return true;
        },
        debug: function (msg) {
            api.debug(msg);
        },
        commit: function (close) {
            if (this.setData('cmi.core.session_time', courseTimer.getElapsedTime())) {
                courseCommitted = true;
                return api.commit(close);
            }
            return false;
        },
        setData: function (cmi, data) {
            var res = api.setData(cmi, data);
            log(function () {
                var parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) { }
                return ['type=lms', 'setData', cmi, parsed, res];
            });
            return res;
        },
        getData: function (cmi) {
            var data = api.getData(cmi);
            log(function () {
                var parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) { }
                return ['type=lms', 'getData', cmi, parsed];
            });
            return data;
        },
        // Don't refer to this; use rebus.stateHelper 
        activityData: (function () {
            var data;
            var merge = function (state) {
                var courseState = '';
                $.each(rebus.navigation.getModules(), function (m_idx) {
                    var moduleState = '';
                    $.each(this.topics, function (t_idx) {
                        var topicState = '';
                        $.each(this.pages, function (p_idx) {
                            var id = 'm' + m_idx + 't' + t_idx,
                                s = state[id];
                            if (s && s.length >= p_idx) {
                                topicState += s[p_idx];
                            }
                            else {
                                topicState += '0';
                            }
                        });
                        state['m' + m_idx + 't' + t_idx] = topicState;
                        moduleState += topicState.indexOf('0') === -1 ? '1' : '0';
                    });
                    state['m' + m_idx] = moduleState;
                    courseState += moduleState.indexOf('0') === -1 ? '1' : '0';
                });
                state['c'] = courseState;
                return state;
            };
            return {
                get: function () {
                    if (data) {
                        return data;
                    }
                    data = Track.getData('cmi.suspend_data');
                    if (data) {
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            log('type=error', 'Failed to deserialize cmi.suspend_data', '' + data);
                            log('type=error', 'Error details', e);
                            log('type=error', 'cmi.suspend_data will be set to an empty object');
                            data = {};
                            this.save();
                        }
                    }
                    else {
                        data = {};
                    }
                    data = merge(data);
                    return data;
                },
                resetModule: function (moduleIdx) {
                    for (var p in data) {
                        if (p.indexOf('m' + moduleIdx) === 0) {
                            delete data[p];
                        }
                    }
                    data = merge(data);
                    this.save();
                },
                reset: function () {
                    data = merge({});
                    this.save();
                },
                save: function () {
                    if (data) {
                        Track.setData('cmi.suspend_data', JSON.stringify(data));
                    }
                }
            };
        })(),
        setLessonCompleted: function () {
            completed = true;
            return this.setData('cmi.core.lesson_status', COMPLETE_VERB);
        },
        isLessonCompleted: function () {
            return this.getData('cmi.core.lesson_status') + '' === COMPLETE_VERB;
        },
        environmentCheck: (function () {
            return {
                isRequired: function () {
                    if ('1' !== docCookies.getItem(rebus.config.id + '.' + 'environmentCheck')) {
                        docCookies.setItem(rebus.config.id + '.' + 'environmentCheck', '1');
                        return true;
                    }
                    return false;
                }
            };
        })()
    };
})();

// Never call this directly; use 'Track'
rebus._private.lms = (function () {
    "use strict";
    // private
    var internal = {
        'log': rebus.logger.log,
        'debug': function (msg) {
            this.log('type=lms', 'rebus._private.lms.debug', msg);
        },
        'throwError': function (msg) {
            $('#main-content').empty().append([
                '<h1 style="margin-top:60px;">A proplem has occurred with the LMS API</h1>',
                '<p>Please exit the course and try launching it again.</p>',
                '<h3 style="margin-top:20px;">Details:</h2>',
                '<p>' + msg + '</p>'
            ].join('\n'));
            $('#page-loading-mask').remove();
            this.log('type=error', 'rebus._private.lms.throwError', msg);
        },
        'initialised': true, // BOOLEAN: Assume the API has been initialised
        'api': null, // OBJECT: Reference the communication API, for either Local or SCORM communication
        'error': false, // BOOLEAN: Track errors with SCORM communication
        //'maxTries': 10, // NUMBER: Maximum attempts to connect to SCORM API
        'apiFail': false, // BOOLEAN: Determines if there is an API available for tracking;
        'errorWindow': null,
        'runtime': "scorm", // STRING: Runtime environment (default to SCORM)
        'findAPITries': 0, // current number of attempts to find api
        'maxTries': 500, // maximum number of attempts to find the api, too deeply nested if over 500
        // 
        'useLMS': function () {
            return this.api !== null;
        },
        'getSessionInitialised': function () {
            return this.initialised;
        },
        'setSessionInitialised': function (bool) {
            this.initialised = bool;
        },
        // connect to the API
        'scanAPI': function (win) {
            while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
                this.findAPITries++;
                if (this.findAPITries > this.maxTries) return null;
                win = win.parent;
            }
            return win.API;
        },
        // find API in windows
        'findAPI': function (win) {
            this.debug('findAPI()');
            var api;
            if ((win.parent != null) && (win.parent != win)) api = this.scanAPI(win.parent);
            if ((api == null) && (win.opener != null)) api = this.scanAPI(win.opener);
            return api;
        },
        'connectAPI': function (params) {
            var api = null;
            if (this.runtime == "scorm") {
                api = this.findAPI(window);
                api = (api == null || !api) ? null : api;
                if (api == null) {
                    this.setAPIFail(true);
                    this.throwError('LMS API is not found; the course cannot communicate with the LMS.');
                } else {
                    this.setAPI(api);
                }
            } else {
                if (this.runtime == "local") {
                    // Assign Local instance to API
                    this.setAPI(new Local());
                } else {
                    this.throwError("Unknown runtime argument <b>'" + this.runtime + "'</b> completed to <b>connectAPI</b> in <b>Comms class</b>. Expected scorm, local or dummy.");
                }
            }
            return params.initcomms ? !this.getAPIFail() ? this.initComms() : false : !this.getAPIFail();
        },
        'setAPIFail': function (bool) {
            this.apiFail = bool;
        },
        'getAPIFail': function () {
            return this.apiFail;
        },
        // 
        'initComms': function () {
            var api, ok, error;
            api = this.getAPI();
            //check to see if intialize is needed
            ok = api.LMSInitialize("");
            error = api.LMSGetLastError() + '';
            // set the active session flag
            this.setSessionInitialised(error == '101' || error == '0');
            if (error != '0' && error != '101') { // 101, LMS already intialised
                this.commsError(error, 'Failed to complete LMSInitialize("")');
                return false;
            }
            // initialise the lesson status
            if (this.getData("cmi.core.lesson_status") == "not attempted") this.setData("cmi.core.lesson_status", "incomplete");
            //
            return true;
        },
        // 
        'setAPI': function (api) {
            this.api = api;
        },
        'getAPI': function () {
            if (this.api != null && this.api != 'undefined') {
                return this.api;
            } else {
                this.connectAPI({
                    'initcomms': false
                });
                return this.getAPI();
            }
        },
        // 
        'getError': function () {
            return this.error;
        },
        // 
        'setError': function (_error) {
            this.error = _error;
        },
        // 
        'commsError': function (_error, _data1, _data2) {
            this.setError(_error);
            var msg, api;
            api = this.getAPI();
            msg = api.LMSGetErrorString(_error);
            msg += ' \r\n(' + _data1;
            if (_data2 != '') msg += ', ' + _data2;
            msg += ')\r\n';
            msg += ': ';
            msg += api.LMSGetDiagnostic(_error);
            this.throwError(msg);
        },
        // 
        'getMaxTries': function () {
            return this.maxTries;
        },
        // Set LMS Data
        'setData': function (cmi, data) {
            var api = this.getAPI(),
                error, result,
                vTry = 0,
                vMaxTry = this.getMaxTries();
            while (vTry < vMaxTry && error != '0') {
                result = api.LMSSetValue(cmi, data);
                error = api.LMSGetLastError();
                vTry++;
            }
            this.debug('SCORM LMSSetValue(' + cmi + ',' + data + ') [error=' + Number(error) + ']');
            if (Number(error) != 0) {
                if (Number(error) == 301) {
                    this.initComms();
                    return this.setData(cmi, data);
                } else {
                    this.commsError(error, cmi, data);
                }
            }
            return (Number(error) === 0);
        },
        'commitData': function () {
            var api = this.getAPI();
            api.LMSCommit("");
        },
        // Get LMS Data
        'getData': function (cmi) {
            var api = this.getAPI();
            var data, error;
            var vTry = 0,
                vMaxTry = this.getMaxTries();
            while (vTry < vMaxTry && error != '0') {
                data = api.LMSGetValue(cmi);
                error = api.LMSGetLastError();
                vTry++;
            }

            if (Number(error) != 0) {
                if (Number(error) == 301) {
                    this.initComms();
                    return this.getData(cmi);
                } else {
                    this.commsError(error, cmi, '');
                }
            }
            this.debug('SCORM LMSGetValue(' + cmi + '): ' + data + ' [error=' + Number(error) + ']');
            return data;
        },
        // close LMS comms (save session time)
        'commit': function (close) {
            var api = this.getAPI();
            api.LMSCommit("");
            if (close) {
                api.LMSFinish("");
                try { window.close(); } catch (e) { }
                try { parent.close(); } catch (e) { }
                try { top.close(); } catch (e) { }
                window.setTimeout(function () {
                    rebus.controls.modal.show({
                        body: "<p>We've saved your progress, please use the App navigation to return to your course structure.</p>",
                        preventDismiss: true
                    });
                }, 5000);
                return true;
            }
            return false;
        },
        // 1. Find the SCORM API
        // 2. Initialise the SCORM API
        // 3. Update the lesson_status from "not attempted" to "incomplete"
        'init': function () {
            // connect to the API and initialise comms;
            return this.connectAPI({
                'initcomms': true
            });
        }
    };
    // public
    return {
        'debug': function (msg) {
            internal.debug(msg);
        },
        'init': function () {
            return internal.init();
        },
        'getData': function (name) {
            return internal.getData(name);
        },
        'setData': function (name, val) {
            return internal.setData(name, val);
        },
        'commit': function (close) {
            return internal.commit(close);
        },
        'getSessionInitialised': function () {
            return internal.getSessionInitialised();
        },
        'useLMS': function () {
            return internal.useLMS();
        }
    };
})();

// Never call this directly; use 'Track'
rebus._private.local = (function () {
    "use strict";
    return {
        log: rebus.logger.log,
        init: function () {
            return true;
        },
        debug: function (msg) {
            this.log('type=lms', 'rebus._private.local.debug', msg);
        },
        setData: function (cmi, data) {
            sessionStorage.setItem(rebus.config.id + '.' + cmi, data);
            return true;
        },
        getData: function (cmi) {
            return sessionStorage.getItem(rebus.config.id + '.' + cmi);
        },
        commit: function (close) {
            return true;
        },
        getSessionInitialised: function () {
            return true;
        }
    };
})();

// https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie/Simple_document.cookie_framework

/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  Revision #1 - September 4, 2014
|*|
|*|  https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
|*|  https://developer.mozilla.org/User:fusionchess
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path[, domain]])
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/

var docCookies = {
    getItem: function (sKey) {
        if (!sKey) { return null; }
        return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    },
    setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
        if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
        var sExpires = "";
        if (vEnd) {
            switch (vEnd.constructor) {
                case Number:
                    sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
                    break;
                case String:
                    sExpires = "; expires=" + vEnd;
                    break;
                case Date:
                    sExpires = "; expires=" + vEnd.toUTCString();
                    break;
            }
        }
        document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
        return true;
    },
    removeItem: function (sKey, sPath, sDomain) {
        if (!this.hasItem(sKey)) { return false; }
        document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
        return true;
    },
    hasItem: function (sKey) {
        if (!sKey) { return false; }
        return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
    },
    keys: function () {
        var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
        for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
        return aKeys;
    }
};
