const { App, Modal, Notice, Plugin } = require('obsidian');

class Task {
  constructor(id, content, rating) {
    this.id = id;
    this.content = content;
    this.rating = rating;
  }
}

module.exports = class TaskComparisonPlugin extends Plugin {
  async onload() {
    console.log('Loading Task Comparison Plugin');
    this.addCommand({
      id: 'open-task-comparison',
      name: 'Compare Tasks',
      callback: () => this.openTaskInputModal(),
    });
  }

  onunload() {
    console.log('Unloading Task Comparison Plugin');
  }

  openTaskInputModal() {
    new TaskInputModal(this.app, (tasks) => {
      new TaskComparisonModal(this.app, tasks).open();
    }).open();
  }
}

class TaskInputModal extends Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.createEl('h2', { text: 'Enter Tasks' });

    const inputEl = contentEl.createEl('textarea', {
      rows: 10,
      cols: 50,
      placeholder: 'Enter one task per line'
    });

    const submitBtn = contentEl.createEl('button', { text: 'Submit' });
    submitBtn.addEventListener('click', () => {
      const taskContents = inputEl.value.trim().split('\n').filter(task => task.trim() !== '');
      const tasks = taskContents.map((content, index) => new Task(index.toString(), content, 1000));
      this.onSubmit(tasks);
      this.close();
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

class TaskComparisonModal extends Modal {
  constructor(app, tasks) {
    super(app);
    this.tasks = tasks;
  }

  onOpen() {
    this.contentEl.createEl('h2', { text: 'Compare Tasks' });
    this.compareTasks();
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }

  async compareTasks() {
    if (this.tasks.length < 2) {
      new Notice('Not enough tasks to compare.');
      return;
    }

    for (let i = 0; i < this.tasks.length - 1; i++) {
      for (let j = i + 1; j < this.tasks.length; j++) {
        await this.comparePair(this.tasks[i], this.tasks[j]);
      }
    }

    this.displaySortedTasks();
  }

  comparePair(task1, task2) {
    return new Promise((resolve) => {
      this.contentEl.empty();

      let div = this.contentEl.createDiv();
      div.createEl('h3', { text: 'Which task is more important?' });
      let task1Btn = div.createEl('button', { text: task1.content });
      let task2Btn = div.createEl('button', { text: task2.content });

      task1Btn.addEventListener('click', () => {
        this.updateEloRatings(task1, task2, true);
        resolve();
      });

      task2Btn.addEventListener('click', () => {
        this.updateEloRatings(task1, task2, false);
        resolve();
      });
    });
  }

  updateEloRatings(task1, task2, task1Wins) {
    const K = 32; 
    const expectedScore1 = 1 / (1 + Math.pow(10, (task2.rating - task1.rating) / 400));
    const expectedScore2 = 1 - expectedScore1;

    if (task1Wins) {
      task1.rating += K * (1 - expectedScore1);
      task2.rating += K * (0 - expectedScore2);
    } else {
      task1.rating += K * (0 - expectedScore1);
      task2.rating += K * (1 - expectedScore2);
    }
  }

  displaySortedTasks() {
    this.tasks.sort((a, b) => b.rating - a.rating);

    this.contentEl.empty();
    this.contentEl.createEl('h3', { text: 'Sorted Tasks' });

    this.tasks.forEach(task => {
      this.contentEl.createEl('p', { text: `${task.content} (Rating: ${task.rating.toFixed(0)})` });
    });
  }
}
