
var fs = require("fs");

var target   = process.argv[2];
fs.readFile(target, (err, data) => {
    var abi = JSON.parse(data.toString()).abi;
    var events = [];
    var views = [];
    var wfuns = [];
    for (let item of abi) {
        if (item.type == "event") {
            events.push(item);
            continue
        }
        if (item.type == "function") {
            if (item.stateMutability == "view") {
                views.push(item)
                continue
            }
            
            wfuns.push(item)
            continue
        }
        console.log(item.type, item.stateMutability);
    }

    for (let item of events) {
        console.log(item.type, item.name)
    }
    for (let item of views) {
        console.log(item.type, item.stateMutability, item.name)
    }
    for (let item of wfuns) {
        console.log(item.type, item.stateMutability, item.name)
    }
});