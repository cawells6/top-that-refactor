// public/scripts/components/Modal.ts
export class Modal {
  public modalElement: HTMLElement;
  protected backdrop: HTMLElement;
  private isVisible = false;
  private handleBackdropClick = (e: Event): void => {
    if (e.target === this.backdrop) {
      this.hide();
    }
  };

  constructor(element: HTMLElement) {
    this.modalElement = element;

    let backdropElement = document.getElementById('modal-overlay');
    if (!backdropElement) {
      console.warn('Modal backdrop not found, creating one.');
      backdropElement = document.createElement('div');
      backdropElement.className = 'modal__overlay';
      backdropElement.id = 'modal-overlay';
      document.body.appendChild(backdropElement);
    }
    this.backdrop = backdropElement;
  }

  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;

    console.log(`[Modal] show() called for #${this.modalElement.id}`);
    this.backdrop.classList.remove('modal__overlay--hidden');
    this.modalElement.classList.remove('modal--hidden');

    // Close when clicking outside the modal
    this.backdrop.addEventListener('click', this.handleBackdropClick);

    this.modalElement.focus();
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    console.log(`[Modal] hide() called for #${this.modalElement.id}`);
    this.backdrop.classList.add('modal__overlay--hidden');
    this.modalElement.classList.add('modal--hidden');

    this.backdrop.removeEventListener('click', this.handleBackdropClick);
  }
}
