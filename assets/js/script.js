let todos = JSON.parse(localStorage.getItem("todos")) || [];
let notificationPermission = false;
document.getElementById("year").textContent = new Date().getFullYear();

// Create audio elements for notifications
const addSound = new Audio('assets/sounds/add.wav');
const completeSound = new Audio('assets/sounds/complete.mp3');
const dueSound = new Audio('assets/sounds/alert.mp3');
const overdueSound = new Audio('assets/sounds/alert.mp3');

// Initialize notification permission
if ("Notification" in window) {
  Notification.requestPermission().then(function (permission) {
    notificationPermission = permission === "granted";
  }).catch((err) => {
    console.error("Error requesting notification permission:", err);
  });
}

// Initialize Sortable
const todoList = document.getElementById("todoList");
if (todoList) {
  new Sortable(todoList, {
    animation: 150,
    ghostClass: "sortable-ghost", 
    dragClass: "sortable-drag",
    onEnd: function (evt) {
      const movedItem = todos[evt.oldIndex];
      todos.splice(evt.oldIndex, 1);
      todos.splice(evt.newIndex, 0, movedItem);
      saveTodos();
      renderTodos();
    },
  });
}

function getNotificationStyle(priority) {
  const styles = {
    high: {
      emoji: "🚨",
      tone: "Urgent",
      color: "#e74c3c",
    },
    medium: {
      emoji: "⚡",
      tone: "Important", 
      color: "#f1c40f",
    },
    low: {
      emoji: "📝",
      tone: "Reminder",
      color: "#2ecc71",
    },
  };
  return styles[priority] || styles.low;
}

function scheduleNotification(todo) {
  if (!todo || !todo.dueDate || !notificationPermission || todo.completed) return;

  const dueDate = new Date(todo.dueDate);
  const now = new Date();
  const style = getNotificationStyle(todo.priority);

  // Show notification when alarm is set
  showNotification(
    `${style.emoji} Alarm Set!`,
    `Reminder set for "${todo.text}" on ${dueDate.toLocaleString()}`
  );

  // Schedule notifications
  if ("Notification" in window) {
    // Schedule 1-minute reminder
    const oneMinuteBefore = new Date(dueDate.getTime() - 60000);
    if (oneMinuteBefore > now) {
      const oneMinTimer = setTimeout(() => {
        if (!todo.completed) {
          new Notification(`${style.emoji} ${style.tone} Task Due Soon!`, {
            body: `"${todo.text}" is due in 1 minute!`,
            icon: "assets/img/favicon/icon-512x512.png",
            tag: `reminder-${todo.timestamp}-1min`,
            vibrate: [200, 100, 200],
            renotify: true,
            silent: false
          });

          try {
            dueSound.play().catch(() => {});
          } catch (err) {
            console.warn('Sound play error:', err);
          }
        }
      }, oneMinuteBefore - now);

      todo.oneMinTimer = oneMinTimer;
    }

    // Schedule due time notification  
    if (dueDate > now) {
      const dueTimer = setTimeout(() => {
        if (!todo.completed) {
          new Notification(`${style.emoji} Task Due Now!`, {
            body: `"${todo.text}" is due now!`,
            icon: "assets/img/favicon/icon-512x512.png",
            tag: `reminder-${todo.timestamp}-due`,
            vibrate: [200, 100, 200],
            renotify: true,
            silent: false
          });

          try {
            dueSound.play().catch(() => {});
          } catch (err) {
            console.warn('Sound play error:', err);
          }
        }
      }, dueDate - now);

      todo.dueTimer = dueTimer;
    }

    // Check for overdue tasks
    const checkOverdue = setInterval(() => {
      if (new Date() > dueDate && !todo.completed) {
        new Notification(`⚠️ Overdue Task!`, {
          body: `"${todo.text}" is overdue! Please take action.`,
          icon: "assets/img/favicon/icon-512x512.png", 
          tag: `reminder-${todo.timestamp}-overdue`,
          vibrate: [200, 100, 200],
          renotify: true,
          silent: false
        });

        try {
          overdueSound.play().catch(() => {});
        } catch (err) {
          console.warn('Sound play error:', err);
        }

        clearInterval(checkOverdue);
      }
    }, 60000);

    todo.overdueInterval = checkOverdue;
  }
}

function showNotification(title, body) {
  if (!title || !body) return;

  const notification = document.createElement("div");
  notification.className = "notification";
  notification.innerHTML = `<strong>${escapeHtml(title)}</strong><br>${escapeHtml(body)}`;
  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.classList.add("show");
  });

  const hideTimeout = setTimeout(() => {
    notification.classList.remove("show");
    const removeTimeout = setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
      clearTimeout(removeTimeout);
    }, 300);
    clearTimeout(hideTimeout);
  }, 5000);
}

function updateStats() {
  const totalTasks = todos.length;
  const completedTasks = todos.filter((todo) => todo.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  const elements = {
    totalTasks: document.getElementById("totalTasks"),
    completedTasks: document.getElementById("completedTasks"), 
    pendingTasks: document.getElementById("pendingTasks"),
    progressBar: document.getElementById("progressBar"),
    progressText: document.getElementById("progressText"),
    completedText: document.getElementById("completedText")
  };

  if (elements.totalTasks) elements.totalTasks.textContent = totalTasks;
  if (elements.completedTasks) elements.completedTasks.textContent = completedTasks;
  if (elements.pendingTasks) elements.pendingTasks.textContent = pendingTasks;

  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (elements.progressBar) {
    elements.progressBar.style.width = `${progress}%`;
  }

  if (elements.progressText) {
    elements.progressText.innerHTML = `${progress}% <i class="ri-check-double-fill"></i>`;
    elements.progressText.style.opacity = completedTasks === 0 ? 0 : 1;
  }

  if (elements.completedText) {
    elements.completedText.innerHTML = `${completedTasks} <i class="ri-checkbox-circle-fill"></i>`;
    elements.completedText.style.opacity = completedTasks === 0 ? 0 : 1;
  }
}

function saveTodos() {
  try {
    localStorage.setItem("todos", JSON.stringify(todos));
    const container = document.querySelector(".container");
    if (container) {
      container.style.transform = "scale(1.01)";
      setTimeout(() => (container.style.transform = "scale(1)"), 200);
    }
    updateStats();
  } catch (err) {
    console.error('Error saving todos:', err);
    showNotification('Error!', 'Failed to save todos');
  }
}

function renderTodos() {
  const todoList = document.getElementById("todoList");
  if (!todoList) return;

  todoList.innerHTML = "";

  // Sort todos by priority, completion status, and due date
  const sortedTodos = [...todos].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  todos = sortedTodos;

  todos.forEach((todo, index) => {
    const li = document.createElement("li");
    li.className = `todo-item ${todo.completed ? "completed" : ""} priority-${
      todo.priority || 'low'
    }`;

    let timerText = "";
    let timerInterval;

    if (todo.dueDate) {
      const updateTimer = () => {
        const timeLeft = new Date(todo.dueDate) - new Date();
        const timerSpan = li.querySelector('.timer-text');
        if (!timerSpan) {
          clearInterval(timerInterval);
          return;
        }

        if (timeLeft > 0) {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          timerSpan.innerHTML = `⏰ Due in ${days ? days + "d " : ""}${hours}h ${minutes}m`;
        } else {
          timerSpan.innerHTML = '⚠️ Overdue!';
          if (!todo.completed) {
            try {
              overdueSound.play().catch(() => {});
            } catch (err) {
              console.warn('Sound play error:', err);
            }
          }
          clearInterval(timerInterval);
        }
      };

      const timeLeft = new Date(todo.dueDate) - new Date();
      if (timeLeft > 0) {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        timerText = `<span class="timer-text">⏰ Due in ${
          days ? days + "d " : ""
        }${hours}h ${minutes}m</span>`;
        timerInterval = setInterval(updateTimer, 60000);
      } else {
        timerText = '<span class="timer-text">⚠️ Overdue!</span>';
        if (!todo.completed) {
          try {
            overdueSound.play().catch(() => {});
          } catch (err) {
            console.warn('Sound play error:', err);
          }
        }
      }
    }

    li.innerHTML = `
      <button class="todo-btn complete-btn" onclick="toggleTodo(${index})">
        <i class="ri-${
          todo.completed ? "checkbox-circle-fill" : "checkbox-blank-circle-line"
        }"></i>
      </button>
      <span class="todo-text">${escapeHtml(todo.text)}${timerText}</span>
      <button class="todo-btn edit-btn" onclick="editTodo(${index})">
        <i class="ri-edit-line"></i>
      </button>
      <button class="todo-btn delete-btn" onclick="deleteTodo(${index})">
        <i class="ri-close-circle-line"></i>
      </button>
    `;

    li.style.animation = "slideIn 0.3s ease forwards";
    todoList.appendChild(li);
  });

  updateStats();
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function editTodo(index) {
  const todo = todos[index];
  if (!todo) return;

  const newText = prompt("Edit task:", todo.text);
  if (newText !== null && newText.trim() !== "") {
    todo.text = newText.trim();
    saveTodos();
    renderTodos();
    showNotification("Task Updated! ✏️", `Task edited successfully!`);
  }
}

function addTodo() {
  const input = document.getElementById("todoInput");
  const timerInput = document.getElementById("timerInput");
  const prioritySelect = document.getElementById("prioritySelect");

  if (!input || !timerInput || !prioritySelect) return;

  const text = input.value.trim();
  const dueDate = timerInput.value ? new Date(timerInput.value) : null;
  const priority = prioritySelect.value;

  if (dueDate && dueDate.getTime() < Date.now()) {
    showNotification("Invalid Date! 🚫", "Please select a future date.");
    return;
  }

  if (text) {
    const todo = {
      text: text,
      completed: false,
      timestamp: Date.now(),
      dueDate: dueDate ? dueDate.getTime() : null,
      priority: priority,
    };

    todos.push(todo);
    const style = getNotificationStyle(priority);
    showNotification(
      `${style.emoji} Task Added!`,
      `New ${priority} priority task: ${text}`
    );

    try {
      addSound.play().catch(() => {});
    } catch (err) {
      console.warn('Sound play error:', err);
    }

    if (dueDate) {
      scheduleNotification(todo);
    }

    saveTodos();
    renderTodos();
    input.value = "";
    timerInput.value = "";
    prioritySelect.value = "low";

    const addBtn = document.querySelector(".add-btn");
    if (addBtn) {
      addBtn.style.transform = "scale(0.95)";
      addBtn.style.boxShadow = "0 0 20px var(--primary-color)";
      setTimeout(() => {
        addBtn.style.transform = "scale(1)";
        addBtn.style.boxShadow = "";
      }, 200);
    }
  }
}

function toggleTodo(index) {
  const todo = todos[index];
  if (!todo) return;

  todo.completed = !todo.completed;

  if (todo.completed) {
    if (todo.oneMinTimer) clearTimeout(todo.oneMinTimer);
    if (todo.dueTimer) clearTimeout(todo.dueTimer);
    if (todo.overdueInterval) clearInterval(todo.overdueInterval);
  }

  const style = getNotificationStyle(todo.priority);
  if (todo.completed) {
    showNotification(
      `${style.emoji} Task Completed!`,
      `Great job completing: ${todo.text}`
    );
    try {
      completeSound.play().catch(() => {});
    } catch (err) {
      console.warn('Sound play error:', err);
    }
  }
  saveTodos();
  renderTodos();
}

function deleteTodo(index) {
  const todo = todos[index];
  if (!todo) return;

  if (todo.oneMinTimer) clearTimeout(todo.oneMinTimer);
  if (todo.dueTimer) clearTimeout(todo.dueTimer);
  if (todo.overdueInterval) clearInterval(todo.overdueInterval);

  const todoItem = document.querySelectorAll(".todo-item")[index];
  if (todoItem) {
    todoItem.style.animation = "slideOut 0.3s ease forwards";
  }

  const style = getNotificationStyle(todo.priority);
  showNotification(
    `${style.emoji} Task Deleted!`,
    `Removed: ${todo.text}`
  );

  setTimeout(() => {
    todos.splice(index, 1);
    saveTodos();
    renderTodos();
  }, 300);
}

function clearCompletedTasks() {
  const completedTasks = todos.filter((todo) => todo.completed);
  if (completedTasks.length === 0) {
    showNotification(
      "No Tasks to Clear! 🤔",
      "There are no completed tasks to clear."
    );
    return;
  }

  completedTasks.forEach((todo) => {
    if (todo.oneMinTimer) clearTimeout(todo.oneMinTimer);
    if (todo.dueTimer) clearTimeout(todo.dueTimer);
    if (todo.overdueInterval) clearInterval(todo.overdueInterval);
  });

  todos = todos.filter((todo) => !todo.completed);
  showNotification(
    "Tasks Cleared! 🧹",
    `Cleared ${completedTasks.length} completed tasks!`
  );
  saveTodos();
  renderTodos();
}

const todoInput = document.getElementById("todoInput");
if (todoInput) {
  todoInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      addTodo();
    }
  });
}

function toggleTheme() {
  const root = document.documentElement;
  if (!root) return;

  const theme = root.getAttribute("data-theme") || "light";
  root.style.transition = "all 0.5s ease";

  const newTheme = theme === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  showNotification(
    `Theme Changed! ${newTheme === "light" ? "🌞" : "🌙"}`,
    `Switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Mode`
  );
}

(function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  const root = document.documentElement;
  const themeSwitch = document.getElementById("themeSwitch");

  if (root) root.setAttribute("data-theme", savedTheme);
  if (themeSwitch) themeSwitch.checked = savedTheme === "dark";
})();

let updateInterval = setInterval(() => {
  renderTodos();
}, 60000);

renderTodos();
todos.forEach((todo) => {
  if (todo.dueDate) {
    scheduleNotification(todo);
  }
});

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.style.display = "block";
  }
});

const installBtn = document.getElementById("installBtn");
if (installBtn) {
  installBtn.addEventListener("click", () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        } else {
          console.log("User dismissed the install prompt");
        }
        installBtn.style.display = "none";
        deferredPrompt = null;
      });
    }
  });
}

window.addEventListener("appinstalled", () => {
  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.style.display = "none";
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInterval(updateInterval);
  } else {
    updateInterval = setInterval(() => {
      renderTodos();
    }, 60000);
    renderTodos();
  }
});