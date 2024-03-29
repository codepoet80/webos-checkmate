/*
    Check Mate to do list app for webOS.
    This app depends on a Check Mate web service, which is hosted by webOS Archive at no charge for what remains of the webOS mobile community.
    You can also host the service yourself: http://www.github.com/codepoet80/checkmate-service
*/

function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

MainAssistant.prototype.setup = function() {

    //Default to light theme
    if (Object.keys(appModel.AppSettingsCurrent).indexOf('ThemePreference') == -1)
        appModel.AppSettingsCurrent["ThemePreference"] = "palm-default";
    appModel.SetThemePreference(this.controller);

    //Loading spinner - with global members for easy toggling later
    this.spinnerAttrs = {
        spinnerSize: Mojo.Widget.spinnerLarge
    };
    this.spinnerModel = {
        spinning: false
    }
    this.controller.setupWidget('workingSpinner', this.spinnerAttrs, this.spinnerModel);
    //Tasks List (starts empty)
    this.emptyTasks = [
        { id: "-1", videoName: "Empty", thumbnail: "", selectedState: true }
    ]
    this.taskListElement = this.controller.get('taskList');
    this.taskInfoModel = {
        items: this.emptyTasks
    };
    //Task List templates (loads other HTML)
    this.template = {
        itemTemplate: 'main/item-template',
        listTemplate: 'main/list-template',
        swipeToDelete: true,
        reorderable: true,
        addItemLabel: "New Task"
    };
    this.controller.setupWidget("taskList", this.template, this.taskInfoModel);
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            Mojo.Menu.editItem,
            { label: "Preferences", command: 'do-Preferences' },
            { label: "Log In", command: 'do-LogInOut' },
            { label: "About", command: 'do-myAbout' }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
    //Command Buttons
    this.cmdMenuAttributes = {
            spacerHeight: 40,
            menuClass: 'no-fade'
        },
        this.cmdMenuModel = {
            visible: false,
            items: [{
                    items: [
                        { label: 'Sweep', iconPath: 'images/sweep.png', command: 'do-sweep' },
                        { label: 'Refresh', icon: 'refresh', command: 'do-refresh' }
                    ]
                },
                {
                    items: [
                        { label: 'New', icon: 'new', command: 'do-new' }
                    ]
                }
            ]
        };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);
    /* Always on Event handlers */
    Mojo.Event.listen(this.controller.get("taskList"), Mojo.Event.listReorder, this.handleListReorder.bind(this));
    Mojo.Event.listen(this.controller.get("taskList"), Mojo.Event.listDelete, this.handleListDelete.bind(this));
    Mojo.Event.listen(this.controller.get("taskList"), Mojo.Event.listTap, this.handleListClick.bind(this));
    Mojo.Event.listen(this.controller.get("taskList"), Mojo.Event.listAdd, this.handleListAdd.bind(this));
    //Just type
    this.keypressHandler = this.handleKeyPress.bindAsEventListener(this);
    this.controller.document.addEventListener("keypress", this.keypressHandler, true);

    //Check for updates
    if (!appModel.UpdateCheckDone) {
        appModel.UpdateCheckDone = true;
        updaterModel.CheckForUpdate("Check Mate", this.handleUpdateResponse.bind(this));
    }
};

MainAssistant.prototype.activate = function(event) {
    //Load preferences
    appModel.LoadSettings();
    Mojo.Log.info("settings now: " + JSON.stringify(appModel.AppSettingsCurrent));
    serviceModel.UseCustomEndpoint = appModel.AppSettingsCurrent["UseCustomEndpoint"];
    serviceModel.CustomEndpointURL = appModel.AppSettingsCurrent["EndpointURL"];

    //Set correct menu label
    var loggedInLabel = "Log In";
    if (appModel.AppSettingsCurrent["ChessMove"] != "" && appModel.AppSettingsCurrent["Grandmaster"] != "") {
        loggedInLabel = "Log Out";
        var thisCommandModel = this.controller.getWidgetSetup(Mojo.Menu.commandMenu).model;
        thisCommandModel.visible = true;
        this.controller.modelChanged(thisCommandModel);
    }
    var thisMenuModel = this.controller.getWidgetSetup(Mojo.Menu.appMenu).model;
    thisMenuModel.items[2].label = loggedInLabel;
    this.controller.modelChanged(thisMenuModel);

    //find out what kind of device this is
    if (Mojo.Environment.DeviceInfo.platformVersionMajor >= 3) {
        this.DeviceType = "TouchPad";
        Mojo.Log.info("Device detected as TouchPad");
    } else {
        if (window.screen.width == 800 || window.screen.height == 800) {
            this.DeviceType = "Pre3";
            Mojo.Log.info("Device detected as Pre3");
        } else if ((window.screen.width == 480 || window.screen.height == 480) && (window.screen.width == 320 || window.screen.height == 320)) {
            this.DeviceType = "Pre";
            Mojo.Log.warn("Device detected as Pre or Pre2");
        } else {
            this.DeviceType = "Tiny";
            Mojo.Log.warn("Device detected as Pixi or Veer");
        }
    }
    if (appModel.AppSettingsCurrent["FirstRun"]) {
        appModel.AppSettingsCurrent["FirstRun"] = false;
        appModel.SaveSettings();
        this.showWelcomePrompt();
    } else {
        if (appModel.AppSettingsCurrent["ChessMove"] != "" && appModel.AppSettingsCurrent["Grandmaster"] != "") {
            Mojo.Log.info("About to fetch tasks...");
            this.fetchTasks();
            if (appModel.AppSettingsCurrent["RefreshTimeout"] && appModel.AppSettingsCurrent["RefreshTimeout"] > 1000) {
                Mojo.Log.warn("Auto refresh interval: " + appModel.AppSettingsCurrent["RefreshTimeout"]);
                clearInterval(this.refreshInt);
                this.refreshInt = setInterval(this.fetchTasks.bind(this), appModel.AppSettingsCurrent["RefreshTimeout"]);
            } else {
                Mojo.Log.warn("Using Manual Refresh");
            }
            //handle launch with query
            if (appModel.LaunchQuery && appModel.LaunchQuery != "") {
                appModel.LastTaskSelected = { guid: "new", title: appModel.LaunchQuery };
                this.showEditDialog();
            }
        } else {
            appModel.LaunchQuery = "";
            this.showWelcomePrompt();
        }
    }
};

MainAssistant.prototype.handleUpdateResponse = function(responseObj) {
    if (responseObj && responseObj.updateFound) {
        updaterModel.PromptUserForUpdate(function(response) {
            if (response)
                updaterModel.InstallUpdate();
        }.bind(this));
    }
}

/* UI Event Handlers */

//Handles the enter key
MainAssistant.prototype.handleKeyPress = function(event) {
    if (event.srcElement.toString().indexOf("HTMLInputElement") == -1) {
        if (!event.shiftKey && !this.DoingEdit) {
            Mojo.Log.info("Key pressed!" + String.fromCharCode(event.keyCode));
            appModel.LastTaskSelected = { guid: "new" };
            this.showEditDialog();
        }
    }
};

MainAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-LogInOut':
                this.doLogInOut();
                break;
            case 'do-Preferences':
                var stageController = Mojo.Controller.stageController;
                stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                break;
            case 'do-myAbout':
                Mojo.Additions.ShowDialogBox("Check Mate - " + Mojo.Controller.appInfo.version, "Check Mate app for webOS. Copyright 2022, Jon W. Distributed under an MIT License.<br>Source code available at: https://github.com/codepoet80/webos-checkmate");
                break;
            case 'do-sweep':
                this.confirmSweep();
                break;
            case 'do-new':
                appModel.LastTaskSelected = { guid: "new" };
                this.showEditDialog();
                break;
            case 'do-refresh':
                this.fetchTasks();
                break;
        }
    }
}

MainAssistant.prototype.handleListReorder = function(event) {
    var thisTaskList = this.controller.getWidgetSetup("taskList");

    var items = thisTaskList.model.items;
    var newPos = 1;
    for (var i = items.length - 1; i >= 0; i--) {
        newPos++;
    }

    items.move(event.fromIndex, event.toIndex);

    newPos = 1;
    for (var i = items.length - 1; i >= 0; i--) {
        items[i].sortPosition = newPos;
        newPos++;
    }
    //Update Server
    serviceModel.UpdateTask(appModel.AppSettingsCurrent["ChessMove"], appModel.AppSettingsCurrent["Grandmaster"], thisTaskList.model.items, this.handleServerResponse.bind(this));
}

MainAssistant.prototype.handleListDelete = function(event) {
    Mojo.Log.info("Item deleted: " + event.item.guid);
    this.playSound("delete");
    event.item.sortPosition = -1;
    serviceModel.UpdateTask(appModel.AppSettingsCurrent["ChessMove"], appModel.AppSettingsCurrent["Grandmaster"], event.item, this.handleServerResponse.bind(this));
}

MainAssistant.prototype.handleListClick = function(event) {

    Mojo.Log.info("Item tapped with element class " + event.originalEvent.target.className + ": " + event.item.videoName + ", id: " + event.item.youtubeId + ", selected state: " + event.item.selectedState);

    if (event.originalEvent.target.className.indexOf("checkmark") != -1) { //handle checkmark tap
        this.handlePopupChoose(event.item, "do-complete");
    } else { //provide a menu for tap on anything else
        appModel.LastTaskSelected = event.item;
        if (event.item.guid != "new") {
            var posTarget = "divCheck" + event.item.guid;

            var itemsToShow = [
                { label: 'Edit', command: 'do-edit' }
            ]
            var currNote = appModel.LastTaskSelected.notes;
            if (currNote && currNote != "") {
                itemsToShow.push({ label: 'Show Note', command: 'do-notes' });
                itemsToShow.push({ label: 'Copy Note', command: 'do-copynotes' })
            }
            var completeLabel = "Uncomplete";
            if (!event.item.completed)
                completeLabel = "Complete";
            itemsToShow.push({ label: completeLabel, command: 'do-complete' });

            this.controller.popupSubmenu({
                onChoose: this.handlePopupChoose.bind(this, event.item),
                placeNear: document.getElementById(posTarget),
                items: itemsToShow
            });

            return true;
        }
        return false;
    }
}

MainAssistant.prototype.handleListAdd = function(event) {
    //TODO: Verify this works
    appModel.LastTaskSelected = { guid: "new" };
    this.showEditDialog();
}

MainAssistant.prototype.handlePopupChoose = function(task, command) {
    Mojo.Log.info("Perform: ", command, " on ", task.guid);
    switch (command) {
        case "do-complete":
            var thisTaskList = this.controller.getWidgetSetup("taskList");
            if (task.completed) {
                this.playSound("flick");
                task.completed = false;
            } else {
                task.completed = true;
                if (!this.checkForGameOver()) {
                    this.playSound("completed");
                }
            }
            this.controller.modelChanged(thisTaskList.model);
            serviceModel.UpdateTask(appModel.AppSettingsCurrent["ChessMove"], appModel.AppSettingsCurrent["Grandmaster"], task, this.handleServerResponse.bind(this));
            break;
        case "do-notes":
            var noteToShow = appModel.LastTaskSelected.notes;
            if (!noteToShow || noteToShow == "")
                noteToShow = "<i>No notes for this task</i>";
            noteToShow = noteToShow.replace(/(?:\r\n|\r|\n)/g, '<br>');
            Mojo.Additions.ShowDialogBox("Task Notes", noteToShow);
            break;
        case "do-copynotes":
            var noteToCopy = appModel.LastTaskSelected.notes;
            if (!noteToCopy || noteToCopy == "")
                Mojo.Controller.getAppController().showBanner("No note to copy!", { source: 'notification' });
            noteToCopy = noteToCopy.replace(/(?:\r\n|\r|\n)/g, '<br>');
            var stageController = Mojo.Controller.getAppController().getActiveStageController();
            stageController.setClipboard(noteToCopy);
            Mojo.Controller.getAppController().showBanner("Note copied", { source: 'notification' });
            break;
        case "do-edit":
            this.showEditDialog(task.guid);
            break;
    }
}

/* Get Task Stuff */
MainAssistant.prototype.fetchTasks = function() {

    serviceModel.GetTasks(appModel.AppSettingsCurrent["ChessMove"], appModel.AppSettingsCurrent["Grandmaster"], this.handleServerResponse.bind(this));
}

MainAssistant.prototype.updateTaskListWidget = function(notation, results) {

    Mojo.Log.info("Displaying notation: " + notation);
    $("spnNotation").innerHTML = notation;

    var thisTaskList = this.controller.getWidgetSetup("taskList");
    thisTaskList.model.items = []; //remove the previous list
    for (var i = 0; i < results.length; i++) {
        thisTaskList.model.items.push(results[i]);
    }

    Mojo.Log.info("Updating task list widget with " + results.length + " results!");
    $("showTaskList").style.display = "block";
    this.controller.modelChanged(thisTaskList.model);
}

/* Edit Task Dialog Stuff */
MainAssistant.prototype.showEditDialog = function(taskId) {
    this.DoingEdit = true;
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        this.controller.showDialog({
            template: 'edittask/edittask-scene',
            preventCancel: true,
            assistant: new EditTaskAssistant(this, function(val) {
                    Mojo.Log.info("got value from edit task dialog: " + JSON.stringify(val));
                    this.DoingEdit = false;
                    this.handleEditDialogDone(val);
                }.bind(this)) //since this will be a dialog, not a scene, it must be defined in sources.json without a 'scenes' member
        });
    }
}

MainAssistant.prototype.handleEditDialogDone = function(task) {
    if (task) {
        var thisTaskList = this.controller.getWidgetSetup("taskList");
        if (task.guid == "new") {
            Mojo.Log.info("Updating tasks after successful creation of new task!");
            thisTaskList.model.items.unshift(task);
            this.controller.getSceneScroller().mojo.revealTop(true);
        } else {
            Mojo.Log.info("Updating tasks after successful edit!");
        }
        this.controller.modelChanged(thisTaskList.model);
        this.fetchTasks();
    } else {
        //User hit cancel
    }
}

/* Cleanup Stuff */
MainAssistant.prototype.confirmSweep = function() {
    this.controller.showAlertDialog({
        onChoose: function(value) {
            if (value) {
                Mojo.Log.info("Cleaning up completed tasks!");
                this.playSound("trash");
                serviceModel.CleanupTasks(appModel.AppSettingsCurrent["ChessMove"], appModel.AppSettingsCurrent["Grandmaster"], this.handleServerResponse.bind(this));
            } else
                Mojo.Log.info("Cancelled cleaning up completed tasks!");
        },
        title: "Clean Up",
        message: "This will delete all completed tasks. Do you want to proceed?",
        choices: [
            { label: 'Yes', value: true, type: 'negative' },
            { label: 'No', value: false, type: 'neutral' },
        ]
    });
}

/* Server Response Handler */

MainAssistant.prototype.handleServerResponse = function(response) {
    Mojo.Log.info("ready to process task list: " + response);
    if (response != null && response != "") {
        var responseObj = JSON.parse(response);
        if (responseObj.status == "error") {
            Mojo.Log.error("Error message from server while loading tasks: " + responseObj.msg);
            Mojo.Controller.errorDialog("The server responded to the task list request with: " + responseObj.msg.replace("ERROR: ", ""));
        } else {
            if (responseObj.tasks) {
                //If we got a good looking response update the UI
                this.updateTaskListWidget(responseObj.notation, responseObj.tasks);
            } else {
                Mojo.Log.warn("Task list was empty. Either there was no matching result, or there were server or connectivity problems.");
                Mojo.Additions.ShowDialogBox("No tasks", "The server did not report any matches for the specified task list.");
            }
        }
    } else {
        Mojo.Log.error("No usable response from server while loading tasks: " + response);
        Mojo.Controller.errorDialog("The server did not answer with a usable response to the task list request. Check network connectivity and/or self-host settings.");
        //Mojo.Additions.ShowDialogBox("Server Error", "The server did not answer with a usable response to the task list request. Check network connectivity and/or self-host settings.");
    }
}

/* Login Stuff */
MainAssistant.prototype.showWelcomePrompt = function() {
    this.controller.showAlertDialog({
        onChoose: function(value) {
            if (value == "login") {
                this.showLogin();
            } else if (value == "new") {
                Mojo.Log.info("new selected!");
                var stageController = Mojo.Controller.stageController;
                stageController.swapScene({ transition: Mojo.Transition.crossFade, name: "newuser" });
            }
        },
        title: "Welcome to Check Mate!",
        message: "Your To Do list anywhere! This client app can be used with a web service and web app that lets you manage your to do list from webOS or from virtually any web browser -- from 1997 to 2021. Do you want to Log In to an existing list, or create a new one?",
        choices: [
            { label: 'Log In', value: "login", type: 'affirmative' },
            { label: 'Create New', value: "new", type: 'neutral' },
        ]
    });
}

MainAssistant.prototype.doLogInOut = function() {
    if (appModel.AppSettingsCurrent["ChessMove"] == "" && appModel.AppSettingsCurrent["Grandmaster"] == "") {
        this.showWelcomePrompt();
    } else {
        //Remove existing tasks
        var thisWidgetSetup = this.controller.getWidgetSetup("taskList");
        thisWidgetSetup.model.items = [];
        $("showTaskList").style.display = "none";
        this.controller.modelChanged(thisWidgetSetup.model);
        this.controller.getSceneScroller().mojo.revealTop(true);
        //Clear credentials
        appModel.AppSettingsCurrent["ChessMove"] = "";
        appModel.AppSettingsCurrent["Grandmaster"] = "";
        appModel.SaveSettings();
        //Update menu label
        this.appMenuModel.items[2].label = "Log In";
        this.controller.modelChanged(this.appMenuModel);
        //Hide Command Menu
        var thisWidgetModel = this.controller.getWidgetSetup(Mojo.Menu.commandMenu).model;
        thisWidgetModel.visible = false;
        this.controller.modelChanged(thisWidgetModel);
        //Prompt User
        this.showWelcomePrompt();
    }
}

MainAssistant.prototype.showLogin = function() {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        this.controller.showDialog({
            template: 'login/login-scene',
            assistant: new LoginAssistant(this, function(val) {
                    Mojo.Log.info("got value from login dialog: " + val);
                    this.handleLoginDialogDone(val);
                }.bind(this)) //since this will be a dialog, not a scene, it must be defined in sources.json without a 'scenes' member
        });
    }
}

MainAssistant.prototype.handleLoginDialogDone = function(val) {
    if (val) {
        Mojo.Log.info("Loading tasks after successful login!");
        //Update menu label
        this.appMenuModel.items[2].label = "Log Out";
        this.controller.modelChanged(this.appMenuModel);
        //Show command menu
        var thisWidgetModel = this.controller.getWidgetSetup(Mojo.Menu.commandMenu).model;
        thisWidgetModel.visible = true;
        this.controller.modelChanged(thisWidgetModel);
        //Get new task list
        this.fetchTasks();
    } else {
        //multiple reasons we could have got a false
    }
}

/* End of Life Stuff */

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    clearInterval(this.refreshInt);
    Mojo.Event.stopListening(this.controller.get("taskList"), Mojo.Event.listReorder, this.handleListReorder);
    Mojo.Event.stopListening(this.controller.get("taskList"), Mojo.Event.listDelete, this.handleListDelete);
    Mojo.Event.stopListening(this.controller.get("taskList"), Mojo.Event.listTap, this.handleListClick);
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};

/* Helper Functions */
Array.prototype.move = function(from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
};

MainAssistant.prototype.checkForGameOver = function() {
    var thisTaskList = this.controller.getWidgetSetup("taskList");
    var gameOver = true;
    for (var i = 0; i < thisTaskList.model.items.length; i++) {
        if (!thisTaskList.model.items[i].completed) {
            gameOver = false;
            break;
        }
    }
    if (gameOver) {
        this.playSound("checkmate");
        Mojo.Additions.ShowDialogBox("Check Mate!", "<table width='100%'><tr><td align='center'><img src='images/checkmate.png' align='center'><br><b>Congrats!</b> You cleared the board!</td></tr></table>");
    }
    return gameOver;
}

MainAssistant.prototype.playSound = function(soundToPlay) {
    if (appModel.AppSettingsCurrent["SoundTheme"] > 0) {
        soundToPlay = "sounds/" + soundToPlay + appModel.AppSettingsCurrent["SoundTheme"] + ".mp3";
        Mojo.Log.info("Trying to play sound: " + soundToPlay);
        Mojo.Controller.getAppController().playSoundNotification("media", soundToPlay, 1200);
    }
}