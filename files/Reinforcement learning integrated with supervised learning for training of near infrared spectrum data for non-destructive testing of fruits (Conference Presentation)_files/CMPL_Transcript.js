//THIS IS THE CADMORE VIDEO PLAYER
//This script runs the entire normal video player.

var videoPlayer; //This global variable will hold a reference to the video player after it is created.
var cmpl; //this will hold our CMPL javascript object which is triggered by the video player.
var cuePlayTimeout; //These two values are used when our player is hooked up to an outside application that is controlling things.  For us, that's the transcript editor.
var playUntilTime = "";
var parametersTimeout;

//These are on page load events.
$(document).ready(function () {
    //We will go ahead and load the video as page loads for fastest possible response time.
    LoadVideoPlayer();

    //Next, we want to attempt communication with EMBED.js.
    CommunicationEmbedJS();
});




function CommunicationEmbedJSTryAgain() {
    console.log("CMPL: Attempting Embed.JS communication again...");
    parent.postMessage('{"method":"keyMe_v2","aspectratio":"' + viewModel.AspectRatio + '","forcefillcontainer":' + viewModel.Configuration.ForceFillContainer + ',"playerBoxShadow":' + viewModel.Configuration.PlayerBoxShadow + ',"useparentcontainerheight":' + viewModel.Configuration.UseParentContainerHeight + ', "force100percentwidth":' + viewModel.Configuration.Force100PercentWidth +'}', "*");
      
    keyMeTimeout = setTimeout(function () {
        CommunicationEmbedJSTryAgain();
    }, 500);
    
}

function CommunicationEmbedJS() {
    //perform a parameters check.
    try {
        //This gets called twice.  The first time we hope it works.  The second is just in case
        //parent page wasn't quite ready and missed the first.
        //THe Keyed response will attempt to cancel the timer and will ignore a second call back, anyways.
        //This prevents us from always having to wait 500MS to load the video.
        parent.postMessage('{"method":"keyMe_v2","aspectratio":"' + viewModel.AspectRatio + '","forcefillcontainer":' + viewModel.Configuration.ForceFillContainer + ',"playerBoxShadow":' + viewModel.Configuration.PlayerBoxShadow + ',"useparentcontainerheight":' + viewModel.Configuration.UseParentContainerHeight + ', "force100percentwidth":'+ viewModel.Configuration.Force100PercentWidth +'}', "*");
        keyMeTimeout = setTimeout(function () {
            CommunicationEmbedJSTryAgain();
        }, 500);
    }
    catch (ex) {
        console.log("CMPL: Error posting key message.");
    }
}

function LoadVideoPlayer() {
    //When a new video gets loaded, we will always spin off a new CMPL object.
    cmpl = new CMPL(viewModel);

    if (cmpl.cloudflare) {
        LoadVideoJS();
    }
    else {
        throw new Error("CMPL: Not marked as migrated.");
    }
    
}


function LoadVideoJS() {

    

    var vid = document.getElementById('video');
    videoPlayer = videojs(vid, { /* Options */
        "nativeControlsForTouch": false,
        autoplay: false,
        controls: true,
        loop: false,
        poster: "",
        fluid: false,
        hotKeys: {
            enableVolumeScroll: false
        }
    }, function () {
        var self = this;
        
        cmpl.qualityLevels = this.qualityLevels();
        //This will trigger as quality levels are added.  We don't actually know at this time what quality levels there
        //are, so we can't include or exlucde till we know what the dimensions available are.
        //We need this to trigger a call back.
        if (cmpl.usePlayerQualitySelector) {
            $('#quality-selection-button').parent().hide();
        }

        cmpl.qualityLevels.on('addqualitylevel', function (event) {
            var ql = event.qualityLevel;
            if (cmpl.qualityLevels.length > 0 && cmpl.selectedQuality != 0 && cmpl.usePlayerQualitySelector) {
                if (ql.height == cmpl.selectedQuality) {
                    cmpl.qualityCurrentlySelected.text(ql.height);
                }
                else {
                    console.log("CMPL: DISABLING QL: " + ql.height);
                    try {
                        ql.enabled = false;
                        qualityLevel.enabled_ = false;
                    }
                    catch (ex) {
                        //swallow random errors that get thrown to console.
                    }
                }
            }
            else {
                if (ql.height > cmpl.highestQuality) {
                    cmpl.highestQuality = ql.height;
                    cmpl.qualityCurrentlySelected.text(ql.height);

                    if (ql && ql.id.includes("https")) {
                        if (videoPlayer.dash != null) {
                            url = `https://${window.location.host}/player/GenerateVideoSource?url=${cmpl.dashSource}&resolution=${ql.height}&hls=false&objectId=${cmpl.videoIdentifier}`
                        } else {
                            url = `https://${window.location.host}/player/GenerateVideoSource?url=${cmpl.source}&resolution=${ql.height}&objectId=${cmpl.videoIdentifier}`;
                        }
                        cmpl.qualityChangePlayerReload(url);
                    }
                }

                if (ql.height < 720 && ql.height < cmpl.highestQuality) {
                    console.log("CMPL: DISABLING QL: " + ql.height);
                    try {
                        ql.enabled = false;
                    }
                    catch (ex) {
                        //swallow random errors that get thrown to console.
                    }
                }
            }
            if (cmpl.usePlayerQualitySelector) {
                $('#quality-selection-button').parent().show();
                var qualityControl = $('#' + ql.height);
                if (qualityControl.length == 0) {
                    cmpl.qualitySelectionValues.append('<li id="' + ql.height + '" class="type-item bg-white p-2 mb-0.5 hover:bg-primary-light-33-opacity"><span class="text-dark grow">' + ql.height + '</span></li>');
                    $('#' + ql.height).on('click', function () {
                        cmpl.selectedQuality = this.id;
                        var url = null;

                        for (var i = 0; i < cmpl.qualityLevels.length; i++) {
                            let qualityLevel = cmpl.qualityLevels[i];
                            if (this.id == qualityLevel.height) {
                                try {
                                    if (qualityLevel.id.includes("https")) {
                                        if (videoPlayer.dash != null) {
                                            url = `https://${window.location.host}/player/GenerateVideoSource?url=${cmpl.dashSource}&resolution=${this.id}&hls=false&objectId=${cmpl.videoIdentifier}`
                                        } else {
                                            url = `https://${window.location.host}/player/GenerateVideoSource?url=${cmpl.source}&resolution=${this.id}&objectId=${cmpl.videoIdentifier}`;
                                        }
                                    }

                                    cmpl.qualityCurrentlySelected.text(qualityLevel.height);

                                    var qualityControl = $('#modal-quality-selected-check');
                                    if (qualityControl.length > 0) {
                                        qualityControl.remove();
                                    }
                                    $('#' + qualityLevel.height).prepend('<span class="w-6"><i class="fas fa-check mr-1 text-primary font-normal text-xs text middle" id="modal-quality-selected-check"></i></span> ')
                                    qualityLevel.enabled = true;
                                    qualityLevel.enabled_ = true;
                                }
                                catch (ex) {
                                    //swallow random errors that get thrown to console.
                                }
                            }
                            else {
                                try {
                                    console.log("CMPL: QL Option Clicked: DISABLING QL: " + qualityLevel.height);
                                    qualityLevel.enabled = false;
                                    qualityLevel.enabled_ = false;
                                }
                                catch (ex) {
                                    //swallow random errors that get thrown to console.
                                }
                            }
                        }

                        var ctime = videoPlayer.currentTime();
                        if (ctime > 0) {
                            cmpl.qualityChangePlayerReload(url);
                        } else if (url) {
                            cmpl.qualityChangePlayerReload(url);
                        }
                        
                    });
                }

                var qualityControl = $('#modal-quality-selected-check');
                if (qualityControl.length > 0) {
                    qualityControl.remove();
                }
                if (cmpl.selectedQuality > 0) {
                    $("#" + cmpl.selectedQuality).prepend('<span class="w-6"><i class="fas fa-check mr-1 text-primary font-normal text-xs text middle" id="modal-quality-selected-check"></i></span> ')
                }
                else {
                    $("#" + cmpl.highestQuality).prepend('<span class="w-6"><i class="fas fa-check mr-1 text-primary font-normal text-xs text middle" id="modal-quality-selected-check"></i></span> ')
                }
            }
        });

       
        //Here, we can attach event listeners to the video player.
        this.on('timeupdate', function () {
            if (cmpl.autoTriggeredPlay) {
                return; //abort.  We don't do anything during auto triggered play.
            }
            //If we are clip masking, we may need to forward the asset on to the next clip.
            var ended = false;
            if (cmpl.clipMasking && cmpl.isClipped(cmpl.currentTime())) {

                //move to the next available time.
                var moveStartTime = cmpl.nextValidClipBlockStartTime(cmpl.currentTime());

                if (moveStartTime === -1) {
                    cmpl.end();
                    ended = true;
                }
                else {
                    //Only set the time with a play if we are already playing.
                    if (cmpl.playState == true) {
                        cmpl.setTime(moveStartTime);
                    }
                    else {
                        cmpl.setTimeNoStart(moveStartTime);
                    }
                }
            }
            else {
                var duration_time = Math.floor(cmpl.duration());
                var current_time = Math.floor(cmpl.currentTime());
                if (current_time > 0 && (current_time >= duration_time)) {
                    cmpl.end();
                    ended = true;
                }

            }

            if (!ended)
            {
                cmpl.hasEnded = false;
                //This fires somewhere between 15-250 Milliseconds depending
                //on the type of video.
                cmpl.updatePlayBackPercentage(false);
                cmpl.updateCurrentTime();
                cmpl.highlightTranscript();
                //cmpl.positionSegmentsRecenter();
                cmpl.checkClipStop();

                if (cmpl.viewStart != -1 && cmpl.autolog != -1 && (this.currentTime() - cmpl.autolog) >= 10) {
                    cmpl.recordPlayActivity();

                    //if the different in current time - autolog exceeds 20, we are going to assume this is a current time error and ignore this.
                    if (this.currentTime() - cmpl.autolog >= 20) {
                        console.log("CMPL: Auto Logging View Block error.  Disabled further logging on this block.  Current time minus last log is greater than 20 seconds: " + this.currentTime() + " -- " + cmpl.autolog);
                        cmpl.autolog = -1; //turn off any further logging.
                    }
                    else {
                        cmpl.autolog = this.currentTime(); // reset to current time.
                    }
                }

                cmpl.updateSlider();
            }


            var time = cmpl.currentTime();

            cmpl.interactive();

            if (playUntilTime !== "" && cmpl.currentTime() >= cmpl.convertTimestampToMilliseconds(playUntilTime) / 1000) {
                cmpl.blockUpdate = true;
                cmpl.pause();
                parent.postMessage('{"method":"playedUntil"}', "*");
                playUntilTime = "";
            }
            else if (playUntilTime !== "") {
                parent.postMessage('{"method":"playUntilTimeUpdate","time":"' + time + '"}', "*");
            }
            else if (playUntilTime === "") {
                if (typeof time !== "undefined" && !cmpl.blockUpdate) {
                    parent.postMessage('{"method":"playerTimeUpdate","time":"' + time + '"}', "*");
                }
                else {
                    cmpl.blockUpdate = false;
                }
            }



            //If skippable, and time update, we calculate total time played to determine if we can skip or not.
            if (cmpl.preRoll && cmpl.preRollSkippable && !cmpl.skipButton.is(":visible")) {
                //First, if skip time is 0, we just show, who cares.
                if (cmp.preRollSkipTime == 0) {
                    //self.preRollWrapper.show();
                    cmpl.skipButton.fadeIn();
                }
                else if (cmpl.currentTime() > cmpl.preRollSkipTime) {
                    //self.preRollWrapper.show();
                    cmpl.skipButton.fadeIn();
                }
            }

            if (cmpl.preRoll && !cmpl.clickLink.is(":visible")) {
                if (self.preRollShowClickTime == 0) {
                    //self.preRollWrapper.show();
                    cmpl.clickLink.fadeIn();
                }
                else if (cmpl.currentTime() > cmpl.preRollShowClickTime) {
                    //self.preRollWrapper.show();
                    cmpl.clickLink.fadeIn();
                }
            }
            cmpl.updateChat();

        });
        this.on('playing', function () {
            if (cmpl.autoTriggeredPlay) {
                return; //abort.  We don't do anything during auto triggered play.
            }
            cmpl.closedCaptions.show();

            // Post message to parent that the video is playing
            parent.postMessage('{"method":"playing"}', "*");

            $('.vjs-text-track-display').attr('aria-hidden', 'true');
            //$('.vjs-controls-disabled div').attr('aria-hidden', 'true').attr("aria-label", "Video Player").attr("Role", "Region");
            $('.azuremediaplayer').attr("aria-label", "Video Player");
            $('.azuremediaplayer div').attr("aria-hidden", "true");

            if (cmpl.reloading)
            {
                cmpl.setTime(cmpl.reloadTime);
                cmpl.reloading = false;
            }
            if (cmpl.reloadingQuality) {
                cmpl.setTime(cmpl.reloadTime);
                cmpl.reloadingQuality = false;
            }
        });
        this.on('progress', function () {
            if (cmpl.autoTriggeredPlay) {
                return; //abort.  We don't do anything during auto triggered play.
            }
        });
        this.on('ended', function () {
            cmpl.end();
        });
        this.on('error', function (e) {
            console.log("CMPL: Video Error.");
            console.log(e);
            cmpl.reloadPlayer(); //reloads player on video.js error if not having tried reload 3 times already.
        });
        this.on('loadedmetadata', function (e) {
            console.log("CMPL: Loaded metadata");
            //cmpl.loadData();
            cmpl.playerLoaded = true;
            if (this.dash != null && cmpl.qualityLevels.length == 0) {
                cmpl.getDashStreamManifest();
            }
            else if (cmpl.qualityLevels.length == 0) {
                var ios = (/iphone|ipod|ipad|macintosh/i.test(navigator.userAgent.toLowerCase()));

                if (ios) {
                    cmpl.getHLSStream(true);
                }
            }

            if (cmpl.reloadingQuality && cmpl.selectedQuality != 0) {
                if (!cmpl.paused) {
                    videoPlayer.play();
                }
                else {
                    cmpl.setTime(cmpl.reloadTime, false);
                    cmpl.reloadingQuality = false;
                }
            }
            else if (cmpl.reloadTime != 0) {
                setTimeout(function () {
                    cmpl.initTime(cmpl.reloadTime);
                }, 500);
            }



        });
        this.on('ready', function () {
            console.log("CMPL: Ready");
            //This is here as a backup call if loadedmetadata fails.
            //cmpl.loadData();
            cmpl.playerLoaded = true;
            if (this.dash != null && cmpl.qualityLevels.length == 0) {
                cmpl.getDashStreamManifest();
            }
            else if (cmpl.qualityLevels.length == 0) {
                var ios = (/iphone|ipod|ipad|macintosh/i.test(navigator.userAgent.toLowerCase()));

                if (ios) {
                   cmpl.getHLSStream(true);
                }
            }

            if (cmpl.reloadingQuality && cmpl.selectedQuality != 0) {
                if (!cmpl.paused) {
                    videoPlayer.play();
                }
                else {
                    cmpl.setTime(cmpl.reloadTime, false);
                    cmpl.reloadingQuality = false;
                }
            }
            else if (cmpl.reloadTime != 0) {
                setTimeout(function () {
                    cmpl.initTime(cmpl.reloadTime);
                }, 500);
            }

        });
        
        //Finally because sometimes neither loadedmetadata nor ready will fire,
        //we will fire ANYWAYS after 10000ms.
        //We also always fire even if the keyed event is not coming back from parent.  We always want to try and load the video.
        setTimeout(function () {
            if (!cmpl.loadedData) {
                console.log("CMPL: Force Load.");
                cmpl.playerLoaded = true;
                cmpl.loadData();
            }
        }, 3000);

       
    });

  
}


//These are event listeners and message senders.  This is communicating with EMBED.JS or other scripts that are listening.
window.addEventListener('message', function (e) {
    try {
        var obj = JSON.parse(e.data);



        if (obj.method === "visicheck_v2") {
            if (obj.visible === "true") {
                cmpl.visicheck = true;
            }
            else {
                cmpl.visicheck = false;
            }
        }
        else if (obj.method === "stop") {
            cmpl.pause();
        }
        else if (obj.method === "keyed") {
            console.log("CMPL: Embed.JS Communication Achieved. " + obj.key);
            //It is possible through race conditions that multiple key mes can receive call backs.
            //This happens because we try to circumvent the 500 MS timer on the second keyme to speed up loading.
            //And sometimes both can go through, resulting in a double call back.
            //If that's the case, we don't want to load twice view the parameters check pathway.
            //So, we block the second one here.
            cmpl.embedJSDetected = true;
            if (cmpl.parentKey != obj.key) {
                clearTimeout(keyMeTimeout);
                if (typeof obj.key !== 'undefined' && obj.key !== null && obj.key !== "" && obj.key !== 'undefined') {
                    cmpl.parentKey = obj.key;
                }
                if (typeof obj.parentUrl !== 'undefined' && obj.parentUrl !== null) {
                    cmpl.parentUrl = obj.parentUrl;
                }

                //Also, look for parameters for cue, start, end, etc.
                if (typeof obj.start !== 'undefined' && obj.start !== null && obj.start !== "") {
                    cmpl.hasStart = true;
                    cmpl.videoStart = obj.start;
                }

                if (typeof obj.end !== 'undefined' && obj.end !== null && obj.end !== "") {
                    cmpl.hasEnd = true;
                    cmpl.videoEnd = obj.end;
                }

                if (typeof obj.cue !== 'undefined' && obj.cue !== null && obj.cue !== "") {
                    cmpl.hasCue = true;
                    cmpl.cue = obj.cue;
                }

                if (typeof obj.searchString !== 'undefined' && obj.searchString !== null) {
                    cmpl.searchString = obj.searchString;
                }

                if (typeof obj.transcriptToggle !== 'undefined' && obj.transcriptToggle !== null) {
                    cmpl.toggleTranscript = obj.transcriptToggle;
                }

                cmpl.loadData();
            }

        }
        else if (obj.method === "currenttime") {
            var timestamp = cmpl.convertMilliSecondsToClippedTimeStamp(cmpl.currentTime() * 1000);
            parent.postMessage('{"method":"currentTime","time":"' + timestamp + '"}', "*");
        }
        else if (obj.method === "currentrealtime") {
            var timestamp = cmpl.convertMilliSecondsToTimeStamp(cmpl.currentTime() * 1000);
            if (obj.key !== undefined && obj.key != null)
            {
                parent.postMessage('{"method":"currentRealTime","time":"' + timestamp + '","key":"' + obj.key + '"}', "*");
            }
            else
            {
                parent.postMessage('{"method":"currentRealTime","time":"' + timestamp + '"}', "*");
            }
        }
        else if (obj.method === "playSegment") {
            if (obj.startTime && obj.endTime) {
                cmpl.setTimeFromTimeStamp(obj.startTime);
                var endMiliseconds = cmpl.convertTimestampToMilliseconds(obj.endTime) / 1000;
                clearTimeout(cuePlayTimeout);
                cuePlayTimeout = setTimeout(function checkEndTime() {
                    if (cmpl.currentTime() < endMiliseconds) {
                        cuePlayTimeout = setTimeout(checkEndTime, 10);
                    }
                    else {
                        cmpl.pause();
                    }
                }, 10);
            }
        }
        else if (obj.method === "playuntil") {
            if (obj.startTime && obj.endTime) {
                playUntilTime = obj.endTime;
                cmpl.setTimeFromTimeStamp(obj.startTime);
            }
            else {
                cmpl.play();
            }
        }
        else if (obj.method == "mute") {
            //Mute, but also show the muted container.
            cmpl.mute();
            cmpl.autoPlayMessageContainer.show();
        }
        else if (obj.method === "startAt") {
            cmpl.setTime(cmpl.realTimeFromClippedTime(parseInt(obj.startSeconds)));
        }
        else if (obj.method == "pause") {
            cmpl.pause();
        }
        else if (obj.method == "viewHeight") {
            cmpl.viewPortHeight = obj.value;
        }
        else if (obj.method == "forceTranscriptless") {
            cmpl.forceTranscriptless(obj.value, obj.showTab);
        }
        else if (obj.method == "fullScreenStatus") {
            parent.postMessage('{"method":"fullScreenStatus","status":' + cmpl.fullScreen + '}', "*");
        }
        else if (obj.method == "setPlayspeed") {
            cmpl.setPlayspeed(obj.speed);
        }
        else if (obj.method == "fullScreen") {
            cmpl.fullScreenWithTranscript();
        }
        else if (obj.method == "fullScreenVideoOnly") {
            cmpl.fullScreenVideoOnly();
        }
        else if (obj.method == "toggleMute") {
            cmpl.toggleMute();
        }
        else if (obj.method == "muteStatus") {
            parent.postMessage('{"method":"muteStatus","status":' + cmpl.muteStatus() + '}', "*");
        }
        else if (obj.method == "setVolume") {
            cmpl.setVolume(obj.volume);
        }
        else if (obj.method == "toggleCC") {
            cmpl.toggleCC();
        }
        else if (obj.method == "play") {
            cmpl.play();
        }
        else if (obj.method == "playState") {
            parent.postMessage('{"method":"playState","status":' + cmpl.playState + '}', "*");
        }
        else if (obj.method == "ccStatus") {
            parent.postMessage('{"method":"ccStatus","status": ' + cmpl.captionsOn + '}', "*");
        }
        else if (obj.method == "focus") {
            if (cmpl.bigPlayButton.is(":visible")) {
                cmpl.bigPlayButton.focus();
            }
            else if (cmpl.playState) {
                cmpl.pauseButton.focus();
            }
            else {
                cmpl.playButton.focus();
            }
        }
        else if (obj.method == "collapseTranscript") {
            if (cmpl.transcript) {
                if (cmpl.transcriptExpanded) {
                    cmpl.collapseTranscriptButton.click();
                }
            }
        }
        else if (obj.method == "changeLanguage") {
            console.log("CHANGE LANGUAGE");
            console.log(obj.code);
            console.log(obj.name);
            cmpl.setLanguage(obj.code, obj.name);
        }
    }
    catch (ex) {
        //ignore errors

    }

});

function CMPL(objectJson) {
    this.adContainer = null; //these are set when ad manager is initialized
    this.adDisplayContainer = null; //these are set when ad manager is initialize
    this.adLink = objectJson.AdLink;
    this.adsInitialized = false; //set to true when ad manager initialized.
    this.adsLoaded = false; //set to true once the ads are loaded for the first time.
    this.adsLoader = null; //set when ad manager is initialized.
    this.callToAdLoadPost = false;
    this.adPaused = false;
    this.adPlaying = false;
    this.adShowing = false; //set to true when ad is upposed to be showing.
    this.analyticsIds = objectJson.AnalyticsIds; //List of ids to be tracked with analytics.
    this.analyticsKey = objectJson.AnalyticsKey;
    this.attemptedReloadCount = 0; //keeps track of number of times we despeartely try to get the video metadata to load.
    this.autolog = -1; //This helps us keep track of continuous rolling updates on a log of a view block.  It counts up as the video players and ensures every 5 seconds we record an update.
    this.autoPlay = objectJson.AutoPlay;
    this.autoRepeat = objectJson.AutoRepeat;
    this.autoScroll = true;
    this.autoScrollChat = true;
    this.autoTriggeredPlay = false;
    this.aspectRatio = objectJson.AspectRatio;
    this.blockUpdate = false; //??
    this.blocksClickStartStop = objectJson.BlocksClickStartStop;
    this.captionsOn = objectJson.CaptionsOn;
    this.captionsOff = objectJson.CaptionsOff; //signifies that we default to captions off on load.
    this.chat = objectJson.Chat; //Chat replay.
    this.chatLastCount = 0; //This is the amount of chat that was last shown when the show routine run.  Used for auto scrolling alogrithm.
    this.chatMode = 'live'; //mode is either live or full.  Live being show live chat replay as it happens and full being show all the chat.
    this.clipMasking = objectJson.ClipModel.Clips.length == 0 ? false : true; //for clipping
    this.clipMode = false; //for when we have a start and end time specified.  This is different than clip masking, entirely different and unrelated.
    this.clipModel = objectJson.ClipModel; //for clip masking.
    this.cloudflare = objectJson.Cloudflare; //designates that we have loaded cloud flare.
    this.citation = objectJson.Citation;
    this.collapsedTabs = objectJson.CollapsedTabs;
    this.configuration = objectJson.Configuration;
    this.cue = objectJson.Cue;
    this.controlRequestFullScreen = false; //set to true briefly when on of our controsl is doing the full screen requesting.
    this.defaultTab = objectJson.DefaultTab;
    this.durationMetadata = objectJson.Duration;
    this.embedJSDetected = false; //set to true if embed.js is detected.  Needed for transcriptless mode.
    this.everStarted = false; //has the video ever started.
    this.filterFromSearchModal = false; //gets set to true when the filter modal is opened from the search modal.
    this.findElements(); //execute to locate all the objects we could reference.
    this.fireExitFullScreen = true; //this gets set to false when we didn't fire exiting full screen with our own controls.
    this.forceAutoPlay = objectJson.ForceAutoPlay;
    this.forwardSkipAmount = objectJson.ForwardSkipAmount;
    this.fullScreen = false; //set to true when it goes full screen.
    this.fullScreenPreExpandedTranscriptState = false; //Set to whatever the transcript state was before opening in full screen.
    this.hasCue = objectJson.HasCue;
    this.hasEnd = objectJson.HasEnd;
    this.hasSegments = false; //Gets set to true if there are segments loaded.
    this.hasStart = objectJson.HasStart;
    this.hasTranscript = false; //Gets set to true if a transcript gets loaded.
    this.hideClipMode = objectJson.HideClipMode;
    this.highestQuality = 0;
    this.interactives = objectJson.Interactives;
    this.selectedQuality = 0;
    this.initialMainTabSet = false; //This gets set to true once we have determined what the main initial tab is (if there is one) based on if there is transcript or segments.
    this.isLoaded = false; //gets set to true when the video metadata loads.
    this.languageCode = objectJson.OriginalLanguageCode;
    this.languages = objectJson.Languages;
    this.lastSuccessfulUuid = "";
    this.liveScreening = objectJson.LiveScreening;
    this.loadedData = false; //this gets set to true when we successfully load the data on a video.
    this.loadedDataComplete = false; //set to true when the loaded data function completes.
    this.logRequestUrl = objectJson.LogRequestUrl;
    this.logViewTimeUrl = objectJson.LogViewTimeUrl;
    this.mobileMenuOpen = false;
    this.muted = objectJson.Muted;
    this.noControls = objectJson.NoControls;
    this.noTabs = false; //set to true if we never show any trab s(i.e. maintain transcriptless 4ever)
    this.noTabsAlways = false; //set to true when called from loaddata so that we never exit noTabs due to screen resize.
    this.notTabsTranscriptState = true; //This gets set to whatever the transcript expanded state is when you enter no tabs.
    this.organizationId = objectJson.OrganizationId;
    this.originalLanguageCode = objectJson.OriginalLanguageCode;
    this.parentKey = "";
    this.parentUrl = "";
    this.performingAutoScroll = false; //when auto scrolling is occuring, this gets set to true.
    this.playerLoaded = false; //this gets set to true when the player successfully has loaded.
    this.playBackPercentage = 0; //we have currently played nothing back.
    this.playState = false; //we are not currently playing.
    this.preRoll = objectJson.PreRoll;
    this.preRollShowClickTime = objectJson.PreRollShowClickTime;
    this.preRollSkippable = objectJson.PreRollSkippable;
    this.preRollSkipTime = objectJson.PreRollSkipTime;
    this.qualityLevels = null; //set to the quality levels on load for video.js / cloudflare.  Empty on Azure.
    this.receivedRequest = false; //gets set to true when we receive a request analytics log.
    this.receivedRequestError = false; //gets set to true if error trying to get request.  Without this, we cannot log any other analytics.
    this.recordAnalytics = objectJson.RecordAnalytics;
    this.recordedViewBlocks = new Array(); //this keeps track of view block sends to make sure we don't cross the streams when updating view blocks.  When a successful view block is recorded, the uuid gets pushed into this array.
    this.recordedViewBlocksFailed = new Array();
    this.requestId = ""; //the request id we receive when we log analytics request to mark all future request with.
    this.relatedContentSearchObjectId = objectJson.RelatedContentSearchObjectId; //Search Object id for related search if it exsts.
    this.relatedSearchExecuted = false; //gets set to true when the related search is run.
    this.relatedSearchPrimed = false;
    this.reloadCount = 0; //will get incremented when we reload due to error and no more reloads after 3 errors in a single session.
    this.reloading = false;
    this.reloadingQuality = false;
    this.reloadTime = 0
    this.rewindSkipAmount = objectJson.RewindSkipAmount;
    this.safariCount = 0; //So named because safari was first with bug, this helps during load data to know the number of times we have retried.
    this.searchPreTab = null; //This is the tab the user was on before they clicked the search button.
    this.searchExecuted = false; //This gets set to true the first time a search is executed.
    this.searchRequestKey = objectJson.SearchRequestKey; //This is the key we pass to the search end point which authorizes us to search.
    this.searchString = objectJson.SearchString;
    this.segments = objectJson.Segments;
    this.scrubber = objectJson.Scrubber;
    this.scrubberOff = false; //set to true to turn off accidental scrubbing while in overlays or what not.
    this.scrubbing = false; //Tells us if we have started scrubbing or not which is mouse hover over scrubber.
    this.sessionId = objectJson.SessionId;
    this.showTitle = objectJson.Configuration.ShowTitle;
    this.source = objectJson.Source;
    this.currentSrc = null;
    this.dashSource = objectJson.DashSource;
    this.tabsShutDown = false; //set to true when tabs are shut down.
    this.timeJumpControls = objectJson.Configuration.TimeJumpControls;
    this.usePlayerQualitySelector = objectJson.Configuration.UsePlayerQualitySelector;
    this.titleOverride = objectJson.TitleOverride;
    this.toggleTranscript = objectJson.ToggleTranscript;
    this.touch = false; //set to true if we detect a touch event which lets us know we are on a touch device and to have different behavior.
    this.touchStart = false; //set to true when a touch event is firing.
    this.transcript = objectJson.Transcript;
    this.transcriptExpanded = true; //set to false whenever transciprt is dropped.
    this.transcriptlessForced = false; //set to true if transcript has been forced off by embed.js
    this.transcriptTimeStamps = new Array(); //This will get populated when a transcript gets built which is just a list of all segment time stamps.
    this.type = objectJson.Type;
    this.useSecondRewindSkip = objectJson.Configuration.UseSecondRewindSkip;
    this.secondRewindSkipAmount = objectJson.Configuration.SecondRewindSkipAmount;
    this.videoEnd = objectJson.End; //passed in clip mode end time
    this.videoEndOg = objectJson.End;
    this.videoIdentifier = objectJson.ObjectId;
    this.videoOnly = objectJson.Configuration.VideoOnly; //tells is if this the video player only, no transcript or whatever.
    this.videoStart = objectJson.Start; //passed in clip mode start time
    this.videoStartOg = objectJson.Start;
    this.viewBlockId = ""; //this will get set to a new uuid each time the video starts playing a new block.
    this.viewStart = -1; //prime for analytics auto logging and where we did we start viewing.
    this.viewBlockLogLast = -1;
    this.viewPortHeight = 0; //set to the view port height of the parent.
    this.volumeBarDown = false; //set to true when volume bar button is mouse downed.
    this.volumeBarDrag = false; //set to true when volume bar is happening.
    this.mouseoverTimeout = null;
    this.vtocLoaded = false;
    this.init();
    this.mimetypesKind = {
        opus: 'video/ogg',
        ogv: 'video/ogg',
        mp4: 'video/mp4',
        mov: 'video/mp4',
        m4v: 'video/mp4',
        mkv: 'video/x-matroska',
        m4a: 'audio/mp4',
        mp3: 'audio/mpeg',
        aac: 'audio/aac',
        caf: 'audio/x-caf',
        flac: 'audio/flac',
        oga: 'audio/ogg',
        wav: 'audio/wav',
        m3u8: 'application/x-mpegURL',
        mpd: 'application/dash+xml',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        png: 'image/png',
        svg: 'image/svg+xml',
        webp: 'image/webp'
    };
}
; (function ($) {
    CMPL.prototype = {
        addTranscriptSegments: function (transcript, segments) {
            //Segments create paragraph breaks. We model this by splliting up the paragraphs in a transcript and insert the segments as new paragraphs.


            //Set segstart to false.
            for (var i = 0; i < transcript.Paragraphs.length; i++) {
                var paragraph = transcript.Paragraphs[i];
                paragraph.isSeg = false;
                paragraph.segName = "";
            }



            for (var i = 0; i < segments.length; i++) {
                var segment = segments[i];
                var segStart = this.convertTimestampToSeconds(segment.TimeStamp);
                var paragraphFound = false; //Once we find a paragraph to put this segment, we mark this as true.  If we never find one, we will have to create one.
                var doubleDownSegments = false;
                for (var p = 0; p < transcript.Paragraphs.length; p++) {
                    var paragraph = transcript.Paragraphs[p];
                    var nextParagraph = null;
                    if (p + 1 < transcript.Paragraphs.length) {
                        nextParagraph = transcript.Paragraphs[p + 1];
                    }


                   
                    var paraStart = this.convertTimestampToSeconds(paragraph.TimeStamp);
                    var nextParaStart = 0;
                    if (nextParagraph) {
                        nextParaStart = this.convertTimestampToSeconds(nextParagraph.TimeStamp);
                    }

                    var paraEnd = paragraph.TimeStamp; //set end to start meaning 0 time on this paragraph initiall.
                    if (transcript.Paragraphs.length > p + 1) {
                        //If there is another paragraph after this paragraph, then this paragraph actually ends when the next starts
                        paraEnd = this.convertTimestampToSeconds(transcript.Paragraphs[p + 1].TimeStamp);
                    }
                    else {
                        //In this case, we need to try and figure out when this paragraph ends based on its segments if possible.
                        //This means we are looking at the last paragraph in the list, and we set the end time to be the end time of the last VTT segment timestamp.
                        if (paragraph.Segments.length) {
                            var lastSegment = paragraph.Segments[paragraph.Segments.length - 1];
                            paraEnd = this.convertTimestampToSeconds(lastSegment.EndTimeStamp)
                        }
                    }

                    if (paraStart <= segStart && paraEnd > segStart) {
                        paragraphFound = true; //Mark that this segment is going on a paragraph somewhere.
                        //We are inside this paragraph
                        if (paraStart == segStart) {
                            paragraph.isSeg = true;
                            paragraph.segName = segment.Title;
                        }
                        else {
                            //We need to split and insert.
                            var prevPara = {};
                            prevPara.TimeStamp = paragraph.TimeStamp;
                            prevPara.Speaker = paragraph.Speaker;
                            prevPara.isSeg = paragraph.isSeg;
                            prevPara.segName = paragraph.segName;
                            prevPara.Segments = new Array();
                            var nextPara = {};
                            nextPara.Speaker = paragraph.Speaker;
                            nextPara.isSeg = true;
                            nextPara.segName = segment.Title;
                            nextPara.Segments = new Array();
                            nextPara.TimeStamp = null;

                            if (paragraph.Segments.length == 0) {
                                //Break out of loop, this is not a valid paragraph, has no segments, and this segment is inbetween apparently.

                                //here we have a specialty case of stacking segments with no real paragraphs between.
                                //This happens if you have back to back segments without any actual transcript between them.
                                nextPara.TimeStamp = segment.TimeStamp;
                                doubleDownSegments = true;

                            }
                            else {
                                for (var z = 0; z < paragraph.Segments.length; z++) {
                                    var seg = paragraph.Segments[z];

                                    var parasegStart = this.convertTimestampToSeconds(seg.TimeStamp);
                                    var parasegEnd = this.convertTimestampToSeconds(seg.EndTimeStamp);

                                    if (parasegEnd <= segStart) {
                                        prevPara.Segments.push(seg);
                                        if (nextPara.TimeStamp == null) {
                                            if (nextParagraph != null && (z == paragraph.Segments.length - 1 || paragraph.Segments.length == 0)) {
                                                nextParagraph.isSeg = true;
                                                nextParagraph.segName = segment.Title;
                                            }
                                        }
                                    }
                                    else {
                                        //In this case, we may want to split up the seg so that you can visually see it has been split.
                                        if (parasegStart < segStart) {


                                            //This is a splitsy scenario.  
                                            var totalSegTime = parasegEnd - parasegStart;
                                            //Time before break.
                                            var timeBefore = segStart - parasegStart;

                                            //Split this segment up by spaces.
                                            var fullSegLine = "";
                                            for (var line = 0; line < seg.Text.length; line++) {
                                                if (fullSegLine == '') {
                                                    fullSegLine += seg.Text[line];
                                                }
                                                else {
                                                    fullSegLine += ' ' + seg.Text[line];
                                                }
                                            }

                                            if (fullSegLine == "") {
                                                //seg is empty anyways so *shrug*
                                                nextPara.Segments.push(seg);
                                            }
                                            else {
                                                var initSplitsy = fullSegLine.split(' ');
                                                //Remove any empty strings from splitsy before we continue so they don't mess things up.
                                                var splitsy = new Array();
                                                for (var g = 0; g < initSplitsy.length; g++) {
                                                    if (initSplitsy[g].trim() != "") {
                                                        splitsy.push(initSplitsy[g]);
                                                    }
                                                }
                                                if (splitsy.length == 1) {
                                                    //no way to split, so repeat on both sides!
                                                    //This will be down segment, OG seg goes up.
                                                    var newSeg = {};
                                                    newSeg.TimeStamp = segment.TimeStamp;
                                                    newSeg.EndTimeStamp = seg.EndTimeStamp;
                                                    newSeg.Text = new Array();
                                                    newSeg.Text.push('... ' + fullSegLine);
                                                    newSeg.Line = '... ' + fullSegLine;
                                                    newSeg.RealEndTimesStamp = this.convertRealTimestampToClippedTimestamp(newSeg.EndTimeStamp);
                                                    newSeg.RealTimeStamp = this.convertRealTimestampToClippedTimestamp(newSeg.TimeStamp);
                                                    newSeg.Speaker = seg.Speaker;
                                                    newSeg.VTTTimeStamp = this.convertTimeStampToVTT(newSeg.TimeStamp) + ' --> ' + this.convertTimeStampToVTT(newSeg.EndTimeStamp);

                                                    seg.EndTimeStamp = segment.TimeStamp;
                                                    seg.RealEndTimesStamp = this.convertRealTimestampToClippedTimestamp(seg.EndTimeStamp);
                                                    seg.VTTTimeStamp = this.convertTimeStampToVTT(seg.TimeStamp) + ' --> ' + this.convertTimeStampToVTT(seg.EndTimeStamp);
                                                    seg.Text = new Array();
                                                    seg.Text.push(fullSegLine + ' ...');
                                                    seg.Line = fullSegLine + ' ...';
                                                }
                                                else {
                                                    //Create a new segment for splitting.
                                                    //This will be the down segment.  The OG segment is the "up segment"
                                                    var newSeg = {};
                                                    newSeg.TimeStamp = segment.TimeStamp;
                                                    newSeg.EndTimeStamp = seg.EndTimeStamp;
                                                    newSeg.Text = new Array();
                                                    newSeg.RealEndTimesStamp = this.convertRealTimestampToClippedTimestamp(newSeg.EndTimeStamp);
                                                    newSeg.RealTimeStamp = this.convertRealTimestampToClippedTimestamp(newSeg.TimeStamp);
                                                    newSeg.Speaker = seg.Speaker;
                                                    newSeg.VTTTimeStamp = this.convertTimeStampToVTT(newSeg.TimeStamp) + ' --> ' + this.convertTimeStampToVTT(newSeg.EndTimeStamp);

                                                    seg.EndTimeStamp = segment.TimeStamp;
                                                    seg.RealEndTimesStamp = this.convertRealTimestampToClippedTimestamp(seg.EndTimeStamp);
                                                    seg.VTTTimeStamp = this.convertTimeStampToVTT(seg.TimeStamp) + ' --> ' + this.convertTimeStampToVTT(seg.EndTimeStamp);

                                                    //other copy variables go here..... what are they?
                                                    var percentBefore = timeBefore / totalSegTime; //This is percentage before break.
                                                    var unitsOfPercentage = 1 / splitsy.length; //How much does each word consume of the percentage?
                                                    var topLine = " ";
                                                    var bottomLine = "... ";
                                                    var consumedPercentage = 0;
                                                    var switchOver = false;
                                                    seg.Text = new Array();
                                                    for (var h = 0; h < splitsy.length; h++) {
                                                        if (consumedPercentage < percentBefore) {
                                                            //If there is only one word left, always put it on the other side of the split.
                                                            if (h + 1 == splitsy.length) {
                                                                bottomLine += ' ' + splitsy[h];
                                                            }
                                                            else {
                                                                topLine += ' ' + splitsy[h];
                                                            }

                                                            consumedPercentage += unitsOfPercentage;

                                                        }
                                                        else {
                                                            if (!switchOver) {
                                                                switchOver = true;
                                                                topLine += ' ...';
                                                            }
                                                            bottomLine += ' ' + splitsy[h];
                                                        }
                                                    }

                                                    seg.Text.push(topLine);
                                                    seg.Line = topLine;
                                                    newSeg.Text.push(bottomLine + ' ');
                                                    newSegLine = bottomLine + ' ';
                                                    prevPara.Segments.push(seg);
                                                    nextPara.Segments.push(newSeg);
                                                }
                                            }


                                        }
                                        else {
                                            nextPara.Segments.push(seg);
                                        }
                                        if (nextPara.TimeStamp == null) {
                                            nextPara.TimeStamp = seg.TimeStamp;
                                        }
                                    }
                                }


                            }
                            //Create a copy and insert.
                            if (nextParagraph == null || !nextParagraph.isSeg || doubleDownSegments) {
                                var newTransParas = new Array();
                                for (var z = 0; z < transcript.Paragraphs.length; z++) {
                                    if (transcript.Paragraphs[z].TimeStamp === prevPara.TimeStamp) {
                                        newTransParas.push(prevPara);
                                        newTransParas.push(nextPara);
                                    }
                                    else {
                                        newTransParas.push(transcript.Paragraphs[z]);
                                    }
                                }

                                transcript.Paragraphs = newTransParas;
                                p = transcript.Paragraphs.length + 2; //break out of the loop.
                            }
                        }
                    }
                }

                if (!paragraphFound) {
                    //This means that this segment has no home paragraph and would otherwise then not show up on the screen.
                    //We therefore need to create an empty paragraph to show it and place that paragraph in the right spot.
                    //This can only happen if the segment is occurring before all paragraphs or after all paragraphs or there are no paragraphs at all... i.e a blank transcript.
                    //keep in mind the use case of multiple segments at the start or end that exist outside of actual VTT paragraphs.  They could stack up.
                    //So, when inseting, have to keep in mind to insert before paragraphs.
                    var newPara = {};
                    newPara.TimeStamp = segment.TimeStamp;
                    newPara.Speaker = "";
                    newPara.isSeg = true;
                    newPara.segName = segment.Title;
                    newPara.Segments = new Array();


                    var segTime = this.convertTimestampToSeconds(segment.TimeStamp);
                    if (transcript.Paragraphs.length) {
                        //This will copy exiting paragraphs + this new one into the list and then set that AS the list.
                        var newTransParas = new Array();
                        var inserted = false; //Set to true when an insertr happens.  If it doesn't happen, we insert at the end because segment is after all paragraphs.
                        for (var p = 0; p < transcript.Paragraphs.length; p++) {
                            var paragraph = transcript.Paragraphs[p];
                            var paraTime = this.convertTimestampToSeconds(paragraph.TimeStamp);

                            if (segTime < paraTime && !inserted) {
                                newTransParas.push(newPara);
                                inserted = true;
                            }

                            newTransParas.push(paragraph);
                        }

                        //If we couldn't insert it somewhere in the middle of existing paragraphs, we insert it on the end.
                        if (!inserted) {
                            newTransParas.push(newPara);
                        }

                        //set as new list of paragraphs.
                        transcript.Paragraphs = newTransParas;
                    }
                    else {
                        //in this case, there are no paragraphs at all, so we just need to insert this paragraph.
                        var newTransParas = new Array();
                        newTransParas.push(newPara);
                        transcript.Paragraphs = newTransParas;
                    }

                }
            }
            return transcript;
        },
        autoScrollChatBox: function ()
        {
            if (this.autoScrollChat && this.chatTabContent.is(":visible"))
            {
                this.performingAutoScroll = true;
                var el = $(this.chatDisplay)[0];
                el.scrollTop = el.scrollHeight;
            }
        },
        autoScrollTranscript: function (containerElem, currentElement, nextElement) {
            if (this.autoScroll && this.transcriptTabActive()) {
                this.autoScrollTranscriptFunc(containerElem, currentElement, nextElement);
            }
        },
        autoScrollTranscriptFunc: function (containerElem, currentElement, nextElement) {
            if ($(nextElement).length && $(containerElem).length) {
                if ($(nextElement).position().top > 0 && $(nextElement).position().top + $(nextElement).height() <= $(containerElem).height()) {
                    //The next element is also on screen so nothing to see here.
                }
                else {
                    //The next element is not so we need to scroll down.
                    this.autoScrollDownToElement(containerElem, nextElement);
                }
            }
        },
        autoScrollDownToElement: function (containerElem, elemToScrollTop) {
            //This is used to scroll during auto scroll.  This makes sure that the element passed in is cleanly on the top.
            //Before we scroll, we set the flag that an autoscroll is taking place so that when the scroll event fires,
            //it won't turn off autoscroll.
            this.performingAutoScroll = true;
            $(containerElem).scrollTop($(elemToScrollTop).position().top + $(containerElem).scrollTop() - this.tabsBox.outerHeight(true) - 8);
        },
        autoScrollTranscriptToHighlight: function () {
            if (this.tabAreaContainer.length && $('.transcript-highlight').length) {
                this.autoScrollDownToElement(this.tabAreaContainer, $('.transcript-highlight'));
            }
        },
        buildChatTab: function () {
            //If the chat tab even exists.

           
            if (this.chatTabContent.length)
            {
                $('.chat_message_bubble').each(function () {
                    $(this).remove();
                });

                $('.chat_section_header').each(function () {
                    $(this).remove();
                });

                //Cycle over all the messages and put them on the screen in seconds order but all of them are hidden.

                //Determine if there is a pre-broadcast section.
                var hasPreBroadcast = false;
                for (var i = 0; i < this.chat.Messages.length; i++) {
                    if (this.chat.Messages[i].Seconds < 0) {
                        hasPreBroadcast = true;
                    }
                }

                var hasPostBroadcast = false;
                for (var i = 0; i < this.chat.Messages.length; i++) {
                    if (this.chat.Messages[i].Seconds > this.clippedDuration()) {
                        hasPostBroadcast = true;
                    }
                }

                var preHeader = false;
                var postHeader = false;
                var duringHeader = false;
                for (var i = 0; i < this.chat.Messages.length; i ++)
                {
                    

                    var message = this.chat.Messages[i];
                    var currentTime = this.clippedTimeFromCurrentTime();

                    var hiddenForce = this.chatMode == 'live' && message.Seconds >= 0 && message.Seconds > currentTime ? "hidden-force" : "";
                    var ogBadge = message.OGBadgeUrl != "" && message.OGBadgeUrl != null ? `<img class="chat_badge" src="${message.OGBadgeUrl}" title="${message.OGBadgeTitle}" />` : ``;
                    var questionBadge = message.QuestionBadgeUrl != "" && message.QuestionBadgeUrl != null ? `<img class="chat_badge" src="${message.QuestionBadgeUrl}" title="${message.QuestionBadgeTitle}" />` : ``;
                    var badge = message.BadgeUrl != "" && message.BadgeUrl != null ? `<img class="chat_badge" src="${message.BadgeUrl}" title="${message.BadgeTitle}" />` : ``;
                    var seconds = message.Seconds;
                    var secondsIn = message.Seconds >= 0 ? "+" + this.convertSecondsToReadable(message.Seconds) : "";
                    if (message.Seconds > this.clippedDuration()) {
                        secondsIn = secondsIn;
                    }

                    //Determine if this is a pre or post broadcast.
                    var prePost = "";
                    if (message.Seconds < 0 || message.Seconds > this.clippedDuration()) {
                        prePost = "prepost";
                    }

                    if (message.Seconds < 0 && !preHeader) {
                        //Write the preee header.
                        this.chatTabContent.append(`<div class="chat_section_header">Pre-Broadcast</div>`);
                        preHeader = true;
                    }
                    else if (message.Seconds >= 0 && message.Seconds < this.clippedDuration() && !duringHeader) {
                        if (this.chatMode == 'live') {
                            this.chatTabContent.append(`<div class="chat_section_header">Replay</div>`);
                        }
                        else
                        {
                            this.chatTabContent.append(`<div class="chat_section_header">During Broadcast</div>`);
                        }
                        duringHeader = true;
                    }
                    else if (message.Seconds > this.clippedDuration() && !postHeader && this.chatMode != 'live') {
                        this.chatTabContent.append(`<div class="chat_section_header">Post-Broadcast</div>`);
                        postHeader = true;
                    }

                    if (message.Reply)
                    {
                        var append = "";
                        if (this.chatMode == 'live' || seconds < 0 || seconds >= this.clippedDuration()) {
                            append = `<div class="chat_message_bubble ${hiddenForce} ${prePost}" data-seconds="${message.Seconds}">`;
                        }
                        else {
                            append = `<div tabindex="0" class="chat_message_bubble ${hiddenForce} ${prePost}" role="button" onclick="cmpl.setTimeFromTimeStamp('${this.convertSecondsToRealTimeStamp(seconds)}');" aria-label="Jump media to chat message" data-seconds="${message.Seconds}">`;
                        }
                        append += `
                                <div class="chat_message_bubble_header">
                                    <span>Reply to ${ogBadge}${message.OGUser}</span> <span>${secondsIn}</span>
                                </div>
                                <div class="chat_message_short">
                                    ${message.OGMessage}
                                </div>
                                <div class="chat_message_bubble_header">
                                    <span>${badge}${message.User}</span>
                                </div>
                                ${message.Message}
                           </div>
                        `;
                        this.chatTabContent.append(append);
                    }
                    else if (message.Question)
                    {
                        var append = "";
                        if (this.chatMode == 'live' || seconds < 0 || seconds >= this.clippedDuration()) {
                            append = `<div class="chat_message_bubble ${hiddenForce} ${prePost} chat_question" data-seconds="${message.Seconds}">`;
                        }
                        else {
                            append = `<div tabindex="0" class="chat_message_bubble ${hiddenForce} ${prePost} chat_question" role="button" onclick="cmpl.setTimeFromTimeStamp('${this.convertSecondsToRealTimeStamp(seconds)}');" aria-label="Jump media to chat message" data-seconds="${message.Seconds}">`;
                        }
                        append += `
                                <div class="chat_message_bubble_header">
                                    <span>Question from ${badge}${message.User}</span> <span>${secondsIn}</span>
                                </div>
                                ${message.Message}
                           </div>
                        `;
                        this.chatTabContent.append(append);
                    }
                    else if (message.Answer)
                    {
                        var append = "";
                        if (this.chatMode == 'live' || seconds < 0 || seconds >= this.clippedDuration()) {
                            append = `<div class="chat_message_bubble ${hiddenForce} ${prePost} chat_answer" data-seconds="${message.Seconds}">`;
                        }
                        else {
                            append = `<div tabindex="0" class="chat_message_bubble ${hiddenForce} ${prePost} chat_answer" role="button" onclick="cmpl.setTimeFromTimeStamp('${this.convertSecondsToRealTimeStamp(seconds)}');" aria-label="Jump media to chat message" data-seconds="${message.Seconds}">`;
                        }
                        append += `
                                <div class="chat_message_bubble_header">
                                    <span>Answer to ${questionBadge}${message.QuestionUser}</span> <span>${secondsIn}</span>
                                </div>
                                ${message.QuestionMessage}
                                <div class="chat_message_bubble_header">
                                    <span>${badge}${message.User}</span>
                                </div>
                                ${message.Message}
                           </div>
                        `;
                        this.chatTabContent.append(append);
                    }
                    else
                    {
                        var append = "";
                        if (this.chatMode == 'live' || seconds < 0 || seconds >= this.clippedDuration()) {
                            append = `<div class="chat_message_bubble ${hiddenForce} ${prePost}" data-seconds="${message.Seconds}">`;
                        }
                        else {
                            append = `<div tabindex="0" class="chat_message_bubble ${hiddenForce} ${prePost}" role="button" onclick="cmpl.setTimeFromTimeStamp('${this.convertSecondsToRealTimeStamp(seconds)}');" aria-label="Jump media to chat message" data-seconds="${message.Seconds}">`;
                        }
                        append += `
                                <div class="chat_message_bubble_header">
                                    <span>${badge}${message.User}</span> <span>${secondsIn}</span>
                                </div>
                                ${message.Message}
                           </div>
                        `;
                        this.chatTabContent.append(append);
                    }
                }

                if (this.chatMode == 'live') {
                    this.autoScrollChat = true;
                    //Scroll to the bottom automatically.
                    this.performingAutoScroll = true;
                    var el = $(this.chatDisplay)[0];
                    el.scrollTop = el.scrollHeight;
                }
                else {
                    this.autoScrollChat = false;
                }

            }
        },           
        buildContents: function () { },
        buildSegments: function () {
            this.segmentsTabContent.empty();
            this.shareSegments.empty();
            this.progressBarSegmentsContainer.empty();


            var anySegments = false;

            for (var i = 0; i < this.segments.length; i++) {
                if (this.segments[i].LanguageCode == this.languageCode || this.segments[i].LangaugeCode == this.originalLanguageCode) {
                    anySegments = true;
                    break;
                }
            }


            if (anySegments) {
                //This is two steps.  First is to build the Segments Tab
                //Then it is to build the segment scrubber.
                this.buildSegmentsScrubber();
                this.buildSegmentsTab();
                this.buildSegmentsShare();
                this.hasSegments = true;
                this.segmentsTabButton.show();
                this.segmentsDisplay.show();
                this.shareSegmentsRadio.show();
            }
            else {
                //Hide segments.
                this.segmentsTabButton.hide();
                this.segmentsDisplay.hide();
                this.hasSegments = false;
                this.shareSegmentsRadio.hide();
                this.buildSegmentsScrubber(); //We still call this to add a single segment to the scrubber bar which represents the full video.
            }

        },
        buildSegmentsScrubber: function () {
            //Clear the segments content.

            var languageSegments = this.populateLanguageSegments(); //first, we fish out the segments based on language we are using.


            //We use clipped milliseconds here instead of milliseconds because of clipping.   If there is no clipping, these values are the same.
            //Now, we need to sort by time stamp.
            if (languageSegments.length) {
                languageSegments.sort(function (a, b) { return a.milliseconds - b.milliseconds });

                for (var i = 0; i < languageSegments.length; i++) {

                    var languageSegment = languageSegments[i];
                    //We need to determine if this segment will even show up.
                    var startSecs = this.startSecs();
                    var endSecs = this.endSecs();
                    var hasSegment = true;


                    var thisDuration = this.segmentDuration(languageSegments, i);

                    //If duration is > 0 we must show.
                    if (thisDuration > 0) {

                        //Now, populate.
                        //We need to figure out the %age of total duration of a each segment.
                        //convert this duration to percentage of duration.
                        var percentage = 0;

                        if (this.clipMode) {
                            var clipDuration = endSecs - startSecs;
                            percentage = (thisDuration / clipDuration) * 100;
                        }
                        else {
                            percentage = (thisDuration / this.clippedDuration() * 100);
                        }

                        this.progressBarSegmentsContainer.append('<div class="progress-bar-segment" style="width:' + percentage + '%;"></div>');
                        if (i + 1 < languageSegments.length) {
                            this.progressBarSegmentsContainer.append('<div class="progress-bar-segment-spacer" style="width:2px"></div>');
                        }
                    }
                }
            }
            else {
                this.progressBarSegmentsContainer.append('<div class="progress-bar-segment" style="width:100%;"></div>');
            }
        },
        buildSegmentsShare: function () {

            var languageSegments = this.populateLanguageSegments(); //first, we fish out the segments based on language we are using.


            //Now, we need to sort by time stamp.
            if (languageSegments.length) {

                this.shareSegmentsRadio.show();
                languageSegments.sort(function (a, b) { return a.milliseconds - b.milliseconds });
                var segmentCount = 0;
                for (var i = 0; i < languageSegments.length; i++) {

                    var languageSegment = languageSegments[i];
                    var thisDuration = this.segmentDuration(languageSegments, i);

                    if (thisDuration > 0) {
                        segmentCount++;
                        var segStart = languageSegment.TimeStamp;
                        var startSecs = this.startSecs();
                        if (this.convertTimestampToSeconds(segStart) < startSecs) {
                            segStart = this.convertMilliSecondsToTimeStamp(startSecs * 1000);
                        }
                        var segStartSecs = this.convertTimestampToSeconds(segStart);
                        var segEnd = segStartSecs + thisDuration;

                        //Now, populate.
                        if (languageSegments[i].Description) {
                            this.shareSegments.append(`
                                <div class="share-segments flex flex-col segment-share-container" role="button" aria-label="` + languageSegments[i].Title + `" aria-pressed="false" tabindex="0" onclick="cmpl.setSegmentsClick(event);" onkeydown="cmpl.setSegmentsShareKeyboard(event, ` + i + `);">
                                    <input id="share-segment-` + i + `" type="checkbox" data-start="` + segStartSecs + `" data-end="` + segEnd + `" class="segment-share" name="share-segment-` + i + `" onclick="cmpl.setSegmentsShare(event, ` + i + `);" />
                                    <label for="share-segment-` + i + `" class="flex flex-col p-2 border bg-primary-white cursor-pointer h-full segment-share-label">
                                        <img class="w-full aspect-video mb-2" src="` + languageSegments[i].ThumbUrl + `" />
                                        <p class="text-secondary-dark"><span class="text-dark mr-1 font-medium">` + segmentCount + `</span><span class="text-dark mr-1 font-medium">` + languageSegments[i].Title + `</span></p>
                                        <p>` + languageSegments[i].Description + `</p>
                                    </label>
                                </div>`);
                        }
                        else {
                            this.shareSegments.append(`
                                <div class="share-segments flex flex-col segment-share-container" role="button" aria-label="` + languageSegments[i].Title + `" aria-pressed="false" tabindex="0" onclick="cmpl.setSegmentsClick(event);" onkeydown="cmpl.setSegmentsShareKeyboard(event, ` + i + `);">
                                    <input id="share-segment-` + i + `" type="checkbox" data-start="` + segStartSecs + `" data-end="` + segEnd + `" class="segment-share" name="share-segment-` + i + `" onclick="cmpl.setSegmentsShare(event, ` + i + `);" />
                                    <label for="share-segment-` + i + `" class="flex flex-col p-2 border bg-primary-white cursor-pointer h-full segment-share-label">
                                        <img class="w-full aspect-video mb-2" src="` + languageSegments[i].ThumbUrl + `" />
                                        <p class="text-secondary-dark"><span class="text-dark mr-1 font-medium">` + segmentCount + `</span><span class="text-dark mr-1 font-medium">` + languageSegments[i].Title + `</span></p>
                                    </label>
                                </div>`);
                        }
                    }
                }
            }
            else {
                this.shareSegmentsRadio.hide();
            }
        },
        buildSegmentsTab: function () {

            //Clear the segments content.
            this.segmentsTabContent.empty();

            var languageSegments = this.populateLanguageSegments(); //first, we fish out the segments based on language we are using.

            //Now, we need to sort by time stamp.
            if (languageSegments.length) {

                languageSegments.sort(function (a, b) { return a.milliseconds - b.milliseconds });
                var segmentNumber = 0;
                for (var i = 0; i < languageSegments.length; i++) {

                    var languageSegment = languageSegments[i];
                    var thisDuration = this.segmentDuration(languageSegments, i);
                    if (thisDuration > 0) {
                        segmentNumber++;
                        //We may need to adjust the time stamp if we are in clip mode and the actual time stamp is less than start secs.
                        var segStart = languageSegment.TimeStamp;
                        var startSecs = this.startSecs();
                        if (this.convertTimestampToSeconds(segStart) < startSecs) {
                            segStart = this.convertMilliSecondsToTimeStamp(startSecs * 1000);
                        }

                        var thumbDiv = "";
                        if (languageSegments[i].ThumbUrl == null || languageSegments[i].ThumbUrl == "") {
                            thumbDiv = `<div class="relative group mr-2 mr-xsm-0 mb-xsm-2 flex-none h-min">
                                            <div class="bg-primary-dark text-white text-xsm px-1 py-0 rounded-sm z-20">` + this.convertTimeStampToReadable(segStart) + `</div>
                                        </div>`;
                        }
                        else {
                            thumbDiv = `<div class="relative group mr-2 mr-xsm-0 mb-xsm-2 flex-none h-min">
                                            <img class="w-36 aspect-video z-10 border w-xsm-full" src="` + languageSegments[i].ThumbUrl + `">
                                                <div class="bg-primary-dark text-white text-xsm px-1 py-0 rounded-sm z-20 absolute bottom-1 right-1">` + this.convertTimeStampToReadable(segStart) + `</div>
                                        </div>`;
                        }

                        

                        //Now, populate.
                        this.segmentsTabContent.append(`
                        <a href="#" onkeydown="cmpl.segmentKeyDown(event);" onclick="cmpl.setTimeFromTimeStamp('` + languageSegment.RealTimeStamp + `');" class="flex flex-row p-2 border border-secondary-light bg-secondary-light mb-2 group hover:bg-tertiary-light flex-xsm-column segment-tab-segment basic-focus" tabindex="0" for="flexCheckDefault" role="button" aria-label="Play ` + languageSegments[i].Title + `">
                            ` + thumbDiv + `
                            <div class="flex flex-col text-secondary-dark">
                                <div class="flex flex-row text-secondary-dark mb-1">
                                    <span class="text-dark mr-1 font-medium">` + (segmentNumber) + `:</span>
                                    <span class="text-dark mr-1 font-medium">` + languageSegments[i].Title + `</span>
                                </div>
                                <p>` + (languageSegments[i].Description == null ? "" : languageSegments[i].Description) + `</p>
                            </div>
                       </a>`);

                    }
                }
            }

        },
        buildShareLinks: function () {
            //This function sets the share links for each of the shares to include the time stamps or urls (or whatever) that will be shared when the user clicks on one of the links.

            //First, determine what type of share we are taking.
            var entireMediaShare;
            var shareStart;
            var shareEnd;
            var startSecs = this.startSecs();
            var endSecs = this.endSecs();

            if (this.clipEntireRadio.is(":checked")) {
                entireMediaShare = true;
            }
            else {
                if (this.clipSegmentsRadio.is(":checked")) {
                    entireMediaShare = false;
                    //Start and end will equal selected segments or entire video if none are selected.
                    shareStart = startSecs;
                    shareEnd = endSecs;

                    var segmentsShares = $('.segment-share');

                    var startFound = false;
                    for (var i = 0; i < segmentsShares.length; i++) {

                        if ($(segmentsShares[i]).is(":checked")) {
                            if (!startFound) {
                                shareStart = $(segmentsShares[i]).data("start");
                                shareEnd = $(segmentsShares[i]).data("end");
                                startFound = true;
                            }
                            else {
                                shareEnd = $(segmentsShares[i]).data("end");
                            }
                        }
                    }

                }
                else if (this.clipCustomRadio.is(":checked")) {
                    entireMediaShare = false;

                    //Will equal the values inside the text box.
                    if (this.isValidTimeStamp(this.clipCustomStartTime.val()) !== "") {
                        shareStart = this.convertTimestampToSeconds(this.clipCustomStartTime.val());
                    }

                    if (this.isValidTimeStamp(this.clipCustomEndTime.val()) !== "") {
                        shareEnd = this.convertTimestampToSeconds(this.clipCustomEndTime.val());
                    }

                    if (shareEnd <= shareStart) {
                        shareEnd = endSecs;
                    }
                }
            }


            //We have now calculated what the share links need to be.
            if (entireMediaShare) {
                this.facebookShareTabButton.prop('href', 'https://facebook.com/sharer/sharer.php?u=' + encodeURIComponent(this.parentUrl));
                this.twitterShareTabButton.prop('href', 'https://twitter.com/intent/tweet/?text=' + encodeURIComponent(this.title.text()) + '&url=' + encodeURIComponent(this.parentUrl));
                this.linkedinShareTabButton.prop('href', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(this.parentUrl));
                this.emailShareTabButton.prop('href', 'mailto:?subject=' + encodeURIComponent(this.title.text()) + '&body=' + encodeURIComponent(this.parentUrl));
                this.shareLinkText.val(this.parentUrl);
            }
            else {
                var customQuery = "?";
                if (this.parentUrl.includes("?")){
                    customQuery = "&";
                }
                if (shareStart != startSecs && shareEnd != endSecs) {
                    //In these cases, we share but append Start and End where appropriate.
                    this.facebookShareTabButton.prop('href', 'https://facebook.com/sharer/sharer.php?u=' + encodeURIComponent(this.parentUrl + customQuery +'start=' + this.convertSecondsToTimeStamp(shareStart) + '&end=' + this.convertSecondsToTimeStamp(shareEnd)));
                    this.twitterShareTabButton.prop('href', 'https://twitter.com/intent/tweet/?text=' + encodeURIComponent(this.title.text()) + '&url=' + encodeURIComponent(this.parentUrl + customQuery +'start=' + this.convertSecondsToTimeStamp(shareStart) + '&end=' + this.convertSecondsToTimeStamp(shareEnd)));
                    this.linkedinShareTabButton.prop('href', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(this.parentUrl + customQuery + 'start=' + this.convertSecondsToTimeStamp(shareStart) + '&end=' + this.convertSecondsToTimeStamp(shareEnd)));
                    this.emailShareTabButton.prop('href', 'mailto:?subject=' + encodeURIComponent(this.title.text()) + '&body=' + encodeURIComponent(this.parentUrl + customQuery +'start=' + this.convertSecondsToTimeStamp(shareStart) + '&end=' + this.convertSecondsToTimeStamp(shareEnd)));
                    this.shareLinkText.val(this.parentUrl + customQuery + 'start=' + this.convertSecondsToTimeStamp(shareStart) + '&end=' + this.convertSecondsToTimeStamp(shareEnd));
                }
                else if (shareStart != startSecs) {
                    this.facebookShareTabButton.prop('href', 'https://facebook.com/sharer/sharer.php?u=' + encodeURIComponent(this.parentUrl + customQuery + 'start=' + this.convertSecondsToTimeStamp(shareStart)));
                    this.twitterShareTabButton.prop('href', 'https://twitter.com/intent/tweet/?text=' + encodeURIComponent(this.title.text()) + '&url=' + encodeURIComponent(this.parentUrl + customQuery + 'start=' + this.convertSecondsToTimeStamp(shareStart)));
                    this.linkedinShareTabButton.prop('href', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(this.parentUrl + customQuery + 'start=' + this.convertSecondsToTimeStamp(shareStart)));
                    this.emailShareTabButton.prop('href', 'mailto:?subject=' + encodeURIComponent(this.title.text()) + '&body=' + encodeURIComponent(this.parentUrl + customQuery + 'start=' + this.convertSecondsToTimeStamp(shareStart)));
                    this.shareLinkText.val(this.parentUrl + customQuery + 'start=' + this.convertSecondsToTimeStamp(shareStart));
                }
                else if (shareEnd != endSecs) {
                    this.facebookShareTabButton.prop('href', 'https://facebook.com/sharer/sharer.php?u=' + encodeURIComponent(this.parentUrl + customQuery +'end=' + this.convertSecondsToTimeStamp(shareEnd)));
                    this.twitterShareTabButton.prop('href', 'https://twitter.com/intent/tweet/?text=' + encodeURIComponent(this.title.text()) + '&url=' + encodeURIComponent(this.parentUrl + customQuery + 'end=' + this.convertSecondsToTimeStamp(shareEnd)));
                    this.linkedinShareTabButton.prop('href', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(this.parentUrl + customQuery + 'end=' + this.convertSecondsToTimeStamp(shareEnd)));
                    this.emailShareTabButton.prop('href', 'mailto:?subject=' + encodeURIComponent(this.title.text()) + '&body=' + encodeURIComponent(this.parentUrl + customQuery + 'end=' + this.convertSecondsToTimeStamp(shareEnd)));
                    this.shareLinkText.val(this.parentUrl + customQuery + customQuery + 'end=' + this.convertSecondsToTimeStamp(shareEnd));
                }
                else {
                    //Same as if no start and end present.
                    this.facebookShareTabButton.prop('href', 'https://facebook.com/sharer/sharer.php?u=' + encodeURIComponent(this.parentUrl));
                    this.twitterShareTabButton.prop('href', 'https://twitter.com/intent/tweet/?text=' + encodeURIComponent(this.title.text()) + '&url=' + encodeURIComponent(this.parentUrl));
                    this.linkedinShareTabButton.prop('href', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(this.parentUrl));
                    this.emailShareTabButton.prop('href', 'mailto:?subject=' + encodeURIComponent(this.title.text()) + '&body=' + encodeURIComponent(this.parentUrl));
                    this.shareLinkText.val(this.parentUrl);
                }

            }
        },
        buildTranscript: function () {

            //Hide the transcript display and tabs until we determine that we have a transcript to show.
            this.transcriptTabButton.hide();
            this.transcriptDisplay.hide();

            if (this.transcript == null || this.transcript.Files == null || this.transcript.Files.length == 0) {
                this.hasTranscript = false;
                return;
            }


            this.transcriptArea.empty(); //clear the current transcript.
            this.transcriptTimeStamps = new Array();
            //Transcripts are all stored inside the json sent to us.  There is a single transcript object, and then under that are the paragraphs and segments for each language we want to get at.
            var transcript = null;
            for (var i = 0; i < this.transcript.Files.length; i++) {
                if (this.transcript.Files[i].LanguageCode == this.languageCode) {
                    //Deep copy so we don't mess with og in memory
                    transcript = { ...this.transcript.Files[i] };
                }
                else if (transcript == null && this.transcript.Files[i].LanguageCode == this.originalLanguageCode) {
                    //Set to original language if there is no other language.
                    //Deep copy so we don't mess with og in memory
                    transcript = { ...this.transcript.Files[i] };
                }
            }

            if (transcript == null) {
                this.hasTranscript = false;
                return;
            }

            var ios = (/iphone|ipod|ipad/i.test(navigator.userAgent.toLowerCase()));
            if (ios) {
                if (videoPlayer.textTracks() != null && videoPlayer.textTracks().length > 0) {
                    videoPlayer.removeRemoteTextTrack(videoPlayer.textTracks()[0]);
                }

                let captionOption = {
                    kind: 'captions',
                    srclang: transcript.languageCode,
                    label: transcript.LanguageDisplay,
                    id: videoPlayer.captionsTrack,
                    src: transcript.VTTUrl,
                    default: "default",
                    native: "native"
                    
                };
                videoPlayer.addRemoteTextTrack(captionOption);
                cmpl.closedCaptions.hide();
            } 

            //prep to insert segments.
            var languageSegments = this.populateLanguageSegments(); //first, we fish out the segments based on language we are using.



            //Saturate the transcript with segments.
            if (languageSegments.length) {
                transcript = this.addTranscriptSegments(transcript, languageSegments);
            }
            else {

                 for (var i = 0; i < transcript.Paragraphs.length; i++) {
                    transcript.Paragraphs[i].isSeg = false; //no segments.
                }
            }
            
            //Determine video showable times.
            var startSecs = this.startSecs();
            var endSecs = this.endSecs();


            if (transcript != null) {
                this.hasTranscript = true;
                //Show the transcript.
                this.transcriptTabButton.show();
                this.transcriptDisplay.show();
                var segmentIndex = 0;
                var loadedParagraphs = new Array();
                for (var para = 0; para < transcript.Paragraphs.length; para++) {

                    var paragraph = transcript.Paragraphs[para];

                    //Always determine if this paragraph is even going to show up!  For most videos, unless in clip mode or clip masking, the answer is yes, but this handles that case.
                    if (paragraph.TimeStamp) {
                        var paraSecs = this.convertTimestampToSeconds(paragraph.TimeStamp);
                        var paraStart = paragraph.TimeStamp;
                        if (paraSecs > endSecs) {
                            paragraph = null; //do not show later.
                        }
                        else if (paraSecs < startSecs) {
                            if (paragraph.Segments.length > 0) {
                                var lastSegment = paragraph.Segments[paragraph.Segments.length - 1];
                                var segSecs = this.convertTimestampToSeconds(lastSegment.TimeStamp);

                                if (segSecs < startSecs) {
                                    paragraph = null;
                                }
                            }
                            else {
                                //The paragraph has no segments.
                                paragraph = null;
                            }

                            //In this case, the paragraph starting time stamp and display will BE our video start.
                            paraStart = this.videoStart;
                        }
                    }
                    else {
                        paragraph = null;
                    }

                    if (paragraph != null) {

                        loadedParagraphs.push(paragraph);

                        //If the paragraph is marked as a segment, and there are any segments, put the segment into transcript.
                        if (paragraph.isSeg && languageSegments.length) {
                            segmentIndex++;
                            //Add a segment.
                            this.transcriptArea.append(`
                                <h3 class="font-medium mb-4 cursor-pointer transcript-chapter" tabindex="0" onkeydown="cmpl.transcriptKeyDown(event);" onclick="cmpl.setTimeFromTimeStamp('` + this.convertClippedTimeStampToRealTimeStamp(paraStart) + `');">` + (segmentIndex) + `: ` + paragraph.segName + `</h3>
                            `);
                        }
                        //If the paragraph is not marked as a segment, and there are segments, and this is the very first paragraph, we may need to print the segment
                        //that this paragraph belongs to.
                        else if (!paragraph.isSeg && languageSegments.length && loadedParagraphs.length == 1) {

                            //What should be there is greater than what is there, so we need to show segment.
                            segmentIndex++;
                            //Add a segment.
                            this.transcriptArea.append(`
                                <h3 class="font-medium mb-4 cursor-pointer transcript-chapter" tabindex="0" onkeydown="cmpl.transcriptKeyDown(event);" onclick="cmpl.setTimeFromTimeStamp('` + this.convertClippedTimeStampToRealTimeStamp(paraStart) + `');">` + (segmentIndex) + `: ` + languageSegments[segmentIndex - 1].Title + `</h3>
                            `);
                           
                        }

                        //We only execute this part if the paragraph is NOT a segment and itself contains VTT segments to show.
                        //otherwise we don't want to show this as what we are looking at is an empty chapter marker.
                        if (!paragraph.isSeg || (paragraph.isSeg && paragraph.Segments.length)) {
                            var paragraphHtml = '<h4 class="font-medium"><span class="mr-3">' + this.convertTimeStampToReadable(paraStart) + '</span>' + paragraph.Speaker + '</h4>';
                            this.transcriptArea.append(paragraphHtml);

                            var totalSegmentsHtml = '<p class="mb-4 transcript-paragraph">';
                            for (var seg = 0; seg < paragraph.Segments.length; seg++) {
                                var segment = paragraph.Segments[seg];

                                //Check the segment timestamp to see if it shows up or not.
                                var segSecs = this.convertTimestampToSeconds(segment.TimeStamp);
                                var nextSegSecs;
                                var segStart = segment.TimeStamp;
                                var segEnd = segment.RealEndTimeStamp; 
                                var segEndSecs = null;
                                if (!segEnd) {
                                    segEnd = segment.RealEndTimesStamp;
                                    segEndSecs = this.convertTimestampToSeconds(segment.RealEndTimesStamp);

                                } else {
                                    segEndSecs = this.convertTimestampToSeconds(segment.RealEndTimeStamp);
                                }
                                var segRealStart = segment.RealTimeStamp;
                                if (seg + 1 == paragraph.Segments.length) {
                                    if (para + 1 == transcript.Paragraphs.length) {
                                        nextSegSecs = endSecs;
                                    }
                                    else {
                                        if (transcript.Paragraphs[para + 1].TimeStamp) {
                                            nextSegSecs = this.convertTimestampToSeconds(transcript.Paragraphs[para + 1].TimeStamp);
                                        }
                                    }
                                }
                                else {
                                    nextSegSecs = this.convertTimestampToSeconds(paragraph.Segments[seg + 1].TimeStamp);
                                }

                                var includeSegment = true;


                                if (segSecs < startSecs) {
                                    segStart = this.videoStart;
                                    segRealStart = this.videoStart;
                                    if (nextSegSecs < startSecs) {
                                        includeSegment = false;
                                    }
                                }
                                else if (segSecs > endSecs) {
                                    includeSegment = false;
                                }

                                if (segEndSecs > endSecs) {
                                    endSeg = this.videoEnd;
                                }


                                if (includeSegment) {
                                    var innerSegmentHtml = '<span class="transcript-segment" onkeydown="cmpl.transcriptKeyDown(event);" tabindex="0" data-stamptime="' + segStart + '" onclick="cmpl.setTimeFromTimeStamp(\'' + segRealStart + '\');">';
                                    this.transcriptTimeStamps.push({ "timestamp": segStart, "milliseconds": this.convertTimestampToMilliseconds(segStart), "endtimestamp": segEnd, "endmilliseconds": this.convertTimestampToMilliseconds(segEnd) }); //this array is populated in order with segment time stamps to be used during highlighting procedures.
                                    var segmentHtml = '';
                                    for (var line = 0; line < segment.Text.length; line++) {
                                        if (segmentHtml == '') {
                                            segmentHtml += segment.Text[line];
                                        }
                                        else {
                                            segmentHtml += ' ' + segment.Text[line];
                                        }
                                    }

                                    innerSegmentHtml += segmentHtml + '</span>';
                                    totalSegmentsHtml += innerSegmentHtml;
                                }
                            }
                            totalSegmentsHtml += '</p>';
                            this.transcriptArea.append(totalSegmentsHtml);

                        }

                    }
                }
            }
            else {
                this.hasTranscript = false;
            }

        },
        buildTitle: function () {
            var title = null;

            //A title override is when a title is passed in as a parameter and is intended to override the title in the metadata.
            if (this.titleOverride != null && this.titleOverride.trim() !== "") {
                this.title.text(this.titleOverride);
                this.srTitle.text(this.titleOverride);
                this.titleAudio.text(this.titleOverride);
            }
            else {
                for (i = 0; i < this.languages.length; i++) {
                    if (this.languages[i].LanguageCode == this.languageCode) {
                        this.title.text(this.languages[i].Title);
                        this.srTitle.text(this.languages[i].Title);
                        this.titleAudio.text(this.languages[i].Title);
                        title = "notnull";
                    }
                    else if (title == null && this.languages[i].LanguageCode == this.originalLanguageCode) {
                        this.title.text(this.languages[i].Title);
                        this.srTitle.text(this.languages[i].Title);
                        this.titleAudio.text(this.languages[i].Title);
                    }
                }
            }

        },
        buildVTOC: function () {
            //THis is used to construct the visual table of contents.
            //The VTOC can be a complicated build as it varies depending on what is available for the video.  i.e. Are there segments?  Transcripts?  etc.
            //The ultimate goal is to provide thumbnails for various time frames throughout a video to allow someone to scroll through and get a bird's eye view of the video.

            this.VTOC.empty(); //clear old build if any.

            //Get a reference to the transcript.
            var transcript = null;
            if (this.transcript != null && this.transcript.Files != null) {
                for (var i = 0; i < this.transcript.Files.length; i++) {
                    if (this.transcript.Files[i].LanguageCode == this.languageCode) {
                        transcript = { ...this.transcript.Files[i] };
                    }
                    else if (transcript == null && this.transcript.Files[i].LanguageCode == this.originalLanguageCode) {
                        transcript = { ...this.transcript.Files[i] };
                    }
                }
            }

            var languageSegments = this.populateLanguageSegments(); //first, we fish out the segments based on language we are using.

            if (languageSegments.length) {
                //in this case, there are segments, so the VTOC is going to be populated with segments in mind.

                languageSegments.sort(function (a, b) { return a.milliseconds - b.milliseconds });
                var segmentNumber = 0;
                for (var z = 0; z < languageSegments.length; z++) {

                    var languageSegment = languageSegments[z];
                    var thisDuration = this.segmentDuration(languageSegments, z);
                    var segStart = this.convertTimestampToSeconds(languageSegment.TimeStamp);
                    var startSecs = this.startSecs();
                    if (segStart < startSecs) {
                        segStart = startSecs;
                    }

                    //Duration is the seconds of length of this segment.
                    if (thisDuration > 0) {
                        //This segments is to be shown.
                        //Else, it is not to be shown because we are in clip mode or something similar.
                        //Our goal when we have segments is to display segment information in the VTOC and then cycle over 12 stills, if possible, within the segment.
                        segmentNumber++;
                        var allContentContainers = ``;

                        //Determine our split of this segment.
                        if (thisDuration > 11) {
                            //Determine how often we will show segments.
                            var elevens = parseInt(thisDuration / 11); //floor to second.  THis ensures we don't exceed video length.
                            var totalSeconds = 0;
                            for (var i = 0; i < 12; i++) {

                                var selectedScrub = this.scrubber[this.scrubber.length - 1];
                                for (var a = 0; a < this.scrubber.length; a++) {
                                    //Scrubber Seconds are in real time.  Seg Start is in clipped time.  We have to convert.
                                    if (this.scrubber[a].Seconds >= (this.realTimeFromClippedTime(segStart + totalSeconds))) {
                                        selectedScrub = this.scrubber[a];
                                        break;
                                    }
                                }

                                var transcriptLine = "";
                                if (transcript != null) {
                                    //Locate the position in the transcript which covers this second.
                                    transcriptLine = this.transcriptLineAt(transcript, segStart + totalSeconds);
                                }

                                var contentContainer = `
                                    <div id="content-container" class="h-full relative">
                                        <a href="#" aria-label="Select Timestamp" onclick="cmpl.setTime(` + (this.realTimeFromClippedTime(segStart + totalSeconds)) + `); cmpl.VTOCClose[0].click();" class="stretched-link">
                                        <div id="content-thumbnail" class="relative">
                                            <img class="" src="` + selectedScrub.Url + `" alt="Thumbnail of video">
                                            <p aria-hidden="true" class="absolute bottom-0 right-0 mb-2 mr-2 text-xsm text-white bg-black bg-opacity-75 px-1">` + this.convertTimeStampToReadable(this.convertSecondsToTimeStamp(segStart + totalSeconds)) + `</p>
                                            <p class="sr-only">` + this.convertTimeStampToScreenReader(this.convertSecondsToTimeStamp(segStart + totalSeconds)) + `</p>
                                        </div>
                                        <div id="content-transcript" class="text-xsm"><span class="sr-only">Transcript Snippet</span>
                                            ` + transcriptLine + `
                                        </div>
                                        </a>
                                    </div>`;

                                allContentContainers += contentContainer;

                                totalSeconds += elevens;
                            }

                        }
                        else {
                            //If the duration is not 12 seconds, we will only show images every 2 seconds
                            var totalSeconds = 0;
                            for (var p = 0; p < thisDuration; p+=2) {
                                var selectedScrub = this.scrubber[this.scrubber.length - 1];
                                for (var a = 0; a < this.scrubber.length; a++) {
                                    //Scrubber seconds are in real time, segstart is in clipped time.
                                    if (this.scrubber[a].Seconds >= (this.realTimeFromClippedTime(segStart + p))) {
                                        selectedScrub = this.scrubber[a];
                                        break;
                                    }
                                }

                                var transcriptLine = "";
                                if (transcript != null) {
                                    //Locate the position in the transcript which covers this second.
                                    transcriptLine = this.transcriptLineAt(transcript, segStart + p);
                                }

                                var contentContainer = `
                                    <div id="content-container" class="h-full relative">
                                        <a href="#" onclick="cmpl.setTime(` + (this.realTimeFromClippedTime(segStart + p)) + `); cmpl.VTOCClose[0].click();" class="stretched-link">
                                        <div id="content-thumbnail" class="relative">
                                            <img class="" src="` + selectedScrub.Url + `" alt="">
                                            <p aria-hidden="true" class="absolute bottom-0 right-0 mb-2 mr-2 text-xsm text-white bg-black bg-opacity-75 px-1">` + this.convertTimeStampToReadable(this.convertSecondsToTimeStamp(segStart + p)) + `</p>
                                            <p class="sr-only">` + this.convertTimeStampToScreenReader(this.convertSecondsToTimeStamp(segStart + p)) + `</p>
                                        </div>
                                        <div id="content-transcript" class="text-xsm">
                                            ` + transcriptLine + `
                                        </div>
                                        </a>
                                    </div>`;

                                allContentContainers += contentContainer;
                             
                            }
                        }

                        var segmentContainer = `
                        <div id="segment-container">
                            <div id="segment-title" class="sticky z-20">
                                <b>` + segmentNumber + `.</b> ` + languageSegment.Title + `
                            </div>
                            <div id="content" class="p-4 grid gap-4 grid-cols-3">
                                ` + allContentContainers + `
                            </div>
                        </div>`;
                        this.VTOC.append(segmentContainer);
                    }
                }
            }
            else {
                //in this case, there are no segments, so we handle segmentless.
                //The goal here is we want to divide up the video in a sensical way.
                //The way this will get done is based on duration of the video.
                //We will show no more than 66 images, starting at 0.
                var startSecs = this.startSecs();
                var endSecs = this.endSecs();
                var allContentContainers = ``;

                if (endSecs - startSecs < 66) {
                    //If the duration is not 12 seconds, we will only show images every 2 seconds
                    var totalSeconds = 0;
                    for (var p = startSecs; p < endSecs - startSecs; p += 2) {
                        var selectedScrub = this.scrubber[this.scrubber.length - 1];
                        for (var a = 0; a < this.scrubber.length; a++) {
                            if (this.scrubber[a].Seconds >= this.realTimeFromClippedTime(p)) {
                                selectedScrub = this.scrubber[a];
                                break;
                            }
                        }

                        var transcriptLine = "";
                        if (transcript != null) {
                            //Locate the position in the transcript which covers this second.
                            transcriptLine = this.transcriptLineAt(transcript, p);
                        }

                        var contentContainer = `
                                    <div id="content-container" class="h-full relative">
                                        <a href="#" onclick="cmpl.setTime(` + (this.realTimeFromClippedTime(p)) + `); cmpl.VTOCClose[0].click();" class="stretched-link">
                                        <div id="content-thumbnail" class="relative">
                                            <img class="" src="` + selectedScrub.Url + `" alt="">
                                            <p aria-hidden="true" class="absolute bottom-0 right-0 mb-2 mr-2 text-xsm text-white bg-black bg-opacity-75 px-1">` + this.convertTimeStampToReadable(this.convertSecondsToTimeStamp(p)) + `</p>
                                            <p class="sr-only">` + this.convertTimeStampToScreenReader(this.convertSecondsToTimeStamp(p)) + `</p>
                                        </div>
                                        <div id="content-transcript" class="text-xsm">
                                            ` + transcriptLine + `
                                        </div>
                                        </a>
                                    </div>`;

                        allContentContainers += contentContainer;

                    }

                    var segmentContainer = `
                        <div id="segment-container">
                            <div id="content" class="p-4 grid gap-4 grid-cols-3">
                                ` + allContentContainers + `
                            </div>
                        </div>`;

                    this.VTOC.append(segmentContainer);
                }
                else {
                    var division = parseInt((endSecs - startSecs) / 66);

                    var totalSeconds = 0;
                    for (var i = 0; i < 66; i++) {
                        var selectedScrub = this.scrubber[this.scrubber.length - 1];
                        for (var a = 0; a < this.scrubber.length; a++) {
                            if (this.scrubber[a].Seconds >= (this.realTimeFromClippedTime(startSecs + totalSeconds))) {
                                selectedScrub = this.scrubber[a];
                                break;
                            }
                        }

                        var transcriptLine = "";
                        if (transcript != null) {
                            //Locate the position in the transcript which covers this second.
                            transcriptLine = this.transcriptLineAt(transcript, startSecs + totalSeconds);
                        }

                        var contentContainer = `
                                    <div id="content-container" class="h-full relative">
                                        <a href="#" onclick="cmpl.setTime(` + (this.realTimeFromClippedTime(startSecs + totalSeconds)) + `); cmpl.VTOCClose[0].click();" class="stretched-link">
                                        <div id="content-thumbnail" class="relative">
                                            <img class="" src="` + selectedScrub.Url + `" alt="">
                                            <p aria-hidden="true" class="absolute bottom-0 right-0 mb-2 mr-2 text-xsm text-white bg-black bg-opacity-75 px-1">` + this.convertTimeStampToReadable(this.convertSecondsToTimeStamp(startSecs + totalSeconds)) + `</p>
                                            <p class="sr-only">` + this.convertTimeStampToScreenReader(this.convertSecondsToTimeStamp(startSecs + totalSeconds)) + `</p>
                                        </div>
                                        <div id="content-transcript" class="text-xsm">
                                            ` + transcriptLine + `
                                        </div>
                                        </a>
                                    </div>`;

                        allContentContainers += contentContainer;

                        totalSeconds += division;
                    }


                    var segmentContainer = `
                        <div id="segment-container">
                            <div id="content" class="p-4 grid gap-4 grid-cols-3">
                                ` + allContentContainers + `
                            </div>
                        </div>`;
                    this.VTOC.append(segmentContainer);
                }
            }
            cmpl.vtocLoaded = true;
        },
        calcFilterTypeResults: function (modal) {
            //This function is used to "set right" the counts for filter results based on what is shown or hidden.
            //Determine totals.
            var modalId = modal ? "-modal" : "";
            var totalCount = 0;
            //Default set set to clear and hide all.
            var atLeastOneChecked = false;
            this.typeFilterAggregateString.text("All");
            this.typeFilterClearAll.show();
            this.typeFilterAll.hide();
            if (this.filterChecked(this.transcriptsFilterCheck)) {
                if ($('#transcript-hit-count' + modalId).length) {
                    totalCount += parseInt($('#transcript-hit-count' + modalId).val());
                }
                $('#matches-transcript' + modalId).show();
                atLeastOneChecked = true;
            }
            else {
                $('#matches-transcript' + modalId).hide();
                //Since this is not checked, we want to show all.
                this.typeFilterAll.show();
                this.typeFilterClearAll.hide();
                this.typeFilterAggregateString.text("Some");
            }

            if (this.filterChecked(this.segmentsFilterCheck)) {
                if ($('#segments-hit-count' + modalId).length) {
                    totalCount += parseInt($('#segments-hit-count' + modalId).val());
                }
                $('#matches-segments' + modalId).show();
                atLeastOneChecked = true;
            }
            else {
                $('#matches-segments' + modalId).hide();
                //Since this is not checked, we want to show all.
                this.typeFilterAll.show();
                this.typeFilterClearAll.hide();
                this.typeFilterAggregateString.text("Some");
            }

            if (!atLeastOneChecked) {
                this.typeFilterAggregateString.text("None");
            }

            $('#total-search-results' + modalId).text(totalCount);


        },
        chatScrolled: function () {
            if (this.chatTabContent.is(":visible")) {
                //When segment gets scrolled, it can happen due to an auto scroll or to a user initiated scroll.
                //We will know if it's an auto scroll because a flag gets set when this happens.
                //If this is initiated as a result of a user scroll, we turn off auto scroll.
                if (typeof this.performingAutoScroll !== 'undefined' && this.performingAutoScroll !== null && this.performingAutoScroll === true) {
                    //We do not turn off auto scroll and instead we simply reset the flag for the next autoscroll.
                    this.performingAutoScroll = false;
                }
                else {
                    var el = $(this.chatDisplay)[0];
                    //this is a user initiated scroll.  Therefore, we turn off auto scroll.
                    if (this.autoScrollChat) {
                        this.autoScrollChat = false;
                    }
                    //If auto scroll is off and the user scrolls to bottom, we turn back on auto scroll.
                    else if (!this.autoScrollChat && (el.scrollHeight - el.scrollTop - el.clientHeight < 5)) {
                        this.autoScrollChat = true;
                    }
                }
            }
        },
        checkedPlaySpeed: function () {
            //used to get what the user is expecting the play speed to be.
            var playSpeed;
            $('[name="playback-speed-options"]').each(function () {
                if ($(this).is(":checked")) {
                    playSpeed = $(this).val();
                }
            });
            return playSpeed;
        },
        checkAllTypeFilter: function (check) {
            this.forceTypeFilterState(this.transcriptsFilterCheck, check);
            this.forceTypeFilterState(this.segmentsFilterCheck, check);
        },
        checkClipStop: function () {
            //This function gets called as the video plays.
            //If we are in clip mode, we have to see if we have exceeded the end time specified.
            //If we have, we stop the video.
            if (this.clipMode) {
                if (this.hasEnd) {
                    if (this.clipMasking) {
                        if (this.clippedTimeFromCurrentTime() >= this.convertTimestampToMilliseconds(this.videoEnd) / 1000) {
                            this.pause();
                        }
                    }
                    else {
                        if (this.currentTime() >= this.convertTimestampToMilliseconds(this.videoEnd) / 1000) {
                            this.pause();
                        }
                    }
                }
            }
        },
        clearSegmentShare: function () {
            $('.segment-share').each(function () {
                $(this).prop('checked', false);
            });
        },
        clipModeChange: function () {
            //To do when we implement clip mode.
        },
        clippedDuration: function () {
            if (this.clipMasking) {
                return this.convertDurationToSeconds(this.clipModel.clipped_duration);
            }
            else {
                return this.duration();
            }
        },
        clippedDurationAsMinutes: function () {
            if (this.clipMasking) {
                return this.convertTimeStampToReadable(this.clipModel.clipped_duration);
            }
            else {
                return this.durationAsMinutes();
            }
        },
        clippedTimeFromCurrentTime: function () {
            return this.clippedTimeFromRealTime(this.currentTime());
        },
        clippedTimeFromRealTime: function (realTime) {
            //Realtime as seconds.
            //This routine returns the matching modified clip block time for the given real time.
            //It does this by examning the clip blocks and figuring out where we are given the current time in the blocks
            //and returning the modified start time of a valid playable clip block plus the difference in time.

            //if the  time is inside of a non playable clip time,w e return the end time of the previous block or start time of the next block if there is no previous playable block.

            if (this.clipMasking) {
                var milli = realTime * 1000;
                for (var i = 0; i < this.clipModel.Clips.length; i++) {
                    var clip = this.clipModel.Clips[i];
                    if (clip.ClipStartMilliseconds <= milli && clip.ClipEndMilliseconds >= milli) {
                        //This is the current block.

                        if (clip.modified_start_milliseconds === -1) {
                            //In this case, the current clip block is non playable.
                            //Find the previous playable clip block (if any)
                            for (var p = i - 1; p > -1; p--) {
                                var prevClip = this.clipModel.Clips[p];

                                if (prevClip.modified_start_milliseconds !== -1) {
                                    return prevClip.ModifiedEndMilliseconds / 1000;
                                }
                            }

                            //If we got this far, check for the next playable clip block.
                            for (var p = i + 1; p < this.clipModel.Clips.length; p++) {
                                var nextClip = this.clipModel.Clips[p];

                                if (nextClip.modified_start_milliseconds !== -1) {
                                    return nextClip.ModifiedStartMilliseconds / 1000;
                                }
                            }

                            //If we got this far, that means we could not find a playable time map.
                            return 0; //return start of asset then.
                        }
                        else {
                            //In this case, the time passed in is inside of a playable clip block.
                            //Therefore, we need to return the start of this clip block plus the current time minus the clip start time of this clip block.
                            return (clip.ModifiedStartMilliseconds + (milli - clip.ClipStartMilliseconds)) / 1000;
                        }
                    }
                }

            }
            return realTime; //if not clipping, realtime is realtime.
        },
        collapseTranscript: function () {
            cmpl.setTranscriptless();
            cmpl.fullScreenPreviousMode = cmpl.transcriptExpanded;
            cmpl.collapseTranscriptButton.attr("aria-pressed", true);
            cmpl.expandTranscriptButton.attr("aria-pressed", false);
        },
        continuousScrub: function () {
            var cmpl = this;
            if (this.scrubbing) {
                setTimeout(function () { cmpl.showScrubberImage(cmpl.mouseX, cmpl.mouseY, cmpl.progressBar) }, 100);
            }
        },
        convertClippedTimeStampToRealTimeStamp: function (clippedTimeStamp) {
            return this.convertMilliSecondsToTimeStamp(this.realTimeFromClippedTime(this.convertTimestampToMilliseconds(clippedTimeStamp) / 1000) * 1000);
        },
        convertDurationToSeconds: function (duration) {
            //Converts a provided duration into seconds.
            //Durations are alwasy provided as MM:SS

            var parse = duration.split(':');

            if (parse.length === 4) {
                var hours = parseInt(parse[0]);
                var minutes = parseInt(parse[1]);
                var seconds = parseInt(parse[2]);
                var milliseconds = parseInt(parse[3]);
                var flt = parseFloat("0." + milliseconds);
                return (hours * 60 * 60) + (minutes * 60) + (seconds + flt);

            }
            if (parse.length == 3) {
                //This may either be HH:MM:SS or MM:SS:MSS
                //The way to know is by looking at the last value, and if it's 3 digits, you know it's milliseconds with minutes starting.
                if (parse[2].length == 3) {
                    var minutes = parseInt(parse[0]);
                    var seconds = parseInt(parse[1]);
                    var milliseconds = parseInt(parse[2]);

                    var flt = parseFloat("0." + milliseconds);

                    return (minutes * 60) + (seconds + flt);
                }
                else {
                    //This is HH:MM:SS
                    var hours = parseInt(parse[0]);
                    var minutes = parseInt(parse[1]);
                    var seconds = parseInt(parse[2]);

                    return (hours * 60 * 60) + (minutes * 60) + (seconds);
                }
            }
            else {
                var minutes = parseInt(parse[0]);
                var seconds = parseInt(parse[1]);

                return (minutes * 60) + seconds;
            }



        },
        convertMilliSecondsToClippedTimeStamp: function (dur) {
            //Time stamps have the format HH:MM:SS


            var hours = Math.floor(((dur / 1000) / 60) / 60);
            dur = dur - (hours * 60 * 60 * 1000);

            var minutes = Math.floor((dur / 1000) / 60);
            dur = dur - (minutes * 60 * 1000);

            var seconds = Math.floor(dur / 1000);
            dur = dur - (seconds * 1000);

            var milliseconds = Math.floor(dur); //shave off any excess.

            var returnVal = "";

            if (hours < 10) {
                returnVal = "0" + hours + ":";
            }
            else {
                returnVal = hours + ":";
            }

            if (minutes < 10) {
                returnVal = returnVal + "0" + minutes + ":";
            }
            else {
                returnVal = returnVal + minutes + ":";
            }

            if (seconds < 10) {
                returnVal = returnVal + "0" + seconds;
            }
            else {
                returnVal = returnVal + seconds;
            }

            return returnVal;

        },
        convertMillisecondsToSeconds: function (millis) {
            return (millis / 1000).toFixed(0);
        },
        convertMilliSecondsToTimeStamp: function (dur) {
            //Time stamps have the format HH:MM:SS:MSS


            var hours = Math.floor(((dur / 1000) / 60) / 60);
            dur = dur - (hours * 60 * 60 * 1000);

            var minutes = Math.floor((dur / 1000) / 60);
            dur = dur - (minutes * 60 * 1000);

            var seconds = Math.floor(dur / 1000);
            dur = dur - (seconds * 1000);

            var milliseconds = Math.floor(dur); //shave off any excess.

            var returnVal = "";

            if (hours < 10) {
                returnVal = "0" + hours + ":";
            }
            else {
                returnVal = hours + ":";
            }

            if (minutes < 10) {
                returnVal = returnVal + "0" + minutes + ":";
            }
            else {
                returnVal = returnVal + minutes + ":";
            }

            if (seconds < 10) {
                returnVal = returnVal + "0" + seconds + ":";
            }
            else {
                returnVal = returnVal + seconds + ":";
            }

            if (milliseconds < 10) {
                returnVal = returnVal + "00" + milliseconds;
            }
            else if (milliseconds < 100) {
                returnVal = returnVal + "0" + milliseconds;
            }
            else {
                returnVal = returnVal + milliseconds;
            }

            return returnVal;

        },
        convertRealTimestampToClippedTimestamp: function (realTimeStamp) {
            //This function is useful for when you have a real time stamp but want to convert it to its equivalent clipped time stamp.
            return this.convertMilliSecondsToTimeStamp(this.clippedTimeFromRealTime(this.convertTimestampToMilliseconds(realTimeStamp) / 1000) * 1000);
        },
        convertSecondsToScreenReaderReadable: function (seconds) {

            var dur = seconds;
            var minutes = Math.floor(dur / 60);

            //Then figure out remainder
            var remainder = dur - (minutes * 60);

            var seconds = Math.floor(remainder);

            var returnString = "";
            if (minutes > 0) {
                if (minutes > 1) {
                    returnString = returnString + minutes + " minutes";
                }
                else {
                    returnString = returnString + minutes + " minute";
                }
            }
            returnString = returnString + " " + seconds + " seconds";
            return returnString;
        },
        convertSecondsToReadable: function (seconds) {
            var dur = seconds;
            //This is total number of seconds followed by decimal.
            //We first divide by 60, round down.
            var minutes = Math.floor(dur / 60);

            //Then figure out remainder
            var remainder = dur - (minutes * 60);

            var seconds = Math.floor(remainder);

            if (seconds < 10) {
                return minutes + ":0" + seconds;
            }
            else {
                return minutes + ":" + seconds;
            }
        },
        convertSecondsToTimeStamp: function (seconds) {
            return this.convertMilliSecondsToTimeStamp(seconds * 1000);
        },
        convertSecondsToRealTimeStamp: function (seconds) {
            return this.convertClippedTimeStampToRealTimeStamp(this.convertMilliSecondsToTimeStamp(seconds * 1000));
        },
        convertTimestampToMilliseconds: function (timestamp) {
            var parse = timestamp.split(':');
            if (parse.length === 4) {
                //this has hours.
                var hours = parseInt(parse[0]);
                var minutes = parseInt(parse[1]);
                var seconds = parseInt(parse[2]);
                var milliseconds = parseInt(parse[3]);

                return (hours * 60 * 60 * 1000) + (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
            }
            else {
                //this has no hours.
                var minutes = parseInt(parse[0]);
                var seconds = parseInt(parse[1]);

                var milliseconds = 0;
                if (parse.length == 3) {
                    milliseconds = parseInt(parse[2]);
                }

                return (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
            }
        },
        convertTimestampToSeconds: function (timestamp) {
            return this.convertTimestampToMilliseconds(timestamp) / 1000;
        },
        convertTimeStampToReadable: function (timestamp) {
            var milliseconds = this.convertTimestampToMilliseconds(timestamp);

            //Extract hours first.
            var hours = Math.floor(milliseconds / (60 * 60 * 1000));
            milliseconds = milliseconds - (hours * 60 * 60 * 1000);

            var minutes = Math.floor(milliseconds / (60 * 1000));

            milliseconds = milliseconds - (minutes * 60 * 1000);

            var seconds = Math.floor(milliseconds / 1000);

            var returnVal = "";

            if (hours > 0) {
                if (hours < 10) {
                    returnVal = returnVal + "0" + hours + ":";
                }
                else {
                    returnVal = returnVal + hours + ":";
                }
            }

            if (minutes < 10) {
                returnVal = returnVal + "0" + minutes + ":";
            }
            else {
                returnVal = returnVal + minutes + ":";
            }

            if (seconds < 10) {
                returnVal = returnVal + "0" + seconds;
            }
            else {
                returnVal = returnVal + seconds;
            }

            return returnVal;

        },
        convertTimeStampToScreenReader: function (timestamp) {
            var milliseconds = this.convertTimestampToMilliseconds(timestamp);

            //Extract hours first.
            var hours = Math.floor(milliseconds / (60 * 60 * 1000));
            milliseconds = milliseconds - (hours * 60 * 60 * 1000);

            var minutes = Math.floor(milliseconds / (60 * 1000));

            milliseconds = milliseconds - (minutes * 60 * 1000);

            var seconds = Math.floor(milliseconds / 1000);

            var returnVal = "";

            if (hours > 0) {
                if (hours > 1) {
                    returnVal += hours + " hours ";
                }
                else {
                    returnVal += hours + " hour ";
                }
            }

            if (minutes > 0) {
                if (minutes > 1) {
                    returnVal += minutes + " minutes ";
                }
                else {
                    returnVal += minutes + " minute ";
                }
            }


            returnVal += seconds + " seconds ";

            return returnVal;
        },
        convertTimeStampToVTT: function (timestamp) {
            var splitsy = timestamp.split(':');
            var s = "";
            for (var i = 0; i < splitsy.length; i++) {
                if (i + 1 == splitsy.length)
                {
                    s += '.' + splitsy[i];
                }
                else
                {
                    if (s == "") {
                        s = splitsy[i];
                    }
                    else {
                        s += ':' + splitsy[i];
                    }
                }
            }
            return s;
        },
        copyValueToClipboard: function (id) {
            var sampleText = document.getElementById(id);
            sampleText.select();
            sampleText.setSelectionRange(0, 99999)
            document.execCommand("copy");
        },
        currentTime: function () {
            if (this.hasEnded) {
                return this.duration();
            }
            else {
                //Sometimes end fires before time updates occur and we are stuck on some milliseconds when we have really ended.
                
                return videoPlayer.currentTime();
            }
        },
        currentRate: function () {
            return videoPlayer.playbackRate();
        },
        currentTimeAsMinutes: function () {
            var currTime = videoPlayer.currentTime();

            //This is total number of seconds followed by decimal.
            //We first divide by 60, round down.
            var minutes = Math.floor(currTime / 60);

            //Then figure out remainder
            var remainder = currTime - (minutes * 60);

            var seconds = Math.floor(remainder);

            if (seconds < 10) {
                return minutes + ":0" + seconds;
            }
            else {
                return minutes + ":" + seconds;
            }
        },
        currentTimeAsTimestamp: function () {
            return this.convertMilliSecondsToTimeStamp(this.currentTime() * 1000);
        },
        duration: function () {
            //This is nowadays returning the wrong duration.  NO idea why.
            //return videoPlayer.duration();
            var html5Duration = $('.vjs-tech')[0].duration;
            if (isNaN(html5Duration)) {
                html5Duration = videoPlayer.duration(); //fallback to video.js
            }

            if (isNaN(html5Duration) || html5Duration == 0) {
                //In this case, video.js is just failing to get a duration.
                //We will fall back to the reported duration from the metadata record when we ingested this thing.
                html5Duration = this.convertDurationToSeconds(this.durationMetadata);
            }

            return html5Duration;
        },
        durationAsMinutes: function () {
            var dur = this.duration();

            if (dur == -1) {
                return "";
            }

            //This is total number of seconds followed by decimal.
            //We first divide by 60, round down.
            var minutes = Math.floor(dur / 60);

            //Then figure out remainder
            var remainder = dur - (minutes * 60);

            var seconds = Math.floor(remainder);

            if (seconds < 10) {
                return minutes + ":0" + seconds;
            }
            else {
                return minutes + ":" + seconds;
            }
        },
        elementOnScreen: function (containerElem, nextElement) {
            if ($(containerElem).is(":visible")) {
                if ($(nextElement).length && $(containerElem).length) {
                    if ($(nextElement).position().top >= 0 && $(nextElement).position().top + $(nextElement).height() <= $(containerElem).height()) {
                        return true;
                    }
                }
            }
            return false;
        },
        end: function () {
            var cmpl = this;
            if (!cmpl.hasEnded) {
                console.log("CMPL: Ended.");
                //record a view time.
                cmpl.hasEnded = true;
                //An analytics update is sent here because at end, the curent time resets to 0.  Thus we pass duration.
                cmpl.logViewBlockUpdate(cmpl.duration(), cmpl.viewBlockId, cmpl.autolog);
                cmpl.viewStart = -1;
                cmpl.autolog = -1;
                cmpl.pause();
                cmpl.closedCaptions.hide();
                cmpl.updatePlayBackPercentage(false);
                cmpl.updateCurrentTime();

                //A configuration can be set to display the thumbnail when a video ends.
                if (cmpl.configuration.ThumbnailAtVideoEnd) {
                    cmpl.thumbWrapper.show();
                }

                parent.postMessage('{"method":"playerEnded","key":"' + cmpl.parentKey + '"}', "*");

                //Required by IMA ads impelementation to let the ads loader know when done.
                if (cmpl.hasAds()) {
                    cmpl.callToAdLoadPost = true;
                    cmpl.adsLoader.contentComplete();
                }

                if (cmpl.autoRepeat) {
                    //start over.
                    cmpl.setTime(0);
                }
                else {
                    if (!cmpl.relatedContentContainer.is(":visible")) {
                        cmpl.executeSearchRelatedContent();
                    }

                }

            }
        },

        endSecs: function ()
        {
            if (this.clipMode) {
                if (this.hasEnd) {
                    return this.convertTimestampToMilliseconds(this.videoEnd) / 1000;
                }
            }

            if (this.clipMasking) {
                return this.clippedDuration();
            }
            else {
                return this.duration();
            }
        },
        executeDownload: function () {

            if (this.downloadVideo.is(":checked")) {
                this.downloadVideoLink[0].click();
                this.logAction("Download", "Media");
            }
            else if (this.downloadTranscript.is(":checked")) {
                this.downloadTranscriptLink[0].click();
                this.logAction("Download", "Transcript");
            }

        },
        executeSearch: function () {

            if (this.searchText.val().trim() !== "") {
                this.searchExecuted = true;
                this.searchSpinner.show();
                this.searchDisplay.empty();
                this.transcriptRecenter.hide();
                cmpl.tabButtonClick(this, cmpl.mainTabsBox, cmpl.searchDisplay);

                var formData = new FormData();
                formData.append('searchRequestKey', this.searchRequestKey);
                formData.append('languageCode', this.languageCode);
                formData.append('searchText', this.searchText.val());
                formData.append('sessionId', this.sessionId);

                if (this.clipMode) {
                    var startSecs = this.startSecs();
                    var endSecs = this.endSecs();

                    formData.append("startSecs", startSecs);
                    formData.append("endSecs", endSecs);
                }

                cmpl.logAction("Search", this.searchTextModal.val());
                $.ajax({
                    url: '/Player/Search',
                    cache: false,
                    contentType: false,
                    processData: false,
                    data: formData,
                    type: "POST",
                    success: function (data) {
                        cmpl.searchSpinner.hide();
                        cmpl.searchDisplay.append(data);

                        //We need to wire the modal for the filter button.
                        cmpl.wireModalButton($("#filter-button"));

                        var startSecs = cmpl.startSecs();
                        var endSecs = cmpl.endSecs();

                        //Set the counts on the filter modal.
                        if ($('#transcript-hit-count').length) {

                            cmpl.transcriptMatches.text($('#transcript-hit-count').val());
                        }
                        else {
                            cmpl.transcriptMatches.text('0');
                        }

                        if ($('#segments-hit-count').length) {
                            cmpl.segmentMatches.text($('#segments-hit-count').val());
                        }
                        else {
                            cmpl.segmentMatches.text('0');
                        }

                        cmpl.calcFilterTypeResults(false);

                        $('#filter-button').focus();
                    },
                    error: function (x, y, z) {
                        console.log(x.responseText);
                    }
                });
            }

        },
        executeSearchModal: function () {
            if (this.searchTextModal.val().trim() !== "") {
                this.searchSpinnerModal.show();
                this.searchDisplayModal.empty();

                var formData = new FormData();
                formData.append('searchRequestKey', this.searchRequestKey);
                formData.append('languageCode', this.languageCode);
                formData.append('searchText', this.searchTextModal.val());
                formData.append('sessionId', this.sessionId);
                formData.append('modal', true);

                if (this.clipMode) {
                    var startSecs = this.startSecs();
                    var endSecs = this.endSecs();

                    formData.append("startSecs", startSecs);
                    formData.append("endSecs", endSecs);
                }
                cmpl.logAction("Search", this.searchTextModal.val());
                $.ajax({
                    url: '/Player/Search',
                    cache: false,
                    contentType: false,
                    processData: false,
                    data: formData,
                    type: "POST",
                    success: function (data) {
                        cmpl.searchSpinnerModal.hide();
                        cmpl.searchDisplayModal.append(data);
                        cmpl.searchDisplayModal.show();
                        //We need to wire the modal for the filter button.
                        cmpl.wireFilterModalButton();

                        var startSecs = cmpl.startSecs();
                        var endSecs = cmpl.endSecs();

                        //Set the counts on the filter modal.
                        if ($('#transcript-hit-count-modal').length) {
                            cmpl.transcriptMatches.text($('#transcript-hit-count-modal').val());
                        }
                        else {
                            cmpl.transcriptMatches.text('0');
                        }

                        if ($('#segments-hit-count-modal').length) {
                            cmpl.segmentMatches.text($('#segments-hit-count-modal').val());
                        }
                        else {
                            cmpl.segmentMatches.text('0');
                        }

                        cmpl.calcFilterTypeResults(true);

                        $('#filter-button-modal').focus();
                    },
                    error: function (x, y, z) {
                        console.log(x.responseText);
                    }
                });
            }
        },
        executeSearchRelatedContent: function () {
            var cmpl = this;
            //Do not run search multiple times.
            if (this.relatedContentContainer.length && this.relatedContentSearchObjectId != null && !this.relatedSearchPrimed)
            {
                this.relatedSearchPrimed = true;
                if (!this.relatedSearchExecuted)
                {   
                    this.relatedSearchExecuted = true;
                    var formData = new FormData();
                    formData.append('searchRequestKey', this.searchRequestKey);
                    formData.append('sessionId', this.sessionId);
                    formData.append('searchObjectId', this.relatedContentSearchObjectId);

                    $.ajax({
                        url: '/Player/RelatedContentSearch',
                        cache: false,
                        contentType: false,
                        processData: false,
                        data: formData,
                        type: "POST",
                        success: function (data) {
                            cmpl.relatedContentContainer.append(data);
                            cmpl.menuContainer.addClass('related-content');
                            cmpl.bigPlayButton.addClass('related-content');
                            cmpl.pause();
                            cmpl.relatedSearchPrimed = false;
                            cmpl.relatedContentContainer.show();
                            cmpl.forceOverlayPlayOnly();
                        },
                        error: function (x, y, z) {
                            console.log(x.responseText);
                        }
                    });
                }
                else
                {
                    if (this.relatedContentContainer.is(":visible"))
                    {
                        this.relatedContentContainer.hide();
                        this.relatedSearchPrimed = false;
                        this.unforceOverlayPlayOnly();
                    }
                    else
                    {
                        this.relatedContentContainer.show();
                        this.relatedSearchPrimed = false;
                        this.pause();
                        this.forceOverlayPlayOnly();
                    }
                }
                
            }
        },
        executeVolumeBarDrag: function (e) {
            var cmpl = this;
            var clientRectangle = document.getElementById('volume-bar').getBoundingClientRect();


            var x = e.pageX - clientRectangle.left, // or e.offsetX (less support, though)
                y = e.pageY - clientRectangle.top;  // or e.offsetY


            //Get the percentage of where the volume bar drag is happening.
            var percentageOfVolumeBar = 1 - (y / cmpl.volumeBar.height());

            if (percentageOfVolumeBar >= 1 || percentageOfVolumeBar < 0) {
                return;
            }



            videoPlayer.volume(percentageOfVolumeBar);

            //this.volumeBar.attr("aria-valuenow", Math.floor(percentageOfVolumeBar * 100));

            //Then update the volume indicator width for that percentage.
            cmpl.volumeBar.attr("aria-valuenow", Math.floor(videoPlayer.volume() * 100));

            cmpl.volumeIndicator.height((videoPlayer.volume() * 100) + '%');
        },
        exitClipMode: function (timeToSet) {
            this.videoStart = null;
            this.videoEnd = null;
            this.hasStart = false;
            this.hasEnd = false;
            this.clipMode = false;
            this.reload(timeToSet);
        },
        findElements: function () {
            this.adBigPlayButton = $('#ad-big-play-button');
            this.adContainerElement = $('#ad-container');
            this.allChatButton = $('#all_chat_button');
            this.autoPlayMessageContainer = $('#autoplay-message-container');
            this.autoPlayUnmute = $('#auto-play-unmute');
            this.bigPlayButton = $('#big-play-button');
            this.ccButton = $('#closed-captions-button');
            this.chatDisplay = $('#disp-Chat');
            this.chatTabButton = $('#chat-tab-button');
            this.chatTabContent = $('#chat-tab-content');
            this.citationCopyButton = $('#citation-copy-button');
            this.citationInput = $('#citation-input');
            this.citeButton = $('#cite-button');
            this.citeButtonAudio = $('#cite-button-audio');
            this.clickButton = $('#clickButton');
            this.clickButtonWrapper = $('#clickButtonWrapper');
            this.clickLink = $('#click-link');
            this.clipCustomRadio = $('#clipCustomRadio');
            this.clipCustomEndTime = $('#clipCustom-end-time');
            this.clipCustomStartTime = $('#clipCustom-start-time');
            this.clipEntireRadio = $('#clipEntireRadio');
            this.clipModeContainer = $("#clip-mode-container");
            this.clipSegmentsRadio = $('#clipSegmentsRadio');
            this.closeAutoPlayMessageButton = $('#close-auto-play-message');
            this.closedCaptions = $('#closed-captions');
            this.closedCaptionsButton = $('#closed-captions-button');
            this.closedCaptionsText = $('#closed-captions-text');
            this.collapseTranscriptButton = $('#collapse-transcript-btn');
            this.container = $('#full-container');
            this.copyShareLinkButton = $('#copy-share-link-button');
            this.currentTimeSpan = $('#current-time');
            this.currentTimeSpanSR = $('#current-time-SR');
            this.downloadActionButton = $('#download_action_button');
            this.downloadShareDisplay = $('#disp-Download');
            this.downloadShareTabButton = $('#download-share-tab-button');
            this.downloadTranscript = $('#downloadTranscript');
            this.downloadTranscriptLink = $('#download_transcript_link');
            this.downloadVideo = $('#downloadVideo');
            this.downloadVideoLink = $('#download_video_link');
            this.durationSpan = $('#duration');
            this.emailShareTabButton = $('#email-share-tab-button');
            this.endOfMedia = $('#end-of-media');
            this.expandTranscriptButton = $('#expand-transcript-button');
            this.facebookShareTabButton = $('#facebook-share-tab-button');
            this.filterButton = $('#filter-button');
            this.filterMatches = $('#filter-matches');
            this.filterModalClose = $('#filter-modal-close');
            this.forwardButton = $('#forward-button');
            this.fullScreenTranscriptButton = $('#fullscreen-transcript-button');
            this.fullScreenVideoOnlyButton = $('#fullscreen-video-only-button');
            this.infoButton = $('#info-button');
            this.keyboardShortcutsButton = $('#keyboard-shortcuts-button');
            this.linkedinShareTabButton = $('#linkedin-share-tab-button');
            this.linkShareDisplay = $('#disp-MediaLink');
            this.linkShareTabButton = $('#link-share-tab-button');
            this.liveChatReplayButton = $('#live_chat_replay_button');
            this.mainTabsBox = $('#main-tabs-box');
            this.menuButton = $('#menu-button'); //this is the mobile modal menu button.
            this.menuContainer = $('#menu-container');
            this.mobileMenuClose = $('#mobile-menu-close');
            this.mobileMenuEndOfModal = $('#mobilemenu-endofmodal');
            this.mobileMenuModalContent = $('#mobile-menu-modal-content');
            this.modalCCClose = $('#modal-cc-close');
            this.modalCCMenu = $('#modal-cc-menu');
            this.modalCCOffButton = $('#modal-cc-off-button');
            this.modalCCOffLabel = $('#modal-cc-off-label');
            this.modalCCOnButton = $('#modal-cc-on-button');
            this.modalCCOnLabel = $('#modal-cc-on-label');
            this.modalCCMenuOnCheck = $('#modal-cc-menu-on-check');
            this.modalCCMenuOffCheck = $('#modal-cc-menu-off-check');
            this.modalLanguageClose = $('#modal-language-close');
            this.modalLanguageMenu = $('#modal-language-menu');
            this.modalMainMenu = $('#modal-main-menu');
            this.modalMenu = $('#modalMenu'); //this is the mobile modal window.
            this.modalPlaybackSpeed05 = $('#modal-playbackspeed-05');
            this.modalPlaybackSpeed075 = $('#modal-playbackspeed-075');
            this.modalPlaybackSpeed1 = $('#modal-playbackspeed-1');
            this.modalPlaybackSpeed125 = $('#modal-playbackspeed-125');
            this.modalPlaybackSpeed15 = $('#modal-playbackspeed-15');
            this.modalPlaybackSpeed175 = $('#modal-playbackspeed-175');
            this.modalPlaybackSpeed2 = $('#modal-playbackspeed-2');
            this.modalPlaybackSpeed25 = $('#modal-playbackspeed-25');
            this.modalPlaybackSpeed3 = $('#modal-playbackspeed-3');
            this.modalPlaybackSpeed4 = $('#modal-playbackspeed-4');
            this.modalPlaybackSpeed5 = $('#modal-playbackspeed-5');
            this.modalPlaybackSpeed05Button = $('#modal-playback-speed-05-button');
            this.modalPlaybackSpeed075Button = $('#modal-playback-speed-075-button');
            this.modalPlaybackSpeed1Button = $('#modal-playback-speed-1-button');
            this.modalPlaybackSpeed125Button = $('#modal-playback-speed-125-button');
            this.modalPlaybackSpeed15Button = $('#modal-playback-speed-15-button');
            this.modalPlaybackSpeed175Button = $('#modal-playback-speed-175-button');
            this.modalPlaybackSpeed2Button = $('#modal-playback-speed-2-button');
            this.modalPlaybackSpeed25Button = $('#modal-playback-speed-25-button');
            this.modalPlaybackSpeed3Button = $('#modal-playback-speed-3-button');
            this.modalPlaybackSpeed4Button = $('#modal-playback-speed-4-button');
            this.modalPlaybackSpeed5Button = $('#modal-playback-speed-5-button');
            this.modalPlaybackSpeed05Check = $('#modal-playback-speed-05-check');
            this.modalPlaybackSpeed075Check = $('#modal-playback-speed-075-check');
            this.modalPlaybackSpeed1Check = $('#modal-playback-speed-1-check');
            this.modalPlaybackSpeed125Check = $('#modal-playback-speed-125-check');
            this.modalPlaybackSpeed15Check = $('#modal-playback-speed-15-check');
            this.modalPlaybackSpeed175Check = $('#modal-playback-speed-175-check');
            this.modalPlaybackSpeed2Check = $('#modal-playback-speed-2-check');
            this.modalPlaybackSpeed25Check = $('#modal-playback-speed-25-check');
            this.modalPlaybackSpeed3Check = $('#modal-playback-speed-3-check');
            this.modalPlaybackSpeed4Check = $('#modal-playback-speed-4-check');
            this.modalPlaybackSpeed5Check = $('#modal-playback-speed-5-check');
            this.modalPlaybackSpeedClose = $('#modal-playback-speed-close');
            this.modalPlaybackSpeedMenu = $('#modal-playback-speed-menu');
            this.modalSearch = $('#modalSearch');
            this.modalSearchButton = $('#modal-search-button');
            this.modalToggleCCButton = $('#modal-toggle-cc-button');
            this.modalToggleCCOption = $('#modal-toggle-cc-option');
            this.modalToggleLanguageButton = $('#modal-toggle-language-button');
            this.modalTogglePlaybackSpeedButton = $('#modal-toggle-playback-speed-button');
            this.modalToggleTranscriptButton = $('#modal-toggle-transcript-button');
            this.modalToggleTranscriptOption = $('#modal-toggle-transcript-option');
            this.modalTranscriptMenu = $('#modal-transcript-menu');
            this.modalTranscriptMenuClose = $('#modal-transcript-menu-close');
            this.modalTranscriptMenuOffButton = $('#modal-transcript-menu-off-button');
            this.modalTranscriptMenuOffCheck = $('#modal-transcript-menu-off-check');
            this.modalTranscriptMenuOnButton = $('#modal-transcript-menu-on-button');
            this.modalTranscriptMenuOnCheck = $('#modal-transcript-menu-on-check');
            this.modalTranscriptOffLabel = $('#modal-transcript-off-label');
            this.modalTranscriptOnLabel = $('#modal-transcript-on-label');
            this.notRightRailContent = $('#disp-no-right-rail-content');
            this.pauseButton = $('#pause-button');
            /* These are the play back speeds on the settings menu.  Actual radio button. */
            this.playBackSpeedHalf = $('#playback-speed-options-half');
            this.playBackSpeedThreeQuarter = $('#playback-speed-options-threequarter');
            this.playBackSpeedNormal = $('#playback-speed-options-normal');
            this.playBackSpeedOneAndQuarter = $('#playback-speed-options-one-and-quarter');
            this.playBackSpeedOneAndHalf = $('#playback-speed-options-one-and-half');
            this.playBackSpeedOneAndThreeQuarter = $('#playback-speed-options-one-and-threequarter');
            this.playBackSpeedTwo = $('#playback-speed-options-two');
            this.playBackSpeedTwoAndHalf = $('#playback-speed-options-two-and-half');
            this.playBackSpeedThree = $('#playback-speed-options-three');
            this.playBackSpeedFour = $('#playback-speed-options-four');
            this.playBackSpeedFive = $('#playback-speed-options-five');
            /******/
            this.playButton = $('#play-button');
            this.preLoadContainer = $('#preLoadingContainer');
            this.progressBar = $('#progress-bar');
            this.progressBarSegmentsContainer = $('#progress-bar-segments-container');
            this.progressIndicator = $('#progress-indicator');
            this.progressCrosshair = $('#progress-indicator-crosshair');
            this.relatedContentContainer = $('#related-content-container');
            this.relatedContentButton = $('#related-content-button');
            this.restartButton = $('#restart-button');
            this.rewindButton = $('#rewind-button');
            this.secondRewindButton = $('#second-rewind-button');
            this.scrubberContainer = $('#scrubber-container');
            this.scrubberContainerTime = $('#scrubber-container-time');
            this.scrubberImage = $('#scrubber-image');
            this.searchButton = $('#search-button');
            this.searchButtonModal = $('#search-button-modal');
            this.searchButtonModalAudio = $('#search-button-modal-audio');
            this.searchCloseButton = $('#search-close-button');
            this.searchBar = $('#search-bar');
            this.searchDisplay = $('#disp-Search-Results');
            this.searchDisplayModal = $('#disp-Search-Results-modal');
            this.searchModalClose = $('#search-modal-close');
            this.searchSpinner = $('#search-spinner');
            this.searchSpinnerModal = $('#search-spinner-modal');
            this.searchText = $('#search-text');
            this.searchTextModal = $('#search-text-modal');
            this.segmentsDisplay = $('#disp-Segments');
            this.segmentsFilterCheck = $('#segments-filter-check');
            this.segmentMatches = $('#segment-matches');
            this.segmentsTabButton = $('#segments-tab-button');
            this.segmentsTabContent = $('#segments-tab-content');
            this.settingsButton = $('#settings-button');
            this.settingsMenu = $('#settings-menu');
            this.settingsLanguageButton = $('#settings-language-button');
            this.settingsLanguageText = $('#settings-languages-text');
            this.settingsLanguageCloseButton = $('#settings-language-close-button');
            this.settingsLanguageMenu = $('#settings-language-menu');
            this.settingsLanguageMenuWrapper = $('#settings-language-menu-wrapper');
            this.settingsPlayspeedMenuWrapper = $('#settings-playspeed-menu-wrapper');
            this.settingsLanguageMenuLanguages = $('#settings-language-menu-languages');
            this.settingsPlayspeedButton = $('#settings-playspeed-button');
            this.settingsPlayspeedCloseButton = $('#settings-playspeed-close-button');
            this.settingsPlayspeedMenu = $('#settings-playspeed-menu');
            this.settingsTopMenu = $('#settings-top-menu');
            this.shareLinkText = $('#share-link-text');
            this.shareModal = $('#shareModal');
            this.shareNoTabDisplay = $('#disp-None');
            this.shareSegments = $('#share-segments');
            this.shareSegmentsRadio = $('#share-segments-radio');
            this.shareTabsBox = $('#share-tabs-box');
            this.showSearchButton = $('#search-btn');
            this.showSegmentsFilter = $('#show-segments-filter');
            this.showTranscriptsFilter = $('#show-transcripts-filter');
            this.skipButton = $('#skip-button');
            this.srDuration = $('#duration-SR');
            this.srTitle = $('#sr-title');
            this.tabsContainerShutdownOverlay = $('#tabs-container-shutdown-overlay');
            this.tabAreaContainer = $('#tab-area-container');
            this.tabsBox = $('#tabsBox');
            this.tabsContainer = $('#tabs-container');
            this.tabsContainerScroller = $('#tabs-container-scroller');
            this.tabsSearchBox = $('#tabs-search-box');
            this.thumbWrapper = $('#thumbwrapper');
            this.timeJumpButton = $('#time-jump-button');
            this.timeJumpInput = $('#time-jump-input');
            this.title = $('#title');
            this.titleAudio = $('#title-audio');
            this.titleClipMode = $('#title-clip-mode');
            this.titleClipModeAudio = $('#title-clip-mode-audio');
            this.titleContainer = $('#title-container');
            this.transcriptArea = $('#transcript-area');
            this.transcriptButtonText = $('#transcript-button-text');
            this.transcriptDisplay = $('#disp-Transcript');
            this.transcriptsFilterCheck = $('#transcripts-filter-check');
            this.transcriptMatches = $('#transcript-matches');
            this.transcriptRecenter = $('#transcript-recenter-icon');
            this.transcriptTabButton = $('#transcript-tab-button');
            this.toolbarShowTranscriptButton = $('#toolbar-showtranscript-button'); 
            this.twitterShareTabButton = $('#twitter-share-tab-button');
            this.typeFilterAggregateString = $('#type-filter-aggregate-string');
            this.typeFilterAll = $('#type-filter-all');
            this.typeFilterClearAll = $('#type-filter-clear-all');
            this.videoContainer = $('#video-container');
            this.videoControlOverlay = $('#video-control-overlay');
            this.videoControlsLeft = $('#video-controls-left');
            this.VTOC = $('#visual-table-of-contents');
            this.VTOCButton = $('#visual-table-of-contents-button');
            this.VTOCClose = $('#vtoc-close');
            this.volumeBar = $('#volume-bar');
            this.volumeButton = $('#volume-button');
            this.volumeContainer = $('#volume-container');
            this.volumeIndicator = $('#volume-indicator');
            this.volumeIndicatorCrosshair = $('#volume-indicator-crosshair');
            this.watchFullVideoButton = $('#watch-fullvideo-button');
            this.mediaContainer = $('#media-container')
            this.windowHeightError = false; //set to true if we resize to a height that we do not handle.
            this.qualitySelectionValues = $('#quality-selection-values');
            this.qualityCurrentlySelected = $('#quality-currently-selected');
        },
        filterChecked: function (filter) {
            return !($(filter).hasClass('not-checked'));
        },
        filterModalReturnSet: function (modal) {
            if (modal) {
                this.filterModalClose.attr("data-return", "filter-button-modal");
            }
            else {
                this.filterModalClose.attr("data-return", "filter-button");
            }
        },
        forceFocusOverlay: function () {
            this.videoControlOverlay.addClass('focused');
        },
        forceOverlay: function () {
            this.videoControlOverlay.addClass('hovered');
        },
        forceOverlayPlayOnly: function () {
            this.videoControlOverlay.addClass('force_hovered');
        },
        forceTranscriptless: function (turnOff, showTabs) {
            //This gets called by Embed.JS when there just isn't dimensions available (height really) to show the transcript.
            if (!this.noTabsAlways) {
                if (turnOff && !this.transcriptlessForced) {
                    this.transcriptlessForced = true;
                    this.setNoTabs();
                }
                else if (!turnOff && this.transcriptlessForced) {
                    this.transcriptlessForced = false;
                    this.revertNoTabs();
                    if (showTabs) {
                        this.expandTranscriptButton.click();
                    }
                }
            }
            //If there are no tabs, nothign to do here, and this really should never get called logically anyways.
        },
        forceTypeFilterState: function (filter, check) {
            if (check) {
                $(filter).removeClass('not-checked');
                $(filter).show();
                cmpl.calcFilterTypeResults();
            }
            else {
                $(filter).addClass('not-checked');
                $(filter).hide();
                cmpl.calcFilterTypeResults();
            }
        },
        fullScreenVideoOnly: function () {

            if ($('html').hasClass('fullscreentranscript') && this.fullScreen) {
                $('html').removeClass('fullscreen');
                $('html').removeClass('fullscreentranscript');
                $('html').addClass('videoonly');
                if (!this.noTabsAlways) {
                    this.setTranscriptless();
                }
                this.fullScreenPreviousMode = this.transcriptExpanded;
            }
            else {
                this.controlRequestFullScreen = true;
                cmpl.requestFullScreen();
                
                if (cmpl.fullScreen) {
                    $('html').addClass('videoonly');
                    this.fullScreenPreviousMode = this.transcriptExpanded;
                    if (!this.noTabsAlways) {
                        this.setTranscriptless();
                    }
                }
                else {
                    if (!this.noTabsAlways) {
                        if (this.fullScreenPreviousMode) {
                            this.setTranscript();
                        }
                        else {
                            this.setTranscriptless();
                        }
                    }
                }
            }
        },
        addQualityLevels: function (levelsToAdd) {
           for (var i = levelsToAdd.length - 1; i >= 0; i--) {
                var representation = {
                    id: levelsToAdd[i].height,
                    width: levelsToAdd[i].width,
                    height: levelsToAdd[i].height,
                    bandwidth: levelsToAdd[i].bitrate,
                    enabled: true
                }
                cmpl.qualityLevels.addQualityLevel(representation);
            }
        },
        fullScreenWithTranscript: function () {
            if ($('html').hasClass('videoonly') && this.fullScreen) {
                $('html').removeClass('videoonly');
                $('html').addClass('fullscreentranscript');
                if ($('html').width() > 1023) {
                    $('html').addClass('fullscreen');
                }
                this.setTranscript();
                this.fullScreenPreviousMode = this.transcriptExpanded;
            }
            else {
                this.controlRequestFullScreen = true;
                cmpl.requestFullScreen();

                if (cmpl.fullScreen) {
                    $('html').addClass('fullscreentranscript');
                    if ($('html').width() > 1023) {
                        $('html').addClass('fullscreen');
                    }
                    this.setTranscript();
                    this.fullScreenPreviousMode = this.transcriptExpanded;
                }
                else {
                    $('html').removeClass('fullscreentranscript');
                    if (this.fullScreenPreviousMode) {
                        this.setTranscript();
                    }
                    else {
                        this.setTranscriptless();
                    }
                }
            }
        },
        generateUUID: function () {
            var d = new Date().getTime();
            if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
                d += performance.now(); //use high-precision timer if available
            }
            return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        },
        hasAds: function () {
             return this.adLink != null && this.adLink !== "";
        },
        hideAd: function () {
            var cmpl = this;
            cmpl.adContainerElement.removeClass('play');
            cmpl.toggleShutDownTabs();
            //Call to add load post happens when video ends.  If there is a post roll it plays.
            //But we don't want to start up the video again after that kind of ad.
            if (cmpl.callToAdLoadPost) {
                cmpl.callToAdLoadPost = false;
            }
            else {
                cmpl.play();
            }
            cmpl.adShowing = false;
            cmpl.adPlaying = false;
            cmpl.adPaused = false;
            this.srSpeak('Resuming after advertisement.');
            //focus back on play button.
            this.adContainerElement.attr("tabindex", "-1");
        },
        highlightTranscript: function () {
            //We de-highlight all the things if current time is 0.
            if (this.currentTime() == 0) {
                $('.transcript-segment').each(function () {
                    $(this).removeClass('transcript-highlight');
                });
                cmpl.positionTranscriptRecenter();
                return;
            }

            
            //To do this, all we have to do is cycle down our transcript time stamps array
            //and locate the first instance of where the current time as milliseconds is greater than an entry's millisecionds.
            //Since this array is sorted on creation, this is possible.
            var highlighted = false;
            var currentTimeAsMilliseconds = this.clippedTimeFromCurrentTime() * 1000;
            //These two variables keep track of our current and next elements
            //so that we can autoscroll.
            var currentElement = null;
            var nextElement = null;

            if (this.transcriptTimeStamps != null) {
                for (var i = 0; i < this.transcriptTimeStamps.length; i++) {
                    if (i + 1 == this.transcriptTimeStamps.length || this.transcriptTimeStamps[i + 1].milliseconds > currentTimeAsMilliseconds) {
                        $('.transcript-segment').each(function () {
                            if ($(this).data('stamptime') == cmpl.transcriptTimeStamps[i].timestamp) {
                                if (!$(this).hasClass('transcript-highlight')) {
                                    nextElement = $(this);

                                    $(this).addClass('transcript-highlight');

                                    //Also add to closed captions 
                                    cmpl.closedCaptionsText.text($(this).text());
                                    //if (cmpl.captionsOn) {
                                        //cmpl.closedCaptions.show();
                                    //}

                                    //At this juncture, we also log segment.
                                    //cmpl.logSegment(cmpl.transcriptTimeStamps[i].timestamp);
                                    if (nextElement != null) {
                                        cmpl.autoScrollTranscript(cmpl.tabAreaContainer, currentElement, nextElement);
                                    }
                                }
                               cmpl.positionTranscriptRecenter();
                                return;
                            }
                            else {
                                if ($(this).hasClass('transcript-highlight')) {
                                    currentElement = $(this);
                                    $(this).removeClass('transcript-highlight');
                                }
                            }
                        });

                        if (this.transcriptTimeStamps[i].endmilliseconds > currentTimeAsMilliseconds) {
                            this.closedCaptionsText.show();
                        }
                        else {
                            this.closedCaptionsText.hide();
                        }

                        cmpl.positionTranscriptRecenter();
                        return;

                    }
                }
            }
        },
        init: function () {
            //The following is used to determine the user's native browser language so we can set a language if it is available.
            const langs = [].concat(navigator.languages, navigator.language, navigator.userLanguage, navigator.browserLanguage, navigator.systemLanguage).filter(Boolean);
            //We always default to the brower's prefered language if it is available.
            if (langs.length) {
                var languageFound = false;
                for (var lang = 0; lang < langs.length; lang++) {

                    //We only use 2 letter codes.
                    var twocode = langs[lang];
                    if (twocode.length > 2) {
                        twocode = twocode[0] + twocode[1];
                    }

                    twocode = twocode.toUpperCase();
                    var userLanguageCode = twocode;

                    //See if this is an available langauge or not.
                    for (var z = 0; z < this.languages.length; z++) {
                        if (this.languages[z].LanguageCode == userLanguageCode) {
                            languageFound = true;
                            this.languageCode = this.languages[z].LanguageCode;
                        }
                    }
                    if (languageFound) {
                        break;
                    }
                }
            }

            //We prepopulate the milliseconds on segments for later use.
            for (var i = 0; i < this.segments.length; i++) {
                if (this.segments[i].LanguageCode == this.languageCode) {
                    this.segments[i].milliseconds = this.convertTimestampToMilliseconds(this.segments[i].TimeStamp);
                    this.segments[i].clippedmilliseconds = this.convertTimestampToMilliseconds(this.convertRealTimestampToClippedTimestamp(this.segments[i].TimeStamp));
                }
            }

            //Setup languages which will appear to be switched between.
            for (var i = 0; i < this.languages.length; i++) {

                var checked = this.languages[i].LanguageCode == this.languageCode ? "checked" : "";
                if (this.languages[i].LanguageCode == this.languageCode) {
                    this.settingsLanguageText.text(this.languages[i].NativeLanguageDisplay);
                    this.settingsLanguageText.attr("aria-label", "Current Language " + this.languages[i].NativeLanguageDisplay);
                    this.settingsLanguageText.attr("title", this.languages[i].NativeLanguageDisplay);
                }

                var langOption = `<li>
                                    <div href="#" onkeydown="cmpl.settingsLanguageKeyDown(event);" onclick="event.stopPropagation(); cmpl.setLanguage('` + this.languages[i].LanguageCode + `','` + this.languages[i].NativeLanguageDisplay + `');" class="language-opt focus:bg-secondary-dark flex gap-1 items-center px-4 py-1 hover:bg-secondary-dark -mx-2 flex-row text-white text-sm focus-enforce-overlay">
                                        <input ` + checked + ` type="radio" id="subtitles-cc-options-` + this.languages[i].LanguageCode + `" name="subtitles-cc-options" value="` + this.languages[i].LanguageCode + `" class="radio-custom">
                                        <label for="subtitles-cc-options-` + this.languages[i].LanguageCode + `" class="cursor-pointer radio-custom-label w-full"> ` + this.languages[i].NativeLanguageDisplay + `</label>
                                    </div>
                                </li>`;
                this.settingsLanguageMenuLanguages.append(langOption);

                //Next we have to populate languages inside the modal menu.
                //First, is the button itself on the modal with its options.
                var display = this.languages[i].LanguageCode == this.languageCode ? "block" : "none";
                var checked = display == "block";
                this.modalToggleLanguageButton.append(`<span class="text-tertiary-dark grow-0 mr-3 modal-language-option" data-code="` + this.languages[i].LanguageCode + `" style="display: ` + display + `;">` + this.languages[i].NativeLanguageDisplay + `</span>`);

                this.modalLanguageMenu.append(`<li class="bg-white p-2 mb-0.5 hover:bg-primary-light-33-opacity">
                                                            <a href="#" class="langOpt language-radio" onclick="cmpl.setLanguage('` + this.languages[i].LanguageCode + `','` + this.languages[i].NativeLanguageDisplay + `'); cmpl.languageRadioClick(this);" role="radio" aria-label="` + this.languages[i].NativeLanguageDisplay + `" aria-checked="` + (checked ? "true" : "false") + `">
                                                                <span class="w-6">
                                                                    <i class="fas fa-check mr-1 text-primary font-normal text-xs text middle modal-language-check" data-code="` + this.languages[i].LanguageCode + `" style="display:` + display + `;"></i>
                                                                </span>
                                                                <span>
                                                                    ` + this.languages[i].NativeLanguageDisplay + `
                                                                </span>
                                                            </a>
                                                        </li>`);
            }
            this.modalToggleLanguageButton.append(`<i class="text-tertiary-dark  grow-0 text-normal fas fa-angle-right"></i>`);

 
            //Setup all the events on controls on the page.
            this.wireControls();

            this.viewPortHeight = $(window).height(); //init to iframe height.  This will hopefully get reset later by embed.js

            var ios = (/iphone|ipod/i.test(navigator.userAgent.toLowerCase()));
            if (ios) {
                this.playBackSpeedThree.closest('li').hide();
                this.playBackSpeedTwoAndHalf.closest('li').hide();
                this.modalPlaybackSpeed3Button.closest('li').hide();
                this.modalPlaybackSpeed25Button.closest('li').hide();
            }
        },
        getMimetype: function (src = '') {
        var ext = cmpl.getFileExtension(src);
            var mimetype = cmpl.mimetypesKind[ext.toLowerCase()];

        return mimetype || '';
        },
        getFileExtension: function (path) {
            if (typeof path === 'string') {
                const splitPathRe = /^(\/?)([\s\S]*?)((?:\.{1,2}|[^\/]+?)(\.([^\.\/\?]+)))(?:[\/]*|[\?].*)$/;
                const pathParts = splitPathRe.exec(path);

                if (pathParts) {
                    return pathParts.pop().toLowerCase();
                }
            }

            return '';
        },
        getHLSStream:  async function () {
            var url = cmpl.source;
            var res = await fetch(url);
            var streamText = await res.text();

            var parts = streamText.split("\n");

            var urlMainPart = url.split("/manifest/")[0];
            var streamInfProcessed = false;
            var representation = null;
            for (var i = 0; i < parts.length; i++) {
                if (parts[i].includes("#EXT-X-STREAM-INF") || streamInfProcessed) {
                    if (streamInfProcessed) {
                        representation.id = `${urlMainPart}/manifest/${parts[i]}`;
                        cmpl.qualityLevels.addQualityLevel(representation);
                        representation = null;
                        streamInfProcessed = false;
                    } else {
                        var resolution = parts[i].split("RESOLUTION=")[1].split(",")[0].split("x");
                        var height = resolution[1];
                        var width = resolution[0];
                        var bandwith = parts[i].split("BANDWIDTH=")[1].split(",");

                        var representation = {
                            width: width,
                            height: height,
                            bandwidth: bandwith,
                            enabled: true
                        }
                        streamInfProcessed = true;
                    }
                }
            }
        },
        getDashStreamManifest: async function () {
            var url = cmpl.dashSource;
            var res = await fetch(url);
            var streamText = await res.text();

            var xmlDoc = $.parseXML(streamText);
            var representations = [];
            $("AdaptationSet", xmlDoc).each(function (i, adaptationSetNode) {
                var $adaptionNode = $(adaptationSetNode);
                var mimetype = $adaptionNode.attr("mimeType");
                if (mimetype && mimetype == "video/mp4") {
                    $adaptionNode.find("Representation").each(function (i, representationNode) {
                        var $representationNode = $(representationNode);
                        var representation = {
                            id: `${$representationNode.attr("height")}https`,
                            width: $representationNode.attr("width"),
                            height: $representationNode.attr("height"),
                            bandwidth: $representationNode.attr("bandwidth"),
                            enabled: true
                        }
                        representations.push(representation);
                    });
                    var sortedArray = representations.sort(({ height: a }, { height: b }) => b-a)

                    for (var i = 0; i < sortedArray.length; i++) {
                        cmpl.qualityLevels.addQualityLevel(sortedArray[i]);
                    }
                }
            });

        },


        initClipMaskTime: function (x) {
            //Same as init time but doesn't mess with the time block which are otherwise set on load.
            this.setCurrentTime(x);
        },
        initializeIMA: function ()
        {
            var cmpl = this;
            if (this.hasAds())
            {
                if (typeof google == 'undefined') {
                    console.log("CMPL: Google not loaded yet.");
                    setTimeout(function () {
                        cmpl.initializeIMA();
                    }, 100);
                    return;
                }

                //This comes from the IMA SDK for handling ads.
                console.log("CMPL: initializing IMA for ads.");
                this.adContainer = document.getElementById('ad-container');

                //You have be pointing directly at the underlying video element.
                var html5Player = $('#video');
                var realPlayer;
                if (html5Player.is('video')) {
                    realPlayer = document.getElementById('video');
                }
                else {
                    realPlayer = document.getElementById($('#video').find('video').attr("id"));
                }

                google.ima.settings.setDisableCustomPlaybackForIOS10Plus(true);

                this.adDisplayContainer = new google.ima.AdDisplayContainer(this.adContainer, realPlayer);
                this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);

                
                this.adsLoader.addEventListener(
                    google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
                    function (adsManagerLoadedEvent) {
                        // Instantiate the AdsManager from the adsLoader response and pass it the video element
                        var adsRenderingSettings = new google.ima.AdsRenderingSettings();
                        adsRenderingSettings.uiElements = [google.ima.UiElements.AD_ATTRIBUTION, google.ima.UiElements.COUNTDOWN];
                        try
                        {
                            console.log("CMPL: LOADING ADS MANAGER");
                            cmpl.adsManager = adsManagerLoadedEvent.getAdsManager(realPlayer, adsRenderingSettings);
                            //This completes showing of our player.
                            cmpl.loadComplete();
               
                        }
                        catch (ex)
                        {
                            console.log("CMPL: ADS MANAGER FAILD TO LOAD");
                            console.log(ex);
                            cmpl.loadComplete();
                        }

                      
                        //Wire up events to the ad manager.  This is where the real work of playing/pausing etc happens.
                        cmpl.adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, function (adErrorEvent) {
                            console.log(adErrorEvent.getError());
                            if(cmpl.adsManager) {
                                cmpl.adsManager.destroy();
                            }
                            cmpl.loadComplete(); //in case load never happened.
                            cmpl.hideAd();
                        });

                        //Ad is requesting we pause.
                        cmpl.adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, function () {
                            cmpl.showAd();
                        });
  
                        //Ad is requesting we play again.
                        cmpl.adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, function () {

                            cmpl.hideAd();
                        });

                        //Ad loads, but it might be a non-linear ad or basically not a video ad to play so we don't want to pause.  Have to check.
                        cmpl.adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, function (adEvent) {
                            var ad = adEvent.getAd();
                            cmpl.loadComplete(); //in case this hasn't happened yet.'
                            if (!ad.isLinear()) {
                                cmpl.play();
                            }
                        });


                        //If the ad pauses for whatever reason, usually the user clicked on it,
                        //we need to show a UI which will allow play back to resume.  This is not built in (for whatever reason)
                        cmpl.adsManager.addEventListener(google.ima.AdEvent.Type.PAUSED, function () {
                            //Show the ad big play button.
                            cmpl.adBigPlayButton.attr("tabindex", "1");
                            cmpl.adBigPlayButton.show();
                            cmpl.adContainerElement.attr("tabindex", "-1");
                            cmpl.adBigPlayButton.focus();
                            cmpl.adPlaying = false;
                            cmpl.adPaused = true;

                        });

                        cmpl.adsManager.addEventListener(google.ima.AdEvent.Type.RESUMED, function () {
                            //Show the ad big play button.
                            cmpl.adBigPlayButton.attr("tabindex", "-1");
                            cmpl.adBigPlayButton.hide();
                            cmpl.adContainerElement.attr("tabindex", "1");
                            cmpl.adContainerElement.focus();
                            cmpl.adPlaying = true;
                            cmpl.adPaused = false;
                        });


                        console.log("CMPL: Ad Cue Points");
                        console.log(cmpl.adsManager.getCuePoints());
                    },
                    false);

                this.adsLoader.addEventListener(
                    google.ima.AdErrorEvent.Type.AD_ERROR,
                    function (adErrorEvent) {
                        if(cmpl.adsManager) {
                            cmpl.adsManager.destroy();
                        }
                        cmpl.loadComplete(); //load complete if error.
                    },
                    false);

                //THIS IS HANDLED IN THE ACTUAL ENDED EVENT FOR PLAYER WHICH IS SCAFFOLDED WITH THE PLAYER ABOVE.
                // Let the AdsLoader know when the video has ended
                //videoElement.addEventListener('ended', function() {
                //adsLoader.contentComplete();
                //});

                var adsRequest = new google.ima.AdsRequest();
                adsRequest.adTagUrl = cmpl.adLink;

                // Specify the linear and nonlinear slot sizes. This helps the SDK to
                // select the correct creative if multiple are returned.
                adsRequest.linearAdSlotWidth = videoPlayer.clientWidth;
                adsRequest.linearAdSlotHeight = videoPlayer.clientHeight;
                adsRequest.nonLinearAdSlotWidth = videoPlayer.clientWidth;
                adsRequest.nonLinearAdSlotHeight = videoPlayer.clientHeight / 3;

                // Pass the request to the adsLoader to request ads
                console.log("CMPL: Ads Requesting...");
                this.adsLoader.requestAds(adsRequest);
            }
        },
        initTime: function (x) {
            //EXPECTED REAL TIME.  x = Seconds in Real Time.
            this.setCurrentTime(x);
            this.currentTimeSpan.text(this.currentTimeAsMinutes());
            this.currentTimeSpanSR.text(this.currentTime());
        },
        initTimeFromTimeStamp: function (x) {
            //EXPECTED REAL TIME.  x = Seconds in Real Time.
            var startSecs = this.convertTimestampToMilliseconds(x) / 1000;
            this.initTime(startSecs);
        },
        interactive: function ()
        {
            if (this.interactives != null && this.interactives.length)
            {
                var time = this.currentTime();

                for (var i = 0; i < this.interactives.length; i ++)
                {
                    var inter = this.interactives[i];

                    if (time >= inter.StartTimeAsSeconds && time <= inter.EndTimeAsSeconds)
                    {
                        if (!$('#' + inter.Id).is(":visible"))
                        {
                            $('#' + inter.Id).fadeIn();
                        }
                    }
                    else
                    {
                        if ($('#' + inter.Id).is(":visible"))
                        {
                            $('#' + inter.Id).fadeOut();
                        }
                    }
                }

            }
        },
        isClipped: function (time) {
            //returns true if the time passed in as seconds with millisecond decimal, is a clipped time.

            if (this.clipMasking) {
                var milli = time * 1000; //covert seconds to milliseconds.

                for (var i = 0; i < this.clipModel.Clips.length; i++) {
                    var clip = this.clipModel.Clips[i];

                    if (clip.ClipStartMilliseconds <= milli && clip.ClipEndMilliseconds >= milli) {
                        return clip.ModifiedStartMilliseconds === -1;
                    }
                }
            }

            return false;
        },
        isAndroid: function () {
            var ua = navigator.userAgent.toLowerCase();
            var isAndroid = ua.indexOf("android") > -1; //&& ua.indexOf("mobile");
            return isAndroid;
        },
        isFloat: function (val) {
            var floatRegex = /^-?\d+(?:[.,]\d*?)?$/;
            if (!floatRegex.test(val))
                return false;

            val = parseFloat(val);
            if (isNaN(val))
                return false;
            return true;
        },
        isIPhone: function () {
            var isiPhone = navigator.userAgent.toLowerCase().indexOf("iphone");

            if (isiPhone > -1) {
                return true;
            }
            return false;
        },
        isInt: function (value) {
            var x;
            if (isNaN(value)) {
                return false;
            }
            x = parseFloat(value);
            return (x | 0) === x;
        },
        isMobile: function () {
            var isMobile = false; //initiate as false
            // device detection
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
                || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
                isMobile = true;


                if (screen.width >= 768 && screen.height >= 768) {
                    //this is tablet instead.
                    isMobile = false;
                }

            }
            return isMobile;
        },
        isSafari: function () {
            return navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
                navigator.userAgent &&
                navigator.userAgent.indexOf('CriOS') == -1 &&
                navigator.userAgent.indexOf('FxiOS') == -1;
        },
        isValidTimeStamp: function (timestamp) {
            //Returns formatted time stamp or "" if not valid time stamp.
            //First, just test for a number, if it is, that's seconds and done.
            if (this.isInt(timestamp)) {
                //This is just millseconds.
                return timestamp;
            }
            else {
                //If it contains ':' we can work with it else not.
                if (timestamp.indexOf(':') != -1) {
                    var split = timestamp.split(':');
                    //Check that everything in split is an integer.
                    var check = true;
                    for (var i = 0; i < split.length; i++) {
                        if (!this.isInt(split[i])) {
                            check = false;
                        }
                    }

                    if (check) {
                        return timestamp;
                    }
                }
            }
            return ""; //not valid.
        },
        languageRadioClick: function (ctrl) {
            //handles accessibility for language radios.
            $('.language-radio').each(function () {
                $(this).attr("aria-checked", false);
            });
            $(ctrl).attr("aria-checked", true);
        },
        loadAds: function () {
            //This comes from the IMA ads implementation from Google.
            var cmpl = this;
            if (this.hasAds())
            {
                if(this.adsLoaded) {
                    return; //don't load twice on accident.
                }

                this.adsLoaded = true;

                //ThIS ROUTINE IS WIRED TO THE PLAY EVENT.  IF ADS ARE NOT LOADED, THIS WILL RUN INSTEAD OF PLAY.
                //SO THERE IS NO NEED TO CANCEL PLAY.
                // prevent triggering immediate playback when ads are loading
                //event.preventDefault();

                console.log("CMPL: loading ads");

                // Initialize the container. Must be done via a user action on mobile devices.
                this.adDisplayContainer.initialize();

                var width = videoPlayer.clientWidth;
                var height = videoPlayer.clientHeight;
                try {

                    
                    this.adsManager.init(width, height, google.ima.ViewMode.NORMAL);
                    this.adsManager.start();
                } catch (adError) {
                    // Play the video without ads, if an error occurs
                    console.log("CMPL: AdsManager could not be started");
                    console.log(adError);
                    var promise = videoPlayer.play();
                    if (promise !== undefined) {
                        promise.then(function () {
                        }).catch(function (error) {
                            console.log(error);
                            cmpl.mute();
                            //try again, muted.
                            var mutedPromise = videoPlayer.play();
                            if (mutedPromise !== undefined) {
                                mutedPromise.then(function () {
                                    cmpl.autoPlayMessageContainer.show();
                                }).catch(function (error) {
                                    console.log(error);
                                    cmpl.unmute();
                                    cmpl.pause();
                                });
                            }
                        });
                    }
                }
            }
        },
        loadComplete: function () {

            if (this.loadedDataComplete == false)
            {
                //Gets called when loading completes to show the player.
                this.highlightTranscript();
                this.preLoadContainer.hide();
                this.container.fadeIn();
                this.loadedDataComplete = true;

                if (this.autoPlay && ((this.hasAds() && !this.isIPhone()) || !this.hasAds())) {
                    ///On a packaged assset, we do not mute.
                    //WE are autoplaying from one video to the next video.
                    this.play(false, true);
                }
            }
        },
        loadData: function (reload) {
            var cmpl = this;
            //Reload can be passed in if we ever need to reload data on a video.
            //This was originally put in to handle when you exit clip mode.
            if (typeof reload === 'undefined') {
                reload = false;
            }

            //Load data is primarily intended to be called by the parent keyed message.
            //If this never occurs, a 1 second timer will force this to go.
            //It is possible that the parent keyed message calls this function, but the player hasn't loaded metadata yet.
            //In that case, we will attempt to call loadData again.  Eventually, the 1 second timer will override all of this and call this straight up 
            //just to load the player.
            if ((!this.loadedData || reload) && this.playerLoaded) {

                //Because Load Data is often called before a video has finished loading (due to the loadeddata and loadedmetadata events not being reliable) 
                //this self healing loop attempt to loop over and call itself when the thing has loaded.
                //It will try 10 times, and if that fails, will then attempt to manually kick off a load
                //and try some more, etc.
                //If it eventually, completely fails, it will then load anyways and hope for the best.
                if (!reload) {
                    


                    if (videoPlayer.duration() == 0 && this.attemptedReloadCount < 20) {
                        //This will loop for 1 second to try and load the video properly.
                        //If it eventually, fails, we will load anyways.
                        this.attemptedReloadCount++;
                        setTimeout(function () {
                            cmpl.loadData();
                        }, 50);
                        return;
                    }
                    else {
                        if (videoPlayer.duration() == 0) {
                            console.log("CMPL: Duration never loaded, attempting to load w/o duration.");
                        }
                        else {
                            console.log("CMPL: Was able to successfully load duration.");
                        }
                        parent.postMessage(`{"method":"loaded","key":"${this.parentKey}"}`, '*');
                    }
                }

                this.isLoaded = true;
                this.loadedData = true;

                //This will construct the transcript from the CMPL Json file.
                try {

                    //If this is audio player, need to send message to parent page about that.
                    if (this.type == "Audio") {
                        parent.postMessage('{"method":"AudioPlayer_v2","key":"' + cmpl.parentKey + '","showTitle":"' + this.showTitle + '"}', "*");
                    }

                    //Validate end
                    if (this.hasEnd) {
                        if (this.convertTimestampToSeconds(this.videoEnd) < 0 || this.convertTimestampToSeconds(this.videoEnd) > this.duration()) {
                            this.hasEnd = false;
                            this.videoEnd = this.videoEndOg;
                        }

                        if (this.hasEnd && this.hasStart) {
                            if (this.convertTimestampToSeconds(this.videoEnd) <= this.convertTimestampToSeconds(this.videoStart)) {
                                this.hasEnd = false;
                                this.videoEnd = this.videoEndOg;
                            }
                        }
                    }

                    if (this.hasEnd) {
                        this.clipMode = true;
                        //The end time is the effective duration.  End time passed in is expected to already be clipped time.
                        this.durationSpan.text(this.convertTimeStampToReadable(this.videoEnd));
                        this.srDuration.text("Video Duration " + this.convertTimeStampToScreenReader(this.videoEnd));
                    }
                    else {
                        if (this.clipMasking) {
                            this.durationSpan.text(this.convertTimeStampToReadable(cmpl.clipModel.clipped_duration));
                            this.srDuration.text("Video Duration " + this.convertTimeStampToScreenReader(this.clipModel.clipped_duration));
                        }
                        else {
                            this.durationSpan.text(this.durationAsMinutes());
                            this.srDuration.text("Video Duration " + this.convertSecondsToScreenReaderReadable(this.duration()));
                        }
                    }


                    //Validate start parameter.
                    if (this.hasStart) {
                        if (this.convertTimestampToSeconds(this.videoStart) < 0 || this.convertTimestampToSeconds(this.videoStart) >= this.duration()) {
                            this.hasStart = false;
                            this.videoStart = this.videoStartOg;
                        }
                    }

                    if (this.hasStart) {
                        this.clipMode = true;
                        //Start time passed in is expected to already be clipmasked.
                        this.initTimeFromTimeStamp(this.convertClippedTimeStampToRealTimeStamp(this.videoStart));
                    }
                    else {
                        this.currentTimeSpan.html(this.currentTimeAsMinutes());
                        this.currentTimeSpanSR.html(this.convertSecondsToScreenReaderReadable(this.currentTime()));


                        //If we are clip masking, we need to set the start time of the asset.
                        if (this.clipMasking) {
                            var moveStartTime = this.nextValidClipBlockStartTime(0);
                            if (moveStartTime === -1) {
                                //This means nothing at all on this asset is playable.
                                this.hasEnded = true;
                                this.setTime(9999999);
                                this.updatePlayBackPercentage(false);
                            }
                            else {
                                //A bug has been discovered where setting current time to partials may result in a bad time being set.
                                //This probably has to do with float and is part of the underlying video.js library.
                                //e.g. we set to 32.001 and it really sets to 32.000999  ... this is an obvious problem if our real start time is the .001 and not the .000999
                                //So, to compensate, we always increase start time by 100 MS.
                                this.initClipMaskTime(moveStartTime + 0.100);
                            }
                        }
                    }

                    if (this.clipMode && !this.hideClipMode) {
                        this.clipModeContainer.show();
                        this.titleClipMode.show();
                    }
                    else {
                        this.clipModeContainer.hide();
                        this.titleClipMode.hide();
                    }



                    this.buildTranscript();
                    if (this.collapsedTabs)
                    {
                        setTimeout(function () {
                            cmpl.collapseTranscript();
                        }, 100);
                    }
    
                    this.buildTitle();

                    //Clip mode overrides cue mode.
                    if (!reload && this.hasCue && !this.hasStart) {
                        if (this.clipMasking) {
                            var cueSecs = this.convertTimestampToMilliseconds(this.cue) / 1000;
                            this.initClipMaskTime(this.realTimeFromClippedTime(cueSecs));
                        }
                        else {
                            this.initTimeFromTimeStamp(this.cue);
                        }
                    }

                  
                    //Build segments onto the scrubber.
                    this.buildSegments();
                    this.buildChatTab();

                    if (this.searchString !== "") {
                        //Perform an initial search.
                    }

                    //AMS has a hard coded tab index on their volume bar which causes us problems with tabbing to something that you can't see.
                    //This volume bar appears when you play a video, so we turn it off here.

                    if (!reload) {
                        $('.vjs-volume-bar').attr("tabindex", "-1"); //set tab index to -1 so you can't tab this thing.
                        $('.vjs-volume-bar').hide();
                        $('.vjs-text-track-display').attr('aria-hidden', 'true');
                        //$('.vjs-controls-disabled div').attr('aria-hidden', 'true').attr("aria-label", "Video Player").attr("Role", "Region");
                        $('.azuremediaplayer').attr("aria-label", "Video Player");
                        $('.azuremediaplayer div').attr("aria-hidden", "true");
                    }

                    //library.fullLoader.hide();

                    //For packaged assets, there is a faux container that we need to show once the loader
                    //has been hidden.  THis handles that.  The check on length ensures this thing exists
                    //before we really try it.
                    //if ($("#faux-container").length) {
                    //if (showFaux) {
                    //$('#faux-container').show();
                    //}
                    //}

                    //library.contentContainer.show();
                    //library.resizeVideoFrame();

                    if (!reload && this.muted)
                    {
                        this.mute();
                    }

                
                    this.clearSegmentShare(); //clear out any segment shares (in case of reload)

                    //Setup initial custom share values.
                    this.clipCustomStartTime.val(this.convertSecondsToReadable(this.startSecs()));
                    this.clipCustomEndTime.val(this.convertSecondsToReadable(this.endSecs()));

                    //Determine which main tab to display, if any.
                    if (this.hasTranscript) {
                        this.tabButtonClick(this.transcriptTabButton, this.mainTabsBox, this.transcriptDisplay);
                        this.searchPreTab = this.transcriptTabButton;
                    }
                    else if (this.hasSegments) {
                        this.tabButtonClick(this.segmentsTabButton, this.mainTabBox, this.segmentsDisplay);
                        this.searchPreTab = this.segmentsTabButton;
                    }
                    else if (!this.hasTranscript && !this.hasSegments) {
                        //We want to display the "were sorry" message.
                        this.notRightRailContent.show();
                    }

                    //Perform replacement on citation with parent url if replacement variable exists.
                    //otherwise, hide cite menu option if no citation is present.
                    this.citationInput.val("");
                    if (this.citation == null || this.citation === "") {
                        this.citeButton.hide();
                        this.citeButtonAudio.hide();
                    }
                    else {
                        this.citeButton.show();
                        this.citeButtonAudio.show();
                        var cite = this.citation;
                        cite = cite.replace("[[Url]]", this.parentUrl);
                        this.citationInput.val(cite);
                    }


                    //This method will call the parent utilizin EMBED.JS to tell it to go ahead and resize
                    //because this thing is now loaded and to allow for further resize.
                    parent.postMessage('{"method":"resize_v2","key":"' + cmpl.parentKey + '"}', "*");

                   

                    if (!this.embedJSDetected) {
                        //Options that are only available with EMBED.JS
                        this.modalToggleTranscriptOption.hide();
                        this.collapseTranscriptButton.hide(); //We can't collapse transcript w/o embed.js to resize iframe.
                    }

                    //This handles state of the player based on existence of transcript, segments, or selected mode of the player.
                    if ((!this.hasTranscript && !this.hasSegments) || this.videoOnly) {
                        this.setNoTabs();
                        this.noTabsAlways = true;

                        //We also temporarily, permanently hide Search buttons because there's nothing to search right now.
                        this.modalSearchButton.addClass('hidden-force');
                        if (this.searchButtonModalAudio.length) {
                            this.searchButtonModalAudio.addClass('hidden-force');
                        }
                    }
                    else {
                        //means the player is configured to only show the video and nothing else.
                        if (this.toggleTranscript) {
                            this.setTranscriptless();
                        }
                        else {
                            this.setTranscript();
                        }

                        if (!this.hasTranscript && this.hasSegments) {
                            //Set the text of the show button to read something other than transcript.
                            this.transcriptButtonText.text("Segments");
                        }

                    }

                    //If not transcript, we need to hide CC button because there would be no CC either.
                    if (!this.hasTranscript) {
                        this.setCCState(true);

                        if (this.captionsOff && this.captionsOn)
                        {
                            this.toggleCC();
                        }
                    }
                    else {
                        this.setCCState(false);
                    }

                    if (!reload) {
                        //On the first pass, we log an initial request.
                        cmpl.logRequest();
                    }

                   
                    //Setup ads if there are any.
                    if (cmpl.hasAds() && cmpl.adsInitialized == false)
                    {
                        console.log("CMPL: Starting up ads engine.");
                        cmpl.initializeIMA();
                    }
                    else
                    {
                        cmpl.loadComplete();
                    }

                    //Handle default tab behavior.
                    if (cmpl.defaultTabs == "Segments" && cmpl.hasSegments)
                    {
                        cmpl.segmentsTabButton.click();
                    }


                    //This is for any application which listens on playerLoaded events.
                    if (!reload) {
                        parent.postMessage('{"method":"playerLoaded"}', "*");
                    }

                }
                catch (ex) {
                    console.log("CMPL: Error occurred after video load.");
                    console.log(ex);
                }
            }
            else if (!this.playerLoaded) {
                //This insinuates a secnario where the parent keyed message has called to load data, but the player itself has not finished
                //loading yet.
                //In this case, we will call loaddata again in the hopes that it eventually does load.
                //After 1 second, a timer will make this work even if the player never "loads" which happens sometimes in some formats.
                setTimeout(function () {
                    cmpl.loadData();
                }, 50);
            }
        },
        logAction: function (action, property) {
            var cmpl = this;
            if (this.recordAnalytics && cmpl.receivedRequest) {

                //Parse out our analytics ids to send along.
                var analyticsIds = "";
                for (var i = 0; i < this.analyticsIds.length; i++) {
                    analyticsIds += "&analyticsIds=" + encodeURIComponent(this.analyticsIds[i]);
                }

                $.ajax({
                    async: true,
                    type: "POST",
                    url: "/Analytics/RecordRequestAction?analyticsRequestId=" + cmpl.requestId + "&id=" + encodeURIComponent(cmpl.videoIdentifier) + "&key=" + encodeURIComponent(cmpl.analyticsKey) + "&registeredOrganizationId=" + encodeURIComponent(cmpl.organizationId) + "&sessId=" + encodeURIComponent(cmpl.sessionId) + "&Act=" + encodeURIComponent(action) + "&Property=" + encodeURIComponent(property) + analyticsIds,
                    success: function (data) {
                        //Silent success.  It either recorded or it didn't.
                    },
                    error: function (x, y, z) {
                        console.log("CMPL: Failed to log Analytics Action.");
                        console.log(x.responseText);
                    }
                });
            }
            else if (this.recordAnalytics && !cmpl.receivedRequest && !cmpl.receivedRequestError) {
                //In this case, we may be trying to log before we got back our request id.  So, we will set this on a timer to try again in about 5 seconds.
                setTimeout(function () {
                    cmpl.logAction(action, property);
                }, 5000);
            }
        },
        logViewBlock: function (startSecs, uuid) {
            var cmpl = this;

            //Do not log if start secs is invalid (makes no sense)
            if (startSecs < 0 || startSecs >= cmpl.duration()) {
                //invalid.
                console.log("CMPL: Rejected View Block because Start Seconds is outside of duration:" + startSecs);
                cmpl.recordedViewBlocksFailed.push(uuid);
                return;
            }


            if (this.recordAnalytics && this.receivedRequest) {

                //Parse out our analytics ids to send along.
                var analyticsIds = "";
                for (var i = 0; i < this.analyticsIds.length; i++) {
                    analyticsIds += "&analyticsIds=" + encodeURIComponent(this.analyticsIds[i]);
                }

                if (cmpl.viewBlockLogLast == -1) {
                    cmpl.viewBlockLogLast = 0;
                    setTimeout(function () { cmpl.viewBlockLogLast = -1; }, 1000);
                    cmpl.lastSuccessfulUuid = uuid;
                    $.ajax({
                        async: true,
                        type: "POST",
                        url: "/Analytics/RecordPlayerViewBlock?analyticsRequestId=" + encodeURIComponent(cmpl.requestId) + "&id=" + encodeURIComponent(cmpl.videoIdentifier) + "&key=" + encodeURIComponent(cmpl.analyticsKey) + "&registeredOrganizationId=" + encodeURIComponent(cmpl.organizationId) + "&sessId=" + encodeURIComponent(cmpl.sessionId) + "&recordId=" + encodeURIComponent(uuid) + "&startSecs=" + encodeURIComponent(startSecs) + "&duration=" + encodeURIComponent(cmpl.duration()) + analyticsIds,
                        success: function (data) {
                            if (data == null || data == "") {
                                //This is going to fail for any further updates, but at least they won't get hung up.'
                                console.log("CMPL: Failed to log View Block.");
                                cmpl.recordedViewBlocksFailed.push(uuid);
                            }
                            else {
                                cmpl.recordedViewBlocks.push(data); //When we get a response back, we push it into the array.  We do this to signify a response was retrieved so any waiting updates can trigger.
                            }
                        },
                        error: function (x, y, z) {
                            console.log("CMPL: Failed to log View Block.");
                            console.log(x.responseText);
                            //Doesn't matter if we fail, we just fail to record this view block and any updates.
                            cmpl.recordedViewBlocksFailed.push(uuid); //Even though we got an error, we still push to release any waiting updates.  They will all fail to record but at least they will be sent.
                        }
                    });
                }
                else {
                    //In this case, we actually want to revert the current uuid back to the previous view block.
                    //This scenario happens when someone is super fast starting and stopping.  We want to prevent recording a bajillion view blocks.
                    //But we also don't want to lose the time if they are get this off the ground.
                    //This means we will eventually capture the time if they let it play without continuing to start / stop.
                    console.log("CMPL: Rejecting UUID because not at least one second since last view block started.");
                    cmpl.viewBlockId = cmpl.lastSuccessfulUuid;
                    cmpl.recordedViewBlocksFailed.push(uuid);
                }

                
            }
            else if (this.recordAnalytics && !cmpl.receivedRequest && !cmpl.receivedRequestError) {
                setTimeout(function () { cmpl.logViewBlock(startSecs, uuid); }, 5000); //Try again to record this view block in 5 seconds.
            }
        },
        logViewBlockUpdate: function (endSecs, uuid, lastAutoLog) {
            var cmpl = this;


            //Validate.  If end secs is not possible, we throw this away.
            if (endSecs < 0 || endSecs > cmpl.duration() + 2 || lastAutoLog == -1) {
                console.log("CMPL: Rejected view block update because end seconds is outside duration or auto logging has been disabled due to error detection: " + endSecs + " -- " + lastAutoLog);
                return;
            }

            //To prevent any impossible end time logging, we will prevent logging any time that exceeds roughly 10 seconds from the last auto log.
            if (endSecs - lastAutoLog >= 20) {
                //If this is the case, we ignore this.
                console.log("CMPL: Rejected view block update because it has been at least 20 seconds since the view block start: " + endSecs + " -- " + lastAutoLog);
                return;
            }


            if (this.recordAnalytics && !cmpl.receivedRequestError) {
                //See if our view block is accounted for yet.
                var accounted = false;
                var failed = false;
                for (var i = 0; i < cmpl.recordedViewBlocks.length; i++) {
                    if (cmpl.recordedViewBlocks[i] == uuid) {
                        accounted = true;
                    }
                }

                if (!accounted)
                {
                    for (var i = 0; i < cmpl.recordedViewBlocksFailed.length; i ++)
                    {
                        if (cmpl.recordedViewBlocksFailed[i] == uuid) {
                            failed = true;
                        }   
                    }
                }
                

                if (accounted) {

                    //Parse out our analytics ids to send along.
                    var analyticsIds = "";
                    for (var i = 0; i < this.analyticsIds.length; i++) {
                        analyticsIds += "&analyticsIds=" + encodeURIComponent(this.analyticsIds[i]);
                    }

                    $.ajax({
                        async: true,
                        type: "POST",
                        url: "/Analytics/UpdateViewBlock?id=" + encodeURIComponent(cmpl.videoIdentifier) + "&key=" + encodeURIComponent(cmpl.analyticsKey) + "&registeredOrganizationId=" + encodeURIComponent(cmpl.organizationId) + "&sessId=" + encodeURIComponent(cmpl.sessionId) + "&recordId=" + encodeURIComponent(uuid) + "&endSecs=" + encodeURIComponent(endSecs) + analyticsIds,
                        success: function (data) {
                            //silent success.  
                        },
                        error: function (x, y, z) {
                            console.log("CMPL: Failed to Update View Block.");
                            console.log(x.responseText);
                            //silent failure.
                        }
                    });
                }
                else if (failed)
                {
                    //If the view block never got recorded, then no update will be recorded.  So, no reason to send them.
                }
                else {
                    //if not accounted and no request received error, we will try this again until it is accounted for.
                    setTimeout(function () { cmpl.logViewBlockUpdate(endSecs, uuid, lastAutoLog); }, 5000); // Try again in 5 seconds.
                }
            }
        },
        logRequest: function () {
            if (this.recordAnalytics) {

                //Parse out our analytics ids to send along.
                var analyticsIds = "";
                for (var i = 0; i < this.analyticsIds.length; i++) {
                    analyticsIds += "&analyticsIds=" + encodeURIComponent(this.analyticsIds[i]);
                }

                $.ajax({
                    async: true,
                    type: "POST",
                    url: "/Analytics/RecordPlayerRequest?id=" + encodeURIComponent(cmpl.videoIdentifier) + "&parent=" + encodeURIComponent(cmpl.parentUrl) + "&key=" + encodeURIComponent(cmpl.analyticsKey) + "&registeredOrganizationId=" + encodeURIComponent(cmpl.organizationId) + "&sessId=" + encodeURIComponent(cmpl.sessionId) + analyticsIds,
                    success: function (data) {
                        if (data !== null && data !== "") {
                            cmpl.receivedRequest = true; //we have attempted to create a request.  Any logging that was attempted before this is put on a timeout to re-establish itself if this has not completed yet.
                            cmpl.requestId = data.id; //we now have the request id (or not)
                        }
                        else {
                            //In this scenario, we were unable to record a request.  THis might be due to error or a legitimate failure to record likely because the domain is inside the exclude list.
                            //We mark this as an error to prevent anymore analytics from going through.
                            cmpl.receivedRequest = false;
                            cmpl.receivedRequestError = true;
                            console.log("CMPL: Failed to log Analytics Request.");
                        }
                    },
                    error: function (x, y, z) {
                        console.log("CMPL: Failed to log Analytics Request.");
                        console.log(x.responseText);
                        cmpl.receivedRequest = false;
                        cmpl.receivedRequestError = true;
                    }
                });
            }
        },
        mute: function () {
            this.volumeButton.removeClass('vjs-volume');
            this.volumeButton.addClass('vjs-volume-mute');
            videoPlayer.muted(true);
        },
        muteStatus: function () {
            return videoPlayer.muted();
        },
        nextValidClipBlockStartTime: function (time) {
            //pass in a time in seconds with milliseconds decimal and this will specify the next valid clip start time of the next playable clip block.
            if (this.clipMasking) {
                var milli = time * 1000;


                for (var i = 0; i < this.clipModel.Clips.length; i++) {

                    var clip = this.clipModel.Clips[i];
                    if (clip.ModifiedStartMilliseconds !== -1 && clip.ClipStartMilliseconds >= milli) {
                        return clip.ClipStartMilliseconds / 1000;
                    }
                }

                //If we ahve not returned at this point, it's possible that there is no next clip block start time.  If that is the case, we will return -1.
                return -1;

            }
            return time;
        },
        play: function (autotriggered = false, autoplay = false) {
            //An auto trigger happens when a video is loading to attempt to kickstart
            //a play to get metadata to loader to this thing will function.


            if (autotriggered) {
                try {
                    this.autoTriggeredPlay = true;
                    //We just want to kick off a play and not change the state of anything
                    //else on the screen.
                    cmpl.mute();
                    videoPlayer.play();
                    //After auto triggered play goes, we shortly pause thereafter and reset.
                    setTimeout(function () {
                        cmpl.pause(true);
                        cmpl.viewStart = -1;
                        cmpl.autolog = -1;
                        cmpl.setTimeNoStart(0);
                        cmpl.unmute();
                        cmpl.everStarted = false;  //marks that the video is loaded so any start after this means that the person is actually viewing the video.
                        cmpl.loadData();
                        cmpl.autoTriggeredPlay = false;
                    }, 100);
                }
                catch (ex) {
                    console.log("CMPL: Attempted auto triggered play to force load metadata, and an exception occurred.");
                }
            }
            else {
                //Determine if we even can play.  We can't play if we are at the end of the video.
                if (this.clipMasking) {
                    if (this.clippedTimeFromCurrentTime() >= this.endSecs() || this.hasEnded) {
                        this.setTime(0);
                        return;
                    }
                }
                else {
                    if (this.currentTime() >= this.endSecs() || this.hasEnded) {
                        this.setTime(0);
                        return;
                    }
                }

                this.autoTriggeredPlay = false;
                try {
                    this.viewStart = videoPlayer.currentTime();
                    this.autolog = videoPlayer.currentTime(); //set our auto log timer to the current start.
                    this.viewBlockId = this.generateUUID(); //Get us a new record if for this view block to begin with.

                    this.logViewBlock(this.viewStart, this.viewBlockId); //Record to analytics a new view block.
                   
                    this.thumbWrapper.hide();
                    this.bigPlayButton.hide(); //hide the big play button whenever you play.  Only see it once.

                    //On play, hide play button, show pause button.
                    this.playButton.hide();
                    this.pauseButton.show();

                    if (!this.everStarted) {
                        parent.postMessage('{"method":"playStart"}', "*");
                        this.everStarted = true;

                     

                    }
                    else {
                        parent.postMessage('{"method":"playResumes"}', "*");
                    }

                    this.everStarted = true;//records that we have started one time legit.
                    this.highlightTranscript();
                  
                    //remove hidden force off CC because we are playing now.
                    this.closedCaptions.removeClass('temp-hidden-force');

                    this.playTimeOut = setTimeout(function () {

                        try {
                            //If there are ads, and not loaded, load them instead of playing.
                            if (cmpl.hasAds() && cmpl.adsLoaded == false)
                            {
                                cmpl.loadAds(autoplay);
                            }
                            else
                            {
                                //Just play because there are no ads.
                                if (autoplay) {
                                    var promise = videoPlayer.play();

                                    if (promise !== undefined) {
                                        promise.then(function () {
                                        }).catch(function (error) {
                                            console.log(error);
                                            cmpl.mute();
                                            //try again, muted.
                                            var mutedPromise = videoPlayer.play();
                                            if (mutedPromise !== undefined) {
                                                mutedPromise.then(function () {
                                                    cmpl.autoPlayMessageContainer.show();
                                                }).catch(function (error) {
                                                    console.log(error);
                                                    cmpl.unmute();
                                                    cmpl.pause();
                                                });
                                            }
                                        });
                                    }
                                }
                                else {
                                    videoPlayer.play();
                                }

                               
                                //if (autoplay) {
                                    
                                //    //Check for autoplay.
                                //    setTimeout(function () {
                                //        if (videoPlayer.paused()) {
                                //            cmpl.mute();
                                //            cmpl.play();
                                //            cmpl.autoPlayMessageContainer.show();

                                //            //If auto play is forced, we will unmute just after muting to play...
                                //            //this gets arounds browsers not autoplaying but then they should have.
                                //            if (cmpl.forceAutoPlay) {
                                //                setTimeout(function () { cmpl.unmute(); }, 1000);
                                //            }
                                //        }
                                //    }, 5000);
                                //}
                            }
                            //For some reason, bug somewhere that causes currently selected play speed to no longer apply on restart and some other mechanisms.
                            //This will ensure it always works.
                            cmpl.setPlayspeed(cmpl.checkedPlaySpeed());
                            cmpl.playState = true;

                            //if we are in touch mode, hide the overlay on play.
                            if (cmpl.touch) {
                                cmpl.videoControlOverlay.removeClass('touchpause');
                                cmpl.closedCaptions.removeClass('touchpause');
                            }
                            cmpl.videoControlsLeft.removeClass('mobile-hidden'); //causes the controls left to possible show after video starts playing on mobile (or desktop really)
                       
                            //When a video is playing any force overlay play only should be dismissed.
                            cmpl.unforceOverlayPlayOnly();
                            
                        }
                        catch (ex) {
                            console.log(ex);
                        }

                    }, 300);
                }
                catch (ex) {
                    alert(ex);
                }

            }
        },
        pause: function (autotriggered = false) {

           
            
            //An auto trigger happens as part of video loading when metadata won't load
            //due to browser and video support issues.
            //This is a very special case and is handled primarily during video load.
            if (autotriggered) {
                videoPlayer.pause();
            }
            else {
                videoPlayer.pause();

                //On pause, hide pause button, show play button.
                this.pauseButton.hide();
                this.playButton.show();

                //Detect on pause if we start viewing at any point, and if so,
                //we want to log some watched time.

                if (this.viewStart !== -1 && this.autolog !== -1) {
                    //Update whatever our current view block is with the final time.
                    this.logViewBlockUpdate(videoPlayer.currentTime(), this.viewBlockId, cmpl.autolog);
                    this.viewStart = -1;
                    this.autolog = -1;

                }

                parent.postMessage('{"method":"playEnd"}', "*");
                
                this.playState = false;

                if (this.touch) {
                    //Add the touchpause class to controls so we can see them.
                    this.videoControlOverlay.addClass('touchpause');
                    this.closedCaptions.addClass('touchpause');
                }
            }
        },
        populateLanguageSegments: function () {
            var languageSegments = new Array();
            for (var i = 0; i < this.segments.length; i++) {
                if (this.segments[i].LanguageCode == this.languageCode) {
                    languageSegments.push(this.segments[i]);
                }
            }

            if (languageSegments.length == 0) {
                //Set to OG language 
                for (var i = 0; i < this.segments.length; i++) {
                    if (this.segments[i].LanguageCode == this.originalLanguageCode) {
                        languageSegments.push(this.segments[i]);
                    }
                }
            }
            return languageSegments;
        },
        positionTranscriptRecenter: function () {
            //When we position the recenter icon, we will attempt to position it next to the rolling hightlight, if it is on the screen.
            //If it is not on the screen, we will reposition it relative to the vertical scroll bar, such that the position represents
            //where on the transcript scroll bar the rolling hightlight currently is.
            if ($('.transcript-highlight').length && this.transcriptTabActive()) {
                //There is, so now we need to determine its position based on where the rolling highlight is.
                //To do this, we will consider the height of the container to be 100% of the video.
                //We will then get the top of the rolling highlight.  We will compare this top to the total height of the container.
                //This will give us a proportion.  We can use that proportion to place it relative to the scroll bar.

                var rollingTop = $('.transcript-highlight')[0].offsetTop;
                //rollingTop = $('.transcript-highlight').offset().top;
                //Get the height of the container.
                var containerScrollHeight = this.tabAreaContainer[0].scrollHeight;

                var relativeHeight = rollingTop - this.tabAreaContainer.offset().top;


                //Determine how much of the container height the top has consumed.
                var percentConsumed = rollingTop / containerScrollHeight; //percentage of height consumed of the inner container.

                //Now, using that percentage, place the recenter icon relative to the scroll bar.
                var containerHeight = this.tabAreaContainer.height();

                var top = (containerHeight * percentConsumed);
                //Account for the height of the icon itself.
                //top = top + this.transcriptRecenter.outerHeight(true);

                //Adjust for the tabs box.
                top = top + cmpl.tabsSearchBox.outerHeight(true);

                //Account for the height of the icon itself.
                top = top - ((this.transcriptRecenter.outerHeight(true) / 2));
                //If the top is not at least enough to show the full height of the transcriptRecenter, set it to be so.
                if (top < this.transcriptRecenter.outerHeight(true) + cmpl.tabsSearchBox.outerHeight(true)) {
                    top = cmpl.tabsSearchBox.outerHeight(true);
                }

                
                this.transcriptRecenter.css({
                    top: top + 'px', right: '18px', left: 'unset'
                });
                this.transcriptRecenter.show();
            }
            else {
                this.transcriptRecenter.hide();
            }
            
        },
        playSpeedRadioClick: function (ctrl) {
            //This handles accessibility for play speed radio to set aria-checked status.
            $('.playspeed-radio').each(function () {
                $(this).attr('aria-checked', false);
            });
            $(ctrl).attr("aria-checked", true);

        },
        progressBarClick: function (e) {
            
            var clientRectangle = document.getElementById('progress-bar').getBoundingClientRect();

            var x = e.pageX - clientRectangle.left; // or e.offsetX (less support, though)
            y = e.pageY - clientRectangle.top;  // or e.offsetY



            //Get the percentage of where progress bar was clicked.
            var percentageOfProgressBar = x / cmpl.progressBar.width();



            //Now, based on the duration of this video, grab the time that corresponds to that percentage.

            var percentDuation;

            if (cmpl.clipMode) {
                //If we are in clip mode, we set time based on the percentage of the clipped duration.
                var startSecs = cmpl.startSecs();
                var endSecs = cmpl.endSecs();
                var clipDuration = endSecs - startSecs;
                var percentOfClip = clipDuration * percentageOfProgressBar;

                percentDuration = startSecs + percentOfClip;

            }
            else {
                if (cmpl.clipMasking) {
                    //This sets percent duration to be the modified playable seconds, not real ime.
                    percentDuration = cmpl.convertDurationToSeconds(cmpl.clipModel.clipped_duration) * percentageOfProgressBar;
                }
                else {
                    percentDuration = this.duration() * percentageOfProgressBar;
                }
            }


            //Then, set the the current time.
            cmpl.pause();


            if (cmpl.clipMasking) {
                //When we set percent duration, we need to set it based on real time, not modified time
                cmpl.setTime(cmpl.realTimeFromClippedTime(percentDuration));
            }
            else {
                //When we set percent duration, we need to set it based on real time, not modified time
                cmpl.setTime(percentDuration);
            }
            //Then, update the progress bar to reflec the new time.
            cmpl.updatePlayBackPercentage(false);
        },
        progressBarHover: function (e, mobile) {
            this.scrubbing = true;
            if (mobile) {
                this.showScrubberImage(e.originalEvent.touches[0].pageX, e.originalEvent.touches[0].pageY, this.progressBar, mobile);
            }
            else {
                this.showScrubberImage(e.pageX, e.pageY, this.progressBar, mobile);
            }
        },
        progressBarHoverOut: function (e) {
            this.scrubberContainer.hide();
            this.scrubbing = false;
        },
        realTimeFromClippedTime: function (clippedTime) {
            //This function will take a clipped time (modified time) and translate it to its real time.  This is done in seconds (input and output)
            var milli = Math.floor(clippedTime * 1000);
            if (this.clipMasking) {
                //Find the clip with the modified time.
                for (var i = 0; i < this.clipModel.Clips.length; i++) {
                    var clip = this.clipModel.Clips[i];

                    if (clip.ModifiedStartMilliseconds !== -1 && clip.ModifiedStartMilliseconds <= milli && clip.ModifiedEndMilliseconds >= milli) {
                        return ((clip.ClipStartMilliseconds + (milli - clip.ModifiedStartMilliseconds)) / 1000);
                    }
                }
            }
            return clippedTime; //otherwise, just give back the time beacuse it could not be figured out.

        },
        recordPlayActivity: function () {
            //This function gets called every 5 seconds to record ongoing play activity.
            //This is so that if the video is playing but the user navigates away without pausing, we can at least see that they were there.
            if (this.viewStart != -1 && this.autolog != -1) {
                this.logViewBlockUpdate(videoPlayer.currentTime(), this.viewBlockId, this.autolog);
            }
            else {
                console.log("CMPL: Rejected play activity because view start or auto log was not primed.");
            }
        },
        reload: function(setTime)
        {
            this.loadData(true);
            //Set time to 0
            this.setTime(setTime);
        },
        qualityChangePlayerReload: function (url) {
            //Reload video src to clear buffer for immediate playback in selected quality
            //This should only happen if the video has ever started playing first.  Shouldn't trigger a reload on first play.
            if (this.everStarted)
            {
                this.reloadingQuality = true;
            }
            else
            {
                this.reloadingQuality = false;
            }
            this.reloadTime = this.currentTime();
            this.pause();
            var source = cmpl.source;
            var mimeType = cmpl.getMimetype(source);
            if (videoPlayer.dash != null) {
                source = cmpl.dashSource;
                mimeType = cmpl.getMimetype(source);
            }
            if (url) {
                source = url;
                cmpl.currentSorce = url;
                if (source.includes(".m3u8")) {
                    mimeType = cmpl.mimetypesKind["m3u8"];
                }
                else if (source.includes(".mpd")) {
                    mimeType = cmpl.mimetypesKind["mpd"];
                }
            }

            videoPlayer.src({ src: source, type: mimeType });
        },
        reloadPlayer: function() {
            //This will attempt to reload the player and then set the time after load to the time it was on.
            if (!this.reloading && this.reloadCount < 3)
            {
                this.reloading = true;
                this.reloadCount++;
                this.pause();
                this.reloadTime = this.currentTime();
                videoPlayer.src(videoPlayer.src());
                this.play();
            }
        },
        requestFullScreen: function () {
            if (this.isIPhone()) {
                videoPlayer.requestFullscreen();
                this.fireExitFullScreen = true;
                videoPlayer.addEventListener("webkitendfullscreen", function () {
                    //For iphone, when it exists full screen ,we need to keep playing if it was already playing.
                    if (cmpl.playState) {
                        cmpl.play();
                    }
                }, false);
            }
            else {
                if (!this.fullScreen) {

                    this.fullScreen = true;
                    var elem = document.documentElement;

                    if (elem.requestFullscreen) {
                        elem.requestFullscreen();
                    } else if (elem.msRequestFullscreen) {
                        elem.msRequestFullscreen();
                    } else if (elem.mozRequestFullScreen) {
                        elem.mozRequestFullScreen();
                    } else if (elem.webkitRequestFullscreen) {
                        elem.webkitRequestFullscreen();
                    }

                }
                else {
                    if (!this.noTabsAlways) {
                        $('html').removeClass('videoonly');
                        if ($('html').hasClass('fullscreentranscript')) {
                            this.setTranscript();
                        }
                        else {
                            this.setTranscriptless();
                        }
                        this.fullScreen = false;
                        $('html').removeClass('fullscreen');
                        $('html').removeClass('fullscreentranscript');
                    }
                    try {
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.msExitFullscreen) {
                            document.msExitFullscreen();
                        } else if (document.mozCancelFullScreen) {
                            document.mozCancelFullScreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        }
                    }
                    catch (ex) {
                        //silent fail.
                    }

                }
            }
        },
        resizeAds: function () {
            //if the player is resizing, we need to also resize ads to make the ad player responsive.
            //THIS CODE IS CURRENTLY WRONG BUT IS HERE AS A PLACE HOLDER FOR WHEN WE DO PROPER IMPLEMENTATION.
            if(this.hasAds() && this.adsManager) {
                var width = videoPlayer.clientWidth;
                var height = videoPlayer.clientHeight;
                this.adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
            }
        },
        reverseDirectionForLanguage: function () {
            if (this.reversedLanguage()) {
                if (this.languageDirection != "rtl") {
                    this.languageDirection = "rtl";

                    //Reverse direction on transcript.
                    this.transcriptArea.attr("dir", "rtl");
                    //You have to then reverse each span.
                    $('.transcript-segment').each(function () {
                        $(this).attr("dir", "rtl");
                    });
                    //Then have to add padding left on the transcript container.
                    this.transcriptArea.css('padding-right', '5%');
                    this.transcriptArea.css('padding-left', '13px');
                }
            }
            else {

                if (this.languageDirection != "ltr") {
                    this.languageDirection = "ltr";

                    //Reverse direction on transcript.
                    this.transcriptArea.attr("dir", "ltr");
                    //You have to then reverse each span.
                    $('.transcript-segment').each(function () {
                        $(this).attr("dir", "ltr");
                    });
                    //Then have to add padding right on the transcript container.
                    this.transcriptArea.css('padding-right', '13px');
                    this.transcriptArea.css('padding-left', '5%');

                }
            }
        },
        reversedLanguage: function () {
            if (this.languageCode == "AR" || this.languageCode == 'HE') {
                return true;
            }
            else {
                return false;
            }
        },
        revertNoTabs: function () {
            if (!this.noTabsAlways) { //check that we can revert.  If no tabs is set during load data, you can never revert out of no tabs.
                //This means the transcript was expanded before we entered no tabs.
                //parent.postMessage('{"method":"YesTranscript_v2","key":"' + this.parentKey + '"}', "*");
                //this.tabsContainer.show();
                this.modalSearchButton.hide();
                //this.transcriptExpanded = true;
                this.modalToggleTranscriptOption.removeClass('hidden-force');
                this.noTabs = false;
                this.expandTranscriptButton.removeClass('hidden-force');
                this.fullScreenTranscriptButton.removeClass('hidden-force');
                this.toolbarShowTranscriptButton.removeClass('hidden-force');

                var fullscreenToooltip = this.fullScreenVideoOnlyButton.find('.tooltiptext')
                if(fullscreenToooltip && fullscreenToooltip.length > 0){
                    $(fullscreenToooltip[0]).removeClass('fullscreen-tooltip-end');
                }
            }
        },
        scrollElementToCenter: function (parent, elem) {
            //Simple function to call to scroll a parent element to the center of a child element
            $(parent).scrollTop($(parent).scrollTop() + $(elem).position().top - $(parent).height() / 2 + $(elem).height() / 2);
        },
        searchHitTime: function (timestamp) {
            //This gets called when a user clicks on a search result to set the time of the video and start playing.
            //We also need to hide search results and bring back the transcript if applicable which we do by "clicking" the search close option.
            this.searchCloseButton.click();
            this.setTimeFromTimeStamp(timestamp);
            $('.modalMenuClose').click();
            this.searchModalClose.click();
        },
        searchResultKeyDown: function (e) {
            if (e.keyCode == 9 && !e.shiftKey) {
                var searchResults = $('.search-result');
                if (e.target == searchResults.last()[0] && cmpl.showSearchButton.is(":visible")) {
                    e.preventDefault();
                    e.stopPropagation();
                    cmpl.showSearchButton.focus();
                }
            }
        },
        searchResultsOpen: function () {
            return this.searchBar.hasClass('search-open');
        },
        segmentAt: function (seconds) {
            //EXPECTED CLIPPED SECONDS.  seconds = Seconds of Clip Mask/Clip Mode time.

            var languageSegments = new Array(); //first, we fish out the segments based on language we are using.

            for (var i = 0; i < this.segments.length; i++) {
                if (this.segments[i].LanguageCode == this.languageCode) {
                    languageSegments.push(this.segments[i]);
                }
            }


            //Now, we need to sort by time stamp.
            if (languageSegments.length) {

                languageSegments.sort(function (a, b) { return a.milliseconds - b.milliseconds });

                if (languageSegments.length == 1) {
                    return languageSegments[0];
                }

                for (var i = 1; i < languageSegments.length; i++) {
                    if (this.convertMillisecondsToSeconds(this.convertTimestampToMilliseconds(languageSegments[i].TimeStamp)) > seconds) {
                        return languageSegments[i - 1];
                    }
                }

                //If we got this far, must be the last segment.
                return languageSegments[languageSegments.length - 1];
            }
            return null;
        },
        segmentDuration: function (languageSegments, i) {
            //Returns the duration of a segment relative to clip mode, meaning "how long is this segment considering our clips?"

            var startSecs = this.startSecs();
            var endSecs = this.endSecs();


            if (languageSegments.length == 1) {
                //This is the only segment so it's duration will be "whatever" the video time is.
                return endSecs - startSecs;
            }
            else {
                //It's possible the segment doesn't even show up on the player because it is outside the start/end secs.
                //in that case, the duration is 0!
                var segmentEndSecs = this.clippedDuration();
                if (i + 1 < languageSegments.length) {
                    segmentEndSecs = languageSegments[i + 1].Seconds;
                }

                var segmentStartSecs = languageSegments[i].Seconds;

                if (segmentEndSecs <= startSecs) {
                    return 0; //Segment doesn't show up.
                }
                else if (segmentStartSecs > endSecs) {
                    return 0; //Segment doesn't show up.
                }
                //Otherwise, the segment shows up at least in part.
                if (segmentStartSecs >= startSecs) {
                    if (segmentEndSecs < endSecs) {
                        return segmentEndSecs - segmentStartSecs;
                    }
                    else {
                        return endSecs - segmentStartSecs; //Segments overruns the video so trim it back.
                    }
                }
                else {
                    if (segmentEndSecs < endSecs) {
                        //Segment ends before video end but started before video started.
                        return segmentEndSecs - startSecs;
                    }
                    else {
                        //Segment contains the whole video.
                        return endSecs - startSecs;
                    }
                }
            }
           
        },
        segmentKeyDown: function (e) {
            if (e.keyCode == 9 && e.shiftKey && e.target == $('.segment-tab-segment').first()[0]) {
                e.stopPropagation();
                e.preventDefault();
                cmpl.segmentsTabButton.focus();
            }
            else if (e.keyCode == 9 && !e.shiftKey && e.target == $('.segment-tab-segment').last()[0]) {
                e.stopPropagation();
                e.preventDefault();
                cmpl.segmentsTabButton.focus();
            }
        },
        setCCState: function (hide) {
            if (hide) {
                this.closedCaptions.addClass('hidden-force');
                this.closedCaptionsButton.hide();
                this.modalToggleCCOption.addClass('hidden-force');
                this.modalToggleCCButton.addClass('hidden-force');
                this.captionsOn = false; //set to true then toggle
            }
            else {
                this.closedCaptions.removeClass('hidden-force');
                this.closedCaptionsButton.show();
                this.modalToggleCCOption.removeClass('hidden-force');
                this.modalToggleCCButton.removeClass('hidden-force');
                this.captionsOn = true; //set to false then toggle

            }
        },
        setCurrentTime: function (x) {
            //Note that you should not call current time to set on the Video.JS tech.  There's a discovered bug there where it can go haywire with wrong times.
            //x in this case is in seconds.
            var cmpl = this;
            if (x < 0) {
                videoPlayer.currentTime(0);
            }
            else if (x > cmpl.duration()) {
                videoPlayer.currentTime(cmpl.duration());
            }
            else {
                videoPlayer.currentTime(x);
            }
        },
        setLanguage: function (languageCode, languageName) {
            if (languageCode != this.languageCode) {
                this.languageCode = languageCode;

                this.settingsLanguageText.text(languageName);
                this.settingsLanguageText.attr("aria-label", "Current Language " + languageName);
                this.settingsLanguageText.attr("title", languageName);

                //Set options.
                //First is the modal labels.
                $('.modal-language-option').each(function () {
                    if ($(this).data("code") == languageCode) {
                        $(this).show();
                    }
                    else {
                        $(this).hide();
                    }
                });

                $('.modal-language-check').each(function () {
                    if ($(this).data("code") == languageCode) {
                        $(this).show();
                    }
                    else {
                        $(this).hide();
                    }
                });

                cmpl.logAction("Language", languageCode);
                //and reload the whole thing.
                this.loadData(true);


                this.reverseDirectionForLanguage();
            }
        },
        setNoTabs: function () {
            //We need to remember out state before we go into no tabs in case we need to revert that state.
            this.notTabsTranscriptState = this.transcriptExpanded;
            //first, post message that we are turning off the transcript.
            parent.postMessage('{"method":"NoTranscript_v2","key":"' + this.parentKey + '"}', "*");
            //Then, hide the transcript
            this.tabsContainer.hide();
            //this.modalToggleTranscriptOption.hide();
            this.modalToggleTranscriptOption.addClass('hidden-force');
            this.modalSearchButton.show();
            this.noTabs = true;
            this.transcriptExpanded = false;
            $('html').addClass('videoonly');
            this.expandTranscriptButton.addClass('hidden-force');
            this.fullScreenTranscriptButton.addClass('hidden-force');
            this.toolbarShowTranscriptButton.addClass('hidden-force')

            var fullscreenToooltip = this.fullScreenVideoOnlyButton.find('.tooltiptext');
            if(fullscreenToooltip && fullscreenToooltip.length > 0){
                $(fullscreenToooltip[0]).addClass('fullscreen-tooltip-end');
            }

            this.modalTranscriptOffLabel.show();
            this.modalTranscriptOnLabel.hide();
            this.modalTranscriptMenuOffCheck.show();
            this.modalTranscriptMenuOnCheck.hide();
        },
        setPlayspeed: function (speed, e) {
            videoPlayer.playbackRate(speed);

            if (typeof e != 'undefined' && e !== null) {
                e.stopPropagation();
                e.preventDefault();
            }

            //Clear all UI elements.
            this.modalPlaybackSpeed05Check.hide();
            this.modalPlaybackSpeed075Check.hide();
            this.modalPlaybackSpeed1Check.hide();
            this.modalPlaybackSpeed125Check.hide();
            this.modalPlaybackSpeed15Check.hide();
            this.modalPlaybackSpeed175Check.hide();
            this.modalPlaybackSpeed2Check.hide();
            this.modalPlaybackSpeed25Check.hide();
            this.modalPlaybackSpeed3Check.hide();
            this.modalPlaybackSpeed4Check.hide();
            this.modalPlaybackSpeed5Check.hide();
            this.playBackSpeedHalf.prop('checked', false);
            this.playBackSpeedThreeQuarter.prop('checked', false);
            this.playBackSpeedNormal.prop('checked', false);
            this.playBackSpeedOneAndQuarter.prop('checked', false);
            this.playBackSpeedOneAndHalf.prop('checked', false);
            this.playBackSpeedOneAndThreeQuarter.prop('checked', false);
            this.playBackSpeedTwo.prop('checked', false);
            this.playBackSpeedTwoAndHalf.prop('checked', false);
            this.playBackSpeedThree.prop('checked', false);
            this.playBackSpeedFour.prop('checked', false);
            this.playBackSpeedFive.prop('checked', false);
            this.modalPlaybackSpeed05.hide();
            this.modalPlaybackSpeed075.hide();
            this.modalPlaybackSpeed1.hide();
            this.modalPlaybackSpeed125.hide();
            this.modalPlaybackSpeed15.hide();
            this.modalPlaybackSpeed175.hide();
            this.modalPlaybackSpeed2.hide();
            this.modalPlaybackSpeed25.hide();
            this.modalPlaybackSpeed3.hide();
            this.modalPlaybackSpeed4.hide();
            this.modalPlaybackSpeed5.hide();

            
            if (speed == 0.5) {
                this.modalPlaybackSpeed05Check.show();
                this.playBackSpeedHalf.prop('checked', true);
                this.modalPlaybackSpeed05.show();
            }
            else if (speed == 0.75) {
                this.modalPlaybackSpeed075Check.show();
                this.playBackSpeedThreeQuarter.prop('checked', true);
                this.modalPlaybackSpeed075.show();
            }
            else if (speed == 1) {
                this.modalPlaybackSpeed1Check.show();
                this.playBackSpeedNormal.prop('checked', true);
                this.modalPlaybackSpeed1.show();
            }
            else if (speed == 1.25) {
                this.modalPlaybackSpeed125Check.show();
                this.playBackSpeedOneAndQuarter.prop('checked', true);
                this.modalPlaybackSpeed125.show();
            }
            else if (speed == 1.5) {
                this.modalPlaybackSpeed15Check.show();
                this.playBackSpeedOneAndHalf.prop('checked', true);
                this.modalPlaybackSpeed15.show();
            }
            else if (speed == 1.75) {
                this.modalPlaybackSpeed175Check.show();
                this.playBackSpeedOneAndThreeQuarter.prop('checked', true);
                this.modalPlaybackSpeed175.show();
            }
            else if (speed == 2) {
                this.modalPlaybackSpeed2Check.show();
                this.playBackSpeedTwo.prop('checked', true);
                this.modalPlaybackSpeed2.show();
            }
            else if (speed == 2.5) {
                this.modalPlaybackSpeed25Check.show();
                this.playBackSpeedTwoAndHalf.prop('checked', true);
                this.modalPlaybackSpeed25.show();
            }
            else if (speed == 3) {
                this.modalPlaybackSpeed3Check.show();
                this.playBackSpeedThree.prop('checked', true);
                this.modalPlaybackSpeed3.show();
            }
            else if (speed == 4) {
                this.modalPlaybackSpeed4Check.show();
                this.playBackSpeedFour.prop('checked', true);
                this.modalPlaybackSpeed4.show();
            }
            else if (speed == 5) {
                this.modalPlaybackSpeed5Check.show();
                this.playBackSpeedFive.prop('checked', true);
                this.modalPlaybackSpeed5.show();
            }


            parent.postMessage('{"method":"speedChange","speed":' + speed + '}', "*");


        },
        setSegmentsClick: function (e) {
            e.preventDefault();
            e.stopPropagation(); 
            var segmentElementClicked = $(e.target);
            if (segmentElementClicked.closest(".segment-share-container")) {
                segmentElementClicked = segmentElementClicked.closest(".segment-share-container");
            }
            segmentElementClicked.find('input').click();

        },
        setSegmentsShare: function (e, index) {
            e.stopPropagation(); 
            //When a user clicks on a set segment share.

            //Get the full list of segments (happens to already be in index order)
            var segmentsShares = $('.segment-share');
            //First, determine if this thing is currently checked or not.
            if ($(segmentsShares[index]).is(":checked")) {
                $(segmentsShares[index]).parent().attr("aria-pressed", true);
                //This means it just got checked by this click.
                //When we are checking, all segments above this segment need to be checked because you can't submit a non-contiguous block.
                //We only do this is one "above" is also already checked.  Otherwise, we don't have to.

                var foundFirstChecked = false;
                for (var i = 0; i < index; i++) {
                    if ($(segmentsShares[i]).is(':checked')) {
                        foundFirstChecked = true;
                    }
                    else if (foundFirstChecked) {
                        //We have to check everything after the first check up to the index
                        $(segmentsShares[i]).prop('checked', true);
                        $(segmentsShares[i]).parent().attr('aria-pressed', true);
                    }
                }

                //We then need to check if we need to check any to the right or bottom, because something over there already is checked, we got to check to it as well.
                var firstOtherCheckedIndex = -1;
                for (var i = index; i < segmentsShares.length; i++) {
                    if (i != index) {
                        //We don't look out ourself.  Ourself is already going to be cheked by virtue of being here.
                        if ($(segmentsShares[i]).is(":checked")) {
                            firstOtherCheckedIndex = i;
                            break;
                        }
                    }
                }

                if (firstOtherCheckedIndex != -1) {
                    for (var i = index; i < firstOtherCheckedIndex; i++) {
                        $(segmentsShares[i]).prop('checked', true);
                        $(segmentsShares[i]).parent().attr('aria-pressed', true);
                    }
                }

            }
            else {
                //This means it just got unchcked by clicking
                //If while unchecked, anything "above" this is checked, we have to uncheck everything to the right of this because it would break continuity.
                $(segmentsShares[index]).parent().attr("aria-pressed", false);

                var prevChecked = false;
                for (var i = 0; i < segmentsShares.length; i++) {
                    if (i < index) {
                        if ($(segmentsShares[i]).is(":checked")) {
                            prevChecked = true;
                        }
                    }
                    else if (prevChecked && i > index) {
                        $(segmentsShares[i]).prop('checked', false);
                        $(segmentsShares[i]).parent().attr("aria-pressed", false);
                    }
                }

            }

            this.buildShareLinks();

        },
        setSegmentsShareKeyboard: function (e, index) {
            //This is keyboard accessibiliyt for the above set segments share click function.
            if (e.keyCode == 13 || e.keyCode == 32) {//Enter or Space
                e.preventDefault();
                $(event.target).find('input').click();
            }
        },
        setShareOption: function (ctrl) {
            //When a user clicks on a share option, this will oepn up the correct share details.
            $('.share-details').hide();

            var val = $(ctrl).val();
            $('#' + $(ctrl).val()).show();

            if (val == "clipSegments") {
                this.shareSegments.children().first().focus();
            }
            else if (val == "clipCustom") {
                this.clipCustomStartTime.focus();
            }

            //Execute this to make sure all links get setup like we want.
            this.buildShareLinks();
        },
        setTime: function (x, paused = false) {
          
            //EXPECTED REAL TIME.  X = Seconds in Real Time.
            //x is seconds we want to set inside video time.
            var timeToSet = 0;

            //Time passed in is in real time.
            //This is required so we can set the appropriate time on the video.
            //However, it is possible that the time passed in is time that Clip Mode is excluding.
            //This happens on start or end.  We do not want to exceed the clip mode times.
            //In addition, clip mode times are already clip masked.  So, we have to account for that in the conversion to real time.

           
            
            var endSecs = this.realTimeFromClippedTime(this.endSecs()); //End secs if in clip mode comes back clipped masked. If not in clip mode, it comes back clip mask duration else real duration.
            var startSecs = this.realTimeFromClippedTime(this.startSecs()); //This will be clip mode start secs or 0.  Clip mode is already clip masked, so we need to convert to real time.

            if (x < startSecs) {
                timeToSet = startSecs;
            }
            else if (x > endSecs) {
                timeToSet = endSecs;
            }
            else {
                timeToSet = x;
            }


            this.pause();

            if (timeToSet === endSecs) {
                //set the time to be finished.
                this.setCurrentTime(timeToSet);
                this.updateCurrentTime();

                //update the progress bar to be at 100%.
                this.updatePlayBackPercentage(false);
                this.highlightTranscript();
                //this.positionSegmentsRecenter();
                this.updateSlider();
                //this.autoScrollToggle();
                this.pause();
            }
            else {
                this.setCurrentTime(timeToSet);
                this.hasEnded = false;
                if (paused) {
                    this.pause();
                }
                else {
                    this.play();
                }
            }
        },
        setTimeNoStart: function (x) {
            //EXPECTED REAL TIME.  x = Seconds in Real Time.
            //x is seconds we want to set inside video time.
            //this.pause();
            var timeToSet = 0;
            var startSecs = this.startSecs();
            var endSecs = this.endSecs();
            //When we call to set time, we must detect if we are in clip mode.
            //If we are in clip mode and the time is being set outside of the clip, we have to present the clip mode popup.

            if (x < startSecs) {
                timeToSet = startSecs;
            }
            else if (x > endSecs) {
                timeToSet = endSecs;
            }
            else {
                timeToSet = x;
            }


            if (timeToSet === endSecs) {
                //set the time to be finished.
                this.setCurrentTime(timeToSet);
                this.updateCurrentTime();
                this.updateSlider();
                this.pause();
            }
            else {
                var paused = videoPlayer.paused();
                this.hasEnded = false;
                if (!paused) {
                    videoPlayer.pause();
                }
                this.setCurrentTime(timeToSet);
                if (!paused) {
                    videoPlayer.play();
                }
            }
        },
        setTimeFromMinutes: function (x) {
            //EXPECTED REAL TIME.  x = Minutes in Real Time.
            var parse = x.split(':');

            var minutes = parse[0];
            var seconds = parse[1];

            var totalSeconds = parseInt(parseInt(minutes * 60) + parseInt(seconds));

            this.setTime(totalSeconds);

        },
        setTimeFromTimeStamp: function (timeStamp) {

          
            //EXPECTED REAL TIME.  timeStamp = Time Stamp in Real Time on Video.
            //Time stamps have a format of HH:MM:SS:SSS
            //Not all time stamps have the hour part.

            var parse = timeStamp.split(':');


            if (parse.length == 4) {
                //This has hours.
                var hours = parseInt(parse[0]);
                var minutes = parseInt(parse[1]);
                var seconds = parseInt(parse[2]);
                var milliSeconds = parseInt(parse[3]);

                //Covert all of this to seconds.
                var totalSeconds = (hours * 60 * 60) + (minutes * 60) + seconds + (milliSeconds / 1000);
                this.setTime(totalSeconds);
            }
            else {
                var minutes = parseInt(parse[0]);
                var seconds = parseInt(parse[1]);

                var milliSeconds = 0;
                if (parse.length == 3) {
                    milliSeconds = parseInt(parse[2]);
                }

                //Covert all of this to seconds.
                var totalSeconds = (minutes * 60) + seconds + (milliSeconds / 1000);

                this.setTime(totalSeconds);
            }

        },
        setTimeFromTimeStampNoStart: function (timeStamp) {
            //EXPECTED REAL TIME.  timestamp = Time Stamp in Real Time.
            var parse = timeStamp.split(':');

            if (parse.length == 4) {
                //This has hours.
                var hours = parseInt(parse[0]);
                var minutes = parseInt(parse[1]);
                var seconds = parseInt(parse[2]);
                var milliSeconds = parseInt(parse[3]);

                //Covert all of this to seconds.
                var totalSeconds = (hours * 60 * 60) + (minutes * 60) + seconds + (milliSeconds / 1000);

                this.setTimeNoStart(totalSeconds);
            }
            else {
                var minutes = parseInt(parse[0]);
                var seconds = parseInt(parse[1]);
                var milliSeconds = parseInt(parse[2]);



                //Covert all of this to seconds.
                var totalSeconds = (minutes * 60) + seconds + (milliSeconds / 1000);
                this.setTimeNoStart(totalSeconds);
            }
        },
        setTranscript: function () {

            if (!this.noTabs) {
                parent.postMessage('{"method":"YesTranscript_v2","key":"' + this.parentKey + '"}', "*");
                this.tabsContainer.fadeIn();

                this.modalTranscriptOffLabel.hide();
                this.modalTranscriptOnLabel.show();
                this.modalTranscriptMenuOffCheck.hide();
                this.modalTranscriptMenuOnCheck.show();
                this.mediaContainer.addClass('tabs-expanded');
                this.mediaContainer.removeClass('tabs-not-expanded');

                this.modalSearchButton.hide();
                this.expandTranscriptButton.addClass('hidden-force');
                $('html').removeClass('videoonly');
                this.transcriptExpanded = true;
                this.positionTranscriptRecenter();
                setTimeout(function () { cmpl.updatePlayBackPercentage(true); }, 100);
            }

        },
        setTranscriptless: function () {

            if (!this.noTabs) {
                //first, post message that we are turning off the transcript.
                parent.postMessage('{"method":"NoTranscript_v2","key":"' + this.parentKey + '"}', "*");
                //Then, hide the transcript
                this.tabsContainer.hide();

                this.modalTranscriptOffLabel.show();
                this.modalTranscriptOnLabel.hide();
                this.modalTranscriptMenuOffCheck.show();
                this.modalTranscriptMenuOnCheck.hide();

                this.mediaContainer.addClass('tabs-not-expanded');
                this.mediaContainer.removeClass('tabs-expanded');

                if (this.fullScreen) {
                    $('html').addClass('videoonly');
                    $('html').removeClass('fullscreen');
                }

                this.modalSearchButton.show();
                $('html').addClass('videoonly');

                if (this.hasTranscript || this.hasSegments) {
                    this.expandTranscriptButton.removeClass('hidden-force');
                }
                this.transcriptExpanded = false;
                this.positionTranscriptRecenter();
                setTimeout(function () { cmpl.updatePlayBackPercentage(true); }, 100);
            }
        },
        setVolume: function (x) {
            if (x > 1) {
                x = 1;
            }
            else if (x < 0) {
                x = 0;
            }

            videoPlayer.volume(x);
            //Then update the volume indicator width for that percentage.
            cmpl.volumeBar.attr("aria-valuenow", Math.floor(videoPlayer.volume() * 100));

            cmpl.volumeIndicator.height((videoPlayer.volume() * 100) + '%');
        },
        settingsLanguageKeyDown: function (e) {
            //This handles key down for dyanmically added language to the settings menu.
            if ((e.keyCode == 9 && !e.shiftKey) || e.keyCode == 40) {
                e.preventDefault();
                e.stopPropagation();
                var languages = $('.language-opt');
                for (var i = 0; i < languages.length; i++) {
                    if (languages[i] == e.target) {
                        if (i == languages.length - 1) {
                            languages[0].focus();
                        }
                        else {
                            languages[i + 1].focus();
                        }
                        break;
                    }
                }
            }
            else if ((e.keyCode == 9 && e.shiftKey) || e.keyCode == 38) {
                e.preventDefault();
                e.stopPropagation();
                var languages = $('.language-opt');
                for (var i = 0; i < languages.length; i++) {
                    if (languages[i] == e.target) {
                        if (i == 0) {
                            languages[languages.length - 1].focus();
                        }
                        else {
                            languages[i - 1].focus();
                        }
                        break;
                    }
                }
            }
            else if (e.keyCode == 27) {
                //Fire close button.
                e.preventDefault();
                e.stopPropagation();
                cmpl.settingsLanguageCloseButton.click();
            }
            else if (e.keyCode == 13) {
                e.preventDefault();
                e.stopPropagation();
                $(e.target).find('input').click();
            }
        },
        showFromTimeStamp: function (timestamp, endTimeStamp) {
            //Tells you if this time stamp would appear inside of clip mode or not.
            if (this.clipMode) {
                var startSecs = this.startSecs();
                var endSecs = this.endSecs();

                var secs = this.convertTimestampToSeconds(timestamp);
                var endSecs = this.convertTimestampToSeconds(endTimeStamp);

                if (secs >= endSecs) {
                    return false;
                }
                else if (endSecs < startSecs) {
                    return false;
                }
            }
            return true;
        },
        showScrubberImage: function (pageX, pageY, ctrl, mobile, preSelectedScrub) {


            if (this.scrubberOff) {
                return;
            }

            var cmpl = this;
            if (this.scrubbing) {

                var x = pageX - $(ctrl).offset().left, // or e.offsetX (less support, though)
                    y = pageY - $(ctrl).offset().top;  // or e.offsetY

                var screenX = pageX;
                var screenY = $(ctrl).offset().top;

                //Get the percentage of where progress bar is hovered.
                var percentageOfProgressBar = x / this.progressBar.width();


                //Now, based on the duration of this video, grab the time that corresponds to that percentage.
                //Duration can change depending on if a start and end time are specified or not.
                //If we are clip masking, we want the percentage of the clip masked duration, not the actual video duration.

                var percentDuration;
                var realTime; //if we are clip masking, the real time is the translation from the modified time back to real time.  If we are not clip masking, it is simply the time.
                if (this.clipMode) {
                    var startSecs = this.startSecs();
                    var endSecs = this.endSecs();
                    var clipDuration = endSecs - startSecs;
                    var percentClipDuration = clipDuration * percentageOfProgressBar;
                    realTime = this.realTimeFromClippedTime(startSecs + percentClipDuration);
                    percentDuration = startSecs + percentClipDuration;
                }
                else {
                    if (this.clipMasking) {
                        percentDuration = this.clippedDuration() * percentageOfProgressBar;
                        realTime = this.realTimeFromClippedTime(percentDuration);
                    }
                    else {
                        percentDuration = this.duration() * percentageOfProgressBar;
                        realTime = percentDuration;
                    }
                }


                //Now, fetch the appropriate scrubber image based on the time.
                var selectedScrub = this.scrubber[this.scrubber.length - 1];
                for (var i = 0; i < this.scrubber.length; i++) {
                    if (this.scrubber[i].Seconds > realTime) {
                        selectedScrub = this.scrubber[i];
                        break;
                    }
                }

                var scrubExists = false;
                if (typeof selectedScrub != "undefined") {
                    scrubExists = true;
                }

                //Set scrubber image.
                if (scrubExists) {
                    this.scrubberImage.prop('src', selectedScrub.Url);
                    this.scrubberImage.show();
                }
                else {
                    this.scrubberImage.prop('src', "");
                    this.scrubberImage.hide();
                }

                this.scrubberContainerTime.empty();

                //Figure out which segment we are in.
                var segmentTitle = this.segmentAt(percentDuration);
                if (segmentTitle != null) {
                    this.scrubberContainerTime.append(this.convertSecondsToReadable(percentDuration) + ": " + segmentTitle.Title);
                }
                else {
                    this.scrubberContainerTime.append(this.convertSecondsToReadable(percentDuration));
                }

                var actualHeight = this.scrubberContainer.outerHeight();

                //Show the scrubber container and position it.
                //Note that if scrubber image is off screen, we force it to on screen.
                var compScreenX = screenX - 107;
                if (compScreenX < 0) {
                    compScreenX = 0;
                }
                else if (compScreenX + 177 > window.innerWidth) {
                    compScreenX = window.innerWidth - 177;
                }

                var ypos = screenY - actualHeight - 5;


                this.scrubberContainer.css({
                    //position: "fixed",
                    left: compScreenX
                });


                //cmpl.scrubberContainer.prop('top', screenY - 28);
                //cmpl.scrubberContainer.prop('left', screenX - 25);

                if (!mobile) {
                    this.scrubberContainer.show();
                    this.continuousScrub();
                }
                else {
                    this.scrubbing = false;
                    this.scrubberContainer.hide();
                }

            }

            if (((preSelectedScrub != null) || (typeof preSelectedScrub == "undefined" && this.mediaType == "Audio")) && !mobile) {
                if (!this.scrubberContainer.hasClass('active')) {
                    //If we aren't scrubbing but this got called, that means it came from a segment chapter
                    //on the scrubber.
                    var x = pageX - $(ctrl).offset().left, // or e.offsetX (less support, though)
                        y = pageY - $(ctrl).offset().top;  // or e.offsetY
                    screenX = pageX;
                    screenY = $(ctrl).offset().top;


                    //Set scrubber image.
                    if (typeof preSelectedScrub != "undefined") {
                        this.scrubberImage.prop('src', preSelectedScrub.src);
                        this.scrubberImage.show();
                    }
                    else {
                        this.scrubberImage.prop('src', "");
                        this.scrubberImage.hide();
                    }

                    if (this.scrubberInvert) {
                        this.scrubberImage.attr("class", "scrubber-image rotate180");
                    }

                    //Show the scrubber container and position it.
                    //Note that if scrubber image is off screen, we force it to on screen.
                    var compScreenX = screenX - 75;
                    if (compScreenX < 0) {
                        compScreenX = 0;
                    }
                    else if (compScreenX + 150 > window.innerWidth) {
                        compScreenX = window.innerWidth - 150;
                    }
                    this.scrubberContainer.show();
                    //set active flags.
                    this.scrubberContainer.addClass('active');

                    //now for the y.
                    var height = this.scrubberContainer.outerHeight();


                    this.scrubberContainer.css({
                        position: "fixed",
                        top: screenY - height - 5, left: compScreenX
                    });


                }
            }
        },
        showSearch: function () {
            var cmpl = this;
            //This controls showing the search box.
            //If a search has never been executed, it just shows the box above whatever tab you are on.
            //If a search has been executed, it shows the last results.

            if (!this.searchResultsOpen()) {
                this.searchBar.addClass('search-open');
                if (!this.searchExecuted) {
                    this.transcriptRecenter.hide(); //hide temp while resizing happens.
                    cmpl.searchBar.slideToggle('slow', function () {
                        //If transcript tab.
                        cmpl.transcriptRecenterShow();
                    });
                }
                else {
                    this.transcriptRecenter.hide(); //hide temp while resizing happens.
                    cmpl.tabButtonClick(this.showSearchButton, this.mainTabsBox, this.searchDisplay);
                    cmpl.searchBar.slideToggle('slow', function () { });
                }
            }
            else {
                if (this.searchExecuted) {
                    cmpl.tabButtonClick(this.showSearchButton, this.mainTabsBox, this.searchDisplay);
                    cmpl.transcriptRecenter.hide();
                }
            }

        },
        srSpeak: function (text) {

            var el = document.createElement("div");
            var id = "speak-" + Date.now();
            el.setAttribute("id", id);
            el.setAttribute("aria-live", "polite");
            el.classList.add("sr-only");
            document.body.appendChild(el);

            window.setTimeout(function () {
                document.getElementById(id).innerHTML = text;
            }, 100);

            window.setTimeout(function () {
                document.body.removeChild(document.getElementById(id));
            }, 1000);
        },
        toggleShutDownTabs: function () {
            //This was implemented for ads.  To shut down the tabs.
            if (this.tabsShutDown || this.noTabs || this.noTabsAlways)
            {
                this.tabsShutDown = false;
                this.tabsContainerShutdownOverlay.hide();
                this.tabsContainerScroller.removeClass('nomouse');
            }
            else if (!this.noTabs && !this.noTabsAlways)
            {
                this.tabsShutDown = true;
                this.tabsContainerShutdownOverlay.show();
                this.tabsContainerScroller.addClass('nomouse');
                this.closeAllMenus();
                this.closeAllModals();
            }
        },
        showAd: function () {
            var cmpl = this;
            cmpl.adContainerElement.addClass('play');
            cmpl.toggleShutDownTabs();
            cmpl.pause();
            cmpl.adShowing = true;
            cmpl.adPlaying = true;
            this.srSpeak('Pausing to show advertisement.');
            //Next we want to focus on ad container and trap keyboard there.
            this.adContainerElement.attr("tabindex", "1");
            this.adContainerElement.focus();

        },
        startSecs: function () {
            //This returns the starting second of the video.
            if (this.clipMode) {
                if (this.hasStart) {
                    return this.convertTimestampToSeconds(this.videoStart);
                }
            }
            return 0;
        },
        tabButtonClick: function (button, box, tab) {
            //This function handles various tab button clicks on the player.
            //The box in this case is the container around a set of tabs (there are different sets of tabs in different places)
            //The button is the button that was clicked to fire this event.
            //Tab is the container we want to show based on the button clicked.

            //Start by removing classes and hiding all controls in the box.
            $(box).find('.sg-tab-content').each(function () {
                $(this).hide();
                $(this).removeClass('sg-tab-open');
            });

            $(box).find('.tablinks').each(function () {
                $(this).removeClass('sg-current');
                $(this).attr("aria-pressed", false);
            });

            //Display this tab.
            $(tab).show();
            $(tab).addClass('sg-tab-open');
            $(button).addClass('sg-current');
            $(button).attr("aria-pressed", true);
            //Lastly, we want to update all the share links with appropriate info.
            this.buildShareLinks();

            //If we just switched to the transcript tab, we want to auto scroll etc. the transcript.
            if (this.transcriptTabActive()) {
                this.autoScroll = true;
                this.autoScrollTranscriptToHighlight();
            }
            else {
                //Scroll to top.
                this.tabAreaContainer.scrollTop(0);
            }

        },
        toggleCC: function () {
            var ios = (/iphone|ipod|ipad/i.test(navigator.userAgent.toLowerCase()));
            if (this.captionsOn) {
                this.captionsOn = false;
                if (ios) {
                    var tracks = videoPlayer.textTracks();

                    for (var i = 0; i < tracks.length; i++) {
                        var track = tracks[i];
                        track.mode = 'hidden';
                    }
                }
                this.captionsOn = false;
                this.closedCaptions.addClass('hidden-force');
                this.modalCCOnLabel.hide();
                this.modalCCOffLabel.show();
                this.modalCCMenuOnCheck.hide();
                this.modalCCMenuOffCheck.show();
                $('.cc-on').addClass('cc-hiding');
                $('.cc-off').removeClass('cc-hiding');
                this.closedCaptionsButton.attr("aria-pressed", false);
                //this.closedCaptionsButton.removeClass('vjs-closed-captions');
                //this.closedCaptionsButton.addClass('vjs-closed-captions-off');
            }
            else {
                this.captionsOn = true;
                if (ios) {
                    var tracks = videoPlayer.textTracks();

                    for (var i = 0; i < tracks.length; i++) {
                        var track = tracks[i];
                        if (track.mode != 'showing') {
                            track.mode = 'showing';
                        }
                    }
                }
                this.closedCaptions.removeClass('hidden-force');
                this.closedCaptions.removeClass('temp-hidden-force'); //remove force hidden from loading.
                this.modalCCOnLabel.show();
                this.modalCCOffLabel.hide();
                this.modalCCMenuOnCheck.show();
                this.modalCCMenuOffCheck.hide();
                $('.cc-on').removeClass('cc-hiding');
                $('.cc-off').addClass('cc-hiding');
                this.closedCaptionsButton.attr("aria-pressed", true);
                //this.closedCaptionsButton.addClass('vjs-closed-captions');
                //this.closedCaptionsButton.removeClass('vjs-closed-captions-off');
            }
        },
        toggleMute: function () {

            var muted = videoPlayer.muted();

            if (muted) {
                this.volumeButton.addClass('vjs-volume');
                this.volumeButton.removeClass('vjs-volume-mute');
                this.volumeButton.attr("aria-pressed", false);
            }
            else {
                this.volumeButton.removeClass('vjs-volume');
                this.volumeButton.addClass('vjs-volume-mute');
                this.volumeButton.attr("aria-pressed", true);
            }
            videoPlayer.muted(!videoPlayer.muted());

        },
        toggleTypeFilter: function (filter) {
            //This is used to toggle filters on and off.
            if ($(filter).hasClass('not-checked')) {
                $(filter).removeClass('not-checked');
                $(filter).show();
                cmpl.calcFilterTypeResults(false);
                cmpl.calcFilterTypeResults(true);
                $(filter).closest('a').attr('aria-checked', true);
            }
            else {
                $(filter).addClass('not-checked');
                $(filter).hide();
                cmpl.calcFilterTypeResults(false);
                cmpl.calcFilterTypeResults(true);
                $(filter).closest('a').attr('aria-checked', false);
            }
        },
        transcriptTabActive: function () {
            return this.transcriptTabButton.hasClass('sg-current');
        },
        transcriptLineAt: function (transcript, seconds) {
            var segmentLine = "";
            var endSecs = this.endSecs();
            for (var para = 0; para < transcript.Paragraphs.length; para++) {

                var paragraph = transcript.Paragraphs[para];
                if (paragraph != null) {
                    for (var seg = 0; seg < paragraph.Segments.length; seg++) {
                        var segment = paragraph.Segments[seg];

                        //Check the segment timestamp to see if it shows up or not.
                        var segSecs = this.convertTimestampToSeconds(segment.TimeStamp);
                        var nextSegSecs;
                        var segStart = segment.TimeStamp;

                        if (seg + 1 == paragraph.Segments.length) {
                            if (para + 1 == transcript.Paragraphs.length) {
                                nextSegSecs = endSecs;
                            }
                            else {
                                nextSegSecs = this.convertTimestampToSeconds(transcript.Paragraphs[para + 1].TimeStamp);
                            }
                        }
                        else {
                            nextSegSecs = this.convertTimestampToSeconds(paragraph.Segments[seg + 1].TimeStamp);
                        }

                        if (segSecs <= seconds && nextSegSecs >= seconds) {

                            for (var line = 0; line < segment.Text.length; line++) {
                                if (segmentLine == '') {
                                    segmentLine += segment.Text[line];
                                }
                                else {
                                    segmentLine += ' ' + segment.Text[line];
                                }
                            }

                            return segmentLine;
                        }
                    }
                }
            }
            return "";
        },
        transcriptKeyDown: function (e) {
            if (e.keyCode == 9 && e.shiftKey && e.target == cmpl.transcriptArea.children().first()[0]) {
                e.stopPropagation();
                e.preventDefault();
                cmpl.transcriptRecenter.focus();
            }
            else if (e.keyCode == 9 && !e.shiftKey && e.target == cmpl.transcriptArea.children().last()[0]) {
                e.stopPropagation();
                e.preventDefault();
                cmpl.transcriptTabButton.focus();
            }
            else if (e.keyCode == 13) {
                e.stopPropagation();
                e.preventDefault();
                e.target.click();
            }
        },
        transcriptRecenterShow: function () {
            this.positionTranscriptRecenter();
            if (this.transcriptTabActive()) {
                this.transcriptRecenter.show();
            }

        },
        transcriptScrolled: function () {

            if (this.transcriptArea.is(":visible")) {
                //When segment gets scrolled, it can happen due to an auto scroll or to a user initiated scroll.
                //We will know if it's an auto scroll because a flag gets set when this happens.
                //If this is initiated as a result of a user scroll, we turn off auto scroll.
                if (typeof this.performingAutoScroll !== 'undefined' && this.performingAutoScroll !== null && this.performingAutoScroll === true) {
                    //We do not turn off auto scroll and instead we simply reset the flag for the next autoscroll.
                    this.performingAutoScroll = false;
                }
                else {
                    //this is a user initiated scroll.  Therefore, we turn off auto scroll.
                    if (this.autoScroll && !this.elementOnScreen(this.transcriptArea, $('.transcript-highlight'))) {
                        this.autoScroll = false;
                        //this.autoScrollToggle();
                    }
                    else if (!this.autoScroll && this.elementOnScreen(this.transcriptArea, $('.transcript-highlight'))) {
                        this.autoScroll = true;
                    }
                }
            }
        },
        unmute: function () {
            videoPlayer.muted(false);
            this.autoPlayMessageContainer.hide();
        },
        updateChat: function () {
            if (this.chatMode == 'live') {
                //This function fires as time updates to show hidden chat.
                var time = this.clippedTimeFromCurrentTime(); //this is in seconds.
                var count = 0;
                $('.chat_message_bubble').each(function () {
                    if ($(this).data("seconds") < time) {
                        $(this).removeClass('hidden-force');
                        count++;
                    }
                    else {
                        $(this).addClass('hidden-force');
                    }
                });

                if (count != this.chatLastCount) {
                    //Auto scroll.
                    this.autoScrollChatBox();
                }
                this.chatLastCount = count;

            }

        },
        updateCurrentTime: function () {
            if (this.clipMasking) {
                //Setting the time on current time.
                this.currentTimeSpan.text(this.convertSecondsToReadable(this.clippedTimeFromRealTime(this.currentTime())));
                if (!this.timeJumpInput.is(":visible")) {
                    this.timeJumpInput.val(this.convertSecondsToReadable(this.clippedTimeFromRealTime(this.currentTime())));
                    this.timeJumpInput.removeClass('invalidTime');
                }
            }
            else {
                this.currentTimeSpan.text(this.currentTimeAsMinutes());
                if (!this.timeJumpInput.is(":visible")) {
                    this.timeJumpInput.val(this.currentTimeAsMinutes());
                    this.timeJumpInput.removeClass('invalidTime');
                }
            }
        },
        updatePlayBackPercentage: function (screenResize) {

            if (this.clipMode) {
                var percentage = 0;

                //The goal here is to figure out at what percentage the current time of the playback is over the total clipped mode time.
                //The total clip mode time is the reduced time of the video that is being played.
                //First, we need to determine the length of the clip mode.
                var clipDuration;
                var endSecs = this.endSecs();
                var startSecs = this.startSecs();

                //We now know the total seconds we are expectig to see.
                clipDuration = endSecs - startSecs;


                //We can use this to calculate our percentage based on where we are on the video.
                //In clip mode, the video player is going to report time on the actual video which if we are clip masking has to be translated.
                var videoPlayedTime;
                if (this.clipMasking) {
                    videoPlayedTime = this.clippedTimeFromCurrentTime();
                }
                else {
                    videoPlayedTime = this.currentTime();
                }

                //Subtract our start secs, and that gives us the actual "seconds" into the clip.
                var actualSecondsIntoClip = videoPlayedTime - startSecs;
                //Then, we can now calculate percentage based on the clip duration.
                percentage = Math.round((actualSecondsIntoClip / clipDuration) * 100);
                if (this.hasEnded) {
                    percentage = 100;
                }

                //Now, update the progress bar.
                if (percentage !== this.playBackPercentage || screenResize) {

                    this.playBackPercentage = percentage;
                    var updatedPercentage = this.playBackPercentage + "%";

                    this.progressIndicator.width(updatedPercentage);

                    //when the width of the progress bar changes, we also need to set the position of the progress recenter.
                    //To do that, we will set the left-margin of the progress recenter equal to the current width of the progress indicator.
                    var indicatorWidth = this.progressIndicator.width() - 4; //we subtract 8 to compesnate for the width of the progress indicator.

                    this.progressCrosshair.css({
                        marginLeft: indicatorWidth + "px"
                    });

                }
            }
            else {

                var percentage = 0;

                //In a clip masking scenario, the percentage calculation is different from just current time divided by duration.
                //Instead, we want to know what the current time is relative to the masked time and divided by the clipped duration.
                if (this.clipMasking) {
                    percentage = Math.round((this.clippedTimeFromCurrentTime() / this.convertDurationToSeconds(this.clipModel.clipped_duration)) * 100);
                    if (this.hasEnded) {
                        percentage = 100;
                    }
                }
                else {
                    try {
                        //This fails sometimes while a video is transitioning, and we want a silent error here.
                        percentage = Math.round((videoPlayer.currentTime() / this.duration()) * 100);
                        if (this.hasEnded) {
                            percentage = 100;
                        }
                    }
                    catch (ex) {
                    }
                }

                if (percentage !== this.playBackPercentage || screenResize) {
                    this.playBackPercentage = percentage;
                    //$(this).trigger('playBackPercentageUpdate', this.updatePlayBackPercentage);
                    var updatedPercentage = this.playBackPercentage + "%";
                    this.progressIndicator.width(updatedPercentage);

                    //when the width of the progress bar changes, we also need to set the position of the progress recenter.
                    //To do that, we will set the left-margin of the progress recenter equal to the current width of the progress indicator.
                    var indicatorWidth = this.progressIndicator.width() - 4; //we subtract 8 to compesnate for the width of the progress indicator.



                    this.progressCrosshair.css({
                        marginLeft: indicatorWidth + "px"
                    });

                }
            }
        },
        updateSlider: function () {
            //This updates slider values with the current video time and values.
            var currentTime = this.clippedTimeFromCurrentTime();
            this.progressCrosshair.attr("aria-valuenow", currentTime);
            //translate to readable.
            this.progressCrosshair.attr("aria-valuetext", this.convertSecondsToScreenReaderReadable(currentTime));
        },
        unforceFocusOverlay: function () {
            this.videoControlOverlay.removeClass('focused');
        },
        unforceOverlay: function () {
            this.videoControlOverlay.removeClass('hovered');
            this.closedCaptions.removeClass('hovered');
        },
        unforceOverlayPlayOnly: function () {
            this.videoControlOverlay.removeClass('force_hovered');


            if (this.relatedContentContainer.is(":visible"))
            {
                this.executeSearchRelatedContent();
            }
        },
        wireControls: function () {
            var self = this;
            var cmpl = this;


           

            /*
             * Controls
             */

            this.adBigPlayButton.on('click', function () {
                //Restart an add.
                if (cmpl.showAd) {
                    //Find the element to play.
                    cmpl.adsManager.resume();
                }
            });

            if (this.allChatButton.length) {
                this.allChatButton.on('click', function () { cmpl.chatMode = 'all'; cmpl.liveChatReplayButton.removeClass('chat_active'); cmpl.liveChatReplayButton.attr("aria-expanded", false); cmpl.allChatButton.addClass('chat_active'); cmpl.allChatButton.attr('aria-expanded', true); cmpl.buildChatTab(); cmpl.logAction('All Chat Button', ''); });
            }

            this.autoPlayUnmute.on('click', function () { cmpl.volumeButton.click(); cmpl.autoPlayMessageContainer.hide(); cmpl.logAction("Auto Play Unmute", ""); });

            //This handles the pressing of the back arrow button on the Type selection for the search filter.
            $('.back-type-btn').on('click', function () {
                $('.type-drop')[0].style.display = "none";
                $('.filter-options').each(function () {
                    this.style.marginLeft = "0px";
                    var d = $(this);
                    d.find('a').attr("tabindex", "0");
                    d.children().first().children().first().focus();

                });
           });

            this.bigPlayButton.on('click', function () { cmpl.play(); cmpl.pauseButton.focus(); cmpl.unforceFocusOverlay(); cmpl.logAction("Big Play Button Click", ""); });

            /*This will wire up all the modal buttons to open their proper modals. */
            $('button.modal-button').each(function () {
                self.wireModalButton(this);
            });

            this.chatTabButton.on('click', function () { cmpl.transcriptRecenter.hide(); cmpl.searchPreTab = cmpl.chatTabButton; cmpl.tabButtonClick(this, cmpl.mainTabsBox, cmpl.chatDisplay); $('.chat-tab-segment').first().focus(); cmpl.autoScrollChatBox(); cmpl.logAction("Chat Tab", ""); });
            this.chatDisplay.on('scroll', function () { cmpl.chatScrolled(); });


            this.citationCopyButton.on('click', function () { cmpl.copyValueToClipboard('citation-input'); });

            if (this.clickButton.length) {
                this.clickButton.on('click', function () {
                    //Hide the wrapper and fire a parent message for any page that is listening.
                    cmpl.clickButtonWrapper.hide();
                    parent.postMessage('{"method":"clickButton"}', "*");
                });
            }

            this.clipEntireRadio.on('click', function () { cmpl.setShareOption(this); });

            this.clipSegmentsRadio.on('click', function () { cmpl.setShareOption(this); });

            this.clipCustomRadio.on('click', function () { cmpl.setShareOption(this); });

            /* This will wire p all the close modal buttons. */
            $('.close').each(function () {
                self.wireModalCloseButton(this);
            });

            this.closeAutoPlayMessageButton.on('click', function () { cmpl.autoPlayMessageContainer.hide(); cmpl.logAction("Auto Play Close", ""); });

            this.closedCaptionsButton.on('click', function (e) { e.stopPropagation(); cmpl.toggleCC(); cmpl.logAction("Closed Caption Click", ""); });

            this.collapseTranscriptButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.collapseTranscript();
                if (cmpl.fullScreen) {
                    cmpl.fullScreenVideoOnlyButton.click();
                }
                else if (cmpl.expandTranscriptButton.is(":hidden")) {
                    cmpl.toolbarShowTranscriptButton.focus();
                }
                else {
                    cmpl.expandTranscriptButton.focus();
                }
                cmpl.logAction("Collapse Transcript Click", "");
            });

            this.copyShareLinkButton.on('click', function () { cmpl.copyValueToClipboard('share-link-text'); cmpl.logAction("Copy Share Link Click", ""); });

            this.downloadActionButton.on('click', function () { cmpl.executeDownload(); });

            this.downloadShareTabButton.on('click', function () { cmpl.tabButtonClick(this, cmpl.shareTabsBox, cmpl.downloadShareDisplay); cmpl.scrollElementToCenter(cmpl.shareModal, cmpl.downloadShareDisplay); $('.download-options-share').children().first().focus(); cmpl.logAction("Download Share Click", ""); });

            this.emailShareTabButton.on('click', function () { cmpl.tabButtonClick(this, cmpl.shareTabsBox, cmpl.shareNoTabDisplay); cmpl.logAction("Email Share Click", ""); });

            this.expandTranscriptButton.on('click', function (e) { e.stopPropagation(); cmpl.setTranscript(); cmpl.collapseTranscriptButton.focus(); cmpl.collapseTranscriptButton.attr("aria-pressed", false); cmpl.expandTranscriptButton.attr("aria-pressed", true); cmpl.logAction("Expand Transcript Click", ""); });

            this.facebookShareTabButton.on('click', function () { cmpl.tabButtonClick(this, cmpl.shareTabsBox, cmpl.shareNoTabDisplay); cmpl.logAction("Facebook Share Click", ""); });

            this.forwardButton.on('click', function (e) { e.stopPropagation(); cmpl.setTime(cmpl.currentTime() + cmpl.forwardSkipAmount, videoPlayer.paused()); cmpl.logAction("Forward Click", ""); });

            this.fullScreenTranscriptButton.on('click', function (e) { e.preventDefault(); e.stopPropagation(); cmpl.fullScreenWithTranscript(); cmpl.logAction("Full Screen Transcript Click", ""); });

            this.fullScreenVideoOnlyButton.on('click', function (e) { e.preventDefault(); e.stopPropagation(); cmpl.fullScreenVideoOnly(); cmpl.logAction("Full Screen No Transcript Click", ""); });

            this.linkedinShareTabButton.on('click', function () { cmpl.tabButtonClick(this, cmpl.shareTabsBox, cmpl.shareNoTabDisplay); cmpl.logAction("Linked In Share Click", ""); });

            this.linkShareTabButton.on('click', function () { cmpl.tabButtonClick(this, cmpl.shareTabsBox, cmpl.linkShareDisplay); cmpl.scrollElementToCenter(cmpl.shareModal, cmpl.linkShareDisplay); cmpl.copyShareLinkButton.focus(); cmpl.logAction("Link Share Click", ""); });

            if (this.liveChatReplayButton.length) {
                this.liveChatReplayButton.on('click', function () { cmpl.chatMode = 'live'; cmpl.liveChatReplayButton.addClass('chat_active'); cmpl.liveChatReplayButton.attr("aria-expanded", true); cmpl.allChatButton.removeClass('chat_active'); cmpl.allChatButton.attr('aria-expanded', false); cmpl.buildChatTab(); cmpl.logAction('Live Chat Button', ''); });
            }

            this.VTOCButton.on('click', function () { if (!cmpl.vtocLoaded) { cmpl.buildVTOC(); } })

            this.menuButton.on('click',
                function (e) {
                    e.stopPropagation();
                    if (cmpl.modalMenu.hasClass('all-mobile-hidden')) {
                        cmpl.forceOverlay();
                        cmpl.modalMenu.removeClass('all-mobile-hidden');
                        //focus on the close button.
                        cmpl.modalMenu.find('.modalMenuClose').focus();
                        cmpl.mobileMenuOpen = true;
                        cmpl.mobileMenuEndOfModal.show();
                        cmpl.mobileMenuModalContent.attr("role", "dialog");
                        cmpl.menuButton.attr("aria-expanded", true);
                    }
                    else {
                        cmpl.unforceOverlay();
                        cmpl.modalMenu.addClass('all-mobile-hidden');
                        cmpl.mobileMenuModalContent.attr("role", "");
                        cmpl.menuButton.attr("aria-expanded", false);
                    }

                    cmpl.logAction("Mobile Menu Click", "");


                });

            this.modalMenu.on('click', function (e) { e.stopPropagation(); }); //prevents events from bubbling onto the player.

            $('.modalMenuClose').on('click', function (e) {
                e.stopPropagation();
                cmpl.closeAllMenus();
                var returnAttr = $(this).attr('data-return');
                if (returnAttr !== 'undefined' && returnAttr !== false) {
                    $('#' + $(this).data("return")).focus();
                }

            });

            this.modalCCClose.on('click', function (e) { e.stopPropagation(); cmpl.modalToggleCCButton.attr("aria-expanded", false); cmpl.modalMainMenu.show(); cmpl.modalCCMenu.hide(); cmpl.modalToggleCCButton.focus(); });
            this.modalCCOnButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.toggleCC();
                $(this).attr('aria-checked', true);
                cmpl.modalCCOffButton.attr('aria-checked', false);
                cmpl.logAction("Mobile CC On Click", "");
            });
            this.modalCCOffButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.toggleCC();
                $(this).attr('aria-checked', true);
                cmpl.modalCCOnButton.attr('aria-checked', false);
                cmpl.logAction("Mobile CC Off ClicK", "");
            });
            this.modalLanguageClose.on('click', function (e) { e.stopPropagation(); cmpl.modalToggleLanguageButton.attr("aria-expanded", false); cmpl.modalMainMenu.show(); cmpl.modalLanguageMenu.hide(); cmpl.modalToggleLanguageButton.focus(); });
            this.modalPlaybackSpeedClose.on('click', function (e) { e.stopPropagation(); cmpl.modalTogglePlaybackSpeedButton.attr("aria-expanded", false); cmpl.modalMainMenu.show(); cmpl.modalPlaybackSpeedMenu.hide(); cmpl.modalTogglePlaybackSpeedButton.focus(); });
            this.modalToggleCCButton.on('click', function (e) { e.stopPropagation(); cmpl.modalToggleCCButton.attr("aria-expanded", true); cmpl.modalMainMenu.hide(); cmpl.modalCCMenu.show(); cmpl.modalCCClose.focus(); cmpl.logAction("Mobile CC Menu Click", ""); });
            this.modalToggleLanguageButton.on('click', function (e) { e.stopPropagation(); cmpl.modalToggleLanguageButton.attr("aria-expanded", true); cmpl.modalMainMenu.hide(); cmpl.modalLanguageMenu.show(); cmpl.modalLanguageClose.focus(); cmpl.logAction("Mobile Language Menu Click", ""); });
            this.modalTogglePlaybackSpeedButton.on('click', function (e) { e.stopPropagation(); cmpl.modalTogglePlaybackSpeedButton.attr("aria-expanded", true); cmpl.modalMainMenu.hide(); cmpl.modalPlaybackSpeedMenu.show(); cmpl.modalPlaybackSpeedClose.focus(); cmpl.logAction("Mobile Playspeed Menu Click", ""); });
            this.modalToggleTranscriptButton.on('click', function (e) { e.stopPropagation(); cmpl.modalToggleTranscriptButton.attr("aria-expanded", true); cmpl.modalMainMenu.hide(); cmpl.modalTranscriptMenu.show(); cmpl.modalTranscriptMenuClose.focus(); cmpl.logAction("Mobile Transcript Menu Click", ""); });
            this.modalTranscriptMenuClose.on('click', function (e) { e.stopPropagation(); cmpl.modalToggleTranscriptButton.attr('aria-expanded', false); cmpl.modalTranscriptMenu.hide(); cmpl.modalMainMenu.show(); cmpl.modalToggleTranscriptButton.focus(); });
            this.modalTranscriptMenuOnButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.modalTranscriptMenuOffCheck.hide();
                cmpl.modalTranscriptMenuOnCheck.show();
                $(this).attr("aria-checked", true);
                cmpl.modalTranscriptMenuOffButton.attr("aria-checked", false);
                cmpl.setTranscript();
                cmpl.logAction("Mobile Transcript On Click", "");
                var button = $(this);
                setTimeout(function () { button.focus(); }, 100);
            });
            this.modalTranscriptMenuOffButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.modalTranscriptMenuOnCheck.hide();
                cmpl.modalTranscriptMenuOffCheck.show();
                $(this).attr("aria-checked", true);
                cmpl.modalTranscriptMenuOnButton.attr("aria-checked", false);
                cmpl.setTranscriptless();
                cmpl.logAction("Mobile Transcript Off Click", "");
                $(this).focus();
            });


            //Wire the pause button.
            this.pauseButton.on('click', function (e) { e.stopPropagation(); cmpl.pause(); cmpl.playButton.focus(); cmpl.logAction("Pause Click", ""); });
            this.playButton.on('click', function (e) { e.stopPropagation(); cmpl.play(); cmpl.pauseButton.focus(); cmpl.unforceFocusOverlay(); cmpl.logAction("Play Click", ""); });
                
            this.progressBar.on('click', function (e) { e.stopPropagation(); cmpl.progressBarClick(e); cmpl.logAction("Progress Bar Click", ""); });
            if (this.mediaType !== "Audio") {
                //We don't have scrubber images on audio.
                this.progressBar.on('mouseover', function (e) { cmpl.progressBarHover(e, false); });
                this.progressBar.on('mouseout', function (e) { cmpl.progressBarHoverOut(e); });
                this.progressBar.on('touchstart', function (e) { cmpl.progressBar.off('mouseover'); cmpl.progressBar.off('mouseout'); cmpl.progressBarHover(e, true); });
            }

            this.restartButton.on('click', function (e) { e.stopPropagation(); cmpl.setTime(0); cmpl.logAction("Restart Button Click", ""); });

            this.rewindButton.on('click', function (e) { e.stopPropagation(); cmpl.setTime(cmpl.currentTime() - cmpl.rewindSkipAmount, videoPlayer.paused()); cmpl.logAction("Rewind Button Click", ""); });

            this.relatedContentButton.on('click', function (e) { e.stopPropagation(); cmpl.executeSearchRelatedContent(); cmpl.logAction("Related Content Click", ""); });

            if (this.useSecondRewindSkip) {
                this.secondRewindButton.on('click', function (e) { e.stopPropagation(); cmpl.setTime(cmpl.currentTime() - cmpl.secondRewindSkipAmount, videoPlayer.paused()); cmpl.logAction("Second Rewind Button Click", ""); });
            }
            this.searchButton.on('click', function () { cmpl.executeSearch(); cmpl.logAction("Search Button Click", ""); });

            this.searchButtonModal.on('click', function () { cmpl.executeSearchModal(); cmpl.logAction("Search Modal Button Click", ""); });

            this.searchCloseButton.on('click', function () {cmpl.transcriptRecenter.hide(); cmpl.searchBar.removeClass('search-open'); cmpl.showSearchButton.removeClass('sg-current'); cmpl.searchBar.slideToggle('slow', function () {cmpl.transcriptRecenterShow(); parent.postMessage('{"method":"resize_v2","key":"' + cmpl.parentKey + '"}', "*"); }); if (cmpl.searchPreTab != null && cmpl.searchExecuted) { cmpl.searchPreTab.click(); } cmpl.showSearchButton.focus(); });

            this.segmentsFilterCheck.on('click', function (e) { e.stopPropagation(); cmpl.toggleTypeFilter(this); cmpl.logAction("Search Segments Filter Click", ""); });

            this.segmentsTabButton.on('click', function () { cmpl.transcriptRecenter.hide(); cmpl.searchPreTab = cmpl.segmentsTabButton; cmpl.tabButtonClick(this, cmpl.mainTabsBox, cmpl.segmentsDisplay); $('.segment-tab-segment').first().focus(); cmpl.logAction("Segments Tab", ""); });

            this.settingsButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.settingsMenu.toggleClass('hidden');
                //Depending on which settings are available at the moment, which depend on what we show.
                if (cmpl.settingsMenu.is(":visible")) {
                    if (cmpl.settingsTopMenu.is(":visible")) {
                        $('.settings-opt').first().focus();
                    }
                    else if (cmpl.settingsLanguageMenu.is(":visible")) {
                        $('.language-opt').first().focus();
                    }
                    else if (cmpl.settingsPlayspeedMenu.is(":visible")) {
                        $('.playspeed-opt').first().focus();
                    }
                    cmpl.logAction("Settings Button Click", "");
                    cmpl.settingsButton.attr("aria-expanded", true);
                }
                else {
                    cmpl.settingsButton.focus();
                    cmpl.settingsButton.attr("aria-expanded", false);
                }
            });
            this.settingsLanguageButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.settingsLanguageMenuWrapper.toggleClass('hidden');
                if (!cmpl.settingsPlayspeedMenuWrapper.hasClass("hidden")) {
                    cmpl.settingsPlayspeedMenuWrapper.toggleClass('hidden');
                }
                setTimeout(function () { cmpl.settingsLanguageCloseButton.focus(); }, 100);
                cmpl.settingsLanguageButton.attr("aria-expanded", true);
                cmpl.logAction("Settings Language Click", "");
            });
            this.settingsLanguageCloseButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.settingsLanguageMenuWrapper.toggleClass('hidden');
                cmpl.settingsLanguageButton.focus();
                cmpl.settingsLanguageButton.attr("aria-expanded", false);
            });
            this.settingsMenu.on('click', function (e) { e.stopPropagation(); });
            this.settingsPlayspeedButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.settingsPlayspeedMenuWrapper.toggleClass('hidden');
                if (!cmpl.settingsLanguageMenuWrapper.hasClass("hidden")) {
                    cmpl.settingsLanguageMenuWrapper.toggleClass('hidden');
                }
                setTimeout(function () { cmpl.settingsPlayspeedCloseButton.focus();  }, 100);
                cmpl.logAction("Settings Playspeed Click", "");
                cmpl.settingsPlayspeedButton.attr("aria-expanded", true);
            });
            this.settingsPlayspeedCloseButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.settingsPlayspeedMenuWrapper.toggleClass('hidden');
                cmpl.settingsPlayspeedButton.focus();
                cmpl.settingsPlayspeedButton.attr("aria-expanded", false);

            });

            this.showSegmentsFilter.on('click', function (e) { e.stopPropagation(); cmpl.segmentsFilterCheck.click(); cmpl.logAction("Search Show Segments Filter Click", ""); });

            this.showSearchButton.on('click', function () { cmpl.showSearch(); cmpl.searchText.focus(); });

            this.showTranscriptsFilter.on('click', function (e) { e.stopPropagation(); cmpl.transcriptsFilterCheck.click(); cmpl.logAction("Search Show Transcript Filter Click", ""); });

            if (this.timeJumpControls) {
                this.timeJumpButton.on('click', function (e) { cmpl.timeJumpButton.hide(); e.stopPropagation(); e.preventDefault();  cmpl.timeJumpInput.show(); cmpl.timeJumpInput.focus(); cmpl.logAction("Show Time Jump Button Click", ""); });
            }

            this.timeJumpInput.on('click', function (e) { e.stopPropagation(); });

            this.tabAreaContainer.on('scroll', function () { cmpl.transcriptScrolled(); });

            this.titleContainer.on('click', function (e) { e.stopPropagation(); });

            this.transcriptsFilterCheck.on('click', function (e) { e.stopPropagation(); cmpl.toggleTypeFilter(this); cmpl.logAction("Search Transcript Filter Click", ""); });

            this.transcriptRecenter.on('click', function () { cmpl.autoScroll = true; cmpl.autoScrollTranscriptToHighlight(); cmpl.logAction("Transcript Recenter Click", ""); });

            this.transcriptTabButton.on('click', function () {
                cmpl.searchPreTab = cmpl.transcriptTabButton;
                cmpl.setTranscript();
                cmpl.tabButtonClick(this, cmpl.mainTabsBox, cmpl.transcriptDisplay);
                cmpl.transcriptRecenterShow();
                if ($('.transcript-chapter').length) {
                    $('.transcript-chapter').first().focus();
                }
                else {
                    $('.transcript-segment').first().focus();
                }
                cmpl.logAction("Transcript Tab Click", "");
            });

            this.toolbarShowTranscriptButton.on('click', function (e) {
                e.stopPropagation();
                cmpl.expandTranscriptButton.click();
                cmpl.fullScreenPreviousMode = cmpl.transcriptExpanded;
            });
            //This wires up the click event for all type items in the search filter.
            $('.type-item').each(function () {
                $(this).on('click', function () {
                    $(this).find('a').attr("tabindex", "-1");
                    $('.filter-options').each(function () {
                        this.style.marginLeft = "-100%";
                    });
                    setTimeout(() => {
                        $('.type-drop')[0].style.display = "block";
                        //set focus on close option.
                        $('.type-drop').children().first().focus();
                    }, 100);
                });
            });

            this.twitterShareTabButton.on('click', function () { cmpl.tabButtonClick(this, cmpl.shareTabsBox, cmpl.shareNoTabDisplay); cmpl.logAction("Twitter Share Click", ""); });

            this.typeFilterAll.on('click', function (e) { e.stopPropagation(); cmpl.checkAllTypeFilter(true); cmpl.typeFilterClearAll.focus(); });

            this.typeFilterClearAll.on('click', function (e) { e.stopPropagation(); cmpl.checkAllTypeFilter(false); cmpl.typeFilterAll.focus(); });

            //Hover for mouse on video container.
            this.videoContainer.on('mouseover', function () {
                if (cmpl.touch == false) {
                    clearTimeout(cmpl.mousehoveredtimer);
                    cmpl.videoControlOverlay.addClass('mousehovered');

                    cmpl.mousehoveredtimer = setTimeout(function() { cmpl.videoControlOverlay.removeClass('mousehovered'); }, 2000);
                }
            });

            this.videoContainer.on('mousemove', function () {
                if (cmpl.touch == false) {
                    clearTimeout(cmpl.mousehoveredtimer);
                    cmpl.videoControlOverlay.addClass('mousehovered');
                    //$('.interactive-wrapper').addClass('controlsHoverOn');
                    cmpl.mousehoveredtimer = setTimeout(function() { cmpl.videoControlOverlay.removeClass('mousehovered'); }, 2000);
                }
            });

            this.videoContainer.on('mouseout', function () {
                if (cmpl.touch == false) {
                    clearTimeout(cmpl.mousehoveredtimer);
                    cmpl.videoControlOverlay.removeClass('mousehovered');
                    //$('.interactive-wrapper').removeClass('controlsHoverOn');

                }
            });

            if (!this.liveScreening && !this.blocksClickStartStop) {

                if (this.noControls)
                {
                    //In the case of no controls player, there is not videoControlsOverlay element.  Therefore, we need to attack the click event to the video container.
                    this.videoContainer.on('click', function () {
                        if (videoPlayer.paused()) { cmpl.play(); } else { cmpl.pause(); }
                    });
                }
                else
                {
                    this.videoControlOverlay.on('click', function () {
                        if (!cmpl.videoControlOverlay.hasClass('force_hovered'))
                        {
                            if (videoPlayer.paused()) { cmpl.playButton.click(); } else { cmpl.pauseButton.click(); }
                        }
                        //videoPlayer.multiPlayerContainerDiv.focus();
                    });
                }
            }
            else {
                //For a live screening, we prevent click start/stop.
                this.videoControlOverlay.on('click', function (e) {
                    e.preventDefault(); e.stopPropagation();
                    //videoPlayer.multiPlayerContainerDiv.focus();
                });
            }

            this.volumeBar.on('click', function (e) { e.stopPropagation(); cmpl.volumeBarClick(e); });
            this.volumeIndicatorCrosshair.on('mousedown', function () { cmpl.volumeBarDrag = false; cmpl.volumeBarDown = true; });
            this.volumeContainer.on('mousemove', function (event) { if (cmpl.volumeBarDown) { cmpl.volumeBarDrag = true; cmpl.executeVolumeBarDrag(event); } });
            this.volumeContainer.on('mouseup', function () { cmpl.volumeBarDrag = false; cmpl.volumeBarDown = false; });
            this.volumeContainer.on('mouseleave', function () { if (cmpl.volumeBarDown) { cmpl.volumeBarDrag = false; cmpl.volumeBarDown = false; } });
            this.volumeContainer.on('click', function (e) { e.stopPropagation(); }); //Prevents clicking on the container from muting.

            this.volumeButton.on('click', function (e) { e.stopPropagation(); cmpl.toggleMute(); cmpl.logAction("Mute Button Click", ""); });

            this.watchFullVideoButton.on('click', function () { cmpl.exitClipMode(0); cmpl.logAction("Exit Clip Mode Click", ""); });


            /**
             * Document and Window Based Events
             * */


            
            this.wireWindowAndDocumentEvents();

            //Fire off any on fucs wiring.
            this.wireFocus();

            //Lastly, we fire off keyboard control wiring.
            this.wireKeyboardControls();

        },
        wireFocus: function () {
            var cmpl = this;

         

            
            this.clipCustomStartTime.on('focus', function () {
                if (cmpl.isValidTimeStamp(cmpl.clipCustomStartTime.val())) {
                    cmpl.clipCustomStartTime.removeClass('invalid');
                }
                else {
                    cmpl.clipCustomStartTime.addClass('invalid');
                }
            });
            this.clipCustomStartTime.on('blur', function () {
                if (cmpl.isValidTimeStamp(cmpl.clipCustomStartTime.val())) {
                    cmpl.clipCustomStartTime.removeClass('invalid');
                }
                else {
                    cmpl.clipCustomStartTime.addClass('invalid');
                }
            });


            this.clipCustomEndTime.on('focus', function () {
                if (cmpl.isValidTimeStamp(cmpl.clipCustomEndTime.val())) {
                    cmpl.clipCustomEndTime.removeClass('invalid');
                }
                else {
                    cmpl.clipCustomEndTime.addClass('invalid');
                }
            });
            this.clipCustomEndTime.on('blur', function () {
                if (cmpl.isValidTimeStamp(cmpl.clipCustomEndTime.val())) {
                    cmpl.clipCustomEndTime.removeClass('invalid');
                }
                else {
                    cmpl.clipCustomEndTime.addClass('invalid');
                }
            });

            this.timeJumpInput.on('blur', function () {
                if (cmpl.isValidTimeStamp(cmpl.timeJumpInput.val()))
                {
                    cmpl.setTimeFromTimeStamp(cmpl.convertClippedTimeStampToRealTimeStamp(cmpl.timeJumpInput.val()));
                    cmpl.logAction("Time Jump Input Blur", "");
                }
                cmpl.timeJumpInput.hide();
                cmpl.timeJumpButton.show();
            });

            //For all controls that enforce the overlay to appear while they are focused.
            $('.focus-enforce-overlay').on('focus', function () {
                clearTimeout(cmpl.unfocusOverlaytimer);
                clearTimeout(cmpl.focusedoverlaytimer);
                cmpl.forceFocusOverlay();
                //This will cause force focused to disappear after 2 seconds and no other activity.
                cmpl.focusedoverlaytimer = setTimeout(function() { cmpl.unforceFocusOverlay(); }, 2000);
            });

            $('.focus-enforce-overlay').on('blur', function () {
                clearTimeout(cmpl.unfocusOverlaytimer);
                clearTimeout(cmpl.focusedoverlaytimer);
                 cmpl.unfocusOverlaytimer = setTimeout(function () {
                    cmpl.unforceFocusOverlay();
                }, 100);
            });

            this.volumeIndicatorCrosshair.on('focus', function (e) {
                cmpl.volumeContainer.addClass('show-opacity');
            });
            this.volumeIndicatorCrosshair.on('blur', function (e) {
                cmpl.volumeContainer.removeClass('show-opacity');
            });
        },
        wireKeyboardControls: function () {

            var cmpl = this;

            //This function gets tied to video controls overlay and tabs container so that global keyboard shortcuts can be processed.
            this.container.on('keydown', function (e) {
                if (e.keyCode == 27) { //esc
                    //Remove the focus overlay else jump to end of player.
                    if (cmpl.videoControlOverlay.hasClass('focused')) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.unforceFocusOverlay();
                    }
                    else {
                        cmpl.endOfMedia.focus();
                    }
                }
                else if (e.keyCode == 32) { //space bar.
                    if (cmpl.playState) {
                        cmpl.pause();

                        var focus = $(":focus");
                        if (focus.length && focus.attr("id") == cmpl.pauseButton.attr("id")) {
                            cmpl.playButton.focus(); //have to switch focus to pause.
                        }
                        cmpl.logAction("Pause Click", "");
                    }
                    else {
                        //Determine what is in focus as we need special behavior if the play button itself is in focus.

                        var focus = $(":focus");
                        cmpl.play();
                        if (focus.length && focus.attr("id") == cmpl.playButton.attr("id")) {
                            cmpl.pauseButton.focus(); //have to switch focus to pause.
                        }
                        cmpl.logAction("Play Click", "");
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
                else if (e.keyCode == 73) { //i for info button.
                    if (cmpl.infoButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.infoButton.click();
                    }
                }
                else if (e.keyCode == 79) { //o for playback speed settings.
                    if (cmpl.settingsPlayspeedButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.settingsPlayspeedButton.click();
                    }
                }
                else if (e.keyCode == 76) { //l for Language settings.
                    if (cmpl.settingsLanguageButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.settingsLanguageButton.click();
                    }
                }
                else if (e.keyCode == 84) //t for transcript tab button
                {
                    if (cmpl.transcriptTabButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.transcriptTabButton.click();
                        cmpl.transcriptTabButton.focus();
                    }
                }
                else if (e.keyCode == 67) //c for chat tab button
                {
                    if (cmpl.chatTabButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.chatTabButton.click();
                        cmpl.chatTabButton.focus();
                    }
                }
                else if (e.keyCode == 83) //s for segments tab button
                {
                    if (cmpl.segmentsTabButton.length && cmpl.hasSegments) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.segmentsTabButton.click();
                        cmpl.segmentsTabButton.focus();
                    }
                }
                else if (e.keyCode == 70 || e.keyCode == 39) { //f for forward 30 seconds.
                    if (cmpl.forwardButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.forwardButton.click();
                    }
                }
                else if (e.keyCode == 82 || e.keyCode == 37) { //r for back 30 seconds
                    if (cmpl.rewindButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.rewindButton.click();
                    }
                }
                else if (e.keyCode == 68) { //d for back 30 seconds
                    if (cmpl.secondRewindButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.secondRewindButton.click();
                    }
                }
                else if (e.keyCode == 77) { //m for mute toggle
                    if (cmpl.volumeButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.volumeButton.click();
                    }
                }
                else if (e.keyCode == 86) { //v for volume bar
                    if (cmpl.volumeIndicatorCrosshair.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.volumeIndicatorCrosshair.focus();
                    }
                }
                else if (e.keyCode == 78) { //n if for full screen video only
                    if (cmpl.fullScreenVideoOnlyButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.fullScreenVideoOnlyButton.click();
                    }
                }
                else if (e.keyCode == 66) { //b if for full screne w transcript
                    if (cmpl.fullScreenTranscriptButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.fullScreenTranscriptButton.click();
                    }
                }
                else if (e.keyCode == 67) { //c for toggle closed captions.
                    if (cmpl.closedCaptionsButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.closedCaptionsButton.click();
                    }
                }
                else if (e.keyCode == 65) { //a for keyboard shortcuts modal
                    if (cmpl.keyboardShortcutsButton.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        cmpl.keyboardShortcutsButton.click();
                    }
                }
                else if (e.keyCode == 80) { //p recenter and auto scroll transcript
                    if (cmpl.transcriptRecenter.length) {
                        cmpl.transcriptRecenter.click();
                    }
                }
                else if (e.keyCode == 74) { //j jump to current highlight.
                    if ($('.transcript-highlight').length) {
                        $('.transcript-highlight').focus();
                    }
                }
                else if (e.keyCode == 88) { //prev transcript chapter
                    e.preventDefault();
                    e.stopPropagation();
                    var chapters = $('.transcript-chapter');
                    var currentFocus = $(":focus"); //This is the currently focused element.
                    if (currentFocus.hasClass('transcript-chapter') || currentFocus.hasClass('transcript-segment')) {
                        var parent = currentFocus; //Is the chapter if has focus
                        if (currentFocus.hasClass('transcript-segment')) {
                            parent = currentFocus.parent(); //focus was a segment so get the parent paragraph.
                        }

                        var siblings = parent.parent().children(); //This is a list of all paragraphs.
                        var currentIndex = 0;
                        for (var i = 0; i < siblings.length; i++) {
                            if (siblings[i] == parent[0]) {
                                currentIndex = i;
                                break;
                            }
                        }

                        if (currentIndex == 0) {
                            //Select is top element.  So go to bottom element
                            if (chapters.length) {
                                chapters[chapters.length - 1].focus();
                            }
                            else {
                                //There are no chapters, so do nothing.
                            }
                        }
                        else {
                            //Find the chapter that precedes the current index in siblings.
                            var precedingChapter = null;
                            for (var p = 0; p < currentIndex; p++) {
                                if ($(siblings[p]).hasClass('transcript-chapter')) {
                                    precedingChapter = siblings[p];
                                }
                            }

                            if (precedingChapter == null) {
                                //There is no proceeding chapter whcih can only mean there are no chapters.
                                //This is true because we already captured index = 0 above which if you are on the first chapter, would mean you go caught there.
                                //So do nothing.
                            }
                            else {
                                precedingChapter.focus();
                            }
                        }
                    }
                    else {
                        //See if there is a rolling highlight.
                        var rollingHighlight = $('.transcript-highlight');

                        if (rollingHighlight.length) {
                            //In this case, find the precedding chapter to the rolling highlight.
                            var parent = rollingHighlight.parent(); //Is the chapter if has focus

                            var siblings = parent.parent().children(); //This is a list of all paragraphs.
                            var currentIndex = 0;
                            for (var i = 0; i < siblings.length; i++) {
                                if (siblings[i] == parent[0]) {
                                    currentIndex = i;
                                    break;
                                }
                            }

                            if (currentIndex == 0) {
                                //Select is top element.  So go to bottom element
                                if (chapters.length) {
                                    chapters[chapters.length - 1].focus();
                                }
                                else {
                                    //There are no chapters, so do nothing.
                                }
                            }
                            else {
                                //Find the chapter that precedes the current index in siblings.
                                var precedingChapter = null;
                                for (var p = 0; p < currentIndex; p++) {
                                    if ($(siblings[p]).hasClass('transcript-chapter')) {
                                        precedingChapter = siblings[p];
                                    }
                                }

                                if (precedingChapter == null) {
                                    //There is no proceeding chapter whcih can only mean there are no chapters.
                                    //This is true because we already captured index = 0 above which if you are on the first chapter, would mean you go caught there.
                                    //So do nothing.
                                }
                                else {
                                    precedingChapter.focus();
                                }
                            }
                        }
                        else {
                            //Select the last paragraph if there is one or last segment if there isn't.
                            if (chapters.length) {
                                chapters[chapters.length - 1].focus();
                            }
                            else {
                                //Do onthing are there are no chapters.
                            }
                        }
                    }
                }
                else if (e.keyCode == 90) { //z next transcript chapter.
                    e.preventDefault();
                    e.stopPropagation();
                    var chapters = $('.transcript-chapter');
                    var currentFocus = $(":focus"); //This is the currently focused element.
                    if (currentFocus.hasClass('transcript-chapter') || currentFocus.hasClass('transcript-segment')) {
                        var parent = currentFocus; //Is the chapter if has focus
                        if (currentFocus.hasClass('transcript-segment')) {
                            parent = currentFocus.parent(); //focus was a segment so get the parent paragraph.
                        }

                        var siblings = parent.parent().children(); //This is a list of all paragraphs.
                        var currentIndex = 0;
                        for (var i = 0; i < siblings.length; i++) {
                            if (siblings[i] == parent[0]) {
                                currentIndex = i;
                                break;
                            }
                        }


                        if (currentIndex + 1 >= siblings.length) {
                            //We are at the bottom, so select the first.
                            //Select is top element.  So go to bottom element
                            if (chapters.length) {
                                chapters[0].focus();
                            }
                            else {
                                //There are no chapters, so do nothing.
                            }
                        }
                        else {
                            //Find the chapter that is after the current index in siblings.
                            var nextChapter = null;
                            for (var p = currentIndex + 1; p < siblings.length; p++) {
                                if ($(siblings[p]).hasClass('transcript-chapter')) {
                                    nextChapter = siblings[p];
                                    break;
                                }
                            }


                            if (nextChapter == null) {
                                //If couldn't not locate next chapter, try for first.
                                if (chapters.length) {
                                    chapters[0].focus();
                                }
                                //There is no proceeding chapter whcih can only mean there are no chapters.
                                //This is true because we already captured index = 0 above which if you are on the first chapter, would mean you go caught there.
                                //So do nothing.
                            }
                            else {
                                nextChapter.focus();
                            }
                        }
                    }
                    else {
                        //See if there is a rolling highlight.
                        var rollingHighlight = $('.transcript-highlight');

                        if (rollingHighlight.length) {
                            //In this case, find the precedding chapter to the rolling highlight.
                            var parent = rollingHighlight.parent(); //Is the chapter if has focus

                            var siblings = parent.parent().children(); //This is a list of all paragraphs.
                            var currentIndex = 0;
                            for (var i = 0; i < siblings.length; i++) {
                                if (siblings[i] == parent[0]) {
                                    currentIndex = i;
                                    break;
                                }
                            }

                            if (currentIndex + 1 == siblings.length) {
                                //Select is top element.  So go to bottom element
                                if (chapters.length) {
                                    chapters[0].focus();
                                }
                                else {
                                    //There are no chapters, so do nothing.
                                }
                            }
                            else {
                                //Find the chapter that precedes the current index in siblings.
                                var nextChapter = null;
                                for (var p = currentIndex + 1; p < siblings.length; p++) {
                                    if ($(siblings[p]).hasClass('transcript-chapter')) {
                                        nextChapter = siblings[p];
                                        break;
                                    }
                                }

                                if (nextChapter == null) {
                                    if (chapters.length) {
                                        chapters[0].focus();
                                    }
                                    //There is no proceeding chapter whcih can only mean there are no chapters.
                                    //This is true because we already captured index = 0 above which if you are on the first chapter, would mean you go caught there.
                                    //So do nothing.
                                }
                                else {
                                    nextChapter.focus();
                                }
                            }
                        }
                        else {
                            //Select the first paragraph if there is one or last segment if there isn't.
                            if (chapters.length) {
                                chapters[0].focus();
                            }
                            else {
                                //Do onthing are there are no chapters.
                            }
                        }
                    }
                }
                else if (e.keyCode == 81) {//q next paragraph
                    e.preventDefault();
                    e.stopPropagation();
                    var currentFocus = $(":focus"); //This is the currently focused element.
                    if (currentFocus.hasClass('transcript-chapter') || currentFocus.hasClass('transcript-segment')) {
                        var parent = currentFocus; //Is the chapter if has focus
                        if (currentFocus.hasClass('transcript-segment')) {
                            parent = currentFocus.parent(); //focus was a segment so get the parent paragraph.
                        }

                        var siblings = parent.parent().children('.transcript-chapter,.transcript-paragraph'); //This is a list of all paragraphs.
                        var currentIndex = 0;
                        for (var i = 0; i < siblings.length; i++) {
                            if (siblings[i] == parent[0]) {
                                currentIndex = i;
                                break;
                            }
                        }


                        if (currentIndex + 1 >= siblings.length) {
                            //We are at the bottom, so select the first.
                            //Select is top element.  So go to bottom element
                            if ($(siblings[0]).hasClass('transcript-chapter')) {
                                $(siblings[0]).focus();
                            }
                            else {
                                $(siblings[0]).children().first().focus();
                            }
                        }
                        else {
                            //Find the chapter that is after the current index in siblings.
                            var nextPara = siblings[currentIndex + 1];
                            if ($(nextPara).hasClass('transcript-chapter')) {
                                $(nextPara).focus();
                            }
                            else {
                                $(nextPara).children().first().focus();
                            }
                        }
                    }
                    else {
                        //See if there is a rolling highlight.
                        var rollingHighlight = $('.transcript-highlight');

                        if (rollingHighlight.length) {
                            //In this case, find the precedding chapter to the rolling highlight.
                            var parent = rollingHighlight.parent(); //Is the chapter if has focus

                            var siblings = parent.parent().children('.transcript-chapter,.transcript-paragraph'); //This is a list of all paragraphs.
                            var currentIndex = 0;
                            for (var i = 0; i < siblings.length; i++) {
                                if (siblings[i] == parent[0]) {
                                    currentIndex = i;
                                    break;
                                }
                            }

                            if (currentIndex + 1 == siblings.length) {
                                //Select is top element.  So go to bottom element
                                if ($(siblings[0]).hasClass('transcript-chapter')) {
                                    $(siblings[0]).focus();
                                }
                                else {
                                    $(siblings[0]).children().first().focus();
                                }
                            }
                            else {
                                //Find the chapter that precedes the current index in siblings.
                                var nextPara = siblings[currentIndex + 1];
                                if ($(nextPara).hasClass('transcript-chapter')) {
                                    $(nextPara).focus();
                                }
                                else {
                                    $(nextPara).children().first().focus();
                                }
                            }
                        }
                        else {
                            $('.transcript-segment').first().focus();
                        }
                    }
                }
                else if (e.keyCode == 87) { //w prev paragraph
                    e.preventDefault();
                    e.stopPropagation();
                    var currentFocus = $(":focus"); //This is the currently focused element.
                    if (currentFocus.hasClass('transcript-chapter') || currentFocus.hasClass('transcript-segment')) {
                        var parent = currentFocus; //Is the chapter if has focus
                        if (currentFocus.hasClass('transcript-segment')) {
                            parent = currentFocus.parent(); //focus was a segment so get the parent paragraph.
                        }

                        var siblings = parent.parent().children('.transcript-chapter,.transcript-paragraph'); //This is a list of all paragraphs.
                        var currentIndex = 0;
                        for (var i = 0; i < siblings.length; i++) {
                            if (siblings[i] == parent[0]) {
                                currentIndex = i;
                                break;
                            }
                        }


                        if (currentIndex == 0) {
                            //We are at the bottom, so select the first.
                            //Select is top element.  So go to bottom element
                            if ($(siblings[siblings.length - 1]).hasClass('transcript-chapter')) {
                                $(siblings[siblings.length - 1]).focus();
                            }
                            else {
                                $(siblings[siblings.length - 1]).children().first().focus();
                            }
                        }
                        else {
                            //Find the chapter that is after the current index in siblings.
                            var nextPara = siblings[currentIndex - 1];
                            if ($(nextPara).hasClass('transcript-chapter')) {
                                $(nextPara).focus();
                            }
                            else {
                                $(nextPara).children().first().focus();
                            }
                        }
                    }
                    else {
                        //See if there is a rolling highlight.
                        var rollingHighlight = $('.transcript-highlight');

                        if (rollingHighlight.length) {
                            //In this case, find the precedding chapter to the rolling highlight.
                            var parent = rollingHighlight.parent(); //Is the chapter if has focus

                            var siblings = parent.parent().children('.transcript-chapter,.transcript-paragraph'); //This is a list of all paragraphs.
                            var currentIndex = 0;
                            for (var i = 0; i < siblings.length; i++) {
                                if (siblings[i] == parent[0]) {
                                    currentIndex = i;
                                    break;
                                }
                            }

                            if (currentIndex == 0) {
                                //Select is top element.  So go to bottom element
                                if ($(siblings[siblings.length - 1]).hasClass('transcript-chapter')) {
                                    $(siblings[siblings.length - 1]).focus();
                                }
                                else {
                                    $(siblings[siblings.length - 1]).children().first().focus();
                                }
                            }
                            else {
                                //Find the chapter that precedes the current index in siblings.
                                var nextPara = siblings[currentIndex - 1];
                                if ($(nextPara).hasClass('transcript-chapter')) {
                                    $(nextPara).focus();
                                }
                                else {
                                    $(nextPara).children().first().focus();
                                }
                            }
                        }
                        else {
                            $('.transcript-segment').last().focus();
                        }
                    }
                }
            });

            $('.back-type-btn').on('keydown', function (e) {
                if (e.keyCode == 13) { //enter
                    e.stopPropagation();
                    e.preventDefault();
                    $(this).click();
                }
            });

            this.chatTabButton.on('keydown', function (e) {
                if (e.keyCode == 13) { //enter
                    e.stopPropagation();
                    e.preventDefault();
                    cmpl.chatTabButton.click();
                }
            });

            this.collapseTranscriptButton.on('keydown', function (e) {
                if (e.keyCode == 9 && !e.shiftKey) {
                    cmpl.endOfMedia.focus();
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

         


            this.clipCustomStartTime.on('keyup', function () {
                if (cmpl.isValidTimeStamp(cmpl.clipCustomStartTime.val())) {
                    cmpl.clipCustomStartTime.removeClass('invalid');
                }
                else {
                    cmpl.clipCustomStartTime.addClass('invalid');
                }
            });

            this.clipCustomEndTime.on('keyup', function () {
                if (cmpl.isValidTimeStamp(cmpl.clipCustomEndTime.val())) {
                    cmpl.clipCustomEndTime.removeClass('invalid');
                }
                else {
                    cmpl.clipCustomEndTime.addClass('invalid');
                }
            });

            $('.close').on('keydown', function (e) {
                if (e.keyCode == 13) {
                    e.preventDefault();
                    $(this).click();
                }
            });

            this.endOfMedia.on('keydown', function (e) {
                if (e.keyCode == 9 && e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (cmpl.showAd && (cmpl.adPaused || cmpl.adPlaying)) {
                        if (cmpl.adPaused) {
                            cmpl.adBigPlayButton.focus();
                        }
                        else {
                            cmpl.adContainerElement.focus();
                        }
                    }
                    else {
                        if (cmpl.noTabs == true || cmpl.transcriptExpanded == false) {
                            if ($('.video-controls-right').children().length) {
                                $('.video-controls-right').children().last().focus();
                            }
                            else {
                                $('.video-controls-left').children().last().focus();
                            }
                        }
                        else {
                            cmpl.collapseTranscriptButton.focus();
                        }
                    }
                }
            });

            $('.end-of-modal').on('keydown', function (e) {
                if (event.keyCode == 9 && !event.shiftKey) { //tab
                    $(this).closest('.modal-content').find('.start-of-modal').focus();
                    e.preventDefault();
                }
                else if (event.keyCode == 9 && event.shiftKey) {
                    //if this is the language menu, we need to back to the last language.
                    if (cmpl.modalLanguageMenu.is(":visible")) {
                        var langOpts = $('.langOpt');
                        langOpts[langOpts.length - 1].focus();
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            });



            //Lang opts are options in the language menu.  We have to handle tabs with javascript for them because they are dynamically built outside of tab order.
            $('.langOpt').on('keydown', function (e) {
                var langOpts = $('.langOpt');
                if (e.keyCode == 9 && !e.shiftKey) { //Tab no shift.
                    e.preventDefault();
                    e.stopPropagation();
                    //Tab down to next lang or end of modal if that's where we are.
                    for (var i = 0; i < langOpts.length; i++) {
                        if (langOpts[i] == this) {
                            if (i + 1 >= langOpts.length) {
                                //Tab to end of modal.
                                $(this).closest('.modal-content').find('.end-of-modal').focus();
                            }
                            else {
                                $(langOpts[i + 1]).focus();
                            }
                            break;
                        }
                    }
                }
                else if (e.keyCode == 9 && e.shiftKey) { //shift+tab
                    e.preventDefault();
                    e.stopPropagation();
                    for (var i = 0; i < langOpts.length; i++) {
                        if (langOpts[i] == this) {
                            if (i == 0) {
                                cmpl.modalLanguageClose.focus();
                            }
                            else {
                                $(langOpts[i - 1]).focus();
                            }
                            break;
                        }
                    }
                }
            });


            $('.modal-content').on('keyup', function (e) {
                if (e.keyCode == 27) { //esc
                    $(this).find('.close').click();
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            this.modalMenu.on('keydown', function (e) {
                if (e.keyCode == 27) { //esc
                    if (cmpl.mobileMenuOpen) {
                        e.preventDefault();
                        e.stopPropagation();
                        $('.modalMenuClose').click();
                    }
                }
            });

            $('.modalMenuClose').on('keydown', function (e) {
                if (e.keyCode == 13) { //enter
                    e.stopPropagation();
                    e.preventDefault();
                    $('.modalMenuClose').click();
                }
            });

            this.modalCCClose.on('keydown', function (e) {
                if (e.keyCode == 13) { //enter
                    e.stopPropagation();
                    e.preventDefault();
                    cmpl.modalCCClose.click();
                }
            });

            this.modalLanguageClose.on('keydown', function (e) {
                if (e.keyCode == 13) { //enter
                    e.stopPropagation();
                    e.preventDefault();
                    cmpl.modalLanguageClose.click();
                }
                else if (e.keyCode == 9 && !e.shiftKey) { //tab.
                    //We have to hard code tab on this to cycle the languages underneath because they are constructed dynamically and therefore fall outside of the fixed tab order.
                    e.stopPropagation();
                    e.preventDefault();
                    //Focus on first language.
                    $('.langOpt').first().focus();
                }
            });

            this.modalPlaybackSpeedClose.on('keydown', function (e) {
                if (e.keyCode == 13) {//enter
                    e.stopPropagation();
                    e.preventDefault();
                    cmpl.modalPlaybackSpeedClose.click();
                }
            });

            this.modalTranscriptMenuClose.on('keydown', function (e) {
                if (e.keyCode == 13) { //enter
                    e.stopPropagation();
                    e.preventDefault();
                    cmpl.modalTranscriptMenuClose.click();
                }
            });

            $('.playspeed-opt').on('keydown', function (e) {
                if ((e.keyCode == 9 && !e.shiftKey) || e.keyCode == 40) { //tab
                    var playspeeds = $('.playspeed-opt');
                    for (var i = 0; i < playspeeds.length; i++) {
                        if (playspeeds[i] == this) {
                            if (i + 1 >= playspeeds.length) {
                                playspeeds[0].focus();
                            }
                            else {
                                playspeeds[i + 1].focus();
                            }
                            e.preventDefault();
                            e.stopPropagation()
                            break;
                        }
                    }
                }
                else if ((e.keyCode == 9 && e.shiftKey) || e.keyCode == 38) {
                    var playspeeds = $('.playspeed-opt');
                    for (var i = 0; i < playspeeds.length; i++) {
                        if (playspeeds[i] == this) {
                            if (i == 0) {
                                playspeeds[playspeeds.length - 1].focus();
                            }
                            else {
                                playspeeds[i - 1].focus();
                            }
                            e.preventDefault();
                            e.stopPropagation();
                            break;
                        }
                    }
                }
                else if (e.keyCode == 27) {//esc
                    //Fire close button.
                    e.preventDefault();
                    e.stopPropagation();
                    cmpl.settingsPlayspeedCloseButton.click();
                }
                else if (e.keyCode == 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).click();
                }
            });

            this.progressCrosshair.on('keydown', function (e) {
                if (e.keyCode == 37) { //left
                    e.preventDefault();
                    e.stopPropagation();
                    cmpl.setTime(cmpl.currentTime() - 1);
                }
                else if (e.keyCode == 39) { //right
                    e.preventDefault();
                    e.stopPropagation();
                    cmpl.setTime(cmpl.currentTime() + 1);

                }
            });

            this.searchText.on('keypress', function () {
                if (event.keyCode == 13) { //enter
                    cmpl.searchButton.click();
                }
            });

            this.searchTextModal.on('keypress', function () {
                if (event.keyCode == 13) {
                    cmpl.searchButtonModal.click();
                }
            });

            

            $('.start-of-modal').on('keydown', function (e) {
                if (event.keyCode == 9 && event.shiftKey) { //shift + tab
                    $(this).closest('.modal-content').find('.end-of-modal').focus();
                    e.preventDefault();
                }
            });

            this.searchCloseButton.on('keydown', function (e) {
                if (e.keyCode == 9 && !e.shiftKey && !cmpl.searchDisplay.is(":visible")) {
                    e.stopPropagation();
                    e.preventDefault();
                    cmpl.showSearchButton.focus();
                }
            });

            this.searchText.on('keydown', function (e) {
                e.stopPropagation();
                if (e.keyCode == 9 && e.shiftKey) {
                    e.preventDefault();
                    cmpl.showSearchButton.focus();
                }
            });

           
            this.segmentsTabButton.on('keydown', function (e) {
                if (e.keyCode == 13) { //enter
                    e.stopPropagation();
                    e.preventDefault();
                    cmpl.segmentsTabButton.click();
                }
            });

            this.settingsLanguageCloseButton.on('keydown', function (e) {
                if (e.keyCode == 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).click();
                }
                else if (e.keyCode == 9 || e.keyCode == 27 || e.keyCode == 38 || e.keyCode == 40) {
                    //On tab
                    cmpl.settingsLanguageKeyDown(e);
                }

            });
         
            this.timeJumpInput.on('keypress', function () {
                if (event.keyCode == 13) {
                    if (cmpl.isValidTimeStamp(cmpl.timeJumpInput.val())) {
                        cmpl.setTimeFromTimeStamp(cmpl.convertClippedTimeStampToRealTimeStamp(cmpl.timeJumpInput.val()));
                        cmpl.logAction("Time Jump Input Enter", "");
                    }
                    cmpl.timeJumpInput.hide();
                    cmpl.timeJumpButton.show();
                    cmpl.timeJumpButton.focus();
                }
                else {
                    if (cmpl.isValidTimeStamp(cmpl.timeJumpInput.val())) {
                        cmpl.timeJumpInput.removeClass('invalidTime');
                    }
                    else {
                        cmpl.timeJumpInput.addClass('invalidTime');
                    }
                }
            });

            this.transcriptRecenter.on('keydown', function (e) {
                if (e.keyCode == 9 && e.shiftKey) {
                    cmpl.transcriptArea.children().last().focus();
                    e.stopPropagation();
                    e.preventDefault();
                }
                else if (e.keyCode == 9 && !e.shiftKey) {
                    cmpl.transcriptTabButton.focus();
                    e.stopPropagation();
                    e.preventDefault();
                }
            });

            this.transcriptTabButton.on('keydown', function (e) {
                if (e.keyCode == 13) { //enter or space
                    e.stopPropagation();
                    e.preventDefault();
                    cmpl.transcriptTabButton.click();
                }
            });

            this.typeFilterAll.on('keydown', function (e) {
                if (e.keyCode == 13) {
                    e.stopPropagation();
                    e.preventDefault();
                    $(this).click();
                }
            });

            this.typeFilterClearAll.on('keydown', function (e) {
                if (e.keyCode == 13) {
                    e.stopPropagation();
                    e.preventDefault();
                    $(this).click();
                }
            });

         
            this.volumeIndicatorCrosshair.on('keydown', function (e) {
                if (e.keyCode == 38) { //up
                    e.preventDefault();
                    e.stopPropagation();

                    var curVolume = videoPlayer.volume();

                    if (curVolume < 100) {
                        curVolume = curVolume + 0.1;
                        if (curVolume > 100) {
                            curVolume = 100;
                        }
                    }

                    videoPlayer.volume(curVolume);

                    //Then update the volume indicator width for that percentage.
                    cmpl.volumeBar.attr("aria-valuenow", Math.floor(videoPlayer.volume() * 100));

                    cmpl.volumeIndicator.height((videoPlayer.volume() * 100) + '%');
                }
                else if (e.keyCode == 40) { //down
                    e.preventDefault();
                    e.stopPropagation();
                    var curVolume = videoPlayer.volume();
                    if (curVolume > 0) {
                        curVolume = curVolume - 0.1;
                        if (curVolume < 0) {
                            curVolume = 0;
                        }
                    }

                    videoPlayer.volume(curVolume);

                    //Then update the volume indicator width for that percentage.
                    cmpl.volumeBar.attr("aria-valuenow", Math.floor(videoPlayer.volume() * 100));

                    cmpl.volumeIndicator.height((videoPlayer.volume() * 100) + '%');
                }
            });

            this.adContainerElement.on('keydown', function (e) {
                if (cmpl.adShowing) {
                    e.stopPropagation();

                    if (e.keyCode == "13" || e.keyCode == "32") {
                        //wtf do we click here?
                        //pause this thing.
                        cmpl.adsManager.pause();
                        e.preventDefault();
                    }
                    else if (e.keyCode == 9 && !e.shiftKey) {
                        cmpl.endOfMedia.focus();
                        e.preventDefault();
                    }
                }
            });

            this.adBigPlayButton.on('keydown', function (e) {
                e.stopPropagation();
                
                if (e.keyCode == "13") {
                    //enter press.
                    cmpl.adBigPlayButton.click();
                    e.preventDefault();
                }
                else if (e.keyCode == 9 && !e.shiftKey) {
                    cmpl.endOfMedia.focus();
                    e.preventDefault();
                }
            });

            this.settingsLanguageButton.on('keydown', function (e) {
                if (e.keyCode == "13")
                {
                    e.preventDefault();
                    e.stopPropagation();
                    cmpl.settingsLanguageButton.click();            
                }
            });

            this.settingsPlayspeedButton.on('keydown', function (e) {
                if (e.keyCode == "13")
                {
                    e.preventDefault();
                    e.stopPropagation();
                    cmpl.settingsPlayspeedButton.click();            
                }
            });
        },
        wireFilterModalButton: function () {
            var cmpl = this;
            //The filter button gets generated on search and so has to be wired each time it is displayed.
            $('#filter-button-modal').on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                cmpl.modalSearch[0].style.visibility = "hidden";
                cmpl.modalSearch[0].style.opacity = "0";
                cmpl.modalSearch[0].style.transition = "visibility 0s, opacity 0.2s linear;";
                var modal = document.querySelector(e.target.getAttribute("href"));
                modal.style.visibility = "visible";
                modal.style.opacity = "1";
                cmpl.forceOverlay(); //keep the overlay open while on a modal.
                cmpl.filterFromSearchModal = true;
                setTimeout(function () { cmpl.filterModalClose.focus(); }, 100);
            });
        },
        wireModalButton: function (btn) {

            var cmpl = this;
            $(btn).on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var modal = document.querySelector($(this)[0].getAttribute("href"));
                //log request for modal open.
                cmpl.logAction(modal.id, '');
                modal.style.visibility = "visible";
                modal.style.opacity = "1";
                cmpl.forceOverlay(); //keep the overlay open while on a modal.
                cmpl.filterFromSearchModal = false;
                $(this).attr("aria-expaded", true);
                //We also have to focus on the close button for a modal.
                //Find the .close child.
                setTimeout(function () {$(modal).find('.close').focus(); }, 250);
            });

        },
        wireModalCloseButton: function (btn) {
            var cmpl = this;
            $(btn).on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
              
                $(this).attr("aria-expanded", false);

                cmpl.closeAllModals();
                //special function for the filter modal close.
                //if we came here from a search modal, we want to reopen the search modal now.
                var filterModalClose = false;
                if ($(this).hasClass('filter-close') && cmpl.filterFromSearchModal == true) {
                    filterModalClose = true;
                    $('#modal-search-button').click();
                }
                var returnAttr = $(this).attr('data-return');
                if (returnAttr !== 'undefined' && returnAttr !== false) {
                    //There's one exceptional case here, and that's the info button.
                    //If the modal menu is open and we click this, we want to return to the modal menu's info button.
                    if ($(this).data("return") == "info-button" && cmpl.mobileMenuOpen) {
                        //instead return to info button on mobile menu.
                        $('#modal-menu-info-button').focus();
                    }
                    else {
                        if (filterModalClose) {
                            //We have to add a delay when closing and going back to modal filter because the above click on search button to open the other modal
                            //will delay to focus on its close button.  So, we have to delay further.
                            var ctrl = $(this);
                            setTimeout(function () {
                                $('#' + ctrl.data("return")).focus();
                            }, 300);
                        }
                        else {
                            $('#' + $(this).data("return")).focus();
                        }
                    }
                }
           });
         
        },
        wireWindowAndDocumentEvents: function () {

            var cmpl = this;

            // When the user clicks anywhere outside of the modal, close it
            window.onclick = function (event) {
                if (event.target.classList.contains('modal')) {
                    var modals = document.querySelectorAll('.modal');
                    for (var index in modals) {
                        if (typeof modals[index].style !== 'undefined') modals[index].style.visibility = "hidden";
                        modals[index].style.opacity = "0";
                        modals[index].style.transition = "visibility 0s, opacity 0.2s linear;";
                    }
                }
            }

            //This handles touch and mouse so we can get different behavior on the video control overlays.
            //On touchstart, we will flag and enter touch mode.  The reason for the touch start is we don't want to stop prop because we want events to bubble through.
            //touchStart will prevent the mousemove event from firing (because mousemove will fire on any touch event as well).  THis ends with mouseup (the last in the chain of events) flagging tha back to false.
            document.addEventListener('touchstart', function (e) {
                cmpl.touchStart = true;
                cmpl.videoContainer.removeClass('notouch');
                cmpl.touch = true; //Sets touch to true, which tells us we are in touch mode.
                console.log("CMPL: Touch detected.  Entering Touch mode.");
            });
            document.addEventListener('mousemove', function (e) {
                if (!cmpl.touchStart) {
                    cmpl.videoContainer.addClass('notouch');
                    if (cmpl.touch) {
                        console.log("CMPL: Mouse detected.  Exiting Touch mode.");
                        cmpl.touch = false; //set touch to false to tell us we are now outside of touch mode.
                        cmpl.videoControlOverlay.removeClass('touchpause'); //execute remove on this class in case it is in play.
                        cmpl.closedCaptions.removeClass('touchpause');
                    }
                }
            });
            document.addEventListener('mouseup', function () {
                cmpl.touchStart = false;
            });



            //This handles helping us get out of full screen, detecting that event and firing.
            document.addEventListener('webkitfullscreenchange', exitHandler, false);
            document.addEventListener('mozfullscreenchange', exitHandler, false);
            document.addEventListener('fullscreenchange', exitHandler, false);
            document.addEventListener('MSFullscreenChange', exitHandler, false);

            function exitHandler() {
                if (!cmpl.controlRequestFullScreen) {
                    //This did not come from our button but from browser so we need to handle it.
                    if (document.webkitIsFullScreen === false) {
                        ///fire your event
                        cmpl.requestFullScreen();
                    }
                    else if (document.mozFullScreen === false) {
                        ///fire your event
                        cmpl.requestFullScreen();
                    }
                    else if (document.msFullscreenElement === false) {
                        ///fire your event
                        cmpl.requestFullScreen();
                    }
                }
                else {
                    //This came from our button so we can ignore this event.
                    cmpl.controlRequestFullScreen = false;
                }
            }


            //Used to keep track of the user's mouse for the scrubber bar.
            $(document).mousemove(function (e) {
                cmpl.mouseX = e.pageX;
                cmpl.mouseY = e.pageY;
            });

            $(window).on('resize', function () {
                cmpl.updatePlayBackPercentage(true);
            });

        },
        volumeBarClick: function (e) {
            e.stopPropagation();
            e.preventDefault();
            var clientRectangle = document.getElementById('volume-bar').getBoundingClientRect();


            var x = e.pageX - clientRectangle.left, // or e.offsetX (less support, though)
                y = e.pageY - clientRectangle.top;  // or e.offsetY


            //Get the percentage of where the volume bar was clicked.
            var percentageOfVolumeBar = 1 - (y / cmpl.volumeBar.height());

            //Now take that percentage and up the volume to that amount.
            videoPlayer.volume(percentageOfVolumeBar);

            //this.volumeBar.attr("aria-valuenow", Math.floor(percentageOfVolumeBar * 100));

            //Then update the volume indicator width for that percentage.
            cmpl.volumeBar.attr("aria-valuenow", Math.floor(videoPlayer.volume() * 100));

            cmpl.volumeIndicator.height((videoPlayer.volume() * 100) + '%');
        },
        closeAllModals: function ()
        {
            //This will close all modals.
            var modals = document.querySelectorAll('.modal');
            for (var index in modals) {
                if (typeof modals[index].style !== 'undefined') {
                    modals[index].style.visibility = "hidden";
                    modals[index].style.opacity = "0";
                    modals[index].style.transition = "visibility 0s, opacity 0.2s linear;";

                    //We don't unforce overlay if the modalMenu is open.
                    if (cmpl.modalMenu.hasClass('all-mobile-hidden')) {
                        cmpl.unforceOverlay();
                    }

                }
            }
         
        },
        closeAllMenus: function () {
            var cmpl = this;
            cmpl.mobileMenuModalContent.attr("role", "");
            cmpl.menuButton.attr("aria-expanded", false);
            cmpl.unforceOverlay();
            cmpl.modalMenu.addClass('all-mobile-hidden');

            //ANd force all menus to be closed as well.
            cmpl.modalMainMenu.show();
            cmpl.modalLanguageMenu.hide();
            cmpl.modalCCMenu.hide();
            cmpl.modalPlaybackSpeedMenu.hide();
            cmpl.modalTranscriptMenu.hide();
            cmpl.mobileMenuOpen = false;
           
            cmpl.mobileMenuEndOfModal.hide();
        }
    }
}($));


