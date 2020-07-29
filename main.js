console.log("Hello, World!");
const GAME = "mc";
const API_URL = "https://www.speedrun.com/api/v1/";

var gameId = "";
var categoryNameMap = null;
var subcategoryNameMap = null;
var subcategoryPosMap = null;
var savedPlatforms = new Map();

var gameData = null;
var runData = null;
var categoryData = null;
var variableData = null;

// Taken and modified from https://stackoverflow.com/a/29153059
var srcIso8601DurationRegex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.(\d+))?S)?/;

function parseSrcISO8601Duration(srcIso8601Duration)
{
    var matches = srcIso8601Duration.match(srcIso8601DurationRegex);

    return {
        hours: matches[1] === undefined ? null : matches[1],
        minutes: matches[2] === undefined ? 0 : matches[2],
        seconds: matches[3] === undefined ? 0 : matches[3],
        milliseconds: matches[4] === undefined ? null : matches[4]
    };
}

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

async function getGameIdFromAbbreviation(game)
{
    gameData = await srcApiGetAwait(`games?abbreviation=${game}&max=1&_bulk=yes`);
    gameId = gameData["data"][0]["id"];
}

async function fetchVerificationQueue()
{
    let failsafeCount = 0;

    let runsAndPagination = await srcApiGetAwait(`runs?game=${gameId}&status=new&orderby=date&direction=desc&embed=players&max=200`);
    runData = runsAndPagination["data"];
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
}

async function createCategoryNameMapping()
{
    categoryData = await srcApiGetAwait(`games/${gameId}/categories`);
    categoryNameMap = new Map();
    for (category of categoryData["data"]) {
        categoryNameMap.set(category["id"], category["name"]);
    }
}

async function createSubcategoryNameMapping()
{
    variableData = await srcApiGetAwait(`games/${gameId}/variables`);
    subcategoryNameMap = new Map();
    subcategoryPosMap = new Map();

    for (const [i, subcategory] of variableData["data"].entries()) {
        if (subcategory["is-subcategory"] === false) {
            continue;
        }
        let subcategoryId = subcategory["id"];
        subcategoryPosMap.set(subcategoryId, i);

        let subcategoryValueIdToNameMap = new Map();
        subcategoryValues = subcategory["values"]["values"];
        for (const [subcategoryValueId, subcategoryValueData] of Object.entries(subcategoryValues)) {
            subcategoryValueIdToNameMap.set(subcategoryValueId, subcategoryValueData["label"]);
        }

        subcategoryNameMap.set(subcategoryId, subcategoryValueIdToNameMap);
    }
}

function addCellToRow(row, cellText)
{
    let cell = document.createElement("td");
    let cellTextNode = document.createTextNode(cellText);
    cell.appendChild(cellTextNode);
    row.appendChild(cell);
}

function createFullCategoryNameFromRun(run)
{
    let categoryName = categoryNameMap.get(run["category"]);
    let subcategoryEntries = [];

    for (const [variableId, variableValue] of Object.entries(run["values"])) {
        let subcategoryValueIdToNameMap = subcategoryNameMap.get(variableId);
        if (subcategoryValueIdToNameMap !== undefined) {
            subcategoryEntries.push([variableId, subcategoryValueIdToNameMap.get(variableValue)]);
        }
    }

    if (subcategoryEntries.length === 0) {
        return categoryName;
    }

    subcategoryEntries.sort(function(subcatEntry1, subcatEntry2) {
        let subcategory1Pos = subcategoryPosMap.get(subcatEntry1[0]);
        let subcategory2Pos = subcategoryPosMap.get(subcatEntry2[0]);

        if (subcategory1Pos < subcategory2Pos) {
            return -1;
        } else if (subcategory1Pos > subcategory2Pos) {
            return 1;
        } else {
            console.warn(`Found two different subcategories with same position! (${subcatEntry1[0]}, ${subcatEntry2[0]})`);
            return 0;
        }
    });

    let subcategoryNames = [];

    for (subcategoryEntry of subcategoryEntries) {
        subcategoryNames.push(subcategoryEntry[1]);
    }

    subcategoryNamesJoined = subcategoryNames.join(", ");

    return `${categoryName} - ${subcategoryNamesJoined}`;
}

function getPlayerNameFromRun(run)
{
    let playerNames = [];

    for (player of run["players"]["data"]) {
        if (player["rel"] === "user") {
            playerNames.push(player["names"]["international"]);
        } else if (player["rel"] === "guest") {
            playerNames.push(player["name"]);
        } else {
            console.warn(`Run "${run["id"]}" has unknown rel "${player["rel"]}"!`);
            playerNames.push("<unknown>");
        }
    }
    return playerNames.join("\n");
}

function getRunTime(run)
{
    let duration = parseSrcISO8601Duration(run["times"]["primary"]);
    let output = "";

    if (duration.hours !== null) {
        output = `${duration.hours}h ${duration.minutes.toString().padStart(2, "0")}m `;
    } else if (duration.minutes !== null) {
        output = `${duration.minutes}m `;
    }

    if (duration.seconds !== null) {
        output += `${duration.seconds.toString().padStart(2, "0")}s`;
    } if (duration.milliseconds !== null) {
        output += ` ${duration.milliseconds}ms`;
    }

    return output;
}

async function getRunPlatform(run)
{
    let platformId = run["system"]["platform"];
    let platformName = savedPlatforms.get(platformId);
    if (platformName === undefined) {
        let platformData = await srcApiGetAwait(`platforms/${platformId}`);
        platformName = platformData["data"]["name"];
        savedPlatforms.set(platformId, platformName);
    }

    if (run["system"]["emulated"] === true) {
        return `${platformName} [EMU]`;
    } else {
        return platformName;
    }
}

function getDaysSinceRunDone(run)
{
    let runDateStr = run["date"];
    if (runDateStr === null) {
        return "?? days ago";
    }

    let splitDate = runDateStr.split("-");
    let runDateObj = new Date(splitDate[0], splitDate[1] - 1, splitDate[2]);
    console.log(runDateObj.toLocaleDateString());
    let numDaysSince = Math.floor((Date.now() - runDateObj.getTime()) / (1000 * 60 * 60 * 24));

    if (numDaysSince === 0) {
        return "Today";
    } else if (numDaysSince === 1) {
        return "1 day ago";
    } else {
        return `${numDaysSince} days ago`
    }
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

async function createLeaderboard()
{
    let output = "";
    console.log(subcategoryNameMap);

    let fragment = document.createDocumentFragment();

    for (run of runData) {
        let row = document.createElement("tr");

        addCellToRow(row, createFullCategoryNameFromRun(run));
        addCellToRow(row, "??th");
        addCellToRow(row, getPlayerNameFromRun(run));
        addCellToRow(row, getRunTime(run));
        let runPlatform = await getRunPlatform(run);
        addCellToRow(row, runPlatform);
        addCellToRow(row, getDaysSinceRunDone(run));
        row.setAttribute("data-href", run["weblink"]);
        row.classList.add("row-link");
        fragment.appendChild(row);
    }
    let leaderboardTable = document.createElement("table");
    leaderboardTable.classList.add("col-padding");
    leaderboardTable.appendChild(fragment);
    $("#mcceQueue").append(leaderboardTable);
    $("table .row-link").on("click", function(e) {
        e.preventDefault();
        let runWeblink = $(this).data("href");
        if (e.ctrlKey) {
            window.open(runWeblink, "_blank");
        } else {
            window.location = runWeblink;
        }
    });
}

async function main()
{
    await getGameIdFromAbbreviation(GAME);
    await Promise.allSettled([fetchVerificationQueue(), createCategoryNameMapping(), createSubcategoryNameMapping()]);
    createLeaderboard();
}

$(function() {
    main();
});
