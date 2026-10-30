import {
  Directive,
  ElementRef,
  AfterViewInit
} from '@angular/core';

@Directive({
  selector: '[appFadeIn]',
  standalone: true
})
export class FadeInDirective implements AfterViewInit {

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {

    const observer = new IntersectionObserver(
      ([entry]) => {

        if (entry.isIntersecting) {

          this.el.nativeElement.classList.add('show');

          observer.unobserve(this.el.nativeElement);
        }
      },
      {
        threshold: 0.2
      }
    );

    observer.observe(this.el.nativeElement);
  }
}
