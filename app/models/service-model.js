/*
Check Mate Service Model - Mojo
 Version 1.0
 Created: 2021
 Author: Jonathan Wise
 License: MIT
 Description: A model to interact with Check Mate web service within a Mojo app.
*/

var ServiceModel = function() {
    this.urlBase = "http://checkmate.webosarchive.com";
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

//HTTP request to search podcasts
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

ServiceModel.prototype.base64UrlEncode = function(url) {
    // First of all you should encode to Base64 string
    url = btoa(url);
    // Convert Base64 to Base64URL by replacing “+” with “-” and “/” with “_”
    url = url.replace(/\+/g, '-');
    url = url.replace(/\//g, "_");
    return url;
}