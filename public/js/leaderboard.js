const socket = io();


document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadLeaderboard();

        setInterval(
            loadLeaderboard,
            3000
        );

    }
);


socket.on(
    "leaderboardRevealed",
    () => {

        loadLeaderboard();

    }
);


async function loadLeaderboard() {

    try {

        const response =
            await fetch(
                "/api/leaderboard"
            );


        const data =
            await response.json();


        if (!data.visible) {

            showLocked();

            return;
        }


        showLeaderboard(
            data.leaderboard
        );

    } catch (error) {

        console.error(error);

    }

}


function showLocked() {

    document.getElementById(
        "lockedScreen"
    ).classList.remove("hidden");


    document.getElementById(
        "leaderboardScreen"
    ).classList.add("hidden");
}


function showLeaderboard(
    leaderboard
) {

    document.getElementById(
        "lockedScreen"
    ).classList.add("hidden");


    document.getElementById(
        "leaderboardScreen"
    ).classList.remove("hidden");


    const body =
        document.getElementById(
            "leaderboardBody"
        );


    body.innerHTML = "";


    leaderboard.forEach(
        team => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <strong>
                        ${team.rank}
                    </strong>
                </td>

                <td>
                    <strong>
                        ${escapeHtml(
                            team.teamName
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            team.teamId
                        )}
                    </small>
                </td>

                <td>
                    ${team.round1}
                </td>

                <td>
                    ${team.round2}
                </td>

                <td>
                    ${team.round3}
                </td>

                <td class="total-score">
                    ${team.total}
                </td>

            `;


            body.appendChild(row);

        }
    );

}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}