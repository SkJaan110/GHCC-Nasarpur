// script.js - SKScoringCric (advanced static scoring with localStorage)
(function(){
  // Utilities
  const $ = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);

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
  const currentMatchInfo = $('currentMatchInfo');

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

  // Buttons delegate
  const buttons = document.querySelectorAll('.buttons .btn');

  // App state
  let teams = { A: [], B: [] };
  let match = null; // will hold match object

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
    // update selects for setup
    const tAopts = teams.A.map(p=>`<option value="${p}">${p}</option>`).join('');
    const tBopts = teams.B.map(p=>`<option value="${p}">${p}</option>`).join('');
    $('batsman1Select') && ($('batsman1Select').innerHTML = tAopts);
    $('batsman2Select') && ($('batsman2Select').innerHTML = tAopts);
    $('bowlerSelectLocal') && ($('bowlerSelectLocal').innerHTML = tBopts);
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

  // Match setup / start
  startMatchBtn.addEventListener('click', ()=>{
    const overs = parseInt(oversInput.value) || 5;
    const toss = tossWinner.value;
    const choice = batChoice.value; // 'bat' or 'bowl'
    // determine who bats first
    let battingFirst = (choice === 'bat') ? toss : (toss === 'A' ? 'B' : 'A');
    // require teams have at least 2 players
    if(teams[battingFirst].length < 2) return alert('Batting team needs at least 2 players');
    if(teams[(battingFirst==='A'?'B':'A')].length < 1) return alert('Bowling team needs at least 1 player');

    // create match object
    match = {
      oversPerInnings: overs,
      innings: 1,
      battingSide: battingFirst,
      bowlingSide: (battingFirst==='A'?'B':'A'),
      score: 0,
      wickets: 0,
      balls: 0,
      oversComplete: 0,
      batsmenStats: {}, // name -> {runs, balls, fours, sixes}
      bowlerStats: {}, // name -> {balls, runs, wkts}
      striker: teams[battingFirst][0],
      nonStriker: teams[battingFirst][1],
      nextBatsmanIdx: 2,
      currentBowler: teams[(battingFirst==='A'?'B':'A')][0],
      firstInningsScore: null,
      finished:false
    };
    // init stats
    teams.A.concat(teams.B).forEach(p=>{
      match.batsmenStats[p] = {runs:0,balls:0,fours:0,sixes:0};
      match.bowlerStats[p] = {balls:0,runs:0,wkts:0};
    });

    // UI
    $('matchInfo').innerText = `${match.battingSide} batting first | Overs: ${overs}`;
    showScoringPanel();
    updateMatchUI();
  });

  function showScoringPanel(){
    $('scoringPanel').style.display = 'block';
    $('summaryPanel').style.display = 'none';
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

  // set players manual override
  $('setPlayersBtn').addEventListener('click', ()=>{
    match.striker = onStrikeSelect.value;
    match.nonStriker = nonStrikeSelect.value;
    match.currentBowler = bowlerSelect.value;
    updateMatchUI();
  });

  // scoring buttons
  document.getElementById("run0").addEventListener("click", () => addRun(0));
  document.getElementById("run1").addEventListener("click", () => addRun(1)); 
  document.getElementById("run2").addEventListener("click", () => addRun(2));
  document.getElementById("run3").addEventListener("click", () => addRun(3));
  document.getElementById("run4").addEventListener("click", () => addRun(4));
  document.getElementById("run6").addEventListener("click", () => addRun(6));
  document.getElementById("wicket").addEventListener("click", () => addwicket(W));
  document.getElementById("nb").addEventListener("click", () => addextra(NB));
  document.getElementById("extra").addEventListener("click", () => addwide(WD));
  document.getElementById("ball").addEventListener("click", () => addball(Next Ball));
  
  function handleRun(r){
    if(!match || match.finished) return;
    // add runs
    match.score += r;
    match.batsmenStats[match.striker].runs += r;
    match.batsmenStats[match.striker].balls += 1;
    if(r===4) match.batsmenStats[match.striker].fours += 1;
    if(r===6) match.batsmenStats[match.striker].sixes += 1;

    match.bowlerStats[match.currentBowler].runs += r;
    match.bowlerStats[match.currentBowler].balls += 1;
    match.balls += 1;

    // strike rotation: odd -> change, even -> same
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

    // new batsman
    const sideArr = teams[match.battingSide];
    if(match.nextBatsmanIdx < sideArr.length){
      match.striker = sideArr[match.nextBatsmanIdx++];
    } else {
      // all out
      checkEndOfOverOrInnings(true);
      updateMatchUI();
      return;
    }
    checkEndOfOverOrInnings();
    updateMatchUI();
  }

  function handleExtra(type){
    if(!match || match.finished) return;
    // extras add run but do not count ball
    match.score += 1;
    match.bowlerStats[match.currentBowler].runs += 1;
    if(type === 'nb'){
      // give batsman an extra run as well (simple)
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
    // check over completed
    if(match.balls % 6 === 0 || forceEnd){
      match.oversComplete = Math.floor(match.balls / 6);
      // swap strike end of over
      [match.striker, match.nonStriker] = [match.nonStriker, match.striker];
      // change bowler (simple rotation)
      const bowlArr = teams[match.bowlingSide];
      const nextBowlerIdx = match.oversComplete % bowlArr.length;
      match.currentBowler = bowlArr[nextBowlerIdx];
      // if innings finished by overs or all out or forced
      if(match.oversComplete >= match.oversPerInnings || match.wickets >= teams[match.battingSide].length-1 || forceEnd){
        endInnings();
      }
    }
  }

  function endInnings(){
    if(match.innings === 1){
      match.firstInningsScore = {score:match.score,wickets:match.wickets,overs:match.oversComplete + (match.balls%6)/10};
      // prepare for 2nd innings
      match.innings = 2;
      // swap batting side
      const prevBat = match.battingSide;
      match.battingSide = match.bowlingSide;
      match.bowlingSide = prevBat;
      // reset basic counters
      match.score = 0; match.wickets = 0; match.balls = 0; match.oversComplete = 0;
      match.nextBatsmanIdx = 2;
      match.striker = teams[match.battingSide][0];
      match.nonStriker = teams[match.battingSide][1];
      match.currentBowler = teams[match.bowlingSide][0];
      // keep stats cumulative
      updateMatchUI();
      alert('Innings over. 2nd innings started. Target: ' + (match.firstInningsScore.score+1));
    } else {
      // match finished - determine result
      match.finished = true;
      const target = match.firstInningsScore.score + 1;
      let result = '';
      if(match.score >= target){
        // chasing team won
        result = `${match.battingSide} won by ${teams[match.battingSide].length - match.wickets} wickets`;
      } else {
        result = `${(match.battingSide==='A'?'B':'A')} won by ${match.firstInningsScore.score - match.score} runs`;
      }
      matchSummary.innerText = `${result}\n\nFirst Innings: ${match.firstInningsScore.score}/${match.firstInningsScore.wickets}\nSecond Innings: ${match.score}/${match.wickets}`;
      $('summaryPanel').style.display = 'block';
      $('scoringPanel').style.display = 'none';
    }
  }

  function updateMatchUI(){
    if(!match) return;
    $('matchHeader').innerText = `Innings ${match.innings} • ${match.battingSide} batting`;
    liveScore.innerText = `${match.score}/${match.wickets}`;
    const oversDone = `${Math.floor(match.balls/6)}.${match.balls%6}`;
    oversText.innerText = `${oversDone} overs of ${match.oversPerInnings}`;
    targetText.innerText = match.innings===2 ? `Target: ${match.firstInningsScore.score+1}` : '';

    // update selectors if present
    onStrikeSelect && (onStrikeSelect.value = match.striker);
    nonStrikeSelect && (nonStrikeSelect.value = match.nonStriker);
    bowlerSelect && (bowlerSelect.value = match.currentBowler);

    // batting table
    battingTable.innerHTML = '';
    teams[match.battingSide].forEach(name=>{
      const s = match.batsmenStats[name];
      const star = name===match.striker ? ' ⭐' : '';
      battingTable.innerHTML += `<tr><td style="text-align:left">${name}${star}</td><td>${s.runs}</td><td>${s.balls}</td><td>${s.fours}</td><td>${s.sixes}</td></tr>`;
    });

    // bowling table for bowling side
    bowlingTable.innerHTML = '';
    teams[match.bowlingSide].forEach(name=>{
      const b = match.bowlerStats[name];
      const oversBowled = `${Math.floor(b.balls/6)}.${b.balls%6}`;
      bowlingTable.innerHTML += `<tr><td style="text-align:left">${name}${name===match.currentBowler?' ⭐':''}</td><td>${oversBowled}</td><td>${b.runs}</td><td>${b.wkts}</td></tr>`;
    });
  }

  // new match reset
  $('newMatchBtn') && $('newMatchBtn').addEventListener('click', ()=>{
    match = null;
    $('scoringPanel').style.display = 'none';
    $('summaryPanel').style.display = 'none';
    $('matchInfo').innerText = 'No active match';
  });

  // init
  loadTeams();
  // expose some for debugging
  window.__sk = {teams, match, updateMatchUI};
})();
