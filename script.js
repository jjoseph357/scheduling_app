document.addEventListener('DOMContentLoaded', function() {
    // --- MODALS AND BUTTONS ---
    const calendarEl = document.getElementById('calendar');
    const scheduleModal = document.getElementById('schedule-modal');
    const manageListsModal = document.getElementById('manage-lists-modal');
    const ownerLoginBtn = document.getElementById('owner-login-btn');
    const manageListsBtn = document.getElementById('manage-lists-btn');
    const saveChangesBtn = document.getElementById('save-changes-btn');
    
    // --- MASTER DATA (MANAGEABLE BY OWNER) ---
    // IMPORTANT: To make permanent changes, the owner must update these arrays here in the script.js file.
    let names = ["Lyndon", "Jack", "Miles", "Caden", "Mike", "Ariel", "Peter", "Perry", "Grant", "Frank", "Mackinnon", "Noah", "Oscar"];
    let equipmentList = [
        "Excavator - 250 X4", "Excavator - 250 X3", "Loader", "Track Loader", "Standard Dodge",
        "Skidsteer - 590", "Excavator - Mini", "Skidsteer - 770", "Tandem - #15", "Pile Truck",
        "Excavator - 2800", "Tandem - #1", "Gas Chevrolet C/w Trailer", "Skidsteer - S70",
        "2025 Ford C/w Trailer", "Tandem - #20", "Ford F-250", "Tandem - #4",
        "Water and Sewer Truck", "Skidsteer - T250"
    ];

    // --- APP STATE ---
    let scheduleData = {};
    let isOwner = false;
    let currentEditingPerson = null; // Track who we are adding equipment for


    // --- INITIALIZATION ---
    fetch('schedule.json')
        .then(response => response.ok ? response.json() : Promise.reject(response.status))
        .then(data => {
            scheduleData = data || {};
            renderCalendar();
        })
        .catch(e => console.error("Error loading schedule.json:", e));

    function renderCalendar() {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,dayGridDay' },
            dateClick: (info) => openScheduleModalForDate(info.dateStr)
        });
        calendar.render();
    }

    // --- MODAL DISPLAY LOGIC ---
    function openScheduleModalForDate(dateStr) {
        // This function now primarily handles displaying data. Editing is separate.
        document.getElementById('modal-date').textContent = new Date(dateStr + 'T00:00:00').toDateString();
        const dailySchedule = scheduleData[dateStr] || {};
        renderShopInfo(dailySchedule['Shop']);
        renderPersonnelTable(dailySchedule);
        if (isOwner) {
            document.getElementById('owner-controls').style.display = 'block';
            renderEditingForm(dateStr);
        }
        scheduleModal.style.display = 'block';
    }

    function getPdfLink(pdfPath) {
        if (!pdfPath) return '';
        const fileName = pdfPath.split('/').pop(); // Extracts filename from path
        return `<a href="${pdfPath}" target="_blank">${fileName}</a>`;
    }

    function renderShopInfo(shopData) {
        const shopDetails = document.getElementById('shop-details');
        const assignment = shopData || { equipment: [], notes: '', pdf: '' };
        const equipmentText = assignment.equipment.length > 0 ? assignment.equipment.join(', ') : 'None';
        
        shopDetails.innerHTML = `
            <h3><span style="font-weight:900;"></span> SHOP</h3>
            <p><strong>Equipment Assigned:</strong> ${equipmentText}</p>
            <p><strong>Notes:</strong> ${assignment.notes || 'N/A'}</p>
            <p><strong>PDF:</strong> ${getPdfLink(assignment.pdf)}</p>
        `;
    }

    function renderPersonnelTable(dailySchedule) {
        const scheduleDetails = document.getElementById('schedule-details');
        let html = '<table><tr><th>Name</th><th>Task</th><th>Equipment</th><th>Notes</th><th>PDF</th></tr>';
        
        names.forEach(name => {
            const assignment = dailySchedule[name] || { task: '', equipment: [], notes: '', pdf: '' };
            const equipmentText = assignment.equipment.length > 0 ? assignment.equipment.join('<br>') : '';
            
            html += `<tr>
                <td>${name}</td>
                <td>${assignment.task}</td>
                <td>${equipmentText}</td>
                <td>${assignment.notes}</td>
                <td>${getPdfLink(assignment.pdf)}</td>
            </tr>`;
        });
        html += '</table>';
        scheduleDetails.innerHTML = html;
    }

    // --- OWNER EDITING LOGIC ---
    function renderEditingForm(dateStr) {
        const editForm = document.getElementById('edit-form');
        editForm.innerHTML = ''; // Clear previous form
        editForm.dataset.date = dateStr; // Store current date on the form

        // Render editor for Shop and each person
        ['Shop', ...names].forEach(name => {
            const editorDiv = createPersonEditor(name, dateStr);
            editForm.appendChild(editorDiv);
        });
        updateAllEquipmentDisplays(dateStr); // Initial render of equipment tags
    }


    function createPersonEditor(name, dateStr) {
        const dailySchedule = scheduleData[dateStr] || {};
        const assignment = dailySchedule[name] || { task: '', equipment: [], notes: '', pdf: '' };

        const container = document.createElement('div');
        container.className = 'person-editor';
        container.id = `editor-for-${name}`;
        container.dataset.name = name; // Store name for easy access

        let taskInput = name !== 'Shop' ? `<input type="text" value="${assignment.task || ''}" placeholder="Task" data-field="task">` : '';

        container.innerHTML = `
            <h4>${name}</h4>
            ${taskInput}
            <input type="text" value="${assignment.notes || ''}" placeholder="Notes" data-field="notes">
            <input type="text" value="${assignment.pdf || ''}" placeholder="Path to PDF" data-field="pdf">
            <p><strong>Equipment:</strong></p>
            <div class="equipment-assignment-area" data-field="equipment-tags">
                <!-- Assigned equipment tags will be rendered here by JS -->
            </div>
            <button type="button" class="add-equipment-btn">Add Equipment</button>
        `;

        container.querySelector('.add-equipment-btn').addEventListener('click', () => {
            showEquipmentSelector(name, dateStr);
        });
        
        return container;
    }

    function updateAllEquipmentDisplays(dateStr) {
        const dailySchedule = scheduleData[dateStr] || {};
        const allPeople = ['Shop', ...names];

        allPeople.forEach(name => {
            const assignment = dailySchedule[name] || { equipment: [] };
            const tagsContainer = document.querySelector(`#editor-for-${name} [data-field='equipment-tags']`);
            if (!tagsContainer) return;
            
            tagsContainer.innerHTML = ''; // Clear old tags
            assignment.equipment.forEach(equip => {
                const tag = document.createElement('span');
                tag.className = 'assigned-equipment-tag';
                tag.textContent = equip;
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-equipment-btn';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = () => {
                    // Remove from temporary data and re-render
                    const personSched = dailySchedule[name];
                    personSched.equipment = personSched.equipment.filter(e => e !== equip);
                    updateAllEquipmentDisplays(dateStr);
                };
                tag.appendChild(removeBtn);
                tagsContainer.appendChild(tag);
            });
        });
    }

    function showEquipmentSelector(personName, dateStr) {
        currentEditingPerson = personName; // Set context
        const dailySchedule = scheduleData[dateStr] || {};
        
        const assignedEquipment = new Set();
        Object.values(dailySchedule).forEach(p => {
            if (p.equipment) p.equipment.forEach(e => assignedEquipment.add(e));
        });
        
        const availableEquipment = equipmentList.filter(e => !assignedEquipment.has(e));
        
        const listDiv = document.getElementById('available-equipment-list');
        listDiv.innerHTML = ''; // Clear previous list
        
        if (availableEquipment.length === 0) {
            listDiv.innerHTML = '<div class="item">No more equipment available for this day.</div>';
        } else {
            availableEquipment.forEach(equip => {
                const item = document.createElement('div');
                item.className = 'item';
                item.textContent = equip;
                item.onclick = () => {
                    // Add equipment to the person in the temporary schedule data
                    if (!dailySchedule[currentEditingPerson]) {
                        dailySchedule[currentEditingPerson] = { task: '', equipment: [], notes: '', pdf: '' };
                    }
                    dailySchedule[currentEditingPerson].equipment.push(equip);
                    
                    // Re-render the tags and close the selector
                    updateAllEquipmentDisplays(dateStr);
                    equipmentSelectorModal.style.display = 'none';
                };
                listDiv.appendChild(item);
            });
        }
        equipmentSelectorModal.style.display = 'block';
    }

    // --- SAVE LOGIC ---
    saveChangesBtn.addEventListener('click', () => {
        const editForm = document.getElementById('edit-form');
        const dateStr = editForm.dataset.date;
        let dailySchedule = { ...scheduleData[dateStr] }; // Work on a copy

        document.querySelectorAll('.person-editor').forEach(editor => {
            const name = editor.dataset.name;
            if (!dailySchedule[name]) dailySchedule[name] = {};

            // Read equipment from the tags
            const equipmentTags = editor.querySelectorAll('.assigned-equipment-tag');
            const assignedEquip = Array.from(equipmentTags).map(tag => tag.firstChild.textContent);
            
            dailySchedule[name].equipment = assignedEquip;
            dailySchedule[name].notes = editor.querySelector('[data-field="notes"]').value;
            dailySchedule[name].pdf = editor.querySelector('[data-field="pdf"]').value;
            if (name !== 'Shop') {
                dailySchedule[name].task = editor.querySelector('[data-field="task"]').value;
            }
        });

        scheduleData[dateStr] = dailySchedule; // Commit changes to main data object

        // Display JSON for owner to copy
        const updatedJson = JSON.stringify(scheduleData, null, 2);
        editForm.innerHTML = `<p class="warning"><strong>SAVE COMPLETE!</strong> Manually copy the text below and paste it into your <code>schedule.json</code> file on GitHub.</p><textarea style="width:100%; height: 300px;" readonly>${updatedJson}</textarea>`;
    });


    // --- OWNER LOGIN & LIST MANAGEMENT ---
    ownerLoginBtn.addEventListener('click', () => {
        const secret = prompt("Please enter the secret word:");
        if (secret === "a") { // Replace "yourSecretWord" with your actual secret
            isOwner = true;
            document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'inline-block');
            alert("Owner access granted. You can now edit schedules and manage lists.");
        } else {
            alert("Incorrect secret word.");
        }
    });

    manageListsBtn.addEventListener('click', () => {
        populateListManagementModal();
        manageListsModal.style.display = 'block';
    });

    function populateListManagementModal() {
        const namesListDiv = document.getElementById('names-list');
        const equipmentListDiv = document.getElementById('equipment-list');
        namesListDiv.innerHTML = names.map(n => `<div class="list-item"><span>${n}</span><button data-name="${n}" class="remove-name-btn">×</button></div>`).join('');
        equipmentListDiv.innerHTML = equipmentList.map(e => `<div class="list-item"><span>${e}</span><button data-equip="${e}" class="remove-equip-btn">×</button></div>`).join('');
        
        // Add event listeners for new remove buttons
        document.querySelectorAll('.remove-name-btn').forEach(btn => btn.onclick = (e) => {
            names = names.filter(n => n !== e.target.dataset.name);
            populateListManagementModal(); // Re-render
        });
        document.querySelectorAll('.remove-equip-btn').forEach(btn => btn.onclick = (e) => {
            equipmentList = equipmentList.filter(eq => eq !== e.target.dataset.equip);
            populateListManagementModal(); // Re-render
        });
    }
    
    document.getElementById('add-name-btn').addEventListener('click', () => {
        const newName = document.getElementById('new-name-input').value.trim();
        if (newName && !names.includes(newName)) {
            names.push(newName);
            populateListManagementModal();
            document.getElementById('new-name-input').value = '';
        }
    });

    document.getElementById('add-equipment-btn').addEventListener('click', () => {
        const newEquip = document.getElementById('new-equipment-input').value.trim();
        if (newEquip && !equipmentList.includes(newEquip)) {
            equipmentList.push(newEquip);
            populateListManagementModal();
            document.getElementById('new-equipment-input').value = '';
        }
    });

    document.getElementById('generate-code-btn').addEventListener('click', () => {
        const code = `// --- MASTER DATA (MANAGEABLE BY OWNER) ---
// Copy and paste this entire block into your script.js file to save changes.

let names = ${JSON.stringify(names, null, 4)};

let equipmentList = ${JSON.stringify(equipmentList, null, 4)};`;
        document.getElementById('generated-code-output').value = code;
    });

    // --- GENERIC MODAL CLOSE LOGIC ---
    document.querySelectorAll('.modal .close-btn').forEach(btn => btn.onclick = () => btn.closest('.modal').style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});