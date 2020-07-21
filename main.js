console.log("Hello, World!");
const GAME = "mcce";
const API_URL = "https://www.speedrun.com/api/v1/";

function srcApiGetFromUrlAsync(urlStr, callback)
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

function srcApiGetAsync(endpoint, callback)
{
    srcApiGetFromUrlAsync(API_URL + endpoint, callback);
}

function srcGetAllNewRuns_getInitialRuns(gameId)
{
    srcApiGetAsync(`runs?game=${gameId}&status=new&orderby=date&direction=asc&max=200`, srcGetAllRuns_checkPagination);
}

function srcGetAllRuns_checkPagination(runsAndPagination)
{
    let allRuns = [];
    let failsafeCount = 0;

    function srcGetAllRuns_getRestOfRuns(runsAndPagination) {
        let curPagedRuns = runsAndPagination["data"];
        let pagination = runsAndPagination["pagination"];
        console.log(JSON.stringify(pagination));
        allRuns.push(...curPagedRuns);
        if (pagination["size"] != pagination["max"]) {
            srcGetAllRuns_processRuns(allRuns);
        } else {
            let paginationLinks = pagination["links"];
            failsafeCount++;
            if (failsafeCount >= 5) {
                console.log("Note: hit failsafe limit of 5!");
                srcGetAllRuns_processRuns(allRuns);
            }
            srcApiGetFromUrlAsync(paginationLinks[paginationLinks.length - 1]["uri"], srcGetAllRuns_getRestOfRuns);
        }
    }

    srcGetAllRuns_getRestOfRuns(runsAndPagination);
}

function srcGetAllRuns_processRuns(allRuns)
{
    let output = "";
    for (run of allRuns) {
        output += JSON.stringify(run) + "\n";
    }
    $("pre").text(output);
}

function fetchVerificationQueue_getGameId()
{
    srcApiGetAsync(`games?abbreviation=${GAME}&max=1&_bulk=yes`, fetchVerificationQueue_getNewRuns);
}

function fetchVerificationQueue_getNewRuns(data)
{
    srcGetAllNewRuns_getInitialRuns(data["data"][0]["id"]);
}

$(function() {
    $("pre").text("speedrun.com");
    fetchVerificationQueue_getGameId();
});
