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
        this.model = {

        }
    );

    //Agree Button
    this.controller.setupWidget("btnAgree", { type: Mojo.Widget.defaultButton }, { label: "Agree", buttonClass: "affirmative", disabled: false });
    //Cancel Button
    this.controller.setupWidget("btnCancel", { type: Mojo.Widget.defaultButton }, { label: "Cancel", buttonClass: "negative", disabled: false });
    //OK Button
    this.controller.setupWidget("btnOK", { type: Mojo.Widget.defaultButton }, { label: "Done", buttonClass: "neutral", disabled: false });

    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {};
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("btnAgree"), Mojo.Event.tap, this.agreeClick.bind(this));
    Mojo.Event.listen(this.controller.get("btnCancel"), Mojo.Event.tap, this.cancelClick.bind(this));
    Mojo.Event.listen(this.controller.get("btnOK"), Mojo.Event.tap, this.cancelClick.bind(this));
};

NewuserAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */

    serviceModel.GetTnC(function(response) {
        $("divTnC").innerHTML = response;
    });
};

NewuserAssistant.prototype.agreeClick = function(event) {

    Mojo.Additions.DisableWidget("btnAgree", true);
    $("divCredentials").style.display = "block";
    $("btnOK").style.display = "block";
    $("btnCancel").style.display = "none";
    //TODO: get new credentials from service
    $("divChessMove").innerHTML = "New Chess Move";
    $("divGrandmaster").innerHTML = "New Grandmaster";
}

NewuserAssistant.prototype.cancelClick = function(event) {
    var stageController = Mojo.Controller.stageController;
    stageController.swapScene({ transition: Mojo.Transition.zoomFade, name: "main" });
}

NewuserAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    Mojo.Event.stopListening(this.controller.get("btnAgree"), Mojo.Event.tap, this.agreeClick);
    Mojo.Event.stopListening(this.controller.get("btnCanel"), Mojo.Event.tap, this.cancelClick);

};

NewuserAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};