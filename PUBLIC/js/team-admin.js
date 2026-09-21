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

});


async function loadAdminTeams() {

    const token =
        sessionStorage.getItem("adminToken");

    if (!token) {
        return;
    }

    try {

        const response = await fetch(
            "/api/admin/teams",
            {
                headers: {
                    "x-admin-token": token
                }
            }
        );

        if (!response.ok) {
            console.error("Failed to load teams");
            return;
        }

        const data = await response.json();

        renderTeams(data.teams || []);

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

    registeredCount.textContent =
        teams.length;


    const teamsWithScores =
        teams.filter(team => {

            const total =
                team.score?.total ??
                team.totalScore ??
                0;

            return Number(total) > 0;

        });


    scoredCount.textContent =
        teamsWithScores.length;


    body.innerHTML = "";


    if (teams.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="5">
                    No teams registered yet.
                </td>
            </tr>
        `;

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
            members.map(member => {

                return `
                    ${escapeHtml(
                        member.name || ""
                    )}

                    <small>
                        ${escapeHtml(
                            member.rollNumber || ""
                        )}
                    </small>
                `;

            }).join("<br>");


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


async function resetEvent() {

    const firstConfirm = confirm(
        "⚠ RESET EVENT?\n\n" +
        "This will remove ALL registered teams " +
        "and reset their scores.\n\n" +
        "Questions will NOT be deleted."
    );


    if (!firstConfirm) {
        return;
    }


    const secondConfirm = confirm(
        "FINAL CONFIRMATION\n\n" +
        "All team registrations and scores " +
        "will be permanently cleared.\n\n" +
        "Continue?"
    );


    if (!secondConfirm) {
        return;
    }


    const token =
        sessionStorage.getItem("adminToken");


    try {

        const response = await fetch(
            "/api/admin/reset-event",
            {
                method: "POST",

                headers: {
                    "x-admin-token": token
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Failed to reset event."
            );

            return;
        }


        alert(
            "Event has been reset successfully."
        );


        loadAdminTeams();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to reset event."
        );

    }

}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}