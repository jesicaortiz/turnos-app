import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';


import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { MAT_DATE_LOCALE } from '@angular/material/core';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),

    {
      provide: LOCALE_ID,
      useValue: 'es-AR'
    },
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-AR'
    }, provideFirebaseApp(() => initializeApp({"projectId":"turnos-app-4b58c","appId":"1:165530801165:web:cc0363a8220275b5d07144","storageBucket":"turnos-app-4b58c.firebasestorage.app","apiKey":"AIzaSyBOsxGzPA_J_tOsE2n51fApQcbJfhWi-Cg","authDomain":"turnos-app-4b58c.firebaseapp.com","messagingSenderId":"165530801165"})), provideAuth(() => getAuth()), provideFirestore(() => getFirestore())
  ]
};
