/**
 * TransactionAnalyzer - Análisis de transacciones financieras
 */
class TransactionAnalyzer {
    constructor() {
        console.log('TransactionAnalyzer loaded');
    }

    /**
     * Analiza un conjunto de transacciones
     */
    analyze(transactions) {
        if (!transactions || transactions.length === 0) {
            return this.getEmptyAnalysis();
        }

        return {
            summary: this.getSummary(transactions),
            byCategory: this.analyzeByCategory(transactions),
            byMonth: this.analyzeByMonth(transactions),
            trends: this.analyzeTrends(transactions),
            insights: this.generateInsights(transactions)
        };
    }

    /**
     * Obtiene resumen general
     */
    getSummary(transactions) {
        const expenses = transactions.filter(t => t.amount < 0);
        const incomes = transactions.filter(t => t.amount > 0);

        return {
            totalTransactions: transactions.length,
            totalExpenses: expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            totalIncomes: incomes.reduce((sum, t) => sum + t.amount, 0),
            averageExpense: expenses.length > 0 ? expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0) / expenses.length : 0,
            averageIncome: incomes.length > 0 ? incomes.reduce((sum, t) => sum + t.amount, 0) / incomes.length : 0,
            expenseCount: expenses.length,
            incomeCount: incomes.length
        };
    }

    /**
     * Análisis por categoría
     */
    analyzeByCategory(transactions) {
        const categories = {};

        transactions.forEach(transaction => {
            const category = transaction.category || 'Sin categoría';
            if (!categories[category]) {
                categories[category] = {
                    count: 0,
                    total: 0,
                    expenses: 0,
                    incomes: 0
                };
            }

            categories[category].count++;
            categories[category].total += transaction.amount;

            if (transaction.amount < 0) {
                categories[category].expenses += Math.abs(transaction.amount);
            } else {
                categories[category].incomes += transaction.amount;
            }
        });

        return categories;
    }

    /**
     * Análisis por mes
     */
    analyzeByMonth(transactions) {
        const months = {};

        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!months[monthKey]) {
                months[monthKey] = {
                    expenses: 0,
                    incomes: 0,
                    count: 0
                };
            }

            months[monthKey].count++;
            if (transaction.amount < 0) {
                months[monthKey].expenses += Math.abs(transaction.amount);
            } else {
                months[monthKey].incomes += transaction.amount;
            }
        });

        return months;
    }

    /**
     * Análisis de tendencias
     */
    analyzeTrends(transactions) {
        const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            isIncreasing: this.isTrendIncreasing(sortedTransactions),
            volatility: this.calculateVolatility(sortedTransactions),
            seasonality: this.detectSeasonality(sortedTransactions)
        };
    }

    /**
     * Genera insights automáticos
     */
    generateInsights(transactions) {
        const summary = this.getSummary(transactions);
        const categories = this.analyzeByCategory(transactions);

        const insights = [];

        // Insight sobre categoría con más gastos
        const expenseCategories = Object.entries(categories)
            .filter(([, data]) => data.expenses > 0)
            .sort(([, a], [, b]) => b.expenses - a.expenses);

        if (expenseCategories.length > 0) {
            const topCategory = expenseCategories[0];
            insights.push({
                type: 'expense',
                title: `Mayor gasto en ${topCategory[0]}`,
                description: `Has gastado $${topCategory[1].expenses.toLocaleString('es-CL')} en ${topCategory[0]}`,
                impact: 'high'
            });
        }

        return insights;
    }

    /**
     * Análisis vacío por defecto
     */
    getEmptyAnalysis() {
        return {
            summary: {
                totalTransactions: 0,
                totalExpenses: 0,
                totalIncomes: 0,
                averageExpense: 0,
                averageIncome: 0,
                expenseCount: 0,
                incomeCount: 0
            },
            byCategory: {},
            byMonth: {},
            trends: {},
            insights: []
        };
    }

    /**
     * Detecta si la tendencia es creciente
     */
    isTrendIncreasing(sortedTransactions) {
        if (sortedTransactions.length < 2) return false;

        const first = sortedTransactions[0].amount;
        const last = sortedTransactions[sortedTransactions.length - 1].amount;

        return last > first;
    }

    /**
     * Calcula volatilidad
     */
    calculateVolatility(transactions) {
        if (transactions.length < 2) return 0;

        const amounts = transactions.map(t => t.amount);
        const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
        const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;

        return Math.sqrt(variance);
    }

    /**
     * Detecta estacionalidad
     */
    detectSeasonality(transactions) {
        const monthlyTotals = {};

        transactions.forEach(transaction => {
            const month = new Date(transaction.date).getMonth();
            if (!monthlyTotals[month]) {
                monthlyTotals[month] = 0;
            }
            monthlyTotals[month] += Math.abs(transaction.amount);
        });

        return monthlyTotals;
    }
}
