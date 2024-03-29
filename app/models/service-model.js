/*
Check Mate Service Model - Mojo
 Version 1.0
 Created: 2021
 Author: Jon W
 License: MIT
 Description: A model to interact with Check Mate web service within a Mojo app.
*/

var ServiceModel = function() {
    this.urlBase = "http://checkmate.wosa.link";
};

//Properties
ServiceModel.prototype.UseCustomEndpoint = false;
ServiceModel.prototype.CustomEndpointURL = "";

ServiceModel.prototype.buildURL = function(actionType) {
    var urlBase = this.urlBase;
    if (this.UseCustomEndpoint == true && this.CustomEndpointURL != "") {
        urlBase = this.CustomEndpointURL;
    }
    //Make sure we don't end up with double slashes in the built URL if there's a custom endpoint
    var urlTest = urlBase.split("://");
    if (urlTest[urlTest.length - 1].indexOf("/") != -1) {
        urlBase = urlBase.substring(0, urlBase.length - 1);
    }
    var path = urlBase + "/" + actionType + ".php";
    return path;
}

//HTTP request to get Terms and Conditions
ServiceModel.prototype.GetTnC = function(callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var theQuery = this.buildURL("tandc");
    theQuery = theQuery.replace(".php", ".html");
    Mojo.Log.info("Getting Terms and Conditions with query: " + theQuery);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", theQuery);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

//HTTP request to get Terms and Conditions
ServiceModel.prototype.GetNewCredentials = function(callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var theQuery = this.buildURL("new-user");
    Mojo.Log.info("Getting new user credentials with query: " + theQuery);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", theQuery);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

//HTTP request to get tasks
ServiceModel.prototype.GetTasks = function(notation, grandmaster, callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var theQuery = this.buildURL("read-notation") + "?move=" + notation;
    Mojo.Log.info("Getting task list with query: " + theQuery);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", theQuery);
    xmlhttp.setRequestHeader("grandmaster", grandmaster);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

//HTTP request to update tasks
ServiceModel.prototype.UpdateTask = function(notation, grandmaster, taskData, callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var theQuery = this.buildURL("update-notation") + "?move=" + notation;
    Mojo.Log.info("Update task list at URL: " + theQuery + " with data: " + JSON.stringify(taskData));

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", theQuery);
    xmlhttp.setRequestHeader("grandmaster", grandmaster);
    xmlhttp.send(JSON.stringify(taskData));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            Mojo.Log.info("Got Update response from service: " + xmlhttp.responseText);
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

//HTTP request to cleanup completed tasks
ServiceModel.prototype.CleanupTasks = function(notation, grandmaster, callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var theQuery = this.buildURL("cleanup-notation") + "?move=" + notation;
    Mojo.Log.info("Cleaning up tasks with query: " + theQuery);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", theQuery);
    xmlhttp.setRequestHeader("grandmaster", grandmaster);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

ServiceModel.prototype.base64UrlEncode = function(url) {
    // First of all you should encode to Base64 string
    url = btoa(url);
    // Convert Base64 to Base64URL by replacing “+” with “-” and “/” with “_”
    url = url.replace(/\+/g, '-');
    url = url.replace(/\//g, "_");
    return url;
}