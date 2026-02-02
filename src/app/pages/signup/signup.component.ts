import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  isSigningIn = false;
  errorMessage = '';

  constructor(private readonly authService: AuthService) {}

  async handleGoogleSignIn(): Promise<void> {
    this.isSigningIn = true;
    this.errorMessage = '';
    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Google sign-in failed.';
    } finally {
      this.isSigningIn = false;
    }
  }
}
