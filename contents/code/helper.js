function debugmsg(msg) {
    print(">>>>" + msg + "<<<<")
}

function error(msg) {
    print(">>>>Error: " + msg + "<<<<");
}

function wrapRegShortcut(title, text, keySequence, callback) {
    if (!registerShortcut(title, text, keySequence, callback)) {
        error("Registering " + keySequence + " failed!");
    }
}