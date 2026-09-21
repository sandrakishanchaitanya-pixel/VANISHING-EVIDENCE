const registrationForm =
    document.getElementById("registrationForm");

const teamIdSelect =
    document.getElementById("teamId");

const teamNameInput =
    document.getElementById("teamName");

const registrationMessage =
    document.getElementById("registrationMessage");


// ==========================================
// LOAD TEAM IDS
// ==========================================

async function loadTeamIds() {

    try {

        const response =
            await fetch("/api/teams/available");

        const data =
            await response.json();

        if (!data.success) {
            throw new Error("Could not load Team IDs.");
        }

        teamIdSelect.innerHTML = "";

        if (data.availableTeamIds.length === 0) {

            teamIdSelect.innerHTML = `
                <option value="">
                    All Team IDs are occupied
                </option>
            `;

            return;
        }

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
            "Select your Team ID";
        defaultOption.disabled = true;
        defaultOption.selected = true;

        teamIdSelect.appendChild(defaultOption);


        data.availableTeamIds.forEach(teamId => {

            const option =
                document.createElement("option");

            option.value = teamId;
            option.textContent = teamId;

            teamIdSelect.appendChild(option);

        });

    } catch (error) {

        console.error(error);

        teamIdSelect.innerHTML = `
            <option value="">
                Unable to load Team IDs
            </option>
        `;
    }
}


// ==========================================
// REGISTER TEAM
// ==========================================

registrationForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const teamId =
            teamIdSelect.value;

        const teamName =
            teamNameInput.value.trim();


        if (!teamId) {

            showMessage(
                "Please select your Team ID.",
                "error"
            );

            return;
        }


        if (!teamName) {

            showMessage(
                "Please enter your Team Name.",
                "error"
            );

            return;
        }


        const memberCards =
            document.querySelectorAll(".member-card");


        const members = [];


        memberCards.forEach(card => {

            const rollNumber =
                card
                    .querySelector(".roll-number")
                    .value
                    .trim();

            const name =
                card
                    .querySelector(".member-name")
                    .value
                    .trim();


            if (!rollNumber && !name) {
                return;
            }


            members.push({
                rollNumber,
                name
            });

        });


        if (members.length < 2) {

            showMessage(
                "At least 2 team members are required.",
                "error"
            );

            return;
        }


        for (const member of members) {

            if (
                !member.rollNumber ||
                !member.name
            ) {

                showMessage(
                    "Please complete every member's Roll Number and Name.",
                    "error"
                );

                return;
            }

        }


        const submitButton =
            registrationForm.querySelector(
                "button[type='submit']"
            );


        submitButton.disabled = true;
        submitButton.textContent =
            "REGISTERING...";


        try {

            const response =
                await fetch(
                    "/api/teams/register",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                teamId,
                                teamName,
                                members
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Registration failed."
                );

            }


            localStorage.setItem(
                "ve_team_id",
                data.team.teamId
            );

            localStorage.setItem(
                "ve_team_name",
                data.team.teamName
            );


            showMessage(
                "✓ Team registered successfully!",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "/player.html";

            }, 1000);


        } catch (error) {

            showMessage(
                error.message,
                "error"
            );

            submitButton.disabled = false;

            submitButton.textContent =
                "REGISTER TEAM";

        }

    }
);


// ==========================================
// MESSAGE
// ==========================================

function showMessage(
    message,
    type
) {

    registrationMessage.textContent =
        message;

    registrationMessage.className =
        `message ${type}`;

}


// ==========================================
// START
// ==========================================

loadTeamIds();