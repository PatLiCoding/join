import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ContactService } from './firebase-service/contact-service';

/**
 * Root component of the application.
 * Provides the main router outlet and access to the contact service.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Application title. */
  protected readonly title = signal('join');
  /** Contact service used to manage contact data. */
  contactsService = inject(ContactService);
}
