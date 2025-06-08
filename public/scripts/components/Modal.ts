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
    if (this.isVisible) return;
    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.element);

    setTimeout(() => {
      this.backdrop.classList.add('show');
      this.element.classList.add('show');
    }, 10);

    this.isVisible = true;
  }

  hide(): void {
    if (!this.isVisible) return;
    this.backdrop.classList.remove('show');
    this.element.classList.remove('show');

    setTimeout(() => {
      if (this.element.parentElement) document.body.removeChild(this.element);
      if (this.backdrop.parentElement) document.body.removeChild(this.backdrop);
    }, 300);

    this.isVisible = false;
  }
}
