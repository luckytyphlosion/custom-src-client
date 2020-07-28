console.log("Hello, World!");
const GAME = "mcce";
const API_URL = "https://www.speedrun.com/api/v1/";

function srcApiGetFromUrlAwait(urlStr)
{
    let timeStart = performance.now();
    return new Promise(function (resolve, reject) {
        let xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", urlStr, true);
        xmlHttp.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                let data = JSON.parse(xmlHttp.response);
                let timeEnd = performance.now();
                console.log(`${urlStr}: ${(timeEnd - timeStart)/1000.0}`);
                resolve(data);
            } else {
                reject({
                    status: this.status,
                    statusText: xmlHttp.statusText
                });
            }
        };
        xmlHttp.onerror = function () {
            reject({
                status: this.status,
                statusText: xmlHttp.statusText
            });
        };
        xmlHttp.send();
    });
}

function srcApiGetAwait(endpoint)
{
    return srcApiGetFromUrlAwait(API_URL + endpoint);
}

function srcApiGetFromUrlCallback(urlStr, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            callback(JSON.parse(xmlHttp.responseText));
        }
    }
    xmlHttp.open("GET", urlStr, true); // true for asynchronous 
    //xmlHttp.setRequestHeader("User-Agent", "custom-src-client/0.1");
    xmlHttp.send(null);
}

function srcApiGetCallback(endpoint, callback)
{
    srcApiGetFromUrlCallback(API_URL + endpoint, callback);
}

// category | placement | user | time | platform | date | video available
// request categories https://www.speedrun.com/api/v1/games/nd2e9erd/categories
// and variables https://www.speedrun.com/api/v1/games/nd2e9erd/variables
// to be able to find the category name and variable names to print out the full category
// maybe do individual requests for categories https://www.speedrun.com/api/v1/categories/vdom79v2
// but don't request individual categories variables (too many duplicates)
// probably better to just request all to save requests

// request leaderboard for placement
// https://www.speedrun.com/api/v1/leaderboards/nd2e9erd/category/vdom79v2

/*
function srcGetAllRuns_processRuns(allRuns)
{
    let fragment = document.createDocumentFragment();

    for (run of allRuns) {
        let row = document.createElement("tr");
        
        for 
        let row = mcceQueue.insertRow();
        
        output += JSON.stringify(run) + "\\n";
    }

    $("pre").text(output);
}*/

async function fetchVerificationQueue()
{
    let gameData = await srcApiGetAwait(`games?abbreviation=${GAME}&max=1&_bulk=yes`);
    let gameId = gameData["data"][0]["id"];

    let failsafeCount = 0;
    
    let runsAndPagination = await srcApiGetAwait(`runs?game=${gameId}&status=new&orderby=date&direction=asc&max=200`);
    let allRuns = runsAndPagination["data"];
    let pagination = runsAndPagination["pagination"];
    while (pagination["size"] == pagination["max"]) {
        if (failsafeCount >= 5) {
            console.log("Note: hit failsafe limit of 5!");
            break;
        }

        let paginationLinks = pagination["links"];
        runsAndPagination = await srcApiGetFromUrlAwait(paginationLinks[paginationLinks.length - 1]["uri"]);
        allRuns.push(...runsAndPagination["data"]);
        pagination = runsAndPagination["pagination"];

        failsafeCount++;
    }

    console.log(allRuns);

    let output = "";

    for (run of allRuns) {
        output += JSON.stringify(run) + "\\n";
    }

    $("pre").text(output);
}

function createCategoryIdNameMapping()
{
    let idNameCategoryMapping = {};
    for (category of categoryData["data"]) {
        idNameCategoryMapping[category["id"]] = category["name"];
    }

    console.log(idNameCategoryMapping);
}

$(function() {
    $("pre").text("speedrun.com");
    //fetchVerificationQueue();
    createCategoryIdNameMapping();
});
