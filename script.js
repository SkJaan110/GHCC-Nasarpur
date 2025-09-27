let teamA = [];
let teamB = [];

function toggleSquad(teamId) {
  const squadDiv = document.getElementById(teamId);
  squadDiv.classList.toggle("hidden");
}

function addPlayer(team) {
  let playerName;
  let teamArray;
  let squadDiv;

  if (team === 'A') {
    playerName = document.getElementById("playerA").value;
    teamArray = teamA;
    squadDiv = document.getElementById("teamA");
  } else {
    playerName = document.getElementById("playerB").value;
    teamArray = teamB;
    squadDiv = document.getElementById("teamB");
  }

  if (playerName.trim() === "") return;

  teamArray.push(playerName);
  renderSquad(teamArray, squadDiv, team);
  
  // Clear input
  if (team === 'A') document.getElementById("playerA").value = "";
  else document.getElementById("playerB").value = "";

  updateButtonLabel(team, teamArray.length);
}

function renderSquad(teamArray, squadDiv, team) {
  squadDiv.innerHTML = "";
  teamArray.forEach((player, index) => {
    squadDiv.innerHTML += `
      <div>
        ${player} 
        <button onclick="editPlayer('${team}', ${index})">Edit</button>
        <button onclick="deletePlayer('${team}', ${index})">Delete</button>
      </div>
    `;
  });
}

function editPlayer(team, index) {
  let newName = prompt("Enter new name:");
  if (!newName) return;

  if (team === 'A') {
    teamA[index] = newName;
    renderSquad(teamA, document.getElementById("teamA"), 'A');
    updateButtonLabel('A', teamA.length);
  } else {
    teamB[index] = newName;
    renderSquad(teamB, document.getElementById("teamB"), 'B');
    updateButtonLabel('B', teamB.length);
  }
}

function deletePlayer(team, index) {
  if (team === 'A') {
    teamA.splice(index, 1);
    renderSquad(teamA, document.getElementById("teamA"), 'A');
    updateButtonLabel('A', teamA.length);
  } else {
    teamB.splice(index, 1);
    renderSquad(teamB, document.getElementById("teamB"), 'B');
    updateButtonLabel('B', teamB.length);
  }
}

function updateButtonLabel(team, count) {
  if (team === 'A') {
    document.querySelector("button[onclick=\"toggleSquad('teamA')\"]").innerText = `Team A (${count} Players)`;
  } else {
    document.querySelector("button[onclick=\"toggleSquad('teamB')\"]").innerText = `Team B (${count} Players)`;
  }
}
