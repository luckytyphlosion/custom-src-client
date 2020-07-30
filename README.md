# custom-src-client
This is intended to be an enhanced version of the speedrun.com verification queue for verifiers and moderators.
It is currently in an alpha state with bare minimum functionality, but it'll support many QoL features (as well
as meet the features of the speedrun.com in the eventual future).

The client can be run locally on your browser. No data is sent or received from servers except from the speedrun.com API.
Content provided by the API is licensed under [CC-BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

## Notes for the current version
Right now, there is no rate limiting built-in to the client to account for the API throttling.
Users should be aware that the API accepts **100 requests per minute**.
The client currently will perform a number of API calls equivalent to the following formula:

`3 + ceil(numBoardsInQueue/200) + totalNumOfPlatformsOfRunsInQueue`

Care should also be taken as the few requests done are relatively large (depending on the size of runs in the queue, all categories, and all variables).
For more information about the API rate limits, see [here](https://github.com/speedruncomorg/api/blob/master/throttling.md).

Right now the client is hardcoded to handle a single leaderboard based on the `GAME` constant in `main.js`.
If you want to view another leaderboard, you will need to edit the value of `GAME`. This will be fixed in a later version of the client.
