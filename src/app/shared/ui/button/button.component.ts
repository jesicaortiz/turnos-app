import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css']
})
export class ButtonComponent {

  @Input() text = 'Botón';

  @Input() type: 'button' | 'submit' = 'button';

  @Input() fullWidth = false;

  @Input() disabled = false;

}
