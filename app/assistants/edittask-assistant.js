function EditTaskAssistant(sceneAssistant, doneCallBack) {
    this.doneCallBack = doneCallBack;
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
    Mojo.Log.info("new EditTask assistant exists");
    this.sceneAssistant = sceneAssistant; //dialog's do not have their own controller, so need access to the launching scene's controller
}

EditTaskAssistant.prototype.setup = function(widget) {
    /* this function is for setup tasks that have to happen when the scene is first created */
    this.widget = widget;
    Mojo.Log.info("EditTask assistant setup");
    Mojo.Log.info("Current Move is: " + appModel.AppSettingsCurrent["ChessMove"]);

    /* setup widgets here */
    this.sceneAssistant.controller.setupWidget("txtTaskTitle",
        this.attributes = {
            textFieldName: "TaskTitle",
            hintText: "Task Title",
            property: 'value',
            multi: false,
            changeOnKeyPress: true,
            textReplacement: false,
            requiresEnterKey: false,
            focus: false
        },
        this.model = {
            value: appModel.LastTaskSelected.title,
            disabled: false
        }
    );
    this.sceneAssistant.controller.setupWidget("txtTaskNotes",
        this.attributes = {
            textFieldName: "TaskNotes",
            hintText: "Notes",
            property: 'value',
            multi: false,
            changeOnKeyPress: true,
            textReplacement: false,
            requiresEnterKey: false,
            focus: false
        },
        this.model = {
            value: appModel.LastTaskSelected.notes,
            disabled: false
        }
    );
    this.sceneAssistant.controller.setupWidget("linkSpinner",
        this.attributes = {
            spinnerSize: "small"
        },
        this.model = {
            spinning: true
        }
    );
    this.sceneAssistant.controller.setupWidget("goButton", { type: Mojo.Widget.activityButton }, { label: "OK", disabled: false });
    this.sceneAssistant.controller.setupWidget("cancelButton", { type: Mojo.Widget.button }, { label: "Cancel", disabled: false });

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.sceneAssistant.controller.get("txtTaskTitle"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("txtTaskNotes"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("goButton"), Mojo.Event.tap, this.handleGoPress.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

EditTaskAssistant.prototype.activate = function(event) {
    Mojo.Log.info("EditTask assistant activated for task: " + appModel.LastTaskSelected.guid);
    /* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */

};

this.taskTitle = "";
this.taskNotes = "";
EditTaskAssistant.prototype.handleValueChange = function(event) {
    Mojo.Log.info(event.srcElement.title + " now: " + event.value);
    switch (event.srcElement.title) {
        case "TaskTitle":
            this.taskTitle = event.value;
            break;
        case "TaskNotes":
            this.taskNotes = event.value
            break;
    }
}

EditTaskAssistant.prototype.handleCancelPress = function(event) {
    this.doneCallBack(false);
    this.widget.mojo.close();
}

EditTaskAssistant.prototype.handleGoPress = function(event) {

    //Update UI for this state
    //$("linkInformation").style.display = "none";
    //$("addressError").style.display = "none";
    //$("linkError").style.display = "none";

    this.tryUpdateTask(this.handleUpdateResponse.bind(this));
}

EditTaskAssistant.prototype.handleUpdateResponse = function(response) {
    /*Mojo.Log.info("login response was: " + response);
    try {
        var responseObj = JSON.parse(response);
    } catch (ex) {
        Mojo.Log.error("Could not parse login response!");
    }
    if (responseObj && responseObj.notation && responseObj.notation != "") {
        Mojo.Log.info("Login success!");
        appModel.AppSettingsCurrent["ChessMove"] = responseObj.notation;
        appModel.SaveSettings();
        //Dismiss this dialog
        this.doneCallBack(true);
        this.widget.mojo.close();
    } else {
        Mojo.Log.warn("Login failure!" + response);
    }
    */
    this.doneCallBack(true);
    this.widget.mojo.close();
}

EditTaskAssistant.prototype.tryUpdateTask = function(callback) {
    /* var thisTaskList = this.controller.getWidgetSetup("taskList");
     for (var i = 0; i < thisTaskList.model.items.length; i++) {
         if (thisTaskList.model.items[i].id == appModel.LastTaskSelected) {
             thisTaskList.model.items[i].title = this.taskTitle;
             thisTaskList.model.items[i].notes = this.taskNotes;
         }
     } */
    appModel.LastTaskSelected.title = this.taskTitle;
    appModel.LastTaskSelected.notes = this.taskNotes;
    this.doneCallBack(appModel.LastTaskSelected);
    this.widget.mojo.close();

    //serviceModel.UpdateTask(appModel.AppSettingsCurrent["ChessMove"], appModel.AppSettingsCurrent["Grandmaster"], this.currentTaskId, this.currentTasks[this.currentTaskId], callback);
}

EditTaskAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("EditTask assistant deactivated");
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("txtTaskTitle"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("txtTaskNotes"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("goButton"), Mojo.Event.tap, this.handleGoPress.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

EditTaskAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("EditTask assistant cleaned up");
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};