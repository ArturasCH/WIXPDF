/* cloud ide editor javascript */
/*jslint browser: true*/
/*global $, jQuery, CodeMirror , Wix*/

/**
 * Class containing editor properties and functions
 */
var _cldEditor = (function() {
    "use strict";
    var CloudIde = {
        settings: {
            appSettings: {
                //Active project in editor
                currentProject : {},
                projects : []
            }
        },
        projectsData : {}, //mapping projectId -> projectCodeObject (JSON)
        //CodeMirror instances
        cm: {
            html : {},
            js : {},
            css : {},
            //TODO consider separating to cache.in and cache.out functions for a cache object
            /**
             * Caches the working Doc objects for faster working module
             * @param projectId the projectId to cache, or to get it's cache
             * @param arr an optional array of objects to cache
             * @return {*} either the cached array of objects, or undefined if it hasn't been cached.
             */
            cache : {
                storage : {
                    //Container
                },
                in : function(identifier,object) {
                    CloudIde.cm.cache.storage['"'+identifier+'"'] = object;
                },
                out : function(identifier) {
                    return CloudIde.cm.cache.storage['"'+identifier+'"'];
                },
                getStorage : function() {
                    return CloudIde.cm.cache.storage;
                }
            }
        },
        getSettings: function () {
            return CloudIde.settings.appSettings;
        },
        /**
         * Debugger methods for console output (console can be any object with the .log function)
         */
        debugger : {
            listProjects : function(console) {
                var settings = CloudIde.getSettings();
                var length = settings.projects.length;
                if(console === undefined) {
                    console = window.console;
                }
                console.log("=================");
                console.log(length+ " projects listed:");
                for(var i = 0 ; i < length ; i++){
                    console.log('Item', settings.projects[i]);
                }
                console.log("=================");
            },
            displayCache : function(console) {
                var cacheStorage = CloudIde.cm.cache.getStorage();
                if(console === undefined) {
                    console = window.console;
                }
                console.log("=================");
                console.log("projects cached:");
                for(var cached in cacheStorage){
                    console.log(cached,cacheStorage[cached]);
                }
                console.log("=================");
            }
        },
        //here we will add callbacks to update the status bar if necessary
        projectHandler : {
            nextId : function() {
                return Math.uuidFast();
//                this.currentId +=1;
//                var id = this.currentId;
//                return id;
            },
            projectTemplate : {
                id : 0,
                name : "New project",
                created : new Date(),
                modified : new Date()
            },
            projectDataTemplate : {
                code : {
                    html : "",
                    js : "",
                    css : ""
                }
            },
            getCurrentProject : function() {
                return CloudIde.getSettings().currentProject;
            },
            getCurrentProjectId : function() {
                try {
                    return CloudIde.getSettings().currentProject.id;
                }
                catch (err) {
                    console.log("Failed getting currentProjectId with err:",err.stack);
                    return null;
                }
            },
            getProjects : function() {
                return CloudIde.getSettings().projects;
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
                        CloudIde.projectHandler.assertData(projectId);
                        return project;
                    }
                }
                return null;
            },
            addProject : function(project) {
                var settings = CloudIde.getSettings();
                //var length = Array.prototype.push.call(settings.projects,project);
                var fetchedProject = CloudIde.projectHandler.getProjectById(project.id);
                if(fetchedProject !== null) {
                    //If fetched project is not null, it means we don't have to add it: it's already there, let's update it:
                    CloudIde.projectHandler.updateCurrentProject();
                }
                else {
                    settings.projects.push(project);
                }
                CloudIde.debugger.listProjects(console);
            },
            /**
             * Deletes a given project (can either be the actual object, or it's id)
             * @param project either the actual object, or it's id
             */
            deleteProject : function(project) {
                var settings = CloudIde.getSettings();
                var projects = settings.projects;
                //var length = Array.prototype.push.call(settings.projects,project);
                if(typeof project === "string") {
                    try {
                        project = this.getProjectById(project);
                    }
                    catch (err) {
                        //TODO decide what to do in this case
                    }
                    if(project === null) {
                        throw new Error("projectId not found!");
                    }
                }

                var index = settings.projects.indexOf(project);
                if(index > -1) {
                    settings.projects.splice(index,1);
                }
                if(project.id === CloudIde.projectHandler.getCurrentProjectId()) {
                    var nextSelected = settings.projects[0];
                    if(nextSelected) {
                        CloudIde.editor.selectProject(nextSelected.id);
                    }
                }
                CloudIde.debugger.listProjects(console);
            },
            /**
             * Edit the configuration of a project based on a given projectSettings object
             * @param projectId the project to edit
             * @param projectSettings the new project settings (ex: {name: "some new name", modified : new Date() } )
             */
            editProjectById : function(projectId,projectSettings) {
                var project = CloudIde.projectHandler.getProjectById(projectId);
                project.name = projectSettings.name;
                project.modified = new Date();
            },
            createNewProjectFromTemplate : function() {
//                //Save current project before creating a new one
//                try {
//                    CloudIde.projectHandler.addCurrentProjectToProjectsArray();
//                }
//                catch (err) {
//                    console.log("unable to add current project. current project is:"+CloudIde.getProject().currentProject);
//                }

                // Deep copy the template using the fastest performing method:
                // http://jsperf.com/cloning-an-object/135 (revision 135)
//                function clone(obj) {
//                    var target = {};
//                    for (var i in obj) {
//                        if (obj.hasOwnProperty(i)) {
//                            target[i] = obj[i];
//                        }
//                    }
//                    return target;
//                }
                //var newProject = jQuery.extend(true, {}, CloudIde.projectHandler.projectTemplate);
                var newProject = Utils.clone(CloudIde.projectHandler.projectTemplate);
                var newProjectData = Utils.clone(CloudIde.projectHandler.projectDataTemplate);
                //var newProject = clone(CloudIde.projectHandler.projectTemplate);
                //Change ID:
                var nextId = CloudIde.projectHandler.nextId();
                newProject.id = nextId;
                newProject.created = new Date();
                return newProject;
            },
            createNewProjectDataFromTemplate : function() {
                return Utils.clone(CloudIde.projectHandler.projectDataTemplate);
            },
            addCurrentProjectToProjectsArray : function() {
                CloudIde.projectHandler.addProject(CloudIde.getSettings().currentProject);
            },
            /**
             * Assert that the given projectId had it's data loaded from the server
             * @param projectId the given projectId to assert
             */
            assertData : function(projectId) {
                //Lazy fetching projects from server
                if(CloudIde.projectsData[projectId] == undefined) {
                    //Project data wasn't loaded before, load it:
                    try {
                        CloudIde.fetchProjectData(projectId);
                    }
                    catch (err) {
                        console.log("error asserting data: ",err);
                        //temp fallback
                        //CloudIde.projectsData[projectId] = CloudIde.projectHandler.createNewProjectDataFromTemplate();
                    }
                }
            },
            updateCurrentProject : function() {
//                var htmlCode = project.code.html;
//                var jsCode = project.code.views.js;
//                var cssCode = project.code.css;
                var htmlCode = CloudIde.cm.html.getDoc().getValue();
                var jsCode = CloudIde.cm.js.getDoc().getValue();
                var cssCode = CloudIde.cm.css.getDoc().getValue();
                //Encoding
                htmlCode =  encodeURI($.base64.encode(htmlCode));
                jsCode =  encodeURI($.base64.encode(jsCode));
                cssCode =  encodeURI($.base64.encode(cssCode));

                //setup current project
                var settings = CloudIde.getSettings();
                settings.currentProject.name = CloudIde.editor.getCurrentProjectName();
                settings.currentProject.modified = new Date();
                CloudIde.projectsData[settings.currentProject.id].code.html = htmlCode;
                CloudIde.projectsData[settings.currentProject.id].code.js = jsCode;
                CloudIde.projectsData[settings.currentProject.id].code.css = cssCode;
                console.log("validation, settings.currentProject: ", settings.currentProject);
                console.log("validation, CloudIde.getSettings.currentProject: ", CloudIde.getSettings.currentProject);
            },
            /**
             * Attempts to update a given project (data-wise) by it's id
             * @param projectId the id of the project to update
             * @return {boolean} trun iff the project has been successfully updated
             */
            updateProjectById : function(projectId) {
                if(!CloudIde.projectsData[projectId]) {
                    return false;
                }
                //Case the project to update is the currently edited project:
                if(projectId == CloudIde.projectHandler.getCurrentProjectId) {
                    //TODO check whether to use updateCurrentProject and return
                    var htmlCode = CloudIde.cm.html.getDoc().getValue();
                    var jsCode = CloudIde.cm.js.getDoc().getValue();
                    var cssCode = CloudIde.cm.css.getDoc().getValue();
                }
                //Case the project to update is not the currently edited project, fetch docs from cache:
                var cache = CloudIde.cm.cache.out(projectId);
                if(cache) {
                    console.log("cache found",cache);
                    var htmlCode = cache[0].getValue();
                    var jsCode = cache[1].getValue();
                    var cssCode = cache[2].getValue();
                }
                else {
                    //not cached, no need to update (not edited)
                    return false;
                }
                //Now we know the code values for htmlCode, jsCode, cssCode
                //Encoding
                htmlCode =  encodeURI($.base64.encode(htmlCode));
                jsCode =  encodeURI($.base64.encode(jsCode));
                cssCode =  encodeURI($.base64.encode(cssCode));

                //Setup project settings
                var settings = CloudIde.getSettings();
                for (var i = 0 ; i < settings.projects.length ; i++) {
                    //Find the project to edit:
                    if (settings.projects[i].id == projectId) {
                        //Edit the project
                        //TODO check if names are not saved!!
                        //var cssSelector = 'label[projectId="'+projectId+'"]';
                        //var oldName = $(cssSelector).get(0).innerText;
                        settings.projects[i].modified = new Date();
                        CloudIde.projectsData[projectId].code.html = htmlCode;
                        CloudIde.projectsData[projectId].code.js = jsCode;
                        CloudIde.projectsData[projectId].code.css = cssCode;
                        console.log("validation, updating "+ settings.projects[i].name ," projectId: ", projectId);
                        //Updated, return
                        return true;
                    }
                }
            },
            /**
             * Update all edited projects with their CodeMirror editors data
             */
            updateAllProjects : function() {
                //Update each of the projects data
                var projects = CloudIde.projectHandler.getProjects();
                var projectsData = CloudIde.projectsData;
                var project;
                var updated = 0 ;
                //Update the projects data
                for(var i = 0; i < projects.length ; i++) {
                    //project data exists
                    if(projectsData[projects[i].id] !== undefined) {
                        if(CloudIde.projectHandler.updateProjectById(projects[i].id)){
                            updated++;
                        }
                    }
                }
                console.log("Updating "+updated+" projects");
                return updated; //Returns the number of updated projects
            },
            /**
             * Sets the current project, by it's given id.
             * It assumes the existence of the project, in the projects array
             * @param projectId the id of the project to set as current project
             */
            setCurrentProjectById : function(projectId) {
                console.log("Attempting to bring project ",projectId, " to scope");
                //Validate that the project isn't in scope first:
                var currentlySelectedProjectId = CloudIde.projectHandler.getCurrentProjectId();
                //Case selecting the current project
                if(projectId === currentlySelectedProjectId) {
                    console.log("Currently selected project is the same as target. Aborting request.");
                    console.log("Current project is:",CloudIde.projectHandler.getCurrentProject());
                    CloudIde.projectHandler.swapDocs(projectId);
                    return;
                }
                //Case selecting any other project
                try {
                    var newProjectToSet = CloudIde.projectHandler.getProjectById(projectId);
                    if(newProjectToSet === null) {
                        throw new Error("Failed setting project. reason: unknown projectId: "+projectId);
                    }
                    console.log("project found in projects array: ",newProjectToSet);
                    //Try fetching the new project CodeMirrorDoc from cache:
                    var cache = CloudIde.cm.cache.out(projectId);
                    CloudIde.projectHandler.swapDocs(projectId,cache);
                    CloudIde.getSettings().currentProject = newProjectToSet;
                }
                catch (err) {
                    console.log(err.stack);
                }
            },
            swapDocs : function(projectId, cache) {
                /*
                 cache logic : lookup the current project, and push it's Docs to the cache using the id of the project.
                 now, in order to bring up a new project to the viewer, first lookup in the cache object given (if
                 it was previously loaded. On cache hit, bring it from the cache. on cache miss, create a new Doc.
                 Once this project is swapped out, it will be cached so it can be loaded quickly later.
                 */


                var newHtmlDoc, newJsDoc, newCssDoc; //CodeMirror Doc objects
                var newHtmlCode, newJsCode, newCssCode; //Code text
                var oldHtmlDoc, oldJsDoc, oldCssDoc; //Current project (old) Doc objects
                var oldHtmlCode, oldJsCode, oldCssCode; //Current project (old) Code text
                var validCurrentProject = false;
                var oldCurrentProjectId;
                var settings = CloudIde.getSettings();
                try {
                    oldCurrentProjectId = settings.currentProject.id;

//                    oldHtmlCode = settings.currentProject.code.html;
//                    oldJsCode = settings.currentProject.code.views.js;
//                    oldCssCode = settings.currentProject.code.css;
//
//                    oldHtmlDoc = CloudIde.cm.html.getDoc();
//                    oldJsDoc = CloudIde.cm.views.js.getDoc();
//                    oldCssDoc = CloudIde.cm.css.getDoc();

                    validCurrentProject = true;
                    console.log("valid current project before swap:",CloudIde.projectHandler.getCurrentProject());
                }
                catch (err) {
//                    //No 'current project' set, fetch it from the project array, and try again:
//                    newHtmlCode = CloudIde.getProject().currentProject.code.html;
//                    newJsCode = CloudIde.getProject().currentProject.code.views.js;
//                    newCssCode = CloudIde.getProject().currentProject.code.css;
                }
                //Cache object is present and valid
                if(cache && cache.length > 2) {
                    newHtmlDoc = cache[0];
                    newJsDoc = cache[1];
                    newCssDoc = cache[2];
                    console.log("Loaded from cache");
                }
                //Cache object not present, generate new CodeMirror Docs from current project's code
                else {
                    var newProjectToSet = CloudIde.projectHandler.getProjectById(projectId);
                    console.log("CloudIde.projectsData["+newProjectToSet.id+"]",CloudIde.projectsData[newProjectToSet.id]);
                    newHtmlDoc = CodeMirror.Doc($.base64.decode(CloudIde.projectsData[newProjectToSet.id].code.html),"htmlmixed");
                    newJsDoc = CodeMirror.Doc($.base64.decode(CloudIde.projectsData[newProjectToSet.id].code.js),"javascript");
                    newCssDoc = CodeMirror.Doc($.base64.decode(CloudIde.projectsData[newProjectToSet.id].code.css),"css");
                    CloudIde.cm.cache.in(newProjectToSet.id,[newHtmlDoc,newJsDoc,newCssDoc]);
                    console.log("Created new cache entry");
                }
                oldHtmlDoc = CloudIde.cm.html.swapDoc(newHtmlDoc);
                oldJsDoc = CloudIde.cm.js.swapDoc(newJsDoc);
                oldCssDoc = CloudIde.cm.css.swapDoc(newCssDoc);
                if(validCurrentProject) { //If the current project is valid, cache it.
                    //CloudIde.cm.cache(oldCurrentProjectId,[oldHtmlDoc,oldJsDoc,oldCssDoc]);
                }
                CloudIde.debugger.displayCache(console);
            }
        },
        editor : {
            toggleFullscreen : function() {
                var elem = $(".cldFullscreenBtn");
                var on,off;
                if($(elem[0]).hasClass("hidden")) {
                    off = elem[0];
                    on = elem[1];
                }
                else {
                    on = elem[0];
                    off = elem[1];
                }
                $(on).addClass("hidden");
                $(off).removeClass("hidden");
                var character = "F11";
                jQuery.event.trigger({ type : 'keypress', which : character.charCodeAt(0) });
            },
            getCurrentProjectName : function() {
                //Only works in multi project environment
                var selectedProjectSelector = '[selectedProject=true]';
                var projectName = $(selectedProjectSelector).val();
                if(projectName === undefined || projectName === '') {
                    projectName = CloudIde.getSettings().currentProject.name;
                }
                return projectName;
            },
            getProjectNameById : function(projectId) {
                //var selectedProjectSelector = '[selectedProject=true]';
                //var projectName = $(selectedProjectSelector).text();
                var projectName = '';
                if(projectName === '') {
                    projectName = CloudIde.editor.getProjectById(projectId).name;
                }
                return projectName;
            },
            /**
             * A really nasty way of generating project explorer view programmatically.
             * Should be replaced in version 2.0 by an MVC architechure and templating
             */
            loadProjectsToExplorer : function() {
                var currentlySelectedProjectId = CloudIde.projectHandler.getCurrentProjectId();
                var projects = CloudIde.projectHandler.getProjects();
                //Prepare then main collapsible div
                var div_projectsContainer = $('<div></div>').addClass('panel-group').addClass('projects').attr('id','projectsPanel');
                //Case no projects are found
                if(projects.length === 0) {
                    var span_no_projects = $('<span></span>').text("Project list is empty!");
                    var div_noProjects = $('<div></div>');
                    div_noProjects.append(span_no_projects);
                    div_projectsContainer.append(div_noProjects);
                    $('#cldProjectName').text("Please create a new project!");
                }
                //Case there are some projects listed
                else {
                    var project;
                    var addSpin = function(){ $(this).addClass('fa-spin'); };
                    var delSpin = function(){ $(this).removeClass('fa-spin');};
                    for(var i = 0 ; i < projects.length ; i++ ) {
                        project = projects[i];
                        //Project Heading
                        var a_projectName_fn = '_cldEditor.editorActions("selectProject","'+project.id+'")';
                        var div_panelHeading = $('<div></div>').addClass('panel-heading').addClass('fullWidth')
                            .attr('data-toggle','collapse').attr('data-parent','#projectsPanel').attr('href','#'+project.id)
                            .attr('projectId',project.id).attr('onclick',a_projectName_fn);
                        var div_panelTitle = $('<h4></h4>').addClass('panel-title');
                        var a_projectName = $('<label></label>').attr('projectId',project.id).text(project.name).addClass('projectName');
                        div_panelTitle.append(a_projectName);
                        div_panelHeading.append(div_panelTitle);

                        //Project Settings panel
                        var div_settingsPanel = $('<div></div>').attr('projectId',project.id).addClass('panel-collapse').addClass('collapse');
                        if(project.id == currentlySelectedProjectId) {
                            div_settingsPanel.attr('projectId', project.id).attr('selectedProject', 'true');
                            var div_projectMainPanel = $('<div></div>').addClass('panel').addClass('panel-primary');
                        }
                        else {
                            div_settingsPanel.attr('projectId', project.id).attr('selectedProject', 'false');
                            var div_projectMainPanel = $('<div></div>').addClass('panel').addClass('panel-default');
                        }

                        var div_settingsPanelBody = $('<div></div>').addClass('panel-body').addClass('fullWidth');
                        var a_projectDel_fn = '_cldEditor.editorActions("deleteProjectById","'+project.id+'")';
                        var a_projectDel_icon = $('<span></span>').addClass('glyphicon').addClass('glyphicon-trash').addClass('paintRed');
                        var a_projectDel = $('<button></button>').attr('type','button').attr('onclick',a_projectDel_fn).addClass('btn').addClass('btn-default')
                            .attr('projectId',project.id);

                        a_projectDel.append(a_projectDel_icon);
                        var a_projectDelBtnGrpWrapper = $('<div></div>').addClass('btn-group');

                        var a_projectDuplicate_fn = '_cldEditor.editorActions("duplicateProject","'+project.id+'")';
                        var a_projectDuplicate_icon = $('<span></span>').addClass('fa').addClass('fa-copy').addClass('paintWixBlue');
                        var a_projectDuplicate = $('<button></button>').attr('type','button').attr('func',a_projectDuplicate_fn).addClass('btn').addClass('btn-default')
                            .attr('projectId',project.id);

                        a_projectDuplicate.attr('data-toggle','modal').attr('data-target','#duplicateProjectModal');
                        a_projectDuplicate.append(a_projectDuplicate_icon);

                        var a_projectDuplicateBtnGrpWrapper = $('<div></div>').addClass('btn-group');

                        var a_projectSettings_fn = '_cldEditor.editorActions("editProjectSettingsById","'+project.id+'")';
                        var a_projectSettings_icon = $('<span></span>').addClass('fa').addClass('fa-cog').addClass('paintBlack');
                        var a_projectSettings = $('<button></button>').attr('type','button').attr('func',a_projectSettings_fn).addClass('btn').addClass('btn-default')
                            .attr('projectId',project.id);
                        a_projectSettings_icon.hover(addSpin,delSpin); //TODO catch with button, show with icon

                        a_projectSettings.attr('data-toggle','modal').attr('data-target','#projectSettingsModal');
                        a_projectSettings.append(a_projectSettings_icon);

                        var a_projectSettingsBtnGrpWrapper = $('<div></div>').addClass('btn-group');


                        var a_projectActionsRow = $('<div></div>').addClass('btn-group').addClass('btn-group-justified');

                        a_projectDelBtnGrpWrapper.append(a_projectDel);
                        a_projectDuplicateBtnGrpWrapper.append(a_projectDuplicate);
                        a_projectSettingsBtnGrpWrapper.append(a_projectSettings);
                        a_projectActionsRow.append(a_projectDelBtnGrpWrapper);
                        a_projectActionsRow.append(a_projectDuplicateBtnGrpWrapper);
                        a_projectActionsRow.append(a_projectSettingsBtnGrpWrapper);

//                        div_settingsPanelBody.append(a_projectSettings);
//                        div_settingsPanelBody.append(a_projectDel);
                        div_settingsPanelBody.append(a_projectActionsRow);

                        div_settingsPanel.append(div_settingsPanelBody);
                        div_projectMainPanel.append(div_panelHeading);
                        div_projectMainPanel.append(div_settingsPanel);
                        div_projectsContainer.append(div_projectMainPanel);
                    }
                }
                $('#cldProjectExplorer').find('.projects').remove();
                $('#cldProjectExplorer').append(div_projectsContainer);


                //Mark selected project, project Explorer:
                //Deactivate last 'current project'
                var lastActiveSelector = '[selectedProject=true]';
                var lastActive = $(lastActiveSelector).attr('selectedProject','false');
                //console.log(lastActive);
                //Activate 'current project'
                var cssSelector = '[projectId='+currentlySelectedProjectId+']';
                var nowActive = $(cssSelector).attr('selectedProject','true');
                nowActive.collapse({
                    toggle: 'show'
                });

                //data-toggle="modal" data-target="#testsModal"
                $('#cldProjectName').text(CloudIde.editor.getCurrentProjectName());

                //console.log(nowActive);
            },
            loadProjectsToExplorerOld : function() {
                var currentlySelectedProjectId = CloudIde.projectHandler.getCurrentProjectId();
                var projects = CloudIde.projectHandler.getProjects();
                //Prepare then UL
                var ul = $('<ul></ul>').addClass("nav").addClass("nav-sidebar").addClass('projects');
                //Case no projects are found
                if(projects.length === 0) {
                    var no_projects = $('<span></span>').text("Project list is empty!").addClass('col-sm-12');
                    var li_noProjects = $('<li></li>').addClass('row-fluid');
                    li_noProjects.append(no_projects);
                    ul.append(li_noProjects);
                }
                //Case there are some projects listed
                else {
                    var project;
                    for(var i = 0 ; i < projects.length ; i++ ) {
                        project = projects[i];
                        var a_projectName_fn = '_cldEditor.editorActions("selectProject","'+project.id+'")';
                        var a_projectDel_fn = '_cldEditor.editorActions("deleteProjectById","'+project.id+'")';
                        var a_projectSettings_fn = '_cldEditor.editorActions("editProjectSettingsById","'+project.id+'")';
                        var a_projectName = $('<a></a>').attr('href','#').attr('onclick',a_projectName_fn).text(project.name).addClass('col-sm-8');
                        var a_projectDel_icon = $('<span></span>').addClass('glyphicon').addClass('glyphicon-remove').addClass('showme');
                        var a_projectDel = $('<a></a>').attr('href','#').attr('onclick',a_projectDel_fn).addClass('col-sm-1').addClass('showhim');
                        a_projectDel.append(a_projectDel_icon);
                        var a_projectSettings_icon = $('<span></span>').addClass('glyphicon').addClass('glyphicon-cog').addClass('showme');
                        var a_projectSettings = $('<a></a>').attr('href','#').attr('func',a_projectSettings_fn).addClass('col-sm-1').addClass('showhim');
                        a_projectSettings.attr('data-toggle','modal').attr('data-target','#projectSettingsModal');
                        a_projectSettings.append(a_projectSettings_icon);
                        var li;
//                        console.log(typeof currentlySelectedProjectId);
//                        console.log("currentlySelectedProjectId:"+currentlySelectedProjectId);
//                        console.log("compare with: "+project.id);
//                        console.log("they are " + ((project.id == currentlySelectedProjectId)?"equal":"different"));


                        if(project.id == currentlySelectedProjectId) {
                            li = $('<li></li>').attr('projectId', project.id).attr('selectedProject', 'true').addClass('row-fluid');
                        }
                        else {
                            li = $('<li></li>').attr('projectId',project.id).attr('selectedProject','false').addClass('row-fluid');
                        }
                        li.append(a_projectName);
                        li.append(a_projectSettings);
                        li.append(a_projectDel);
                        ul.append(li);
                    }
                }
                $('#cldProjectExplorer').find('.projects').remove();
                $('#cldProjectExplorer').append(ul);


                //Mark selected project, project Explorer:
                //Deactivate last 'current project'
                var lastActiveSelector = '[selectedProject=true]';
                var lastActive = $(lastActiveSelector).attr('selectedProject','false').removeClass("active");
                //console.log(lastActive);
                //Activate 'current project'
                var cssSelector = '[projectId='+currentlySelectedProjectId+']';
                var nowActive = $(cssSelector).attr('selectedProject','true').addClass("active");

                $('#cldProjectName').text(CloudIde.editor.getCurrentProjectName());

                //console.log(nowActive);
            },
            /**
             * Selects a given project using it's projectId to be the current project, and loads up it's code.
             * It also asserts that the project data is available.
             * Finally it updates the project explorer accordingly.
             * @param projectId the id of the project to select
             */
            selectProject : function(projectId) {
                //Bring to scope:
                CloudIde.projectHandler.assertData(projectId);
                CloudIde.projectHandler.setCurrentProjectById(projectId);
                $('#cldProjectName').text(CloudIde.editor.getCurrentProjectName())
                    .attr('data-toggle','modal').attr('data-target','#projectRenameModal'); // Single editor mode
                //CloudIde.editor.loadProjectsToExplorer();
            },
            updateStatusBar: function (text, timeout, callback) {
                $('#cldStatusbar').text(text);
                //console.log("Text, Timeout and callback are: ", text ,timeout ,callback);
                if (timeout !== undefined) {
                    //clears the status bar
                    setTimeout(function() {
                        CloudIde.editor.updateStatusBar("", undefined, undefined);
                    }, timeout);
                }
                if(typeof callback === 'function') {
                    return callback();//TODO check for security and necessity of this op
                }
            },
            deleteProjectById : function(projectId) {
                CloudIde.projectHandler.deleteProject(projectId);
                CloudIde.editor.loadProjectsToExplorer();
            },
            /**
             * Creates a new project from template.
             * If the project is the first one, it also selects it.
             */
            createNewProject : function(options) {
                console.log("options object is:",options);
                var newName = options.name;
                var newProject = CloudIde.projectHandler.createNewProjectFromTemplate();
                if(newName) {
                    newProject.name = newName;
                }
                var newProjectData = CloudIde.projectHandler.createNewProjectDataFromTemplate();
                //Adds the project to the projects array, as well as it's data.
                CloudIde.projectHandler.addProject(newProject);
                CloudIde.projectsData[newProject.id] = newProjectData;
                //if(CloudIde.projectHandler.getProjects().length === 1) {
                //    //First project, set it to be the current project, then select it!
                //    CloudIde.projectHandler.setCurrentProjectById(newProject.id);
                //    //selectProject loads projects to explorer as a side-effect
                //    CloudIde.editor.selectProject(newProject.id);
                //}
                //else {
                //    CloudIde.editor.loadProjectsToExplorer();
                //}
                CloudIde.editor.selectProject(newProject.id);
            },
            duplicateProject : function(options) {
                console.log("options object is:",options);
                var srcProjectId = options.projectId;
                var newName = options.name;
                var newProject = CloudIde.projectHandler.createNewProjectFromTemplate();
                newProject.name = newName;
                CloudIde.projectHandler.assertData(srcProjectId);
                var newProjectData = Utils.clone(CloudIde.projectsData[srcProjectId]);
                //Adds the project to the projects array, as well as it's data.
                CloudIde.projectHandler.addProject(newProject);
                CloudIde.projectsData[newProject.id] = newProjectData;
                //TODO remove, as in this stage, it is an infeasible condition
                //if(CloudIde.projectHandler.getProjects().length === 1) {
                //    //First project, set it to be the current project, then select it!
                //    CloudIde.projectHandler.setCurrentProjectById(newProject.id);
                //    //selectProject loads projects to explorer as a side-effect
                //    CloudIde.editor.selectProject(newProject.id);
                //}
                //else {
                //    CloudIde.editor.loadProjectsToExplorer();
                //}
                CloudIde.editor.selectProject(newProject.id);
            },
            /**
             * Edits a project's settings
             * @param options a JSON notation object for the new project's settings
             */
            editProjectSettingsById : function(options) {
                console.log("options object is:",options);
                var projectId = options.projectId;
                var newName = options.name;
                //Sets the new name programmatically (first)
                CloudIde.projectHandler.editProjectById(projectId,options);

                //Sets the new name visually (to save time):
                try {
                    var cssSelector = 'label[projectId="'+projectId+'"]';
                    var oldName = $(cssSelector).get(0).innerText;
                    $(cssSelector).get(0).innerText = newName;
                }
                catch (err) {
                    console.log(err);
                    console.log("Fallback: reloadingProjects to project exploerer");
                    CloudIde.editor.loadProjectsToExplorer();
                }

            }
        },
        /**
         * Returns a CodeMirror configuration object, in JSON notation (json string)
         * of the requested programming language. (codemirror/modes folder)
         * @param lang the programming language to return it's configuration object
         * @return JSON notation (json string) configuration object
         */
        getCodeMirrorDefaultConfig: function (lang) {
            var config = {
                htmlmixed : {
                    value: "Hello World!\n", //TODO replace with the Document module
                    mode: {
                        name: "htmlmixed",
                        globalVars: true
                    },
                    parserfile: ["parsexml.js", "parsecss.js", "tokenizejavascript.js", "parsejavascript.js", "parsehtmlmixed.js"],
                    stylesheet: ["css/xmlcolors.css", "css/jscolors.css", "css/csscolors.css"],
                    indentUnit: 2, //Integer number for indentation spaces
                    smartIndent: true, //Indentation is context sensitive (according to the given mode)
                    tabSize: 2, //width of tabs
                    indentWithTabs: true, //true means indent with tabs instead of spaces
                    lineNumbers: true,
                    lineWrapping: true,
                    foldGutter: true,
                    keyMap: 'sublime',
                    extraKeys: {
                        "Ctrl-Space": "autocomplete",
                        "F11": function(cm) {
                            cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                        },
                        "Esc": function(cm) {
                            if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
                        },
                        "Ctrl-S" : function() {
                            CloudIde.save();
                        }
                    },
                    gutters: ["CodeMirror-lint-markers", "CodeMirror-foldgutter"],
                    getAnnotations: [""],
                    lint: false,
                    autoCloseBrackets: true,
                    path: "views.js/",
                    autofocus : true
                },
                js : {
                    value: "function myScript() {return 100;}\n", //TODO replace with the Document module
                    mode: {
                        name: "javascript",
                        globalVars: true
                    },
                    indentUnit: 2, //Integer number for indentation spaces
                    smartIndent: true, //Indentation is context sensitive (according to the given mode)
                    tabSize: 2, //width of tabs
                    indentWithTabs: true, //true means indent with tabs instead of spaces
                    lineNumbers: true,
                    lineWrapping: true,
                    foldGutter: true,
                    keyMap: 'sublime',
                    extraKeys: {
                        "Ctrl-Space": "autocomplete",
                        "F11": function(cm) {
                            cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                        },
                        "Esc": function(cm) {
                            if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
                        },
                        "Ctrl-S" : function() {
                            CloudIde.save();
                        }
                    },
                    gutters: ["CodeMirror-lint-markers", "CodeMirror-foldgutter"],
                    lint: true,
                    autoCloseBrackets: true,
                    autofocus : true
                },
                css : {
                    value: ".body {}\n", //TODO replace with the Document module
                    mode: {
                        name: "css",
                        globalVars: true
                    },
                    indentUnit: 2, //Integer number for indentation spaces
                    smartIndent: true, //Indentation is context sensitive (according to the given mode)
                    tabSize: 2, //width of tabs
                    indentWithTabs: true, //true means indent with tabs instead of spaces
                    lineNumbers: true,
                    lineWrapping: true,
                    foldGutter: true,
                    keyMap: 'sublime',
                    extraKeys: {
                        "Ctrl-Space": "autocomplete",
                        "F11": function(cm) {
                            cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                        },
                        "Esc": function(cm) {
                            if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
                        },
                        "Ctrl-S" : function() {
                            CloudIde.save();
                        }
                    },
                    gutters: ["CodeMirror-lint-markers", "CodeMirror-foldgutter"],
                    lint: true,
                    autoCloseBrackets: true,
                    autofocus : true
                }
            };
            switch (lang) {
                case "html" : return config.htmlmixed;
                case "javascript" : return config.js;
                case "css" : return config.css;
                default : throw new Error("undefined language");
            }
        },
        /**
         * Saves the current project
         */
        save: function () {
            var numOfUpdatedProjects = CloudIde.projectHandler.updateAllProjects();
            CloudIde.saveAllProjects(numOfUpdatedProjects);
        },
        saveOld: function () {
            //Update the current project (active project)
            CloudIde.projectHandler.updateCurrentProject();
            CloudIde.projectHandler.addCurrentProjectToProjectsArray();
            var projectId = CloudIde.projectHandler.getCurrentProjectId();


            var compId ,instanceId, userId;
            try {
                userId = Wix.Utils.getUid() || "";
                instanceId = Wix.Utils.getInstanceId() || "";
                compId = Wix.Utils.getOrigCompId() || "";
            }
            catch (err) {
                console.log("Not in Wix editor"); //TODO check if in Wix editor
            }

            if(_cldEditor.mode == 'debug') {
                console.log("about to send window.debugMode = " + _cldEditor.mode);
                compId = 'null';
                instanceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
                userId = Utils.getCookie('instance');
                console.log("set userId to: "+userId);
                console.log("set compId to: "+compId);
                var data = JSON.stringify({
                    userId: userId,
                    instanceId: instanceId,
                    compId: compId,
                    projectId: projectId,
                    settings : CloudIde.settings,
                    project: CloudIde.projectsData[projectId],
                    mode: _cldEditor.mode
                });
                console.log("about to send data:",data);
            }
            //Saving the appSettings JSON to the server
            $.ajax({
                'type': 'post',
                'url': "/app/save",
                'dataType': "json",
                'contentType': 'application/json; chatset=UTF-8',
                'data': JSON.stringify({
                    userId: userId,
                    instanceId: instanceId,
                    compId: compId,
                    projectId: projectId,
                    settings : CloudIde.settings,
                    project: {
                        projectId : projectId,
                        code : CloudIde.projectsData[projectId].code
                    },
                    mode: _cldEditor.mode
                }),
                'cache': false,
                'success': function (res) {
                    console.log("save completed");
                    if (_cldEditor.mode === "debug") {
                        CloudIde.editor.updateStatusBar("Saved successfully", 5000, undefined);
                    }
                    else {
                        CloudIde.editor.updateStatusBar("Saved successfully", 5000, undefined);
                        Wix.Settings.refreshAppByCompIds(Wix.Utils.getOrigCompId());
                    }
                },
                'error': function (res) {
                    if (_cldEditor.mode === "debug") {
                        console.log('error updating data with message ' + res.responseText);
                    }
                }
            });
        },
        saveProjectById: function (projectId) {
            var compId ,instanceId, userId;
            try {
                userId = Wix.Utils.getUid() || "";
                instanceId = Wix.Utils.getInstanceId() || "";
                compId = Wix.Utils.getOrigCompId() || "";
            }
            catch (err) {
                console.log("Not in Wix editor"); //TODO check if in Wix editor
            }

            if(_cldEditor.mode == 'debug') {
                console.log("about to send window.debugMode = " + _cldEditor.mode);
                compId = 'null';
                instanceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
                userId = Utils.getCookie('instance');
                console.log("set userId to: "+userId);
                console.log("set compId to: "+compId);
                var data = JSON.stringify({
                    userId: userId,
                    instanceId: instanceId,
                    compId: compId,
                    projectId: projectId,
                    settings : CloudIde.settings,
                    project: CloudIde.projectsData[projectId],
                    mode: _cldEditor.mode
                });
                console.log("about to send data:",data);
            }
            //Saving the appSettings JSON to the server
            $.ajax({
                'type': 'post',
                'url': "/app/save",
                'dataType': "json",
                'contentType': 'application/json; chatset=UTF-8',
                'data': JSON.stringify({
                    userId: userId,
                    instanceId: instanceId,
                    compId: compId,
                    projectId: projectId,
                    settings : CloudIde.settings,
                    project: {
                        projectId : projectId,
                        code : CloudIde.projectsData[projectId].code
                    },
                    mode: _cldEditor.mode
                }),
                'cache': false,
                'success': function (res) {
                    console.log("save completed");
                    if (_cldEditor.mode === "debug") {
                        CloudIde.editor.updateStatusBar("Saved "+ CloudIde.editor.getProjectNameById(projectId) + "successfully", 5000, undefined);
                    }
                    else {
                        CloudIde.editor.updateStatusBar("Saved successfully", 5000, undefined);
                        Wix.Settings.refreshAppByCompIds(Wix.Utils.getOrigCompId());
                    }
                },
                'error': function (res) {
                    if (_cldEditor.mode === "debug") {
                        console.log('error updating data with message ' + res.responseText);
                    }
                }
            });
        },
        saveAllProjects: function (numOfUpdatedProjects) {
            var compId ,instanceId, userId;
            try {
                userId = Wix.Utils.getUid() || "";
                instanceId = Wix.Utils.getInstanceId() || "";
                compId = Wix.Utils.getOrigCompId() || "";
            }
            catch (err) {
                console.log("Not in Wix editor"); //TODO check if in Wix editor
            }

            if(_cldEditor.mode == 'debug') {
                console.log("about to send window.debugMode = " + _cldEditor.mode);
                compId = 'null';
                instanceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
                userId = Utils.getCookie('instance');
                console.log("set userId to: "+userId);
                console.log("set compId to: "+compId);
                var data = JSON.stringify({
                    userId: userId,
                    instanceId: instanceId,
                    compId: compId,
                    projectId: null,
                    aid: null,
                    settings : CloudIde.settings,
                    project: null,
                    projects: CloudIde.projectsData,
                    mode: _cldEditor.mode
                });
                console.log("about to send data:",data);
            }
            //Saving the appSettings JSON to the server
            $.ajax({
                'type': 'post',
                'url': "/app/save",
                'dataType': "json",
                'contentType': 'application/json; chatset=UTF-8',
                'data': JSON.stringify({
                    userId: userId,
                    instanceId: instanceId,
                    compId: compId,
                    projectId: null,
                    aid: null,
                    settings : CloudIde.settings,
                    project: null,
                    projects: CloudIde.projectsData,
                    mode: _cldEditor.mode
                }),
                'cache': false,
                'success': function (res) {
                    console.log("save completed");
                    if (_cldEditor.mode === "debug") {
                        CloudIde.editor.updateStatusBar("Saved "+ numOfUpdatedProjects+ " projects successfully", 5000, undefined);
                    }
                    else {
                        CloudIde.editor.updateStatusBar("Saved successfully", 5000, undefined);
                        Wix.Settings.refreshAppByCompIds(Wix.Utils.getOrigCompId());
                    }
                },
                'error': function (res) {
                    if (_cldEditor.mode === "debug") {
                        console.log('error updating data with message ' + res.responseText);
                    }
                }
            });
        },
        publishProject: function () {
            //TODO decide on keeping this ability
            //Update the current project (active project)
            CloudIde.projectHandler.updateCurrentProject();
            CloudIde.projectHandler.addCurrentProjectToProjectsArray();


            var compId ,instanceId, userId;
            try {
                userId = Wix.Utils.getUid() || "";
                instanceId = Wix.Utils.getInstanceId() || "";
                compId = Wix.Utils.getOrigCompId() || "";
            }
            catch (err) {
                console.log("Not in Wix editor"); //TODO check if in Wix editor
            }

            if(_cldEditor.mode == 'debug') {
                console.log("about to send window.debugMode = " + _cldEditor.mode);
                compId = 'null';
                instanceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
                userId = Utils.getCookie('instance');
                console.log("set userId to: "+userId);
                console.log("set compId to: "+compId);
            }
            //Saving the appSettings JSON to the server
            $.ajax({
                'type': 'post',
                'url': "/app/publish",
                'dataType': "json",
                'contentType': 'application/json; chatset=UTF-8',
                'data': JSON.stringify({
                    userId: userId,
                    compId: compId,
                    settings: CloudIde.settings,
                    mode: _cldEditor.mode
                }),
                'cache': false,
                'success': function (res) {
                    console.log("save completed");
                    if (_cldEditor.mode === "debug") {
                        CloudIde.editor.updateStatusBar("Saved successfully", 5000, undefined);
                    }
                    else {
                        CloudIde.editor.updateStatusBar("Saved successfully", 5000, undefined);
                        Wix.Settings.refreshAppByCompIds(Wix.Utils.getOrigCompId());
                    }
                },
                'error': function (res) {
                    if (_cldEditor.mode === "debug") {
                        console.log('error updating data with message ' + res.responseText);
                    }
                }
            });
        },
        fetchSettings: function (callback) {
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
                    settings: {},
                    mode: _cldEditor.mode
                }),
                'cache': false,
                'success': callback,
                'error': callback
//                function (res) {
//                    if (_cldEditor.mode === "debug") {
//                        console.log('error fetching settings' , res);
//                        return callback(res);
//                    }
//                }
            });
        },
        fetchProjectData: function (projectId) {
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
            //Loading the project code (JSON) from the server
            $.ajax({
                'type': 'post',
                'url': "/app/loadproject",
                'async' : false,
                'dataType': "json",
                'timeout' : 5000,
                'contentType': 'application/json; chatset=UTF-8',
                'data': JSON.stringify({
                    userId: userId,
                    instanceId: instanceId,
                    compId: compId,
                    projectId: projectId,
                    settings: null,
                    project: null,
                    projects: null,
                    mode: _cldEditor.mode
                }),
                'cache': false,
                'success': function(res) {
                    try {
                        console.log("res is", res);
                        var ret = JSON.parse(res.retData);
                        console.log("ret.projectId", ret.projectId);
                        console.log("ret.code", ret.code);
                        CloudIde.projectsData[ret.projectId] = ret.code;
                    }
                    catch (err) {
                        console.log("load project failed");
                    }
                },
                'error': function (res) {
                    if (_cldEditor.mode === "debug") {
                        console.log('error fetching project data with result ' , res);
                    }
                    return res;
                }
            });
        },
        loadAllCodeMirrorAddons: function (list) {
            //CloudIde.loadCodeMirrorAddon("fold/foldcode.views.js");
            CloudIde.loadCodeMirrorAddon("edit/closebrackets.js");
            CloudIde.cm.setOption("autoCloseBrackets", true);
        },
        loadCodeMirrorAddon: function (codeMirrorRelPath) {
            var codeMirrorBaseURL = "../static/lib/codemirror/codemirror-4.0/addon/";
            CloudIde.loadjscssfile(codeMirrorBaseURL + codeMirrorRelPath, "js");


//        $.getScript(codeMirrorBaseURL+codeMirrorRelPath, function( data, textStatus, jqxhr ) {
//            console.log( data ); // Data returned //TODO remove data logging which exposes CodeMirror's internals
//            console.log( textStatus ); // Success
//            console.log( jqxhr.status ); // 200
//            console.log( "Finished loading "+codeMirrorRelPath);
//        });
        },
        loadjscssfile: function (filename, filetype) {
            if (filetype === "js") { //if filename is a external JavaScript file
                var fileref = document.createElement('script');
                fileref.setAttribute("type", "text/javascript");
                fileref.setAttribute("src", filename);
            }
            else if (filetype === "css") { //if filename is an external CSS file
                var fileref = document.createElement("link");
                fileref.setAttribute("rel", "stylesheet");
                fileref.setAttribute("type", "text/css");
                fileref.setAttribute("href", filename);
            }
            if (typeof fileref !== "undefined") {
                document.getElementsByTagName("head")[0].appendChild(fileref);
            }
        },
        replaceDoc: function () {
            var text = "<script src=\"lib/codemirror.views.js\"></script>\n<link rel=\"stylesheet\" href=\"../lib/codemirror.css\">\n<script src=\"mode/javascript/javascript.views.js\"></script>\n";
            return CloudIde.cm.swapDoc(CodeMirror.Doc(text, "javascript", 1));
        }
    };
    var Utils = {
        isUUID : function(string) {
          var regex = new RegExp('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i');
            return regex.test(string);
        },
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
        /**
         * This function clones a given object and returns it's cloned instance
         * @param object the object to clone
         * @returns a cloned instance of the given object
         */
        clone : function(object) {
            var newInstance = JSON.parse(JSON.stringify(object));
            return newInstance;
        }

    };
    var initPhases = {
        dissolveSpinner : function() {
            //function browserSupportsCSSProperty(propertyName) {
            //    var elm = document.createElement('div');
            //    propertyName = propertyName.toLowerCase();
            //
            //    if (elm.style[propertyName] != undefined)
            //        return true;
            //
            //    var propertyNameCapital = propertyName.charAt(0).toUpperCase() + propertyName.substr(1),
            //        domPrefixes = 'Webkit Moz ms O'.split(' ');
            //
            //    for (var i = 0; i < domPrefixes.length; i++) {
            //        if (elm.style[domPrefixes[i] + propertyNameCapital] != undefined)
            //            return true;
            //    }
            //    return false;
            //}
            //if (!browserSupportsCSSProperty('animation')) {
            //    //TODO gif anim fallback here
            //}
            $('.spinnerOverlay').fadeOut('slow',function() {
                $('.spinnerOverlay').remove();
            });


        },
        asyncLoader : function() {
            var queue = [], paused = false;
            this.executePhase = function(phaseDescription, phase, args) {
                queue.push(function() {
                    console.log("Async executor: ",phaseDescription);
                    phase(args);
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
        loadModalsPhase : function() {
            //Define a helper function for inserting a string
            String.prototype.insert = function (index, string) {
                if (index > 0)
                    return this.substring(0, index) + string + this.substring(index, this.length);
                else
                    return string + this;
            };
            //On run, these bindings will fire:


            $('#projectDeleteModal').on('shown.bs.modal', function (e) {
                // Bind Save button
                var captured = e.relatedTarget;
                console.log("captured shown:",captured);
                $('#projectDeleteBtt').get(0).onclick = function() {
                    var currentProject = CloudIde.projectHandler.getCurrentProject();
                    var currentlyEditedProjectId = currentProject.id;
                    if(CloudIde.mode == 'debug') {
                        CloudIde.projectHandler.deleteProject(currentlyEditedProjectId);
                        console.log('should close editor now on production');
                    }
                    else {
                        CloudIde.projectHandler.deleteProject(currentlyEditedProjectId);
                        CloudIde.save();
                        Wix.closeWindow();
                    }
                    $('#projectDeleteModal').modal('hide');

                };
            });
            $('#projectDeleteModal').on('hidden.bs.modal', function (e) {
                // Unbind Save button
                var captured = e.relatedTarget;
                console.log("captured removed:",captured);
                console.log("Delete dismissed");
            });


            //Project Rename Modal
            $('#projectRenameModal').on('shown.bs.modal', function (e) {
                // Bind Save button
                var captured = e.relatedTarget;
                console.log("captured shown:",captured);
                //TODO more general css selector
                //var currentlyEditedProjectId = $(captured).attr('projectId');
                //var cssSelector = 'label[projectId='+currentlyEditedProjectId+']';
                //var currentlyEditedProjectName = $(cssSelector).text();
                var currentProject = CloudIde.projectHandler.getCurrentProject();
                var currentlyEditedProjectName = currentProject.name;
                var currentlyEditedProjectId = currentProject.id;
                console.log("currentlyEditedProjectName:",currentlyEditedProjectName);
                $('#projectRenameInputField').attr('placeholder',currentlyEditedProjectName);
                $('#projectRenameSaveBtt').get(0).onclick = function() {
                    var currentProject = CloudIde.projectHandler.getCurrentProject();
                    var currentlyEditedProjectName = currentProject.name;
                    var currentlyEditedProjectId = currentProject.id;

                    //_cldEditor.editorActions("editProjectSettingsById","b8d19db7-a153-415f-bf7c-b21ef50f224a")
                    //We're going to add another parameter (3rd parameter) as the optional 'options' parameter
                    //TODO input validation
                    var newName = $('#projectRenameInputField').val() || currentlyEditedProjectName; //Failsafe, keep original name
//                    console.log("func is:",func);
//                    //Hack to convert the 'args' to an argument object //TODO change the way args are passed and constructed!
//                    func = func.insert(51,"{projectId:");
////                    for(var i=0 ; i < func.length ; i++ ) {
////                        console.log(i,func.insert(i,"INJECTION"));
////                    }
//                    func = func.insert(func.length-1,', name: "'+newName+'"}');
//                    //Now, function looks like this:
//                    console.log("now, function is",func, "and it's type: ",typeof func);
                    //setTimeout(func,0);
                    CloudIde.projectHandler.editProjectById(currentlyEditedProjectId,{name: newName, modified : new Date() });
                    $('#projectRenameModal').modal('hide');
                    $('#projectRenameInputField').val("");

                };
            });
            $('#projectRenameModal').on('hidden.bs.modal', function (e) {
                // Unbind Save button
                var captured = e.relatedTarget;
                console.log("captured removed:",captured);
                //It's better practice to actually use the captured instead
                $('#cldProjectName').text(CloudIde.editor.getCurrentProjectName());
            });


            //Project Settings Modal
            $('#projectSettingsModal').on('shown.bs.modal', function (e) {
                // Bind Save button
                var captured = e.relatedTarget;
                console.log("captured shown:",captured);
                var func = $(captured).attr('func');
                //Function looks like this:
                console.log("function is",func, "and it's type: ",typeof func);
                console.log("$('#projectSettingsSaveBtt') is:",$('#projectSettingsSaveBtt'));
                //TODO more general css selector
                var currentlyEditedProjectId = $(captured).attr('projectId');
                var cssSelector = 'label[projectId='+currentlyEditedProjectId+']';
                var currentlyEditedProjectName = $(cssSelector).text();
                console.log("currentlyEditedProjectName:",currentlyEditedProjectName);
                $('#projectSettingsNameInputField').attr('placeholder',currentlyEditedProjectName);
                $('#projectSettingsSaveBtt').get(0).onclick = function() {
                    //_cldEditor.editorActions("editProjectSettingsById","b8d19db7-a153-415f-bf7c-b21ef50f224a")
                    //We're going to add another parameter (3rd parameter) as the optional 'options' parameter
                    //TODO input validation
                    var newName = $('#projectSettingsNameInputField').val() || currentlyEditedProjectName; //Failsafe, keep original name
                    console.log("func is:",func);
                    //Hack to convert the 'args' to an argument object //TODO change the way args are passed and constructed!
                    func = func.insert(51,"{projectId:");
//                    for(var i=0 ; i < func.length ; i++ ) {
//                        console.log(i,func.insert(i,"INJECTION"));
//                    }
                    func = func.insert(func.length-1,', name: "'+newName+'"}');
                    //Now, function looks like this:
                    console.log("now, function is",func, "and it's type: ",typeof func);
                    setTimeout(func,0);
                    $('#projectSettingsModal').modal('hide');
                    $('#projectSettingsNameInputField').val("");

                };
            });
            $('#projectSettingsModal').on('hidden.bs.modal', function (e) {
                // Unbind Save button
                var captured = e.relatedTarget;
                console.log("captured removed:",captured);
            });

            //Create new project Modal
            $('#createNewProjectModal').on('shown.bs.modal', function (e) {
                // Bind Save button
                var captured = e.relatedTarget;
                console.log("captured shown:",captured);
                var func = $(captured).attr('func');
                //Function looks like this:
                console.log("function is",func, "and it's type: ",typeof func);
                console.log("$('#createNewProjectSaveBtt') is:",$('#createNewProjectSaveBtt'));
                //TODO more general css selector
                var currentlyEditedProjectId = $(captured).attr('projectId');
                console.log("currentlyEditedProjectId is:",currentlyEditedProjectId);

                $('#createNewProjectModalNewNameInputField').attr('placeholder','New project name');
                $('#createNewProjectSaveBtt').get(0).onclick = function() {
                    //_cldEditor.editorActions("editProjectSettingsById","b8d19db7-a153-415f-bf7c-b21ef50f224a")
                    //We're going to add another parameter (3rd parameter) as the optional 'options' parameter
                    //TODO input validation
                    var newName = $('#createNewProjectModalNewNameInputField').val() || "Fallback value"; //Failsafe, keep original name
                    console.log("func is:",func);
                    //Hack to convert the 'args' to an argument object
                    // TODO change the way args are passed and constructed!
                    // Consider storing only the parameters at the markup
                    func = func.insert(func.length-1,",{projectId:\"\"");
//                    for(var i=0 ; i < func.length ; i++ ) {
//                        console.log(i,func.insert(i,"INJECTION"));
//                    }
                    func = func.insert(func.length-1,', name: "'+newName+'"}');
                    //Now, function looks like this:
                    console.log("now, function is",func, "and it's type: ",typeof func);
                    setTimeout(func,0);
                    $('#createNewProjectModal').modal('hide');
                    $('#createNewProjectModalNewNameInputField').val("");

                };
            });
            $('#createNewProjectModal').on('hidden.bs.modal', function (e) {
                // Unbind Save button
                var captured = e.relatedTarget;
                console.log("captured removed:",captured);
            });

            //Duplicate project Modal
            $('#duplicateProjectModal').on('shown.bs.modal', function (e) {
                // Bind Save button
                var captured = e.relatedTarget;
                console.log("captured shown:",captured);
                var func = $(captured).attr('func');
                //Function looks like this:
                console.log("function is",func, "and it's type: ",typeof func);
                console.log("$('#duplicateProjectSaveBtt') is:",$('#duplicateProjectSaveBtt'));
                //TODO more general css selector
                var currentlyEditedProjectId = $(captured).attr('projectId');
                console.log("currentlyEditedProjectId is:",currentlyEditedProjectId);

                $('#duplicateProjectModalNewNameInputField').attr('placeholder','New project name');
                $('#duplicateProjectSaveBtt').get(0).onclick = function() {
                    //_cldEditor.editorActions("editProjectSettingsById","b8d19db7-a153-415f-bf7c-b21ef50f224a")
                    //We're going to add another parameter (3rd parameter) as the optional 'options' parameter
                    //TODO input validation
                    var newName = $('#duplicateProjectModalNewNameInputField').val() || "Fallback value"; //Failsafe, keep original name
                    console.log("func is:",func);
                    //Hack to convert the 'args' to an argument object
                    // TODO change the way args are passed and constructed!
                    // Consider storing only the parameters at the markup
                    func = func.insert(44,"{projectId:");
//                    for(var i=0 ; i < func.length ; i++ ) {
//                        console.log(i,func.insert(i,"INJECTION"));
//                    }
                    func = func.insert(func.length-1,', name: "'+newName+'"}');
                    //Now, function looks like this:
                    console.log("now, function is",func, "and it's type: ",typeof func);
                    setTimeout(func,0);
                    $('#duplicateProjectModal').modal('hide');
                    $('#duplicateProjectModalNewNameInputField').val("");

                };
            });
            $('#duplicateProjectModal').on('hidden.bs.modal', function (e) {
                // Unbind Save button
                var captured = e.relatedTarget;
                console.log("captured removed:",captured);
            });
        },
        loadCodeMirrorToTextAreasPhase : function() {
            var cldTextAreaHtml = document.getElementById('cldEditorHtmlTextArea');
            var cldTextAreaJs = document.getElementById('cldEditorJsTextArea');
            var cldTextAreaCss = document.getElementById('cldEditorCssTextArea');
            CloudIde.cm.css = CodeMirror.fromTextArea(cldTextAreaCss, CloudIde.getCodeMirrorDefaultConfig("css"));
            CloudIde.cm.js = CodeMirror.fromTextArea(cldTextAreaJs, CloudIde.getCodeMirrorDefaultConfig("javascript"));
            CloudIde.cm.html = CodeMirror.fromTextArea(cldTextAreaHtml, CloudIde.getCodeMirrorDefaultConfig("html"));
            //Set height:
            var innerHeight = window.innerHeight;
            var innerWidth = window.innerWidth;
            var headerHeight = 50;
            var footerHeight = 20;
            var tabsHeight = 50;
            //Defensible boarders!
            var newHeight = innerHeight - headerHeight - footerHeight - tabsHeight;
            var newWidth = innerWidth - headerHeight;
            window.addEventListener('resize', function(event){
                // do stuff here
                //Set height:
                var innerHeight = window.innerHeight;
                var innerWidth = window.innerWidth;
                var headerHeight = 50;
                var footerHeight = 20;
                var tabsHeight = 50;
                //Defensible boarders!
                var newHeight = innerHeight - headerHeight - footerHeight - tabsHeight;
                var newWidth = innerWidth - headerHeight;
                CloudIde.cm.html.setSize(newWidth,newHeight);
                CloudIde.cm.js.setSize(newWidth,newHeight);
                CloudIde.cm.css.setSize(newWidth,newHeight);

            });

            CloudIde.cm.html.setSize(newWidth,newHeight);
            CloudIde.cm.js.setSize(newWidth,newHeight);
            CloudIde.cm.css.setSize(newWidth,newHeight);
        },
        bindCodeMirrorTabs : function() {
            //Initialize Editor tab buttons
            $('#cldEditorTabs a[href="#cldEditorHtml"]').click(function (e) {
                e.preventDefault();
                $(this).tab('show');
            });
            $('#cldEditorTabs a[href="#cldEditorJs"]').click(function (e) {
                e.preventDefault();
                $(this).tab('show');
            });
            $('#cldEditorTabs a[href="#cldEditorCss"]').click(function (e) {
                e.preventDefault();
                $(this).tab('show');
            });
        },
        setMode : function() {
            var mode = Utils.getURLParameter('mode') || "";
            console.log("Mode set to: "+ (mode === 'debug'?mode:"mode not set"));
            _cldEditor.mode = mode;
            if(mode == 'demo') {
                CloudIde.save = function(e) {
                    e.preventDefault();
                };
            }
        },
        bindCodeMirrorTabsListeners : function() {
            //Initialize Editor tab event listeners
            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                //e.target // activated tab
                //e.relatedTarget // previous tab
                switch (e.target.innerHTML) {
                    case "CSS" : CloudIde.cm.css.refresh();break;
                    case "JavaScript" : CloudIde.cm.js.refresh();break;
                    case "HTML" : CloudIde.cm.html.refresh();
                }
            });

        },
        initIdGenerator : function() {
            //Initialize UUID generator
            var res;
            try {
                var res = $.getScript("../static/lib/Math.uuid.js");
            }
            catch (err) {

            }
            finally {
                //If the UUID script did not load, use fallback:
                //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
                if(!(res && res.status === 200)) {
                    CloudIde.projectHandler.nextId = function() {
                        var d = new Date().getTime();
                        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                            var r = (d + Math.random()*16)%16 | 0;
                            d = Math.floor(d/16);
                            return (c=='x' ? r : (r&0x7|0x8)).toString(16);
                        });
                        return uuid;
                    };
                }
            }
        },
        loadSettingsFromServer : function() {
            //Callback to the ajax request
            function assignFetchedSettings(res){
                console.log('res is:', res);
                if(res.retData) {
                    CloudIde.settings = JSON.parse(res.retData);
                    CloudIde.editor.updateStatusBar("Loaded settings successfully", 5000, undefined);
                }
                else {
                    CloudIde.editor.updateStatusBar("Unable to load settings from server", 5000, undefined);
                }
                CloudIde.editor.createNewProject({name: 'Change the project name!'});
                //Call the rename modal in 'forced' mode
                $('#projectRenameModal').modal({
                    keyboard: false,
                    backdrop: 'static'
                });
            }

            //Callback to the ajax request
            function useFetchedSettings(res){
                console.log('res is:', res);
                if(res.retData) {
                    CloudIde.settings = JSON.parse(res.retData);
                    var projId = Utils.getURLParameter('projectId');
                    if(!projId) {
                        projId = CloudIde.projectHandler.getCurrentProjectId();
                        CloudIde.fetchProjectData(projId);
                    }
//                    //Fetch the projectData from DB, and then set it to the projectC
//                    var projectData = CloudIde.fetchProjectData(projId);
//                    CloudIde.projectsData[projId] = projectData;

                    //load projects to explorer
                    //CloudIde.editor.loadProjectsToExplorer();
                    CloudIde.editor.selectProject(projId);
                }
                else {//No settings loaded, init a new editor instance
                    //Initialize template project if the fetched settings aren't proper
                    //FALLBACK behavior: creating a newProject on malformed requests (should change?)
                    //CloudIde.editor.createNewProject({name: 'new project'});
                    console.log("No settings loaded from server!");
                    throw new Error("Couldn't load settings from server");
                }

                //Finally, notify:
                if (_cldEditor.mode === "debug") {
                    console.log("loaded settings from server (debug)");
                    CloudIde.editor.updateStatusBar("Loaded settings successfully", 5000, undefined);
                }
                else {
                    CloudIde.editor.updateStatusBar("Loaded settings successfully", 5000, undefined);
                }
            }

            //3 possibilities: either passed 'newProject', or the projectId to load, or demo mode
            var projId = Utils.getURLParameter('projectId');
            var demoModePath = window.location.pathname;
            if(CloudIde.mode === 'demo' || demoModePath === '/app/editordemo') {
                console.log("creating demo project");
                CloudIde.editor.createNewProject({name: 'Your project name here!'});
                $('#cldProjectName').text(CloudIde.editor.getCurrentProjectName());
                var newHtmlDoc = CodeMirror.Doc("just like jsFiddle... write your code here!","htmlmixed");
                CloudIde.cm.html.swapDoc(newHtmlDoc);

            }
            else if(projId === 'newProject') {
                console.log("creating new project");
                CloudIde.fetchSettings(assignFetchedSettings); // just bring the settings to scope
            }
            else {
                CloudIde.fetchSettings(useFetchedSettings); //bring the settings to scope, and use it (to fetch the correct project)
            }
        },
        initCodeMirrorTernEngine : function(editor) {
            function getURL(urls, c, retrievedContent) {
                var url = urls.pop();
                if(url == undefined) {
                    return c(null, retrievedContent);
                };
                var xhr = new XMLHttpRequest();
                xhr.open("get", url, true);
                xhr.send();
                xhr.onreadystatechange = function() {
                    if (xhr.readyState != 4) return;
                    if (xhr.status < 400) {
                        retrievedContent.push(JSON.parse(xhr.responseText));
                        return getURL(urls,c ,retrievedContent);
                    }
                    var e = new Error(xhr.responseText || "No response");
                    e.status = xhr.status;
                    c(e);
                };
            }

            var server;
            var arr = [];
            getURL(["http://ternjs.net/defs/ecma5.json" , "http://ternjs.net/defs/jquery.json" ], function(err, codes) {
                if (err) {
                    throw new Error("Request for ecma5.json: " + err);
                }
                console.log("defs : codes : " , codes);
                server = new CodeMirror.TernServer(
                    {
                        defs : codes

                    });
                editor.setOption("extraKeys", {
                    "Ctrl-Space": function(cm) { server.complete(cm); },
                    "Ctrl-I": function(cm) { server.showType(cm); },
                    "Alt-.": function(cm) { server.jumpToDef(cm); },
                    "Alt-,": function(cm) { server.jumpBack(cm); },
                    "Ctrl-Q": function(cm) { server.rename(cm); },
                    "Ctrl-.": function(cm) { server.selectName(cm); }
                });
                editor.on("cursorActivity", function(cm) { server.updateArgHints(cm); });
            }, arr);
        }
    };
    // Public functions
    return {
        init: function() {
            var startLoading = Date.now();
            var async = initPhases.asyncLoader();
            async.executePhase("setMode",initPhases.setMode);
            async.executePhase("loadCodeMirrorToTextAreasPhase",initPhases.loadCodeMirrorToTextAreasPhase);
            async.executePhase("initIdGenerator",initPhases.initIdGenerator);
            async.executePhase("loadSettingsFromServer",initPhases.loadSettingsFromServer);
            async.executePhase("bindCodeMirrorTabs",initPhases.bindCodeMirrorTabs);
            async.executePhase("bindCodeMirrorTabsListeners",initPhases.bindCodeMirrorTabsListeners);
            async.executePhase("loadModalsPhase",initPhases.loadModalsPhase);
            async.executePhase("dissolveSpinner",initPhases.dissolveSpinner);

            //TERN support (currently does not work well)
            //async.executePhase("initIdGenerator",initPhases.initCodeMirrorTernEngine, CloudIde.cm.views.js);

            //Initialize menu segment
            //Initialize project explorer segment
            //Initialize status bar segment
            //Initialize settings
            //release global
            //TODO preloader
            //Load add-ons
            //CloudIde.loadAllCodeMirrorAddons();
            var finishLoading = Date.now();
            var totalTime = finishLoading-startLoading;
            console.log("Load complete in "+totalTime+"ms");
        },
        save: function() {
            CloudIde.save();
        },
        //Exposes the project handler
        getProjectHandler: function() {
            return CloudIde.projectHandler;
        },
        editorActions : function(actionName,args) {
            CloudIde.editor[actionName](args);
        },
        cldDebug : function() {
            return CloudIde;
        }
    };
}());

// load google feed scripts - should be done in the beginning
//google.load("feeds", "1");

$(document).ready(function() {
    //TODO move 'settings' to private (CloudIde) object
//    //When this val is set to true, the app will skip authentication for the update endpoints
//    if(window.location.origin == "http://localhost:8080") { //TODO replace with GET param
//        _cldEditor.mode = "debug";
//    }
//    else {
//        _cldEditor.mode = "";
//    }
    try {
        _cldEditor.init();
    }
    catch (err) {
        console.log(err.stack);
    }
    //TODO remove from production code, for debugging only!
    window.debug = _cldEditor.cldDebug();
});


