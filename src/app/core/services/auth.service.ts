import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  user
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private auth: Auth = inject(Auth);

  user$: Observable<import('@angular/fire/auth').User | null> = user(this.auth);

  async login(email: string, password: string): Promise<boolean> {

    try {

      await signInWithEmailAndPassword(this.auth, email, password);

      return true;

    } catch {

      return false;

    }

  }

  async logout(): Promise<void> {

    await signOut(this.auth);

  }

}

