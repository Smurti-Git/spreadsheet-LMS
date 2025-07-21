const API_KEY = "AIzaSyAGAls8lgy8_RmngrHfYKVJgOLqGU-Sbeo";
const SPREADSHEET_ID = "1PnyluixFs4s0T443hArqFAW4IGwr9S5n2sL7MI7t07U";

// Fetch data from Google Sheets
async function fetchData(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.values || [];
}

document.addEventListener("DOMContentLoaded", () => {
  loadHomePage();
});


// Load Sidebar
function loadSidebar(type) {
  showMainDashboard();
  const title = document.getElementById("sidebar-title");
  const list = document.getElementById("sidebar-list");

  if (type === "batch") {
    title.textContent = "Batches";
    renderBatchesTo(list);
  } else if (type === "course") {
    title.textContent = "Courses";
    renderAllCoursesTo(list);
  } else if (type === "topic") {
    title.textContent = "Topics";
    renderAllTopicsTo(list);
  }
}

// Render Batches
async function renderBatchesTo(container) {
  const batches = await fetchData("Batches");
  container.innerHTML = batches.slice(1)
    .map(batch => `<li onclick="renderCourses('${batch[0]}')">${batch[1]}</li>`)
    .join("");
}

// Render All Courses
async function renderAllTopicsTo(container) {
  const topics = await fetchData("Topics");
  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  const mcq = await fetchData("MultipleChoiceAssignment");
  const paragraph = await fetchData("ParagraphAssessments");

  const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const paraScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

  window.allTopics = topics.slice(1);

  container.innerHTML = window.allTopics.map((topic, index) => {
    const topicId = topic[0];
    const topicName = topic[2];
    const deadline = topic[6];

    const isCompleted = completed.includes(topicId);
    const isLocked = index !== 0 && !completed.includes(window.allTopics[index - 1][0]);

    // === STEP 1: Gather questions ===
    const mcqs = mcq.slice(1).filter(q => q[1] === topicId && q[2] === "Multiple Choice");
    const paras = paragraph.slice(1).filter(q => q[1] === topicId);

    // === STEP 2: Calculate score ===
    let total = 0;
    let earned = 0;

    mcqs.forEach((q, i) => {
      const qKey = `mcq-${topicId}-${i}`;
      const mark = parseFloat(q[9]) || 1;
      total += mark;
      if (mcqScores[qKey]) earned += Number(mcqScores[qKey]);
    });

    paras.forEach((q, i) => {
      const qKey = `${topicId}-Q${i + 1}`;
      const mark = parseFloat(q[5]) || 5;
      total += mark;
      if (paraScores[qKey]) earned += Number(paraScores[qKey]);
    });

    // === STEP 3: Apply deadline logic ===
    let scoreDisplay = "";
    if (total > 0) {
      const missedDeadline = deadline && !isTopicCompletedBeforeDeadline(topicId, deadline);
      const shownEarned = missedDeadline ? 0 : earned;
      scoreDisplay = `<br><span style="color: darkgreen; font-size: 12px;">Score: (${shownEarned}/${total})</span>`;
    }

    return `
      <li 
        id="topic-${index}" 
        class="${isCompleted ? 'completed-topic' : ''} ${isLocked ? 'locked-topic' : ''}" 
        onclick="${isLocked ? 'return false;' : `displayTopicById(${index})`}"
        title="${isLocked ? 'Complete previous topic to unlock' : ''}"
        style="${isLocked ? 'cursor: not-allowed; color: gray;' : ''}"
      >
        ${topicName}
        <br><span style="font-size: 12px; color: darkred;">Deadline: ${deadline || '-'}</span>
        ${scoreDisplay}
      </li>
    `;
  }).join('');
}



// async function renderAllTopicsTo(container) {
//   const topics = await fetchData("Topics");
//   const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
//   window.allTopics = topics.slice(1);

//   container.innerHTML = window.allTopics.map((topic, index) => {
//     const topicId = topic[0];
//     const topicName = topic[2];
//     const deadline = topic[6]; // Assuming deadline is in column index 6

//     const isCompleted = completed.includes(topicId);
//     const isLocked = index !== 0 && !completed.includes(window.allTopics[index - 1][0]);

//     return `
//       <li 
//         id="topic-${index}" 
//         class="${isCompleted ? 'completed-topic' : ''} ${isLocked ? 'locked-topic' : ''}" 
//         onclick="${isLocked ? 'return false;' : `displayTopicById(${index})`}"
//         title="${isLocked ? 'Complete previous topic to unlock' : ''}"
//         style="${isLocked ? 'cursor: not-allowed; color: gray;' : ''}"
//       >
//         ${topicName} <span style="font-size: 12px; color: darkred;">(Deadline: ${deadline})</span>
//       </li>
//     `;
//   }).join('');
// }


function calculateCourseScore(courseId) {
  const topics = window.allTopics?.filter(t => t[1] === courseId) || [];
  let earned = 0;
  let total = 0;

  const paragraph = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");
  const mcq = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");

  for (const topic of topics) {
    const topicId = topic[0];
    const deadline = topic[6];

    const eligible = isTopicCompletedBeforeDeadline(topicId, deadline);

    if (eligible) {
      for (const key in paragraph) {
        if (key.startsWith(topicId)) {
          const val = Number(paragraph[key]);
          earned += val;
          total += Number(val); // assume max mark is stored in sheet if needed
        }
      }

      for (const key in mcq) {
        if (key.includes(topicId)) {
          const val = Number(mcq[key]);
          earned += val;
          total += val; // assume max mark == 1 for each correct MCQ
        }
      }
    } else {
      // topic missed — include in total but earned = 0
      const topicMaxScore = getMaxScoreOfTopic(topicId);
      total += topicMaxScore;
    }
  }

  return { earned, total };
}

// Optional helper to get max score for missed topic
function getMaxScoreOfTopic(topicId) {
  let total = 0;
  const allMCQs = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const allSubj = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

  for (const key in allMCQs) {
    if (key.includes(topicId)) total += 1; // Assuming 1 mark per MCQ
  }
  for (const key in allSubj) {
    if (key.startsWith(topicId)) total += 5; // Assuming 5 marks per subjective
  }
  return total;
}



// Render Courses by Batch
async function renderCourses(batchId) {
  const courses = await fetchData("Courses");
  const topics = await fetchData("Topics");
  const mcq = await fetchData("MultipleChoiceAssignment");
  const para = await fetchData("ParagraphAssessments");

  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const paraScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");

  const courseList = courses.slice(1).filter(course => course[1] === batchId);
  const topicList = topics.slice(1);

  let html = "";

  for (let i = 0; i < courseList.length; i++) {
    const course = courseList[i];
    const courseId = course[0];
    const courseName = course[2];

    const courseTopics = topicList.filter(t => t[1] === courseId);

    let isAccessible = true;
    if (i > 0) {
      const prevCourse = courseList[i - 1];
      const prevTopics = topicList.filter(t => t[1] === prevCourse[0]);
      const allPrevCompleted = prevTopics.every(t => completed.includes(t[0]));
      if (!allPrevCompleted) isAccessible = false;
    }

    // === ✅ Calculate score ===
    let total = 0;
    let earned = 0;

    for (const topic of courseTopics) {
      const topicId = topic[0];
      const deadline = topic[6];

      const topicMCQs = mcq.slice(1).filter(q => q[1] === topicId);
      const topicParas = para.slice(1).filter(q => q[1] === topicId);

      topicMCQs.forEach((q, i) => {
        const qKey = `mcq-${topicId}-${i}`;
        const mark = parseFloat(q[9]) || 1;
        total += mark;
        if (mcqScores[qKey]) earned += Number(mcqScores[qKey]);
      });

      topicParas.forEach((q, i) => {
        const qKey = `${topicId}-Q${i + 1}`;
        const mark = parseFloat(q[5]) || 5;
        total += mark;
        if (paraScores[qKey]) earned += Number(paraScores[qKey]);
      });

      // Invalidate earned if topic was completed after deadline
      if (deadline && !isTopicCompletedBeforeDeadline(topicId, deadline)) {
        earned -= topicMCQs.reduce((sum, q, i) => {
          const qKey = `mcq-${topicId}-${i}`;
          return sum + (Number(mcqScores[qKey]) || 0);
        }, 0);

        earned -= topicParas.reduce((sum, q, i) => {
          const qKey = `${topicId}-Q${i + 1}`;
          return sum + (Number(paraScores[qKey]) || 0);
        }, 0);
      }
    }

    const scoreText = total > 0 ? ` <span style="font-size: 12px; color: darkblue;">(${earned}/${total})</span>` : "";

    if (isAccessible) {
      html += `<li onclick="renderTopics('${courseId}')">${courseName}${scoreText}</li>`;
    } else {
      html += `<li class="locked-course" style="color: gray; cursor: not-allowed;" title="Complete previous course to unlock">${courseName}</li>`;
    }
  }

  document.getElementById("sidebar-list").innerHTML = html;
}


// Render Topics by Course
async function renderTopics(courseId) {
  const topics = await fetchData("Topics");
  const topicContent = document.getElementById("topic-content");
  const filteredTopics = topics.slice(1).filter(topic => topic[1] === courseId);
  let currentIndex = 0;

  async function loadTopic(index) {
    if (index >= 0 && index < filteredTopics.length) {
      const topic = filteredTopics[index];
      await displayTopicContent(topic);
      recordTopicCompletion(topic[0]);
      topicContent.innerHTML += `
        <div class="navigation-buttons">
          <button id="back-btn" ${index === 0 ? "disabled" : ""}>Back</button>
          <button id="next-btn" ${index === filteredTopics.length - 1 ? "disabled" : ""}>Next</button>
        </div>
      `;
      document.getElementById("next-btn").addEventListener("click", () => loadTopic(++currentIndex));
      document.getElementById("back-btn").addEventListener("click", () => loadTopic(--currentIndex));
    }
  }

  loadTopic(currentIndex);
}

// Display Topic by Index
function displayTopicById(index) {
  const topic = window.allTopics?.[index];
  if (topic) {
    displayTopicContent(topic);
    recordTopicCompletion(topic[0]);
  }
}

async function displayTopicContent(topic, index = 0) {
  const topicContent = document.getElementById("topic-content");
  topicContent.innerHTML = ""; // Clear previous

  const paragraphHTML = await renderParagraphQuestions(topic[0]);
  const mcqHTML = await renderMCQs(topic[0]);
  const topicScore = calculateTopicScore(topic[0]);

  topicContent.innerHTML = `
    <div>
      <h3>${topic[2]}</h3>
      <p>${topic[3]}</p>
      ${getEmbeddedVideoHTML(topic[4])}
      <p><a href="${topic[5]}" target="_blank">View Document</a></p>
    </div>
    ${paragraphHTML}
    ${mcqHTML}
  `;

  // Check if there are any questions
  const hasQuestions =
    document.querySelectorAll(`form[id^='mcq-${topic[0]}-']`).length > 0 ||
    document.querySelectorAll(`[id^='${topic[0]}-Q']`).length > 0;

  if (hasQuestions) {
    const scoreDiv = document.createElement("div");
    scoreDiv.className = "topic-score";
    scoreDiv.style.marginTop = "20px";
    scoreDiv.style.fontWeight = "bold";
    scoreDiv.textContent = `Score for this topic: ${topicScore}`;
    topicContent.appendChild(scoreDiv);
  }

  const completedTopics = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  const isCompleted = completedTopics.includes(topic[0]);

  // Complete button
  const completeBtn = document.createElement("button");
  completeBtn.id = "complete-btn";
  completeBtn.style.marginTop = "15px";
  completeBtn.style.display = "none"; // hidden initially
  topicContent.appendChild(completeBtn);

  if (isCompleted) {
    completeBtn.textContent = "Completed";
    completeBtn.disabled = true;
    completeBtn.style.backgroundColor = "#28a745";
    completeBtn.style.color = "white";
    completeBtn.style.cursor = "default";
    completeBtn.setAttribute("tabindex", "-1");
    addNavButtons(index, topicContent);
  } else {
    completeBtn.textContent = "Mark as Complete";
    completeBtn.disabled = true;

   completeBtn.onclick = () => {
  const updated = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  if (!updated.includes(topic[0])) {
    updated.push(topic[0]);
    localStorage.setItem("completedTopics", JSON.stringify(updated));
    localStorage.setItem(`completedAt-${topic[0]}`, new Date().toISOString());
  }

  completeBtn.textContent = "Completed";
  completeBtn.disabled = true;
  completeBtn.style.backgroundColor = "#28a745";
  completeBtn.style.color = "white";
  completeBtn.style.cursor = "default";
  completeBtn.setAttribute("tabindex", "-1");

  addNavButtons(index, topicContent);
  renderAllTopicsTo(document.getElementById("sidebar-list"));
};


    // ✅ Check all MCQs after render completes
    setTimeout(() => {
      if (checkAllMCQsCorrect(topic[0])) {
        completeBtn.style.display = "inline-block";
        completeBtn.disabled = false;
      }
    }, 0);
  }

  trackTimePerTopic?.();
  checkAndEnableComplete(topic[0]); // ensures button is correct after rendering

}



function addNavButtons(index, container) {
  const navDiv = document.createElement("div");
  navDiv.className = "navigation-buttons";

  const backBtn = document.createElement("button");
  backBtn.id = "back-btn";
  backBtn.textContent = "Back";
  if (index === 0) backBtn.disabled = true;
  backBtn.onclick = () => displayTopicById(index - 1);

  const nextBtn = document.createElement("button");
  nextBtn.id = "next-btn";
  nextBtn.textContent = "Next";
  if (index === window.allTopics.length - 1) nextBtn.disabled = true;
  nextBtn.onclick = () => displayTopicById(index + 1);

  navDiv.appendChild(backBtn);
  navDiv.appendChild(nextBtn);
  container.appendChild(navDiv);
}


// Get embedded video
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

// Render Paragraph Questions
async function renderParagraphQuestions(topicId) {
  const data = await fetchData("ParagraphAssessments");
  const questions = data.slice(1).filter(q => q[1] === topicId);
  if (!questions.length) return '';

const saved = JSON.parse(localStorage.getItem("paragraphAnswers") || "{}");
  return `
    <div class="question-section">
      <h4>Paragraph Questions</h4>
      ${questions.map((q, index) => {
        const qKey = `${topicId}-Q${index + 1}`;
        const savedAnswer = saved[qKey] || '';
        return `
          <div class="question-block">
            <p><strong>Q${index + 1}:</strong> ${q[2]}</p>
            <textarea rows="4" style="width: 100%;" 
              onchange="evaluateSubjective('${qKey}', '${encodeURIComponent(q[3])}', ${q[5]}, this.value)">
              ${savedAnswer}
            </textarea>
            <p id="${qKey}-feedback" class="feedback"></p>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// Save Paragraph Answer
function saveParagraphAnswer(topicId, qId, answer) {
  const saved = JSON.parse(localStorage.getItem("paragraphAnswers") || "{}");
  saved[`${topicId}-${qId}`] = answer;
  localStorage.setItem("paragraphAnswers", JSON.stringify(saved));
}

async function renderMCQs(topicId) {
  const data = await fetchData("MultipleChoiceAssignment");
  const questions = data.slice(1).filter(q => q[1] === topicId && q[2] === "Multiple Choice");

  const savedAnswers = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");

  if (!questions.length) return '';

  return `
    <div class="question-section">
      <h4>MCQ Questions</h4>
      ${questions.map((q, i) => {
        const qId = `mcq-${topicId}-${i}`;
        const correctAnswer = q[8].trim().toLowerCase();
        const mark = parseFloat(q[9]) || 1;
        const savedMark = savedAnswers[qId];
        const isCorrect = savedMark && savedMark > 0;

        return `
          <div class="question-block">
            <p><strong>Q${i + 1}:</strong> ${q[3]}</p>
            ${['A', 'B', 'C', 'D'].map((opt, idx) => {
              const optVal = q[4 + idx].trim().toLowerCase();
              const isChecked = isCorrect && optVal === correctAnswer;
              return `
                <label>
                  <input type="radio" name="${qId}" value="${optVal}"
                    ${isCorrect ? 'disabled' : ''}
                    ${isChecked ? 'checked' : ''}
                    onchange="handleMCQSelection('${qId}', '${correctAnswer}', ${mark})"
                  />
                  ${opt}. ${q[4 + idx]}
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


//handleMCQSelection

function handleMCQSelection(qId, correctAnswer, mark) {
  const radios = document.querySelectorAll(`input[name='${qId}']`);
  const selected = Array.from(radios).find(r => r.checked);
  const feedback = document.getElementById(`${qId}-feedback`);

  if (!selected) return;

  const userAnswer = selected.value;

  if (userAnswer === correctAnswer) {
    feedback.textContent = `Correct! 🎉 Score: ${mark}`;
    feedback.style.color = "green";

    // Disable all options after correct answer
    radios.forEach(r => r.disabled = true);

    // Save to localStorage
    const scores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
    scores[qId] = mark;
    localStorage.setItem("mcqCorrectAnswers", JSON.stringify(scores));

    // Refresh sidebar and completion
    renderAllTopicsTo(document.getElementById("sidebar-list"));
  } else {
    feedback.textContent = "Incorrect. Try again.";
    feedback.style.color = "red";
  }

  recordTopicCompletion(qId.split("-")[1]); // topicId from qId
  checkAndEnableComplete(qId.split("-")[1]); // Already present — good

}



// function checkMCQAnswer(formId, correctAnswer) {
//   const form = document.getElementById(formId);
//   const feedback = document.getElementById(`${formId}-feedback`);
//   const selected = form.querySelector('input[type="radio"]:checked');

//   if (!selected) {
//     feedback.textContent = "Please select an option.";
//     feedback.style.color = "orange";
//     return;
//   }

//   const userAnswer = selected.value;
//   const isCorrect = userAnswer === correctAnswer;

//   // Get mark from form attribute
//   const mark = parseFloat(form.dataset.mark || "1");
//   const awardedScore = isCorrect ? mark : 0;

//   feedback.textContent = isCorrect
//     ? `Correct! 🎉 Score: ${mark}`
//     : `Incorrect. Correct: ${correctAnswer.toUpperCase()} → Score: 0`;
//   feedback.style.color = isCorrect ? "green" : "red";

//   // Save score to localStorage
//   const scores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
//   scores[formId] = awardedScore;
//   localStorage.setItem("mcqCorrectAnswers", JSON.stringify(scores));

//   recordTopicCompletion(formId.split("-")[1]);
// }

function checkMCQAnswer(formId, correctAnswer) {
  const form = document.getElementById(formId);
  const feedback = document.getElementById(`${formId}-feedback`);
  const selected = form.querySelector('input[type="radio"]:checked');

  if (!selected) {
    feedback.textContent = "Please select an option.";
    feedback.style.color = "orange";
    return;
  }

  const userAnswer = selected.value;
  const isCorrect = userAnswer === correctAnswer;

  // Get mark from form attribute
  const mark = parseFloat(form.dataset.mark || "1");
  const awardedScore = isCorrect ? mark : 0;

  feedback.textContent = isCorrect
    ? `Correct! 🎉 Score: ${mark}`
    : `Incorrect ❌ Score: 0`; // ✅ Don't reveal correct answer
  feedback.style.color = isCorrect ? "green" : "red";

  // Save score to localStorage
  const scores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  scores[formId] = awardedScore;
  localStorage.setItem("mcqCorrectAnswers", JSON.stringify(scores));

  const topicId = formId.split("-")[1];
  checkAndEnableComplete(topicId);
}

function checkAndEnableComplete(topicId) {
  const completeBtn = document.getElementById("complete-btn");
  if (!completeBtn) return;

  const answers = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");

  // Find all radio inputs for this topic
  const inputs = Array.from(document.querySelectorAll(`input[name^='mcq-${topicId}-']`));
  const questionNames = [...new Set(inputs.map(input => input.name))]; // unique qIds

  const hasMCQ = questionNames.length > 0;
  const allCorrect = questionNames.every(qId => answers[qId] && Number(answers[qId]) > 0);

  if (!hasMCQ) {
    // No MCQs – allow completion
    completeBtn.style.display = "inline-block";
    completeBtn.disabled = false;
  } else if (allCorrect) {
    completeBtn.style.display = "inline-block";
    completeBtn.disabled = false;
  } else {
    // Show but disable until all MCQs are correct
    completeBtn.style.display = "inline-block";
    completeBtn.disabled = true;
    completeBtn.title = "Answer all MCQs correctly to unlock";
  }
}






// Track Completed Topics
function recordTopicCompletion(topicId) {
  let completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  if (!completed.includes(topicId)) {
    completed.push(topicId);
    localStorage.setItem("completedTopics", JSON.stringify(completed));
  }
}

// // Track Time per Topic
// let topicStartTime = null;
// function trackTimePerTopic() {
//   if (topicStartTime) {
//     const elapsed = Math.floor((Date.now() - topicStartTime) / 60000); // in minutes
//     let total = Number(localStorage.getItem("totalTimeSpent") || 0);
//     localStorage.setItem("totalTimeSpent", total + elapsed);
//   }
//   topicStartTime = Date.now();
// }

// Track time spent in the session
let sessionStartTime = Date.now();

window.addEventListener("beforeunload", () => {
  const sessionEndTime = Date.now();
  const sessionDurationMinutes = (sessionEndTime - sessionStartTime) / 60000;
  const previous = parseFloat(localStorage.getItem("totalTimeSpent") || "0");
  const newTotal = previous + sessionDurationMinutes;
  localStorage.setItem("totalTimeSpent", newTotal.toFixed(2));
});



// Home Page Setup
function loadHomePage() {
  document.getElementById("main-dashboard").style.display = "none";
  document.getElementById("home-content").classList.remove("hidden");
  renderUserSummary();
  renderScoreSummary();
  renderTimeSummary();
  renderCompletionSummary();
  renderIncompleteTopics(); // 👈 Add this line
}

function showMainDashboard() {
  document.getElementById("home-content")?.classList.add("hidden");
  document.getElementById("main-dashboard").style.display = "flex";
}

// Home Page Sections
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
async function renderScoreSummary() {
  const subj = await fetchData("ParagraphAssessments");
  const obj = await fetchData("MultipleChoiceAssignment");

  const paragraphScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");
  const mcqScores = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");

  let subjTotal = 0;
  let objTotal = 0;

  subj.slice(1).forEach((q, index) => {
    const topicId = q[1];
    const qKey = `${topicId}-Q${index + 1}`;
    const savedScore = parseFloat(paragraphScores[qKey]) || 0;
    subjTotal += savedScore;
  });

  obj.slice(1).forEach((q, i) => {
    const topicId = q[1];
    const qKey = `mcq-${topicId}-${i}`;
    const mark = parseFloat(q[9]) || 0; // Assuming 'mark' is in column index 9
    if (mcqScores[qKey] === 1) {
      objTotal += mark;
    }
  });

  const total = subjTotal + objTotal;

  document.getElementById("score-summary").innerHTML = `
    <h3>Score Summary</h3>
    <p><strong>Subjective Score:</strong> ${subjTotal}</p>
    <p><strong>Objective Score:</strong> ${objTotal}</p>
    <p><strong>Total Score:</strong> ${total}</p>
  `;
}




function renderTimeSummary() {
  const minutes = Number(localStorage.getItem("totalTimeSpent") || 0);
  const hours = (minutes / 60).toFixed(2);
  document.getElementById("time-summary").innerHTML = `
    <h3>Total Time Spent</h3>
    <p><strong>${hours}</strong> hours</p>
  `;
}
async function renderScoreSummary() {
  const subj = await fetchData("ParagraphAssessments");
  const obj = await fetchData("MultipleChoiceAssignment");

  const subjScore = subj.slice(1).reduce((acc, q) => acc + (parseFloat(q[5]) || 0), 0);
  const objScore = obj.slice(1).reduce((acc, q) => acc + (parseFloat(q[9]) || 0), 0); // mark is at index 9 if total 10 columns

  const total = subjScore + objScore;

  document.getElementById("score-summary").innerHTML = `
    <h3>Score Summary</h3>
    <p><strong>Subjective:</strong> ${subjScore}</p>
    <p><strong>Objective:</strong> ${objScore}</p>
    <p><strong>Total Score:</strong> ${total}</p>
  `;
}


// Profile Modal Logic
function toggleProfileModal() {
  const modal = document.getElementById("profile-modal");
  const isHidden = modal.classList.contains("hidden");
  if (isHidden) loadProfile();
  modal.classList.toggle("hidden");
}
function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("userProfile")) || {};
  document.getElementById("profile-name").value = profile.name || '';
  document.getElementById("profile-empid").value = profile.empId || '';
  document.getElementById("profile-email").value = profile.email || '';
  document.getElementById("profile-dept").value = profile.department || '';
  document.getElementById("profile-picurl").value = profile.pic || '';
  if (profile.pic) document.querySelector(".profile-pic").src = profile.pic;
}

async function renderCompletionSummary() {
  const all = await fetchData("Topics");
  const total = all.length - 1;
  const done = JSON.parse(localStorage.getItem("completedTopics") || "[]").length;
  document.getElementById("completion-summary").innerHTML = `
    <h3>Completion</h3>
    <p><strong>${done} / ${total}</strong> topics completed</p>
  `;
}

function saveProfile() {
  const profile = {
    name: document.getElementById("profile-name").value,
    empId: document.getElementById("profile-empid").value,
    email: document.getElementById("profile-email").value,
    department: document.getElementById("profile-dept").value,
    pic: document.getElementById("profile-picurl").value,
  };
  localStorage.setItem("userProfile", JSON.stringify(profile));
  document.querySelector(".profile-pic").src = profile.pic || "https://via.placeholder.com/30";
  alert("Profile saved!");
  toggleProfileModal();
}

// On load
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
});

function downloadSummary() {
  const profile = JSON.parse(localStorage.getItem("userProfile")) || {};
  const totalTime = Number(localStorage.getItem("totalTimeSpent") || 0);
  const completed = JSON.parse(localStorage.getItem("completedTopics") || []).length;

  const summary = `
LMS Progress Summary
======================

User Info:
- Name: ${profile.name || "-"}
- Email: ${profile.email || "-"}
- Employee ID: ${profile.empId || "-"}
- Department: ${profile.department || "-"}

Progress:
- Topics Completed: ${completed}
- Time Spent: ${(totalTime / 60).toFixed(2)} hours

*Generated on ${new Date().toLocaleString()}
  `;

  const blob = new Blob([summary], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "LMS_Summary.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===================
// SMART SUBJECT EVAL
// ===================

function calculateSimilarity(correctAnswer, userAnswer) {
  const correctWords = correctAnswer.toLowerCase().split(" ");
  const userWords = userAnswer.toLowerCase().split(" ");
  let matchCount = 0;

  correctWords.forEach(word => {
    if (userWords.includes(word)) {
      matchCount++;
    }
  });

  const similarity = (matchCount / correctWords.length) * 100;
  return parseFloat(similarity.toFixed(2)); // Return percentage as number
}

// evaluate Subjective

function evaluateSubjective(qKey, correctAnswerEncoded, mark, userAnswer) {
  const correctAnswer = decodeURIComponent(correctAnswerEncoded);
  const similarity = calculateSimilarity(correctAnswer, userAnswer);
  const awarded = similarity >= 50 ? mark : 0;

  // Save user response
  const saved = JSON.parse(localStorage.getItem("paragraphAnswers") || "{}");
  saved[qKey] = userAnswer;
  localStorage.setItem("paragraphAnswers", JSON.stringify(saved));

  // Save score
  const subjectiveScores = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");
  subjectiveScores[qKey] = awarded;
  localStorage.setItem("subjectiveScores", JSON.stringify(subjectiveScores));

  // Show score
  const feedback = document.getElementById(`${qKey}-feedback`);
  feedback.textContent = `Similarity: ${similarity}% → Score: ${awarded}`;
  feedback.style.color = awarded > 0 ? "green" : "red";
}

async function renderIncompleteTopics() {
  const allTopics = await fetchData("Topics");
  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");

  const incomplete = allTopics.slice(1).filter(topic => !completed.includes(topic[0]));

  document.getElementById("incomplete-topics-summary").innerHTML = `
    <h3>Topics Not Yet Completed</h3>
    <ul>
      ${incomplete.map(topic => `<li>${topic[2]}</li>`).join("")}
    </ul>
  `;
}

function displayTopicById(index) {
  // Highlight topic
  document.querySelectorAll("li").forEach(li => li.classList.remove("active-topic"));
  const topicItem = document.getElementById(`topic-${index}`);
  if (topicItem) topicItem.classList.add("active-topic");

  const topic = window.allTopics?.[index];
  if (!topic) return;

  // Lock until previous is completed
  const completed = JSON.parse(localStorage.getItem("completedTopics") || "[]");
  if (index !== 0 && !completed.includes(window.allTopics[index - 1][0])) {
    alert("Please complete the previous topic first.");
    return;
  }

  displayTopicContent(topic, index);
}

function calculateTopicScore(topicId) {
  const paragraph = JSON.parse(localStorage.getItem("subjectiveScores") || "{}");
  const mcq = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");

  let score = 0;
  for (const key in paragraph) {
    if (key.startsWith(topicId)) {
      score += Number(paragraph[key]);
    }
  }

  for (const key in mcq) {
    if (key.includes(topicId)) {
      score += Number(mcq[key]);
    }
  }

  return score;
}


function isTopicCompletedBeforeDeadline(topicId, deadlineStr) {
  if (!deadlineStr) return true;

  const deadline = new Date(deadlineStr);
  const completedTimeStr = localStorage.getItem(`completedAt-${topicId}`);

  if (!completedTimeStr) return false;

  const completedTime = new Date(completedTimeStr);
  return completedTime <= deadline;
}


function checkAllMCQsCorrect(topicId) {
  const answers = JSON.parse(localStorage.getItem("mcqCorrectAnswers") || "{}");
  const inputs = Array.from(document.querySelectorAll(`input[name^='mcq-${topicId}-']`));
  const questionNames = [...new Set(inputs.map(input => input.name))];

  return questionNames.every(qId => answers[qId] && Number(answers[qId]) > 0);
}

function parseDateFromDDMMYYYY(str) {
  const [day, month, year] = str.split('/');
  return new Date(`${year}-${month}-${day}`);
}


console.log("Paragraph Scores:", paragraphScores);
console.log("MCQ Scores:", mcqScores);

console.log("Forms found:", forms.map(f => f.id));
console.log("Answer map:", answers);
