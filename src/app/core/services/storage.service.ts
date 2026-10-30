import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);

    if (!data) {
      return defaultValue;
    }

    try {
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
