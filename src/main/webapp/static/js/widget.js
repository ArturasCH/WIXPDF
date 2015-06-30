/* WixPdf widget javascript */

/*jslint browser: true*/
/*global $, jQuery, appSettings, Wix, PDFJS, console*/


/**
* Class containing widget property and functions
*/
var _WixPdf = (function() {
    /**
     * This function loads the pdf into view with the bare layout
     * @param url optional: override the loader with a supplied PDF url
     */
    function loadBareLayout(url) {
        //Set the stage
        $('#the-canvas').removeClass('hidden');
        //
        // If absolute URL from the remote server is provided, configure the CORS
        // header on that server.
        //
        var pdfURL = url || Wix.Utils.Media.getDocumentUrl(_WixPdf.settings.pdf.relativeUri);
        var startWithPage = _WixPdf.settings.config.startWithPage || 1;

        PDFJS.workerSrc = "../static/lib/pdfjs/build/pdf.worker.js";
        //
        // Disable workers to avoid yet another cross-origin issue (workers need
        // the URL of the script to be loaded, and dynamically loading a cross-origin
        // script does not work).
        //
        PDFJS.disableWorker = false;
        PDFJS.getDocument(pdfURL).then(function(pdf) {
            // you can now use *pdf* here
            pdf.getPage(startWithPage).then(function(page) {
                // you can now use *page* here

                //Rendering the Page
                //var scale = 1.0;
                //var viewport = page.getViewport(scale);
                var canvas = document.getElementById('the-canvas');
                var context = canvas.getContext('2d',{antialias : true});
                var rotation = _WixPdf.settings.config.documentRotation.value || 0;
                var reRender = function(page) {
                    //var context = canvas.getContext("2d", { alpha: false });
                    //context.imageSmoothingEnabled = true;
                    //context.mozImageSmoothingEnabled = true;
                    //canvas.height = viewport.height;
                    //canvas.width = viewport.width;
                    //canvas.height = window.innerHeight;
                    //canvas.width = window.innerWidth;
                    //canvas.style.height = window.innerHeight;
                    //canvas.style.width = window.innerWidth;
                    var desiredWidth = window.innerWidth;
                    var viewport = page.getViewport(1.0, rotation);
                    var scale = desiredWidth / viewport.width;

                    var scaledViewport = page.getViewport(scale, rotation);
                    canvas.height = scaledViewport.height;
                    canvas.width = scaledViewport.width;


                    var renderContext = {
                        canvasContext: context,
                        viewport: scaledViewport
                    };
                    page.render(renderContext);
                };
                //Initial render
                reRender(page);
                window.addEventListener('resize', function(event){
                    // do stuff here
                    //console.log("Rerendering page:",page);
                    reRender(page);
                });
                //Alternatively, if you want the canvas to render to a certain pixel size you could do the following:
                //
                //var desiredWidth = 100;
                //var viewport = page.getViewport(1);
                //var scale = desiredWidth / viewport.width;
                //var scaledViewport = page.getViewport(scale);
            });
        });

    }

    /**
     * This function loads the pdf into view with the full layout
     * @param url optional: override the loader with a supplied PDF url
     */
    function loadFullLayout(url) {
        var pdfURL = url || Wix.Utils.Media.getDocumentUrl(_WixPdf.settings.pdf.relativeUri);
        var viewerPath = '../static/lib/pdfjs/web/viewer.html?file=' + pdfURL +'#zoom=page-width' + '&page='+_WixPdf.settings.config.startWithPage;
        //../static/lib/pdfjs/web/viewer.html?file=http://media.wix.com/ugd/c0a3d7_d615effb43ee4156a089ec42da8e8d7e.pdf#zoom=page-width

        $('<iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0">').attr('src',viewerPath).appendTo('body');
    }

    /**
     * This function loads the pdf into view with the minimal layout
     * @param url optional: override the loader with a supplied PDF url
     */
    function loadMinimalLayout(url) {
        //Set the stage
        $('#the-canvas').removeClass('hidden');
        $('#minimalControls').removeClass('hidden');

        //Initialize params
        var pdfURL = url || Wix.Utils.Media.getDocumentUrl(_WixPdf.settings.pdf.relativeUri);
        var pdfDoc = null,
            pageRendering = false,
            pageNumPending = null,
            canvas = document.getElementById('the-canvas'),
            ctx = canvas.getContext('2d', {antialias : true});
        var rotation = _WixPdf.settings.config.documentRotation.value || 0;
        var pageNum = _WixPdf.settings.config.startWithPage || 1;

        PDFJS.workerSrc = "../static/lib/pdfjs/build/pdf.worker.js";
        PDFJS.getDocument(pdfURL).then(function (pdfDoc_) {
            pdfDoc = pdfDoc_;
            document.getElementById('page_count').textContent = pdfDoc.numPages;

            // Initial/first page rendering
            renderPage(pageNum);
        });

        //Initialize page queue rendering
        /**
         * Get page info from document, resize canvas accordingly, and render page.
         * @param num Page number.
         */
        function renderPage(num) {
            pageRendering = true;
            // Using promise to fetch the page
            pdfDoc.getPage(num).then(function(page) {
                var viewport = page.getViewport(1.0, rotation);
                var desiredWidth = window.innerWidth;
                var scale = desiredWidth / viewport.width;

                var scaledViewport = page.getViewport(scale, rotation);
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;

                // Render PDF page into canvas context
                var renderContext = {
                    canvasContext: ctx,
                    viewport: scaledViewport
                };
                var renderTask = page.render(renderContext);

                // Wait for rendering to finish
                renderTask.promise.then(function () {
                    pageRendering = false;
                    if (pageNumPending !== null) {
                        // New page rendering is pending
                        renderPage(pageNumPending);
                        pageNumPending = null;
                    }
                });
            });

            // Update page counters
            //document.getElementById('page_num').textContent = pageNum;
            $('#page_num').text(pageNum);
        }

        /**
         * If another page rendering in progress, waits until the rendering is
         * finised. Otherwise, executes rendering immediately.
         */
        function queueRenderPage(num) {
            if (pageRendering) {
                pageNumPending = num;
            } else {
                renderPage(num);
            }
        }

        /**
         * Displays previous page.
         */
        function onPrevPage() {
            if (pageNum <= 1) {
                return;
            }
            pageNum--;
            queueRenderPage(pageNum);
        }
        //document.getElementById('prev').addEventListener('click', onPrevPage);
        $('#prev').click(onPrevPage);

        /**
         * Displays next page.
         */
        function onNextPage() {
            if (pageNum >= pdfDoc.numPages) {
                return;
            }
            pageNum++;
            queueRenderPage(pageNum);
        }
        //document.getElementById('next').addEventListener('click', onNextPage);
        $('#next').click(onNextPage);

        //document.getElementById('page_count').textContent = pdfDoc.numPages;
        //$('#page_count').text(pdfDoc.numPages);

        //Bind resize listener
        window.addEventListener('resize', function(event){
            // do stuff here
            //console.log("Re-rendering page:",page);
            renderPage(pageNum);
        });
    }

    function loadDefaultPdf() {
        //My Cv :-)
        //var samplePdfURL = 'http://media.wix.com/ugd/c0a3d7_d615effb43ee4156a089ec42da8e8d7e.pdf';
        var samplePdfURL = 'http://media.wix.com/ugd/c0a3d7_7e7197ba8d0040048ae7e6bcdfa54883.pdf';
        loadBareLayout(samplePdfURL);
    }

    /**
     * Updating the settings object in the DB by posting an ajax request
     * @param settingsJson
     */
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
            //Ajax request
            function fetchSettings(onSuccessCallback) {
                var compId , instanceId , userId;
                try {
                    userId = Wix.Utils.getUid() || "";
                    instanceId = Wix.Utils.getInstanceId() || "";
                    //Notice: getOrigCompId is called from settings!
                    compId = Wix.Utils.getCompId() || "";
                }
                catch (err) {
                    console.log("Not in Wix editor"); //TODO check if in Wix editor
                }

                if(_WixPdf.mode == 'debug') {
                    console.log("about to send window.debugMode = " + _WixPdf.mode);
                    compId = 'wdgttest';
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
            //Callback to the ajax request
            function useFetchedSettings(res){
                if (_WixPdf.mode === "debug") {
                    console.log("res is",res);
                }
                var appSettings = JSON.parse(res.retData);
                //Validate proper response from database
                if(appSettings !== null && appSettings.appSettings) {
                    _WixPdf.settings = appSettings.appSettings;
                }
                //Validate config loaded
                if(_WixPdf.settings && _WixPdf.settings.pdf && _WixPdf.settings.config) {
                    try {
                        switch (_WixPdf.settings.config.viewerLayout.value) {
                            case "full" : loadFullLayout(); break;
                            case "minimal": loadMinimalLayout(); break;
                            case "bare": loadBareLayout(); break;
                            default : loadBareLayout(); //Default view is bare
                        }
                    }
                    catch (err) {
                        loadBareLayout(); //failsafe
                        console.log("Unable to display layout. err: ", err);
                    }
                }
                else {
                    //console.log("Warning: unable to load proper settings from server.");
                    //Initial settings:
                    _WixPdf.settings = {
                        "pdf" : {
                            "fileName":"sample-pdf.pdf",
                            "relativeUri":"c0a3d7_7e7197ba8d0040048ae7e6bcdfa54883.pdf"
                        },
                        "config": {
                            "documentRotation": {
                                "index":0,
                                "value":"0"
                            },
                            "startWithPage":1,
                            "viewerLayout": {
                                "value":"bare",
                                "index":0
                            }
                        }
                    };
                    loadDefaultPdf();
                }
                if (_WixPdf.mode === "debug") {
                    console.log("Settings loaded are",_WixPdf.settings);
                }
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
        loadPdf : function() {
            loadBareLayout();
        },
        initWixUI : function() {
            Wix.UI.initialize();

        },
        setMode : function() {
            var mode = Utils.getURLParameter('mode') || "";
            console.log("Mode set to: "+ (mode === 'debug'?mode:"mode not set"));
            _WixPdf.mode = mode;
//            if(_WixPdf.mode !== "debug") {
//                console.log("initPhases is: ",initPhases);
//                initPhases.initWixUI();
//            }
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
    return {
        init: function(){
            var startLoading = Date.now();
            var async = initPhases.asyncLoader();
            async.executePhase("setMode",initPhases.setMode);
            async.executePhase("loadSettingsFromServer",initPhases.loadSettingsFromServer);
            var finishLoading = Date.now();
            var totalTime = finishLoading-startLoading;
            console.log("Load complete in "+totalTime+"ms");
        },
        loadPdf: function(url) {
            try {
                switch (_WixPdf.settings.config.viewerLayout.value) {
                    case "full" : loadFullLayout(url); break;
                    case "minimal": loadMinimalLayout(url); break;
                    case "bare": loadBareLayout(url); break;
                    default : loadBareLayout(url); //Default view is bare
                }
            }
            catch (err) {
                loadBareLayout(url); //failsafe
                console.log("Unable to display layout. err: ", err);
            }
        },
        loadSettingsFromServer: function() {
            initPhases.loadSettingsFromServer();
        },
        loadDefaultPdf: function() {
            _WixPdf.loadDefaultPdf();
        }
    };
}());
$(document).ready(function() {
    try {
        _WixPdf.init();
    }
    catch (err) {
        console.log("init failed:");
        console.log(err);
    }
});