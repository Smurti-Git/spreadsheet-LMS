// ========== CONFIG ==========
const API_KEY = "AIzaSyAGAls8lgy8_RmngrHfYKVJgOLqGU-Sbeo";
const SPREADSHEET_ID = "1PnyluixFs4s0T443hArqFAW4IGwr9S5n2sL7MI7t07U";





function trackTimePerTopic() {
  // Placeholder for future tracking per topic
  console.log("Tracking topic time...");
}



// ========== FETCH ==========
async function fetchData(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.values || [];
}

document.addEventListener("DOMContentLoaded", () => {
  loadHomePage();
});

// ========== NAVIGATION & MODALS ==========
function showMainDashboard() {
  document.getElementById("home-content")?.classList.add("hidden");
  document.getElementById("main-dashboard").style.display = "flex";
}

// Track Completed Topics
function recordTopicCompletion(topicId) {
  let completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  if (!completed.includes(topicId)) {
    completed.push(topicId);
    localStorage.setItem("completedTopics", JSON.stringify(completed));
  }
}
//===========time spend===========



// function updateSessionTime() {
//   const currentTime = Date.now();
//   const minutes = (currentTime - sessionStartTime) / 60000;

//   const previous = parseFloat(localStorage.getItem("totalTimeSpent") || "0");
//   const updated = previous + minutes;

//   localStorage.setItem("totalTimeSpent", updated.toFixed(2));
//   sessionStartTime = currentTime; // reset for next interval
// }

function updateSessionTime() {
  const currentTime = Date.now();
  const minutes = (currentTime - sessionStartTime) / 60000;
  sessionStartTime = currentTime;

  const selectedBatch = localStorage.getItem("selectedBatch");
  if (!selectedBatch) return; // No batch selected yet

  let timeData = JSON.parse(localStorage.getItem("batchTimeSpent") || "{}");
  const prev = parseFloat(timeData[selectedBatch] || 0);
  timeData[selectedBatch] = (prev + minutes).toFixed(2);

  localStorage.setItem("batchTimeSpent", JSON.stringify(timeData));
}




// function loadHomePage() {
//    localStorage.setItem("lastPage", "home");
//   document.getElementById("main-dashboard").style.display = "none";
//   document.getElementById("home-content").classList.remove("hidden");
//   renderUserSummary();
//   renderScoreSummary();
//   renderTimeSummary();
//   renderCompletionSummary();
//   renderIncompleteTopics(); // 👈 Add this line
  
// }

// function loadHomePage() {
//   localStorage.setItem("lastPage", "home");
//   document.getElementById("main-dashboard").style.display = "none";
//   document.getElementById("home-content").classList.remove("hidden");

//   // populate batch dropdown
//   const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
//   const batches = profile.batches || [];
//   const selector = document.getElementById("batch-selector");
//   selector.innerHTML = batches.map(b => `<option value="${b}">${b}</option>`).join("");

//   // choose default batch
//   const defaultBatch = batches[0];
//   selector.value = defaultBatch;

//   renderUserSummary();
//   renderBatchBasedData(defaultBatch);
// }

// function onBatchChange() {
//   const batchId = document.getElementById("batch-selector").value;
//   renderBatchBasedData(batchId);
// }

// function renderBatchBasedData(batchId) {
//   renderScoreSummary(batchId);
//   renderTimeSummary(batchId); // you can choose to filter time globally or per batch
//   renderCompletionSummary(batchId);
//   renderIncompleteTopics(batchId);
// }


// function toggleProfileModal() {
//   const modal = document.getElementById("profile-modal");
//   modal.classList.toggle("hidden");
//   if (!modal.classList.contains("hidden")) loadProfile();
// }

// function toggleLoginModal() {
//   document.getElementById("login-modal").classList.toggle("hidden");
// }

// function logout() {
//   localStorage.clear();
//   alert("Logged out!");
//   window.location.reload();
// }

// ===================== HOME PAGE & BATCH HANDLING =====================

function loadHomePage() {
  localStorage.setItem("lastPage", "home");
  document.getElementById("main-dashboard").style.display = "none";
  document.getElementById("home-content").classList.remove("hidden");

  // Populate batch dropdown
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const batches = profile.batches || [];
  const selector = document.getElementById("batch-selector");

  selector.innerHTML = batches.map(b => `<option value="${b}">${b}</option>`).join("");

  // Determine selected batch (persisted in localStorage)
  let selectedBatch = localStorage.getItem("selectedBatch");
  if (!selectedBatch && batches.length > 0) {
    selectedBatch = batches[0];
    localStorage.setItem("selectedBatch", selectedBatch);
  }

  selector.value = selectedBatch;

  // Batch dropdown change event
  selector.addEventListener("change", (e) => {
    const batchId = e.target.value;
    localStorage.setItem("selectedBatch", batchId);
    renderBatchBasedData(batchId);
  });

  // Initial render
  renderUserSummary();
  renderBatchBasedData(selectedBatch);
}

function renderBatchBasedData(batchId) {
  renderScoreSummary(batchId);       // score summary filtered by batch
  renderTimeSummary(batchId);        // time filtered by batch
  renderCompletionSummary(batchId);  // completion filtered by batch
  renderIncompleteTopics(batchId);   // incomplete topics filtered by batch
}

// ===================== TIME SUMMARY =====================
// Reads from batchTimeSpent object in localStorage
function renderTimeSummary(batchId) {
  const timeData = JSON.parse(localStorage.getItem("batchTimeSpent") || "{}");
  const timeSpent = timeData[batchId] || 0;

  document.getElementById("time-summary").innerHTML = `
    <h3>🕒 Total Time Spent (Batch: ${batchId || "-"})</h3>
    <p>${parseFloat(timeSpent).toFixed(2)} minutes</p>
  `;
}


// ========== LOGIN ==========
async function validateLogin() {
  const emailInput = document.getElementById("login-email").value.trim().toLowerCase();
  const passwordInput = document.getElementById("login-password").value;

  const users = await fetchData("UserData");

  // Collect all matching entries with same email and password
  const matchedRows = users.slice(1).filter(user =>
    user[3].trim().toLowerCase() === emailInput &&
    user[7] === passwordInput
  );

  if (matchedRows.length > 0) {
    const profile = {
      name: matchedRows[0][1],
      phone: matchedRows[0][2],
      email: matchedRows[0][3],
      empId: matchedRows[0][4],
      department: matchedRows[0][6],
      batches: matchedRows.map(row => row[5]), // collect all batch IDs
    };

    localStorage.setItem("userProfile", JSON.stringify(profile));
    localStorage.setItem("loggedIn", "true");
    alert(`✅ Login successful! ${profile.batches.length} batch(es) loaded.`);
    toggleLoginModal();
    loadSidebar("batch");
  } else {
    alert("❌ Invalid email or password.");
  }
}


// ========== PROFILE ==========
function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  document.getElementById("profile-name").value = profile.name || '';
  document.getElementById("profile-empid").value = profile.empId || '';
  document.getElementById("profile-email").value = profile.email || '';
  document.getElementById("profile-dept").value = profile.department || '';
  document.getElementById("profile-picurl").value = profile.pic || '';
  document.querySelector(".profile-pic").src = profile.pic || "https://via.placeholder.com/30x30";
}

function saveProfile() {
  const profile = {
    name: document.getElementById("profile-name").value,
    empId: document.getElementById("profile-empid").value,
    email: document.getElementById("profile-email").value,
    department: document.getElementById("profile-dept").value,
    pic: document.getElementById("profile-picurl").value
  };
  localStorage.setItem("userProfile", JSON.stringify(profile));
  document.querySelector(".profile-pic").src = profile.pic || "https://via.placeholder.com/30x30";
  alert("Profile saved!");
  toggleProfileModal();
}

// ========== TIME TRACKING ==========
let sessionStartTime = Date.now();
// window.addEventListener("beforeunload", () => {
//   const minutes = (Date.now() - sessionStartTime) / 60000;
//   const previous = parseFloat(localStorage.getItem("totalTimeSpent") || "0");
//   localStorage.setItem("totalTimeSpent", (previous + minutes).toFixed(2));
// });

// let sessionStartTime = Date.now();
let sessionTimer = null;

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    sessionStartTime = Date.now();
    if (!sessionTimer) {
      sessionTimer = setInterval(updateSessionTime, 10000); // every 10s
    }
  } else {
    updateSessionTime(); // when tab is hidden
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
});



// function renderTimeSummary() {
//   const timeSpent = localStorage.getItem("totalTimeSpent") || "0";
//   document.getElementById("time-summary").innerHTML = `
//     <h3>🕒 Total Time Spent</h3>
//     <p>${parseFloat(timeSpent).toFixed(2)} minutes</p>
//   `;
// }


// Completion Summry
// function renderCompletionSummary() {
//   const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
//   const summary = completed.length > 0
//     ? `✅ ${completed.length} topic(s) completed`
//     : `🚀 No topics completed yet`;

//   document.getElementById("completion-summary").innerHTML = `
//     <h3>Completion Summary</h3>
//     <p>${summary}</p>
//   `;
// }

async function renderCompletionSummary(batchId) {
  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  const topics = await fetchData("Topics");
  const courses = await fetchData("Courses");

  const courseIds = courses.slice(1)
    .filter(c => c[1] === batchId)
    .map(c => c[0]);
  const topicIds = topics.slice(1)
    .filter(t => courseIds.includes(t[1]))
    .map(t => t[0]);

  const batchCompleted = completed.filter(t => topicIds.includes(t));
  const summary = batchCompleted.length > 0
    ? `✅ ${batchCompleted.length} topic(s) completed`
    : `🚀 No topics completed yet`;

  document.getElementById("completion-summary").innerHTML = `
    <h3>Completion Summary (Batch: ${batchId})</h3>
    <p>${summary}</p>
  `;
}




// ========== SIDEBAR ==========
// function loadSidebar(type) {
//   if (!localStorage.getItem("loggedIn")) {
//     alert("Login required");
//     toggleLoginModal();
//     return;
//   }

//   showMainDashboard();
//   const title = document.getElementById("sidebar-title");
//   const list = document.getElementById("sidebar-list");
//   if (type === "batch") {
//     title.textContent = "Your Batch";
//     renderBatchesTo(list);
//   } else if (type === "course") {
//     title.textContent = "Courses";
//     renderUserCourses(list);
//   } else if (type === "topic") {
//     title.textContent = "Topics";
//     renderUserTopics(list);
//   }
// }


function loadSidebar(type) {
  if (!localStorage.getItem("loggedIn")) {
    alert("Login required");
    toggleLoginModal();
    return;
  }

  showMainDashboard();
  const title = document.getElementById("sidebar-title");
  const list = document.getElementById("sidebar-list");

  if (!list) return;

  if (type === "batch") {
    title.textContent = "Your Batch";
    renderBatchesTo(list);
  } else if (type === "course") {
    title.textContent = "Courses";
    renderUserCourses(list);
  } else if (type === "topic") {
    title.textContent = "Topics";
    list.innerHTML = "<p>Loading topics...</p>"; // Optional UX feedback
    setTimeout(() => renderUserTopics(list), 100); // Slight delay to ensure DOM is ready
  }
}



async function renderBatchesTo(container) {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const userBatches = profile.batches || [profile.batch];

  const batches = await fetchData("Batches");
  const visibleBatches = batches.slice(1).filter(batch => userBatches.includes(batch[0]));

  container.innerHTML = visibleBatches.map(batch =>
    `<li onclick="renderCourses('${batch[0]}')">${batch[1]}</li>`
  ).join('');
}

// Render User Courses
// async function renderUserCourses(container) {
//   const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
//   const batches = profile.batches || [];

//   const courses = await fetchData("Courses");
//   const filtered = courses.slice(1).filter(course => batches.includes(course[1]));

//   container.innerHTML = filtered.map(course =>
//     `<li onclick="renderTopics('${course[0]}')">${course[2]}</li>`
//   ).join('');
// }

async function renderUserCourses(container) {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const batches = profile.batches || [];

  const courses = await fetchData("Courses");
  const topics = await fetchData("Topics");
  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");

  const filtered = courses.slice(1).filter(course => batches.includes(course[1]));

  container.innerHTML = filtered.map(course => {
    const courseId = course[0];
    const courseName = course[2];

    const courseTopics = topics.slice(1).filter(t => t[1] === courseId);

    // A course is unlocked if ANY of its topics is unlocked
    let anyUnlocked = false;
    for (let i = 0; i < courseTopics.length; i++) {
      const topicId = courseTopics[i][0];
      // A topic is unlocked if:
      // - it's the first topic in the course AND is explicitly unlocked (completed topics array can be empty)
      // - OR the previous topic is in completed[]
      const prevTopicId = i > 0 ? courseTopics[i - 1][0] : null;
      const isUnlocked = (i === 0 && completed.length > 0) || (prevTopicId && completed.includes(prevTopicId));
      if (isUnlocked) {
        anyUnlocked = true;
        break;
      }
    }

    const lockedAttr = anyUnlocked ? "" : 'style="pointer-events:none;opacity:0.5;"';
    const status = anyUnlocked ? "" : " 🔒";

    return `
      <li ${lockedAttr} ${anyUnlocked ? `onclick="renderTopics('${courseId}')"` : ""}>
        ${courseName}${status}
      </li>
    `;
  }).join("");
}





// async function renderUserTopics(container) {
//   const profile = JSON.parse(localStorage.getItem("userProfile") || {});
//   const userBatches = profile.batches || [profile.batch];

//   const courses = await fetchData("Courses");
//   const courseIds = courses.slice(1)
//     .filter(c => userBatches.includes(c[1]))
//     .map(c => c[0]);

//   const topics = await fetchData("Topics");
//   const mcqData = await fetchData("MultipleChoiceAssignment");
//   const paraData = await fetchData("ParagraphAssessments");

//   const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
//   const paraScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

//   window.allTopics = topics.slice(1).filter(t => courseIds.includes(t[1]));

//   container.innerHTML = window.allTopics.map((topic, i) => {
//     const topicId = topic[0];
//     const topicName = topic[2];

//     // Calculate total & earned
//     const topicMCQs = mcqData.slice(1).filter(q => q[1] === topicId);
//     const topicParas = paraData.slice(1).filter(q => q[1] === topicId);

//     let total = 0;
//     let earned = 0;

//     topicMCQs.forEach((q, index) => {
//       const key = `mcq-${topicId}-${index}`;
//       const mark = parseFloat(q[9]) || 1;
//       total += mark;
//       earned += mcqScores[key] ? Number(mcqScores[key]) : 0;
//     });

//     topicParas.forEach((q, index) => {
//       const key = `${topicId}-Q${index + 1}`;
//       const mark = parseFloat(q[5]) || 5;
//       total += mark;
//       earned += paraScores[key] ? Number(paraScores[key]) : 0;
//     });

//     const scoreText = total > 0 ? `Score: (${earned}/${total})` : ``;

//     return `<li id="topic-${i}" class="topic-item" onclick="displayTopicById(${i})">
//       ${topicName} <span style="font-size:12px; color:darkgreen;">${scoreText}</span>
//     </li>`;
//   }).join('');
// }


async function renderUserTopics(container) {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const userBatches = profile.batches || [profile.batch];
  const courses = await fetchData("Courses");
  const courseIds = courses.slice(1)
    .filter(c => userBatches.includes(c[1]))
    .map(c => c[0]);

  const topics = await fetchData("Topics");
  const mcqData = await fetchData("MultipleChoiceAssignment");
  const paraData = await fetchData("ParagraphAssessments");
  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const paraScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

  window.allTopics = topics.slice(1).filter(t => courseIds.includes(t[1]));

  if (!container || !container.innerHTML) {
    console.error("Invalid container passed to renderUserTopics");
    return;
  }

  container.innerHTML = window.allTopics.map((topic, i) => {
    const topicId = topic[0];
    const topicName = topic[2];
    const isCompleted = completed.includes(topicId);
    const isUnlocked = i === 0 || completed.includes(window.allTopics[i - 1][0]);

    // Score calculation
    const topicMCQs = mcqData.slice(1).filter(q => q[1] === topicId);
    const topicParas = paraData.slice(1).filter(q => q[1] === topicId);
    let total = 0, earned = 0;

    topicMCQs.forEach((q, index) => {
      const key = `mcq-${topicId}-${index}`;
      const mark = parseFloat(q[9]) || 1;
      total += mark;
      earned += mcqScores[key] ? Number(mcqScores[key]) : 0;
    });

    topicParas.forEach((q, index) => {
      const key = `${topicId}-Q${index + 1}`;
      const mark = parseFloat(q[5]) || 5;
      total += mark;
      earned += paraScores[key] ? Number(paraScores[key]) : 0;
    });

    const scoreText = total > 0 ? `Score: (${earned}/${total})` : ``;

    // Locked style
    const lockedAttr = isUnlocked ? '' : 'style="pointer-events:none;opacity:0.5;"';
    const status = isCompleted ? '✅' : isUnlocked ? '' : '🔒';

    return `<li id="topic-${i}" class="topic-item" ${lockedAttr}
      onclick="${isUnlocked ? `displayTopicById(${i})` : ''}">
      ${topicName} ${status}
      <span style="font-size:12px; color:darkgreen;">${scoreText}</span>
    </li>`;
  }).join('');
}






function calculateTopicScore(topicId) {
  const mcq = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const para = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");
  let score = 0;

  Object.keys(mcq).forEach(k => { if (k.includes(topicId)) score += Number(mcq[k]) });
  Object.keys(para).forEach(k => { if (k.startsWith(topicId)) score += Number(para[k]) });
  return score;
}



// ========== TOPIC DISPLAY ==========

async function displayTopicById(index) {
  const topic = window.allTopics?.[index];
  if (!topic) return;

  const topicContent = document.getElementById("topic-content");
  topicContent.innerHTML = ""; // Clear previous

  // Fetch question content
  const paragraphHTML = await renderParagraphQuestions(topic[0]);
  const mcqHTML = await renderMCQs(topic[0]);

  // Build topic block
  // topicContent.innerHTML = `
  //   <h3>${topic[2]}</h3>
  //   <p>${topic[3]}</p>
  //   ${getEmbeddedVideoHTML(topic[4])}
  //   ${getDocumentEmbedHTML(topic[5])}
  //   ${paragraphHTML}
  //   ${mcqHTML}
  //   <button id="complete-btn" disabled>Mark as Complete</button>
  // `;

  // Preserve line breaks in topic description
const description = (topic[3] || "").replace(/\n/g, "<br>");

topicContent.innerHTML = `
  <h3>${topic[2]}</h3>
  <p>${description}</p>
  ${getEmbeddedVideoHTML(topic[4])}
  ${getDocumentEmbedHTML(topic[5])}
  ${paragraphHTML}
  ${mcqHTML}
  <button id="complete-btn" disabled>Mark as Complete</button>
`;


  // Navigation buttons
  const nav = document.createElement("div");
  nav.className = "navigation-buttons";
  nav.style.marginTop = "20px";

  const backBtn = document.createElement("button");
  backBtn.textContent = "⏮️ Back";
  backBtn.disabled = index === 0;
  backBtn.onclick = () => displayTopicById(index - 1);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next ⏭️";
  nextBtn.disabled = true; // Disabled until completion

  nav.appendChild(backBtn);
  nav.appendChild(nextBtn);
  topicContent.appendChild(nav);

  trackTimePerTopic?.();

  const completeBtn = document.getElementById("complete-btn");
  if (completeBtn) {
    completeBtn.onclick = () => {
      const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
      const topicId = topic[0];
      if (!completed.includes(topicId)) {
        completed.push(topicId);
        localStorage.setItem("completedTopics", JSON.stringify(completed));
        localStorage.setItem(`completedAt-${topicId}`, new Date().toISOString());
      }


      completeBtn.textContent = "Completed";
      completeBtn.disabled = true;
      completeBtn.style.backgroundColor = "#28a745";

      nextBtn.disabled = index >= window.allTopics.length - 1;
      nextBtn.onclick = () => displayTopicById(index + 1);

   // Refresh sidebar to unlock next topic
      // renderUserTopics(document.getElementById("sidebar-list"));
      // renderUserCourses(document.getElementById("sidebar-list"));


      renderUserTopics(document.getElementById("sidebar-list"));
    };
  }
// Check if topic is already marked complete
  checkAndEnableComplete(topic[0]);


const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
if (completed.includes(topic[0])) {
  completeBtn.textContent = "Completed";
  completeBtn.disabled = true;
  completeBtn.style.backgroundColor = "#28a745";
  nextBtn.disabled = index >= window.allTopics.length - 1;
  nextBtn.onclick = () => displayTopicById(index + 1);
}


}





function getDocumentEmbedHTML(url) {
  if (!url || !url.includes("docs.google.com/presentation")) {
    return `<p><a href="${url}" target="_blank">View Document</a></p>`;
  }

  const match = url.match(/\/d\/([^\/]+)\//);
  if (match && match[1]) {
    const presentationId = match[1];
    return `
      <div class="embedded-document">
        <iframe src="https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000"
          frameborder="0" width="100%" height="400px" allowfullscreen></iframe>
        <p><a href="${url}" target="_blank">🔗 View Full Document</a></p>
      </div>
    `;
  }

  return `<p><a href="${url}" target="_blank">View Document</a></p>`;
}



// ========== RENDER PARAGRAPH ==========
async function renderParagraphQuestions(topicId) {
  const data = await fetchData("ParagraphAssessments");
  const questions = data.slice(1).filter(q => q[1] === topicId);
  if (!questions.length) return ''; // 🧼 No questions? Render nothing

  return `
    <div class="question-section">
      <h4>Paragraph Questions</h4>
      ${questions.map((q, index) => {
        const qKey = `${topicId}-Q${index + 1}`;
        return `
          <div class="question-block">
            <p><strong>Q${index + 1}:</strong> ${q[2]}</p>
            <textarea rows="4" style="width: 100%;" 
              onchange="console.log('Answer for ${qKey}:', this.value)">
            </textarea>
            <p id="${qKey}-feedback" class="feedback"></p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}


//Embedded Video Support
function getEmbeddedVideoHTML(url) {
  if (!url) return '';
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.includes("youtu.be")
      ? url.split("youtu.be/")[1].split("?")[0]
      : new URLSearchParams(new URL(url).search).get("v");
    return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
  } else if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (fileIdMatch) {
      return `<iframe width="100%" height="315" src="https://drive.google.com/file/d/${fileIdMatch[0]}/preview" frameborder="0" allowfullscreen></iframe>`;
    }
  }
  return '';
}

// MCQ Rendering & Feedback
async function renderMCQs(topicId) {
  const data = await fetchData("MultipleChoiceAssignment");
  const questions = data.slice(1).filter(q => q[1] === topicId && q[2] === "Multiple Choice");
  const savedScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
if (!questions.length) return ''; // ✅ Hide if none

  return `
    <div class="question-section">
      <h4>MCQ Questions</h4>
      ${questions.map((q, i) => {
        const qId = `mcq-${topicId}-${i}`;
        const correct = q[8].trim().toLowerCase();
        const mark = parseFloat(q[9]) || 1;
        const scored = savedScores[qId];
        const isCorrect = scored && scored > 0;

        return `
          <div class="question-block">
            <p><strong>Q${i + 1}:</strong> ${q[3]}</p>
            ${['A', 'B', 'C', 'D'].map((opt, j) => {
              const val = q[4 + j].trim().toLowerCase();
              return `
                <label>
                  <input type="radio" name="${qId}" value="${val}"
                    ${isCorrect ? 'disabled' : ''}
                    ${val === correct && isCorrect ? 'checked' : ''}
                    onchange="handleMCQSelection('${qId}', '${correct}', ${mark})"
                  />
                  ${opt}. ${q[4 + j]}
                </label><br>
              `;
            }).join('')}
            <p id="${qId}-feedback" class="feedback" style="color:${isCorrect ? 'green' : 'red'}">
              ${isCorrect ? `Correct! 🎉 Score: ${mark}` : ''}
            </p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Handle MCQ

// function handleMCQSelection(qId, correctAnswer, mark) {
//   const radios = document.querySelectorAll(`input[name='${qId}']`);
//   const selected = [...radios].find(r => r.checked);
//   const feedback = document.getElementById(`${qId}-feedback`);
//   if (!selected) return;

//   const userAns = selected.value;
//   if (userAns === correctAnswer) {
//     feedback.textContent = `Correct! 🎉 Score: ${mark}`;
//     feedback.style.color = "green";
//     radios.forEach(r => r.disabled = true);

//     const scores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
//     scores[qId] = mark;
//     localStorage.setItem("mcqCorrectAnswers", JSON.stringify(scores));
//     checkAndEnableComplete(qId.split("-")[1]);
//   } else {
//     feedback.textContent = "Incorrect. Try again.";
//     feedback.style.color = "red";
//   }

  
// }

function handleMCQSelection(qId, correctAnswer, mark) {
  // Track attempts for this question
  let attempts = JSON.parse(localStorage.getItem("mcqAttempts") || "{}");
  attempts[qId] = (attempts[qId] || 0) + 1; // increment attempt
  localStorage.setItem("mcqAttempts", JSON.stringify(attempts));

  const attemptNo = attempts[qId];

  const radios = document.querySelectorAll(`input[name='${qId}']`);
  const selected = [...radios].find(r => r.checked);
  const feedback = document.getElementById(`${qId}-feedback`);
  if (!selected) return;

  const userAns = selected.value;
  if (userAns === correctAnswer) {
    // Calculate awarded mark based on attempt number
    let awardedMark = 0;
    if (attemptNo === 1) awardedMark = mark;
    else if (attemptNo === 2) awardedMark = mark * 0.75;
    else if (attemptNo === 3) awardedMark = mark * 0.5;
    else if (attemptNo >= 4) awardedMark = mark * 0.25;

    // Round to 2 decimals
    awardedMark = Math.round(awardedMark * 100) / 100;

    feedback.textContent = `Correct! 🎉 Score: ${awardedMark}`;
    feedback.style.color = "green";
    radios.forEach(r => r.disabled = true);

    const scores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
    scores[qId] = awardedMark;
    localStorage.setItem("mcqCorrectAnswers", JSON.stringify(scores));

    // Enable complete button if all are correct
    checkAndEnableComplete(qId.split("-")[1]);
  } else {
    feedback.textContent = "Incorrect. Try again.";
    feedback.style.color = "red";
  }
}


// Completion & Navigation Buttons
// function checkAndEnableComplete(topicId) {
//   const completeBtn = document.getElementById("complete-btn");
//   if (!completeBtn) return;

//   const mcqData = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
//   const inputs = document.querySelectorAll(`input[name^='mcq-${topicId}-']`);
//   const qIds = [...new Set([...inputs].map(i => i.name))];
//   const allCorrect = qIds.every(qId => mcqData[qId] && mcqData[qId] > 0);

//   if (allCorrect || qIds.length === 0) {
//     completeBtn.disabled = false;
//     completeBtn.onclick = () => {
//       const updated = JSON.parse(localStorage.getItem("completedTopics") || "[]");
//       if (!updated.includes(topicId)) {
//         updated.push(topicId);
//         localStorage.setItem("completedTopics", JSON.stringify(updated));
//         localStorage.setItem(`completedAt-${topicId}`, new Date().toISOString());
//       }
//       completeBtn.textContent = "Completed";
//       completeBtn.disabled = true;
//       completeBtn.style.backgroundColor = "#28a745";
//       renderUserTopics(document.getElementById("sidebar-list"));
//   checkAndEnableComplete(topic[0]);
//     };
//   }
// }

function checkAndEnableComplete(topicId) {
  const completeBtn = document.getElementById("complete-btn");
  if (!completeBtn) return;

  const mcqData = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const inputs = document.querySelectorAll(`input[name^='mcq-${topicId}-']`);
  const qIds = [...new Set([...inputs].map(i => i.name))];
  const allCorrect = qIds.every(qId => mcqData[qId] && mcqData[qId] > 0);

  // Enable button if all MCQs are correct OR there are no MCQs
  if (allCorrect || qIds.length === 0) {
    completeBtn.disabled = false;
  }
}



function renderUserSummary() {
  const profile = JSON.parse(localStorage.getItem("userProfile")) || {};
  document.getElementById("user-summary").innerHTML = `
    <h3>User Profile</h3>
    <p><strong>Name:</strong> ${profile.name || '-'}</p>
    <p><strong>Email:</strong> ${profile.email || '-'}</p>
    <p><strong>Employee ID:</strong> ${profile.empId || '-'}</p>
    <p><strong>Department:</strong> ${profile.department || '-'}</p>
  `;
}



// async function renderScoreSummary() {
//   const mcq = await fetchData("MultipleChoiceAssignment");
//   const para = await fetchData("ParagraphAssessments");

//   const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
//   const paraScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

//   let mcqEarned = 0, mcqTotal = 0;
//   let paraEarned = 0, paraTotal = 0;

//   // ==== MCQ Marks Calculation ====
//   mcq.slice(1).forEach((q, i) => {
//     const key = `mcq-${q[1]}-${i}`;
//     const mark = parseFloat(q[9]) || 1;
//     mcqTotal += mark;
//     mcqEarned += mcqScores[key] ? Number(mcqScores[key]) : 0;
//   });

//   // ==== Paragraph Marks Calculation (limit 2 per topic) ====
//   const topicWiseCount = {};
//   para.slice(1).forEach((q, i) => {
//     const topicId = q[1];

//     // count only first 2 questions for each topic
//     topicWiseCount[topicId] = (topicWiseCount[topicId] || 0) + 1;
//     if (topicWiseCount[topicId] > 2) return; // skip extra questions beyond 2

//     const questionIndex = topicWiseCount[topicId];
//     const key = `${topicId}-Q${questionIndex}`;

//     // ensure valid mark value
//     let mark = 5; // default
//     if (q[5] && !isNaN(parseFloat(q[5]))) {
//       mark = parseFloat(q[5]);
//     }

//     paraTotal += mark;
//     paraEarned += paraScores[key] ? Number(paraScores[key]) : 0;
//   });

//   console.log("DEBUG: Paragraph Total =", paraTotal, "Paragraph Earned =", paraEarned);
//   console.log("DEBUG: MCQ Total =", mcqTotal, "MCQ Earned =", mcqEarned);

//   const totalEarned = mcqEarned + paraEarned;
//   const totalPossible = mcqTotal + paraTotal;

//   document.getElementById("score-summary").innerHTML = `
//     <h3>📊 Score Summary</h3>
//     <p><strong>Subjective Score:</strong> ${paraEarned} / ${paraTotal}</p>
//     <p><strong>MCQ Score:</strong> ${mcqEarned} / ${mcqTotal}</p>
//     <p><strong>Total Score:</strong> ${totalEarned} / ${totalPossible}</p>
//   `;
// }

async function renderScoreSummary(batchId) {
  const mcq = await fetchData("MultipleChoiceAssignment");
  const para = await fetchData("ParagraphAssessments");
  const topics = await fetchData("Topics");
  const courses = await fetchData("Courses");

  // filter topicIds for selected batch
  const courseIds = courses.slice(1)
    .filter(c => c[1] === batchId)
    .map(c => c[0]);
  const topicIds = topics.slice(1)
    .filter(t => courseIds.includes(t[1]))
    .map(t => t[0]);

  const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const paraScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

  let mcqEarned = 0, mcqTotal = 0;
  let paraEarned = 0, paraTotal = 0;

  // MCQs - only include if topic is in topicIds
  mcq.slice(1).forEach((q, i) => {
    if (!topicIds.includes(q[1])) return;
    const key = `mcq-${q[1]}-${i}`;
    const mark = parseFloat(q[9]) || 1;
    mcqTotal += mark;
    mcqEarned += mcqScores[key] ? Number(mcqScores[key]) : 0;
  });

  // Paragraphs - only include if topic is in topicIds
  const topicWiseCount = {};
  para.slice(1).forEach((q, i) => {
    if (!topicIds.includes(q[1])) return;
    const topicId = q[1];
    topicWiseCount[topicId] = (topicWiseCount[topicId] || 0) + 1;
    if (topicWiseCount[topicId] > 2) return;

    const questionIndex = topicWiseCount[topicId];
    const key = `${topicId}-Q${questionIndex}`;

    let mark = 5;
    if (q[5] && !isNaN(parseFloat(q[5]))) {
      mark = parseFloat(q[5]);
    }

    paraTotal += mark;
    paraEarned += paraScores[key] ? Number(paraScores[key]) : 0;
  });

  console.log(`DEBUG [${batchId}]: Paragraph Total =`, paraTotal, "Paragraph Earned =", paraEarned);
  console.log(`DEBUG [${batchId}]: MCQ Total =`, mcqTotal, "MCQ Earned =", mcqEarned);

  const totalEarned = mcqEarned + paraEarned;
  const totalPossible = mcqTotal + paraTotal;

  document.getElementById("score-summary").innerHTML = `
    <h3>📊 Score Summary (Batch: ${batchId})</h3>
    <p><strong>Subjective Score:</strong> ${paraEarned} / ${paraTotal}</p>
    <p><strong>MCQ Score:</strong> ${mcqEarned} / ${mcqTotal}</p>
    <p><strong>Total Score:</strong> ${totalEarned} / ${totalPossible}</p>
  `;
}





// Incomplete Topics Display
// async function renderIncompleteTopics() {
//   const topics = await fetchData("Topics");
//   const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");

//   const incomplete = topics.slice(1).filter(t => !completed.includes(t[0]));
//   document.getElementById("incomplete-topics-summary").innerHTML = `
//     <h3>Incomplete Topics (${incomplete.length})</h3>
//     <ul>${incomplete.map(t => `<li>${t[2]}</li>`).join('')}</ul>
//   `;
// }

async function renderIncompleteTopics(batchId) {
  const topics = await fetchData("Topics");
  const courses = await fetchData("Courses");
  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");

  const courseIds = courses.slice(1)
    .filter(c => c[1] === batchId)
    .map(c => c[0]);
  const filteredTopics = topics.slice(1).filter(t => courseIds.includes(t[1]));
  const incomplete = filteredTopics.filter(t => !completed.includes(t[0]));

  document.getElementById("incomplete-topics-summary").innerHTML = `
    <h3>Incomplete Topics (${incomplete.length}) (Batch: ${batchId})</h3>
    <ul>${incomplete.map(t => `<li>${t[2]}</li>`).join('')}</ul>
  `;
}


// Summary Download
// function downloadSummary() {
//   const profile = JSON.parse(localStorage.getItem("userProfile") || {});
//   const totalTime = Number(localStorage.getItem("totalTimeSpent") || 0).toFixed(2);
//   const completed = JSON.parse(localStorage.getItem("completedTopics") || []).length;

//   const content = `
//  LMS Progress Summary
//  ====================

//  Name: ${profile.name || "-"}
//  Email: ${profile.email || "-"}
//  Employee ID: ${profile.empId || "-"}
//  Department: ${profile.department || "-"}
//   Batch: ${(profile.batches || []).join(", ") || "-"}


//  Topics Completed: ${completed}
//  Time Spent: ${totalTime} minutes
//  Generated: ${new Date().toLocaleString()}
//  `;

//   const blob = new Blob([content], { type: "text/plain" });
//   const link = document.createElement("a");
//   link.href = URL.createObjectURL(blob);
//   link.download = "LMS_Summary.txt";
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//  }

//  // renderCourses
//  async function renderCourses(batchId) {
//   const courses = await fetchData("Courses");
//   const filtered = courses.slice(1).filter(c => c[1] === batchId);
//   document.getElementById("sidebar-list").innerHTML = filtered.map(c =>
//     `<li onclick="renderTopics('${c[0]}')">${c[2]}</li>`
//   ).join('');
//  }

//  // renderTopics
//  async function renderTopics(courseId) {
//   const topics = await fetchData("Topics");
//   const filtered = topics.slice(1).filter(t => t[1] === courseId);
//   window.allTopics = filtered;

//   document.getElementById("topic-content").innerHTML = `
//     <h3>Topics in ${courseId}</h3>
//     <ul>
//       ${filtered.map((t, i) => `<li onclick="displayTopicById(${i})">${t[2]}</li>`).join('')}
//     </ul>
//   `;
// }

// async function downloadSummary() {
//   const profile = JSON.parse(localStorage.getItem("userProfile") || {});
//   const selectedBatch = document.getElementById("batch-selector").value;

//   // Get batch time
//   const batchTime = JSON.parse(localStorage.getItem("batchTimeSpent") || "{}");
//   const timeSpent = parseFloat(batchTime[selectedBatch] || 0).toFixed(2);

//   // Fetch necessary data
//   const topics = await fetchData("Topics");
//   const courses = await fetchData("Courses");
//   const mcq = await fetchData("MultipleChoiceAssignment");
//   const para = await fetchData("ParagraphAssessments");

//   // Filter courseIds for selected batch
//   const courseIds = courses.slice(1)
//     .filter(c => c[1] === selectedBatch)
//     .map(c => c[0]);

//   // Filter topics for selected batch
//   const batchTopics = topics.slice(1).filter(t => courseIds.includes(t[1]));

//   // Completed topics for batch
//   const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
//   const batchCompletedTopics = batchTopics.filter(t => completed.includes(t[0]));

//   // Scores
//   const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
//   const paraScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

//   let mcqEarned = 0, mcqTotal = 0;
//   let paraEarned = 0, paraTotal = 0;

//   // MCQ Score (only for topics in selected batch)
//   mcq.slice(1).forEach((q, i) => {
//     if (batchTopics.some(t => t[0] === q[1])) {
//       const key = `mcq-${q[1]}-${i}`;
//       const mark = parseFloat(q[9]) || 1;
//       mcqTotal += mark;
//       mcqEarned += mcqScores[key] ? Number(mcqScores[key]) : 0;
//     }
//   });

//   // Paragraph Score (only for topics in selected batch)
//   para.slice(1).forEach((q, i) => {
//     if (batchTopics.some(t => t[0] === q[1])) {
//       const key = `${q[1]}-Q${i + 1}`;
//       const mark = parseFloat(q[5]) || 5;
//       paraTotal += mark;
//       paraEarned += paraScores[key] ? Number(paraScores[key]) : 0;
//     }
//   });

//   const totalEarned = mcqEarned + paraEarned;
//   const totalPossible = mcqTotal + paraTotal;

//   // Generate report text
//   const content = `
// LMS Progress Summary (Batch: ${selectedBatch})
// ===============================================

// Name: ${profile.name || "-"}
// Email: ${profile.email || "-"}
// Employee ID: ${profile.empId || "-"}
// Department: ${profile.department || "-"}
// Batch: ${selectedBatch}

// Topics Completed: ${batchCompletedTopics.length} / ${batchTopics.length}
// Time Spent: ${timeSpent} minutes

// Score Summary:
// - Subjective Score: ${paraEarned} / ${paraTotal}
// - MCQ Score: ${mcqEarned} / ${mcqTotal}
// - Total Score: ${totalEarned} / ${totalPossible}

// Generated: ${new Date().toLocaleString()}
// `;

//   // Download as file
//   const blob = new Blob([content], { type: "text/plain" });
//   const link = document.createElement("a");
//   link.href = URL.createObjectURL(blob);
//   link.download = `LMS_Summary_${selectedBatch}.txt`;
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
// }

async function downloadSummary() {
  const profile = JSON.parse(localStorage.getItem("userProfile") || {});
  const batchId = document.getElementById("batch-selector").value;
  const batchTimeData = JSON.parse(localStorage.getItem("batchTimeSpent") || "{}");
  const timeSpent = Number(batchTimeData[batchId] || 0).toFixed(2);

  // Filter topics by batch
  const topics = await fetchData("Topics");
  const courses = await fetchData("Courses");
  const courseIds = courses.slice(1)
    .filter(c => c[1] === batchId)
    .map(c => c[0]);

  const batchTopics = topics.slice(1).filter(t => courseIds.includes(t[1]));
  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  const completedCount = batchTopics.filter(t => completed.includes(t[0])).length;

  // Scores
  const mcq = await fetchData("MultipleChoiceAssignment");
  const para = await fetchData("ParagraphAssessments");
  const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const paraScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

  let mcqEarned = 0, mcqTotal = 0;
  let paraEarned = 0, paraTotal = 0;

  mcq.slice(1).forEach((q, i) => {
    if (batchTopics.some(t => t[0] === q[1])) {
      const key = `mcq-${q[1]}-${i}`;
      const mark = parseFloat(q[9]) || 1;
      mcqTotal += mark;
      mcqEarned += mcqScores[key] ? Number(mcqScores[key]) : 0;
    }
  });

  para.slice(1).forEach((q, i) => {
    if (batchTopics.some(t => t[0] === q[1])) {
      const key = `${q[1]}-Q${i + 1}`;
      const mark = parseFloat(q[5]) || 5;
      paraTotal += mark;
      paraEarned += paraScores[key] ? Number(paraScores[key]) : 0;
    }
  });

  const totalEarned = mcqEarned + paraEarned;
  const totalPossible = mcqTotal + paraTotal;

  // Content for file
  const content = `
LMS Progress Summary
====================

Name: ${profile.name || "-"}
Email: ${profile.email || "-"}
Employee ID: ${profile.empId || "-"}
Department: ${profile.department || "-"}
Batch: ${batchId}

Topics Completed: ${completedCount}
Time Spent: ${timeSpent} minutes
MCQ Score: ${mcqEarned} / ${mcqTotal}
Paragraph Score: ${paraEarned} / ${paraTotal}
Total Score: ${totalEarned} / ${totalPossible}
Generated: ${new Date().toLocaleString()}
`;

  // Download text file
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `LMS_Summary_${batchId}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // === Push to Google Sheet ===
  const payload = {
    name: profile.name || "-",
    email: profile.email || "-",
    empId: profile.empId || "-",
    department: profile.department || "-",
    batch: batchId,
    topicsCompleted: completedCount,
    timeSpent,
    mcqScore: `${mcqEarned}/${mcqTotal}`,
    paraScore: `${paraEarned}/${paraTotal}`,
    totalScore: `${totalEarned}/${totalPossible}`
  };

  try {
    await fetch("https://script.google.com/macros/s/AKfycbwg-JM2lcKmARzCumQulg1XmA9gER2YlaIGkr8ethUPa_sQU7izShu-XkdgPtZAiJrm/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("Summary pushed to sheet successfully!");
  } catch (err) {
    console.error("Failed to push summary:", err);
  }
}



