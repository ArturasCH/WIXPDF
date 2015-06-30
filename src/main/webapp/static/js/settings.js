/* cloud ide settings endpoint javascript */

/*jslint browser: true*/
/*global $, jQuery,  appSettings , Wix , console*/


/**
 * Class containing widget property and functions
 * This class is using the module pattern:
 * http://www.yuiblog.com/blog/2007/06/12/module-pattern/
 */
var _WixPdf = (function() {
    "use strict";
    function choosePdf() {
        //User selected a document
        function onSuccess(pdfMetaData) {
            _WixPdf.settings.pdf = pdfMetaData;
            _WixPdf.settings.config = Wix.UI.toJSON();
            var pdfURL = Wix.Utils.Media.getDocumentUrl(_WixPdf.settings.pdf.relativeUri);
            PDFJS.workerSrc = "../static/lib/pdfjs/build/pdf.worker.js";
            PDFJS.disableWorker = true;
            PDFJS.getDocument(pdfURL).then(function(pdf) {
                var numberOfPages = pdf.numPages;
                //When first loading a document, set the numOfPages as a param
                _WixPdf.settings.numOfPages = numberOfPages;
                $('#firstPageSelector').getCtrl().options.maxValue = _WixPdf.settings.numOfPages;

            });
            saveSettings();
            //Init pdf display
            updateSettingsViewWithLoadedPdf();
            //var compId = Wix.Utils.getOrigCompId();
            //var compIds = [].push(compId);
            //var queryParams = {};
            //queryParams.pdfurl = Wix.Utils.Media.getDocumentUrl(_WixPdf.settings.pdf.relativeUri);
            //Wix.Settings.refreshAppByCompIds(compIds, queryParams);
            Wix.Settings.refreshApp();
        }
        function onCancel() {
            //Do something?
        }
        Wix.Settings.openMediaDialog(Wix.Settings.MediaType.DOCUMENT, false, onSuccess, onCancel);
    }

    function updateSettingsViewWithLoadedPdf() {
        if(_WixPdf.settings.pdf) {
            $("#pdfLink").attr('href',Wix.Utils.Media.getDocumentUrl(_WixPdf.settings.pdf.relativeUri)).text(_WixPdf.settings.pdf.fileName);
            $('#firstPageSelector').getCtrl().options.maxValue = _WixPdf.settings.numOfPages;
        }
        else {
            console.log("settings is not defined properly: settings is: " , _WixPdf.settings);
        }
    }

    /**
     * Saves the settings to the server
     * @param onSuccessCallback optional callback function after settings were saved
     */
    function saveSettings(onSuccessCallback) {
        var compId , instanceId , userId;
        try {
            userId = Wix.Utils.getUid() || "";
            instanceId = Wix.Utils.getInstanceId() || "";
            compId = Wix.Utils.getOrigCompId() || "";
        }
        catch (err) {
            console.log("Not in Wix editor"); //TODO check if in Wix editor
        }

        if(_WixPdf.mode == 'debug') {
            console.log("about to send window.debugMode = " + _WixPdf.mode);
            if(compId == '') {
                compId = 'wdgttest';
            }
            if(instanceId == '') {
                instanceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
            }
            console.log("set instanceId to: "+instanceId);
            console.log("set compId to: "+compId);
            var wixConfig = Wix.UI.toJSON();
            _WixPdf.settings = _WixPdf.settings || {
                pdf : {
                    fileName: 'Default',
                    relativeUri: "someURI.pdf"
                },
                config : wixConfig
            };
        }
        if(!onSuccessCallback) {
            onSuccessCallback = function(res) {
                if (_WixPdf.mode === "debug") {
                    console.log("Successfully updated with message ", res);
                }
            };
        }

        //Saving the appSettings JSON to the server
        $.ajax({
                'type': 'post',
                'url': "/app/settingsupdate",
                'dataType': "json",
                'timeout' : 30000,
                'contentType': 'application/json; chatset=UTF-8',
                'data': JSON.stringify({
                    userId: userId,
                    instanceId: instanceId,
                    compId: compId,
                    settings: {
                        'appSettings' : _WixPdf.settings
                    },
                    mode: _WixPdf.mode
                }),
                'cache': false,
                'success': onSuccessCallback,
                'error': function (res) {
                    if (_WixPdf.mode === "debug") {
                        console.log('error updating data with message ' + res.error);
                    }
                }
        });
    }

    /**
     * Updating the settings object in the DB by posting an ajax request
     * @param settingsJson
     */
    function fetchSettings(onSuccessCallback) {
        var compId , instanceId , userId;
        try {
            userId = Wix.Utils.getUid() || "";
            instanceId = Wix.Utils.getInstanceId() || "";
            compId = Wix.Utils.getOrigCompId() || "";
        }
        catch (err) {
            console.log("Not in Wix editor"); //TODO check if in Wix editor
        }

        //if(_WixPdf.mode == 'debug') {
        //    console.log("about to send window.debugMode = " + _WixPdf.mode);
        //    compId = 'wdgttest';
        //    instanceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        //    userId = Utils.getCookie('instance');
        //    console.log("set userId to: "+userId);
        //    console.log("set compId to: "+compId);
        //}
        //Loading the appSettings JSON from the server
        $.ajax({
            'type': 'post',
            'url': "/app/loadsettings",
            'dataType': "json",
            'timeout' : 5000,
            'contentType': 'application/json; chatset=UTF-8',
            'data': JSON.stringify({
                userId: userId,
                instanceId: instanceId,
                compId: compId,
                settings: {},
                mode: _WixPdf.mode
            }),
            'cache': false,
            'success': onSuccessCallback,
            'error': function (res) {
                if (_WixPdf.mode === "debug") {
                    console.log('error updating data with message ' + res.error);

                }
            }
        });
    }
    var initPhases = {
        asyncLoader : function() {
            var queue = [], paused = false;
            this.executePhase = function(phaseDescription, phase) {
                queue.push(function() {
                    if (_WixPdf.mode === "debug") {
                        console.log(phaseDescription);
                    }
                    phase();
                });
                runPhase(this);
            };
            this.pause = function() {
                paused = true;
            };
            this.resume = function() {
                paused = false;
                setTimeout(runPhase, 1);
            };
            function runPhase(loader) {
                if (!paused && queue.length) {
                    queue.shift()();
                    if (!paused) {
                        loader.resume();
                    }
                }
            }
            return this;
        },
        loadSettingsFromServer : function() {
            //Callback to the ajax request
            function useFetchedSettings(res){
                if (_WixPdf.mode === "debug") {
                    console.log("res is",res);
                }
                var appSettings = JSON.parse(res.retData);
                if(appSettings !== null && appSettings.appSettings) {
                    _WixPdf.settings = appSettings.appSettings;
                }
                else {
                    console.log("Warning: unable to load proper settings from server - loading default settings");
                    _WixPdf.settings = {};
                    _WixPdf.settings.pdf = {
                        'fileName' : "sample-pdf.pdf",
                        'relativeUri' : "c0a3d7_7e7197ba8d0040048ae7e6bcdfa54883.pdf"
                    };
                    _WixPdf.settings.config = Wix.UI.toJSON();
                }
                if (_WixPdf.mode === "debug") {
                    console.log("Settings loaded are",_WixPdf.settings);
                }
                //TODO make a promise
                Wix.UI.initialize(_WixPdf.settings.config);
                //load to view
                updateSettingsViewWithLoadedPdf();
                //Finally, notify: //TODO preloader
                if (_WixPdf.mode === "debug") {
                    console.log("loaded settings from server (debug)");
                }
            }
            fetchSettings(useFetchedSettings);
        },
        /**
         * Bind events
         * Listen to changes of the elements
         */
        bindChoosePdfButton : function() {
            $('#connectBtn').click(function() {
                choosePdf();
            });
        },
        setMode : function() {
            var mode = Utils.getURLParameter('mode') || "";
            console.log("Mode set to: "+ (mode === 'debug'?mode:"mode not set"));
            _WixPdf.mode = mode;
        },
        bindListeners : function() {
            Wix.UI.onChange('*', function(){
                _WixPdf.settings.config = Wix.UI.toJSON();
                console.log("UI change captured, saving:" , _WixPdf.settings);
                saveSettings(Wix.Settings.refreshApp());
            });
        }

    };
    var Utils = {
        getCookie : function(cname) {
            var name = cname + "=";
            var ca = document.cookie.split(';');
            for(var i=0; i<ca.length; i++) {
                var c = ca[i].trim();
                if (c.indexOf(name) == 0) {
                    return c.substring(name.length,c.length);
                }
            }
            return "";
        },
        getURLParameter : function(sParam) {
            var sPageURL = window.location.search.substring(1);
            var sURLVariables = sPageURL.split('&');
            for (var i = 0; i < sURLVariables.length; i++) {
                var sParameterName = sURLVariables[i].split('=');
                if (sParameterName[0] == sParam) {
                    return sParameterName[1];
                }
            }
        }
    };
    // Public functions
    return {
        init: function() {
            var startLoading = Date.now();
            var async = initPhases.asyncLoader();
            async.executePhase("setMode",initPhases.setMode);
            async.executePhase("loadSettingsFromServer",initPhases.loadSettingsFromServer);
            async.executePhase("bindChoosePdfButton",initPhases.bindChoosePdfButton);
            async.executePhase("bindListeners",initPhases.bindListeners);
            var finishLoading = Date.now();
            var totalTime = finishLoading-startLoading;
            console.log("Load complete in "+totalTime+"ms");
        },
        getSettings : function() {
            return _WixPdf.settings;
        },
        save: function() {
            saveSettings();
        }
    };
}());

// load google feed scripts - should be done in the beginning

$(document).ready(function() {
    //When this val is set to true, the app will skip authentication for the update endpoints
    try {
        _WixPdf.init();
    }
    catch (err) {
        console.log(err.stack);
    }
});