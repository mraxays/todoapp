let todos = JSON.parse(localStorage.getItem('todos')) || [];
let notificationPermission = false;

// Request notification permission on page load
if ("Notification" in window) {
    Notification.requestPermission().then(function (permission) {
        notificationPermission = permission === "granted";
    });
}

// Initialize Sortable
const todoList = document.getElementById('todoList');
new Sortable(todoList, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: function (evt) {
        const item = todos[evt.oldIndex];
        todos.splice(evt.oldIndex, 1);
        todos.splice(evt.newIndex, 0, item);
        saveTodos();
    }
});

function getNotificationStyle(priority) {
    const styles = {
        high: {
            emoji: '🚨',
            tone: 'Urgent',
            color: '#e74c3c'
        },
        medium: {
            emoji: '⚡',
            tone: 'Important',
            color: '#f1c40f'
        },
        low: {
            emoji: '📝',
            tone: 'Reminder',
            color: '#2ecc71'
        }
    };
    return styles[priority];
}

function scheduleNotification(todo) {
    if (!notificationPermission || todo.completed) return;

    const dueDate = new Date(todo.dueDate);
    const now = new Date();
    const style = getNotificationStyle(todo.priority);

    // Schedule 1-minute reminder
    const oneMinuteBefore = new Date(dueDate.getTime() - 60000);
    if (oneMinuteBefore > now) {
        setTimeout(() => {
            if (!todo.completed) {
                new Notification(`${style.emoji} ${style.tone} Task Due Soon!`, {
                    body: `"${todo.text}" is due in 1 minute!`,
                    icon: '/path/to/icon.png'
                });
            }
        }, oneMinuteBefore - now);
    }

    // Schedule due time notification
    if (dueDate > now) {
        setTimeout(() => {
            if (!todo.completed) {
                new Notification(`${style.emoji} Task Due Now!`, {
                    body: `"${todo.text}" is due now!`,
                    icon: '/path/to/icon.png'
                });
            }
        }, dueDate - now);
    }

    // Check for overdue tasks every 5 minutes
    setInterval(() => {
        if (!todo.completed && new Date() > dueDate) {
            new Notification(`⚠️ Overdue Task!`, {
                body: `"${todo.text}" is overdue! Please take action.`,
                icon: '/path/to/icon.png'
            });
        }
    }, 300000); // 5 minutes = 300000 milliseconds
}

function showNotification(title, body) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<strong>${title}</strong><br>${body}`;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function updateStats() {
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('pendingTasks').textContent = pendingTasks;

    const progressBar = document.getElementById('progressBar');
    const progress = totalTasks ? (completedTasks / totalTasks) * 100 : 0;
    progressBar.style.width = `${progress}%`;

    document.getElementById('progressText').innerHTML = `${Math.round(progress)}% <i class="ri-check-double-fill"></i>`;
    document.getElementById('completedText').innerHTML = `${completedTasks} <i class="ri-checkbox-circle-fill"></i>`;

    if (completedTasks === 0) {
        document.getElementById('progressText').style.opacity = 0;
        document.getElementById('completedText').style.opacity = 0;
    } else {
        document.getElementById('progressText').style.opacity = 1;
        document.getElementById('completedText').style.opacity = 1;
    }
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
    const container = document.querySelector('.container');
    container.style.transform = 'scale(1.01)';
    setTimeout(() => container.style.transform = 'scale(1)', 200);
    updateStats();
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';

    const sortedTodos = [...todos].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return (a.dueDate || Infinity) - (b.dueDate || Infinity);
    });

    sortedTodos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority}`;
        const originalIndex = todos.findIndex(t => t === todo);

        let timerText = '';
        if (todo.dueDate) {
            const timeLeft = new Date(todo.dueDate) - new Date();
            if (timeLeft > 0) {
                const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                timerText = `<span class="timer-text">⏰ Due in ${days ? days + 'd ' : ''}${hours}h ${minutes}m</span>`;
            } else {
                timerText = '<span class="timer-text">⚠️ Overdue!</span>';
            }
        }

        li.innerHTML = `
            <button class="todo-btn complete-btn" onclick="toggleTodo(${originalIndex})">
                <i class="ri-${todo.completed ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}"></i>
            </button>
            <span class="todo-text">${todo.text}${timerText}</span>
            <button class="todo-btn edit-btn" onclick="editTodo(${originalIndex})">
                <i class="ri-edit-line"></i>
            </button>
            <button class="todo-btn delete-btn" onclick="deleteTodo(${originalIndex})">
                <i class="ri-close-circle-line"></i>
            </button>
        `;

        li.style.animation = 'slideIn 0.3s ease forwards';
        todoList.appendChild(li);
    });

    updateStats();
}
function editTodo(index) {
    const todo = todos[index];
    const newText = prompt('Edit task:', todo.text);
    if (newText !== null && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        renderTodos();
        showNotification('Task Updated! ✏️', `Task edited successfully!`);
    }
}
function addTodo() {
    const input = document.getElementById('todoInput');
    const timerInput = document.getElementById('timerInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const text = input.value.trim();
    const dueDate = timerInput.value ? new Date(timerInput.value) : null;
    const priority = prioritySelect.value;

    if (dueDate && dueDate.getTime() < Date.now()) {
        showNotification('Invalid Date! 🚫', 'Please select a future date.');
        return;
    }

    if (text) {
        const todo = {
            text: text,
            completed: false,
            timestamp: new Date().getTime(),
            dueDate: dueDate ? dueDate.getTime() : null,
            priority: priority
        };

        todos.push(todo);
        const style = getNotificationStyle(priority);
        showNotification(`${style.emoji} Task Added!`, `New ${priority} priority task: ${text}`);

        if (dueDate) {
            scheduleNotification(todo);
        }

        saveTodos();
        renderTodos();
        input.value = '';
        timerInput.value = '';
        prioritySelect.value = 'low';

        const addBtn = document.querySelector('.add-btn');
        addBtn.style.transform = 'scale(0.95)';
        addBtn.style.boxShadow = '0 0 20px var(--primary-color)';
        setTimeout(() => {
            addBtn.style.transform = 'scale(1)';
            addBtn.style.boxShadow = '';
        }, 200);
    }
}

function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    const style = getNotificationStyle(todos[index].priority);
    if (todos[index].completed) {
        showNotification(`${style.emoji} Task Completed!`, `Great job completing: ${todos[index].text}`);
    }
    saveTodos();
    renderTodos();
}

function deleteTodo(index) {
    const todoItem = document.querySelectorAll('.todo-item')[index];
    todoItem.style.animation = 'slideOut 0.3s ease forwards';
    const style = getNotificationStyle(todos[index].priority);
    showNotification(`${style.emoji} Task Deleted!`, `Removed: ${todos[index].text}`);

    setTimeout(() => {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
    }, 300);
}

function clearCompletedTasks() {
    const completedTasks = todos.filter(todo => todo.completed);
    if (completedTasks.length === 0) {
        showNotification('No Tasks to Clear! 🤔', 'There are no completed tasks to clear.');
        return;
    }

    todos = todos.filter(todo => !todo.completed);
    showNotification('Tasks Cleared! 🧹', `Cleared ${completedTasks.length} completed tasks!`);
    saveTodos();
    renderTodos();
}

document.getElementById('todoInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});

function toggleTheme() {
    const theme = document.documentElement.getAttribute("data-theme");
    document.documentElement.style.transition = 'all 0.5s ease';
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
        showNotification('Theme Changed! 🌞', 'Switched to Light Mode');
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
        showNotification('Theme Changed! 🌙', 'Switched to Dark Mode');
    }
}

(function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.getElementById("themeSwitch").checked = savedTheme === "dark";
})();

// Check for due tasks and update UI every minute
setInterval(() => {
    renderTodos();
}, 60000);

// Initialize todos and notifications
renderTodos();
todos.forEach(todo => {
    if (todo.dueDate) {
        scheduleNotification(todo);
    }
});