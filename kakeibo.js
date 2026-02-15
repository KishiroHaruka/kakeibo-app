const db = firebase.firestore();
const auth = firebase.auth();

let uid = null;
let chart = null;

const list = document.getElementById("list");

auth.onAuthStateChanged(user => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  uid = user.uid;
  loadData();
});

function addData() {
  const date = document.getElementById("date").value;
  const amount = Number(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const memo = document.getElementById("memo").value;

  if (!date || !amount) {
    alert("日付と金額は必須です");
    return;
  }

  db.collection("users")
    .doc(uid)
    .collection("kakeibo")
    .add({
      date,
      amount,
      type,
      category,
      memo,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function loadData() {

  db.collection("users")
    .doc(uid)
    .collection("kakeibo")
    .orderBy("date")
    .onSnapshot(snapshot => {

      let total = 0;
      const dataList = [];

      snapshot.forEach(doc => {
        const d = doc.data();

        dataList.push({
          id: doc.id,
          ...d
        });

        total += d.type === "expense" ? -d.amount : d.amount;
      });

      document.getElementById("total").textContent = total.toLocaleString();

      window.currentDataList = dataList;

      renderGroupedList(dataList);
      initYearSelector(dataList);
      calculateMonthly(dataList);
      calculateAverageExpense(dataList);
    });
}

function renderGroupedList(dataList) {

  list.innerHTML = "";

  const grouped = {};

  dataList.forEach(d => {
    if (!d.date) return;

    const month = d.date.substring(0, 7);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(d);
  });

  const now = new Date().toISOString().substring(0, 7);

  Object.keys(grouped).sort().reverse().forEach(month => {

    if (!grouped[month] || grouped[month].length === 0) return;
  
    const details = document.createElement("details");

    const summary = document.createElement("summary");

    let monthTotal = 0;
    grouped[month].forEach(d => {
      monthTotal += d.type === "expense" ? -d.amount : d.amount;
    });

    summary.textContent = `${month}（合計 ${monthTotal.toLocaleString()}円）`;
    details.appendChild(summary);

    const ul = document.createElement("ul");

    grouped[month].forEach(d => {

      const li = document.createElement("li");
      const sign = d.type === "expense" ? "-" : "+";
      const memoSafe = (d.memo || "").replace(/'/g, "\\'");

      li.innerHTML = `
        ${d.date} ${sign}${d.amount.toLocaleString()}円 [${d.category || ""}] ${d.memo || ""}
        <div class="list-actions">
          <button class="list-btn" onclick="editData('${d.id}', ${d.amount}, '${d.category || ""}', '${memoSafe}')">編集</button>
          <button class="list-btn" onclick="deleteData('${d.id}')">削除</button>
        </div>
      `;

      li.style.borderLeft = d.type === "expense"
        ? "4px solid #ff6b6b"
        : "4px solid #4dabf7";

      ul.appendChild(li);
    });

    details.appendChild(ul);
    list.appendChild(details);
  });
}

function editData(id, amount, category, memo) {

  const newAmount = prompt("金額", amount);
  if (newAmount === null) return;

  const newCategory = prompt("カテゴリ", category);
  if (newCategory === null) return;

  const newMemo = prompt("メモ", memo);

  db.collection("users")
    .doc(uid)
    .collection("kakeibo")
    .doc(id)
    .update({
      amount: Number(newAmount),
      category: newCategory,
      memo: newMemo
    });
}

function deleteData(id) {

  if (!confirm("削除しますか？")) return;

  db.collection("users")
    .doc(uid)
    .collection("kakeibo")
    .doc(id)
    .delete();
}

function initYearSelector(dataList) {

  const yearSet = new Set();

  dataList.forEach(item => {
    if (item.date) {
      yearSet.add(item.date.substring(0, 4));
    }
  });

  const yearSelect = document.getElementById("yearSelect");
  yearSelect.innerHTML = "";

  const years = Array.from(yearSet).sort();

  years.forEach(y => {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y + "年";
    yearSelect.appendChild(option);
  });

  const currentYear = new Date().getFullYear().toString();
  if (years.includes(currentYear)) {
    yearSelect.value = currentYear;
  }

  yearSelect.onchange = () => {
    calculateMonthly(window.currentDataList);
    calculateAverageExpense(window.currentDataList);
  };
}

function calculateMonthly(dataList) {

    const selectedYear = document.getElementById("yearSelect").value;
    if (!selectedYear) return;
  
    const monthly = { income: {}, expense: {} };
  
    dataList.forEach(item => {
  
      if (!item.date || !item.date.startsWith(selectedYear)) return;
  
      const month = item.date.substring(0, 7);
  
      if (!monthly.income[month]) monthly.income[month] = 0;
      if (!monthly.expense[month]) monthly.expense[month] = 0;
  
      if (item.type === "expense") {
        monthly.expense[month] += item.amount;
      } else {
        monthly.income[month] += item.amount;
      }
    });
  
    drawChart(monthly);
}

function drawChart(monthly) {

  const canvas = document.getElementById("chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const yearSelect = document.getElementById("yearSelect");
  if (!yearSelect) return;

  const selectedYear = yearSelect.value;

  const labels = [];
  const incomeValues = [];
  const expenseValues = [];

  for (let i = 1; i <= 12; i++) {

    const monthStr = `${selectedYear}-${String(i).padStart(2, "0")}`;

    labels.push(`${i}月`);

    incomeValues.push(monthly.income[monthStr] ?? null);
    expenseValues.push(monthly.expense[monthStr] ?? null);
  }

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "収入",
          data: incomeValues,
          backgroundColor: "rgba(54,162,235,0.6)",
          maxBarThickness: 18,
          borderRadius: 6
        },
        {
          label: "支出",
          data: expenseValues,
          backgroundColor: "rgba(255,99,132,0.6)",
          maxBarThickness: 18,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function calculateAverageExpense(dataList) {
    const selectedYear = document.getElementById("yearSelect").value;
    if (!selectedYear) return;

    const monthly = {};
  
    dataList.forEach(d => {
      if (d.type !== "expense" || !d.date || !d.date.startsWith(selectedYear)) return;
  
      const month = d.date.substring(0,7);
  
      if (!monthly[month]) monthly[month] = 0;
      monthly[month] += d.amount;
    });
  
    const months = Object.keys(monthly).length;
  
    const total = Object.values(monthly).reduce((a,b)=>a+b,0);
  
    const avg = months > 0 ? Math.round(total / months) : 0;
  
    const el = document.getElementById("avgExpense");
    if (el) el.textContent = avg.toLocaleString();
}