let teamA, teamB, overs, balls = 0, runs = 0, wickets = 0;

document.getElementById("startMatch").addEventListener("click", () => {
  teamA = document.getElementById("teamA").value || "Team A";
  teamB = document.getElementById("teamB").value || "Team B";
  overs = parseInt(document.getElementById("overs").value) || 2;

  document.getElementById("setup").style.display = "none";
  document.getElementById("scoring").style.display = "block";
  document.getElementById("scoreTitle").innerText = `${teamA} vs ${teamB}`;
  updateScore();
});

function addRun(run) {
  runs += run;
  balls++;
  updateScore();
}

function addWicket() {
  wickets++;
  balls++;
  updateScore();
}

function addExtra(type) {
  runs++;
  updateScore();
}

function updateScore() {
  let over = Math.floor(balls/6);
  let ball = balls % 6;
  document.getElementById("score").innerText = 
    `Score: ${runs}/${wickets} (${over}.${ball})`;
}
