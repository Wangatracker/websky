let peopleOnline = 0;
let uptimeStart = Date.now();

function switchTab(tab) {
  const editors = document.querySelectorAll("textarea");
  editors.forEach(ed => ed.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
}

function runCode() {
  const html = document.getElementById("html").value;
  const css = "<style>" + document.getElementById("css").value + "</style>";
  const js = "<script>" + document.getElementById("js").value + "<\/script>";
  const output = document.getElementById("output");

  output.srcdoc = html + css + js;
}

function clearCode() {
  document.querySelectorAll("textarea").forEach(t => t.value = "");
  document.getElementById("output").srcdoc = "";
}

// Countdown Timer (Uptime)
setInterval(() => {
  let elapsed = Date.now() - uptimeStart;
  let hours = Math.floor(elapsed / (1000 * 60 * 60));
  let minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
  document.getElementById("countdownTimer").textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}, 1000);

function pad(num) {
  return num < 10 ? '0' + num : num;
}

// Online People Count (For Testing)
setInterval(() => {
  peopleOnline += Math.floor(Math.random() * 2); // Simulate increase/decrease of online users
  document.getElementById("onlineCount").textContent = peopleOnline;
}, 5000); // Updates every 5 seconds￼Enter
