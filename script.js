document.addEventListener('DOMContentLoaded', function() {
    // --- DOM ELEMENTS & STATE ---
    const calendarEl = document.getElementById('calendar');
    const scheduleModal = document.getElementById('schedule-modal');
    const equipmentDropdown = document.getElementById('equipment-dropdown');
    const manageListsModal = document.getElementById('manage-lists-modal');
    let scheduleData = {}, isOwner = false, calendar = null; // Add calendar variable here
    
    // --- MASTER DATA ---
    let names = ["Lyndon", "Jack", "Miles", "Caden", "Mike", "Ariel", "Peter", "Perry", "Grant", "Frank", "Mackinnon", "Noah", "Oscar"];
    let equipmentList = ["Excavator - 250 X4", "Excavator - 250 X3", "Loader", "Track Loader", "Standard Dodge", "Skidsteer - 590", "Excavator - Mini", "Skidsteer - 770", "Tandem - #15", "Pile Truck", "Excavator - 2800", "Tandem - #1", "Gas Chevrolet C/w Trailer", "Skidsteer - S70", "2025 Ford C/w Trailer", "Tandem - #20", "Ford F-250", "Tandem - #4", "Water and Sewer Truck", "Skidsteer - T250"];

    // --- INITIALIZATION & SCROLLBAR FIX ---
    fetch('schedule.json')
        .then(res => res.ok ? res.json() : Promise.reject(`Error ${res.status}: Could not load schedule.json.`))
        .then(data => { scheduleData = data || {}; renderCalendar(); })
        .catch(e => { console.error(e); calendarEl.innerHTML = `<p style="color:red; text-align:center;">${e}</p>`; });

        function renderCalendar() {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,dayGridDay' },
            dateClick: (info) => openScheduleModalForDate(info.dateStr),
            // This is crucial for multi-line events
            eventDisplay: 'block',

            events: function(fetchInfo, successCallback, failureCallback) {
                const calendarEvents = [];
                for (const dateStr in scheduleData) {
                    const dayData = scheduleData[dateStr];
                    if (!dayData || Object.keys(dayData).length === 0) continue;

                    // Initialize counters for the new summary
                    let peopleWithTasks = 0;
                    const equipmentInUse = new Set();
                    const equipmentInShop = new Set();
                    let noteCount = 0;
                    let pdfCount = 0;

                    // Loop through all entries for the day (people + shop)
                    for (const name in dayData) {
                        const assignment = dayData[name];
                        if (!assignment) continue;

                        // Tally staff tasks
                        if (names.includes(name) && assignment.task && assignment.task.trim() !== '') {
                            peopleWithTasks++;
                        }

                        // Tally equipment, separating staff use from shop assignment
                        if (assignment.equipment && assignment.equipment.length > 0) {
                            if (name === 'Shop') {
                                assignment.equipment.forEach(e => equipmentInShop.add(e));
                            } else {
                                assignment.equipment.forEach(e => equipmentInUse.add(e));
                            }
                        }

                        // Tally notes and PDFs
                        if (assignment.notes && assignment.notes.trim() !== '') {
                            noteCount++;
                        }
                        if (assignment.pdf && assignment.pdf.trim() !== '') {
                            pdfCount++;
                        }
                    }

                    // Build the summary text lines array
                    const summaryLines = [];
                    if (peopleWithTasks > 0) {
                        summaryLines.push(`${peopleWithTasks} / ${names.length} staff on tasks`);
                    }
                    if (equipmentInUse.size > 0) {
                        summaryLines.push(`${equipmentInUse.size} / ${equipmentList.length} equipment in use`);
                    }
                    if (equipmentInShop.size > 0) {
                        summaryLines.push(`${equipmentInShop.size} equipment in shop`);
                    }
                    if (noteCount > 0) {
                        summaryLines.push(`${noteCount} ${noteCount > 1 ? 'notes' : 'note'}`);
                    }
                    if (pdfCount > 0) {
                        summaryLines.push(`${pdfCount} ${pdfCount > 1 ? 'PDFs' : 'PDF'} inserted`);
                    }

                    // Only create an event if there is something to summarize
                    if (summaryLines.length > 0) {
                        calendarEvents.push({
                            title: summaryLines.join('\n'), // Use newline to separate lines
                            start: dateStr,
                            allDay: true,
                        });
                    }
                }
                successCallback(calendarEvents);
            }
        });
        calendar.render();
    }

    function openScheduleModalForDate(dateStr) {
        document.body.classList.add('noscroll');
        document.getElementById('modal-date').textContent = new Date(dateStr + 'T00:00:00').toDateString();
        const dailySchedule = scheduleData[dateStr] || {};
        renderShopInfo(dailySchedule['Shop'], dateStr);
        renderPersonnelTable(dailySchedule, dateStr);
        document.getElementById('final-json-output').style.display = 'none';
        document.getElementById('owner-save-area').style.display = isOwner ? 'block' : 'none';
        if (isOwner) makeTablesEditable(dateStr);
        scheduleModal.style.display = 'block';
    }

    function closeScheduleModal() {
        scheduleModal.style.display = 'none';
        document.body.classList.remove('noscroll');
    }

    function renderShopInfo(shopData, dateStr) {
        const assignment = shopData || { equipment: [], notes: '', pdf: '' };
        document.getElementById('shop-details').innerHTML = `
            <h3><span style="font-weight:900;"></span> SHOP</h3>
            <table id="shop-table"><tbody>
                <tr><th>Assigned Equipment</th><td data-field="equipment" data-name="Shop">${renderEquipmentTags(assignment.equipment, 'Shop')}</td></tr>
                <tr><th>Notes</th><td data-field="notes" data-name="Shop">${assignment.notes}</td></tr>
                <tr><th>PDF</th><td data-field="pdf" data-name="Shop">${getPdfLink(assignment.pdf)}</td></tr>
            </tbody></table>`;
    }

    function renderPersonnelTable(dailySchedule, dateStr) {
        let html = '<table id="personnel-table"><thead><tr><th>Name</th><th>Task</th><th>Equipment</th><th>Notes</th><th>PDF</th></tr></thead><tbody>';
        names.forEach(name => {
            const assignment = dailySchedule[name] || { task: '', equipment: [], notes: '', pdf: '' };
            html += `<tr data-name="${name}">
                        <td>${name}</td>
                        <td data-field="task">${assignment.task}</td>
                        <td data-field="equipment">${renderEquipmentTags(assignment.equipment, name)}</td>
                        <td data-field="notes">${assignment.notes}</td>
                        <td data-field="pdf">${getPdfLink(assignment.pdf)}</td>
                    </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('schedule-details').innerHTML = html;
    }

    function renderEquipmentTags(equipmentArray, name) {
        if (!Array.isArray(equipmentArray) || equipmentArray.length === 0) return '';
        return equipmentArray.map(equip =>
            `<span class="equipment-tag">${equip}
                ${isOwner ? `<button class="remove-tag-btn" data-equip="${equip}" data-name="${name}">×</button>` : ''}
            </span>`).join('');
    }

    // --- IN-PLACE EDITING LOGIC ---
    function makeTablesEditable(dateStr) {
        ['#shop-table', '#personnel-table'].forEach(selector => {
            const table = document.querySelector(selector);
            if (!table) return;
            table.addEventListener('dblclick', (e) => handleDoubleClick(e.target, dateStr));
            table.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-tag-btn')) handleRemoveTag(e.target, dateStr);
            });
        });
    }

    function handleDoubleClick(target, dateStr) {
        const cell = target.closest('td');
        if (!cell || cell.querySelector('textarea, input')) return;
        const field = cell.dataset.field;
        const name = cell.dataset.name || cell.closest('tr').dataset.name;
        if (!field || !name) return;

        const currentValue = scheduleData[dateStr]?.[name]?.[field] || '';

        if (field === 'equipment') {
            showEquipmentDropdown(cell, name, dateStr);
        } else {
            cell.innerHTML = `<textarea class="editing-textarea">${currentValue}</textarea>`;
            const textarea = cell.querySelector('textarea');
            autoGrow(textarea);
            textarea.focus();
            textarea.addEventListener('input', () => autoGrow(textarea));
            textarea.addEventListener('blur', () => saveEdit(textarea, cell, name, field, dateStr));
            textarea.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); textarea.blur(); }});
        }
    }
    
    function autoGrow(element) {
        element.style.height = 'auto';
        element.style.height = (element.scrollHeight) + 'px';
    }

    function saveEdit(inputElement, cell, name, field, dateStr) {
        if (!scheduleData[dateStr]) scheduleData[dateStr] = {};
        if (!scheduleData[dateStr][name]) scheduleData[dateStr][name] = { task: '', notes: '', pdf: '', equipment: [] };
        scheduleData[dateStr][name][field] = inputElement.value;
        calendar.refetchEvents(); // Refresh calendar summary
        cell.innerHTML = (field === 'pdf') ? getPdfLink(inputElement.value) : inputElement.value;
    }


    function showEquipmentDropdown(cell, name, dateStr) {
        const listDiv = document.getElementById('equipment-dropdown-list');
        const dailySchedule = scheduleData[dateStr] || {};
        const assignedEquipment = new Set(Object.values(dailySchedule).flatMap(p => p.equipment || []));
        const availableEquipment = equipmentList.filter(e => !assignedEquipment.has(e));
        listDiv.innerHTML = '';
        if (availableEquipment.length > 0) {
            availableEquipment.forEach(equip => {
                const item = document.createElement('div');
                item.className = 'item';
                item.textContent = equip;
                item.onclick = () => addEquipmentToPerson(equip, name, dateStr);
                listDiv.appendChild(item);
            });
        } else {
            listDiv.innerHTML = '<div class="item" style="cursor:default;">No equipment available</div>';
        }
        const cellRect = cell.getBoundingClientRect();
        equipmentDropdown.style.left = `${cellRect.left}px`;
        equipmentDropdown.style.top = `${cellRect.bottom}px`;
        equipmentDropdown.style.display = 'block';
        document.body.classList.add('noscroll');
    }

    function hideEquipmentDropdown() {
        equipmentDropdown.style.display = 'none';
    }

    function addEquipmentToPerson(equip, name, dateStr) {
        if (!scheduleData[dateStr]) scheduleData[dateStr] = {};
        if (!scheduleData[dateStr][name]) scheduleData[dateStr][name] = { task: '', notes: '', pdf: '', equipment: [] };
        if (!Array.isArray(scheduleData[dateStr][name].equipment)) scheduleData[dateStr][name].equipment = [];
        scheduleData[dateStr][name].equipment.push(equip);
        hideEquipmentDropdown();
        calendar.refetchEvents(); // Refresh calendar summary
        openScheduleModalForDate(dateStr); // Re-render modal to show change
    }

    function handleRemoveTag(target, dateStr) {
        const { equip, name } = target.dataset;
        const equipArray = scheduleData[dateStr]?.[name]?.equipment || [];
        scheduleData[dateStr][name].equipment = equipArray.filter(e => e !== equip);
        calendar.refetchEvents(); // Refresh calendar summary
        openScheduleModalForDate(dateStr); // Re-render modal to show change
    }

    
    // --- HELPER & OWNER LOGIC ---
    function getPdfLink(pdfPath) { if (!pdfPath) return ''; const fileName = pdfPath.split('/').pop(); return `<a href="${pdfPath}" target="_blank" rel="noopener noreferrer">${fileName}</a>`; }
    document.getElementById('owner-login-btn').addEventListener('click', () => { const secret = prompt("Please enter the secret word:"); if (secret === "yourSecretWord") { isOwner = true; document.getElementById('manage-lists-btn').style.display = 'inline-block'; alert("Owner access granted. Double-click on a cell to edit its content."); } else { isOwner = false; alert("Incorrect secret word."); }});
    document.getElementById('generate-json-btn').addEventListener('click', () => { const outputArea = document.getElementById('final-json-output'); outputArea.value = JSON.stringify(scheduleData, null, 2); outputArea.style.display = 'block'; outputArea.select(); alert("JSON has been generated below. Copy this content and paste it into the schedule.json file on GitHub."); });
    
    // --- LIST MANAGEMENT MODAL LOGIC ---
    document.getElementById('manage-lists-btn').addEventListener('click', () => { populateListManagementModal(); manageListsModal.style.display = 'block'; });
    function populateListManagementModal() {
        const namesListDiv = document.getElementById('names-list');
        const equipmentListDiv = document.getElementById('equipment-list');
        namesListDiv.innerHTML = names.map(n => `<div class="list-item"><span>${n}</span><button data-name="${n}" class="remove-tag-btn">×</button></div>`).join('');
        equipmentListDiv.innerHTML = equipmentList.map(e => `<div class="list-item"><span>${e}</span><button data-equip="${e}" class="remove-tag-btn">×</button></div>`).join('');
        namesListDiv.querySelectorAll('.remove-tag-btn').forEach(btn => btn.onclick = (e) => { names = names.filter(n => n !== e.target.dataset.name); populateListManagementModal(); });
        equipmentListDiv.querySelectorAll('.remove-tag-btn').forEach(btn => btn.onclick = (e) => { equipmentList = equipmentList.filter(eq => eq !== e.target.dataset.equip); populateListManagementModal(); });
    }
    document.getElementById('add-name-btn').addEventListener('click', () => { const input = document.getElementById('new-name-input'); const value = input.value.trim(); if (value && !names.includes(value)) { names.push(value); populateListManagementModal(); input.value = ''; } });
    document.getElementById('add-equipment-btn').addEventListener('click', () => { const input = document.getElementById('new-equipment-input'); const value = input.value.trim(); if (value && !equipmentList.includes(value)) { equipmentList.push(value); populateListManagementModal(); input.value = ''; } });
    document.getElementById('generate-code-btn').addEventListener('click', () => { const code = `// Copy and paste this entire block into your script.js file to save changes.\n\nlet names = ${JSON.stringify(names, null, 4)};\n\nlet equipmentList = ${JSON.stringify(equipmentList, null, 4)};`; document.getElementById('generated-code-output').value = code; });

    // --- MODAL & DROPDOWN CLOSE LOGIC ---
    document.querySelector('#schedule-modal .close-btn').addEventListener('click', closeScheduleModal);
    document.querySelector('#manage-lists-modal .close-btn').addEventListener('click', () => { manageListsModal.style.display = 'none'; });
    document.getElementById('close-dropdown-btn').addEventListener('click', hideEquipmentDropdown);
    window.addEventListener('click', (event) => { if (event.target === scheduleModal) closeScheduleModal(); if (event.target === manageListsModal) manageListsModal.style.display = 'none'; if (equipmentDropdown.style.display === 'block' && !equipmentDropdown.contains(event.target) && !event.target.closest('td[data-field="equipment"]')) hideEquipmentDropdown(); });
});
