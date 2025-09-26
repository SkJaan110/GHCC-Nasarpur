// script.js - SKScoringCric (advanced static scoring with localStorage)
(function(){
  // Utilities
  const $ = id => document.getElementById(id);

  // Elements
  const playerName = $('playerName');
  const playerSide = $('playerSide');
  const addPlayerBtn = $('addPlayerBtn');
  const teamAList = $('teamAList');
  const teamBList = $('teamBList');

  const startMatchBtn = $('startMatchBtn');
  const oversInput = $('oversInput');
  const tossWinner = $('tossWinner');
  const batChoice = $('batChoice');

  const scoringPanel = $('scoringPanel');
  const matchHeader = $('matchHeader');
  const onStrikeSelect = $('onStrikeSelect');
  const nonStrikeSelect = $('nonStrikeSelect');
  const bowlerSelect = $('bowlerSelect');
  const setPlayersBtn = $('setPlayersBtn');
  const matchSummary = $('matchSummary');
  const summaryPanel = $('summaryPanel');

  const liveScore = $('liveScore');
  const oversText = $('oversText');
  const targetText = $('targetText');
  const battingTable = $('battingTable').querySelector('tbody');
  const bowlingTable = $('bowlingTable').querySelector('tbody');

  // App state
  let teams = { A: [], B: [] };
  let match = null;

  // Load teams from localStorage
  function loadTeams(){
    const raw = localStorage.getItem('sk_teams_v1');
    if(raw) teams = JSON.parse(raw);
    renderTeams();
  }

  function saveTeams(){
    localStorage.setItem('sk_teams_v1', JSON.stringify(teams));
  }

  function renderTeams(){
    teamAList.innerHTML = teams.A.map((p,idx)=>`<li>${p} <button onclick="removePlayer('A',${idx})" class="btn">X</button></li>`).join('');
    teamBList.innerHTML = teams.B.map((p,idx)=>`<li>${p} <button onclick="removePlayer('B',${idx})" class="btn">X</button></li>`).join('');
  }

  window.removePlayer = function(side,idx){
    teams[side].splice(idx,1);
    saveTeams();
    renderTeams();
  }

  addPlayerBtn.addEventListener('click', ()=>{
    const name = playerName.value.trim();
    const side = playerSide.value;
    if(!name) return alert('Enter player name');
    teams[side].push(name);
    playerName.value = '';
    saveTeams();
    renderTeams();
  });

  // Match setup
  startMatchBtn.addEventListener('click', ()=>{
    const overs = parseInt(oversInput.value) || 5;
    const toss = tossWinner.value;
    const choice = batChoice.value;

    let battingFirst = (choice === 'bat') ? toss : (toss === 'A' ? 'B' : 'A');
    if(teams[battingFirst].length < 2) return alert('Batting team needs at least 2 players');
    if(teams[(battingFirst==='A'?'B':'A')].length < 1) return alert('Bowling team needs at least 1 player');

    match = {
      oversPerInnings: overs,
      innings: 1,
      battingSide: battingFirst,
      bowlingSide: (battingFirst==='A'?'B':'A'),
      score: 0,
      wickets: 0,
      balls: 0,
      oversComplete: 0,
      batsmenStats: {},
      bowlerStats: {},
      striker: teams[battingFirst][0],
      nonStriker: teams[battingFirst][1],
      nextBatsmanIdx: 2,
      currentBowler: teams[(battingFirst==='A'?'B':'A')][0],
      firstInningsScore: null,
      finished:false
    };

    teams.A.concat(teams.B).forEach(p=>{
      match.batsmenStats[p] = {runs:0,balls:0,fours:0,sixes:0};
      match.bowlerStats[p] = {balls:0,runs:0,wkts:0};
    });

    showScoringPanel();
    updateMatchUI();
  });

  function showScoringPanel(){
    scoringPanel.style.display = 'block';
    summaryPanel.style.display = 'none';
    populatePlayerSelectors();
  }

  function populatePlayerSelectors(){
    const batting = teams[match.battingSide];
    const bowling = teams[match.bowlingSide];
    onStrikeSelect.innerHTML = batting.map(p=>`<option value="${p}">${p}</option>`).join('');
    nonStrikeSelect.innerHTML = batting.map(p=>`<option value="${p}">${p}</option>`).join('');
    bowlerSelect.innerHTML = bowling.map(p=>`<option value="${p}">${p}</option>`).join('');
    onStrikeSelect.value = match.striker;
    nonStrikeSelect.value = match.nonStriker;
    bowlerSelect.value = match.currentBowler;
  }

  setPlayersBtn.addEventListener('click', ()=>{
    match.striker = onStrikeSelect.value;
    match.nonStriker = nonStrikeSelect.value;
    match.currentBowler = bowlerSelect.value;
    updateMatchUI();
  });

  // ✅ Scoring Buttons
  document.querySelectorAll('.btn.run').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const r = parseInt(btn.dataset.run);
      handleRun(r);
    });
  });

  document.querySelector('.btn.wicket').addEventListener('click', ()=> handleWicket());

  document.querySelectorAll('.btn.extra').forEach(btn=>{
    btn.addEventListener('click', ()=> handleExtra(btn.dataset.extra));
  });

  document.querySelector('.btn.ball').addEventListener('click', ()=> handleDot());

  // ---- Match Logic ----
  function handleRun(r){
    if(!match || match.finished) return;
    match.score += r;
    match.batsmenStats[match.striker].runs += r;
    match.batsmenStats[match.striker].balls += 1;
    if(r===4) match.batsmenStats[match.striker].fours += 1;
    if(r===6) match.batsmenStats[match.striker].sixes += 1;

    match.bowlerStats[match.currentBowler].runs += r;
    match.bowlerStats[match.currentBowler].balls += 1;
    match.balls += 1;

    if(r % 2 === 1){
      [match.striker, match.nonStriker] = [match.nonStriker, match.striker];
    }
    checkEndOfOverOrInnings();
    updateMatchUI();
  }

  function handleWicket(){
    if(!match || match.finished) return;
    match.wickets += 1;
    match.batsmenStats[match.striker].balls += 1;
    match.bowlerStats[match.currentBowler].wkts += 1;
    match.bowlerStats[match.currentBowler].balls += 1;
    match.balls += 1;

    const sideArr = teams[match.battingSide];
    if(match.nextBatsmanIdx < sideArr.length){
      match.striker = sideArr[match.nextBatsmanIdx++];
    } else {
      checkEndOfOverOrInnings(true);
      updateMatchUI();
      return;
    }
    checkEndOfOverOrInnings();
    updateMatchUI();
  }

  function handleExtra(type){
    if(!match || match.finished) return;
    match.score += 1;
    match.bowlerStats[match.currentBowler].runs += 1;
    if(type === 'nb'){
      match.batsmenStats[match.striker].runs += 1;
    }
    updateMatchUI();
  }

  function handleDot(){
    if(!match || match.finished) return;
    match.balls += 1;
    match.bowlerStats[match.currentBowler].balls += 1;
    checkEndOfOverOrInnings();
    updateMatchUI();
  }

  function checkEndOfOverOrInnings(forceEnd=false){
    if(match.balls % 6 === 0 || forceEnd){
      match.oversComplete = Math.floor(match.balls / 6);
      [match.striker, match.nonStriker] = [match.nonStriker, match.striker];
      const bowlArr = teams[match.bowlingSide];
      const nextBowlerIdx = match.oversComplete % bowlArr.length;
      match.currentBowler = bowlArr[nextBowlerIdx];

      if(match.oversComplete >= match.oversPerInnings || match.wickets >= teams[match.battingSide].length-1 || forceEnd){
        endInnings();
      }
    }
  }

  function endInnings(){
    if(match.innings === 1){
      match.firstInningsScore = {score:match.score,wickets:match.wickets,overs:match.oversComplete + (match.balls%6)/10};
      match.innings = 2;
      const prevBat = match.battingSide;
      match.battingSide = match.bowlingSide;
      match.bowlingSide = prevBat;
      match.score = 0; match.wickets = 0; match.balls = 0; match.oversComplete = 0;
      match.nextBatsmanIdx = 2;
      match.striker = teams[match.battingSide][0];
      match.nonStriker = teams[match.battingSide][1];
      match.currentBowler = teams[match.bowlingSide][0];
      updateMatchUI();
      alert('Innings over. 2nd innings started. Target: ' + (match.firstInningsScore.score+1));
    } else {
      match.finished = true;
      const target = match.firstInningsScore.score + 1;
      let result = '';
      if(match.score >= target){
        result = `${match.battingSide} won by ${teams[match.battingSide].length - match.wickets} wickets`;
      } else {
        result = `${(match.battingSide==='A'?'B':'A')} won by ${match.firstInningsScore.score - match.score} runs`;
      }
      matchSummary.innerText = `${result}\n\nFirst Innings: ${match.firstInningsScore.score}/${match.firstInningsScore.wickets}\nSecond Innings: ${match.score}/${match.wickets}`;
      summaryPanel.style.display = 'block';
      scoringPanel.style.display = 'none';
    }
  }

  function updateMatchUI(){
    if(!match) return;
    matchHeader.innerText = `Innings ${match.innings} • ${match.battingSide} batting`;
    liveScore.innerText = `${match.score}/${match.wickets}`;
    const oversDone = `${Math.floor(match.balls/6)}.${match.balls%6}`;
    oversText.innerText = `${oversDone} overs of ${match.oversPerInnings}`;
    targetText.innerText = match.innings===2 ? `Target: ${match.firstInningsScore.score+1}` : '';

    onStrikeSelect.value = match.striker;
    nonStrikeSelect.value = match.nonStriker;
    bowlerSelect.value = match.currentBowler;

    battingTable.innerHTML = '';
    teams[match.battingSide].forEach(name=>{
      const s = match.batsmenStats[name];
      const star = name===match.striker ? ' ⭐' : '';
      battingTable.innerHTML += `<tr><td style="text-align:left">${name}${star}</td><td>${s.runs}</td><td>${s.balls}</td><td>${s.fours}</td><td>${s.sixes}</td></tr>`;
    });

    bowlingTable.innerHTML = '';
    teams[match.bowlingSide].forEach(name=>{
      const b = match.bowlerStats[name];
      const oversBowled = `${Math.floor(b.balls/6)}.${b.balls%6}`;
      bowlingTable.innerHTML += `<tr><td style="text-align:left">${name}${name===match.currentBowler?' ⭐':''}</td><td>${oversBowled}</td><td>${b.runs}</td><td>${b.wkts}</td></tr>`;
    });
  }

  $('newMatchBtn').addEventListener('click', ()=>{
    match = null;
    scoringPanel.style.display = 'none';
    summaryPanel.style.display = 'none';
  });

  loadTeams();
})();
