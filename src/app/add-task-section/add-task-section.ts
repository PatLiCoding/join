import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddTask } from './add-task/add-task';

/**
 * Layout section component hosting the `AddTask` view context.
 * Serves as a container for embedding the task creation interface into broader views.
 */
@Component({
  selector: 'app-add-task-section',
  standalone: true,
  imports: [CommonModule, AddTask],
  templateUrl: './add-task-section.html',
  styleUrls: ['./add-task-section.scss'],
})
export class AddTaskSection {}
