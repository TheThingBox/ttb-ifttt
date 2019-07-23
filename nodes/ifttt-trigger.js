module.exports = function(RED) {
    "use strict";
    var http = require('follow-redirects').http;
    var https = require('follow-redirects').https;
    var urllib = require("url");
    var mustache = require("mustache");
    var querystring = require("querystring");

    function IFTTTTrigger(n) {
        RED.nodes.createNode(this,n);

        this.on("input",function(msg) {
            this.secretkey = msg.secretkey || n.secretkey;
            this.event = msg.event || n.event;
            this.val1 = msg.value1 || msg.payload || n.val1;
            this.val2 = msg.value2 || n.val2;
            this.val3 = msg.value3 || n.val3;

            var delimiter = '?'
            this.url = `https://maker.ifttt.com/trigger/${this.event}/with/key/${this.secretkey}`;
            
            if (this.val1 != "") {
                this.url = `${this.url}${delimiter}value1=${this.val1}`;
                delimiter = '&'
            }
            
            if (this.val2 != "") {
                this.url = `${this.url}${delimiter}value2=${this.val2}`;
                delimiter = '&'
            }
            
            if (this.val3 != "") {
                this.url = `${this.url}${delimiter}value3=${this.val3}`;
            }

            var nodeUrl = this.url;
            var isTemplatedUrl = (nodeUrl||"").indexOf("{{") != -1;
            var nodeMethod = n.method || "GET";
            this.ret = n.ret || "txt";
            var node = this;

            var prox, noprox;
            if (process.env.http_proxy != null) { prox = process.env.http_proxy; }
            if (process.env.HTTP_PROXY != null) { prox = process.env.HTTP_PROXY; }
            if (process.env.no_proxy != null) { noprox = process.env.no_proxy.split(","); }
            if (process.env.NO_PROXY != null) { noprox = process.env.NO_PROXY.split(","); }

            var preRequestTimestamp = process.hrtime();
            node.status({fill:"blue",shape:"dot",text:"requesting"});
            var url = nodeUrl || msg.url;
            if (msg.url && nodeUrl && (nodeUrl !== msg.url)) {  // revert change below when warning is finally removed
                node.warn("Warning: msg properties can no longer override set node properties. See bit.ly/nr-override-msg-props");
            }
            if (isTemplatedUrl) {
                url = mustache.render(nodeUrl, msg);
            }
            if (!url) {
                node.error("No url specified",msg);
                return;
            }
            // url must start http:// or https:// so assume http:// if not set
            if (!((url.indexOf("http://") === 0) || (url.indexOf("https://") === 0))) {
                url = "http://"+url;
            }

            var method = nodeMethod.toUpperCase() || "GET";
            if (msg.method && n.method && (n.method !== "use")) {     // warn if override option not set
                node.warn("Warning: msg properties can no longer override fixed node properties. Use explicit override option. See bit.ly/nr-override-msg-props");
            }
            if (msg.method && n.method && (n.method === "use")) {
                method = msg.method.toUpperCase();          // use the msg parameter
            }
            var opts = urllib.parse(url);
            opts.method = method;
            opts.headers = {};
            if (msg.headers) {
                for (var v in msg.headers) {
                    if (msg.headers.hasOwnProperty(v)) {
                        var name = v.toLowerCase();
                        if (name !== "content-type" && name !== "content-length") {
                            name = v;
                        }
                        opts.headers[name] = msg.headers[v];
                    }
                }
            }

            var payload = null;

            if (msg.payload && (method == "POST" || method == "PUT" || method == "PATCH" ) ) {
                if (typeof msg.payload === "string" || Buffer.isBuffer(msg.payload)) {
                    payload = msg.payload;
                } else if (typeof msg.payload == "number") {
                    payload = msg.payload+"";
                } else {
                    if (opts.headers['content-type'] == 'application/x-www-form-urlencoded') {
                        payload = querystring.stringify(msg.payload);
                    } else {
                        payload = JSON.stringify(msg.payload);
                        if (opts.headers['content-type'] == null) {
                            opts.headers['content-type'] = "application/json";
                        }
                    }
                }
                if (opts.headers['content-length'] == null) {
                    if (Buffer.isBuffer(payload)) {
                        opts.headers['content-length'] = payload.length;
                    } else {
                        opts.headers['content-length'] = Buffer.byteLength(payload);
                    }
                }
            }
            var urltotest = url;
            var noproxy;
            if (noprox) {
                for (var i in noprox) {
                    if (url.indexOf(noprox[i]) !== -1) { noproxy=true; }
                }
            }
            if (prox && !noproxy) {
                var match = prox.match(/^(http:\/\/)?(.+)?:([0-9]+)?/i);
                if (match) {
                    opts.headers['Host'] = opts.host;
                    var heads = opts.headers;
                    var path = opts.pathname = opts.href;
                    opts = urllib.parse(prox);
                    opts.path = opts.pathname = path;
                    opts.headers = heads;
                    urltotest = match[0];
                }
                else { node.warn("Bad proxy url: "+process.env.http_proxy); }
            }
            var req = ((/^https/.test(urltotest))?https:http).request(opts,function(res) {
                (node.ret === "bin") ? res.setEncoding('binary') : res.setEncoding('utf8');
                msg.statusCode = res.statusCode;
                msg.headers = res.headers;
                msg.payload = "";
                res.on('data',function(chunk) {
                    msg.payload += chunk;
                });
                res.on('end',function() {
                    if (node.metric()) {
                        // Calculate request time
                        var diff = process.hrtime(preRequestTimestamp);
                        var ms = diff[0] * 1e3 + diff[1] * 1e-6;
                        var metricRequestDurationMillis = ms.toFixed(3);
                        node.metric("duration.millis", msg, metricRequestDurationMillis);
                        if (res.client && res.client.bytesRead) {
                            node.metric("size.bytes", msg, res.client.bytesRead);
                        }
                    }
                    if (node.ret === "bin") {
                        msg.payload = new Buffer(msg.payload,"binary");
                    }
                    else if (node.ret === "obj") {
                        try { msg.payload = JSON.parse(msg.payload); }
                        catch(e) { node.warn("JSON parse error"); }
                    }
                    node.send(msg);
                    node.status({});
                });
            });
            req.on('error',function(err) {
                msg.payload = err.toString() + " : " + url;
                msg.statusCode = err.code;
                node.send(msg);
                node.status({fill:"red",shape:"ring",text:err.code});
            });
            if (payload) {
                req.write(payload);
            }
            req.end();
        });
    }
    RED.nodes.registerType("ifttt trigger", IFTTTTrigger);
}
