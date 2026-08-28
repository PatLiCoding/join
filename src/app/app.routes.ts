import { Routes } from '@angular/router';

import { LoginSection } from './login-section/login-section';
import { LoginComponent } from './login-section/login/login';
import { SignupComponent } from './login-section/signup/signup';

import { MainLayout } from './layout/main-layout/main-layout';
import { SummarySection } from './summary-section/summary-section';
import { AddTaskSection } from './add-task-section/add-task-section';
import { BoardSection } from './board-section/board-section';
import { ContactSection } from './contact-section/contact-section';
import { HelpSection } from './help-section/help-section';
import { LegalNoticeSection } from './legal-notice-section/legal-notice-section';
import { PrivacyPolicySection } from './privacy-policy-section/privacy-policy-section';
import { authGuard, roleGuard } from './auth-functional-guard';

/**
 * Defines the application routes and their access permissions.
 * Protected routes require the user to be authenticated.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    component: LoginSection,
    children: [
      { path: '', component: LoginComponent },
      { path: 'signup', component: SignupComponent },
    ],
  },

  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'summary', component: SummarySection, canActivate: [authGuard] },
      { path: 'add-task', component: AddTaskSection, canActivate: [authGuard] },
      { path: 'board', component: BoardSection, canActivate: [authGuard] },
      { path: 'contacts', component: ContactSection, canActivate: [authGuard] },
      { path: 'help', component: HelpSection, canActivate: [authGuard] },
      { path: 'legal', component: LegalNoticeSection },
      { path: 'privacy', component: PrivacyPolicySection },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
