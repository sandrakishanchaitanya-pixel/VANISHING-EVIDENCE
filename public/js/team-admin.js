document.addEventListener("DOMContentLoaded", () => {

    loadAdminTeams();

    const refreshButton =
        document.getElementById("refreshTeamsButton");

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadAdminTeams
        );
    }

    const resetButton =
        document.getElementById("resetEventButton");

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetEvent
        );
    }

    createLiveMonitor();

    loadLivePresence();

    if (typeof io !== "undefined") {

        const presenceSocket = io();

        presenceSocket.on(
            "presenceUpdate",
            renderLivePresence
        );
    }

    setInterval(
        loadLivePresence,
        2000
    );
});


async function loadAdminTeams() {

    const token =
        localStorage.getItem(
            "ve_admin_token"
        );

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/admin/teams",
                {
                    headers: {
                        "x-admin-token":
                            token
                    }
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        renderTeams(
            data.teams || []
        );

    } catch (error) {

        console.error(
            "Team loading error:",
            error
        );
    }
}


function renderTeams(teams) {

    const body =
        document.getElementById(
            "teamsTableBody"
        );

    const registeredCount =
        document.getElementById(
            "registeredTeamCount"
        );

    const scoredCount =
        document.getElementById(
            "scoredTeamCount"
        );

    if (!body) {
        return;
    }

    if (registeredCount) {
        registeredCount.textContent =
            teams.length;
    }

    const teamsWithScores =
        teams.filter(team => {

            const total =
                team.score?.total ??
                team.totalScore ??
                0;

            return Number(total) > 0;
        });

    if (scoredCount) {
        scoredCount.textContent =
            teamsWithScores.length;
    }

    body.innerHTML = "";

    if (!teams.length) {

        body.innerHTML =
            `<tr>
                <td colspan="5">
                    No teams registered yet.
                </td>
            </tr>`;

        return;
    }

    teams.forEach(team => {

        const row =
            document.createElement("tr");

        const members =
            Array.isArray(team.members)
                ? team.members
                : [];

        const memberText =
            members.map(member => `
                ${escapeHtml(
                    member.name || ""
                )}
                <small>
                    ${escapeHtml(
                        member.rollNumber || ""
                    )}
                </small>
            `).join("<br>");

        const totalScore =
            team.score?.total ??
            team.totalScore ??
            0;

        const correctAnswers =
            team.statistics?.correctAnswers ??
            team.correctAnswers ??
            0;

        row.innerHTML = `
            <td>
                <strong>
                    ${escapeHtml(
                        team.teamId || "-"
                    )}
                </strong>
            </td>

            <td>
                <strong>
                    ${escapeHtml(
                        team.teamName || "-"
                    )}
                </strong>
            </td>

            <td>
                ${memberText || "-"}
            </td>

            <td>
                <strong>
                    ${Number(totalScore)}
                </strong>
            </td>

            <td>
                ${Number(correctAnswers)}
            </td>
        `;

        body.appendChild(row);
    });
}


/* =========================================================
   LIVE EVENT MONITOR
========================================================= */

function createLiveMonitor() {

    if (
        document.getElementById(
            "liveEventMonitor"
        )
    ) {
        return;
    }

    const section =
        document.createElement("section");

    section.id =
        "liveEventMonitor";

    section.className =
        "live-event-monitor";

    section.innerHTML = `

        <div class="section-heading">

            <div>

                <p class="eyebrow">
                    LIVE EVENT MONITOR
                </p>

                <h2>
                    Team Presence
                </h2>

                <p class="muted">
                    Live registration, connection
                    and answer status.
                </p>

            </div>

            <div
                id="liveRoundInfo"
                class="live-round-info"
            >
                WAITING
            </div>

        </div>


        <div class="live-stats-grid">

            <div class="live-stat">
                <span>REGISTERED</span>
                <strong id="liveRegistered">0</strong>
            </div>

            <div class="live-stat">
                <span>CONNECTED</span>
                <strong id="liveConnected">0</strong>
            </div>

            <div class="live-stat">
                <span>WAITING</span>
                <strong id="liveWaiting">0</strong>
            </div>

            <div class="live-stat">
                <span>PLAYING</span>
                <strong id="livePlaying">0</strong>
            </div>

            <div class="live-stat">
                <span>ANSWERED</span>
                <strong id="liveAnswered">0</strong>
            </div>

            <div class="live-stat">
                <span>NOT ANSWERED</span>
                <strong id="liveNotAnswered">0</strong>
            </div>

            <div class="live-stat">
                <span>COMPLETED</span>
                <strong id="liveCompleted">0</strong>
            </div>

            <div class="live-stat">
                <span>DISCONNECTED</span>
                <strong id="liveDisconnected">0</strong>
            </div>

        </div>


        <div class="live-team-table-wrap">

            <table class="live-team-table">

                <thead>

                    <tr>
                        <th>TEAM</th>
                        <th>NAME</th>
                        <th>STATUS</th>
                        <th>SCORE</th>
                        <th>CORRECT</th>
                    </tr>

                </thead>

                <tbody id="liveTeamTableBody">

                    <tr>
                        <td colspan="5">
                            Waiting for live data...
                        </td>
                    </tr>

                </tbody>

            </table>

        </div>
    `;

    const dashboard =
        document.querySelector(
            ".dashboard"
        );

    const teamSection =
        document.querySelector(
            ".team-management-section"
        );

    if (
        dashboard &&
        teamSection
    ) {

        dashboard.insertBefore(
            section,
            teamSection
        );

    } else if (dashboard) {

        dashboard.prepend(
            section
        );
    }


    const style =
        document.createElement(
            "style"
        );

    style.textContent = `

        .live-event-monitor {
            margin-top: 30px;
            padding: 28px;
            border: 1px solid
                rgba(0,220,255,.22);
            border-radius: 16px;
            background:
                rgba(255,255,255,.025);
        }

        .live-round-info {
            padding: 10px 16px;
            border: 1px solid
                rgba(0,220,255,.3);
            border-radius: 10px;
            color: #00e5ff;
            font-weight: 800;
            letter-spacing: 1px;
        }

        .live-stats-grid {
            display: grid;
            grid-template-columns:
                repeat(4, 1fr);
            gap: 12px;
            margin: 20px 0;
        }

        .live-stat {
            padding: 18px;
            border: 1px solid
                rgba(255,255,255,.08);
            border-radius: 12px;
            background:
                rgba(255,255,255,.025);
        }

        .live-stat span {
            display: block;
            font-size: 11px;
            letter-spacing: 1px;
            opacity: .65;
            margin-bottom: 7px;
        }

        .live-stat strong {
            font-size: 26px;
        }

        .live-team-table-wrap {
            overflow-x: auto;
        }

        .live-team-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 650px;
        }

        .live-team-table th,
        .live-team-table td {
            padding: 13px;
            text-align: left;
            border-bottom:
                1px solid
                rgba(255,255,255,.08);
        }

        .live-team-table th {
            font-size: 11px;
            letter-spacing: 1px;
            opacity: .7;
        }

        .live-status {
            font-weight: 800;
            letter-spacing: .5px;
        }

        .live-status.connected {
            color: #35e08a;
        }

        .live-status.waiting {
            color: #ffd166;
        }

        .live-status.playing {
            color: #00e5ff;
        }

        .live-status.answered {
            color: #9b8cff;
        }

        .live-status.disconnected {
            color: #ff6b6b;
        }

        .live-status.completed {
            color: #35e08a;
        }

        @media(max-width:800px) {

            .live-stats-grid {
                grid-template-columns:
                    repeat(2, 1fr);
            }

            .live-event-monitor {
                padding: 18px;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}


/* =========================================================
   LOAD LIVE PRESENCE
========================================================= */

async function loadLivePresence() {

    const token =
        localStorage.getItem(
            "ve_admin_token"
        );

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/admin/presence",
                {
                    headers: {
                        "x-admin-token":
                            token
                    }
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        if (data.presence) {

            renderLivePresence(
                data.presence
            );
        }

    } catch (error) {

        console.error(
            "Presence loading error:",
            error
        );
    }
}


/* =========================================================
   RENDER LIVE PRESENCE
========================================================= */

function renderLivePresence(
    presence
) {

    if (!presence) {
        return;
    }

    setText(
        "liveRegistered",
        presence.registered ?? 0
    );

    setText(
        "liveConnected",
        presence.connected ?? 0
    );

    setText(
        "liveWaiting",
        presence.waiting ?? 0
    );

    setText(
        "livePlaying",
        presence.playing ?? 0
    );

    setText(
        "liveAnswered",
        presence.answered ?? 0
    );

    setText(
        "liveNotAnswered",
        presence.notAnswered ?? 0
    );

    setText(
        "liveCompleted",
        presence.completed ?? 0
    );

    setText(
        "liveDisconnected",
        presence.disconnected ?? 0
    );


    const roundInfo =
        document.getElementById(
            "liveRoundInfo"
        );

    if (roundInfo) {

        if (
            presence.round > 0 &&
            presence.question > 0
        ) {

            roundInfo.textContent =
                `ROUND ${presence.round} — ` +
                `QUESTION ${presence.question} / ` +
                `${presence.totalQuestions || 0}`;

        } else {

            roundInfo.textContent =
                "WAITING";
        }
    }


    const body =
        document.getElementById(
            "liveTeamTableBody"
        );

    if (!body) {
        return;
    }

    const teams =
        Array.isArray(presence.teams)
            ? presence.teams
            : [];

    body.innerHTML = "";


    if (!teams.length) {

        body.innerHTML =
            `<tr>
                <td colspan="5">
                    No teams registered yet.
                </td>
            </tr>`;

        return;
    }


    teams.forEach(team => {

        const row =
            document.createElement("tr");

        const statusClass =
            String(
                team.status ||
                "waiting"
            )
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "-"
                );

        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(
                        team.teamId || "-"
                    )}
                </strong>
            </td>

            <td>
                ${escapeHtml(
                    team.teamName || "-"
                )}
            </td>

            <td>
                <span
                    class="live-status
                    ${statusClass}"
                >
                    ${escapeHtml(
                        team.status ||
                        "Waiting"
                    )}
                </span>
            </td>

            <td>
                ${Number(
                    team.score ?? 0
                )}
            </td>

            <td>
                ${Number(
                    team.correct ?? 0
                )}
            </td>

        `;

        body.appendChild(row);
    });
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value;
    }
}


/* =========================================================
   RESET EVENT
========================================================= */

async function resetEvent() {

    const firstConfirm =
        confirm(
            "⚠ RESET EVENT?\n\n" +
            "This will remove ALL registered teams " +
            "and reset their scores.\n\n" +
            "Questions will NOT be deleted."
        );

    if (!firstConfirm) {
        return;
    }


    const secondConfirm =
        confirm(
            "FINAL CONFIRMATION\n\n" +
            "All team registrations and scores " +
            "will be permanently cleared.\n\n" +
            "Continue?"
        );

    if (!secondConfirm) {
        return;
    }


    const token =
        localStorage.getItem(
            "ve_admin_token"
        );


    try {

        const response =
            await fetch(
                "/api/admin/reset-event",
                {
                    method: "POST",

                    headers: {
                        "x-admin-token":
                            token
                    }
                }
            );

        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                data.message ||
                "Failed to reset event."
            );

            return;
        }


        alert(
            "Event has been reset successfully."
        );

        loadAdminTeams();

        loadLivePresence();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to reset event."
        );
    }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}