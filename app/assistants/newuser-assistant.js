function NewuserAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

NewuserAssistant.prototype.setup = function() {
    /* setup widgets here */
    this.controller.setupWidget("scrollTnC",
        this.attributes = {
            mode: 'vertical'
        },
        this.model = {}
    );

    //Agree Button
    this.controller.setupWidget("btnAgree", { type: Mojo.Widget.defaultButton }, { label: "Agree", buttonClass: "affirmative", disabled: true });
    //Cancel Button
    this.controller.setupWidget("btnCancel", { type: Mojo.Widget.defaultButton }, { label: "Cancel", buttonClass: "negative", disabled: false });
    //OK Button
    this.controller.setupWidget("btnOK", { type: Mojo.Widget.defaultButton }, { label: "Login", buttonClass: "neutral", disabled: false });

    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {};
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
};

NewuserAssistant.prototype.activate = function(event) {
    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("btnAgree"), Mojo.Event.tap, this.agreeClick.bind(this));
    Mojo.Event.listen(this.controller.get("btnCancel"), Mojo.Event.tap, this.cancelClick.bind(this));
    Mojo.Event.listen(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));

    //Get terms and conditions from service and put into UI
    serviceModel.GetTnC(function(response) {
        $("divTnC").innerHTML = response;
        Mojo.Additions.DisableWidget("btnAgree", false);
    }.bind(this));
};

NewuserAssistant.prototype.agreeClick = function(event) {

    Mojo.Additions.DisableWidget("btnAgree", true);
    $("divCredentials").style.display = "block";
    $("btnOK").style.display = "block";
    $("btnCancel").style.display = "none";
    //Get new credentials from service and put into UI
    serviceModel.GetNewCredentials(function(response) {
        Mojo.Log.info(response);
        if (response && response.indexOf("error") == -1) {
            var responseObj = JSON.parse(response);
            if (responseObj.move && responseObj.grandmaster) {
                $("divChessMove").innerHTML = responseObj.move;
                appModel.AppSettingsCurrent["ChessMove"] = responseObj.move;
                $("divGrandmaster").innerHTML = responseObj.grandmaster;
                appModel.AppSettingsCurrent["Grandmaster"] = responseObj.grandmaster;
            } else {
                Mojo.Additions.ShowDialogBox("Service Error", "Could not retreive valid credentials from service.");
            }
        } else {
            Mojo.Additions.ShowDialogBox("Service Error", "Did not receive credentials from service.");
        }
        this.controller.getSceneScroller().mojo.revealElement(document.getElementById("divCredentials"));
    }.bind(this));
}

NewuserAssistant.prototype.okClick = function(event) {
    appModel.SaveSettings();
    var stageController = Mojo.Controller.stageController;
    stageController.swapScene({ transition: Mojo.Transition.zoomFade, name: "main" });
}

NewuserAssistant.prototype.cancelClick = function(event) {
    var stageController = Mojo.Controller.stageController;
    stageController.swapScene({ transition: Mojo.Transition.zoomFade, name: "main" });
}

NewuserAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    Mojo.Event.stopListening(this.controller.get("btnAgree"), Mojo.Event.tap, this.agreeClick);
    Mojo.Event.stopListening(this.controller.get("btnCancel"), Mojo.Event.tap, this.cancelClick);
    Mojo.Event.stopListening(this.controller.get("btnOK"), Mojo.Event.tap, this.cancelClick);
};

NewuserAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};