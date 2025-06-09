// public/scripts/components/Modal.ts
export class Modal {
  public modalElement: HTMLElement;
  protected backdrop: HTMLElement;
  private isVisible = false;

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

    this.backdrop.classList.remove('modal__overlay--hidden');
    this.modalElement.classList.remove('modal--hidden');

    this.modalElement.focus();
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    this.backdrop.classList.add('modal__overlay--hidden');
    this.modalElement.classList.add('modal--hidden');
  }
}
