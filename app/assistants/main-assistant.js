/*
    Check Mate to do list app for webOS.
    This app depends a Check Mate service, which is by webOS Archive at no cost for what remains of the webOS mobile community.
*/

function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

MainAssistant.prototype.setup = function() {

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
        reorderable: true
    };
    this.controller.setupWidget("taskList", this.template, this.taskInfoModel);
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            Mojo.Menu.editItem,
            { label: "Preferences", command: 'do-Preferences' },
            { label: "About", command: 'do-myAbout' },
            { label: "Log In", command: 'do-LogInOut' },
        ]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
    //Command Buttons
    this.cmdMenuAttributes = {
            spacerHeight: 0,
            menuClass: 'no-fade'
        },
        this.cmdMenuModel = {
            visible: true,
            items: [{
                    items: [
                        { label: 'Sweep', iconPath: 'sweep.png', command: 'do-sweep' }
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
    Mojo.Event.listen(this.controller.get("taskList"), Mojo.Event.listTap, this.handleListClick.bind(this));

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
    var loggedInLable = "Log In";
    if (appModel.AppSettingsCurrent["ChessMove"] != "" && appModel.AppSettingsCurrent["Grandmaster"] != "")
        loggedInLable = "Log Out";
    this.appMenuModel.items[3].label = loggedInLable;
    this.controller.modelChanged(this.appMenuModel);

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
        Mojo.Additions.ShowDialogBox("Welcome to Check Mate!", "Your To Do list anywhere! This client app can be used with a web service and web app that lets you manage your to do list from webOS or from virtually any web browser -- from 1997 to 2021. Start by using the menu to Log In.");
    } else {
        //handle launch with query
        if (appModel.LaunchQuery && appModel.LaunchQuery != "") {
            Mojo.Log.info("using launch query: " + appModel.LaunchQuery);
        } else {
            if (appModel.AppSettingsCurrent["ChessMove"] != "" && appModel.AppSettingsCurrent["Grandmaster"] != "") {
                Mojo.Log.info("About to fetch tasks...");
                this.fetchTasks();
            } else {
                this.showLogin();
            }

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
                Mojo.Additions.ShowDialogBox("Check Mate - " + Mojo.Controller.appInfo.version, "Check Mate app for webOS. Copyright 2021, Jon Wise. Distributed under an MIT License.<br>Source code available at: https://github.com/codepoet80/webos-checkmate");
                break;
            case 'do-sweep':
                Mojo.Additions.ShowDialogBox("Sweep", "Do you want to purge all completed tasks?");
                break;
            case 'do-new':
                appModel.LastTaskSelected = { id: "new" };
                this.showEditDialog();
                break;
        }
    }
}

MainAssistant.prototype.handleClick = function(event) {
    //this.disableUI();
}

MainAssistant.prototype.handleListReorder = function(event) {
    Mojo.Log.info("Item drag end");
    this.allowPopup = true;
}

MainAssistant.prototype.handleListClick = function(event) {
    Mojo.Log.info("Item tapped: " + event.item.guid);
    appModel.LastTaskSelected = event.item;

    //Pop up Menu
    var posTarget = "divCheck" + event.item.guid;
    var completeLabel = "Uncomplete";
    if (!event.item.completed)
        completeLabel = "Complete";
    this.controller.popupSubmenu({
        onChoose: this.handlePopupChoose.bind(this, event.item),
        placeNear: document.getElementById(posTarget),
        items: [
            { label: completeLabel, command: 'do-complete' },
            { label: 'Edit', command: 'do-edit' },
        ]
    });
    return true;
}

MainAssistant.prototype.handlePopupChoose = function(task, command) {
    Mojo.Log.info("Perform: ", command, " on ", task.guid);

    switch (command) {
        case "do-complete":
            var thisTaskList = this.controller.getWidgetSetup("taskList");
            if (task.completed)
                task.completed = false;
            else
                task.completed = true;
            this.controller.modelChanged(thisTaskList.model);
            break;
        case "do-edit":
            this.showEditDialog(task.guid);
            break;
    }
}

/* Get Task Stuff */
MainAssistant.prototype.fetchTasks = function() {

    serviceModel.GetTasks(appModel.AppSettingsCurrent["ChessMove"], appModel.AppSettingsCurrent["Grandmaster"], function(response) {
        Mojo.Log.info("ready to process task list: " + response);
        if (response != null && response != "") {
            var responseObj = JSON.parse(response);
            if (responseObj.status == "error") {
                Mojo.Log.error("Error message from server while loading tasks: " + responseObj.msg);
                Mojo.Additions.ShowDialogBox("Server Error", "The server responded to the task list request with: " + responseObj.msg.replace("ERROR: ", ""));
            } else {
                if (responseObj.tasks) {
                    //If we got a good looking response, remember it, and update the UI
                    //appModel.LastSearchResult = responseObj.tasks;
                    this.updateTaskList(responseObj.notation, responseObj.tasks);
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

        this.enableUI();
    }.bind(this));
}

MainAssistant.prototype.updateTaskList = function(notation, results) {

    Mojo.Log.info("Displaying notation: " + notation);

    var thisTaskList = this.controller.getWidgetSetup("taskList");
    thisTaskList.model.items = []; //remove the previous list
    for (var i = 0; i < results.length; i++) {

        /* var newItem = {
             id: results[i].guid,
             title: results[i].title,
             notes: results[i].notes,
             completed: results[i].completed,
             data: results[i]
         }; */

        thisTaskList.model.items.push(results[i]);
    }

    Mojo.Log.info("Updating task list widget with " + results.length + " results!");
    $("showTaskList").style.display = "block";
    this.controller.modelChanged(thisTaskList.model);
}

MainAssistant.prototype.disableUI = function(statusValue) {
    //start spinner
    if (!this.spinnerModel.spinning) {
        this.spinnerModel.spinning = true;
        this.controller.modelChanged(this.spinnerModel);
    }

    if (statusValue && statusValue != "") {
        $("divWorkingStatus").style.display = "block";
        $("divStatusValue").innerHTML = statusValue;
    } else {
        $("divWorkingStatus").style.display = "none";
    }

    //disable submit button
    if (!this.submitBtnModel.disabled) {
        this.submitBtnModel.disabled = true;
        this.controller.modelChanged(this.submitBtnModel);
    }
}

MainAssistant.prototype.enableUI = function() {
    //stop spinner
    this.spinnerModel.spinning = false;
    this.controller.modelChanged(this.spinnerModel);

    //hide status
    $("divWorkingStatus").style.display = "none";
    $("divStatusValue").innerHTML = "";

    //enable submit button
    //this.submitBtnModel.disabled = false;
    //this.controller.modelChanged(this.submitBtnModel);
}

/* Edit Task Dialog Stuff */
MainAssistant.prototype.showEditDialog = function(taskId) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        this.controller.showDialog({
            template: 'edittask/edittask-scene',
            assistant: new EditTaskAssistant(this, function(val) {
                    Mojo.Log.error("got value from edit task dialog: " + JSON.stringify(val));
                    this.handleEditDialogDone(val);
                }.bind(this)) //since this will be a dialog, not a scene, it must be defined in sources.json without a 'scenes' member
        });
    }
}

MainAssistant.prototype.handleEditDialogDone = function(val) {
    if (val) {
        Mojo.Log.info("Updating tasks after successful edit!");
        var thisTaskList = this.controller.getWidgetSetup("taskList");
        this.controller.modelChanged(thisTaskList.model);
    } else {
        //User hit cancel
    }
}

/* Login Stuff */
MainAssistant.prototype.doLogInOut = function() {
    if (appModel.AppSettingsCurrent["ChessMove"] == "" && appModel.AppSettingsCurrent["Grandmaster"] == "") {
        this.showLogin();
    } else {
        //Remove existing tasks
        var thisWidgetSetup = this.controller.getWidgetSetup("taskList");
        thisWidgetSetup.model.items = [];
        $("showTaskList").style.display = "none";
        this.controller.modelChanged(thisWidgetSetup.model);
        //Clear credentials
        appModel.AppSettingsCurrent["ChessMove"] = "";
        appModel.AppSettingsCurrent["Grandmaster"] = "";
        appModel.SaveSettings();
        //Update menu label
        this.appMenuModel.items[3].label = "Log In";
        this.controller.modelChanged(this.appMenuModel);
        this.showLogin();
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
        this.appMenuModel.items[3].label = "Log Out";
        this.controller.modelChanged(this.appMenuModel);
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
    Mojo.Event.stopListening(this.controller.get("btnGet"), Mojo.Event.tap, this.handleClick);
    Mojo.Event.stopListening(this.controller.get("taskList"), Mojo.Event.listTap, this.handleListClick);
    // Non-Mojo widgets
    //$("imgSearchClear").removeEventListener("click", this.handleClearTap);
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};