import { Vector2 } from './types';

export class InputState {
  keys: Set<string> = new Set();
  mousePos: Vector2 = { x: 0, y: 0 };
  mouseDown = false;
  mouseJustPressed = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.mouseJustPressed = true;
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseDown = false;
      }
    });

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  consumeMouseClick(): boolean {
    const val = this.mouseJustPressed;
    this.mouseJustPressed = false;
    return val;
  }
}
