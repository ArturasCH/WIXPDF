/* cloud ide editor javascript */
/*jslint browser: true*/
/*global $, jQuery, CodeMirror , Wix*/

/**
 * Class containing common features used by several endpoints
 */
var _common = (function() {
    "use strict";
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
        },
        getProjectById : function(projectId) {
            //return CloudIde.getProject().projects[projectId];
            var settings = CloudIde.getSettings();
            var projects = settings.projects;
            for(var i = 0 ; i < projects.length ; i++) {
                var project = projects[i];
                console.log("projectId passed: "+ projectId);
                console.log("currentlyChecking: "+ project.id);
                if(project.id == projectId) {
                    return project;
                }
            }
            return null;
        },
        fetchSettings: function (onSuccessCallback) {
            var compId , instanceId , userId;
            try {
                userId = Wix.Utils.getUid() || "";
                instanceId = Wix.Utils.getInstanceId() || "";
                compId = Wix.Utils.getOrigCompId() || "";
            }
            catch (err) {
                console.log("Not in Wix editor"); //TODO check if in Wix editor
            }

            if(_cldEditor.mode === 'debug') {
                console.log("about to send window.debugMode = " + _cldEditor.mode);
                compId = 'null';
                instanceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
                userId = Utils.getCookie('instance');
                console.log("set userId to: "+userId);
                console.log("set compId to: "+compId);
            }
            //Loading the appSettings JSON from the server
            $.ajax({
                'type': 'post',
                'url': "/app/loadsettings",
                'dataType': "json",
                'timeout' : 5000,
                'contentType': 'application/json; chatset=UTF-8',
                'data': JSON.stringify({
                    userId: userId,
                    compId: compId,
                    settings: {},
                    mode: _cldEditor.mode
                }),
                'cache': false,
                'success': onSuccessCallback,
                'error': function (res) {
                    if (_cldEditor.mode === "debug") {
                        console.log('error updating data with message ' + res.error);

                    }
                }
            });
        }

    };
    var initPhases = {
        asyncLoader : function() {
            var queue = [], paused = false;
            this.executePhase = function(phaseDescription, phase) {
                queue.push(function() {
                    console.log(phaseDescription);
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
                console.log("res is",res);
                var settings = JSON.parse(res.retData);

            }
            Utils.fetchSettings(useFetchedSettings);
        }
    };
    // Public functions
    return {
        Utils : Utils
    };
}());