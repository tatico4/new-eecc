/**
 * ValidationUtils - Utilidades para validación de datos
 */
class ValidationUtils {
    constructor() {
        console.log('ValidationUtils loaded');
    }

    /**
     * Valida si un archivo es un PDF válido
     */
    static isValidPDF(file) {
        return file && file.type === 'application/pdf';
    }

    /**
     * Valida formato de fecha
     */
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    /**
     * Valida si un monto es válido
     */
    static isValidAmount(amount) {
        return typeof amount === 'number' && !isNaN(amount);
    }

    /**
     * Valida transacción completa
     */
    static isValidTransaction(transaction) {
        return transaction &&
               this.isValidDate(transaction.date) &&
               typeof transaction.description === 'string' &&
               transaction.description.trim().length > 0 &&
               this.isValidAmount(transaction.amount);
    }
}
