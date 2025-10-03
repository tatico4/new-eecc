/**
 * DataStorage - Manejo de almacenamiento local de datos
 */
class DataStorage {
    constructor() {
        console.log('DataStorage loaded');
        this.prefix = 'financialAnalysis_';
    }

    /**
     * Guarda transacciones en localStorage
     */
    saveTransactions(transactions) {
        try {
            localStorage.setItem(`${this.prefix}transactions`, JSON.stringify(transactions));
            return true;
        } catch (error) {
            console.error('Error guardando transacciones:', error);
            return false;
        }
    }

    /**
     * Carga transacciones desde localStorage
     */
    loadTransactions() {
        try {
            const saved = localStorage.getItem(`${this.prefix}transactions`);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error cargando transacciones:', error);
            return [];
        }
    }

    /**
     * Limpia datos guardados
     */
    clearData() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Error limpiando datos:', error);
            return false;
        }
    }

    /**
     * Guarda configuración
     */
    saveConfig(config) {
        try {
            localStorage.setItem(`${this.prefix}config`, JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Error guardando configuración:', error);
            return false;
        }
    }

    /**
     * Carga configuración
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(`${this.prefix}config`);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error cargando configuración:', error);
            return {};
        }
    }
}
