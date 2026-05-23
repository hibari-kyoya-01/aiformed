const API_BASE = "http://localhost:8000";
let currentSessionId = "session_" + Math.random().toString(36).substr(2, 9);

// Navigation Logic
function showSection(sectionId) {
    // Update UI
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    
    // Find the nav item and set active
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('onclick').includes(sectionId)) {
            item.classList.add('active');
            document.getElementById('section-title').innerText = item.innerText.trim();
        }
    });

    // Trigger specific loads
    if (sectionId === 'dashboard') loadDashboardStats();
}

// 1. Dashboard Logic
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/patient/stats`);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            document.getElementById('stat-total').innerText = stats.total_patients.toLocaleString();
            document.getElementById('stat-age').innerText = stats.avg_age.toFixed(1);

            // Render Conditions
            const conditionsDiv = document.getElementById('conditions-list');
            conditionsDiv.innerHTML = '';
            Object.entries(stats.conditions).slice(0, 8).forEach(([name, count]) => {
                const badge = document.createElement('span');
                badge.className = 'badge badge-blue';
                badge.style.padding = '8px 15px';
                badge.innerText = `${name}: ${count}`;
                conditionsDiv.appendChild(badge);
            });

            // Render Blood Types
            const bloodDiv = document.getElementById('blood-types-list');
            bloodDiv.innerHTML = '';
            Object.entries(stats.blood_types).forEach(([type, count]) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.padding = '8px 0';
                item.style.borderBottom = '1px solid #f0f0f0';
                item.innerHTML = `<strong>${type}</strong> <span>${count} patients</span>`;
                bloodDiv.appendChild(item);
            });
        }
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

// 2. Image Analysis Logic
function previewFile() {
    const preview = document.getElementById('preview-img');
    const file = document.getElementById('file-input').files[0];
    const fileName = document.getElementById('file-name');
    const reader = new FileReader();

    reader.onloadend = function () {
        preview.src = reader.result;
        preview.style.display = "block";
        fileName.innerText = file.name;
    }

    if (file) {
        reader.readAsDataURL(file);
    } else {
        preview.src = "";
        preview.style.display = "none";
        fileName.innerText = "";
    }
}

document.getElementById('analysis-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const btn = document.getElementById('analyze-btn');
    const loader = document.getElementById('analyze-loader');
    const resultBox = document.getElementById('analysis-result');
    const resultContent = document.getElementById('result-content');

    btn.disabled = true;
    loader.style.display = "inline-block";
    resultBox.style.display = "none";

    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        resultBox.style.display = "block";
        if (data.success) {
            let html = `<div style="display:flex; gap:20px; flex-wrap:wrap;">`;
            html += `<div style="flex:1; min-width:250px;">`;
            
            if (data.type === 'xray') {
                html += `<h4>Diagnosis: <span style="color:var(--primary-dark)">${data.result}</span></h4>`;
                html += `<p>Confidence: <strong>${data.confidence}</strong></p>`;
                html += `<div class="mt-2"><strong>All Predictions:</strong></div><ul>`;
                for (let [cls, prob] of Object.entries(data.all_predictions)) {
                    html += `<li>${cls}: ${prob}</li>`;
                }
                html += `</ul>`;
            } else {
                html += `<h4>Total Cells Detected: <span style="color:var(--primary-dark)">${data.total_cells}</span></h4>`;
                html += `<div class="mt-2"><strong>Cell Counts:</strong></div><ul>`;
                for (let [cls, count] of Object.entries(data.cell_counts)) {
                    html += `<li>${cls}: ${count}</li>`;
                }
                html += `</ul>`;
                if (data.message) html += `<p class="mt-2"><em>${data.message}</em></p>`;
            }
            
            html += `</div></div>`;
            resultContent.innerHTML = html;
        } else {
            resultContent.innerHTML = `<p style="color:red;">⚠️ Analysis Error: ${data.error || "Unknown error"}</p>`;
        }
    } catch (error) {
        resultContent.innerHTML = `<p style="color:red;">❌ Connection Error: Cannot connect to Backend at ${API_BASE}</p>`;
    } finally {
        btn.disabled = false;
        loader.style.display = "none";
        resultBox.scrollIntoView({ behavior: 'smooth' });
    }
};

// 3. Chatbot Logic
document.getElementById('chat-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Add user message to UI
    addChatMessage(message, 'user');
    input.value = '';

    try {
        const formData = new FormData();
        formData.append('message', message);
        formData.append('session_id', currentSessionId);

        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            addChatMessage(data.response, 'ai');
        } else {
            const errorMsg = data.error || "เกิดข้อผิดพลาดในการประมวลผล";
            addChatMessage(`⚠️ Backend Error: ${errorMsg}`, 'ai');
            console.error("Full error data:", data);
        }
    } catch (error) {
        addChatMessage("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า Backend รันอยู่", 'ai');
    }
};

function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 4. Patient Search Logic
async function searchPatients() {
    const query = document.getElementById('search-query').value;
    const type = document.getElementById('search-type').value;
    const resultsBody = document.getElementById('patient-results');

    if (!query) return;

    resultsBody.innerHTML = '<tr><td colspan="6" class="text-center">Searching...</td></tr>';

    try {
        const formData = new FormData();
        formData.append('search_query', query);
        formData.append('search_type', type);

        const response = await fetch(`${API_BASE}/patient/search`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success && data.results.length > 0) {
            resultsBody.innerHTML = '';
            data.results.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${p.Name}</strong></td>
                    <td>${p.Age}</td>
                    <td>${p.Gender}</td>
                    <td><span class="badge badge-blue">${p['Blood Type']}</span></td>
                    <td><span class="badge badge-green">${p['Medical Condition']}</span></td>
                    <td>${p.Doctor || 'N/A'}</td>
                `;
                resultsBody.appendChild(tr);
            });
        } else {
            resultsBody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-search"></i> ไม่พบข้อมูลผู้ป่วย</td></tr>';
        }
    } catch (error) {
        resultsBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:red;">❌ Connection Error: Cannot connect to Backend</td></tr>';
    }
}

// Initial Load
window.onload = () => {
    loadDashboardStats();
};
