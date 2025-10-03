/**
 * AbstractBankParser - Clase base para todos los parsers de bancos
 * Define la interfaz común que deben implementar los parsers específicos
 */
class AbstractBankParser {
    constructor() {
        if (this.constructor === AbstractBankParser) {
            throw new Error("AbstractBankParser no puede ser instanciado directamente");
        }
    }

    /**
     * Método principal para parsear una línea de transacción
     * @param {string} line - Línea raw del estado de cuenta
     * @returns {Object|null} - {date, description, amount, rawLine, confidence} o null
     */
    parseTransaction(line) {
        throw new Error("parseTransaction debe ser implementado por la clase hija");
    }

    /**
     * Parsea múltiples líneas de transacciones
     * @param {string[]} lines - Array de líneas raw
     * @returns {Object[]} - Array de transacciones parseadas
     */
    parseMultipleTransactions(lines) {
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            try {
                const transaction = this.parseTransaction(line);
                if (transaction) {
                    transaction.lineNumber = i + 1;
                    results.push(transaction);
                }
            } catch (error) {
                console.warn(`Error parseando línea ${i + 1}: ${line}`, error);
            }
        }

        return results;
    }

    /**
     * Identifica si este parser puede procesar el texto dado
     * @param {string} text - Texto completo del documento
     * @returns {Object} - {canParse: boolean, confidence: number, bankName: string}
     */
    canParse(text) {
        throw new Error("canParse debe ser implementado por la clase hija");
    }

    /**
     * Obtiene información sobre el banco/producto que maneja este parser
     * @returns {Object} - {bankName, productType, version}
     */
    getBankInfo() {
        throw new Error("getBankInfo debe ser implementado por la clase hija");
    }

    /**
     * Valida que una transacción parseada sea válida
     * @param {Object} transaction - Transacción a validar
     * @returns {boolean} - true si es válida
     */
    validateTransaction(transaction) {
        if (!transaction || typeof transaction !== 'object') {
            return false;
        }

        // Validaciones básicas
        const hasValidDate = transaction.date && this.isValidDate(transaction.date);
        const hasDescription = transaction.description && transaction.description.trim().length > 0;
        const hasValidAmount = typeof transaction.amount === 'number' && !isNaN(transaction.amount);
        const hasRawLine = transaction.rawLine && typeof transaction.rawLine === 'string';

        return hasValidDate && hasDescription && hasValidAmount && hasRawLine;
    }

    /**
     * Valida formato de fecha YYYY-MM-DD
     * @param {string} dateStr - Fecha a validar
     * @returns {boolean} - true si es válida
     */
    isValidDate(dateStr) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) return false;

        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date.getTime());
    }

    /**
     * Convierte fecha DD/MM/YYYY a YYYY-MM-DD
     * @param {string} dateStr - Fecha en formato DD/MM/YYYY
     * @returns {string} - Fecha en formato YYYY-MM-DD
     */
    formatDate(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) {
            throw new Error(`Formato de fecha inválido: ${dateStr}`);
        }

        const [day, month, year] = parts;
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        if (!this.isValidDate(formattedDate)) {
            throw new Error(`Fecha inválida: ${dateStr} -> ${formattedDate}`);
        }

        return formattedDate;
    }

    /**
     * Limpia espacios múltiples y normaliza texto
     * @param {string} text - Texto a limpiar
     * @returns {string} - Texto limpio
     */
    cleanText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }
}