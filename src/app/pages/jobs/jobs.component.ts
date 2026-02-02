import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.css',
})
export class JobsComponent {
  jobs = [
    {
      id: 'job-001',
      title: 'Landing page instrumentation',
      budget: '750 USD',
      status: 'OPEN',
      escrow: 'NOT_FUNDED',
      summary: 'Add analytics and conversion tracking to the marketing site.',
    },
    {
      id: 'job-002',
      title: 'Prompt spec cleanup',
      budget: '0.8 ETH',
      status: 'PENDING_REVIEW',
      escrow: 'FUNDED',
      summary: 'Rewrite a legacy task spec into MoltSpec JSON format.',
    },
  ];
}
