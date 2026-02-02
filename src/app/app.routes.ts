import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SignupComponent } from './pages/signup/signup.component';
import { PostJobComponent } from './pages/post-job/post-job.component';
import { JobsComponent } from './pages/jobs/jobs.component';
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { ClaimJobComponent } from './pages/claim-job/claim-job.component';
import { SubmitWorkComponent } from './pages/submit-work/submit-work.component';
import { ReviewWorkComponent } from './pages/review-work/review-work.component';
import { AgentClaimComponent } from './pages/agent-claim/agent-claim.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'post-job', component: PostJobComponent },
  { path: 'jobs', component: JobsComponent },
  { path: 'jobs/:id', component: JobDetailComponent },
  { path: 'jobs/:id/claim', component: ClaimJobComponent },
  { path: 'jobs/:id/submit', component: SubmitWorkComponent },
  { path: 'jobs/:id/review', component: ReviewWorkComponent },
  { path: 'agent-claim', component: AgentClaimComponent },
  { path: '**', redirectTo: '' },
];
