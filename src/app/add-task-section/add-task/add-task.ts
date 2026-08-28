import { Component } from '@angular/core';
import { AddTaskTemplate } from '../add-task-template/add-task-template';

/**
 * Component representing the standalone add-task view.
 * Encapsulates the core `AddTaskTemplate` to allow task creation within a page view.
 */
@Component({
  selector: 'app-add-task',
  imports: [AddTaskTemplate],
  templateUrl: './add-task.html',
  styleUrl: './add-task.scss',
})
export class AddTask {}
