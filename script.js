document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const modal = document.getElementById('schedule-modal');
    const ownerLoginBtn = document.getElementById('owner-login-btn');
    const ownerControls = document.getElementById('owner-controls');
    const closeBtn = document.querySelector('.close-btn');
    let scheduleData = {};
    let isOwner = false;

    const names = ["Lyndon", "Jack", "Miles", "Caden", "Mike", "Ariel", "Peter", "Perry", "Grant", "Frank", "Mackinnon", "Noah", "Oscar"];
    const equipmentList = [
        "Excavator - 250 X4", "Excavator - 250 X3", "Loader", "Track Loader", "Standard Dodge",
        "Skidsteer - 590", "Excavator - Mini", "Skidsteer - 770", "Tandem - #15", "Pile Truck",
        "Excavator - 2800", "Tandem - #1", "Gas Chevrolet C/w Trailer", "Skidsteer - S70",
        "2025 Ford C/w Trailer", "Tandem - #20", "Ford F-250", "Tandem - #4",
        "Water and Sewer Truck", "Skidsteer - T250", "Shop"
    ];

    // Fetch schedule data from the JSON file
    fetch('schedule.json')
        .then(response => response.json())
        .then(data => {
            scheduleData = data;
            renderCalendar();
        });

    function renderCalendar() {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridDay,dayGridWeek,dayGridMonth'
            },
            dateClick: function(info) {
                displayScheduleForDate(info.dateStr);
            }
        });
        calendar.render();
    }

    function displayScheduleForDate(dateStr) {
        const modalDate = document.getElementById('modal-date');
        const scheduleDetails = document.getElementById('schedule-details');
        const editForm = document.getElementById('edit-form');
        
        modalDate.textContent = dateStr;
        scheduleDetails.innerHTML = '';
        editForm.innerHTML = '';

        const dailySchedule = scheduleData[dateStr] || {};
        
        // Display current schedule
        let html = '<table><tr><th>Name</th><th>Task</th><th>Equipment</th><th>Notes</th><th>PDF</th></tr>';
        names.forEach(name => {
            const assignment = dailySchedule[name] || { task: '', equipment: '', notes: '', pdf: '' };
            html += `<tr>
                <td>${name}</td>
                <td>${assignment.task}</td>
                <td>${assignment.equipment}</td>
                <td>${assignment.notes}</td>
                <td>${assignment.pdf ? `<a href="${assignment.pdf}" target="_blank">View PDF</a>` : ''}</td>
            </tr>`;
        });
        html += '</table>';
        scheduleDetails.innerHTML = html;

        // If owner, show editing form
        if (isOwner) {
            ownerControls.style.display = 'block';
            let formHtml = '';
            names.forEach(name => {
                const assignment = dailySchedule[name] || { task: '', equipment: '', notes: '', pdf: '' };
                formHtml += `<h4>${name}</h4>
                             <input type="text" id="${name}-task" value="${assignment.task}" placeholder="Task">
                             <select id="${name}-equipment">
                                <option value="">None</option>
                                ${getAvailableEquipmentOptions(dateStr, assignment.equipment)}
                             </select>
                             <input type="text" id="${name}-notes" value="${assignment.notes}" placeholder="Notes">
                             <input type="text" id="${name}-pdf" value="${assignment.pdf}" placeholder="Path to PDF (e.g., pdfs/file.pdf)">`;
            });
            editForm.innerHTML = formHtml;
        }

        modal.style.display = 'block';
    }

    function getAvailableEquipmentOptions(dateStr, currentEquipment) {
        const dailySchedule = scheduleData[dateStr] || {};
        const assignedEquipment = new Set();

        for (const name in dailySchedule) {
            if (dailySchedule[name].equipment && dailySchedule[name].equipment !== currentEquipment) {
                assignedEquipment.add(dailySchedule[name].equipment);
            }
        }
        
        if (dailySchedule.Shop && dailySchedule.Shop.equipment_reserved) {
            dailySchedule.Shop.equipment_reserved.forEach(e => assignedEquipment.add(e));
        }

        return equipmentList.map(e => {
            const isAssigned = assignedEquipment.has(e);
            const isSelected = e === currentEquipment;
            return `<option value="${e}" ${isSelected ? 'selected' : ''} ${isAssigned ? 'disabled' : ''}>${e}</option>`;
        }).join('');
    }

    // Owner Login
    ownerLoginBtn.addEventListener('click', () => {
        const secret = prompt("Please enter the secret word:");
        if (secret === "secret") { // Replace with secret word
            isOwner = true;
            alert("Owner access granted.");
        } else {
            alert("Incorrect secret word.");
        }
    });

    // Save Changes (Owner only)
    document.getElementById('save-changes-btn').addEventListener('click', () => {
        const dateStr = document.getElementById('modal-date').textContent;
        scheduleData[dateStr] = {};
        
        names.forEach(name => {
            scheduleData[dateStr][name] = {
                task: document.getElementById(`${name}-task`).value,
                equipment: document.getElementById(`${name}-equipment`).value,
                notes: document.getElementById(`${name}-notes`).value,
                pdf: document.getElementById(`${name}-pdf`).value
            };
        });

        // This is the manual step:
        alert("Data is ready to be saved. Copy the following text and paste it into your schedule.json file on GitHub.");
        console.log(JSON.stringify(scheduleData, null, 2));
        // For a more user-friendly approach, you could display this in a textarea
        const updatedJson = JSON.stringify(scheduleData, null, 2);
        const dataArea = document.createElement('textarea');
        dataArea.value = updatedJson;
        dataArea.style.width = '100%';
        dataArea.style.height = '300px';
        document.getElementById('edit-form').appendChild(dataArea);
    });

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
});