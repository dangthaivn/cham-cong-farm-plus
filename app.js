/**
 * Bảng chấm công Farm Plus — PWA frontend.
 *
 * Cách nối dữ liệu thật:
 *  1. Thêm file api.gs (kèm theo) vào project Apps Script của bảng chấm công,
 *     triển khai lại Web App với quyền truy cập "Bất kỳ ai" (Anyone).
 *  2. Dán URL /exec mới vào API_URL dưới đây.
 *  3. Khi API_URL còn trống, app chạy bằng DEMO_DATA và hiện banner "dữ liệu mẫu".
 */
const API_URL = "https://script.google.com/macros/s/AKfycbwaAjzjPY5QBLNPDOqvpbmOZLacO-Xw7e7IaQIC6TQLNpm8T2MSB_hg7Y_WAdsU1_H0/exec"; // API bảng chấm công Farm Plus — đã kiểm chứng ngày 24/11/2026, trả đúng dữ liệu tháng 11

const HOURLY_RATE = 26000;

// Dữ liệu mẫu GIẢ ĐỊNH (không phải dữ liệu thật) — chỉ hiển thị khi chưa nối được API.
// Dữ liệu thật luôn lấy trực tiếp từ Sheets qua API, không nằm trong file này.
const DEMO_DATA = {
  "month": "2026-11",
  "totalsByDay": {"3": 18, "4": 18.5, "5": 17},
  "issuesByDay": {},
  "employees": [
    {"id": "nv-1", "name": "Nhân viên mẫu A", "ca": "Ca ngày", "rate": 20000, "hours": 36, "soCaChuyenCan": 0, "thuongGanBo": 0, "phuCap": 0, "tienPhat": 0, "days": [{"date": "05/11", "in": "08:00", "out": "17:00", "hours": 9, "note": ""}, {"date": "04/11", "in": "08:00", "out": "17:30", "hours": 9.5, "note": ""}, {"date": "03/11", "in": "08:00", "out": "17:30", "hours": 9.5, "note": ""}, {"date": "02/11", "in": "08:00", "out": "16:00", "hours": 8, "note": ""}]},
    {"id": "nv-2", "name": "Nhân viên mẫu B", "ca": "Ca tối", "rate": 18000, "hours": 18, "soCaChuyenCan": 0, "thuongGanBo": 0, "phuCap": 0, "tienPhat": 0, "days": []}
  ]
};

const state = { month: "2026-11", data: null, demo: true };
const $ = (s) => document.querySelector(s);
const fmt = (n) => n.toLocaleString("vi-VN");

async function loadMonth(month) {
  const sync = $("#syncState");
  sync.textContent = "Đang tải Sheets…";
  sync.classList.remove("ok");
  if (!API_URL) {
    state.data = DEMO_DATA;
    state.demo = true;
    $("#demoBanner").hidden = false;
    sync.textContent = "Chưa nối Sheets — đang xem dữ liệu mẫu";
    render();
    return;
  }
  try {
    const res = await fetch(`${API_URL}?action=getMonth&month=${month}`, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    state.data = await res.json();
    state.demo = false;
    $("#demoBanner").hidden = true;
    sync.textContent = "Đã đồng bộ Sheets";
    sync.classList.add("ok");
  } catch (err) {
    state.data = DEMO_DATA;
    state.demo = true;
    $("#demoBanner").hidden = false;
    sync.textContent = "Không nối được Sheets — đang xem dữ liệu mẫu";
  }
  render();
}

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return `tháng ${m} năm ${y}`;
}

function render() {
  $("#monthLabel").textContent = monthLabel(state.month);
  renderCalendar();
  renderEmployeeList();
}

function renderCalendar() {
  const cal = $("#calendar");
  const [y, m] = state.month.split("-").map(Number);
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Thứ 2 = 0
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
  let html = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
    .map((d) => `<div class="cal-head">${d}</div>`).join("");
  for (let i = 0; i < firstDow; i++) html += `<div class="day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const total = state.data.totalsByDay[d];
    const issue = state.data.issuesByDay[d];
    const cls = ["day"];
    if (isCurrentMonth && d === today.getDate()) cls.push("today");
    if (issue) cls.push("issue");
    html += `<div class="${cls.join(" ")}"><span class="dnum">${d}</span>` +
      (total != null ? `<span class="dhours">${String(total).replace(".", ",")}h</span>` : "") +
      `</div>`;
  }
  cal.innerHTML = html;
}

function salaryOf(emp) {
  const base = emp.hours * emp.rate;
  // Thưởng chuyên cần = SoCaChuyenCan × 200.000đ — GIẢ ĐỊNH, Sếp đối chiếu
  // với bản gốc giúp Sen (đã khớp đúng 1 người, còn 2 người chưa đối chiếu).
  const bonusChuyenCan = (emp.soCaChuyenCan || 0) * 200000;
  return {
    base,
    bonusChuyenCan,
    total: base + bonusChuyenCan + (emp.thuongGanBo || 0) + (emp.phuCap || 0) - (emp.tienPhat || 0)
  };
}

function renderEmployeeList() {
  const list = $("#employeeList");
  list.innerHTML = state.data.employees.map((e) => {
    const s = salaryOf(e);
    return `<button class="employee-card" data-id="${e.id}" type="button">
      <strong>${e.name}</strong>
      <span>${e.hours} giờ · Lương ${fmt(s.total)}đ</span>
    </button>`;
  }).join("");
  list.querySelectorAll(".employee-card").forEach((btn) => {
    btn.addEventListener("click", () => showEmployee(btn.dataset.id));
  });
  $("#employeeDetail").hidden = true;
}

function showEmployee(id) {
  const emp = state.data.employees.find((e) => e.id === id);
  if (!emp) return;
  const s = salaryOf(emp);
  const rows = emp.days.length
    ? emp.days.map((d) => `<tr><td>${d.date}</td><td>${d.in || "—"}</td><td>${d.out || "—"}</td><td>${d.hours}</td><td>${d.note}</td></tr>`).join("")
    : `<tr><td colspan="5">Chưa có chi tiết ca — xem trên bản đầy đủ sau khi nối Sheets.</td></tr>`;
  $("#employeeDetail").innerHTML = `
    <button class="back-link" id="backBtn" type="button">‹ Quay lại danh sách</button>
    <h3>${emp.name}</h3>
    <table>
      <thead><tr><th>Ngày</th><th>Vào</th><th>Ra</th><th>Giờ</th><th>Ghi chú</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="salary">
      <div class="row"><span>${emp.hours} giờ × ${fmt(emp.rate)}đ/giờ</span><span>${fmt(s.base)}đ</span></div>
      <div class="row"><span>Thưởng chuyên cần (${emp.soCaChuyenCan || 0} ca)</span><span>${fmt(s.bonusChuyenCan)}đ</span></div>
      <div class="row"><span>Thưởng gắn bó</span><span>${fmt(emp.thuongGanBo || 0)}đ</span></div>
      <div class="row"><span>Phụ cấp</span><span>${fmt(emp.phuCap || 0)}đ</span></div>
      <div class="row"><span>Tiền phạt</span><span>−${fmt(emp.tienPhat || 0)}đ</span></div>
      <div class="row total"><span>Tổng lương</span><span>${fmt(s.total)}đ</span></div>
    </div>
    <button class="btn btn-primary" type="button" onclick="window.print()">In phiếu lương</button>`;
  $("#employeeDetail").hidden = false;
  $("#backBtn").addEventListener("click", () => { $("#employeeDetail").hidden = true; });
}

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const view = tab.dataset.view;
    $("#view-overview").hidden = view !== "overview";
    $("#view-employees").hidden = view !== "employees";
  });
});

// Đổi tháng (bản mẫu chỉ có dữ liệu tháng 11/2026)
function shiftMonth(delta) {
  const [y, m] = state.month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  state.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  loadMonth(state.month);
}
$("#prevMonth").addEventListener("click", () => shiftMonth(-1));
$("#nextMonth").addEventListener("click", () => shiftMonth(1));

// Đăng nhập Quản lý — bản mẫu: kiểm tra thật sẽ do API phía server làm (api.gs).
const modal = $("#loginModal");
$("#adminBtn").addEventListener("click", () => { modal.hidden = false; });
$("#loginCancel").addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.hidden = true; });
$("#loginSubmit").addEventListener("click", async () => {
  const user = $("#loginUser").value.trim();
  const pass = $("#loginPass").value;
  const err = $("#loginError");
  if (!API_URL) {
    err.textContent = "Chưa nối API nên chưa đăng nhập được — đây là bản giao diện mẫu.";
    err.hidden = false;
    return;
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "login", user, pass })
    });
    const data = await res.json();
    if (data.ok) {
      modal.hidden = true;
      alert("Đăng nhập thành công. (Màn hình quản trị sẽ mở ở bước tiếp theo.)");
    } else {
      err.textContent = "Sai tên đăng nhập hoặc mật khẩu.";
      err.hidden = false;
    }
  } catch (e) {
    err.textContent = "Không nối được máy chủ, thử lại sau.";
    err.hidden = false;
  }
});

// Service worker — bắt buộc cho PWA (cài đặt + chạy offline phần giao diện).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

loadMonth(state.month);
