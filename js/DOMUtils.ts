/**
 * Utility functions for DOM element access and manipulation
 * Eliminates duplicate getElementById calls and type casting
 */
export class DOMUtils {
    /**
     * Get a button element by ID with proper typing
     */
    static getButton(id: string): HTMLButtonElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Button element with id '${id}' not found`);
        }
        return element as HTMLButtonElement;
    }
    
    /**
     * Get any element by ID with proper typing
     */
    static getElement(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element with id '${id}' not found`);
        }
        return element;
    }
    
    /**
     * Set the disabled state of a button
     */
    static setButtonDisabled(id: string, disabled: boolean): void {
        this.getButton(id).disabled = disabled;
    }
    
    /**
     * Set the text content of an element
     */
    static setElementText(id: string, text: string): void {
        this.getElement(id).textContent = text;
    }
    
    /**
     * Set multiple button states at once
     */
    static setButtonsDisabled(buttonIds: string[], disabled: boolean): void {
        buttonIds.forEach(id => this.setButtonDisabled(id, disabled));
    }
    
    /**
     * Get input element by ID with proper typing
     */
    static getInputElement(id: string): HTMLInputElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Input element with id '${id}' not found`);
        }
        return element as HTMLInputElement;
    }
}
