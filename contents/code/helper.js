"use strict";

function debugmsg(msg) {
    print(">>>>Debug: " + msg)
}

function error(msg) {
    print(">>>>Error: " + msg);
}

function warn(msg) {
    print(">>>Warning: " + msg)
}

function wrapRegShortcut(title, text, keySequence, callback) {
    if (!registerShortcut(title, text, keySequence, callback)) {
        error("Registering " + keySequence + " failed!");
    } else {
        debugmsg("Registering " + keySequence + " succeded");
    }
}