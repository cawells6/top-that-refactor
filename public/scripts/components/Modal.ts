// public/scripts/components/Modal.ts
export class Modal {
  private element: HTMLElement;
  private backdrop: HTMLElement;
  private isVisible: boolean = false;

  constructor(content: HTMLElement | string, options: { id?: string; className?: string } = {}) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-overlay';

    this.element = document.createElement('div');
    this.element.className = 'modal ' + (options.className || '');
    if (options.id) this.element.id = options.id;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    if (typeof content === 'string') {
      modalContent.innerHTML = content;
    } else {
      modalContent.appendChild(content);
    }

    this.element.appendChild(modalContent);
  }

  show(): void {
    if (this.isVisible) {
      console.log('📢 Modal already visible, not showing again', this.element.id);
      return;
    }
    console.log('📢 Showing modal', this.element.id);
    
    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.element);

    setTimeout(() => {
      this.backdrop.classList.add('show');
      this.element.classList.add('show');
      console.log('📢 Modal transition started', this.element.id);
    }, 10);

    this.isVisible = true;
  }

  hide(): void {
    if (!this.isVisible) {
      console.log('📢 Modal already hidden, not hiding again', this.element.id);
      return;
    }
    console.log('📢 Hiding modal', this.element.id);
    
    this.backdrop.classList.remove('show');
    this.element.classList.remove('show');

    setTimeout(() => {
      if (this.element.parentElement) document.body.removeChild(this.element);
      if (this.backdrop.parentElement) document.body.removeChild(this.backdrop);
      console.log('📢 Modal removed from DOM', this.element.id);
    }, 300);

    this.isVisible = false;
  }
}
