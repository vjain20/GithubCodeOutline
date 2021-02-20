chrome.browserAction.onClicked.addListener(sendfunc);
function sendfunc(tab) {
    msg = {
        cmd: "execute"
    };
    chrome.tabs.sendMessage(tab.id, msg);
}
