/**
 * Attaches a file uploader to a button, reads JSON, calls your callback.
 *
 * @param {HTMLElement} buttonElement - The button element to bind.
 * @param {Function} onRoomLoaded - Callback to receive parsed JSON.
 */
export function bindRoomUploader(buttonElement, onRoomLoaded) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.style.display = 'none';

  document.body.appendChild(input);

  buttonElement.addEventListener('click', () => {
    input.click();
  });

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        onRoomLoaded(data);
      } catch (err) {
        console.error('Failed to parse JSON:', err);
        alert('Invalid JSON file!');
      }
    };
    reader.readAsText(file);
  });
}