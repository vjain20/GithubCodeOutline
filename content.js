const lockOpenImgUrl = chrome.extension.getURL("images/lock_open_blue_64px.png");
const lockClosedImgUrl = chrome.extension.getURL("images/lock_closed_blue_64px.png");
const keyImgUrl = chrome.extension.getURL("images/key_blue_64px.png");

const FN_INDICATOR = "fn";
const CLASS_INDICATOR = "C";
const INTERFACE_INDICATOR = "I";

const CLASS = "class";
const BLOB_ID = "blobid";
const DIV = "div";

const JAVA = "java";
const TYPESCRIPT = "typescript";
const JAVASCRIPT = "javascript";

chrome.runtime.onMessage.addListener(receivefunc);

function receivefunc(msg, sender, sendResponse) {
	console.log("Received message");
    if (msg.cmd === "execute") {
        let container = document.getElementById("code-outline-container");
        if (container) {
            container.remove();
        } else {
            main();
        }
    }
}

function clickHandler(event) {
    let target = event.target;
    let targetBlobId = target.getAttribute(BLOB_ID);
    let targetBlob = document.getElementById(targetBlobId);

    targetBlob.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "nearest"
    });
    targetBlob.classList.add("co-highlighted");
    targetBlob.addEventListener("webkitAnimationEnd", function () {
        targetBlob.classList.remove("co-highlighted");
    });
}

function createListItem(list, blobId, entity, returnType, access) {
    let item = document.createElement(DIV);
    item.setAttribute(BLOB_ID, blobId);
    item.setAttribute(CLASS, "outline-item");
    item.addEventListener("click", clickHandler);

    let img = document.createElement("img");
    img.setAttribute(BLOB_ID, blobId);

    if (access) {
        access = access.trim();

        if (access === "public") {
            img.src = lockOpenImgUrl;
        } else if (access === "protected") {
            img.src = keyImgUrl;
        } else if (access === "private") {
            img.src = lockClosedImgUrl;
        }

        item.appendChild(img);
    }

    let entitySpan = createElementFromHTML("<span>" + entity + "</span>");
    entitySpan.setAttribute(BLOB_ID, blobId);
    entitySpan.setAttribute(CLASS, "entity-name");
    item.appendChild(entitySpan);

    if (returnType) {
        let returnTypeSpan = createElementFromHTML("<span>" + returnType + "</span>");
        returnTypeSpan.setAttribute(BLOB_ID, blobId);
        returnTypeSpan.setAttribute(CLASS, "return-type");
        item.appendChild(returnTypeSpan);
    }

    list.appendChild(item);
    return item;
}

function addIndicator(item, text) {
    let indicator = document.createElement("span");
    indicator.innerText = text;
    indicator.setAttribute(CLASS, "co-indicator");
    if (text === "fn") {
        indicator.classList.add("co-indicator-fn");
    } else if (text === "C") {
        indicator.classList.add("co-indicator-C");
    } else if (text === "I") {
        indicator.classList.add("co-indicator-I");
    }

    indicator.setAttribute(BLOB_ID, item.getAttribute(BLOB_ID));
    item.insertBefore(indicator, item.firstChild);
}

function parseJavaScript(list, lineOfCode, blobId) {
    const functionRe1 = /^\s*function\s+([a-zA-Z_0-9]+)\s*\(/;
    const functionRe2 = /^\s*([a-zA-Z_0-9]+)\([a-zA-Z_0-9, ]*\)\s*\{/;
    const functionRe3 = /^\s*(?:var|let)?\s*([a-zA-Z_0-9]+)\s*\=\s*function/;
    const classRe = /^\s*class\s*([a-zA-Z_0-9]*)/;

    let functionName = null;
    let fnMatchResult = lineOfCode.match(functionRe1);

    if (!fnMatchResult) {
        fnMatchResult = lineOfCode.match(functionRe2);

        if (!fnMatchResult)
            fnMatchResult = lineOfCode.match(functionRe3);
    }

    if (fnMatchResult) {
        functionName = fnMatchResult[1];

        if (functionName) {
            //console.log('function name = ' + functionName);
            let listItem = createListItem(list, blobId, functionName);
            addIndicator(listItem, FN_INDICATOR);
        }
    } else {
        let classMatchResult = lineOfCode.match(classRe);

        if (classMatchResult) {
            //console.log("class name = " + classMatchResult[1]);
            let listItem = createListItem(list, blobId, classMatchResult[1]);
            addIndicator(listItem, CLASS_INDICATOR);
        }
    }
}

function parseTypeScript(list, lineOfCode, blobId) {
    const functionRe1 = /^\s*(public\s|private\s|protected\s)+(?:static\s)?([a-zA-Z_]*)\([a-zA-Z_,: ]*\)\s*\:?\s*([a-zA-Z_0-9<>]*)/;
    const functionRe2 = /^\s*([a-zA-Z_]+)\([a-zA-Z,\: ]*\)\:?\s*[a-zA-Z_0-9<>]*{/;
    const classRe = /^\s*(?:public\s|abstract\s)*class\s([a-zA-Z_]*)/;
    const interfaceRe = /^\s*(?:public\s)?interface\s([a-zA-Z_]*)/;
    const constructorRe = /^\s*constructor\s*\(/

        let fnMatchResult = lineOfCode.match(functionRe1);
    let functionName = null;
    let returnType = null;
    let access = null;

    if (fnMatchResult) {
        functionName = fnMatchResult[2];
        returnType = fnMatchResult[3];
        access = fnMatchResult[1];
    } else {
        fnMatchResult = lineOfCode.match(functionRe2);
        if (fnMatchResult) {
            functionName = fnMatchResult[1];
            returnType = fnMatchResult[2];
        } else {
            fnMatchResult = lineOfCode.match(constructorRe);
            if (fnMatchResult) {
                functionName = 'constructor';
                returnType = '';
            }
        }
    }

    if (!returnType || (returnType && returnType.trim().length === 0)) {
        returnType = 'void';
    }

    //console.log("functionName = %s, returnType = %s, access = %s", functionName, returnType, access);
    returnType = safeTags(returnType);

    if (fnMatchResult) {
        let fnListItem = createListItem(list, blobId, functionName, " : " + returnType, access);
        if (fnListItem) {
            addIndicator(fnListItem, FN_INDICATOR);
        }
    }

    let classMatchResult = lineOfCode.match(classRe);

    if (classMatchResult) {
        //console.log("class name = " + classMatchResult[1]);
        let listItem = createListItem(list, blobId, classMatchResult[1]);
        addIndicator(listItem, CLASS_INDICATOR);
    } else {
        let interfaceMatchResult = lineOfCode.match(interfaceRe);
        if (interfaceMatchResult) {
            //console.log("interface name = " + interfaceMatchResult[1]);
            let listItem = createListItem(list, blobId, interfaceMatchResult[1]);
            addIndicator(listItem, INTERFACE_INDICATOR);
        }
    }
}

function parseJava(list, lineOfCode, blobId) {
    const nonFunctionKeywords = ["switch", "while", "do", "if", "for", "super"];
    let functionRe = /^\s*(public\s|private\s|static\s|protected\s|abstract\s|native\s|synchronized\s|final\s)*([a-zA-Z<>\?\., ]+)\s+([a-zA-Z<>]+)\s*\(/;
    let classRe = /^\s*(public\s|static\s|abstract\s|final\s)*class\s([a-zA-Z_]*)/;
    let interfaceRe = /^\s*(?:public\s)?interface\s([a-zA-Z_]*)/;

    let fnMatchResult = lineOfCode.match(functionRe);

    if (fnMatchResult) {
        let functionName = fnMatchResult[3];
        let returnType = fnMatchResult[2];
        let access = fnMatchResult[1];

        //console.log("functionName = %s, returnType = %s, access = %s", functionName, returnType, access);

        if (returnType && returnType.trim().length > 0
             && returnType.trim() !== "new"
             && returnType.trim() !== "return new"
             && returnType.trim() !== "return"
             && returnType.trim() !== "throw new"
             && returnType.trim() !== "public"
             && !nonFunctionKeywords.includes(fnMatchResult[3])) {
            returnType = safeTags(returnType);
            let listItem = createListItem(list, blobId, functionName, " : " + returnType, access);
            addIndicator(listItem, FN_INDICATOR);
        }
    }

    let classMatchResult = lineOfCode.match(classRe);
    if (classMatchResult) {
        //console.log("class name = %s, access = %s", classMatchResult[2], classMatchResult[1]);
        let listItem = createListItem(list, blobId, classMatchResult[2], null, classMatchResult[1]);
        addIndicator(listItem, CLASS_INDICATOR);
    } else {
        let interfaceMatchResult = lineOfCode.match(interfaceRe);
        if (interfaceMatchResult) {
            //console.log("interface name = " + interfaceMatchResult[1]);
            let listItem = createListItem(list, blobId, interfaceMatchResult[1]);
            addIndicator(listItem, INTERFACE_INDICATOR);
        }
    }
}

function getLanguage(filePath) {
    let matchResult = filePath.match(/\.java(#L\d+)?$/);
    if (matchResult) {
        return JAVA;
    } else {
        matchResult = filePath.match(/\.ts(#L\d+)?$/);
        if (matchResult) {
            return TYPESCRIPT;
        } else {
            matchResult = filePath.match(/\.js(#L\d+)?$/);
            if (matchResult) {
                return JAVASCRIPT;
            }
            return null;
        }
    }
}

function main() {
    let container = document.createElement(DIV);
    container.id = "code-outline-container";
    let outline = document.createElement(DIV);
    outline.id = "code-outline-list";

    let blobs = document.getElementsByClassName("blob-code");

    if (!blobs || blobs.length === 0 || !getLanguage(location.href)) {
        outline.innerText = "Programming language not detected/supported";
    } else {
        for (let i = 0; i < blobs.length; i++) {
            let blob = blobs[i];
            //console.log(blob);
            let childNodes = blob.childNodes;
            let fullText = "";

            for (let j = 0; j < childNodes.length; j++) {
                let childNode = childNodes[j];
                fullText += childNode.textContent;
            }

            let language = getLanguage(location.href);

            if (language === JAVA) {
                parseJava(outline, fullText, blob.id);
            } else if (language === TYPESCRIPT) {
                parseTypeScript(outline, fullText, blob.id);
            } else if (language === JAVASCRIPT) {
                parseJavaScript(outline, fullText, blob.id);
            }
        }
    }

    let headerElement = document.createElement(DIV);
    headerElement.id = "co-header";
    headerElement.innerText = "Code Outline";
    container.append(headerElement);
    container.append(outline);

    document.getElementsByTagName("body")[0].appendChild(container);
    dragElement(container);
}
