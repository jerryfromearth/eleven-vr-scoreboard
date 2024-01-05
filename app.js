const UPDATE_INTERVAL_MS = 3000;
const API_URL = 'https://www.elevenvr.club/';
const LAST_MATCHES_SHOWN_COUNT = 1;
const QUERY_PARAM_USERID = 'user';
const QUERY_PARAM_ROWS_REVERSED = 'rowsReversed';
const QUERY_PARAM_BESTOF = 'bestOf';
const QUERY_PARAM_COUNTRY_FLAG_1 = 'flag_1';
const QUERY_PARAM_COUNTRY_FLAG_2 = 'flag_2';

const TEAM_NAME_1 = 'home';
const TEAM_NAME_2 = 'away';

let updateHandle = 0;

const urlParams = new URLSearchParams(window.location.search);
const userID = urlParams.get(QUERY_PARAM_USERID);
const rowsReversed = urlParams.get(QUERY_PARAM_ROWS_REVERSED);
const bestOf = urlParams.get(QUERY_PARAM_BESTOF);
const flag_1 = urlParams.get(QUERY_PARAM_COUNTRY_FLAG_1);
const flag_2 = urlParams.get(QUERY_PARAM_COUNTRY_FLAG_2);
const homeWinsOffset = urlParams.get('home-offset') || 0;
const awayWinOffset = urlParams.get('away-offset') || 0;

const App = {
    data() {
        return {
            counter: 0,
            userID: userID || '60531',
            matches: [],
            homeMatchesWon: 0,
            awayMatchesWon: 0,
            rowsReversed: !!rowsReversed && rowsReversed !== '0' && rowsReversed !== 'false' ? true : false,
            teams: [TEAM_NAME_1, TEAM_NAME_2],
            bestOf: bestOf || '',
            countries: countries,
            flag_1: flag_1 || '',
            flag_2: flag_2 || '',
        }
    },
    computed: {
        teamsReversed() {
            return this.teams.slice().reverse();
        }
    },
    watch: {
        rowsReversed: function (val) {
            if (val) {
                urlParams.set(QUERY_PARAM_ROWS_REVERSED, 1);
            } else {
                urlParams.delete(QUERY_PARAM_ROWS_REVERSED);
            }
            this.updateUrlParams();
        },

        userID: function (val) {
            urlParams.set(QUERY_PARAM_USERID, val);
            this.updateUrlParams();
            this.updateMatches();
        },

        bestOf: function (val) {
            if (val) {
                urlParams.set(QUERY_PARAM_BESTOF, val);
            } else {
                urlParams.delete(QUERY_PARAM_BESTOF);
            }
            this.updateUrlParams();
        },

        flag_1: function (val) {
            if (val) {
                urlParams.set(QUERY_PARAM_COUNTRY_FLAG_1, val);
            } else {
                urlParams.delete(QUERY_PARAM_COUNTRY_FLAG_1);
            }
            this.updateUrlParams();
        },

        flag_2: function (val) {
            if (val) {
                urlParams.set(QUERY_PARAM_COUNTRY_FLAG_2, val);
            } else {
                urlParams.delete(QUERY_PARAM_COUNTRY_FLAG_2);
            }
            this.updateUrlParams();
        }
    },
    methods: {
        updateUrlParams() {
            history.pushState(null, null, "?" + urlParams.toString());
        },
        getFlag(teamName) {
            return teamName === TEAM_NAME_1 ? this.flag_1 : this.flag_2;
        },
        updateMatches() {
            clearTimeout(updateHandle);
            fetch(`${API_URL}/accounts/${this.userID}/matches`)
                .then(res => res.json())
                .then(data => {

                    // Count matches score for those opponents
                    let otherIDPrevious = -1;
                    this.homeMatchesWon = homeWinsOffset;
                    this.awayMatchesWon = awayWinOffset;
                    try {
                        for (const match of data.data) {
                            const user1 = match.attributes['home-user-id'];
                            const user2 = match.attributes['away-user-id'];

                            const otherID = user1 == this.userID ? user2 : user1;
                            if (otherIDPrevious === -1) {
                                otherIDPrevious = otherID
                            }

                            if (otherIDPrevious !== otherID) break; // End counting if no more games between those two
                            if (match.attributes.state !== 1) continue; // Don't count matches that are not over

                            if (match.attributes.winner === 0) {
                                this.homeMatchesWon++;
                            } else {
                                this.awayMatchesWon++;
                            }
                        }

                    } catch (e) {

                    }

                    const newMatches = data.data.slice(0, LAST_MATCHES_SHOWN_COUNT);
                    this.matches = newMatches.map((m) => {
                        const scores = m.relationships.rounds.data.map((r) => {
                            return data.included.find((inclRound) => inclRound.id == r.id && inclRound.type === r.type).attributes;
                        }).reverse();
                        return {
                            ...m,
                            scores
                        }
                    })
                });

            updateHandle = setTimeout(() => this.updateMatches(), UPDATE_INTERVAL_MS);
        },
    },

    mounted() {
        this.updateMatches();
    }
}

var app = Vue.createApp(App);

app.component('player', {
    props: ['player'],
    template: `
        <div class="player">
            <h3>
                <img v-if="player.flag" :src="'flags/'+player.flag + '.svg'" class="flag"/>{{ player.UserName }}
            </h3>
            <div class="player__info">
                <div>
                    WR#{{ player.Rank }} {{ Math.round(player.ELO) }}ELO
                </div>
            </div>
        </div>
    `
});

app.component('player-row', {
    props: ['match', 'teamName', 'matchesWon', 'flag'],
    methods: {
        isMatchOver(score) {
            return (score['home-score'] >= 11 || score['away-score'] >= 11) && Math.abs(score['home-score'] - score['away-score']) > 1;
        },
    },
    computed: {
        otherTeamName: function () {
            return this.teamName === TEAM_NAME_1 ? TEAM_NAME_2 : TEAM_NAME_1;
        },
        playerData: function () {
            return {
                ...this.match.attributes[this.teamName + '-team'][0],
                flag: this.flag,
            }
        }
    },
    template: `
        <div class="player-row">
            <player :player="playerData" />

            <div class="score score--matches">
                {{matchesWon}}
            </div>
            <div v-for="score in match.scores" class="score"
                :class="[isMatchOver(score) ? 'ended': 'running', score[teamName + '-score'] > score[otherTeamName + '-score'] ? 'win' :'lose']">
                {{score[teamName + '-score']}}
            </div>
        </div>
    `
});

app.mount('#app')